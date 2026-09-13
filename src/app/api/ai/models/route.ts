import { NextRequest, NextResponse } from 'next/server';
import { fetchAvailableGeminiModels, FALLBACK_GEMINI_MODELS } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/auth';
import { updateAiModelAction } from '@/app/actions/user';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const models = await fetchAvailableGeminiModels(forceRefresh);
    return NextResponse.json({
      success: true,
      models,
      currentModel: user.aiModel || 'gemini-2.5-flash',
    });
  } catch (error: any) {
    console.error('Error fetching dynamic Gemini models:', error);
    return NextResponse.json({
      success: true,
      models: FALLBACK_GEMINI_MODELS,
      currentModel: user.aiModel || 'gemini-2.5-flash',
      warning: error.message || 'Used fallback model list.',
    });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { modelName } = body;

    if (!modelName || typeof modelName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid modelName provided.' },
        { status: 400 }
      );
    }

    const result = await updateAiModelAction(modelName);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      aiModel: result.aiModel,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error updating AI model preference:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferred AI model.' },
      { status: 500 }
    );
  }
}
