-- Clean up conflicting RLS policies
-- Remove old JWT template policies that are conflicting with native integration

-- Drop the old JWT template policy that's conflicting
DROP POLICY IF EXISTS "Authenticated users can create collections" ON collections;

-- Ensure we only have the native integration policies
-- (The correct policies should already exist from migration 010)