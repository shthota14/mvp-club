import { Router, Request, Response } from 'express';

const router = Router();

// External "market pulse" signals for /insights — what the wider early-stage
// SaaS world is launching and asking, beside MVP Club's own numbers.
//
// Sources are limited to ones that are free AND whose terms allow this use
// server-side without an agreement:
//   • Hacker News via the Algolia search API (public, no key, documented at
//     https://hn.algolia.com/api). We read Show HN (launches) and Ask HN
//     (founder questions) for the range.
//   • GitHub repository search (public REST API; 10 search req/min
//     unauthenticated, 30/min with GITHUB_TOKEN). Four topic queries per
//     refresh, cached for an hour, so we stay far inside the limit.
// Product Hunt's API forbids commercial use without written approval and
// Reddit requires a commercial data agreement, so both are reported as
// "permission required" and never fetched unless the env flags say otherwise
// (mirrors the gating in the mvpclub-saas-market scaffold).
//
// Everything is aggregated in memory and cached; nothing is written to the
// database, so this endpoint needs no migration. Titles and URLs of public
// posts/repos are passed through with attribution — that is the whole point
// of a "top launches" list — but never any user data from MVP Club.

// The scheduled job (jobs/marketRefresh.ts) rebuilds every 4 hours; the
// cache outlives that so visitors between runs share one snapshot. A cold
// cache (e.g. right after boot, before the warm-up) still builds on demand.
export const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;
const CACHE_TTL_MS = REFRESH_INTERVAL_MS + 30 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();
const UA = 'MVPClubInsights/1.0 (+https://mvpclub.io/insights)';

// ── Classification ───────────────────────────────────────────────────────────
// Keyword taxonomy for titles. Crude but transparent; the UI says so.
const CATEGORIES: { key: string; label: string; re: RegExp }[] = [
  { key: 'ai-agents',   label: 'AI agents & assistants', re: /\b(agent|agentic|copilot|assistant|llm|gpt|claude|gemini|rag|mcp|autonomous)\b/i },
  { key: 'dev-tools',   label: 'Developer tools',        re: /\b(cli|sdk|api|devtool|developer|compiler|debugger|ide|terminal|framework|library|open[- ]?source|rust|typescript|python|go)\b/i },
  { key: 'data-ai-infra', label: 'Data & AI infra',      re: /\b(vector|database|postgres|sql|pipeline|etl|observability|eval|inference|fine[- ]?tun|embedding|gpu)\b/i },
  { key: 'productivity', label: 'Productivity & notes',  re: /\b(notes?|todo|task|calendar|productivity|markdown|writing|email|inbox|focus|habit)\b/i },
  { key: 'sales-marketing', label: 'Sales & marketing',  re: /\b(sales|crm|lead|outreach|seo|marketing|landing page|newsletter|ads?|growth)\b/i },
  { key: 'finance',     label: 'Finance & fintech',      re: /\b(finance|invoice|invoicing|bookkeep|accounting|payment|billing|budget|stock|crypto|tax)\b/i },
  { key: 'vertical',    label: 'Vertical / industry',    re: /\b(health|clinic|patient|medical|legal|law|lawyer|real estate|property|construction|restaurant|logistics|school|teacher|education|farm)\b/i },
  { key: 'media',       label: 'Media & creative',       re: /\b(video|audio|music|podcast|image|photo|design|font|3d|game|art|animation)\b/i },
  { key: 'security',    label: 'Security & privacy',     re: /\b(security|privacy|auth|password|encrypt|vpn|secrets?|compliance|soc ?2)\b/i },
  { key: 'other',       label: 'Everything else',        re: /./ },
];
const AI_RE = /\b(ai|agent|agentic|llm|gpt|claude|gemini|copilot|rag|mcp|machine learning|ml|neural|diffusion|transformer)\b/i;
// Problems startups are SOLVING — applied to YC one-liners and Show HN titles.
const PROBLEMS_SOLVED: { key: string; label: string; re: RegExp }[] = [
  { key: 'physical',   label: 'Physical work: robots, factories, energy, defence',   re: /\b(robot|humanoid|factor(y|ies)|manufactur|hardware|drone|energy|defen[cs]e|construction|logistic|warehouse|satellite|batter(y|ies)|grid|aerospace|mining|shipping|fleet|vehicle|autonomous (truck|car|vehicle)|physical ai|semiconductor|chip)/i },
  { key: 'ai-infra',   label: 'Running AI: inference, training, agent infra, evals',  re: /\b(inference|training|gpu|compute|foundation model|llm|evals?\b|agent (infra|platform|runtime|memory)|memory for|\brag\b|fine-?tun|sandbox|training data|data (pipeline|label)|model (serving|routing)|embedding|vector|benchmark|world model|token)/i },
  { key: 'software',   label: 'Software engineering: coding agents, devtools, testing', re: /\b(developer|coding|\bcode\b|software|engineering|devops|testing|\bqa\b|debug|deploy|sre\b|incident|observability|migrat|legacy|pull request|\bide\b|\bapi|git\b|devbox|cli\b|terminal|open[- ]?source)/i },
  { key: 'backoffice', label: 'Back-office paperwork: compliance, claims, bookkeeping', re: /\b(compliance|back-?office|back-of-house|bookkeep|accounting|invoic|claims?\b|paperwork|billing|audit|tax\b|payroll|procurement|underwrit|reconcil|spreadsheet|operations|\bops\b|admin|workflow|business process|run(s)? (businesses|companies|factories)|\berp\b|debt collection|collections)/i },
  { key: 'fintech',    label: 'Money: payments, banking, lending, insurance',          re: /\b(payment|bank|fintech|lending|loan|credit|wealth|trading|crypto|stablecoin|treasury|insurance|insurer|invest|financ|money)/i },
  { key: 'health',     label: 'Healthcare access & admin',                             re: /\b(health|clinic|patient|medical|telemedicine|hospital|pharma|nurse|therap|physician|doctor|dental|prior auth|care\b|wellness|drug|\bbio|protein|cancer|disease|probiotic)/i },
  { key: 'knowledge',  label: 'Knowledge-worker drudgery: email, meetings, docs, analysis', re: /\b(email|inbox|meeting|notes?\b|documents?|knowledge|search|productivity|assistant|browser|calendar|writing|research|teammate|to-?do|data analyst|spreadsheet)/i },
  { key: 'sales',      label: 'Selling: leads, outreach, GTM, marketing',             re: /\b(sales|leads?\b|outreach|crm|go-?to-?market|gtm|revenue|prospect|marketing|\bads?\b|growth|seo|demand gen|pipeline|brand|customer (acquisition|brain))/i },
  { key: 'support',    label: 'Customer support & voice agents',                       re: /\b(customer (support|service|success|experience)|support\b|call cent|contact cent|voice|receptionist|front desk|helpdesk|phone|calls?\b)/i },
  { key: 'consumer',   label: 'Consumer life: creators, games, dating, personal agents', re: /\b(consumer|dating|social|games?\b|gaming|travel|fitness|shopping|creator|video|music|anime|fans?\b|friends|family|kids|pets?\b|personal)/i },
  { key: 'legal',      label: 'Legal, government & immigration',                       re: /\b(legal|\blaw\b|lawyer|law firm|contract|court|government|\bgov\b|regulat|permit|litigation|immigration|visa|policy)/i },
  { key: 'hiring',     label: 'Hiring, careers & workforce',                           re: /\b(hiring|recruit|talent|\bhr\b|employee|workforce|interview|onboard|staffing|career|jobs?\b|workers?\b)/i },
  { key: 'property',   label: 'Property, housing & rentals',                           re: /\b(housing|real estate|property|homes?\b|homeowner|\brent|rental|mortgage|landlord|tenant)/i },
  { key: 'security',   label: 'Security, fraud & identity',                            re: /\b(security|fraud|identity|cyber|threat|privacy|secrets?\b|scam)/i },
  { key: 'education',  label: 'Education & learning',                                  re: /\b(learn|education|student|tutor|school|teach|course)/i },
];

// Problems founders are FACING — applied to Ask HN titles.
const PROBLEMS_FACED: { key: string; label: string; re: RegExp }[] = [
  { key: 'distribution', label: 'Finding first customers & getting distribution', re: /\b(first (customers?|users?|100|1000|sale)|get (customers|users|traction|clients)|distribution|marketing|grow(th|ing)|traffic|seo|launch(ed|ing)? (and|but)|nobody (came|uses|signed)|no (users|customers|traction)|acquire|promote|cold (email|outreach))/i },
  { key: 'validation',   label: 'Validating the idea / finding product-market fit',  re: /\b(validat|product[- ]market[- ]fit|\bpmf\b|is (this|there) (a|any) (market|demand)|would you (pay|use)|worth (building|pursuing)|idea (worth|good|bad)|feedback on my|roast my|should i build)/i },
  { key: 'ai-threat',    label: 'Surviving AI commoditisation & big-tech competition', re: /\b(llm era|ai (era|will|is going to|killed|replace|commodit)|can .* survive|survive|moat|compete with (openai|google|microsoft|anthropic)|commodit|copycat|cloned|wrapper)/i },
  { key: 'funding',      label: 'Raising money & dealing with investors',             re: /\b(fundrais|raise (money|a round|seed|pre-?seed)|investors?|\bvc\b|venture|angel|seed round|series a|valuation|y combinator|\byc\b|accelerator|grant)/i },
  { key: 'revenue',      label: 'Making money: pricing, monetisation, revenue',       re: /\b(pricing|price|monetis|monetiz|revenue|\bmrr\b|\barr\b|profitable|make money|charge|paying customers|subscription|side[- ]projects? that (generate|make))/i },
  { key: 'cofounder',    label: 'Finding a co-founder & building the team',           re: /\b(co-?founder|cofounder|technical partner|find(ing)? a (partner|developer)|team|equity split|hire|hiring|first engineer)/i },
  { key: 'build',        label: 'What to build it with: stack, AI tools, vibe coding', re: /\b(tech stack|which (stack|framework|language|tool)|vibe[- ]cod|cursor|claude code|copilot|no-?code|build (it )?with|how (do|did) you build|boilerplate|infra(structure)? for)/i },
  { key: 'motivation',   label: 'Motivation, focus & burnout',                        re: /\b(burn(ed|t)? ?out|motivat|give up|quit|stuck|procrastinat|focus|lonely|alone|discipline|depress|anxiety|overwhelm|keep going|lost interest)/i },
  { key: 'retention',    label: 'Keeping customers: churn, retention, support load',  re: /\b(churn|retention|retain|cancel|refund|support (load|requests|burden)|customers? (leave|leaving|quit))/i },
  { key: 'legal',        label: 'Legal, incorporation, visas & compliance',           re: /\b(incorporat|llc|c-?corp|delaware|visa|immigration|legal|lawyer|trademark|patent|gdpr|compliance|terms of service|contract)/i },
  { key: 'shutdown',     label: 'Deciding to shut down, pivot or sell',               re: /\b(shut(ting)? down|shutdown|pivot|sell(ing)? my (startup|saas|side project|company)|acqui|wind down|failed|post-?mortem|lessons learned)/i },
  { key: 'solo',         label: 'Solo-founder workload & time',                       re: /\b(solo founder|solopreneur|one[- ]person|alone|side project|full[- ]time job|day job|time management|how many hours)/i },
];

const FOUNDER_Q_RE = /\b(startup|saas|founder|co-?founder|bootstrap|indie|mvp|validate|validation|first (customers?|users?)|product[- ]market fit|pricing|churn|launch|side project|monetize|revenue|yc|y ?combinator|investor|fundrais)\b/i;

function classify(title: string): string {
  const t = title.replace(/^(show|ask|launch) hn:?\s*/i, '');
  for (const c of CATEGORIES) if (c.re.test(t)) return c.key;
  return 'other';
}

// ── Week buckets (shared shape with insights.ts) ────────────────────────────
function weekBuckets(rangeDays: number): string[] {
  const weeks = Math.max(2, Math.ceil(rangeDays / 7));
  const out: string[] = [];
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  for (let i = weeks - 1; i >= 0; i--) out.push(new Date(monday.getTime() - i * 7 * 86400000).toISOString().slice(0, 10));
  return out;
}
function weekOf(ts: number): string {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

// ── Hacker News (Algolia) ───────────────────────────────────────────────────
type HnHit = { objectID: string; title: string; url?: string; points: number; num_comments: number; created_at_i: number; author: string };

// Algolia caps any one query at 1,000 hits, so we slice the range into
// 4-day windows (Show HN now runs ~500–900 posts/week, so a 4-day slice stays
// well under the cap) and merge. Slices are fetched a few at a time.
async function hnSearch(tag: 'show_hn' | 'ask_hn', sinceSec: number): Promise<HnHit[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const SLICE = 4 * 86400;
  const windows: [number, number][] = [];
  for (let start = sinceSec; start < nowSec; start += SLICE) windows.push([start, Math.min(nowSec, start + SLICE)]);
  const hits = new Map<string, HnHit>();
  for (let i = 0; i < windows.length; i += 6) {
    const batch = await Promise.all(windows.slice(i, i + 6).map(async ([a, b]) => {
      const url = `https://hn.algolia.com/api/v1/search_by_date?tags=${tag}&numericFilters=created_at_i>${a},created_at_i<=${b}&hitsPerPage=1000`;
      const json = await getJson(url);
      return ((json.hits ?? []) as HnHit[]).filter(h => h && h.title);
    }));
    for (const h of batch.flat()) hits.set(h.objectID, h);
  }
  return [...hits.values()];
}

async function hackerNews(rangeDays: number, buckets: string[]) {
  const sinceSec = Math.floor((Date.now() - rangeDays * 86400000) / 1000);
  const [show, ask] = await Promise.all([hnSearch('show_hn', sinceSec), hnSearch('ask_hn', sinceSec)]);

  const idx = new Map(buckets.map((b, i) => [b, i]));
  const weeklyShow = buckets.map(() => 0), weeklyAi = buckets.map(() => 0);
  const catCounts = new Map<string, number>();
  let aiCount = 0;
  for (const h of show) {
    const w = idx.get(weekOf(h.created_at_i * 1000));
    const ai = AI_RE.test(h.title);
    if (ai) aiCount++;
    if (w !== undefined) { weeklyShow[w]++; if (ai) weeklyAi[w]++; }
    const c = classify(h.title); catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  // Per-category weekly volume (for the category streamgraph) and per-category
  // attention stats (for the opportunity quadrant: launches = competition,
  // average points+comments per launch = demand/attention).
  const catWeekly = new Map<string, number[]>();
  const catStat = new Map<string, { count: number; points: number; comments: number; ai: number }>();
  for (const h of show) {
    const c = classify(h.title);
    const w = idx.get(weekOf(h.created_at_i * 1000));
    if (!catWeekly.has(c)) catWeekly.set(c, buckets.map(() => 0));
    if (w !== undefined) catWeekly.get(c)![w]++;
    const st = catStat.get(c) ?? { count: 0, points: 0, comments: 0, ai: 0 };
    st.count++; st.points += h.points ?? 0; st.comments += h.num_comments ?? 0; if (AI_RE.test(h.title)) st.ai++;
    catStat.set(c, st);
  }
  const categoryWeekly = CATEGORIES.filter(c => c.key !== 'other' && catWeekly.has(c.key)).map(c => ({ key: c.key, label: c.label, values: catWeekly.get(c.key)! }));
  const categoryStats = CATEGORIES.filter(c => c.key !== 'other' && catStat.has(c.key)).map(c => { const st = catStat.get(c.key)!; return { key: c.key, label: c.label, launches: st.count, avgPoints: Math.round((st.points / st.count) * 10) / 10, avgComments: Math.round((st.comments / st.count) * 10) / 10, attention: Math.round(((st.points + st.comments) / st.count) * 10) / 10, aiShare: Math.round((st.ai / st.count) * 100) }; });

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byWeekday = WEEKDAYS.map(() => 0);
  const POINT_BUCKETS: { label: string; min: number; max: number }[] = [
    { label: '0–4', min: 0, max: 5 }, { label: '5–19', min: 5, max: 20 }, { label: '20–49', min: 20, max: 50 },
    { label: '50–99', min: 50, max: 100 }, { label: '100–299', min: 100, max: 300 }, { label: '300+', min: 300, max: Infinity },
  ];
  const pointsHist = POINT_BUCKETS.map(b => ({ label: b.label, count: 0 }));
  // Per-week breakdowns so the UI can brush a time window and re-aggregate.
  const weekdayWeekly = WEEKDAYS.map(() => buckets.map(() => 0));
  const pointsHistWeekly = POINT_BUCKETS.map(() => buckets.map(() => 0));
  for (const h of show) {
    const wd = (new Date(h.created_at_i * 1000).getUTCDay() + 6) % 7;
    byWeekday[wd]++;
    const bi = POINT_BUCKETS.findIndex(b => h.points >= b.min && h.points < b.max);
    if (bi >= 0) pointsHist[bi].count++;
    const w = idx.get(weekOf(h.created_at_i * 1000));
    if (w !== undefined) { weekdayWeekly[wd][w]++; if (bi >= 0) pointsHistWeekly[bi][w]++; }
  }
  const top = [...show].sort((a, b) => b.points - a.points).slice(0, 8).map(h => ({
    id: h.objectID, title: h.title.replace(/^show hn:?\s*/i, ''), url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`, points: h.points, comments: h.num_comments, at: new Date(h.created_at_i * 1000).toISOString(), ai: AI_RE.test(h.title), category: classify(h.title),
  }));
  // Problems FACED: every Ask HN post in range (not just the founder regex) that
  // matches a pain theme, weighted by replies so a hot thread counts for more.
  const facedMap = new Map<string, { posts: number; replies: number; points: number; top: HnHit | null }>();
  const MEGATHREAD_RE = /who is hiring|who wants to be hired|freelancer\? seeking|seeking freelancer/i;
  for (const h of ask) {
    if (/^tell hn/i.test(h.title) || MEGATHREAD_RE.test(h.title)) continue;
    for (const t of PROBLEMS_FACED) {
      if (!t.re.test(h.title)) continue;
      const e = facedMap.get(t.key) ?? { posts: 0, replies: 0, points: 0, top: null };
      e.posts++; e.replies += h.num_comments ?? 0; e.points += h.points ?? 0;
      if (!e.top || (h.num_comments ?? 0) > (e.top.num_comments ?? 0)) e.top = h;
      facedMap.set(t.key, e);
    }
  }
  const problemsFaced = PROBLEMS_FACED.map(t => { const e = facedMap.get(t.key); return { key: t.key, label: t.label, posts: e?.posts ?? 0, replies: e?.replies ?? 0, points: e?.points ?? 0, example: e?.top ? { title: e.top.title.replace(/^ask hn:?\s*/i, ''), url: `https://news.ycombinator.com/item?id=${e.top.objectID}`, comments: e.top.num_comments ?? 0 } : null }; })
    .filter(t => t.posts > 0).sort((a, b) => (b.posts * 3 + b.replies) - (a.posts * 3 + a.replies)).slice(0, 10);
  // Problems SOLVED by launches (Show HN titles). YC side is added in buildPayload.
  const solvedHn = new Map<string, { n: number; ex: string[] }>();
  for (const h of show) for (const t of PROBLEMS_SOLVED) if (t.re.test(h.title)) { const e = solvedHn.get(t.key) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 3 && (h.points ?? 0) >= 20) e.ex.push(h.title.replace(/^show hn:?\s*/i, '').slice(0, 80)); solvedHn.set(t.key, e); }

  const isQuestion = (h: HnHit) => FOUNDER_Q_RE.test(h.title) && !/^tell hn/i.test(h.title);
  const founderQuestions = ask.filter(isQuestion).sort((a, b) => b.points + b.num_comments - (a.points + a.num_comments)).slice(0, 8).map(h => ({
    id: h.objectID, title: h.title.replace(/^ask hn:?\s*/i, ''), hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`, points: h.points, comments: h.num_comments, at: new Date(h.created_at_i * 1000).toISOString(),
  }));
  return {
    kind: 'live', source: 'Hacker News', sourceUrl: 'https://news.ycombinator.com/show', api: 'hn.algolia.com', fetchedAt: new Date().toISOString(),
    showTotal: show.length, aiShare: show.length ? Math.round((aiCount / show.length) * 100) : 0,
    weekly: [{ key: 'show', label: 'Show HN launches', values: weeklyShow }, { key: 'ai', label: 'of which AI', values: weeklyAi }],
    categories: CATEGORIES.map(c => ({ key: c.key, label: c.label, count: catCounts.get(c.key) ?? 0 })).filter(c => c.count > 0).sort((a, b) => b.count - a.count),
    top, founderQuestions, askTotal: ask.length, askFounderTotal: ask.filter(isQuestion).length,
    byWeekday: WEEKDAYS.map((label, i) => ({ label, count: byWeekday[i] })),
    pointsHist, categoryWeekly, categoryStats,
    problemsFaced, askScanned: ask.length,
    solvedHn: [...solvedHn.entries()].map(([key, e]) => ({ key, n: e.n, ex: e.ex })),
    weekdayWeekly: WEEKDAYS.map((label, i) => ({ key: label, label, values: weekdayWeekly[i] })),
    pointsHistWeekly: POINT_BUCKETS.map((b, i) => ({ key: b.label, label: b.label, values: pointsHistWeekly[i] })),
  };
}

// ── GitHub ──────────────────────────────────────────────────────────────────
const GH_TOPICS: { key: string; label: string; q: string }[] = [
  { key: 'ai-agents', label: 'AI agents', q: 'topic:ai-agents' },
  { key: 'mcp',       label: 'MCP servers', q: 'topic:mcp' },
  { key: 'saas',      label: 'SaaS', q: 'topic:saas' },
  { key: 'boilerplate', label: 'Starter kits', q: 'topic:boilerplate topic:nextjs' },
];

async function github(rangeDays: number, buckets: string[]) {
  const since = new Date(Date.now() - Math.min(rangeDays, 90) * 86400000).toISOString().slice(0, 10);
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const results = await Promise.allSettled(GH_TOPICS.map(async t => {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${t.q} created:>${since}`)}&sort=stars&order=desc&per_page=50`;
    const json = await getJson(url, headers);
    return { topic: t, total: Number(json.total_count ?? 0), items: (json.items ?? []) as any[] };
  }));
  const idx = new Map(buckets.map((b, i) => [b, i]));
  const weekly = buckets.map(() => 0);
  const seen = new Map<string, any>();
  const topics = GH_TOPICS.map((t, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled') return { key: t.key, label: t.label, total: 0, error: String((r as PromiseRejectedResult).reason?.message ?? 'unavailable') };
    for (const repo of r.value.items) {
      seen.set(repo.full_name, { ...repo, _topic: t.key });
      const w = idx.get(weekOf(new Date(repo.created_at).getTime()));
      if (w !== undefined) weekly[w]++;
    }
    return { key: t.key, label: t.label, total: r.value.total };
  });
  const top = [...seen.values()].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8).map(r => ({
    name: r.full_name, url: r.html_url, description: (r.description ?? '').slice(0, 140), stars: r.stargazers_count, forks: r.forks_count, language: r.language, topic: r._topic, createdAt: r.created_at,
  }));
  const langCount = new Map<string, number>();
  const STAR_BUCKETS = [{ label: '<100', min: 0, max: 100 }, { label: '100–499', min: 100, max: 500 }, { label: '500–1.9k', min: 500, max: 2000 }, { label: '2k–9.9k', min: 2000, max: 10000 }, { label: '10k+', min: 10000, max: Infinity }];
  const starsHist = STAR_BUCKETS.map(b => ({ label: b.label, count: 0 }));
  for (const r of seen.values()) {
    const lang = r.language ?? 'Other'; langCount.set(lang, (langCount.get(lang) ?? 0) + 1);
    const bi = STAR_BUCKETS.findIndex(b => r.stargazers_count >= b.min && r.stargazers_count < b.max);
    if (bi >= 0) starsHist[bi].count++;
  }
  const languages = [...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  const anyOk = results.some(r => r.status === 'fulfilled');
  return {
    kind: anyOk ? 'live' : 'error', source: 'GitHub', sourceUrl: 'https://github.com/search', api: token ? 'api.github.com (authenticated)' : 'api.github.com (unauthenticated)', fetchedAt: new Date().toISOString(),
    note: 'New repositories created in the window, by topic. Weekly series counts only the 50 most-starred per topic, so it under-reports volume.',
    topics, weekly: [{ key: 'repos', label: 'New repos (top 50/topic)', values: weekly }], top, languages, starsHist, sampled: seen.size,
  };
}

// ── Y Combinator directory (community mirror) ───────────────────────────────
// yc-oss/api republishes YC's public company directory as static JSON on
// GitHub Pages (MIT). We read the full list once an hour, work out the three
// most recent batches and summarise them. Field names are read defensively
// because the mirror's schema is community-maintained.
const SEASON_ORDER: Record<string, number> = { winter: 0, spring: 1, summer: 2, fall: 3 };
function parseBatch(raw: unknown): { label: string; year: number; season: number } | null {
  const s = String(raw ?? '').trim();
  let m = s.match(/^(winter|spring|summer|fall)\s+(\d{4})$/i);
  if (m) return { label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`, year: Number(m[2]), season: SEASON_ORDER[m[1].toLowerCase()] };
  m = s.match(/^([WSXF])(\d{2})$/i);
  if (m) {
    const map: Record<string, string> = { W: 'winter', X: 'spring', S: 'summer', F: 'fall' };
    const season = map[m[1].toUpperCase()];
    return { label: `${season[0].toUpperCase()}${season.slice(1)} 20${m[2]}`, year: 2000 + Number(m[2]), season: SEASON_ORDER[season] };
  }
  return null;
}

async function ycombinator() {
  const all = await getJson('https://yc-oss.github.io/api/companies/all.json', {}, 20000);
  const list: any[] = Array.isArray(all) ? all : (all?.companies ?? []);
  type Row = { name: string; oneLiner: string; url: string; batch: string; year: number; season: number; industry: string; subindustry: string; tags: string[]; ai: boolean; teamSize: number | null; regions: string[] };
  const rows: Row[] = [];
  for (const c of list) {
    const b = parseBatch(c.batch ?? c.batch_name ?? c.batchName);
    if (!b) continue;
    const tags: string[] = Array.isArray(c.tags) ? c.tags.map(String) : [];
    const industry = String(c.industry ?? c.industries?.[0] ?? 'Unknown');
    const text = `${c.one_liner ?? c.oneLiner ?? ''} ${tags.join(' ')} ${industry} ${c.subindustry ?? ''}`;
    rows.push({
      name: String(c.name ?? ''), oneLiner: String(c.one_liner ?? c.oneLiner ?? ''),
      url: String(c.url ?? (c.slug ? `https://www.ycombinator.com/companies/${c.slug}` : c.website ?? '')),
      batch: b.label, year: b.year, season: b.season, industry, subindustry: String(c.subindustry ?? c.subIndustry ?? '').replace(/^.*->\s*/, '') || 'Other', tags,
      ai: /\b(ai|artificial intelligence|machine learning|llm|agent|agentic|copilot)\b/i.test(text),
      teamSize: Number.isFinite(Number(c.team_size ?? c.teamSize)) ? Number(c.team_size ?? c.teamSize) : null,
      regions: Array.isArray(c.regions) ? c.regions.map(String) : [],
    });
  }
  // Newest batches can contain a handful of early-admitted companies months
  // before the cohort is announced; only treat a batch as "real" once it has
  // a meaningful number of companies.
  const MIN_BATCH = 40;
  const sizes = new Map<string, number>();
  for (const r of rows) sizes.set(r.batch, (sizes.get(r.batch) ?? 0) + 1);
  const batchKeys = [...new Set(rows.map(r => `${r.year}-${r.season}-${r.batch}`))].sort().reverse()
    .filter(k => (sizes.get(k.split('-').slice(2).join('-')) ?? 0) >= MIN_BATCH).slice(0, 3);
  const batches = batchKeys.map(k => {
    const label = k.split('-').slice(2).join('-');
    const bs = rows.filter(r => r.batch === label);
    const ind = new Map<string, number>();
    const tagCount = new Map<string, number>();
    for (const r of bs) { ind.set(r.industry, (ind.get(r.industry) ?? 0) + 1); for (const t of r.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1); }
    const uk = bs.filter(r => r.regions.some(x => /united kingdom|europe/i.test(x))).length;
    const TEAM = [{ label: '1', min: 1, max: 2 }, { label: '2', min: 2, max: 3 }, { label: '3–5', min: 3, max: 6 }, { label: '6–10', min: 6, max: 11 }, { label: '11+', min: 11, max: Infinity }];
    const teamSizes = TEAM.map(t => ({ label: t.label, count: bs.filter(r => r.teamSize !== null && r.teamSize >= t.min && r.teamSize < t.max).length }));
    // Treemap: industry → sub-industry.
    const treeMap = new Map<string, Map<string, number>>();
    for (const r of bs) { const m = treeMap.get(r.industry) ?? new Map(); m.set(r.subindustry, (m.get(r.subindustry) ?? 0) + 1); treeMap.set(r.industry, m); }
    const tree = [...treeMap.entries()].map(([industry, m]) => ({ label: industry, count: [...m.values()].reduce((a, b) => a + b, 0), children: [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) })).sort((a, b) => b.count - a.count);
    // Regions (first region string per company, de-duplicated into a few groups).
    const regionCount = new Map<string, number>();
    for (const r of bs) { const reg = r.regions[0] ? r.regions[0].replace(/^(United States of America|USA)$/i, 'United States') : 'Unknown'; regionCount.set(reg, (regionCount.get(reg) ?? 0) + 1); }
    const regions = [...regionCount.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 14);
    const grp = (r: Row) => { const t = r.regions.join(' '); return /united states|usa|canada/i.test(t) ? 'North America' : /united kingdom|europe|germany|france|spain|netherlands|sweden|switzerland|ireland|portugal|italy|poland|denmark|finland|norway|estonia/i.test(t) ? 'UK & Europe' : /india|singapore|china|japan|korea|indonesia|vietnam|australia|israel|pakistan|philippines|taiwan|hong kong|asia/i.test(t) ? 'Asia-Pacific & ME' : /brazil|mexico|argentina|colombia|chile|latin|africa|nigeria|kenya|egypt/i.test(t) ? 'LatAm & Africa' : 'Remote / unknown'; };
    const regionGroups = ['North America', 'UK & Europe', 'Asia-Pacific & ME', 'LatAm & Africa', 'Remote / unknown'].map(label => ({ label, count: bs.filter(r => grp(r) === label).length }));
    // Industry bubbles: size = companies, x = average team size, y = AI share.
    const industryBubbles = [...treeMap.keys()].map(label => { const rows = bs.filter(r => r.industry === label); const sized = rows.filter(r => r.teamSize !== null); return { label, count: rows.length, aiShare: Math.round((rows.filter(r => r.ai).length / rows.length) * 100), avgTeam: sized.length ? Math.round((sized.reduce((a, r) => a + (r.teamSize ?? 0), 0) / sized.length) * 10) / 10 : 0 }; }).filter(b => b.count >= 2);
    return {
      teamSizes, tree, regions, regionGroups, industryBubbles,
      label, companies: bs.length, aiShare: bs.length ? Math.round((bs.filter(r => r.ai).length / bs.length) * 100) : 0,
      industries: [...ind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count })),
      topTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })),
      ukOrEurope: uk,
      sample: bs.filter(r => r.oneLiner).slice(0, 6).map(r => ({ name: r.name, oneLiner: r.oneLiner.slice(0, 120), url: r.url, ai: r.ai })),
    };
  });
  // Problems SOLVED by the two most recent real batches (one-liners only).
  const recent = rows.filter(r => batchKeys.slice(0, 2).some(k => k.endsWith(r.batch)));
  const solvedYc = new Map<string, { n: number; ex: string[] }>();
  let ycUnmatched = 0;
  for (const r of recent) { let any = false; for (const t of PROBLEMS_SOLVED) if (t.re.test(r.oneLiner)) { any = true; const e = solvedYc.get(t.key) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 3) e.ex.push(`${r.name}: ${r.oneLiner}`.slice(0, 80)); solvedYc.set(t.key, e); } if (!any) ycUnmatched++; }
  return {
    solvedYc: [...solvedYc.entries()].map(([key, e]) => ({ key, n: e.n, ex: e.ex })), ycScanned: recent.length, ycUnmatched, ycBatches: batchKeys.slice(0, 2).map(k => k.split('-').slice(2).join('-')),
    kind: 'live', source: 'Y Combinator directory', sourceUrl: 'https://www.ycombinator.com/companies', api: 'yc-oss.github.io/api (community mirror, MIT)', fetchedAt: new Date().toISOString(),
    note: 'Community-maintained mirror of YC\'s public company directory; AI share is keyword-based on one-liners, tags and industry.',
    totalCompanies: rows.length, batches,
  };
}

// ── SEC Form D filings (free, US-only funding signal) ───────────────────────
// Every US private securities offering (seed rounds, SAFEs, Series A…) must
// file a Form D with the SEC within 15 days. EDGAR's full-text search API is
// public and free (fair-use: a descriptive User-Agent, ≤10 req/s). We count
// filings per week and sample the latest 100 for state distribution. No
// amounts or company-level data are used — just the pulse of filing volume.
async function secFormD(buckets: string[]) {
  const headers = { 'User-Agent': 'MVPClubInsights/1.0 (support@mvpclub.io)', Accept: 'application/json' };
  const weekly: number[] = [];
  for (const b of buckets) {
    const start = b;
    const endD = new Date(new Date(b).getTime() + 6 * 86400000);
    const end = endD.toISOString().slice(0, 10);
    try {
      const json = await getJson(`https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=${start}&enddt=${end}`, headers, 10000);
      weekly.push(Number(json?.hits?.total?.value ?? 0));
    } catch { weekly.push(0); }
  }
  // State distribution from the most recent 100 filings.
  let states: { label: string; count: number }[] = [];
  try {
    const last = buckets[buckets.length - 1];
    const json = await getJson(`https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=${new Date(new Date(last).getTime() - 14 * 86400000).toISOString().slice(0, 10)}&enddt=${new Date().toISOString().slice(0, 10)}`, headers, 10000);
    const sc = new Map<string, number>();
    for (const h of json?.hits?.hits ?? []) { const st = h?._source?.biz_states?.[0]; if (st) sc.set(st, (sc.get(st) ?? 0) + 1); }
    states = [...sc.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  } catch { /* leave empty */ }
  return {
    kind: weekly.some(v => v > 0) ? 'live' : 'error', source: 'SEC EDGAR Form D', sourceUrl: 'https://www.sec.gov/edgar/search/#/forms=D', api: 'efts.sec.gov (public full-text search)', fetchedAt: new Date().toISOString(),
    note: 'US private offerings (seed rounds, SAFEs, Series A…) filed with the SEC. Counts only; the last bucket is the current partial week and filings lag up to 15 days.',
    weekly: [{ key: 'formD', label: 'Form D filings', values: weekly }], states, sampled: 100,
  };
}

// ── Gated sources ───────────────────────────────────────────────────────────
function gated() {
  return [
    { source: 'Product Hunt', status: process.env.PRODUCT_HUNT_COMMERCIAL_APPROVED === 'true' ? 'approved-not-wired' : 'permission-required', note: 'API terms prohibit commercial use without written approval from Product Hunt.' },
    { source: 'Reddit', status: process.env.REDDIT_COMMERCIAL_APPROVED === 'true' ? 'approved-not-wired' : 'permission-required', note: 'Requires a commercial data API agreement before ingestion.' },
    { source: 'Indie Hackers', status: 'no-official-api', note: 'No official API; only third-party scrapers exist, so not ingested.' },
    { source: 'Google Trends', status: 'no-official-api', note: 'No official API; scraping is against terms.' },
  ];
}

async function buildPayload(rangeDays: number) {
  const buckets = weekBuckets(rangeDays);
  const [hn, gh, yc, sec] = await Promise.allSettled([hackerNews(rangeDays, buckets), github(rangeDays, buckets), ycombinator(), secFormD(buckets)]);
  // Problems SOLVED, merged across YC (latest two batches) and Show HN (range).
  const hnV: any = hn.status === 'fulfilled' ? hn.value : null, ycV: any = yc.status === 'fulfilled' ? yc.value : null;
  const solved = PROBLEMS_SOLVED.map(t => {
    const a = (ycV?.solvedYc ?? []).find((x: any) => x.key === t.key), b = (hnV?.solvedHn ?? []).find((x: any) => x.key === t.key);
    return { key: t.key, label: t.label, yc: a?.n ?? 0, hn: b?.n ?? 0, ycShare: ycV?.ycScanned ? Math.round(((a?.n ?? 0) / ycV.ycScanned) * 100) : 0, hnShare: hnV?.showTotal ? Math.round(((b?.n ?? 0) / hnV.showTotal) * 1000) / 10 : 0, examples: [...(a?.ex ?? []), ...(b?.ex ?? [])].slice(0, 4) };
  }).filter(t => t.yc + t.hn > 0).sort((x, y) => (y.ycShare + y.hnShare) - (x.ycShare + x.hnShare)).slice(0, 10);
  const problems = { kind: (hnV || ycV) ? 'live' : 'error', faced: hnV?.problemsFaced ?? [], askScanned: hnV?.askScanned ?? 0, solved, ycScanned: ycV?.ycScanned ?? 0, ycUnmatched: ycV?.ycUnmatched ?? 0, ycBatches: ycV?.ycBatches ?? [], hnScanned: hnV?.showTotal ?? 0, note: 'Keyword classification of Ask HN titles (faced) and of YC one-liners + Show HN titles (solved). A post can count in more than one bucket.' };

  return {
    generatedAt: new Date().toISOString(), rangeDays, weeks: buckets,
    problems,
    refreshEveryMs: REFRESH_INTERVAL_MS,
    nextRefreshAt: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
    hackerNews: hn.status === 'fulfilled' ? hn.value : { kind: 'error', source: 'Hacker News', error: String(hn.reason?.message ?? hn.reason) },
    github: gh.status === 'fulfilled' ? gh.value : { kind: 'error', source: 'GitHub', error: String(gh.reason?.message ?? gh.reason) },
    ycombinator: yc.status === 'fulfilled' ? yc.value : { kind: 'error', source: 'Y Combinator directory', error: String(yc.reason?.message ?? yc.reason) },
    secFormD: sec.status === 'fulfilled' ? sec.value : { kind: 'error', source: 'SEC EDGAR Form D', error: String(sec.reason?.message ?? sec.reason) },
    gated: gated(),
    taxonomy: CATEGORIES.map(c => ({ key: c.key, label: c.label })),
  };
}

// Cumulative repositories per topic at a handful of dates — an adoption
// S-curve. Each point is one search request (`created:<=DATE`, per_page=1,
// reading total_count), so this is paced to respect GitHub's unauthenticated
// 10 search-requests/minute and cached for 6 hours. Served separately so the
// main payload isn't held up by it.
const CURVE_TOPICS = [{ key: 'ai-agents', label: 'AI agents', q: 'topic:ai-agents' }, { key: 'mcp', label: 'MCP servers', q: 'topic:mcp' }, { key: 'saas', label: 'SaaS', q: 'topic:saas' }];
const curveCache: { at: number; payload: unknown; inflight: Promise<unknown> | null } = { at: 0, payload: null, inflight: null };
async function githubCurve() {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const pace = token ? 2200 : 6500;
  const points = 6; // monthly, last ~6 months
  const dates: string[] = [];
  for (let i = points - 1; i >= 0; i--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); dates.push((i === 0 ? new Date() : d).toISOString().slice(0, 10)); }
  const series: { key: string; label: string; values: number[] }[] = [];
  for (const t of CURVE_TOPICS) {
    const values: number[] = [];
    for (const d of dates) {
      try {
        const json = await getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(`${t.q} created:<=${d}`)}&per_page=1`, headers, 15000);
        values.push(Number(json.total_count ?? 0));
      } catch { values.push(values[values.length - 1] ?? 0); }
      await new Promise(r => setTimeout(r, pace));
    }
    series.push({ key: t.key, label: t.label, values });
  }
  return { kind: 'live', source: 'GitHub', sourceUrl: 'https://github.com/search', api: token ? 'api.github.com (authenticated)' : 'api.github.com (unauthenticated, paced)', fetchedAt: new Date().toISOString(), dates, series, note: 'Total repositories carrying each topic, measured at month starts. Cumulative, so the slope is the adoption rate.' };
}

router.get('/github-curve', async (_req: Request, res: Response) => {
  if (curveCache.payload && Date.now() - curveCache.at < CACHE_TTL_MS) { res.json(curveCache.payload); return; }
  if (!curveCache.inflight) curveCache.inflight = githubCurve().then(p => { curveCache.payload = p; curveCache.at = Date.now(); curveCache.inflight = null; return p; }).catch(e => { curveCache.inflight = null; throw e; });
  try { res.json(await curveCache.inflight); } catch (err) { console.error('[insights/market/github-curve]', err); res.status(503).json({ error: 'GitHub adoption curve is still loading' }); }
});

// Shared, cached accessor — used by this router and by the social feed.
export type MarketPayload = Awaited<ReturnType<typeof buildPayload>>;
const inflight = new Map<string, Promise<MarketPayload>>();
export async function getMarketPayload(rangeDays = 30): Promise<MarketPayload> {
  const key = String(rangeDays);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload as MarketPayload;
  let p = inflight.get(key);
  if (!p) {
    p = buildPayload(rangeDays).then(payload => { cache.set(key, { at: Date.now(), payload }); inflight.delete(key); return payload; }).catch(e => { inflight.delete(key); throw e; });
    inflight.set(key, p);
  }
  return p;
}

// Forced rebuild used by the scheduled job. On failure the previous snapshot
// stays in place (stale beats empty) and the error is reported back.
export async function refreshMarketCaches(ranges: number[]): Promise<{ range: number; ok: boolean; ms: number; error?: string }[]> {
  const out: { range: number; ok: boolean; ms: number; error?: string }[] = [];
  for (const rangeDays of ranges) {
    const t0 = Date.now();
    try { const payload = await buildPayload(rangeDays); cache.set(String(rangeDays), { at: Date.now(), payload }); out.push({ range: rangeDays, ok: true, ms: Date.now() - t0 }); }
    catch (err) { out.push({ range: rangeDays, ok: false, ms: Date.now() - t0, error: String((err as Error)?.message ?? err) }); }
  }
  // Adoption curve: paced and slow, so it runs last and never blocks the rest.
  try { const p = await githubCurve(); curveCache.payload = p; curveCache.at = Date.now(); }
  catch (err) { console.error('[insights/market] curve refresh failed:', err); }
  return out;
}

// Manual trigger for admins / deploy hooks. Shares the cron secret.
router.get('/refresh', async (req: Request, res: Response) => {
  const key = process.env.CRON_SECRET || process.env.JWT_SECRET;
  if (!key || req.query.key !== key) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const results = await refreshMarketCaches([30, 90, 180, 365]);
  res.json({ ok: results.every(r => r.ok), results, ranAt: new Date().toISOString() });
});

router.get('/', async (req: Request, res: Response) => {
  const n = Number(req.query.range);
  const rangeDays = Number.isFinite(n) ? Math.min(365, Math.max(14, Math.round(n))) : 90;
  try {
    const payload = await getMarketPayload(rangeDays);
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(payload);
  } catch (err) {
    console.error('[insights/market]', err);
    res.status(500).json({ error: 'Market signals are temporarily unavailable' });
  }
});

export default router;
