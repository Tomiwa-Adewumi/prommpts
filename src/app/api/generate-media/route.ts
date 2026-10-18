import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { creditsApi } from '@/lib/database/credits';
import { validateUserModelAccess } from '@/lib/auth/user-tier';
import { isValidModelId } from '@/lib/models/tier-validation';
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders, RATE_LIMITS, getUserTierFromSubscription } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/database/supabase';

export async function POST(request: NextRequest) {
    try {
        // Check authentication first
        const { user } = await getAuthenticatedSupabaseClient();
        
        // Get the user's UUID from their Clerk ID
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (!userUuid) {
            console.error('User not found in database for Clerk ID:', user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { prompt, model = 'dall-e-3', aspectRatio = '1:1' } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Validate model ID exists in our system
        if (!isValidModelId(model)) {
            return NextResponse.json(
                { error: `Invalid model: ${model}. Please select a valid AI-ML model.` },
                { status: 400 }
            );
        }

        // 🔒 CRITICAL SECURITY CHECK: Validate user's tier allows access to this model
        const modelAccess = await validateUserModelAccess(userUuid, model);
        if (!modelAccess.canAccess) {
            console.warn(`User ${user.id} (tier: ${modelAccess.userTier}) attempted to access model ${model} (requires: ${modelAccess.requiredTier})`);
            
            return NextResponse.json(
                { 
                    error: 'Access denied: Model not available in your subscription tier',
                    userTier: modelAccess.userTier,
                    requiredTier: modelAccess.requiredTier,
                    modelId: model,
                    upgradeUrl: '/pricing'
                },
                { status: 403 }
            );
        }

        // Get user subscription tier for rate limiting (using admin to bypass RLS)
        const { data: subscription } = await supabaseAdmin
            .from('user_subscriptions')
            .select(`
                *,
                package:credit_packages(
                    name
                )
            `)
            .eq('user_id', userUuid)
            .eq('status', 'active')
            .single();

        // Apply rate limiting based on user tier
        const userTier = getUserTierFromSubscription(subscription?.package?.name);
        const rateLimitConfig = RATE_LIMITS.media[userTier];
        const rateLimitResult = checkRateLimit({
            type: 'media',
            identifier: userUuid,
            limit: rateLimitConfig.limit,
            windowMs: rateLimitConfig.windowMs
        });

        if (!rateLimitResult.allowed) {
            const resetDate = new Date(rateLimitResult.resetTime).toLocaleTimeString();
            return createRateLimitResponse(
                `Rate limit exceeded. You have used all ${rateLimitConfig.limit} image generations for this hour. Please try again after ${resetDate}.`
            );
        }

        // Check credit requirements for image generation
        const creditsRequired = await creditsApi.getCreditCostForOperation('image_generation');
        if (!creditsRequired) {
            return NextResponse.json(
                { error: 'Credit cost not configured for image generation' },
                { status: 500 }
            );
        }

        // Check if user has enough credits
        const creditBalance = await creditsApi.getCreditBalance(userUuid);
        if (!creditBalance || creditBalance.total_available < creditsRequired) {
            return NextResponse.json(
                { 
                    error: 'Insufficient credits',
                    required: creditsRequired,
                    available: creditBalance?.total_available || 0,
                    message: `You need ${creditsRequired} credits to generate an image. You have ${creditBalance?.total_available || 0} credits available.`
                },
                { status: 402 }
            );
        }

        // Model validation and tier checking already completed above

        // Validate aspect ratio
        const validAspectRatios = ['1:1', '16:9', '9:16'];
        if (!validAspectRatios.includes(aspectRatio)) {
            return NextResponse.json(
                { error: 'Invalid aspect ratio. Use 1:1, 16:9, or 9:16' },
                { status: 400 }
            );
        }


        // Map aspect ratio to size for AI-ML API
        // Some models may have specific size requirements
        let size: string;
        
        // Default size mapping
        const sizeMap: { [key: string]: string } = {
            '1:1': '1024x1024',
            '16:9': '1792x1024', 
            '9:16': '1024x1792'
        };
        
        // Some models only support specific sizes
        // Flux models typically work better with 1024x1024
        if (model.includes('flux') || model.includes('kontext')) {
            size = '1024x1024'; // Use square format for Flux models
        } else if (model.includes('dall-e-3')) {
            size = sizeMap[aspectRatio] || '1024x1024';
        } else {
            // Default to 1024x1024 for other models
            size = '1024x1024';
        }
        
        console.log(`Using size ${size} for model ${model}`);



        // Consume credits BEFORE making the API call
        const consumeResult = await creditsApi.consumeCredits(
            userUuid,
            creditsRequired,
            'image_generation',
            `Generated image: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
            {
                model,
                aspectRatio,
                prompt_length: prompt.length
            }
        );

        if (!consumeResult.success) {
            return NextResponse.json(
                { 
                    error: 'Failed to consume credits',
                    details: consumeResult.error,
                    available: consumeResult.available || 0,
                    required: consumeResult.required || creditsRequired
                },
                { status: 402 }
            );
        }

        try {
            // Check if API key is configured
            if (!process.env.AI_ML_API_KEY) {
                console.error('AI_ML_API_KEY is not configured');
                throw new Error('AI-ML API key is not configured. Please check environment variables.');
            }
            
            // Create timeout controller for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            // Log the request for debugging
            const requestStartTime = Date.now();
            console.log('AI-ML API Request:', {
                model,
                prompt: prompt.substring(0, 100) + '...',
                size,
                hasApiKey: !!process.env.AI_ML_API_KEY,
                timestamp: new Date().toISOString()
            });

            // Prepare API request payload based on model type
            let apiPayload: any;
            
            if (model.includes('dall-e')) {
                // DALL-E models use OpenAI-compatible format with size
                apiPayload = {
                    model,
                    prompt,
                    size,
                    n: 1,
                    response_format: 'url'
                };
            } else if (model.includes('imagen')) {
                // Google Imagen models - use exact format from documentation
                // Map our size to aspect ratio for Imagen
                const aspectRatioMap: { [key: string]: string } = {
                    '1024x1024': '1:1',
                    '1792x1024': '16:9',
                    '1024x1792': '9:16'
                };
                
                apiPayload = {
                    model,
                    prompt: prompt.substring(0, 400), // Imagen has 400 char limit
                    aspect_ratio: aspectRatioMap[size] || '1:1',
                    num_images: 1,
                    enhance_prompt: true,
                    convert_base64_to_url: true
                };
            } else if (model === 'stable-diffusion-v35-large' || model === 'stable-diffusion-v3-medium') {
                // Stable Diffusion models use OpenAI-compatible format
                apiPayload = {
                    model,
                    prompt,
                    n: 1,
                    size: size || '1024x1024',
                    response_format: 'url'
                };
            } else if (model === 'recraft-v3') {
                // Recraft uses OpenAI-compatible format
                apiPayload = {
                    model,
                    prompt,
                    n: 1,
                    size: size || '1024x1024',
                    response_format: 'url'
                };
            } else {
                // Flux and ByteDance models use simpler format (no size parameter)
                apiPayload = {
                    prompt,
                    model
                };
            }
            
            console.log('Final API Payload:', apiPayload);

            // Use AI-ML API for image generation (note: no trailing slash for Flux compatibility)
            const aimlResponse = await fetch('https://api.aimlapi.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.AI_ML_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiPayload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // Clear timeout if request completes
            
            const responseTime = Date.now() - requestStartTime;
            
            // Log response info for debugging
            console.log('AI-ML API Response Info:', {
                status: aimlResponse.status,
                statusText: aimlResponse.statusText,
                responseTime: `${responseTime}ms`,
                contentType: aimlResponse.headers.get('content-type'),
                model,
                size
            });

            if (!aimlResponse.ok) {
                const errorData = await aimlResponse.json().catch(() => ({}));
                console.error('AI-ML API Error Response:', {
                    status: aimlResponse.status,
                    statusText: aimlResponse.statusText,
                    error: errorData,
                    responseTime: `${responseTime}ms`,
                    model,
                    size,
                    headers: Object.fromEntries(aimlResponse.headers.entries())
                });
                
                // Provide more specific error messages
                let errorMessage = 'Failed to generate image';
                if (errorData.error?.message) {
                    errorMessage = errorData.error.message;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (aimlResponse.status === 400) {
                    errorMessage = 'Invalid request parameters for this model';
                } else if (aimlResponse.status === 401) {
                    errorMessage = 'API authentication failed';
                } else if (aimlResponse.status === 429) {
                    errorMessage = 'Rate limit exceeded. Please try again later';
                }
                
                throw new Error(`AI-ML API error (${aimlResponse.status}): ${errorMessage}`);
            }

            const result = await aimlResponse.json();
            
            // Determine response format and extract image URL
            let imageUrl: string | undefined;
            let responseFormat = 'unrecognized';
            
            if (result.images && Array.isArray(result.images) && result.images.length > 0) {
                // AI-ML format: images array with direct URLs
                imageUrl = result.images[0];
                responseFormat = 'AI-ML format (images array)';
            } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                // OpenAI format: data array with url property
                imageUrl = result.data[0]?.url;
                responseFormat = 'OpenAI format (data array)';
            }
            
            // Log successful response for debugging
            console.log('AI-ML API Success Response:', {
                responseTime: `${responseTime}ms`,
                responseFormat,
                hasImages: !!result.images,
                imagesLength: result.images?.length,
                hasData: !!result.data,
                dataLength: result.data?.length,
                imageUrl: imageUrl ? 'Present' : 'Missing',
                model,
                size,
                responseStructure: Object.keys(result)
            });
            
            if (!imageUrl) {
                // If image generation fails, refund the credits
                await creditsApi.addCredits(
                    userUuid,
                    creditsRequired,
                    'refund',
                    'Image generation failed - credits refunded',
                    { original_prompt: prompt, model }
                );
                return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
            }

            return NextResponse.json(
                {
                    success: true,
                    images: [imageUrl],
                    prompt,
                    model,
                    aspectRatio,
                    credits_used: creditsRequired,
                    credits_remaining: (consumeResult.balance_after || 0),
                    rateLimit: {
                        remaining: rateLimitResult.remaining,
                        limit: rateLimitConfig.limit,
                        resetTime: rateLimitResult.resetTime
                    }
                },
                {
                    headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime, rateLimitConfig.limit)
                }
            );
        } catch (apiError) {
            // If AI-ML API fails, refund the credits
            await creditsApi.addCredits(
                userUuid,
                creditsRequired,
                'refund',
                'Image generation failed - credits refunded',
                { error: apiError instanceof Error ? apiError.message : 'Unknown error' }
            );
            
            // Categorize the error for better debugging
            if (apiError instanceof Error) {
                if (apiError.name === 'AbortError') {
                    console.error('Request timed out after 30 seconds');
                    throw new Error('Request timed out. The AI model is taking too long to respond. Please try again.');
                } else if (apiError.message.includes('fetch')) {
                    console.error('Network error:', apiError.message);
                    throw new Error('Network error. Please check your connection and try again.');
                }
            }
            
            throw apiError;
        }

    } catch (error) {
        console.error('Image generation error:', error);

        if (error instanceof Error) {
            // Log the full error for debugging
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack
            });

            if (error.message.includes('content_policy')) {
                return NextResponse.json(
                    { error: 'Content policy violation. Please modify your prompt.' },
                    { status: 400 }
                );
            }
            
            // Return the actual error message for better debugging
            return NextResponse.json(
                { 
                    error: error.message || 'Failed to generate images',
                    details: 'Check server logs for more information'
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
