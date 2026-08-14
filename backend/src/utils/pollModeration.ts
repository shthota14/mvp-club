import axios from 'axios';

// AI relevance + content check for user-submitted community polls, using the
// same self-hosted Ollama setup as aiQuestionCheck.ts / startupNewsFeed.ts.
// Runs in addition to (not instead of) the existing keyword-based
// moderateContent() check in utils/moderation.ts — that one catches obvious
// slurs/spam cheaply and instantly; this one judges relevance and subtler
// objectionable content that keyword matching can't catch.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export interface PollModerationResult {
  approved: boolean;
  reason: string | null;
}

const SYSTEM_PROMPT = `You are moderating a poll a member wants to post to MVP Club, a community for early-stage startup founders (validating ideas, fundraising, building MVPs, going to market). You'll get a poll question and its answer options. Approve it unless it clearly fails one of these:

REJECT if:
- It contains hate speech, harassment, sexual content, or content targeting a real named individual.
- It's spam, an ad for an unrelated product/service, or a phishing/scam attempt.
- It's completely unrelated to startups, founders, business, or product-building (e.g. sports scores, personal relationship drama, politics unrelated to business).

APPROVE everything else — including polls that are casual, opinion-based, or lightly off-topic-but-still-founder-relevant (e.g. "best coffee for late coding nights?" is fine; light community culture chat is allowed). When in doubt, approve — this is a light-touch check, not strict topic policing.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"approved": true or false, "reason": "<one short sentence, under 20 words, only needed if approved is false, otherwise null>"}`;

export async function checkPollContent(question: string, options: string[]): Promise<PollModerationResult> {
  const userContent = `Poll question: "${question}"\nOptions: ${options.map(o => `"${o}"`).join(', ')}`;

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
      { timeout: 20000 }
    );
  } catch (err: any) {
    // Ollama unreachable/slow — fail OPEN (approve) rather than blocking
    // every poll if the AI model is briefly down. The cheap keyword check
    // in utils/moderation.ts still runs regardless and catches the obvious
    // stuff, so this isn't the only line of defense.
    console.error('[pollModeration] AI check unavailable, falling back to approved:', err?.message || err);
    return { approved: true, reason: null };
  }

  const text: string = res.data?.message?.content || '';
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      approved: parsed.approved !== false,
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  } catch {
    // Unparseable response — fail open rather than block a legitimate poll.
    console.error('[pollModeration] Could not parse AI response, falling back to approved:', text);
    return { approved: true, reason: null };
  }
}
