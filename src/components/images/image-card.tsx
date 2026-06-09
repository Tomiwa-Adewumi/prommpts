'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Share, Download, Eye, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useImageStore } from '@/stores/imageStore';
import { imageActions } from '@/lib/api/imageActions';

interface ImageCardProps {
  image: {
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
    favorites_count?: number;
    comments_count: number;
    created_at: string;
    user: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    };
    isLiked?: boolean; // Whether current user has liked this image
    isSaved?: boolean; // Whether current user has saved this image
  };
  showDetails?: boolean;
  className?: string;
  priority?: boolean; // For above-fold images
}

export function ImageCard({ image, showDetails = true, className = '', priority = false }: ImageCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get data from centralized store
  const { images, initializeImage } = useImageStore();
  const imageData = images[image.id] || {
    likesCount: image.likes_count,
    favoritesCount: image.favorites_count || 0,
    isLiked: image.isLiked || false,
    isFavorited: image.isSaved || false,
  };

  // Initialize image in store when component mounts
  useEffect(() => {
    initializeImage(image.id, {
      likesCount: image.likes_count,
      favoritesCount: image.favorites_count || 0,
      isLiked: image.isLiked || false,
      isFavorited: image.isSaved || false,
    });
  }, [image.id, image.likes_count, image.favorites_count, image.isLiked, image.isSaved, initializeImage]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      await imageActions.toggleLike(image.id);
    } catch (error) {
      // Could show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title: image.title,
          text: `Check out this AI-generated image: "${image.title}"`,
          url: `/images/${image.id}`,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/images/${image.id}`);
        // Could show a toast notification here
      } catch (error) {
        // Failed to copy link
      }
    }
  };

  const aspectRatio = image.width && image.height ? image.width / image.height : 1;
  const cardHeight = aspectRatio > 1.5 ? 'h-64' : aspectRatio < 0.75 ? 'h-96' : 'h-80';

  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <Link href={`/images/${image.id}`}>
        <div className={`relative ${cardHeight} overflow-hidden bg-muted`}>
          {!imageError ? (
            <Image
              src={image.image_url}
              alt={image.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority || className.includes('priority-image')}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm">Image unavailable</p>
              </div>
            </div>
          )}

          {/* Overlay with stats - no comment icon */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <div className="flex items-center space-x-4 text-white text-sm">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{imageData.likesCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {showDetails && (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={image.user.avatar_url} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/users/${image.user.username}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {image.user.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${imageData.isLiked ? 'text-red-500' : ''}`}
                  onClick={handleLike}
                  disabled={isLoading}
                >
                  <Heart className={`h-4 w-4 ${imageData.isLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleShare}
                >
                  <Share className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a href={image.image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Link href={`/images/${image.id}`}>
              <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
                {image.title}
              </h3>
            </Link>

            {image.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {image.description}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{image.ai_model}</span>
                {image.model_version && <span>v{image.model_version}</span>}
              </div>

              {image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {image.tags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?tags=${encodeURIComponent(tag)}`}
                      className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded hover:bg-primary/20 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                  {image.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{image.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}