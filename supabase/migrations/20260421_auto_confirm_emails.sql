-- Enable registration & allow login without email verification
-- This migration configures Supabase Auth to:
-- 1. Allow users to login immediately after registration
-- 2. Auto-confirm emails
-- 3. Disable email confirmation requirement

-- Note: This requires updating the Supabase dashboard settings:
-- Go to Authentication > Providers > Email and:
-- 1. Set "Require email confirmation" to OFF
-- 2. Or use: Set "Confirm email" to OFF in the provider settings

-- Create a function to auto-confirm emails on signup
CREATE OR REPLACE FUNCTION handle_new_user_email_confirm()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Auto-confirm the email by updating the confirmed_at field
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_sent_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-confirm on signup
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm on auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_email_confirm();
