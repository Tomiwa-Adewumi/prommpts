'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddToCollectionModal } from '@/components/collections/add-to-collection-modal';
import { CreditDisplay } from '@/components/ui/credit-display';
import { toast } from 'sonner';
import {
  X,
  Save,
  Loader2,
  ArrowLeft,
  Trash2,
  Wand2,
  ImageIcon,
  Download
} from 'lucide-react';

interface ImageGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  prompt: string;
  model?: string;
  aspectRatio?: string;
  onGenerateImage: () => Promise<void>;
  isGenerating: boolean;
  progress?: number;
  hideDetails?: boolean;
}

export function ImageGenerationPanel({
  isOpen,
  onClose,
  imageUrl,
  prompt,
  model = 'dall-e-3',
  aspectRatio = '1:1',
  onGenerateImage,
  isGenerating,
  progress = 0,
  hideDetails = false
}: ImageGenerationPanelProps) {
  const [imageRevealProgress, setImageRevealProgress] = useState(0);
  const [showImage, setShowImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [savedImageId, setSavedImageId] = useState<string | null>(null);

  // Form data for saving
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');

  // Removed automatic image generation to prevent double generation

  // Show image immediately when loaded
  useEffect(() => {
    if (imageUrl) {
      setShowImage(true);
      setImageRevealProgress(100);
    }
  }, [imageUrl]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSaveImage = async () => {
    if (!imageUrl || !title.trim()) {
      toast.error("Please provide a title for your image");
      return;
    }
    
    // For Edit tab images, require a custom prompt
    if (hideDetails && !customPrompt.trim()) {
      toast.error("Please provide a prompt description for your image");
      return;
    }

    setIsSaving(true);

    // Use custom prompt if provided (for Edit tab), otherwise use the original prompt
    const finalPrompt = hideDetails && customPrompt ? customPrompt : prompt;
    
    // Debug: Log what we're sending
    const payload = {
      imageUrl,
      title,
      description,
      prompt: finalPrompt,
      tags,
      isPublic,
      model,
      aspectRatio
    };

    try {
      // Save generated image via API
      const response = await fetch('/api/save-generated-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Save image error response:', error);
        throw new Error(error.error || 'Failed to save image');
      }

      const result = await response.json();
      setSavedImageId(result.image.id);

      toast.success("Your image has been saved successfully!");

      // Show collection modal after saving
      setShowSaveModal(false);
      setShowCollectionModal(true);

    } catch (error) {
      console.error('Save image error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // If it's a data URL, convert it directly
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Image downloaded successfully!');
      } else {
        // For external URLs, fetch and convert to blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Image downloaded successfully!');
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const handleDiscard = () => {
    // Reset all states
    setShowImage(false);
    setImageRevealProgress(0);
    setTitle('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setIsPublic(true);
    setSavedImageId(null);
    setCustomPrompt('');

    // Close panel
    onClose();
  };

  return (
    <>
      {/* Main Image Generation View - Full Page */}
      <div
        className={`absolute inset-0 flex flex-col transition-all duration-300 ease-in-out overflow-y-auto ${isOpen
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
          }`}
      >
        <div className="min-h-screen px-8 py-12 pb-24 md:pb-12">
          {/* Credit Display - Top Right */}
          <div className="absolute top-6 right-8 z-10">
            <CreditDisplay />
          </div>

          {/* Header with back button */}
          <div className="flex items-center mb-12 transform transition-all duration-500 ease-out max-w-6xl mx-auto">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="mr-4 h-10 w-10 rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-white">Generated Image</h1>
              <p className="text-gray-400 mt-1">Your AI-generated artwork is ready</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl transform transition-all duration-700 ease-out">
              {/* Image Display Container - Smaller and centered */}
              <div className="bg-gray-900 rounded-2xl border-2 border-gray-700 overflow-hidden mb-8">
                <div className="relative min-h-[400px] max-h-[600px] flex items-center justify-center bg-gray-950">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {/* Skeleton Loader */}
                      <div className="w-full h-full bg-gray-800 animate-pulse" />

                      {/* Progress Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
                        <div className="text-white text-xl font-medium mb-3">
                          Generating Your Image...
                        </div>
                        <div className="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-gray-400 text-sm mt-3">
                          {Math.round(progress)}% Complete
                        </div>
                      </div>
                    </div>
                  ) : imageUrl && showImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img
                        src={imageUrl}
                        alt="Generated"
                        className="max-w-full max-h-full object-contain"
                        style={{ maxHeight: '600px' }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">No image generated</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt Display Below Image - Only show if not from Edit tab */}
                {!hideDetails && (
                  <div className="p-6 border-t border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Prompt Used</h3>
                    <p className="text-white text-sm leading-relaxed">{prompt}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {imageUrl && !isGenerating && (
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    onClick={handleDiscard}
                    variant="outline"
                    className="rounded-full px-6 py-3 text-base font-medium border-gray-700 hover:border-gray-600 hover:bg-gray-900 bg-transparent text-white transition-all duration-200 hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Discard
                  </Button>

                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="rounded-full px-6 py-3 text-base font-medium border-gray-700 hover:border-gray-600 hover:bg-gray-900 bg-transparent text-white transition-all duration-200 hover:scale-105"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>

                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="rounded-full px-6 py-3 text-base font-medium bg-yellow-500 hover:bg-yellow-600 text-black transition-all duration-200 hover:scale-105"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}

              {/* Generate Another Link */}
              {imageUrl && !isGenerating && (
                <div className="flex items-center justify-center mt-6">
                  <Button
                    onClick={() => {
                      setShowImage(false);
                      setImageRevealProgress(0);
                      onGenerateImage();
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-300 transition-all duration-200 hover:scale-105"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Another Variation
                  </Button>
                </div>
              )}

              {/* Additional details section for scrolling - Only show if not from Edit tab */}
              {imageUrl && !isGenerating && !hideDetails && (
                <div className="mt-12 space-y-6">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Image Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Model:</span>
                        <span className="text-white ml-2">{model}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Aspect Ratio:</span>
                        <span className="text-white ml-2">{aspectRatio}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Generated:</span>
                        <span className="text-white ml-2">{new Date().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-gray-500 text-sm pb-24 md:pb-12">
                    <p>Scroll up to view your generated image</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Save Image</h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your image"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Prompt field for Edit tab images */}
              {hideDetails && (
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Prompt Description *
                  </label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what this image represents..."
                    className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Add a prompt to help others understand how to recreate this image
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about your image (optional)"
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tags..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    onClick={handleAddTag}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Make Public
                </label>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-yellow-500' : 'bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 hover:border-gray-500"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveImage}
                disabled={!title.trim() || (hideDetails && !customPrompt.trim()) || isSaving}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {savedImageId && (
        <AddToCollectionModal
          isOpen={showCollectionModal}
          onClose={() => {
            setShowCollectionModal(false);
            handleDiscard();
          }}
          imageId={savedImageId}
          imageTitle={title}
        />
      )}
    </>
  );
}