-- ============================================================
-- Helper: promote a user to admin by email
-- Usage from Supabase SQL editor:
--   SELECT promote_user_to_admin('your@email.com');
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN 'ERROR: No user found with email ' || p_email;
  END IF;

  -- Remove any existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');

  -- Log the action
  INSERT INTO public.audit_log (action, entity_type, entity_id, details)
  VALUES ('admin_promoted', 'user', v_user_id::text, jsonb_build_object('email', p_email, 'promoted_at', now()));

  RETURN 'SUCCESS: ' || p_email || ' is now an admin (user_id: ' || v_user_id || '). Ask them to sign out and back in.';
END;
$$;
