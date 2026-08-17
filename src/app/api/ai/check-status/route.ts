import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    return NextResponse.json({
      status: 'error',
      message: 'GEMINI_API_KEY is not configured in .env file.',
      details: 'Please set a valid API key from https://aistudio.google.com/ in your .env file.',
    });
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
    });

    const latency = Date.now() - startTime;
    return NextResponse.json({
      status: 'success',
      model: 'gemini-3.6-flash',
      latencyMs: latency,
      message: 'Gemini AI connection active & operational.',
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const msg = err?.message || String(err);
    const isApiKeyError =
      err?.status === 400 ||
      msg.includes('API key not valid') ||
      msg.includes('API_KEY_INVALID') ||
      msg.includes('INVALID_ARGUMENT');

    return NextResponse.json({
      status: 'error',
      latencyMs: latency,
      message: isApiKeyError
        ? 'Invalid Gemini API Key.'
        : msg || 'Failed to connect to Gemini AI.',
      details: isApiKeyError
        ? 'Your GEMINI_API_KEY in .env is invalid. Update it with a key from https://aistudio.google.com/.'
        : 'Ensure your internet connection and API quota are active.',
    });
  }
}
