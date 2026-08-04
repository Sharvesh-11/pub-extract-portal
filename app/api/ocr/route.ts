import { NextResponse } from 'next/server';
import { createWorker, PSM } from 'tesseract.js';
import { parseTesseractResult } from '@/lib/ocr-parser';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Initialize Tesseract.js worker
    const worker = await createWorker('eng');
    
    // Use SPARSE_TEXT (11) for tabular/sparse data
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT, 
    });

    const { data } = await worker.recognize(image);
    await worker.terminate();

    // Map output for parser
    const tesseractOutput = {
      text: data.text,
      confidence: data.confidence,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      words: (data as any).words.map((w: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number; } }) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: {
          x0: w.bbox.x0,
          y0: w.bbox.y0,
          x1: w.bbox.x1,
          y1: w.bbox.y1
        }
      }))
    };

    const sourceImageId = uuidv4();
    const { records } = parseTesseractResult(tesseractOutput, sourceImageId);
    
    return NextResponse.json({ 
      success: true, 
      records, 
      rawText: data.text,
      sourceImageId 
    });
  } catch (error) {
    console.error('OCR Processing Error:', error);
    return NextResponse.json({ error: "Failed to process image with OCR" }, { status: 500 });
  }
}
