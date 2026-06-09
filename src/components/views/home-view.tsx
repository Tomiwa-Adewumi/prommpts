'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useLibraryCache } from '@/hooks/use-library-cache';
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

interface HomeViewProps {
    onUnauthenticatedAction: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
}

// Loading skeleton component
const LoadingSkeleton = memo(() => {
    const breakpointColumnsObj = {
        default: 5,
        1400: 4,
        1100: 3,
        768: 2,
        500: 2
    };

    return (
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
    );
});
LoadingSkeleton.displayName = 'LoadingSkeleton';

// Main HomeView component
export function HomeView({ onUnauthenticatedAction }: HomeViewProps) {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [savingImages, setSavingImages] = useState<Set<string>>(new Set());

    // Use cached data for trending images - prevents loading flash
    const { data: trendingImages, loading, refresh } = useLibraryCache<DiscoveryImage[]>({
        key: 'homepage_cache',
        fetchFn: async () => {
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
            return data.images || [];
        },
        staleWhileRevalidate: true
    });

    // Local state for optimistic updates on saves
    const [localImageState, setLocalImageState] = useState<Record<string, { isSaved?: boolean; saves_count?: number }>>({});

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

        // Get current state
        const currentImage = trendingImages?.find(img => img.id === imageId);
        const currentSaveCount = localImageState[imageId]?.saves_count ?? currentImage?.saves_count ?? 0;

        // Optimistic update
        setLocalImageState(prev => ({
            ...prev,
            [imageId]: {
                isSaved: !currentlySaved,
                saves_count: currentlySaved ? currentSaveCount - 1 : currentSaveCount + 1
            }
        }));

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
                setLocalImageState(prev => ({
                    ...prev,
                    [imageId]: {
                        isSaved: data.favorited,
                        saves_count: data.favoritesCount
                    }
                }));
            } else {
                // Revert on error
                setLocalImageState(prev => ({
                    ...prev,
                    [imageId]: {
                        isSaved: currentlySaved,
                        saves_count: currentSaveCount
                    }
                }));
            }
        } catch (error) {
            // Revert on error
            setLocalImageState(prev => ({
                ...prev,
                [imageId]: {
                    isSaved: currentlySaved,
                    saves_count: currentSaveCount
                }
            }));
        } finally {
            setSavingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(imageId);
                return newSet;
            });
        }
    };

    const handleSendPrompt = () => {
        if (!searchQuery.trim()) return;

        if (!isSignedIn) {
            onUnauthenticatedAction('view');
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
        mediaType: 'image',
        createdAt: img.created_at,
        width: img.width,
        height: img.height,
        isOwner: false,
        title: img.title,
        description: img.description,
        username: img.user.username,
        userAvatar: img.user.avatar_url
    });

    // Get save state with local overrides
    const getImageSaveState = (img: DiscoveryImage) => {
        const localState = localImageState[img.id];
        return {
            isSaved: localState?.isSaved ?? img.isSaved ?? false,
            savesCount: localState?.saves_count ?? img.saves_count
        };
    };

    return (
        <div className="min-h-screen">
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
                                placeholder="generate anything......."
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
                    <LoadingSkeleton />
                ) : (
                    <>
                        <Masonry
                            breakpointCols={breakpointColumnsObj}
                            className="masonry-grid"
                            columnClassName="masonry-column"
                        >
                            {(trendingImages || []).map((image) => {
                                const saveState = getImageSaveState(image);
                                return (
                                    <div key={image.id} className="masonry-item mb-4">
                                        <LibraryImageCard
                                            item={getLibraryItem(image)}
                                            showEdit={false}
                                            isSaved={saveState.isSaved}
                                            savesCount={saveState.savesCount}
                                            onToggleSave={(id, current) => handleSave(id, current)}
                                            onUnauthenticatedAction={onUnauthenticatedAction}
                                        />
                                    </div>
                                );
                            })}
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
    );
}

// Skeleton component for suspense/loading states
export const HomeViewSkeleton = memo(() => (
    <div className="min-h-screen">
        {/* Header Section Skeleton */}
        <div className="text-center py-16 px-4">
            <div className={`text-5xl font-bold mb-8 ${orbitron.className} tracking-wider text-zinc-800 animate-pulse`}>
                PROMMMT
            </div>

            {/* Input Bar Skeleton */}
            <div className="max-w-2xl mx-auto mb-8">
                <div className="h-16 bg-zinc-900/50 rounded-lg border border-white/5 animate-pulse" />
            </div>

            {/* Navigation Links Skeleton */}
            <div className="flex justify-center gap-8 mb-12">
                <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
            </div>
        </div>

        {/* Grid Skeleton */}
        <div className="pb-24 md:pb-8 p-4 md:p-8">
            <LoadingSkeleton />
        </div>
    </div>
));
HomeViewSkeleton.displayName = 'HomeViewSkeleton';
