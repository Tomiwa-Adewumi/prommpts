import { NextRequest, NextResponse } from 'next/server';
import { creditsApi } from '@/lib/database/credits';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'one_time' | 'subscription' | undefined;
    const featured = searchParams.get('featured') === 'true';

    let packages;
    
    if (featured) {
      packages = await creditsApi.getFeaturedPackages();
    } else {
      packages = await creditsApi.getCreditPackages(type);
    }

    // Also get credit costs for reference
    const creditCosts = await creditsApi.getCreditCosts();

    return NextResponse.json({
      packages,
      costs: creditCosts
    });

  } catch (error) {
    console.error('Credit packages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}