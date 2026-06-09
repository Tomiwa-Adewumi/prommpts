import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;

    // Fetch image details
    let { data: image, error } = await supabaseAdmin
      .from('images')
      .select(`
        *,
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('id', imageId)
      .eq('is_public', true)
      .eq('is_hidden', false)
      .single();

    // Check user interaction if authenticated
    let userInteraction = { hasLiked: false, hasFavorited: false };
    let currentUserId = null;

    if (!image) {
      // Try fetching from image_generation_jobs
      const { data: job, error: jobError } = await supabaseAdmin
        .from('image_generation_jobs')
        .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `)
        .eq('id', imageId)
        .single();

      if (jobError || !job) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }

      // Map Job to Image structure
      const outputData = job.output_data || {};
      const imageUrl = outputData.images?.[0] || outputData.video || job.url || job.image_url;
      const promptText = job.refined_prompt || job.original_prompt || job.prompt;

      image = {
        id: job.id,
        title: '', // Jobs don't have titles usually
        description: '',
        image_url: imageUrl,
        prompt: promptText,
        negative_prompt: job.negative_prompt,
        ai_model: job.model,
        model_version: job.model_version,
        seed: job.seed,
        steps: job.steps,
        cfg_scale: job.guidance_scale || job.cfg_scale,
        width: job.width || 0,
        height: job.height || 0,
        aspect_ratio: job.aspect_ratio,
        media_type: job.media_type, // Pass media_type
        likes_count: 0,
        comments_count: 0,
        tags: [],
        created_at: job.created_at,
        user: job.user,
        isUpload: false
      };
    } else {
      image.isUpload = true; // Mark as upload if found in images table
      image.media_type = 'image'; // Images table only has images for now
    }

    try {
      const clerkUser = await currentUser();
      const userId = clerkUser?.id;
      if (userId) {
        const user = await getCurrentUser(userId);
        if (user) {
          currentUserId = user.id;

          // Check if user liked this image
          const { data: like } = await supabaseAdmin
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('image_id', imageId)
            .single();

          // Check if user favorited this image
          const { data: favorite } = await supabaseAdmin
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('image_id', imageId)
            .single();

          // Only check likes/favorites for "real" images for now, or unified if tables allow
          // Jobs might not have likes yet unless migrated. 
          // Assuming likes table relies on foreign key to 'images', so jobs won't have likes.
          // We can handle this gracefully.

          userInteraction = {
            hasLiked: !!like,
            hasFavorited: !!favorite
          };
        }
      }
    } catch (authError) {
      // Not authenticated or error - just continue with default interaction
    }

    return NextResponse.json({
      image,
      userInteraction,
      currentUserId
    });

  } catch (error) {
    console.error('Image detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user owns the image using authenticated client
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('user_id, image_url')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    if (image.user_id !== userUuid) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete related records first (likes, favorites) using authenticated client
    // RLS policies will ensure only user's own data is affected
    await supabase.from('likes').delete().eq('image_id', imageId);
    await supabase.from('favorites').delete().eq('image_id', imageId);

    // Delete the image record using authenticated client
    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      console.error('Error deleting image:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check if user owns the image
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('user_id')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    if (image.user_id !== userUuid) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { title, prompt, description, tags } = body;

    // Validate required fields
    if (!title || !prompt) {
      return NextResponse.json(
        { error: 'Title and prompt are required' },
        { status: 400 }
      );
    }

    // Update the image
    const { data: updatedImage, error: updateError } = await supabase
      .from('images')
      .update({
        title: title.trim(),
        prompt: prompt.trim(),
        description: description?.trim() || null,
        tags: tags || []
      })
      .eq('id', imageId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating image:', updateError);
      return NextResponse.json(
        { error: 'Failed to update image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: updatedImage });

  } catch (error) {
    console.error('Update image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}