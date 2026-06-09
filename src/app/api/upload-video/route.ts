import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { supabaseAdmin } from '@/lib/database/supabase';
import { v4 as uuidv4 } from 'uuid';
import { usersApi } from '@/lib/database/users';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const metadataJson = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided. Please select a video to upload.' },
        { status: 400 }
      );
    }

    if (!metadataJson) {
      return NextResponse.json(
        { error: 'Missing video metadata. Please fill out the required fields.' },
        { status: 400 }
      );
    }

    // Validate metadata
    let metadata;
    try {
      metadata = JSON.parse(metadataJson);
    } catch (parseError) {
      console.error('Metadata parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid metadata format. Please check your input and try again.' },
        { status: 400 }
      );
    }

    // Validate file
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `videos/${user.id}/${fileName}`;

    // Upload to Supabase Storage (videos bucket)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload video to storage. Please try again.' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Create video record in database using authenticated client
    const { data: videoData, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: userUuid,
        title: metadata.title,
        description: metadata.description,
        prompt: metadata.prompt,
        negative_prompt: metadata.negativePrompt,
        ai_model: metadata.aiModel,
        tags: metadata.tags || [],
        video_url: publicUrl,
        thumbnail_url: metadata.thumbnailUrl,
        duration: metadata.duration,
        file_size: file.size,
        file_format: file.type,
        width: metadata.width || 0,
        height: metadata.height || 0,
        is_public: metadata.isPublic ?? true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file on database error
      try {
        await supabaseAdmin.storage.from('videos').remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file after database error:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to save video metadata. The video was not saved.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video: {
        id: videoData.id,
        url: publicUrl,
        title: videoData.title,
        description: videoData.description
      }
    });

  } catch (error) {
    console.error('Unexpected upload error:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred during upload. Please try again.' },
      { status: 500 }
    );
  }
}
