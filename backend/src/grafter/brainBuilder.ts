import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// -- Brian builder (GRF-7) -----------------------------------------------------
//
// Synthesizes the three Brian fields (what you sell / who it's for / how
// it's priced) from the founder's site content and, where they exist, their
// own icpJobs/icpFrustrations/icpAlternatives answers from Hone/Validate.
// Same dual-path convention as the rest of this app's AI features
// (aiQuestionCheck.ts): free self-hosted Ollama by default, optional Claude
// opt-in via ANTHROPIC_API_KEY for higher judgment quality, degrading back
// to Ollama on any Claude failure rather than failing the build outright.
//
// This is intentionally NOT called when the founder has no Hone/Validate
// answers at all -- GRF-8 asks 3 direct questions in that case instead of
// letting a model guess from site content alone. See routes/grafter.ts.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface BrianFieldValue {
  value: string;
  sources: ('website' | 'validation_data')[];
}

export interface BrianFields {
  what_you_sell: BrianFieldValue;
  who_its_for: BrianFieldValue;
  pricing: BrianFieldValue;
}

export interface BuildBrianInput {
  siteContent: string;
  icpJobs?: string;
  icpFrustrations?: string;
  icpAlternatives?: string;
}

const SYSTEM_PROMPT = `You are helping write a short, honest business profile for a founder, using only the material given below -- never invent facts that aren't in it.

Produce exactly three fields:
- what_you_sell: one plain sentence, under 20 words, describing the product/service.
- who_its_for: one plain sentence, under 20 words, describing the target customer.
- pricing: one plain sentence, under 20 words, describing how it's priced -- if pricing genuinely isn't stated anywhere in the material, respond with an empty string rather than guessing a number.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"what_you_sell": "...", "who_its_for": "...", "pricing": "..."}`;

function buildUserContent(input: BuildBrianInput): string {
  const parts: string[] = [];
  const site = (input.siteContent || '').slice(0, 6000).trim();
  parts.push(site ? `Website content:\n${site}` : 'Website content: (could not be fetched)');
  const validation: string[] = [];
  if (input.icpJobs) validation.push(`Jobs the customer is trying to get done: ${input.icpJobs}`);
  if (input.icpFrustrations) validation.push(`Frustrations they have: ${input.icpFrustrations}`);
  if (input.icpAlternatives) validation.push(`What they use instead today: ${input.icpAlternatives}`);
  if (validation.length) parts.push(`Founder's own customer-discovery notes:\n${validation.join('\n')}`);
  return parts.join('\n\n');
}

function parseBrianJson(text: string, hasValidationData: boolean): BrianFields {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  const sources: BrianFieldValue['sources'] = hasValidationData ? ['website', 'validation_data'] : ['website'];
  const field = (key: string): BrianFieldValue => ({
    value: typeof parsed[key] === 'string' ? parsed[key] : '',
    sources,
  });
  return {
    what_you_sell: field('what_you_sell'),
    who_its_for: field('who_its_for'),
    pricing: field('pricing'),
  };
}

async function buildBrianOllama(input: BuildBrianInput, hasValidationData: boolean): Promise<BrianFields> {
  const userContent = buildUserContent(input);
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
        options: { temperature: 0.3 },
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
  return parseBrianJson(text, hasValidationData);
}

// Claude path -- opt-in via ANTHROPIC_API_KEY, cheap/fast tier: this is
// short-form synthesis from material already in the prompt, no lookup
// involved, so the cheap tier buys enough judgment without the flagship
// tier's cost.
async function buildBrianClaude(input: BuildBrianInput, hasValidationData: boolean): Promise<BrianFields> {
  const userContent = buildUserContent(input);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 400,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) throw new Error('Claude did not return a usable answer -- please try again.');
  return parseBrianJson(text, hasValidationData);
}

export async function buildBrian(input: BuildBrianInput): Promise<BrianFields> {
  const hasValidationData = !!(input.icpJobs || input.icpFrustrations || input.icpAlternatives);
  if (anthropicClient) {
    try {
      return await buildBrianClaude(input, hasValidationData);
    } catch (err: any) {
      console.error('[grafter/brain-build] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return buildBrianOllama(input, hasValidationData);
}
