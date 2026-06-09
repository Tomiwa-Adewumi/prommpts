-- Migration: Priority Queue System with Concurrent Generation Limits
-- This migration:
-- 1. Renames image_generation_jobs to media_generation_jobs
-- 2. Adds new columns for queue priority, video support, and reference media
-- 3. Creates helper functions for queue management
-- 4. Sets up storage buckets for generated media

-- ============================================
-- STEP 1: Rename and Update Jobs Table
-- ============================================

-- Rename table to be more generic
ALTER TABLE IF EXISTS image_generation_jobs RENAME TO media_generation_jobs;

-- Add new columns for priority queue and media support
ALTER TABLE media_generation_jobs
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS queue_priority INTEGER DEFAULT 0 CHECK (queue_priority >= 0 AND queue_priority <= 3),
  ADD COLUMN IF NOT EXISTS generation_type TEXT CHECK (generation_type IN ('t2i', 'i2i', 't2v', 'i2v', 'v2v')),
  ADD COLUMN IF NOT EXISTS reference_image_urls TEXT[], -- Array of reference image URLs
  ADD COLUMN IF NOT EXISTS reference_video_urls TEXT[], -- Array of reference video URLs
  ADD COLUMN IF NOT EXISTS output_video_url TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER; -- Video duration in seconds

-- Add index for queue processing (critical for performance)
CREATE INDEX IF NOT EXISTS idx_jobs_queue_priority
  ON media_generation_jobs (status, queue_priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Add index for counting active jobs per user
CREATE INDEX IF NOT EXISTS idx_jobs_active_by_user
  ON media_generation_jobs (user_id, status)
  WHERE status IN ('pending', 'processing');

-- Add comment to table
COMMENT ON TABLE media_generation_jobs IS
  'Unified table for all media generation jobs (images and videos). Jobs are processed by priority queue based on user tier.';

-- ============================================
-- STEP 2: Helper Functions
-- ============================================

-- Function to get user's queue priority based on subscription tier
CREATE OR REPLACE FUNCTION get_user_queue_priority(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_priority INTEGER;
BEGIN
  -- Get priority from active subscription's package
  SELECT COALESCE(cp.queue_priority, 0) INTO v_priority
  FROM user_subscriptions us
  JOIN credit_packages cp ON us.package_id = cp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY cp.queue_priority DESC
  LIMIT 1;

  -- Default to 0 (free tier) if no active subscription
  RETURN COALESCE(v_priority, 0);
END;
$$;

-- Function to count user's active jobs (pending + processing)
CREATE OR REPLACE FUNCTION count_user_active_jobs(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM media_generation_jobs
  WHERE user_id = p_user_id
    AND status IN ('pending', 'processing');

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to get user's concurrent generation limit based on tier
CREATE OR REPLACE FUNCTION get_user_concurrent_limit(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier_name TEXT;
  v_limit INTEGER;
BEGIN
  -- Get the user's subscription tier name
  SELECT cp.name INTO v_tier_name
  FROM user_subscriptions us
  JOIN credit_packages cp ON us.package_id = cp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY cp.queue_priority DESC
  LIMIT 1;

  -- Map tier name to concurrent limit
  v_limit := CASE
    WHEN v_tier_name = 'Pro' THEN 8
    WHEN v_tier_name = 'Creator' THEN 6
    WHEN v_tier_name = 'Starter' THEN 3
    ELSE 1 -- Free tier or no subscription
  END;

  RETURN v_limit;
END;
$$;

-- Function to check if user can create new job (under concurrent limit)
CREATE OR REPLACE FUNCTION can_user_create_job(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_count INTEGER;
  v_limit INTEGER;
BEGIN
  v_active_count := count_user_active_jobs(p_user_id);
  v_limit := get_user_concurrent_limit(p_user_id);

  RETURN v_active_count < v_limit;
END;
$$;

-- ============================================
-- STEP 3: Update Existing Data
-- ============================================

-- Set media_type for existing jobs (all are images)
UPDATE media_generation_jobs
SET media_type = 'image'
WHERE media_type IS NULL;

-- Set generation_type based on should_refine_prompt flag
UPDATE media_generation_jobs
SET generation_type = CASE
  WHEN should_refine_prompt = true THEN 'i2i'
  ELSE 't2i'
END
WHERE generation_type IS NULL;

-- Set queue_priority for existing pending jobs based on user's current tier
UPDATE media_generation_jobs j
SET queue_priority = get_user_queue_priority(j.user_id)
WHERE queue_priority = 0
  AND status = 'pending';

-- ============================================
-- STEP 4: Storage Buckets
-- ============================================

-- Create bucket for AI-generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for AI-generated videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-videos',
  'generated-videos',
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 5: Storage Policies (RLS)
-- ============================================

-- Policy: Anyone can view generated images (public bucket)
CREATE POLICY "Public Access for Generated Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

-- Policy: Only authenticated users can upload generated images (via service role)
CREATE POLICY "Authenticated Upload for Generated Images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images' AND auth.role() = 'authenticated');

-- Policy: Users can delete their own generated images
CREATE POLICY "Users Delete Own Generated Images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-images'
    AND auth.uid() IN (
      SELECT user_id FROM media_generation_jobs
      WHERE output_data->'images'->>0 LIKE '%' || name
    )
  );

-- Policy: Anyone can view generated videos (public bucket)
CREATE POLICY "Public Access for Generated Videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-videos');

-- Policy: Only authenticated users can upload generated videos (via service role)
CREATE POLICY "Authenticated Upload for Generated Videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-videos' AND auth.role() = 'authenticated');

-- Policy: Users can delete their own generated videos
CREATE POLICY "Users Delete Own Generated Videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-videos'
    AND auth.uid() IN (
      SELECT user_id FROM media_generation_jobs
      WHERE output_video_url LIKE '%' || name
    )
  );

-- ============================================
-- STEP 6: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN media_generation_jobs.media_type IS 'Type of media being generated: image or video';
COMMENT ON COLUMN media_generation_jobs.queue_priority IS 'Processing priority based on user tier: 0=Free, 1=Starter, 2=Creator, 3=Pro';
COMMENT ON COLUMN media_generation_jobs.generation_type IS 'Generation method: t2i, i2i, t2v, i2v, v2v';
COMMENT ON COLUMN media_generation_jobs.reference_image_urls IS 'Array of URLs to user-uploaded reference images in images bucket (supports multiple)';
COMMENT ON COLUMN media_generation_jobs.reference_video_urls IS 'Array of URLs to user-uploaded reference videos in videos bucket (supports multiple)';
COMMENT ON COLUMN media_generation_jobs.output_video_url IS 'URL to AI-generated video in generated-videos bucket';
COMMENT ON COLUMN media_generation_jobs.duration IS 'Video duration in seconds (5, 10, etc.)';

COMMENT ON FUNCTION get_user_queue_priority(UUID) IS 'Returns user queue priority (0-3) based on active subscription tier';
COMMENT ON FUNCTION count_user_active_jobs(UUID) IS 'Counts jobs with status pending or processing for a user';
COMMENT ON FUNCTION get_user_concurrent_limit(UUID) IS 'Returns max concurrent jobs allowed for user based on tier (1/3/6/8)';
COMMENT ON FUNCTION can_user_create_job(UUID) IS 'Checks if user is under their concurrent generation limit';

-- ============================================
-- STEP 7: Verify Migration
-- ============================================

-- Display current state
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Table renamed: image_generation_jobs -> media_generation_jobs';
  RAISE NOTICE 'New columns added: media_type, queue_priority, generation_type, reference URLs, duration';
  RAISE NOTICE 'Helper functions created: get_user_queue_priority, count_user_active_jobs, get_user_concurrent_limit, can_user_create_job';
  RAISE NOTICE 'Storage buckets created: generated-images, generated-videos';
  RAISE NOTICE 'Indexes created for queue performance';
END $$;
