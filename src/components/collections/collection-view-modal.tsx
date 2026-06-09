'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Folder,
  Image as ImageIcon,
  Globe,
  Lock,
  Calendar,
  Loader2,
  X,
  Grid,
  List
} from 'lucide-react';

interface CollectionImage {
  id: string;
  position: number;
  added_at: string;
  image: {
    id: string;
    title: string;
    image_url: string;
    prompt: string;
    ai_model: string;
  };
}

interface CollectionDetails {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  images_count: number;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  images: CollectionImage[];
}

interface CollectionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  onRemoveImage?: (imageId: string) => void;
}

export function CollectionViewModal({
  isOpen,
  onClose,
  collectionId,
  onRemoveImage
}: CollectionViewModalProps) {
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingImage, setRemovingImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  const fetchCollectionDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${collectionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection details');
      }

      const data = await response.json();
      setCollection(data.collection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!collection || removingImage) return;

    setRemovingImage(imageId);

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/images?image_id=${imageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove image from collection');
      }

      setCollection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          images: prev.images.filter(img => img.image.id !== imageId),
          images_count: prev.images_count - 1
        };
      });

      if (onRemoveImage) {
        onRemoveImage(imageId);
      }
    } catch (err) {
      alert('Failed to remove image from collection');
    } finally {
      setRemovingImage(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-yellow-500" />
          <span>{collection?.title || 'Collection'}</span>
        </div>
      }
      className="max-w-4xl"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      ) : collection ? (
        <div className="space-y-6">
          {/* Collection Info */}
          <div className="space-y-4">
            {collection.description && (
              <p className="text-gray-400">{collection.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                <ImageIcon className="h-3 w-3 mr-1" />
                {collection.images_count} {collection.images_count === 1 ? 'image' : 'images'}
              </Badge>

              <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                {collection.is_public ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>

              <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                <Calendar className="h-3 w-3 mr-1" />
                Created {new Date(collection.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Images</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid'
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list'
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Images Display */}
          {collection.images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No images in this collection yet</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto">
              {collection.images
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square relative bg-gray-800 rounded-lg overflow-hidden">
                      <Image
                        src={item.image.image_url}
                        alt={item.image.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveImage(item.image.id)}
                          disabled={removingImage === item.image.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {removingImage === item.image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {item.image.title}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {collection.images
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-900 rounded-lg group">
                    <div className="w-16 h-16 relative bg-gray-800 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image.image_url}
                        alt={item.image.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.image.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.image.prompt}</p>
                      <p className="text-xs text-gray-500">Added {new Date(item.added_at).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(item.image.id)}
                      disabled={removingImage === item.image.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      {removingImage === item.image.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}