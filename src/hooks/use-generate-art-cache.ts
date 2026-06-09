import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface UseGenerateArtCacheOptions<T> {
    key: string;
    fetchFn: () => Promise<T>;
    duration?: number; // Cache duration in ms (default: 5 minutes)
    staleWhileRevalidate?: boolean; // Show stale data while fetching fresh
}

interface UseGenerateArtCacheReturn<T> {
    data: T | null;
    setData: React.Dispatch<React.SetStateAction<T | null>>; // Expose setter for optimistic updates
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    isStale: boolean;
}

/**
 * Caching hook for Generate Art view.
 * This caches the jobs list to prevent loading flashes when navigating to the page.
 * The setData function is exposed to allow optimistic updates when new jobs are created.
 */
export function useGenerateArtCache<T>({
    key,
    fetchFn,
    duration = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true
}: UseGenerateArtCacheOptions<T>): UseGenerateArtCacheReturn<T> {
    // Synchronously check cache during initialization to avoid loading flash
    const getInitialState = (): { data: T | null; loading: boolean; isStale: boolean } => {
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const entry = JSON.parse(cached) as CacheEntry<T>;
                const expired = Date.now() - entry.timestamp > duration;
                if (!expired) {
                    // Valid cache - use it immediately, no loading
                    return { data: entry.data, loading: false, isStale: false };
                }
                if (staleWhileRevalidate) {
                    // Expired but stale-while-revalidate - show stale data, no loading
                    return { data: entry.data, loading: false, isStale: true };
                }
            }
        } catch {
            // Cache read failed, fall through to default
        }
        return { data: null, loading: true, isStale: false };
    };

    const initialState = getInitialState();
    const [data, setData] = useState<T | null>(initialState.data);
    const [loading, setLoading] = useState(initialState.loading);
    const [error, setError] = useState<Error | null>(null);
    const [isStale, setIsStale] = useState(initialState.isStale);
    const isMounted = useRef(true);
    const fetchFnRef = useRef(fetchFn);

    // Update ref when fetchFn changes
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    // Check if cache is expired
    const isCacheExpired = useCallback((entry: CacheEntry<T>): boolean => {
        return Date.now() - entry.timestamp > duration;
    }, [duration]);

    // Get cached data from localStorage
    const getCachedData = useCallback((): CacheEntry<T> | null => {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            return JSON.parse(cached) as CacheEntry<T>;
        } catch (err) {
            console.error('Failed to parse generate-art cache:', err);
            localStorage.removeItem(key); // Clear corrupted cache
            return null;
        }
    }, [key]);

    // Save data to cache
    const setCachedData = useCallback((newData: T) => {
        try {
            const entry: CacheEntry<T> = {
                data: newData,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (err) {
            console.error('Failed to save generate-art cache:', err);
            // If localStorage is full, clear this specific cache
            localStorage.removeItem(key);
        }
    }, [key]);

    // Fetch fresh data
    const fetchData = useCallback(async (isBackgroundRefetch = false) => {
        try {
            if (!isBackgroundRefetch) {
                setLoading(true);
            }
            setError(null);

            const freshData = await fetchFnRef.current();

            if (!isMounted.current) return;

            setData(freshData);
            setCachedData(freshData);
            setIsStale(false);

        } catch (err) {
            if (!isMounted.current) return;

            const error = err instanceof Error ? err : new Error('Failed to fetch data');
            setError(error);
            console.error('Generate art cache fetch error:', error);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [setCachedData]);

    // Refresh function (clears cache and refetches)
    const refresh = useCallback(async () => {
        localStorage.removeItem(key);
        await fetchData(false);
    }, [key, fetchData]);

    // Initial load
    useEffect(() => {
        isMounted.current = true;

        const loadData = async () => {
            const cached = getCachedData();

            if (!cached) {
                // No cache - fetch fresh data
                await fetchData(false);
                return;
            }

            const expired = isCacheExpired(cached);

            if (!expired) {
                // Valid cache - use it immediately
                setData(cached.data);
                setLoading(false);
                return;
            }

            // Cache is expired
            if (staleWhileRevalidate) {
                // Show stale data immediately, fetch in background
                setData(cached.data);
                setIsStale(true);
                setLoading(false);

                // Fetch fresh data in background
                await fetchData(true);
            } else {
                // Show loading, then fetch fresh data
                await fetchData(false);
            }
        };

        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [key, fetchData, getCachedData, isCacheExpired, staleWhileRevalidate]);

    // Auto-update cache when data changes (for optimistic updates)
    useEffect(() => {
        if (data !== null) {
            setCachedData(data);
        }
    }, [data, setCachedData]);

    return {
        data,
        setData, // Expose for optimistic updates
        loading,
        error,
        refresh,
        isStale
    };
}
