import React from 'react';
import { useImageStore } from '@/stores/imageStore';

export function useImageData(imageId: string, initialData: {
    likesCount: number;
    favoritesCount: number;
    isLiked: boolean;
    isFavorited: boolean;
}) {
    const { images, initializeImage } = useImageStore();

    // Get current data from store
    const imageData = images[imageId] || initialData;

    // Initialize image in store if not already present
    React.useEffect(() => {
        if (!images[imageId]) {
            initializeImage(imageId, initialData);
        }
    }, [imageId, initialData, images, initializeImage]);

    return {
        ...imageData,
        // Helper to check if data is loaded
        isLoaded: !!images[imageId],
    };
}
