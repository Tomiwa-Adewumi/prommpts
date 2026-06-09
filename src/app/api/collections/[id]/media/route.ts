import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { collectionsApi } from '@/lib/database/collections';
import { usersApi } from '@/lib/database/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
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
    const { image_id, video_id, position, media_type } = body;

    if (!image_id && !video_id) {
      return NextResponse.json(
        { error: 'Either image_id or video_id is required' },
        { status: 400 }
      );
    }

    if (image_id && video_id) {
      return NextResponse.json(
        { error: 'Cannot add both image and video at the same time' },
        { status: 400 }
      );
    }

    const mediaType = media_type || (image_id ? 'image' : 'video');

    // Use the authenticated client directly to respect RLS policies
    const { data: collectionMedia, error: insertError } = await supabase
      .from('collection_media')
      .insert({
        collection_id: id,
        image_id: image_id || null,
        video_id: video_id || null,
        media_type: mediaType,
        position: position ?? 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding media to collection:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Media already exists in this collection' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, collectionMedia });
  } catch (error: unknown) {
    console.error('Error adding media to collection:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Media already exists in this collection' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add media to collection' },
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
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await collectionsApi.getCollection(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.user_id !== userUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('image_id');
    const videoId = searchParams.get('video_id');
    const mediaId = searchParams.get('media_id');

    if (!imageId && !videoId && !mediaId) {
      return NextResponse.json(
        { error: 'Either image_id, video_id, or media_id is required' },
        { status: 400 }
      );
    }

    // Use the authenticated client directly to respect RLS policies
    let deleteQuery = supabase
      .from('collection_media')
      .delete()
      .eq('collection_id', id);

    if (mediaId) {
      deleteQuery = deleteQuery.eq('id', mediaId);
    } else if (imageId) {
      deleteQuery = deleteQuery.eq('image_id', imageId);
    } else if (videoId) {
      deleteQuery = deleteQuery.eq('video_id', videoId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Error removing media from collection:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing media from collection:', error);
    return NextResponse.json(
      { error: 'Failed to remove media from collection' },
      { status: 500 }
    );
  }
}
