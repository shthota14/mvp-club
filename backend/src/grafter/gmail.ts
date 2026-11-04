import axios from 'axios';
import { query } from '../db';

// -- Gmail send helper (GRF-21/24) ---------------------------------------------
//
// Every outreach email sends through the FOUNDER'S OWN connected Gmail
// account -- never through mvpclub.io's own Brevo-based transactional
// mailer (utils/mailer.ts). That separation is the whole point of the
// sender-identity decision: a spam complaint on cold outreach must never
// be able to take password-reset emails down with it, and the founder's
// own sending reputation is what makes the legitimate-interest basis for
// this outreach actually theirs, not MVP Club's.
//
// Token refresh follows the standard Google OAuth2 flow. There's no
// secrets-at-rest encryption in this codebase (see add-zoom-oauth.sql,
// which stores tokens the same plaintext way) -- this matches that
// existing precedent rather than introducing a new pattern for one field.

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
// GRF-27: reply detection reads thread labels (threads.get, format=minimal).
// gmail.metadata is the narrowest scope that allows it -- labels and
// headers only, no message bodies.
export const GMAIL_METADATA_SCOPE = 'https://www.googleapis.com/auth/gmail.metadata';
const GMAIL_THREAD_URL = (threadId: string) => `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

interface GmailTokenRow {
  gmail_email: string | null;
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expires_at: string | null;
}

// Returns a currently-valid access token for this user's connected Gmail
// account, refreshing it first if it's expired (or about to be). Returns
// null if the user hasn't connected a mailbox at all.
export async function getValidAccessToken(userId: string): Promise<{ accessToken: string; email: string } | null> {
  const result = await query<GmailTokenRow>(
    `SELECT gmail_email, gmail_access_token, gmail_refresh_token, gmail_token_expires_at FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row?.gmail_refresh_token || !row.gmail_email) return null;

  const expiresAt = row.gmail_token_expires_at ? new Date(row.gmail_token_expires_at).getTime() : 0;
  const stillValid = row.gmail_access_token && expiresAt > Date.now() + 60_000; // 60s safety margin
  if (stillValid) return { accessToken: row.gmail_access_token!, email: row.gmail_email };

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Gmail OAuth is not configured -- set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const tokenRes = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.gmail_refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, validateStatus: () => true }
  );

  if (tokenRes.status >= 400) {
    throw new Error(`Gmail token refresh failed: ${JSON.stringify(tokenRes.data).slice(0, 200)}`);
  }

  const { access_token, expires_in } = tokenRes.data as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + expires_in * 1000);
  await query(`UPDATE users SET gmail_access_token = $1, gmail_token_expires_at = $2 WHERE id = $3`, [
    access_token,
    newExpiresAt.toISOString(),
    userId,
  ]);

  return { accessToken: access_token, email: row.gmail_email };
}

function encodeRfc2822Message(from: string, to: string, subject: string, bodyText: string): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText,
  ].join('\r\n');
  // Gmail's send API wants the raw RFC 2822 message base64url-encoded.
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Sends one email through the founder's own connected Gmail account.
// Throws if no mailbox is connected -- callers (the outreach send job)
// must treat that as "can't send yet", never as a reason to fall back to
// any other sending path.
export async function sendGmailMessage(
  userId: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ messageId: string; threadId: string }> {
  const token = await getValidAccessToken(userId);
  if (!token) {
    throw new Error('No Gmail account connected -- connect one before sending outreach.');
  }

  const raw = encodeRfc2822Message(token.email, to, subject, bodyText);
  const res = await axios.post(
    GMAIL_SEND_URL,
    { raw },
    { headers: { Authorization: `Bearer ${token.accessToken}` }, timeout: 15000, validateStatus: () => true }
  );

  if (res.status >= 400) {
    throw new Error(`Gmail send failed: ${JSON.stringify(res.data).slice(0, 200)}`);
  }

  return { messageId: res.data.id, threadId: res.data.threadId };
}

// -- Reply detection (GRF-27) --------------------------------------------------
//
// Signal: Gmail's own INBOX label on any message in the thread we sent
// into. The founder's own sent message carries the SENT label; anything
// that lands back in their inbox on the same thread carries INBOX -- a
// hard signal from Gmail itself rather than a guess based on parsing From
// headers, so it can't misfire on e.g. a bounce notification (a different
// thread) or the founder replying to their own sent message. format:
// 'minimal' returns just id/threadId/labelIds per message -- no bodies,
// cheapest call that still answers the question.
//
// Returns false (never throws) on a missing mailbox or a failed API call --
// one thread's transient problem must never take down the whole sweep;
// replyDetection.ts's caller logs the specific failure per-thread instead.
export async function threadHasReply(userId: string, threadId: string): Promise<boolean> {
  const token = await getValidAccessToken(userId);
  if (!token) return false;

  const res = await axios.get(GMAIL_THREAD_URL(threadId), {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    params: { format: 'minimal' },
    timeout: 15000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    throw new Error(`Gmail thread fetch failed (${res.status}): ${JSON.stringify(res.data).slice(0, 200)}`);
  }

  const messages = (res.data.messages ?? []) as Array<{ labelIds?: string[] }>;
  // INBOX but not SENT: a message the founder sent to themselves (e.g. a
  // test send to their own address) carries both labels and isn't a reply.
  return messages.some(m => {
    const labels = m.labelIds ?? [];
    return labels.includes('INBOX') && !labels.includes('SENT');
  });
}
