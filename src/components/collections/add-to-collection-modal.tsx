'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Folder,
  Plus,
  Search,
  Loader2,
  Check,
  FolderPlus
} from 'lucide-react';

interface Collection {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  images_count: number;
  created_at: string;
  updated_at: string;
}

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  imageTitle?: string;
}

export function AddToCollectionModal({
  isOpen,
  onClose,
  imageId,
  imageTitle
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [existingCollections, setExistingCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen, imageId]);

  const fetchCollections = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      setCollections(data.collections || []);

      // Check which collections already contain this image
      const existing = new Set<string>();
      for (const collection of data.collections) {
        const collectionResponse = await fetch(`/api/collections/${collection.id}`);
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json();
          interface CollectionImage {
            image: {
              id: string;
            };
          }
          
          const hasImage = collectionData.collection.images?.some(
            (img: CollectionImage) => img.image.id === imageId
          );
          if (hasImage) {
            existing.add(collection.id);
          }
        }
      }
      setExistingCollections(existing);
      setSelectedCollections(new Set(existing));
    } catch (err) {
      setError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newCollectionTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create collection');
      }

      const data = await response.json();
      setCollections(prev => [data.collection, ...prev]);
      setSelectedCollections(prev => new Set([...prev, data.collection.id]));
      setNewCollectionTitle('');
      setShowCreateNew(false);
    } catch (err) {
      alert('Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Add to new collections
      const toAdd = Array.from(selectedCollections).filter(
        id => !existingCollections.has(id)
      );

      // Remove from collections
      const toRemove = Array.from(existingCollections).filter(
        id => !selectedCollections.has(id)
      );

      const promises = [];

      for (const collectionId of toAdd) {
        promises.push(
          fetch(`/api/collections/${collectionId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image_id: imageId }),
          })
        );
      }

      for (const collectionId of toRemove) {
        promises.push(
          fetch(`/api/collections/${collectionId}/images?image_id=${imageId}`, {
            method: 'DELETE',
          })
        );
      }

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        throw new Error('Some operations failed');
      }

      onClose();
    } catch (err) {
      setError('Failed to update collections');
    } finally {
      setSaving(false);
    }
  };

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  const filteredCollections = collections.filter(collection =>
    collection.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-yellow-500" />
          <span>Add to Collections</span>
        </div>
      }
    >
      <div className="space-y-4">
        {imageTitle && (
          <p className="text-sm text-gray-400">
            Adding "{imageTitle}" to collections
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Create New Collection */}
        {!showCreateNew ? (
          <Button
            variant="outline"
            onClick={() => setShowCreateNew(true)}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Collection
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Collection name..."
              value={newCollectionTitle}
              onChange={(e) => setNewCollectionTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
              className="flex-1 bg-gray-800 border-gray-700 text-white"
              autoFocus
            />
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionTitle.trim() || saving}
              className="bg-white text-black hover:bg-gray-200"
            >
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateNew(false);
                setNewCollectionTitle('');
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Collections List */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchQuery ? 'No collections found' : 'No collections yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredCollections.map((collection) => {
              const isSelected = selectedCollections.has(collection.id);
              const isExisting = existingCollections.has(collection.id);

              return (
                <div
                  key={collection.id}
                  className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-800 cursor-pointer"
                  onClick={() => toggleCollection(collection.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleCollection(collection.id)}
                    className="border-gray-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{collection.title}</p>
                      {isExisting && !isSelected && (
                        <span className="text-xs text-yellow-500">(will be removed)</span>
                      )}
                      {!isExisting && isSelected && (
                        <span className="text-xs text-green-500">(will be added)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {collection.images_count} {collection.images_count === 1 ? 'image' : 'images'}
                      {collection.is_public ? ' • Public' : ' • Private'}
                    </p>
                  </div>
                  {isExisting && isSelected && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-white text-black hover:bg-gray-200"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}