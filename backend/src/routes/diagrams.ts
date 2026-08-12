import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── GET /diagrams/:ideaId ─────────────────────────────────────────────────────
// Returns the diagram state for an idea. Any authenticated user can view.
router.get('/:ideaId', async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  try {
    const result = await query(
      `SELECT d.state, d.updated_by, d.updated_at,
              u.name AS updated_by_name,
              i.user_id AS owner_id
       FROM diagrams d
       LEFT JOIN users u ON u.id = d.updated_by
       JOIN ideas i ON i.id = d.idea_id
       WHERE d.idea_id = $1`,
      [ideaId]
    );

    if (!result.rows.length) {
      // No diagram yet — return empty state plus owner info
      const idea = await query('SELECT user_id FROM ideas WHERE id = $1', [ideaId]);
      if (!idea.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }
      return res.json({
        state: { items: {}, arrs: [] },
        owner_id: idea.rows[0].user_id,
        updated_by_name: null,
        updated_at: null,
      });
    }

    const row = result.rows[0];
    res.json({
      state: row.state,
      owner_id: row.owner_id,
      updated_by_name: row.updated_by_name,
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /diagrams/:ideaId ─────────────────────────────────────────────────────
// Saves diagram state. Any authenticated user can save (open collaboration).
router.put('/:ideaId', async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const { state } = req.body;
  if (!state || typeof state !== 'object') {
    res.status(400).json({ error: 'state object required' }); return;
  }
  try {
    // Verify idea exists
    const idea = await query('SELECT id FROM ideas WHERE id = $1', [ideaId]);
    if (!idea.rows.length) { res.status(404).json({ error: 'Idea not found' }); return; }

    await query(
      `INSERT INTO diagrams (idea_id, state, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (idea_id)
       DO UPDATE SET state = $2, updated_by = $3, updated_at = NOW()`,
      [ideaId, JSON.stringify(state), req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
