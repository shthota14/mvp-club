// ── Auto content moderation ───────────────────────────────────────────────────
// Flags posts that match known inappropriate patterns.
// In production, swap this for an AI moderation API (OpenAI, Perspective, etc.)

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'profanity',       re: /\b(fuck|shit|cunt|bitch|asshole|motherfucker|dickhead|bastard|wanker|prick)\b/i },
  { label: 'slurs',           re: /\b(nigger|nigga|faggot|retard|spic|chink|wetback|kike)\b/i },
  { label: 'hate speech',     re: /\b(kill (all|every)|die (you|u)|i (will|want to) (kill|murder|hurt))\b/i },
  { label: 'spam / MLM',      re: /\b(make money fast|get rich quick|pyramid scheme|mlm|downline|passive income guaranteed|dm me to earn)\b/i },
  { label: 'phishing',        re: /\b(click (here|this link)|verify your account|your account (has been|is) suspended|free (gift|prize)|you (have been|are) selected)\b/i },
  { label: 'scam',            re: /\b(send (me )?\$|wire transfer|advance (fee|payment)|nigerian (prince|royalty)|lottery (winner|winnings))\b/i },
  { label: 'self-harm',       re: /\b(kill myself|end (my|your) life|commit suicide|want to die|self.harm)\b/i },
  { label: 'doxxing',         re: /\b(home address|real address|i know where you|find you (irl|in real life))\b/i },
  { label: 'explicit',        re: /\b(nude|naked|porn|onlyfans link|sex for|escort)\b/i },
];

export function moderateContent(text: string): { flagged: boolean; reason: string | null } {
  for (const { label, re } of PATTERNS) {
    if (re.test(text)) return { flagged: true, reason: label };
  }
  return { flagged: false, reason: null };
}
