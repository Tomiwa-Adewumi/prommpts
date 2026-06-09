'use client';

import { ImageCard } from './image-card';

interface ImageGridProps {
  images: Array<{
    id: string;
    title: string;
    description?: string;
    prompt: string;
    negative_prompt?: string;
    ai_model: string;
    model_version?: string;
    seed?: number;
    steps?: number;
    cfg_scale?: number;
    tags: string[];
    image_url: string;
    width: number;
    height: number;
    likes_count: number;
    comments_count: number;
    views_count: number;
    created_at: string;
    user: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    };
  }>;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function ImageGrid({ images, loading = false, error = null, className = '' }: ImageGridProps) {
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-muted-foreground">Error loading images: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg h-80 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-muted-foreground">No images found</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {images.map((image) => (
        <ImageCard key={image.id} image={image} />
      ))}
    </div>
  );
}