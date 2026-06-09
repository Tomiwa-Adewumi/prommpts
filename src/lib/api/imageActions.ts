import { useImageStore } from '@/stores/imageStore';

export const imageActions = {
    /**
     * Like or unlike an image
     */
    async toggleLike(imageId: string): Promise<{ success: boolean; liked: boolean; likesCount: number }> {
        try {
            const response = await fetch(`/api/images/${imageId}/like`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }

            const data = await response.json();

            if (data.success) {
                // Update the store with the new state
                useImageStore.getState().setImageLiked(imageId, data.liked);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Favorite or unfavorite an image
     */
    async toggleFavorite(imageId: string): Promise<{ success: boolean; favorited: boolean; favoritesCount: number }> {
        try {
            const response = await fetch(`/api/images/${imageId}/favorite`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to toggle favorite');
            }

            const data = await response.json();

            if (data.success) {
                // Update the store with the new state
                useImageStore.getState().setImageFavorited(imageId, data.favorited);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Initialize image data in the store
     */
    initializeImage(imageId: string, data: {
        likesCount: number;
        favoritesCount: number;
        isLiked: boolean;
        isFavorited: boolean;
    }) {
        useImageStore.getState().initializeImage(imageId, data);
    },

    /**
     * Get current image data from store
     */
    getImageData(imageId: string) {
        return useImageStore.getState().images[imageId];
    },
};
