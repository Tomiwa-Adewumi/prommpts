import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ModerationConfig {
  hardRejections: readonly string[];
  customThresholds: {
    readonly [category: string]: number;
  };
  ignoredCategories: readonly string[];
}


export interface ModerationDecision {
  reject: boolean;
  reasons: string[];
  flaggedCategories: string[];
  scores: { [category: string]: number };
}

export const MODERATION_PRESETS = {
  strict: {
    hardRejections: [
      "sexual",
      "sexual/minors",
      "violence",
      "violence/graphic",
      "hate",
      "hate/threatening",
      "self-harm/intent",
      "self-harm/instructions"
    ],
    customThresholds: {
      "harassment": 0.3,
      "harassment/threatening": 0.2,
      "self-harm": 0.3
    },
    ignoredCategories: []
  },

  moderate: {
    hardRejections: [
      "sexual/minors",
      "hate/threatening",
      "violence/graphic",
      "self-harm/intent",
      "self-harm/instructions"
    ],
    customThresholds: {
      "sexual": 0.75,
      "violence": 0.80,
      "harassment": 0.85,
      "harassment/threatening": 0.70,
      "hate": 0.70,
      "self-harm": 0.90
    },
    ignoredCategories: []
  },

  permissive: {
    hardRejections: [
      "sexual/minors",
      "self-harm/intent",
      "self-harm/instructions"
    ],
    customThresholds: {
      "sexual": 0.90,
      "violence": 0.95,
      "violence/graphic": 0.85,
      "hate/threatening": 0.80,
      "harassment/threatening": 0.85
    },
    ignoredCategories: ["harassment"]
  }
} as const;

const CATEGORY_MESSAGES: { [key: string]: string } = {
  "sexual": "Content contains explicit sexual material",
  "sexual/minors": "Content involving minors is not permitted",
  "violence": "Content contains excessive violence",
  "violence/graphic": "Graphic violent content is not allowed",
  "harassment": "Content appears to target or harass individuals",
  "harassment/threatening": "Content contains threatening harassment",
  "hate": "Content contains hateful language or imagery",
  "hate/threatening": "Content contains threatening hate speech",
  "self-harm": "Content promotes self-harm",
  "self-harm/intent": "Content expresses intent to self-harm",
  "self-harm/instructions": "Content provides self-harm instructions"
};

export async function moderateContent(
  text: string,
  config: ModerationConfig = MODERATION_PRESETS.moderate
): Promise<ModerationDecision> {
  if (!text || text.trim().length === 0) {
    return {
      reject: false,
      reasons: [],
      flaggedCategories: [],
      scores: {}
    };
  }

  try {
    const response = await openai.moderations.create({
      input: text,
    });

    const moderation = response.results[0];

    return evaluateModeration(moderation, config);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Content moderation temporarily unavailable. Please try again in a moment.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Content moderation timed out. Please try again.');
      }
    }

    throw new Error('Content moderation failed. Please try again.');
  }
}

export async function moderateImageAndText(
  text: string,
  base64Image: string,
  config: ModerationConfig = MODERATION_PRESETS.moderate
): Promise<ModerationDecision> {
  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [
        { type: "text", text: text },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ],
    });

    const moderation = response.results[0];
    const result = evaluateModeration(moderation, config);
    
    // Log moderation rejection without throwing
    if (result.reject) {
      console.log('Content moderation rejection:', {
        categories: result.flaggedCategories,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    // Log the error but don't crash the server
    console.error('OpenAI moderation API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // On error, reject the upload to be safe
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Content moderation temporarily unavailable due to rate limiting. Please try again in a moment.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Content moderation timed out. Please try again.');
      }
    }
    
    // For other errors, still throw but with a user-friendly message
    throw new Error('Content moderation service is temporarily unavailable. Please try again later.');
  }
}

function evaluateModeration(
  moderation: OpenAI.Moderation,
  config: ModerationConfig
): ModerationDecision {
  const rejectionReasons: string[] = [];
  const flaggedCategories: string[] = [];
  const relevantScores: { [category: string]: number } = {};

  // Extract scores from OpenAI's structure
  const categoryScores = moderation.category_scores;
  const categories = moderation.categories;

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > 0.1) {
      relevantScores[category] = score;
    }
  }

  // Check hard rejections
  for (const category of config.hardRejections) {
    const categoryKey = category as keyof typeof categories;
    if (categories[categoryKey]) {
      const message = CATEGORY_MESSAGES[category] || `Contains prohibited ${category.replace('/', ' ')} content`;
      rejectionReasons.push(message);
      flaggedCategories.push(category);
    }
  }

  // Check custom thresholds
  for (const [category, threshold] of Object.entries(config.customThresholds)) {
    if (config.ignoredCategories.includes(category)) {
      continue;
    }

    const categoryKey = category as keyof typeof categoryScores;
    const score = categoryScores[categoryKey] || 0;
    if (score > threshold) {
      const message = CATEGORY_MESSAGES[category] || `${category} content exceeds acceptable limits`;
      const detailedMessage = `${message} (${(score * 100).toFixed(1)}% confidence)`;
      rejectionReasons.push(detailedMessage);
      flaggedCategories.push(category);
    }
  }

  return {
    reject: rejectionReasons.length > 0,
    reasons: rejectionReasons,
    flaggedCategories,
    scores: relevantScores
  };
}

export function combineTextForModeration(metadata: {
  title: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  tags?: string[];
}): string {
  const parts: string[] = [];

  parts.push(`Title: ${metadata.title}`);

  if (metadata.description) {
    parts.push(`Description: ${metadata.description}`);
  }

  parts.push(`Prompt: ${metadata.prompt}`);

  if (metadata.negativePrompt) {
    parts.push(`Negative Prompt: ${metadata.negativePrompt}`);
  }

  if (metadata.tags && metadata.tags.length > 0) {
    parts.push(`Tags: ${metadata.tags.join(', ')}`);
  }

  return parts.join('\n\n');
}

export function combineTextForEmbedding(metadata: {
  title: string;
  description?: string;
  prompt: string;
  tags?: string[];
}): string {
  const parts: string[] = [];

  parts.push(metadata.title);

  if (metadata.description) {
    parts.push(metadata.description);
  }

  parts.push(metadata.prompt);

  if (metadata.tags && metadata.tags.length > 0) {
    parts.push(metadata.tags.join(' '));
  }

  return parts.join(' ').trim();
}