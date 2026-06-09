import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalCache, SessionCache, MemoryCache, CacheKeys, CACHE_DURATIONS } from '@/lib/cache/storage';

interface UseCachedDataOptions<T> {
    cacheKey: string;
    fetcher: () => Promise<T>;
    cacheStrategy?: 'memory' | 'session' | 'local';
    cacheDuration?: number;
    enableBackground?: boolean; // Fetch fresh data in background
    staleWhileRevalidate?: boolean; // Show stale data while fetching fresh
    version?: string; // Cache version for invalidation
}

interface CachedDataState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    isStale: boolean;
    lastFetched: number | null;
}

export function useCachedData<T>({
    cacheKey,
    fetcher,
    cacheStrategy = 'memory',
    cacheDuration = CACHE_DURATIONS.MEDIUM,
    enableBackground = true,
    staleWhileRevalidate = true,
    version
}: UseCachedDataOptions<T>) {
    const [state, setState] = useState<CachedDataState<T>>({
        data: null,
        loading: true,
        error: null,
        isStale: false,
        lastFetched: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const backgroundFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get cache instance based on strategy
    const getCache = useCallback(() => {
        switch (cacheStrategy) {
            case 'local': return LocalCache;
            case 'session': return SessionCache;
            case 'memory': return MemoryCache;
            default: return MemoryCache;
        }
    }, [cacheStrategy]);

    // Fetch data with caching
    const fetchData = useCallback(async (
        forceRefresh = false,
        isBackgroundFetch = false
    ) => {
        const cache = getCache();

        // Try to get from cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = cache.get<T>(cacheKey, version);
            if (cached) {
                setState(prev => ({
                    ...prev,
                    data: cached,
                    loading: false,
                    error: null,
                    isStale: false,
                    lastFetched: Date.now()
                }));

                // If background fetch is enabled, fetch fresh data silently
                if (enableBackground && !isBackgroundFetch) {
                    backgroundFetchTimeoutRef.current = setTimeout(() => {
                        fetchData(true, true);
                    }, 1000); // Delay background fetch slightly
                }
                return;
            }
        }

        // Set loading state (only if not background fetch and no stale data)
        if (!isBackgroundFetch && (!staleWhileRevalidate || !state.data)) {
            setState(prev => ({ ...prev, loading: true, error: null }));
        } else if (isBackgroundFetch && state.data) {
            setState(prev => ({ ...prev, isStale: true }));
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            const freshData = await fetcher();

            // Store in cache
            if (cacheStrategy === 'local') {
                LocalCache.set(cacheKey, freshData, cacheDuration, version);
            } else if (cacheStrategy === 'session') {
                SessionCache.set(cacheKey, freshData);
            } else {
                MemoryCache.set(cacheKey, freshData, cacheDuration);
            }

            setState(prev => ({
                ...prev,
                data: freshData,
                loading: false,
                error: null,
                isStale: false,
                lastFetched: Date.now()
            }));
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return; // Request was cancelled
            }

            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';

            // Only update error state if we don't have stale data to show
            if (!staleWhileRevalidate || !state.data) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                    isStale: false
                }));
            } else {
                // Keep showing stale data but mark as stale
                setState(prev => ({
                    ...prev,
                    loading: false,
                    isStale: true
                }));
            }
        }
    }, [cacheKey, fetcher, getCache, version, cacheDuration, cacheStrategy, enableBackground, staleWhileRevalidate, state.data]);

    // Initial fetch on mount
    useEffect(() => {
        fetchData();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (backgroundFetchTimeoutRef.current) {
                clearTimeout(backgroundFetchTimeoutRef.current);
            }
        };
    }, [fetchData]);

    // Invalidate cache and refetch
    const invalidate = useCallback(() => {
        const cache = getCache();
        cache.remove(cacheKey);
        fetchData(true);
    }, [cacheKey, fetchData, getCache]);

    // Refresh data (force fetch)
    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    // Mutate data optimistically
    const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
        const cache = getCache();
        const updatedData = typeof newData === 'function'
            ? (newData as (prev: T | null) => T)(state.data)
            : newData;

        // Update cache
        if (cacheStrategy === 'local') {
            LocalCache.set(cacheKey, updatedData, cacheDuration, version);
        } else if (cacheStrategy === 'session') {
            SessionCache.set(cacheKey, updatedData);
        } else {
            MemoryCache.set(cacheKey, updatedData, cacheDuration);
        }

        // Update state
        setState(prev => ({
            ...prev,
            data: updatedData,
            isStale: false,
            lastFetched: Date.now()
        }));
    }, [state.data, getCache, cacheKey, cacheStrategy, cacheDuration, version]);

    return {
        ...state,
        refresh,
        invalidate,
        mutate,
        refetch: () => fetchData(true), // Alias for refresh
    };
}

/**
 * Hook for caching user preferences
 */
export function useUserPreferences<T>(
    key: string,
    defaultValue: T
): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() => {
        const cached = LocalCache.get<T>(CacheKeys.USER_SORT_PREFERENCE(key));
        return cached ?? defaultValue;
    });

    const setPreference = useCallback((newValue: T) => {
        setValue(newValue);
        LocalCache.set(CacheKeys.USER_SORT_PREFERENCE(key), newValue, CACHE_DURATIONS.PERSISTENT);
    }, [key]);

    return [value, setPreference];
}

/**
 * Hook for persisting UI state across sessions
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T,
    storage: 'local' | 'session' = 'local'
): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() => {
        const cache = storage === 'local' ? LocalCache : SessionCache;
        const cached = cache.get<T>(key);
        return cached ?? defaultValue;
    });

    const setPersistedValue = useCallback((newValue: T) => {
        setValue(newValue);
        const cache = storage === 'local' ? LocalCache : SessionCache;
        cache.set(key, newValue);
    }, [key, storage]);

    return [value, setPersistedValue];
}
