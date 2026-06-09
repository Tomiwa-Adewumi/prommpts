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
      .select('id, is_public, is_hidden')
      .eq('id', imageId)
      .single();

    if (imageError || !image || !image.is_public || image.is_hidden) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this image
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userUuid)
      .eq('image_id', imageId)
      .single();

    let liked = false;

    if (existingLike) {
      // Remove like - trigger will auto-decrement likes_count
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        throw deleteError;
      }
      liked = false;
    } else {
      // Add like - trigger will auto-increment likes_count
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          user_id: userUuid,
          image_id: imageId
        });

      if (insertError) {
        throw insertError;
      }
      liked = true;
    }

    // Get the updated like count after trigger has run
    const { data: updatedImage } = await supabase
      .from('images')
      .select('likes_count')
      .eq('id', imageId)
      .single();

    return NextResponse.json({
      success: true,
      liked,
      likesCount: updatedImage?.likes_count || 0
    });

  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}