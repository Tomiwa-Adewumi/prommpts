import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';
import dns from 'dns';
import { promisify } from 'util';

const resolve = promisify(dns.resolve);

export async function POST(request: NextRequest) {
    try {
        // Check authentication to prevent SSRF attacks
        const { user } = await getAuthenticatedSupabaseClient();
        
        // Get the user's UUID from their Clerk ID
        const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
        if (!userUuid) {
            console.error('User not found in database for Clerk ID:', user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        // Basic URL validation to prevent SSRF
        try {
            const url = new URL(imageUrl);
            // Only allow HTTPS URLs
            if (url.protocol !== 'https:') {
                return NextResponse.json(
                    { error: 'Only HTTPS URLs are allowed' },
                    { status: 400 }
                );
            }

            const addresses = await resolve(url.hostname);
            const ip = addresses[0];

            // Block private IP ranges and localhost
            if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')) {
                return NextResponse.json(
                    { error: 'Invalid URL' },
                    { status: 400 }
                );
            }
        } catch (urlError) {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        const response = await fetch(imageUrl, { redirect: 'error' });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';


        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'attachment; filename="generated-image.png"',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Download error:', error);


        let errorMessage = 'Failed to download image';
        if (error instanceof Error) {
            if (error.message.includes('ENOTFOUND')) {
                errorMessage = 'Image URL is not accessible. The image may have expired or been removed.';
            } else if (error.message.includes('fetch failed')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
