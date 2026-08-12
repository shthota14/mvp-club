import axios from 'axios';
import { query } from '../db';

// ── Zoom per-user OAuth (each idea originator hosts their own meetings) ─────
// Tokens live on the users row (see backend/src/db/migrations/add-zoom-oauth.sql
// and backend/src/routes/zoom.ts, which handles the connect/disconnect flow).
// This is intentionally separate from the Server-to-Server flow below, which
// always creates meetings under one fixed account -- Zoom has no "on behalf of
// a user" mode for Server-to-Server apps.
async function getUserZoomAccessToken(userId: string): Promise<string | null> {
  const res = await query<{
    zoom_access_token: string | null;
    zoom_refresh_token: string | null;
    zoom_token_expires_at: string | null;
  }>('SELECT zoom_access_token, zoom_refresh_token, zoom_token_expires_at FROM users WHERE id = $1', [userId]);
  const u = res.rows[0];
  if (!u?.zoom_access_token || !u.zoom_refresh_token) return null;

  const expiresAt = u.zoom_token_expires_at ? new Date(u.zoom_token_expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return u.zoom_access_token;

  // Access tokens are short-lived (~1hr); refresh tokens rotate on every use,
  // so the rotated pair must be re-saved each time this fires.
  const { ZOOM_OAUTH_CLIENT_ID, ZOOM_OAUTH_CLIENT_SECRET } = process.env;
  const creds = Buffer.from(`${ZOOM_OAUTH_CLIENT_ID}:${ZOOM_OAUTH_CLIENT_SECRET}`).toString('base64');
  const refreshRes = await axios.post(
    `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(u.zoom_refresh_token)}`,
    null,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  const { access_token, refresh_token, expires_in } = refreshRes.data;
  await query(
    `UPDATE users SET zoom_access_token = $1, zoom_refresh_token = $2,
       zoom_token_expires_at = NOW() + ($3 || ' seconds')::interval, updated_at = NOW() WHERE id = $4`,
    [access_token, refresh_token, String(expires_in ?? 3600), userId]
  );
  return access_token;
}

// Creates a Zoom meeting hosted by -- and under the Zoom account of --
// `userId` (the idea originator), rather than the shared Server-to-Server
// account below. Returns null if that user hasn't connected their own Zoom
// account yet, so callers can fall back to the shared-account flow.
export async function createZoomMeetingForUser(userId: string, params: {
  topic: string;
  startTime: string;   // ISO
  durationMins: number;
  timezone: string;
}): Promise<{ joinUrl: string; meetingId: string; password: string } | null> {
  const token = await getUserZoomAccessToken(userId);
  if (!token) return null;
  const res = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic: params.topic,
      type: 2,   // scheduled
      start_time: params.startTime,
      duration: params.durationMins,
      timezone: params.timezone,
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: 'none',
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    joinUrl:   res.data.join_url,
    meetingId: String(res.data.id),
    password:  res.data.password ?? '',
  };
}

// ── Zoom Server-to-Server OAuth (shared fallback account) ───────────────────
let zoomToken: { value: string; expiresAt: number } | null = null;

async function getZoomToken(): Promise<string> {
  const now = Date.now();
  if (zoomToken && now < zoomToken.expiresAt - 30_000) return zoomToken.value;

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const creds = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    null,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  zoomToken = { value: res.data.access_token, expiresAt: now + res.data.expires_in * 1000 };
  return zoomToken.value;
}

export async function createZoomMeeting(params: {
  topic: string;
  startTime: string;   // ISO
  durationMins: number;
  timezone: string;
}): Promise<{ joinUrl: string; meetingId: string; password: string }> {
  const token = await getZoomToken();
  const res = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic: params.topic,
      type: 2,   // scheduled
      start_time: params.startTime,
      duration: params.durationMins,
      timezone: params.timezone,
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: 'none',
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    joinUrl:   res.data.join_url,
    meetingId: String(res.data.id),
    password:  res.data.password ?? '',
  };
}

export function zoomConfigured() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  return !!(ZOOM_ACCOUNT_ID && ZOOM_CLIENT_ID && ZOOM_CLIENT_SECRET);
}

// ── Microsoft Teams (Graph API, app-only) ────────────────────────────────────
let teamsToken: { value: string; expiresAt: number } | null = null;

async function getTeamsToken(): Promise<string> {
  const now = Date.now();
  if (teamsToken && now < teamsToken.expiresAt - 30_000) return teamsToken.value;

  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  const params = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     MS_CLIENT_ID!,
    client_secret: MS_CLIENT_SECRET!,
    scope:         'https://graph.microsoft.com/.default',
  });

  const res = await axios.post(
    `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  teamsToken = { value: res.data.access_token, expiresAt: now + res.data.expires_in * 1000 };
  return teamsToken.value;
}

export async function createTeamsMeeting(params: {
  subject: string;
  startTime: string;   // ISO
  endTime: string;     // ISO
  organizerEmail: string;
}): Promise<{ joinUrl: string; meetingId: string }> {
  const token = await getTeamsToken();

  // Create online meeting on behalf of organiser using /users/{email}/onlineMeetings
  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${params.organizerEmail}/onlineMeetings`,
    {
      subject: params.subject,
      startDateTime: params.startTime,
      endDateTime: params.endTime,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return {
    joinUrl:   res.data.joinWebUrl,
    meetingId: res.data.id,
  };
}

export function teamsConfigured() {
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  return !!(MS_TENANT_ID && MS_CLIENT_ID && MS_CLIENT_SECRET);
}
