
-- Tighten the signup INSERT policy to only allow 'student' self-assignment
DROP POLICY IF EXISTS "Users can insert own role at signup" ON public.user_roles;
CREATE POLICY "Users can insert own student role at signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND role = 'student'::app_role);

-- Force handle_new_user to always assign 'student' regardless of metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, department, matric_no)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'matric_no', '')
  );

  -- Always assign student role on self-signup; admins must promote manually
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student'::app_role);
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
