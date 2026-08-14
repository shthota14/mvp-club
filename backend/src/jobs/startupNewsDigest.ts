import { refreshStartupNews } from '../utils/startupNewsFeed';

// Daily refresh of the "Early-Stage Funding News" widget on the Community
// page. Fetches real angel/pre-seed/seed funding headlines (Google News
// RSS), curates them with the local Ollama model, and stores the result —
// see backend/src/utils/startupNewsFeed.ts for the full pipeline.
export async function runStartupNewsDigest(): Promise<void> {
  console.log('[startupNewsDigest] Starting daily startup news refresh...');
  try {
    const { fetched, kept, stored } = await refreshStartupNews();
    console.log(`[startupNewsDigest] Fetched ${fetched} candidate headlines, kept ${kept} after AI curation, stored ${stored}.`);
  } catch (err) {
    console.error('[startupNewsDigest] Job failed:', err);
  }
}
