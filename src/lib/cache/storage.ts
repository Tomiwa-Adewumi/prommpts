// Cache duration constants (in milliseconds)
export const CACHE_DURATIONS = {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 2 * 60 * 60 * 1000,  // 2 hours
    PERSISTENT: Infinity        // Never expires (until manually cleared)
} as const;

interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    version?: string;
}

/**
 * localStorage wrapper with expiration and versioning
 */
export class LocalCache {
    private static prefix = 'prommmpts_';

    static set<T>(
        key: string,
        data: T,
        duration: number = CACHE_DURATIONS.MEDIUM,
        version?: string
    ): void {
        if (typeof window === 'undefined') return;
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + duration,
                version
            };
            // Handle Infinity specially since JSON doesn't support it
            const serialized = JSON.stringify(item, (key, value) =>
                value === Infinity ? '__INFINITY__' : value
            );
            localStorage.setItem(this.prefix + key, serialized);
        } catch (error) {
            // Failed to set item
        }
    }

    static get<T>(key: string, currentVersion?: string): T | null {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;

            // Handle Infinity specially since JSON doesn't support it
            const cached: CacheItem<T> = JSON.parse(item, (key, value) =>
                value === '__INFINITY__' ? Infinity : value
            );

            // Check if expired
            if (cached.expiresAt < Date.now()) {
                this.remove(key);
                return null;
            }

            // Check version mismatch
            if (currentVersion && cached.version && cached.version !== currentVersion) {
                this.remove(key);
                return null;
            }

            return cached.data;
        } catch (error) {
            this.remove(key); // Remove corrupted data
            return null;
        }
    }

    static remove(key: string): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (error) {
            // Failed to remove item
        }
    }

    static clear(): void {
        if (typeof window === 'undefined') return;
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            // Failed to clear cache
        }
    }

    static invalidatePattern(pattern: string): void {
        if (typeof window === 'undefined') return;
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix) && key.includes(pattern)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            // Failed to invalidate pattern
        }
    }
}

/**
 * SessionStorage wrapper for temporary caching
 */
export class SessionCache {
    private static prefix = 'prommmpts_session_';

    static set<T>(key: string, data: T): void {
        if (typeof window === 'undefined') return;
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
                expiresAt: Infinity // Session storage doesn't need expiration
            };
            // Handle Infinity specially since JSON doesn't support it
            const serialized = JSON.stringify(item, (key, value) =>
                value === Infinity ? '__INFINITY__' : value
            );
            sessionStorage.setItem(this.prefix + key, serialized);
        } catch (error) {

        }
    }

    static get<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;
        try {
            const item = sessionStorage.getItem(this.prefix + key);
            if (!item) return null;

            // Handle Infinity specially since JSON doesn't support it
            const cached: CacheItem<T> = JSON.parse(item, (key, value) =>
                value === '__INFINITY__' ? Infinity : value
            );
            return cached.data;
        } catch (error) {
            this.remove(key);
            return null;
        }
    }

    static remove(key: string): void {
        if (typeof window === 'undefined') return;
        try {
            sessionStorage.removeItem(this.prefix + key);
        } catch (error) {
            // Failed to remove item
        }
    }

    static clear(): void {
        if (typeof window === 'undefined') return;
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            // Failed to clear cache
        }
    }

    static invalidatePattern(pattern: string): void {
        if (typeof window === 'undefined') return;
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix) && key.includes(pattern)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            // Failed to invalidate pattern
        }
    }
}

/**
 * Memory cache for frequently accessed data within the same session
 */
export class MemoryCache {
    private static cache = new Map<string, CacheItem<any>>();

    static set<T>(key: string, data: T, duration: number = CACHE_DURATIONS.SHORT): void {
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + duration
        };
        this.cache.set(key, item as CacheItem<any>);
    }

    static get<T>(key: string): T | null {
        const item = this.cache.get(key) as CacheItem<T> | undefined;
        if (!item) return null;

        if (item.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    static remove(key: string): void {
        this.cache.delete(key);
    }

    static clear(): void {
        this.cache.clear();
    }

    static size(): number {
        return this.cache.size;
    }
}

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
    // User preferences
    USER_SORT_PREFERENCE: (section: string) => `user_sort_${section}`,
    USER_FILTER_PREFERENCE: (section: string) => `user_filter_${section}`,
    USER_VIEW_PREFERENCE: (section: string) => `user_view_${section}`,

    // Data caches
    USER_IMAGES: (userId: string, sortBy: string, page: number) =>
        `user_images_${userId}_${sortBy}_${page}`,
    USER_PROMPTS: (userId: string) => `user_prompts_${userId}`,
    USER_STATS: (userId: string) => `user_stats_${userId}`,
    DISCOVER_IMAGES: (filters: string, page: number) =>
        `discover_images_${filters}_${page}`,

    // UI state
    TAB_STATE: (page: string) => `tab_state_${page}`,
    SCROLL_POSITION: (page: string) => `scroll_position_${page}`,
} as const;
