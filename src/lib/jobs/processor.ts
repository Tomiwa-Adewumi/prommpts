import { supabaseAdmin } from '@/lib/database/supabase';
import { creditsApi } from '@/lib/database/credits';
import { generatePrompt } from '@/lib/openai/generatePrompt';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import { getImageModel, getImageModelVariant } from '@/lib/models/media-models';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Download image from URL and upload to Supabase Storage
 */
async function uploadImageToStorage(imageUrl: string, userId: string): Promise<string> {
    // Download image from AI-ML CDN
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type from response or default to png
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

    // Generate unique filename
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = `generated/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
        .from('images')
        .upload(filePath, buffer, {
            contentType,
            upsert: false
        });

    if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('images')
        .getPublicUrl(filePath);

    return publicUrl;
}

interface Job {
    id: string;
    user_id: string;
    user_email: string;
    status: string;
    job_type: string;
    original_prompt: string;
    refined_prompt: string | null;
    should_refine_prompt: boolean;
    model: string;
    aspect_ratio: string;
    num_outputs: number;
    input_data: any;
    output_data: any;
    error_message: string | null;
    retry_count: number;
}

/**
 * Process a single job
 */
export async function processJob(jobId: string): Promise<void> {
    try {
        // Fetch the job
        const { data: job, error: fetchError } = await supabaseAdmin
            .from('image_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (fetchError || !job) {
            console.error('Failed to fetch job:', fetchError);
            return;
        }

        // Update status to processing
        await updateJobStatus(jobId, 'processing', { started_at: new Date().toISOString() });

        let finalPrompt = job.original_prompt;

        // Step 1: Refine prompt if requested
        if (job.should_refine_prompt) {
            try {
                const refinedPrompt = await refinePrompt(job.user_id, job.original_prompt, job.input_data?.reference_image);
                finalPrompt = refinedPrompt;

                // Update job with refined prompt
                await supabaseAdmin
                    .from('image_generation_jobs')
                    .update({ refined_prompt: refinedPrompt })
                    .eq('id', jobId);

            } catch (refineError) {
                console.error('Prompt refinement failed:', refineError);
                await updateJobStatus(jobId, 'failed', {
                    error_message: `Prompt refinement failed: ${refineError instanceof Error ? refineError.message : 'Unknown error'}`,
                    completed_at: new Date().toISOString()
                });
                await sendFailureEmail(job.user_email, job.original_prompt, refineError instanceof Error ? refineError.message : 'Unknown error');
                return;
            }
        }

        // Step 2: Generate image
        try {
            const imageUrl = await generateImage(job.user_id, finalPrompt, job.model, job.aspect_ratio);

            // Update job with success
            await updateJobStatus(jobId, 'completed', {
                output_data: { images: [imageUrl] },
                completed_at: new Date().toISOString()
            });

            // Send success email
            await sendSuccessEmail(job.user_email, finalPrompt, imageUrl);

        } catch (imageError) {
            console.error('Image generation failed:', imageError);
            await updateJobStatus(jobId, 'failed', {
                error_message: `Image generation failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`,
                completed_at: new Date().toISOString()
            });
            await sendFailureEmail(job.user_email, finalPrompt, imageError instanceof Error ? imageError.message : 'Unknown error');
        }

    } catch (error) {
        console.error('Job processing error:', error);
        await updateJobStatus(jobId, 'failed', {
            error_message: error instanceof Error ? error.message : 'Unknown processing error',
            completed_at: new Date().toISOString()
        });
    }
}

/**
 * Refine a prompt using AI
 */
async function refinePrompt(userId: string, originalPrompt: string, referenceImage?: string): Promise<string> {
    // Fixed credit cost for prompt refinement
    const creditsRequired = 1;

    const creditBalance = await creditsApi.getCreditBalance(userId);
    if (!creditBalance || creditBalance.total_available < creditsRequired) {
        throw new Error('Insufficient credits for prompt refinement');
    }

    // Consume credits
    const consumeResult = await creditsApi.consumeCredits(
        userId,
        creditsRequired,
        'text_generation',
        `Refined prompt for image generation`,
        { operation_type: 'refine' }
    );

    if (!consumeResult.success) {
        throw new Error('Failed to consume credits for prompt refinement');
    }

    try {
        // Generate refined prompt
        const refined = await generatePrompt({
            userPrompt: originalPrompt,
            imageUrl: referenceImage
        });

        return refined.trim();
    } catch (error) {
        // Refund credits on failure
        await creditsApi.addCredits(
            userId,
            1, // Fixed refund amount
            'refund',
            'Prompt refinement failed - credits refunded',
            { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        throw error;
    }
}

/**
 * Generate an image using AI
 */
async function generateImage(userId: string, prompt: string, model: string, aspectRatio: string, inputImages?: string[]): Promise<string> {
    // Get model config and credit cost
    const modelConfig = getImageModel(model);
    const creditsRequired = modelConfig?.credits ?? 5; // Default to 5 if model not found
    
    // Get the correct API model ID based on input
    const hasImageInput = !!(inputImages && inputImages.length > 0);
    const apiModelId = getImageModelVariant(model, hasImageInput) ?? model;

    const creditBalance = await creditsApi.getCreditBalance(userId);
    if (!creditBalance || creditBalance.total_available < creditsRequired) {
        throw new Error('Insufficient credits for image generation');
    }

    // Consume credits
    const consumeResult = await creditsApi.consumeCredits(
        userId,
        creditsRequired,
        'image_generation',
        `Generated image: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
        { model, apiModelId, aspectRatio }
    );

    if (!consumeResult.success) {
        throw new Error('Failed to consume credits for image generation');
    }

    try {
        // Map aspect ratio to size
        const sizeMap: { [key: string]: string } = {
            '1:1': '1024x1024',
            '16:9': '1792x1024',
            '9:16': '1024x1792'
        };

        let size = sizeMap[aspectRatio] || '1024x1024';

        // Prepare API request
        let apiPayload: any;

        if (model.includes('dall-e')) {
            apiPayload = {
                model,
                prompt,
                size,
                n: 1,
                response_format: 'url'
            };
        } else if (model.includes('imagen')) {
            const aspectRatioMap: { [key: string]: string } = {
                '1024x1024': '1:1',
                '1792x1024': '16:9',
                '1024x1792': '9:16'
            };

            apiPayload = {
                model,
                prompt: prompt.substring(0, 400),
                aspect_ratio: aspectRatioMap[size] || '1:1',
                num_images: 1,
                enhance_prompt: true,
                convert_base64_to_url: true
            };
        } else if (model === 'stable-diffusion-v35-large' || model === 'stable-diffusion-v3-medium') {
            apiPayload = {
                model,
                prompt,
                n: 1,
                size,
                response_format: 'url'
            };
        } else if (model === 'recraft-v3') {
            apiPayload = {
                model,
                prompt,
                n: 1,
                size,
                response_format: 'url'
            };
        } else {
            // Flux and other models
            apiPayload = {
                prompt,
                model
            };
        }

        // Call AI-ML API
        const response = await fetch('https://api.aimlapi.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AI_ML_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || 'Image generation failed');
        }

        const result = await response.json();

        // Extract image URL
        let imageUrl: string | undefined;

        if (result.images && Array.isArray(result.images) && result.images.length > 0) {
            imageUrl = result.images[0];
        } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            imageUrl = result.data[0]?.url;
        }

        if (!imageUrl) {
            throw new Error('No image URL in response');
        }

        // Upload to Supabase Storage for permanent storage
        console.log('Uploading generated image to Supabase Storage...');
        const permanentUrl = await uploadImageToStorage(imageUrl, userId);
        console.log('Image uploaded successfully:', permanentUrl);

        return permanentUrl;

    } catch (error) {
        // Refund credits on failure
        await creditsApi.addCredits(
            userId,
            creditsRequired,
            'refund',
            'Image generation failed - credits refunded',
            { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        throw error;
    }
}

/**
 * Update job status in database
 */
async function updateJobStatus(jobId: string, status: string, updates: any = {}): Promise<void> {
    await supabaseAdmin
        .from('image_generation_jobs')
        .update({
            status,
            ...updates
        })
        .eq('id', jobId);
}

/**
 * Send success email notification
 */
async function sendSuccessEmail(email: string, prompt: string, imageUrl: string): Promise<void> {
    try {
        await resend.emails.send({
            from: 'Prommmpts <noreply@prommmpts.com>',
            to: email,
            subject: '✨ Your image is ready!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #EAB308;">Your Generated Image is Ready!</h2>
                    <p>Your AI-generated image has been successfully created.</p>

                    <div style="margin: 20px 0;">
                        <img src="${imageUrl}" alt="Generated image" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                    </div>

                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Prompt:</strong></p>
                        <p style="margin: 5px 0 0 0; color: #374151;">${prompt}</p>
                    </div>

                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/generate-art"
                       style="display: inline-block; background: #EAB308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">
                        View in Gallery
                    </a>

                    <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
                        This email was sent because you submitted an image generation request while offline.
                    </p>
                </div>
            `
        });
    } catch (error) {
        console.error('Failed to send success email:', error);
    }
}

/**
 * Send failure email notification
 */
async function sendFailureEmail(email: string, prompt: string, errorMessage: string): Promise<void> {
    try {
        await resend.emails.send({
            from: 'Prommmpts <noreply@prommmpts.com>',
            to: email,
            subject: '❌ Image generation failed',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #EF4444;">Image Generation Failed</h2>
                    <p>Unfortunately, your image generation request encountered an error.</p>

                    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Error:</strong></p>
                        <p style="margin: 5px 0 0 0; color: #7f1d1d;">${errorMessage}</p>
                    </div>

                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Original Prompt:</strong></p>
                        <p style="margin: 5px 0 0 0; color: #374151;">${prompt}</p>
                    </div>

                    <p style="color: #6b7280;">Your credits have been refunded. Please try again or contact support if the issue persists.</p>

                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/generate-art"
                       style="display: inline-block; background: #EAB308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">
                        Try Again
                    </a>
                </div>
            `
        });
    } catch (error) {
        console.error('Failed to send failure email:', error);
    }
}
