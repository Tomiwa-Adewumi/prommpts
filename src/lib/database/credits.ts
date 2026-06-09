import { supabase, supabaseAdmin, Database } from './supabase';

export type UserCredits = Database['public']['Tables']['user_credits']['Row'];
export type CreditPackage = Database['public']['Tables']['credit_packages']['Row'];
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row'];
export type Referral = Database['public']['Tables']['referrals']['Row'];
export type CreditCost = Database['public']['Tables']['credit_costs']['Row'];

export interface CreditBalance {
  permanent_credits: number;
  total_available: number;
  total_lifetime_used: number;
  referral_code: string;
}

export interface ConsumeCreditsResult {
  success: boolean;
  error?: string;
  credits_used?: number;
  daily_used?: number;
  permanent_used?: number;
  balance_after?: number;
  available?: number;
  required?: number;
}

export const creditsApi = {
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }
    return data;
  },

  async getCreditBalance(userId: string): Promise<CreditBalance | null> {
    const { data, error } = await supabase.rpc('get_credit_balance', {
      p_user_id: userId
    });

    if (error) {
      return null;
    }
    return data;
  },

  async consumeCredits(
    userId: string,
    amount: number,
    operationType: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<ConsumeCreditsResult> {
    const { data, error } = await supabase.rpc('consume_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_operation_type: operationType,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    return data;
  },

  async addCredits(
    userId: string,
    amount: number,
    transactionType: CreditTransaction['transaction_type'],
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_transaction_type: transactionType,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      throw error;
    }
  },

  async getCreditPackages(type?: 'one_time' | 'subscription'): Promise<CreditPackage[]> {
    let query = supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (type) {
      query = query.eq('package_type', type);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }
    return data || [];
  },

  async getFeaturedPackages(): Promise<CreditPackage[]> {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return [];
    }
    return data || [];
  },

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        package:credit_packages(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user subscription:', error);
      return null;
    }
    return data;
  },

  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return [];
    }
    return data || [];
  },

  async getCreditCosts(): Promise<CreditCost[]> {
    const { data, error } = await supabase
      .from('credit_costs')
      .select('*')
      .eq('is_active', true)
      .order('credits_required', { ascending: true });

    if (error) {
      return [];
    }
    return data || [];
  },

  async getCreditCostForOperation(operationType: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('credit_costs')
      .select('credits_required')
      .eq('operation_type', operationType)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }
    return data?.credits_required || null;
  },

  async createReferral(referrerCode: string, referredUserId: string): Promise<void> {
    // First get the referrer's user_id from their referral code
    const { data: referrerCredits, error: referrerError } = await supabase
      .from('user_credits')
      .select('user_id')
      .eq('referral_code', referrerCode)
      .single();

    if (referrerError || !referrerCredits) {
      throw new Error('Invalid referral code');
    }

    // Create the referral record
    const { error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerCredits.user_id,
        referred_id: referredUserId,
        referral_code: referrerCode,
        status: 'pending'
      });

    if (error) {
      throw error;
    }
  },

  async completeReferral(referredUserId: string): Promise<void> {
    const { error } = await supabase.rpc('complete_referral', {
      p_referred_user_id: referredUserId
    });

    if (error) {
      throw error;
    }
  },

  async getUserReferrals(userId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:users!referrals_referred_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }
    return data || [];
  },

  async getReferralStats(userId: string) {
    const { data, error } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', userId);

    if (error) {
      return {
        total: 0,
        pending: 0,
        completed: 0,
        credits_earned: 0
      };
    }

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      credits_earned: data.filter(r => r.status === 'completed').length * 50
    };

    return stats;
  }
};

export const adminCreditsApi = {
  async grantCredits(
    adminId: string,
    userId: string,
    amount: number,
    reason: Database['public']['Tables']['admin_credit_grants']['Row']['reason'],
    notes?: string
  ): Promise<void> {
    // First add the credits
    await creditsApi.addCredits(
      userId,
      amount,
      'admin_grant',
      `Admin grant: ${reason}`,
      { admin_id: adminId, reason, notes }
    );

    // Then log the admin grant
    const { error } = await supabaseAdmin
      .from('admin_credit_grants')
      .insert({
        admin_id: adminId,
        user_id: userId,
        amount,
        reason,
        notes
      });

    if (error) {
      throw error;
    }
  },

  async updateCreditCost(
    operationType: string,
    creditsRequired: number
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('credit_costs')
      .upsert({
        operation_type: operationType,
        credits_required: creditsRequired,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }
  },

  async updatePackage(
    packageId: string,
    updates: Database['public']['Tables']['credit_packages']['Update']
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('credit_packages')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId);

    if (error) {
      throw error;
    }
  },

  async getCreditStats() {
    // Get overall stats
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_credits')
      .select('permanent_credits, total_lifetime_used');

    if (usersError) {
      return null;
    }

    const { data: transactions, error: transError } = await supabaseAdmin
      .from('credit_transactions')
      .select('amount, transaction_type')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (transError) {
      return null;
    }

    const stats = {
      totalUsers: users.length,
      totalCreditsInCirculation: users.reduce((sum, u) => sum + u.permanent_credits, 0),
      totalCreditsUsed: users.reduce((sum, u) => sum + u.total_lifetime_used, 0),
      last30Days: {
        creditsUsed: transactions
          .filter(t => t.transaction_type === 'usage' && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0),
        creditsPurchased: transactions
          .filter(t => t.transaction_type === 'purchase' && t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),
        referralBonuses: transactions
          .filter(t => t.transaction_type === 'referral_bonus')
          .reduce((sum, t) => sum + t.amount, 0)
      }
    };

    return stats;
  }
};