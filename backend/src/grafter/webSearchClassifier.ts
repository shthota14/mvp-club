import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// -- Search-result classification (prospecting, web-search path) ------------
//
// Free B2B company-search APIs (Apollo, then Hunter Discover) both turned
// out to gate real company search behind a paid plan -- see
// prospecting.ts's header comment for the timeline. This module is the AI
// half of the replacement: a genuinely free web search (Tavily) returns
// raw results that mix real company homepages in with directory pages,
// news articles, review sites, and listicles, and this step's only job is
// telling those apart and pulling out each real company's name AS WRITTEN
// in the result -- never guessing or inventing one. A result this can't
// confidently attach a stated name to is left out, not guessed at, same
// "no unsourced candidate" rule as the rest of prospecting (GRF-20).
//
// One classification call PER RESULT, not a single batched call asking for
// an array of N classifications: tried batching first (2026-09-28) and
// the free default model (llama3.2, run locally via Ollama) doesn't
// reliably follow "return one JSON array entry per input" -- it answered
// only the first item and returned a bare object instead of an array.
// A single yes/no-plus-name judgment per result is a much easier target
// for a small local model to hit, and a bad response for one result just
// gets skipped (logged, not fatal) instead of losing every result in the
// run.
//
// Same dual-path convention as searchFilters.ts/brainBuilder.ts/
// icpBuilder.ts: free self-hosted Ollama by default, optional Claude
// opt-in via ANTHROPIC_API_KEY, degrading back to Ollama on any Claude
// failure (per-result, not just once for the whole run).

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface RawSearchResult {
  url: string;
  title: string;
  content: string;
}

export interface ClassifiedResult {
  url: string;
  companyName: string;
}

interface Verdict {
  isCompanySite: boolean;
  companyName: string | null;
}

const SYSTEM_PROMPT = `You are checking whether ONE web search result is a specific company's official homepage, for a founder's B2B prospecting tool.

Decide:
1. Is this THE OFFICIAL WEBSITE of one specific company -- not a directory listing, marketplace, news article, blog post, review site, social media profile, or aggregator page?
2. If yes, what is that company's name, taken directly from the title or content given -- never guessed, never invented, never completed from partial information. If no clear company name appears in the given text, this is not usable even if it looks like a company site.

Respond with ONLY a JSON object, no other text, in exactly one of these two shapes:
{"is_company_site": true, "company_name": "Acme Inc"}
{"is_company_site": false, "company_name": null}`;

function buildUserContent(result: RawSearchResult, keywordTags: string[]): string {
  return [
    `This result came from searching for companies related to: ${keywordTags.join(', ') || '(no specific keywords)'}`,
    '',
    `URL: ${result.url}`,
    `Title: ${result.title}`,
    `Snippet: ${result.content.slice(0, 500)}`,
  ].join('\n');
}

function parseVerdict(text: string): Verdict {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const snippet = text.trim().slice(0, 200);
    throw new Error(`AI response was not a JSON object. Raw response started with: ${snippet}`);
  }
  return {
    isCompanySite: parsed?.is_company_site === true,
    companyName: typeof parsed?.company_name === 'string' && parsed.company_name.trim() ? parsed.company_name.trim() : null,
  };
}

async function classifyOneOllama(result: RawSearchResult, keywordTags: string[]): Promise<Verdict> {
  const userContent = buildUserContent(result, keywordTags);
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      },
      { timeout: 60000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model -- make sure the ollama service is running.');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseVerdict(text);
}

async function classifyOneClaude(result: RawSearchResult, keywordTags: string[]): Promise<Verdict> {
  const userContent = buildUserContent(result, keywordTags);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 150,
    temperature: 0.1,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) throw new Error('Claude did not return a usable answer -- please try again.');
  return parseVerdict(text);
}

async function classifyOne(result: RawSearchResult, keywordTags: string[]): Promise<Verdict> {
  if (anthropicClient) {
    try {
      return await classifyOneClaude(result, keywordTags);
    } catch (err: any) {
      console.error('[grafter/web-search-classifier] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return classifyOneOllama(result, keywordTags);
}

export async function classifySearchResults(
  results: RawSearchResult[],
  keywordTags: string[]
): Promise<ClassifiedResult[]> {
  const out: ClassifiedResult[] = [];
  for (const result of results) {
    let verdict: Verdict;
    try {
      verdict = await classifyOne(result, keywordTags);
    } catch (err: any) {
      // One bad/unparseable response shouldn't sink every other result in
      // the run -- skip it (dropped, same as GRF-20 would drop it anyway
      // for having no confirmed source) and keep going.
      console.error(`[grafter/web-search-classifier] classification failed for ${result.url}, skipping:`, err?.message || err);
      continue;
    }
    if (verdict.isCompanySite && verdict.companyName) {
      out.push({ url: result.url, companyName: verdict.companyName });
    }
  }
  return out;
}
