import axios from 'axios';
import { query } from '../db';

// ── Early-Stage Funding News feed ───────────────────────────────────────────
// Fetches REAL headlines from Google News RSS (free, no API key) about
// angel/pre-seed/seed funding rounds, then uses the local Ollama model
// (same self-hosted setup as aiQuestionCheck.ts) to (a) drop anything that
// isn't genuinely an early-stage funding story and (b) rephrase the headline
// in its own words. The UI shows the rephrased headline only — no outbound
// link to the source site, just a plain-text attribution (source name). The
// AI never invents facts, only rewrites real, live-fetched headlines. If
// Ollama is unreachable the job still stores the real (unrephrased) headline
// rather than producing nothing.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const NEWS_QUERY = '"angel round" OR "pre-seed" OR "seed round" OR "seed funding" startup';
const RSS_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(NEWS_QUERY)}&hl=en-US&gl=US&ceid=US:en`;

// Headlines matching any of these are almost certainly NOT an early-stage
// funding announcement, even if they slipped through the search query —
// drop them before even bothering the AI curation step.
const EXCLUDE_PATTERNS = /series [b-z]\b|ipo\b|acqui(re|sition)|layoff|bankrupt|ceo (steps down|resigns|fired)/i;
const INCLUDE_HINT = /angel|pre-seed|preseed|seed (round|funding|raise)|raises?\s+\$|\$[\d.]+\s?(m|million|k)\b.*(round|raise|funding)/i;

export interface CandidateNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

export interface CuratedNewsItem extends CandidateNewsItem {
  headline: string; // AI-rephrased version of title; falls back to the raw title if rephrasing failed
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}

// ── Step 1: fetch + parse real RSS headlines ────────────────────────────────
export async function fetchCandidateNews(): Promise<CandidateNewsItem[]> {
  const res = await axios.get(RSS_URL, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MVPClubNewsBot/1.0)' },
  });

  const xml: string = res.data;
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  const items: CandidateNewsItem[] = [];
  for (const block of itemBlocks) {
    const rawTitle = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractTag(block, 'source') || 'Unknown source';
    if (!rawTitle || !link) continue;

    // Google News titles are usually "Headline - Source" — strip the
    // trailing " - Source" now that we have the source separately.
    const title = source && rawTitle.endsWith(` - ${source}`)
      ? rawTitle.slice(0, -(` - ${source}`.length)).trim()
      : rawTitle;

    if (EXCLUDE_PATTERNS.test(title)) continue;
    if (!INCLUDE_HINT.test(title)) continue;

    items.push({
      title,
      url: link,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }

  // Dedupe by title (Google News often surfaces the same story from several
  // syndicating outlets) — keep the first (most relevant-ranked) occurrence.
  const seen = new Set<string>();
  return items.filter(it => {
    const key = it.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

// ── Step 2: AI curation — filter + rephrase, never invents new headlines ───
export async function curateWithAI(candidates: CandidateNewsItem[]): Promise<CuratedNewsItem[]> {
  if (candidates.length === 0) return [];

  const listText = candidates
    .map((c, i) => `${i + 1}. "${c.title}" — ${c.source}`)
    .join('\n');

  const systemPrompt = `You are curating a feed of REAL early-stage startup funding news (angel rounds, pre-seed, seed rounds) for a community of first-time founders. You will get a numbered list of real news headlines with their source — never invent new ones. For each, decide if it genuinely reports a specific angel/pre-seed/seed funding round for a startup. Exclude: later-stage rounds (Series A or beyond), acquisitions, IPOs, layoffs, general startup advice/opinion pieces, or anything not about one specific funding event.

For each headline you keep, rephrase it in your own words — same facts (company, amount, round type), roughly the same length, plain and factual. Do not add facts the original headline doesn't support, and don't editorialize.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"keep": [{"index": <1-based number from the list>, "headline": "<your rephrased version of that headline>"}]}
Omit any index you would exclude. If none qualify, return {"keep": []}.`;

  try {
    const res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: listText },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 60000 }
    );

    const text: string = res.data?.message?.content || '';
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const keep: { index: number; headline: string }[] = Array.isArray(parsed?.keep) ? parsed.keep : [];

    const curated: CuratedNewsItem[] = [];
    for (const k of keep) {
      const c = candidates[k.index - 1];
      if (!c) continue;
      const headline = typeof k.headline === 'string' && k.headline.trim() ? k.headline.trim() : c.title;
      curated.push({ ...c, headline });
    }
    return curated;
  } catch (err) {
    // Ollama unreachable or bad response — fall back to the keyword-filtered
    // real headlines as-is (unrephrased), rather than losing the feature.
    console.error('[startupNewsFeed] AI curation failed, falling back to unrephrased headlines:', err);
    return candidates.map(c => ({ ...c, headline: c.title }));
  }
}

// ── Step 3: persist ──────────────────────────────────────────────────────────
export async function storeNewsItems(items: CuratedNewsItem[]): Promise<number> {
  let stored = 0;
  for (const item of items) {
    try {
      await query(
        `INSERT INTO startup_news_items (title, url, source, headline, published_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (url) DO UPDATE SET
           headline = COALESCE(EXCLUDED.headline, startup_news_items.headline),
           fetched_at = NOW()`,
        [item.title, item.url, item.source, item.headline, item.publishedAt]
      );
      stored++;
    } catch (err) {
      console.error('[startupNewsFeed] Failed to store item:', item.url, err);
    }
  }

  // Keep the table small — prune anything older than 45 days beyond the
  // most recent 100 rows.
  await query(
    `DELETE FROM startup_news_items
     WHERE id NOT IN (SELECT id FROM startup_news_items ORDER BY fetched_at DESC LIMIT 100)
        OR fetched_at < NOW() - INTERVAL '45 days'`
  );

  return stored;
}

export async function refreshStartupNews(): Promise<{ fetched: number; kept: number; stored: number }> {
  const candidates = await fetchCandidateNews();
  const curated = await curateWithAI(candidates);
  const stored = await storeNewsItems(curated);
  return { fetched: candidates.length, kept: curated.length, stored };
}
