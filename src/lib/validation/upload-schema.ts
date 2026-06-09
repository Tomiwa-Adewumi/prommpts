import { z } from 'zod';

export const ImageUploadSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  prompt: z.string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(5000, 'Prompt must be less than 5000 characters'),
  negativePrompt: z.string()
    .max(2000, 'Negative prompt must be less than 2000 characters')
    .optional(),
  aiModel: z.string()
    .min(1, 'AI model is required')
    .max(100, 'AI model name must be less than 100 characters'),
  tags: z.array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  isPublic: z.boolean().optional().default(true)
});

export type ImageUploadData = z.infer<typeof ImageUploadSchema>;

// Available AI models for filtering
export const AI_MODELS = [
  'DALL·E 3',
  'DALL·E 2', 
  'Stable Diffusion',
  'Midjourney',
  'Flux',
  'SDXL',
  'Leonardo AI',
  'Other'
];

// Common tags for suggestions
export const SUGGESTED_TAGS = [
  'PrommmtGiveaway',
  'portrait',
  'landscape',
  'abstract',
  'realistic',
  'stylized',
  'colorful',
  'monochrome',
  'detailed',
  'minimalist',
  'fantasy',
  'sci-fi',
  'nature',
  'urban',
  'character',
  'environment',
  'digital-art',
  'concept-art',
  'illustration'
];