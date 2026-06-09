import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getPromptsQuery, withErrorHandling, promptSchemas, validateBody } from '@/lib/api/utils';

async function getPrompt(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: promptId } = await params;

    const { data: prompt, error } = await getPromptsQuery()
        .select('*')
        .eq('id', promptId)
        .single();

    if (error || !prompt) {
        throw { status: 404, message: 'Prompt not found' };
    }

    return NextResponse.json({
        success: true,
        prompt
    });
}

export const GET = getPrompt;

async function updatePrompt(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: promptId } = await params;
    const user = await requireUser();
    const { prompt_text } = await validateBody(request, promptSchemas.update);

    const { error: dbError } = await getPromptsQuery()
        .update({
            prompt_text: prompt_text.trim(),
            updated_at: new Date().toISOString()
        })
        .eq('id', promptId)
        .eq('user_id', user.id);

    if (dbError) {
        throw { status: 500, message: 'Failed to update prompt. Please try again.' };
    }

    return NextResponse.json({
        success: true,
        prompt: { id: promptId, prompt_text: prompt_text.trim() }
    });
}

export const PATCH = updatePrompt;

async function deletePrompt(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: promptId } = await params;
    const user = await requireUser();

    const { error: dbError } = await getPromptsQuery()
        .delete()
        .eq('id', promptId)
        .eq('user_id', user.id);

    if (dbError) {
        throw { status: 500, message: 'Failed to delete prompt. Please try again.' };
    }

    return NextResponse.json({
        success: true
    });
}

export const DELETE = deletePrompt;
