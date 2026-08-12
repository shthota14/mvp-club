import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── List advisors (optionally filtered by stage) ──────────────────────────────
router.get('/advisors', async (req: Request, res: Response) => {
  const { stage } = req.query;
  try {
    const params: unknown[] = [];
    let where = 'WHERE a.is_active = TRUE';
    if (stage) {
      params.push(stage);
      where += ` AND $${params.length} = ANY(a.stages)`;
    }
    const result = await query(
      `SELECT id, name, role, bio, avatar_initials, stages, expertise, linkedin_url, email
       FROM advisors a
       ${where}
       ORDER BY a.created_at ASC`,
      params
    );
    res.json({ advisors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List my personal contacts ─────────────────────────────────────────────────
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, contact_type, contact_value, notes, created_at
       FROM network_contacts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  contact_type: z.enum(['linkedin', 'email']),
  contact_value: z.string().min(1).max(300),
  notes: z.string().max(500).optional(),
});

// ── Add a personal contact ────────────────────────────────────────────────────
router.post('/contacts', async (req: Request, res: Response) => {
  const parse = ContactSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { name, contact_type, contact_value, notes } = parse.data;
  try {
    const result = await query(
      `INSERT INTO network_contacts (user_id, name, contact_type, contact_value, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, contact_type, contact_value, notes, created_at`,
      [req.userId, name, contact_type, contact_value, notes || null]
    );
    res.status(201).json({ contact: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Delete a personal contact ─────────────────────────────────────────────────
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM network_contacts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const HelpRequestSchema = z.object({
  advisor_id: z.string().uuid().optional(),
  network_contact_id: z.string().uuid().optional(),
  stage: z.enum(['idea', 'hone', 'validate', 'shape', 'done']),
  problem: z.string().min(1).max(1000),
  specific_ask: z.string().min(1).max(500),
  channel: z.enum(['linkedin', 'email']),
}).refine(d => d.advisor_id || d.network_contact_id, {
  message: 'Either advisor_id or network_contact_id is required',
});

// ── Send a help request ───────────────────────────────────────────────────────
router.post('/requests', async (req: Request, res: Response) => {
  const parse = HelpRequestSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { advisor_id, network_contact_id, stage, problem, specific_ask, channel } = parse.data;
  try {
    const result = await query(
      `INSERT INTO help_requests
         (user_id, advisor_id, network_contact_id, stage, problem, specific_ask, channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.userId,
        advisor_id || null,
        network_contact_id || null,
        stage,
        problem,
        specific_ask,
        channel,
      ]
    );
    res.status(201).json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List my sent help requests ────────────────────────────────────────────────
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
         hr.*,
         a.name  AS advisor_name,
         nc.name AS contact_name
       FROM help_requests hr
       LEFT JOIN advisors         a  ON hr.advisor_id         = a.id
       LEFT JOIN network_contacts nc ON hr.network_contact_id = nc.id
       WHERE hr.user_id = $1
       ORDER BY hr.created_at DESC`,
      [req.userId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
