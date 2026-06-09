import { supabase, supabaseAdmin } from './supabase';
import type { Database } from './supabase';

type User = Database['public']['Tables']['users']['Row'];
type Image = Database['public']['Tables']['images']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

// User queries
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function createUser(userData: Database['public']['Tables']['users']['Insert']): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function updateUser(
  clerkId: string,
  updates: Database['public']['Tables']['users']['Update']
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('clerk_id', clerkId)
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

// Image queries
export async function getPublicImages(
  page: number = 1,
  limit: number = 20,
  sortBy: 'recent' | 'popular' | 'trending' = 'recent'
) {
  let query = supabase
    .from('images')
    .select(`
      *,
      user:users(id, username, full_name, avatar_url)
    `)
    .eq('is_public', true)
    .eq('is_hidden', false);

  // Apply sorting
  switch (sortBy) {
    case 'popular':
      query = query.order('likes_count', { ascending: false });
      break;
    case 'trending':
      query = query.order('engagement_score', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { images: [], total: 0 };
  }

  return { images: data || [], total: count || 0 };
}

export async function getUserImages(userId: string, page: number = 1, limit: number = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { images: [], total: 0 };
  }

  return { images: data || [], total: count || 0 };
}

export async function createImage(imageData: Database['public']['Tables']['images']['Insert']) {
  const { data, error } = await supabase
    .from('images')
    .insert(imageData)
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

// Engagement queries
export async function toggleLike(userId: string, imageId: string): Promise<boolean> {
  // Check if like exists
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('image_id', imageId)
    .single();

  if (existingLike) {
    // Remove like
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('image_id', imageId);

    if (error) {
      return false;
    }
    return false; // Unliked
  } else {
    // Add like
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, image_id: imageId });

    if (error) {
      return false;
    }
    return true; // Liked
  }
}

export async function toggleFavorite(userId: string, imageId: string): Promise<boolean> {
  // Check if favorite exists
  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('image_id', imageId)
    .single();

  if (existingFavorite) {
    // Remove favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('image_id', imageId);

    if (error) {
      return false;
    }
    return false; // Unfavorited
  } else {
    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, image_id: imageId });

    if (error) {
      return false;
    }
    return true; // Favorited
  }
}

// Course queries
export async function getAvailableCourses(page: number = 1, limit: number = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('courses')
    .select(`
      *,
      admin:users(id, username, full_name, avatar_url)
    `)
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { courses: [], total: 0 };
  }

  return { courses: data || [], total: count || 0 };
}

export async function createCourse(courseData: Database['public']['Tables']['courses']['Insert']) {
  const { data, error } = await supabase
    .from('courses')
    .insert(courseData)
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

// Error Logs Queries
export async function createErrorLog(errorData: {
  name: string;
  error_description: string;
  device_type: string;
  page_url: string;
  screen_width: number;
  screen_height: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('error_logs')
    .insert(errorData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}