import { useState, useCallback } from 'react';
import { validatePromptData } from '@/lib/validation/prompt-schema';

interface UsePromptGeneratorOptions {
    onSuccess?: (prompt: string) => void;
    onError?: (error: string) => void;
}

export function usePromptGenerator(options?: UsePromptGeneratorOptions) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);

    interface PromptGenerationData {
        generalIdea?: string;
        vibe?: string;
        adjustments?: string;
        stylePreferences?: Record<string, string>;
        image?: string;
        originalPrompt?: string;
        adjustment?: string;
    }

    const generatePrompt = useCallback(async (
        mode: 'create' | 'edit' | 'extract',
        data: PromptGenerationData
    ) => {
        setIsGenerating(true);
        setError(null);

        try {

            const validatedData = validatePromptData(mode, data);

            const response = await fetch('/api/generate-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(validatedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            const prompt = result.prompt || 'No prompt generated';
            setGeneratedPrompt(prompt);
            options?.onSuccess?.(prompt);

            return prompt;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate prompt. Please try again.';
            setError(errorMessage);
            setGeneratedPrompt('');
            options?.onError?.(errorMessage);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, [options]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const reset = useCallback(() => {
        setGeneratedPrompt('');
        setError(null);
        setIsGenerating(false);
    }, []);

    return {
        isGenerating,
        generatedPrompt,
        error,
        generatePrompt,
        clearError,
        reset,
    };
}
