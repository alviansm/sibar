import { NextRequest, NextResponse } from 'next/server';
import { parseProblemImage } from '@/lib/gemini';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let imageBase64 = '';
    let mimeType = 'image/png';

    let modelName = 'gemini-3.6-flash';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      imageBase64 = body.imageBase64 || '';
      mimeType = body.mimeType || 'image/png';
      if (body.modelName) modelName = body.modelName;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        mimeType = file.type || 'image/png';
        const buffer = await file.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString('base64');
      }
      if (formData.get('modelName')) {
        modelName = formData.get('modelName') as string;
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided. Base64 string or file upload required.' },
        { status: 400 }
      );
    }

    const parsedProblem = await parseProblemImage(imageBase64, mimeType, modelName);
    return NextResponse.json({ success: true, data: parsedProblem });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-problem:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to digitize problem image.' },
      { status: 500 }
    );
  }
}
