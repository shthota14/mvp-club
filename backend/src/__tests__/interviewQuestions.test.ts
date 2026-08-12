import { describe, it, expect } from 'vitest';
import { DEFAULT_QUESTIONS, extForMime } from '../utils/interviewQuestions';

describe('DEFAULT_QUESTIONS (Mom Test philosophy guard)', () => {
  it('contains no leading or hypothetical questions', () => {
    for (const q of DEFAULT_QUESTIONS) {
      const text = q.toLowerCase();
      expect(text, q).not.toMatch(/would you (use|pay|buy)/);
      expect(text, q).not.toContain('ideal solution');
      expect(text, q).not.toMatch(/how much would you pay/);
    }
  });

  it('covers the four pillars: open problems, current solution, do-nothing, cost', () => {
    const all = DEFAULT_QUESTIONS.join(' | ').toLowerCase();
    expect(all).toContain('biggest problems');
    expect(all).toContain('how are you solving it today');
    expect(all).toMatch(/don't solve it/);
    expect(all).toContain('cost you');
  });

  it('asks about past buying behaviour, not willingness to pay', () => {
    const all = DEFAULT_QUESTIONS.join(' | ').toLowerCase();
    expect(all).toMatch(/looked for — or paid for/);
  });

  it('ends by widening the funnel (referrals)', () => {
    expect(DEFAULT_QUESTIONS[DEFAULT_QUESTIONS.length - 1].toLowerCase()).toContain('who else should i speak to');
  });
});

describe('extForMime', () => {
  it('maps common audio mimetypes to extensions', () => {
    expect(extForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extForMime('audio/ogg')).toBe('ogg');
    expect(extForMime('audio/mp4')).toBe('m4a');
    expect(extForMime('audio/mpeg')).toBe('mp3');
    expect(extForMime('audio/wav')).toBe('wav');
  });

  it('falls back to webm for unknown types', () => {
    expect(extForMime('application/octet-stream')).toBe('webm');
    expect(extForMime('')).toBe('webm');
  });
});
