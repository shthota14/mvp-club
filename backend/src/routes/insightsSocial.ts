import { Router, Request, Response } from 'express';
import { getMarketPayload } from './insightsMarket';

const router = Router();

// Social feed built from the public market insights.
//
//   GET /api/public/insights/social            → JSON list of ready-to-post items
//   GET /api/public/insights/social/rss        → RSS 2.0 (Buffer, Zapier, IFTTT, Hootsuite can auto-post from it)
//   GET /api/public/insights/social/card/:id.svg?size=landscape|square|story
//                                              → share-card image for the item
//
// Every post is generated from live, external, public data (Hacker News,
// GitHub, Y Combinator directory, SEC EDGAR) and names its source. Numbers
// are the same ones shown on /insights, so a post can always be checked.
// Nothing here uses MVP Club member data.

const SITE = (process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://mvpclub.io').replace(/\/$/, '');
const API = (process.env.PUBLIC_API_URL || SITE).replace(/\/$/, '');
const HASHTAGS = ['#startups', '#SaaS', '#founders', '#buildinpublic', '#indiehackers'];
const CTA = `Live every day → ${SITE}/insights`;

const fmt = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const weekLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export type SocialPost = {
  id: string; slug: string; kind: 'stat' | 'quote' | 'ranking';
  stat: string; headline: string; sub: string; caption: string; hashtags: string[];
  source: string; sourceUrl: string; cardUrl: string; cardSquareUrl: string; cardStoryUrl: string; link: string;
  accent: 'lime' | 'violet' | 'sky' | 'amber' | 'rose';
  generatedAt: string;
};

function lastFullWeek<T>(arr: T[] | undefined): T | undefined { return arr && arr.length >= 2 ? arr[arr.length - 2] : arr?.[arr.length - 1]; }

export async function buildPosts(): Promise<{ generatedAt: string; posts: SocialPost[] }> {
  const m = await getMarketPayload(30);
  const hn = m.hackerNews as any, gh = m.github as any, yc = m.ycombinator as any, sec = m.secFormD as any;
  const posts: Omit<SocialPost, 'cardUrl' | 'cardSquareUrl' | 'cardStoryUrl' | 'generatedAt' | 'link'>[] = [];
  const week = lastFullWeek(m.weeks) ?? m.weeks[m.weeks.length - 1];

  if (hn?.kind === 'live') {
    const launches = lastFullWeek<number>(hn.weekly?.[0]?.values) ?? 0;
    const ai = lastFullWeek<number>(hn.weekly?.[1]?.values) ?? 0;
    if (launches) posts.push({
      id: 'hn-weekly', slug: 'launches-this-week', kind: 'stat', accent: 'lime',
      stat: fmt(launches), headline: 'products launched on Hacker News last week',
      sub: `${launches ? Math.round((ai / launches) * 100) : 0}% of them were AI products · week of ${weekLabel(week)}`,
      caption: `${fmt(launches)} products launched on Hacker News last week. ${launches ? Math.round((ai / launches) * 100) : 0}% were AI.\n\nThat's the field you're launching into. Build something people actually asked for.\n\n${CTA}`,
      hashtags: HASHTAGS, source: 'Hacker News · Show HN', sourceUrl: 'https://news.ycombinator.com/show',
    });
    const hist: { label: string; count: number }[] = hn.pointsHist ?? [];
    const total = hist.reduce((s, b) => s + b.count, 0);
    const fifty = hist.filter(b => ['50–99', '100–299', '300+'].includes(b.label)).reduce((s, b) => s + b.count, 0);
    if (total) posts.push({
      id: 'hn-upvotes', slug: 'launch-attention', kind: 'stat', accent: 'amber',
      stat: `${Math.round((fifty / total) * 100)}%`, headline: 'of Show HN launches get 50+ upvotes',
      sub: `${fmt(total)} launches in the last 30 days · most get fewer than 5`,
      caption: `Only ${Math.round((fifty / total) * 100)}% of the ${fmt(total)} products launched on Hacker News in the last 30 days got 50+ upvotes.\n\nLaunching is the start of distribution, not the end of it.\n\n${CTA}`,
      hashtags: HASHTAGS, source: 'Hacker News · Show HN', sourceUrl: 'https://news.ycombinator.com/show',
    });
    const cats: { key: string; label: string; count: number }[] = (hn.categories ?? []).filter((c: any) => c.key !== 'other');
    if (cats[0]) posts.push({
      id: 'hn-category', slug: 'hottest-category', kind: 'ranking', accent: 'violet',
      stat: cats[0].label, headline: 'is the most launched category this month',
      sub: cats.slice(0, 4).map(c => `${c.label} ${fmt(c.count)}`).join(' · '),
      caption: `Most launched on Hacker News this month:\n${cats.slice(0, 5).map((c, i) => `${i + 1}. ${c.label} — ${fmt(c.count)}`).join('\n')}\n\nIf you're building in #1, expect company. Find the gap.\n\n${CTA}`,
      hashtags: HASHTAGS, source: 'Hacker News · Show HN', sourceUrl: 'https://news.ycombinator.com/show',
    });
    const wd: { label: string; count: number }[] = hn.byWeekday ?? [];
    const best = [...wd].sort((a, b) => b.count - a.count)[0];
    if (best) posts.push({
      id: 'hn-weekday', slug: 'best-launch-day', kind: 'stat', accent: 'sky',
      stat: best.label, headline: 'is the busiest launch day on Hacker News',
      sub: wd.map(d => `${d.label} ${fmt(d.count)}`).join(' · '),
      caption: `Founders launch most on a ${{ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[best.label as string] ?? best.label}. Weekends are the quietest — and the least crowded.\n\n${CTA}`,
      hashtags: HASHTAGS, source: 'Hacker News · Show HN', sourceUrl: 'https://news.ycombinator.com/show',
    });
    const q = hn.founderQuestions?.[0];
    if (q) posts.push({
      id: 'hn-question', slug: 'founders-are-asking', kind: 'quote', accent: 'rose',
      stat: '“' + String(q.title).replace(/^ask hn:?\s*/i, '') + '”', headline: 'asked on Hacker News this month',
      sub: `${fmt(q.comments)} replies · ${fmt(q.points)} upvotes`,
      caption: `A founder asked on Hacker News: "${String(q.title).replace(/^ask hn:?\s*/i, '')}"\n\n${fmt(q.comments)} people replied. It's the question every early founder has.\n\nMVP Club answers it one step at a time.\n\n${CTA}`,
      hashtags: HASHTAGS, source: 'Hacker News · Ask HN', sourceUrl: q.hnUrl,
    });
  }
  if (yc?.kind === 'live' && yc.batches?.[0]) {
    const b = yc.batches[0];
    posts.push({
      id: 'yc-batch', slug: 'yc-latest-batch', kind: 'stat', accent: 'lime',
      stat: `${b.aiShare}%`, headline: `of YC's ${b.label} batch is AI-related`,
      sub: `${fmt(b.companies)} companies · ${fmt(b.ukOrEurope)} from the UK & Europe`,
      caption: `${b.aiShare}% of Y Combinator's ${b.label} batch (${fmt(b.companies)} companies) is AI-related. ${fmt(b.ukOrEurope)} are from the UK and Europe.\n\nThe bar is where everyone is building. The opportunity is where they aren't.\n\n${CTA}`,
      hashtags: [...HASHTAGS, '#YCombinator'], source: 'Y Combinator directory', sourceUrl: 'https://www.ycombinator.com/companies',
    });
  }
  if (gh?.kind === 'live' && gh.topics?.length) {
    const t = [...gh.topics].sort((a: any, b: any) => b.total - a.total)[0];
    posts.push({
      id: 'gh-topic', slug: 'github-hottest-topic', kind: 'stat', accent: 'sky',
      stat: fmt(t.total), headline: `new "${t.label}" repos on GitHub in 30 days`,
      sub: gh.topics.map((x: any) => `${x.label} ${fmt(x.total)}`).join(' · '),
      caption: `${fmt(t.total)} new "${t.label}" repositories appeared on GitHub in the last 30 days.\n\nThe tooling is free. The moat is knowing who you're building for.\n\n${CTA}`,
      hashtags: [...HASHTAGS, '#opensource'], source: 'GitHub', sourceUrl: 'https://github.com/search',
    });
  }
  if (sec?.kind === 'live') {
    const n = lastFullWeek<number>(sec.weekly?.[0]?.values) ?? 0;
    if (n) posts.push({
      id: 'sec-formd', slug: 'funding-pulse', kind: 'stat', accent: 'amber',
      stat: fmt(n), headline: 'US startup financings filed with the SEC last week',
      sub: 'Form D filings — seed rounds, SAFEs, Series A and beyond',
      caption: `${fmt(n)} private financings (Form D) were filed with the SEC last week — seed rounds, SAFEs, Series A.\n\nMoney is moving. Most of it goes to founders who validated first.\n\n${CTA}`,
      hashtags: [...HASHTAGS, '#fundraising'], source: 'SEC EDGAR', sourceUrl: 'https://www.sec.gov/edgar/search/#/forms=D',
    });
  }

  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    posts: posts.map(p => ({ ...p, generatedAt, link: `${SITE}/insights`, cardUrl: `${API}/api/public/insights/social/card/${p.id}.svg`, cardSquareUrl: `${API}/api/public/insights/social/card/${p.id}.svg?size=square`, cardStoryUrl: `${API}/api/public/insights/social/card/${p.id}.svg?size=story` })),
  };
}

// ── Share card (SVG) ─────────────────────────────────────────────────────────
const ACCENT: Record<SocialPost['accent'], string> = { lime: '#d6ff3d', violet: '#a78bfa', sky: '#38bdf8', amber: '#fbbf24', rose: '#fb7185' };

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const kept = lines.slice(0, maxLines); kept[maxLines - 1] = kept[maxLines - 1].replace(/\s+\S*$/, '') + '…'; return kept; }
  return lines;
}

export function renderCard(p: SocialPost, size: 'landscape' | 'square' | 'story' = 'landscape'): string {
  const W = size === 'landscape' ? 1200 : 1080, H = size === 'landscape' ? 630 : size === 'square' ? 1080 : 1920;
  const a = ACCENT[p.accent];
  const pad = 72;
  const isQuote = p.kind === 'quote' || p.stat.length > 14;
  const statSize = isQuote ? (size === 'landscape' ? 44 : 56) : (size === 'landscape' ? 150 : 190);
  const statLines = isQuote ? wrap(p.stat, size === 'landscape' ? 44 : 32, 3) : [p.stat];
  const headLines = wrap(p.headline, size === 'landscape' ? 48 : 34, 3);
  const subLines = wrap(p.sub, size === 'landscape' ? 80 : 54, 2);
  const top = size === 'story' ? H * 0.28 : pad + 60;
  let y = top;
  const statSvg = statLines.map(l => { const t = `<text x="${pad}" y="${y + statSize * 0.8}" font-family="'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif" font-size="${statSize}" font-weight="800" letter-spacing="${isQuote ? -1 : -6}" fill="${a}">${esc(l)}</text>`; y += statSize * (isQuote ? 1.15 : 1.0); return t; }).join('');
  y += isQuote ? 24 : 18;
  const headSize = size === 'landscape' ? 40 : 48;
  const headSvg = headLines.map(l => { const t = `<text x="${pad}" y="${y + headSize * 0.8}" font-family="'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif" font-size="${headSize}" font-weight="700" letter-spacing="-1" fill="#f5f2ff">${esc(l)}</text>`; y += headSize * 1.2; return t; }).join('');
  y += 18;
  const subSize = size === 'landscape' ? 22 : 26;
  const subSvg = subLines.map(l => { const t = `<text x="${pad}" y="${y + subSize * 0.8}" font-family="'JetBrains Mono', Menlo, monospace" font-size="${subSize}" fill="#8f86a3">${esc(l)}</text>`; y += subSize * 1.5; return t; }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g1" cx="15%" cy="10%" r="70%"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.45"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="90%" cy="85%" r="60%"><stop offset="0%" stop-color="${a}" stop-opacity="0.22"/><stop offset="100%" stop-color="${a}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0f0c15"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  ${Array.from({ length: 40 }, (_, i) => { const sx = ((i * 7919) % W), sy = ((i * 104729) % H); const r = 1 + (i % 3) * 0.7; return `<circle cx="${sx}" cy="${sy}" r="${r}" fill="${i % 4 === 0 ? a : '#ffffff'}" opacity="${0.15 + (i % 5) * 0.08}"/>`; }).join('')}
  <g>
    <text x="${pad}" y="${pad + 8}" font-family="'JetBrains Mono', Menlo, monospace" font-size="18" letter-spacing="4" fill="${a}">MARKET PULSE · ${esc(p.source.toUpperCase())}</text>
  </g>
  ${statSvg}${headSvg}${subSvg}
  <g>
    <text x="${pad}" y="${H - pad - 14}" font-family="'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="-1" fill="#f5f2ff">MVP<tspan font-weight="300" letter-spacing="4" fill="#c9c0da"> CLUB</tspan></text>
    <text x="${W - pad}" y="${H - pad - 14}" text-anchor="end" font-family="'JetBrains Mono', Menlo, monospace" font-size="18" letter-spacing="2" fill="#8f86a3">${esc(SITE.replace(/^https?:\/\//, ''))}/insights</text>
  </g>
  <rect x="${pad}" y="${H - pad + 10}" width="${W - pad * 2}" height="4" rx="2" fill="${a}" opacity="0.8"/>
</svg>`;
}

let postCache: { at: number; value: Awaited<ReturnType<typeof buildPosts>> } | null = null;
async function getPosts() {
  if (postCache && Date.now() - postCache.at < 4.5 * 60 * 60 * 1000) return postCache.value;
  const value = await buildPosts(); postCache = { at: Date.now(), value }; return value;
}
// Called by the scheduled market refresh so posts always reflect the latest snapshot.
export async function refreshSocialPosts() { const value = await buildPosts(); postCache = { at: Date.now(), value }; return value; }

router.get('/', async (_req: Request, res: Response) => {
  try { res.setHeader('Cache-Control', 'public, max-age=600'); res.json(await getPosts()); }
  catch (err) { console.error('[insights/social]', err); res.status(503).json({ error: 'Social feed is temporarily unavailable' }); }
});

router.get('/rss', async (_req: Request, res: Response) => {
  try {
    const { posts, generatedAt } = await getPosts();
    const items = posts.map(p => `
    <item>
      <title>${esc(`${p.stat} ${p.headline}`)}</title>
      <link>${esc(p.link)}</link>
      <guid isPermaLink="false">mvpclub-insight-${p.id}-${generatedAt.slice(0, 10)}</guid>
      <pubDate>${new Date(generatedAt).toUTCString()}</pubDate>
      <description>${esc(p.caption + '\n\n' + p.hashtags.join(' '))}</description>
      <enclosure url="${esc(p.cardUrl)}" type="image/svg+xml" length="0"/>
      <media:content url="${esc(p.cardUrl)}" type="image/svg+xml" medium="image"/>
      <source url="${esc(p.sourceUrl)}">${esc(p.source)}</source>
    </item>`).join('');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MVP Club — Market Pulse</title>
    <link>${esc(SITE)}/insights</link>
    <atom:link href="${esc(API)}/api/public/insights/social/rss" rel="self" type="application/rss+xml"/>
    <description>Daily startup-market signals from public sources — Hacker News, GitHub, Y Combinator, SEC — ready to post.</description>
    <language>en-gb</language>
    <lastBuildDate>${new Date(generatedAt).toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`);
  } catch (err) { console.error('[insights/social/rss]', err); res.status(503).send('unavailable'); }
});

router.get('/card/:id.svg', async (req: Request, res: Response) => {
  try {
    const { posts } = await getPosts();
    const p = posts.find(x => x.id === req.params.id);
    if (!p) { res.status(404).send('not found'); return; }
    const size = req.query.size === 'square' ? 'square' : req.query.size === 'story' ? 'story' : 'landscape';
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(renderCard(p, size));
  } catch (err) { console.error('[insights/social/card]', err); res.status(503).send('unavailable'); }
});

export default router;
