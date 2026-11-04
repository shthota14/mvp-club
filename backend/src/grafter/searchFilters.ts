import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// -- Search filter extraction (GRF-18, step 1 of 2) ---------------------------
//
// Turns the founder's own approved ICP text into a short list of keyword
// tags a real company-search API (Apollo) can filter on. This is the ONLY
// thing AI does anywhere in the prospecting pipeline -- it never invents a
// company, a domain, or a fact about one. The actual candidates always
// come back from Apollo's real search results (see prospecting.ts), which
// is what keeps every candidate genuinely sourced (GRF-20) rather than an
// LLM guess with no citable origin -- exactly the failure mode the
// architecture review's Finding 2 warned against.
//
// Same dual-path convention as brainBuilder.ts/icpBuilder.ts: free
// self-hosted Ollama by default, optional Claude opt-in via
// ANTHROPIC_API_KEY, degrading back to Ollama on any Claude failure.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface IcpForSearch {
  targetProfile: string;
  jobsToBeDone: string;
  frustrations: string;
  currentAlternatives: string;
}

export interface SearchFilters {
  keywordTags: string[];
  personTitles: string[];
}

const SYSTEM_PROMPT = `You are helping turn a founder's Ideal Customer Profile into search filters for B2B company-search and people-search APIs.

Produce two things:
1. Up to 5 short keyword/industry tags (1-3 words each) that describe an industry, technology, or business category clearly implied by the material below. These filter a real company database -- never invent or name a specific company, brand, or product.
2. Up to 3 job titles (e.g. "Founder", "Head of Marketing", "VP Sales") for the kind of person at those companies who would actually be the buyer or decision-maker described in the target profile. These filter a real people database -- never invent or name a specific person.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"keyword_tags": ["tag1", "tag2", ...], "person_titles": ["title1", "title2", ...]}
If nothing in the material supports a confident tag or title, respond with an empty array for that field.`;

function buildUserContent(icp: IcpForSearch): string {
  return [
    `Target profile: ${icp.targetProfile || '(not stated)'}`,
    `Jobs to be done: ${icp.jobsToBeDone || '(not stated)'}`,
    `Frustrations: ${icp.frustrations || '(not stated)'}`,
    `Current alternatives: ${icp.currentAlternatives || '(not stated)'}`,
  ].join('\n');
}

function cleanStringArray(value: unknown, max: number): string[] {
  const arr = Array.isArray(value) ? value : [];
  return arr
    .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t: string) => t.trim())
    .slice(0, max);
}

function parseFiltersJson(text: string): SearchFilters {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  return {
    keywordTags: cleanStringArray(parsed.keyword_tags, 5),
    personTitles: cleanStringArray(parsed.person_titles, 3),
  };
}

async function buildSearchFiltersOllama(icp: IcpForSearch): Promise<SearchFilters> {
  const userContent = buildUserContent(icp);
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
        options: { temperature: 0.2 },
      },
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model -- make sure the ollama service is running.');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseFiltersJson(text);
}

// Claude path -- opt-in via ANTHROPIC_API_KEY, cheap/fast tier: this is a
// short tag-extraction step, same tier choice as icpBuilder.ts.
async function buildSearchFiltersClaude(icp: IcpForSearch): Promise<SearchFilters> {
  const userContent = buildUserContent(icp);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 200,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) throw new Error('Claude did not return a usable answer -- please try again.');
  return parseFiltersJson(text);
}

export async function buildSearchFilters(icp: IcpForSearch): Promise<SearchFilters> {
  if (anthropicClient) {
    try {
      return await buildSearchFiltersClaude(icp);
    } catch (err: any) {
      console.error('[grafter/search-filters] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return buildSearchFiltersOllama(icp);
}
