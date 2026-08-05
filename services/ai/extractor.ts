import { buildPrompt, ExtractionProfile } from './prompt-builder';
import { generateContentFromGemini } from './gemini';
import { parseResponse, StandardExtraction } from './response-parser';

export async function extractData(
  fileData: { base64: string; mimeType: string },
  profile: ExtractionProfile
): Promise<StandardExtraction> {
  // 1. Build Prompt
  const prompt = buildPrompt(profile);
  
  // 2. Call AI Provider (currently Gemini)
  // The abstraction allows us to inject other providers here based on config later
  const rawResponse = await generateContentFromGemini(prompt, fileData.base64, fileData.mimeType);
  
  // 3. Parse and standardize
  const standardizedResult = parseResponse(rawResponse);
  
  return standardizedResult;
}
