-- Fix RLS policies for Clerk native integration
-- Based on Clerk's official documentation: https://clerk.com/docs/integrations/databases/supabase

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert their profile" ON users;
DROP POLICY IF EXISTS "Anyone can view public collections" ON collections;
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can create collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;
DROP POLICY IF EXISTS "Anyone can view public images" ON images;
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can insert own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;
DROP POLICY IF EXISTS "Users can delete own images" ON images;
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
DROP POLICY IF EXISTS "Users can view all favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can manage own collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can view collection images" ON collection_images;
DROP POLICY IF EXISTS "Users can manage own collection images" ON collection_images;

-- Create correct RLS policies for Clerk native integration
-- Using auth.jwt()->>'sub' as recommended in Clerk docs

-- Collections policies
CREATE POLICY "Anyone can view public collections" ON collections
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can create collections" ON collections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Images policies
CREATE POLICY "Anyone can view public images" ON images
  FOR SELECT
  USING (is_public = true AND is_hidden = false);

CREATE POLICY "Users can view own images" ON images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can insert own images" ON images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can update own images" ON images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete own images" ON images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Users policies
CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT
  USING (is_active = true OR clerk_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (clerk_id = (auth.jwt()->>'sub'))
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

CREATE POLICY "Authenticated users can insert their profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = likes.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = likes.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Favorites policies
CREATE POLICY "Users can view all favorites" ON favorites
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = favorites.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = favorites.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Collection likes policies
CREATE POLICY "Users can view collection likes" ON collection_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection likes" ON collection_likes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collection_likes.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collection_likes.user_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- Collection images policies
CREATE POLICY "Users can view collection images" ON collection_images
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection images" ON collection_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      JOIN users ON users.id = collections.user_id
      WHERE collections.id = collection_images.collection_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections 
      JOIN users ON users.id = collections.user_id
      WHERE collections.id = collection_images.collection_id 
      AND users.clerk_id = (auth.jwt()->>'sub')
    )
  );