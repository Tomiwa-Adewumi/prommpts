import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Download,
    Share2,
    Trash2,
    Edit2,
    Settings,
    Play,
    RotateCw,
    Video,
    Copy,
    Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatedGradient } from '@/components/ui/animated-gradient';

export interface LibraryItem {
    id: string;
    url: string;
    thumbnailUrl?: string; // For videos
    prompt: string;
    model: string;
    aspectRatio?: string;
    mediaType: 'image' | 'video';
    createdAt: string;
    width?: number;
    height?: number;
    // Job specific
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    // UserImage specific
    title?: string;
    description?: string;
    isOwner: boolean;
    username?: string;
    userAvatar?: string;
}

interface LibraryImageCardProps {
    item: LibraryItem;
    onDelete?: (id: string) => void;
    onConfig?: (item: LibraryItem) => void;
    onUnauthenticatedAction?: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
    filter?: string;
    showEdit?: boolean;
    isSaved?: boolean;
    onToggleSave?: (id: string, currentSaved: boolean) => void;
    savesCount?: number;
}

export function LibraryImageCard({
    item,
    onDelete,
    onConfig,
    onUnauthenticatedAction,
    filter = 'all',
    isSaved = false,
    onToggleSave,
    savesCount,
    showEdit = true
}: LibraryImageCardProps) {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleConfig = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (onConfig) {
            onConfig(item);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!item.isOwner && onUnauthenticatedAction) {
            // If not owner but logged in, they can still "remix" (edit) copy
            // Logic handled by parent or verify auth here? 
            // For now assume if they can see the button they can click it, 
            // but parent page checks auth.
        }

        // Redirect to generate page with image as reference
        const params = new URLSearchParams();
        params.set('referenceUrl', item.url);
        params.set('mediaType', item.mediaType === 'video' ? 'video' : 'image');

        router.push(`/dashboard?view=generate&${params.toString()}`);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            toast.message('Downloading...');
            const response = await fetch(item.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `prommmpt-${item.id}.${item.mediaType === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const shareUrl = `${window.location.origin}/images/${item.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this generation',
                    text: item.prompt,
                    url: shareUrl
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        }
    };

    return (
        <div
            className="group relative aspect-square bg-black overflow-hidden border border-white/5 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => router.push(`/images/${item.id}?source=library&filter=${filter}`)}
        >
            {/* Media Content */}
            {item.mediaType === 'video' ? (
                <video
                    src={item.url}
                    className={cn("w-full h-full object-cover transition-opacity duration-500", imageLoaded ? "opacity-100" : "opacity-0")}
                    muted
                    loop
                    playsInline
                    onLoadedData={() => setImageLoaded(true)}
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                    }}
                />
            ) : (
                <img
                    src={item.url}
                    alt={item.prompt}
                    className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-105", imageLoaded ? "opacity-100" : "opacity-0")}
                    onLoad={() => setImageLoaded(true)}
                    loading="lazy"
                />
            )}

            {/* Loading State */}
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatedGradient />
                </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                {/* Top Right Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                    {onConfig && (
                        <button
                            onClick={handleConfig}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 transition-all hover:border-[#F1E500]/50 hover:text-[#F1E500]"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Config</span>
                        </button>
                    )}
                    {showEdit && (
                        <button
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 transition-all hover:border-[#F1E500]/50 hover:text-[#F1E500]"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Edit</span>
                        </button>
                    )}
                </div>

                {/* Bottom Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

                {/* Bottom Info & Actions */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-20">
                    <div className="flex flex-col max-w-[60%]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F1E500] mb-0.5">
                            {item.model}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {onToggleSave && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSave(item.id, isSaved);
                                }}
                                className="p-2 text-white/70 hover:text-yellow-400 bg-black/20 hover:bg-black/50 rounded-full transition-all"
                                title={isSaved ? "Unsave" : "Save"}
                            >
                                <Bookmark className={cn("w-4 h-4", isSaved && "fill-yellow-400 text-yellow-400")} />
                            </button>
                        )}
                        <button
                            onClick={handleDownload}
                            className="p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all"
                            title="Share"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        {item.isOwner && onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item.id);
                                }}
                                className="p-2 text-white/70 hover:text-red-500 bg-black/20 hover:bg-black/50 rounded-full transition-all"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Indicator */}
            {item.mediaType === 'video' && (
                <div className="absolute top-3 left-3 z-10">
                    <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                        <Video className="w-3 h-3 text-white" />
                    </div>
                </div>
            )}
        </div>
    );
}
