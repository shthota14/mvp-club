import express, { Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// POST /api/surveys — create (auth)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { idea_id, title, description, questions } = req.body;
  if (!idea_id || !title || !questions?.length) {
    return res.status(400).json({ error: 'idea_id, title, and questions required' });
  }
  try {
    const token = crypto.randomBytes(8).toString('hex');
    const result = await query(
      `INSERT INTO surveys (idea_id, user_id, token, title, description, questions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [idea_id, req.userId, token, title, description || null, JSON.stringify(questions)]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[surveys] POST /:', err.message);
    if (err.message?.includes('relation "surveys" does not exist')) {
      return res.status(503).json({ error: 'Surveys table not set up yet. Run: docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-surveys.sql' });
    }
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// GET /api/surveys?idea_id= — fetch surveys for an idea (auth)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { idea_id } = req.query;
  if (!idea_id) return res.status(400).json({ error: 'idea_id required' });
  try {
    const result = await query(
      `SELECT id, token, title, description, questions, created_at FROM surveys
       WHERE idea_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [idea_id, req.userId]
    );
    res.json({ survey: result.rows[0] ?? null });
  } catch (err: any) {
    console.error('[surveys] GET /?idea_id:', err.message);
    res.status(500).json({ error: 'Failed to load survey' });
  }
});

// GET /api/surveys/:token — public
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, token, title, description, questions, idea_id FROM surveys WHERE token = $1`,
      [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Survey not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[surveys] GET /:token:', err.message);
    res.status(500).json({ error: 'Could not load survey' });
  }
});

// POST /api/surveys/:token/responses — public
router.post('/:token/responses', async (req: Request, res: Response) => {
  const { respondent_name, respondent_email, answers, alignment } = req.body;
  try {
    const survey = await query(`SELECT id FROM surveys WHERE token = $1`, [req.params.token]);
    if (!survey.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const result = await query(
      `INSERT INTO survey_responses (survey_id, respondent_name, respondent_email, answers, alignment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [survey.rows[0].id, respondent_name || null, respondent_email || null, JSON.stringify(answers), alignment || null]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[surveys] POST /:token/responses:', err.message);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// GET /api/surveys/:token/results — auth
router.get('/:token/results', requireAuth, async (req: Request, res: Response) => {
  try {
    const survey = await query(
      `SELECT * FROM surveys WHERE token = $1 AND user_id = $2`,
      [req.params.token, req.userId]
    );
    if (!survey.rows.length) return res.status(404).json({ error: 'Not found' });
    const responses = await query(
      `SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY created_at DESC`,
      [survey.rows[0].id]
    );
    const rows = responses.rows;
    const stats = {
      total: rows.length,
      confirmed: rows.filter((r: any) => r.alignment === 'confirmed').length,
      partial: rows.filter((r: any) => r.alignment === 'partial').length,
      not_confirmed: rows.filter((r: any) => r.alignment === 'not_confirmed').length,
    };
    res.json({ survey: survey.rows[0], responses: rows, stats });
  } catch (err: any) {
    console.error('[surveys] GET /:token/results:', err.message);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// PATCH /api/surveys/responses/:id — update alignment verdict (auth)
router.patch('/responses/:id', requireAuth, async (req: Request, res: Response) => {
  const { alignment } = req.body;
  if (!alignment) return res.status(400).json({ error: 'alignment required' });
  try {
    // Verify ownership via survey join
    const result = await query(
      `UPDATE survey_responses sr
       SET alignment = $1
       FROM surveys s
       WHERE sr.id = $2 AND sr.survey_id = s.id AND s.user_id = $3
       RETURNING sr.*`,
      [alignment, req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[surveys] PATCH /responses/:id:', err.message);
    res.status(500).json({ error: 'Failed to update alignment' });
  }
});

export default router;
