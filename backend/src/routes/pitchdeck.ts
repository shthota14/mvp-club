import express, { Request, Response } from 'express';
import PptxGenJS from 'pptxgenjs';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ── helpers ───────────────────────────────────────────────────────────────────
const cap = (s: string | undefined, max: number) =>
  (s || '').replace(/\s+/g, ' ').trim().slice(0, max) || '';

const bullet = (s: string | undefined, max = 5): string[] =>
  (s || '').split(/\n+/).map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean).slice(0, max);

const or = (s: string | undefined, fallback: string) => cap(s, 500) || fallback;

// ── colour palette ────────────────────────────────────────────────────────────
const C = {
  dark:   '0D1B2A',
  indigo: '4F46E5',
  sky:    '38BDF8',
  slate:  '64748B',
  white:  'FFFFFF',
  black:  '0F172A',
};

// ── reusable helpers ──────────────────────────────────────────────────────────
function darkSlide(pres: PptxGenJS, slideNum: number, total: number) {
  const slide = pres.addSlide();
  slide.background = { color: C.dark };
  slide.addText(`${slideNum} / ${total}`, {
    x: 9.3, y: 5.25, w: 0.65, h: 0.2,
    fontSize: 8, color: C.slate, align: 'right', fontFace: 'Calibri',
  });
  return slide;
}

function lightSlide(pres: PptxGenJS, slideNum: number, total: number) {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText(`${slideNum} / ${total}`, {
    x: 9.3, y: 5.25, w: 0.65, h: 0.2,
    fontSize: 8, color: 'CCCCCC', align: 'right', fontFace: 'Calibri',
  });
  return slide;
}

function slideTitle(slide: PptxGenJS.Slide, title: string, dark = false) {
  slide.addText(title, {
    x: 0.45, y: 0.32, w: 9.1, h: 0.65,
    fontSize: 26, bold: true, color: dark ? C.white : C.black,
    fontFace: 'Calibri', align: 'left', margin: 0,
  });
}

function card(slide: PptxGenJS.Slide, pres: PptxGenJS, x: number, y: number, w: number, h: number, color = 'F1F5FF') {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color },
    line: { color: 'E2E8F0', width: 0.75 },
    rectRadius: 0.1,
  });
}

// ── main generator ────────────────────────────────────────────────────────────
async function buildPitchDeck(
  idea: { title: string; description: string; business_domain: string; owner_name: string },
  bmc: Record<string, string>
): Promise<PptxGenJS> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author = idea.owner_name;
  pres.title  = `${idea.title} — Pitch Deck`;

  const TOTAL = 15;

  // ── SLIDE 1 · Title ─────────────────────────────────────────────────────────
  {
    const s = darkSlide(pres, 1, TOTAL);

    s.addText(idea.title, {
      x: 0.8, y: 1.5, w: 8.4, h: 1.1,
      fontSize: 44, bold: true, color: C.white,
      fontFace: 'Calibri', align: 'center',
    });

    const tagline = cap(bmc.value || idea.description, 120);
    s.addText(tagline || 'Turning a bold idea into reality.', {
      x: 1.0, y: 2.7, w: 8.0, h: 0.65,
      fontSize: 16, color: '94A3B8', fontFace: 'Calibri', align: 'center', italic: true,
    });

    if (idea.business_domain) {
      s.addShape(pres.ShapeType.roundRect, {
        x: 4.1, y: 3.6, w: 1.8, h: 0.34,
        fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
        rectRadius: 0.17,
      });
      s.addText(idea.business_domain.toUpperCase(), {
        x: 4.1, y: 3.6, w: 1.8, h: 0.34,
        fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center',
      });
    }

    s.addText(`Founded by ${idea.owner_name}`, {
      x: 0.8, y: 4.2, w: 8.4, h: 0.28,
      fontSize: 12, color: C.slate, fontFace: 'Calibri', align: 'center',
    });

    s.addText('Seed Stage Pitch Deck', {
      x: 0.8, y: 4.55, w: 8.4, h: 0.22,
      fontSize: 10, color: '334155', fontFace: 'Calibri', align: 'center',
    });
  }

  // ── SLIDE 2 · Vision ─────────────────────────────────────────────────────────
  {
    const s = darkSlide(pres, 2, TOTAL);
    s.addText('VISION', {
      x: 0.45, y: 0.4, w: 9.1, h: 0.5,
      fontSize: 13, color: C.indigo, bold: true, fontFace: 'Calibri', charSpacing: 3,
    });

    const vision = or(bmc.value, 'We believe there is a better way — one that creates real value for the people who need it most.');
    s.addText(`"${cap(vision, 260)}"`, {
      x: 0.8, y: 1.1, w: 8.4, h: 3.0,
      fontSize: 22, color: C.white, fontFace: 'Calibri',
      align: 'center', valign: 'middle', italic: true,
    });

    s.addText('Why we exist', {
      x: 0.45, y: 4.5, w: 9.1, h: 0.3,
      fontSize: 11, color: C.slate, fontFace: 'Calibri', align: 'center',
    });
  }

  // ── SLIDE 3 · Problem ─────────────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 3, TOTAL);
    slideTitle(s, 'The Problem');

    const segLines = bullet(bmc.segments, 3);
    const valLines = bullet(bmc.value, 3);

    card(s, pres, 0.45, 1.25, 4.25, 3.85, 'FFF1F2');
    s.addText('Who experiences it', {
      x: 0.65, y: 1.38, w: 3.85, h: 0.32,
      fontSize: 11, bold: true, color: 'BE123C', fontFace: 'Calibri',
    });
    s.addText(
      segLines.length
        ? segLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [{ text: 'Early adopters who need a better solution today.', options: { breakLine: false } }],
      {
        x: 0.65, y: 1.78, w: 3.85, h: 2.9,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );

    card(s, pres, 5.05, 1.25, 4.45, 3.85, 'FFFBEB');
    s.addText('What it costs them', {
      x: 5.25, y: 1.38, w: 4.05, h: 0.32,
      fontSize: 11, bold: true, color: 'B45309', fontFace: 'Calibri',
    });
    s.addText(
      valLines.length
        ? valLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [{ text: 'Existing solutions are expensive, slow, or simply do not exist.', options: { breakLine: false } }],
      {
        x: 5.25, y: 1.78, w: 4.05, h: 2.9,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );
  }

  // ── SLIDE 4 · Solution ────────────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 4, TOTAL);
    slideTitle(s, 'Our Solution');

    const actLines = bullet(bmc.activities, 4);
    const valText  = cap(bmc.value, 200) || 'A purpose-built solution that is faster, simpler, and more affordable than anything on the market.';

    s.addText(valText, {
      x: 0.45, y: 1.22, w: 9.1, h: 0.8,
      fontSize: 14, color: C.black, fontFace: 'Calibri', italic: true,
    });

    const activities = actLines.length
      ? actLines
      : ['Build and iterate on the core product', 'Engage directly with early customers', 'Refine based on real-world feedback'];

    activities.slice(0, 3).forEach((act, i) => {
      const x = 0.45 + i * 3.15;
      card(s, pres, x, 2.25, 2.9, 2.9, 'F0F9FF');
      s.addText(String(i + 1), {
        x: x + 0.2, y: 2.4, w: 0.5, h: 0.5,
        fontSize: 20, bold: true, color: C.indigo, fontFace: 'Calibri',
      });
      s.addText(act, {
        x: x + 0.18, y: 2.95, w: 2.55, h: 1.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      });
    });
  }

  // ── SLIDE 5 · Why Now ─────────────────────────────────────────────────────────
  {
    const s = darkSlide(pres, 5, TOTAL);
    slideTitle(s, 'Why Now?', true);

    const domain = idea.business_domain || 'this space';
    const reasons = [
      ['AI & automation', `New capabilities in ${domain} are making this possible at scale for the first time.`],
      ['Market shift',    'Customer expectations have changed — they demand faster, simpler, and more affordable tools.'],
      ['Cost reduction',  'Infrastructure and tooling costs have dropped dramatically, lowering the barrier to build.'],
      ['Regulatory',      'New regulations and compliance requirements are creating urgency for modern solutions.'],
    ];

    reasons.forEach(([title, desc], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.45 + col * 4.75, y = 1.3 + row * 1.9;
      s.addShape(pres.ShapeType.roundRect, {
        x, y, w: 4.4, h: 1.65,
        fill: { color: '1E3A5F' },
        line: { color: '2D5F99', width: 0.75 },
        rectRadius: 0.1,
      });
      s.addText(title, {
        x: x + 0.2, y: y + 0.15, w: 4.0, h: 0.35,
        fontSize: 12, bold: true, color: C.sky, fontFace: 'Calibri',
      });
      s.addText(desc, {
        x: x + 0.2, y: y + 0.52, w: 4.0, h: 1.0,
        fontSize: 12, color: '94A3B8', fontFace: 'Calibri', valign: 'top',
      });
    });
  }

  // ── SLIDE 6 · Market Opportunity ─────────────────────────────────────────────
  {
    const s = lightSlide(pres, 6, TOTAL);
    slideTitle(s, 'Market Opportunity');

    const markets = [
      { label: 'TAM', sub: 'Total Addressable Market', size: '$XX Bn', color: C.indigo, x: 0.45 },
      { label: 'SAM', sub: 'Serviceable Available Market', size: '$XX Bn', color: '7C3AED', x: 3.55 },
      { label: 'SOM', sub: 'Initial Target Market', size: '$XX Mn', color: '059669', x: 6.65 },
    ];

    markets.forEach(({ label, sub, size, color, x }) => {
      card(s, pres, x, 1.3, 2.8, 3.85, 'FAFAFA');
      s.addText(label, {
        x: x + 0.1, y: 1.55, w: 2.6, h: 0.65,
        fontSize: 30, bold: true, color, fontFace: 'Calibri', align: 'center',
      });
      s.addText(size, {
        x: x + 0.1, y: 2.25, w: 2.6, h: 0.6,
        fontSize: 22, bold: true, color: C.black, fontFace: 'Calibri', align: 'center',
      });
      s.addText(sub, {
        x: x + 0.1, y: 2.92, w: 2.6, h: 0.55,
        fontSize: 11, color: C.slate, fontFace: 'Calibri', align: 'center',
      });
      s.addText('(Add your market size estimate)', {
        x: x + 0.1, y: 3.55, w: 2.6, h: 1.35,
        fontSize: 10, color: 'AAAAAA', fontFace: 'Calibri', align: 'center', italic: true,
      });
    });

    s.addText(`Focus: ${idea.business_domain || 'Define your initial niche'}`, {
      x: 0.45, y: 5.1, w: 9.1, h: 0.28,
      fontSize: 11, color: C.slate, fontFace: 'Calibri', italic: true,
    });
  }

  // ── SLIDE 7 · Customer Validation ─────────────────────────────────────────────
  {
    const s = lightSlide(pres, 7, TOTAL);
    slideTitle(s, 'Customer Validation');

    s.addText('Evidence of demand — what we have learned so far', {
      x: 0.45, y: 1.15, w: 9.1, h: 0.3,
      fontSize: 13, color: C.slate, fontFace: 'Calibri', italic: true,
    });

    const evidence = [
      { stat: '0', label: 'Customer Interviews', desc: 'Add your interview count and key insights here.' },
      { stat: '0', label: 'Pilot Discussions',   desc: 'Note any warm leads or pilot commitments.' },
      { stat: '0', label: 'Letters of Intent',   desc: 'Signed LOIs or pilot agreements.' },
      { stat: '0', label: 'Waitlist Signups',    desc: 'Landing page, email list, or community sign-ups.' },
    ];

    evidence.forEach(({ stat, label, desc }, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.45 + col * 4.75, y = 1.6 + row * 1.9;
      card(s, pres, x, y, 4.4, 1.65, 'F8FAFC');
      s.addText(stat, {
        x: x + 0.2, y: y + 0.15, w: 1.5, h: 0.55,
        fontSize: 20, bold: true, color: C.indigo, fontFace: 'Calibri',
      });
      s.addText(label, {
        x: x + 0.2, y: y + 0.7, w: 2.2, h: 0.3,
        fontSize: 11, bold: true, color: C.black, fontFace: 'Calibri',
      });
      s.addText(desc, {
        x: x + 0.2, y: y + 1.02, w: 4.0, h: 0.5,
        fontSize: 10, color: C.slate, fontFace: 'Calibri',
      });
    });
  }

  // ── SLIDE 8 · Business Model ──────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 8, TOTAL);
    slideTitle(s, 'Business Model');

    const revLines  = bullet(bmc.revenue, 5);
    const costLines = bullet(bmc.costs, 5);

    card(s, pres, 0.45, 1.3, 4.3, 3.85, 'F0FDF4');
    s.addText('How we make money', {
      x: 0.65, y: 1.45, w: 3.9, h: 0.38,
      fontSize: 12, bold: true, color: '166534', fontFace: 'Calibri',
    });
    s.addText(
      revLines.length
        ? revLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [{ text: 'Define your revenue model here — subscription, usage-based, transaction fee, etc.', options: { breakLine: false } }],
      {
        x: 0.65, y: 1.9, w: 3.9, h: 2.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );

    card(s, pres, 5.05, 1.3, 4.45, 3.85, 'FFF7ED');
    s.addText('Key costs', {
      x: 5.25, y: 1.45, w: 4.05, h: 0.38,
      fontSize: 12, bold: true, color: '9A3412', fontFace: 'Calibri',
    });
    s.addText(
      costLines.length
        ? costLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [{ text: 'Identify your main cost drivers — salaries, infrastructure, marketing, etc.', options: { breakLine: false } }],
      {
        x: 5.25, y: 1.9, w: 4.05, h: 2.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );
  }

  // ── SLIDE 9 · Go-To-Market ────────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 9, TOTAL);
    slideTitle(s, 'Go-To-Market Strategy');

    const chanLines = bullet(bmc.channels, 4);
    const crLines   = bullet(bmc.cr, 3);

    card(s, pres, 0.45, 1.3, 5.75, 3.85, 'F0F9FF');
    s.addText('Customer Channels', {
      x: 0.65, y: 1.45, w: 5.35, h: 0.38,
      fontSize: 12, bold: true, color: '0369A1', fontFace: 'Calibri',
    });
    s.addText(
      chanLines.length
        ? chanLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [
            { text: 'Direct outreach to early adopters', options: { bullet: true, breakLine: true } },
            { text: 'Content and community marketing', options: { bullet: true, breakLine: true } },
            { text: 'Strategic partnerships and referrals', options: { bullet: true, breakLine: false } },
          ],
      {
        x: 0.65, y: 1.9, w: 5.35, h: 2.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );

    card(s, pres, 6.45, 1.3, 3.1, 3.85, 'FDF4FF');
    s.addText('Retention', {
      x: 6.65, y: 1.45, w: 2.7, h: 0.38,
      fontSize: 12, bold: true, color: '7E22CE', fontFace: 'Calibri',
    });
    s.addText(
      crLines.length
        ? crLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [{ text: 'High-touch onboarding and customer success to drive retention and referrals.', options: { breakLine: false } }],
      {
        x: 6.65, y: 1.9, w: 2.7, h: 2.95,
        fontSize: 12, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );
  }

  // ── SLIDE 10 · Competition ────────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 10, TOTAL);
    slideTitle(s, 'Competition & Differentiation');

    card(s, pres, 0.45, 1.3, 4.3, 3.85, 'FFF1F2');
    s.addText('Current Alternatives', {
      x: 0.65, y: 1.45, w: 3.9, h: 0.38,
      fontSize: 12, bold: true, color: 'BE123C', fontFace: 'Calibri',
    });
    const alts = [
      'Manual processes and spreadsheets',
      'Generic software not built for this use case',
      'Expensive enterprise solutions',
      'Outsourcing to consultants or agencies',
    ];
    s.addText(
      alts.map(l => ({ text: l, options: { bullet: true, breakLine: true } })),
      {
        x: 0.65, y: 1.9, w: 3.9, h: 2.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );

    card(s, pres, 5.05, 1.3, 4.45, 3.85, 'F0FDF4');
    s.addText('Our Advantage', {
      x: 5.25, y: 1.45, w: 4.05, h: 0.38,
      fontSize: 12, bold: true, color: '166534', fontFace: 'Calibri',
    });
    const valBullets = bullet(bmc.value, 4);
    s.addText(
      valBullets.length
        ? valBullets.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [
            { text: 'Purpose-built for this specific use case', options: { bullet: true, breakLine: true } },
            { text: 'Faster time to value for customers', options: { bullet: true, breakLine: true } },
            { text: 'Significantly lower cost than enterprise alternatives', options: { bullet: true, breakLine: false } },
          ],
      {
        x: 5.25, y: 1.9, w: 4.05, h: 2.95,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );
  }

  // ── SLIDE 11 · Product Roadmap ────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 11, TOTAL);
    slideTitle(s, 'Product Roadmap');

    s.addText('Current stage: Idea to MVP', {
      x: 0.45, y: 1.15, w: 9.1, h: 0.3,
      fontSize: 12, color: C.slate, fontFace: 'Calibri',
    });

    const quarters = [
      { q: 'Q1', label: 'Build',  items: ['Finalise MVP scope', 'Complete core product build', 'Internal testing'] },
      { q: 'Q2', label: 'Launch', items: ['Launch MVP to pilot users', '5-10 paying customers', 'Gather feedback'] },
      { q: 'Q3', label: 'Grow',   items: ['Commercial release', 'Refine product', 'Scale to 20+ customers'] },
      { q: 'Q4', label: 'Scale',  items: ['250k ARR milestone', 'Team expansion', 'Next funding round'] },
    ];

    quarters.forEach(({ q, label, items }, i) => {
      const x = 0.45 + i * 2.38;
      s.addShape(pres.ShapeType.ellipse, {
        x: x + 0.72, y: 1.55, w: 0.74, h: 0.74,
        fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
      });
      s.addText(q, {
        x: x + 0.72, y: 1.55, w: 0.74, h: 0.74,
        fontSize: 14, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle',
      });

      card(s, pres, x, 2.5, 2.25, 2.65, 'F8FAFC');
      s.addText(label, {
        x: x + 0.12, y: 2.65, w: 2.01, h: 0.38,
        fontSize: 13, bold: true, color: C.indigo, fontFace: 'Calibri',
      });
      s.addText(
        items.map(it => ({ text: it, options: { bullet: true, breakLine: true } })),
        {
          x: x + 0.12, y: 3.1, w: 2.01, h: 1.85,
          fontSize: 11, color: C.black, fontFace: 'Calibri', valign: 'top',
        }
      );
    });
  }

  // ── SLIDE 12 · Team ───────────────────────────────────────────────────────────
  {
    const s = lightSlide(pres, 12, TOTAL);
    slideTitle(s, 'The Team');

    s.addText('Why we are uniquely positioned to solve this problem', {
      x: 0.45, y: 1.15, w: 9.1, h: 0.28,
      fontSize: 12, color: C.slate, fontFace: 'Calibri', italic: true,
    });

    card(s, pres, 0.45, 1.55, 4.3, 3.65, 'F5F3FF');
    s.addShape(pres.ShapeType.ellipse, {
      x: 1.95, y: 1.75, w: 1.3, h: 1.3,
      fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
    });
    s.addText(idea.owner_name.charAt(0).toUpperCase(), {
      x: 1.95, y: 1.75, w: 1.3, h: 1.3,
      fontSize: 30, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle',
    });
    s.addText(idea.owner_name, {
      x: 0.65, y: 3.2, w: 3.9, h: 0.38,
      fontSize: 15, bold: true, color: C.black, fontFace: 'Calibri', align: 'center',
    });
    s.addText('Founder & CEO', {
      x: 0.65, y: 3.58, w: 3.9, h: 0.28,
      fontSize: 11, color: C.indigo, fontFace: 'Calibri', align: 'center',
    });
    s.addText('(Add domain expertise and background here)', {
      x: 0.65, y: 3.96, w: 3.9, h: 1.0,
      fontSize: 11, color: C.slate, fontFace: 'Calibri', align: 'center', italic: true,
    });

    card(s, pres, 5.05, 1.55, 4.45, 3.65, 'F0FDF4');
    s.addText('What we bring', {
      x: 5.25, y: 1.7, w: 4.05, h: 0.38,
      fontSize: 12, bold: true, color: '166534', fontFace: 'Calibri',
    });
    const resLines = bullet(bmc.resources, 5);
    s.addText(
      resLines.length
        ? resLines.map(l => ({ text: l, options: { bullet: true, breakLine: true } }))
        : [
            { text: 'Deep domain expertise in the problem space', options: { bullet: true, breakLine: true } },
            { text: 'Technical capability to build the product', options: { bullet: true, breakLine: true } },
            { text: 'Network and relationships with target customers', options: { bullet: true, breakLine: false } },
          ],
      {
        x: 5.25, y: 2.18, w: 4.05, h: 2.8,
        fontSize: 13, color: C.black, fontFace: 'Calibri', valign: 'top',
      }
    );
  }

  // ── SLIDE 13 · Financial Snapshot ────────────────────────────────────────────
  {
    const s = lightSlide(pres, 13, TOTAL);
    slideTitle(s, 'Financial Snapshot');

    s.addText('Indicative projections — assumptions to be validated with customers', {
      x: 0.45, y: 1.15, w: 9.1, h: 0.28,
      fontSize: 11, color: C.slate, fontFace: 'Calibri', italic: true,
    });

    type TCell = PptxGenJS.TableCell;
    const hCell = (text: string): TCell => ({
      text, options: { bold: true, color: C.white, fill: { color: C.dark }, fontFace: 'Calibri', fontSize: 13, align: 'center' }
    });
    const dCell = (text: string): TCell => ({
      text, options: { fontFace: 'Calibri', fontSize: 13, align: 'center', color: C.black }
    });

    const rows: TCell[][] = [
      [hCell('Metric'),    hCell('Year 1'),     hCell('Year 2'),      hCell('Year 3')],
      [dCell('Customers'), dCell('0 to 20'),    dCell('20 to 100'),   dCell('100 to 400')],
      [dCell('Revenue'),   dCell('0 to 50k'),   dCell('50k to 300k'), dCell('300k to 1.2M')],
      [dCell('Burn/mo'),   dCell('25-40k'),     dCell('40-80k'),      dCell('80-150k')],
      [dCell('Headcount'), dCell('1-3'),        dCell('4-10'),        dCell('10-25')],
      [dCell('Profit'),    dCell('—'),          dCell('—'),           dCell('Path to breakeven')],
    ];

    s.addTable(rows, {
      x: 0.45, y: 1.55, w: 9.1, h: 3.65,
      colW: [2.4, 2.2, 2.2, 2.3],
      border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
      rowH: 0.6,
    });
  }

  // ── SLIDE 14 · Funding Ask ────────────────────────────────────────────────────
  {
    const s = darkSlide(pres, 14, TOTAL);
    slideTitle(s, 'Funding Ask', true);

    s.addShape(pres.ShapeType.ellipse, {
      x: 0.45, y: 1.3, w: 3.0, h: 3.0,
      fill: { color: C.indigo }, line: { color: C.indigo, width: 0 },
    });
    s.addText('Raising', {
      x: 0.45, y: 1.7, w: 3.0, h: 0.4,
      fontSize: 12, color: 'C7D2FE', fontFace: 'Calibri', align: 'center',
    });
    s.addText('500k - 2M', {
      x: 0.45, y: 2.1, w: 3.0, h: 0.8,
      fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri', align: 'center',
    });
    s.addText('Seed Round', {
      x: 0.45, y: 3.0, w: 3.0, h: 0.38,
      fontSize: 12, color: 'C7D2FE', fontFace: 'Calibri', align: 'center',
    });

    s.addText('Use of Funds', {
      x: 3.85, y: 1.3, w: 5.7, h: 0.38,
      fontSize: 14, bold: true, color: C.sky, fontFace: 'Calibri',
    });

    const funds = [
      { label: 'Product & Engineering', pct: '40%', color: C.indigo },
      { label: 'Team & Operations',     pct: '30%', color: '7C3AED' },
      { label: 'Sales & Marketing',     pct: '20%', color: C.sky },
      { label: 'Operations',            pct: '10%', color: C.slate },
    ];
    funds.forEach(({ label, pct, color }, i) => {
      const y = 1.82 + i * 0.72;
      s.addShape(pres.ShapeType.roundRect, {
        x: 3.85, y, w: 5.7, h: 0.58,
        fill: { color: '1E3A5F' },
        line: { color: '2D5F99', width: 0.5 },
        rectRadius: 0.06,
      });
      s.addShape(pres.ShapeType.rect, {
        x: 3.85, y, w: 0.08, h: 0.58,
        fill: { color }, line: { color, width: 0 },
      });
      s.addText(label, {
        x: 4.05, y: y + 0.08, w: 4.5, h: 0.38,
        fontSize: 12, color: '94A3B8', fontFace: 'Calibri',
      });
      s.addText(pct, {
        x: 8.8, y: y + 0.08, w: 0.65, h: 0.38,
        fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri', align: 'right',
      });
    });

    s.addText('Runway: 18-24 months', {
      x: 3.85, y: 4.82, w: 5.7, h: 0.28,
      fontSize: 11, color: C.sky, fontFace: 'Calibri', italic: true,
    });
  }

  // ── SLIDE 15 · Closing ────────────────────────────────────────────────────────
  {
    const s = darkSlide(pres, 15, TOTAL);

    s.addText('Thank You', {
      x: 0.8, y: 0.8, w: 8.4, h: 0.9,
      fontSize: 40, bold: true, color: C.white, fontFace: 'Calibri', align: 'center',
    });

    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.85, w: 8.4, h: 2.6,
      fill: { color: '1A2E44' }, line: { color: '2D5F99', width: 0.75 },
      rectRadius: 0.12,
    });

    const summary = [
      ['Problem',  cap(bmc.segments, 100) || 'A clear, validated pain point experienced by a large market.'],
      ['Solution', cap(bmc.value, 100)    || 'A purpose-built product that delivers faster, simpler results.'],
      ['Market',   `${idea.business_domain || 'Large addressable market'} with strong growth tailwinds.`],
      ['Traction', 'Early validation underway — customer interviews, pilots, and waitlist.'],
      ['Ask',      'Raising 500k-2M seed round to build, launch, and acquire first customers.'],
    ];

    summary.forEach(([key, val], i) => {
      s.addText(`${key}:`, {
        x: 1.05, y: 2.05 + i * 0.46, w: 1.2, h: 0.36,
        fontSize: 11, bold: true, color: C.sky, fontFace: 'Calibri',
      });
      s.addText(val, {
        x: 2.35, y: 2.05 + i * 0.46, w: 6.7, h: 0.36,
        fontSize: 11, color: '94A3B8', fontFace: 'Calibri',
      });
    });

    s.addText(idea.owner_name, {
      x: 0.8, y: 4.65, w: 8.4, h: 0.3,
      fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri', align: 'center',
    });
    s.addText('(Add your email and LinkedIn here)', {
      x: 0.8, y: 4.98, w: 8.4, h: 0.24,
      fontSize: 11, color: C.slate, fontFace: 'Calibri', align: 'center', italic: true,
    });
  }

  return pres;
}

// ── route ──────────────────────────────────────────────────────────────────────
router.get('/:ideaId', requireAuth, async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  try {
    const ideaResult = await query(
      `SELECT i.name AS title, i.description, i.business_domain, u.name AS owner_name
       FROM ideas i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = $1`,
      [ideaId]
    );
    if (!ideaResult.rows.length) return res.status(404).json({ error: 'Idea not found' });

    const row = ideaResult.rows[0] as { title: string; description: string; business_domain: string; owner_name: string };
    const idea = {
      title:           String(row.title           || ''),
      description:     String(row.description     || ''),
      business_domain: String(row.business_domain || ''),
      owner_name:      String(row.owner_name      || ''),
    };

    const bmcResult = await query(
      `SELECT field_key, content
       FROM stage_entries
       WHERE idea_id = $1
         AND stage   = 'shape'
         AND field_key LIKE 'bmc_%'
         AND field_key NOT LIKE 'bmc_snapshot_%'`,
      [ideaId]
    );
    const bmc: Record<string, string> = {};
    (bmcResult.rows as { field_key: string; content: string }[]).forEach(r => {
      bmc[r.field_key.replace('bmc_', '')] = r.content;
    });

    const pres   = await buildPitchDeck(idea, bmc);
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;
    const safeName = idea.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_pitch_deck.pptx"`);
    res.send(buffer);
  } catch (err) {
    console.error('[pitchdeck]', err);
    res.status(500).json({ error: 'Failed to generate pitch deck' });
  }
});

export default router;
