import axios from 'axios';
import crypto from 'crypto';

// ── Shared meeting naming ────────────────────────────────────────────────────
// One consistent "name" for a scheduled meeting, used everywhere a meeting's
// identity is shown to a person: the Jitsi call's in-room/tab title, the
// calendar invite's event title, and the invite emails' subject lines.
export function formatMeetingName(params: {
  ideaName: string;
  intervieweeName: string;
  organizerName: string;
  startTime: Date;
}): string {
  const { ideaName, intervieweeName, organizerName, startTime } = params;
  const dateStr = startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${ideaName} — ${intervieweeName} & ${organizerName} — ${dateStr} ${timeStr}`;
}

// ── Jitsi Meet (public meet.jit.si, no auth/API required) ───────────────────
// A Jitsi room is nothing but a URL -- there's no meeting object to create via
// an API call, no OAuth connect flow, no "is this configured" check like the
// Zoom integration this replaced needed. The room simply comes to life the
// moment anyone opens the link, which also means it's safe to generate this
// link immediately at booking time and embed it in a calendar invite that
// goes out well before the call happens -- unlike Zoom, there's no dependency
// on the founder having connected an account first.
export function createJitsiMeeting(params: { topic: string }): { joinUrl: string; meetingId: string } {
  // Random hex slug -- long and unguessable, since meet.jit.si has no access
  // control of its own: the room name IS the only thing standing between a
  // stranger and the call. Deliberately NOT derived from the idea/founder/
  // interviewee names, which would make it guessable -- the human-readable
  // name instead goes into the URL's #config.subject, which sets what's
  // DISPLAYED once you're in the room (and the browser tab title) without
  // touching the actual room identity in the path.
  const slug = crypto.randomBytes(16).toString('hex');
  const subjectParam = encodeURIComponent(`"${params.topic}"`);
  return {
    joinUrl: `https://meet.jit.si/${slug}#config.subject=${subjectParam}`,
    meetingId: slug,
  };
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
