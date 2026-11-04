/**
 * Grafter mailbox connection -- Google OAuth 2.0 (GRF-21)
 *
 * Mirrors routes/linkedin.ts's flow exactly, swapped to Google's endpoints
 * and the gmail.send scope instead of login-only openid/profile:
 *
 *   1.  GET  /api/grafter/mailbox/init      -- authenticated; returns the Google auth URL
 *   2.  Browser navigates to Google; founder approves
 *   3.  Google redirects to:
 *       GET  /api/grafter/mailbox/callback  -- exchanges code -> tokens -> saves on user
 *   4.  Backend redirects browser to FRONTEND_URL/grafter?mailbox=connected (or =error)
 *   5.  GET  /api/grafter/mailbox/status    -- { connected, email }
 *   6.  DELETE /api/grafter/mailbox/disconnect
 *
 * access_type=offline + prompt=consent is required every time, not just on
 * first connect -- Google only issues a refresh_token when consent is
 * freshly granted, and outreach sending is worthless without one.
 *
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_MAILBOX_REDIRECT_URI
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { GMAIL_METADATA_SCOPE } from '../grafter/gmail';

const router = Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const REDIRECT_URI = process.env.GOOGLE_MAILBOX_REDIRECT_URI ?? 'http://localhost:4001/api/grafter/mailbox/callback';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';


// -- In-memory state store (TTL 10 min), same approach as linkedin.ts's --
const stateStore = new Map<string, { userId: string; expiresAt: number }>();
function purgeExpiredStates() {
  const now = Date.now();
  for (const [k, v] of stateStore.entries()) {
    if (v.expiresAt < now) stateStore.delete(k);
  }
}

router.get('/init', requireAuth, (req: Request, res: Response) => {
  if (!CLIENT_ID) {
    res.status(503).json({ error: 'Gmail connection is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.' });
    return;
  }

  purgeExpiredStates();
  const state = crypto.randomBytes(20).toString('hex');
  stateStore.set(state, { userId: req.userId!, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: `openid email ${GMAIL_SEND_SCOPE} ${GMAIL_METADATA_SCOPE}`,
    access_type: 'offline',
    prompt: 'consent',
  });

  res.json({ url: `${GOOGLE_AUTH_URL}?${params}` });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error: googleError } = req.query as Record<string, string>;

  if (googleError) {
    console.error('[grafter/mailbox] callback denied/error from Google:', googleError);
    res.redirect(`${FRONTEND_URL}/grafter?mailbox=denied`);
    return;
  }
  if (!code || !state) {
    console.error('[grafter/mailbox] missing params, query was:', JSON.stringify(req.query));
    res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=missing_params`);
    return;
  }

  purgeExpiredStates();
  const stored = stateStore.get(state);
  if (!stored || stored.expiresAt < Date.now()) {
    console.error('[grafter/mailbox] state not found or expired (backend restarted mid-flow?)');
    res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=expired_state`);
    return;
  }
  stateStore.delete(state);
  const userId = stored.userId;

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[grafter/mailbox] token exchange failed, HTTP', tokenRes.status, (await tokenRes.text()).slice(0, 400));
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=token_exchange`);
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
    if (!tokenData.refresh_token) {
      // Google withholds this if consent wasn't freshly granted -- shouldn't
      // happen given prompt=consent above, but sending is impossible without it.
      console.error('[grafter/mailbox] no refresh_token in response -- consent not freshly granted');
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=no_refresh_token`);
      return;
    }

    // Google's token response says what was ACTUALLY granted, which can be
    // a subset of what /init requested if the app's OAuth consent screen
    // doesn't have gmail.send attached yet -- Google grants the rest
    // silently rather than erroring here, so without this check we'd save
    // a token that looks connected but fails at send time with a much
    // less obvious 403. Fail loudly now instead.
    const grantedScopes = (tokenData.scope ?? '').split(/\s+/).filter(Boolean);
    if (!grantedScopes.includes(GMAIL_SEND_SCOPE)) {
      console.error('[grafter/mailbox] gmail.send not in granted scopes:', tokenData.scope || '(empty)');
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=send_scope_not_granted`);
      return;
    }
    // Same failure mode for the read scope reply detection needs. Without
    // it sending would work but replies would silently never be noticed.
    if (!grantedScopes.includes(GMAIL_METADATA_SCOPE)) {
      console.error('[grafter/mailbox] gmail.metadata not in granted scopes:', tokenData.scope || '(empty)');
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=read_scope_not_granted`);
      return;
    }

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      console.error('[grafter/mailbox] profile fetch failed, HTTP', profileRes.status);
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=profile_fetch`);
      return;
    }
    const profile = await profileRes.json() as { email?: string };
    if (!profile.email) {
      res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=no_email`);
      return;
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    await query(
      `UPDATE users SET
         gmail_email = $1, gmail_access_token = $2, gmail_refresh_token = $3,
         gmail_token_expires_at = $4, gmail_scopes = $5, gmail_connected_at = NOW(), updated_at = NOW()
       WHERE id = $6`,
      [profile.email, tokenData.access_token, tokenData.refresh_token, expiresAt.toISOString(), grantedScopes.join(' '), userId]
    );

    res.redirect(`${FRONTEND_URL}/grafter?mailbox=connected`);
  } catch (err) {
    console.error('[grafter/mailbox] OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/grafter?mailbox=error&reason=server`);
  }
});

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{ gmail_email: string | null; gmail_connected_at: string | null; gmail_scopes: string | null }>(
      'SELECT gmail_email, gmail_connected_at, gmail_scopes FROM users WHERE id = $1',
      [req.userId]
    );
    const u = result.rows[0];
    const scopes = (u?.gmail_scopes ?? '').split(/\s+/);
    res.json({
      connected: !!u?.gmail_email,
      email: u?.gmail_email ?? null,
      connectedAt: u?.gmail_connected_at ?? null,
      // false for mailboxes connected before GRF-27 -- UI asks them to reconnect
      canDetectReplies: !!u?.gmail_email && scopes.includes(GMAIL_METADATA_SCOPE),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await query(
      `UPDATE users SET
         gmail_email = NULL, gmail_access_token = NULL, gmail_refresh_token = NULL,
         gmail_token_expires_at = NULL, gmail_scopes = NULL, gmail_connected_at = NULL, updated_at = NOW()
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
