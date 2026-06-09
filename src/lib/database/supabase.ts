import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create a validated Supabase client that enforces user-level permissions
// This is a transitional approach until proper JWT integration is set up
export function createValidatedSupabaseClient(clerkUserId: string, userDbId: string) {
  // Return a wrapped client that validates user ownership on operations
  return {
    from: (table: string) => {
      const query = supabaseAdmin.from(table);

      // For user-owned tables, automatically add user ownership filter
      if (table === 'likes' || table === 'favorites') {
        return {
          ...query,
          select: (columns?: string, options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => {
            const selectQuery = query.select(columns, options);
            return {
              ...selectQuery,
              eq: (column: string, value: string | number) => {
                // If querying by user_id, ensure it matches the authenticated user
                if (column === 'user_id' && value !== userDbId) {
                  throw new Error('Access denied: Cannot access other users data');
                }
                return selectQuery.eq(column, value);
              },
              single: () => selectQuery.single(),
            };
          },
          insert: (values: { user_id?: string; image_id: string }) => {
            // Ensure user_id matches authenticated user for inserts
            if (values.user_id && values.user_id !== userDbId) {
              throw new Error('Access denied: Cannot insert data for other users');
            }
            if (!values.user_id) {
              values.user_id = userDbId;
            }
            return query.insert(values);
          },
          delete: () => {
            return {
              ...query.delete(),
              eq: (column: string, value: string | number) => {
                // For user_id equality, ensure it matches authenticated user
                if (column === 'user_id' && value !== userDbId) {
                  throw new Error('Access denied: Cannot delete other users data');
                }
                return query.delete().eq(column, value);
              },
            };
          },
        };
      }

      // For non-user tables, return normal query
      return query;
    },
  };
}

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string;
          username: string;
          full_name: string;
          avatar_url: string;
          bio: string | null;
          is_admin: boolean;
          is_active: boolean;
          google_id: string | null;
          created_at: string;
          updated_at: string;
          last_login: string | null;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          email: string;
          username?: string;
          full_name?: string;
          avatar_url?: string;
          bio?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          google_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          email?: string;
          username?: string;
          full_name?: string;
          avatar_url?: string;
          bio?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          google_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
        };
      };
      images: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          image_url: string;
          prompt: string;
          negative_prompt: string | null;
          ai_model: string;
          model_version: string | null;
          seed: number | null;
          steps: number | null;
          cfg_scale: number | null;
          width: number;
          height: number;
          file_size: number | null;
          file_format: string;
          is_public: boolean;
          is_hidden: boolean;
          is_featured: boolean;
          likes_count: number;
          favorites_count: number;
          views_count: number;
          engagement_score: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          image_url: string;
          prompt: string;
          negative_prompt?: string | null;
          ai_model: string;
          model_version?: string | null;
          seed?: number | null;
          steps?: number | null;
          cfg_scale?: number | null;
          width: number;
          height: number;
          file_size?: number | null;
          file_format?: string;
          is_public?: boolean;
          is_hidden?: boolean;
          is_featured?: boolean;
          likes_count?: number;
          favorites_count?: number;
          views_count?: number;
          engagement_score?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string;
          prompt?: string;
          negative_prompt?: string | null;
          ai_model?: string;
          model_version?: string | null;
          seed?: number | null;
          steps?: number | null;
          cfg_scale?: number | null;
          width?: number;
          height?: number;
          file_size?: number | null;
          file_format?: string;
          is_public?: boolean;
          is_hidden?: boolean;
          is_featured?: boolean;
          likes_count?: number;
          favorites_count?: number;
          views_count?: number;
          engagement_score?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          image_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_id?: string;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          image_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_id?: string;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          admin_id: string;
          title: string;
          description: string;
          course_image_url: string | null;
          price: number;
          is_available: boolean;
          is_featured: boolean;
          enrollment_count: number;
          rating: number;
          rating_count: number;
          duration_hours: number | null;
          difficulty_level: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          title: string;
          description: string;
          course_image_url?: string | null;
          price?: number;
          is_available?: boolean;
          is_featured?: boolean;
          enrollment_count?: number;
          rating?: number;
          rating_count?: number;
          duration_hours?: number | null;
          difficulty_level?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          title?: string;
          description?: string;
          course_image_url?: string | null;
          price?: number;
          is_available?: boolean;
          is_featured?: boolean;
          enrollment_count?: number;
          rating?: number;
          rating_count?: number;
          duration_hours?: number | null;
          difficulty_level?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      prompts: {
        Row: {
          id: string;
          user_id: string;
          prompt_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt_text?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          video_url: string;
          thumbnail_url: string | null;
          prompt: string;
          negative_prompt: string | null;
          ai_model: string;
          model_version: string | null;
          duration: number | null;
          width: number;
          height: number;
          file_size: number | null;
          file_format: string;
          is_public: boolean;
          is_hidden: boolean;
          is_featured: boolean;
          likes_count: number;
          favorites_count: number;
          views_count: number;
          engagement_score: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          video_url: string;
          thumbnail_url?: string | null;
          prompt: string;
          negative_prompt?: string | null;
          ai_model: string;
          model_version?: string | null;
          duration?: number | null;
          width: number;
          height: number;
          file_size?: number | null;
          file_format?: string;
          is_public?: boolean;
          is_hidden?: boolean;
          is_featured?: boolean;
          likes_count?: number;
          favorites_count?: number;
          views_count?: number;
          engagement_score?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          thumbnail_url?: string | null;
          prompt?: string;
          negative_prompt?: string | null;
          ai_model?: string;
          model_version?: string | null;
          duration?: number | null;
          width?: number;
          height?: number;
          file_size?: number | null;
          file_format?: string;
          is_public?: boolean;
          is_hidden?: boolean;
          is_featured?: boolean;
          likes_count?: number;
          favorites_count?: number;
          views_count?: number;
          engagement_score?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          is_public: boolean;
          is_featured: boolean;
          media_count: number;
          favorites_count: number;
          views_count: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
          is_featured?: boolean;
          media_count?: number;
          favorites_count?: number;
          views_count?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
          is_featured?: boolean;
          media_count?: number;
          favorites_count?: number;
          views_count?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_media: {
        Row: {
          id: string;
          collection_id: string;
          image_id: string | null;
          video_id: string | null;
          media_type: 'image' | 'video';
          position: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          image_id?: string | null;
          video_id?: string | null;
          media_type: 'image' | 'video';
          position?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          image_id?: string | null;
          video_id?: string | null;
          media_type?: 'image' | 'video';
          position?: number;
          added_at?: string;
        };
      };
      collection_favorites: {
        Row: {
          id: string;
          user_id: string;
          collection_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          collection_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          collection_id?: string;
          created_at?: string;
        };
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          daily_credits: number;
          permanent_credits: number;
          last_daily_reset: string;
          total_lifetime_used: number;
          referral_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_credits?: number;
          permanent_credits?: number;
          last_daily_reset?: string;
          total_lifetime_used?: number;
          referral_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_credits?: number;
          permanent_credits?: number;
          last_daily_reset?: string;
          total_lifetime_used?: number;
          referral_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_packages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          credits: number;
          price: number;
          package_type: 'one_time' | 'subscription';
          stripe_price_id: string | null;
          interval: string | null;
          features: Record<string, unknown>;
          daily_credits_bonus: number;
          is_active: boolean;
          is_featured: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          credits: number;
          price: number;
          package_type: 'one_time' | 'subscription';
          stripe_price_id?: string | null;
          interval?: string | null;
          features?: Record<string, unknown>;
          daily_credits_bonus?: number;
          is_active?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          credits?: number;
          price?: number;
          package_type?: 'one_time' | 'subscription';
          stripe_price_id?: string | null;
          interval?: string | null;
          features?: Record<string, unknown>;
          daily_credits_bonus?: number;
          is_active?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          stripe_subscription_id?: string;
          stripe_customer_id?: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          transaction_type: 'purchase' | 'usage' | 'daily_grant' | 'referral_bonus' | 'admin_grant' | 'subscription_renewal' | 'refund';
          description: string | null;
          metadata: Record<string, unknown>;
          stripe_payment_intent_id: string | null;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          transaction_type: 'purchase' | 'usage' | 'daily_grant' | 'referral_bonus' | 'admin_grant' | 'subscription_renewal' | 'refund';
          description?: string | null;
          metadata?: Record<string, unknown>;
          stripe_payment_intent_id?: string | null;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          balance_after?: number;
          transaction_type?: 'purchase' | 'usage' | 'daily_grant' | 'referral_bonus' | 'admin_grant' | 'subscription_renewal' | 'refund';
          description?: string | null;
          metadata?: Record<string, unknown>;
          stripe_payment_intent_id?: string | null;
          related_id?: string | null;
          created_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          status: 'pending' | 'completed' | 'expired';
          referrer_bonus_paid: boolean;
          referred_bonus_paid: boolean;
          referrer_credits_earned: number;
          referred_credits_earned: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          status?: 'pending' | 'completed' | 'expired';
          referrer_bonus_paid?: boolean;
          referred_bonus_paid?: boolean;
          referrer_credits_earned?: number;
          referred_credits_earned?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          referral_code?: string;
          status?: 'pending' | 'completed' | 'expired';
          referrer_bonus_paid?: boolean;
          referred_bonus_paid?: boolean;
          referrer_credits_earned?: number;
          referred_credits_earned?: number;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      admin_credit_grants: {
        Row: {
          id: string;
          admin_id: string;
          user_id: string;
          amount: number;
          reason: 'customer_service' | 'promotion' | 'bug_compensation' | 'contest_prize' | 'other';
          notes: string | null;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          user_id: string;
          amount: number;
          reason: 'customer_service' | 'promotion' | 'bug_compensation' | 'contest_prize' | 'other';
          notes?: string | null;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          user_id?: string;
          amount?: number;
          reason?: 'customer_service' | 'promotion' | 'bug_compensation' | 'contest_prize' | 'other';
          notes?: string | null;
          transaction_id?: string | null;
          created_at?: string;
        };
      };
      stripe_webhooks: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          processed: boolean;
          error: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          stripe_event_id?: string;
          event_type?: string;
          payload?: Record<string, unknown>;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
      };
      credit_costs: {
        Row: {
          id: string;
          operation_type: string;
          credits_required: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operation_type: string;
          credits_required: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          operation_type?: string;
          credits_required?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      error_logs: {
        Row: {
          id: string;
          name: string;
          error_description: string;
          device_type: string;
          page_url: string;
          screen_width: number;
          screen_height: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          error_description: string;
          device_type: string;
          page_url: string;
          screen_width: number;
          screen_height: number;
          created_at?: string;
        };
      };
    };
  };
};