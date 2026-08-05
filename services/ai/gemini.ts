import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateContentFromGemini(
  prompt: string, 
  base64Data: string, 
  mimeType: string,
  retries = 3
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);
      return result.response.text();
    } catch (e: any) {
      attempt++;
      if (attempt > retries) {
        logger.error('Gemini API exhausted retries', { error: e.message, prompt });
        throw e;
      }
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      logger.warn(`Gemini API failed, retrying in ${Math.round(backoff)}ms`, { attempt, error: e.message });
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new Error("Failed to generate content");
}
