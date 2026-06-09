import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import type { Database } from '@/lib/database/supabase';
import { LocalCache, SessionCache } from '@/lib/cache/storage';

type User = Database['public']['Tables']['users']['Row'];

// Keep track of ongoing sync requests to prevent duplicates
const syncRequestsInFlight = new Map<string, Promise<User | null>>();

// Session cache for synced users (resets on page refresh)
const userSessionCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Clear all caches when user changes or signs out
    if (!isLoaded) return;

    if (!isSignedIn || !clerkUser?.id) {
      // User signed out - clear everything
      LocalCache.clear();
      SessionCache.clear();
      setSupabaseUser(null);
      lastSyncedUserId.current = null;
      setLoading(false);
      return;
    }

    // If user changed, clear caches for the previous user
    if (lastSyncedUserId.current && lastSyncedUserId.current !== clerkUser.id) {
      LocalCache.clear();
      SessionCache.clear();
      setSupabaseUser(null);
    }

    async function syncUser() {
      // TypeScript guard - we know clerkUser exists here due to the useEffect condition
      const userId = clerkUser!.id;

      // Skip if we've already synced this user in this component instance
      if (lastSyncedUserId.current === userId && supabaseUser) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Check session cache first
      const cached = userSessionCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setSupabaseUser(cached.user);
        lastSyncedUserId.current = userId;
        setLoading(false);
        return;
      }

      // Check if there's already a sync request in flight for this user
      const existingRequest = syncRequestsInFlight.get(userId);
      if (existingRequest) {
        try {
          const user = await existingRequest;
          if (user) {
            setSupabaseUser(user);
            lastSyncedUserId.current = userId;
            // Update cache
            userSessionCache.set(userId, { user, timestamp: Date.now() });
          }
        } catch (error) {
          // Error syncing user
        }
        setLoading(false);
        return;
      }

      // Create new sync request
      const syncPromise = (async () => {
        try {
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clerkUserId: userId }),
          });

          if (response.ok) {
            const { user } = await response.json();
            return user;
          }
          return null;
        } catch (error) {
          return null;
        } finally {
          // Clean up the in-flight request
          syncRequestsInFlight.delete(userId);
        }
      })();

      // Store the promise to prevent duplicate requests
      syncRequestsInFlight.set(userId, syncPromise);

      try {
        const user = await syncPromise;
        if (user) {
          setSupabaseUser(user);
          lastSyncedUserId.current = userId;
          // Cache the successful sync
          userSessionCache.set(userId, { user, timestamp: Date.now() });
        }
      } catch (error) {
        // Error syncing user
      } finally {
        setLoading(false);
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, clerkUser?.id]); // Only depend on the user ID, not the entire object

  // Function to force refresh the user sync (bypasses cache)
  const refreshSync = async () => {
    if (clerkUser?.id) {
      // Clear cache for this user
      userSessionCache.delete(clerkUser.id);
      lastSyncedUserId.current = null;

      // Trigger a new sync
      setLoading(true);
      try {
        const response = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clerkUserId: clerkUser.id }),
        });

        if (response.ok) {
          const { user } = await response.json();
          setSupabaseUser(user);
          lastSyncedUserId.current = clerkUser.id;
          userSessionCache.set(clerkUser.id, { user, timestamp: Date.now() });
        }
      } catch (error) {
        // Error refreshing user sync
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    clerkUser,
    supabaseUser,
    isLoaded,
    isSignedIn,
    loading,
    isAdmin: supabaseUser?.is_admin || false,
    isActive: supabaseUser?.is_active || false,
    refreshSync,
  };
}