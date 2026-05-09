/**
 * Smoke test for Gemini integration (Phase 9).
 * Run: npm run test:ai-e2e
 * Requires GEMINI_API_KEY in env. Exits 0 with skip message if missing.
 */
import 'dotenv/config';
import { callGeminiWithFallback, extractJSONFromResponse } from '../src/app/utils/gemini';

async function main() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.log('[ai-gemini-smoke] SKIP: GEMINI_API_KEY not set');
    process.exit(0);
  }

  const prompt = `Reply with ONLY valid JSON: {"ok": true, "echo": "phase9"}`;
  const text = await callGeminiWithFallback(prompt);
  const parsed = extractJSONFromResponse(text);
  if (!parsed?.ok) {
    console.error('[ai-gemini-smoke] FAIL: unexpected response', parsed);
    process.exit(1);
  }
  console.log('[ai-gemini-smoke] OK: Gemini JSON round-trip works');
  process.exit(0);
}

main().catch((e) => {
  console.error('[ai-gemini-smoke] FAIL:', e);
  process.exit(1);
});
