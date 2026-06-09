import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'recent';
    const search = searchParams.get('search') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const aiModel = searchParams.get('aiModel') || '';
    const username = searchParams.get('username') || '';

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // If username is provided, get the user ID first
    let userIdFilter: string | null = null;
    if (username) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (user) {
        userIdFilter = user.id;
      }
    }

    // Build base query
    let query = supabaseAdmin
      .from('images')
      .select(`
        id,
        title,
        description,
        image_url,
        prompt,
        ai_model,
        model_version,
        likes_count,
        favorites_count,
        tags,
        width,
        height,
        created_at,
        user_id
      `, { count: 'exact' })
      .eq('is_public', true)
      .eq('is_hidden', false);

    // Apply username filter if provided
    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }

    // Apply search filter
    if (search) {
      query = query.or(`
        title.ilike.%${search}%,
        description.ilike.%${search}%,
        prompt.ilike.%${search}%
      `);
    }

    // Apply AI model filter
    if (aiModel) {
      query = query.eq('ai_model', aiModel);
    }

    // Apply tags filter
    if (tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'trending':
        // Use pre-calculated engagement score that combines likes, saves, and time decay
        // The database automatically updates this score via triggers when likes/saves change
        query = query.order('engagement_score', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: images, error, count } = await query;

    if (error) {
      console.error('Error fetching images:', error);
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      );
    }

    // Fetch user data separately to avoid RLS recursion issues
    const userIds = [...new Set(images?.map(img => img.user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    // Create a user lookup map
    const userMap = new Map(users?.map(user => [user.id, user]) || []);

    // Check for user authentication and get like/favorite status
    let userLikes = new Set();
    let userFavorites = new Set();
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
      if (clerkUser?.id) {
        const user = await getCurrentUser(clerkUser.id);
        if (user && images) {
          const imageIds = images.map(img => img.id);

          // Get likes
          const { data: likes } = await supabaseAdmin
            .from('likes')
            .select('image_id')
            .eq('user_id', user.id)
            .in('image_id', imageIds);

          userLikes = new Set(likes?.map(like => like.image_id) || []);

          // Get favorites
          const { data: favorites } = await supabaseAdmin
            .from('favorites')
            .select('image_id')
            .eq('user_id', user.id)
            .in('image_id', imageIds);

          userFavorites = new Set(favorites?.map(fav => fav.image_id) || []);
        }
      }
    } catch (authError) {
      // Not authenticated - continue without like/favorite status
    }

    // Combine images with user data and like/favorite status
    const imagesWithUsers = images?.map(image => ({
      ...image,
      user: userMap.get(image.user_id) || {
        id: image.user_id,
        username: 'Unknown',
        full_name: 'Unknown User',
        avatar_url: ''
      },
      isLiked: userLikes.has(image.id),
      isSaved: userFavorites.has(image.id),
      saves_count: image.favorites_count
    })) || [];

    const response = NextResponse.json({
      images: imagesWithUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > page * limit
      }
    });

    // Add cache headers - shorter cache for authenticated users since they can interact with content
    let cacheTime = 600; // 10 minutes for anonymous
    let cacheType = 'public';
    
    try {
      const clerkUser = await currentUser();
      if (clerkUser?.id) {
        cacheTime = 30; // 30 seconds for authenticated users
        cacheType = 'private';
      }
    } catch {
      // Use anonymous cache settings
    }
    
    response.headers.set('Cache-Control', `${cacheType}, max-age=${cacheTime}, stale-while-revalidate=10`);
    response.headers.set('ETag', `discover-${search}-${sortBy}-${aiModel}-${tags.join(',')}-${page}-${cacheTime}`);

    return response;

  } catch (error) {
    console.error('Discover API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}