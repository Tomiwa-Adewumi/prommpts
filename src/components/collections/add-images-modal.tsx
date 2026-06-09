'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  ImageIcon, 
  Loader2, 
  Check,
  X,
  Search
} from 'lucide-react';

interface UserImage {
  id: string;
  title: string;
  image_url: string;
  prompt: string;
  ai_model: string;
  created_at: string;
}

interface AddImagesToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionTitle: string;
  existingImageIds: string[];
  onImagesAdded: (imageIds: string[]) => void;
}

export function AddImagesToCollectionModal({
  isOpen,
  onClose,
  collectionId,
  collectionTitle,
  existingImageIds,
  onImagesAdded
}: AddImagesToCollectionModalProps) {
  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [addingImages, setAddingImages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUserImages();
      setSelectedImageIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchUserImages = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/images?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      // Filter out images that are already in the collection
      const availableImages = (data.images || []).filter(
        (img: UserImage) => !existingImageIds.includes(img.id)
      );
      setUserImages(availableImages);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleAddImages = async () => {
    if (selectedImageIds.size === 0) return;

    setAddingImages(true);

    try {
      // Add each selected image to the collection
      const promises = Array.from(selectedImageIds).map(async (imageId, index) => {
        const response = await fetch(`/api/collections/${collectionId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_id: imageId,
            position: index
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          // Skip if image already exists in collection
          if (response.status !== 409) {
            throw new Error(error.error || 'Failed to add image');
          }
        }
      });

      await Promise.all(promises);
      
      // Notify parent component
      onImagesAdded(Array.from(selectedImageIds));
      onClose();
    } catch (error) {
      console.error('Error adding images to collection:', error);
      setError(error instanceof Error ? error.message : 'Failed to add images');
    } finally {
      setAddingImages(false);
    }
  };

  const filteredImages = userImages.filter(image =>
    image.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.ai_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Images to "${collectionTitle}"`}
      className="max-w-4xl"
    >
      <div className="flex flex-col h-[600px]">
        {/* Search Bar */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search your images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Images Grid */}
        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <Button 
                onClick={fetchUserImages} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery 
                  ? 'No images found matching your search'
                  : existingImageIds.length > 0
                    ? 'All your images are already in this collection'
                    : 'No images available to add'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pb-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer"
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-800">
                    <img
                      src={image.image_url}
                      alt={image.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Selection Overlay */}
                  <div 
                    className={`absolute inset-0 rounded-lg transition-all ${
                      selectedImageIds.has(image.id)
                        ? 'bg-blue-500/30 border-2 border-blue-500'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      <div 
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedImageIds.has(image.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-gray-800/80 border-gray-400'
                        }`}
                      >
                        {selectedImageIds.has(image.id) && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image Info on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium line-clamp-1">
                      {image.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {selectedImageIds.size > 0 
                ? `${selectedImageIds.size} image${selectedImageIds.size !== 1 ? 's' : ''} selected`
                : 'Select images to add'
              }
            </p>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={addingImages}
                className="text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddImages}
                disabled={selectedImageIds.size === 0 || addingImages}
                className="bg-white text-black hover:bg-gray-200"
              >
                {addingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${selectedImageIds.size > 0 ? selectedImageIds.size : ''} Image${selectedImageIds.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}