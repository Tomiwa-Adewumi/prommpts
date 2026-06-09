import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if image exists and is public (using authenticated client)
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('id, is_public, is_hidden, favorites_count')
      .eq('id', imageId)
      .single();

    if (imageError || !image || !image.is_public || image.is_hidden) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if user already favorited this image
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userUuid)
      .eq('image_id', imageId)
      .single();

    let favorited = false;

    if (existingFavorite) {
      // Remove favorite - RLS policies ensure user can only delete their own favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userUuid)
        .eq('image_id', imageId);

      if (deleteError) {
        throw deleteError;
      }

      // Decrement favorites count using authenticated client
      const { error: updateError } = await supabase
        .from('images')
        .update({ favorites_count: Math.max(0, image.favorites_count - 1) })
        .eq('id', imageId);

      if (updateError) {
        throw updateError;
      }

      favorited = false;
    } else {
      // Add favorite - RLS policies ensure user_id matches authenticated user
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: userUuid,
          image_id: imageId
        });

      if (insertError) {
        throw insertError;
      }

      // Increment favorites count using authenticated client
      const { error: updateError } = await supabase
        .from('images')
        .update({ favorites_count: image.favorites_count + 1 })
        .eq('id', imageId);

      if (updateError) {
        throw updateError;
      }

      favorited = true;
    }

    // Get the final updated favorite count
    const { data: updatedImage } = await supabase
      .from('images')
      .select('favorites_count')
      .eq('id', imageId)
      .single();

    return NextResponse.json({
      success: true,
      favorited,
      favoritesCount: updatedImage?.favorites_count || 0
    });

  } catch (error) {
    console.error('Favorite API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}