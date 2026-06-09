import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { supabaseAdmin } from '@/lib/database/supabase';
import { ImageUploadSchema } from '@/lib/validation/upload-schema';
import { v4 as uuidv4 } from 'uuid';
import { usersApi } from '@/lib/database/users';
import sharp from 'sharp';
import { getTextEmbedding } from '@/lib/openai/embeddings';
import { 
  moderateImageAndText,
  combineTextForModeration, 
  combineTextForEmbedding,
  MODERATION_PRESETS 
} from '@/lib/openai/moderation';


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
    const file = formData.get('image') as File;
    const metadataJson = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided. Please select an image to upload.' },
        { status: 400 }
      );
    }

    if (!metadataJson) {
      return NextResponse.json(
        { error: 'Missing image metadata. Please fill out the required fields.' },
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

    let validatedMetadata;
    try {
      validatedMetadata = ImageUploadSchema.parse(metadata);
    } catch (validationError) {
      console.error('Metadata validation error:', validationError);
      return NextResponse.json(
        { error: 'Invalid metadata. Please check all required fields are filled correctly.' },
        { status: 400 }
      );
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert image to base64 for moderation
    const base64Image = buffer.toString('base64');

    // Content moderation check (both text and image)
    const textForModeration = combineTextForModeration({
      title: validatedMetadata.title,
      description: validatedMetadata.description,
      prompt: validatedMetadata.prompt,
      negativePrompt: validatedMetadata.negativePrompt,
      tags: validatedMetadata.tags
    });

    let moderationResult;
    try {
      moderationResult = await moderateImageAndText(textForModeration, base64Image, MODERATION_PRESETS.moderate);
    } catch (moderationError) {
      console.error('Content moderation error:', moderationError);
      return NextResponse.json(
        { error: moderationError instanceof Error ? moderationError.message : 'Content moderation failed. Please try again.' },
        { status: 503 }
      );
    }

    if (moderationResult.reject) {
      return NextResponse.json(
        { 
          error: 'Content violates our community guidelines.',
          details: moderationResult.reasons,
          flaggedCategories: moderationResult.flaggedCategories
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `images/${user.id}/${fileName}`;

    // Extract image dimensions using Sharp (buffer already created for moderation)
    let width = 0;
    let height = 0;
    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;
      
      if (width <= 0 || height <= 0) {
        return NextResponse.json(
          { error: 'Unable to determine image dimensions. Please ensure you uploaded a valid image file.' },
          { status: 400 }
        );
      }
    } catch (sharpError) {
      console.error('Error extracting image metadata:', sharpError);
      return NextResponse.json(
        { error: 'Invalid image file. Please upload a valid JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to storage. Please try again.' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(filePath);

    // User validation is already done via getAuthenticatedSupabaseClient
    // userUuid is already validated above

    // Generate embedding for semantic search
    const textForEmbedding = combineTextForEmbedding({
      title: validatedMetadata.title,
      description: validatedMetadata.description,
      prompt: validatedMetadata.prompt,
      tags: validatedMetadata.tags
    });

    let embedding: number[] | null = null;
    try {
      embedding = await getTextEmbedding(textForEmbedding);
    } catch (embeddingError) {
      console.error('Embedding generation error:', embeddingError);
      // Continue without embedding rather than failing the upload
      console.warn('Upload proceeding without embedding for semantic search');
    }

    // Create image record in database using authenticated client
    const { data: imageData, error: dbError } = await supabase
      .from('images')
      .insert({
        user_id: userUuid,
        title: validatedMetadata.title,
        description: validatedMetadata.description,
        prompt: validatedMetadata.prompt,
        negative_prompt: validatedMetadata.negativePrompt,
        ai_model: validatedMetadata.aiModel,
        tags: validatedMetadata.tags || [],
        image_url: publicUrl,
        file_size: file.size,
        file_format: file.type,
        width: width,
        height: height,
        is_public: validatedMetadata.isPublic,
        embedding: embedding
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file on database error
      try {
        await supabaseAdmin.storage.from('images').remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file after database error:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to save image metadata. The image was not saved.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: {
        id: imageData.id,
        url: publicUrl,
        title: imageData.title,
        description: imageData.description
      }
    });

  } catch (error) {
    console.error('Unexpected upload error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid input data. Please check your form and try again.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Content moderation') || error.message.includes('moderation')) {
        return NextResponse.json(
          { error: error.message },
          { status: 503 }
        );
      }
      
      if (error.message.includes('OpenAI') || error.message.includes('embedding')) {
        return NextResponse.json(
          { error: 'AI processing temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection and try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during upload. Please try again.' },
      { status: 500 }
    );
  }
}