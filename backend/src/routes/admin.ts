import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/admin';
import { runWeeklyDigest } from '../jobs/weeklyDigest';

const router = Router();
router.use(requireAdmin);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [ideas, posts, users, feedback] = await Promise.all([
      query(`SELECT
               COUNT(*) FILTER (WHERE moderation_status = 'pending')  AS pending,
               COUNT(*) FILTER (WHERE moderation_status = 'approved') AS approved,
               COUNT(*) FILTER (WHERE moderation_status = 'rejected') AS rejected,
               COUNT(*) AS total
             FROM ideas`),
      query(`SELECT
               COUNT(*) FILTER (WHERE moderation_status = 'flagged')  AS flagged,
               COUNT(*) FILTER (WHERE moderation_status = 'held')     AS held,
               COUNT(*) FILTER (WHERE moderation_status = 'rejected') AS rejected,
               COUNT(*) AS total
             FROM community_posts`),
      query('SELECT COUNT(*) AS total FROM users WHERE is_admin = FALSE'),
      query(`SELECT COUNT(*) FILTER (WHERE status = 'new') AS new, COUNT(*) AS total FROM feedback_submissions`),
    ]);
    res.json({ ideas: ideas.rows[0], posts: posts.rows[0], users: users.rows[0], feedback: feedback.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── List all ideas (with optional status filter, exclude admin-owned) ─────────
router.get('/ideas', async (req: Request, res: Response) => {
  const { status } = req.query;
  try {
    const params: unknown[] = [];
    const statusClause = status ? `AND i.moderation_status = $${params.push(status)}` : '';
    const result = await query(
      `SELECT
         i.id, i.name, i.description, i.stage, i.moderation_status,
         i.created_at, i.updated_at,
         u.name AS author_name, u.email AS author_email, u.avatar_initials
       FROM ideas i
       JOIN users u ON i.user_id = u.id
       WHERE u.is_admin = FALSE
       ${statusClause}
       ORDER BY i.created_at DESC`,
      params
    );
    res.json({ ideas: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Approve / reject an idea ──────────────────────────────────────────────────
router.patch('/ideas/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { moderation_status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(moderation_status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    const result = await query(
      'UPDATE ideas SET moderation_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [moderation_status, id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    res.json({ idea: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Delete an idea (and cascade entries / posts) ──────────────────────────────
router.delete('/ideas/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM stage_entries WHERE idea_id = $1', [id]);
    await query('DELETE FROM community_posts WHERE idea_id = $1', [id]);
    const result = await query('DELETE FROM ideas WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    res.json({ deleted: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Get all posts for a specific idea (admin view) ────────────────────────────
router.get('/ideas/:id/posts', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT
         p.id, p.content, p.post_type, p.moderation_status, p.flag_reason,
         p.created_at,
         u.name AS author_name, u.email AS author_email, u.avatar_initials
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.idea_id = $1
       ORDER BY p.created_at DESC`,
      [id]
    );
    res.json({ posts: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── List posts (all or by status) ─────────────────────────────────────────────
router.get('/posts', async (req: Request, res: Response) => {
  const { status } = req.query;
  try {
    const params: unknown[] = [];
    const where = status ? `WHERE p.moderation_status = $${params.push(status)}` : '';
    const result = await query(
      `SELECT
         p.id, p.content, p.post_type, p.moderation_status, p.flag_reason,
         p.created_at,
         u.name AS author_name, u.email AS author_email, u.avatar_initials,
         i.name AS idea_name, i.id AS idea_id
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN ideas i ON p.idea_id = i.id
       ${where}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json({ posts: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Moderate a post (approve / reject / hold) ─────────────────────────────────
router.patch('/posts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { moderation_status } = req.body;
  if (!['visible', 'approved', 'rejected', 'held', 'flagged'].includes(moderation_status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    const result = await query(
      'UPDATE community_posts SET moderation_status = $1 WHERE id = $2 RETURNING *',
      [moderation_status, id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Post not found' }); return; }
    res.json({ post: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── List all users ────────────────────────────────────────────────────────────
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, name, current_stage, is_admin, suspended, created_at,
              (SELECT COUNT(*) FROM ideas WHERE user_id = users.id) AS idea_count
       FROM users WHERE is_admin = FALSE ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Reset a user's password ───────────────────────────────────────────────────
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' }); return;
  }
  try {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(new_password, 12);
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND is_admin = FALSE RETURNING id',
      [hash, id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Suspend / unsuspend a user ────────────────────────────────────────────────
router.patch('/users/:id/suspend', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { suspended } = req.body;
  try {
    const result = await query(
      'UPDATE users SET suspended = $1 WHERE id = $2 AND is_admin = FALSE RETURNING id, suspended',
      [Boolean(suspended), id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Delete a user (cascade everything) ───────────────────────────────────────
router.delete('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Cascade: messages, conversations, posts, ideas, entries, then user
    await query('DELETE FROM messages WHERE sender_id = $1', [id]);
    await query('DELETE FROM conversations WHERE user1_id = $1 OR user2_id = $1', [id]);
    await query('DELETE FROM stage_entries WHERE user_id = $1', [id]);
    await query('DELETE FROM community_posts WHERE user_id = $1', [id]);
    await query('DELETE FROM ideas WHERE user_id = $1', [id]);
    const result = await query('DELETE FROM users WHERE id = $1 AND is_admin = FALSE RETURNING id', [id]);
    if (!result.rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ deleted: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Jobs ──────────────────────────────────────────────────────────────────────
router.post('/jobs/weekly-digest', async (_req: Request, res: Response) => {
  try {
    // Count eligible recipients first so we can report it back
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users
       WHERE COALESCE(email_notifications, TRUE) = TRUE
         AND COALESCE(is_admin, FALSE) = FALSE`
    );
    const eligibleCount = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Run async — don't await so the HTTP response returns immediately
    runWeeklyDigest().catch(err =>
      console.error('[admin/jobs] weekly-digest async error:', err)
    );

    res.json({ ok: true, queued: eligibleCount });
  } catch (err) {
    console.error('[admin/jobs] weekly-digest trigger error:', err);
    res.status(500).json({ error: 'Failed to start job' });
  }
});

// ── Feedback inbox (feature requests / bugs / improvements / general feedback)
router.get('/feedback', async (req: Request, res: Response) => {
  const { status } = req.query;
  try {
    const params: unknown[] = [];
    const where = status ? `WHERE f.status = $${params.push(status)}` : '';
    const result = await query(
      `SELECT
         f.id, f.category, f.message, f.page_context, f.status, f.admin_notes,
         f.created_at, f.updated_at,
         u.name AS author_name, u.email AS author_email, u.avatar_initials
       FROM feedback_submissions f
       JOIN users u ON f.user_id = u.id
       ${where}
       ORDER BY f.created_at DESC`,
      params
    );
    res.json({ submissions: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/feedback/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  if (status && !['new', 'reviewing', 'planned', 'done', 'dismissed'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    const result = await query(
      `UPDATE feedback_submissions
       SET status = COALESCE($1, status), admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status ?? null, admin_notes ?? null, id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Submission not found' }); return; }
    res.json({ submission: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
