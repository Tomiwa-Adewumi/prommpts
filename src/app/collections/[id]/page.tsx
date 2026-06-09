'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ImageModal } from '@/components/images/image-modal';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { AddImagesToCollectionModal } from '@/components/collections/add-images-modal';
import Masonry from 'react-masonry-css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Globe, 
  Lock,
  Heart,
  Save,
  Share2,
  MoreVertical,
  X,
  Loader2,
  ImageIcon,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CollectionImage {
  id: string;
  position: number;
  added_at: string;
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
    is_public: boolean;
    tags: string[];
    created_at: string;
    user_id: string;
    isLiked?: boolean;
    isSaved?: boolean;
    user: {
      id: string;
      username: string;
      avatar_url?: string;
    };
  };
}

interface CollectionDetails {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  images_count: number;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  images: CollectionImage[];
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  isLiked?: boolean;
}

export default function CollectionPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const { supabaseUser, clerkUser } = useAuth();
  
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [signInDestination, setSignInDestination] = useState<string | undefined>(undefined);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [likingImages, setLikingImages] = useState<Set<string>>(new Set());
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set());
  const [isAddImagesModalOpen, setIsAddImagesModalOpen] = useState(false);
  const [likingCollection, setLikingCollection] = useState(false);
  const [shareButtonState, setShareButtonState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (id) {
      fetchCollectionDetails();
    }
  }, [id]);

  useEffect(() => {
    // Check if current user is the owner
    if (collection && supabaseUser) {
      setIsOwner(collection.user_id === supabaseUser.id);
    } else {
      setIsOwner(false);
    }
  }, [collection, supabaseUser]);

  const fetchCollectionDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      setCollection(data.collection);
      
      // Record view after successfully loading collection
      recordView();
    } catch (err) {
      console.error('Error fetching collection:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      // Record the view (fire and forget - don't block UI)
      fetch(`/api/collections/${id}/view`, {
        method: 'POST',
        credentials: 'include' // Include auth cookies if available
      }).catch(error => {
        // Silent fail - view tracking shouldn't break the user experience
        console.debug('View tracking failed:', error);
      });
    } catch (error) {
      // Silent fail
      console.debug('View tracking error:', error);
    }
  };

  const handleImageClick = (collectionImage: CollectionImage) => {
    // Require authentication to view image details/prompts
    if (!supabaseUser) {
      setSignInAction('view');
      setSignInDestination(undefined);
      setIsSignInModalOpen(true);
      return;
    }

    // Map collection image structure to ImageModal expected format
    const modalImage = {
      id: collectionImage.image.id,
      title: collectionImage.image.title,
      description: collectionImage.image.description,
      image_url: collectionImage.image.image_url,
      prompt: collectionImage.image.prompt,
      ai_model: collectionImage.image.ai_model,
      model_version: '',
      tags: collectionImage.image.tags || [],
      width: 512, // Default width since we don't have this data
      height: 512, // Default height since we don't have this data
      likes_count: collectionImage.image.likes_count,
      saves_count: collectionImage.image.favorites_count,
      created_at: collectionImage.image.created_at,
      isLiked: false, // We'd need to check this with an API call
      isSaved: false, // We'd need to check this with an API call
      user: {
        id: collectionImage.image.user.id,
        username: collectionImage.image.user.username,
        full_name: collectionImage.image.user.username,
        avatar_url: collectionImage.image.user.avatar_url
      }
    };
    setSelectedImage(modalImage);
    setIsImageModalOpen(true);
  };

  const handleLike = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!supabaseUser) {
      setSignInAction('like');
      setSignInDestination(undefined);
      setIsSignInModalOpen(true);
      return;
    }

    // Prevent multiple simultaneous likes on the same image
    if (likingImages.has(imageId)) {
      return;
    }

    // Get current like state
    const currentImage = collection?.images.find(item => item.image.id === imageId);
    if (!currentImage) return;

    const currentlyLiked = currentImage.image.isLiked || false;
    
    setLikingImages(prev => new Set(prev).add(imageId));
    
    // Optimistic update
    setCollection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        images: prev.images.map(item =>
          item.image.id === imageId
            ? { 
                ...item, 
                image: { 
                  ...item.image, 
                  isLiked: !currentlyLiked,
                  likes_count: currentlyLiked ? item.image.likes_count - 1 : item.image.likes_count + 1
                }
              }
            : item
        )
      };
    });

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
        // Update with actual data from server
        setCollection(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map(item =>
              item.image.id === imageId
                ? { 
                    ...item, 
                    image: { 
                      ...item.image, 
                      isLiked: data.liked,
                      likes_count: data.likesCount
                    }
                  }
                : item
            )
          };
        });
      }
    } catch (error) {
      // Revert on error
      setCollection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map(item =>
            item.image.id === imageId
              ? { 
                  ...item, 
                  image: { 
                    ...item.image, 
                    isLiked: currentlyLiked,
                    likes_count: currentlyLiked ? item.image.likes_count + 1 : item.image.likes_count - 1
                  }
                }
              : item
          )
        };
      });
      console.error('Error liking image:', error);
    } finally {
      // Always remove from loading set
      setLikingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleSave = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!supabaseUser) {
      setSignInAction('save');
      setSignInDestination(undefined);
      setIsSignInModalOpen(true);
      return;
    }

    // Prevent multiple simultaneous saves on the same image
    if (savingImages.has(imageId)) {
      return;
    }

    // Get current save state
    const currentImage = collection?.images.find(item => item.image.id === imageId);
    if (!currentImage) return;

    const currentlySaved = currentImage.image.isSaved || false;
    
    setSavingImages(prev => new Set(prev).add(imageId));
    
    // Optimistic update
    setCollection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        images: prev.images.map(item =>
          item.image.id === imageId
            ? { 
                ...item, 
                image: { 
                  ...item.image, 
                  isSaved: !currentlySaved,
                  favorites_count: currentlySaved ? item.image.favorites_count - 1 : item.image.favorites_count + 1
                }
              }
            : item
        )
      };
    });

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
        // Update with actual data from server
        setCollection(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map(item =>
              item.image.id === imageId
                ? { 
                    ...item, 
                    image: { 
                      ...item.image, 
                      isSaved: data.favorited,
                      favorites_count: data.favoritesCount
                    }
                  }
                : item
            )
          };
        });
      }
    } catch (error) {
      // Revert on error
      setCollection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map(item =>
            item.image.id === imageId
              ? { 
                  ...item, 
                  image: { 
                    ...item.image, 
                    isSaved: currentlySaved,
                    favorites_count: currentlySaved ? item.image.favorites_count + 1 : item.image.favorites_count - 1
                  }
                }
              : item
          )
        };
      });
      console.error('Error saving image:', error);
    } finally {
      // Always remove from saving set
      setSavingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!isOwner || removingImageId) return;

    setRemovingImageId(imageId);

    try {
      const response = await fetch(
        `/api/collections/${id}/images?image_id=${imageId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Remove the image from the collection
        setCollection(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.filter(item => item.image.id !== imageId),
            images_count: prev.images_count - 1
          };
        });
      }
    } catch (error) {
      console.error('Error removing image:', error);
    } finally {
      setRemovingImageId(null);
    }
  };

  const handleAddImages = () => {
    setIsAddImagesModalOpen(true);
  };

  const handleImagesAdded = (imageIds: string[]) => {
    // Refresh the collection data to show the new images
    fetchCollectionDetails();
  };

  const handleEditCollection = () => {
    // Navigate to edit collection or open edit modal
    router.push(`/dashboard/images?tab=collections&edit=${id}`);
  };

  const handleShareCollection = async () => {
    const collectionUrl = window.location.href;
    
    try {
      // Try to use native share if available (mobile)
      if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        await navigator.share({
          title: collection?.title,
          text: `Check out this collection: ${collection?.title}`,
          url: collectionUrl
        });
      } else {
        // Copy to clipboard for desktop
        await navigator.clipboard.writeText(collectionUrl);
        setShareButtonState('copied');
        toast.success('Collection URL copied to clipboard!', {
          description: 'Share this link with others to show them your collection.',
          duration: 3000,
        });
        
        // Reset button state after 2 seconds
        setTimeout(() => {
          setShareButtonState('idle');
        }, 2000);
      }
    } catch (error) {
      // Fallback if clipboard fails
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to copy URL', {
          description: 'Please try again or copy the URL manually from the address bar.',
        });
      }
    }
  };

  const handleLikeCollection = async () => {
    if (!supabaseUser) {
      setSignInAction('like');
      setSignInDestination(undefined);
      setIsSignInModalOpen(true);
      return;
    }

    if (likingCollection || !collection) return;

    const currentlyLiked = collection.isLiked || false;
    setLikingCollection(true);

    // Optimistic update
    setCollection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        isLiked: !currentlyLiked,
        likes_count: currentlyLiked ? prev.likes_count - 1 : prev.likes_count + 1
      };
    });

    try {
      const response = await fetch(`/api/collections/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Update with actual data from server
        setCollection(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            isLiked: data.liked,
            likes_count: data.likesCount
          };
        });
      } else {
        throw new Error('Failed to like collection');
      }
    } catch (error) {
      // Revert on error
      setCollection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isLiked: currentlyLiked,
          likes_count: currentlyLiked ? prev.likes_count + 1 : prev.likes_count - 1
        };
      });
      console.error('Error liking collection:', error);
    } finally {
      setLikingCollection(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Collection not found'}</p>
          <Button 
            onClick={() => router.push('/dashboard/images')}
            className="bg-white text-black hover:bg-gray-200"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm border-b border-gray-800 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                // Check if there's browser history to go back to
                if (window.history.length > 1) {
                  router.back();
                } else {
                  // If no history (direct access), go to homepage
                  router.push('/');
                }
              }}
              className="flex items-center text-white hover:scale-105 transition-transform bg-transparent border-none p-2 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Back
            </button>

            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddImages}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Images
                </Button>
                <button
                  onClick={handleEditCollection}
                  className="flex items-center text-white hover:scale-105 transition-transform bg-transparent border border-gray-600 rounded-md px-3 py-2 cursor-pointer"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collection Info */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{collection.title}</h1>
              {collection.description && (
                <p className="text-gray-400 text-lg mb-4">{collection.description}</p>
              )}
              
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Badge variant={collection.is_public ? "default" : "secondary"} className="w-fit">
                  {collection.is_public ? (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </>
                  )}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{collection.images_count} images</span>
                  <span>{collection.likes_count} likes</span>
                  <span>{collection.views_count} views</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <img
                  src={collection.user.avatar_url || '/default-avatar.png'}
                  alt={collection.user.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-gray-300">by {collection.user.username}</span>
              </div>

              {!supabaseUser && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Sign in to view image prompts and interact with images
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isOwner && (
                <button
                  onClick={handleLikeCollection}
                  disabled={likingCollection}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    collection?.isLiked 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${collection?.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{collection?.likes_count || 0}</span>
                  {likingCollection && <Loader2 className="h-3 w-3 animate-spin" />}
                </button>
              )}
              <button
                onClick={handleShareCollection}
                className={`flex items-center justify-center text-white hover:scale-105 transition-all bg-transparent border rounded-lg h-10 px-3 cursor-pointer ${
                  shareButtonState === 'copied' 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                title={shareButtonState === 'copied' ? 'Copied!' : 'Share collection'}
              >
                {shareButtonState === 'copied' ? (
                  <>
                    <Check className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm ml-1">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        {collection.images.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700 p-12 text-center">
            <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No images in this collection yet
            </h3>
            {isOwner && (
              <>
                <p className="text-gray-400 mb-6">
                  Start adding images to your collection
                </p>
                <Button 
                  onClick={handleAddImages}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Image
                </Button>
              </>
            )}
          </Card>
        ) : (
          <Masonry
            breakpointCols={{
              default: 5,
              1400: 4,
              1100: 3,
              768: 2,
              500: 1
            }}
            className="masonry-grid"
            columnClassName="masonry-column"
          >
            {collection.images.map((item) => (
              <div key={item.image.id} className="masonry-item group relative mb-4">
                <div
                  className="cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => handleImageClick(item)}
                >
                  <img
                    src={item.image.image_url}
                    alt={item.image.title}
                    className="w-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Overlay - Always visible on mobile, hover on desktop */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                        {item.image.title}
                      </h3>
                      <p className="text-gray-300 text-xs mb-3">
                        {item.image.ai_model}
                      </p>


                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleLike(item.image.id, e)}
                            disabled={likingImages.has(item.image.id)}
                            className={`flex items-center gap-1 text-white hover:scale-110 transition-transform ${
                              item.image.isLiked ? 'text-red-500' : ''
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${item.image.isLiked ? 'fill-current' : ''}`} />
                            <span className="text-xs">{item.image.likes_count}</span>
                          </button>
                          
                          <button
                            onClick={(e) => handleSave(item.image.id, e)}
                            disabled={savingImages.has(item.image.id)}
                            className={`flex items-center gap-1 text-white hover:scale-110 transition-transform ${
                              item.image.isSaved ? 'text-yellow-500' : ''
                            }`}
                          >
                            <Save className={`w-4 h-4 ${item.image.isSaved ? 'fill-current' : ''}`} />
                            <span className="text-xs">{item.image.favorites_count}</span>
                          </button>
                        </div>

                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white hover:bg-gray-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(item.image.id);
                                }}
                                disabled={removingImageId === item.image.id}
                                className="text-red-400 hover:bg-gray-800"
                              >
                                {removingImageId === item.image.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 mr-2" />
                                )}
                                Remove from Collection
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImage(null);
          }}
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

      {/* Add Images Modal */}
      {isOwner && collection && (
        <AddImagesToCollectionModal
          isOpen={isAddImagesModalOpen}
          onClose={() => setIsAddImagesModalOpen(false)}
          collectionId={collection.id}
          collectionTitle={collection.title}
          existingImageIds={collection.images.map(item => item.image.id)}
          onImagesAdded={handleImagesAdded}
        />
      )}
    </div>
  );
}