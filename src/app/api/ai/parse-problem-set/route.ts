import { NextRequest, NextResponse } from 'next/server';
import { parseProblemSetImages } from '@/lib/gemini';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { images, targetProblemType, modelName, userInstructions } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No image(s) provided. At least one base64 image required.' },
        { status: 400 }
      );
    }

    const result = await parseProblemSetImages(
      images,
      targetProblemType || 'auto',
      modelName || 'gemini-3.6-flash',
      userInstructions
    );

    if (!result.is_valid_problems) {
      return NextResponse.json(
        {
          error: result.error_message || 'The uploaded image does not contain clear problem set exercises.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.problems,
      rationale: result.selection_rationale || null,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-problem-set:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process problem set image.' },
      { status: 500 }
    );
  }
}
