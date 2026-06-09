import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { supabaseAdmin } from '@/lib/database/supabase';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { user } = await getAuthenticatedSupabaseClient();

        // Get the user's UUID from their Clerk ID
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (!userUuid) {
            console.error('User not found in database for Clerk ID:', user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: 'Job ID is required' },
                { status: 400 }
            );
        }

        // Verify the job belongs to the user before deleting
        const { data: job, error: fetchError } = await supabaseAdmin
            .from('image_generation_jobs')
            .select('user_id')
            .eq('id', jobId)
            .single();

        if (fetchError || !job) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        if (job.user_id !== userUuid) {
            return NextResponse.json(
                { error: 'Unauthorized to delete this job' },
                { status: 403 }
            );
        }

        // Delete the job
        const { error: deleteError } = await supabaseAdmin
            .from('image_generation_jobs')
            .delete()
            .eq('id', jobId);

        if (deleteError) {
            console.error('Failed to delete job:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete job', details: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Delete job error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to delete job',
                details: 'Check server logs for more information',
            },
            { status: 500 }
        );
    }
}
