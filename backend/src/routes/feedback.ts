import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { createNotification } from '../utils/notify';

const router = Router();
router.use(requireAuth);

const FeedbackSchema = z.object({
  category: z.enum(['feature', 'bug', 'improvement', 'feedback']),
  message: z.string().min(1).max(2000),
  page_context: z.string().max(300).optional(),
});

const CATEGORY_LABEL: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
  improvement: 'Improvement idea',
  feedback: 'General feedback',
};

// ── Submit feedback (any authenticated user) — private, admin-only inbox ──────
router.post('/', async (req: Request, res: Response) => {
  const parse = FeedbackSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  const { category, message, page_context } = parse.data;

  try {
    const result = await query(
      `INSERT INTO feedback_submissions (user_id, category, message, page_context)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, category, message.trim(), page_context || null]
    );

    // Notify every admin — in-app + (low-volume) email, never shown to other users
    const submitterRes = await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
    const submitterName = submitterRes.rows[0]?.name ?? 'Someone';
    const admins = await query<{ id: string }>('SELECT id FROM users WHERE is_admin = TRUE');
    await Promise.all(admins.rows.map(a => createNotification(
      a.id, 'new_feedback',
      `${CATEGORY_LABEL[category]} from ${submitterName}`,
      message.trim().slice(0, 140),
      '/admin?tab=feedback'
    )));

    res.status(201).json({ submission: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
