'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FolderOpen, Grid, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orbitron } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import Masonry from 'react-masonry-css';
import Image from 'next/image';

interface FolderGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Callback when exit animation completes
    onExited?: () => void;
    collectionId: string | null;
    collectionTitle: string;
    startRect?: DOMRect | null;
}

interface CollectionMedia {
    id: string;
    position: number;
    media_type: 'image' | 'video';
    image?: {
        id: string;
        image_url: string;
        title?: string;
        prompt?: string;
    } | null;
    video?: {
        id: string;
        video_url: string;
        thumbnail_url?: string;
        title?: string;
    } | null;
}

interface CollectionDetails {
    id: string;
    title: string;
    description?: string;
    media?: CollectionMedia[];
}

/**
 * A black-themed premium modal that "unfolds" from the folder.
 * Uses a clean Masonry grid for media display.
 */
export function FolderGalleryModal({
    isOpen,
    onClose,
    onExited,
    collectionId,
    collectionTitle,
    startRect
}: FolderGalleryModalProps) {
    const [mounted, setMounted] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<'entering' | 'visible' | 'exiting' | 'collapsing' | 'hidden'>('hidden');
    const [collection, setCollection] = useState<CollectionDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Mount portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Handle open/close animations
    const prevIsOpen = useRef(isOpen);
    useEffect(() => {
        // Only trigger when isOpen actually changes
        if (isOpen && !prevIsOpen.current) {
            // Opening
            setAnimationPhase('entering');
            const timer = setTimeout(() => setAnimationPhase('visible'), 500);
            prevIsOpen.current = true;
            return () => clearTimeout(timer);
        } else if (!isOpen && prevIsOpen.current) {
            // Closing - all animations happen simultaneously
            setAnimationPhase('exiting');

            // Wait for the animation to complete then hide
            const timer = setTimeout(() => {
                setAnimationPhase('hidden');
                onExited?.();
            }, 600); // Total animation duration

            prevIsOpen.current = false;
            return () => clearTimeout(timer);
        }
    }, [isOpen, onExited]);

    // Fetch collection details
    useEffect(() => {
        if (!isOpen || !collectionId) return;

        const fetchCollection = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/collections/${collectionId}`);
                if (!response.ok) throw new Error('Failed to fetch collection');
                const data = await response.json();
                setCollection(data.collection);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load collection');
            } finally {
                setLoading(false);
            }
        };

        fetchCollection();
    }, [isOpen, collectionId]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Items for Masonry
    const galleryItems = useMemo(() => {
        if (!collection?.media) return [];
        return collection.media.sort((a, b) => a.position - b.position);
    }, [collection]);

    if (!mounted || animationPhase === 'hidden') return null;

    // Calculate flatten animation styles
    const getAnimationStyles = () => {
        if (!startRect) return {};

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Modal dimensions
        const modalWidth = Math.min(viewportWidth * 0.95, 1280);
        const modalHeight = viewportHeight * 0.92;

        // Modal's center position when fully expanded (centered in viewport)
        const modalCenterX = viewportWidth / 2;
        const modalCenterY = viewportHeight / 2;

        // Folder's center position
        const folderCenterX = startRect.left + startRect.width / 2;
        const folderCenterY = startRect.top + startRect.height / 2;

        // Calculate the scale (folder size relative to modal size)
        // Add a 1.2x multiplier to stop at/slightly-above folder size to avoid jarring pop
        const rawScale = startRect.width / modalWidth;
        const startScale = Math.max(rawScale * 1.3, 0.08); // Minimum 8% scale

        // Calculate the translation needed to move modal center to folder center
        const translateX = folderCenterX - modalCenterX;
        const translateY = folderCenterY - modalCenterY;

        return {
            '--start-scale': startScale,
            '--translate-x': `${translateX}px`,
            '--translate-y': `${translateY}px`,
        } as React.CSSProperties;
    };

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[100] flex items-center justify-center isolate",
                // Fade in backdrop
                animationPhase === 'entering' && "animate-in fade-in duration-500",
                animationPhase === 'exiting' && "animate-out fade-out duration-300"
            )}
        >
            {/* Backdrop - fades out during closing */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500",
                    animationPhase === 'exiting' && "opacity-0"
                )}
                onClick={onClose}
            />

            {/* 
        The Modal "Folder" that expands.
        We use a wrapper to handle the positioning and specific scale animation.
      */}
            <div
                className={cn(
                    "relative w-[95vw] h-[85vh] max-w-7xl rounded-[40px] shadow-2xl",
                    // The "Flatten" Animation Class
                    animationPhase === 'entering' && "animate-[folder-expand_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]",
                    animationPhase === 'exiting' && "animate-[folder-collapse_0.6s_ease-out_forwards]"
                )}
                style={getAnimationStyles()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 
                    Folder-shaped container: Tab + Body as one visual unit.
                    The body has rounded corners EXCEPT top-left where the tab merges.
                */}

                {/* Folder Tab - positioned to sit ON TOP of, and merge with, the body */}
                <div
                    className="absolute top-0 left-0 w-[30%] max-w-[280px] h-12 bg-[#27282D] rounded-t-2xl border-t border-l border-r border-zinc-700 -translate-y-full"
                    style={{
                        // Cover the top-left corner of body border
                        marginLeft: '1px',
                        width: 'calc(30% - 2px)'
                    }}
                />

                {/* Cover to hide the border line between tab and body */}
                <div
                    className="absolute top-0 left-0 h-[2px] bg-[#27282D] z-10"
                    style={{
                        marginLeft: '2px',
                        width: 'calc(30% - 4px)',
                        maxWidth: '276px'
                    }}
                />

                {/* Folder Flaps - visible during exit to hide content */}
                {animationPhase === 'exiting' && (
                    <>
                        {/* Left flap */}
                        <div
                            className="absolute z-40 w-full h-full origin-bottom pointer-events-none animate-[flap-close_0.6s_ease-out_forwards]"
                            style={{
                                backgroundColor: '#27282D',
                                borderRadius: '20px 40px 40px 40px',
                            }}
                        />
                        {/* Right flap */}
                        <div
                            className="absolute z-40 w-full h-full origin-bottom pointer-events-none animate-[flap-close-alt_0.6s_ease-out_forwards]"
                            style={{
                                backgroundColor: '#27282D',
                                borderRadius: '20px 40px 40px 40px',
                            }}
                        />
                    </>
                )}

                {/* Main body */}
                <div className="relative w-full h-full bg-[#27282D] rounded-[40px] rounded-tl-none overflow-hidden flex flex-col">
                    {/* Header content - hidden during close animation */}
                    <div className={cn(
                        "flex-none flex items-center justify-between p-8 transition-opacity duration-200",
                        animationPhase === 'entering' && "animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards",
                        animationPhase === 'exiting' && "opacity-0"
                    )}>
                        <div>
                            <h2 className={`text-4xl font-bold text-white ${orbitron.className} tracking-tight`}>
                                {collectionTitle}
                            </h2>
                            {collection?.description && (
                                <p className="text-zinc-400 mt-2 text-lg">{collection.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-4">
                                <span className="px-3 py-1 bg-zinc-900 rounded-full text-xs font-medium text-zinc-400 border border-zinc-800">
                                    {galleryItems.length} {galleryItems.length === 1 ? 'item' : 'items'}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-12 w-12 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Content Area */}
                    <div className={cn(
                        "flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar",
                        animationPhase === 'entering' && "animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-backwards"
                    )}>
                        {loading && !collection ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-10 w-10 text-white animate-spin opacity-50" />
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <p className="text-red-400 mb-4">{error}</p>
                                <Button onClick={() => window.location.reload()}>Retry</Button>
                            </div>
                        ) : galleryItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-4">
                                    <FolderOpen className="h-10 w-10 opacity-50" />
                                </div>
                                <p className="text-lg font-medium">This collection is empty</p>
                            </div>
                        ) : (
                            <Masonry
                                breakpointCols={{
                                    default: 4,
                                    1100: 3,
                                    700: 2,
                                    500: 1
                                }}
                                className="flex -ml-6 w-auto"
                                columnClassName="pl-6 bg-clip-padding"
                            >
                                {galleryItems.map((item) => {
                                    const url = item.media_type === 'image'
                                        ? item.image?.image_url
                                        : item.video?.thumbnail_url || item.video?.video_url;

                                    if (!url) return null;

                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative mb-6 break-inside-avoid rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-all duration-300"
                                        >
                                            <div className="relative aspect-[4/3] sm:aspect-auto">
                                                {/* Render actual image */}
                                                <Image
                                                    src={url}
                                                    alt="Collection item"
                                                    width={600}
                                                    height={800}
                                                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                                />

                                                {/* Overlay on hover */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                                    <p className="text-white text-sm font-medium line-clamp-2">
                                                        {item.media_type === 'image' ? item.image?.prompt : item.video?.title || 'Video'}
                                                    </p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button size="sm" variant="secondary" className="h-8 w-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-0">
                                                            View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </Masonry>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Style for the specific keyframes if not present */}
            <style jsx global>{`
        @keyframes folder-expand {
          0% {
            opacity: 1;
            transform: translate(var(--translate-x, 0), var(--translate-y, 0)) scale(var(--start-scale, 0.1));
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }
        @keyframes folder-collapse {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 1;
            transform: translate(var(--translate-x, 0), var(--translate-y, 0)) scale(var(--start-scale, 0.1));
          }
        }
        @keyframes flap-close {
          0% {
            transform: skew(15deg) scaleY(0);
          }
          40% {
            transform: skew(15deg) scaleY(0.65);
          }
          100% {
            transform: skew(0deg) scaleY(1);
          }
        }
        @keyframes flap-close-alt {
          0% {
            transform: skew(-15deg) scaleY(0);
          }
          40% {
            transform: skew(-15deg) scaleY(0.65);
          }
          100% {
            transform: skew(0deg) scaleY(1);
          }
        }
      `}</style>
        </div>,
        document.body
    );
}
