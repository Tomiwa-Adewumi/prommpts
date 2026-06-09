import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';
import Stripe from 'stripe';

// Initialize Stripe client
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

        // Get user's active subscription
        const { data: subscription, error: fetchError } = await supabaseAdmin
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (fetchError || !subscription) {
            return NextResponse.json(
                { error: 'No active subscription found' },
                { status: 404 }
            );
        }

        // Check if subscription is already being canceled
        if (subscription.cancel_at_period_end) {
            return NextResponse.json(
                { error: 'Subscription is already being canceled' },
                { status: 400 }
            );
        }

        // Initialize Stripe client
        const stripe = getStripeClient();

        // Cancel subscription at period end in Stripe
        const stripeSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
                cancel_at_period_end: true
            }
        );

        // Update local database to reflect cancellation
        const { error: updateError } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
                cancel_at_period_end: true,
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

        if (updateError) {
            console.error('Error updating subscription in database:', updateError);
            return NextResponse.json(
                { error: 'Failed to update subscription status' },
                { status: 500 }
            );
        }

        // Log the cancellation for audit purposes
        await supabaseAdmin
            .from('stripe_webhooks')
            .insert({
                stripe_event_id: `manual_cancel_${Date.now()}`,
                event_type: 'subscription.cancel_requested',
                payload: {
                    subscription_id: subscription.stripe_subscription_id,
                    user_id: user.id,
                    canceled_at: new Date().toISOString(),
                    cancel_at_period_end: true
                },
                processed: true,
                processed_at: new Date().toISOString()
            });

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            cancel_at_period_end: true,
            current_period_end: subscription.current_period_end
        });

    } catch (error) {
        console.error('Subscription cancellation error:', error);

        if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
            return NextResponse.json(
                { error: 'Payment service configuration error' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to cancel subscription' },
            { status: 500 }
        );
    }
}
