import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

// -- ICP builder (GRF-13) -----------------------------------------------------
//
// Proposes an Ideal Customer Profile from the founder's APPROVED Brian --
// never from raw site content directly, and never runs at all until Brian
// is approved (enforced in routes/grafter.ts, not here). Same dual-path
// convention as brainBuilder.ts: free self-hosted Ollama by default,
// optional Claude opt-in via ANTHROPIC_API_KEY for the cheap/fast tier,
// degrading back to Ollama on any Claude failure.
//
// Unlike Brian, there's no "no data to ground this in" fallback question
// here -- an approved Brian always exists by the time this runs, so this
// module has no GRF-8-style manual-input branch.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface IcpFieldValue {
  value: string;
  sources: ('brian' | 'founder_edit')[];
}

export interface IcpFields {
  target_profile: IcpFieldValue;
  jobs_to_be_done: IcpFieldValue;
  frustrations: IcpFieldValue;
  current_alternatives: IcpFieldValue;
}

export interface BuildIcpInput {
  whatYouSell: string;
  whoItsFor: string;
  pricing: string;
  icpJobs?: string;
  icpFrustrations?: string;
  icpAlternatives?: string;
}

const SYSTEM_PROMPT = `You are helping a founder describe their Ideal Customer Profile (ICP), using only the material given below -- never invent facts that aren't in it or that don't follow directly from it.

Produce exactly four fields, each one plain sentence under 25 words:
- target_profile: who the ideal customer is (role, company type/size, or context -- whatever the material actually supports).
- jobs_to_be_done: the main thing this customer is trying to get done.
- frustrations: their main frustration with how they solve that today.
- current_alternatives: what they use instead today, if the material says -- an empty string if it genuinely doesn't.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"target_profile": "...", "jobs_to_be_done": "...", "frustrations": "...", "current_alternatives": "..."}`;

function buildUserContent(input: BuildIcpInput): string {
  const parts: string[] = [
    `Business profile (Brian, already approved by the founder):\n` +
      `What they sell: ${input.whatYouSell || '(not stated)'}\n` +
      `Who it's for: ${input.whoItsFor || '(not stated)'}\n` +
      `Pricing: ${input.pricing || '(not stated)'}`,
  ];
  const notes: string[] = [];
  if (input.icpJobs) notes.push(`Jobs the customer is trying to get done: ${input.icpJobs}`);
  if (input.icpFrustrations) notes.push(`Frustrations they have: ${input.icpFrustrations}`);
  if (input.icpAlternatives) notes.push(`What they use instead today: ${input.icpAlternatives}`);
  if (notes.length) parts.push(`Founder's own customer-discovery notes:\n${notes.join('\n')}`);
  return parts.join('\n\n');
}

function parseIcpJson(text: string): IcpFields {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  const field = (key: string): IcpFieldValue => ({
    value: typeof parsed[key] === 'string' ? parsed[key] : '',
    sources: ['brian'],
  });
  return {
    target_profile: field('target_profile'),
    jobs_to_be_done: field('jobs_to_be_done'),
    frustrations: field('frustrations'),
    current_alternatives: field('current_alternatives'),
  };
}

async function buildIcpOllama(input: BuildIcpInput): Promise<IcpFields> {
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
  return parseIcpJson(text);
}

// Claude path -- opt-in via ANTHROPIC_API_KEY, cheap/fast tier: short-form
// synthesis from material already in the prompt, same reasoning as
// brainBuilder.ts's choice of tier.
async function buildIcpClaude(input: BuildIcpInput): Promise<IcpFields> {
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
  return parseIcpJson(text);
}

export async function buildIcp(input: BuildIcpInput): Promise<IcpFields> {
  if (anthropicClient) {
    try {
      return await buildIcpClaude(input);
    } catch (err: any) {
      console.error('[grafter/icp-build] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return buildIcpOllama(input);
}
