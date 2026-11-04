import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// AI content tools: short-form marketing copy for MVP Club — social posts,
// WhatsApp/email messages, event/stall copy and product descriptions. Same
// provider pattern as aiQuestionCheck.ts: Claude when ANTHROPIC_API_KEY is
// set (small/fast tier — short, low-stakes copy), automatically falling back
// to the self-hosted Ollama model if the key is unset or the call fails.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export const CONTENT_TYPES = ['social', 'message', 'event', 'product'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_FORMATS: Record<ContentType, readonly string[]> = {
  social: ['linkedin', 'x', 'instagram', 'facebook'],
  message: ['whatsapp', 'email'],
  event: ['announcement', 'poster', 'invite'],
  product: ['short', 'landing', 'features'],
};

export const CONTENT_TONES = ['friendly', 'professional', 'bold', 'playful'] as const;
export type ContentTone = (typeof CONTENT_TONES)[number];

export interface ContentRequest {
  type: ContentType;
  format: string;
  topic: string;
  audience?: string;
  callToAction?: string;
  tone: ContentTone;
}

export interface ContentVariant {
  subject: string | null;
  body: string;
}

const BRAND_VOICE = `You write marketing copy for MVP Club, a guided execution system that helps early founders go from "I have an idea" to "I built something real". The journey is: Idea, Hone it, Validate it, Shape it, Get it done. The core belief is "Clarity creates movement. Movement creates founders." The product answers one question: "What should I do next?"

Voice: clear, practical, encouraging, direct. Talk to founders like a good coach: specific actions over abstractions, momentum over hype. Avoid buzzwords ("revolutionary", "game-changing", "unlock", "supercharge"), empty superlatives and filler.

Hard rules:
- Never invent facts, statistics, user counts, testimonials, customer names, prices, dates or locations. If a detail is needed but not provided, use a bracketed placeholder such as [date] or [link].
- Only describe MVP Club's features if the user's brief mentions them; do not make up capabilities.
- Write only the copy itself. No preamble, no explanations, no markdown headings.`;

const FORMAT_GUIDE: Record<string, string> = {
  'social:linkedin': 'A LinkedIn post. 600-1200 characters. Strong first line, short paragraphs, 0-3 relevant hashtags at the end, at most one emoji.',
  'social:x': 'A post for X. Under 280 characters including hashtags. At most 2 hashtags.',
  'social:instagram': 'An Instagram caption. 150-400 characters, an engaging first line, a clear call to action, 5-8 relevant hashtags on a separate final line. Emojis welcome but not excessive.',
  'social:facebook': 'A Facebook post. 300-600 characters, conversational, one clear call to action, at most 3 hashtags.',
  'message:whatsapp': 'A WhatsApp broadcast message. Under 600 characters, conversational and personal, short lines, at most 2 emojis, one clear call to action. No subject line.',
  'message:email': 'A marketing email. Provide a subject line (under 60 characters) and a body of 100-200 words with a greeting, short paragraphs, one clear call to action and a friendly sign-off from "The MVP Club team".',
  'event:announcement': 'An event announcement for a community post or newsletter. 80-160 words: what it is, who it is for, what attendees walk away with, and how to join.',
  'event:poster': 'Poster / banner copy. Give a headline (max 8 words) on the first line, a sub-headline (max 15 words) on the second, then 3 short bullet lines (one per line, starting with "- ") and a final call-to-action line. Keep it scannable.',
  'event:invite': 'A short personal invitation to an event. 50-100 words, warm, with a clear reason to come and a clear next step to RSVP.',
  'product:short': 'A short product description. 25-45 words, one paragraph, plain language: what it is, who it is for, the outcome.',
  'product:landing': 'Landing-page copy. First line: a headline (max 10 words). Second line: a sub-headline (max 25 words). Then one short paragraph (40-70 words). End with a call-to-action button label (max 4 words) on its own line.',
  'product:features': 'A feature list. One-line intro, then 4-6 lines each starting with "- ", each pairing a feature with the benefit to the founder in under 20 words.',
};

const TONE_GUIDE: Record<ContentTone, string> = {
  friendly: 'Warm, approachable and encouraging.',
  professional: 'Polished, credible and concise.',
  bold: 'Confident, punchy and energetic, with short sentences.',
  playful: 'Light, witty and upbeat, without being silly.',
};

function systemPrompt(req: ContentRequest): string {
  const format = FORMAT_GUIDE[`${req.type}:${req.format}`] || 'Short marketing copy.';
  return `${BRAND_VOICE}

Task: write 3 distinct variants of the following. ${format}
Tone: ${TONE_GUIDE[req.tone]}
Make the variants genuinely different from each other in angle and opening, not rewordings of the same text.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"variants": [{"subject": <string for email subject line, otherwise null>, "body": "<the copy>"}, {"subject": ..., "body": ...}, {"subject": ..., "body": ...}]}
Inside "body", use \\n for line breaks.`;
}

function userContent(req: ContentRequest): string {
  const lines = [`What it is about: ${req.topic}`];
  if (req.audience) lines.push(`Audience: ${req.audience}`);
  if (req.callToAction) lines.push(`Call to action: ${req.callToAction}`);
  return lines.join('\n');
}

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.replace(/\r\n/g, '\n').trim().slice(0, max) : '';
}

export function parseVariants(text: string, req: ContentRequest): ContentVariant[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The AI returned an answer in an unexpected format — please try again.');
  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('The AI returned an answer in an unexpected format — please try again.');
  }
  const raw: any[] = Array.isArray(parsed?.variants) ? parsed.variants : [];
  const isEmail = req.type === 'message' && req.format === 'email';
  const variants = raw
    .map((v) => ({
      subject: isEmail ? clean(v?.subject, 150) || null : null,
      body: clean(v?.body, 3000),
    }))
    .filter((v) => v.body.length > 0)
    .slice(0, 3);
  if (variants.length === 0) throw new Error('The AI did not return any usable copy — please try again.');
  return variants;
}

async function generateClaude(req: ContentRequest): Promise<ContentVariant[]> {
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 2048,
    temperature: 0.9,
    system: systemPrompt(req),
    messages: [{ role: 'user', content: userContent(req) }],
  });
  const blocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = blocks.length ? blocks[blocks.length - 1].text : '';
  if (!text.trim()) throw new Error('Claude did not return a usable answer — please try again.');
  return parseVariants(text, req);
}

async function generateOllama(req: ContentRequest): Promise<ContentVariant[]> {
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt(req) },
          { role: 'user', content: userContent(req) },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.8 },
      },
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual — please try again.');
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the AI model right now — please try again in a few minutes.');
    }
    throw err;
  }
  return parseVariants(res.data?.message?.content || '', req);
}

export async function generateContent(req: ContentRequest): Promise<ContentVariant[]> {
  if (anthropicClient) {
    try {
      return await generateClaude(req);
    } catch (err: any) {
      console.error('[content-tools] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateOllama(req);
}
