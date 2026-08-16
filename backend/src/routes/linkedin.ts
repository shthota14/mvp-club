/**
 * LinkedIn OAuth 2.0 (OIDC) connector
 *
 * Flow:
 *   1.  GET  /api/linkedin/init      — authenticated; returns the LinkedIn auth URL
 *   2.  Browser navigates to LinkedIn; user approves
 *   3.  LinkedIn redirects to:
 *       GET  /api/linkedin/callback  — exchanges code → token → profile → saves on user
 *   4.  Backend redirects browser to FRONTEND_URL/?linkedin=connected (or ?linkedin=error)
 *   5.  GET  /api/linkedin/status    — returns { connected, linkedin_url, linkedin_name }
 *   6.  DELETE /api/linkedin/disconnect — removes LinkedIn data from user
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   LINKEDIN_REDIRECT_URI   (e.g. http://localhost:4001/api/linkedin/callback)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import jwt from 'jsonwebtoken';

const router = Router();

const CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET ?? '';
const REDIRECT_URI  = process.env.LINKEDIN_REDIRECT_URI  ?? 'http://localhost:4001/api/linkedin/callback';
const FRONTEND_URL  = process.env.FRONTEND_URL           ?? 'http://localhost:3001';
const JWT_SECRET    = process.env.JWT_SECRET             ?? 'dev_jwt_secret_change_in_prod';

const LINKEDIN_AUTH_URL  = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USER_URL  = 'https://api.linkedin.com/v2/userinfo';

// ── In-memory state store (TTL 10 min) ──────────────────────────────────────
// Maps state → { userId, expiresAt }
// For production, replace with Redis.
const stateStore = new Map<string, { userId: string; expiresAt: number }>();

function purgeExpiredStates() {
  const now = Date.now();
  for (const [k, v] of stateStore.entries()) {
    if (v.expiresAt < now) stateStore.delete(k);
  }
}

// ── 1. Init — return the LinkedIn auth URL ────────────────────────────────────
router.get('/init', requireAuth, (req: Request, res: Response) => {
  if (!CLIENT_ID) {
    res.status(503).json({ error: 'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env.' });
    return;
  }

  purgeExpiredStates();
  const state = crypto.randomBytes(20).toString('hex');
  stateStore.set(state, { userId: req.userId!, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    state,
    scope:         'openid profile email',
  });

  res.json({ url: `${LINKEDIN_AUTH_URL}?${params}` });
});

// ── 2. Callback — LinkedIn redirects here after user approves ─────────────────
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error: liError } = req.query as Record<string, string>;

  if (liError) {
    console.error('[linkedin] callback denied/error from LinkedIn:', liError, JSON.stringify(req.query));
    res.redirect(`${FRONTEND_URL}?linkedin=denied`);
    return;
  }

  if (!code || !state) {
    console.error('[linkedin] missing params, query was:', JSON.stringify(req.query));
    res.redirect(`${FRONTEND_URL}?linkedin=error&reason=missing_params`);
    return;
  }

  purgeExpiredStates();
  const stored = stateStore.get(state);
  if (!stored || stored.expiresAt < Date.now()) {
    console.error('[linkedin] state not found or expired (backend restarted mid-flow?)');
    res.redirect(`${FRONTEND_URL}?linkedin=error&reason=expired_state`);
    return;
  }
  stateStore.delete(state);
  const userId = stored.userId;

  try {
    // Exchange code for access token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[linkedin] token exchange failed, HTTP', tokenRes.status, (await tokenRes.text()).slice(0, 400));
      res.redirect(`${FRONTEND_URL}?linkedin=error&reason=token_exchange`);
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch user profile via OIDC userinfo endpoint
    const profileRes = await fetch(LINKEDIN_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error('[linkedin] profile fetch failed, HTTP', profileRes.status, (await profileRes.text()).slice(0, 400));
      res.redirect(`${FRONTEND_URL}?linkedin=error&reason=profile_fetch`);
      return;
    }

    const profile = await profileRes.json() as {
      sub:         string;
      name?:       string;
      given_name?: string;
      family_name?: string;
      email?:      string;
      picture?:    string;
    };

    const linkedinName    = profile.name ?? [profile.given_name, profile.family_name].filter(Boolean).join(' ');
    const linkedinPicture = profile.picture ?? null;
    const linkedinUrl     = `https://www.linkedin.com/in/${profile.sub}`;

    // Check the LinkedIn ID isn't already linked to a DIFFERENT user
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE linkedin_id = $1 AND id != $2',
      [profile.sub, userId]
    );
    if (existing.rows.length) {
      res.redirect(`${FRONTEND_URL}?linkedin=error&reason=already_linked`);
      return;
    }

    // Save LinkedIn data on the user
    await query(
      `UPDATE users SET
         linkedin_id           = $1,
         linkedin_url          = $2,
         linkedin_name         = $3,
         linkedin_picture      = $4,
         linkedin_connected_at = NOW(),
         updated_at            = NOW()
       WHERE id = $5`,
      [profile.sub, linkedinUrl, linkedinName || null, linkedinPicture, userId]
    );

    // Return a fresh JWT so the frontend can read the updated user
    const freshUser = await query(
      `SELECT id, email, name, current_stage, community_opt, help_types,
              avatar_initials, is_admin, linkedin_id, linkedin_url, linkedin_name, linkedin_picture
       FROM users WHERE id = $1`,
      [userId]
    );

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    res.redirect(`${FRONTEND_URL}?linkedin=connected&token=${token}`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err);
    res.redirect(`${FRONTEND_URL}?linkedin=error&reason=server`);
  }
});

// ── 3. Status — is LinkedIn connected for the current user? ──────────────────
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{
      linkedin_id: string | null;
      linkedin_url: string | null;
      linkedin_name: string | null;
      linkedin_picture: string | null;
      linkedin_connected_at: string | null;
    }>(
      'SELECT linkedin_id, linkedin_url, linkedin_name, linkedin_picture, linkedin_connected_at FROM users WHERE id = $1',
      [req.userId]
    );
    const u = result.rows[0];
    res.json({
      connected:            !!u?.linkedin_id,
      linkedin_url:         u?.linkedin_url         ?? null,
      linkedin_name:        u?.linkedin_name        ?? null,
      linkedin_picture:     u?.linkedin_picture     ?? null,
      linkedin_connected_at: u?.linkedin_connected_at ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── 4. Disconnect ─────────────────────────────────────────────────────────────
router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await query(
      `UPDATE users SET
         linkedin_id = NULL, linkedin_url = NULL,
         linkedin_name = NULL, linkedin_picture = NULL,
         linkedin_connected_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
