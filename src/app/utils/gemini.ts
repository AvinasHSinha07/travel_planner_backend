import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

// Primary model (fast, cost-effective)
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Fallback model (more capable)
export const geminiProModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Vision model for image analysis
export const geminiVisionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
