import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth, signToken } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/mailer';
import type { Stage } from '../types';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6),
  ideaName: z.string().optional(),
  ideaDescription: z.string().optional(),
  currentStage: z.enum(['idea','hone','validate','shape','done']).default('idea'),
  communityOpt: z.boolean().default(false),
  helpTypes: z.array(z.string()).default([]),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { email, name, password, ideaName, ideaDescription, currentStage, communityOpt, helpTypes } = parse.data;

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    const userResult = await query<{ id: string }>(
      `INSERT INTO users (email, name, password_hash, current_stage, community_opt, help_types, avatar_initials)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [email, name, password_hash, currentStage as Stage, communityOpt, helpTypes, initials]
    );

    const userId = userResult.rows[0].id;

    // Create first idea if provided
    if (ideaName || ideaDescription) {
      const ideaResult = await query<{ id: string }>(
        `INSERT INTO ideas (user_id, name, description, stage, is_active)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
        [userId, ideaName || 'My First Idea', ideaDescription || '', currentStage]
      );

      // Seed the idea description as a stage entry
      if (ideaDescription) {
        await query(
          `INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
           VALUES ($1, $2, 'idea', 'description', $3)`,
          [userId, ideaResult.rows[0].id, ideaDescription]
        );
      }
    }

    const token = signToken(userId, email);
    res.status(201).json({ token, user: { id: userId, email, name, current_stage: currentStage, community_opt: communityOpt, help_types: helpTypes, avatar_initials: initials } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { email, password } = parse.data;

  try {
    const result = await query<{ id: string; name: string; password_hash: string; current_stage: string; community_opt: boolean; help_types: string[]; avatar_initials: string; is_admin: boolean }>(
      'SELECT id, name, password_hash, current_stage, community_opt, help_types, avatar_initials, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, email);
    res.json({ token, user: { id: user.id, email, name: user.name, current_stage: user.current_stage, community_opt: user.community_opt, help_types: user.help_types, avatar_initials: user.avatar_initials, is_admin: user.is_admin } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{ id: string; email: string; name: string; current_stage: string; community_opt: boolean; help_types: string[]; avatar_initials: string; is_admin: boolean; email_notifications: boolean }>(
      `SELECT id, email, name, current_stage, community_opt, help_types, avatar_initials, is_admin,
              COALESCE(email_notifications, TRUE) AS email_notifications
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const { name, current_stage, email_notifications } = req.body;
  try {
    const initials = name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : undefined;
    await query(
      `UPDATE users SET
        name                 = COALESCE($1, name),
        current_stage        = COALESCE($2, current_stage),
        avatar_initials      = COALESCE($3, avatar_initials),
        email_notifications  = COALESCE($4, email_notifications),
        updated_at           = NOW()
       WHERE id = $5`,
      [name, current_stage, initials, email_notifications ?? null, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Forgot password ───────────────────────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email required' }); return; }

  try {
    const result = await query<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE email = $1', [email]
    );

    // Always return 200 — don't reveal whether the email exists
    if (!result.rows.length) {
      res.json({ ok: true }); return;
    }

    const { id, name } = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, id]
    );

    const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({ toEmail: email, toName: name, resetLink });

    res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    res.status(400).json({ error: 'Valid token and password (min 6 chars) required' }); return;
  }

  try {
    const result = await query<{ id: string; email: string; reset_token_expires: Date }>(
      'SELECT id, email, reset_token_expires FROM users WHERE reset_token = $1',
      [token]
    );

    if (!result.rows.length) {
      res.status(400).json({ error: 'Invalid or expired reset link.' }); return;
    }

    const user = result.rows[0];
    if (new Date() > new Date(user.reset_token_expires)) {
      res.status(400).json({ error: 'This reset link has expired. Please request a new one.' }); return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [password_hash, user.id]
    );

    const jwtToken = signToken(user.id, user.email);
    res.json({ ok: true, token: jwtToken });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
