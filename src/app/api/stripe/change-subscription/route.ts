import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-07-30.basil',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPackageId, isUpgrade } = body;

    console.log('Change subscription request:', { newPackageId, isUpgrade, clerkUserId });

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('clerk_id', clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        package:credit_packages(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !currentSub) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get new package details
    const { data: newPackage, error: packageError } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .eq('id', newPackageId)
      .eq('is_active', true)
      .single();

    if (packageError || !newPackage) {
      return NextResponse.json(
        { error: 'New package not found' },
        { status: 404 }
      );
    }

    console.log('Current subscription:', {
      id: currentSub.stripe_subscription_id,
      package: currentSub.package?.name
    });
    console.log('New package:', {
      id: newPackage.id,
      name: newPackage.name,
      stripe_price_id: newPackage.stripe_price_id
    });

    // Update Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(
      currentSub.stripe_subscription_id
    );

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found in Stripe' },
        { status: 404 }
      );
    }

    if (isUpgrade) {
      // For upgrades: Change immediately with proration
      const updatedSubscription = await stripe.subscriptions.update(
        currentSub.stripe_subscription_id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPackage.stripe_price_id,
            },
          ],
          proration_behavior: 'create_prorations',
        }
      );

      // Update database
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          package_id: newPackageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id);

      console.log('Subscription upgraded successfully');

      return NextResponse.json({
        success: true,
        message: 'Subscription upgraded successfully',
        subscription: updatedSubscription
      });

    } else {
      // For downgrades: Schedule change at period end
      const updatedSubscription = await stripe.subscriptions.update(
        currentSub.stripe_subscription_id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPackage.stripe_price_id,
            },
          ],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged',
        }
      );

      // Update database to reflect pending change
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          package_id: newPackageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id);

      console.log('Subscription downgrade scheduled');

      return NextResponse.json({
        success: true,
        message: 'Subscription will be downgraded at the end of your billing period',
        subscription: updatedSubscription
      });
    }

  } catch (error) {
    console.error('Stripe subscription change error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to change subscription';
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    );
  }
}
