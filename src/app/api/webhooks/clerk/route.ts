import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { syncUserWithSupabase } from '@/lib/auth/user-sync';

export async function POST(req: NextRequest) {
  try {
    // Get webhook secret inside the function to avoid build-time evaluation
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Error occurred -- no svix headers' },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await req.text();

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: unknown;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: 'Error occurred -- verification failed' },
        { status: 400 }
      );
    }

    // Handle the webhook
    const event = evt as any;
    const { id } = event.data;
    const eventType = event.type;

    if (eventType === 'user.created') {
      try {
        // Sync user to Supabase immediately
        const user = await syncUserWithSupabase(id);

        return NextResponse.json({
          success: true,
          message: 'User synced successfully',
          userId: user.id
        });
      } catch (error) {
        console.error('Error syncing user to Supabase:', error);
        return NextResponse.json(
          { error: 'Failed to sync user to Supabase' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}