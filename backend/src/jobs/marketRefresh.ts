import { refreshMarketCaches } from '../routes/insightsMarket';
import { refreshSocialPosts } from '../routes/insightsSocial';

// Scheduled refresh of the public market insights (Hacker News, GitHub,
// Y Combinator directory, SEC Form D) — every 4 hours, plus once shortly
// after boot so the first visitor never waits. The route caches are sized
// to outlive the schedule, so between runs every visitor gets the same
// snapshot and the page can say exactly when it was last refreshed.
//
// Ranges warmed: 30 (home page + social feed), 90 (Insights default),
// 180, 365. The GitHub adoption curve is paced (rate-limited search API)
// and refreshed last. Each step is isolated: one source failing never
// blocks the others.

export async function runMarketRefresh(reason = 'scheduled'): Promise<void> {
  const started = Date.now();
  console.log(`[marketRefresh] start (${reason})`);
  const results = await refreshMarketCaches([30, 90, 180, 365]);
  for (const r of results) console.log(`[marketRefresh] range=${r.range} ${r.ok ? 'ok' : 'FAILED: ' + r.error} (${r.ms} ms)`);
  try { await refreshSocialPosts(); console.log('[marketRefresh] social posts regenerated'); }
  catch (err) { console.error('[marketRefresh] social posts failed:', err); }
  console.log(`[marketRefresh] done in ${Math.round((Date.now() - started) / 1000)}s`);
}
