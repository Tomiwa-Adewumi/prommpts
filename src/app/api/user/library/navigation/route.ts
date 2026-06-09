import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { supabaseAdmin } from '@/lib/database/supabase';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthenticatedSupabaseClient();
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);

        if (!userUuid) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const currentId = searchParams.get('currentId');
        const filter = searchParams.get('filter') || 'all';

        if (!currentId) {
            return NextResponse.json({ error: 'currentId is required' }, { status: 400 });
        }

        // Fetch Data based on Filter
        let images: any[] = [];
        let jobs: any[] = [];

        if (filter === 'all' || filter === 'uploaded') {
            const { data } = await supabaseAdmin
                .from('images')
                .select('id, created_at')
                .eq('user_id', userUuid)
                .eq('is_hidden', false);
            images = data || [];
        }

        if (filter === 'all' || filter === 'generated') {
            const { data } = await supabaseAdmin
                .from('image_generation_jobs')
                .select('id, created_at')
                .eq('user_id', userUuid);
            jobs = data || [];
        }

        const allItems = [
            ...images.map(i => ({ ...i, type: 'image' })),
            ...jobs.map(j => ({ ...j, type: 'job' }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const currentIndex = allItems.findIndex(i => i.id === currentId);

        if (currentIndex === -1) {
            return NextResponse.json({ prevId: null, nextId: null });
        }

        const nextId = currentIndex > 0 ? allItems[currentIndex - 1].id : null; // Newer item
        const prevId = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1].id : null; // Older item

        // Note: "Next" usually means "Next in list", which is "Older" in a date-desc list?
        // Or "Next" as in "Newer"?
        // Gallery usually goes Right -> Older (next item in grid). Left -> Newer.
        // Let's return both and let UI decide logic.
        // Using "prev" = index - 1 (Newer), "next" = index + 1 (Older).

        return NextResponse.json({
            prevId: currentIndex > 0 ? allItems[currentIndex - 1].id : null,
            nextId: currentIndex < allItems.length - 1 ? allItems[currentIndex + 1].id : null
        });

    } catch (error) {
        console.error('Navigation API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
