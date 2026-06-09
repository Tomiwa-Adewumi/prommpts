import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';

interface WorkspaceGenerateRequest {
  judgeImage: string;
  referenceImages: string[];
  brandColors: string[];
  aspectRatio: string;
  quality: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedSupabaseClient();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: WorkspaceGenerateRequest = await req.json();
    const { judgeImage, referenceImages, brandColors, aspectRatio, quality } = body;

    // For demo purposes, we'll use a hardcoded prompt since the real prompt is handled by the backend
    const backendPrompt = "Create a professional pitch competition poster with modern design, incorporating the judge's photo and brand colors";

    // Convert public paths to full URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const judgeImageUrl = `${baseUrl}${judgeImage}`;
    const referenceImageUrls = referenceImages.map(img => `${baseUrl}${img}`);

    // All images (judge + references) to send
    const allImageUrls = [judgeImageUrl, ...referenceImageUrls];

    // Build payload for nano-banana-pro (Google Gemini i2i with multiple images)
    const payload = {
      model: 'google/gemini-3-pro-image-preview-edit', // nano-banana-pro i2i variant
      prompt: backendPrompt,
      image_urls: allImageUrls, // Google supports multiple images
      aspect_ratio: aspectRatio === '2:3' ? '2:3' : '1:1',
      num_images: 1,
      quality: quality || '2K',
    };

    console.log('Workspace generation payload:', payload);

    // Call AIML API
    const apiKey = process.env.AI_ML_API_KEY;
    if (!apiKey) {
      throw new Error('AI_ML_API_KEY not configured');
    }

    const response = await fetch('https://api.aimlapi.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AIML API error:', data);
      throw new Error(data.error?.message || 'Image generation failed');
    }

    // Extract image URL from response (handle multiple response formats)
    let imageUrl: string | undefined;
    
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // AI-ML format: images array with direct URLs
      imageUrl = data.images[0];
    } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // OpenAI format: data array with url property
      imageUrl = data.data[0]?.url;
    } else if (data.output?.image_url) {
      // Legacy format
      imageUrl = data.output.image_url;
    }

    if (!imageUrl) {
      console.error('No image URL in response:', data);
      throw new Error('No image generated');
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    });

  } catch (error) {
    console.error('Workspace generation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}
