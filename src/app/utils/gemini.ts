import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

// Model IDs: https://ai.google.dev/gemini-api/docs/models (1.5 IDs return 404 on current API)
const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL?.trim() || 'gemini-2.5-flash';
const PRO_MODEL = process.env.GEMINI_PRO_MODEL?.trim() || 'gemini-2.5-pro';

export const geminiModel = genAI.getGenerativeModel({ model: FLASH_MODEL });
export const geminiProModel = genAI.getGenerativeModel({ model: PRO_MODEL });
export const geminiVisionModel = genAI.getGenerativeModel({ model: FLASH_MODEL });

// Helper function with fallback
export async function callGeminiWithFallback(
  prompt: string,
  options?: { 
    usePro?: boolean;
    maxRetries?: number;
    jsonOutput?: boolean;
  }
): Promise<string> {
  const { usePro = false, maxRetries = 2, jsonOutput = false } = options || {};
  
  const models: GenerativeModel[] = usePro 
    ? [geminiProModel, geminiModel] 
    : [geminiModel, geminiProModel];
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < Math.min(models.length, maxRetries); attempt++) {
    try {
      const model = models[attempt];
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }
      
      return text;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Gemini attempt ${attempt + 1} failed:`, lastError.message);
      // Continue to next model
    }
  }
  
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

// Parse JSON from AI response
export type GeminiCaptionResult = {
  caption: string;
  detectedLocation?: string;
  tags: string[];
  suggestedHashtags: string[];
};

/** Fetch a remote image and return base64 + mime type for Gemini vision. */
export async function fetchRemoteImageForVision(
  imageUrl: string,
): Promise<{ mimeType: string; data: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(imageUrl, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Image fetch failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) {
      throw new Error('Image too large (max 8MB)');
    }
    const mimeType =
      (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
    return { mimeType, data: buf.toString('base64') };
  } finally {
    clearTimeout(timeout);
  }
}

export async function captionTravelImageWithGemini(imageUrl: string): Promise<GeminiCaptionResult> {
  try {
    const { mimeType, data } = await fetchRemoteImageForVision(imageUrl);
    const prompt = `You analyze travel photography. Return ONLY valid JSON (no markdown):
{
  "caption": "2–3 sentence vivid description",
  "detectedLocation": "place name or null if unknown",
  "tags": ["5-7 short lowercase tags"],
  "suggestedHashtags": ["#Example", "#Travel"]
}`;
    const result = await geminiVisionModel.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data } },
    ]);
    const text = (await result.response).text();
    const parsed = extractJSONFromResponse(text);
    return {
      caption: String(parsed.caption ?? ''),
      detectedLocation: parsed.detectedLocation
        ? String(parsed.detectedLocation)
        : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      suggestedHashtags: Array.isArray(parsed.suggestedHashtags)
        ? parsed.suggestedHashtags.map(String)
        : [],
    };
  } catch (error) {
    console.error('captionTravelImageWithGemini:', error);
    return {
      caption: 'A memorable travel moment.',
      tags: ['travel', 'photography'],
      suggestedHashtags: ['#Travel', '#Wanderlust'],
    };
  }
}

export function extractJSONFromResponse(text: string): any {
  // Try to find JSON array or object in the response
  const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse extracted JSON:', e);
    }
  }
  
  // Try to parse the entire response
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse response as JSON:', e);
  }
  
  throw new Error('Could not extract valid JSON from AI response');
}

export default {
  geminiModel,
  geminiProModel,
  geminiVisionModel,
  callGeminiWithFallback,
  extractJSONFromResponse,
};
