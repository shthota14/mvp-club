import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { moderateContent } from '../utils/moderation';
import { sendNetworkOfferEmail } from '../utils/mailer';
import { createNotification } from '../utils/notify';

const router = Router();
router.use(requireAuth);

const PostSchema = z.object({
  idea_id: z.string().uuid().optional(),
  stage: z.enum(['idea','hone','validate','shape','done']),
  content: z.string().min(1).max(2000),
  post_type: z.enum(['win','question','validation_request','update','pain_point','collab']).default('win'),
});

// ── List all public ideas (community feed) ───────────────────────────────────
router.get('/ideas', async (req: Request, res: Response) => {
  const { stage, limit = '30', offset = '0' } = req.query;
  try {
    const params: unknown[] = [];
    // Approved ideas only; never show archived
    const conditions: string[] = ["i.moderation_status = 'approved'", "i.idea_status != 'archived'"];
    if (stage) {
      params.push(stage);
      conditions.push(`i.stage = $${params.length}`);
    }
    params.push(Number(limit));
    const limitClause = `$${params.length}`;
    params.push(Number(offset));
    const offsetClause = `$${params.length}`;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT
         i.id, i.user_id, i.name, i.description, i.stage, i.community_ask,
         i.business_domain, i.idea_status,
         i.is_active, i.created_at, i.updated_at,
         u.name            AS author_name,
         u.avatar_initials AS author_initials,
         COUNT(DISTINCT p.id) FILTER (WHERE p.moderation_status IN ('visible','approved')) AS post_count
       FROM ideas i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN community_posts p ON p.idea_id = i.id
       ${whereClause}
       GROUP BY i.id, i.user_id, i.name, i.description, i.stage, i.community_ask,
                i.business_domain, i.idea_status, i.is_active, i.created_at, i.updated_at,
                u.name, u.avatar_initials
       ORDER BY i.updated_at DESC
       LIMIT ${limitClause} OFFSET ${offsetClause}`,
      params
    );
    res.json({ ideas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get a single idea with full details ──────────────────────────────────────
router.get('/ideas/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT
         i.id, i.user_id, i.name, i.description, i.stage, i.community_ask,
         i.business_domain, i.idea_status,
         i.is_active, i.created_at, i.updated_at,
         u.name            AS author_name,
         u.email           AS author_email,
         u.avatar_initials AS author_initials,
         COUNT(DISTINCT p.id)  AS post_count,
         COUNT(DISTINCT b.user_id) AS bookmark_count,
         COUNT(DISTINCT f.user_id) AS follow_count,
         EXISTS (SELECT 1 FROM bookmarks  WHERE idea_id = i.id AND user_id = $2) AS is_bookmarked,
         EXISTS (SELECT 1 FROM idea_follows WHERE idea_id = i.id AND user_id = $2) AS is_following
       FROM ideas i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN community_posts p  ON p.idea_id = i.id
       LEFT JOIN bookmarks b        ON b.idea_id = i.id
       LEFT JOIN idea_follows f     ON f.idea_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, i.user_id, i.name, i.description, i.stage, i.community_ask,
                i.business_domain, i.idea_status, i.is_active, i.created_at, i.updated_at,
                u.name, u.email, u.avatar_initials`,
      [id, req.userId]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    res.json({ idea: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get posts for a specific idea ─────────────────────────────────────────────
router.get('/ideas/:id/posts', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT
         p.*,
         u.name            AS author_name,
         u.avatar_initials AS author_initials,
         COUNT(DISTINCT r_enc.id) FILTER (WHERE r_enc.type = 'encourage') AS encourage_count,
         COUNT(DISTINCT r_ask.id) FILTER (WHERE r_ask.type = 'ask')       AS ask_count,
         COUNT(DISTINCT c.id)                                              AS comment_count,
         (SELECT type FROM reactions WHERE post_id = p.id AND user_id = $2 LIMIT 1) AS user_reacted
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r_enc ON r_enc.post_id = p.id AND r_enc.type = 'encourage'
       LEFT JOIN reactions r_ask ON r_ask.post_id = p.id AND r_ask.type = 'ask'
       LEFT JOIN comments  c     ON c.post_id = p.id
       WHERE p.idea_id = $1
         AND p.moderation_status IN ('visible', 'approved')
       GROUP BY p.id, u.name, u.avatar_initials
       ORDER BY p.created_at ASC`,
      [id, req.userId]
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Add a post to a specific idea ─────────────────────────────────────────────
router.post('/ideas/:id/posts', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, post_type = 'win' } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }

  try {
    const ideaRes = await query<{ stage: string; user_id: string }>(
      'SELECT stage, user_id FROM ideas WHERE id = $1',
      [id]
    );
    if (!ideaRes.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    const { stage } = ideaRes.rows[0];

    // Auto-moderation: flag before saving if content matches patterns
    const { flagged, reason } = moderateContent(content.trim());
    const modStatus = flagged ? 'flagged' : 'visible';

    const result = await query(
      `INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, moderation_status, flag_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, id, stage, content.trim(), post_type, modStatus, reason]
    );
    const post = result.rows[0];
    // If flagged, return a soft-block response so UI knows
    if (flagged) {
      return res.status(202).json({ post, flagged: true, message: 'Your post has been submitted for review.' });
    }

    // Notify idea owner (if someone else posted)
    const ownerId = ideaRes.rows[0].user_id;
    if (ownerId !== req.userId) {
      const posterRes = await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
      const posterName = posterRes.rows[0]?.name ?? 'Someone';
      await createNotification(
        ownerId, 'new_post',
        `${posterName} posted on your idea`,
        content.trim().slice(0, 100),
        `/community/${id}`
      );
    }

    res.status(201).json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Toggle bookmark ───────────────────────────────────────────────────────────
router.post('/ideas/:id/bookmark', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT 1 FROM bookmarks WHERE user_id = $1 AND idea_id = $2',
      [req.userId, id]
    );
    if (existing.rows.length) {
      await query('DELETE FROM bookmarks WHERE user_id = $1 AND idea_id = $2', [req.userId, id]);
      res.json({ bookmarked: false });
    } else {
      await query('INSERT INTO bookmarks (user_id, idea_id) VALUES ($1, $2)', [req.userId, id]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Toggle follow ─────────────────────────────────────────────────────────────
router.post('/ideas/:id/follow', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT 1 FROM idea_follows WHERE user_id = $1 AND idea_id = $2',
      [req.userId, id]
    );
    if (existing.rows.length) {
      await query('DELETE FROM idea_follows WHERE user_id = $1 AND idea_id = $2', [req.userId, id]);
      res.json({ following: false });
    } else {
      await query('INSERT INTO idea_follows (user_id, idea_id) VALUES ($1, $2)', [req.userId, id]);
      res.json({ following: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get or create a conversation with another user ────────────────────────────
router.get('/messages/with/:userId', async (req: Request, res: Response) => {
  const otherId = req.params.userId;
  const { idea_id } = req.query;
  const me = req.userId!;

  try {
    // find existing conversation between the two users (optionally for a specific idea)
    const existing = await query(
      `SELECT id FROM conversations
       WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
         AND ($3::uuid IS NULL OR idea_id = $3::uuid)
       LIMIT 1`,
      [me, otherId, idea_id || null]
    );

    let conversationId: string;
    if (existing.rows.length) {
      conversationId = existing.rows[0].id;
    } else {
      const created = await query(
        `INSERT INTO conversations (user1_id, user2_id, idea_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [me, otherId, idea_id || null]
      );
      conversationId = created.rows[0].id;
    }

    // fetch messages
    const msgs = await query(
      `SELECT m.*, u.name AS sender_name, u.avatar_initials AS sender_initials
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json({ conversation_id: conversationId, messages: msgs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Send a message ────────────────────────────────────────────────────────────
router.post('/messages/:conversationId', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }

  try {
    // Verify user is a participant
    const conv = await query(
      'SELECT id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [conversationId, req.userId]
    );
    if (!conv.rows.length) { res.status(403).json({ error: 'Not a participant' }); return; }

    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)
       RETURNING *, (SELECT name FROM users WHERE id = $2) AS sender_name,
                   (SELECT avatar_initials FROM users WHERE id = $2) AS sender_initials`,
      [conversationId, req.userId, content.trim()]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Edit a message (only if it's the sender's last message in that conversation)
router.patch('/messages/:conversationId/edit/:messageId', async (req: Request, res: Response) => {
  const { conversationId, messageId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'Content is required' }); return; }

  try {
    // Must be the sender
    const msgRes = await query<{ id: string; sender_id: string; conversation_id: string }>(
      'SELECT id, sender_id, conversation_id FROM messages WHERE id = $1',
      [messageId]
    );
    if (!msgRes.rows.length) { res.status(404).json({ error: 'Message not found' }); return; }
    const msg = msgRes.rows[0];
    if (msg.sender_id !== req.userId) { res.status(403).json({ error: 'Not your message' }); return; }
    if (msg.conversation_id !== conversationId) { res.status(403).json({ error: 'Conversation mismatch' }); return; }

    // Must be the last message in this conversation
    const lastRes = await query<{ id: string }>(
      'SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
      [conversationId]
    );
    if (lastRes.rows[0]?.id !== messageId) {
      res.status(403).json({ error: 'Only your last message can be edited' }); return;
    }

    const updated = await query(
      `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *`,
      [content.trim(), messageId]
    );
    res.json({ message: updated.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Get my conversations (inbox) ──────────────────────────────────────────────
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         c.id, c.idea_id, c.created_at,
         CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS other_user_id,
         CASE WHEN c.user1_id = $1 THEN u2.name     ELSE u1.name     END AS other_name,
         CASE WHEN c.user1_id = $1 THEN u2.avatar_initials ELSE u1.avatar_initials END AS other_initials,
         i.name AS idea_name,
         (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
         EXISTS (
           SELECT 1 FROM messages m2
           WHERE m2.conversation_id = c.id
             AND m2.sender_id != $1
             AND m2.read_at IS NULL
         ) AS unread
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN ideas i ON c.idea_id = i.id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.userId]
    );
    res.json({ conversations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Mark conversation messages as read ───────────────────────────────────────
router.patch('/messages/:conversationId/read', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  try {
    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [conversationId, req.userId]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Unread message count ──────────────────────────────────────────────────────
router.get('/messages/unread-count', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT COUNT(*) AS unread FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE (c.user1_id = $1 OR c.user2_id = $1)
         AND m.sender_id != $1
         AND m.read_at IS NULL`,
      [req.userId]
    );
    res.json({ unread: Number(result.rows[0].unread) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Search users (for compose) ────────────────────────────────────────────────
router.get('/users/search', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || String(q).trim().length < 1) { res.json({ users: [] }); return; }
  try {
    const term = `%${String(q).toLowerCase()}%`;
    const result = await query(
      `SELECT id, name, email, avatar_initials, current_stage FROM users
       WHERE is_admin = FALSE AND id != $1
         AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)
       ORDER BY name ASC LIMIT 10`,
      [req.userId, term]
    );
    res.json({ users: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── List posts (optionally filtered by stage) ────────────────────────────────
router.get('/posts', async (req: Request, res: Response) => {
  const { stage, limit = '20', offset = '0' } = req.query;
  try {
    const result = await query(
      `SELECT
        p.*,
        u.name as author_name,
        u.avatar_initials as author_initials,
        COUNT(DISTINCT r_enc.id) FILTER (WHERE r_enc.type = 'encourage') as encourage_count,
        COUNT(DISTINCT r_ask.id) FILTER (WHERE r_ask.type = 'ask') as ask_count,
        COUNT(DISTINCT c.id) as comment_count,
        (SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1 LIMIT 1) as user_reacted
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r_enc ON r_enc.post_id = p.id AND r_enc.type = 'encourage'
       LEFT JOIN reactions r_ask ON r_ask.post_id = p.id AND r_ask.type = 'ask'
       LEFT JOIN comments c ON c.post_id = p.id
       ${stage ? 'WHERE p.stage = $4' : ''}
       GROUP BY p.id, u.name, u.avatar_initials
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      stage
        ? [req.userId, Number(limit), Number(offset), stage]
        : [req.userId, Number(limit), Number(offset)]
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/posts', async (req: Request, res: Response) => {
  const parse = PostSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { idea_id, stage, content, post_type } = parse.data;
  try {
    const result = await query(
      `INSERT INTO community_posts (user_id, idea_id, stage, content, post_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, idea_id || null, stage, content, post_type]
    );
    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Edit a community post (only owner, only if it's the last post on that idea)
router.patch('/posts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }

  try {
    const postRes = await query<{ id: string; user_id: string; idea_id: string }>(
      'SELECT id, user_id, idea_id FROM community_posts WHERE id = $1',
      [id]
    );
    if (!postRes.rows.length) { res.status(404).json({ error: 'Post not found' }); return; }
    const post = postRes.rows[0];
    if (post.user_id !== req.userId) { res.status(403).json({ error: 'Not your post' }); return; }

    // Only allow edit if this is the last post on that idea
    const lastRes = await query<{ id: string }>(
      `SELECT id FROM community_posts WHERE idea_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [post.idea_id]
    );
    if (lastRes.rows[0]?.id !== id) {
      res.status(403).json({ error: 'You can only edit your most recent post' }); return;
    }

    const updated = await query(
      `UPDATE community_posts SET content = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, content, updated_at`,
      [content.trim(), id]
    );
    res.json({ post: updated.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── List collab posts (founders seeking collaborators on an initiative) ───────
router.get('/collabs', async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;
  try {
    const result = await query(
      `SELECT
         p.*,
         u.name            AS author_name,
         u.avatar_initials AS author_initials,
         u.id              AS author_id,
         COUNT(DISTINCT r_int.id) FILTER (WHERE r_int.type = 'interest')  AS interest_count,
         COUNT(DISTINCT r_enc.id) FILTER (WHERE r_enc.type = 'encourage') AS encourage_count,
         COUNT(DISTINCT c.id)                                              AS comment_count,
         (SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1 LIMIT 1) AS user_reacted
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r_int ON r_int.post_id = p.id AND r_int.type = 'interest'
       LEFT JOIN reactions r_enc ON r_enc.post_id = p.id AND r_enc.type = 'encourage'
       LEFT JOIN comments  c     ON c.post_id = p.id
       WHERE p.post_type = 'collab'
         AND p.moderation_status IN ('visible', 'approved')
       GROUP BY p.id, u.name, u.avatar_initials, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, Number(limit), Number(offset)]
    );
    res.json({ collabs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List pain points (community-submitted problems for others to pursue) ──────
router.get('/pain-points', async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;
  try {
    const result = await query(
      `SELECT
         p.*,
         u.name            AS author_name,
         u.avatar_initials AS author_initials,
         COUNT(DISTINCT r_enc.id) FILTER (WHERE r_enc.type = 'encourage') AS encourage_count,
         COUNT(DISTINCT r_pur.id) FILTER (WHERE r_pur.type = 'pursue')    AS pursue_count,
         COUNT(DISTINCT c.id)                                              AS comment_count,
         (SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1 LIMIT 1) AS user_reacted
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r_enc ON r_enc.post_id = p.id AND r_enc.type = 'encourage'
       LEFT JOIN reactions r_pur ON r_pur.post_id = p.id AND r_pur.type = 'pursue'
       LEFT JOIN comments  c     ON c.post_id = p.id
       WHERE p.post_type = 'pain_point'
         AND p.moderation_status IN ('visible', 'approved')
       GROUP BY p.id, u.name, u.avatar_initials
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, Number(limit), Number(offset)]
    );
    res.json({ pain_points: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// React to a post (toggle)
router.post('/posts/:id/react', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type } = req.body as { type: 'encourage' | 'ask' | 'pursue' | 'interest' };
  if (!['encourage','ask','pursue','interest'].includes(type)) { res.status(400).json({ error: 'Invalid reaction type' }); return; }
  try {
    const existing = await query(
      'SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3',
      [id, req.userId, type]
    );
    if (existing.rows.length) {
      await query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3', [id, req.userId, type]);
      res.json({ action: 'removed' });
    } else {
      await query('INSERT INTO reactions (post_id, user_id, type) VALUES ($1, $2, $3)', [id, req.userId, type]);

      // Notify post author on encourage (not on remove, not on self-react)
      if (type === 'encourage') {
        const postRes = await query<{ user_id: string; idea_id: string | null; content: string }>(
          'SELECT user_id, idea_id, content FROM community_posts WHERE id = $1', [id]
        );
        if (postRes.rows.length && postRes.rows[0].user_id !== req.userId) {
          const reactorRes = await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
          const reactorName = reactorRes.rows[0]?.name ?? 'Someone';
          const post = postRes.rows[0];
          await createNotification(
            post.user_id, 'encourage',
            `${reactorName} encouraged your post 👍`,
            post.content.slice(0, 80),
            post.idea_id ? `/community/${post.idea_id}` : null
          );
        }
      }

      res.json({ action: 'added' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
router.get('/posts/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT c.*, u.name as author_name, u.avatar_initials as author_initials
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [id]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public canvas read for community ─────────────────────────────────────────
// Returns the shape-stage BMC blocks for any idea, but ONLY once the founder
// has opted the Business Model Canvas section into public view (see the
// `publicSections` consent blob, same as /public-sections below). Used both
// by the ambient canvas-preview snippet on the idea detail page and by the
// full-canvas modal opened from it (IdeaCanvasModal in viewOnly mode) — so
// gating it here means a visitor can't bypass the toggle by opening the full
// canvas either. Read-only, no user filter — the consent check is what makes
// this safe to leave unauthenticated.
router.get('/ideas/:id/canvas', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query<{ content: string }>(
      `SELECT field_key, content
       FROM stage_entries
       WHERE idea_id = $1
         AND stage = 'idea'
         AND field_key = 'publicSections'`,
      [id]
    );
    let consent: Record<string, boolean> = {};
    try {
      const p = JSON.parse(result.rows[0]?.content || '{}');
      if (p && typeof p === 'object') consent = p;
    } catch { /* malformed consent JSON — treat as no consent */ }

    if (consent.shapeCanvas !== true) { res.json({ blocks: {} }); return; }

    const blockRows = await query(
      `SELECT field_key, content
       FROM stage_entries
       WHERE idea_id = $1
         AND stage   = 'shape'
         AND field_key LIKE 'bmc_%'
         AND field_key NOT LIKE 'bmc_snapshot_%'`,
      [id]
    );
    const blocks: Record<string, string> = {};
    blockRows.rows.forEach((r: { field_key: string; content: string }) => {
      blocks[r.field_key.replace('bmc_', '')] = r.content;
    });
    res.json({ blocks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public build summary for community ────────────────────────────────────
// Light, public-safe "what they're building" summary — problem, customer,
// MVP hypothesis, key features — for the idea detail page. Prefers the
// Ship-stage build spec (clean, structured) when one exists; falls back to
// the raw Hone/Validate/Shape fields it would have been drafted from, so
// ideas that haven't reached Ship yet still show something. Same public-read
// pattern as /ideas/:id/canvas above — no user filter, no ownership check.
router.get('/ideas/:id/summary', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT field_key, content
       FROM stage_entries
       WHERE idea_id = $1
         AND field_key IN (
           'buildSpec', 'validatedProblem', 'whoExactly', 'simplestVersion',
           'feature1','feature2','feature3','feature4','feature5',
           'feature6','feature7','feature8','feature9','feature10'
         )`,
      [id]
    );
    const raw: Record<string, string> = {};
    result.rows.forEach((r: { field_key: string; content: string }) => { raw[r.field_key] = r.content; });

    let spec: any = null;
    if (raw.buildSpec) { try { spec = JSON.parse(raw.buildSpec); } catch { spec = null; } }

    // Mirrors parseWhoDisplay in the frontend: whoExactly is stored as
    // MULTI_SEP('|||')-joined segments, each FIELD_SEP('~~')-separated —
    // take just the persona name out of each segment.
    const parseWhoExactly = (v: string | undefined) => (v || '')
      .split('|||').filter(Boolean)
      .map(seg => seg.split('~~')[0])
      .filter(t => t.trim().length > 2)
      .join(' · ');

    // The build spec (and occasionally the raw Hone-stage fields it falls
    // back to) can literally contain the placeholder text "n/a" when the AI
    // had nothing to work with — that's meant to signal "skip this", not to
    // be shown to a community visitor as if it were the founder's answer.
    // Treat it (case-insensitively, and blank/whitespace-only strings too)
    // as absent at every step of each fallback chain below.
    const isBlank = (v: string | null | undefined) => !v || !v.trim() || v.trim().toLowerCase() === 'n/a';

    const specProblem = spec?.productDefinition?.problem;
    const problem = !isBlank(specProblem) ? specProblem : (!isBlank(raw.validatedProblem) ? raw.validatedProblem : null);
    const specCustomer = spec?.productDefinition?.customer;
    const customer = !isBlank(specCustomer) ? specCustomer : (parseWhoExactly(raw.whoExactly) || null);
    const specMvpHypothesis = spec?.mvpHypothesis;
    const mvpHypothesis = !isBlank(specMvpHypothesis) ? specMvpHypothesis : (!isBlank(raw.simplestVersion) ? raw.simplestVersion : null);
    const features: string[] = ((spec?.featureList?.length ? spec.featureList : null)
      || Array.from({ length: 10 }, (_, i) => raw[`feature${i + 1}`])).filter((f: string) => !isBlank(f));

    res.json({
      problem: problem || null,
      customer: customer || null,
      mvpHypothesis: mvpHypothesis || null,
      features: features.slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public opt-in sections for community ──────────────────────────────────────
// A founder consents to sharing individual sections of the whole stage
// workflow — not just the Idea stage — via a per-idea `publicSections` field
// (frontend field_key, stage 'idea'), saved as JSON like
// { "oneLiner": true, "marketSnapshot": false, "honeSummary": true, ... }.
// This route (plus /ideas/:id/canvas above, for the Business Model Canvas
// section specifically) is the only public read path for any of it, and it
// enforces that consent server-side — a section is only ever returned when
// its flag is explicitly true, regardless of what the caller asks for. No
// consent on record defaults to private (omitted), never shown. Keep this in
// sync with PUBLIC_SECTION_DEFS in WorkPage.tsx when adding a new section.
router.get('/ideas/:id/public-sections', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT field_key, content
       FROM stage_entries
       WHERE idea_id = $1
         AND (
           (stage = 'idea' AND field_key IN ('oneLiner', 'marketSnapshot', 'publicSections'))
           OR field_key IN (
             'buildSpec', 'validatedProblem', 'whoExactly', 'simplestVersion', 'problemSentence',
             'feature1','feature2','feature3','feature4','feature5',
             'feature6','feature7','feature8','feature9','feature10'
           )
         )`,
      [id]
    );
    const rows: Record<string, string> = {};
    result.rows.forEach((r: { field_key: string; content: string }) => { rows[r.field_key] = r.content; });

    let consent: Record<string, boolean> = {};
    try {
      const p = JSON.parse(rows.publicSections || '{}');
      if (p && typeof p === 'object') consent = p;
    } catch { /* malformed consent JSON — treat as no consent */ }

    let spec: any = null;
    if (rows.buildSpec) { try { spec = JSON.parse(rows.buildSpec); } catch { spec = null; } }

    // Mirrors parseWhoDisplay in the frontend: whoExactly is stored as
    // MULTI_SEP('|||')-joined segments, each FIELD_SEP('~~')-separated —
    // take just the persona name out of each segment.
    const parseWhoExactly = (v: string | undefined) => (v || '')
      .split('|||').filter(Boolean)
      .map(seg => seg.split('~~')[0])
      .filter(t => t.trim().length > 2)
      .join(' · ');

    // The build spec (and occasionally the raw fields it falls back to) can
    // literally contain the placeholder text "n/a" when the AI had nothing
    // to work with — treat that (case-insensitively, and blank strings too)
    // as absent at every step of each fallback chain below.
    const isBlank = (v: string | null | undefined) => !v || !v.trim() || v.trim().toLowerCase() === 'n/a';

    let marketSnapshot: unknown = null;
    if (consent.marketSnapshot === true && rows.marketSnapshot) {
      try { marketSnapshot = JSON.parse(rows.marketSnapshot); } catch { marketSnapshot = null; }
    }

    let honeSummary: { problem: string | null; customer: string | null } | null = null;
    if (consent.honeSummary === true) {
      const specProblem = spec?.productDefinition?.problem;
      const problem = !isBlank(specProblem) ? specProblem
        : (!isBlank(rows.problemSentence) ? rows.problemSentence
        : (!isBlank(rows.validatedProblem) ? rows.validatedProblem : null));
      const specCustomer = spec?.productDefinition?.customer;
      const customer = !isBlank(specCustomer) ? specCustomer : (parseWhoExactly(rows.whoExactly) || null);
      if (problem || customer) honeSummary = { problem: problem || null, customer: customer || null };
    }

    let shapeSummary: { mvpHypothesis: string | null; features: string[] } | null = null;
    if (consent.shapeSummary === true) {
      const specMvpHypothesis = spec?.mvpHypothesis;
      const mvpHypothesis = !isBlank(specMvpHypothesis) ? specMvpHypothesis
        : (!isBlank(rows.simplestVersion) ? rows.simplestVersion : null);
      const features: string[] = ((spec?.featureList?.length ? spec.featureList : null)
        || Array.from({ length: 10 }, (_, i) => rows[`feature${i + 1}`])).filter((f: string) => !isBlank(f));
      if (mvpHypothesis || features.length) shapeSummary = { mvpHypothesis: mvpHypothesis || null, features: features.slice(0, 10) };
    }

    res.json({
      oneLiner: consent.oneLiner === true && !isBlank(rows.oneLiner) ? rows.oneLiner : null,
      marketSnapshot,
      honeSummary,
      shapeSummary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Submit a network offer for an idea ───────────────────────────────────────
const NetworkOfferSchema = z.object({
  contact_name:        z.string().min(1).max(100),
  contact_description: z.string().min(1).max(500),
  contact_type:        z.enum(['linkedin', 'email']),
  // LinkedIn URL is optional; email address is required for email type.
  // Validated below after parse.
  contact_value:       z.string().max(300).optional(),
  relationship:        z.string().max(200).optional(),
});

router.post('/ideas/:id/network-offers', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parse = NetworkOfferSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { contact_name, contact_description, contact_type, relationship } = parse.data;
  const contact_value = parse.data.contact_value?.trim() || null;

  // Email type requires an address
  if (contact_type === 'email' && !contact_value) {
    res.status(400).json({ error: 'Email address is required for email contacts.' });
    return;
  }

  try {
    // Get idea + owner
    const ideaRes = await query<{ id: string; user_id: string; name: string }>(
      'SELECT id, user_id, name FROM ideas WHERE id = $1', [id]
    );
    if (!ideaRes.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    const idea = ideaRes.rows[0];

    if (idea.user_id === req.userId) {
      res.status(400).json({ error: 'Cannot offer your network on your own idea' });
      return;
    }

    // Store the offer
    const offerRes = await query(
      `INSERT INTO network_offers
         (idea_id, offeror_id, contact_name, contact_description, contact_type, contact_value, relationship)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.userId, contact_name, contact_description, contact_type, contact_value, relationship || null]
    );

    // Notify idea owner via in-app notification
    const offerorRes = await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
    const offerorName = offerorRes.rows[0]?.name ?? 'Someone';
    await createNotification(
      idea.user_id, 'network_offer',
      `${offerorName} offered a network contact 🤝`,
      `${contact_name} — ${contact_description.slice(0, 80)}`,
      `/community/${id}`
    );

    // Auto-notify idea owner via existing messaging system
    const existingConv = await query<{ id: string }>(
      `SELECT id FROM conversations
       WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
         AND idea_id = $3 LIMIT 1`,
      [req.userId, idea.user_id, id]
    );

    let convId: string;
    if (existingConv.rows.length) {
      convId = existingConv.rows[0].id;
    } else {
      const created = await query<{ id: string }>(
        `INSERT INTO conversations (user1_id, user2_id, idea_id) VALUES ($1, $2, $3) RETURNING id`,
        [req.userId, idea.user_id, id]
      );
      convId = created.rows[0].id;
    }

    const channelLabel = contact_type === 'linkedin'
      ? (contact_value ? `LinkedIn: ${contact_value}` : `LinkedIn (search for "${contact_name}")`)
      : `Email: ${contact_value}`;
    const msgContent =
      `🤝 Network offer for "${idea.name}"\n\n` +
      `I'd like to connect you with ${contact_name}` +
      (relationship ? ` (${relationship})` : '') + `.\n\n` +
      `How they can help: ${contact_description}\n\n` +
      `Contact them via ${channelLabel}`;

    await query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
      [convId, req.userId, msgContent]
    );

    // If email contact, fire warm-up email in background (non-blocking)
    if (contact_type === 'email' && contact_value) {
      const offerorRes = await query<{ name: string }>(
        'SELECT name FROM users WHERE id = $1', [req.userId]
      );
      const offerorName = offerorRes.rows[0]?.name ?? 'A community member';
      sendNetworkOfferEmail({
        toEmail:       contact_value,
        toName:        contact_name,
        fromName:      offerorName,
        ideaName:      idea.name,
        howTheyCanHelp: contact_description,
        relationship,
      }).catch(err => console.error('[mailer] Failed to send warm-up email:', err));
    }

    res.status(201).json({ offer: offerRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get network offers for an idea ───────────────────────────────────────────
// Idea owner sees full list; everyone else sees only the count.
router.get('/ideas/:id/network-offers', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const ideaRes = await query<{ user_id: string }>(
      'SELECT user_id FROM ideas WHERE id = $1', [id]
    );
    if (!ideaRes.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }

    const isOwner = ideaRes.rows[0].user_id === req.userId;

    if (isOwner) {
      const result = await query(
        `SELECT no.*, u.name AS offeror_name, u.avatar_initials AS offeror_initials
         FROM network_offers no
         JOIN users u ON no.offeror_id = u.id
         WHERE no.idea_id = $1
         ORDER BY no.created_at DESC`,
        [id]
      );
      res.json({ offers: result.rows, is_owner: true });
    } else {
      const result = await query(
        'SELECT COUNT(*) AS count FROM network_offers WHERE idea_id = $1', [id]
      );
      res.json({ count: Number(result.rows[0].count), is_owner: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment
router.post('/posts/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }
  try {
    const result = await query(
      `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)
       RETURNING *, (SELECT name FROM users WHERE id = $2) as author_name,
                   (SELECT avatar_initials FROM users WHERE id = $2) as author_initials`,
      [id, req.userId, content.trim()]
    );

    // Notify post author (if not self)
    const postRes = await query<{ user_id: string; idea_id: string | null; content: string }>(
      'SELECT user_id, idea_id, content FROM community_posts WHERE id = $1', [id]
    );
    if (postRes.rows.length && postRes.rows[0].user_id !== req.userId) {
      const commenterRes = await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.userId]);
      const commenterName = commenterRes.rows[0]?.name ?? 'Someone';
      const post = postRes.rows[0];
      await createNotification(
        post.user_id, 'new_comment',
        `${commenterName} replied to your post`,
        content.trim().slice(0, 100),
        post.idea_id ? `/community/${post.idea_id}` : null
      );
    }

    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
