import { query } from '../db';

// Nightly rollup for the analytics_events / analytics_daily_agg pair (see
// migrate-all.sql for the schema comment). For every day before today,
// upsert its aggregate counts into analytics_daily_agg — this is what lets
// "all-time" totals survive after raw rows get purged — then delete raw
// rows older than 90 days. Idempotent: safe to re-run, re-aggregating a day
// just overwrites that day's row with the same numbers.
export async function runAnalyticsRollup(): Promise<void> {
  console.log('[analyticsRollup] Starting analytics rollup...');
  try {
    await query(`
      INSERT INTO analytics_daily_agg (day, path, event_type, link_label, unique_visitors, total_events)
      SELECT
        date_trunc('day', created_at)::date AS day,
        path,
        event_type,
        COALESCE(link_label, '') AS link_label,
        COUNT(DISTINCT visitor_hash) AS unique_visitors,
        COUNT(*) AS total_events
      FROM analytics_events
      WHERE created_at < date_trunc('day', now())
      GROUP BY 1, 2, 3, 4
      ON CONFLICT (day, path, event_type, link_label)
      DO UPDATE SET unique_visitors = EXCLUDED.unique_visitors, total_events = EXCLUDED.total_events
    `);

    const purged = await query(`DELETE FROM analytics_events WHERE created_at < now() - interval '90 days'`);
    console.log(`[analyticsRollup] Rolled up prior days, purged ${purged.rowCount ?? 0} raw row(s) older than 90 days.`);
  } catch (err) {
    console.error('[analyticsRollup] Failed:', err);
  }
}
