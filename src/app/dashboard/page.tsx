'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { useState, useCallback } from 'react';
import { LibraryView, LibraryViewSkeleton } from '@/components/views/library';
import { GenerateArtContent as GenerateArtView, GenerateArtViewSkeleton } from '@/components/views/generate-art-content';
import { UploadView, UploadViewSkeleton } from '@/components/views/upload';
import { HomeView, HomeViewSkeleton } from '@/components/views/home-view';
import { FavoritesView, FavoritesViewSkeleton } from '@/components/views/favorites-view';
import { WorkspaceView } from '@/components/views/workspace-view';

// Inner component that uses useSearchParams (requires Suspense boundary)
function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'home'; // Default to home

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [signInDestination, setSignInDestination] = useState<string | undefined>(undefined);

  const handleUnauthenticatedAction = useCallback((action: 'view' | 'like' | 'save', destinationUrl?: string) => {
    setSignInAction(action);
    setSignInDestination(destinationUrl);
    setIsSignInModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Shared Sidebar - always visible */}
      <HomeSidebar onUnauthenticatedAction={handleUnauthenticatedAction} />

      {/* Views - all stay mounted, show/hide with CSS for instant switching */}
      <div className="md:ml-20">
        {/* Home View */}
        <div style={{ display: view === 'home' ? 'block' : 'none' }}>
          <HomeView onUnauthenticatedAction={handleUnauthenticatedAction} />
        </div>

        {/* Favorites View */}
        <div style={{ display: view === 'favorites' ? 'block' : 'none' }}>
          <FavoritesView onUnauthenticatedAction={handleUnauthenticatedAction} />
        </div>

        {/* Library View */}
        <div style={{ display: view === 'library' ? 'block' : 'none' }}>
          <LibraryView />
        </div>

        {/* Generate Art View */}
        <div style={{ display: view === 'generate' ? 'block' : 'none' }}>
          <GenerateArtView showSidebar={false} />
        </div>

        {/* Workspace View */}
        <div style={{ display: view === 'workspace' ? 'block' : 'none' }}>
          <WorkspaceView />
        </div>

        {/* Upload View */}
        <div style={{ display: view === 'upload' ? 'block' : 'none' }}>
          <UploadView />
        </div>
      </div>

      {/* Shared Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        action={signInAction}
        destinationUrl={signInDestination}
      />
    </div>
  );
}

// Page skeleton for ProtectedRoute fallback - always shows home skeleton to avoid hydration mismatch
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HomeSidebar onUnauthenticatedAction={() => { }} />
      <div className="md:ml-20">
        <HomeViewSkeleton />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute fallback={<DashboardSkeleton />}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}