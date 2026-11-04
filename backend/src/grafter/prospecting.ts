import axios from 'axios';
import { query } from '../db';
import { buildSearchFilters, type IcpForSearch } from './searchFilters';
import { classifySearchResults, type RawSearchResult } from './webSearchClassifier';
import type { QueuedJob } from './queue';

// -- Prospecting (GRF-18/19/20) ------------------------------------------------
//
// GRF-18: find matching companies. This is the module the architecture
// review's Finding 2 and GRF-20's own AC ("a candidate with no source is
// dropped, not shown") were about -- so it never lets an AI guess a
// company outright. Its provider history, each swap forced by the last
// one turning out to be a dead end on a free tier:
//   1. Apollo.io -- API access itself is gated behind a paid plan; the
//      Free/onboarding tier's key gets a 403 on every call.
//   2. Hunter.io Discover -- API access works, but company search is
//      hard-capped at 100 total results on the Free plan, in both
//      structured-filter and natural-language-query modes; confirmed
//      not fixable from the request side.
//   3. Tavily web search + AI classification (this version, 2026-09-28):
//      a genuinely free (no card) general web search, filtered down to
//      real company homepages by webSearchClassifier.ts, which only
//      keeps a result if it can name a specific company AS WRITTEN in
//      that result -- never invented. Noisier than a purpose-built B2B
//      database, but not plan-gated.
//
// GRF-19: dedupe. Enforced at the database layer, not here -- see
// add-grafter-prospects.sql's UNIQUE(idea_id, domain) and this file's
// INSERT ... ON CONFLICT DO NOTHING, so a re-run or a race between two
// workers can never double-insert the same company for the same idea.
//
// GRF-20: source + reason, drop unsourced. A search result only becomes a
// RawCandidate if it has both a usable domain AND a company name the
// classifier found actually stated in that result -- there is no code
// path that can produce an unsourced or invented row in grafter_prospect.

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const TAVILY_TIMEOUT_MS = 20000;
const MAX_CANDIDATES_PER_RUN = 15; // Tavily max_results caps at 20; 1 search credit per run either way

// Aggregators, directories, news, and social sites that rank for almost
// any B2B query but are never themselves the prospect's company --
// excluded up front so the AI classifier isn't wasting judgment calls on
// obviously-wrong pages.
const EXCLUDED_DOMAINS = [
  'linkedin.com', 'crunchbase.com', 'g2.com', 'capterra.com', 'producthunt.com',
  'techcrunch.com', 'medium.com', 'wikipedia.org', 'reddit.com', 'quora.com',
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'youtube.com',
  'glassdoor.com', 'indeed.com', 'trustpilot.com', 'getapp.com', 'softwareadvice.com',
  'clutch.co', 'builtwith.com', 'owler.com', 'pitchbook.com', 'forbes.com',
  'businessinsider.com', 'wsj.com', 'nytimes.com', 'bloomberg.com', 'github.com',
  'stackshare.io', 'alternativeto.net', 'wikipedia.com',
];

export interface RawCandidate {
  name: string;
  website: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  linkedinUrl?: string;
  apolloOrgId?: string; // unused since the Hunter/Tavily switches; kept so the column still round-trips
}

// Exported for reuse/testing -- also used by dedupe logic elsewhere if ever needed.
export function normalizeDomain(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    let url = rawUrl.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const host = new URL(url).host.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

async function searchTavily(keywordTags: string[]): Promise<RawSearchResult[]> {
  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured -- set TAVILY_API_KEY to enable prospecting.');
  }
  if (!keywordTags.length) {
    return [];
  }

  const searchQuery = `${keywordTags.join(', ')} companies`;

  let res;
  try {
    res = await axios.post(
      TAVILY_SEARCH_URL,
      {
        query: searchQuery,
        max_results: MAX_CANDIDATES_PER_RUN,
        search_depth: 'basic',
        exclude_domains: EXCLUDED_DOMAINS,
      },
      {
        headers: { Authorization: `Bearer ${TAVILY_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: TAVILY_TIMEOUT_MS,
        validateStatus: () => true,
      }
    );
  } catch (err) {
    throw new Error(`Could not reach Tavily: ${err instanceof Error ? err.message : 'request failed'}`);
  }

  if (res.status === 429) {
    throw new Error('Tavily rate limit hit -- try again shortly.');
  }
  if (res.status >= 400) {
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? {});
    throw new Error(`Tavily returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const results: any[] = Array.isArray(res.data?.results) ? res.data.results : [];
  return results
    .filter(r => typeof r?.url === 'string' && r.url)
    .map(r => ({
      url: r.url,
      title: typeof r.title === 'string' ? r.title : '',
      content: typeof r.content === 'string' ? r.content : '',
    }));
}

export async function findCandidateCompanies(
  icp: IcpForSearch
): Promise<{ keywordTags: string[]; candidates: RawCandidate[]; droppedUnsourced: number }> {
  const { keywordTags } = await buildSearchFilters(icp);
  const rawResults = await searchTavily(keywordTags);
  const classified = await classifySearchResults(rawResults, keywordTags);

  const candidates: RawCandidate[] = [];
  for (const c of classified) {
    const domain = normalizeDomain(c.url);
    if (!domain || !c.companyName) continue; // GRF-20: no real source -> dropped, never shown
    candidates.push({ name: c.companyName, website: c.url, domain });
  }

  return { keywordTags, candidates, droppedUnsourced: rawResults.length - candidates.length };
}

export interface ProspectingJobInput extends Partial<IcpForSearch> {}

export interface ProspectingJobOutput {
  keywordTags: string[];
  found: number;
  inserted: number;
  duplicates: number;
  droppedUnsourced: number;
}

// The grafter-worker job handler for kind 'prospecting'. Does the DB
// orchestration (insert + dedupe) around the pure findCandidateCompanies
// call above.
export async function runProspectingJob(job: QueuedJob): Promise<ProspectingJobOutput> {
  const input = (job.input ?? {}) as ProspectingJobInput;
  const icp: IcpForSearch = {
    targetProfile: input.targetProfile ?? '',
    jobsToBeDone: input.jobsToBeDone ?? '',
    frustrations: input.frustrations ?? '',
    currentAlternatives: input.currentAlternatives ?? '',
  };

  const { keywordTags, candidates, droppedUnsourced } = await findCandidateCompanies(icp);

  const reason = keywordTags.length
    ? `Matches your ideal customer profile's keyword tags: ${keywordTags.join(', ')}`
    : "Matches your ideal customer profile";

  let inserted = 0;
  let duplicates = 0;
  for (const candidate of candidates) {
    const result = await query<{ id: string }>(
      `INSERT INTO grafter_prospect (idea_id, run_id, name, website, domain, industry, employee_count, linkedin_url, apollo_org_id, source, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'websearch', $10)
       ON CONFLICT (idea_id, domain) DO NOTHING RETURNING id`,
      [
        job.idea_id,
        job.id,
        candidate.name,
        candidate.website,
        candidate.domain,
        candidate.industry ?? null,
        candidate.employeeCount ?? null,
        candidate.linkedinUrl ?? null,
        candidate.apolloOrgId ?? null,
        reason,
      ]
    );
    if (result.rows.length) inserted += 1;
    else duplicates += 1;
  }

  return {
    keywordTags,
    found: candidates.length,
    inserted,
    duplicates,
    droppedUnsourced,
  };
}
