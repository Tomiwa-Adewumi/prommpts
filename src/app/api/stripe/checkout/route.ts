import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';

// Move Stripe client initialization inside the function to avoid build-time evaluation
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
    // Initialize Stripe client inside the function
    const stripe = getStripeClient();

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { packageId, successUrl, cancelUrl } = body;

    console.log('Checkout request:', { packageId, clerkUserId });

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

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

    // Get package details
    const { data: creditPackage, error: packageError } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !creditPackage) {
      console.error('Package not found:', { packageId, packageError });
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    console.log('Found package:', {
      id: creditPackage.id,
      name: creditPackage.name,
      type: creditPackage.package_type,
      price: creditPackage.price,
      stripe_price_id: creditPackage.stripe_price_id
    });

    // Check if user already has an active subscription (for subscription packages)
    if (creditPackage.package_type === 'subscription') {
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
          id,
          package_id,
          stripe_subscription_id,
          package:credit_packages(
            id,
            name,
            price,
            credits
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (existingSub) {
        // User already has an active subscription
        // Return info so frontend can handle upgrade/downgrade
        return NextResponse.json(
          {
            error: 'User already has an active subscription',
            hasActiveSubscription: true,
            currentSubscription: {
              packageId: existingSub.package_id,
              packageName: existingSub.package?.name,
              stripeSubscriptionId: existingSub.stripe_subscription_id
            },
            requestedPackage: {
              packageId: creditPackage.id,
              packageName: creditPackage.name,
              price: creditPackage.price
            }
          },
          { status: 400 }
        );
      }
    }

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        clerk_user_id: clerkUserId
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/generate-art?payment=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=canceled`,
    };

    if (creditPackage.package_type === 'one_time') {
      // One-time payment - always use price_data for flexibility
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description || `${creditPackage.credits} credits`,
            },
            unit_amount: Math.round(parseFloat(creditPackage.price) * 100),
          },
          quantity: 1,
        },
      ];
    } else {
      // Subscription
      sessionConfig.mode = 'subscription';

      // Create or use existing price ID
      if (creditPackage.stripe_price_id) {
        sessionConfig.line_items = [
          {
            price: creditPackage.stripe_price_id,
            quantity: 1,
          },
        ];
      } else {
        // Create price on the fly (not recommended for production)
        const price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: Math.round(parseFloat(creditPackage.price) * 100),
          recurring: {
            interval: (creditPackage.interval as Stripe.Price.Recurring.Interval) || 'month',
          },
          product_data: {
            name: creditPackage.name,
            description: creditPackage.description || `${creditPackage.credits} credits per month`,
            metadata: {
              package_id: packageId,
            },
          },
        });

        // Update package with the price ID for future use
        await supabaseAdmin
          .from('credit_packages')
          .update({ stripe_price_id: price.id })
          .eq('id', packageId);

        sessionConfig.line_items = [
          {
            price: price.id,
            quantity: 1,
          },
        ];
      }
    }

    console.log('Creating Stripe session with config:', {
      mode: sessionConfig.mode,
      hasLineItems: !!sessionConfig.line_items,
      metadata: sessionConfig.metadata
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Stripe session created successfully:', {
      sessionId: session.id,
      url: session.url
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    );
  }
}

// Cancel subscription endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Initialize Stripe client inside the function
    const stripe = getStripeClient();

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel subscription at period end
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    // Update database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: stripeSubscription.cancel_at
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}