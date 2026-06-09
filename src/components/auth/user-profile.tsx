'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { LocalCache, SessionCache } from '@/lib/cache/storage';

export function UserProfile() {
  const { clerkUser, supabaseUser, isSignedIn, isAdmin } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isSignedIn || !clerkUser || !supabaseUser) {
    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/sign-in')}
        >
          Sign In
        </Button>
        <Button 
          size="sm"
          onClick={() => router.push('/sign-up')}
        >
          Sign Up
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    // Clear all cached data before signing out to prevent data leakage
    LocalCache.clear();
    SessionCache.clear();
    
    await signOut();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={supabaseUser.avatar_url} 
              alt={supabaseUser.username} 
            />
            <AvatarFallback>
              {supabaseUser.full_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{supabaseUser.full_name}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              @{supabaseUser.username}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Shield className="h-3 w-3" />
                Admin
              </div>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <User className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}