import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUser, updateLastLogin, syncUserWithSupabase } from '@/lib/auth/user-sync';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clerkUserId } = body;

    // Verify the requesting user matches the user being synced
    if (userId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the existing user from database
    let user = await getCurrentUser(clerkUserId);
    
    if (user) {
      // User exists, just update last login
      await updateLastLogin(clerkUserId);
    } else {
      // User doesn't exist - webhook may have failed, create user as fallback
      user = await syncUserWithSupabase(clerkUserId);
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}