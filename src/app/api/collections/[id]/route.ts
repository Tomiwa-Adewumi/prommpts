import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { collectionsApi } from '@/lib/database/collections';
import { usersApi } from '@/lib/database/users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await collectionsApi.getCollection(id);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user is authenticated and has favorited this collection
    let isFavorited = false;
    try {
      const { supabase: authSupabase, user } = await getAuthenticatedSupabaseClient();
      if (user) {
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (userUuid) {
          const { data: existingFavorites } = await authSupabase
            .from('collection_favorites')
            .select('id')
            .eq('user_id', userUuid)
            .eq('collection_id', id);
          isFavorited = !!(existingFavorites && existingFavorites.length > 0);
        }
      }
    } catch (authError) {
      // User is not authenticated, which is fine
      isFavorited = false;
    }

    return NextResponse.json({
      collection: {
        ...collection,
        isFavorited
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await collectionsApi.getCollection(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.user_id !== userUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, is_public, tags, cover_image_url } = body;

    const updates: Partial<{
      title: string;
      description: string;
      is_public: boolean;
      tags: string[];
      cover_image_url: string;
    }> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (is_public !== undefined) updates.is_public = is_public;
    if (tags !== undefined) updates.tags = tags;
    if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;

    const updatedCollection = await collectionsApi.updateCollection(id, updates);

    return NextResponse.json({ collection: updatedCollection });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await collectionsApi.getCollection(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.user_id !== userUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await collectionsApi.deleteCollection(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}