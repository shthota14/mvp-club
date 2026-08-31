import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { moderateContent } from '../utils/moderation';
import { checkPainPointContent } from '../utils/painPointModeration';

const router = Router();

// Public, unauthenticated pain-point logging + feed.
//
// This is deliberately its own router, mounted separately in index.ts, rather
// than living inside community.ts — that file applies `router.use(requireAuth)`
// globally, and this is the one write (and read) path in the app meant to work
// for a visitor with no account at all. Submissions land in the same
// community_posts table as member-authenticated pain points (post_type =
// 'pain_point', user_id left NULL) so they show up in one shared feed rather
// than a segregated anonymous-only one.
//
// Because this is a fully open, unauthenticated write surface, submissions go
// through two moderation passes before becoming publicly visible: the cheap
// synchronous keyword check (utils/moderation.ts) first, then an AI relevance
// check (utils/painPointModeration.ts) — mirroring the pattern already used
// for community poll creation. Anything that fails either check is held for
// admin review instead of published; the AI check fails open (auto-approves)
// if the model is briefly unreachable, so a moderation-service hiccup never
// blocks a legitimate submission indefinitely.

const PainPointSchema = z.object({
  description: z.string().trim().min(10, 'Tell us a bit more about the problem (10+ characters).').max(1000),
  audience: z.string().trim().min(3, 'Who experiences this?').max(200),
  frequency: z.string().trim().min(1).max(60),
  impact: z.enum(['low', 'medium', 'high']).default('medium'),
  domain: z.string().trim().max(200).optional().default(''),
  // Fully optional — a visitor can submit with zero identifying info. If left,
  // it's stored so we can notify them or, later, offer to link this
  // submission to an account they register with the same email. Never
  // rendered in any public response.
  email: z.union([z.string().trim().email().max(320), z.literal('')]).optional(),
});

function encodePP(data: { description: string; audience: string; frequency: string; impact: string; domain: string }): string {
  return `||PP||${JSON.stringify(data)}||END||`;
}

// ── Log a pain point, no account required ──────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const parsed = PainPointSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { description, audience, frequency, impact, domain, email } = parsed.data;
  const guestEmail = email && email.length > 0 ? email : null;
  const content = encodePP({ description, audience, frequency, impact, domain: domain || '' });

  try {
    // Pass 1: cheap keyword check — instant, catches the obvious stuff.
    const kw = moderateContent(description);
    if (kw.flagged) {
      const inserted = await query(
        `INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, moderation_status, flag_reason, guest_email)
         VALUES (NULL, NULL, 'idea', $1, 'pain_point', 'held', $2, $3) RETURNING id`,
        [content, kw.reason, guestEmail]
      );
      res.status(202).json({
        id: inserted.rows[0].id,
        held: true,
        message: "Thanks — we've got it. It's in review before it goes public.",
      });
      return;
    }

    // Pass 2: AI relevance/subtler-content check — fails open if the model is down.
    const ai = await checkPainPointContent(description, audience);
    const modStatus = ai.approved ? 'visible' : 'held';

    const inserted = await query(
      `INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, moderation_status, flag_reason, guest_email)
       VALUES (NULL, NULL, 'idea', $1, 'pain_point', $2, $3, $4) RETURNING id, created_at`,
      [content, modStatus, ai.approved ? null : ai.reason, guestEmail]
    );

    if (!ai.approved) {
      res.status(202).json({
        id: inserted.rows[0].id,
        held: true,
        message: "Thanks — we've got it. It's in review before it goes public.",
      });
      return;
    }

    res.status(201).json({
      id: inserted.rows[0].id,
      created_at: inserted.rows[0].created_at,
      message: 'Pain point logged — thanks for sharing it.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public feed — anyone can browse logged pain points, no account needed ──
router.get('/', async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;
  try {
    const result = await query(
      `SELECT
         p.id, p.content, p.stage, p.created_at,
         COALESCE(u.name, 'Anonymous founder')  AS author_name,
         COALESCE(u.avatar_initials, '👤')       AS author_initials,
         (p.user_id IS NULL)                     AS is_guest,
         COUNT(DISTINCT r_enc.id) FILTER (WHERE r_enc.type = 'encourage') AS encourage_count,
         COUNT(DISTINCT c.id)                                             AS comment_count
       FROM community_posts p
       LEFT JOIN users u        ON p.user_id = u.id
       LEFT JOIN reactions r_enc ON r_enc.post_id = p.id AND r_enc.type = 'encourage'
       LEFT JOIN comments  c     ON c.post_id = p.id
       WHERE p.post_type = 'pain_point'
         AND p.moderation_status IN ('visible', 'approved')
       GROUP BY p.id, u.name, u.avatar_initials
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    );
    res.json({ painPoints: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
