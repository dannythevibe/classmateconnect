-- ============================================================
-- FIX: Create departments table (was queried but never created)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT departments_name_unique UNIQUE (name)
);

-- Keep consistent with rest of system (RLS disabled for dev)
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIX: Add user_id link to students table so self-signup
--      students can be found and linked to their student record
-- ============================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_user_id
  ON public.students(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- AUDIT LOG: Track user creation, deletions, assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity  ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ============================================================
-- FIX: handle_new_user trigger — ensure student record is
--      created automatically when a student signs up so that
--      enrollment and attendance work without admin intervention
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role  TEXT;
  v_name  TEXT;
  v_matric TEXT;
  v_dept  TEXT;
  v_level TEXT;
  v_faculty TEXT;
BEGIN
  v_role    := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_name    := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User');
  v_matric  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'matric_no', '')), '');
  v_dept    := COALESCE(NEW.raw_user_meta_data->>'department', 'General');
  v_level   := COALESCE(NEW.raw_user_meta_data->>'level', '100');
  v_faculty := COALESCE(NEW.raw_user_meta_data->>'faculty', '');

  -- Safety: never grant admin via self-signup
  IF v_role = 'admin' THEN v_role := 'student'; END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, name, email, department, level, matric_no, faculty)
  VALUES (NEW.id, v_name, NEW.email, v_dept, v_level, v_matric, v_faculty)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auto-create students record for student role so enrollment works immediately
  IF v_role = 'student' AND v_matric IS NOT NULL THEN
    INSERT INTO public.students (user_id, name, matric_no, department, level, faculty, created_by)
    VALUES (NEW.id, v_name, v_matric, v_dept, v_level, v_faculty, NEW.id)
    ON CONFLICT (matric_no) DO UPDATE
      SET user_id = EXCLUDED.user_id
      WHERE public.students.user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (drop + create to replace cleanly)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
