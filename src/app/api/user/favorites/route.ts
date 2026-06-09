import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { usersApi } from '@/lib/database/users';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);

    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const includeInteractions = searchParams.get('include_interactions') === 'true';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: favorites, error, count } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        image:images(
          id,
          title,
          description,
          image_url,
          prompt,
          ai_model,
          likes_count,
          favorites_count,
          views_count,
          tags,
          created_at,
          user:users(id, username, full_name, avatar_url)
        )
      `, { count: 'exact' })
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching user favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    // Filter out favorites where the image was deleted
    let validFavorites = (favorites || []).filter(fav => fav.image);

    // If include_interactions is true, add like status for each image
    if (includeInteractions && validFavorites.length > 0) {
      const imageIds = validFavorites.map((fav: any) => fav.image.id);
      
      // Get like status for all images
      const { data: likes } = await supabase
        .from('likes')
        .select('image_id')
        .eq('user_id', userUuid)
        .in('image_id', imageIds);

      const likedImageIds = new Set(likes?.map(like => like.image_id) || []);

      // Add isLiked property to each image
      validFavorites = validFavorites.map(fav => ({
        ...fav,
        image: {
          ...fav.image,
          isLiked: likedImageIds.has((fav as any).image.id)
        }
      }));
    }

    return NextResponse.json({
      favorites: validFavorites,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > page * limit
      }
    });

  } catch (error) {
    console.error('User favorites API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}