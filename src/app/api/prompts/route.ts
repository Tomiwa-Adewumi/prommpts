import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getPromptsQuery, withErrorHandling, promptSchemas, validateBody } from '@/lib/api/utils';

async function listPrompts(request: NextRequest) {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: prompts, error, count } = await getPromptsQuery()
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw { status: 500, message: 'Failed to fetch prompts', details: error.message };
    }

    return NextResponse.json({
        success: true,
        prompts: prompts || [],
        total: count || 0
    });
}

async function createPrompt(request: NextRequest) {
    const user = await requireUser();
    const { prompt } = await validateBody(request, promptSchemas.create);

    const { data: promptData, error: dbError } = await getPromptsQuery()
        .insert({
            user_id: user.id,
            prompt_text: prompt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (dbError) {
        throw { status: 500, message: 'Failed to save prompt. Please try again.' };
    }

    return NextResponse.json({
        success: true,
        prompt: promptData
    });
}

export const GET = withErrorHandling(listPrompts);
export const POST = withErrorHandling(createPrompt);
