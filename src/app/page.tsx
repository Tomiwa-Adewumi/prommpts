'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { analytics } from '@/lib/analytics/mixpanel';

import { Send } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { orbitron } from '@/lib/fonts';
import { LibraryImageCard, LibraryItem } from '@/components/images/library-image-card';

// Define the image type to match what the discover API provides
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

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [trendingImages, setTrendingImages] = useState<DiscoveryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [signInDestination, setSignInDestination] = useState<string | undefined>(undefined);
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set());

  const fetchTrendingImages = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch images from @tumifnx user only
      const response = await fetch('/api/images/discover?sortBy=trending&limit=30&username=tumifnx', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trending images');
      }

      const data = await response.json();
      setTrendingImages(data.images || []);
    } catch (error) {
      console.error('Error fetching trending images:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingImages();
  }, [fetchTrendingImages]);

  const handleSave = async (imageId: string, currentlySaved: boolean) => {
    if (!isSignedIn) {
      setSignInAction('save');
      setIsSignInModalOpen(true);
      return;
    }

    // Prevent multiple simultaneous saves on the same image
    if (savingImages.has(imageId)) {
      return;
    }

    setSavingImages(prev => new Set(prev).add(imageId));

    // Optimistic update
    setTrendingImages(prev => prev.map(img =>
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
        setTrendingImages(prev => prev.map(img =>
          img.id === imageId
            ? {
              ...img,
              isSaved: data.favorited,
              saves_count: data.favoritesCount
            }
            : img
        ));
      } else {
        // Revert on error
        setTrendingImages(prev => prev.map(img =>
          img.id === imageId
            ? {
              ...img,
              isSaved: currentlySaved,
              saves_count: currentlySaved ? (img.saves_count || 0) + 1 : (img.saves_count || 0) - 1
            }
            : img
        ));
        throw new Error('Failed to save image');
      }
    } catch (error) {
      // Revert on error
      setTrendingImages(prev => prev.map(img =>
        img.id === imageId
          ? {
            ...img,
            isSaved: currentlySaved,
            saves_count: currentlySaved ? (img.saves_count || 0) + 1 : (img.saves_count || 0) - 1
          }
          : img
      ));
    } finally {
      // Always remove from saving set
      setSavingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleImageView = (imageId: string) => {
    // Navigate to image detail page
    router.push(`/images/${imageId}?source=home`);
    analytics.trackImageViewed('homepage');
  };

  const handleCloseSignInModal = () => {
    setIsSignInModalOpen(false);
  };

  const handleSendPrompt = () => {
    if (!searchQuery.trim()) return;

    if (!isSignedIn) {
      setSignInAction('view');
      setIsSignInModalOpen(true);
      return;
    }

    // Pass prompt via query param to dashboard generate view
    router.push(`/dashboard?view=generate&prompt=${encodeURIComponent(searchQuery)}`);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSendPrompt();
    }
  };

  const breakpointColumnsObj = {
    default: 5,
    1400: 4,
    1100: 3,
    768: 2,
    500: 2
  };

  // Convert DiscoveryImage to LibraryItem for the card component
  const getLibraryItem = (img: DiscoveryImage): LibraryItem => ({
    id: img.id,
    url: img.image_url,
    prompt: img.prompt,
    model: img.ai_model,
    mediaType: 'image', // Assuming mostly images for now
    createdAt: img.created_at,
    width: img.width,
    height: img.height,
    isOwner: false, // Discovery items aren't owned by viewer usually
    title: img.title,
    description: img.description,
    username: img.user.username,
    userAvatar: img.user.avatar_url
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
        setSignInAction(action);
        setSignInDestination(destinationUrl);
        setIsSignInModalOpen(true);
      }} />

      {/* Main Content */}
      <div className="md:ml-20 min-h-screen">
        {/* Header Section */}
        <div className="text-center py-16 px-4">
          <h1 className={`text-5xl font-bold mb-8 ${orbitron.className} tracking-wider`}>
            PROMMMT
          </h1>

          {/* Input Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F1E500] to-[#F1E500] rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>

              <div className="relative flex items-center bg-[#18181B] rounded-lg border border-white/10 overflow-hidden">
                <Input
                  type="text"
                  placeholder="generate anything ......."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full px-6 py-6 bg-transparent border-none text-white placeholder-gray-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-light tracking-wide"
                />
                <button
                  onClick={handleSendPrompt}
                  className={`p-4 transition-colors ${searchQuery.trim() ? 'text-[#F1E500] hover:text-[#d4c800]' : 'text-gray-600'}`}
                  disabled={!searchQuery.trim()}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex justify-center gap-8 mb-12">
            <Link href="/master" className="text-gray-400 hover:text-white transition-colors">
              Become a Master
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
              For Brands
            </Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
          </div>
        </div>

        {/* Masonry Grid Gallery */}
        <div className="pb-24 md:pb-8 p-4 md:p-8">
          {loading ? (
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="masonry-grid"
              columnClassName="masonry-column"
            >
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="masonry-item bg-zinc-900/50 aspect-square animate-pulse mb-1 border border-white/5 rounded-lg"
                />
              ))}
            </Masonry>
          ) : (
            <>
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="masonry-grid"
                columnClassName="masonry-column"
              >
                {trendingImages.map((image) => (
                  <div key={image.id} className="masonry-item mb-4">
                    <LibraryImageCard
                      item={getLibraryItem(image)}
                      showEdit={false}
                      isSaved={image.isSaved}
                      savesCount={image.saves_count}
                      onToggleSave={(id, current) => handleSave(id, current)}
                      onUnauthenticatedAction={(action, dest) => {
                        setSignInAction(action);
                        setSignInDestination(dest);
                        setIsSignInModalOpen(true);
                      }}
                    />
                  </div>
                ))}
              </Masonry>

              {/* See More / Generate Yours Button */}
              <div className="text-center mt-12 mb-12">
                <Link
                  href="/dashboard?view=generate"
                  className="inline-flex items-center h-14 bg-gradient-to-b from-white to-gray-200 hover:from-white hover:to-gray-100 text-black font-bold px-8 rounded-xl transition-all shadow-[0_4px_0_0_#9ca3af] hover:shadow-[0_4px_0_0_#6b7280] active:shadow-[0_2px_0_0_#9ca3af] active:translate-y-[2px] text-xl font-mono tracking-tight"
                >
                  Generate Yours
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={handleCloseSignInModal}
        action={signInAction}
        destinationUrl={signInDestination}
      />
    </div>
  );
}
