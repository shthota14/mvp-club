import { describe, it, expect } from 'vitest';
import {
  generateScript,
  inferResponses,
  SIGNAL_OPTIONS,
  CHIP_INFERENCE,
  RESPONSE_CHECK,
  QUESTION_WEIGHT,
  QuestionResponse,
} from '@/components/InterviewScriptCard';

const blank = (over: Partial<QuestionResponse> = {}): QuestionResponse =>
  ({ signal: [], picks: [], quote: '', ...over });

const QUESTIONS = generateScript({});

// Strongest chip per question (value === 1 by design in every question)
const STRONG: Record<number, string> = {
  1: '✅ Right role',
  2: '🎯 Named it unprompted',
  3: '🔥 Vivid story',
  4: '🛠 Custom built',
  5: '💸 Real number given',
  6: '🔥 Real consequences',
  7: '💰 Paid for a fix before',
};
const WEAK: Record<number, string> = {
  1: '❌ Wrong role',
  2: '❌ Never came up',
  3: '😕 No connection',
  4: '🙈 Ignoring it',
  5: '❌ Couldn\'t quantify',
  6: '🤷 Nothing breaks',
  7: '👎 Not interested',
};

const respAll = (map: Record<number, string>): Record<number, QuestionResponse> => {
  const out: Record<number, QuestionResponse> = {};
  for (let n = 1; n <= 7; n++) out[n] = blank({ signal: [map[n]] });
  return out;
};

// ── Script generation ─────────────────────────────────────────────────────────

describe('generateScript', () => {
  it('produces exactly 7 questions numbered 1..7', () => {
    expect(QUESTIONS).toHaveLength(7);
    expect(QUESTIONS.map(q => q.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('contains no leading questions (the Mom Test guard)', () => {
    for (const q of QUESTIONS) {
      const text = q.question.toLowerCase();
      expect(text).not.toMatch(/would you (use|pay|buy)/);
      expect(text).not.toContain('ideal solution');
      expect(text).not.toContain('do you like my');
    }
  });

  it('covers the four philosophy pillars: their problems, current solution, do-nothing, cost', () => {
    const all = QUESTIONS.map(q => q.question.toLowerCase()).join(' | ');
    expect(all).toContain('biggest headaches');            // open problem discovery
    expect(all).toContain('how do you deal with it today'); // current solution
    expect(all).toMatch(/don't solve this/);                // do-nothing test
    expect(all).toMatch(/put a number on it/);              // cost the pain
  });

  it('embeds the founder problem into Q3 and uses a past-behaviour default for Q7', () => {
    const qs = generateScript({ problemSentence: 'They struggle with messy invoices because tools are fragmented' });
    expect(qs[2].question.toLowerCase()).toContain('struggle with messy invoices');
    expect(QUESTIONS[6].question).toContain('paid for');
  });

  it('uses the founder key question for Q7 when one is set', () => {
    const qs = generateScript({ keyQuestion: 'When did you last export data by hand' });
    expect(qs[6].question).toBe('When did you last export data by hand?');
  });
});

// ── Chip/config integrity ─────────────────────────────────────────────────────

describe('signal chip configuration', () => {
  it('every signal chip has an inference mapping', () => {
    for (const opts of Object.values(SIGNAL_OPTIONS)) {
      for (const opt of opts) {
        expect(CHIP_INFERENCE[opt.label], `missing inference for chip "${opt.label}"`).toBeDefined();
      }
    }
  });

  it('inference values stay within [0, 1]', () => {
    for (const [label, inf] of Object.entries(CHIP_INFERENCE)) {
      expect(inf.value, label).toBeGreaterThanOrEqual(0);
      expect(inf.value, label).toBeLessThanOrEqual(1);
      expect(inf.text.length, label).toBeGreaterThan(10);
    }
  });

  it('questions 1..7 all have chips, a checkbox statement, and a weight', () => {
    for (let n = 1; n <= 7; n++) {
      expect(SIGNAL_OPTIONS[n]?.length).toBeGreaterThanOrEqual(3);
      expect(RESPONSE_CHECK[n]).toBeTruthy();
      expect(QUESTION_WEIGHT[n]).toBeGreaterThan(0);
    }
  });

  it('unprompted mention and past buying behaviour carry the heaviest weights', () => {
    const max = Math.max(...Object.values(QUESTION_WEIGHT));
    expect(QUESTION_WEIGHT[2]).toBe(max);
    expect(QUESTION_WEIGHT[7]).toBe(max);
    expect(QUESTION_WEIGHT[6]).toBeGreaterThan(QUESTION_WEIGHT[1]);
  });
});

// ── Inference engine ──────────────────────────────────────────────────────────

describe('inferResponses', () => {
  it('returns null overall when nothing is captured', () => {
    const { overall, perQuestion } = inferResponses(QUESTIONS, {});
    expect(overall).toBeNull();
    expect(perQuestion).toHaveLength(0);
  });

  it('scores 100 / Confirmed (3) when every answer is the strongest signal', () => {
    const { overall } = inferResponses(QUESTIONS, respAll(STRONG));
    expect(overall?.pct).toBe(100);
    expect(overall?.suggestedAlignment).toBe(3);
    expect(overall?.label).toBe('Problem confirmed');
  });

  it('scores low / Not confirmed (1) when every answer is the weakest signal (wrong-role gate aside)', () => {
    // Use weak chips but the RIGHT role, so the wrong-role gate doesn't mask the score path
    const weak = respAll(WEAK);
    weak[1] = blank({ signal: ['✅ Right role'] });
    const { overall } = inferResponses(QUESTIONS, weak);
    expect(overall!.pct).toBeLessThan(40);
    expect(overall!.suggestedAlignment).toBe(1);
    expect(overall!.label).toBe('Not confirmed');
  });

  it('gates the whole interview when the interviewee is the wrong role', () => {
    const strongButWrongRole = respAll(STRONG);
    strongButWrongRole[1] = blank({ signal: ['❌ Wrong role'] });
    const { overall } = inferResponses(QUESTIONS, strongButWrongRole);
    expect(overall!.wrongRole).toBe(true);
    expect(overall!.label).toBe('Wrong audience');
    expect(overall!.suggestedAlignment).toBe(1);
  });

  it('lands in Partial (2) for genuinely mixed signals', () => {
    const mixed: Record<number, QuestionResponse> = {
      1: blank({ signal: ['✅ Right role'] }),
      2: blank({ signal: ['🤔 Adjacent problem'] }),
      3: blank({ signal: ['💭 Vague / hypo'] }),
      5: blank({ signal: ['🤔 Rough guess only'] }),
      6: blank({ signal: ['😐 Annoying but survivable'] }),
      7: blank({ signal: ['🤷 Never looked'] }),
    };
    const { overall } = inferResponses(QUESTIONS, mixed);
    expect(overall!.pct).toBeGreaterThanOrEqual(40);
    expect(overall!.pct).toBeLessThan(70);
    expect(overall!.suggestedAlignment).toBe(2);
  });

  it('excludes unanswered questions instead of counting them against the score', () => {
    const onlyTwo: Record<number, QuestionResponse> = {
      2: blank({ signal: [STRONG[2]] }),
      7: blank({ signal: [STRONG[7]] }),
    };
    const { overall } = inferResponses(QUESTIONS, onlyTwo);
    expect(overall!.answered).toBe(2);
    expect(overall!.pct).toBe(100);
  });

  it('counts a checkbox-only answer as a strong signal', () => {
    const checkboxOnly: Record<number, QuestionResponse> = {
      6: blank({ picks: [RESPONSE_CHECK[6]] }),
    };
    const { overall, perQuestion } = inferResponses(QUESTIONS, checkboxOnly);
    expect(overall!.pct).toBe(100);
    expect(perQuestion[0].cls).toBe('strong');
  });

  it('uses the best chip when multiple signals are selected for one question', () => {
    const multi: Record<number, QuestionResponse> = {
      4: blank({ signal: ['🙈 Ignoring it', '🛠 Custom built'] }),
    };
    const { overall, perQuestion } = inferResponses(QUESTIONS, multi);
    expect(overall!.pct).toBe(100); // best of the two (custom built = 1)
    expect(perQuestion[0].texts).toHaveLength(2); // but both interpretations are reported
  });
});
