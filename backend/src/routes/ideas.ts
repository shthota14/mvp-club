import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const BUSINESS_DOMAINS = ['fintech','healthtech','edtech','cleantech','proptech','devtools','marketplace','b2b-saas','consumer','legaltech','foodtech','hr-tech','logistics','media','agritech'] as const;

const IdeaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  stage: z.enum(['idea','hone','validate','shape','done']).optional(),
  business_domain: z.enum(BUSINESS_DOMAINS).optional(),
  idea_status: z.enum(['active','done','archived']).optional(),
});

// List all ideas for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM ideas WHERE user_id = $1 ORDER BY is_active DESC, created_at ASC',
      [req.userId]
    );
    res.json({ ideas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create idea
router.post('/', async (req: Request, res: Response) => {
  const parse = IdeaSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { name, description, stage, business_domain } = parse.data;
  try {
    // Deactivate others
    await query('UPDATE ideas SET is_active = FALSE WHERE user_id = $1', [req.userId]);
    const result = await query(
      `INSERT INTO ideas (user_id, name, description, stage, business_domain, idea_status, is_active, moderation_status)
       VALUES ($1, $2, $3, $4, $5, 'active', TRUE, 'pending') RETURNING *`,
      [req.userId, name, description || '', stage || 'idea', business_domain || null]
    );
    res.status(201).json({ idea: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update idea
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, stage, is_active, idea_status, business_domain } = req.body;
  // Loose validation to match this route's existing style (no full zod parse
  // here, unlike POST /) — just make sure an out-of-list value can't sneak
  // into the domain column and break every DOMAIN_LABELS lookup on the
  // frontend (Community / My Idea Vault / Market Snapshot all key off this
  // exact enum).
  const resolvedDomain = typeof business_domain === 'string' && (BUSINESS_DOMAINS as readonly string[]).includes(business_domain)
    ? business_domain
    : undefined;
  try {
    if (is_active) {
      await query('UPDATE ideas SET is_active = FALSE WHERE user_id = $1', [req.userId]);
    }
    // When reactivating from done/archived, also set idea_status back to active
    const resolvedStatus = idea_status ?? (is_active ? 'active' : undefined);
    const result = await query(
      `UPDATE ideas SET
        name            = COALESCE($1, name),
        description     = COALESCE($2, description),
        stage           = COALESCE($3, stage),
        is_active       = COALESCE($4, is_active),
        idea_status     = COALESCE($5, idea_status),
        business_domain = COALESCE($6, business_domain),
        updated_at      = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name, description, stage, is_active, resolvedStatus, resolvedDomain, id, req.userId]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
    res.json({ idea: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stage entries for an idea
router.get('/:id/entries', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage } = req.query;
  try {
    const result = await query(
      `SELECT * FROM stage_entries WHERE idea_id = $1 AND user_id = $2 ${stage ? 'AND stage = $3' : ''} ORDER BY created_at ASC`,
      stage ? [id, req.userId, stage] : [id, req.userId]
    );
    res.json({ entries: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upsert a stage entry
router.put('/:id/entries', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage, field_key, content } = req.body;
  if (!stage || !field_key) { res.status(400).json({ error: 'stage and field_key required' }); return; }
  try {
    const result = await query(
      `INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (idea_id, stage, field_key)
       DO UPDATE SET content = $5, updated_at = NOW() RETURNING *`,
      [req.userId, id, stage, field_key, content]
    );
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
