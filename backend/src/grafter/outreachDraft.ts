import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// -- Outreach email drafting (GRF-22) ------------------------------------------
//
// Grounds every claim ONLY in the founder's own approved Brian/ICP text and
// the specific candidate's real, sourced data (name, industry) -- never a
// fabricated detail about the recipient's company, never a claimed prior
// interaction. Same dual-path convention as the rest of Grafter's AI steps.
//
// The GDPR Article 14 disclosure footer is NOT written by the AI and is
// NOT part of this module's output -- it's appended separately, server-side,
// in routes/grafter.ts, every time a draft is created or edited, so it can
// never be an AI hallucination and can never be stripped by an edit.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface DraftEmailInput {
  founderBusinessName: string;
  whatYouSell: string;
  whoItsFor: string;
  targetProfile: string;
  companyName: string;
  companyIndustry?: string;
  contactName: string;
  contactTitle?: string;
}

export interface DraftedEmail {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `You are drafting a short, honest cold-outreach email from a startup founder to a potential customer, using only the material given below.

Ground every claim ONLY in that material -- never invent a fact about the recipient or their company, never claim the sender has used the recipient's product, never fabricate a shared connection, prior conversation, or mutual contact. This is a genuine first contact; the recipient has never heard of the sender before.

Write:
- subject: under 8 words. Plain and specific. No clickbait, no ALL CAPS, no emoji.
- body: 3-4 short sentences. One sentence introducing the sender's business and what it does. One sentence saying why THIS recipient might care, grounded in their role/industry and the sender's own described target customer -- not a fabricated specific about them. End with one low-pressure question (e.g. "worth a quick chat?"). No pressure tactics, no fake urgency, and never "just following up" -- this is the first message.

Before answering, proofread your own subject and body for grammar (correct article use -- "a" vs "an", subject-verb agreement, etc.), spelling, and awkward phrasing, and fix anything wrong. This is a real email a founder is about to send; it needs to read as something a careful person wrote.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"subject": "...", "body": "..."}`;

function buildUserContent(input: DraftEmailInput): string {
  return [
    `Sender's business: ${input.founderBusinessName}`,
    `What the sender sells: ${input.whatYouSell || '(not stated)'}`,
    `Who it's for: ${input.whoItsFor || '(not stated)'}`,
    `Sender's target customer profile: ${input.targetProfile || '(not stated)'}`,
    `Recipient's company: ${input.companyName}${input.companyIndustry ? ` (${input.companyIndustry})` : ''}`,
    `Recipient: ${input.contactName}${input.contactTitle ? `, ${input.contactTitle}` : ''}`,
  ].join('\n');
}

function parseDraftJson(text: string): DraftedEmail {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  if (!subject || !body) throw new Error('The AI did not return a usable draft -- please try again.');
  return { subject, body };
}

async function draftEmailOllama(input: DraftEmailInput): Promise<DraftedEmail> {
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
        options: { temperature: 0.4 },
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
  return parseDraftJson(text);
}

// Claude path -- opt-in via ANTHROPIC_API_KEY, cheap/fast tier: short-form
// drafting from material already in the prompt, same tier choice as the
// rest of Grafter's AI steps.
async function draftEmailClaude(input: DraftEmailInput): Promise<DraftedEmail> {
  const userContent = buildUserContent(input);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 400,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) throw new Error('Claude did not return a usable answer -- please try again.');
  return parseDraftJson(text);
}

export async function draftEmail(input: DraftEmailInput): Promise<DraftedEmail> {
  if (anthropicClient) {
    try {
      return await draftEmailClaude(input);
    } catch (err: any) {
      console.error('[grafter/outreach-draft] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return draftEmailOllama(input);
}

// -- GDPR Article 14 disclosure footer -----------------------------------------
//
// MVP Club is the data controller for this contact's data (sourced via a
// third-party lookup, not collected from the contact directly), so
// Article 14 requires telling them: who the controller is, why they're
// being contacted, the legal basis, where the data came from, and how to
// object. Folding this into the outreach email itself (rather than a
// separate notice) is the standard real-world approach for first-contact
// B2B outreach -- but this exact copy has NOT been reviewed by a lawyer.
// Treat it as a starting point, not a compliance sign-off, before it
// reaches a real recipient.
//
// The data-source name is a PARAMETER, not hardcoded -- this used to say
// "Apollo.io" unconditionally, which went silently wrong (not just
// outdated) the first time prospecting switched providers, since nothing
// forced this disclosure to track that change. Pass the actual contact's
// grafter_contact.source value in; an unrecognized or missing source
// falls back to a truthful generic description rather than naming a
// provider that may not be the real one.
//
// This is appended server-side to every draft and re-appended on every
// edit -- it is never something the AI writes and never something a
// founder's edit can remove.
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  hunter: 'Hunter.io, a B2B contact-data provider',
  apollo: 'Apollo.io, a B2B data provider',
};

export function buildDisclosureFooter(founderBusinessName: string, contactSource?: string | null): string {
  const sourceDescription = (contactSource && SOURCE_DISPLAY_NAMES[contactSource])
    || 'a third-party B2B contact-data provider';
  return [
    '',
    '---',
    `Why you're getting this: ${founderBusinessName} found your business contact details through ${sourceDescription}, because your company appeared to match the kind of business we reach out to. We process this under a legitimate-interest basis for business-to-business outreach.`,
    `You have the right to object to this at any time -- just reply "unsubscribe" and you will not be contacted again.`,
    `Data controller: ${founderBusinessName}, via MVP Club.`,
  ].join('\n');
}
