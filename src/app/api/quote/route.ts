import { NextResponse } from 'next/server';
import { getMotivationalQuote, QuoteInterval } from '@/lib/quotes';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();

    const intervalParam = (searchParams.get('interval') || user?.quoteRefreshInterval || 'hourly') as QuoteInterval;
    const categoryParam = searchParams.get('category') || user?.quoteCategory || 'inspirational';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const quote = await getMotivationalQuote(intervalParam, categoryParam, forceRefresh);
    const hasApiKey = Boolean(process.env.NINJAS_API_KEY && process.env.NINJAS_API_KEY.trim().length > 0);

    return NextResponse.json({
      success: true,
      quote,
      hasApiKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve motivational quote.' },
      { status: 500 }
    );
  }
}
