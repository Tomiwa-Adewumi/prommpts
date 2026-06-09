import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import dns from 'dns';
import { promisify } from 'util';

const resolve = promisify(dns.resolve);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();


    const { imageUrl, title, description, prompt, tags, isPublic, model } = body;



    if (!imageUrl || !title) {

      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let blob: Blob;
    
    // Check if it's a data URL (base64) or regular URL
    if (imageUrl.startsWith('data:')) {
      // Handle data URL (base64 image from Gemini)
      try {
        const [header, base64Data] = imageUrl.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        
        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid base64 image data' },
          { status: 400 }
        );
      }
    } else {
      // Handle regular URL
      try {
        // Basic format check - ensure it starts with https://
        if (!imageUrl.startsWith('https://')) {
          return NextResponse.json(
            { error: 'Only HTTPS URLs are allowed' },
            { status: 400 }
          );
        }

        // Try to parse the URL, but don't fail if it has minor formatting issues
        let url;
        try {
          url = new URL(imageUrl);
        } catch (parseError) {
          // Continue with basic validation even if URL parsing fails
        }

        // Additional security: check for common malicious patterns
        if (imageUrl.includes('javascript:') || imageUrl.includes('file:')) {
          return NextResponse.json(
            { error: 'Invalid URL protocol' },
            { status: 400 }
          );
        }
      } catch (urlError) {
        return NextResponse.json(
          { error: 'URL validation failed' },
          { status: 400 }
        );
      }

      // Download image from URL
      const response = await fetch(imageUrl, { redirect: 'error' });
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      blob = await response.blob();
    }

    // Create form data for upload
    const formData = new FormData();
    formData.append('image', blob, 'generated-image.png');

    const metadata = {
      title,
      description: description || '',
      prompt: prompt || '',
      negativePrompt: '',
      aiModel: model || 'dall-e-3',
      modelVersion: '',
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true
    };

    formData.append('metadata', JSON.stringify(metadata));

    // Forward to the upload endpoint
    const baseUrl = request.nextUrl.origin;
    const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || 'Failed to save image');
    }

    const result = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      image: result.image
    });

  } catch (error) {

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save image' },
      { status: 500 }
    );
  }
}