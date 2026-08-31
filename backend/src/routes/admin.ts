import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/admin';
import { signToken } from '../middleware/auth';
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
         u.id AS author_id, u.name AS author_name, u.email AS author_email, u.avatar_initials
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

// ── Consolidated progress view: one row per member, bird's-eye status ─────────
router.get('/progress', async (_req: Request, res: Response) => {
  try {
    const rowsResult = await query<{
      id: string; name: string; email: string; current_stage: string; created_at: string;
      idea_count: string; last_active: string | null;
    }>(
      `SELECT
         u.id, u.name, u.email, u.current_stage, u.created_at,
         (SELECT COUNT(*) FROM ideas WHERE user_id = u.id) AS idea_count,
         (SELECT MAX(se.updated_at) FROM stage_entries se WHERE se.user_id = u.id) AS last_active
       FROM users u
       WHERE u.is_admin = FALSE
       ORDER BY last_active DESC NULLS LAST, u.created_at DESC`
    );

    // Active-day streak per user, computed from the last 30 days of stage_entries
    // activity (same "today-or-yesterday keeps it alive" rule as the Validate
    // momentum streak) — one grouped query rather than N+1 per-user queries.
    const activityResult = await query<{ user_id: string; d: string }>(
      `SELECT DISTINCT user_id, DATE(updated_at) AS d
       FROM stage_entries
       WHERE updated_at > NOW() - INTERVAL '30 days'`
    );
    const daysByUser = new Map<string, Set<string>>();
    for (const row of activityResult.rows) {
      if (!daysByUser.has(row.user_id)) daysByUser.set(row.user_id, new Set());
      daysByUser.get(row.user_id)!.add(row.d);
    }
    const streakFor = (userId: string): number => {
      const days = daysByUser.get(userId);
      if (!days || !days.size) return 0;
      const cursor = new Date();
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (days.has(fmt(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
      return streak;
    };

    const rows = rowsResult.rows.map(r => ({ ...r, streak_days: streakFor(r.id) }));
    res.json({ users: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Impersonate a user: mint a short-lived token so the admin can view/act as
//    them. Logged to admin_audit_log so there's a record of who viewed as
//    whom and when. ─────────────────────────────────────────────────────────
router.post('/users/:id/impersonate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.userId!;
  try {
    const result = await query<{
      id: string; email: string; name: string; current_stage: string;
      community_opt: boolean; help_types: string[]; avatar_initials: string; is_admin: boolean;
    }>(
      `SELECT id, email, name, current_stage, community_opt, help_types, avatar_initials, is_admin
       FROM users WHERE id = $1 AND is_admin = FALSE`,
      [id]
    );
    const target = result.rows[0];
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }

    const token = signToken(target.id, target.email, adminId);
    await query(
      `INSERT INTO admin_audit_log (admin_id, target_user_id, action) VALUES ($1, $2, 'impersonate_start')`,
      [adminId, target.id]
    );
    res.json({ token, user: target });
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

// ── Hero-page (or any tracked path's) usage analytics ────────────────────────
// "windows" gives exact unique-visitor + page-view counts for standard
// periods that fit inside the 90-day raw-retention window (today/7d/30d/90d).
// "allTime" gives exact totals for page views and clicks (sums are always
// exact, forever) plus "visitorDays" — the sum of each day's unique-visitor
// count, which is NOT the same as a true all-time unique-visitor count once
// raw rows older than 90 days have been purged (a person who visits on two
// different, both-already-purged days is counted twice). We deliberately
// don't claim an exact all-time unique count; the dashboard labels
// visitorDays for what it is instead of quietly overstating precision.
router.get('/analytics', async (req: Request, res: Response) => {
  const path = typeof req.query.path === 'string' && req.query.path ? req.query.path : '/';
  try {
    const windows = await query<{ window: string; unique_visitors: string; page_views: string }>(
      `SELECT 'today' AS window,
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
         COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views
       FROM analytics_events WHERE path = $1 AND created_at >= date_trunc('day', now())
       UNION ALL
       SELECT '7d',
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view'),
         COUNT(*) FILTER (WHERE event_type = 'page_view')
       FROM analytics_events WHERE path = $1 AND created_at >= now() - interval '7 days'
       UNION ALL
       SELECT '30d',
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view'),
         COUNT(*) FILTER (WHERE event_type = 'page_view')
       FROM analytics_events WHERE path = $1 AND created_at >= now() - interval '30 days'
       UNION ALL
       SELECT '90d',
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view'),
         COUNT(*) FILTER (WHERE event_type = 'page_view')
       FROM analytics_events WHERE path = $1 AND created_at >= now() - interval '90 days'`,
      [path]
    );

    const allTimeAgg = await query<{ total_page_views: string; total_clicks: string; visitor_days: string }>(
      `SELECT
         COALESCE(SUM(total_events) FILTER (WHERE event_type = 'page_view'), 0)  AS total_page_views,
         COALESCE(SUM(total_events) FILTER (WHERE event_type = 'link_click'), 0) AS total_clicks,
         COALESCE(SUM(unique_visitors) FILTER (WHERE event_type = 'page_view'), 0) AS visitor_days
       FROM analytics_daily_agg WHERE path = $1`,
      [path]
    );
    // Days not yet folded into analytics_daily_agg by the nightly rollup
    // (today, plus any day since the last run) — added on top so "all-time"
    // totals aren't stale by up to a day.
    const notYetRolled = await query<{ page_views: string; clicks: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'page_view')  AS page_views,
         COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks
       FROM analytics_events
       WHERE path = $1
         AND created_at >= COALESCE((SELECT MAX(day) + 1 FROM analytics_daily_agg WHERE path = $1), date_trunc('day', now()))`,
      [path]
    );

    const daily = await query<{ day: string; unique_visitors: string; page_views: string }>(
      `SELECT date_trunc('day', created_at)::date AS day,
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
         COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views
       FROM analytics_events
       WHERE path = $1 AND created_at >= now() - interval '30 days'
       GROUP BY 1 ORDER BY 1 ASC`,
      [path]
    );

    const links = await query<{ link_label: string; clicks: string; unique_clickers: string }>(
      `SELECT link_label, COUNT(*) AS clicks, COUNT(DISTINCT visitor_hash) AS unique_clickers
       FROM analytics_events
       WHERE path = $1 AND event_type = 'link_click' AND created_at >= now() - interval '30 days'
       GROUP BY link_label ORDER BY clicks DESC`,
      [path]
    );

    res.json({
      path,
      windows: windows.rows.map(r => ({ window: r.window, uniqueVisitors: Number(r.unique_visitors), pageViews: Number(r.page_views) })),
      allTime: {
        totalPageViews: Number(allTimeAgg.rows[0]?.total_page_views ?? 0) + Number(notYetRolled.rows[0]?.page_views ?? 0),
        totalClicks: Number(allTimeAgg.rows[0]?.total_clicks ?? 0) + Number(notYetRolled.rows[0]?.clicks ?? 0),
        visitorDays: Number(allTimeAgg.rows[0]?.visitor_days ?? 0),
      },
      daily: daily.rows.map(r => ({ day: r.day, uniqueVisitors: Number(r.unique_visitors), pageViews: Number(r.page_views) })),
      links: links.rows.map(r => ({ label: r.link_label, clicks: Number(r.clicks), uniqueClickers: Number(r.unique_clickers) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
