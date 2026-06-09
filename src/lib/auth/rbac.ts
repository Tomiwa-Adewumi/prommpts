import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from './user-sync';
import type { Database } from '../database/supabase';

export type UserRole = 'admin' | 'user' | 'anonymous';

type User = Database['public']['Tables']['users']['Row'];

export async function getCurrentUserRole(): Promise<{
  role: UserRole;
  user: User | null;
}> {
  try {
    const clerkUser = await currentUser();
    const userId = clerkUser?.id;

    if (!userId) {
      return { role: 'anonymous', user: null };
    }

    const user = await getCurrentUser(userId);

    if (!user) {
      // If no user found in database, treat as anonymous
      return { role: 'anonymous', user: null };
    }

    if (!user.is_active) {
      return { role: 'anonymous', user };
    }

    return {
      role: user.is_admin ? 'admin' : 'user',
      user
    };
  } catch (error) {
    return { role: 'anonymous', user: null };
  }
}

type AuthHandler<T = any> = (user: User) => T | Promise<T>;

export function requireAuth() {
  return async function <T>(handler: AuthHandler<T>) {
    const clerkUser = await currentUser();
    const userId = clerkUser?.id;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const user = await getCurrentUser(userId);

    if (!user || !user.is_active) {
      throw new Error('Account is inactive');
    }

    return handler(user);
  };
}

export function requireAdmin() {
  return async function <T>(handler: AuthHandler<T>) {
    const { role, user } = await getCurrentUserRole();

    if (role !== 'admin') {
      throw new Error('Admin privileges required');
    }

    if (!user) {
      throw new Error('Admin user not found');
    }

    return handler(user);
  };
}

export async function canPerformAction(
  action: 'read' | 'write' | 'delete' | 'admin',
  resource?: {
    type: 'image' | 'course' | 'user';
    ownerId?: string;
  }
): Promise<boolean> {
  const { role, user } = await getCurrentUserRole();

  // Anonymous users can only read public content
  if (role === 'anonymous') {
    return action === 'read';
  }

  // Admin users can do everything
  if (role === 'admin') {
    return true;
  }

  // Regular users
  if (role === 'user') {
    // If role is 'user' but user is null, something is wrong
    if (!user) {
      return false;
    }

    switch (action) {
      case 'read':
        return true;
      case 'write':
        return true;
      case 'delete':
        // Users can only delete their own content
        return resource?.ownerId === user.id;
      case 'admin':
        return false;
      default:
        return false;
    }
  }

  return false;
}