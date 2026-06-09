import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';

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

    // Get active subscription with package details
    const { data: subscription, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        package:credit_packages(
          id,
          name,
          description,
          credits,
          price,
          package_type
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Subscription fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // Return subscription data or null if no active subscription
    return NextResponse.json({ 
      subscription: subscription || null 
    });

  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}