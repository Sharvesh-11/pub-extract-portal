import { buildPrompt, ExtractionProfile } from './prompt-builder';
import { generateContentFromGemini, generateContentFromText } from './gemini';
import { parseResponse, StandardExtraction } from './response-parser';

export async function extractData(
  fileData: { base64?: string; text?: string; mimeType: string },
  profile: ExtractionProfile
): Promise<StandardExtraction> {
  // 1. Build Prompt
  const prompt = buildPrompt(profile);
  
  // 2. Call AI Provider (currently Gemini)
  let rawResponse = '';
  if (fileData.text) {
    rawResponse = await generateContentFromText(prompt, fileData.text);
  } else if (fileData.base64) {
    rawResponse = await generateContentFromGemini(prompt, fileData.base64, fileData.mimeType);
  } else {
    throw new Error('No valid data provided to extractData');
  }

  
  // 3. Parse and standardize
  const standardizedResult = parseResponse(rawResponse);
  
  return standardizedResult;
}
