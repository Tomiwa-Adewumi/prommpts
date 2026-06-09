import { NextRequest, NextResponse } from 'next/server';
import { requireUser, withErrorHandling, getPromptsQuery } from '@/lib/api/utils';
import { supabaseAdmin } from '@/lib/database/supabase';

async function getUserStats(request: NextRequest) {
  const user = await requireUser();

  // Get user's image statistics
  const { data: imageStats } = await supabaseAdmin
    .from('images')
    .select('likes_count, favorites_count, views_count')
    .eq('user_id', user.id);

  // Calculate totals
  const totalImages = imageStats?.length || 0;
  const totalLikes = imageStats?.reduce((sum, img) => sum + img.likes_count, 0) || 0;
  const totalFavorites = imageStats?.reduce((sum, img) => sum + img.favorites_count, 0) || 0;
  const totalViews = imageStats?.reduce((sum, img) => sum + img.views_count, 0) || 0;

  // Get favorites count
  const { count: favoritesCount } = await supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get prompts count using the same method as prompts API
  const { count: promptsCount, error: promptsError } = await getPromptsQuery()
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);



  // Get collections count
  const { count: collectionsCount } = await supabaseAdmin
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentImages } = await supabaseAdmin
    .from('images')
    .select('created_at, likes_count, favorites_count, views_count')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const recentStats = {
    imagesUploaded: recentImages?.length || 0,
    likesReceived: recentImages?.reduce((sum, img) => sum + img.likes_count, 0) || 0,
    favoritesReceived: recentImages?.reduce((sum, img) => sum + img.favorites_count, 0) || 0,
    viewsReceived: recentImages?.reduce((sum, img) => sum + img.views_count, 0) || 0,
  };

  // Get top performing image
  const { data: topImage } = await supabaseAdmin
    .from('images')
    .select('id, title, likes_count, favorites_count, views_count, engagement_score')
    .eq('user_id', user.id)
    .order('engagement_score', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    totalStats: {
      totalImages,
      totalLikes,
      totalFavorites,
      totalViews,
      savedImages: favoritesCount || 0
    },
    tabCounts: {
      images: totalImages,
      prompts: promptsCount || 0,
      collections: collectionsCount || 0
    },
    recentStats,
    topImage: topImage || null,
    memberSince: user.created_at
  });
}

export const GET = withErrorHandling(getUserStats);