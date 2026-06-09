// Type definitions
export type UserTier = 'free' | 'starter' | 'creator' | 'pro';

export interface ImageModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: UserTier;
  credits: number;
  description: string;

  // Input capabilities (frontend display)
  supportsImageInput: boolean;
  requiresImageInput?: boolean; // true = image upload is mandatory
  maxImages: number;

  // Output options (frontend display)
  aspectRatios: string[];
  qualities?: string[];

  // API routing
  variants: {
    t2i?: string;
    i2i?: string;
  };
  endpoints: {
    t2i?: string;
    i2i?: string;
  };
}

export interface VideoModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: UserTier;
  credits: number;
  description: string;

  // Input capabilities (frontend display)
  supportsImageInput: boolean;
  requiresImageInput?: boolean; // true = image upload is mandatory
  supportsVideoInput?: boolean; // For video-to-video models that require a reference video
  requiresVideoInput?: boolean; // true = video upload is mandatory
  maxVideos: number;

  // Output options (frontend display)
  durations: number[]; // in seconds
  resolutions: string[];
  aspectRatios?: string[]; // e.g., ['16:9', '9:16']
  qualities?: string[];

  // API routing
  variants: {
    t2v?: string;
    i2v?: string;
    r2v?: string;
    v2v?: string;
  };
  endpoints: {
    t2v?: string;
    i2v?: string;
    r2v?: string;
    v2v?: string;
  };
}

export const TIER_LEVELS: Record<UserTier, number> = {
  'free': 0,
  'starter': 1,
  'creator': 2,
  'pro': 3,
};

export function isModelLocked(userTier: UserTier | null | undefined, modelTier: UserTier): boolean {
  const currentTierLevel = TIER_LEVELS[userTier || 'free'] || 0;
  const modelTierLevel = TIER_LEVELS[modelTier] || 0;
  return currentTierLevel < modelTierLevel;
}

// ============================================================================
// IMAGE MODELS
// ============================================================================

export const imageModels: ImageModelConfig[] = [
  // Free Tier
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    provider: 'Google',
    tier: 'free',
    credits: 5,
    description: 'Google\'s Gemini 2.5 Flash text-to-image and image-to-image generation model',
    supportsImageInput: true,
    requiresImageInput: false,
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21', '3:2', '2:3', '5:4', '4:5'],
    qualities: ['1K', '2K'],
    variants: {
      t2i: 'google/gemini-2.5-flash-image',
      i2i: 'google/gemini-2.5-flash-image-edit',
    },
    endpoints: {
      t2i: '/v1/images/generations',
      i2i: '/v1/images/generations',
    },
  },
  {
    id: 'kling-image-o1',
    name: 'Kling Image O1',
    provider: 'Kling AI',
    tier: 'free',
    credits: 5,
    description: 'Multimodal image generation with up to 10 reference images for visual consistency',
    supportsImageInput: true,
    requiresImageInput: true,
    maxImages: 9,
    aspectRatios: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16'],
    qualities: ['1K', '2K'],
    variants: {
      i2i: 'klingai/image-o1',
    },
    endpoints: {
      i2i: '/v1/images/generations',
    },
  },

  // Starter Tier
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'Google',
    tier: 'starter',
    credits: 5,
    description: 'Google\'s Gemini 3 Pro advanced image generation model with text-to-image and image-to-image',
    supportsImageInput: true,
    requiresImageInput: false,
    maxImages: 4,
    aspectRatios: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '5:4', '4:5'],
    qualities: ['1K', '2K', '4K'],
    variants: {
      t2i: 'google/gemini-3-pro-image-preview',
      i2i: 'google/gemini-3-pro-image-preview-edit',
    },
    endpoints: {
      t2i: '/v1/images/generations',
      i2i: '/v1/images/generations',
    },
  },

  // Pro Tier
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    provider: 'OpenAI',
    tier: 'pro',
    credits: 10,
    description: 'OpenAI\'s advanced image generation model with superior quality',
    supportsImageInput: false,
    requiresImageInput: false,
    maxImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16'],
    variants: {
      t2i: 'openai/gpt-image-1-5',
    },
    endpoints: {
      t2i: '/v1/images/generations',
    },
  },
  {
    id: 'seedream-4.5',
    name: 'Seed Dream 4.5',
    provider: 'ByteDance',
    tier: 'pro',
    credits: 10,
    description: 'ByteDance model combining text-to-image and image-to-image with improved consistency',
    supportsImageInput: true,
    requiresImageInput: false,
    maxImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    qualities: ['2K', '4K'],
    variants: {
      t2i: 'bytedance/seedream-4-5',
      i2i: 'bytedance/seedream-4-5',
    },
    endpoints: {
      t2i: '/v1/images/generations',
      i2i: '/v1/images/generations',
    },
  },
  {
    id: 'flux-2-max',
    name: 'Flux 2 Max',
    provider: 'Flux',
    tier: 'pro',
    credits: 10,
    description: 'Flux Pro - highest quality image generation, outperforming Midjourney v6.0 and DALL-E 3',
    supportsImageInput: false,
    requiresImageInput: false,
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21', '3:2', '2:3', '5:4', '4:5'],
    qualities: ['1K', '2K', '4K'],
    variants: {
      t2i: 'blackforestlabs/flux-2',
    },
    endpoints: {
      t2i: '/v1/images/generations',
    },
  },
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'Flux',
    tier: 'pro',
    credits: 10,
    description: 'Flux Pro model for high-quality image generation with balanced speed and quality',
    supportsImageInput: false,
    requiresImageInput: false,
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21', '3:2', '2:3', '5:4', '4:5'],
    qualities: ['1K', '2K'],
    variants: {
      t2i: 'blackforestlabs/flux-2-pro',
    },
    endpoints: {
      t2i: '/v1/images/generations',
    },
  },
  {
    id: 'flux-2-max-edit',
    name: 'Flux 2 Max Edit',
    provider: 'Flux',
    tier: 'pro',
    credits: 10,
    description: 'Flux image-to-image editing model for precise visual modifications',
    supportsImageInput: true,
    requiresImageInput: true,
    maxImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21', '3:2', '2:3', '5:4', '4:5'],
    qualities: ['1K', '2K', '4K'],
    variants: {
      i2i: 'blackforestlabs/flux-2-edit',
    },
    endpoints: {
      i2i: '/v1/images/generations',
    },
  },
];

// ============================================================================
// VIDEO MODELS
// ============================================================================

export const videoModels: VideoModelConfig[] = [
  // Free Tier
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    provider: 'Kling AI',
    tier: 'free',
    credits: 30,
    description: 'Kling AI text-to-video and image-to-video generation with up to 1080p quality',
    supportsImageInput: true,
    maxVideos: 1,
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    variants: {
      t2v: 'kling-video/v1/standard/text-to-video',
      i2v: 'kling-video/v1/standard/image-to-video',
    },
    endpoints: {
      t2v: '/v2/video/generations',
      i2v: '/v2/video/generations',
    },
  },

  // Starter Tier
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    provider: 'Google',
    tier: 'starter',
    credits: 30,
    description: 'Google Veo 3.1 Fast - optimized for speed with good quality',
    supportsImageInput: true,
    maxVideos: 1,
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    qualities: ['standard', 'high'],
    variants: {
      t2v: 'google/veo-3.1-t2v-fast',
      i2v: 'google/veo-3.1-i2v-fast',
    },
    endpoints: {
      t2v: '/v2/video/generations',
      i2v: '/v2/video/generations',
    },
  },

  // Pro Tier
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    provider: 'Google',
    tier: 'pro',
    credits: 50,
    description: 'Google Veo 3.1 - generates realistic 4-8 second 720p and 1080p videos with detailed visuals and audio',
    supportsImageInput: true,
    maxVideos: 1,
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    qualities: ['standard', 'high'],
    variants: {
      t2v: 'google/veo-3.1-t2v',
      i2v: 'google/veo-3.1-i2v',
    },
    endpoints: {
      t2v: '/v2/video/generations',
      i2v: '/v2/video/generations',
    },
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    provider: 'OpenAI',
    tier: 'pro',
    credits: 50,
    description: 'OpenAI Sora 2 - powerful media generation model with synced audio',
    supportsImageInput: true,
    maxVideos: 1,
    durations: [4, 8, 12],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p'],
    variants: {
      t2v: 'openai/sora-2-t2v',
      i2v: 'openai/sora-2-i2v',
    },
    endpoints: {
      t2v: '/v2/video/generations',
      i2v: '/v2/video/generations',
    },
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'OpenAI',
    tier: 'pro',
    credits: 60,
    description: 'OpenAI Sora 2 Pro - advanced version with enhanced quality and features',
    supportsImageInput: true,
    maxVideos: 1,
    durations: [4, 8, 12],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    variants: {
      t2v: 'openai/sora-2-pro-t2v',
      i2v: 'openai/sora-2-pro-i2v',
    },
    endpoints: {
      t2v: '/v2/video/generations',
      i2v: '/v2/video/generations',
    },
  },
  {
    id: 'kling-o1-v2v',
    name: 'Kling O1 Reference',
    provider: 'Kling AI',
    tier: 'pro',
    credits: 50,
    description: 'Kling AI O1 - motion transfer model that applies character appearance to reference video motion. Requires both character image(s) and source video.',
    supportsImageInput: true,
    requiresImageInput: true,
    supportsVideoInput: true,
    requiresVideoInput: true,
    maxVideos: 1,
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    variants: {
      v2v: 'klingai/video-o1-video-to-video-reference',
    },
    endpoints: {
      v2v: '/v2/video/generations',
    },
  },
];

// ============================================================================
// PROVIDER ICONS
// ============================================================================

export const PROVIDER_ICONS: Record<string, string> = {
  'Google': '/models/google.svg',
  'OpenAI': '/models/openai.svg',
  'Flux': '/models/flux.svg',
  'Stability AI': '/models/stability.svg',
  'ByteDance': '/models/bytedance.svg',
  'Kling AI': '/models/kling.svg',
  'Alibaba': '/models/bytedance.svg',
};

// ============================================================================
// BACKWARD COMPATIBILITY - Object versions of models
// ============================================================================

// Convert arrays to objects for backward compatibility
export const IMAGE_MODELS: Record<string, ImageModelConfig> = imageModels.reduce((acc, model) => {
  acc[model.id] = model;
  return acc;
}, {} as Record<string, ImageModelConfig>);

export const VIDEO_MODELS: Record<string, VideoModelConfig> = videoModels.reduce((acc, model) => {
  acc[model.id] = model;
  return acc;
}, {} as Record<string, VideoModelConfig>);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all image models for a specific tier
 */
export function getImageModelsByTier(tier: UserTier): ImageModelConfig[] {
  return imageModels.filter((model) => model.tier === tier);
}

/**
 * Get all video models for a specific tier
 */
export function getVideoModelsByTier(tier: UserTier): VideoModelConfig[] {
  return videoModels.filter((model) => model.tier === tier);
}

/**
 * Get a specific image model by ID
 */
export function getImageModelById(id: string): ImageModelConfig | undefined {
  return imageModels.find((model) => model.id === id);
}

/**
 * Get a specific video model by ID
 */
export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return videoModels.find((model) => model.id === id);
}

// Backward compatibility aliases
export const getImageModelsForTier = getImageModelsByTier;
export const getVideoModelsForTier = getVideoModelsByTier;

/**
 * Get all image models that support image input
 */
export function getImageModelsWithImageInput(): ImageModelConfig[] {
  return imageModels.filter((model) => model.supportsImageInput);
}

/**
 * Get all image models that require image input
 */
export function getImageModelsRequiringImageInput(): ImageModelConfig[] {
  return imageModels.filter((model) => model.requiresImageInput);
}

/**
 * Get all image models that support optional image input (t2i + i2i)
 */
export function getImageModelsWithOptionalImageInput(): ImageModelConfig[] {
  return imageModels.filter((model) => model.supportsImageInput && !model.requiresImageInput);
}

/**
 * Get all video models that support image input
 */
export function getVideoModelsWithImageInput(): VideoModelConfig[] {
  return videoModels.filter((model) => model.supportsImageInput);
}

/**
 * Get all models (images and videos) regardless of tier
 */
export function getAllModels() {
  return {
    images: imageModels,
    videos: videoModels,
  };
}

/**
 * Get all models (images and videos) for a specific tier
 */
export function getAllModelsByTier(tier: UserTier) {
  return {
    images: getImageModelsByTier(tier),
    videos: getVideoModelsByTier(tier),
  };
}

/**
 * Legacy compatibility - Get image model by ID
 */
export function getImageModel(id: string): ImageModelConfig | null {
  return imageModels.find((model) => model.id === id) || null;
}

/**
 * Legacy compatibility - Get video model by ID
 */
export function getVideoModel(id: string): VideoModelConfig | null {
  return videoModels.find((model) => model.id === id) || null;
}

/**
 * Get the correct API model ID based on input type
 */
export function getImageModelVariant(
  modelId: string,
  hasImageInput: boolean
): string | null {
  const model = getImageModel(modelId);
  if (!model) return null;

  if (hasImageInput && model.variants.i2i) {
    return model.variants.i2i;
  }
  return model.variants.t2i ?? null;
}

/**
 * Get the correct video model variant based on input type
 */
export function getVideoModelVariant(
  modelId: string,
  inputType: 'text' | 'image' | 'video' | 'reference'
): string | null {
  const model = getVideoModel(modelId);
  if (!model) return null;

  switch (inputType) {
    case 'text':
      return model.variants.t2v ?? null;
    case 'image':
      return model.variants.i2v ?? null;
    case 'video':
      return model.variants.v2v ?? null;
    case 'reference':
      return model.variants.r2v ?? null;
    default:
      return model.variants.t2v ?? null;
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Get all free tier image models
const freeImageModels = getImageModelsByTier('free');

// Get a specific model
const klingModel = getImageModelById('kling-image-o1');

// Get all models that support image uploads
const editableImageModels = getImageModelsWithImageInput();

// Get all models for a tier
const proModels = getAllModelsByTier('pro');
console.log(proModels.images); // Pro tier image models
console.log(proModels.videos); // Pro tier video models
*/



