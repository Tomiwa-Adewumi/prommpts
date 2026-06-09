-- Set up proper Clerk JWT authentication with Supabase RLS (CORRECTED VERSION)

-- First, let's update the users table RLS policies to work with Clerk JWT
-- The JWT from Clerk will have the Clerk user ID in the 'sub' field

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON users;

-- Create new policies that work with Clerk JWT
CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT
  USING (is_active = true OR clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Authenticated users can insert their profile" ON users
  FOR INSERT
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- Update collections RLS policies to work with Clerk JWT
DROP POLICY IF EXISTS "Users can create own collections" ON collections;
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON collections;

-- New collections policies
CREATE POLICY "Anyone can view public collections" ON collections
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can create collections" ON collections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collections.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Update images RLS policies (check if they exist first)
DROP POLICY IF EXISTS "Users can view public images" ON images;
DROP POLICY IF EXISTS "Users can manage own images" ON images;
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can insert own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;
DROP POLICY IF EXISTS "Users can delete own images" ON images;
DROP POLICY IF EXISTS "Anyone can view public images" ON images;

CREATE POLICY "Anyone can view public images" ON images
  FOR SELECT
  USING (is_public = true AND is_hidden = false);

CREATE POLICY "Users can view own images" ON images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert own images" ON images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update own images" ON images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can delete own images" ON images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = images.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Update likes RLS policies
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
DROP POLICY IF EXISTS "Users can view all likes" ON likes;

CREATE POLICY "Users can view all likes" ON likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = likes.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = likes.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Update favorites RLS policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view all favorites" ON favorites;

CREATE POLICY "Users can view all favorites" ON favorites
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = favorites.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = favorites.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Collection likes and images policies
DROP POLICY IF EXISTS "Users can view collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can manage own collection likes" ON collection_likes;

CREATE POLICY "Users can view collection likes" ON collection_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection likes" ON collection_likes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collection_likes.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = collection_likes.user_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "Users can view collection images" ON collection_images;
DROP POLICY IF EXISTS "Users can manage own collection images" ON collection_images;

CREATE POLICY "Users can view collection images" ON collection_images
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own collection images" ON collection_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      JOIN users ON users.id = collections.user_id
      WHERE collections.id = collection_images.collection_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections 
      JOIN users ON users.id = collections.user_id
      WHERE collections.id = collection_images.collection_id 
      AND users.clerk_id = (auth.jwt() ->> 'sub')
    )
  );