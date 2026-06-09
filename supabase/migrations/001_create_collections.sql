-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    images_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_images junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.collection_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, image_id)
);

-- Create collection_likes table
CREATE TABLE IF NOT EXISTS public.collection_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, collection_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_is_public ON public.collections(is_public);
CREATE INDEX idx_collections_created_at ON public.collections(created_at DESC);
CREATE INDEX idx_collection_images_collection_id ON public.collection_images(collection_id);
CREATE INDEX idx_collection_images_image_id ON public.collection_images(image_id);
CREATE INDEX idx_collection_likes_user_id ON public.collection_likes(user_id);
CREATE INDEX idx_collection_likes_collection_id ON public.collection_likes(collection_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_likes ENABLE ROW LEVEL SECURITY;

-- Collections policies
-- Anyone can view public collections
CREATE POLICY "Public collections are viewable by everyone" 
    ON public.collections FOR SELECT 
    USING (is_public = true);

-- Users can view their own private collections
CREATE POLICY "Users can view own collections" 
    ON public.collections FOR SELECT 
    USING (auth.uid()::text = user_id::text);

-- Users can create their own collections
CREATE POLICY "Users can create own collections" 
    ON public.collections FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own collections
CREATE POLICY "Users can update own collections" 
    ON public.collections FOR UPDATE 
    USING (auth.uid()::text = user_id::text);

-- Users can delete their own collections
CREATE POLICY "Users can delete own collections" 
    ON public.collections FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- Collection images policies
-- Anyone can view images in public collections
CREATE POLICY "Public collection images are viewable by everyone" 
    ON public.collection_images FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_images.collection_id 
            AND is_public = true
        )
    );

-- Users can view images in their own collections
CREATE POLICY "Users can view own collection images" 
    ON public.collection_images FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_images.collection_id 
            AND user_id::text = auth.uid()::text
        )
    );

-- Users can add images to their own collections
CREATE POLICY "Users can add images to own collections" 
    ON public.collection_images FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_id 
            AND user_id::text = auth.uid()::text
        )
    );

-- Users can remove images from their own collections
CREATE POLICY "Users can remove images from own collections" 
    ON public.collection_images FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_id 
            AND user_id::text = auth.uid()::text
        )
    );

-- Collection likes policies
-- Anyone can view collection likes
CREATE POLICY "Collection likes are viewable by everyone" 
    ON public.collection_likes FOR SELECT 
    USING (true);

-- Users can like collections
CREATE POLICY "Users can like collections" 
    ON public.collection_likes FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text);

-- Users can unlike collections
CREATE POLICY "Users can unlike collections" 
    ON public.collection_likes FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- Function to update collection images count
CREATE OR REPLACE FUNCTION update_collection_images_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.collections 
        SET images_count = images_count + 1,
            updated_at = NOW()
        WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.collections 
        SET images_count = images_count - 1,
            updated_at = NOW()
        WHERE id = OLD.collection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating collection images count
CREATE TRIGGER update_collection_images_count_trigger
AFTER INSERT OR DELETE ON public.collection_images
FOR EACH ROW EXECUTE FUNCTION update_collection_images_count();

-- Function to update collection likes count
CREATE OR REPLACE FUNCTION update_collection_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.collections 
        SET likes_count = likes_count + 1,
            updated_at = NOW()
        WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.collections 
        SET likes_count = likes_count - 1,
            updated_at = NOW()
        WHERE id = OLD.collection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating collection likes count
CREATE TRIGGER update_collection_likes_count_trigger
AFTER INSERT OR DELETE ON public.collection_likes
FOR EACH ROW EXECUTE FUNCTION update_collection_likes_count();