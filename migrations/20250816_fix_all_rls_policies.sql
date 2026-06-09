-- Migration: Fix all RLS policies to use consistent auth.jwt() pattern
-- Date: 2025-08-16
-- Description: Remove all existing problematic policies and replace with consistent ones

-- ======================
-- FAVORITES TABLE
-- ======================
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Authenticated users can favorite" ON favorites;
DROP POLICY IF EXISTS "Users can unfavorite" ON favorites;
DROP POLICY IF EXISTS "Users can view all favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
DROP POLICY IF EXISTS "Anyone can view public favorites" ON favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

-- Create consistent favorites policies
CREATE POLICY "Anyone can view public favorites"
  ON favorites FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM images 
    WHERE images.id = favorites.image_id 
    AND images.is_public = true 
    AND images.is_hidden = false
  ));

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = favorites.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

CREATE POLICY "Users can create favorites"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = favorites.user_id 
      AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
    ) AND EXISTS (
      SELECT 1 FROM images
      WHERE images.id = favorites.image_id 
      AND images.is_public = true 
      AND images.is_hidden = false
    )
  );

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = favorites.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- LIKES TABLE
-- ======================
DROP POLICY IF EXISTS "Authenticated users can like" ON likes;
DROP POLICY IF EXISTS "Likes on public images are viewable" ON likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
DROP POLICY IF EXISTS "Users can unlike" ON likes;
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can view own likes" ON likes;
DROP POLICY IF EXISTS "Anyone can view likes on public images" ON likes;
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

-- Create consistent likes policies
CREATE POLICY "Anyone can view likes on public images"
  ON likes FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM images 
    WHERE images.id = likes.image_id 
    AND images.is_public = true 
    AND images.is_hidden = false
  ));

CREATE POLICY "Users can view own likes"
  ON likes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = likes.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = likes.user_id 
      AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
    ) AND EXISTS (
      SELECT 1 FROM images
      WHERE images.id = likes.image_id 
      AND images.is_public = true 
      AND images.is_hidden = false
    )
  );

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = likes.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- COLLECTION_IMAGES TABLE
-- ======================
DROP POLICY IF EXISTS "Public collection images are viewable by everyone" ON collection_images;
DROP POLICY IF EXISTS "Users can add images to own collections" ON collection_images;
DROP POLICY IF EXISTS "Users can manage own collection images" ON collection_images;
DROP POLICY IF EXISTS "Users can remove images from own collections" ON collection_images;
DROP POLICY IF EXISTS "Users can view collection images" ON collection_images;
DROP POLICY IF EXISTS "Users can view own collection images" ON collection_images;
DROP POLICY IF EXISTS "Anyone can view public collection images" ON collection_images;
DROP POLICY IF EXISTS "Users can manage own collection images" ON collection_images;

-- Create consistent collection_images policies
CREATE POLICY "Anyone can view public collection images"
  ON collection_images FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM collections 
    WHERE collections.id = collection_images.collection_id 
    AND collections.is_public = true
  ));

CREATE POLICY "Users can view own collection images"
  ON collection_images FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM collections
    JOIN users ON users.id = collections.user_id
    WHERE collections.id = collection_images.collection_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

CREATE POLICY "Users can manage own collection images"
  ON collection_images FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM collections
    JOIN users ON users.id = collections.user_id
    WHERE collections.id = collection_images.collection_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections
    JOIN users ON users.id = collections.user_id
    WHERE collections.id = collection_images.collection_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- COLLECTION_LIKES TABLE
-- ======================
DROP POLICY IF EXISTS "Collection likes are viewable by everyone" ON collection_likes;
DROP POLICY IF EXISTS "Users can like collections" ON collection_likes;
DROP POLICY IF EXISTS "Users can manage own collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can unlike collections" ON collection_likes;
DROP POLICY IF EXISTS "Users can view collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Anyone can view collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can view own collection likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can manage own collection likes" ON collection_likes;

-- Create consistent collection_likes policies
CREATE POLICY "Anyone can view collection likes"
  ON collection_likes FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can view own collection likes"
  ON collection_likes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = collection_likes.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

CREATE POLICY "Users can manage own collection likes"
  ON collection_likes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = collection_likes.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = collection_likes.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- IMAGES TABLE (Clean up duplicates)
-- ======================
DROP POLICY IF EXISTS "Admins can manage images" ON images;
DROP POLICY IF EXISTS "Admins can view all images" ON images;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON images;
DROP POLICY IF EXISTS "Public images are viewable" ON images;

-- Keep the existing consistent policies for images:
-- "Anyone can view public images"
-- "Users can delete own images"
-- "Users can insert own images"
-- "Users can update own images"
-- "Users can view own images"

-- ======================
-- COURSES TABLE
-- ======================
DROP POLICY IF EXISTS "Admins can create courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete own courses" ON courses;
DROP POLICY IF EXISTS "Admins can update own courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Available courses are viewable" ON courses;
DROP POLICY IF EXISTS "Anyone can view available courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage own courses" ON courses;
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;

-- Create consistent courses policies
CREATE POLICY "Anyone can view available courses"
  ON courses FOR SELECT TO public
  USING (is_available = true);

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = courses.admin_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
    AND users.is_admin = true
  ));

CREATE POLICY "Admins can manage own courses"
  ON courses FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = courses.admin_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
    AND users.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = courses.admin_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
    AND users.is_admin = true
  ));

-- ======================
-- CREDIT_TRANSACTIONS TABLE
-- ======================

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = credit_transactions.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- REFERRALS TABLE
-- ======================

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = referrals.referrer_id OR users.id = referrals.referred_id)
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));
-- ======================
-- USER_CREDITS TABLE
-- ======================
-- Keep "System can manage user credits" for system operations

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_credits.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));

-- ======================
-- USER_SUBSCRIPTIONS TABLE
-- ======================

CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_subscriptions.user_id 
    AND users.clerk_id::text = (auth.jwt() ->> 'sub'::text)
  ));