import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { UserTier } from '@/lib/models/tier-validation';

interface UserTierData {
  tier: UserTier;
  isLoading: boolean;
  error: string | null;
}

export function useUserTier(): UserTierData {
  const { isSignedIn } = useAuth();
  const [tier, setTier] = useState<UserTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserTier() {
      if (!isSignedIn) {
        setTier('free');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/subscription');
        if (!response.ok) {
          throw new Error('Failed to fetch user subscription');
        }
        
        const data = await response.json();
        
        // Map package names to tiers
        if (data.subscription?.package?.name) {
          const packageName = data.subscription.package.name.toLowerCase();
          if (packageName === 'starter') {
            setTier('starter');
          } else if (packageName === 'creator') {
            setTier('creator');
          } else if (packageName === 'pro') {
            setTier('pro');
          } else {
            setTier('free');
          }
        } else {
          setTier('free');
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user tier');
        setTier('free'); // Default to free on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserTier();
  }, [isSignedIn]);

  return { tier, isLoading, error };
}