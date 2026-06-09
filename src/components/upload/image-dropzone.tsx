'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { ImageProcessor, ProcessedImageResult } from '@/lib/images/processing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImageDropzoneProps {
  onImageProcessed: (result: ProcessedImageResult) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function ImageDropzone({
  onImageProcessed,
  maxFiles = 1,
  disabled = false
}: ImageDropzoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImageResult[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    setError(null);
    setIsProcessing(true);

    try {
      for (const file of acceptedFiles.slice(0, maxFiles - processedImages.length)) {
        // Validate file
        const validation = ImageProcessor.validateImageFile(file);
        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          continue;
        }

        // Process image
        const result = await ImageProcessor.processImage(file);
        setProcessedImages(prev => [...prev, result]);
        onImageProcessed(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [onImageProcessed, maxFiles, processedImages.length, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: maxFiles - processedImages.length,
    disabled: disabled || isProcessing,
    multiple: maxFiles > 1
  });

  const removeImage = (index: number) => {
    setProcessedImages(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const canAddMore = processedImages.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {canAddMore && (
        <Card className="p-8 bg-zinc-900/50 border-white/10">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-white bg-black/40' : 'border-gray-600'}
              ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-white hover:bg-black/40'}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <Upload className="h-12 w-12 text-gray-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  {isDragActive
                    ? 'Drop your images here'
                    : 'Drag & drop images here, or click to select'
                  }
                </p>
                <p className="text-sm text-gray-400">
                  Supports JPEG, PNG, and WebP files up to 10MB
                </p>
                {maxFiles > 1 && (
                  <p className="text-xs text-gray-400">
                    {processedImages.length} of {maxFiles} files selected
                  </p>
                )}
              </div>
              {isProcessing && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing image...</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500/30">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Preview of processed images */}
      {processedImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Selected Images</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processedImages.map((image, index) => (
              <Card key={index} className="p-4 bg-zinc-900/50 border-white/10">
                <div className="relative">
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <p>{image.metadata.width} × {image.metadata.height}</p>
                  <p>{(image.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="uppercase">{image.metadata.format}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}