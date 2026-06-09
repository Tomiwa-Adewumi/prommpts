import { NextRequest, NextResponse } from 'next/server'
import { generatePrompt, extractPromptFromImage } from '@/lib/openai/generatePrompt'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import { creditsApi } from '@/lib/database/credits';
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders, RATE_LIMITS, getUserTierFromSubscription } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/database/supabase';

interface PromptRequest {
    userPrompt?: string
    image?: string
    originalPrompt?: string
    adjustment?: string
}

export async function POST(req: NextRequest) {
    try {
        // Check authentication first
        const { user } = await getAuthenticatedSupabaseClient();
        
        // Get the user's UUID from their Clerk ID
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (!userUuid) {
            console.error('User not found in database for Clerk ID:', user.id);
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
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
        const rateLimitConfig = RATE_LIMITS.prompt[userTier];
        const rateLimitResult = checkRateLimit({
            type: 'prompt',
            identifier: userUuid,
            limit: rateLimitConfig.limit,
            windowMs: rateLimitConfig.windowMs
        });

        if (!rateLimitResult.allowed) {
            const resetDate = new Date(rateLimitResult.resetTime).toLocaleTimeString();
            return createRateLimitResponse(
                `Rate limit exceeded. You have used all ${rateLimitConfig.limit} prompt generations for this hour. Please try again after ${resetDate}.`
            );
        }

        let input: PromptRequest
        try {
            input = await req.json()
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            )
        }
        if (!input || Object.keys(input).length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing input' },
                { status: 400 }
            )
        }

        // Check credit requirements for text generation
        const creditsRequired = await creditsApi.getCreditCostForOperation('text_generation');
        if (!creditsRequired) {
            return NextResponse.json(
                { success: false, error: 'Credit cost not configured for text generation' },
                { status: 500 }
            );
        }

        // Check if user has enough credits
        const creditBalance = await creditsApi.getCreditBalance(userUuid);
        if (!creditBalance || creditBalance.total_available < creditsRequired) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Insufficient credits',
                    required: creditsRequired,
                    available: creditBalance?.total_available || 0,
                    message: `You need ${creditsRequired} credits to generate a prompt. You have ${creditBalance?.total_available || 0} credits available.`
                },
                { status: 402 }
            );
        }


        const isEdit = !!(input.originalPrompt && input.adjustment)
        const isExtract = !!(input.image && !input.userPrompt)
        const isCreate = !!(input.userPrompt || (input.image && !isEdit && !isExtract))

        if (!isCreate && !isEdit && !isExtract) {
            return NextResponse.json(
                { success: false, error: 'Invalid input structure' },
                { status: 400 }
            )
        }

        // Determine operation type for better tracking
        let operationDescription = '';
        if (isEdit) {
            operationDescription = `Refined prompt: "${input.originalPrompt?.substring(0, 30)}${(input.originalPrompt?.length || 0) > 30 ? '...' : ''}"`;
        } else if (isExtract) {
            operationDescription = 'Extracted prompt from image';
        } else {
            operationDescription = `Generated prompt from idea: "${input.userPrompt?.substring(0, 30)}${(input.userPrompt?.length || 0) > 30 ? '...' : ''}"`;
        }

        // Consume credits BEFORE making the API call
        const consumeResult = await creditsApi.consumeCredits(
            userUuid,
            creditsRequired,
            'text_generation',
            operationDescription,
            {
                operation_type: isEdit ? 'edit' : isExtract ? 'extract' : 'create',
                has_image: !!input.image,
                input_length: (input.userPrompt?.length || 0) + (input.originalPrompt?.length || 0)
            }
        );

        if (!consumeResult.success) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Failed to consume credits',
                    details: consumeResult.error,
                    available: consumeResult.available || 0,
                    required: consumeResult.required || creditsRequired
                },
                { status: 402 }
            );
        }

        let prompt: string;

        try {
            if (isEdit) {
                prompt = await generatePrompt({
                    originalPrompt: input.originalPrompt!,
                    adjustment: input.adjustment!
                })
            } else if (isExtract) {
                prompt = await extractPromptFromImage(input.image!)
            } else {
                if (input.image) {
                    // ImagePromptInput
                    const createInput = {
                        userPrompt: input.userPrompt || '',
                        imageUrl: input.image,
                    }
                    prompt = await generatePrompt(createInput)
                } else {
                    // NewPromptInput
                    const createInput = {
                        userPrompt: input.userPrompt || '',
                    }
                    prompt = await generatePrompt(createInput)
                }
            }

            return NextResponse.json(
                {
                    success: true,
                    prompt: prompt.trim(),
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
        } catch (promptError) {
            // If prompt generation fails, refund the credits
            await creditsApi.addCredits(
                userUuid,
                creditsRequired,
                'refund',
                'Prompt generation failed - credits refunded',
                { 
                    error: promptError instanceof Error ? promptError.message : 'Unknown error',
                    operation_description: operationDescription
                }
            );
            throw promptError;
        }
    } catch (error) {
        console.error('Error generating prompt:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to generate prompt' },
            { status: 500 }
        )
    }
}
