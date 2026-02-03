-- Migration: 019_auth_user_trigger
-- Description: Automatically create public.users record when auth user is created
-- Date: 2026-01-31

-- Function to handle new user creation in auth.users
-- Creates a corresponding record in public.users with 'customer' role
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user record in public.users table
    -- Default role is 'customer' for self-registration
    INSERT INTO public.users (
        auth_id,
        email,
        role,
        first_name,
        last_name,
        status
    )
    VALUES (
        NEW.id,
        NEW.email,
        'customer',
        COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
        'active'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new auth user is created
-- This ensures every user who signs up gets a public.users record
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_auth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.users TO supabase_auth_admin;

-- Add comment for documentation
COMMENT ON FUNCTION handle_new_auth_user() IS 'Automatically creates public.users record with customer role when new auth user signs up';
