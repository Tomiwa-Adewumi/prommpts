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
      .select('id, is_public, favorites_count')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection || !collection.is_public) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user already favorited this collection
    const { data: existingFavorite, error: favoriteCheckError } = await supabase
      .from('collection_favorites')
      .select('id')
      .eq('user_id', userUuid)
      .eq('collection_id', collectionId)
      .single();

    // PGRST116 means "no rows returned" which is expected when user hasn't favorited yet
    if (favoriteCheckError && favoriteCheckError.code !== 'PGRST116') {
      throw favoriteCheckError;
    }

    let favorited = false;

    if (existingFavorite) {
      // Remove favorite - trigger will auto-decrement favorites_count
      const { error: deleteError } = await supabase
        .from('collection_favorites')
        .delete()
        .eq('id', existingFavorite.id);

      if (deleteError) {
        throw deleteError;
      }
      favorited = false;
    } else {
      // Add favorite - trigger will auto-increment favorites_count
      const { error: insertError } = await supabase
        .from('collection_favorites')
        .insert({
          user_id: userUuid,
          collection_id: collectionId
        });

      if (insertError) {
        throw insertError;
      }
      favorited = true;
    }

    // Get the updated favorite count from the collections table
    const { data: updatedCollection } = await supabase
      .from('collections')
      .select('favorites_count')
      .eq('id', collectionId)
      .single();

    return NextResponse.json({
      success: true,
      favorited,
      favoritesCount: updatedCollection?.favorites_count || 0
    });

  } catch (error) {
    console.error('Collection favorite API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
