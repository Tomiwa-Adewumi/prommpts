import { create } from 'zustand';

interface ImageData {
    likesCount: number;
    favoritesCount: number;
    isLiked: boolean;
    isFavorited: boolean;
}

interface ImageState {
    // Map of imageId -> current counts and status
    images: Record<string, ImageData>;

    // Actions
    updateImageCounts: (imageId: string, data: Partial<ImageData>) => void;
    setImageLiked: (imageId: string, liked: boolean) => void;
    setImageFavorited: (imageId: string, favorited: boolean) => void;
    initializeImage: (imageId: string, data: ImageData) => void;
    resetStore: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
    images: {},

    updateImageCounts: (imageId: string, data: Partial<ImageData>) => {
        set((state) => ({
            images: {
                ...state.images,
                [imageId]: {
                    ...state.images[imageId],
                    ...data,
                },
            },
        }));
    },

    setImageLiked: (imageId: string, liked: boolean) => {
        set((state) => ({
            images: {
                ...state.images,
                [imageId]: {
                    ...state.images[imageId],
                    isLiked: liked,
                    likesCount: liked
                        ? (state.images[imageId]?.likesCount || 0) + 1
                        : Math.max(0, (state.images[imageId]?.likesCount || 0) - 1),
                },
            },
        }));
    },

    setImageFavorited: (imageId: string, favorited: boolean) => {
        set((state) => ({
            images: {
                ...state.images,
                [imageId]: {
                    ...state.images[imageId],
                    isFavorited: favorited,
                    favoritesCount: favorited
                        ? (state.images[imageId]?.favoritesCount || 0) + 1
                        : Math.max(0, (state.images[imageId]?.favoritesCount || 0) - 1),
                },
            },
        }));
    },

    initializeImage: (imageId: string, data: ImageData) => {
        set((state) => ({
            images: {
                ...state.images,
                [imageId]: data,
            },
        }));
    },

    resetStore: () => {
        set({ images: {} });
    },
}));
