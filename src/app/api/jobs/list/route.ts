import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { supabaseAdmin } from '@/lib/database/supabase';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const { user } = await getAuthenticatedSupabaseClient();

        // Get the user's UUID from their Clerk ID
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (!userUuid) {
            console.error('User not found in database for Clerk ID:', user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update last checked timestamp (for email notification logic)
        await supabaseAdmin
            .from('users')
            .update({ last_checked_jobs_at: new Date().toISOString() })
            .eq('id', userUuid);

        // Get query params for pagination
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status'); // Filter by status if provided

        // Build query (use image_generation_jobs until priority queue migration is run)
        let query = supabaseAdmin
            .from('image_generation_jobs')
            .select('*')
            .eq('user_id', userUuid)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Add status filter if provided
        if (status) {
            query = query.eq('status', status);
        }

        const { data: jobs, error: jobsError } = await query;

        if (jobsError) {
            console.error('Failed to fetch jobs:', jobsError);
            return NextResponse.json(
                { error: 'Failed to fetch jobs', details: jobsError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            jobs: jobs || [],
            count: jobs?.length || 0
        });

    } catch (error) {
        console.error('Fetch jobs error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to fetch jobs',
                details: 'Check server logs for more information'
            },
            { status: 500 }
        );
    }
}
