import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
import { supabaseAdmin } from '@/lib/database/supabase';
import type { Database } from '@/lib/database/supabase';

type UserInsert = Database['public']['Tables']['users']['Insert'];

// This function is called by the Clerk webhook when a user signs up
export async function syncUserWithSupabase(clerkUserId: string) {
  try {
    // Get user data from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    // Extract user information from Clerk
    const userData: UserInsert = {
      clerk_id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      username: clerkUser.username || generateUsername(clerkUser.firstName, clerkUser.lastName),
      full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Anonymous User',
      avatar_url: clerkUser.imageUrl || '',
      google_id: clerkUser.externalAccounts.find((acc: { provider: string; externalId?: string }) => acc.provider === 'google')?.externalId,
      last_login: new Date().toISOString(),
    };

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUser.id)
      .single();

    let data;
    if (existingUser) {
      // User already exists - this shouldn't happen via webhook
      // Just return the existing user
      data = existingUser;
    } else {
      // New user - insert all data including generated username
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      data = newUser;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

function generateUsername(firstName?: string | null, lastName?: string | null): string {
  const base = firstName || lastName || 'user';
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base.toLowerCase().replace(/[^a-z0-9]/g, '')}${randomSuffix}`;
}

export async function getCurrentUser(clerkUserId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

// Simple function to update last login time only
export async function updateLastLogin(clerkUserId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        last_login: new Date().toISOString(),
      })
      .eq('clerk_id', clerkUserId)
      .select()
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}