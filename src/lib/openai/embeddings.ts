import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getTextEmbedding(prompt: string): Promise<number[]> {
  if (!prompt) throw new Error("Prompt is required for embedding.");

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: prompt,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}