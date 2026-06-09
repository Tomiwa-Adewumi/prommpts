import { createClient } from '@supabase/supabase-js';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { Database } from './database/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates an authenticated Supabase client using Clerk native integration
 * This ensures all operations go through RLS policies
 */
export async function getAuthenticatedSupabaseClient() {
  try {
    // Get the current user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error('User not authenticated');
    }

    const { getToken } = await auth();
    
    // Get the token immediately to ensure it's available
    const token = await getToken();
    
    if (!token) {
      throw new Error('Failed to get Clerk session token');
    }

    // Create Supabase client with Clerk session token (native integration)
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    return { supabase, user: clerkUser };
  } catch (error) {
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}