// Interview question defaults and small pure helpers, extracted into a
// dependency-free module so they can be unit-tested without pulling in
// express/pg/nodemailer.

// Default question templates for customer discovery.
// Philosophy: never lead. Ask about THEIR problems, how they solve them today,
// what breaks if they don't, and put a number on the pain. Past behaviour
// beats hypotheticals — no "would you use/pay" questions.
export const DEFAULT_QUESTIONS = [
  'What are the biggest problems or time-sinks in your work right now?',
  'Tell me about the last time you ran into this. What happened, step by step?',
  'How are you solving it today? What have you tried?',
  'What do you like — and hate — about your current approach?',
  'What happens if you just don\'t solve it? What actually breaks?',
  'How much time or money does this cost you, per week or per month?',
  'Have you ever looked for — or paid for — a solution? What happened?',
  'Who else in your organisation / life is affected by this?',
  'Who else should I speak to about this?',
];

export const extForMime = (mime: string): string =>
  mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : 'webm';
