// AIML API prompt generator and image prompt extractor
// Simplified version using system prompts from environment variables

import { OpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt } from '@/lib/prompts'

const client = new OpenAI({
  apiKey: process.env.AI_ML_API_KEY,
  baseURL: 'https://api.aimlapi.com/v1',
})

const MODEL = 'gpt-4o'
const TEMPERATURE = 0.8
const EXTRACTION_TEMPERATURE = 0.3  // Lower temperature for more consistent extraction
const MAX_TOKENS = 1000

export type NewPromptInput = {
  userPrompt: string
}

export type EditPromptInput = {
  originalPrompt: string
  adjustment: string
}

export type ImagePromptInput = {
  userPrompt: string
  imageUrl: string
}

export type PromptInput = NewPromptInput | EditPromptInput | ImagePromptInput


// Unified generator for new, edit, and image prompts using AIML API
export async function generatePrompt(input: PromptInput): Promise<string> {
  if (!input) throw new Error('Input is required.')

  const isEdit = 'originalPrompt' in input && 'adjustment' in input
  const isImage = 'imageUrl' in input

  const systemPrompt = getSystemPrompt('generation')
  const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }]

  if (isEdit) {
    const { originalPrompt, adjustment } = input as EditPromptInput
    const userText =
      `Refine the following prompt according to the requested adjustment.\n` +
      `Original: ${originalPrompt}\n` +
      `Adjustment: ${adjustment}\n` +
      `Return only the final, improved prompt.`

    messages.push({ role: 'user', content: userText })
  } else if (isImage) {
    const { userPrompt, imageUrl } = input as ImagePromptInput

    const userText = `Create a single AI-ready prompt based on: ${userPrompt}`

    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userText },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high',
          },
        },
      ],
    })
  } else {
    const { userPrompt } = input as NewPromptInput
    const userText = `Create a detailed AI-ready prompt from: ${userPrompt}`

    messages.push({ role: 'user', content: userText })
  }

  const chatResponse = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  })

  const choice = chatResponse.choices[0]
  const result = choice?.message?.content?.trim() || 'No prompt generated.'

  if (choice?.finish_reason !== 'stop') {
    if (isImage) {
      throw new Error('Unable to process the uploaded image. Please try a different image or use text-only.')
    } else {
      throw new Error('Unable to generate prompt. Please try rephrasing your request.')
    }
  }

  return result
}

// Image-only extractor using AIML API and system prompts
export async function extractPromptFromImage(
  imageUrlOrDataUrl: string,
  adjustments?: string,
  detail: 'low' | 'high' | 'auto' = 'auto',
  retryCount: number = 0
): Promise<string> {
  const systemPrompt = getSystemPrompt('extraction')

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              adjustments
                ? `Analyze this image and focus on: ${adjustments}`
                : `Describe this image focusing on artistic composition, photo tech, flash (if any) lighting, colors, pose of the subject and visual elements i.e extract every detail from the image.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrlOrDataUrl,
              detail: detail,
            },
          },
        ],
      },
    ],
    temperature: EXTRACTION_TEMPERATURE,  // Use lower temperature for consistency
    max_tokens: MAX_TOKENS,
  })

  const choice = response.choices[0]
  const result = choice?.message?.content?.trim() ?? 'No description generated'

  // Check for common refusal patterns
  const refusalPatterns = [
    "i can't", "i cannot", "sorry", "unable to help", 
    "i'm not able", "i am not able", "cannot assist"
  ];
  
  const hasRefusal = refusalPatterns.some(pattern => 
    result.toLowerCase().includes(pattern)
  );

  if (hasRefusal) {
    // Try once more with a different approach
    if (retryCount < 1) {
      console.log('First extraction attempt refused, retrying with adjusted prompt...');
      return extractPromptFromImage(
        imageUrlOrDataUrl,
        'the overall scene, environment, and artistic elements',
        'low',  // Try with lower detail
        retryCount + 1
      );
    }
    throw new Error('Sorry, unable to process this image. Please try again with a different image.')
  }

  if (choice?.finish_reason !== 'stop') {
    throw new Error('Unable to fully analyze the uploaded image. Please try again.')
  }

  return result
}