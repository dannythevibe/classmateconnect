-- Ensure session/semester columns exist with defaults (already exist per schema)
ALTER TABLE public.courses 
  ALTER COLUMN session SET DEFAULT '',
  ALTER COLUMN semester SET DEFAULT '';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_courses_dept_session_semester ON public.courses(department, session, semester);
CREATE INDEX IF NOT EXISTS idx_attendance_records_course_marked ON public.attendance_records(course_id, marked_at);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_started ON public.attendance_sessions(course_id, started_at);

-- Allow lecturers/admins to view profiles (already covered) — no-op
-- Permit students to view their own enrollments table relations is already in place.
