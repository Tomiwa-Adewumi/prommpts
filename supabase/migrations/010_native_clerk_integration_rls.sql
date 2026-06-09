-- Update RLS policies for native Clerk integration
-- The native approach uses standard auth.uid() instead of JWT claims

-- Drop all existing policies to start fresh
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

-- Create new policies for native Clerk integration
-- These use auth.uid() which works with the native integration

-- Users table policies
CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT
  USING (is_active = true OR id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Authenticated users can insert their profile" ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Collections policies
CREATE POLICY "Anyone can view public collections" ON collections
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create collections" ON collections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE
  USING (user_id = auth.uid());

-- Images policies
CREATE POLICY "Anyone can view public images" ON images
  FOR SELECT
  USING (is_public = true AND is_hidden = false);

CREATE POLICY "Users can view own images" ON images
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own images" ON images
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own images" ON images
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own images" ON images
  FOR DELETE
  USING (user_id = auth.uid());

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Favorites policies
CREATE POLICY "Users can view all favorites" ON favorites
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Collection likes policies
CREATE POLICY "Users can view collection likes" ON collection_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection likes" ON collection_likes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Collection images policies
CREATE POLICY "Users can view collection images" ON collection_images
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection images" ON collection_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_images.collection_id 
      AND collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_images.collection_id 
      AND collections.user_id = auth.uid()
    )
  );