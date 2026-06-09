import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { usersApi } from '@/lib/database/users'
import { currentUser } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth/user-sync'
import { supabaseAdmin } from '@/lib/database/supabase'
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders, RATE_LIMITS, getUserTierFromSubscription } from '@/lib/rate-limit'

// Configure max body size and duration for this route
export const maxDuration = 60; // Max function duration: 60 seconds
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        // Check authentication first
        const clerkUser = await currentUser()
        if (!clerkUser) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
        }
        
        // Get the user from database
        const dbUser = await getCurrentUser(clerkUser.id)
        if (!dbUser) {
            console.error('User not found in database for Clerk ID:', clerkUser.id)
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        // Check if user has an active subscription (Starter or higher)
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .select(`
                *,
                package:credit_packages(
                    id,
                    name,
                    description,
                    credits,
                    price,
                    package_type
                )
            `)
            .eq('user_id', dbUser.id)
            .eq('status', 'active')
            .single()

        // Check if user has at least Starter subscription
        const hasRequiredSubscription = subscription && 
            (subscription.package?.name === 'Starter' || 
             subscription.package?.name === 'Creator' || 
             subscription.package?.name === 'Pro')

        if (!hasRequiredSubscription) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Subscription required',
                    requiresSubscription: true,
                    message: 'You need a Starter subscription or higher to use the image editing feature.'
                }, 
                { status: 403 }
            )
        }

        // Apply rate limiting based on user tier
        const userTier = getUserTierFromSubscription(subscription?.package?.name)
        const rateLimitConfig = RATE_LIMITS.gemini[userTier]
        const rateLimitResult = checkRateLimit({
            type: 'gemini',
            identifier: dbUser.id,
            limit: rateLimitConfig.limit,
            windowMs: rateLimitConfig.windowMs
        })

        if (!rateLimitResult.allowed) {
            const resetDate = new Date(rateLimitResult.resetTime).toLocaleTimeString()
            return createRateLimitResponse(
                `Rate limit exceeded. You have used all ${rateLimitConfig.limit} image edits for this hour. Please try again after ${resetDate}.`
            )
        }

        // Parse request body
        let body;
        try {
            body = await req.json()
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError)
            return NextResponse.json(
                { success: false, error: 'Invalid request format. Please try again.' },
                { status: 400 }
            )
        }
        
        const { prompt, images } = body

        // Validate input
        if (!prompt || !images || images.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Prompt and at least one image are required' },
                { status: 400 }
            )
        }

        if (images.length > 5) {
            return NextResponse.json(
                { success: false, error: 'Maximum 5 images allowed' },
                { status: 400 }
            )
        }

        // Check if Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not configured')
            return NextResponse.json(
                { success: false, error: 'Gemini API key is not configured' },
                { status: 500 }
            )
        }

        // Initialize Gemini AI
        let genAI;
        let model;
        try {
            // This will throw if GoogleGenerativeAI is not imported/defined
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
            
            // Use the Gemini 2.5 Flash Image Preview model
            model = genAI.getGenerativeModel({ 
                model: 'models/gemini-2.5-flash-image-preview'
            })
        } catch (initError) {
            console.error('Failed to initialize Gemini AI:', initError)
            return NextResponse.json(
                { success: false, error: 'Image generation service is temporarily unavailable. Please try again later.' },
                { status: 503 }
            )
        }

        try {
            // Prepare the content array with prompt and images
            const content = [
                {
                    text: prompt
                },
                ...images.map((base64Image: string) => {
                    // Remove the data:image/xxx;base64, prefix if present
                    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
                    
                    return {
                        inlineData: {
                            mimeType: 'image/jpeg', // You might want to detect this from the base64 string
                            data: base64Data
                        }
                    }
                })
            ]

            console.log(`Processing ${images.length} images with Gemini 2.5 Flash Image Preview`)
            
            // Generate content with images
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: content
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 32,
                    topP: 0.95,
                    maxOutputTokens: 1290, // Each image is 1290 tokens as per docs
                }
            })

            const response = await result.response
            
            // Extract the generated image from the response
            let generatedImageUrl = null
            
            for (const candidate of response.candidates || []) {
                for (const part of candidate.content?.parts || []) {
                    if (part.inlineData) {
                        // Convert the base64 image to a data URL
                        const mimeType = part.inlineData.mimeType || 'image/png'
                        const imageData = part.inlineData.data
                        generatedImageUrl = `data:${mimeType};base64,${imageData}`
                        break
                    }
                }
                if (generatedImageUrl) break
            }

            if (!generatedImageUrl) {
                // If no image was generated, return error
                console.error('No image generated from Gemini')
                return NextResponse.json(
                    { success: false, error: 'No image was generated. Please try again.' },
                    { status: 500 }
                )
            }

            // Return the generated image with rate limit headers
            return NextResponse.json(
                {
                    success: true,
                    image: generatedImageUrl,
                    model: 'gemini-2.5-flash-image-preview',
                    prompt: prompt,
                    rateLimit: {
                        remaining: rateLimitResult.remaining,
                        limit: rateLimitConfig.limit,
                        resetTime: rateLimitResult.resetTime
                    }
                },
                {
                    headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime, rateLimitConfig.limit)
                }
            )

        } catch (geminiError) {
            console.error('Gemini API error:', geminiError)
            
            // Handle specific Gemini errors
            if (geminiError instanceof Error) {
                if (geminiError.message.includes('API key')) {
                    return NextResponse.json(
                        { success: false, error: 'Invalid Gemini API key' },
                        { status: 401 }
                    )
                }
                if (geminiError.message.includes('quota') || geminiError.message.includes('limit') || geminiError.message.includes('rate') || geminiError.message.includes('429')) {
                    return NextResponse.json(
                        { success: false, error: 'We are experiencing high demand for our free image editing service. Please try again in a few moments.' },
                        { status: 429 }
                    )
                }
                if (geminiError.message.includes('overloaded') || geminiError.message.includes('capacity') || geminiError.message.includes('503')) {
                    return NextResponse.json(
                        { success: false, error: 'Our servers are currently experiencing high load. Please try again shortly.' },
                        { status: 503 }
                    )
                }
                if (geminiError.message.includes('safety')) {
                    return NextResponse.json(
                        { success: false, error: 'Content blocked by safety filters. Please modify your prompt.' },
                        { status: 400 }
                    )
                }
                if (geminiError.message.includes('timeout') || geminiError.message.includes('DEADLINE_EXCEEDED')) {
                    return NextResponse.json(
                        { success: false, error: 'Request timed out due to high demand. Please try again.' },
                        { status: 408 }
                    )
                }
            }
            
            throw geminiError
        }

    } catch (error) {
        console.error('Error in Gemini edit endpoint:', error)
        
        // Never expose internal implementation details to users
        if (error instanceof Error) {
            // Check for network or high load related errors
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNRESET')) {
                return NextResponse.json(
                    { success: false, error: 'Network error. Please check your connection and try again.' },
                    { status: 503 }
                )
            }
            
            // Check for library/import errors
            if (error.message.includes('is not defined') || error.message.includes('Cannot find') || error.message.includes('require')) {
                return NextResponse.json(
                    { success: false, error: 'Image generation service is temporarily unavailable. Please try again later.' },
                    { status: 503 }
                )
            }
            
            // For any other errors, return a generic message
            // Log the actual error for debugging but don't expose it
            console.error('Unhandled error details:', error.message)
            return NextResponse.json(
                { success: false, error: 'An error occurred while processing your request. Please try again.' },
                { status: 500 }
            )
        }
        
        return NextResponse.json(
            { success: false, error: 'Service temporarily unavailable. Please try again shortly.' },
            { status: 500 }
        )
    }
}