'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Bookmark,
  Share2,
  Download,
  Copy,
  ArrowLeft,
  Calendar,
  Settings,
  Edit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber, formatDate } from '@/lib/utils';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { ImageConfigModal } from '@/components/images/image-config-modal';
import { useAuth } from '@/hooks/use-auth';
import { MediaSlider } from '@/components/gallery/media-slider';
import {
  getItemFromGalleryContext,
  getNavigationFromContext,
  GalleryItem
} from '@/lib/gallery-context';

interface ImageDetail {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  prompt: string;
  negative_prompt?: string;
  ai_model: string;
  model_version?: string;
  seed?: number;
  steps?: number;
  cfg_scale?: number;
  width: number;
  height: number;
  aspect_ratio?: string;
  media_type?: 'image' | 'video';
  likes_count: number;
  comments_count: number;
  tags: string[];
  created_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export default function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { isSignedIn } = useAuth();

  // Check gallery context cache synchronously for instant display
  const getCachedImage = (): { image: ImageDetail | null; navigation: { prevId: string | null; nextId: string | null } } => {
    const cachedItem = getItemFromGalleryContext(resolvedParams.id);
    if (cachedItem) {
      // Convert GalleryItem to ImageDetail format
      const imageFromCache: ImageDetail = {
        id: cachedItem.id,
        title: cachedItem.title || '',
        description: cachedItem.description,
        image_url: cachedItem.url,
        prompt: cachedItem.prompt,
        ai_model: cachedItem.model,
        aspect_ratio: cachedItem.aspectRatio,
        media_type: cachedItem.mediaType,
        width: 0, // Will be filled by API if needed
        height: 0,
        likes_count: 0,
        comments_count: 0,
        tags: [],
        created_at: cachedItem.createdAt,
        user: {
          id: '', // Will be filled by API
          username: '',
          full_name: '',
          avatar_url: ''
        }
      };
      const nav = getNavigationFromContext(resolvedParams.id);
      return { image: imageFromCache, navigation: nav };
    }
    return { image: null, navigation: { prevId: null, nextId: null } };
  };

  const initialCache = getCachedImage();
  const [image, setImage] = useState<ImageDetail | null>(initialCache.image);
  const [loading, setLoading] = useState(!initialCache.image); // Only show loading if no cache
  const [userInteraction, setUserInteraction] = useState({
    hasFavorited: false
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Auth Modal State
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');

  // Config Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Navigation State - initialized from cache if available
  const [navigation, setNavigation] = useState<{ prevId: string | null; nextId: string | null }>(initialCache.navigation);

  // Track if we've fetched full data from API
  const [hasFetchedFullData, setHasFetchedFullData] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/images/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch image');
        }

        const data = await response.json();
        // Update with full data from API (more complete than cache)
        setImage(data.image);
        setUserInteraction(data.userInteraction || { hasFavorited: false });
        setCurrentUserId(data.currentUserId);
        setHasFetchedFullData(true);
      } catch (error) {
        console.error(error);
        // If we had cached data, it's still showing - don't break the UX
      } finally {
        setLoading(false);
      }
    };

    // Always fetch from API to get complete data (user info, interaction state, etc.)
    // But since we showed cached data instantly, this is a background refresh
    fetchImage();
  }, [resolvedParams.id]);

  // Gallery State (Prefetching cache) - now uses gallery context
  const [prefetchCache, setPrefetchCache] = useState<Record<string, ImageDetail>>({});

  // Update navigation from gallery context when image changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');

    if (source === 'library') {
      // Use cached navigation from gallery context (instant!)
      const nav = getNavigationFromContext(resolvedParams.id);
      setNavigation(nav);
    } else {
      setNavigation({ prevId: null, nextId: null });
    }
  }, [resolvedParams.id]);

  const prefetchImage = async (id: string) => {
    if (prefetchCache[id]) return; // Already cached
    try {
      const res = await fetch(`/api/images/${id}`);
      const data = await res.json();
      if (data.image) {
        setPrefetchCache(prev => ({ ...prev, [id]: data.image }));
      }
    } catch (e) { console.error("Prefetch failed", e); }
  };

  const handleNavigate = async (direction: 'prev' | 'next', targetId: string) => {
    // 1. Try gallery context cache first (instant!)
    const cachedItem = getItemFromGalleryContext(targetId);
    if (cachedItem) {
      // Convert to ImageDetail format
      const imageFromCache: ImageDetail = {
        id: cachedItem.id,
        title: cachedItem.title || '',
        description: cachedItem.description,
        image_url: cachedItem.url,
        prompt: cachedItem.prompt,
        ai_model: cachedItem.model,
        aspect_ratio: cachedItem.aspectRatio,
        media_type: cachedItem.mediaType,
        width: 0,
        height: 0,
        likes_count: 0,
        comments_count: 0,
        tags: [],
        created_at: cachedItem.createdAt,
        user: image?.user || { id: '', username: '', full_name: '', avatar_url: '' }
      };
      setImage(imageFromCache);
    } else if (prefetchCache[targetId]) {
      // 2. Fall back to prefetch cache
      setImage(prefetchCache[targetId]);
    } else {
      // 3. Last resort: fetch from API
      setLoading(true);
      try {
        const res = await fetch(`/api/images/${targetId}`);
        const data = await res.json();
        if (data.image) setImage(data.image);
      } finally {
        setLoading(false);
      }
    }

    // Update URL silently
    const searchParams = new URLSearchParams(window.location.search);
    const newUrl = `/images/${targetId}?${searchParams.toString()}`;
    window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);

    // Update navigation from gallery context
    const nav = getNavigationFromContext(targetId);
    setNavigation(nav);

    // Reset interactions for new image
    setUserInteraction({ hasFavorited: false });

    // Fetch full data in background to get user info, interaction state, etc.
    fetch(`/api/images/${targetId}`)
      .then(res => res.json())
      .then(data => {
        if (data.image) setImage(data.image);
        if (data.userInteraction) setUserInteraction(data.userInteraction);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
      })
      .catch(console.error);
  };

  // ... (keep auth checks)

  if (loading) {
    // ... (keep skeleton)
    return (
      // ... skeleton code ...
      <div className="min-h-screen bg-black text-white">
        <HomeSidebar onUnauthenticatedAction={() => setIsSignInModalOpen(true)} />
        <div className="md:ml-20 pb-24 md:pb-8 p-4 md:p-8">
          <Button variant="ghost" disabled className="mb-6 text-zinc-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto animate-pulse">
            {/* Image Skeleton */}
            <div className="aspect-square rounded-lg bg-zinc-900/50 border border-white/5 w-full"></div>
          </div>
        </div>
      </div>
    )
  }


  const handleFavorite = async () => {
    if (!isSignedIn) {
      setSignInAction('save');
      setIsSignInModalOpen(true);
      return;
    }

    if (!image) return;

    const currentlyFavorited = userInteraction.hasFavorited;
    setUserInteraction(prev => ({ ...prev, hasFavorited: !currentlyFavorited }));

    try {
      const response = await fetch(`/api/images/${image.id}/favorite`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setUserInteraction(prev => ({ ...prev, hasFavorited: data.favorited }));
      } else {
        setUserInteraction(prev => ({ ...prev, hasFavorited: currentlyFavorited }));
        throw new Error('Failed to favorite image');
      }
    } catch (error) {
      setUserInteraction(prev => ({ ...prev, hasFavorited: currentlyFavorited }));
    }
  };

  const handleConfig = () => {
    if (!image) return;
    setConfigModalOpen(true);
  };

  const handleUpdateConfig = (id: string, updates: { prompt: string; ai_model: string }) => {
    if (image) {
      setImage({ ...image, prompt: updates.prompt, ai_model: updates.ai_model });
    }
  };

  const handleEdit = () => {
    if (!isSignedIn) {
      setSignInAction('view'); // Generic action for now
      setIsSignInModalOpen(true);
      return;
    }

    if (!image) return;
    // Redirect to generate page with image as reference
    const params = new URLSearchParams();
    params.set('referenceUrl', image.image_url);
    params.set('mediaType', 'image'); // Assuming image for now

    router.push(`/dashboard?view=generate&${params.toString()}`);
  };

  const copyPrompt = () => {
    if (image?.prompt) {
      navigator.clipboard.writeText(image.prompt);
    }
  };

  const shareImage = () => {
    if (navigator.share) {
      navigator.share({
        title: image?.title,
        text: image?.prompt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <HomeSidebar onUnauthenticatedAction={() => setIsSignInModalOpen(true)} />
        <div className="md:ml-20 pb-24 md:pb-8 p-4 md:p-8">
          <Button variant="ghost" disabled className="mb-6 text-zinc-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto animate-pulse">
            {/* Image Column Skeleton */}
            <div className="space-y-6">
              <div className="aspect-square rounded-lg bg-zinc-900/50 border border-white/5 w-full"></div>
              <div className="h-16 bg-zinc-900/50 border border-white/5 rounded-xl w-full"></div>
            </div>

            {/* Details Column Skeleton */}
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-4">
                <div className="h-10 bg-zinc-800/50 rounded-lg w-3/4"></div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-800/50"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-zinc-800/50 rounded w-32"></div>
                    <div className="h-3 bg-zinc-800/50 rounded w-24"></div>
                  </div>
                </div>
              </div>

              {/* Prompt Skeleton */}
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 h-48">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-zinc-800/50 rounded w-20"></div>
                  <div className="h-4 bg-zinc-800/50 rounded w-16"></div>
                </div>
                <div className="h-24 bg-black/50 rounded-lg border border-white/5"></div>
              </div>

              {/* Settings Skeleton */}
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 h-64">
                <div className="h-4 bg-zinc-800/50 rounded w-32 mb-6"></div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2"><div className="h-3 bg-zinc-800/50 w-12"></div><div className="h-4 bg-zinc-800/50 w-24"></div></div>
                  <div className="space-y-2"><div className="h-3 bg-zinc-800/50 w-12"></div><div className="h-4 bg-zinc-800/50 w-24"></div></div>
                  <div className="space-y-2"><div className="h-3 bg-zinc-800/50 w-12"></div><div className="h-4 bg-zinc-800/50 w-24"></div></div>
                  <div className="space-y-2"><div className="h-3 bg-zinc-800/50 w-12"></div><div className="h-4 bg-zinc-800/50 w-24"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!image) {
    return notFound();
  }

  const isOwner = currentUserId === image.user.id;

  return (
    <div className="min-h-screen bg-black text-white">
      <HomeSidebar onUnauthenticatedAction={(action) => {
        setSignInAction(action);
        setIsSignInModalOpen(true);
      }} />

      <div className="md:ml-20 pb-24 md:pb-8 p-4 md:p-8">
        {/* Back Button */}
        <Link
          href={`/dashboard/images?filter=${new URLSearchParams(window.location.search).get('filter') || 'all'}`}
          className="inline-flex items-center mb-6 text-zinc-400 hover:text-white hover:bg-zinc-900 px-4 py-2 rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image Column */}
          <div className="space-y-6">
            <div className="space-y-6">
              <MediaSlider
                currentImage={image}
                navigation={navigation}
                onNavigate={handleNavigate}
                isOwner={isOwner!}
              />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  className={`text-zinc-400 hover:text-white hover:bg-white/10 ${userInteraction.hasFavorited ? 'text-[#F1E500]' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${userInteraction.hasFavorited ? 'fill-[#F1E500] text-[#F1E500]' : ''}`} />
                  {userInteraction.hasFavorited ? 'Saved' : 'Save'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleConfig}
                    className="text-zinc-400 hover:text-[#F1E500] hover:bg-white/10"
                    title="Config: Load prompt and settings"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Config
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="text-zinc-400 hover:text-[#F1E500] hover:bg-white/10"
                  title="Edit: Use as reference image"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <Button variant="ghost" size="icon" onClick={shareImage} className="text-zinc-400 hover:text-white hover:bg-white/10">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white hover:bg-white/10">
                  <a href={image.image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="space-y-6">
            {/* Title & Creator */}
            <div className="space-y-4">


              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarImage src={image.user.avatar_url} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">{image.user.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{image.user.full_name}</p>
                  <p className="text-sm text-zinc-500">@{image.user.username}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-sm text-zinc-600">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(image.created_at)}
                </div>
              </div>
            </div>

            {/* Prompt Card */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#F1E500] uppercase tracking-wider">Prompt</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPrompt}
                  className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed font-mono bg-black/50 p-3 rounded-lg border border-white/5">
                {image.prompt}
              </p>
              {image.negative_prompt && (
                <div className="mt-4">
                  <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-2">Negative Prompt</h4>
                  <p className="text-sm text-zinc-400 font-mono bg-black/50 p-3 rounded-lg border border-white/5">
                    {image.negative_prompt}
                  </p>
                </div>
              )}
            </div>

            {/* Settings Grid */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-[#F1E500]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Generation Settings</h3>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">Model</span>
                  <p className="font-medium text-zinc-200">{image.ai_model}</p>
                </div>
                {image.model_version && (
                  <div>
                    <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">Version</span>
                    <p className="font-medium text-zinc-200">{image.model_version}</p>
                  </div>
                )}
                <div>
                  <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">Dimensions</span>
                  <p className="font-medium text-zinc-200">
                    {image.width && image.height ? `${image.width} × ${image.height}` : (image.aspect_ratio || 'N/A')}
                  </p>
                </div>
                {image.seed && (
                  <div>
                    <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">Seed</span>
                    <p className="font-medium text-zinc-200 font-mono">{image.seed}</p>
                  </div>
                )}
                {image.steps && (
                  <div>
                    <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">Steps</span>
                    <p className="font-medium text-zinc-200">{image.steps}</p>
                  </div>
                )}
                {image.cfg_scale && (
                  <div>
                    <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">CFG Scale</span>
                    <p className="font-medium text-zinc-200">{image.cfg_scale}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {image.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-white/5 px-3 py-1.5"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        action={signInAction}
      />

      {image && (
        <ImageConfigModal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          image={{
            id: image.id,
            title: image.title || '',
            prompt: image.prompt,
            model: image.ai_model
          }}
          onUpdate={handleUpdateConfig}
        />
      )}
    </div>
  );
}