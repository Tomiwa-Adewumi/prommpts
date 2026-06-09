import { supabase, supabaseAdmin, Database } from './supabase';

export type Collection = Database['public']['Tables']['collections']['Row'];
export type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
export type CollectionUpdate = Database['public']['Tables']['collections']['Update'];
export type CollectionMedia = Database['public']['Tables']['collection_media']['Row'];
export type CollectionFavorite = Database['public']['Tables']['collection_favorites']['Row'];
export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export const collectionsApi = {
  async createCollection(data: CollectionInsert) {
    const { data: collection, error } = await supabase
      .from('collections')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return collection;
  },

  async getCollection(id: string) {
    const { data: collection, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url),
        media:collection_media(
          id,
          position,
          added_at,
          media_type,
          image:images(
            *,
            user:users(id, username, avatar_url)
          ),
          video:videos(
            *,
            user:users(id, username, avatar_url)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return collection;
  },

  async getUserCollections(userId: string) {
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return collections;
  },

  async getPublicCollections(limit = 20, offset = 0) {
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return collections;
  },

  async getFeaturedCollections() {
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .eq('is_featured', true)
      .eq('is_public', true)
      .order('favorites_count', { ascending: false })
      .limit(10);

    if (error) throw error;
    return collections;
  },

  async updateCollection(id: string, data: CollectionUpdate) {
    const { data: collection, error } = await supabase
      .from('collections')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return collection;
  },

  async deleteCollection(id: string) {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addImageToCollection(collectionId: string, imageId: string, position?: number) {
    const { data, error } = await supabase
      .from('collection_media')
      .insert({
        collection_id: collectionId,
        image_id: imageId,
        video_id: null,
        media_type: 'image',
        position: position ?? 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addVideoToCollection(collectionId: string, videoId: string, position?: number) {
    const { data, error } = await supabase
      .from('collection_media')
      .insert({
        collection_id: collectionId,
        image_id: null,
        video_id: videoId,
        media_type: 'video',
        position: position ?? 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeMediaFromCollection(collectionId: string, mediaId: string) {
    const { error } = await supabase
      .from('collection_media')
      .delete()
      .eq('collection_id', collectionId)
      .eq('id', mediaId);

    if (error) throw error;
  },

  async removeImageFromCollection(collectionId: string, imageId: string) {
    const { error } = await supabase
      .from('collection_media')
      .delete()
      .eq('collection_id', collectionId)
      .eq('image_id', imageId);

    if (error) throw error;
  },

  async removeVideoFromCollection(collectionId: string, videoId: string) {
    const { error } = await supabase
      .from('collection_media')
      .delete()
      .eq('collection_id', collectionId)
      .eq('video_id', videoId);

    if (error) throw error;
  },

  async reorderMediaInCollection(collectionId: string, mediaPositions: { mediaId: string; position: number }[]) {
    const updates = mediaPositions.map(({ mediaId, position }) =>
      supabase
        .from('collection_media')
        .update({ position })
        .eq('collection_id', collectionId)
        .eq('id', mediaId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to reorder media: ${errors[0].error?.message}`);
    }
  },

  async favoriteCollection(collectionId: string, userId: string) {
    const { data, error } = await supabase
      .from('collection_favorites')
      .insert({
        collection_id: collectionId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async unfavoriteCollection(collectionId: string, userId: string) {
    const { error } = await supabase
      .from('collection_favorites')
      .delete()
      .eq('collection_id', collectionId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async isCollectionFavorited(collectionId: string, userId: string) {
    const { data, error } = await supabase
      .from('collection_favorites')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async searchCollections(query: string, filters?: {
    userId?: string;
    isPublic?: boolean;
    tags?: string[];
  }) {
    let queryBuilder = supabase
      .from('collections')
      .select(`
        *,
        user:users(id, username, avatar_url)
      `);

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (filters?.userId) {
      queryBuilder = queryBuilder.eq('user_id', filters.userId);
    }

    if (filters?.isPublic !== undefined) {
      queryBuilder = queryBuilder.eq('is_public', filters.isPublic);
    }

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder = queryBuilder.contains('tags', filters.tags);
    }

    const { data: collections, error } = await queryBuilder
      .order('created_at', { ascending: false });

    if (error) throw error;
    return collections;
  },

  async incrementViewCount(collectionId: string) {
    const { error } = await supabase.rpc('increment_collection_views', {
      collection_id: collectionId
    });

    if (error) throw error;
  }
};

export const adminCollectionsApi = {
  async setFeaturedCollection(collectionId: string, isFeatured: boolean) {
    const { data, error } = await supabaseAdmin
      .from('collections')
      .update({ is_featured: isFeatured })
      .eq('id', collectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCollectionStats() {
    const { data, error } = await supabaseAdmin
      .from('collections')
      .select('id, is_public, is_featured, favorites_count, views_count, media_count');

    if (error) throw error;

    const stats = {
      total: data.length,
      public: data.filter(c => c.is_public).length,
      private: data.filter(c => !c.is_public).length,
      featured: data.filter(c => c.is_featured).length,
      totalFavorites: data.reduce((sum, c) => sum + c.favorites_count, 0),
      totalViews: data.reduce((sum, c) => sum + c.views_count, 0),
      averageMediaPerCollection: data.length > 0
        ? data.reduce((sum, c) => sum + c.media_count, 0) / data.length
        : 0
    };

    return stats;
  }
};
