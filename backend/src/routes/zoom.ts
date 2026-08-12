/**
 * Zoom OAuth 2.0 connector (per-user)
 *
 * Lets each idea originator connect their own (free) Zoom account so their
 * interview meetings are created under -- and hosted by -- them, instead of
 * always going through a single shared account. See backend/src/utils/meeting.ts
 * for the Server-to-Server "shared account" flow this still falls back to for
 * organizers who haven't connected their own Zoom.
 *
 * Flow (mirrors backend/src/routes/linkedin.ts):
 *   1.  GET  /api/zoom/init      -- authenticated; returns the Zoom auth URL
 *   2.  Browser navigates to Zoom; user approves
 *   3.  Zoom redirects to:
 *       GET  /api/zoom/callback  -- exchanges code -> tokens -> profile -> saves on user
 *   4.  Backend redirects browser to FRONTEND_URL/?zoom=connected (or ?zoom=error)
 *   5.  GET  /api/zoom/status    -- returns { connected, zoom_email, zoom_connected_at }
 *   6.  DELETE /api/zoom/disconnect -- revokes + removes Zoom tokens from the user
 *
 * Required env vars:
 *   ZOOM_OAUTH_CLIENT_ID
 *   ZOOM_OAUTH_CLIENT_SECRET
 *   ZOOM_OAUTH_REDIRECT_URI   (e.g. http://localhost:4001/api/zoom/callback)
 *
 * This is a *separate* Zoom app registration from ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/
 * ZOOM_CLIENT_SECRET in meeting.ts (a Server-to-Server app, which always
 * authenticates as one fixed account -- it has no concept of "on behalf of a
 * user"). Zoom requires a separate User-managed OAuth app for this "each user
 * is their own host" flow; create one at marketplace.zoom.us/develop/create,
 * add the Meeting scope (meeting:write, or its granular equivalent
 * meeting:write:meeting depending on your app's scope model) plus a way to
 * read the connecting user's profile (user:read or user:read:user), and set
 * its redirect URL to match ZOOM_OAUTH_REDIRECT_URI exactly.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import jwt from 'jsonwebtoken';

const router = Router();

const CLIENT_ID     = process.env.ZOOM_OAUTH_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.ZOOM_OAUTH_CLIENT_SECRET ?? '';
const REDIRECT_URI  = process.env.ZOOM_OAUTH_REDIRECT_URI  ?? 'http://localhost:4001/api/zoom/callback';
const FRONTEND_URL  = process.env.FRONTEND_URL             ?? 'http://localhost:3001';
const JWT_SECRET    = process.env.JWT_SECRET                ?? 'dev_jwt_secret_change_in_prod';

const ZOOM_AUTH_URL   = 'https://zoom.us/oauth/authorize';
const ZOOM_TOKEN_URL  = 'https://zoom.us/oauth/token';
const ZOOM_REVOKE_URL = 'https://zoom.us/oauth/revoke';
const ZOOM_USER_URL   = 'https://api.zoom.us/v2/users/me';

function authHeader() {
  return `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
}

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

// ── 1. Init — return the Zoom auth URL ────────────────────────────────────────
router.get('/init', requireAuth, (req: Request, res: Response) => {
  if (!CLIENT_ID) {
    res.status(503).json({ error: 'Zoom OAuth is not configured. Set ZOOM_OAUTH_CLIENT_ID and ZOOM_OAUTH_CLIENT_SECRET in .env.' });
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
  });

  res.json({ url: `${ZOOM_AUTH_URL}?${params}` });
});

// ── 2. Callback — Zoom redirects here after user approves ─────────────────────
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error: zoomError } = req.query as Record<string, string>;

  if (zoomError) {
    res.redirect(`${FRONTEND_URL}?zoom=denied`);
    return;
  }
  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}?zoom=error&reason=missing_params`);
    return;
  }

  purgeExpiredStates();
  const stored = stateStore.get(state);
  if (!stored || stored.expiresAt < Date.now()) {
    res.redirect(`${FRONTEND_URL}?zoom=error&reason=expired_state`);
    return;
  }
  stateStore.delete(state);
  const userId = stored.userId;

  try {
    const tokenRes = await axios.post(
      `${ZOOM_TOKEN_URL}?grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      null,
      { headers: { Authorization: authHeader() } }
    ).catch(err => {
      console.error('Zoom token exchange failed:', err?.response?.data || err.message);
      throw new Error('token_exchange');
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data as {
      access_token: string; refresh_token: string; expires_in: number;
    };

    const profileRes = await axios.get(ZOOM_USER_URL, { headers: { Authorization: `Bearer ${access_token}` } })
      .catch(err => {
        console.error('Zoom profile fetch failed:', err?.response?.data || err.message);
        throw new Error('profile_fetch');
      });
    const profile = profileRes.data as { id: string; email: string };

    // Check this Zoom account isn't already linked to a DIFFERENT user.
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE zoom_user_id = $1 AND id != $2',
      [profile.id, userId]
    );
    if (existing.rows.length) {
      res.redirect(`${FRONTEND_URL}?zoom=error&reason=already_linked`);
      return;
    }

    await query(
      `UPDATE users SET
         zoom_user_id           = $1,
         zoom_email             = $2,
         zoom_access_token      = $3,
         zoom_refresh_token     = $4,
         zoom_token_expires_at  = NOW() + ($5 || ' seconds')::interval,
         zoom_connected_at      = NOW(),
         updated_at             = NOW()
       WHERE id = $6`,
      [profile.id, profile.email, access_token, refresh_token, String(expires_in ?? 3600), userId]
    );

    // Return a fresh JWT so the frontend can read the updated user (this
    // callback is reached via a plain browser redirect, not an authenticated
    // API call, so it has no other way to hand the session back).
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    res.redirect(`${FRONTEND_URL}?zoom=connected&token=${token}`);
  } catch (err: any) {
    console.error('Zoom OAuth error:', err?.message || err);
    res.redirect(`${FRONTEND_URL}?zoom=error&reason=server`);
  }
});

// ── 3. Status — is Zoom connected for the current user? ───────────────────────
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{
      zoom_user_id: string | null;
      zoom_email: string | null;
      zoom_connected_at: string | null;
    }>(
      'SELECT zoom_user_id, zoom_email, zoom_connected_at FROM users WHERE id = $1',
      [req.userId]
    );
    const u = result.rows[0];
    res.json({
      connected:         !!u?.zoom_user_id,
      zoom_email:        u?.zoom_email        ?? null,
      zoom_connected_at: u?.zoom_connected_at ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── 4. Disconnect ──────────────────────────────────────────────────────────────
router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{ zoom_access_token: string | null }>(
      'SELECT zoom_access_token FROM users WHERE id = $1',
      [req.userId]
    );
    const accessToken = result.rows[0]?.zoom_access_token;
    if (accessToken && CLIENT_ID) {
      await axios.post(
        `${ZOOM_REVOKE_URL}?token=${encodeURIComponent(accessToken)}`,
        null,
        { headers: { Authorization: authHeader() } }
      ).catch(() => { /* best-effort -- still clear our copy of the tokens below either way */ });
    }
    await query(
      `UPDATE users SET
         zoom_user_id = NULL, zoom_email = NULL,
         zoom_access_token = NULL, zoom_refresh_token = NULL,
         zoom_token_expires_at = NULL, zoom_connected_at = NULL,
         updated_at = NOW()
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
