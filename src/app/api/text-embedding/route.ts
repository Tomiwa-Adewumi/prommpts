import { NextRequest, NextResponse } from 'next/server';
import { getTextEmbedding } from '@/lib/openai/embeddings';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';

export async function POST(req: NextRequest) {
  try {
    // Check authentication first
    const { user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const prompt = body.prompt;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Note: Text embedding is typically a free/internal operation for search
    // but we still track it for monitoring purposes
    const embedding = await getTextEmbedding(prompt);

    return NextResponse.json({
      embedding,
      prompt_length: prompt.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
