import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/database/supabase';
import { creditsApi } from '@/lib/database/credits';

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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = (await headers()).get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      console.error('Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Log the webhook event
    await supabaseAdmin
      .from('stripe_webhooks')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data
      });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      default:
      // Unhandled event type
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('stripe_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const packageId = metadata.package_id;

  if (!userId || !packageId) {
    console.error('Missing user_id or package_id in checkout session metadata', {
      sessionId: session.id,
      metadata,
      customerEmail: session.customer_email
    });
    return;
  }

  // Get the package details
  const { data: creditPackage, error: packageError } = await supabaseAdmin
    .from('credit_packages')
    .select('*')
    .eq('id', packageId)
    .single();

  if (packageError || !creditPackage) {
    console.error('Failed to fetch credit package:', packageError);
    return;
  }

  if (session.mode === 'payment') {
    // One-time payment
    await creditsApi.addCredits(
      userId,
      creditPackage.credits,
      'purchase',
      `Purchased ${creditPackage.name}`,
      {
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        package_id: packageId,
        amount_paid: session.amount_total ? session.amount_total / 100 : 0
      }
    );

    // Complete referral if this is the user's first purchase
    const { data: transactions } = await supabaseAdmin
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_type', 'purchase')
      .limit(2);

    if (transactions && transactions.length === 1) {
      // This is their first purchase, complete any pending referral
      await creditsApi.completeReferral(userId);
    }
  } else if (session.mode === 'subscription' && session.subscription) {
    // Subscription created
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    // Create or update subscription record
    await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        package_id: packageId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    // Add initial subscription credits
    await creditsApi.addCredits(
      userId,
      creditPackage.credits,
      'subscription_renewal',
      `${creditPackage.name} - Initial payment`,
      {
        stripe_subscription_id: subscriptionId,
        package_id: packageId
      }
    );

    // Daily credits system has been removed
    // Subscription benefits now only include:
    // - One-time credit grant (handled above)
    // - Priority queue (handled via queue_priority in credit_packages)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { data: userSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!userSub) {
    console.error('Subscription not found in database:', subscription.id, 'This may be a subscription created outside our application');
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : null,
      current_period_end: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: (subscription as any).canceled_at
        ? new Date((subscription as any).canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: userSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!userSub) {
    console.error('Subscription not found in database:', subscription.id, 'This may be a subscription created outside our application');
    return;
  }

  // Update subscription status to canceled
  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  // Daily credits system has been removed
  // No need to reset credits on cancellation
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Skip the first invoice (handled in checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    return;
  }

  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;

  const { data: userSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select(`
      *,
      package:credit_packages(*)
    `)
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!userSub || !userSub.package) {
    console.error('Subscription or package not found:', subscriptionId);
    return;
  }

  // Add renewal credits
  await creditsApi.addCredits(
    userSub.user_id,
    userSub.package.credits,
    'subscription_renewal',
    `${userSub.package.name} - Monthly renewal`,
    {
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
      package_id: userSub.package_id,
      amount_paid: invoice.amount_paid / 100
    }
  );
}