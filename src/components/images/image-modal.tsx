'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Bookmark, User, Calendar, Eye, Copy, CornerUpRight, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useImageStore } from '@/stores/imageStore';
import { imageActions } from '@/lib/api/imageActions';


interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: string;
    title: string;
    description?: string;
    image_url: string;
    prompt: string;
    ai_model: string;
    model_version?: string;
    tags: string[];
    width: number;
    height: number;
    likes_count: number;
    saves_count?: number;
    created_at: string;
    isLiked?: boolean;
    isSaved?: boolean;
    user: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    };
  };
}

export function ImageModal({ isOpen, onClose, image }: ImageModalProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get data from centralized store
  const { images, initializeImage } = useImageStore();
  const imageData = images[image.id] || {
    likesCount: image.likes_count,
    favoritesCount: image.saves_count || 0,
    isLiked: image.isLiked || false,
    isFavorited: image.isSaved || false,
  };

  // Initialize image in store when component mounts or image changes
  useEffect(() => {
    initializeImage(image.id, {
      likesCount: image.likes_count,
      favoritesCount: image.saves_count || 0,
      isLiked: image.isLiked || false,
      isFavorited: image.isSaved || false,
    });
  }, [image.id, image.likes_count, image.saves_count, image.isLiked, image.isSaved, initializeImage]);





  const handleViewFullPage = () => {
    router.push(`/images/${image.id}`);
    onClose();
  };

  const handleShare = async () => {
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

      try {
        await navigator.clipboard.writeText(`${window.location.origin}/images/${image.id}`);

      } catch (error) {
        // Failed to copy link
      }
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Failed to copy prompt
    }
  };

  if (!image) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-6xl mx-4 h-[90vh]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full overflow-hidden">
        {/* Image Section */}
        <div className="relative bg-gray-900 flex items-center justify-center h-full p-4 overflow-hidden">
          {!imageError ? (
            <Image
              src={image.image_url}
              alt={image.title}
              width={image.width}
              height={image.height}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Eye className="h-12 w-12 mx-auto mb-4" />
                <p>Image unavailable</p>
              </div>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="p-6 pt-12 lg:pt-12 text-white flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={image.user.avatar_url} />
                <AvatarFallback className="bg-gray-700">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{image.user.full_name}</p>
                <p className="text-sm text-gray-400">@{image.user.username}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(image.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Title and Description */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">{image.title}</h2>
            {image.description && (
              <p className="text-gray-300 mb-4">{image.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isLoading) return;
                setIsLoading(true);
                try {
                  await imageActions.toggleLike(image.id);
                } catch (error) {
                  // Failed to toggle like
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 hover:scale-105 transition-transform"
            >
              <Heart
                className={`w-6 h-6 ${imageData.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              />
              <span className="text-sm">{imageData.likesCount}</span>
            </button>

            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isLoading) return;
                setIsLoading(true);
                try {
                  await imageActions.toggleFavorite(image.id);
                } catch (error) {
                  // Failed to toggle favorite
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 hover:scale-105 transition-transform"
            >
              <Bookmark
                className={`w-6 h-6 ${imageData.isFavorited ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
              />
              <span className="text-sm">{imageData.favoritesCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <CornerUpRight className="w-6 h-6" />
            </button>

            <button
              onClick={handleViewFullPage}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              title="View full page"
            >
              <ExternalLink className="w-6 h-6" />
            </button>
          </div>

          {/* Prompt */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-200">Prompt</h3>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors text-sm"
                title="Copy prompt"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{image.prompt}</p>
          </div>

          {/* AI Model Info */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2 text-gray-200">AI Model</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{image.ai_model}</span>
              {image.model_version && (
                <span className="text-gray-400">v{image.model_version}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {image.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-200">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full hover:bg-gray-600 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Image Dimensions */}
          <div className="mt-auto pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Dimensions</span>
              <span>{image.width} × {image.height}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}