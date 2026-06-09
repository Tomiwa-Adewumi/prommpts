import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';
import { creditsApi } from '@/lib/database/credits';

export async function GET(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    const userId = clerkUser?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getCurrentUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get credit balance using admin client
    const { data: creditBalance, error: creditError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creditError) {
      console.error('Credit balance fetch error:', creditError);
      return NextResponse.json(
        { error: 'Failed to fetch credit balance' },
        { status: 500 }
      );
    }

    // Calculate total available credits
    const totalAvailable = creditBalance?.permanent_credits || 0;

    return NextResponse.json({
      balance: {
        permanent_credits: creditBalance?.permanent_credits || 0,
        total_available: totalAvailable,
        total_lifetime_used: creditBalance?.total_lifetime_used || 0,
        referral_code: creditBalance?.referral_code || ''
      }
    });

  } catch (error) {
    console.error('User credits API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}