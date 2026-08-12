import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── List notifications (newest first, limit 30) ───────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Unread count ──────────────────────────────────────────────────────────────
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.userId]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Mark one as read ──────────────────────────────────────────────────────────
router.patch('/:id/read', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Mark all as read ──────────────────────────────────────────────────────────
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
