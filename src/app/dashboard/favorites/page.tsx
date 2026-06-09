'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { ImageModal } from '@/components/images/image-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Bookmark,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  EyeOff,
  FolderPlus,
  Share,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Masonry from 'react-masonry-css';

interface FavoriteImage {
  id: string;
  created_at: string;
  image: {
    id: string;
    title: string;
    description?: string;
    image_url: string;
    prompt: string;
    ai_model: string;
    likes_count: number;
    favorites_count: number;
    views_count: number;
    tags: string[];
    created_at: string;
    isLiked?: boolean;
    user: {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string;
    };
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { supabaseUser, clerkUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [signInDestination, setSignInDestination] = useState<string | undefined>(undefined);

  // Image modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Action states for like/save functionality
  const [likingImages, setLikingImages] = useState<Set<string>>(new Set());
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set());

  // Clear data when user changes to prevent cross-user data leakage
  useEffect(() => {
    if (clerkUser?.id) {
      // Clear state when user changes
      setFavorites([]);
      setLoading(true);
      setPage(1);
      setHasMore(true);
    }
  }, [clerkUser?.id]);

  const fetchFavorites = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      const response = await fetch(`/api/user/favorites?page=${pageNum}&include_interactions=true`);
      if (response.ok) {
        const data = await response.json();
        // Add isLiked property to each image based on API response
        const favoritesWithLikeState = data.favorites.map((favorite: FavoriteImage) => ({
          ...favorite,
          image: {
            ...favorite.image,
            isLiked: favorite.image.isLiked || false // Use API data or default to false
          }
        }));
        setFavorites(prev => reset ? favoritesWithLikeState : [...prev, ...favoritesWithLikeState]);
        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      // Error fetching favorites
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if we have a user
    if (!supabaseUser?.id) {
      return;
    }
    fetchFavorites(1, true);
  }, [supabaseUser?.id]);

  const handleImageView = (image: FavoriteImage['image']) => {
    setSelectedImage({
      ...image,
      width: 512, // Default width for missing dimension data
      height: 512, // Default height for missing dimension data
      isLiked: false, // We'll need to track this
      isSaved: true, // Since this is favorites, they're already saved
      saves_count: image.favorites_count
    });
    setIsImageModalOpen(true);
  };

  const handleImageModalClose = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  const handleLike = useCallback(async (imageId: string, currentlyLiked: boolean) => {
    // Prevent multiple simultaneous likes on the same image
    if (likingImages.has(imageId)) {
      return;
    }

    setLikingImages(prev => new Set(prev).add(imageId));

    // Optimistic update
    setFavorites(prev => prev.map(fav =>
      fav.image.id === imageId
        ? {
          ...fav,
          image: {
            ...fav.image,
            isLiked: !currentlyLiked,
            likes_count: currentlyLiked ? fav.image.likes_count - 1 : fav.image.likes_count + 1
          }
        }
        : fav
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
        setFavorites(prev => prev.map(fav =>
          fav.image.id === imageId
            ? {
              ...fav,
              image: {
                ...fav.image,
                isLiked: data.liked,
                likes_count: data.likesCount
              }
            }
            : fav
        ));
      }
    } catch (error) {
      // Revert on error
      setFavorites(prev => prev.map(fav =>
        fav.image.id === imageId
          ? {
            ...fav,
            image: {
              ...fav.image,
              isLiked: currentlyLiked,
              likes_count: currentlyLiked ? fav.image.likes_count + 1 : fav.image.likes_count - 1
            }
          }
          : fav
      ));
      console.error('Error toggling like:', error);
    } finally {
      setLikingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  }, [likingImages]);

  const handleSave = useCallback(async (imageId: string, currentlySaved: boolean) => {
    // Prevent multiple simultaneous saves on the same image
    if (savingImages.has(imageId)) {
      return;
    }

    setSavingImages(prev => new Set(prev).add(imageId));

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
        if (!data.favorited) {
          // Remove from favorites list
          setFavorites(prev => prev.filter(fav => fav.image.id !== imageId));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setSavingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  }, [savingImages]);

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchFavorites(page + 1);
    }
  };

  const LoadingFallback = () => (
    <div className="min-h-screen bg-black text-white">
      <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => { }} />
      <div className="md:ml-20 pb-24 md:pb-8 p-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-800 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-64 animate-pulse"></div>
          </div>

          {/* Masonry Grid skeleton */}
          <Masonry
            breakpointCols={{
              default: 2,
              500: 2,
              768: 2,
              1100: 3,
              1400: 4,
              1600: 5
            }}
            className="masonry-grid"
            columnClassName="masonry-column"
            role="status"
            aria-label="Loading favorites"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const aspectRatios = ['1/1', '3/4', '4/3', '9/16', '16/9', '2/3', '5/4', '3/5'];
              const aspectRatio = aspectRatios[i % aspectRatios.length];

              return (
                <div
                  key={i}
                  className="masonry-item bg-gray-800 rounded-lg animate-pulse relative overflow-hidden mb-4"
                  style={{
                    aspectRatio,
                    maxHeight: '400px'
                  }}
                />
              );
            })}
          </Masonry>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute fallback={<LoadingFallback />}>
      <div className="min-h-screen bg-black text-white">
        <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
          setSignInAction(action);
          setSignInDestination(destinationUrl);
          setIsSignInModalOpen(true);
        }} />
        <div className="md:ml-20 pb-24 md:pb-8 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white font-[var(--font-orbitron)]">Favorites</h1>
              <p className="text-gray-400 mt-1">
                Images you've saved for inspiration
              </p>
            </div>

            {/* Favorites count */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Heart className="h-4 w-4" />
              {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
            </div>

            {/* Favorites Grid */}
            {loading && favorites.length === 0 ? (
              <Masonry
                breakpointCols={{
                  default: 5,
                  1400: 4,
                  1100: 3,
                  768: 2,
                  500: 2
                }}
                className="masonry-grid"
                columnClassName="masonry-column"
                role="status"
                aria-label="Loading favorites"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const aspectRatios = ['1/1', '3/4', '4/3', '9/16', '16/9', '2/3', '5/4', '3/5'];
                  const aspectRatio = aspectRatios[i % aspectRatios.length];

                  return (
                    <div
                      key={i}
                      className="masonry-item bg-gray-800 rounded-lg animate-pulse relative overflow-hidden mb-4"
                      style={{
                        aspectRatio,
                        maxHeight: '400px'
                      }}
                    />
                  );
                })}
              </Masonry>
            ) : favorites.length > 0 ? (
              <>
                <Masonry
                  breakpointCols={{
                    default: 2,
                    500: 2,
                    768: 2,
                    1100: 3,
                    1400: 4,
                    1600: 5
                  }}
                  className="masonry-grid"
                  columnClassName="masonry-column"
                >
                  {favorites.map((favorite) => {
                    const isOwnImage = favorite.image.user.id === supabaseUser?.id;

                    return (
                      <div key={favorite.id} className="masonry-item group relative overflow-hidden rounded-lg mb-4">
                        {/* Image Container */}
                        <button
                          onClick={() => handleImageView(favorite.image)}
                          className="block w-full"
                        >
                          <div
                            className="relative w-full bg-gray-800"
                            style={{
                              aspectRatio: '1/1',
                              maxHeight: '400px'
                            }}
                          >
                            <img
                              src={favorite.image.image_url}
                              alt={favorite.image.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        </button>

                        {/* Three Dots Menu (only for own images) */}
                        {isOwnImage && (
                          <div className="absolute top-2 right-2 z-20">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <div
                                  className="opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100 sm:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 w-8 p-0 bg-gray-800/80 hover:bg-gray-700 text-white backdrop-blur-sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 z-50">
                                <DropdownMenuItem onClick={() => router.push(`/images/${favorite.image.id}`)} className="text-white hover:bg-gray-800">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/images/${favorite.image.id}/edit`)} className="text-white hover:bg-gray-800">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem className="text-white hover:bg-gray-800">
                                  <FolderPlus className="h-4 w-4 mr-2" />
                                  Add to Collection
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Collection Icon for non-user images */}
                        {!isOwnImage && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 bg-gray-800/80 hover:bg-gray-700 text-white backdrop-blur-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // TODO: Add to collection functionality
                              }}
                            >
                              <FolderPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            {/* Title, Model, and Owner */}
                            <div className="mb-3">
                              <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                                {favorite.image.title}
                              </h3>
                              <p className="text-gray-300 text-xs mb-1">
                                {favorite.image.ai_model}
                              </p>
                              <p className="text-gray-400 text-xs">
                                by @{favorite.image.user.username}
                              </p>
                            </div>

                            {/* Actions Row */}
                            <div className="flex items-center justify-between pointer-events-auto">
                              <div className="flex items-center gap-3">
                                {/* Like */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleLike(favorite.image.id, favorite.image.isLiked || false);
                                  }}
                                  className="flex items-center gap-1 text-white hover:scale-110 transition-transform text-xs"
                                >
                                  <Heart className={`w-4 h-4 ${favorite.image.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                  <span>{favorite.image.likes_count}</span>
                                </button>

                                {/* Save/Unsave */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSave(favorite.image.id, true); // Already saved since it's in favorites
                                  }}
                                  className="flex items-center gap-1 text-white hover:scale-110 transition-transform text-xs"
                                >
                                  <Bookmark className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  <span>{favorite.image.favorites_count}</span>
                                </button>
                              </div>

                              {/* Additional actions */}
                              <div className="flex items-center gap-2">
                                {/* Download */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = favorite.image.image_url;
                                    link.download = `${favorite.image.title}.jpg`;
                                    link.click();
                                  }}
                                  className="text-white hover:scale-110 transition-transform"
                                >
                                  <Download className="w-4 h-4" />
                                </button>

                                {/* Share */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (navigator.share) {
                                      navigator.share({
                                        title: favorite.image.title,
                                        url: `/images/${favorite.image.id}`
                                      });
                                    } else {
                                      navigator.clipboard.writeText(`${window.location.origin}/images/${favorite.image.id}`);
                                    }
                                  }}
                                  className="text-white hover:scale-110 transition-transform"
                                >
                                  <Share className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Masonry>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-12 text-center">
                  <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Start exploring and save images that inspire you
                  </p>
                  <Button asChild className="bg-white text-black hover:bg-gray-200">
                    <a href="/">
                      Discover Images
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <ImageModal
            isOpen={isImageModalOpen}
            onClose={handleImageModalClose}
            image={selectedImage}
          />
        )}

        {/* Sign In Modal */}
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          action={signInAction}
          destinationUrl={signInDestination}
        />
      </div>
    </ProtectedRoute>
  );
}