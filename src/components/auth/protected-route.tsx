'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

function ProtectedRouteInner({
  children,
  requireAdmin = false,
  fallback
}: ProtectedRouteProps) {
  const { isLoaded, isSignedIn, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoaded && !loading) {
      if (!isSignedIn) {
        // Preserve the current URL including search params for redirect after sign-in
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        const redirectUrl = encodeURIComponent(currentUrl);
        router.push(`/sign-in?redirect=${redirectUrl}`);
        return;
      }

      if (requireAdmin && !isAdmin) {
        router.push('/dashboard');
        return;
      }
    }
  }, [isLoaded, isSignedIn, isAdmin, loading, requireAdmin, router, pathname, searchParams]);

  if (!isLoaded || loading) {
    return fallback || (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white border-opacity-20"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return fallback || null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function ProtectedRoute(props: ProtectedRouteProps) {
  return (
    <Suspense fallback={props.fallback || (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white border-opacity-20"></div>
      </div>
    )}>
      <ProtectedRouteInner {...props} />
    </Suspense>
  );
}