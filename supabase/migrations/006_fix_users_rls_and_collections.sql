-- Fix infinite recursion in users table RLS policies
-- Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Create a function to check if current user is admin without recursion
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate admin policies using the function to avoid recursion
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Admins can manage users" ON users
  FOR UPDATE
  USING (auth.is_admin());

-- Create a function to get user UUID from Clerk ID
CREATE OR REPLACE FUNCTION get_user_uuid_from_clerk_id(clerk_user_id text)
RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid
  FROM users
  WHERE clerk_id = clerk_user_id;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_uuid_from_clerk_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;