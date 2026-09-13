import { NextRequest, NextResponse } from 'next/server';
import { parseConceptsFromImages } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { images, modelName, userInstructions } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No image(s) provided. At least one base64 image required.' },
        { status: 400 }
      );
    }

    const effectiveModel = modelName || user.aiModel || 'gemini-2.5-flash';

    const result = await parseConceptsFromImages(
      images,
      effectiveModel,
      userInstructions
    );

    if (!result.is_valid_concept) {
      return NextResponse.json(
        {
          error: result.error_message || 'The uploaded photo does not appear to contain readable theory or concepts.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.concepts,
      usedModel: effectiveModel,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-concept:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse concept images.' },
      { status: 500 }
    );
  }
}
