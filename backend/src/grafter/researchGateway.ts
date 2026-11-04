import axios from 'axios';
import { query } from '../db';

// ── research-gateway ─────────────────────────────────────────────────────────
//
// The one place Grafter is allowed to reach the open web from. Per the
// architecture review's Finding 3/7 recommendation, this stays a plain
// module (not its own container/service) for now -- the container boundary
// only earns itself once there's real egress/rate-limit policy to enforce,
// which Sprint 2's GRF-17 stands up properly. Until then, every Grafter
// fetch still goes through this one function so that boundary is easy to
// find and to harden later without touching call sites.
//
// What this does today (GRF-6's scope, no more):
//   - never lets a caller do a direct axios/fetch of a founder's site
//   - checks robots.txt before fetching (best-effort, User-agent: * only)
//   - caches by URL so the same page is never fetched twice in a row
//
// GRF-17 adds per-domain rate limiting on top of Sprint 1's caching and
// robots.txt check: no two fetches to the same host happen closer together
// than MIN_DOMAIN_INTERVAL_MS, queueing later callers rather than dropping
// them. This is in-memory and per-process -- fine for a single backend
// process and a single grafter-worker process today; if this ever runs as
// multiple replicas, the limiter needs to move to Postgres/Redis to stay
// correct across processes. A dedicated cache TTL policy beyond the one
// constant below, and a real distributed queue, are still not built.

const USER_AGENT = 'MVPClubGrafterBot/1.0 (+https://mvpclub.io; research-gateway)';
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h -- long enough to avoid refetching within one session
const MAX_CONTENT_CHARS = 200_000; // a founder's homepage HTML, generously capped
const MIN_DOMAIN_INTERVAL_MS = 2000; // GRF-17: never hit the same host more than once every 2s

// GRF-17: per-domain rate limiting. Keyed by hostname, holds a promise chain
// so concurrent fetches to the same domain queue up behind each other instead
// of racing -- each caller awaits the previous one finishing (or its own
// wait, whichever is later) before it's allowed to proceed.
const domainGate = new Map<string, Promise<void>>();

async function waitForDomainSlot(host: string): Promise<void> {
  const previous = domainGate.get(host) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>(resolve => { release = resolve; });
  domainGate.set(host, previous.then(() => next));
  await previous;
  setTimeout(release, MIN_DOMAIN_INTERVAL_MS);
}

export interface FetchResult {
  ok: boolean;
  cached: boolean;
  content?: string;
  contentType?: string;
  statusCode?: number;
  error?: string;
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function isAllowedByRobots(url: URL): Promise<boolean> {
  try {
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const res = await axios.get(robotsUrl, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: () => true,
    });
    if (res.status >= 400) return true; // no robots.txt = allowed
    const lines: string[] = String(res.data).split('\n').map(l => l.trim());
    let inWildcardGroup = false;
    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) { inWildcardGroup = true; continue; }
      if (/^user-agent:/i.test(line)) { inWildcardGroup = false; continue; }
      if (inWildcardGroup && /^disallow:\s*\/\s*$/i.test(line)) return false;
    }
    return true;
  } catch {
    return true; // best-effort -- a robots.txt fetch failure never blocks the real fetch
  }
}

async function readCache(url: string): Promise<FetchResult | null> {
  const result = await query<{
    content: string | null; content_type: string | null; status_code: number | null;
    error: string | null; fetched_at: string;
  }>('SELECT content, content_type, status_code, error, fetched_at FROM grafter_fetch_cache WHERE url = $1', [url]);
  const row = result.rows[0];
  if (!row) return null;
  const age = Date.now() - new Date(row.fetched_at).getTime();
  if (age > CACHE_TTL_MS) return null;
  if (row.error) return { ok: false, cached: true, error: row.error };
  return {
    ok: true,
    cached: true,
    content: row.content ?? undefined,
    contentType: row.content_type ?? undefined,
    statusCode: row.status_code ?? undefined,
  };
}

async function writeCache(url: string, data: {
  content?: string; contentType?: string; statusCode?: number; error?: string;
}): Promise<void> {
  await query(
    `INSERT INTO grafter_fetch_cache (url, status_code, content, content_type, error, fetched_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (url) DO UPDATE SET
       status_code = EXCLUDED.status_code, content = EXCLUDED.content,
       content_type = EXCLUDED.content_type, error = EXCLUDED.error, fetched_at = NOW()`,
    [url, data.statusCode ?? null, data.content ?? null, data.contentType ?? null, data.error ?? null]
  );
}

// Fetch a URL through research-gateway. This is the ONLY function any
// Grafter code should call to reach the open web -- never axios/fetch
// directly against a founder-supplied URL.
export async function fetchUrl(rawUrl: string): Promise<FetchResult> {
  const url = normalizeUrl(rawUrl);
  const cached = await readCache(url);
  if (cached) return cached;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    const result: FetchResult = { ok: false, cached: false, error: 'Not a valid URL' };
    await writeCache(url, { error: result.error });
    return result;
  }

  const allowed = await isAllowedByRobots(parsed);
  if (!allowed) {
    const result: FetchResult = { ok: false, cached: false, error: 'Disallowed by robots.txt' };
    await writeCache(url, { error: result.error });
    return result;
  }

  await waitForDomainSlot(parsed.host);

  try {
    const res = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const content = typeof res.data === 'string' ? res.data.slice(0, MAX_CONTENT_CHARS) : JSON.stringify(res.data).slice(0, MAX_CONTENT_CHARS);
    const contentType = String(res.headers['content-type'] ?? '');
    if (res.status >= 400) {
      const result: FetchResult = { ok: false, cached: false, statusCode: res.status, error: `Site returned ${res.status}` };
      await writeCache(url, { statusCode: res.status, error: result.error });
      return result;
    }
    await writeCache(url, { statusCode: res.status, content, contentType });
    return { ok: true, cached: false, content, contentType, statusCode: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    await writeCache(url, { error: message });
    return { ok: false, cached: false, error: message };
  }
}

// ── grafter_run logging ──────────────────────────────────────────────────────
//
// Wraps a Grafter job so every one of them writes a grafter_run row, per the
// PRD's Definition of Done ("any background job it adds writes to
// grafter_run"). Sprint 1 runs these inline (no worker/queue yet -- see the
// PRD's Milestones table for Stage 1), so this just brackets a start/finish
// row rather than claiming work off a queue.
export async function runGrafterJob<T>(
  ideaId: string,
  kind: string,
  input: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const insert = await query<{ id: string }>(
    `INSERT INTO grafter_run (idea_id, kind, status, input) VALUES ($1, $2, 'running', $3) RETURNING id`,
    [ideaId, kind, JSON.stringify(input)]
  );
  const runId = insert.rows[0].id;
  try {
    const output = await fn();
    await query(
      `UPDATE grafter_run SET status = 'done', output = $2, finished_at = NOW() WHERE id = $1`,
      [runId, JSON.stringify(output ?? {})]
    );
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed';
    await query(
      `UPDATE grafter_run SET status = 'failed', error = $2, finished_at = NOW() WHERE id = $1`,
      [runId, message]
    );
    throw err;
  }
}
