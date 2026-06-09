import { z } from 'zod';

export const CreatePromptSchema = z.object({
    generalIdea: z.string()
        .min(3, 'Description must be at least 3 characters')
        .max(2000, 'Description must be less than 2000 characters')
        .optional(),
    vibe: z.string().optional(),
    adjustments: z.string()
        .max(1000, 'Adjustments must be less than 1000 characters')
        .optional(),
    stylePreferences: z.object({
        realism: z.enum(['low', 'medium', 'high']).default('medium'),
        camera_type: z.string().max(100).optional(),
        aspect_ratio: z.string().default('3:4'),
        prompt_tone: z.string().max(100).optional(),
    }).optional(),
    image: z.string().optional(), // base64 encoded image
});

export const EditPromptSchema = z.object({
    originalPrompt: z.string()
        .min(10, 'Original prompt must be at least 10 characters')
        .max(5000, 'Original prompt must be less than 5000 characters'),
    adjustment: z.string()
        .min(3, 'Adjustment must be at least 3 characters')
        .max(1000, 'Adjustment must be less than 1000 characters'),
});

export const ExtractPromptSchema = z.object({
    image: z.string().min(1, 'Image is required'),
    adjustments: z.string()
        .max(1000, 'Context must be less than 1000 characters')
        .optional(),
});

export type CreatePromptData = z.infer<typeof CreatePromptSchema>;
export type EditPromptData = z.infer<typeof EditPromptSchema>;
export type ExtractPromptData = z.infer<typeof ExtractPromptSchema>;

// Validation function that checks based on mode
export function validatePromptData(mode: 'create' | 'edit' | 'extract', data: unknown) {
    switch (mode) {
        case 'create':
            // Parse the data first to get the proper type
            const parsedData = CreatePromptSchema.parse(data);
            // At least one of generalIdea or image must be provided
            if (!parsedData.generalIdea?.trim() && !parsedData.image) {
                throw new Error('Either a description or reference image is required');
            }
            return parsedData;
        case 'edit':
            return EditPromptSchema.parse(data);
        case 'extract':
            return ExtractPromptSchema.parse(data);
        default:
            throw new Error('Invalid mode');
    }
}
