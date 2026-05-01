-- Add session, semester, faculty and department fields to courses for better reporting
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS session TEXT DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT '';

-- Add faculty to students for reporting
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT '';

-- Ensure session/semester info can be captured in attendance_sessions if needed
-- But usually it's tied to the course.

-- Create a view for easy reporting
CREATE OR REPLACE VIEW public.attendance_summary_report AS
SELECT 
  c.session,
  c.semester,
  c.faculty,
  c.code AS course_code,
  c.title AS course_title,
  p.name AS lecturer_name,
  s.matric_no,
  s.name AS student_name,
  (SELECT MIN(started_at) FROM public.attendance_sessions WHERE course_id = c.id) AS classes_started,
  (SELECT MAX(started_at) FROM public.attendance_sessions WHERE course_id = c.id) AS classes_ended,
  COUNT(r.id) FILTER (WHERE r.status IN ('present', 'late', 'excused')) AS attended_count,
  COUNT(DISTINCT sess.id) AS total_sessions,
  CASE 
    WHEN COUNT(DISTINCT sess.id) = 0 THEN 0
    ELSE ROUND((COUNT(r.id) FILTER (WHERE r.status IN ('present', 'late', 'excused'))::numeric / COUNT(DISTINCT sess.id)::numeric) * 100)
  END AS attendance_percentage
FROM 
  public.courses c
JOIN 
  public.profiles p ON c.lecturer_id = p.user_id
JOIN 
  public.enrollments e ON e.course_id = c.id
JOIN 
  public.students s ON e.student_id = s.id
LEFT JOIN 
  public.attendance_sessions sess ON sess.course_id = c.id
LEFT JOIN 
  public.attendance_records r ON r.session_id = sess.id AND r.student_id = s.id
GROUP BY 
  c.id, c.session, c.semester, c.faculty, c.code, c.title, p.name, s.id, s.matric_no, s.name;
