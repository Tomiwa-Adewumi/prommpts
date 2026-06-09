import { supabase, supabaseAdmin } from './supabase';

export const usersApi = {
  /**
   * Get user UUID from Clerk ID
   * This function maps a Clerk user ID to the internal database user UUID
   */
  async getUserUuidFromClerkId(clerkId: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();

      if (error) {
        return null;
      }

      return data?.id || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get or create user by Clerk ID
   * Ensures a user exists in the database for the given Clerk ID
   */
  async ensureUserExists(clerkUser: {
    id: string;
    emailAddresses?: Array<{ emailAddress: string }>;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
  }): Promise<string | null> {
    try {
      // First check if user exists
      const existingUserId = await this.getUserUuidFromClerkId(clerkUser.id);
      if (existingUserId) {
        return existingUserId;
      }

      // Create new user if doesn't exist
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        return null;
      }

      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ') || '';

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_id: clerkUser.id,
          email,
          username: clerkUser.username || email.split('@')[0],
          full_name: fullName,
          avatar_url: clerkUser.imageUrl || '',
        })
        .select('id')
        .single();

      if (error) {
        return null;
      }

      return data?.id || null;
    } catch (error) {
      return null;
    }
  },
};