'use client';

import React, { useState, useRef } from 'react';
import Folder from '@/components/ui/Folder';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Lock, Globe, Trash2 } from 'lucide-react';

interface CollectionFolderProps {
    id: string;
    title: string;
    mediaCount: number;
    isPublic?: boolean;
    coverUrl?: string | null;
    thumbnails?: string[];
    isHidden?: boolean;
    hideThumbnails?: boolean;
    forceOpen?: boolean;
    animateIn?: boolean;
    onClick: (id: string, rect: DOMRect) => void;
}

/**
 * A branded folder card for displaying collections.
 * Uses the Folder component with BLACK branding (#18181b / zinc-950).
 * Shows thumbnails peeking out on hover.
 */
export function CollectionFolder({
    id,
    title,
    mediaCount,
    isPublic = false,
    coverUrl,
    thumbnails = [],
    isHidden = false,
    hideThumbnails = false,
    forceOpen = false,
    animateIn = false,
    onClick
}: CollectionFolderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const folderRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        // Use the folder icon's rect for the animation origin, not the entire container
        if (folderRef.current) {
            const rect = folderRef.current.getBoundingClientRect();
            onClick(id, rect);
        }
    };

    // Ensure we have 3 items for the stack effect if possible, or just use what we have
    const previewItems = thumbnails.slice(0, 3).map((url, i) => (
        <div
            key={i}
            className={cn(
                "w-full h-full relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shadow-md transition-opacity duration-300",
                hideThumbnails && "opacity-0"
            )}
        >
            <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="100px"
            />
        </div>
    ));

    // If no items, show empty state inside
    const isEmpty = thumbnails.length === 0;
    if (isEmpty) {
        previewItems.push(
            <div
                key="empty"
                className={cn(
                    "w-full h-full flex items-center justify-center bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed transition-opacity duration-300",
                    hideThumbnails && "opacity-0"
                )}
            >
                <span className="text-[10px] text-zinc-600 font-medium">Empty</span>
            </div>
        );
    }

    // Determine folder color - matches sidebar bg for visual consistency
    // Uses the approximate hex for oklch(0.2 0.005 240)
    const folderColor = '#27282D'; // sidebar color

    return (
        <div
            ref={containerRef}
            className={cn(
                "group cursor-pointer flex flex-col items-center p-0 rounded-xl transition-all duration-300 ease-out w-fit",
                isHidden && "opacity-0 pointer-events-none"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            {/* Folder Component */}
            <div ref={folderRef} className="relative mb-10 transform transition-transform duration-300 group-hover:scale-105">
                <Folder
                    color={folderColor}
                    size={1.6}
                    items={previewItems}
                    className="drop-shadow-2xl"
                    isOpen={forceOpen}
                />
            </div>

            {/* Title & Meta */}
            <div className={cn(
                "flex flex-col gap-0.5 w-[160px] px-1",
                animateIn && "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
            )}>
                <span className={cn(
                    "text-xs font-bold transition-colors duration-200 uppercase tracking-wide truncate text-left",
                    isHovered ? "text-white" : "text-zinc-400"
                )}>
                    {title}
                </span>

                <div className="flex items-center justify-between w-full h-5">
                    <span className="text-[10px] text-zinc-600 font-semibold tracking-wider">
                        {mediaCount} {mediaCount === 1 ? 'ITEM' : 'ITEMS'}
                    </span>

                    <button
                        className={cn(
                            "text-zinc-500 hover:text-red-400 transition-all duration-200 p-1 -mr-1 rounded-md hover:bg-zinc-800",
                            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
