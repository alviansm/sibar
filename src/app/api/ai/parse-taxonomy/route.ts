import { NextRequest, NextResponse } from 'next/server';
import { parseTaxonomyImages } from '@/lib/gemini';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { images, generateProblems, modelName } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No image(s) provided. At least one base64 image required.' },
        { status: 400 }
      );
    }

    const taxonomyResult = await parseTaxonomyImages(images, Boolean(generateProblems), modelName);

    if (!taxonomyResult.is_valid_syllabus) {
      return NextResponse.json(
        {
          error: taxonomyResult.error_message || 'The uploaded image does not appear to contain a valid table of contents.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: taxonomyResult.chapters });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-taxonomy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process table of contents image.' },
      { status: 500 }
    );
  }
}
