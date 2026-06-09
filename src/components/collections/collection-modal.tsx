'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Folder, Plus, X, Loader2 } from 'lucide-react';

interface Collection {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  images_count: number;
  created_at: string;
  updated_at: string;
}

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCollectionCreated?: (collection: Collection) => void;
  onCollectionUpdated?: (collection: Collection) => void;
  collection?: Collection | null;
  mode?: 'create' | 'edit';
}

export function CollectionModal({
  isOpen,
  onClose,
  onCollectionCreated,
  onCollectionUpdated,
  collection,
  mode = 'create'
}: CollectionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && collection) {
      setTitle(collection.title);
      setDescription(collection.description || '');
      setIsPublic(collection.is_public);
    } else {
      setTitle('');
      setDescription('');
      setIsPublic(true);
    }
    setError(null);
  }, [collection, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Collection title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'create'
        ? '/api/collections'
        : `/api/collections/${collection?.id}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          is_public: isPublic,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} collection`);
      }

      const data = await response.json();

      if (mode === 'create' && onCollectionCreated) {
        onCollectionCreated(data.collection);
      } else if (mode === 'edit' && onCollectionUpdated) {
        onCollectionUpdated(data.collection);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} collection`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-yellow-500" />
          <span className="text-white font-medium">{mode === 'create' ? 'Create New Collection' : 'Edit Collection'}</span>
        </div>
      }
    >
      <div
        className="max-h-[80vh] overflow-y-auto pr-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: #1F2937;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb {
            background: #4B5563;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #6B7280;
          }
        `}</style>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-200 font-medium">
              Collection Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter collection title"
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400/20"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your collection (optional)"
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400/20 min-h-[100px] resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div className="space-y-1">
              <Label htmlFor="public" className="text-gray-200 font-medium text-sm">
                Public Collection
              </Label>
              <p className="text-xs text-gray-400">
                {isPublic ? 'Anyone can view this collection' : 'Only you can view this collection'}
              </p>
            </div>
            <div className="relative">
              {/* Custom Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => !loading && setIsPublic(!isPublic)}
                disabled={loading}
                className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                ${isPublic
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 hover:bg-gray-500'
                  }
              `}
              >
                <span
                  className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-lg
                  ${isPublic ? 'translate-x-6' : 'translate-x-1'}
                `}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Collection
                    </>
                  ) : (
                    'Update Collection'
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}