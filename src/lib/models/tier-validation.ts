export type UserTier = 'free' | 'starter' | 'creator' | 'pro';

export interface Model {
  id: string;
  name: string;
  description: string;
  tier: UserTier;
  category: string;
  features?: string[];
}

// Model-to-tier mapping - single source of truth
export const MODEL_TIER_MAP: Record<string, UserTier> = {
  // Free Tier Models
  'dall-e-3': 'free',
  'flux-pro': 'free', // Basic flux-pro model
  'openai/gpt-image-1': 'free',
  
  // Starter Tier Models  
  'stable-diffusion-v35-large': 'starter',
  'flux/schnell': 'starter',
  
  // Creator Tier Models
  'flux-pro/v1.1': 'creator',
  'flux-realism': 'creator', 
  'recraft-v3': 'creator',
  'bytedance/seedream-3.0': 'creator',
  
  // Pro Tier Models
  'flux-pro/v1.1-ultra': 'pro',
  'imagen-3.0-generate-002': 'pro',
  'imagen-4.0-ultra-generate-preview-06-06': 'pro'
};

// Full model definitions with metadata
export const AVAILABLE_MODELS: Model[] = [
  // Free Tier Models
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    description: 'Best prompt adherence & consistency',
    tier: 'free',
    category: 'OpenAI',
    features: ['High quality', 'Great prompt following', 'Creative versatility']
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    description: 'High-quality AI image generation',
    tier: 'free',
    category: 'Flux',
    features: ['High quality', 'Fast generation', 'Versatile styles']
  },
  {
    id: 'openai/gpt-image-1',
    name: 'GPT Image 1',
    description: 'OpenAI\'s newest experimental image model',
    tier: 'free',
    category: 'OpenAI',
    features: ['Experimental', 'Latest technology', 'Cutting-edge results']
  },

  // Starter Tier Models
  {
    id: 'stable-diffusion-v35-large',
    name: 'Stable Diffusion 3.5 Large',
    description: 'High-quality generations, versatile',
    tier: 'starter',
    category: 'Stability AI',
    features: ['High resolution', 'Versatile styles', 'Detailed output']
  },
  {
    id: 'flux/schnell',
    name: 'Flux Schnell',
    description: 'Ultra-fast outputs',
    tier: 'starter',
    category: 'Flux',
    features: ['Lightning fast', 'Quick iterations', 'Efficient processing']
  },

  // Creator Tier Models
  {
    id: 'flux-pro/v1.1',
    name: 'Flux Pro v1.1',
    description: 'Balanced realism & speed',
    tier: 'creator',
    category: 'Flux',
    features: ['Balanced quality', 'Professional results', 'Optimized speed']
  },
  {
    id: 'flux-realism',
    name: 'Flux Realism LoRA',
    description: 'Specialized for lifelike results',
    tier: 'creator',
    category: 'Flux',
    features: ['Photorealistic', 'Lifelike details', 'Natural lighting']
  },
  {
    id: 'recraft-v3',
    name: 'Recraft v3',
    description: 'Artistic & design-oriented',
    tier: 'creator',
    category: 'Recraft AI',
    features: ['Design focused', 'Artistic styles', 'Brand consistency']
  },
  {
    id: 'bytedance/seedream-3.0',
    name: 'ByteDance Seedream 3.0',
    description: 'Creative variety',
    tier: 'creator',
    category: 'ByteDance',
    features: ['Creative diversity', 'Unique styles', 'Innovative results']
  },

  // Pro Tier Models
  {
    id: 'flux-pro/v1.1-ultra',
    name: 'Flux Pro Ultra',
    description: 'Max Flux quality',
    tier: 'pro',
    category: 'Flux',
    features: ['Maximum quality', 'Ultra-detailed', 'Professional grade']
  },
  {
    id: 'imagen-3.0-generate-002',
    name: 'Google Imagen 3',
    description: 'Top-tier realism from Google',
    tier: 'pro',
    category: 'Google',
    features: ['Google AI', 'Photorealistic', 'Advanced understanding']
  },
  {
    id: 'imagen-4.0-ultra-generate-preview-06-06',
    name: 'Google Imagen 4 Ultra',
    description: 'Ultimate photorealism, prestige model',
    tier: 'pro',
    category: 'Google',
    features: ['Ultimate quality', 'Prestige model', 'Unmatched realism']
  }
];

// Tier hierarchy for validation
const TIER_HIERARCHY: Record<UserTier, number> = {
  'free': 0,
  'starter': 1, 
  'creator': 2,
  'pro': 3
};

/**
 * Check if a user's tier allows access to a specific model
 */
export function canAccessModel(userTier: UserTier, modelId: string): boolean {
  const requiredTier = MODEL_TIER_MAP[modelId];
  if (!requiredTier) {
    // Unknown model - deny access
    return false;
  }
  
  const userTierLevel = TIER_HIERARCHY[userTier];
  const requiredTierLevel = TIER_HIERARCHY[requiredTier];
  
  return userTierLevel >= requiredTierLevel;
}

/**
 * Get the required tier for a model
 */
export function getModelRequiredTier(modelId: string): UserTier | null {
  return MODEL_TIER_MAP[modelId] || null;
}

/**
 * Get all valid model IDs
 */
export function getValidModelIds(): string[] {
  return Object.keys(MODEL_TIER_MAP);
}

/**
 * Get models available to a specific tier
 */
export function getModelsForTier(userTier: UserTier): Model[] {
  return AVAILABLE_MODELS.filter(model => canAccessModel(userTier, model.id));
}

/**
 * Validate if a model ID exists in our system
 */
export function isValidModelId(modelId: string): boolean {
  return modelId in MODEL_TIER_MAP;
}