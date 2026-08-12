import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { createNotification } from '../utils/notify';

const router = Router();

// ── Public: single challenge (no auth) ────────────────────────────────────────
// GET /api/challenges/public/:id
router.get('/public/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT c.id, c.idea_name, c.target_profile, c.target_domain,
              u.name AS author_name,
              c.conversations_goal, c.deadline, c.status,
              (SELECT COUNT(*)::int FROM challenge_conversations WHERE challenge_id = c.id) AS conversation_count
       FROM challenges c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.status = 'active'`,
      [id]
    );
    console.log('[public challenge]', id, '->', result.rows.length, 'rows');
    if (!result.rows.length) { res.status(404).json({ error: 'Challenge not found' }); return; }
    res.json({ challenge: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public: submit help offer (no auth) ───────────────────────────────────────
// POST /api/challenges/public/:id/offer
router.post('/public/:id/offer', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { offer_type, contact_name, contact_email, note } = req.body;
  if (!offer_type || !contact_email) {
    res.status(400).json({ error: 'offer_type and contact_email are required' }); return;
  }
  try {
    const cRes = await query<{ user_id: string; idea_name: string }>(
      `SELECT user_id, idea_name FROM challenges WHERE id = $1 AND status = 'active'`,
      [id]
    );
    if (!cRes.rows.length) { res.status(404).json({ error: 'Challenge not found or inactive' }); return; }
    const { user_id: ownerId, idea_name } = cRes.rows[0];

    await query(
      `INSERT INTO challenge_public_offers (challenge_id, offer_type, contact_name, contact_email, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, offer_type, contact_name ?? null, contact_email, note ?? null]
    );

    await createNotification(
      ownerId,
      'network_offer',
      offer_type === 'vouch' ? 'Someone offered a warm intro via your public link' : 'Someone offered to chat via your public link',
      `For "${idea_name}" — check your challenge for their details`,
      `/community?tab=challenges&highlight=${id}`
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(requireAuth);

// ── Helpers ────────────────────────────────────────────────────────────────────

function autoVerdict(signals: string[]): 'validated' | 'pivoted' | 'uncertain' {
  const counts = { validates: 0, challenges: 0, neutral: 0 };
  for (const s of signals) {
    if (s === 'validates' || s === 'challenges' || s === 'neutral') counts[s]++;
  }
  if (counts.validates > counts.challenges && counts.validates >= 3) return 'validated';
  if (counts.challenges > counts.validates && counts.challenges >= 3) return 'pivoted';
  return 'uncertain';
}

// ── Create a challenge ─────────────────────────────────────────────────────────
// POST /api/challenges
const CreateSchema = z.object({
  idea_id:        z.string().uuid(),
  target_profile: z.string().min(1).max(500),
  target_domain:  z.string().max(100).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  const parse = CreateSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  const { idea_id, target_profile, target_domain } = parse.data;

  try {
    // Verify idea belongs to user
    const ideaRes = await query<{ id: string; name: string }>(
      `SELECT id, name FROM ideas WHERE id = $1 AND user_id = $2`,
      [idea_id, req.userId]
    );
    if (!ideaRes.rows.length) { res.status(403).json({ error: 'Idea not found or not yours' }); return; }
    const ideaName = ideaRes.rows[0].name;

    // Only one active challenge per idea at a time
    const existing = await query(
      `SELECT id FROM challenges WHERE idea_id = $1 AND user_id = $2 AND status = 'active'`,
      [idea_id, req.userId]
    );
    if (existing.rows.length) { res.status(409).json({ error: 'Active challenge already exists for this idea' }); return; }

    const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const result = await query(
      `INSERT INTO challenges (idea_id, user_id, idea_name, target_profile, target_domain, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [idea_id, req.userId, ideaName, target_profile, target_domain ?? null, deadline]
    );
    res.status(201).json({ challenge: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List active challenges (community feed) ────────────────────────────────────
// GET /api/challenges
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         c.id, c.idea_id, c.idea_name, c.target_profile, c.target_domain,
         c.status, c.conversations_goal, c.deadline, c.verdict_signal, c.created_at,
         u.name            AS author_name,
         u.avatar_initials AS author_initials,
         COUNT(DISTINCT cv.id)::int                                                        AS conversation_count,
         (COUNT(DISTINCT co.id) FILTER (WHERE co.offer_type = 'vouch'))::int              AS vouch_count,
         (COUNT(DISTINCT co.id) FILTER (WHERE co.offer_type = 'fit'))::int                AS fit_count,
         BOOL_OR(co_me.offer_type = 'vouch')                                              AS i_vouched,
         BOOL_OR(co_me.offer_type = 'fit')                                                AS i_fit,
         (c.user_id = $1)                                                                  AS is_mine
       FROM challenges c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN challenge_conversations cv ON cv.challenge_id = c.id
       LEFT JOIN challenge_offers co        ON co.challenge_id = c.id
       LEFT JOIN challenge_offers co_me     ON co_me.challenge_id = c.id AND co_me.user_id = $1
       WHERE c.status = 'active'
       GROUP BY c.id, u.name, u.avatar_initials, c.user_id
       ORDER BY c.created_at DESC
       LIMIT 40`,
      [req.userId]
    );
    res.json({ challenges: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── My challenges (for WorkPage validate step) ────────────────────────────────
// GET /api/challenges/mine
router.get('/mine', async (req: Request, res: Response) => {
  const { idea_id } = req.query;
  try {
    const params: unknown[] = [req.userId];
    let extra = '';
    if (idea_id) {
      params.push(idea_id);
      extra = `AND c.idea_id = $${params.length}`;
    }
    const result = await query(
      `SELECT
         c.*,
         COUNT(cv.id)::int AS conversation_count,
         array_agg(cv.signal ORDER BY cv.created_at) FILTER (WHERE cv.id IS NOT NULL) AS signals
       FROM challenges c
       LEFT JOIN challenge_conversations cv ON cv.challenge_id = c.id
       WHERE c.user_id = $1 ${extra}
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      params
    );
    res.json({ challenges: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get single challenge with conversations ────────────────────────────────────
// GET /api/challenges/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const cRes = await query(
      `SELECT
         c.*, u.name AS author_name, u.avatar_initials AS author_initials,
         COUNT(DISTINCT cv.id)::int                                              AS conversation_count,
         COUNT(DISTINCT co.id) FILTER (WHERE co.offer_type = 'vouch')::int      AS vouch_count,
         COUNT(DISTINCT co.id) FILTER (WHERE co.offer_type = 'fit')::int        AS fit_count,
         (c.user_id = $2)                                                        AS is_mine
       FROM challenges c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN challenge_conversations cv ON cv.challenge_id = c.id
       LEFT JOIN challenge_offers co        ON co.challenge_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.name, u.avatar_initials, c.user_id`,
      [id, req.userId]
    );
    if (!cRes.rows.length) { res.status(404).json({ error: 'Challenge not found' }); return; }

    const convRes = await query(
      `SELECT cv.*, u.name AS author_name FROM challenge_conversations cv
       JOIN users u ON cv.user_id = u.id
       WHERE cv.challenge_id = $1 ORDER BY cv.created_at ASC`,
      [id]
    );
    const offersRes = await query(
      `SELECT co.*, u.name AS author_name, u.avatar_initials
       FROM challenge_offers co JOIN users u ON co.user_id = u.id
       WHERE co.challenge_id = $1 ORDER BY co.created_at ASC`,
      [id]
    );

    res.json({
      challenge:     cRes.rows[0],
      conversations: convRes.rows,
      offers:        offersRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Log a conversation ─────────────────────────────────────────────────────────
// POST /api/challenges/:id/conversations
const ConvoSchema = z.object({
  interviewee_role: z.string().min(1).max(200),
  quote_1:          z.string().max(500).optional(),
  quote_2:          z.string().max(500).optional(),
  quote_3:          z.string().max(500).optional(),
  signal:           z.enum(['validates', 'challenges', 'neutral']),
});

router.post('/:id/conversations', async (req: Request, res: Response) => {
  const parse = ConvoSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  const { id } = req.params;

  try {
    // Only challenge owner can log conversations
    const cRes = await query(
      `SELECT id, user_id, conversations_goal, status FROM challenges WHERE id = $1`,
      [id]
    );
    if (!cRes.rows.length) { res.status(404).json({ error: 'Challenge not found' }); return; }
    const challenge = cRes.rows[0];
    if (challenge.user_id !== req.userId) { res.status(403).json({ error: 'Not your challenge' }); return; }
    if (challenge.status !== 'active') { res.status(409).json({ error: 'Challenge is already completed' }); return; }

    // Current conversation count
    const countRes = await query(
      `SELECT COUNT(*)::int AS n, array_agg(signal ORDER BY created_at) AS signals
       FROM challenge_conversations WHERE challenge_id = $1`,
      [id]
    );
    const currentCount: number = countRes.rows[0].n;
    if (currentCount >= challenge.conversations_goal) {
      res.status(409).json({ error: 'Already reached conversation goal' }); return;
    }

    // Insert conversation
    const { interviewee_role, quote_1, quote_2, quote_3, signal } = parse.data;
    const convoRes = await query(
      `INSERT INTO challenge_conversations
         (challenge_id, user_id, interviewee_role, quote_1, quote_2, quote_3, signal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.userId, interviewee_role, quote_1 ?? null, quote_2 ?? null, quote_3 ?? null, signal]
    );

    const newCount = currentCount + 1;
    let verdict: string | null = null;

    // Auto-verdict when goal reached
    if (newCount >= challenge.conversations_goal) {
      const allSignals: string[] = [...(countRes.rows[0].signals ?? []), signal];
      verdict = autoVerdict(allSignals);
      await query(
        `UPDATE challenges SET status = 'completed', verdict_signal = $1, updated_at = NOW()
         WHERE id = $2`,
        [verdict, id]
      );
    } else {
      await query(`UPDATE challenges SET updated_at = NOW() WHERE id = $1`, [id]);
    }

    res.status(201).json({
      conversation:   convoRes.rows[0],
      conversation_count: newCount,
      verdict_signal: verdict,
      completed:      newCount >= challenge.conversations_goal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Offer to vouch or be interviewed ──────────────────────────────────────────
// POST /api/challenges/:id/offers
const OfferSchema = z.object({
  offer_type: z.enum(['vouch', 'fit']),
  note:       z.string().max(2000).optional(),
});

router.post('/:id/offers', async (req: Request, res: Response) => {
  const parse = OfferSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  const { id } = req.params;
  const { offer_type, note } = parse.data;

  try {
    const cRes = await query<{ user_id: string; idea_name: string }>(
      `SELECT user_id, idea_name FROM challenges WHERE id = $1 AND status = 'active'`,
      [id]
    );
    if (!cRes.rows.length) { res.status(404).json({ error: 'Challenge not found or inactive' }); return; }
    const { user_id: ownerId, idea_name } = cRes.rows[0];
    if (ownerId === req.userId) { res.status(400).json({ error: 'Cannot offer on your own challenge' }); return; }

    // Upsert offer
    await query(
      `INSERT INTO challenge_offers (challenge_id, user_id, offer_type, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (challenge_id, user_id, offer_type) DO UPDATE SET note = EXCLUDED.note`,
      [id, req.userId, offer_type, note ?? null]
    );

    // Notify challenge owner
    const offerLabel = offer_type === 'vouch' ? 'offered to make a warm intro' : 'offered to be interviewed';
    await createNotification(
      ownerId,
      'network_offer',
      `Someone ${offerLabel} for your challenge`,
      `For "${idea_name}"`,
      `/community`
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Withdraw an offer ──────────────────────────────────────────────────────────
// DELETE /api/challenges/:id/offers
router.delete('/:id/offers', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { offer_type } = req.query as { offer_type?: string };
  if (!offer_type) { res.status(400).json({ error: 'offer_type required' }); return; }
  try {
    await query(
      `DELETE FROM challenge_offers WHERE challenge_id = $1 AND user_id = $2 AND offer_type = $3`,
      [id, req.userId, offer_type]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
