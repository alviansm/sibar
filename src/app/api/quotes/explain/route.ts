import { NextResponse } from 'next/server';
import { explainQuoteWithAI, QuoteExplanationResult } from '@/lib/gemini';

// In-memory cache for quote explanations within the server lifetime
const explanationCache = new Map<string, QuoteExplanationResult>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quote, author, modelName } = body || {};

    if (!quote || typeof quote !== 'string' || quote.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quote text is required.' },
        { status: 400 }
      );
    }

    const trimmedQuote = quote.trim();
    const trimmedAuthor = (author && typeof author === 'string') ? author.trim() : 'Unknown Author';
    const cacheKey = `${trimmedAuthor}:${trimmedQuote}`.toLowerCase();

    // Check cache
    if (explanationCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        explanation: explanationCache.get(cacheKey),
        cached: true,
      });
    }

    // Call Gemini API
    const explanation = await explainQuoteWithAI(trimmedQuote, trimmedAuthor, modelName || 'gemini-3.6-flash');

    // Store in cache
    explanationCache.set(cacheKey, explanation);

    return NextResponse.json({
      success: true,
      explanation,
      cached: false,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to generate AI quote explanation.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
