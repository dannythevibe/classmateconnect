-- 🎫 Advanced Faculty Features: Excuses & Notifications
-- 1. Extend attendance_status enum to include 'excused'
-- Note: In Supabase, you can't easily alter ENUMs in a transaction. 
-- This script assumes 'excused' might need to be added.
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'excused';

-- 2. Create Attendance Excuses Table
CREATE TABLE public.attendance_excuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  lecturer_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Link records to excuses
ALTER TABLE public.attendance_records ADD COLUMN excuse_id UUID REFERENCES public.attendance_excuses(id) ON DELETE SET NULL;

-- 4. RLS for Excuses
ALTER TABLE public.attendance_excuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own excuses" ON public.attendance_excuses FOR SELECT
  TO authenticated USING (is_self_student(student_id, auth.uid()));

CREATE POLICY "Students insert own excuses" ON public.attendance_excuses FOR INSERT
  TO authenticated WITH CHECK (is_self_student(student_id, auth.uid()));

CREATE POLICY "Lecturers view course excuses" ON public.attendance_excuses FOR SELECT
  TO authenticated USING (is_course_lecturer(course_id, auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Lecturers update course excuses" ON public.attendance_excuses FOR UPDATE
  TO authenticated USING (is_course_lecturer(course_id, auth.uid()) OR has_role(auth.uid(), 'admin'));

-- 5. Trigger for updated_at
CREATE TRIGGER set_excuses_updated_at BEFORE UPDATE ON public.attendance_excuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
