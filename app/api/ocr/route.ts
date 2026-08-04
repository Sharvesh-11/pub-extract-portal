import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `Extract every row of the publication register table from this image.
Return ONLY a JSON array containing objects (do NOT use markdown fences like \`\`\`json, just return raw JSON).
Each object must have exactly these keys:
- rollNumber
- studentName
- paperTitle
- journalName
- issn
- volumeIssue
- doi
- prNumber
- facultyCoordinator

Use an empty string "" for any blank or illegible fields. Preserve exact text as written.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    let responseText = result.response.text();
    // Defensively strip markdown formatting just in case
    responseText = responseText.replace(/^```(json)?/, '').replace(/```$/, '').trim();

    const records = JSON.parse(responseText);

    return NextResponse.json({ 
      success: true, 
      records,
      sourceImageId: imageFile.name 
    });
  } catch (error) {
    console.error('Gemini API Processing Error:', error);
    const errMessage = error instanceof Error ? error.message : "Failed to process image with Gemini";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
