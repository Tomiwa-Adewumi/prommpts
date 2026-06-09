import { NextRequest, NextResponse } from 'next/server';
import { createErrorLog } from '@/lib/database/queries';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, error_description, screen_width, screen_height } = body;

        // Validate required fields
        if (!name || !error_description || !screen_width || !screen_height) {
            return NextResponse.json(
                { error: 'Missing required fields: name, error_description, screen_width, and screen_height are required' },
                { status: 400 }
            );
        }
        // Automatically get device info from request headers
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const referer = request.headers.get('referer') || 'unknown';

        // Create error log with auto-detected device info
        const errorLog = await createErrorLog({
            name: name,
            error_description: error_description,
            device_type: userAgent,
            page_url: referer,
            screen_width,
            screen_height
        });

        return NextResponse.json(errorLog, { status: 201 });
    } catch (error) {
        console.error('Error creating error log:', error);
        return NextResponse.json(
            { error: 'Failed to create error log' },
            { status: 500 }
        );
    }
}
