
-- 1. Promote existing user to admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = 'd2a24d84-8828-478c-be06-e97420b9d3a5';

-- 2. Tighten role self-insert at signup: only student or lecturer
DROP POLICY IF EXISTS "Users can insert own student role at signup" ON public.user_roles;
CREATE POLICY "Users self-insert student or lecturer at signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'lecturer'::app_role)
);

-- 3. Remove the dangerous "Allow All" wide-open policy on user_roles
DROP POLICY IF EXISTS "Allow All" ON public.user_roles;

-- 4. Update handle_new_user to never accept admin from metadata (defensive)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, department, matric_no, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'matric_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'level', '')
  );

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  -- Never grant admin via signup
  IF _role = 'admin'::app_role THEN
    _role := 'student'::app_role;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;

-- 5. Ensure trigger exists (harmless if it does)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
