import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getPromptsQuery, withErrorHandling } from '@/lib/api/utils';

async function getUserPrompts(request: NextRequest) {
    const user = await requireUser();

    const { data: prompts, error: dbError } = await getPromptsQuery()
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (dbError) {
        throw { status: 500, message: 'Failed to fetch prompts. Please try again.' };
    }

    const response = NextResponse.json({
        success: true,
        prompts: prompts || []
    });

    // Add cache headers for user prompts (longer cache as they change less frequently)
    response.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=300'); // 30 min cache, 5 min stale
    response.headers.set('ETag', `user-prompts-${user.id}-${Date.now().toString(36)}`);

    return response;
}

export const GET = withErrorHandling(getUserPrompts);
