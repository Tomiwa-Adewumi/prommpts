/**
 * Gallery Context - Shares cached library items with the image detail page
 * Enables instant navigation through the carousel without API calls
 */

const GALLERY_CONTEXT_KEY = 'gallery_context';
const LIBRARY_CACHE_KEY = 'library_all_items';

export interface GalleryItem {
    id: string;
    url: string;
    prompt: string;
    model: string;
    aspectRatio?: string;
    mediaType?: 'image' | 'video';
    createdAt: string;
    title?: string;
    description?: string;
    jobId?: string;
    isOwner?: boolean;
    status?: string;
}

interface GalleryContext {
    items: GalleryItem[];
    filter: string;
    timestamp: number;
}

/**
 * Set the gallery context when navigating from library to image detail
 */
export function setGalleryContext(items: GalleryItem[], filter: string = 'all'): void {
    try {
        const context: GalleryContext = {
            items,
            filter,
            timestamp: Date.now()
        };
        sessionStorage.setItem(GALLERY_CONTEXT_KEY, JSON.stringify(context));
    } catch (e) {
        console.error('Failed to set gallery context:', e);
    }
}

/**
 * Get the current gallery context
 */
export function getGalleryContext(): GalleryContext | null {
    try {
        const raw = sessionStorage.getItem(GALLERY_CONTEXT_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as GalleryContext;
    } catch (e) {
        return null;
    }
}

/**
 * Get a specific item from the gallery context by ID
 */
export function getItemFromGalleryContext(id: string): GalleryItem | null {
    const context = getGalleryContext();
    if (!context) return null;
    return context.items.find(item => item.id === id) || null;
}

/**
 * Get navigation (prev/next) for carousel based on cached context
 */
export function getNavigationFromContext(currentId: string): { prevId: string | null; nextId: string | null } {
    const context = getGalleryContext();
    if (!context || !context.items.length) {
        return { prevId: null, nextId: null };
    }

    const currentIndex = context.items.findIndex(item => item.id === currentId);
    if (currentIndex === -1) {
        return { prevId: null, nextId: null };
    }

    return {
        prevId: currentIndex > 0 ? context.items[currentIndex - 1].id : null,
        nextId: currentIndex < context.items.length - 1 ? context.items[currentIndex + 1].id : null
    };
}

/**
 * Try to get item data from localStorage library cache
 * Falls back to null if not found
 */
export function getItemFromLibraryCache(id: string): GalleryItem | null {
    try {
        const raw = localStorage.getItem(LIBRARY_CACHE_KEY);
        if (!raw) return null;

        const cache = JSON.parse(raw);
        const data = cache.data;
        if (!data) return null;

        // Check jobs
        const job = data.jobs?.find((j: any) => j.id === id);
        if (job && job.status === 'completed' && (job.output_data?.images?.length || job.output_data?.video)) {
            return {
                id: job.id,
                url: job.media_type === 'video' ? job.output_data.video : job.output_data.images[0],
                prompt: job.refined_prompt || job.original_prompt,
                model: job.model,
                aspectRatio: job.aspect_ratio,
                mediaType: job.media_type || 'image',
                createdAt: job.created_at,
                jobId: job.id,
                isOwner: true,
                status: job.status
            };
        }

        // Check images
        const img = data.images?.find((i: any) => i.id === id);
        if (img) {
            return {
                id: img.id,
                url: img.image_url,
                prompt: img.prompt,
                model: img.ai_model,
                mediaType: 'image',
                createdAt: img.created_at,
                title: img.title,
                description: img.description,
                isOwner: true,
                status: 'completed'
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Clear the gallery context (e.g., when leaving the detail page)
 */
export function clearGalleryContext(): void {
    try {
        sessionStorage.removeItem(GALLERY_CONTEXT_KEY);
    } catch (e) {
        // Ignore
    }
}
