
-- Enums
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent');
CREATE TYPE public.attendance_method AS ENUM ('qr', 'manual', 'gps');
CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'success');

-- Profiles: add level column
ALTER TABLE public.profiles ADD COLUMN level TEXT DEFAULT '';

-- ============ COURSES ============
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  lecturer_id UUID NOT NULL,
  schedule TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'from-violet-500 to-fuchsia-500',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Helper: is the given user the lecturer for the given course?
CREATE OR REPLACE FUNCTION public.is_course_lecturer(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND lecturer_id = _user_id)
$$;

CREATE POLICY "Authenticated can view courses" ON public.courses FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Lecturers create own courses" ON public.courses FOR INSERT
  TO authenticated WITH CHECK (
    lecturer_id = auth.uid() AND (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Owner or admin update course" ON public.courses FOR UPDATE
  TO authenticated USING (lecturer_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete course" ON public.courses FOR DELETE
  TO authenticated USING (lecturer_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- ============ STUDENTS ROSTER ============
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  matric_no TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecturers/admins view students" ON public.students FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecturers/admins insert students" ON public.students FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecturers/admins update students" ON public.students FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecturers/admins delete students" ON public.students FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'admin'));

-- ============ ENROLLMENTS ============
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user the student matching this students.id (via matric_no on profiles)?
CREATE OR REPLACE FUNCTION public.is_self_student(_student_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.profiles p ON p.matric_no = s.matric_no
    WHERE s.id = _student_id AND p.user_id = _user_id
  )
$$;

CREATE POLICY "View enrollments (lecturer/admin/self)" ON public.enrollments FOR SELECT
  TO authenticated USING (
    has_role(auth.uid(), 'admin')
    OR is_course_lecturer(course_id, auth.uid())
    OR is_self_student(student_id, auth.uid())
  );
CREATE POLICY "Manage enrollments (lecturer of course/admin)" ON public.enrollments FOR INSERT
  TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
  );
CREATE POLICY "Delete enrollments (lecturer of course/admin)" ON public.enrollments FOR DELETE
  TO authenticated USING (
    has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
  );

-- ============ ATTENDANCE SESSIONS ============
CREATE TABLE public.attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  room TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view sessions" ON public.attendance_sessions FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Course lecturer/admin create session" ON public.attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (
    lecturer_id = auth.uid() AND (
      has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
    )
  );
CREATE POLICY "Course lecturer/admin update session" ON public.attendance_sessions FOR UPDATE
  TO authenticated USING (
    has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
  );

-- ============ ATTENDANCE RECORDS ============
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  method public.attendance_method NOT NULL DEFAULT 'qr',
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View attendance (lecturer/admin/self)" ON public.attendance_records FOR SELECT
  TO authenticated USING (
    has_role(auth.uid(), 'admin')
    OR is_course_lecturer(course_id, auth.uid())
    OR is_self_student(student_id, auth.uid())
  );
CREATE POLICY "Insert attendance (lecturer of course/admin/self student)" ON public.attendance_records FOR INSERT
  TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR is_course_lecturer(course_id, auth.uid())
    OR is_self_student(student_id, auth.uid())
  );
CREATE POLICY "Update attendance (lecturer of course/admin)" ON public.attendance_records FOR UPDATE
  TO authenticated USING (
    has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
  );
CREATE POLICY "Delete attendance (lecturer of course/admin)" ON public.attendance_records FOR DELETE
  TO authenticated USING (
    has_role(auth.uid(), 'admin') OR is_course_lecturer(course_id, auth.uid())
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type public.notification_type NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
-- (No INSERT policy: only service-role/triggers may create notifications.)

-- ============ Triggers for updated_at ============
CREATE TRIGGER set_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Indexes ============
CREATE INDEX idx_courses_lecturer ON public.courses(lecturer_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX idx_sessions_active ON public.attendance_sessions(expires_at);
CREATE INDEX idx_records_course ON public.attendance_records(course_id);
CREATE INDEX idx_records_student ON public.attendance_records(student_id);
CREATE INDEX idx_records_session ON public.attendance_records(session_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
