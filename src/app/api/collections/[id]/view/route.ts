import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 view requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  limit.count++;
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get IP address from request
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';

    // Rate limiting check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Try to insert a new view record (IP-based uniqueness only)
    const { error: insertError } = await supabaseAdmin
      .from('collection_views')
      .insert({
        collection_id: id,
        user_id: null, // Keep simple - only track by IP
        ip_address: ip
      });

    // If insert succeeds (new unique view), increment the counter
    if (!insertError) {
      const { error: updateError } = await supabaseAdmin.rpc('increment_collection_views', {
        collection_id: id
      });

      if (updateError) {
        console.error('Error updating views count:', updateError);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'View recorded' 
      });
    } else if (insertError.code === '23505') {
      // Duplicate view (user/IP already viewed this collection)
      return NextResponse.json({ 
        success: true, 
        message: 'View already recorded' 
      });
    } else {
      console.error('Error recording view:', insertError);
      return NextResponse.json(
        { error: 'Failed to record view' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in view tracking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}