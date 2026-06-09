import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getImageModel, getVideoModel } from '@/lib/models/media-models';
import type { ImageModelConfig, VideoModelConfig } from '@/lib/models/media-models';

interface CreateJobRequest {
  prompt: string;
  shouldRefinePrompt: boolean;
  model: string;
  mediaType: 'image' | 'video';
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  quality?: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
}

/**
 * Determines the generation type and gets the appropriate API model ID from config
 */
function getGenerationTypeAndModelId(
  modelConfig: ImageModelConfig | VideoModelConfig,
  mediaType: 'image' | 'video',
  hasImageInput: boolean,
  hasVideoInput: boolean
): { generationType: string; apiModelId: string } {
  if (mediaType === 'image') {
    const imageConfig = modelConfig as ImageModelConfig;
    const generationType = hasImageInput ? 'i2i' : 't2i';
    const apiModelId = imageConfig.variants[generationType as 't2i' | 'i2i'];

    if (!apiModelId) {
      throw new Error(`Model does not support ${generationType} generation`);
    }

    return { generationType, apiModelId };
  } else {
    const videoConfig = modelConfig as VideoModelConfig;
    let generationType = 't2v';
    let variantKey: 't2v' | 'i2v' | 'v2v' | 'r2v' = 't2v';

    if (hasVideoInput) {
      generationType = 'v2v';
      variantKey = 'v2v';
    } else if (hasImageInput) {
      generationType = 'i2v';
      variantKey = 'i2v';
    }

    const apiModelId = videoConfig.variants[variantKey];

    if (!apiModelId) {
      throw new Error(`Model does not support ${generationType} generation`);
    }

    return { generationType, apiModelId };
  }
}

/**
 * Builds the API payload dynamically from model config and user inputs
 */
function buildPayloadFromConfig(
  modelConfig: ImageModelConfig | VideoModelConfig,
  apiModelId: string,
  prompt: string,
  mediaType: 'image' | 'video',
  aspectRatio: string | undefined,
  duration: number | undefined,
  resolution: string | undefined,
  quality: string | undefined,
  referenceImageUrls: string[],
  referenceVideoUrls: string[]
): Record<string, any> {
  const payload: Record<string, any> = {
    model: apiModelId,
    prompt,
  };

  const hasImageInput = referenceImageUrls.length > 0;
  const hasVideoInput = referenceVideoUrls.length > 0;

  if (mediaType === 'image') {
    const imageConfig = modelConfig as ImageModelConfig;
    const provider = imageConfig.provider.toLowerCase();

    // Add reference images if provided
    if (hasImageInput) {
      if (provider === 'kling ai' || provider === 'bytedance') {
        payload.image_urls = referenceImageUrls;
      } else if (provider === 'google') {
        // Google Gemini models support multiple images via image_urls array
        payload.image_urls = referenceImageUrls;
      } else if (provider === 'flux') {
        payload.image = referenceImageUrls[0];
      } else {
        payload.image = referenceImageUrls[0];
      }
    }

    // Add size/aspect ratio based on provider
    if (aspectRatio && imageConfig.aspectRatios.includes(aspectRatio)) {
      if (provider === 'kling ai' || provider === 'google') {
        payload.aspect_ratio = aspectRatio;
      } else if (provider === 'openai') {
        // Convert aspect ratio to OpenAI size format
        // DALL-E 3 supports 1024x1024, 1792x1024, 1024x1792
        // GPT-Image-1-5 supports 1024x1024, 1536x1024, 1024x1536
        const isGptImage = apiModelId.includes('gpt-image');

        const sizeMap: Record<string, string> = {
          '1:1': '1024x1024',
          '16:9': isGptImage ? '1536x1024' : '1792x1024',
          '9:16': isGptImage ? '1024x1536' : '1024x1792',
        };
        payload.size = sizeMap[aspectRatio] || '1024x1024';
      } else if (provider === 'flux') {
        // Convert aspect ratio to Flux dimensions
        const sizeMap: Record<string, { width: number; height: number }> = {
          '1:1': { width: 1024, height: 1024 },
          '16:9': { width: 1792, height: 1024 },
          '9:16': { width: 1024, height: 1792 },
          '3:2': { width: 1536, height: 1024 },
          '2:3': { width: 1024, height: 1536 },
          '4:3': { width: 1344, height: 1024 },
          '3:4': { width: 1024, height: 1344 },
          '21:9': { width: 2016, height: 864 },
          '9:21': { width: 864, height: 2016 },
          '5:4': { width: 1280, height: 1024 },
          '4:5': { width: 1024, height: 1280 },
        };
        payload.image_size = sizeMap[aspectRatio] || { width: 1024, height: 1024 };
      } else if (provider === 'bytedance') {
        // Valid sizes are 2K and 4K. Default to 2K if quality is invalid (e.g. 'standard')
        const validSizes = ['2K', '4K'];
        payload.image_size = (quality && validSizes.includes(quality)) ? quality : '2K';
      }
    }

    // Add quality if specified and supported (handled above for ByteDance)
    if (quality && imageConfig.qualities?.includes(quality)) {
      if (provider !== 'bytedance') {
        // Handle other providers if needed, currently only ByteDance used this specific field mapping here
      }
    }

    // Add provider-specific parameters
    if (provider === 'kling ai') {
      payload.num_images = 1;
      payload.resolution = '1K';
    } else if (provider === 'openai') {
      payload.n = 1;
      payload.response_format = 'url';
    } else if (provider === 'google') {
      payload.num_images = 1;
      // Add quality if specified and supported
      if (quality && imageConfig.qualities?.includes(quality)) {
        payload.quality = quality;
      }
    } else if (provider === 'flux') {
      payload.num_images = 1;
    } else if (provider === 'bytedance') {
      if (!hasImageInput) {
        payload.response_format = 'url';
      }
    }
  } else {
    // Video generation
    const videoConfig = modelConfig as VideoModelConfig;
    const provider = videoConfig.provider.toLowerCase();

    // Add reference media
    if (hasImageInput) {
      if (provider === 'kling ai' && apiModelId.includes('video-o1')) {
        // Kling O1 uses image_list for character images
        payload.image_list = referenceImageUrls;
      } else {
        // Other models use image_url
        payload.image_url = referenceImageUrls[0];
      }
    }

    if (hasVideoInput) {
      payload.video_url = referenceVideoUrls[0];
    }

    // Add duration if specified
    if (duration && videoConfig.durations.includes(duration)) {
      payload.duration = duration;
    }

    // Add aspect ratio for video models that support it
    if (aspectRatio && videoConfig.aspectRatios?.includes(aspectRatio)) {
      payload.aspect_ratio = aspectRatio;
    } else if (provider === 'kling ai' && aspectRatio) {
      payload.aspect_ratio = aspectRatio || '16:9';
    }

    // Add resolution for OpenAI/Sora models and Alibaba/Wan models
    if ((provider === 'openai' || provider === 'alibaba') && videoConfig.resolutions?.length) {
      // Use user-selected resolution if valid, otherwise default to first option
      if (resolution && videoConfig.resolutions.includes(resolution)) {
        payload.resolution = resolution;
      } else {
        payload.resolution = videoConfig.resolutions[0];
      }
    }

    // Add aspect_ratio for Alibaba/Wan models (required parameter)
    if (provider === 'alibaba') {
      // Wan 2.6 requires aspect_ratio - default to 16:9 if not specified or invalid
      if (aspectRatio && videoConfig.aspectRatios?.includes(aspectRatio)) {
        payload.aspect_ratio = aspectRatio;
      } else {
        payload.aspect_ratio = '16:9';
      }
    }

    // Add quality for Google models (NOT OpenAI/Sora - they don't support quality param)
    if (provider === 'google') {
      if (quality && videoConfig.qualities?.includes(quality)) {
        payload.quality = quality;
      } else {
        payload.quality = 'standard';
      }
    }
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user email
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userUuid)
      .single();

    if (!userData?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const body: CreateJobRequest = await request.json();
    const {
      prompt,
      shouldRefinePrompt,
      model,
      mediaType,
      aspectRatio,
      duration,
      resolution,
      quality,
      referenceImageUrls = [],
      referenceVideoUrls = [],
    } = body;

    // Validate required fields
    if (!prompt || !model || !mediaType) {
      return NextResponse.json(
        { error: 'Prompt, model, and mediaType are required' },
        { status: 400 }
      );
    }

    // Check concurrent generation limit
    const { data: limitCheck } = await supabaseAdmin.rpc('can_user_create_job', {
      p_user_id: userUuid,
    });

    if (limitCheck === false) {
      // Get current count and limit for error message
      const { data: activeCount } = await supabaseAdmin.rpc('count_user_active_jobs', {
        p_user_id: userUuid,
      });
      const { data: limit } = await supabaseAdmin.rpc('get_user_concurrent_limit', {
        p_user_id: userUuid,
      });

      return NextResponse.json(
        {
          error: 'concurrent_limit_reached',
          message: `You can only have ${limit} concurrent generation${limit > 1 ? 's' : ''} on your plan`,
          currentCount: activeCount,
          limit: limit,
        },
        { status: 429 }
      );
    }

    // Get user's queue priority
    const { data: queuePriority } = await supabaseAdmin.rpc('get_user_queue_priority', {
      p_user_id: userUuid,
    });

    // Get model configuration from config
    const modelConfig = mediaType === 'image'
      ? getImageModel(model)
      : getVideoModel(model);

    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      );
    }

    // Validate input requirements
    const hasImageInput = referenceImageUrls.length > 0;
    const hasVideoInput = referenceVideoUrls.length > 0;

    if (mediaType === 'image') {
      const imageConfig = modelConfig as ImageModelConfig;
      if (imageConfig.requiresImageInput && !hasImageInput) {
        return NextResponse.json(
          { error: 'This model requires image input' },
          { status: 400 }
        );
      }
    } else {
      const videoConfig = modelConfig as VideoModelConfig;
      if (videoConfig.requiresImageInput && !hasImageInput) {
        return NextResponse.json(
          { error: 'This model requires image input' },
          { status: 400 }
        );
      }
      if (videoConfig.requiresVideoInput && !hasVideoInput) {
        return NextResponse.json(
          { error: 'This model requires video input' },
          { status: 400 }
        );
      }
    }

    // Determine generation type and get API model ID from config
    const { generationType, apiModelId } = getGenerationTypeAndModelId(
      modelConfig,
      mediaType,
      hasImageInput,
      hasVideoInput
    );

    // Get the appropriate endpoint from config
    const endpoint = mediaType === 'image'
      ? (modelConfig as ImageModelConfig).endpoints[generationType as 't2i' | 'i2i']
      : (modelConfig as VideoModelConfig).endpoints[generationType as 't2v' | 'i2v' | 'v2v' | 'r2v'];

    if (!endpoint) {
      return NextResponse.json(
        { error: 'No endpoint configured for this generation type' },
        { status: 400 }
      );
    }

    // Consume credits for this generation
    const creditCost = modelConfig.credits;
    if (creditCost > 0) {
      const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('consume_credits', {
        p_user_id: userUuid,
        p_amount: creditCost,
        p_operation_type: mediaType === 'video' ? 'video_generation' : 'image_generation',
        p_description: `${model} - ${generationType}`,
        p_metadata: { model, generation_type: generationType, aspect_ratio: aspectRatio }
      });

      if (creditError) {
        console.error('Failed to consume credits:', creditError);
        return NextResponse.json(
          { error: 'Failed to process credits', details: creditError.message },
          { status: 500 }
        );
      }

      // Check if credit consumption was successful
      if (creditResult && !creditResult.success) {
        return NextResponse.json(
          {
            error: 'insufficient_credits',
            message: creditResult.error || 'Not enough credits',
            required: creditCost,
            available: creditResult.available || 0
          },
          { status: 402 }
        );
      }

      console.log(`Credits consumed: ${creditCost} credits for ${model}`);
    }

    const isAsync = mediaType === 'video';

    // Build API request payload dynamically from config
    const apiPayload = buildPayloadFromConfig(
      modelConfig,
      apiModelId,
      prompt,
      mediaType,
      aspectRatio,
      duration,
      resolution,
      quality,
      referenceImageUrls,
      referenceVideoUrls
    );

    // Prepare input_data with the complete payload
    const inputData = {
      endpoint,
      isAsync,
      payload: apiPayload,
    };

    // Create job in database
    const { data: job, error: jobError } = await supabaseAdmin
      .from('image_generation_jobs')
      .insert({
        user_id: userUuid,
        user_email: userData.email,
        status: 'pending',
        job_type: mediaType === 'video' ? 'video_generation' : 'image_generation',
        original_prompt: prompt,
        should_refine_prompt: shouldRefinePrompt,
        model,
        media_type: mediaType,
        generation_type: generationType,
        aspect_ratio: aspectRatio,
        duration: duration,
        quality: quality,
        num_outputs: 1,
        input_data: inputData,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError?.message },
        { status: 500 }
      );
    }

    // Trigger Railway job worker (fire and forget)
    const jobWorkerUrl = process.env.JOB_WORKER_URL;

    if (jobWorkerUrl) {
      fetch(`${jobWorkerUrl}/process-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch((err) => {
        console.error('Failed to trigger worker:', err);
      });
    } else {
      console.warn('JOB_WORKER_URL not set - job will not be processed');
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      generationType,
      queuePosition: 'processing', // Can be enhanced later
    });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create job',
        details: 'Check server logs for more information',
      },
      { status: 500 }
    );
  }
}
