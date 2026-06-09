'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { analytics } from '@/lib/analytics/mixpanel';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { clerkUser, supabaseUser, isSignedIn } = useAuth();

  useEffect(() => {
    // Initialize Mixpanel
    analytics.init();
  }, []);

  useEffect(() => {
    if (isSignedIn && clerkUser && supabaseUser) {
      // Identify user
      analytics.identify(clerkUser.id, {
        email: clerkUser.emailAddresses[0]?.emailAddress,
        username: clerkUser.username,
        full_name: clerkUser.fullName,
        created_at: clerkUser.createdAt,
        subscription_tier: 'free', // You can fetch actual tier from your subscription data
      });
    } else {
      // Reset on logout
      analytics.reset();
    }
  }, [isSignedIn, clerkUser, supabaseUser]);

  return <>{children}</>;
}