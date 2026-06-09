'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, Bookmark } from 'lucide-react';
import Masonry from 'react-masonry-css';

interface DiscoveryImage {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  prompt: string;
  ai_model: string;
  model_version?: string;
  likes_count: number;
  comments_count: number;
  tags: string[];
  width: number;
  height: number;
  created_at: string;
  similarity?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  saves_count?: number;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface DiscoveryGridProps {
  filters: {
    search: string;
    sortBy: string;
    aiModel: string;
    tags: string[];
  };
  onImageView?: (image: DiscoveryImage) => void;
  onUnauthenticatedAction: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
}

export function DiscoveryGrid({ filters, onImageView, onUnauthenticatedAction }: DiscoveryGridProps) {
  const { isSignedIn } = useAuth();
  const [images, setImages] = useState<DiscoveryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  const breakpointColumnsObj = {
    default: 5,
    1400: 4,
    1100: 3,
    768: 2,
    500: 2
  };

  const fetchImages = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      let response;

      if (filters.search.trim()) {
        // Use semantic search API
        const params = new URLSearchParams({
          q: filters.search.trim(),
          page: pageNum.toString(),
          limit: '20',
          threshold: '0.3',
          aiModel: filters.aiModel === 'all' ? '' : filters.aiModel,
          tags: filters.tags.join(','),
          _t: Date.now().toString(), // Cache busting
        });

        response = await fetch(`/api/images/search/semantic?${params}`);
      } else {

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          sortBy: filters.sortBy,
          aiModel: filters.aiModel === 'all' ? '' : filters.aiModel,
          tags: filters.tags.join(','),
          _t: Date.now().toString(), // Cache busting
        });
        // Don't include empty search parameter
        response = await fetch(`/api/images/discover?${params}`);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();

      setImages(prev => reset ? data.images : [...prev, ...data.images]);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load images. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reset and fetch when filters change
  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchImages(1, true);
  }, [filters.search, filters.sortBy, filters.aiModel, filters.tags.join(',')]);

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchImages(page + 1);
    }
  }, [inView, hasMore, loading, page, fetchImages]);

  const [likingImages, setLikingImages] = useState<Set<string>>(new Set());
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set());

  const handleLike = async (imageId: string, currentlyLiked: boolean) => {
    if (!isSignedIn) {
      onUnauthenticatedAction('like');
      return;
    }


    // Prevent multiple simultaneous likes on the same image
    if (likingImages.has(imageId)) {
      return;
    }

    setLikingImages(prev => new Set(prev).add(imageId));

    // Optimistic update
    setImages(prev => prev.map(img =>
      img.id === imageId
        ? {
          ...img,
          isLiked: !currentlyLiked,
          likes_count: currentlyLiked ? img.likes_count - 1 : img.likes_count + 1
        }
        : img
    ));
    try {
      const response = await fetch(`/api/images/${imageId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Only update UI when API call is successful
        setImages(prev => prev.map(img =>
          img.id === imageId
            ? {
              ...img,
              isLiked: data.liked,
              likes_count: data.likesCount
            }
            : img
        ));
      }
    } catch (error) {
      // Revert on error
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
            ...img,
            isLiked: currentlyLiked,
            likes_count: currentlyLiked ? img.likes_count + 1 : img.likes_count - 1
          }
          : img
      ));
    } finally {
      // Always remove from loading set
      setLikingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleSave = async (imageId: string, currentlySaved: boolean) => {
    if (!isSignedIn) {
      onUnauthenticatedAction('save');
      return;
    }

    // Prevent multiple simultaneous saves on the same image
    if (savingImages.has(imageId)) {
      return;
    }
    
    setSavingImages(prev => new Set(prev).add(imageId));
    
    // Optimistic update
    setImages(prev => prev.map(img =>
      img.id === imageId
        ? {
          ...img,
          isSaved: !currentlySaved,
          saves_count: currentlySaved ? (img.saves_count || 0) - 1 : (img.saves_count || 0) + 1
        }
        : img
    ));

    try {
      const response = await fetch(`/api/images/${imageId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Update with actual count from server
        setImages(prev => prev.map(img =>
          img.id === imageId
            ? {
              ...img,
              isSaved: data.favorited,
              saves_count: data.favoritesCount
            }
            : img
        ));
      }
    } catch (error) {
      // Revert on error
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
            ...img,
            isSaved: currentlySaved,
            saves_count: currentlySaved ? (img.saves_count || 0) + 1 : (img.saves_count || 0) - 1
          }
          : img
      ));
      console.error('Error toggling favorite:', error);
    } finally {
      // Always remove from saving set
      setSavingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };


  if (error && images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={() => fetchImages(1, true)} className="bg-white text-black hover:bg-gray-200">
          Try Again
        </Button>
      </div>
    );
  }

  if (loading && images.length === 0) {
    return (
      <>
        {/* Mobile skeleton - uses masonry with 2 columns */}
        <div className="md:hidden">
          <Masonry
            breakpointCols={2}
            className="masonry-grid"
            columnClassName="masonry-column"
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const heights = ['128px', '160px', '112px', '144px', '176px', '120px', '152px', '136px'];
              const height = heights[i % heights.length];

              return (
                <div
                  key={i}
                  className="masonry-item bg-gray-800 rounded-lg animate-pulse"
                  style={{ height }}
                />
              );
            })}
          </Masonry>
        </div>

        {/* Desktop skeleton - uses masonry */}
        <div className="hidden md:block">
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid"
            columnClassName="masonry-column"
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const aspectRatios = ['3/4', '1/1', '4/3', '9/16', '16/9', '2/3', '5/4', '3/5'];
              const aspectRatio = aspectRatios[i % aspectRatios.length];
              return (
                <div
                  key={i}
                  className="masonry-item bg-gray-800 rounded-lg animate-pulse"
                  style={{
                    aspectRatio,
                    maxHeight: '600px'
                  }}
                />
              );
            })}
          </Masonry>
        </div>
      </>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">
          {filters.search
            ? "No similar images found"
            : "No images found"
          }
        </p>
        <p className="text-sm text-gray-400">
          {filters.search
            ? "Try using different descriptive phrases or adjust your filters"
            : "Try adjusting your filters"
          }
        </p>
      </div>
    );
  }

  const calculateImageHeight = (image: DiscoveryImage, columnWidth: number = 300) => {
    const aspectRatio = image.height / image.width;
    return Math.round(columnWidth * aspectRatio);
  };

  return (
    <div className="space-y-6">
      {/* Masonry Grid - display all images with natural aspect ratios */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-column"
      >
        {images.map((image) => (
          <div key={image.id} className="masonry-item group relative overflow-hidden rounded-lg">
            <button
              onClick={() => onImageView?.(image)}
              className="block w-full"
            >
              <div
                className="relative w-full bg-gray-800"
                style={{
                  aspectRatio: `${image.width}/${image.height}`,
                  maxHeight: '600px'
                }}
              >
                <img
                  src={image.image_url}
                  alt={image.title}
                  width={image.width}
                  height={image.height}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </button>

            {/* Interactive buttons and stats */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between text-white text-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLike(image.id, image.isLiked || false);
                    }}
                    className="flex items-center gap-1 hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-4 h-4 ${image.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                    />
                    <span>{image.likes_count}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSave(image.id, image.isSaved || false);
                    }}
                    className="flex items-center gap-1 hover:scale-110 transition-transform"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${image.isSaved ? 'fill-yellow-500 text-yellow-500' : 'text-white'}`}
                    />
                    <span>{image.saves_count || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Masonry>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more images...
            </div>
          )}
        </div>
      )}

      {!hasMore && images.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">You&apos;ve reached the end!</p>
        </div>
      )}
    </div>
  );
}