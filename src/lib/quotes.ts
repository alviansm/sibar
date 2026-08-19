import localQuotes from '@/data/quotes.json';

export interface MotivationalQuote {
  quote: string;
  author: string;
  category?: string;
  source: 'api_ninjas' | 'local_fallback';
  refreshedAt: number;
}

export type QuoteInterval = 'hourly' | 'daily' | 'always';

/**
 * Generates a deterministic integer index from a seed string (e.g. "2026-08-18-14")
 */
function getDeterministicIndex(seedStr: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % length;
}

/**
 * Gets a seed string based on the requested interval.
 */
export function getIntervalSeed(interval: QuoteInterval): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');

  if (interval === 'daily') {
    return `${year}-${month}-${day}`;
  }
  if (interval === 'hourly') {
    return `${year}-${month}-${day}-${hour}`;
  }
  // 'always'
  return `${Date.now()}-${Math.random()}`;
}

/**
 * Get local fallback quote deterministically or randomly.
 */
export function getLocalFallbackQuote(seedStr?: string): MotivationalQuote {
  const total = localQuotes.length;
  let selectedIndex = 0;

  if (seedStr && !seedStr.includes(Date.now().toString())) {
    selectedIndex = getDeterministicIndex(seedStr, total);
  } else {
    selectedIndex = Math.floor(Math.random() * total);
  }

  const selected = localQuotes[selectedIndex];
  return {
    quote: selected.quote,
    author: selected.author,
    category: selected.category,
    source: 'local_fallback',
    refreshedAt: Date.now(),
  };
}

/**
 * Fetches quote from API Ninjas with fallback to 50 local quotes.
 */
export async function getMotivationalQuote(
  interval: QuoteInterval = 'hourly',
  category: string = 'inspirational',
  forceRefresh: boolean = false
): Promise<MotivationalQuote> {
  const apiKey = process.env.NINJAS_API_KEY;
  const seed = forceRefresh ? `${Date.now()}-${Math.random()}` : getIntervalSeed(interval);

  if (!apiKey || apiKey.trim().length === 0) {
    return getLocalFallbackQuote(seed);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const validCategory = category || 'inspirational';
    const response = await fetch(
      `https://api.api-ninjas.com/v1/quotes?category=${encodeURIComponent(validCategory)}`,
      {
        headers: {
          'X-Api-Key': apiKey.trim(),
        },
        signal: controller.signal,
        next: { revalidate: interval === 'daily' ? 86400 : interval === 'hourly' ? 3600 : 0 },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`API Ninjas returned status ${response.status}. Using local fallback quote.`);
      return getLocalFallbackQuote(seed);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].quote) {
      return {
        quote: data[0].quote,
        author: data[0].author || 'Unknown',
        category: data[0].category || validCategory,
        source: 'api_ninjas',
        refreshedAt: Date.now(),
      };
    }

    return getLocalFallbackQuote(seed);
  } catch (err) {
    console.warn('API Ninjas request failed or timed out. Falling back to local quote.', err);
    return getLocalFallbackQuote(seed);
  }
}
