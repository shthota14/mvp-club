import axios from 'axios';

// AI relevance + content check for anonymous, unauthenticated pain-point
// submissions, using the same self-hosted Ollama setup as pollModeration.ts /
// aiQuestionCheck.ts / startupNewsFeed.ts. This is a separate, wide-open write
// path (no login required), so it runs its own check rather than reusing the
// poll one, even though the pattern is identical — keeps the two moderation
// policies free to diverge later without cross-affecting each other.
// Runs in addition to (not instead of) the existing keyword-based
// moderateContent() check in utils/moderation.ts — that one catches obvious
// slurs/spam cheaply and instantly; this one judges relevance and subtler
// objectionable content that keyword matching can't catch.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export interface PainPointModerationResult {
  approved: boolean;
  reason: string | null;
}

const SYSTEM_PROMPT = `You are moderating a "pain point" submitted anonymously, without an account, to MVP Club, a community for early-stage startup founders. A pain point is a short description of a real problem someone has observed, meant for other founders to discover and potentially build a solution for. You'll get the pain-point description and who experiences it. Approve it unless it clearly fails one of these:

REJECT if:
- It contains hate speech, harassment, sexual content, or content targeting a real named individual.
- It's spam, an ad for an unrelated product/service, or a phishing/scam attempt.
- It's not describing an actual problem/pain point at all (e.g. random text, a test message, gibberish, unrelated rambling).
- It's completely unrelated to startups, products, businesses, or problems people/companies have.

APPROVE everything else — including pain points that are loosely scoped, informally worded, or about a niche audience. Because this comes from an anonymous, unauthenticated visitor rather than a logged-in member, be a little more careful about spam/gibberish/test-content than you would for a member post, but do not reject a genuine, legible problem description just because it's short or casually written. When in doubt between a real (if rough) pain point and spam, approve.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"approved": true or false, "reason": "<one short sentence, under 20 words, only needed if approved is false, otherwise null>"}`;

export async function checkPainPointContent(description: string, audience: string): Promise<PainPointModerationResult> {
  const userContent = `Pain point: "${description}"\nWho experiences it: "${audience}"`;

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
    // every submission if the AI model is briefly down. The cheap keyword
    // check in utils/moderation.ts still runs regardless and catches the
    // obvious stuff, so this isn't the only line of defense.
    console.error('[painPointModeration] AI check unavailable, falling back to approved:', err?.message || err);
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
    // Unparseable response — fail open rather than block a legitimate submission.
    console.error('[painPointModeration] Could not parse AI response, falling back to approved:', text);
    return { approved: true, reason: null };
  }
}
