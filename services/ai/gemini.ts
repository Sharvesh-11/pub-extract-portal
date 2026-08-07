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
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      responseMimeType: "application/json"
    }
  });

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
      ], {
        signal: AbortSignal.timeout(60000)
      });
      return result.response.text();
    } catch (e: any) {
      if (e.status >= 400 && e.status < 500 && e.status !== 429) {
        logger.error('Gemini API permanent error, not retrying', { error: e.message, status: e.status, prompt });
        throw e;
      }

      attempt++;
      if (attempt > retries) {
        logger.error('Gemini API exhausted retries', { error: e.message, prompt });
        throw e;
      }
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      logger.warn(`Gemini API failed, retrying in ${Math.round(backoff)}ms`, { attempt, error: e.message, status: e.status });
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new Error("Failed to generate content");
}

export async function generateContentFromText(
  prompt: string, 
  text: string, 
  retries = 3
): Promise<string> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      responseMimeType: "application/json"
    }
  });

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const result = await model.generateContent([
        prompt,
        text
      ], {
        signal: AbortSignal.timeout(60000)
      });
      return result.response.text();
    } catch (e: any) {
      if (e.status >= 400 && e.status < 500 && e.status !== 429) {
        logger.error('Gemini API permanent error, not retrying', { error: e.message, status: e.status, prompt });
        throw e;
      }

      attempt++;
      if (attempt > retries) {
        logger.error('Gemini API exhausted retries', { error: e.message, prompt });
        throw e;
      }
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      logger.warn(`Gemini API failed, retrying in ${Math.round(backoff)}ms`, { attempt, error: e.message, status: e.status });
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new Error("Failed to generate content from text");
}
