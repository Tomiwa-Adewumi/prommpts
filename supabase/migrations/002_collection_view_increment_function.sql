-- Create function to increment collection view count
CREATE OR REPLACE FUNCTION increment_collection_views(collection_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.collections 
    SET views_count = views_count + 1
    WHERE id = collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;