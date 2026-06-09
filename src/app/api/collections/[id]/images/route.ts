import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-auth';
import { collectionsApi } from '@/lib/database/collections';
import { usersApi } from '@/lib/database/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await collectionsApi.getCollection(id);
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.user_id !== userUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { image_id, position } = body;

    if (!image_id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Use the authenticated client directly to respect RLS policies
    const { data: collectionImage, error: insertError } = await supabase
      .from('collection_images')
      .insert({
        collection_id: id,
        image_id: image_id,
        position: position ?? 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding image to collection:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Image already exists in this collection' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, collectionImage });
  } catch (error: unknown) {
    console.error('Error adding image to collection:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Image already exists in this collection' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add image to collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedSupabaseClient();

    // Get the user's UUID from their Clerk ID
    const userUuid = await usersApi.getUserUuidFromClerkId(user.id);
    if (!userUuid) {
      console.error('User not found in database for Clerk ID:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await collectionsApi.getCollection(id);
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.user_id !== userUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('image_id');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Use the authenticated client directly to respect RLS policies
    const { error: deleteError } = await supabase
      .from('collection_images')
      .delete()
      .eq('collection_id', id)
      .eq('image_id', imageId);

    if (deleteError) {
      console.error('Error removing image from collection:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing image from collection:', error);
    return NextResponse.json(
      { error: 'Failed to remove image from collection' },
      { status: 500 }
    );
  }
}