'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useClerk, useUser } from '@clerk/nextjs';
import { LocalCache, SessionCache } from '@/lib/cache/storage';
import { AnimatePresence, motion } from 'motion/react';
import { HomeIcon } from '@/components/ui/animated-icons/Home';

import { GalleryHorizontalEndIcon } from '@/components/ui/animated-icons/Library'; // Using as ImageIcon replacement
import { HeartIcon } from '@/components/ui/animated-icons/Heart';
import { UploadIcon } from '@/components/ui/animated-icons/Upload';
import { ZapIcon } from '@/components/ui/animated-icons/Generate';
import {
  User,
  LogIn,
  LogOut,
  Briefcase,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,

} from '@/components/ui/dropdown-menu';
import { useState, useRef, useEffect } from 'react';
import type { HomeIconHandle } from '@/components/ui/animated-icons/Home';


interface HomeSidebarProps {
  onUnauthenticatedAction: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
}

function HomeSidebarInner({ onUnauthenticatedAction }: HomeSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, supabaseUser } = useAuth();
  const { signOut } = useClerk();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Refs for icon animation control
  const iconRefs = useRef<Map<string, HomeIconHandle | null>>(new Map());

  const handleNavClick = (href: string, requiresAuth: boolean = true) => {
    if (requiresAuth && !isSignedIn) {
      onUnauthenticatedAction('view', href);
      return;
    }
    router.push(href);
  };

  const handleSignOut = async () => {
    // Clear all cached data before signing out to prevent data leakage
    LocalCache.clear();
    SessionCache.clear();

    await signOut();
  };

  // Check if user has access to workspace feature (demo for pitch)
  const hasWorkspaceAccess = supabaseUser?.username === 'tobi' || supabaseUser?.username === 'john';

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard?view=home',
      icon: HomeIcon,
      requiresAuth: false,
    },
    {
      name: 'Generate Art',
      href: '/dashboard?view=generate',
      icon: ZapIcon,
      requiresAuth: true,
    },
    ...(hasWorkspaceAccess ? [{
      name: 'Workspace',
      href: '/dashboard?view=workspace',
      icon: undefined,
      requiresAuth: true,
    }] : []),
    {
      name: 'Upload',
      href: '/dashboard?view=upload',
      icon: UploadIcon,
      requiresAuth: true,
    },
    {
      name: 'Library',
      href: '/dashboard?view=library',
      icon: GalleryHorizontalEndIcon,
      requiresAuth: true,
    },
    {
      name: 'Favourites',
      href: '/dashboard?view=favorites',
      icon: HeartIcon,
      requiresAuth: true,
    },
  ];

  // Trigger icon animations based on hover state
  useEffect(() => {
    // Stop all animations first
    iconRefs.current.forEach((ref) => {
      if (ref && typeof ref.stopAnimation === 'function') {
        ref.stopAnimation();
      }
    });

    // Start animation for hovered icon
    if (hoveredPath) {
      const ref = iconRefs.current.get(hoveredPath);
      if (ref && typeof ref.startAnimation === 'function') {
        ref.startAnimation();
      }
    }
  }, [hoveredPath]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:flex left-0 top-0 bottom-0 w-20 bg-sidebar border-r border-sidebar-border flex-col items-center py-6 z-50">
        {/* Logo */}
        <Link href="/" className="mb-8">
          <Image
            src="/prommmt-logo.svg"
            alt="PROMMMT Logo"
            width={40}
            height={40}
            className="object-contain"
          />
        </Link>

        {/* Navigation Icons */}
        <nav className="flex flex-col space-y-4 w-full px-2 relative items-center" onMouseLeave={() => setHoveredPath(null)}>
          {/* Single floating background pill */}
          {hoveredPath && (
            <motion.div
              layoutId="navbar-hover"
              className="absolute bg-sidebar-accent rounded-lg pointer-events-none"
              style={{
                width: 36,
                height: 36,
                top: navItems.findIndex(item => item.name === hoveredPath) * (36 + 16), // 36px button + 16px gap (space-y-4)
              }}
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
            />
          )}

          {navItems.map((item, index) => {
            // Check if this nav item is active - handle both regular paths and query params
            const itemUrl = new URL(item.href, 'http://localhost');
            const currentView = searchParams.get('view');
            const isActive = item.href.includes('?view=')
              ? (pathname === '/dashboard' && currentView === itemUrl.searchParams.get('view'))
              : pathname === item.href;
            const IconComponent = item.icon;
            const isHovered = hoveredPath === item.name;

            return (
              <div key={item.name} className="relative group flex justify-center" style={{ height: 36, width: 36 }}>
                <button
                  onClick={() => handleNavClick(item.href, item.requiresAuth)}
                  onMouseEnter={() => setHoveredPath(item.name)}
                  className={cn(
                    "p-2 rounded-lg transition-colors duration-150 active:scale-75 relative z-10",
                    (isActive || isHovered) ? "text-white" : "text-gray-400 hover:text-white"
                  )}
                >
                  {!IconComponent ? <Briefcase size={20} className="w-5 h-5" /> : <IconComponent
                    ref={(el: HomeIconHandle | null) => {
                      iconRefs.current.set(item.name, el);
                    }}
                    size={20}
                    className="w-5 h-5"
                  />}

                  {/* Yellow dot for Generate Art */}
                  {item.name === 'Generate Art' && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  )}
                </button>
                {/* Hover tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 top-1/2 -translate-y-1/2">
                  {item.name}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Profile/Sign In at bottom */}
        <div className="mt-auto">
          {isLoaded && (
            isSignedIn ? (
              <div className="relative group">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "p-2 rounded-lg transition-all duration-200 active:scale-75",
                        pathname === '/dashboard/profile'
                          ? "text-white"
                          : "text-gray-400 hover:text-white hover:bg-sidebar-accent"
                      )}
                    >
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="end"
                    className="bg-sidebar-accent border-sidebar-border text-white w-40"
                  >
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/profile')}
                      className="hover:bg-sidebar-accent cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="hover:bg-sidebar-accent cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Hover tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Profile
                </div>
              </div>
            ) : (
              <div className="relative group">
                <Link
                  href="/sign-in"
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-sidebar-accent transition-all duration-200 active:scale-75 block"
                >
                  <LogIn className="w-5 h-5" />
                </Link>
                {/* Hover tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Sign In
                </div>
              </div>
            )
          )}
        </div>
      </div>



      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border px-4 py-2 z-50">
        <nav className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href, item.requiresAuth)}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200 active:scale-75 relative",
                  isActive
                    ? "text-white"
                    : "text-gray-400 hover:text-white hover:bg-sidebar-accent"
                )}
                title={item.name}
              >
                {IconComponent ? <IconComponent className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                {/* Yellow dot for Generate Art */}
                {item.name === 'Generate Art' && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}

          {/* Profile/Sign In */}
          {isLoaded && (
            isSignedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "p-3 rounded-lg transition-all duration-200 active:scale-75",
                      pathname === '/dashboard/profile'
                        ? "text-white"
                        : "text-gray-400 hover:text-white hover:bg-sidebar-accent"
                    )}
                    title="Profile Menu"
                  >
                    <User className="w-6 h-6" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="top"

                  align="end"
                  className="bg-sidebar-accent border-sidebar-border text-white w-40 mb-2"
                >
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard/profile')}
                    className="hover:bg-sidebar-accent cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="hover:bg-sidebar-accent cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/sign-in"
                className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-sidebar-accent transition-all duration-200 active:scale-75"
                title="Sign In"
              >
                <LogIn className="w-6 h-6" />
              </Link>
            )
          )}
        </nav>
      </div>
    </>
  );
}

// Wrapper with Suspense boundary to handle useSearchParams
export function HomeSidebar(props: HomeSidebarProps) {
  return (
    <Suspense fallback={
      <>
        <div className="hidden md:fixed md:flex left-0 top-0 bottom-0 w-20 bg-sidebar border-r border-sidebar-border flex-col items-center py-6 z-50" />
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border px-4 py-2 z-50" />
      </>
    }>
      <HomeSidebarInner {...props} />
    </Suspense>
  );
}