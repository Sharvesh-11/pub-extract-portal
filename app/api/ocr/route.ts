import { NextResponse } from 'next/server';
import { extractData } from '@/services/ai/extractor';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ success: false, error: "Image file is required in 'image' field" }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // Call the unified AI extractor
    const result = await extractData(
      { base64: base64Data, mimeType },
      'Gym Member Registration'
    );

    return NextResponse.json({ 
      success: true, 
      result, // contains { documentType, members, warnings, rawText }
      sourceImageId: imageFile.name 
    });
  } catch (error) {
    console.error('AI Processing Error:', error);
    const errMessage = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
