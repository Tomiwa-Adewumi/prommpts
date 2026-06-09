'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { CollectionFolder } from './collection-folder';
import { FolderGalleryModal } from './folder-gallery-modal';
import { useLibraryCache } from '@/hooks/use-library-cache';
import { toast } from 'sonner';

interface CollectionMediaItem {
    position: number;
    media_type: 'image' | 'video';
    image?: {
        id: string;
        image_url: string;
    } | null;
    video?: {
        id: string;
        video_url: string;
        thumbnail_url?: string;
    } | null;
}

interface Collection {
    id: string;
    title: string;
    description?: string;
    is_public: boolean;
    media_count: number;
    created_at: string;
    first_media_url?: string | null;
    collection_media?: CollectionMediaItem[];
}

interface CollectionsTabProps {
    onCountChange?: (count: number) => void;
}

const LoadingSkeleton = () => (
    // Flex layout matching folder grid
    <div className="flex flex-wrap gap-x-4 gap-y-8 justify-start">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
                <div className="w-full aspect-[1.3] bg-zinc-800/50 rounded-lg animate-pulse mb-4" />
                <div className="w-24 h-4 bg-zinc-800/50 rounded animate-pulse" />
            </div>
        ))}
    </div>
);

const EmptyState = () => {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center py-32 animate-in fade-in zoom-in duration-500">
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 mb-8 backdrop-blur-sm">
                <FolderOpen className="h-16 w-16 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No collections yet</h3>
            <p className="text-zinc-400 text-center mb-8 max-w-md text-lg">
                Create collections to organize your generated artwork and uploads into focused groups.
            </p>
            <Button
                onClick={() => router.push('/dashboard?view=generate')} // Assuming creating starts from generating or a dedicated create flow
                className="h-12 bg-white text-black hover:bg-zinc-200 font-bold px-8 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
                <Plus className="h-5 w-5 mr-2" />
                Create First Collection
            </Button>
        </div>
    );
};

/**
 * Collections tab content for the Library view.
 * Displays user's collections as interactive folder cards.
 */
// Animation phases for the folder open/close sequence
type AnimationPhase = 'idle' | 'opening' | 'open' | 'closing' | 'closed';

export function CollectionsTab({ onCountChange }: CollectionsTabProps) {
    // Modal state
    const [selectedCollection, setSelectedCollection] = useState<{
        id: string;
        title: string;
        rect: DOMRect;
    } | null>(null);

    // Animation State Machine
    const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
    const [animatingId, setAnimatingId] = useState<string | null>(null);
    const [reappearingId, setReappearingId] = useState<string | null>(null);

    // Fetch collections with caching
    const { data: collections, loading, error, refresh } = useLibraryCache<Collection[]>({
        key: 'library_collections',
        fetchFn: async () => {
            const response = await fetch('/api/collections');
            if (!response.ok) throw new Error('Failed to fetch collections');
            const data = await response.json();
            return data.collections || [];
        },
        duration: 5 * 60 * 1000,
        staleWhileRevalidate: true
    });

    // Report count to parent
    useEffect(() => {
        if (collections) {
            onCountChange?.(collections.length);
        }
    }, [collections, onCountChange]);

    // Handle folder click - directly open modal
    const handleFolderClick = useCallback((id: string, rect: DOMRect) => {
        const collection = collections?.find(c => c.id === id);
        if (collection) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
            }

            // Go directly to open state - no pre-animation
            setAnimatingId(id);
            setSelectedCollection({
                id: collection.id,
                title: collection.title,
                rect
            });
            setAnimationPhase('open');
        }
    }, [collections]);

    // Start closing modal
    const handleCloseModal = useCallback(() => {
        setAnimationPhase('closing');
    }, []);

    // Modal has fully collapsed - folder appears with entrance animation
    const handleModalExited = useCallback(() => {
        const closedFolderId = animatingId;
        setSelectedCollection(null);
        setAnimationPhase('idle');
        setAnimatingId(null);

        // Trigger entrance animation for the folder that just reappeared
        setReappearingId(closedFolderId);
        setTimeout(() => setReappearingId(null), 400); // Clear after animation
    }, [animatingId]);

    // Get thumbnails for a collection
    const getThumbnails = (collection: Collection): string[] => {
        if (!collection.collection_media) {
            return collection.first_media_url ? [collection.first_media_url] : [];
        }

        return collection.collection_media
            .sort((a, b) => a.position - b.position)
            .slice(0, 3)
            .map(item => {
                if (item.media_type === 'image' && item.image) {
                    return item.image.image_url;
                }
                if (item.media_type === 'video' && item.video) {
                    return item.video.thumbnail_url || item.video.video_url;
                }
                return null;
            })
            .filter((url): url is string => url !== null);
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <p className="text-red-400 mb-6 text-lg">Failed to load collections</p>
                <Button variant="outline" onClick={refresh} className="h-10 px-6">
                    Try Again
                </Button>
            </div>
        );
    }

    if (!collections || collections.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Folder Grid - Left aligned */}
            <div className="flex flex-wrap gap-x-4 gap-y-8 justify-start mt-16">
                {collections.map((collection, i) => (
                    <div
                        key={collection.id}
                        className="animate-in fade-in zoom-in-50 fill-mode-backwards"
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <CollectionFolder
                            id={collection.id}
                            title={collection.title}
                            mediaCount={collection.media_count}
                            isPublic={collection.is_public}
                            coverUrl={collection.first_media_url}
                            thumbnails={getThumbnails(collection)}
                            onClick={handleFolderClick}
                            // Hide folder when modal is visible - modal IS the folder during animation
                            isHidden={selectedCollection?.id === collection.id && (animationPhase === 'open' || animationPhase === 'closing')}
                            // Animate title/info when folder reappears after modal closes
                            animateIn={reappearingId === collection.id}
                        />
                    </div>
                ))}
            </div>

            {/* Gallery Modal 
                isOpen is true when selectedCollection is set AND we are in 'open' phase or 'closing' phase.
                When 'closing' phase starts, we keep isOpen=true to let the modal handle its internal exit animation?
                Wait, no. Modal expects `isOpen` to turn false to trigger exit.
                So: isOpen is true ONLY during 'open'.
                When we switch to 'closing', isOpen becomes false -> Modal triggers exit.
            */}
            <FolderGalleryModal
                isOpen={!!selectedCollection && animationPhase === 'open'}
                onClose={handleCloseModal}
                onExited={handleModalExited}
                collectionId={selectedCollection?.id || null}
                collectionTitle={selectedCollection?.title || ''}
                startRect={selectedCollection?.rect}
            />
        </div>
    );
}
