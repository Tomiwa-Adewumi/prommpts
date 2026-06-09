'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  ImageUploadSchema,
  ImageUploadData,
  SUGGESTED_TAGS
} from '@/lib/validation/upload-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetadataFormProps {
  onSubmit: (data: ImageUploadData) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MetadataForm({ onSubmit, isLoading = false, disabled = false }: MetadataFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(ImageUploadSchema),
    defaultValues: {
      prompt: '',
      aiModel: '',
      isPublic: true,
      tags: []
    }
  });

  const watchedModel = watch('aiModel');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 20) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const onFormSubmit = (data: ImageUploadData) => {
    onSubmit({ ...data, tags });
  };

  return (
    <Card className="bg-zinc-900/50 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Image Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-white">Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="The prompt used to generate this image"
              rows={4}
              disabled={disabled || isLoading}
              className="bg-black/20 border-white/10 text-white placeholder-zinc-500 focus:border-white/20 focus:ring-0"
              {...register('prompt')}
            />
            {errors.prompt && (
              <p className="text-sm text-red-400">{errors.prompt.message}</p>
            )}
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt" className="text-white">Negative Prompt</Label>
            <Textarea
              id="negativePrompt"
              placeholder="Negative prompt used (optional)"
              rows={2}
              disabled={disabled || isLoading}
              className="bg-black/20 border-white/10 text-white placeholder-zinc-500 focus:border-white/20 focus:ring-0"
              {...register('negativePrompt')}
            />
            {errors.negativePrompt && (
              <p className="text-sm text-red-400">{errors.negativePrompt.message}</p>
            )}
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <Label htmlFor="aiModel" className="text-white">AI Model *</Label>
            <Input
              id="aiModel"
              placeholder="Enter the AI model used (e.g., Stable Diffusion, DALL-E 3, Midjourney)"
              disabled={disabled || isLoading}
              className="bg-black/20 border-white/10 text-white placeholder-zinc-500 focus:border-white/20 focus:ring-0"
              {...register('aiModel')}
            />
            {errors.aiModel && (
              <p className="text-sm text-red-400">{errors.aiModel.message}</p>
            )}
          </div>


          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-white">Tags</Label>
            <div className="space-y-3">
              <Input
                placeholder="Add tags separated by commas or press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                disabled={disabled || isLoading || tags.length >= 20}
                className="bg-black/20 border-white/10 text-white placeholder-zinc-500 focus:border-white/20 focus:ring-0"
              />

              {/* Current tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-white rounded-md text-sm"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-white/20"
                        onClick={() => removeTag(tag)}
                        disabled={disabled || isLoading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested tags */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).slice(0, 10).map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs border-white/10 bg-black/20 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                      onClick={() => addTag(tag)}
                      disabled={disabled || isLoading || tags.length >= 20}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {errors.tags && (
              <p className="text-sm text-red-400">{errors.tags.message}</p>
            )}
          </div>

          {/* Visibility */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              className="rounded border-white/10 bg-black/20 text-yellow-500 focus:ring-offset-0 focus:ring-yellow-500/50"
              disabled={disabled || isLoading}
              {...register('isPublic')}
            />
            <Label htmlFor="isPublic" className="text-sm text-white">
              Make this image public (visible to all users)
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={disabled || isLoading}
            className="w-full bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black font-bold h-11 rounded-xl transition-all shadow-[0_4px_0_0_#8a8000] hover:shadow-[0_4px_0_0_#7a7000] active:shadow-[0_2px_0_0_#8a8000] active:translate-y-[2px] border-0"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                <span>Uploading...</span>
              </div>
            ) : (
              'Upload Image'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}