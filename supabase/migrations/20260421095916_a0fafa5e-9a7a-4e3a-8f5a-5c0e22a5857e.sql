-- Update handle_new_user to honor the role selected at signup
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
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix the existing joh@gmail.com user who signed up as lecturer
UPDATE public.user_roles
SET role = 'lecturer'::app_role
WHERE user_id = 'd2a24d84-8828-478c-be06-e97420b9d3a5';