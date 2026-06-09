-- Fix collections RLS policy to handle Clerk JWT authentication better
-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Users can create collections" ON collections;

-- Create a more flexible insert policy
CREATE POLICY "Authenticated users can create collections" ON collections
FOR INSERT 
TO public
WITH CHECK (
  -- Allow if the user_id exists in users table and matches current user's clerk_id
  user_id IN (
    SELECT id FROM users 
    WHERE clerk_id = COALESCE(
      auth.jwt() ->> 'sub',
      current_setting('request.jwt.claims', true)::json ->> 'sub'
    )
  )
);

-- Also update the select policy to be more robust
DROP POLICY IF EXISTS "Users can view own collections" ON collections;

CREATE POLICY "Users can view own collections" ON collections
FOR SELECT 
TO public
USING (
  -- Allow if user_id matches the authenticated user's clerk_id
  user_id IN (
    SELECT id FROM users 
    WHERE clerk_id = COALESCE(
      auth.jwt() ->> 'sub',
      current_setting('request.jwt.claims', true)::json ->> 'sub'
    )
  )
);