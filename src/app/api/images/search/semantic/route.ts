import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';
import { getTextEmbedding } from '@/lib/openai/embeddings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const aiModel = searchParams.get('aiModel') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await getTextEmbedding(query);
    } catch (embeddingError) {
      console.error('Error generating search embedding:', embeddingError);
      return NextResponse.json(
        { error: 'Failed to process search query. Please try again.' },
        { status: 500 }
      );
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build semantic search query using the match_images function
    const rpcQuery = supabaseAdmin.rpc('match_images', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit * 3 // Get more results to filter through
    });

    const { data: semanticResults, error: semanticError } = await rpcQuery;

    // Type the results to avoid implicit any errors
    type SemanticResult = {
      id: string;
      title: string;
      description?: string;
      image_url: string;
      prompt: string;
      ai_model: string;
      model_version?: string;
      tags?: string[];
      width: number;
      height: number;
      created_at: string;
      similarity: number;
      user_id: string;
      likes_count?: number;
      favorites_count?: number;
      views_count?: number;
    };

    let filteredResults: SemanticResult[] = semanticResults || [];

    if (semanticError) {
      console.error('Semantic search error:', semanticError);
      return NextResponse.json(
        { error: 'Semantic search failed. Please try again.' },
        { status: 500 }
      );
    }

    // Apply additional filters
    if (aiModel) {
      filteredResults = filteredResults.filter(img => img.ai_model === aiModel);
    }

    if (tags.length > 0) {
      filteredResults = filteredResults.filter(img =>
        img.tags && tags.some(tag => img.tags!.includes(tag))
      );
    }

    // Apply pagination to filtered results
    const paginatedResults = filteredResults.slice(from, from + limit);

    // Get user IDs to fetch user data
    const userIds = [...new Set(paginatedResults.map(img => img.user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    // Create user lookup map
    const userMap = new Map(users?.map(user => [user.id, user]) || []);

    // Check for user authentication and get like/favorite status
    let userLikes = new Set();
    let userFavorites = new Set();
    try {
      const clerkUser = await currentUser();
      if (clerkUser?.id) {
        const user = await getCurrentUser(clerkUser.id);
        if (user && paginatedResults.length > 0) {
          const imageIds = paginatedResults.map(img => img.id);

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

    // Format results with user data and interaction status
    const imagesWithMetadata = paginatedResults.map(image => ({
      id: image.id,
      title: image.title,
      description: image.description,
      image_url: image.image_url,
      prompt: image.prompt,
      ai_model: image.ai_model,
      model_version: image.model_version,
      likes_count: image.likes_count || 0,
      favorites_count: image.favorites_count || 0,
      views_count: image.views_count || 0,
      tags: image.tags || [],
      width: image.width,
      height: image.height,
      created_at: image.created_at,
      similarity: image.similarity,
      user: userMap.get(image.user_id) || {
        id: image.user_id,
        username: 'Unknown',
        full_name: 'Unknown User',
        avatar_url: ''
      },
      isLiked: userLikes.has(image.id),
      isSaved: userFavorites.has(image.id),
      saves_count: image.favorites_count || 0
    }));

    return NextResponse.json({
      images: imagesWithMetadata,
      searchType: 'semantic',
      query,
      threshold,
      pagination: {
        page,
        limit,
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit),
        hasMore: filteredResults.length > page * limit
      }
    });

  } catch (error) {
    console.error('Semantic search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}