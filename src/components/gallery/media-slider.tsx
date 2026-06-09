import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Video as VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MediaSliderProps {
    currentImage: any;
    navigation: { prevId: string | null; nextId: string | null };
    onNavigate: (direction: 'prev' | 'next', id: string) => void;
    isOwner: boolean;
}

export function MediaSlider({ currentImage, navigation, onNavigate, isOwner }: MediaSliderProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [animating, setAnimating] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Reset animation state when image changes
    useEffect(() => {
        if (animating) {
            const timer = setTimeout(() => {
                setAnimating(false);
                setSlideDirection(null);
            }, 300); // Match CSS duration
            return () => clearTimeout(timer);
        }
    }, [currentImage.id, animating]);

    const handleNavigate = (direction: 'prev' | 'next', id: string) => {
        if (animating) return;
        setSlideDirection(direction === 'next' ? 'left' : 'right');
        setAnimating(true);
        onNavigate(direction, id);
    };

    const isVideo = currentImage.media_type === 'video';

    return (
        <div
            className="group relative rounded-lg overflow-hidden border border-white/10 bg-zinc-900/30 aspect-square flex items-center justify-center bg-black"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={cn(
                    "w-full h-full flex items-center justify-center transition-transform duration-300 ease-out",
                    slideDirection === 'left' && "animate-slide-out-left",
                    slideDirection === 'right' && "animate-slide-out-right",
                    // We need a way to animate IN the new one. 
                    // Simple CSS animation might not suffice for "swapping" content without a wrapper.
                    // For now, let's just do a simple opacity transition or just keyframes on the container content?
                    // Actually, standard react state update replaces content. 
                    // Best way is to have a "key" on this div that changes, triggering animation.
                )}
                key={currentImage.id}
            >
                {isVideo ? (
                    <video
                        ref={videoRef}
                        src={currentImage.image_url}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img
                        src={currentImage.image_url}
                        alt={currentImage.title || currentImage.prompt}
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            {/* Video Indicator (if controls hidden or just to show type) */}
            {isVideo && (
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                        <VideoIcon className="w-3 h-3 text-[#F1E500]" />
                        <span className="text-[10px] font-bold uppercase text-white tracking-wider">Video</span>
                    </div>
                </div>
            )}

            {/* Navigation Arrows - Only show if Owner and Source is Library */}
            {isOwner && (
                <>
                    {navigation.prevId && (
                        <button
                            onClick={() => handleNavigate('prev', navigation.prevId!)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm border border-white/10 transition-all shadow-lg z-30 hover:scale-110 active:scale-95"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}
                    {navigation.nextId && (
                        <button
                            onClick={() => handleNavigate('next', navigation.nextId!)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm border border-white/10 transition-all shadow-lg z-30 hover:scale-110 active:scale-95"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
