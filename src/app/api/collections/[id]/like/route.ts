import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { collectionsApi } from '@/lib/database/collections';
import { usersApi } from '@/lib/database/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if collection exists and is public (using authenticated client)
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, is_public, likes_count')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection || !collection.is_public) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this collection
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('collection_likes')
      .select('id')
      .eq('user_id', userUuid)
      .eq('collection_id', collectionId)
      .single();
    
    // PGRST116 means "no rows returned" which is expected when user hasn't liked yet
    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      throw likeCheckError;
    }
    
    let liked = false;

    if (existingLike) {
      // Remove like - trigger will auto-decrement likes_count
      const { error: deleteError } = await supabase
        .from('collection_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        throw deleteError;
      }
      liked = false;
    } else {
      // Add like - trigger will auto-increment likes_count
      const { error: insertError } = await supabase
        .from('collection_likes')
        .insert({
          user_id: userUuid,
          collection_id: collectionId
        });

      if (insertError) {
        throw insertError;
      }
      liked = true;
    }

    // Get the updated like count from the collections table
    const { data: updatedCollection } = await supabase
      .from('collections')
      .select('likes_count')
      .eq('id', collectionId)
      .single();

    return NextResponse.json({
      success: true,
      liked,
      likesCount: updatedCollection?.likes_count || 0
    });

  } catch (error) {
    console.error('Collection like API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}