import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ collections: [] });
    }

    // Use authenticated client - this will go through RLS policies
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url),
        collection_media(
          position,
          media_type,
          image:images(
            id,
            image_url
          ),
          video:videos(
            id,
            video_url,
            thumbnail_url
          )
        )
      `)
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false });

    // Process collections to add first_media_url and keep media for thumbnails
    const processedCollections = collections?.map(collection => {
      // Get the media sorted by position, limit to 3 for folder thumbnails
      const sortedMedia = collection.collection_media?.sort((a: { position: number }, b: { position: number }) => a.position - b.position) || [];
      const thumbnailMedia = sortedMedia.slice(0, 3);
      const firstMedia = sortedMedia[0];
      const firstMediaUrl = firstMedia?.media_type === 'image'
        ? firstMedia?.image?.image_url
        : firstMedia?.video?.thumbnail_url || firstMedia?.video?.video_url;

      return {
        ...collection,
        collection_media: thumbnailMedia, // Keep first 3 for folder thumbnails
        first_media_url: firstMediaUrl || null
      };
    }) || [];

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ collections: [] });
    }

    return NextResponse.json({ collections: processedCollections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json({ collections: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Debug: Check what Supabase sees in the JWT and user lookup
    const { data: subCheck } = await supabase.from('users').select('id, clerk_id').eq('clerk_id', user.id).single();

    // Ensure user exists in database and get their UUID
    const userUuid = await usersApi.ensureUserExists({
      id: user.id,
      emailAddresses: user.emailAddresses,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });

    if (!userUuid) {
      console.error('Failed to get or create user in database');
      return NextResponse.json(
        { error: 'Failed to initialize user account' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { title, description, is_public = true, tags = [] } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Collection title is required' },
        { status: 400 }
      );
    }

    // Use authenticated client - this will go through RLS policies
    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        user_id: userUuid,
        title: title.trim(),
        description: description?.trim(),
        is_public,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating collection:', error);
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collection });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create collection' },
      { status: 500 }
    );
  }
}