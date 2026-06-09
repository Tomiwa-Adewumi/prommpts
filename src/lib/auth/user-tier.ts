import { creditsApi } from '@/lib/database/credits';
import { UserTier } from '@/lib/models/tier-validation';

/**
 * Get user's subscription tier from database
 * This runs server-side and fetches from the database directly
 */
export async function getUserTierFromDatabase(userUuid: string): Promise<UserTier> {
  try {
    // Get user's active subscription
    const subscription = await creditsApi.getUserSubscription(userUuid);
    
    if (!subscription || !(subscription as any).package) {
      return 'free'; // Default to free tier if no subscription
    }
    
    // Map package names to tiers  
    const packageName = (subscription as any).package?.name?.toLowerCase();
    
    switch (packageName) {
      case 'starter':
        return 'starter';
      case 'creator':
        return 'creator';
      case 'pro':
        return 'pro';
      default:
        return 'free';
    }
  } catch (error) {
    console.error('Error fetching user tier from database:', error);
    // Default to free tier on error for security
    return 'free';
  }
}

/**
 * Validate user access to a model based on their database tier
 * Returns the user's tier and whether they can access the model
 */
export async function validateUserModelAccess(userUuid: string, modelId: string): Promise<{
  userTier: UserTier;
  canAccess: boolean;
  requiredTier: UserTier | null;
}> {
  const userTier = await getUserTierFromDatabase(userUuid);
  
  // Import here to avoid circular dependencies
  const { canAccessModel, getModelRequiredTier } = await import('@/lib/models/tier-validation');
  
  const canAccess = canAccessModel(userTier, modelId);
  const requiredTier = getModelRequiredTier(modelId);
  
  return {
    userTier,
    canAccess,
    requiredTier
  };
}