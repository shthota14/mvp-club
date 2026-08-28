import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// Checks a single interview question against the app's own Do/Don't
// interview guidance (see the "Build your interview script" step) using a
// self-hosted Ollama model — free, no API key, no per-call cost. Requires an
// Ollama server reachable at OLLAMA_URL with OLLAMA_MODEL already pulled.
// docker-compose.yml runs this for you (an `ollama` service that pulls the
// model on first start); if you're running the backend outside Docker,
// install Ollama locally (https://ollama.com) and run
// `ollama pull llama3.2` yourself.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Optional, opt-in swap from the free local Ollama model to the Claude API
// for specific AI features (see generateMarketSnapshot and
// reactToIdeaAnswer below) — every feature not explicitly wired to Claude
// still runs on Ollama, and any feature that IS wired degrades back to the
// Ollama path automatically when this key is unset or the Claude call
// fails for any reason.
//
// Two model tiers, same key: ANTHROPIC_MODEL is the flagship tier, for
// calls that need real reasoning quality and/or web search (Market
// Snapshot). ANTHROPIC_MODEL_CHEAP is the small/fast tier, for
// high-frequency, low-stakes calls where a bigger model buys better
// judgment but not new capability (idea-answer reactions) — see the Sage
// Prompt Library doc's per-function cost notes for which tier each
// function should use as more get wired up.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const ANTHROPIC_MODEL_CHEAP = process.env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2 }) : null;

export interface QuestionCheckResult {
  verdict: 'do' | 'dont' | 'neutral';
  reason: string;
  suggestion: string | null;
}

const DOS = [
  'Ask about specific past behavior',
  "Ask what they've already tried",
  'Ask what it costs them — time or money',
  'Ask "why" and "tell me more"',
  "Let silence sit — don't rush to fill it",
  'Keep it to 20-30 min',
];
const DONTS = [
  'Pitch your idea or solution',
  'Ask hypothetical "would you" questions',
  'Ask leading questions',
  'Treat a compliment as validation',
  'Defend your assumptions',
  'Rush to solutions',
];

const SYSTEM_PROMPT = `You are reviewing a single customer-discovery interview question a founder plans to ask. Judge ONLY the phrasing of the question itself against these interview guidelines:

DO: ${DOS.join('; ')}.
DON'T: ${DONTS.join('; ')}.

Nearly all of these are about how a QUESTION is phrased: asking about specific past behavior rather than hypotheticals; asking about real cost (time or money) or what's already been tried; being open-ended enough to invite "why"/storytelling; not leading the person toward an answer; not embedding a pitch, solution, or assumption inside the question. ("Let silence sit" and "Keep it to 20-30 min" are about running the interview, not phrasing a question — ignore those two when judging a single question.)

Respond with ONLY a JSON object, no other text, in this exact shape:
{"verdict": "do" | "dont" | "neutral", "reason": "<one short sentence, under 20 words, plain language>", "suggestion": "<a rephrased version of the question that fixes any issue, or null if verdict is \"do\" and no change is needed>"}

"do" = the question is genuinely open-ended, asks about real past behavior/cost, doesn't lead or pitch.
"dont" = the question is leading, hypothetical ("would you..."), or embeds a pitch/solution/assumption.
"neutral" = it's fine but generic/vague — not wrong, just not a strong discovery question.`;

function buildCheckQuestionUserContent(question: string, hint?: string): string {
  return hint
    ? `Question: "${question}"\nWhy this question is being asked (hint): "${hint}"`
    : `Question: "${question}"`;
}

function parseCheckQuestionJson(text: string): QuestionCheckResult {
  let parsed: any;
  try {
    // Model is instructed (and asked via format:'json' on the Ollama path)
    // to return raw JSON, but strip any accidental markdown code-fence
    // wrapping defensively either way.
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const verdict: QuestionCheckResult['verdict'] =
    parsed.verdict === 'do' || parsed.verdict === 'dont' ? parsed.verdict : 'neutral';

  return {
    verdict,
    reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : null,
  };
}

// Ollama path — the original, always-available implementation.
async function checkQuestionOllama(question: string, hint?: string): Promise<QuestionCheckResult> {
  const userContent = buildCheckQuestionUserContent(question, hint);

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
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseCheckQuestionJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the cheap/fast model tier: this is judging phrasing
// against a fixed rule set the founder already has, no lookup involved, so
// a bigger model buys better judgment, not new capability. No schema
// change here — see the Sage Prompt Library doc for the phrasingScore
// field this could gain later if a leaderboard view gets built.
async function checkQuestionClaude(question: string, hint?: string): Promise<QuestionCheckResult> {
  const userContent = buildCheckQuestionUserContent(question, hint);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 300,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseCheckQuestionJson(text);
}

export async function checkQuestion(question: string, hint?: string): Promise<QuestionCheckResult> {
  if (anthropicClient) {
    try {
      return await checkQuestionClaude(question, hint);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take question-phrasing checks down entirely.
      console.error('[check-question] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return checkQuestionOllama(question, hint);
}
// ─────────────────────────────────────────────────────────────────────────
// A single short, warm reaction to one answer during the conversational
// Idea-stage agent flow (Idea Step 1 — "what's your idea?"). The frontend
// asks one question at a time (idea name, then the 4 one-liner slots) and
// posts each answer here for a quick human-feeling acknowledgment before
// moving to the next question. Stateless, one call per turn — same
// self-hosted Ollama model as checkQuestion/generateInterviewScript above,
// same casual/short tone rules established for this app's stock questions.

export interface IdeaReactionResult {
  reaction: string;
  // True when the founder's answer wasn't actually an answer — a
  // placeholder, a joke, or something too vague/empty to capture real
  // information ("nothing", "nobody", "idk"). When true, the frontend
  // does NOT save the answer or advance to the next question — it shows
  // `reaction` as a gentle nudge and re-asks the same question instead.
  needsFollowUp: boolean;
}

const IDEA_REACT_SYSTEM_PROMPT = `You are a warm, curious mentor helping a founder describe their idea, one question at a time — like the "curious friend" tone used elsewhere in this app (casual, under 12 words, no corporate phrasing like "that's a great point" or "I appreciate that").

You just asked the founder a question and they answered. Judge ONLY whether they attempted to answer at all — do NOT judge whether the answer is detailed, specific, or complete enough. This app deliberately wants short, one-phrase answers, so brevity or vagueness is NEVER a reason to reject an answer.

The following are all REAL answers and must be accepted (needsFollowUp: false), even though they're short: "a SaaS platform", "a mobile app", "a house", "founders", "small businesses", "not knowing if their idea is any good". Almost every answer you see will fall in this bucket — treat that as the default.

Only treat it as a non-answer (needsFollowUp: true) if there is truly no content at all: a literal placeholder like "nothing", "nobody", "not sure", "idk", "n/a", empty text, or random gibberish with no real meaning. This should be rare.

If it's a real answer: respond with a short reaction that responds specifically to what they said (not generic praise every time) — under 12 words. Never ask a new question, and never ask for more detail, elaboration, or clarification — the app moves on to its own next question regardless of how brief this answer was. Set "needsFollowUp" to false.

If it's truly a non-answer: respond with a short, warm, honest nudge inviting them to actually answer — under 15 words (e.g. "Take your time — genuinely, who's it for?" or "No rush, but I do need a real answer here."). Set "needsFollowUp" to true.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"reaction": "<short reaction or gentle nudge>", "needsFollowUp": true or false}`;

// Ollama path — the original, always-available implementation.
async function reactToIdeaAnswerOllama(question: string, answer: string): Promise<IdeaReactionResult> {
  const userContent = `Question asked: "${question}"\nFounder's answer: "${answer}"`;

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: IDEA_REACT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.6 },
      },
      { timeout:  90000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseIdeaReactionJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used by Market
// Snapshot below. No web search tool here: this call is judging the
// founder's own just-typed answer, not looking anything up, so the only
// real benefit a live model brings is better judgment on the accept/reject
// line, not new capability — see the Sage Prompt Library doc.
async function reactToIdeaAnswerClaude(question: string, answer: string): Promise<IdeaReactionResult> {
  const userContent = `Question asked: "${question}"\nFounder's answer: "${answer}"`;

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 300,
    temperature: 0.6,
    system: IDEA_REACT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseIdeaReactionJson(text);
}

function parseIdeaReactionJson(text: string): IdeaReactionResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  return {
    reaction: typeof parsed.reaction === 'string' && parsed.reaction.trim() ? parsed.reaction.trim() : 'Got it.',
    needsFollowUp: parsed.needsFollowUp === true,
  };
}

export async function reactToIdeaAnswer(question: string, answer: string): Promise<IdeaReactionResult> {
  if (anthropicClient) {
    try {
      return await reactToIdeaAnswerClaude(question, answer);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take idea-answer reactions down entirely.
      console.error('[idea-react] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return reactToIdeaAnswerOllama(question, answer);
}

// ─────────────────────────────────────────────────────────────────────────
// Once all 4 one-liner slots are answered, smooth the founder's raw answers
// into ONE grammatically clean sentence in the app's fixed template
// ("I'm building X for Y who Z so they can W.") instead of the frontend's
// blunt string concatenation, which reads badly verbatim (typos left in,
// answers that don't fit the "who ___" grammar slot, etc). This only fixes
// grammar/typos/phrasing to fit the template — it must not invent details
// the founder didn't give. The frontend validates the shape of what comes
// back and falls back to its own raw concatenation if this fails or the
// result doesn't match the expected template.

export interface OneLinerAssembleResult {
  oneLiner: string;
}

const ONE_LINER_ASSEMBLE_SYSTEM_PROMPT = `A founder answered 4 short interview questions about their idea. Combine their raw answers into ONE sentence using EXACTLY this template, with nothing before or after it:

"I'm building <what> for <who> who <struggle> so they can <outcome>."

Rules:
- Lightly rewrite each piece ONLY as needed so the full sentence is grammatically correct and each piece fits naturally into its slot (fix typos, fix verb tense, trim filler words like "um" or "idk maybe").
- Do NOT invent new facts or add detail the founder didn't give.
- Do NOT change the meaning of what they said.
- If an answer is genuinely empty, a placeholder, or nonsense (e.g. "nothing", "nobody", "n/a"), keep that piece honest and simple (e.g. "something they're still figuring out" / "founders like them" / "a challenge they're still defining") rather than inventing specifics — never leave a slot literally blank.
- The sentence must still start with "I'm building" and contain exactly one "for", one "who", and one "so they can", matching the template above.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"oneLiner": "I'm building ... for ... who ... so they can ..."}`;

// Ollama path — the original, always-available implementation.
async function assembleOneLinerSentenceOllama(building: string, audience: string, struggle: string, outcome: string): Promise<OneLinerAssembleResult> {
  const userContent = `what: "${building}"\nwho: "${audience}"\nstruggle: "${struggle}"\noutcome: "${outcome}"`;

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: ONE_LINER_ASSEMBLE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 100000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseOneLinerJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in this
// file, on the cheap/fast model tier: this is pure grammar/phrasing work
// grounded entirely in what the founder already typed, so a bigger model
// buys cleaner prose, not new capability, and no web search tool is used.
async function assembleOneLinerSentenceClaude(building: string, audience: string, struggle: string, outcome: string): Promise<OneLinerAssembleResult> {
  const userContent = `what: "${building}"\nwho: "${audience}"\nstruggle: "${struggle}"\noutcome: "${outcome}"`;

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 300,
    temperature: 0.4,
    system: ONE_LINER_ASSEMBLE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseOneLinerJson(text);
}

function parseOneLinerJson(text: string): OneLinerAssembleResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  return {
    oneLiner: typeof parsed.oneLiner === 'string' ? parsed.oneLiner.trim() : '',
  };
}

export async function assembleOneLinerSentence(building: string, audience: string, struggle: string, outcome: string): Promise<OneLinerAssembleResult> {
  if (anthropicClient) {
    try {
      return await assembleOneLinerSentenceClaude(building, audience, struggle, outcome);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take the one-liner assembler down entirely.
      console.error('[one-liner-assemble] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return assembleOneLinerSentenceOllama(building, audience, struggle, outcome);
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-generate a full interview script from whatever the founder has
// already captured earlier in Hone/Validate (problem statement, target
// persona, hypotheses/assumptions, ICP jobs/frustrations/alternatives, and
// their key validation question). Used by the "✨ Auto-generate from your
// answers" button on "Build your interview script" (Validate step 7) — the
// result replaces the founder's current question list but stays fully
// editable afterward, same as clicking Reset today. Same self-hosted Ollama
// model as checkQuestion above — no separate API key/config needed.

export interface ScriptGenContext {
  problem?: string;
  persona?: string;
  assumptions?: string[];
  icpJobs?: string;
  icpFrustrations?: string;
  icpAlternatives?: string;
  keyQuestion?: string;
}

export interface GeneratedQuestion {
  q: string;
  hint: string;
}

const SCRIPT_SYSTEM_PROMPT = `You are helping a founder draft a customer-discovery interview script for their very first round of user interviews, based on what they've already told you about their idea below.

Follow the same phrasing guidelines used to review individual questions:
DO: ${DOS.join('; ')}.
DON'T: ${DONTS.join('; ')}.

Tone and length matter as much as content. Write the way a curious friend would actually talk, not the way a market-research survey would. Keep each question short — aim for well under 10 words wherever you can. Cut all corporate/formal phrasing: never say things like "current process," "business problem," "validating the impact," or "strategy." For example, instead of "Can you walk me through your current process for validating the impact of your idea on a business problem?" write something like "So, what happened last time?" Every question should still leave room for a real, detailed story — avoid pure yes/no questions where you can; if a question is naturally yes/no (e.g. "ever paid for a fix?"), keep it short and let the hint push the interviewer to follow up and dig for the story behind the answer.

The order matters — build methodically from basic/concrete to deeper/harder, never jump around: (1) get them recalling one specific past instance of the problem, (2) how they handle it today, (3) other things they've already tried, (4) what's frustrating about all of that, (5) what it actually costs them, (6) what happens if it stays unsolved, (7) zoom out — is this just them or does it show up for others too, (8) solution space without pitching or asking "would you", (9) willingness to pay last, since it's the hardest ask and needs the most trust built up first. Write 6 to 8 questions total, skipping a stage only if there's truly nothing in the founder's context to ground it in — but never reorder the stages you do include. Where the founder's context gives you a specific problem, persona, or assumption, use their actual wording so the question feels tailored, not generic — but keep it casual and minimal, one idea per question.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"questions": [{"q": "<question text>", "hint": "<one short sentence, under 20 words, on what this question is meant to reveal>"}, ...]}`;

export async function generateInterviewScript(ctx: ScriptGenContext): Promise<GeneratedQuestion[]> {
  const lines: string[] = [];
  if (ctx.problem?.trim()) lines.push(`Problem the founder believes exists: ${ctx.problem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Who they think has this problem: ${ctx.persona.trim()}`);
  if (ctx.assumptions?.length) lines.push(`Key assumptions they want to test:\n${ctx.assumptions.map(a => `- ${a}`).join('\n')}`);
  if (ctx.icpJobs?.trim()) lines.push(`Jobs their ideal customer is trying to get done: ${ctx.icpJobs.trim()}`);
  if (ctx.icpFrustrations?.trim()) lines.push(`Frustrations their ideal customer has today: ${ctx.icpFrustrations.trim()}`);
  if (ctx.icpAlternatives?.trim()) lines.push(`Alternatives their ideal customer uses today: ${ctx.icpAlternatives.trim()}`);
  if (ctx.keyQuestion?.trim()) lines.push(`The one key question they most want answered: ${ctx.keyQuestion.trim()}`);

  const userContent = lines.length
    ? lines.join('\n\n')
    : "The founder hasn't filled in any problem/persona/hypothesis details yet — write a solid generic first-interview script.";

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawQs: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions: GeneratedQuestion[] = rawQs
    .filter((q: any) => q && typeof q.q === 'string' && q.q.trim())
    .map((q: any) => ({ q: q.q.trim(), hint: typeof q.hint === 'string' ? q.hint.trim() : '' }));

  if (!questions.length) {
    throw new Error('The AI did not return any usable questions — please try again.');
  }
  return questions;
}

// ─────────────────────────────────────────────────────────────────────────
// Full solution-agnostic customer-discovery interview guide — grounded ONLY
// in the founder's own Idea/Hone notes (never the proposed solution), used
// by the "AI-assisted" mode of "Build your interview script" (Validate step
// 7). Unlike generateInterviewScript above (which drafts a plain question
// list from problem/persona/hypotheses), this asks Ollama to role-play a
// dedicated Customer Discovery coach (Lean Startup / JTBD / The Mom Test),
// first produce a private "Interview Focus" briefing (ICP, problem domain,
// business process, assumptions to explore indirectly — interviewer's eyes
// only, never read aloud), then a complete ~30-minute, time-boxed interview
// guide that cannot reveal or imply the founder's solution, features,
// pricing, or tech choices. Same self-hosted Ollama model as the rest of
// this file — no separate API key/config needed.

export interface DiscoveryGuideContext {
  ideaName?: string;
  oneLiner?: string;
  whoExactly?: string;
  problemSentence?: string;
  painIfNothing?: string;
  frequency?: string;
  solutionAlternatives?: string;
  whoPays?: string;
  founderStatement?: string;
  icpJobs?: string;
  icpFrustrations?: string;
  icpAlternatives?: string;
  // Interviewer-context only — folded into the private Interview Focus
  // section so the coach knows what to listen for; never surfaced as a
  // question and never revealed to the interviewee.
  assumptions?: string[];
  // Questions from a guide already generated in an earlier call — set on
  // "Ask Sage for more questions" so this call writes genuinely additional
  // questions instead of reproducing ones the founder already has.
  existingQuestions?: string[];
}

// A single tap-to-tag "quick response" option for one interview question —
// short, plausible, CONTENT-specific answers/signals the interviewer can tag
// with one tap instead of writing freeform notes (e.g. for "What have you
// tried before?" a chip might be "Built a spreadsheet"). Distinct from the
// generic evidence-quality signals in ALL_SIGNAL_OPTS on the frontend
// (vivid story / recent / vague, etc.) — those describe HOW the answer was
// given; these describe WHAT was said, tailored to this exact question.
export interface QuickResponseChip {
  k: string;     // short label, 2-5 words, shown on the chip itself
  icon: string;  // single emoji
  color: string; // one of a small fixed palette — see sanitizeChips()
}

export interface DiscoveryGuideQuestion {
  q: string;
  purpose: string;
  chips: QuickResponseChip[];
}

export interface DiscoveryGuideSection {
  title: string;
  minutes: number;
  questions: DiscoveryGuideQuestion[];
}

export interface DiscoveryGuideFocus {
  icpSummary: string;
  problemDomain: string;
  businessProcess: string;
  keyAssumptions: string[];
}

export interface DiscoveryGuideResult {
  focus: DiscoveryGuideFocus;
  sections: DiscoveryGuideSection[];
}

// Fixed, small color palette for quick-response chips — keeps every
// AI-generated chip visually consistent with the hand-authored ones in the
// frontend's HYP_QUESTIONS bank (same five colors, same meaning): green for
// a strong/confirming signal, amber for mixed or "needs follow-up", red for
// a clear negative signal, and two neutral grays for weak/vague answers.
const CHIP_PALETTE = new Set(['#059669', '#d97706', '#dc2626', '#6e6e73', '#b0b0b8']);

// Small local models occasionally ignore the "no vague meta-labels" prompt
// rule and describe the QUALITY of an answer instead of its CONTENT (e.g.
// "Specific situation", "Emotional response") — this is a runtime safety
// net that drops exactly that failure mode even if the prompt-level fix
// above doesn't fully hold. Keep in sync with the "WRONG" example in both
// system prompts below.
const BANNED_GENERIC_CHIP_LABELS = new Set([
  'specific situation', 'vivid story', 'recent', 'a recent instance', 'no recent instance',
  'emotional response', 'consequences', 'detailed answer', 'brief answer', 'vague answer',
  'strong signal', 'weak signal', 'mixed signal', 'positive response', 'negative response',
  'unsure', 'not sure', 'n/a', 'no answer',
]);

// Shared validation for AI-returned chip arrays — used by both the
// full-script path (generateDiscoveryGuide, below) and the single-question
// on-demand path (generateQuestionChips, near the bottom of this file).
// Keeps only well-formed entries, caps at 6, de-dupes by label, and falls
// back to a safe icon/color rather than dropping an otherwise-good chip
// over a malformed field.
function sanitizeChips(raw: any): QuickResponseChip[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: QuickResponseChip[] = [];
  for (const c of raw) {
    if (!c || typeof c.k !== 'string' || !c.k.trim()) continue;
    const k = c.k.trim().slice(0, 40);
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    if (BANNED_GENERIC_CHIP_LABELS.has(key)) continue;
    seen.add(key);
    out.push({
      k,
      icon: typeof c.icon === 'string' && c.icon.trim() ? c.icon.trim().slice(0, 4) : '🏷️',
      color: typeof c.color === 'string' && CHIP_PALETTE.has(c.color.trim()) ? c.color.trim() : '#6e6e73',
    });
    if (out.length >= 6) break;
  }
  return out;
}

const DISCOVERY_GUIDE_SYSTEM_PROMPT = `You are an expert Customer Discovery coach with deep knowledge of Lean Startup, Jobs To Be Done (JTBD), The Mom Test by Rob Fitzpatrick, and continuous product discovery.

You are given a founder's own notes from the Idea and Hone stages of their product-planning process. Use those notes ONLY to understand the context and identify the problem space:
- The target customer (ICP)
- The problem domain
- The user's goals
- The workflow or business process being explored
- Any assumptions the founder is trying to validate

IMPORTANT — this is the single most important rule: do NOT reveal or reference the founder's proposed solution, product, features, value proposition, pricing, or technology choices anywhere in the interview guide you write. Every question must be answerable by someone who has never heard of the founder's idea and could not infer what it is from the question. Never ask a "would you use/pay for X" question, never describe a feature, never hint at a mechanism or benefit the founder's solution would provide. The interview must stay completely solution-agnostic — its only job is to discover whether the problem exists, how people currently solve it, how important it is, and what frustrations or unmet needs they experience.

Ground every question in the founder's actual domain and terminology (industry, workflow, role names) so it reads as tailored, not generic — while never letting the interviewee infer the product or solution being considered.

Phrasing rules for every question (the same discipline as The Mom Test):
DO: ask about specific past behavior; ask what they've already tried; ask what it costs them in time or money; ask "why" and "tell me more"; keep the whole interview to 30 minutes or less.
DON'T: pitch anything; ask hypothetical "would you..." questions; ask leading questions; treat a compliment as validation; mention the founder's assumptions directly; ever ask about pricing, features, or technology.

First, produce an "Interview Focus" section — for the INTERVIEWER's eyes only, never read aloud or shown to the interviewee:
- icpSummary: 1-2 sentences on who this interview is for
- problemDomain: the industry/domain this problem lives in
- businessProcess: the specific workflow or business process being explored
- keyAssumptions: an array of short strings — the assumptions the founder most needs this interview to explore, phrased for the INTERVIEWER's understanding only (never phrased as something to ask the interviewee, and never describing the founder's solution)

Then write the complete interview guide as a sequence of time-boxed sections that together add up to 30 minutes or less, ordered from easy/concrete to deeper/harder — warm-up and rapport first, then recalling one specific recent instance of the problem, then how they handle it today and what they've already tried, then frustrations and cost, then how it affects them (or their business) if it stays unsolved, then a brief wrap-up. Use 5 to 7 sections with 1 to 3 questions each — skip a stage only if the founder's context truly gives you nothing to ground it in, but never reorder the stages you do include. Every question needs a short "purpose" — one sentence, interviewer-only, on what THAT SPECIFIC question's answer is meant to reveal (not a goal generic enough to apply to several questions in the guide), and never mentioning the founder's solution.

For EVERY question, also write "chips" — 4 to 6 short, tappable "quick response" options an interviewer can tag with one tap while the interviewee is talking, instead of typing notes. Each chip must be a PLAUSIBLE, CONCRETE thing this specific interviewee might actually say in answer to THIS specific question — grounded in the founder's domain/terminology, never generic. For example, for a question about what they've tried before, chips might be specific approaches people in that domain actually take (a manual workaround, a competing tool, asking a colleague, doing nothing); for a question about how often something happens, chips would be concrete frequencies or triggers. Never reuse vague meta-labels like "vivid story" or "recent" — those describe the QUALITY of an answer, not its content, and are handled separately by the app. Across each question's chip set, cover a spread of plausible answers rather than 4 variations on the same one — where it makes sense, include both strong/common answers and a weaker or "no/none" option so the set can capture most real answers with one tap. Each chip needs:
- k: the label itself, 2-5 words, written as something the interviewee said or did (not a category name)
- icon: one single emoji that fits the label
- color: exactly one of these five hex codes, chosen by what the label signals — "#059669" for a strong/confirming signal (the problem is real and painful, urgency is high), "#d97706" for a mixed or "needs more digging" signal, "#dc2626" for a clear negative/disconfirming signal, "#6e6e73" or "#b0b0b8" for a weak, vague, or "not really" signal

WORKED EXAMPLE — study this pairing closely, it shows the level of specificity every question/purpose/chips triple needs, and how tightly the purpose and chips must bind to THAT SPECIFIC question's own wording (not to the guide as a whole):
Question: "Walk me through the last time you had to chase a client for an overdue payment — what did you actually do?"
Purpose: "Reveals whether late payment is a recurring, costly problem or a rare annoyance, and what workaround (if any) they've already built."
Chips: [{"k":"Called or emailed repeatedly","icon":"📞","color":"#d97706"},{"k":"Used a collections service","icon":"💸","color":"#059669"},{"k":"Wrote it off, moved on","icon":"🤷","color":"#dc2626"},{"k":"Never happened to me","icon":"🚫","color":"#b0b0b8"}]

WRONG — do not do this (this is the exact failure mode to avoid): a purpose sentence generic enough to belong under any question in the guide ("Understand the frequency and impact of the problem"), paired with a question about something else entirely, and chips that are generic answer-quality labels instead of things a person would actually say ("Specific situation", "Emotional response", "Consequences", "No recent instance"). Before writing each question's purpose and chips, re-read that question's own exact wording — if what you're about to write could be pasted under a different question without sounding wrong, it is not specific enough yet; rewrite it grounded in that one question.

If the user message includes a "Questions already asked in a previous guide" list, that guide has already been written and shown to the founder — do NOT repeat any of those questions, and do NOT write near-duplicates or trivial rephrasings of them. Write genuinely new questions that explore different angles, sub-topics, or follow-up depth within the same solution-agnostic discovery framework above.

Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "focus": {
    "icpSummary": "<1-2 sentences>",
    "problemDomain": "<industry/domain>",
    "businessProcess": "<the workflow being explored>",
    "keyAssumptions": ["<assumption to explore indirectly>", "..."]
  },
  "sections": [
    { "title": "<section name>", "minutes": 3, "questions": [ { "q": "<question text>", "purpose": "<one short sentence>", "chips": [ { "k": "<short label, 2-5 words>", "icon": "<single emoji>", "color": "<one of #059669, #d97706, #dc2626, #6e6e73, #b0b0b8>" } ] } ] }
  ]
}
The "minutes" values across all sections must sum to 30 or less.`;

function buildDiscoveryGuideUserContent(ctx: DiscoveryGuideContext): string {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Idea name: ${ctx.ideaName.trim()}`);
  if (ctx.oneLiner?.trim()) lines.push(`One-liner: ${ctx.oneLiner.trim()}`);
  if (ctx.whoExactly?.trim()) lines.push(`Who the founder thinks has this problem: ${ctx.whoExactly.trim()}`);
  if (ctx.problemSentence?.trim()) lines.push(`Problem(s) the founder believes exist: ${ctx.problemSentence.trim()}`);
  if (ctx.painIfNothing?.trim()) lines.push(`What happens if this problem stays unsolved: ${ctx.painIfNothing.trim()}`);
  if (ctx.frequency?.trim()) lines.push(`How often this problem comes up: ${ctx.frequency.trim()}`);
  if (ctx.solutionAlternatives?.trim()) lines.push(`Alternatives the founder thinks people use today: ${ctx.solutionAlternatives.trim()}`);
  if (ctx.whoPays?.trim()) lines.push(`Who the founder thinks would pay: ${ctx.whoPays.trim()}`);
  if (ctx.founderStatement?.trim()) lines.push(`Founder's own framing of the idea: ${ctx.founderStatement.trim()}`);
  if (ctx.icpJobs?.trim()) lines.push(`Jobs the ideal customer is trying to get done: ${ctx.icpJobs.trim()}`);
  if (ctx.icpFrustrations?.trim()) lines.push(`Frustrations the ideal customer has today: ${ctx.icpFrustrations.trim()}`);
  if (ctx.icpAlternatives?.trim()) lines.push(`Alternatives the ideal customer uses today: ${ctx.icpAlternatives.trim()}`);
  if (ctx.assumptions?.length) lines.push(`Assumptions the founder wants to validate (interviewer context ONLY — never reveal to the interviewee):\n${ctx.assumptions.map(a => `- ${a}`).join('\n')}`);
  if (ctx.existingQuestions?.length) lines.push(`Questions already asked in a previous guide — do NOT repeat these or write near-duplicates, write genuinely new ones instead:\n${ctx.existingQuestions.map(q => `- ${q}`).join('\n')}`);

  return lines.length
    ? lines.join('\n\n')
    : "The founder hasn't filled in any Idea/Hone details yet — write a solid generic, solution-agnostic discovery interview guide.";
}

function parseDiscoveryGuideJson(text: string): DiscoveryGuideResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const focusRaw = parsed?.focus || {};
  const focus: DiscoveryGuideFocus = {
    icpSummary: typeof focusRaw.icpSummary === 'string' ? focusRaw.icpSummary.trim() : '',
    problemDomain: typeof focusRaw.problemDomain === 'string' ? focusRaw.problemDomain.trim() : '',
    businessProcess: typeof focusRaw.businessProcess === 'string' ? focusRaw.businessProcess.trim() : '',
    keyAssumptions: Array.isArray(focusRaw.keyAssumptions)
      ? focusRaw.keyAssumptions.filter((a: any) => typeof a === 'string' && a.trim()).map((a: string) => a.trim())
      : [],
  };

  const rawSections: any[] = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const sections: DiscoveryGuideSection[] = rawSections
    .filter((s: any) => s && typeof s.title === 'string' && Array.isArray(s.questions) && s.questions.length)
    .map((s: any) => ({
      title: s.title.trim(),
      minutes: typeof s.minutes === 'number' && s.minutes > 0 ? s.minutes : 5,
      questions: s.questions
        .filter((q: any) => q && typeof q.q === 'string' && q.q.trim().length >= 12 && q.q.trim().includes(' '))
        .map((q: any) => ({ q: q.q.trim(), purpose: typeof q.purpose === 'string' ? q.purpose.trim() : '', chips: sanitizeChips(q.chips) })),
    }))
    .filter((s: DiscoveryGuideSection) => s.questions.length);

  if (sections.length < 3) {
    throw new Error('The AI generated an incomplete guide this time — please try Regenerate.');
  }

  return { focus, sections };
}

// Ollama path — the original, always-available implementation.
async function generateDiscoveryGuideOllama(ctx: DiscoveryGuideContext): Promise<DiscoveryGuideResult> {
  const userContent = buildDiscoveryGuideUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: DISCOVERY_GUIDE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 240000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual on this one (it\'s a bigger request than most) — please try Regenerate again.');
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseDiscoveryGuideJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the flagship model tier (not the cheap tier): this is the
// biggest, highest-stakes generative call in the app — 5-7 sections of
// solution-agnostic questions each with tailored chips — so it gets the
// same quality tier as Market Snapshot. No web search tool: the guide is
// grounded entirely in the founder's own Idea/Hone notes, not anything
// external. Generous max_tokens since a full guide with chips is the
// largest structured output any function in this file produces.
async function generateDiscoveryGuideClaude(ctx: DiscoveryGuideContext): Promise<DiscoveryGuideResult> {
  const userContent = buildDiscoveryGuideUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0.5,
    system: DISCOVERY_GUIDE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseDiscoveryGuideJson(text);
}

export async function generateDiscoveryGuide(ctx: DiscoveryGuideContext): Promise<DiscoveryGuideResult> {
  if (anthropicClient) {
    try {
      return await generateDiscoveryGuideClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take Discovery Guide down entirely.
      console.error('[discovery-guide] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateDiscoveryGuideOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// On-demand quick-response chips for ONE question — used by the small "🏷️"
// button next to a hand-typed question in the manual editor ("Your
// discovery questions", Validate step 7), and as a way to backfill chips
// for a question from a script generated before this feature existed.
// Same chip contract (label/icon/color) and validation (sanitizeChips) as
// the per-question chips baked into generateDiscoveryGuide above — kept as
// a separate, lightweight call so regenerating one question's chips doesn't
// require re-running the whole guide.

export interface QuestionChipsContext {
  question: string;
  hint?: string;
  // Optional extra grounding so a one-off manual question gets chips in the
  // same domain/terminology as the rest of the founder's script, when
  // available — never required.
  problemDomain?: string;
}

const QUESTION_CHIPS_SYSTEM_PROMPT = `You help interviewers running customer-discovery interviews capture answers fast. Given ONE interview question (and optionally a short hint about its intent, and the problem domain it's part of), write 4 to 6 short, tappable "quick response" chips — one tap options for a plausible, CONCRETE thing the interviewee might actually say in answer to this exact question. Ground them in the question's own domain/terminology, never generic. Never write vague meta-labels like "vivid story" or "recent" — those describe the QUALITY of an answer, not its content. Cover a spread of plausible answers (including a weaker or "no/none" option where it fits) rather than several variations on the same answer.

Each chip needs:
- k: the label itself, 2-5 words, written as something the interviewee said or did (not a category name)
- icon: one single emoji that fits the label
- color: exactly one of these five hex codes, chosen by what the label signals — "#059669" for a strong/confirming signal, "#d97706" for a mixed or "needs more digging" signal, "#dc2626" for a clear negative/disconfirming signal, "#6e6e73" or "#b0b0b8" for a weak, vague, or "not really" signal

WORKED EXAMPLE:
Question: "Walk me through the last time you had to chase a client for an overdue payment — what did you actually do?"
Chips: [{"k":"Called or emailed repeatedly","icon":"📞","color":"#d97706"},{"k":"Used a collections service","icon":"💸","color":"#059669"},{"k":"Wrote it off, moved on","icon":"🤷","color":"#dc2626"},{"k":"Never happened to me","icon":"🚫","color":"#b0b0b8"}]

WRONG — do not do this: generic answer-quality labels instead of things a person would actually say, e.g. "Specific situation", "Emotional response", "Consequences", "No recent instance". If a chip you're about to write could sit under almost any question, it is not specific enough — rewrite it grounded in this exact question's wording.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"chips": [{"k": "<short label, 2-5 words>", "icon": "<single emoji>", "color": "<one of #059669, #d97706, #dc2626, #6e6e73, #b0b0b8>"}]}`;

function buildQuestionChipsUserContent(ctx: QuestionChipsContext): string {
  const lines: string[] = [`Interview question: ${ctx.question.trim()}`];
  if (ctx.hint?.trim()) lines.push(`What this question is meant to reveal: ${ctx.hint.trim()}`);
  if (ctx.problemDomain?.trim()) lines.push(`Problem domain / industry this interview is about: ${ctx.problemDomain.trim()}`);
  return lines.join('\n');
}

function parseQuestionChipsJson(text: string): QuickResponseChip[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const chips = sanitizeChips(parsed?.chips);
  if (!chips.length) {
    throw new Error('The AI did not return any usable chips — please try again.');
  }
  return chips;
}

// Ollama path — the original, always-available implementation.
async function generateQuestionChipsOllama(ctx: QuestionChipsContext): Promise<QuickResponseChip[]> {
  const userContent = buildQuestionChipsUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: QUESTION_CHIPS_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseQuestionChipsJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the cheap/fast model tier: same family as Discovery Guide
// above but scoped to one question, so it stays on the small tier like
// the other single-question/single-answer calls in this file. No web
// search — grounded entirely in the question text and domain given.
async function generateQuestionChipsClaude(ctx: QuestionChipsContext): Promise<QuickResponseChip[]> {
  const userContent = buildQuestionChipsUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 500,
    temperature: 0.5,
    system: QUESTION_CHIPS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseQuestionChipsJson(text);
}

export async function generateQuestionChips(ctx: QuestionChipsContext): Promise<QuickResponseChip[]> {
  if (anthropicClient) {
    try {
      return await generateQuestionChipsClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take question chips down entirely.
      console.error('[question-chips] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateQuestionChipsOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Problem-suggestion chips (Hone step 2, "What are the problems?"). The
// "Select everything that applies to your customer" tap-to-select bank used
// to be one fixed, generic list of ~20 phrases (e.g. "Takes too long to do
// manually") shown to every founder regardless of their idea -- read as
// boilerplate sitting right next to the founder's own, Sage-extracted
// problem statements above it. This grounds the same five dimensions
// (Time / Cost / Frustration / Access / Growth) in the founder's own
// one-liner and target segment instead of a one-size-fits-all list.
export interface ProblemChipsContext {
  oneLiner?: string;
  segmentRole?: string;   // e.g. "FP&A analysts" — matches ProblemInterviewContext's shape
  segmentDetail?: string; // e.g. "at 50-500 person companies"
  existingProblems?: string[];
}

export type ProblemChipGroup = { category: string; items: string[] };

const PROBLEM_CHIP_CATEGORIES = ['Time', 'Cost', 'Frustration', 'Access', 'Growth'];

// The exact generic phrases this feature replaces — banned outright so a
// model that has seen them during training can't just hand them straight
// back instead of actually grounding new ones in the founder's context.
const BANNED_GENERIC_PROBLEM_ITEMS = new Set([
  'takes too long to do manually', 'too many steps to complete a task', "hard to track what's happening", 'constant context-switching',
  'current solutions are too expensive', 'hidden costs keep adding up', 'wasting budget on the wrong tools', 'no affordable option exists',
  'existing tools are confusing', 'too much back-and-forth between people', 'easy to make mistakes', 'no single source of truth',
  'hard to find the right information', 'no clear solution on the market', 'information is scattered everywhere', 'hard to get started without expertise',
  "can't scale the current approach", 'falling behind competitors', 'losing customers to this problem', 'stuck doing the same thing repeatedly',
]);

const PROBLEM_CHIPS_SYSTEM_PROMPT = `You help a startup founder brainstorm the problems their specific target customer has, sorted into five fixed dimensions: Time, Cost, Frustration, Access, and Growth. You're given the founder's one-line idea description and who their target customer is (and sometimes problems they've already named, which you must not repeat).

For EACH of the five dimensions, write exactly 4 short (under 12 words), concrete, tappable problem-symptom phrases describing something THIS specific customer plausibly experiences — grounded in the founder's own business domain, workflow, and terminology. Never write generic, could-apply-to-any-startup phrases like "takes too long to do manually" or "existing tools are confusing" — every phrase must read as obviously about THIS domain, not a placeholder that could sit under any idea.

WORKED EXAMPLE
One-liner: "A tool that helps finance teams run what-if budget scenarios without spreadsheets"
Segment: "FP&A analysts at 50-500 person companies"
Time: ["Rebuilding the same scenario model after every assumption change", "Waiting days for finance leadership to approve one forecast", "Manually re-linking formulas whenever headcount numbers change", "A board deck that's stale by presentation day"]
Cost: ["Paying consultants for one-off scenario modelling", "Licensing a full BI suite just to run simple what-ifs", "Broken spreadsheet models cost analyst hours every quarter", "Manual-model errors lead to costly budget mis-calls"]
(...and similarly specific, domain-grounded phrases for Frustration, Access, and Growth)

Respond with ONLY a JSON object, no other text, in this exact shape:
{"groups": [
  {"category": "Time", "items": ["<phrase>", "<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Cost", "items": ["<phrase>", "<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Frustration", "items": ["<phrase>", "<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Access", "items": ["<phrase>", "<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Growth", "items": ["<phrase>", "<phrase>", "<phrase>", "<phrase>"]}
]}`;

function buildProblemChipsUserContent(ctx: ProblemChipsContext): string {
  const segment = [ctx.segmentRole, ctx.segmentDetail].filter(Boolean).join(' — ');
  const lines: string[] = [];
  lines.push(`Idea one-liner: ${ctx.oneLiner?.trim() || '(not given — use your best general judgement)'}`);
  lines.push(`Target customer segment: ${segment || '(not given)'}`);
  if (ctx.existingProblems?.length) {
    lines.push('Problems already named — do NOT repeat these or close paraphrases of them:');
    ctx.existingProblems.slice(0, 8).forEach(p => lines.push(`- ${p}`));
  }
  return lines.join('\n');
}

function sanitizeProblemGroups(raw: any): ProblemChipGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: ProblemChipGroup[] = [];
  for (const cat of PROBLEM_CHIP_CATEGORIES) {
    const group = raw.find((g: any) => typeof g?.category === 'string' && g.category.trim().toLowerCase() === cat.toLowerCase());
    const items: string[] = [];
    const seen = new Set<string>();
    if (group && Array.isArray(group.items)) {
      for (const item of group.items) {
        if (typeof item !== 'string' || !item.trim()) continue;
        const trimmed = item.trim().slice(0, 90);
        const key = trimmed.toLowerCase();
        if (seen.has(key) || BANNED_GENERIC_PROBLEM_ITEMS.has(key)) continue;
        seen.add(key);
        items.push(trimmed);
        if (items.length >= 4) break;
      }
    }
    if (items.length) out.push({ category: cat, items });
  }
  return out;
}

function parseProblemChipsJson(text: string): ProblemChipGroup[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }
  const groups = sanitizeProblemGroups(parsed?.groups);
  if (!groups.length) {
    throw new Error('The AI did not return any usable problem suggestions — please try again.');
  }
  return groups;
}

async function generateProblemChipsOllama(ctx: ProblemChipsContext): Promise<ProblemChipGroup[]> {
  const userContent = buildProblemChipsUserContent(ctx);
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PROBLEM_CHIPS_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.6 },
      },
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseProblemChipsJson(text);
}

// Claude path — same cheap/fast tier as generateQuestionChips above, since
// this is also a single, bounded brainstorm call grounded entirely in text
// the founder already gave (one-liner + segment), no web search needed.
async function generateProblemChipsClaude(ctx: ProblemChipsContext): Promise<ProblemChipGroup[]> {
  const userContent = buildProblemChipsUserContent(ctx);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 900,
    temperature: 0.6,
    system: PROBLEM_CHIPS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseProblemChipsJson(text);
}

// ─────────────────────────────────────────────────────────────────────────
// Shared Ollama-first, Claude-on-slow-or-error strategy for the chip
// generators below. The app's default posture is the free local Ollama
// model; Claude is only reached for if Ollama is taking too long (so the
// founder isn't stuck staring at a skeleton) or if Ollama errors outright.
// If Claude *also* fails, we fall back to whatever Ollama eventually
// returns (it's still running in the background the whole time) rather
// than giving up.
const CHIP_GEN_OLLAMA_TIMEOUT_MS = 20000;

async function generateChipsOllamaFirst<T>(
  logLabel: string,
  ollamaFn: () => Promise<T>,
  claudeFn: (() => Promise<T>) | null
): Promise<T> {
  const ollamaPromise = ollamaFn();
  if (!claudeFn) {
    return ollamaPromise;
  }

  const timeoutMarker = { timedOut: true as const };
  const timeout = new Promise<typeof timeoutMarker>(resolve => {
    setTimeout(() => resolve(timeoutMarker), CHIP_GEN_OLLAMA_TIMEOUT_MS);
  });

  const settled = await Promise.race([
    ollamaPromise.then(value => ({ ok: true as const, value })).catch(err => ({ ok: false as const, err })),
    timeout,
  ]);

  if ('ok' in settled) {
    if (settled.ok) return settled.value;
    console.error(`[${logLabel}] Ollama failed, trying Claude:`, settled.err?.message || settled.err);
  } else {
    console.log(`[${logLabel}] Ollama is taking a while (>${CHIP_GEN_OLLAMA_TIMEOUT_MS / 1000}s) -- trying Claude while it keeps running in the background`);
  }

  try {
    return await claudeFn();
  } catch (claudeErr: any) {
    console.error(`[${logLabel}] Claude fallback also failed, waiting on Ollama as a last resort:`, claudeErr?.message || claudeErr);
    return ollamaPromise;
  }
}

export async function generateProblemChips(ctx: ProblemChipsContext): Promise<ProblemChipGroup[]> {
  return generateChipsOllamaFirst(
    'problem-chips',
    () => generateProblemChipsOllama(ctx),
    anthropicClient ? () => generateProblemChipsClaude(ctx) : null
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Alternative/workaround-suggestion chips (Hone step 4, "What do you think
// people are doing to solve this?"). Same problem as the problem-chips bank
// above: "Track it manually with pen and paper", "Ask a colleague or friend
// each time" etc. were one fixed list of ~22 phrases across six categories,
// shown to every founder regardless of their idea or the specific problem
// they just described two steps earlier. This grounds the same six
// categories (Manual & DIY / People & Help / General Tools / Workarounds /
// Research & Community / Nothing) in the founder's actual problem statement.
export interface AlternativeChipsContext {
  oneLiner?: string;
  segmentRole?: string;
  segmentDetail?: string;
  problem?: string; // the founder's own stated problem sentence, if captured yet
  existingItems?: string[];
}

export type AlternativeChipGroup = { category: string; items: string[] };

const ALT_CHIP_CATEGORIES = ['Manual & DIY', 'People & Help', 'General Tools', 'Workarounds', 'Research & Community', 'Nothing'];

// The exact generic phrases this feature replaces.
const BANNED_GENERIC_ALT_ITEMS = new Set([
  'track it manually with pen and paper', 'build their own makeshift process', 'use a whiteboard or sticky notes', 'create their own templates or checklists',
  'ask a colleague or friend each time', 'hire someone to handle it for them', 'outsource it to a freelancer or agency', 'rely on a consultant or expert',
  'use email to manage it (back and forth)', 'cobble together multiple tools', 'use a general productivity app that kind of works', 'rely on group chats (whatsapp, slack, etc.)',
  'work around it and accept the friction', 'ignore it and hope it goes away', 'do it less often than they should', 'wait for someone else to solve it',
  'google / search for answers each time', 'ask in online forums or communities', 'watch youtube videos or read blogs', 'attend workshops or training courses',
  'nothing — they just live with the problem', "they don't know a solution exists",
]);

const ALTERNATIVE_CHIPS_SYSTEM_PROMPT = `You help a startup founder brainstorm how their target customer is CURRENTLY coping with a specific problem, before any product like the founder's exists -- sorted into six fixed categories: Manual & DIY, People & Help, General Tools, Workarounds, Research & Community, and Nothing. You're given the founder's problem statement, one-liner, and target segment (and sometimes coping methods already named, which you must not repeat).

For the first five categories, write 3 to 4 short (under 12 words), concrete, plausible coping mechanisms THIS specific customer might actually be using today, grounded in the founder's own business domain, workflow, and terminology -- not generic could-apply-to-anything phrases like "track it manually with pen and paper" or "ask a colleague or friend each time". For "Nothing", write 2 short phrases about simply not addressing it at all (this category is naturally narrow -- don't force domain jargon into it that doesn't fit).

WORKED EXAMPLE
Problem: "FP&A analysts spend a week rebuilding budget scenario models by hand every time an assumption changes"
One-liner: "A tool that helps finance teams run what-if budget scenarios without spreadsheets"
Segment: "FP&A analysts at 50-500 person companies"
Manual & DIY: ["Maintain a master spreadsheet with dozens of linked tabs", "Hand-copy last quarter's model and edit in place", "Keep a personal 'scenario log' of past what-ifs"]
People & Help: ["Ask a senior analyst to sanity-check the numbers", "Pull in IT to help with broken formulas", "Have the CFO's EA chase down approvals"]
(...and similarly specific, domain-grounded phrases for General Tools, Workarounds, Research & Community, and 2 for Nothing)

Respond with ONLY a JSON object, no other text, in this exact shape:
{"groups": [
  {"category": "Manual & DIY", "items": ["<phrase>", "<phrase>", "<phrase>"]},
  {"category": "People & Help", "items": ["<phrase>", "<phrase>", "<phrase>"]},
  {"category": "General Tools", "items": ["<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Workarounds", "items": ["<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Research & Community", "items": ["<phrase>", "<phrase>", "<phrase>"]},
  {"category": "Nothing", "items": ["<phrase>", "<phrase>"]}
]}`;

function buildAlternativeChipsUserContent(ctx: AlternativeChipsContext): string {
  const segment = [ctx.segmentRole, ctx.segmentDetail].filter(Boolean).join(' — ');
  const lines: string[] = [];
  lines.push(`Problem statement: ${ctx.problem?.trim() || '(not given — infer from the one-liner)'}`);
  lines.push(`Idea one-liner: ${ctx.oneLiner?.trim() || '(not given)'}`);
  lines.push(`Target customer segment: ${segment || '(not given)'}`);
  if (ctx.existingItems?.length) {
    lines.push('Coping methods already named — do NOT repeat these or close paraphrases of them:');
    ctx.existingItems.slice(0, 8).forEach(p => lines.push(`- ${p}`));
  }
  return lines.join('\n');
}

function sanitizeAlternativeGroups(raw: any): AlternativeChipGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: AlternativeChipGroup[] = [];
  for (const cat of ALT_CHIP_CATEGORIES) {
    const group = raw.find((g: any) => typeof g?.category === 'string' && g.category.trim().toLowerCase() === cat.toLowerCase());
    const items: string[] = [];
    const seen = new Set<string>();
    if (group && Array.isArray(group.items)) {
      for (const item of group.items) {
        if (typeof item !== 'string' || !item.trim()) continue;
        const trimmed = item.trim().slice(0, 90);
        const key = trimmed.toLowerCase();
        if (seen.has(key) || BANNED_GENERIC_ALT_ITEMS.has(key)) continue;
        seen.add(key);
        items.push(trimmed);
        if (items.length >= 4) break;
      }
    }
    if (items.length) out.push({ category: cat, items });
  }
  return out;
}

function parseAlternativeChipsJson(text: string): AlternativeChipGroup[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }
  const groups = sanitizeAlternativeGroups(parsed?.groups);
  if (!groups.length) {
    throw new Error('The AI did not return any usable suggestions — please try again.');
  }
  return groups;
}

async function generateAlternativeChipsOllama(ctx: AlternativeChipsContext): Promise<AlternativeChipGroup[]> {
  const userContent = buildAlternativeChipsUserContent(ctx);
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: ALTERNATIVE_CHIPS_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.6 },
      },
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseAlternativeChipsJson(text);
}

async function generateAlternativeChipsClaude(ctx: AlternativeChipsContext): Promise<AlternativeChipGroup[]> {
  const userContent = buildAlternativeChipsUserContent(ctx);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 900,
    temperature: 0.6,
    system: ALTERNATIVE_CHIPS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseAlternativeChipsJson(text);
}

export async function generateAlternativeChips(ctx: AlternativeChipsContext): Promise<AlternativeChipGroup[]> {
  return generateChipsOllamaFirst(
    'alternative-chips',
    () => generateAlternativeChipsOllama(ctx),
    anthropicClient ? () => generateAlternativeChipsClaude(ctx) : null
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Automatic alignment classification for a logged interview (Validate step
// 8, "Log every conversation"). PersonaInterviewCard already saves an
// instant rule-based estimate at log time (counting pre-tagged positive vs
// negative signal chips) so the founder never waits on a network call to
// see a badge — this is the real, slower pass that actually reads the Q&A
// transcript itself and produces a grounded verdict + written reasoning,
// which then quietly replaces the rule-based estimate once it's ready (see
// POST /api/interviews/:id/ai-classify). The founder can always override
// the result manually; the AI's own read and reasoning stay visible
// alongside whatever the founder ultimately picks.

export interface AlignmentQA {
  question: string;
  answer: string;
}

export interface AlignmentEvidenceItem {
  quote: string;
  signal: 'positive' | 'negative' | 'neutral';
  // 1-based index into the `painPoints` array this quote most relates to, or
  // null if it's general commentary not tied to one specific pain point.
  // Powers "Vera" — the automatic per-pain-point verdict reader on the
  // Validate stage's Analyse step (see frontend/src/utils/veraVerdicts.ts) —
  // without needing a second AI pass: she's built entirely from evidence
  // this same classification call already extracts.
  painPointIndex?: number | null;
  // 1-based index into the `assumptions` array this quote most relates to,
  // or null if it isn't about one specific assumption. Same mechanism as
  // painPointIndex above, powering the automatic Confirmed/Busted/Mixed
  // read on Validate step 3's "What are you assuming?" (see
  // frontend/src/utils/assumptionVerdicts.ts) — an assumption's status is
  // computed from this evidence, never picked manually by the founder.
  assumptionIndex?: number | null;
}

export interface AlignmentClassifyContext {
  problemSentence?: string;
  // Individual pain-point sentences (not the single joined display string),
  // so the AI can reference each by number when tagging evidence. Optional —
  // callers that only have a joined problemSentence (older call sites) still
  // work; evidence just won't carry a painPointIndex in that case.
  painPoints?: string[];
  // Individual assumption sentences (Validate step 3), so the AI can
  // reference each by number when tagging evidence. Optional — older call
  // sites that don't pass this still work; evidence just won't carry an
  // assumptionIndex in that case.
  assumptions?: string[];
  persona?: string;
  intervieweeName?: string;
  intervieweeRole?: string;
  qa: AlignmentQA[];
}

export interface AlignmentClassification {
  score: 1 | 2 | 3; // 1 = not confirmed, 2 = partial signal, 3 = confirmed
  label: string;
  reasoning: string;
  evidence: AlignmentEvidenceItem[];
}

const ALIGNMENT_SCORE_LABELS: Record<1 | 2 | 3, string> = {
  3: 'Confirmed',
  2: 'Partial signal',
  1: 'Not confirmed',
};

const ALIGNMENT_SYSTEM_PROMPT = `You are an experienced customer-discovery mentor reviewing one interview transcript a founder just logged, to judge whether it CONFIRMS the problem they're testing.

You'll be given: the problem the founder believes exists (may be blank), who the interviewee is, and the full question-by-answer transcript. Answers may include bracketed tags the founder tagged live during the interview, e.g. "[Vivid specific story, Named a $ figure] They said their team loses 3 hours a week on this." — treat those tags as the founder's own observations, in addition to the actual quoted words.

Classify the interview into exactly ONE of three buckets, based on the actual evidence in the transcript — never on politeness or vague enthusiasm:
3 = Confirmed: the interviewee described the problem in their own words, unprompted, with a specific recent example; real pain (cost in time or money, frustration, an existing workaround) is evident; there's some sign it matters enough to act on — they'd pay, they already tried to fix it, they're actively looking for a solution.
2 = Partial signal: some evidence the problem exists, but it's mixed — thin or generic answers, mostly hypothetical, one strong point undercut by a weak one, or genuine pain with no sign of willingness to act or pay.
1 = Not confirmed: little to no real evidence — vague/generic answers, no specific story, indifference, or explicit pushback ("not really an issue for me," "I don't think about it").

Write "reasoning" the way a founder would want to hear it from a mentor: plain, direct, 2-4 sentences, referencing SPECIFIC things the interviewee said (short quote fragments where useful) rather than generic language like "the signals suggest" or "overall sentiment."

Then extract 2-5 "evidence" bullets — each a short quote or close paraphrase from the transcript, tagged by whether it supports (positive), undercuts (negative), or is neutral to confirming the problem.

If a numbered list of "Pain points being tested" is given below, also tag each evidence bullet with the NUMBER of the single pain point it most relates to — or null if it's general commentary that doesn't clearly single out one of them. Only tag a pain point when the quote is genuinely about it; don't force a match.

If a numbered list of "Assumptions being tested" is given below, also tag each evidence bullet with the NUMBER of the single assumption it most relates to — or null if it doesn't clearly speak to one of them. Only tag an assumption when the quote genuinely confirms or contradicts it; don't force a match. An evidence bullet may carry a painPointIndex, an assumptionIndex, both, or neither.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"score": 1 | 2 | 3, "reasoning": "<2-4 sentences, plain language, grounded in specifics>", "evidence": [{"quote": "<short quote or close paraphrase>", "signal": "positive" | "negative" | "neutral", "painPointIndex": <number from the pain-point list, or null>, "assumptionIndex": <number from the assumptions list, or null>}]}`;

function buildAlignmentTranscript(ctx: AlignmentClassifyContext): string {
  const lines: string[] = [];
  if (ctx.problemSentence?.trim()) lines.push(`Problem the founder believes exists: ${ctx.problemSentence.trim()}`);
  const painPoints = (ctx.painPoints || []).map(p => p?.trim()).filter(Boolean);
  if (painPoints.length) {
    lines.push('Pain points being tested:');
    painPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }
  const assumptions = (ctx.assumptions || []).map(a => a?.trim()).filter(Boolean);
  if (assumptions.length) {
    lines.push('Assumptions being tested:');
    assumptions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }
  if (ctx.persona?.trim()) lines.push(`Who the founder thinks has this problem: ${ctx.persona.trim()}`);
  if (ctx.intervieweeName?.trim()) lines.push(`Interviewee: ${ctx.intervieweeName.trim()}${ctx.intervieweeRole?.trim() ? ` (${ctx.intervieweeRole.trim()})` : ''}`);
  lines.push('', 'Transcript:');
  ctx.qa.forEach((row, i) => {
    lines.push(`Q${i + 1}: ${row.question}`);
    lines.push(`A${i + 1}: ${row.answer}`);
  });
  return lines.join('\n');
}

function sanitizeEvidence(raw: any, painPointCount: number, assumptionCount: number): AlignmentEvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AlignmentEvidenceItem[] = [];
  for (const e of raw) {
    if (!e || typeof e.quote !== 'string' || !e.quote.trim()) continue;
    const signal: AlignmentEvidenceItem['signal'] =
      e.signal === 'positive' || e.signal === 'negative' ? e.signal : 'neutral';
    const idx = Number(e.painPointIndex);
    const painPointIndex = Number.isInteger(idx) && idx >= 1 && idx <= painPointCount ? idx : null;
    const aIdx = Number(e.assumptionIndex);
    const assumptionIndex = Number.isInteger(aIdx) && aIdx >= 1 && aIdx <= assumptionCount ? aIdx : null;
    out.push({ quote: e.quote.trim().slice(0, 240), signal, painPointIndex, assumptionIndex });
    if (out.length >= 6) break;
  }
  return out;
}

function parseAlignmentJson(text: string, ctx: AlignmentClassifyContext): AlignmentClassification {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const score: 1 | 2 | 3 = parsed.score === 1 || parsed.score === 2 || parsed.score === 3 ? parsed.score : 2;
  return {
    score,
    label: ALIGNMENT_SCORE_LABELS[score],
    reasoning: typeof parsed.reasoning === 'string' && parsed.reasoning.trim() ? parsed.reasoning.trim() : 'The AI did not provide a detailed rationale for this classification.',
    evidence: sanitizeEvidence(parsed.evidence, (ctx.painPoints || []).length, (ctx.assumptions || []).length),
  };
}

// Ollama path — the original, always-available implementation.
async function classifyInterviewAlignmentOllama(ctx: AlignmentClassifyContext): Promise<AlignmentClassification> {
  const userContent = buildAlignmentTranscript(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: ALIGNMENT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseAlignmentJson(text, ctx);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the flagship model tier: this is the richest, most
// naturally dashboard-ready output in the app (score + evidence quotes
// tagged to specific pain points/assumptions), so it's worth the better
// reasoning quality. No web search — grounded entirely in the founder's
// own logged transcript.
async function classifyInterviewAlignmentClaude(ctx: AlignmentClassifyContext): Promise<AlignmentClassification> {
  const userContent = buildAlignmentTranscript(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0.3,
    system: ALIGNMENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseAlignmentJson(text, ctx);
}

export async function classifyInterviewAlignment(ctx: AlignmentClassifyContext): Promise<AlignmentClassification> {
  if (!ctx.qa?.length) {
    throw new Error('No answered questions to classify yet.');
  }

  if (anthropicClient) {
    try {
      return await classifyInterviewAlignmentClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take alignment classification down entirely.
      console.error('[alignment-classify] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return classifyInterviewAlignmentOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// "Reason with the AI" — a founder can push back on the AI's classification
// (above) in a short back-and-forth instead of just silently overriding it.
// The AI engages honestly with the specific point raised: it may revise its
// score/reasoning when genuinely persuaded (e.g. the founder points out a
// misread quote or adds real context), but must not simply cave to
// disagreement, and it never has the final say either way — that's always
// the founder's, via the existing manual override buttons.

export interface AlignmentChatTurn {
  role: 'founder' | 'ai';
  text: string;
}

export interface AlignmentReasonContext extends AlignmentClassifyContext {
  priorScore: 1 | 2 | 3;
  priorReasoning: string;
  history: AlignmentChatTurn[];
  founderMessage: string;
}

export interface AlignmentReasonResult {
  reply: string;
  updatedScore: 1 | 2 | 3 | null;
  updatedReasoning: string | null;
}

const ALIGNMENT_REASON_SYSTEM_PROMPT = `You previously classified a customer-discovery interview transcript for a founder with a specific alignment score and written reasoning (given below, along with the full transcript). The founder is now responding to your classification — pushing back, asking a question, or adding context you didn't have.

Respond like a thoughtful, honest mentor, not a customer-service bot: engage directly with their SPECIFIC point. If it's genuinely persuasive given the transcript — they point out something you missed or misread, or add real context that changes the picture — revise your score and reasoning to match. If it doesn't actually change the evidence, hold your original read and explain why clearly and kindly, without being stubborn or dismissive. You are never the final decision-maker here — the founder always has the final override — your only job is to reason honestly with them, not to cave or to dig in reflexively.

Reply conversationally, under 60 words, addressing their specific point (not a generic restatement of your earlier reasoning).

Respond with ONLY a JSON object, no other text, in this exact shape:
{"reply": "<conversational response, under 60 words>", "updatedScore": 1 | 2 | 3 | null, "updatedReasoning": "<new 2-4 sentence reasoning, only if updatedScore is not null, else null>"}
Only set updatedScore/updatedReasoning to non-null values when you are genuinely revising your classification because of THIS conversation — most replies should leave both as null.`;

function buildAlignmentReasonUserContent(ctx: AlignmentReasonContext): string {
  const lines: string[] = [buildAlignmentTranscript(ctx), ''];
  lines.push(`Your prior classification: ${ALIGNMENT_SCORE_LABELS[ctx.priorScore]} (score ${ctx.priorScore})`);
  lines.push(`Your prior reasoning: ${ctx.priorReasoning || '(none recorded)'}`);
  if (ctx.history.length) {
    lines.push('', 'Conversation so far:');
    ctx.history.forEach(turn => lines.push(`${turn.role === 'founder' ? 'Founder' : 'You'}: ${turn.text}`));
  }
  lines.push('', `Founder's newest message: ${ctx.founderMessage}`);
  return lines.join('\n');
}

function parseAlignmentReasonJson(text: string): AlignmentReasonResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const updatedScore: 1 | 2 | 3 | null =
    parsed.updatedScore === 1 || parsed.updatedScore === 2 || parsed.updatedScore === 3 ? parsed.updatedScore : null;

  const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : "I don't have anything to add to that right now.";
  // If the AI revised its score but didn't give a clean standalone
  // reasoning string, fall back to its conversational reply so the stored
  // ai_reasoning is never silently blanked out on a genuine revision.
  const updatedReasoning: string | null = updatedScore == null
    ? null
    : (typeof parsed.updatedReasoning === 'string' && parsed.updatedReasoning.trim() ? parsed.updatedReasoning.trim() : reply);

  return { reply, updatedScore, updatedReasoning };
}

// Ollama path — the original, always-available implementation.
async function reasonAboutAlignmentOllama(ctx: AlignmentReasonContext): Promise<AlignmentReasonResult> {
  const userContent = buildAlignmentReasonUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: ALIGNMENT_REASON_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseAlignmentReasonJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the cheap/fast model tier: a short (under 60 words),
// grounded conversational reply, not a fresh full re-classification, so it
// stays on the same tier as the other short-reply calls. No web search —
// grounded entirely in the transcript and conversation already given.
async function reasonAboutAlignmentClaude(ctx: AlignmentReasonContext): Promise<AlignmentReasonResult> {
  const userContent = buildAlignmentReasonUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 600,
    temperature: 0.4,
    system: ALIGNMENT_REASON_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseAlignmentReasonJson(text);
}

export async function reasonAboutAlignment(ctx: AlignmentReasonContext): Promise<AlignmentReasonResult> {
  if (anthropicClient) {
    try {
      return await reasonAboutAlignmentClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take this conversation down entirely.
      console.error('[alignment-reason] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return reasonAboutAlignmentOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Hone Step 2 — "Sage interviews you" (problem discovery interview)
//
// Replaces (as an opt-in alternative to) the static preset-chip grid: Sage
// asks about the last time the problem actually happened to the founder's
// named segment, one question per turn, and after each founder reply
// decides what — if anything — is concrete enough to extract as a
// standalone problem statement. Stateless like the alignment/market-snapshot
// calls above: the frontend holds the full conversation and re-sends it
// each turn; "extracted" is always the FULL cumulative list so far (the
// frontend de-dupes by text) rather than a delta, so a dropped response
// can't silently lose a problem the founder already saw captured.
//
// The one rule that matters most here: extraction must never put words in
// the founder's mouth. A problem statement may only restate what the
// founder actually said — no invented numbers, causes, or specifics.
// ─────────────────────────────────────────────────────────────────────────

export interface ProblemInterviewTurn {
  role: 'sage' | 'founder';
  text: string;
}

export interface ProblemInterviewContext {
  oneLiner?: string;
  segmentRole?: string;    // e.g. "solo indie podcasters" — named, not "your customer"
  segmentDetail?: string;  // e.g. "recording 1-2 episodes a week"
  history: ProblemInterviewTurn[];
  founderMessage: string;
}

export type ProblemEvidence = 'observed' | 'heard' | 'assumed';

export interface ExtractedProblem {
  text: string;
  evidence: ProblemEvidence;
}

export interface ProblemInterviewResult {
  reply: string;
  done: boolean;
  extracted: ExtractedProblem[];
}

// Hard backstop independent of the model's own judgment — the prompt asks
// it to wrap up by the 4th founder turn, but this guarantees the interview
// can never run indefinitely even if a call misbehaves.
const PROBLEM_INTERVIEW_MAX_FOUNDER_TURNS = 4;

const PROBLEM_INTERVIEW_SYSTEM_PROMPT = `You are Sage, running a short discovery interview with a founder about the real problems their customers face. You are interviewing the FOUNDER about what they have personally observed or heard — you are never the customer, and you never invent a customer's words.

Ground every question in the founder's named segment, never in "your customer" generically. Ask about ONE concrete moment: the last time this problem actually happened to someone in that segment. Follow up on specifics — what they were doing, what went wrong, what it cost them — rather than jumping to a new topic. Ask exactly one question per turn, under 30 words, in a direct and curious voice. Never suggest a problem the founder hasn't already described; you only ask, you never supply plausible answers.

After the founder's newest reply, decide two things:

1. EXTRACT: is anything said so far — across the whole conversation, not just the newest message — concrete enough to stand as a problem statement? A specific situation, not a vague generality. Write each as a short statement (under 25 words) built ONLY from what the founder actually said. Tag its evidence: "observed" if the founder personally watched it happen, "heard" if a customer told them directly, "assumed" if the founder is guessing or inferring. If nothing is concrete enough yet, extracted must be an empty array — never force a low-quality extraction just to have one. Return the FULL list of everything extractable so far, not only what's new.

2. CONTINUE OR STOP: keep going only if there's a genuinely new angle worth asking about and the founder is still giving you concrete detail. Stop (done: true) once you have at least one solid extracted problem and either four founder turns have passed or the replies have gone thin or repetitive. When done, "reply" should be a brief, warm closing line (under 20 words) — not another question.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"reply": "<your next question, or a short closing line if done>", "done": <boolean>, "extracted": [{"text": "<problem statement>", "evidence": "observed"|"heard"|"assumed"}, ...]}`;

function buildProblemInterviewTranscript(ctx: ProblemInterviewContext): string {
  const lines: string[] = [];
  if (ctx.oneLiner) lines.push(`Founder's idea: ${ctx.oneLiner}`);
  const segment = [ctx.segmentRole, ctx.segmentDetail].filter(Boolean).join(' — ');
  lines.push(`Segment being interviewed about: ${segment || '(not yet named)'}`);
  if (ctx.history.length) {
    lines.push('', 'Conversation so far:');
    ctx.history.forEach(turn => lines.push(`${turn.role === 'founder' ? 'Founder' : 'Sage'}: ${turn.text}`));
  }
  lines.push('', `Founder's newest reply: ${ctx.founderMessage}`);
  const founderTurns = ctx.history.filter(t => t.role === 'founder').length + 1;
  if (founderTurns >= PROBLEM_INTERVIEW_MAX_FOUNDER_TURNS) {
    lines.push('', `This is founder turn ${founderTurns} — you must set "done": true.`);
  }
  return lines.join('\n');
}

function sanitizeExtractedProblems(raw: any): ExtractedProblem[] {
  if (!Array.isArray(raw)) return [];
  const EVIDENCE: ProblemEvidence[] = ['observed', 'heard', 'assumed'];
  return raw
    .map((item: any) => {
      const text = typeof item?.text === 'string' ? item.text.trim().slice(0, 140) : '';
      const evidence: ProblemEvidence = EVIDENCE.includes(item?.evidence) ? item.evidence : 'heard';
      return text ? { text, evidence } : null;
    })
    .filter((x: ExtractedProblem | null): x is ExtractedProblem => x !== null)
    .slice(0, 8);
}

const PROBLEM_INTERVIEW_FALLBACK_CLOSER = "Thanks — that's plenty to go on. Pick a severity for each problem below, or keep describing more yourself.";

function parseProblemInterviewJson(text: string, forceDone: boolean): ProblemInterviewResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }
  const modelReply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  const done = forceDone || parsed.done === true;
  // When the interview is ending — whether the model decided that itself or
  // the hard turn cap forced it — the frontend removes the input box, so a
  // reply that's still phrased as a question would be unanswerable. The
  // prompt asks the model for a closing line here, but doesn't always get
  // one; fall back to a real closer rather than trust an unverified "?".
  const reply = done
    ? (modelReply && !modelReply.endsWith('?') ? modelReply : PROBLEM_INTERVIEW_FALLBACK_CLOSER)
    : (modelReply || 'Thanks — that gives me enough to work with.');
  return {
    reply,
    done,
    extracted: sanitizeExtractedProblems(parsed.extracted),
  };
}

async function generateProblemInterviewTurnOllama(ctx: ProblemInterviewContext, forceDone: boolean): Promise<ProblemInterviewResult> {
  const userContent = buildProblemInterviewTranscript(ctx);
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PROBLEM_INTERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseProblemInterviewJson(text, forceDone);
}

// Claude path — cheap/fast tier, same rationale as reasonAboutAlignmentClaude:
// a short, grounded conversational turn, not a research task.
async function generateProblemInterviewTurnClaude(ctx: ProblemInterviewContext, forceDone: boolean): Promise<ProblemInterviewResult> {
  const userContent = buildProblemInterviewTranscript(ctx);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 700,
    temperature: 0.5,
    system: PROBLEM_INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseProblemInterviewJson(text, forceDone);
}

export async function generateProblemInterviewTurn(ctx: ProblemInterviewContext): Promise<ProblemInterviewResult> {
  const founderTurns = ctx.history.filter(t => t.role === 'founder').length + 1;
  const forceDone = founderTurns >= PROBLEM_INTERVIEW_MAX_FOUNDER_TURNS;
  if (anthropicClient) {
    try {
      return await generateProblemInterviewTurnClaude(ctx, forceDone);
    } catch (err: any) {
      console.error('[problem-interview] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateProblemInterviewTurnOllama(ctx, forceDone);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic "Sage interviews you" -- the same conversational-extraction
// mechanism as the problem interview above, generalized so any free-text
// list-building step (not just Hone step 2) can offer a "talk it through"
// option instead of only a static/AI-chip picker. Parameterized by a
// `topic` key so each step gets its own grounded system prompt while
// sharing the transcript-building, JSON-parsing, turn-cap, and Ollama-
// first/Claude-fallback plumbing.
//
// NOTE: unlike the older `generateProblemInterviewTurn` above (which is
// Claude-first with a catch-and-fallback to Ollama), this generic version
// uses the app's newer Ollama-first/Claude-on-slow-or-error priority via
// `generateChipsOllamaFirst`, matching the chip generators. The problem
// interview is left as-is rather than risked in this pass.
// ─────────────────────────────────────────────────────────────────────────────

export type StepInterviewTopic = 'persona' | 'coping';

export interface StepInterviewTurn {
  role: 'sage' | 'founder';
  text: string;
}

export type StepInterviewEvidence = 'observed' | 'heard' | 'assumed';

export interface StepInterviewExtracted {
  text: string;
  evidence: StepInterviewEvidence;
}

export interface StepInterviewResult {
  reply: string;
  done: boolean;
  extracted: StepInterviewExtracted[];
}

export interface StepInterviewContext {
  topic: StepInterviewTopic;
  oneLiner?: string;
  segmentRole?: string;
  segmentDetail?: string;
  history: StepInterviewTurn[];
  founderMessage: string;
}

interface StepInterviewTopicConfig {
  systemPrompt: string;
  fallbackCloser: string;
  maxFounderTurns: number;
}

const STEP_INTERVIEW_TOPICS: Record<StepInterviewTopic, StepInterviewTopicConfig> = {
  persona: {
    maxFounderTurns: 4,
    fallbackCloser: "Thanks -- that's enough to sketch a segment. Refine it below, or keep describing more yourself.",
    systemPrompt: `You are Sage, running a short discovery interview with a founder to help them name the specific group of people who have this problem. The goal is a real segment -- a role or situation, not a vague label like "small business owners" or "busy people." You are interviewing the FOUNDER about who they've actually observed or heard has this problem -- you are never the customer, and you never invent who they are.

Ask about ONE concrete person or type of person: someone the founder has actually seen or heard struggle with this. Push for what makes them distinct -- their role, their context, the situation they're in -- rather than accepting a generic label. Ask exactly one question per turn, under 30 words, in a direct and curious voice. Never suggest a segment the founder hasn't already described; you only ask, you never supply plausible answers.

After the founder's newest reply, decide two things:

1. EXTRACT: is anything said so far -- across the whole conversation, not just the newest message -- concrete enough to stand as a segment description? Write each as a short phrase (under 20 words) naming who they are and their situation, built ONLY from what the founder actually said. Tag its evidence: "observed" if the founder personally watched it, "heard" if a customer told them directly, "assumed" if the founder is guessing or inferring. If nothing is concrete enough yet, extracted must be an empty array. Return the FULL list of everything extractable so far, not only what's new.

2. CONTINUE OR STOP: keep going only if there's a genuinely new angle worth asking about and the founder is still giving you concrete detail. Stop (done: true) once you have at least one solid extracted segment and either four founder turns have passed or the replies have gone thin or repetitive. When done, "reply" should be a brief, warm closing line (under 20 words) -- not another question.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"reply": "<your next question, or a short closing line if done>", "done": <boolean>, "extracted": [{"text": "<segment description>", "evidence": "observed"|"heard"|"assumed"}, ...]}`,
  },
  coping: {
    maxFounderTurns: 4,
    fallbackCloser: "Thanks -- that's plenty to go on. Pick from what's below, or keep describing more yourself.",
    systemPrompt: `You are Sage, running a short discovery interview with a founder about how people currently cope with this problem today -- what they already do, however imperfect, before a product like the founder's exists. You are interviewing the FOUNDER about what they've actually observed or heard -- you are never the customer, and you never invent a workaround they haven't described.

Ground every question in the founder's named segment, never in "your customer" generically. Ask about ONE concrete workaround at a time: what has the founder actually seen or heard someone do to deal with this problem, and how well it actually works for them. Ask exactly one question per turn, under 30 words, in a direct and curious voice. Never suggest a workaround the founder hasn't already described.

After the founder's newest reply, decide two things:

1. EXTRACT: is anything said so far -- across the whole conversation, not just the newest message -- concrete enough to stand as a coping-behavior statement? Write each as a short statement (under 25 words) built ONLY from what the founder actually said. Tag its evidence: "observed" if the founder personally watched it happen, "heard" if a customer told them directly, "assumed" if the founder is guessing or inferring. If nothing is concrete enough yet, extracted must be an empty array. Return the FULL list of everything extractable so far, not only what's new.

2. CONTINUE OR STOP: keep going only if there's a genuinely new angle worth asking about and the founder is still giving you concrete detail. Stop (done: true) once you have at least one solid extracted workaround and either four founder turns have passed or the replies have gone thin or repetitive. When done, "reply" should be a brief, warm closing line (under 20 words) -- not another question.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"reply": "<your next question, or a short closing line if done>", "done": <boolean>, "extracted": [{"text": "<coping behavior>", "evidence": "observed"|"heard"|"assumed"}, ...]}`,
  },
};

function buildStepInterviewTranscript(ctx: StepInterviewContext, cfg: StepInterviewTopicConfig): string {
  const lines: string[] = [];
  if (ctx.oneLiner) lines.push(`Founder's idea: ${ctx.oneLiner}`);
  const segment = [ctx.segmentRole, ctx.segmentDetail].filter(Boolean).join(' -- ');
  lines.push(`Segment: ${segment || '(not yet named)'}`);
  if (ctx.history.length) {
    lines.push('', 'Conversation so far:');
    ctx.history.forEach(turn => lines.push(`${turn.role === 'founder' ? 'Founder' : 'Sage'}: ${turn.text}`));
  }
  lines.push('', `Founder's newest reply: ${ctx.founderMessage}`);
  const founderTurns = ctx.history.filter(t => t.role === 'founder').length + 1;
  if (founderTurns >= cfg.maxFounderTurns) {
    lines.push('', `This is founder turn ${founderTurns} -- you must set "done": true.`);
  }
  return lines.join('\n');
}

function sanitizeStepInterviewExtracted(raw: any): StepInterviewExtracted[] {
  if (!Array.isArray(raw)) return [];
  const EVIDENCE: StepInterviewEvidence[] = ['observed', 'heard', 'assumed'];
  return raw
    .map((item: any) => {
      const text = typeof item?.text === 'string' ? item.text.trim().slice(0, 140) : '';
      const evidence: StepInterviewEvidence = EVIDENCE.includes(item?.evidence) ? item.evidence : 'heard';
      return text ? { text, evidence } : null;
    })
    .filter((x: StepInterviewExtracted | null): x is StepInterviewExtracted => x !== null)
    .slice(0, 8);
}

function parseStepInterviewJson(text: string, forceDone: boolean, cfg: StepInterviewTopicConfig): StepInterviewResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response -- please try again.');
  }
  const modelReply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  const done = forceDone || parsed.done === true;
  const reply = done
    ? (modelReply && !modelReply.endsWith('?') ? modelReply : cfg.fallbackCloser)
    : (modelReply || 'Thanks -- that gives me enough to work with.');
  return {
    reply,
    done,
    extracted: sanitizeStepInterviewExtracted(parsed.extracted),
  };
}

async function generateStepInterviewTurnOllama(ctx: StepInterviewContext, forceDone: boolean, cfg: StepInterviewTopicConfig): Promise<StepInterviewResult> {
  const userContent = buildStepInterviewTranscript(ctx, cfg);
  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: cfg.systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model -- make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }
  const text: string = res.data?.message?.content || '';
  return parseStepInterviewJson(text, forceDone, cfg);
}

async function generateStepInterviewTurnClaude(ctx: StepInterviewContext, forceDone: boolean, cfg: StepInterviewTopicConfig): Promise<StepInterviewResult> {
  const userContent = buildStepInterviewTranscript(ctx, cfg);
  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 700,
    temperature: 0.5,
    system: cfg.systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });
  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer -- please try again.');
  }
  return parseStepInterviewJson(text, forceDone, cfg);
}

export async function generateStepInterviewTurn(ctx: StepInterviewContext): Promise<StepInterviewResult> {
  const cfg = STEP_INTERVIEW_TOPICS[ctx.topic];
  if (!cfg) throw new Error(`Unknown interview topic: ${ctx.topic}`);
  const founderTurns = ctx.history.filter(t => t.role === 'founder').length + 1;
  const forceDone = founderTurns >= cfg.maxFounderTurns;
  return generateChipsOllamaFirst(
    `step-interview:${ctx.topic}`,
    () => generateStepInterviewTurnOllama(ctx, forceDone, cfg),
    anthropicClient ? () => generateStepInterviewTurnClaude(ctx, forceDone, cfg) : null
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Shape Step 2 — "Draft my MVP hypothesis"
// ─────────────────────────────────────────────────────────────────────────

export interface MvpHypothesisContext {
  oneLiner?: string;
  validatedProblem?: string;
  persona?: string;
  confirmedPains?: string[];
  keyInsights?: string[];
  learnings?: string[];
  surprises?: string[];
  demandSignalCount?: number;
}

export interface MvpHypothesisCandidate {
  productType: string[];
  primaryUser: string;
  mvpAction: string[];
  mvpOutcome: string[];
  rationale: string;
}

// These four lists must stay in sync with the chip vocab in the Shape
// "What will you build?" step (frontend/src/pages/WorkPage.tsx, step s1) —
// the AI is constrained to only pick from these exact strings so its
// suggestions map cleanly onto the existing chip UI.
const HYPOTHESIS_TYPE_CHIPS = ['Web app', 'Mobile app', 'Chrome extension', 'Slack bot', 'API', 'Marketplace', 'Dashboard', 'AI tool', 'Automation'];
const HYPOTHESIS_ACTION_CHIPS = ['find', 'manage', 'automate', 'track', 'connect', 'generate', 'organise', 'analyse', 'share'];
const HYPOTHESIS_OUTCOME_CHIPS = ['save time', 'reduce errors', 'make money', 'grow faster', 'stay organised', 'make decisions', 'ship faster', 'focus better'];

const MVP_HYPOTHESIS_SYSTEM_PROMPT = `You are helping a founder draft their MVP hypothesis — the smallest thing they should build first — based on the validated evidence below from their customer discovery interviews. This is the single highest-stakes step in scoping: too broad and they build for months without learning anything, too narrow and it doesn't actually address the real pain.

Ground every candidate directly in the evidence given — the confirmed pains, the persona, the key insights, what was learned during validation. Do not invent evidence that isn't there. If the evidence is thin, say so implicitly by keeping the candidate narrow and simple rather than inventing detail to fill space.

You MUST build each candidate using ONLY these exact values (verbatim, case-sensitive) — never invent new ones:
- productType: pick 1 (rarely 2) values from exactly this list: ${HYPOTHESIS_TYPE_CHIPS.map(v => `"${v}"`).join(', ')}
- mvpAction: pick 1 (rarely 2) values from exactly this list: ${HYPOTHESIS_ACTION_CHIPS.map(v => `"${v}"`).join(', ')}
- mvpOutcome: pick 1 (rarely 2) values from exactly this list: ${HYPOTHESIS_OUTCOME_CHIPS.map(v => `"${v}"`).join(', ')}
- primaryUser: a short (2-6 word) free-text phrase naming the specific persona, grounded in the given persona/evidence — not from a fixed list.

Generate 2-3 distinct candidates, ordered from smallest/safest scope to more ambitious. Each needs a one-sentence rationale (under 30 words) explaining specifically why it's scoped that way given the evidence — reference the actual evidence, not generic MVP advice.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"candidates": [{"productType": ["<value from list>"], "primaryUser": "<short phrase>", "mvpAction": ["<value from list>"], "mvpOutcome": ["<value from list>"], "rationale": "<one sentence, under 30 words>"}, ...]}`;

function buildMvpHypothesisUserContent(ctx: MvpHypothesisContext): string {
  const lines: string[] = [];
  if (ctx.oneLiner?.trim()) lines.push(`Idea: ${ctx.oneLiner.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Persona: ${ctx.persona.trim()}`);
  if (ctx.confirmedPains?.length) lines.push(`Confirmed pain points from interviews:\n${ctx.confirmedPains.map(p => `- ${p}`).join('\n')}`);
  if (ctx.keyInsights?.length) lines.push(`Key insights from interviews:\n${ctx.keyInsights.map(i => `- ${i}`).join('\n')}`);
  if (ctx.learnings?.length) lines.push(`What the founder confirmed during validation: ${ctx.learnings.join(', ')}`);
  if (ctx.surprises?.length) lines.push(`Surprises during validation: ${ctx.surprises.join(', ')}`);
  if (typeof ctx.demandSignalCount === 'number' && ctx.demandSignalCount > 0) lines.push(`Demand signals collected (LOIs/pre-orders): ${ctx.demandSignalCount}`);

  return lines.length
    ? lines.join('\n\n')
    : "The founder hasn't captured much validated evidence yet — draft cautious, narrowly-scoped candidates and lean on the persona/idea if given, otherwise keep it generic.";
}

function parseMvpHypothesisJson(text: string): MvpHypothesisCandidate[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawCandidates: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.candidates) ? parsed.candidates : [];

  // Defensive sanitization: drop any AI-hallucinated values that fall
  // outside the fixed chip vocab, since the frontend renders these
  // straight into the existing chip UI and can't handle arbitrary values.
  const sanitizeList = (v: any, allowed: string[]): string[] => {
    const arr = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
    const cleaned = arr.filter((x: any) => typeof x === 'string' && allowed.includes(x));
    return Array.from(new Set(cleaned)).slice(0, 2);
  };

  const candidates: MvpHypothesisCandidate[] = rawCandidates
    .map((c: any) => ({
      productType: sanitizeList(c?.productType, HYPOTHESIS_TYPE_CHIPS),
      primaryUser: typeof c?.primaryUser === 'string' ? c.primaryUser.trim().slice(0, 60) : '',
      mvpAction: sanitizeList(c?.mvpAction, HYPOTHESIS_ACTION_CHIPS),
      mvpOutcome: sanitizeList(c?.mvpOutcome, HYPOTHESIS_OUTCOME_CHIPS),
      rationale: typeof c?.rationale === 'string' ? c.rationale.trim().slice(0, 220) : '',
    }))
    .filter(c => c.productType.length && c.primaryUser && c.mvpAction.length && c.rationale)
    .slice(0, 3);

  if (!candidates.length) {
    throw new Error('The AI did not return any usable hypotheses — please try again.');
  }
  return candidates;
}

// Ollama path — the original, always-available implementation.
async function generateMvpHypothesesOllama(ctx: MvpHypothesisContext): Promise<MvpHypothesisCandidate[]> {
  const userContent = buildMvpHypothesisUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: MVP_HYPOTHESIS_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseMvpHypothesisJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the flagship model tier: this is the single highest-stakes
// scoping decision in the app (per the prompt's own framing), so it gets
// the same quality tier as Discovery Guide and Market Snapshot. No web
// search — grounded entirely in the founder's own validated evidence.
async function generateMvpHypothesesClaude(ctx: MvpHypothesisContext): Promise<MvpHypothesisCandidate[]> {
  const userContent = buildMvpHypothesisUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1200,
    temperature: 0.5,
    system: MVP_HYPOTHESIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseMvpHypothesisJson(text);
}

export async function generateMvpHypotheses(ctx: MvpHypothesisContext): Promise<MvpHypothesisCandidate[]> {
  if (anthropicClient) {
    try {
      return await generateMvpHypothesesClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take MVP hypothesis generation down entirely.
      console.error('[mvp-hypothesis] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateMvpHypothesesOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Shape Step 3 — "Suggest my 5 features" + "Check my features"
// ─────────────────────────────────────────────────────────────────────────

export interface FeatureEvidenceContext {
  oneLiner?: string;
  simplestVersion?: string; // the MVP hypothesis from Shape Step 2
  validatedProblem?: string;
  persona?: string;
  confirmedPains?: string[];
  confirmedInsights?: string[];
  surprisingInsights?: string[];
  bustedInsights?: string[]; // things the founder assumed but interviews disproved — negative evidence
  demandSignalCount?: number;
  // Informal reaction tags the founder self-selected after posting their
  // hypothesis to the community (e.g. "Suggested a pivot", "3+ people want
  // it") — subjective, not interview evidence, so treated as a soft signal
  // rather than something that can back a feature on its own.
  communityFeedback?: string[];
}

export interface FeatureSuggestion {
  title: string;
  rationale: string;
}

const FEATURE_SUGGEST_SYSTEM_PROMPT = `You are helping a founder pick the 5 features of their MVP, based on the validated evidence below from their customer discovery interviews and the MVP hypothesis they've already scoped.

Ground every suggestion directly in the evidence given — confirmed pains, key insights, the MVP hypothesis. Do not invent evidence that isn't there. Every feature must be something that directly serves the stated MVP hypothesis — reject anything that's a "nice to have" tangent, no matter how well evidenced, if it doesn't serve the hypothesis.

If "Community reaction" below includes a pivot suggestion or a request to simplify, bias toward the smallest, most essential feature set — favor cutting scope over adding it. If the reaction is strongly positive or shows demand, treat that as a mild added confidence signal only — it is informal and subjective, and never a substitute for the interview evidence above.

Order the 5 features from most essential/most evidenced first to least. Each feature needs:
- "title": a short (under 8 words) concrete feature name, stated as a capability (e.g. "One-click CSV import", not "Users should be able to import data somehow")
- "rationale": one sentence, under 25 words, citing the SPECIFIC evidence behind it (a confirmed pain, an insight, the hypothesis) — not generic MVP advice

Respond with ONLY a JSON object, no other text, in this exact shape:
{"features": [{"title": "<feature name>", "rationale": "<one sentence, under 25 words>"}, ...]}`;

function buildFeatureEvidenceLines(ctx: FeatureEvidenceContext): string[] {
  const lines: string[] = [];
  if (ctx.oneLiner?.trim()) lines.push(`Idea: ${ctx.oneLiner.trim()}`);
  if (ctx.simplestVersion?.trim()) lines.push(`MVP hypothesis (what they've already decided to build): ${ctx.simplestVersion.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Persona: ${ctx.persona.trim()}`);
  if (ctx.confirmedPains?.length) lines.push(`Confirmed pain points from interviews:\n${ctx.confirmedPains.map(p => `- ${p}`).join('\n')}`);
  if (ctx.confirmedInsights?.length) lines.push(`Confirmed insights (real pain, multiple people):\n${ctx.confirmedInsights.map(i => `- ${i}`).join('\n')}`);
  if (ctx.surprisingInsights?.length) lines.push(`Surprising insights from interviews:\n${ctx.surprisingInsights.map(i => `- ${i}`).join('\n')}`);
  if (ctx.bustedInsights?.length) lines.push(`Things the founder assumed but interviews DISPROVED (do not build for these):\n${ctx.bustedInsights.map(i => `- ${i}`).join('\n')}`);
  if (typeof ctx.demandSignalCount === 'number' && ctx.demandSignalCount > 0) lines.push(`Demand signals collected (LOIs/pre-orders): ${ctx.demandSignalCount}`);
  if (ctx.communityFeedback?.length) lines.push(`Community reaction when the founder shared their hypothesis (informal, self-tagged — not interview evidence): ${ctx.communityFeedback.join(', ')}`);
  return lines;
}

export async function generateFeatureSuggestions(ctx: FeatureEvidenceContext): Promise<FeatureSuggestion[]> {
  const lines = buildFeatureEvidenceLines(ctx);
  const userContent = lines.length
    ? lines.join('\n\n')
    : "The founder hasn't captured much validated evidence yet — suggest cautious, generic-but-sensible MVP features based only on the idea/hypothesis if given.";

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: FEATURE_SUGGEST_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.5 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawFeatures: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.features) ? parsed.features : [];
  const features: FeatureSuggestion[] = rawFeatures
    .filter((f: any) => f && typeof f.title === 'string' && f.title.trim())
    .map((f: any) => ({ title: f.title.trim().slice(0, 80), rationale: typeof f.rationale === 'string' ? f.rationale.trim().slice(0, 180) : '' }))
    .slice(0, 5);

  if (!features.length) {
    throw new Error('The AI did not return any usable features — please try again.');
  }
  return features;
}

export interface FeatureEvidenceCheckResult {
  feature: string;
  status: 'backed' | 'no-evidence' | 'counter';
  rationale: string;
}

const FEATURE_CHECK_SYSTEM_PROMPT = `You are checking a founder's chosen MVP features against their own customer discovery evidence, to catch scope creep before they start building — this is the single most valuable check in the whole app, so be honest and specific, not encouraging by default.

For EACH feature listed below, classify it as exactly one of:
- "backed": directly supported by a confirmed pain point, insight, or demand signal given below
- "no-evidence": plausible but nothing in the given evidence actually supports it — it may just be founder assumption
- "counter": it maps to something the evidence says was DISPROVED (a "busted" insight) — a real red flag, not just a shrug

"Community reaction" tags, if given, are informal and self-selected by the founder — not interview evidence. You may reference them in a rationale as context (e.g. a pivot-suggestion tag alongside a "no-evidence" feature is worth flagging together), but never use them alone to justify "backed".

Give a one-sentence reason (under 25 words) for each, citing the specific evidence (or specifically noting the absence of it, or naming what it contradicts).

Respond with ONLY a JSON object, no other text, in this exact shape, with EXACTLY one entry per feature given, IN THE SAME ORDER:
{"results": [{"status": "backed" | "no-evidence" | "counter", "rationale": "<one sentence, under 25 words>"}, ...]}`;

export async function checkFeatureEvidence(features: string[], ctx: FeatureEvidenceContext): Promise<FeatureEvidenceCheckResult[]> {
  const cleanFeatures = features.map(f => (f || '').trim()).filter(Boolean).slice(0, 5);
  if (!cleanFeatures.length) return [];

  const lines = buildFeatureEvidenceLines(ctx);
  lines.push('', `Features to check, in order:\n${cleanFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  const userContent = lines.join('\n\n');

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: FEATURE_CHECK_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawResults: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.results) ? parsed.results : [];

  // Defensive: map results back onto the ORIGINAL feature list by position,
  // never trusting the AI to echo the feature text back correctly. If the
  // AI returned fewer/more entries than features given, pad/truncate rather
  // than risk a mismatched label ending up next to the wrong feature.
  const results: FeatureEvidenceCheckResult[] = cleanFeatures.map((feature, i) => {
    const r = rawResults[i];
    const status: FeatureEvidenceCheckResult['status'] =
      r?.status === 'backed' || r?.status === 'no-evidence' || r?.status === 'counter' ? r.status : 'no-evidence';
    const rationale = typeof r?.rationale === 'string' && r.rationale.trim() ? r.rationale.trim().slice(0, 180) : 'Could not determine — treat as unverified.';
    return { feature, status, rationale };
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────
// Shape Step 4 — "Suggest my distribution channels" + "Suggest pricing" +
// pricing sanity check, all on "How will you reach users and charge?"
// ─────────────────────────────────────────────────────────────────────────

export interface OutreachStat {
  source: string;   // 'community' | 'linkedin' | 'email' — validation_contacts.source
  total: number;
  responded: number;
}

export interface DistributionContext {
  oneLiner?: string;
  validatedProblem?: string;
  persona?: string;
  outreachStats?: OutreachStat[]; // real response-rate data, when the founder has any
}

export interface DistributionSuggestion {
  channel: string;
  rationale: string;
  evidenceBased: boolean; // grounded in outreachStats, vs. persona-only reasoning
}

// Must stay in sync with DIST_CHIPS in frontend/src/pages/WorkPage.tsx (Shape
// step "How will you reach users and charge?") — constrained so suggestions
// map straight onto the existing chip UI.
const DISTRIBUTION_CHIPS = ['DM validation contacts', 'LinkedIn post', 'Slack communities', 'Cold email', 'Reddit', 'Twitter / X', 'Referrals', 'Product Hunt', 'Friends & network', 'Paid ads'];

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn outreach',
  community: 'Community/Slack outreach',
  email: 'Cold email outreach',
};

const DISTRIBUTION_SYSTEM_PROMPT = `You are helping a founder pick which channels to use to reach their first 10 users, based on real response-rate data from their own outreach where available, and their persona/problem otherwise.

You MUST pick "channel" values using ONLY these exact strings (verbatim, case-sensitive), never invent new ones: ${DISTRIBUTION_CHIPS.map(v => `"${v}"`).join(', ')}

Rules:
- If real outreach response-rate data is given below, that is ground truth — channels with a good response rate should rank first, and you should map them to the closest matching channel string from the list (e.g. "LinkedIn outreach: 5/8 responded" maps to "LinkedIn post" or "DM validation contacts", whichever fits the data better). Set "evidenceBased": true for these.
- Channels with NO outreach data are persona/problem-based guesses only — still useful, but set "evidenceBased": false and say so implicitly by keeping the rationale about fit, not results.
- Never claim a channel "worked" or "performed well" unless the given data actually shows that.

Return 3-5 ranked channels (best first), each with a one-sentence rationale (under 25 words).

Respond with ONLY a JSON object, no other text, in this exact shape:
{"channels": [{"channel": "<value from list>", "rationale": "<one sentence, under 25 words>", "evidenceBased": true|false}, ...]}`;

// Claude + live web search variant (opt-in via ANTHROPIC_API_KEY, same as
// Market Snapshot) — instead of falling back to pure persona/problem-fit
// guessing for channels with no outreach data yet, a live model can search
// for real, current typical response/conversion benchmarks for that
// channel and ground the rationale in what it finds.
const DISTRIBUTION_SYSTEM_PROMPT_CLAUDE = `You are helping a founder pick which channels to use to reach their first 10 users, based on real response-rate data from their own outreach where available, and search-grounded channel benchmarks otherwise.

You MUST pick "channel" values using ONLY these exact strings (verbatim, case-sensitive), never invent new ones: ${DISTRIBUTION_CHIPS.map(v => `"${v}"`).join(', ')}

Rules:
- If real outreach response-rate data is given below, that is ground truth — channels with a good response rate should rank first, and you should map them to the closest matching channel string from the list (e.g. "LinkedIn outreach: 5/8 responded" maps to "LinkedIn post" or "DM validation contacts", whichever fits the data better). Set "evidenceBased": true for these.
- For any channel on the list with NO outreach data given, use web search to find real, current typical response/conversion benchmarks for that channel in this founder's specific niche or a close comparable (e.g. typical cold-email reply rates for B2B SaaS outreach, typical signup conversion from a relevant subreddit or Slack community). Ground the rationale in what you find. Set "evidenceBased": false for these regardless of how strong the benchmark is — it's still not this founder's own data — but you may reference the benchmark by name in the rationale (e.g. "cold email to independent consultants typically sees a 1-3% reply rate, per general B2B benchmarks").
- Never claim a channel "worked" or "performed well" FOR THIS FOUNDER unless the given outreach data actually shows that.

Once you're done searching, respond with ONLY a JSON object as your final message — no narration, no markdown code fences, nothing before or after the JSON. Return 3-5 ranked channels (best first), each with a one-sentence rationale (under 25 words), in this exact shape:
{"channels": [{"channel": "<value from list>", "rationale": "<one sentence, under 25 words>", "evidenceBased": true|false}, ...]}`;

function buildDistributionUserContent(ctx: DistributionContext): string {
  const lines: string[] = [];
  if (ctx.oneLiner?.trim()) lines.push(`Idea: ${ctx.oneLiner.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Persona: ${ctx.persona.trim()}`);
  const stats = (ctx.outreachStats || []).filter(s => s && s.total > 0);
  if (stats.length) {
    lines.push(`Real outreach response rates so far (this IS ground truth, not a guess):\n${stats.map(s => `- ${SOURCE_LABELS[s.source] || s.source}: ${s.responded}/${s.total} responded`).join('\n')}`);
  } else {
    lines.push('No outreach history yet — base suggestions on persona/problem fit only, and be explicit that these are untested.');
  }
  return lines.join('\n\n');
}

function parseDistributionJson(text: string): DistributionSuggestion[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawChannels: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.channels) ? parsed.channels : [];
  const seen = new Set<string>();
  const channels: DistributionSuggestion[] = rawChannels
    .filter((c: any) => c && typeof c.channel === 'string' && DISTRIBUTION_CHIPS.includes(c.channel) && !seen.has(c.channel) && seen.add(c.channel))
    .map((c: any) => ({
      channel: c.channel,
      rationale: typeof c.rationale === 'string' ? c.rationale.trim().slice(0, 180) : '',
      evidenceBased: c.evidenceBased === true,
    }))
    .filter(c => c.rationale)
    .slice(0, 5);

  if (!channels.length) {
    throw new Error('The AI did not return any usable channel suggestions — please try again.');
  }
  return channels;
}

// Ollama path — the original, always-available implementation.
async function generateDistributionSuggestionsOllama(ctx: DistributionContext): Promise<DistributionSuggestion[]> {
  const userContent = buildDistributionUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: DISTRIBUTION_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseDistributionJson(text);
}

// Claude + live web search path — opt-in via the same ANTHROPIC_API_KEY
// used elsewhere in this file, on the flagship model tier. One of only two
// functions in this file (alongside Market Snapshot) where search
// genuinely earns its keep — see DISTRIBUTION_SYSTEM_PROMPT_CLAUDE above.
async function generateDistributionSuggestionsClaude(ctx: DistributionContext): Promise<DistributionSuggestion[]> {
  const userContent = buildDistributionUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0.4,
    system: DISTRIBUTION_SYSTEM_PROMPT_CLAUDE,
    tools: [
      { type: 'web_search_20260318', name: 'web_search', max_uses: 5 } as any,
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseDistributionJson(text);
}

export async function generateDistributionSuggestions(ctx: DistributionContext): Promise<DistributionSuggestion[]> {
  if (anthropicClient) {
    try {
      return await generateDistributionSuggestionsClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take distribution suggestions down entirely.
      console.error('[distribution] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateDistributionSuggestionsOllama(ctx);
}

export interface PricingContext {
  oneLiner?: string;
  validatedProblem?: string;
  persona?: string;
  whoPays?: string;          // Hone stage — who the founder believes pays
  quantifiedValue?: string;  // Hone stage — economic value of the pain, in the founder's own words
  demandSignalCount?: number; // count of loi/preorder demand signals (real money/signature behind it)
}

export interface PricingSuggestion {
  revenueModel: string[];
  pricePoint: string;
  rationale: string;
  evidenceBased: boolean;
}

// Must stay in sync with REV_CHIPS / PRICE_CHIPS in frontend/src/pages/WorkPage.tsx
// (same step as DISTRIBUTION_CHIPS above).
const REVENUE_MODEL_CHIPS = ['Monthly SaaS', 'Annual plan', 'One-time fee', 'Freemium', 'Pay per use', 'Commission %', 'Service fee', 'Free beta first'];
const PRICE_POINT_CHIPS = ['$9/mo', '$29/mo', '$49/mo', '$99/mo', '$200/mo', '$500/mo', 'Custom pricing'];

function buildPricingLines(ctx: PricingContext): string[] {
  const lines: string[] = [];
  if (ctx.oneLiner?.trim()) lines.push(`Idea: ${ctx.oneLiner.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Persona: ${ctx.persona.trim()}`);
  if (ctx.whoPays?.trim()) lines.push(`Who the founder believes pays: ${ctx.whoPays.trim()}`);
  if (ctx.quantifiedValue?.trim()) lines.push(`Economic value of the pain, in the founder's own words: ${ctx.quantifiedValue.trim()}`);
  if (typeof ctx.demandSignalCount === 'number' && ctx.demandSignalCount > 0) {
    lines.push(`Real demand signals collected: ${ctx.demandSignalCount} signed LOI(s)/pre-order(s) — actual money or signatures already behind this.`);
  } else {
    lines.push('No signed LOIs or pre-orders yet — treat willingness-to-pay as unconfirmed.');
  }
  return lines;
}

const PRICING_SUGGEST_SYSTEM_PROMPT = `You are helping a founder pick a revenue model and price point for their MVP. This is the one place in the app where being confidently wrong costs real money later, so be precise about what's actually backed by the founder's evidence vs. what's just a general SaaS pricing pattern.

You MUST use ONLY these exact values (verbatim, case-sensitive):
- revenueModel: pick 1 (rarely 2) values from exactly this list: ${REVENUE_MODEL_CHIPS.map(v => `"${v}"`).join(', ')}
- pricePoint: pick exactly 1 value from exactly this list: ${PRICE_POINT_CHIPS.map(v => `"${v}"`).join(', ')}

Rules:
- If the founder has signed LOIs/pre-orders or a clearly quantified economic value, ground your top candidate in that and set "evidenceBased": true.
- If you're relying on general "this is typical for this category of product" reasoning rather than the founder's own evidence, set "evidenceBased": false and make the rationale say so explicitly (e.g. "typical starting price for this category" rather than implying it's confirmed).
- Never state a general pricing pattern as if it were the founder's own validated data.

Return 2-3 candidates, each with a one-sentence rationale (under 30 words).

Respond with ONLY a JSON object, no other text, in this exact shape:
{"candidates": [{"revenueModel": ["<value from list>"], "pricePoint": "<value from list>", "rationale": "<one sentence, under 30 words>", "evidenceBased": true|false}, ...]}`;

// Claude + live web search variant (opt-in via ANTHROPIC_API_KEY, same as
// Market Snapshot and Distribution Suggestions) — instead of falling back
// to generic "typical SaaS pricing pattern" reasoning when the founder has
// no signed LOIs, a live model can search for real comparable products'
// actual pricing in this niche and ground the guess in something concrete.
const PRICING_SUGGEST_SYSTEM_PROMPT_CLAUDE = `You are helping a founder pick a revenue model and price point for their MVP. This is the one place in the app where being confidently wrong costs real money later, so be precise about what's actually backed by the founder's evidence vs. what's just a general SaaS pricing pattern vs. what a live search of comparable products actually supports.

You MUST use ONLY these exact values (verbatim, case-sensitive):
- revenueModel: pick 1 (rarely 2) values from exactly this list: ${REVENUE_MODEL_CHIPS.map(v => `"${v}"`).join(', ')}
- pricePoint: pick exactly 1 value from exactly this list: ${PRICE_POINT_CHIPS.map(v => `"${v}"`).join(', ')}

Rules:
- If the founder has signed LOIs/pre-orders or a clearly quantified economic value, ground your top candidate in that and set "evidenceBased": true.
- If you don't have the founder's own evidence to lean on, use web search to find what real, currently-operating comparable products in this niche actually charge, and ground your candidates in that instead of generic SaaS-pricing intuition. Set "evidenceBased": false regardless — it's a real comparable, but still not this founder's own validated willingness to pay — and name what you found in the rationale (e.g. "similar invoicing-automation tools for freelancers typically price around $20-40/mo").
- Never state a general pricing pattern, searched or not, as if it were the founder's own validated data.

Once you're done searching, respond with ONLY a JSON object as your final message — no narration, no markdown code fences, nothing before or after the JSON. Return 2-3 candidates, each with a one-sentence rationale (under 30 words), in this exact shape:
{"candidates": [{"revenueModel": ["<value from list>"], "pricePoint": "<value from list>", "rationale": "<one sentence, under 30 words>", "evidenceBased": true|false}, ...]}`;

function parsePricingSuggestJson(text: string): PricingSuggestion[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const rawCandidates: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const sanitizeModels = (v: any): string[] => {
    const arr = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
    const cleaned = arr.filter((x: any) => typeof x === 'string' && REVENUE_MODEL_CHIPS.includes(x));
    return Array.from(new Set(cleaned)).slice(0, 2);
  };

  const candidates: PricingSuggestion[] = rawCandidates
    .map((c: any) => ({
      revenueModel: sanitizeModels(c?.revenueModel),
      pricePoint: typeof c?.pricePoint === 'string' && PRICE_POINT_CHIPS.includes(c.pricePoint) ? c.pricePoint : '',
      rationale: typeof c?.rationale === 'string' ? c.rationale.trim().slice(0, 220) : '',
      evidenceBased: c?.evidenceBased === true,
    }))
    .filter(c => c.revenueModel.length && c.pricePoint && c.rationale)
    .slice(0, 3);

  if (!candidates.length) {
    throw new Error('The AI did not return any usable pricing suggestions — please try again.');
  }
  return candidates;
}

// Ollama path — the original, always-available implementation.
async function generatePricingSuggestionsOllama(ctx: PricingContext): Promise<PricingSuggestion[]> {
  const userContent = buildPricingLines(ctx).join('\n\n');

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PRICING_SUGGEST_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parsePricingSuggestJson(text);
}

// Claude + live web search path — opt-in via the same ANTHROPIC_API_KEY
// used elsewhere in this file, on the flagship model tier. The other of
// only two functions in this file (alongside Distribution Suggestions and
// Market Snapshot) where search genuinely earns its keep — see
// PRICING_SUGGEST_SYSTEM_PROMPT_CLAUDE above.
async function generatePricingSuggestionsClaude(ctx: PricingContext): Promise<PricingSuggestion[]> {
  const userContent = buildPricingLines(ctx).join('\n\n');

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0.4,
    system: PRICING_SUGGEST_SYSTEM_PROMPT_CLAUDE,
    tools: [
      { type: 'web_search_20260318', name: 'web_search', max_uses: 5 } as any,
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parsePricingSuggestJson(text);
}

export async function generatePricingSuggestions(ctx: PricingContext): Promise<PricingSuggestion[]> {
  if (anthropicClient) {
    try {
      return await generatePricingSuggestionsClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take pricing suggestions down entirely.
      console.error('[pricing-suggest] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generatePricingSuggestionsOllama(ctx);
}

export interface PricingCheckResult {
  status: 'backed' | 'no-evidence' | 'counter';
  rationale: string;
}

const PRICING_CHECK_SYSTEM_PROMPT = `You are sanity-checking a founder's CHOSEN revenue model and price point against their own evidence — whether it came from an AI suggestion or was hand-picked makes no difference, check it the same way either way.

Classify as exactly one of:
- "backed": the chosen model/price roughly matches what the evidence supports (who pays, quantified value, signed LOIs/pre-orders)
- "no-evidence": plausible but nothing given actually supports this specific price/model — likely just a guess
- "counter": the evidence actively contradicts this choice (e.g. a high price point with a quantified value that's clearly much lower, or a paid-upfront model with zero signed commitment and a payer who was never confirmed)

One sentence (under 30 words), specific to what was or wasn't found, not generic pricing advice.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"status": "backed" | "no-evidence" | "counter", "rationale": "<one sentence, under 30 words>"}`;

function buildPricingCheckUserContent(revenueModel: string[], pricePoint: string, ctx: PricingContext): string {
  const lines = buildPricingLines(ctx);
  lines.push('', `Chosen revenue model: ${revenueModel.filter(Boolean).join(', ') || '(none picked)'}`, `Chosen price point: ${pricePoint || '(none picked)'}`);
  return lines.join('\n\n');
}

function parsePricingCheckJson(text: string): PricingCheckResult {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const status: PricingCheckResult['status'] =
    parsed?.status === 'backed' || parsed?.status === 'no-evidence' || parsed?.status === 'counter' ? parsed.status : 'no-evidence';
  const rationale = typeof parsed?.rationale === 'string' && parsed.rationale.trim() ? parsed.rationale.trim().slice(0, 220) : 'Could not determine — treat as unverified.';
  return { status, rationale };
}

// Ollama path — the original, always-available implementation.
async function checkPricingEvidenceOllama(revenueModel: string[], pricePoint: string, ctx: PricingContext): Promise<PricingCheckResult> {
  const userContent = buildPricingCheckUserContent(revenueModel, pricePoint, ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PRICING_CHECK_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parsePricingCheckJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the cheap/fast model tier: a 3-way sanity check against
// evidence already given, not a lookup, so no web search tool is used.
async function checkPricingEvidenceClaude(revenueModel: string[], pricePoint: string, ctx: PricingContext): Promise<PricingCheckResult> {
  const userContent = buildPricingCheckUserContent(revenueModel, pricePoint, ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 300,
    temperature: 0.3,
    system: PRICING_CHECK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parsePricingCheckJson(text);
}

export async function checkPricingEvidence(revenueModel: string[], pricePoint: string, ctx: PricingContext): Promise<PricingCheckResult> {
  if (anthropicClient) {
    try {
      return await checkPricingEvidenceClaude(revenueModel, pricePoint, ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take the pricing evidence check down entirely.
      console.error('[pricing-check] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return checkPricingEvidenceOllama(revenueModel, pricePoint, ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 1 — "Build My MVP" (Build Specification generator). This is the
// first step of the redesigned Ship stage — an AI-Build-Launch orchestration
// layer proposed 2026-08-10. The Build Specification produced here is the
// single document every later Ship step (tool recommendation, UI prompts,
// master prompt, feature-by-feature coding prompts) is generated from, so
// this is the highest-leverage — and highest-stakes-for-accuracy — AI call
// in the whole stage. Grounded strictly in the founder's own validated
// evidence from Hone/Validate/Shape; never invents features or requirements
// beyond what's implied by that evidence.
// ─────────────────────────────────────────────────────────────────────────

export interface BuildSpecContext {
  ideaName?: string;
  oneLiner?: string;
  validatedProblem?: string;
  persona?: string;
  productType?: string[];   // Shape Step 2 chip picks, if any
  mvpHypothesis?: string;   // Shape Step 2 — simplestVersion
  features?: string[];      // Shape Step 3 — feature1..feature10, in priority order
  outOfScope?: string[];    // Shape Step 3 — explicit v1 cuts
  buildApproach?: string;   // Shape Step 3 — code | nocode | hire
  distribution?: string[];  // Shape Step 4
  revenueModel?: string[];  // Shape Step 4
  pricePoint?: string;      // Shape Step 4
  payer?: string;           // Shape Step 4 — free text, chip-assisted
}

export interface BuildSpec {
  productDefinition: { name: string; customer: string; problem: string; outcome: string };
  mvpHypothesis: string;
  coreUserJourney: string[];
  featureList: string[];
  scopeCuts: string[];
  technicalRequirements: {
    appType: string;
    database: string;
    authentication: string;
    integrations: string[];
    payments: string;
    ai: string;
    analytics: string;
  };
  buildSequence: string[];
}

// Must stay in sync with the equivalent option lists in
// frontend/src/pages/WorkPage.tsx (ShipBuildSpecPanel) — the AI is
// constrained to these exact values so the dropdowns there always match.
const BUILD_APP_TYPE_CHIPS = ['Web app', 'Mobile app', 'Chrome extension', 'Slack bot', 'API', 'Marketplace', 'Dashboard', 'AI tool', 'Automation'];
const BUILD_DATABASE_CHIPS = ['None needed', 'Simple key-value store', 'Relational (Postgres/MySQL)', 'Document store (Mongo/Firestore)', 'Vector DB (for AI/semantic search)'];
const BUILD_AUTH_CHIPS = ['None needed', 'Email/password', 'Social login (Google/GitHub)', 'Magic link', 'SSO / enterprise'];
const BUILD_PAYMENTS_CHIPS = ['None needed', 'Stripe subscriptions', 'Stripe one-time', 'Marketplace payouts', 'Manual invoicing'];

function buildBuildSpecLines(ctx: BuildSpecContext): string[] {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Idea name: ${ctx.ideaName.trim()}`);
  if (ctx.oneLiner?.trim()) lines.push(`One-liner: ${ctx.oneLiner.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Persona: ${ctx.persona.trim()}`);
  if (ctx.productType?.length) lines.push(`Product type (from Shape): ${ctx.productType.join(', ')}`);
  if (ctx.mvpHypothesis?.trim()) lines.push(`MVP hypothesis (what they decided to build): ${ctx.mvpHypothesis.trim()}`);
  if (ctx.features?.length) lines.push(`Planned features, in priority order:\n${ctx.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  if (ctx.outOfScope?.length) lines.push(`Explicitly out of scope for v1: ${ctx.outOfScope.join(', ')}`);
  if (ctx.buildApproach?.trim()) lines.push(`Founder's build approach: ${ctx.buildApproach.trim()}`);
  if (ctx.distribution?.length) lines.push(`Distribution channels: ${ctx.distribution.join(', ')}`);
  if (ctx.revenueModel?.length) lines.push(`Revenue model: ${ctx.revenueModel.join(', ')}`);
  if (ctx.pricePoint?.trim()) lines.push(`Price point: ${ctx.pricePoint.trim()}`);
  if (ctx.payer?.trim()) lines.push(`Who pays: ${ctx.payer.trim()}`);
  return lines;
}

const BUILD_SPEC_SYSTEM_PROMPT = `You are a pragmatic senior product engineer helping a solo founder turn their validated idea into a concrete, buildable specification they can hand to an AI coding tool or a developer. This is the single document that everything else they build gets generated from, so be concrete and specific to THEIR idea — never generic boilerplate.

Ground everything in the evidence given below (validated problem, persona, MVP hypothesis, planned features, out-of-scope list). Do not invent features or requirements that aren't implied by what's given.

You MUST use ONLY these exact values (verbatim, case-sensitive) for the constrained fields:
- technicalRequirements.appType: pick exactly 1 from: ${BUILD_APP_TYPE_CHIPS.map(v => `"${v}"`).join(', ')}
- technicalRequirements.database: pick exactly 1 from: ${BUILD_DATABASE_CHIPS.map(v => `"${v}"`).join(', ')}
- technicalRequirements.authentication: pick exactly 1 from: ${BUILD_AUTH_CHIPS.map(v => `"${v}"`).join(', ')}
- technicalRequirements.payments: pick exactly 1 from: ${BUILD_PAYMENTS_CHIPS.map(v => `"${v}"`).join(', ')}

Other fields:
- productDefinition: name (short product name), customer (who it's for, from the persona), problem (the validated problem, one sentence), outcome (the outcome the user gets, one sentence)
- mvpHypothesis: restate the MVP hypothesis as one crisp sentence
- coreUserJourney: 3-6 ordered steps of what a user actually does, start to finish, in plain language (e.g. "Signs up with email", "Connects their Notion workspace", "Types a question in Slack")
- featureList: the planned features restated as concrete, buildable capabilities (not vague); keep the same count and order as given
- scopeCuts: short list of things explicitly NOT being built in v1 (from the out-of-scope list, plus any obvious scope creep to warn against)
- technicalRequirements.integrations: array of specific third-party services/APIs actually implied by the features (empty array if none)
- technicalRequirements.ai: one sentence on whether/how AI or an LLM is used (or "Not needed" if not implied)
- technicalRequirements.analytics: one sentence on what to track to validate the north star metric
- buildSequence: 5-8 ordered phases for building this specific MVP (e.g. "1. Auth + user accounts", "2. Core data model", "3. [specific feature]", ..., "Deploy + basic analytics") — concrete to this idea, not generic

Respond with ONLY a JSON object, no other text, in this exact shape:
{"productDefinition": {"name": "...", "customer": "...", "problem": "...", "outcome": "..."}, "mvpHypothesis": "...", "coreUserJourney": ["...", ...], "featureList": ["...", ...], "scopeCuts": ["...", ...], "technicalRequirements": {"appType": "...", "database": "...", "authentication": "...", "integrations": ["...", ...], "payments": "...", "ai": "...", "analytics": "..."}, "buildSequence": ["...", ...]}`;

function buildBuildSpecUserContent(ctx: BuildSpecContext): string {
  const lines = buildBuildSpecLines(ctx);
  return lines.length
    ? lines.join('\n\n')
    : "The founder hasn't captured much evidence yet — draft a cautious, minimal spec from whatever is given.";
}

function parseBuildSpecJson(text: string): BuildSpec {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const sanitizeOne = (v: any, allowed: string[]): string =>
    typeof v === 'string' && allowed.includes(v) ? v : allowed[0];
  const sanitizeStrArr = (v: any, max = 12): string[] =>
    (Array.isArray(v) ? v : []).filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 200)).slice(0, max);
  const sanitizeStr = (v: any, max = 300): string => typeof v === 'string' ? v.trim().slice(0, max) : '';

  const pd = parsed?.productDefinition || {};
  const tr = parsed?.technicalRequirements || {};

  const spec: BuildSpec = {
    productDefinition: {
      name: sanitizeStr(pd.name, 80),
      customer: sanitizeStr(pd.customer, 120),
      problem: sanitizeStr(pd.problem, 220),
      outcome: sanitizeStr(pd.outcome, 220),
    },
    mvpHypothesis: sanitizeStr(parsed?.mvpHypothesis, 220),
    coreUserJourney: sanitizeStrArr(parsed?.coreUserJourney, 8),
    featureList: sanitizeStrArr(parsed?.featureList, 12),
    scopeCuts: sanitizeStrArr(parsed?.scopeCuts, 10),
    technicalRequirements: {
      appType: sanitizeOne(tr.appType, BUILD_APP_TYPE_CHIPS),
      database: sanitizeOne(tr.database, BUILD_DATABASE_CHIPS),
      authentication: sanitizeOne(tr.authentication, BUILD_AUTH_CHIPS),
      integrations: sanitizeStrArr(tr.integrations, 8),
      payments: sanitizeOne(tr.payments, BUILD_PAYMENTS_CHIPS),
      ai: sanitizeStr(tr.ai, 200),
      analytics: sanitizeStr(tr.analytics, 200),
    },
    buildSequence: sanitizeStrArr(parsed?.buildSequence, 10),
  };

  if (!spec.productDefinition.name || !spec.featureList.length || !spec.buildSequence.length) {
    throw new Error('The AI did not return a usable build specification — please try again.');
  }
  return spec;
}

// Ollama path — the original, always-available implementation.
async function generateBuildSpecOllama(ctx: BuildSpecContext): Promise<BuildSpec> {
  const userContent = buildBuildSpecUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: BUILD_SPEC_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseBuildSpecJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the flagship model tier: this is the single highest-leverage
// document in the app — every later Ship step generates from its output —
// so it gets the same quality tier as Discovery Guide and MVP Hypothesis.
// No web search — grounded entirely in the founder's own validated
// evidence, and the technical-requirement fields are fixed enums anyway.
// Generous max_tokens for the full nested structure (journey, features,
// scope cuts, technical requirements, build sequence).
async function generateBuildSpecClaude(ctx: BuildSpecContext): Promise<BuildSpec> {
  const userContent = buildBuildSpecUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 3000,
    temperature: 0.4,
    system: BUILD_SPEC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseBuildSpecJson(text);
}

export async function generateBuildSpec(ctx: BuildSpecContext): Promise<BuildSpec> {
  if (anthropicClient) {
    try {
      return await generateBuildSpecClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take build spec generation down entirely.
      console.error('[build-spec] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateBuildSpecOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 2 — "Choose how you want to build" (Tool Recommendation). Picks
// ONE of three build paths — AI App Builder, AI Coding Environment, or
// Developer Handoff — based on how complex the Build Specification turned
// out to be and how technically confident the founder says they are.
// Deliberately does NOT ask the AI to name specific tools or prices: tool
// names and pricing are rendered from a small curated, hand-maintained list
// on the frontend (ShipBuildPathPanel), since letting a local LLM invent
// product names or dollar figures risks confidently wrong output in a
// place founders might actually act on (signing up for a paid tool).
// ─────────────────────────────────────────────────────────────────────────

export interface BuildPathContext {
  featureCount?: number;
  integrationsCount?: number;
  appType?: string;
  database?: string;
  authentication?: string;
  payments?: string;
  buildApproach?: string;       // Shape's code | nocode | hire
  technicalConfidence?: string; // founder self-report, this step
}

export interface BuildPathRecommendation {
  path: 'app-builder' | 'coding-env' | 'dev-handoff';
  rationale: string;
}

const BUILD_PATH_VALUES: BuildPathRecommendation['path'][] = ['app-builder', 'coding-env', 'dev-handoff'];

const BUILD_PATH_SYSTEM_PROMPT = `You are helping a founder decide HOW to build their MVP, given how complex their build specification turned out to be and how comfortable they are with code. Recommend exactly one of three paths:

- "app-builder": an AI app builder (chat-based, generates a working app from prompts, e.g. Lovable/Bolt/Replit). Best for simple-to-moderate specs and founders with little or no coding background.
- "coding-env": an AI-native coding environment (e.g. Cursor/Claude Code/Codex) used directly by the founder. Best for founders who are at least somewhat comfortable with code, or specs with meaningful technical complexity (multiple integrations, a real database/auth/payments setup) that benefit from more direct control.
- "dev-handoff": hand the spec to a hired/outsourced developer. Best when the spec is complex (many integrations, non-trivial technical requirements) AND the founder has little/no coding background, or when the founder said their build approach is to hire.

Weigh both signals — complexity of what needs to be built, and the founder's own comfort with code — rather than either alone. Give a one-sentence rationale (under 30 words) that references the SPECIFIC signals given (e.g. feature count, integrations, technical confidence), not generic advice.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"path": "app-builder" | "coding-env" | "dev-handoff", "rationale": "<one sentence, under 30 words>"}`;

function buildBuildPathLines(ctx: BuildPathContext): string[] {
  const lines: string[] = [];
  if (typeof ctx.featureCount === 'number') lines.push(`Number of features in the build spec: ${ctx.featureCount}`);
  if (typeof ctx.integrationsCount === 'number') lines.push(`Number of third-party integrations required: ${ctx.integrationsCount}`);
  if (ctx.appType?.trim()) lines.push(`App type: ${ctx.appType.trim()}`);
  if (ctx.database?.trim()) lines.push(`Database: ${ctx.database.trim()}`);
  if (ctx.authentication?.trim()) lines.push(`Authentication: ${ctx.authentication.trim()}`);
  if (ctx.payments?.trim()) lines.push(`Payments: ${ctx.payments.trim()}`);
  if (ctx.buildApproach?.trim()) lines.push(`Founder's stated build approach (from earlier in the app): ${ctx.buildApproach.trim()}`);
  if (ctx.technicalConfidence?.trim()) lines.push(`Founder's self-reported coding comfort: ${ctx.technicalConfidence.trim()}`);
  return lines;
}

function buildBuildPathUserContent(ctx: BuildPathContext): string {
  const lines = buildBuildPathLines(ctx);
  return lines.length
    ? lines.join('\n')
    : "No signals given — default to a cautious, low-commitment recommendation.";
}

function parseBuildPathJson(text: string): BuildPathRecommendation {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const path: BuildPathRecommendation['path'] = BUILD_PATH_VALUES.includes(parsed?.path) ? parsed.path : 'app-builder';
  const rationale = typeof parsed?.rationale === 'string' && parsed.rationale.trim() ? parsed.rationale.trim().slice(0, 220) : 'Could not determine a confident recommendation — pick whichever path feels right.';
  return { path, rationale };
}

// Ollama path — the original, always-available implementation.
async function recommendBuildPathOllama(ctx: BuildPathContext): Promise<BuildPathRecommendation> {
  const userContent = buildBuildPathUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: BUILD_PATH_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseBuildPathJson(text);
}

// Claude path — opt-in via the same ANTHROPIC_API_KEY used elsewhere in
// this file, on the cheap/fast model tier: a 3-way decision weighing two
// given signals, not a lookup, so no web search tool is used. Deliberately
// never asks the model to name specific tools or prices, same as the
// Ollama path — those come from a curated frontend list.
async function recommendBuildPathClaude(ctx: BuildPathContext): Promise<BuildPathRecommendation> {
  const userContent = buildBuildPathUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL_CHEAP,
    max_tokens: 300,
    temperature: 0.3,
    system: BUILD_PATH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseBuildPathJson(text);
}

export async function recommendBuildPath(ctx: BuildPathContext): Promise<BuildPathRecommendation> {
  if (anthropicClient) {
    try {
      return await recommendBuildPathClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take build path recommendation down entirely.
      console.error('[build-path] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return recommendBuildPathOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 3 — "Map your user flows & screens" (User Flow Generator +
// Screen Generator). Turns the accepted Build Spec's feature list into the
// minimum set of primary user journeys and a screen inventory needed to
// build the MVP, with each screen tagged with a coarse category and mapped
// back to the feature(s) it serves. This becomes the direct input to the
// UI Prompt Generator (P0-4), so screens/flows stay founder-editable on
// the frontend rather than being a one-shot result.
// ─────────────────────────────────────────────────────────────────────────

export interface FlowScreenContext {
  ideaName?: string;
  featureList?: string[];       // Build Spec's featureList
  coreUserJourney?: string[];   // Build Spec's coreUserJourney
  appType?: string;             // Build Spec's technicalRequirements.appType
  authentication?: string;
  payments?: string;
}

export interface UserFlow { name: string; steps: string[]; }

// Must stay in sync with SCREEN_CATEGORY_OPTS in
// frontend/src/pages/WorkPage.tsx (ShipFlowScreenPanel).
export type ScreenCategory = 'onboarding' | 'navigation' | 'core' | 'results' | 'account';

export interface Screen { name: string; purpose: string; category: ScreenCategory; features: string[]; }

export interface FlowScreenMap { userFlows: UserFlow[]; screens: Screen[]; }

const SCREEN_CATEGORY_VALUES: ScreenCategory[] = ['onboarding', 'navigation', 'core', 'results', 'account'];

function buildFlowScreenLines(ctx: FlowScreenContext): string[] {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Product name: ${ctx.ideaName.trim()}`);
  if (ctx.featureList?.length) lines.push(`Features to support:\n${ctx.featureList.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  if (ctx.coreUserJourney?.length) lines.push(`Core user journey (from the build spec): ${ctx.coreUserJourney.join(' → ')}`);
  if (ctx.appType?.trim()) lines.push(`App type: ${ctx.appType.trim()}`);
  if (ctx.authentication?.trim()) lines.push(`Authentication: ${ctx.authentication.trim()}`);
  if (ctx.payments?.trim()) lines.push(`Payments: ${ctx.payments.trim()}`);
  return lines;
}

const FLOW_SCREEN_SYSTEM_PROMPT = `You are a pragmatic product designer turning a founder's MVP feature list into the minimum set of user flows and screens needed to build it. Be concrete and specific to THEIR product — never generic boilerplate like an unexplained "Home screen".

Generate:
- userFlows: 2-5 primary user journeys (e.g. onboarding, the core workflow, viewing results/account) — each with a short name and 3-7 ordered steps in plain language, specific to this product.
- screens: the minimum screen inventory needed to support those flows and every feature given. Each screen needs a name, a one-sentence purpose, a category, and which of the given features it serves (empty array if the screen is purely navigational/account and doesn't serve a specific feature).

You MUST use ONLY these exact values (verbatim, case-sensitive) for each screen's "category":
${SCREEN_CATEGORY_VALUES.map(v => `"${v}"`).join(', ')}
- "onboarding": signup/login/first-run setup
- "navigation": shells, dashboards, menus that route to other screens
- "core": the main feature workflow screens
- "results": screens that show output/data back to the user
- "account": account, billing, settings

Ground every flow and screen in the feature list and app type given below — do not invent features that aren't implied by them. Keep it minimal: this is an MVP, not a full product.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"userFlows": [{"name": "...", "steps": ["...", ...]}, ...], "screens": [{"name": "...", "purpose": "...", "category": "onboarding" | "navigation" | "core" | "results" | "account", "features": ["...", ...]}, ...]}`;

function buildFlowScreenUserContent(ctx: FlowScreenContext): string {
  const lines = buildFlowScreenLines(ctx);
  return lines.length
    ? lines.join('\n\n')
    : "No feature list given yet — draft a minimal, generic starting flow/screen map for a simple web app.";
}

function parseFlowScreenJson(text: string): FlowScreenMap {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const sanitizeStrArr = (v: any, max = 12): string[] =>
    (Array.isArray(v) ? v : []).filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 200)).slice(0, max);
  const sanitizeStr = (v: any, max = 300): string => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const sanitizeCategory = (v: any): ScreenCategory => SCREEN_CATEGORY_VALUES.includes(v) ? v : 'core';

  const userFlows: UserFlow[] = (Array.isArray(parsed?.userFlows) ? parsed.userFlows : [])
    .filter((f: any) => f && typeof f.name === 'string' && f.name.trim())
    .map((f: any) => ({ name: sanitizeStr(f.name, 80), steps: sanitizeStrArr(f.steps, 10) }))
    .slice(0, 8);

  const screens: Screen[] = (Array.isArray(parsed?.screens) ? parsed.screens : [])
    .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
    .map((s: any) => ({
      name: sanitizeStr(s.name, 80),
      purpose: sanitizeStr(s.purpose, 220),
      category: sanitizeCategory(s.category),
      features: sanitizeStrArr(s.features, 8),
    }))
    .slice(0, 20);

  if (!userFlows.length || !screens.length) {
    throw new Error('The AI did not return a usable flow/screen map — please try again.');
  }
  return { userFlows, screens };
}

// Ollama path — the original, always-available implementation.
async function generateFlowsAndScreensOllama(ctx: FlowScreenContext): Promise<FlowScreenMap> {
  const userContent = buildFlowScreenUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: FLOW_SCREEN_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      // Higher than the other Ship generators (60s) — this prompt asks for
      // two nested arrays (flows + up to 20 screens), which the small local
      // model can genuinely take longer than a minute to produce in full.
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual to map this out — please try again.');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseFlowScreenJson(text);
}

// Claude path — opt-in via ANTHROPIC_API_KEY, on the flagship tier: this
// generates two nested arrays (flows + up to 20 screens) that need to stay
// grounded in the specific feature list, closer in shape to Build
// Specification than to the small quick-check functions.
async function generateFlowsAndScreensClaude(ctx: FlowScreenContext): Promise<FlowScreenMap> {
  const userContent = buildFlowScreenUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 3000,
    temperature: 0.4,
    system: FLOW_SCREEN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseFlowScreenJson(text);
}

export async function generateFlowsAndScreens(ctx: FlowScreenContext): Promise<FlowScreenMap> {
  if (anthropicClient) {
    try {
      return await generateFlowsAndScreensClaude(ctx);
    } catch (err: any) {
      console.error('[flows-screens] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateFlowsAndScreensOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 4 — "Generate your UI prompts" (AI UI Prompt Generator). One
// implementation-ready coding prompt per screen, meant to be pasted
// directly into an AI coding tool. Follows the source doc's "AI Prompt
// Standards": role, product context, target user, screen purpose + CTA,
// required components, empty/loading/error states, responsive behaviour,
// accessibility, an explicit no-scope-creep instruction, and acceptance
// criteria. Generated ONE screen at a time (never batched) since it's
// called once per screen from the frontend.
// ─────────────────────────────────────────────────────────────────────────

export interface UIPromptContext {
  ideaName?: string;
  validatedProblem?: string;
  persona?: string;
  appType?: string;
  authentication?: string;
  payments?: string;
  outOfScope?: string[];      // Build Spec's scopeCuts
  screenName: string;
  screenPurpose: string;
  screenCategory: string;
  screenFeatures: string[];
}

function buildUIPromptLines(ctx: UIPromptContext): string[] {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Product name: ${ctx.ideaName.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Target user: ${ctx.persona.trim()}`);
  if (ctx.appType?.trim()) lines.push(`App type: ${ctx.appType.trim()}`);
  lines.push(`Screen name: ${ctx.screenName}`);
  if (ctx.screenPurpose?.trim()) lines.push(`Screen purpose: ${ctx.screenPurpose.trim()}`);
  if (ctx.screenCategory?.trim()) lines.push(`Screen category: ${ctx.screenCategory.trim()}`);
  if (ctx.screenFeatures?.length) lines.push(`Features this screen serves: ${ctx.screenFeatures.join(', ')}`);
  if (ctx.authentication?.trim()) lines.push(`Authentication: ${ctx.authentication.trim()}`);
  if (ctx.payments?.trim()) lines.push(`Payments: ${ctx.payments.trim()}`);
  if (ctx.outOfScope?.length) lines.push(`Explicitly out of scope for v1 (do not build): ${ctx.outOfScope.join(', ')}`);
  return lines;
}

const UI_PROMPT_SYSTEM_PROMPT = `You are a senior product engineer writing an implementation-ready coding prompt for ONE specific screen of an MVP, to be pasted directly into an AI coding tool (like Lovable, Cursor, or Claude Code). Be concrete and specific to THIS screen and THIS product — never generic boilerplate.

The prompt you write MUST include, as clearly labeled sections (ALL CAPS section headers followed by a colon, blank line between sections):
- ROLE: one sentence framing the AI as an expert frontend/product engineer.
- PRODUCT CONTEXT: the product, its target user, and the validated problem it solves (one or two sentences).
- SCREEN: the screen's name, its purpose, and the primary user goal + main call-to-action on this screen.
- REQUIRED COMPONENTS: a concrete bullet list of the UI components this screen needs (forms, lists, cards, buttons, etc.), specific to its purpose and the features it serves.
- DATA: what data this screen reads or writes, in plain language (not a schema).
- STATES: explicitly describe the empty state, loading state, and error state for this screen.
- RESPONSIVE / MOBILE: one or two sentences on how this screen should adapt to mobile.
- ACCESSIBILITY: one or two sentences on accessibility expectations (labels, contrast, keyboard navigation).
- OUT OF SCOPE: an explicit instruction not to add functionality beyond this screen's stated purpose and the MVP's scope cuts given below.
- ACCEPTANCE CRITERIA: 3-5 concrete, testable bullet points for "done."

Ground everything in the product context, screen purpose, and features given below — do not invent requirements. Keep the whole prompt tight and actionable, not padded with filler.

Respond with ONLY the prompt text itself — no JSON, no code fences, no preamble like "Here's the prompt:", no meta-commentary before or after. Just the section headers and their content, ready to be copy-pasted as-is into an AI coding tool.`;

function buildUIPromptUserContent(ctx: UIPromptContext): string {
  return buildUIPromptLines(ctx).join('\n');
}

// Ollama path — the original, always-available implementation.
async function generateUIPromptOllama(ctx: UIPromptContext): Promise<string> {
  const userContent = buildUIPromptUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: UI_PROMPT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        // Deliberately NOT format:'json' here, unlike every other generator
        // in this file. The desired output is one long free-text block with
        // embedded newlines — forcing the small local model to also produce
        // valid escaped JSON around that text proved unreliable in practice
        // (it would either emit one key per section instead of a single
        // "prompt" string, or produce JSON that failed to parse outright).
        // Taking the raw chat response as the prompt sidesteps that failure
        // mode entirely; sanitizePromptText() below strips any incidental
        // code fences or wrapping quotes the model adds anyway.
        options: { temperature: 0.4 },
      },
      // Single screen, so lighter than the flows/screens generator, but
      // still a full multi-section prompt — give the local model room.
      { timeout: 240000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual to write this prompt — please try again.');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  const prompt = sanitizePromptText(text).slice(0, 6000);
  if (!prompt) {
    throw new Error('The AI did not return a usable prompt — please try again.');
  }
  return prompt;
}

// Claude path — opt-in via ANTHROPIC_API_KEY, on the flagship tier: this is
// the prompt that gets pasted straight into an AI coding tool, so it's
// worth the same quality bar as Build Specification and Flows & Screens.
// No JSON mode needed here (Claude has none to request) — the same
// sanitizePromptText() cleanup used on the Ollama path handles any
// incidental code fences or wrapping quotes.
async function generateUIPromptClaude(ctx: UIPromptContext): Promise<string> {
  const userContent = buildUIPromptUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    temperature: 0.4,
    system: UI_PROMPT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  const prompt = sanitizePromptText(text).slice(0, 6000);
  if (!prompt) {
    throw new Error('Claude did not return a usable prompt — please try again.');
  }
  return prompt;
}

export async function generateUIPrompt(ctx: UIPromptContext): Promise<string> {
  if (anthropicClient) {
    try {
      return await generateUIPromptClaude(ctx);
    } catch (err: any) {
      console.error('[ui-prompt] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateUIPromptOllama(ctx);
}

function sanitizePromptText(text: string): string {
  let t = text.trim();
  // Strip a wrapping code fence, if the model added one anyway.
  t = t.replace(/^```(?:\w+)?\s*/i, '').replace(/```\s*$/, '').trim();
  // Strip a single pair of wrapping quotes, if the model quoted the whole thing.
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('“') && t.endsWith('”'))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 6 — "Build your features" (AI Feature Builder). One Build Card
// per feature: user story, why it matters, UI/user flow, data & business
// logic, edge cases, and acceptance criteria. Several distinct string/array
// fields — the same shape as generateFlowsAndScreens above, which proved
// reliable with format:'json' — NOT one large free-text block (that shape
// is what made the first generateUIPrompt attempt unreliable; see the
// comment on generateUIPrompt above). The coding prompt and QA prompt
// derived from a card are assembled client-side by pure templating, same
// as the Master Prompt, so this function only needs to produce the
// qualitative fields.
// ─────────────────────────────────────────────────────────────────────────

export interface FeatureBuildCardContext {
  ideaName?: string;
  featureName: string;
  featureList?: string[];      // other features in the build spec, for dependency context
  validatedProblem?: string;
  persona?: string;
  appType?: string;
  outOfScope?: string[];
}

export interface FeatureBuildCard {
  userStory: string;
  whyMatters: string;
  uiFlow: string;
  dataLogic: string;
  edgeCases: string[];
  acceptanceCriteria: string[];
}

function buildFeatureBuildCardLines(ctx: FeatureBuildCardContext): string[] {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Product name: ${ctx.ideaName.trim()}`);
  lines.push(`Feature to build a card for: ${ctx.featureName}`);
  const otherFeatures = (ctx.featureList || []).filter(f => f !== ctx.featureName);
  if (otherFeatures.length) lines.push(`Other features already in the MVP (for context/dependencies, do not write cards for these): ${otherFeatures.join(', ')}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Target user: ${ctx.persona.trim()}`);
  if (ctx.appType?.trim()) lines.push(`App type: ${ctx.appType.trim()}`);
  if (ctx.outOfScope?.length) lines.push(`Explicitly out of scope for v1 (do not build): ${ctx.outOfScope.join(', ')}`);
  return lines;
}

const FEATURE_BUILD_CARD_SYSTEM_PROMPT = `You are a pragmatic senior product manager writing a Build Card for ONE specific feature of an MVP, so a founder (or an AI coding tool) knows exactly what to build. Be concrete and specific to THIS feature and THIS product — never generic boilerplate, and never describe a different feature.

Generate:
- userStory: one sentence in the form "As a [user], I want to [action], so that [benefit]," specific to this feature.
- whyMatters: one or two sentences on why this feature matters to the product's validated problem.
- uiFlow: 2-5 sentences describing the UI and user flow for this feature, specific to the product.
- dataLogic: 2-4 sentences on what data this feature reads/writes and any business logic or rules involved.
- edgeCases: 3-6 concrete edge cases to handle (e.g. empty state, invalid input, permission denied, network failure).
- acceptanceCriteria: 3-6 concrete, testable bullet points for "done."

Ground everything in the feature name and product context given below — do not invent requirements or drift into a different feature. Keep it tight and specific, not padded with filler.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"userStory": "...", "whyMatters": "...", "uiFlow": "...", "dataLogic": "...", "edgeCases": ["...", ...], "acceptanceCriteria": ["...", ...]}`;

function buildFeatureBuildCardUserContent(ctx: FeatureBuildCardContext): string {
  return buildFeatureBuildCardLines(ctx).join('\n');
}

function parseFeatureBuildCardJson(text: string): FeatureBuildCard {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }

  const sanitizeStr = (v: any, max = 400): string => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const sanitizeStrArr = (v: any, max = 8): string[] =>
    (Array.isArray(v) ? v : []).filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim().slice(0, 220)).slice(0, max);

  const card: FeatureBuildCard = {
    userStory: sanitizeStr(parsed?.userStory, 220),
    whyMatters: sanitizeStr(parsed?.whyMatters, 300),
    uiFlow: sanitizeStr(parsed?.uiFlow, 600),
    dataLogic: sanitizeStr(parsed?.dataLogic, 600),
    edgeCases: sanitizeStrArr(parsed?.edgeCases),
    acceptanceCriteria: sanitizeStrArr(parsed?.acceptanceCriteria),
  };

  if (!card.userStory && !card.uiFlow && !card.acceptanceCriteria.length) {
    throw new Error('The AI did not return a usable build card — please try again.');
  }
  return card;
}

// Ollama path — the original, always-available implementation.
async function generateFeatureBuildCardOllama(ctx: FeatureBuildCardContext): Promise<FeatureBuildCard> {
  const userContent = buildFeatureBuildCardUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: FEATURE_BUILD_CARD_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.4 },
      },
      // Six distinct fields (two of them arrays) — comparable in size to the
      // flows/screens generator, so the same generous timeout applies.
      { timeout: 120000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual to write this build card — please try again.');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return parseFeatureBuildCardJson(text);
}

// Claude path — opt-in via ANTHROPIC_API_KEY, on the flagship tier: this
// feeds straight into a per-feature coding prompt, same reasoning as
// generateUIPrompt and generateFlowsAndScreens above.
async function generateFeatureBuildCardClaude(ctx: FeatureBuildCardContext): Promise<FeatureBuildCard> {
  const userContent = buildFeatureBuildCardUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0.4,
    system: FEATURE_BUILD_CARD_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return parseFeatureBuildCardJson(text);
}

export async function generateFeatureBuildCard(ctx: FeatureBuildCardContext): Promise<FeatureBuildCard> {
  if (anthropicClient) {
    try {
      return await generateFeatureBuildCardClaude(ctx);
    } catch (err: any) {
      console.error('[feature-build-card] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateFeatureBuildCardOllama(ctx);
}

// ─────────────────────────────────────────────────────────────────────────
// Ship Step 7 — "Describe your next change" (Vibe Coding Coach). Turns a
// founder's plain-language change request (tagged with one of the source
// doc's 9 change categories: add a feature, change the UI, fix a bug,
// improve performance, add an integration, change the database, add
// payments, add analytics, make it mobile-friendly) into an
// implementation-ready coding prompt. Same free-text response strategy as
// generateUIPrompt above — NOT format:'json' — because the output is one
// prompt block with embedded newlines, and forcing that shape into JSON
// proved unreliable for this local model (see the comment on
// generateUIPrompt). The input here is also far less structured than any
// other Ship generator (an open-ended founder sentence, not a fixed set of
// fields), which is exactly the kind of output a rigid JSON schema would
// fight against.
// ─────────────────────────────────────────────────────────────────────────

export interface ChangeCoachContext {
  ideaName?: string;
  validatedProblem?: string;
  persona?: string;
  appType?: string;
  featureList?: string[];   // existing features, for dependency/regression context
  outOfScope?: string[];
  category: string;         // human-readable category label, e.g. "Add a feature"
  description: string;      // the founder's own plain-language request
}

function buildChangeCoachLines(ctx: ChangeCoachContext): string[] {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Product name: ${ctx.ideaName.trim()}`);
  if (ctx.validatedProblem?.trim()) lines.push(`Validated problem: ${ctx.validatedProblem.trim()}`);
  if (ctx.persona?.trim()) lines.push(`Target user: ${ctx.persona.trim()}`);
  if (ctx.appType?.trim()) lines.push(`App type: ${ctx.appType.trim()}`);
  if (ctx.featureList?.length) lines.push(`Features already built or planned for this MVP: ${ctx.featureList.join(', ')}`);
  if (ctx.outOfScope?.length) lines.push(`Explicitly out of scope for v1 (do not build): ${ctx.outOfScope.join(', ')}`);
  lines.push(`Change category: ${ctx.category}`);
  lines.push(`Founder's request, in their own words: ${ctx.description.trim()}`);
  return lines;
}

const CHANGE_COACH_SYSTEM_PROMPT = `You are a senior product engineer translating a non-technical founder's plain-language change request into an implementation-ready coding prompt for ONE specific change to an EXISTING MVP, to be pasted directly into an AI coding tool (like Lovable, Cursor, or Claude Code). Be concrete and specific to THIS product and THIS request — never generic boilerplate, and never invent a different change than what the founder asked for.

The prompt you write MUST include, as clearly labeled sections (ALL CAPS section headers followed by a colon, blank line between sections):
- ROLE: one sentence framing the AI as an expert engineer making a scoped change to an existing product (not building from scratch).
- PRODUCT CONTEXT: the product, its target user, and the validated problem it solves (one or two sentences).
- CHANGE REQUESTED: restate the founder's request clearly and specifically, in the given change category.
- EXISTING FUNCTIONALITY / DEPENDENCIES: what already exists in the product that this change touches or must not break, drawn from the feature list given below.
- REQUIREMENTS: concrete, specific requirements for this change — UI, data, and/or business-rule requirements as relevant to the change category (e.g. a UI change needs component/state detail, a database change needs schema/migration detail, a payments change needs provider/flow detail).
- EDGE CASES: 2-4 concrete edge cases this change must handle.
- OUT OF SCOPE: an explicit instruction not to add functionality beyond this one change, referencing the MVP's scope cuts given below where relevant.
- ACCEPTANCE CRITERIA: 3-5 concrete, testable bullet points for "done."

Ground everything in the product context, change category, and the founder's own words given below — do not invent requirements they didn't ask for. Keep the whole prompt tight and actionable, not padded with filler.

Respond with ONLY the prompt text itself — no JSON, no code fences, no preamble like "Here's the prompt:", no meta-commentary before or after. Just the section headers and their content, ready to be copy-pasted as-is into an AI coding tool.`;

function buildChangeCoachUserContent(ctx: ChangeCoachContext): string {
  return buildChangeCoachLines(ctx).join('\n');
}

// Ollama path — the original, always-available implementation.
async function generateChangeCodingPromptOllama(ctx: ChangeCoachContext): Promise<string> {
  const userContent = buildChangeCoachUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: CHANGE_COACH_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        // Deliberately NOT format:'json' — see the file-level comment above
        // this function and the identical reasoning on generateUIPrompt.
        options: { temperature: 0.4 },
      },
      // Single change request, comparable in size to a single screen prompt.
      { timeout: 240000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual to write this prompt — please try again.');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  const prompt = sanitizePromptText(text).slice(0, 6000);
  if (!prompt) {
    throw new Error('The AI did not return a usable prompt — please try again.');
  }
  return prompt;
}

// Claude path — opt-in via ANTHROPIC_API_KEY, on the flagship tier: same
// reasoning as generateUIPrompt — this is pasted straight into a coding
// tool against a live, existing product, so correctness matters more than
// speed or cost here. Reuses the same sanitizePromptText() cleanup.
async function generateChangeCodingPromptClaude(ctx: ChangeCoachContext): Promise<string> {
  const userContent = buildChangeCoachUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    temperature: 0.4,
    system: CHANGE_COACH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  const prompt = sanitizePromptText(text).slice(0, 6000);
  if (!prompt) {
    throw new Error('Claude did not return a usable prompt — please try again.');
  }
  return prompt;
}

export async function generateChangeCodingPrompt(ctx: ChangeCoachContext): Promise<string> {
  if (anthropicClient) {
    try {
      return await generateChangeCodingPromptClaude(ctx);
    } catch (err: any) {
      console.error('[change-coach] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateChangeCodingPromptOllama(ctx);
}
// ─────────────────────────────────────────────────────────────────────────
// Market Snapshot — Idea Step 1. Once a founder has typed their idea (name +
// one-liner), offer an AI-drafted domain classification, rough TAM/SAM
// estimate, and a short competitor list, rendered as an infographic on the
// frontend. IMPORTANT CAVEAT (read before touching the prompt): this uses
// the same small self-hosted Ollama model as everything else in this file,
// which has no live web/market-data access. Ad-hoc testing before building
// this found it (a) reliably returns real, currently-operating companies
// most of the time but (b) will occasionally invent a plausible-sounding
// company name with no indication it's fabricated, and (c) TAM/SAM figures
// are unsourced order-of-magnitude guesses, not real research. The prompt
// below pushes the model toward caution (real names it's confident about,
// or a generic description instead of guessing), but this cannot fully
// eliminate hallucination for a 3B local model — the frontend must always
// label this output as an AI draft to verify, never as fact.

// Keep this list in sync with DOMAIN_LABELS in frontend/src/pages/
// MyProgressPage.tsx / CommunityPage.tsx / WorkPage.tsx — the AI is
// constrained to these exact keys so its output always matches an existing
// domain badge/color/filter elsewhere in the app.
const MARKET_DOMAIN_KEYS = [
  'agritech', 'b2b-saas', 'cleantech', 'consumer', 'devtools', 'edtech',
  'fintech', 'foodtech', 'healthtech', 'hr-tech', 'legaltech', 'logistics',
  'marketplace', 'media', 'proptech',
];

export interface MarketSnapshotContext {
  ideaName?: string;
  oneLiner?: string;
  // Everything below is optional extra founder context gathered across Hone
  // (persona, problems, pain, existing alternatives, founder's own
  // synthesis) — available because this step now sits at the END of Hone
  // rather than early in Idea, so the AI has far more to ground its answer
  // in than the one-liner alone. All are best-effort free text the founder
  // wrote themselves — unvalidated assumptions, not facts, so the prompts
  // below treat them as directional signal, not ground truth.
  customerSegment?: string;
  whoPays?: string;
  problems?: string;
  painConsequences?: string;
  frequency?: string;
  existingAlternatives?: string;
  founderStatement?: string;
}

export type FeatureCoverage = 'yes' | 'partial' | 'no';

export interface MarketCompetitor {
  name: string;
  note: string;
  // Everything below is best-effort and frequently blank ('') — an offline
  // model has no way to verify a real competitor's actual price, rating,
  // install base or founding year, and a generic/unnamed entry (see the
  // competitors rule in the prompts below) has none of these by definition.
  // Blank is the honest answer; a guessed number is not.
  price?: string;
  area?: string;
  rating?: string;
  users?: string;
  founded?: string;
  // A rough, explicitly-labeled estimate ("~5-10%", "small niche player") —
  // never a bare precise number. The frontend always renders this with an
  // "AI estimate, unverified" affordance rather than as a stated fact.
  marketShare?: string;
  // Aligned 1:1 with MarketSnapshot.differentiators — features[i] describes
  // this competitor's coverage of differentiators[i].
  features?: FeatureCoverage[];
  // A free-text list of this competitor's own real features/capabilities —
  // NOT scored against differentiators and not bounded to them. This is
  // the "what does this product actually do" list, rendered as its own
  // side-by-side comparison table on the frontend.
  featureList?: string[];
}

export interface MarketSnapshot {
  domain: string;
  tam: { value: string; basis: string };
  sam: { value: string; basis: string };
  // 4-6 short, concrete capabilities worth comparing products on in this
  // specific niche — chosen by the AI, not the founder (who hasn't defined
  // features yet at this point in the flow).
  differentiators: string[];
  // Aligned 1:1 with differentiators — the AI's best guess at how the
  // founder's own idea (from their one-liner alone) covers each one.
  yourCoverage: FeatureCoverage[];
  competitors: MarketCompetitor[];
}

const MARKET_SNAPSHOT_SYSTEM_PROMPT = `You are a cautious startup market-research analyst helping a founder get a rough first read on their idea. You do not have live web access or real market databases — you are working from general knowledge only, so be honest about that limitation rather than inventing false precision.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"domain": "<one key>", "tam": {"value": "<rough $ figure, e.g. \\"$2B+\\">", "basis": "<one short sentence on how you're estimating this>"}, "sam": {"value": "<rough $ figure, smaller than TAM>", "basis": "<one short sentence>"}, "differentiators": ["<short capability>", ...], "yourCoverage": ["yes" | "partial" | "no", ...], "competitors": [{"name": "<company name>", "note": "<under 12 words on what they do>", "price": "<e.g. \\"$5.99/mo\\" or \\"Free\\", or \\"\\" if unknown>", "area": "<their market segment in a few words, or \\"\\">", "rating": "<e.g. \\"4.6\\", or \\"\\" if unknown>", "users": "<e.g. \\"1M+\\", or \\"\\" if unknown>", "founded": "<year, or \\"\\" if unknown>", "marketShare": "<rough estimate ONLY if you have a real basis, e.g. \\"~5-10%\\" or \\"small niche player\\" — or \\"\\" if you're just guessing>", "features": ["yes" | "partial" | "no", ...], "featureList": ["<short feature phrase>", ...]}]}

Rules:
- domain: pick exactly 1 key from this list (verbatim, case-sensitive): ${MARKET_DOMAIN_KEYS.map(v => `"${v}"`).join(', ')}
- tam/sam: give a rough order-of-magnitude estimate with a one-sentence basis. Be conservative — round numbers, not false precision. SAM must be smaller than TAM.
- differentiators: 4-6 short, concrete capabilities worth comparing products on in this specific niche (e.g. "Predictive reorder", "Price comparison") — not vague qualities like "good UX." These are what "features" below are scored against.
- yourCoverage: exactly one "yes"/"partial"/"no" per differentiator, your best guess at whether the founder's own idea (from their one-liner) covers it. Default to "partial" rather than guessing "yes" when genuinely unclear.
- competitors: list 3-5. ONLY name a specific real company if you are confident it actually exists and is a genuine competitor in this specific niche — not just the broader category. If you are not confident a specific named company is a close, real match, use a short generic description instead (e.g. {"name": "Generic AI writing tools", "note": "broad category, no single dominant player you're confident about"}) rather than guessing a name. It is better to be generic and honest than specific and wrong.
- price/area/rating/users/founded: best-effort only for competitors you're confident are real — leave each as "" rather than inventing a number you're not confident in. A generic/unnamed competitor entry should leave all five as "".
- marketShare: only if you have some real basis for it (a well-known dominant/niche player) — a rough qualitative estimate like "~5-10%" or "small niche player" is fine, a confident precise percentage is not. Leave "" rather than guessing. This is the softest, least reliable field here — treat it with more caution than price/rating/users/founded, not less.
- features: exactly one "yes"/"partial"/"no" per differentiator, per competitor, in the same order as differentiators. For a generic/unnamed competitor entry, base this on the category norm rather than a specific product.
- featureList: 3-8 short phrases (not full sentences, no leading dashes/bullets) naming this specific competitor's own real features/capabilities — independent of the differentiators list above and not limited to it. For a generic/unnamed competitor entry, list features typical of that category. Leave as [] only if you genuinely have nothing to go on.
- If the founder has supplied additional context beyond the one-liner (customer segment, problems, pain, how people cope today, their own summary), use it: let the customer segment and problems sharpen your domain pick and TAM/SAM basis, let "how people currently cope" be your strongest signal for real named competitors (a tool or workaround they describe may point straight at one), and let the problems/differentiators stay grounded in what the founder actually described rather than the product category in the abstract. Treat all of it as the founder's own unvalidated assumptions, not confirmed fact.`;

// Claude path (optional — only used when ANTHROPIC_API_KEY is set) gets a
// different framing: it actually has web search, so it's told to use it and
// ground its answer in what it finds, instead of being told to fall back to
// honesty about not having live data.
const MARKET_SNAPSHOT_SYSTEM_PROMPT_CLAUDE = `You are a startup market-research analyst helping a founder get a first read on their idea. You have live web search — use it to find real, current information: companies actually operating in this specific niche, real signals about market size (industry reports, recent funding rounds, adjacent public-company revenue if relevant), and — for each named competitor — their actual pricing, app-store rating, rough user/install base, and founding year where those are publicly findable. Search enough to ground your answer before responding; a handful of targeted searches is usually enough, including at least one aimed at pricing/reviews for your top 1-2 competitors.

Once you're done searching, respond with ONLY a JSON object as your final message — no narration, no markdown code fences, nothing before or after the JSON — in this exact shape:
{"domain": "<one key>", "tam": {"value": "<rough $ figure, e.g. \\"$2B+\\">", "basis": "<one short sentence on how you're estimating this, referencing what you found>"}, "sam": {"value": "<rough $ figure, smaller than TAM>", "basis": "<one short sentence>"}, "differentiators": ["<short capability>", ...], "yourCoverage": ["yes" | "partial" | "no", ...], "competitors": [{"name": "<company name>", "note": "<under 12 words on what they do>", "price": "<e.g. \\"$5.99/mo\\" or \\"Free\\", from what you found, or \\"\\" if you couldn't confirm it>", "area": "<their market segment in a few words>", "rating": "<e.g. \\"4.6\\", from what you found, or \\"\\" if unconfirmed>", "users": "<e.g. \\"1M+\\", from what you found, or \\"\\" if unconfirmed>", "founded": "<year, or \\"\\" if unconfirmed>", "marketShare": "<rough estimate from what you found, e.g. \\"~5-10%\\" or \\"small niche player\\" — or \\"\\" if you couldn't find a real basis>", "features": ["yes" | "partial" | "no", ...], "featureList": ["<short feature phrase>", ...]}]}

Rules:
- domain: pick exactly 1 key from this list (verbatim, case-sensitive): ${MARKET_DOMAIN_KEYS.map(v => `"${v}"`).join(', ')}
- tam/sam: give a rough order-of-magnitude estimate with a one-sentence basis, grounded in what your search actually turned up. Be conservative — round numbers, not false precision. SAM must be smaller than TAM.
- differentiators: 4-6 short, concrete capabilities worth comparing products on in this specific niche (e.g. "Predictive reorder", "Price comparison") — not vague qualities like "good UX." These are what "features" below are scored against.
- yourCoverage: exactly one "yes"/"partial"/"no" per differentiator, your best guess at whether the founder's own idea (from their one-liner) covers it. Default to "partial" rather than guessing "yes" when genuinely unclear.
- competitors: list 3-5 real companies you found via search that genuinely compete in this specific niche — not just the broader category. If, after searching, you're still not confident a specific named company is a close, real match, use a short generic description instead (e.g. {"name": "Generic AI writing tools", "note": "broad category, no single dominant player you're confident about"}) rather than guessing a name. It is better to be generic and honest than specific and wrong.
- price/area/rating/users/founded: only fill these in from what your search actually confirmed — leave any you couldn't verify as "" rather than estimating. A generic/unnamed competitor entry should leave all five as "".
- marketShare: only from what your search actually found (e.g. a market report, "market leader" framing in coverage, a stated user-base comparison) — a rough qualitative estimate like "~5-10%" or "small niche player" is fine, a confident precise percentage you can't source is not. Leave "" rather than estimating.
- features: exactly one "yes"/"partial"/"no" per differentiator, per competitor, in the same order as differentiators, based on what you found about that product. For a generic/unnamed competitor entry, base this on the category norm rather than a specific product.
- featureList: 3-8 short phrases (not full sentences, no leading dashes/bullets) naming this specific competitor's own real features/capabilities, grounded in what you found — independent of the differentiators list above and not limited to it. For a generic/unnamed competitor entry, list features typical of that category. Leave as [] only if you truly found nothing to go on.
- If the founder has supplied additional context beyond the one-liner (customer segment, problems, pain, how people cope today, their own summary), use it to target your searches: search for the specific tools/workarounds they mention coping with today (these often ARE the real competitors), let the customer segment sharpen whether you search B2B or B2C sources, and let the problems described sharpen which differentiators and TAM/SAM basis you look for. Treat all of it as the founder's own unvalidated assumptions, not confirmed fact — verify rather than repeating it as-is.`;

// Shared between both paths so a Claude response and an Ollama response are
// sanitized identically — the frontend renders whichever one came back
// without knowing or caring which model produced it.
function sanitizeMarketSnapshot(parsed: any): MarketSnapshot {
  const sanitizeStr = (v: any, max = 300): string => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const sanitizeMoney = (v: any): { value: string; basis: string } => ({
    value: sanitizeStr(v?.value, 40) || 'Not enough to estimate yet',
    basis: sanitizeStr(v?.basis, 200),
  });
  const sanitizeCoverage = (v: any): FeatureCoverage => (v === 'yes' || v === 'partial' || v === 'no') ? v : 'no';
  // Every coverage array (yourCoverage and each competitor's features) gets
  // padded/truncated to exactly differentiators.length so every array in
  // the response stays index-aligned, even if the model returned a
  // mismatched count.
  const sanitizeCoverageArr = (v: any, len: number): FeatureCoverage[] => {
    const arr = Array.isArray(v) ? v.map(sanitizeCoverage) : [];
    while (arr.length < len) arr.push('no');
    return arr.slice(0, len);
  };
  const sanitizeStrArr = (v: any, maxLen: number, maxItems: number): string[] =>
    (Array.isArray(v) ? v : [])
      .filter((s: any) => typeof s === 'string' && s.trim())
      .map((s: string) => sanitizeStr(s, maxLen))
      .slice(0, maxItems);

  const domain = MARKET_DOMAIN_KEYS.includes(parsed?.domain) ? parsed.domain : MARKET_DOMAIN_KEYS[0];

  const differentiators = (Array.isArray(parsed?.differentiators) ? parsed.differentiators : [])
    .filter((d: any) => typeof d === 'string' && d.trim())
    .map((d: string) => sanitizeStr(d, 40))
    .slice(0, 6);

  const yourCoverage = sanitizeCoverageArr(parsed?.yourCoverage, differentiators.length);

  const competitors: MarketCompetitor[] = (Array.isArray(parsed?.competitors) ? parsed.competitors : [])
    .filter((c: any) => c && typeof c.name === 'string' && c.name.trim())
    .map((c: any) => ({
      name: sanitizeStr(c.name, 60),
      note: sanitizeStr(c.note, 120),
      price: sanitizeStr(c.price, 40),
      area: sanitizeStr(c.area, 80),
      rating: sanitizeStr(c.rating, 10),
      users: sanitizeStr(c.users, 20),
      founded: sanitizeStr(c.founded, 10),
      marketShare: sanitizeStr(c.marketShare, 40),
      features: sanitizeCoverageArr(c.features, differentiators.length),
      featureList: sanitizeStrArr(c.featureList, 60, 8),
    }))
    .slice(0, 5);

  return {
    domain,
    tam: sanitizeMoney(parsed?.tam),
    sam: sanitizeMoney(parsed?.sam),
    differentiators,
    yourCoverage,
    competitors,
  };
}

function parseMarketSnapshotJson(text: string): any {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the AI response — please try again.');
  }
}

function buildMarketSnapshotUserContent(ctx: MarketSnapshotContext): string {
  const lines: string[] = [];
  if (ctx.ideaName?.trim()) lines.push(`Idea name: ${ctx.ideaName.trim()}`);
  if (ctx.oneLiner?.trim()) lines.push(`One-liner: ${ctx.oneLiner.trim()}`);
  if (ctx.customerSegment?.trim()) lines.push(`Customer segment (founder's own words): ${ctx.customerSegment.trim()}`);
  if (ctx.whoPays?.trim()) lines.push(`Who pays: ${ctx.whoPays.trim()}`);
  if (ctx.problems?.trim()) lines.push(`Problems the founder is targeting:\n${ctx.problems.trim()}`);
  if (ctx.painConsequences?.trim()) lines.push(`What breaks if unresolved: ${ctx.painConsequences.trim()}`);
  if (ctx.frequency?.trim()) lines.push(`How often this happens: ${ctx.frequency.trim()}`);
  if (ctx.existingAlternatives?.trim()) lines.push(`How people currently cope, founder's ranked guess (most to least common):\n${ctx.existingAlternatives.trim()}`);
  if (ctx.founderStatement?.trim()) lines.push(`Founder's own summary of the idea:\n${ctx.founderStatement.trim()}`);
  return lines.length ? lines.join('\n\n') : 'The founder has not described their idea yet.';
}

async function generateMarketSnapshotOllama(ctx: MarketSnapshotContext): Promise<MarketSnapshot> {
  const userContent = buildMarketSnapshotUserContent(ctx);

  let res;
  try {
    res = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: MARKET_SNAPSHOT_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      },
      { timeout: 180000 }
    );
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the local AI model — make sure the ollama service is running and has finished pulling its model (first start can take a few minutes).');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('The AI is taking longer than usual to put this together — please try again.');
    }
    throw err;
  }

  const text: string = res.data?.message?.content || '';
  return sanitizeMarketSnapshot(parseMarketSnapshotJson(text));
}

// Claude + live web search — opt-in via ANTHROPIC_API_KEY. web_search is a
// server-side tool: Claude invokes it itself mid-response (one or more
// times) and the results come back as part of the same API call, so this is
// still a single request, not a manual tool loop. The model's actual answer
// is its last text block, after any search/tool-result blocks.
async function generateMarketSnapshotClaude(ctx: MarketSnapshotContext): Promise<MarketSnapshot> {
  const userContent = buildMarketSnapshotUserContent(ctx);

  const message = await anthropicClient!.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    temperature: 0.3,
    system: MARKET_SNAPSHOT_SYSTEM_PROMPT_CLAUDE,
    tools: [
      { type: 'web_search_20260318', name: 'web_search', max_uses: 5 } as any,
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlocks = message.content.filter((b: any) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
  if (!text.trim()) {
    throw new Error('Claude did not return a usable answer — please try again.');
  }
  return sanitizeMarketSnapshot(parseMarketSnapshotJson(text));
}

export async function generateMarketSnapshot(ctx: MarketSnapshotContext): Promise<MarketSnapshot> {
  if (anthropicClient) {
    try {
      return await generateMarketSnapshotClaude(ctx);
    } catch (err: any) {
      // Fall back to the free local model rather than failing the feature
      // outright — an expired/invalid key, a rate limit, or a transient
      // Anthropic outage shouldn't take Market Snapshot down entirely.
      console.error('[market-snapshot] Claude path failed, falling back to Ollama:', err?.message || err);
    }
  }
  return generateMarketSnapshotOllama(ctx);
}
