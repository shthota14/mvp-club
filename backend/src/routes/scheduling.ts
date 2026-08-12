import express, { Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { createZoomMeeting, zoomConfigured, createZoomMeetingForUser } from '../utils/meeting';
import { sendInterviewInviteEmail, sendOrganizerCalendarInvite } from '../utils/mailer';
import { computeOpenSlots, AvailabilityRule, AvailabilitySettings, AvailabilityOverrideWindow } from '../utils/availability';

const router = express.Router();

const MIGRATION_HINT = 'Scheduling tables not set up yet. Run: docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-scheduling.sql';
const OVERRIDES_MIGRATION_HINT = 'Per-date availability overrides not set up yet. Run: docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-availability-overrides.sql';

function isMissingSchedulingTables(err: any): boolean {
  const msg = err?.message || '';
  return msg.includes('relation "availability_rules" does not exist')
    || msg.includes('relation "availability_settings" does not exist')
    || msg.includes('column "booking_token" does not exist')
    || msg.includes('column "duration_mins" does not exist')
    || msg.includes('column "booking_status" does not exist')
    || msg.includes('column "validation_contact_id" does not exist');
}

function isMissingOverrideTables(err: any): boolean {
  const msg = err?.message || '';
  return msg.includes('relation "availability_overrides" does not exist')
    || msg.includes('relation "availability_override_dates" does not exist');
}

const DEFAULT_SETTINGS: AvailabilitySettings = {
  timezone: 'UTC', min_notice_hours: 12, booking_window_days: 14, buffer_mins: 10,
};

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

// Loads per-date overrides touching [startDateStr, endDateStr] (inclusive,
// 'YYYY-MM-DD'). Missing override tables (pre-migration) are treated by
// callers as "no overrides yet" rather than a hard error, since overrides are
// additive on top of the pre-existing recurring-pattern feature.
async function loadOverridesInRange(userId: string, startDateStr: string, endDateStr: string) {
  const datesRes = await query<{ date: string }>(
    `SELECT date::text AS date FROM availability_override_dates WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
    [userId, startDateStr, endDateStr]
  );
  const overriddenDates = new Set<string>(datesRes.rows.map(r => r.date));
  const winRes = await query<AvailabilityOverrideWindow>(
    `SELECT date::text AS date, start_time, end_time FROM availability_overrides WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, start_time`,
    [userId, startDateStr, endDateStr]
  );
  return { overriddenDates, overrides: winRes.rows };
}

// ── Founder's weekly availability (auth) ────────────────────────────────────

// GET /api/availability
router.get('/availability', requireAuth, async (req: Request, res: Response) => {
  try {
    const rulesRes = await query(
      `SELECT day_of_week, start_time, end_time FROM availability_rules WHERE user_id = $1 ORDER BY day_of_week, start_time`,
      [req.userId]
    );
    const settingsRes = await query(`SELECT * FROM availability_settings WHERE user_id = $1`, [req.userId]);
    res.json({ rules: rulesRes.rows, settings: settingsRes.rows[0] || DEFAULT_SETTINGS });
  } catch (err: any) {
    console.error('[scheduling] GET /availability', err);
    if (isMissingSchedulingTables(err)) return res.status(503).json({ error: MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/availability — replace weekly rules + settings, in one call
router.put('/availability', requireAuth, async (req: Request, res: Response) => {
  const { rules, timezone, min_notice_hours, booking_window_days, buffer_mins } = req.body;
  if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules must be an array' });
  try {
    await query('DELETE FROM availability_rules WHERE user_id = $1', [req.userId]);
    for (const r of rules) {
      if (typeof r?.day_of_week !== 'number' || !r?.start_time || !r?.end_time) continue;
      await query(
        `INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        [req.userId, r.day_of_week, r.start_time, r.end_time]
      );
    }
    await query(
      `INSERT INTO availability_settings (user_id, timezone, min_notice_hours, booking_window_days, buffer_mins, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         timezone = EXCLUDED.timezone,
         min_notice_hours = EXCLUDED.min_notice_hours,
         booking_window_days = EXCLUDED.booking_window_days,
         buffer_mins = EXCLUDED.buffer_mins,
         updated_at = NOW()`,
      [
        req.userId,
        timezone || 'UTC',
        Number.isFinite(min_notice_hours) ? min_notice_hours : 12,
        Number.isFinite(booking_window_days) ? booking_window_days : 14,
        Number.isFinite(buffer_mins) ? buffer_mins : 10,
      ]
    );
    const rulesRes = await query(
      `SELECT day_of_week, start_time, end_time FROM availability_rules WHERE user_id = $1 ORDER BY day_of_week, start_time`,
      [req.userId]
    );
    const settingsRes = await query(`SELECT * FROM availability_settings WHERE user_id = $1`, [req.userId]);
    res.json({ rules: rulesRes.rows, settings: settingsRes.rows[0] });
  } catch (err: any) {
    console.error('[scheduling] PUT /availability', err);
    if (isMissingSchedulingTables(err)) return res.status(503).json({ error: MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Per-date availability overrides (auth) ──────────────────────────────────
// Layered on top of the recurring weekly pattern above -- see
// add-availability-overrides.sql and computeOpenSlots's overriddenDates/
// overrides params for the "an override completely replaces that date" rule.

// GET /api/availability/overrides?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/availability/overrides', requireAuth, async (req: Request, res: Response) => {
  const start = String(req.query.start || '');
  const end = String(req.query.end || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return res.status(400).json({ error: 'start and end query params must be YYYY-MM-DD dates' });
  }
  try {
    const { overriddenDates, overrides } = await loadOverridesInRange(req.userId!, start, end);
    res.json({ overriddenDates: Array.from(overriddenDates), overrides });
  } catch (err: any) {
    console.error('[scheduling] GET /availability/overrides', err);
    if (isMissingOverrideTables(err)) return res.status(503).json({ error: OVERRIDES_MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/availability/overrides/:date — replace one date's override windows.
// An empty `windows` array explicitly blocks that date (still an override --
// distinct from never having called this route for that date at all).
router.put('/availability/overrides/:date', requireAuth, async (req: Request, res: Response) => {
  const { date } = req.params;
  const { windows } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date param must be YYYY-MM-DD' });
  if (!Array.isArray(windows)) return res.status(400).json({ error: 'windows must be an array' });
  try {
    await query(
      `INSERT INTO availability_override_dates (user_id, date) VALUES ($1, $2) ON CONFLICT (user_id, date) DO NOTHING`,
      [req.userId, date]
    );
    await query(`DELETE FROM availability_overrides WHERE user_id = $1 AND date = $2`, [req.userId, date]);
    for (const w of windows) {
      if (!w?.start_time || !w?.end_time) continue;
      await query(
        `INSERT INTO availability_overrides (user_id, date, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        [req.userId, date, w.start_time, w.end_time]
      );
    }
    const winRes = await query(
      `SELECT date::text AS date, start_time, end_time FROM availability_overrides WHERE user_id = $1 AND date = $2 ORDER BY start_time`,
      [req.userId, date]
    );
    res.json({ date, windows: winRes.rows });
  } catch (err: any) {
    console.error('[scheduling] PUT /availability/overrides/:date', err);
    if (isMissingOverrideTables(err)) return res.status(503).json({ error: OVERRIDES_MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/availability/overrides/:date — revert a date back to the recurring weekly pattern.
router.delete('/availability/overrides/:date', requireAuth, async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date param must be YYYY-MM-DD' });
  try {
    await query(`DELETE FROM availability_overrides WHERE user_id = $1 AND date = $2`, [req.userId, date]);
    await query(`DELETE FROM availability_override_dates WHERE user_id = $1 AND date = $2`, [req.userId, date]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[scheduling] DELETE /availability/overrides/:date', err);
    if (isMissingOverrideTables(err)) return res.status(503).json({ error: OVERRIDES_MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Public slot booking (no auth — reached via an emailed link) ────────────

// Loosely-typed shape for the joined interview/idea/user rows below — extends
// Record<string, any> so `iv.*` spreads (whatever columns interviews happens to
// have) don't fight the type checker, while still giving the fields we
// explicitly reference a real type instead of `unknown`.
interface IvRow extends Record<string, any> {
  id: string; user_id: string; organizer_id?: string;
  idea_name: string; organizer_name: string; organizer_email?: string;
  interviewee_name?: string; interviewee_email?: string;
  scheduled_at: string | null; meeting_link: string | null;
  duration_mins: number; booking_status: string;
}

async function loadBusyRanges(organizerId: string, excludeInterviewId: string) {
  const busyRes = await query(
    `SELECT scheduled_at, duration_mins FROM interviews
     WHERE user_id = $1 AND scheduled_at IS NOT NULL AND id != $2`,
    [organizerId, excludeInterviewId]
  );
  return busyRes.rows.map((b: any) => ({
    start: new Date(b.scheduled_at),
    end: new Date(new Date(b.scheduled_at).getTime() + (b.duration_mins || 45) * 60_000),
  }));
}

// GET /api/book/:token — booking info + currently open slots
router.get('/book/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const ivRes = await query<IvRow>(
      `SELECT iv.id, iv.user_id, iv.interviewee_name, iv.scheduled_at, iv.meeting_link, iv.duration_mins, iv.booking_status,
              i.name AS idea_name, u.id AS organizer_id, u.name AS organizer_name
       FROM interviews iv
       JOIN ideas i ON i.id = iv.idea_id
       JOIN users u ON u.id = iv.user_id
       WHERE iv.booking_token = $1`,
      [token]
    );
    if (!ivRes.rows.length) return res.status(404).json({ error: 'This booking link is invalid.' });
    const iv = ivRes.rows[0];

    if (iv.booking_status === 'booked' && iv.scheduled_at) {
      return res.json({
        status: 'booked',
        ideaName: iv.idea_name, organizerName: iv.organizer_name,
        scheduledAt: iv.scheduled_at, meetingLink: iv.meeting_link, durationMins: iv.duration_mins,
      });
    }

    const rulesRes = await query(
      `SELECT day_of_week, start_time, end_time FROM availability_rules WHERE user_id = $1`,
      [iv.organizer_id]
    );

    const settingsRes = await query<AvailabilitySettings>(`SELECT * FROM availability_settings WHERE user_id = $1`, [iv.organizer_id]);
    const settings: AvailabilitySettings = settingsRes.rows[0] || DEFAULT_SETTINGS;

    const rangeStart = new Date();
    const rangeEnd = new Date(rangeStart.getTime() + ((settings.booking_window_days ?? 14) + 1) * 86_400_000);
    let overriddenDates = new Set<string>();
    let overrides: AvailabilityOverrideWindow[] = [];
    try {
      const loaded = await loadOverridesInRange(iv.organizer_id!, toDateStr(rangeStart), toDateStr(rangeEnd));
      overriddenDates = loaded.overriddenDates;
      overrides = loaded.overrides;
    } catch (e: any) {
      if (!isMissingOverrideTables(e)) throw e;
    }

    if (!rulesRes.rows.length && overrides.length === 0) {
      return res.json({ status: 'no_availability', ideaName: iv.idea_name, organizerName: iv.organizer_name });
    }

    const busy = await loadBusyRanges(iv.organizer_id!, iv.id);
    const slots = computeOpenSlots({
      rules: rulesRes.rows as AvailabilityRule[],
      settings,
      durationMins: iv.duration_mins || 20,
      busy,
      overriddenDates,
      overrides,
    });

    res.json({
      status: 'open',
      ideaName: iv.idea_name, organizerName: iv.organizer_name,
      durationMins: iv.duration_mins, timezone: settings.timezone,
      slots: slots.map(s => s.toISOString()),
    });
  } catch (err: any) {
    console.error('[scheduling] GET /book/:token', err);
    if (isMissingSchedulingTables(err)) return res.status(503).json({ error: MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/book/:token — confirm a specific slot
router.post('/book/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { start_time } = req.body;
  if (!start_time) return res.status(400).json({ error: 'start_time required' });

  try {
    const ivRes = await query<IvRow>(
      `SELECT iv.*, i.name AS idea_name, u.name AS organizer_name, u.email AS organizer_email
       FROM interviews iv
       JOIN ideas i ON i.id = iv.idea_id
       JOIN users u ON u.id = iv.user_id
       WHERE iv.booking_token = $1`,
      [token]
    );
    if (!ivRes.rows.length) return res.status(404).json({ error: 'This booking link is invalid.' });
    const iv = ivRes.rows[0];
    if (iv.booking_status === 'booked') return res.status(409).json({ error: 'This meeting has already been booked.' });

    const settingsRes = await query<AvailabilitySettings>(`SELECT * FROM availability_settings WHERE user_id = $1`, [iv.user_id]);
    const settings: AvailabilitySettings = settingsRes.rows[0] || DEFAULT_SETTINGS;
    const rulesRes = await query(
      `SELECT day_of_week, start_time, end_time FROM availability_rules WHERE user_id = $1`,
      [iv.user_id]
    );

    const rangeStart2 = new Date();
    const rangeEnd2 = new Date(rangeStart2.getTime() + ((settings.booking_window_days ?? 14) + 1) * 86_400_000);
    let overriddenDates2 = new Set<string>();
    let overrides2: AvailabilityOverrideWindow[] = [];
    try {
      const loaded2 = await loadOverridesInRange(iv.user_id, toDateStr(rangeStart2), toDateStr(rangeEnd2));
      overriddenDates2 = loaded2.overriddenDates;
      overrides2 = loaded2.overrides;
    } catch (e: any) {
      if (!isMissingOverrideTables(e)) throw e;
    }

    const busy = await loadBusyRanges(iv.user_id, iv.id);
    const openSlots = computeOpenSlots({
      rules: rulesRes.rows as AvailabilityRule[],
      settings,
      durationMins: iv.duration_mins || 20,
      busy,
      overriddenDates: overriddenDates2,
      overrides: overrides2,
    });

    // Re-validate against the live computation — never trust the client's chosen
    // time blindly, since another contact could have booked the same slot since
    // this page loaded.
    const chosen = new Date(start_time);
    const stillOpen = openSlots.some(s => Math.abs(s.getTime() - chosen.getTime()) < 60_000);
    if (!stillOpen) return res.status(409).json({ error: 'That slot is no longer available — please pick another.' });

    const startTime = chosen;
    const durationMins = iv.duration_mins || 20;
    const endTime = new Date(startTime.getTime() + durationMins * 60_000);

    let meetingLink = '';
    let meetingId = '';
    let meetingProvider = '';
    try {
      // Prefer the organizer's own connected Zoom account, so they're the
      // meeting host (see backend/src/routes/zoom.ts) -- fall back to the
      // shared Server-to-Server account only if they haven't connected one.
      const zmOwn = await createZoomMeetingForUser(iv.user_id, {
        topic: `Discovery chat — ${iv.idea_name}`,
        startTime: startTime.toISOString(),
        durationMins,
        timezone: settings.timezone,
      });
      if (zmOwn) {
        meetingLink = zmOwn.joinUrl;
        meetingId = zmOwn.meetingId;
        meetingProvider = 'zoom';
      } else if (zoomConfigured()) {
        const zm = await createZoomMeeting({
          topic: `Discovery chat — ${iv.idea_name}`,
          startTime: startTime.toISOString(),
          durationMins,
          timezone: settings.timezone,
        });
        meetingLink = zm.joinUrl;
        meetingId = zm.meetingId;
        meetingProvider = 'zoom';
      }
    } catch (zmErr) {
      // Never block a booking on a Zoom hiccup -- the contact still gets a
      // confirmed time, just without an auto-generated meeting link.
      console.error('[scheduling] Zoom meeting creation failed -- continuing without a meeting link', zmErr);
    }

    await query(
      `UPDATE interviews SET scheduled_at = $1, meeting_link = $2, meeting_id = $3, meeting_provider = $4,
        booking_status = 'booked', invite_sent_at = NOW(), updated_at = NOW()
       WHERE id = $5`,
      [startTime.toISOString(), meetingLink, meetingId, meetingProvider, iv.id]
    );

    // The booking is already committed above — from here on, a mail hiccup must never
    // turn a successful booking into an error response for the visitor (they'd see a
    // failure page for a slot that's actually taken, and a retry would just 409). So
    // each invite is sent independently, in its own try/catch, and the organizer's
    // confirmation no longer depends on the interviewee's invite having succeeded —
    // previously it was skipped entirely whenever that first send failed (or the
    // contact had no email), so the founder would silently never hear their meeting
    // was booked.
    let icsContent: string | null = null;
    if (iv.interviewee_email) {
      try {
        icsContent = await sendInterviewInviteEmail({
          organizerName: iv.organizer_name || 'A founder',
          organizerEmail: iv.organizer_email || '',
          intervieweeName: iv.interviewee_name || 'there',
          intervieweeEmail: iv.interviewee_email,
          ideaName: iv.idea_name,
          startTime, endTime, meetingLink,
          meetingProvider,
        });
      } catch (mailErr) {
        console.error('[scheduling] Failed to send interviewee invite -- booking still confirmed', mailErr);
      }
    }
    try {
      await sendOrganizerCalendarInvite({
        organizerName: iv.organizer_name || 'A founder',
        organizerEmail: iv.organizer_email || '',
        intervieweeName: iv.interviewee_name || 'there',
        intervieweeEmail: iv.interviewee_email || undefined,
        ideaName: iv.idea_name,
        startTime, endTime, meetingLink,
        meetingProvider,
        icsContent: icsContent || undefined,
      });
    } catch (mailErr) {
      console.error('[scheduling] Failed to send organizer confirmation -- booking still confirmed', mailErr);
    }

    res.json({ success: true, scheduledAt: startTime.toISOString(), meetingLink });
  } catch (err: any) {
    console.error('[scheduling] POST /book/:token', err);
    if (isMissingSchedulingTables(err)) return res.status(503).json({ error: MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
