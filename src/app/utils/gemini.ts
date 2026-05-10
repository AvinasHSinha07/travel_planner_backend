import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';
import { createHash } from 'crypto';

// Support multiple API keys for rotation
const rawKeys = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
export const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.startsWith('AIza'));
export let currentKeyIndex = 0;

export const setCurrentKeyIndex = (index: number) => {
  currentKeyIndex = index;
};

console.log(`[GEMINI] Multi-key rotation initialized with ${apiKeys.length} keys.`);

// Model IDs: Prioritizing stability and latest available versions (2026 Series)
export const MODELS = {
  flash: [
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ],
  pro: [
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
  ],
};

export const getGenAIInstance = (index: number) => {
  const key = apiKeys[index] || apiKeys[0] || '';
  return new GoogleGenerativeAI(key);
};

// Dynamic model getters to ensure they always use the current active key
export const getGeminiModel = (modelId?: string) => {
  const genAI = getGenAIInstance(currentKeyIndex);
  return genAI.getGenerativeModel({ model: modelId || MODELS.flash[0] });
};

export const getGeminiProModel = () => getGeminiModel(MODELS.pro[0]);

// Helper function with fallback and key rotation
export async function callGeminiWithFallback(
  prompt: string,
  options?: { 
    usePro?: boolean;
    jsonOutput?: boolean;
  }
): Promise<string> {
  const { usePro = false } = options || {};
  
  // Combine all models, prioritized by requested tier
  const modelIds = usePro 
    ? [...MODELS.pro, ...MODELS.flash] 
    : [...MODELS.flash, ...MODELS.pro];
  
  let lastError: any = null;
  
  // Try each API key
  for (let keyAttempt = 0; keyAttempt < apiKeys.length; keyAttempt++) {
    const activeKeyIndex = (currentKeyIndex + keyAttempt) % apiKeys.length;
    const currentGenAI = new GoogleGenerativeAI(apiKeys[activeKeyIndex]);

    // Try each model with this API key
    for (const modelId of modelIds) {
      try {
        console.log(`[GEMINI] Attempting ${modelId} with Key ${activeKeyIndex + 1}/${apiKeys.length}`);
        const model = currentGenAI.getGenerativeModel({ model: modelId });
        
        // Add a reasonable timeout for the request
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
        ]) as any;

        const response = await result.response;
        const text = response.text();
        
        if (!text || text.trim().length === 0) {
          throw new Error(`Empty response from ${modelId}`);
        }
        
        // Success! Update the current key index to the one that worked
        setCurrentKeyIndex(activeKeyIndex);
        return text;
      } catch (error: any) {
        lastError = error;
        const message = error?.message || '';
        const status = error?.status || 0;
        
        console.warn(`[GEMINI] ${modelId} (Key ${activeKeyIndex + 1}) failed:`, message);
        
        // If it's a 404 (Not Found), it might be an invalid model name, try next model
        if (status === 404 || message.includes('404') || message.includes('not found')) {
          continue;
        }

        // If it's a 400 (Bad Request) with "location not supported", try next model 
        // (sometimes different models have different regional availability)
        if (message.includes('location is not supported')) {
          continue;
        }

        // If it's a 429 (Quota), we should try the next key for the same model if possible,
        // or just move to the next key entirely to save time.
        if (status === 429 || message.includes('429') || message.toLowerCase().includes('quota')) {
          console.warn(`[GEMINI] Key ${activeKeyIndex + 1} exhausted. Moving to next key...`);
          break; // Break the model loop, try next key
        }
        
        // For other errors, try the next model with the same key
        continue;
      }
    }
    
    console.warn(`[GEMINI] All models failed for Key ${activeKeyIndex + 1}. Trying next key...`);
  }
  
  throw new Error(`All Gemini models and API keys failed. Last error: ${lastError?.message}`);
}

// Parse JSON from AI response
export type GeminiCaptionResult = {
  caption: string;
  detectedLocation?: string;
  tags: string[];
  suggestedHashtags: string[];
};

// For backward compatibility, these are now functions or proxies that use the current active key
export const geminiModel = {
  generateContent: (p: any) => getGeminiModel().generateContent(p),
};
export const geminiProModel = {
  generateContent: (p: any) => getGeminiProModel().generateContent(p),
};
export const geminiVisionModel = {
  generateContent: (p: any) => getGeminiModel().generateContent(p),
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

    let lastError: any = null;
    for (let keyAttempt = 0; keyAttempt < apiKeys.length; keyAttempt++) {
      const activeKeyIndex = (currentKeyIndex + keyAttempt) % apiKeys.length;
      const currentGenAI = new GoogleGenerativeAI(apiKeys[activeKeyIndex]);
      
      // Try a few models that support vision (2026 Series)
      const visionModels = [
        'gemini-3.1-flash-image-preview',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash'
      ];
      
      for (const modelId of visionModels) {
        try {
          console.log(`[GEMINI-VISION] Attempting ${modelId} with Key ${activeKeyIndex + 1}/${apiKeys.length}`);
          const model = currentGenAI.getGenerativeModel({ model: modelId });
          const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data } },
          ]);
          const resText = (await result.response).text();
          const parsed = extractJSONFromResponse(resText);
          setCurrentKeyIndex(activeKeyIndex);
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
        } catch (error: any) {
          lastError = error;
          const msg = error?.message || '';
          console.warn(`[GEMINI-VISION] ${modelId} (Key ${activeKeyIndex + 1}) failed:`, msg);
          
          if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
            break; // Try next key
          }
          continue; // Try next model
        }
      }
    }
    throw lastError;
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
