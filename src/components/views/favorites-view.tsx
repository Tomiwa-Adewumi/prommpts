'use client';

import { useState, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLibraryCache } from '@/hooks/use-library-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { orbitron } from '@/lib/fonts';
import { LibraryImageCard, LibraryItem } from '@/components/images/library-image-card';

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

interface FavoritesViewProps {
    onUnauthenticatedAction: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
}

// Loading skeleton
const LoadingSkeleton = memo(() => (
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
    >
        {Array.from({ length: 15 }).map((_, i) => (
            <div
                key={i}
                className="masonry-item bg-zinc-900/50 aspect-square animate-pulse mb-1 border border-white/5 rounded-lg"
            />
        ))}
    </Masonry>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

export function FavoritesView({ onUnauthenticatedAction }: FavoritesViewProps) {
    const { supabaseUser } = useAuth();

    // Local pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Use library cache for the initial load
    const {
        data: cachedFavorites,
        loading: initialLoading,
        refresh
    } = useLibraryCache<FavoriteImage[]>({
        key: 'favorites_cache',
        fetchFn: async () => {
            // Always fetch page 1 for the cache
            const response = await fetch(`/api/user/favorites?page=1&include_interactions=true`);
            if (!response.ok) throw new Error('Failed to fetch favorites');

            const data = await response.json();

            // Update pagination state based on first fetch
            setPage(1);
            setHasMore(data.pagination.hasMore);

            return data.favorites.map((favorite: FavoriteImage) => ({
                ...favorite,
                image: {
                    ...favorite.image,
                    isLiked: favorite.image.isLiked || false
                }
            }));
        },
        staleWhileRevalidate: true
    });

    const [favorites, setFavorites] = useState<FavoriteImage[]>([]);

    // Sync with cache when it updates
    useEffect(() => {
        if (cachedFavorites && favorites.length === 0 && !initialLoading) {
            setFavorites(cachedFavorites);
        }
    }, [cachedFavorites, initialLoading, favorites.length]);

    // Update local favorites if cache revalidates and we are still on page 1
    useEffect(() => {
        if (cachedFavorites && !initialLoading && page === 1 && favorites.length > 0) {
            setFavorites(cachedFavorites);
        }
    }, [cachedFavorites, initialLoading, page, favorites.length]);

    const [savingImages, setSavingImages] = useState<Set<string>>(new Set());

    const fetchMoreFavorites = async () => {
        if (!hasMore || isFetchingMore) return;

        setIsFetchingMore(true);
        try {
            const nextPage = page + 1;
            const response = await fetch(`/api/user/favorites?page=${nextPage}&include_interactions=true`);
            if (response.ok) {
                const data = await response.json();
                const newFavorites = data.favorites.map((favorite: FavoriteImage) => ({
                    ...favorite,
                    image: {
                        ...favorite.image,
                        isLiked: favorite.image.isLiked || false
                    }
                }));

                setFavorites(prev => [...prev, ...newFavorites]);
                setHasMore(data.pagination.hasMore);
                setPage(nextPage);
            }
        } catch (error) {
            // console.error('Error fetching more favorites:', error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const handleSave = async (imageId: string) => {
        // Unsave logic (since it's favorites page)
        if (savingImages.has(imageId)) return;
        setSavingImages(prev => new Set(prev).add(imageId));

        try {
            const response = await fetch(`/api/images/${imageId}/favorite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.favorited) {
                    // Remove from favorites list immediately
                    setFavorites(prev => prev.filter(fav => fav.image.id !== imageId));
                    // Also refresh the cache to keep it in sync
                    refresh();
                }
            }
        } catch (error) {
            // console.error('Error toggling favorite:', error);
        } finally {
            setSavingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(imageId);
                return newSet;
            });
        }
    };

    return (
        <div className="pb-24 md:pb-8 p-4 md:p-8">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className={`text-3xl font-bold text-white ${orbitron.className}`}>Favorites</h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        Images you&apos;ve saved for inspiration
                    </p>
                </div>

                {/* Favorites count */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Heart className="h-4 w-4" />
                    {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
                </div>

                {/* Favorites Grid */}
                {initialLoading && favorites.length === 0 ? (
                    <LoadingSkeleton />
                ) : favorites.length > 0 ? (
                    <>
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
                        >
                            {favorites.map((favorite) => {
                                const libraryItem: LibraryItem = {
                                    id: favorite.image.id,
                                    url: favorite.image.image_url,
                                    prompt: favorite.image.prompt,
                                    model: favorite.image.ai_model,
                                    mediaType: 'image', // Favorites are currently only images
                                    createdAt: favorite.image.created_at,
                                    title: favorite.image.title,
                                    description: favorite.image.description,
                                    isOwner: favorite.image.user.id === supabaseUser?.id,
                                };

                                return (
                                    <div key={favorite.id} className="masonry-item mb-1">
                                        <LibraryImageCard
                                            item={libraryItem}
                                            filter="favorites"
                                            isSaved={true}
                                            onToggleSave={(id) => handleSave(id)}
                                            onUnauthenticatedAction={onUnauthenticatedAction}
                                            savesCount={favorite.image.favorites_count}
                                        />
                                    </div>
                                );
                            })}
                        </Masonry>

                        {/* Load More */}
                        {hasMore && (
                            <div className="text-center pt-8">
                                <Button
                                    variant="outline"
                                    onClick={fetchMoreFavorites}
                                    disabled={isFetchingMore}
                                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                    {isFetchingMore ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <Card className="bg-transparent border-0 shadow-none">
                        <CardContent className="p-12 text-center">
                            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">
                                No favorites yet
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Start generating images to populate your favorites collection
                            </p>
                            <Button
                                asChild
                                className="h-11 bg-white hover:bg-gray-100 text-black font-bold px-6 rounded-xl transition-all shadow-[0_4px_0_0_#a1a1aa] hover:shadow-[0_4px_0_0_#71717a] active:shadow-[0_2px_0_0_#a1a1aa] active:translate-y-[2px] border-0"
                            >
                                <a href="/dashboard?view=generate">
                                    Start Generating
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export const FavoritesViewSkeleton = memo(() => (
    <div className="pb-24 md:pb-8 p-4 md:p-8">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-6" />
        <LoadingSkeleton />
    </div>
));
FavoritesViewSkeleton.displayName = 'FavoritesViewSkeleton';
