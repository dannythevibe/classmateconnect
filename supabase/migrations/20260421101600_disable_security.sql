-- Disable RLS on all tables for rapid development mode
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_excuses DISABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
DROP POLICY IF EXISTS "Only admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Attendance sessions viewable by enrollment" ON attendance_sessions;
DROP POLICY IF EXISTS "Records viewable by owner or lecturer" ON attendance_records;
DROP POLICY IF EXISTS "Notifications viewable by recipient" ON notifications;

-- Create "Allow All" policies for good measure (even though RLS is disabled)
-- This ensures that if RLS is re-enabled, it remains open
CREATE POLICY "Allow All" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow All" ON courses FOR ALL USING (true);
CREATE POLICY "Allow All" ON enrollments FOR ALL USING (true);
CREATE POLICY "Allow All" ON students FOR ALL USING (true);
CREATE POLICY "Allow All" ON attendance_sessions FOR ALL USING (true);
CREATE POLICY "Allow All" ON attendance_records FOR ALL USING (true);
CREATE POLICY "Allow All" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow All" ON attendance_excuses FOR ALL USING (true);
