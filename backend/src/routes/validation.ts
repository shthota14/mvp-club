import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { sendMeetingRequestEmail, defaultMeetingRequestMessage } from '../utils/mailer';
import { checkQuestion, generateInterviewScript, generateDiscoveryGuide, generateQuestionChips, reactToIdeaAnswer, assembleOneLinerSentence, generateMvpHypotheses, generateFeatureSuggestions, checkFeatureEvidence, FeatureEvidenceContext, generateDistributionSuggestions, generatePricingSuggestions, checkPricingEvidence, PricingContext, generateBuildSpec, BuildSpecContext, recommendBuildPath, BuildPathContext, generateFlowsAndScreens, FlowScreenContext, generateUIPrompt, UIPromptContext, generateFeatureBuildCard, FeatureBuildCardContext, generateChangeCodingPrompt, ChangeCoachContext, generateMarketSnapshot, MarketSnapshotContext, generateProblemInterviewTurn, ProblemInterviewContext, ProblemInterviewTurn, generateProblemChips, ProblemChipsContext, generateAlternativeChips, AlternativeChipsContext } from '../utils/aiQuestionCheck';

const router = Router();

// Loosely-typed row for `vc.*` + joined idea_name — keeps the columns we
// explicitly reference typed as strings instead of `unknown`, while an index
// signature absorbs whatever other validation_contacts columns come along.
interface ContactRow extends Record<string, any> {
  id: string; name: string; email?: string; idea_id: string; idea_name: string;
}

const ContactSchema = z.object({
  idea_id: z.string().uuid(),
  source: z.enum(['community', 'linkedin', 'email']),
  name: z.string().min(1),
  contact: z.string().optional(),
  status: z.enum(['Not sent', 'Sent', 'Replied', 'Call booked', 'Done']).default('Not sent'),
  notes: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().optional(),
});

function isMissingContactColumn(err: any): boolean {
  const msg = err?.message || '';
  return msg.includes('column "icp_fit" does not exist')
    || msg.includes('column "email" does not exist')
    || msg.includes('column "phone" does not exist')
    || msg.includes('column "linkedin_url" does not exist');
}
const CONTACT_MIGRATION_HINT = 'A contact-detail column isn\'t set up yet. Run: docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-scheduling.sql';
const SCHEDULING_MIGRATION_HINT = 'Scheduling tables not set up yet. Run: docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-scheduling.sql';

// ── Public lead-capture: someone who saw a "Broad reach" post leaves their contact info ──
// No auth required — idea_id in the URL acts as an opaque link the founder shares, same trust
// model as the existing public /survey/:token and /book/:token pages. Added 2026-07-22 to replace
// the earlier "Copy survey link" button in OutreachTracker's Part 2, which reused the pain/value
// hypothesis-testing survey flow — a poor fit for "a stranger wants to leave contact info."
router.get('/public/:idea_id', async (req: Request, res: Response) => {
  try {
    const result = await query<{ name: string }>(
      `SELECT name FROM ideas WHERE id = $1`,
      [req.params.idea_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ ideaName: result.rows[0].name });
  } catch {
    res.status(404).json({ error: 'not_found' });
  }
});

const PublicLeadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(6),
});

router.post('/public/:idea_id/lead', async (req: Request, res: Response) => {
  const parsed = PublicLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid email and phone/WhatsApp number are required.' });
  }
  const { name, email, phone } = parsed.data;
  try {
    // source is 'email' (an existing allowed value — validation_contacts.source has a DB CHECK
    // constraint limited to 'community'/'linkedin'/'email') so this doesn't need a 4th migration.
    const result = await query(
      `INSERT INTO validation_contacts (user_id, idea_id, source, name, status, email, phone)
       SELECT user_id, $1, 'email', $2, 'Not sent', $3, $4 FROM ideas WHERE id = $1
       RETURNING id`,
      [req.params.idea_id, (name || '').trim() || 'Someone who reached out', email, phone]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (isMissingContactColumn(err)) return res.status(503).json({ error: CONTACT_MIGRATION_HINT });
    res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
});

router.use(requireAuth);

// List contacts for an idea (optionally by source)
router.get('/contacts', async (req: Request, res: Response) => {
  const { idea_id, source } = req.query;
  try {
    const result = await query(
      `SELECT * FROM validation_contacts WHERE user_id = $1
       ${idea_id ? 'AND idea_id = $2' : ''}
       ${source ? `AND source = $${idea_id ? 3 : 2}` : ''}
       ORDER BY source, created_at ASC`,
      [req.userId, ...(idea_id ? [idea_id] : []), ...(source ? [source] : [])]
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a contact
router.post('/contacts', async (req: Request, res: Response) => {
  const parse = ContactSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }

  const { idea_id, source, name, contact, status, notes, email, phone, linkedin_url } = parse.data;
  try {
    const result = await query(
      `INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes, email, phone, linkedin_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.userId, idea_id, source, name, contact, status, notes, email || null, phone || null, linkedin_url || null]
    );
    res.status(201).json({ contact: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    if (isMissingContactColumn(err)) return res.status(503).json({ error: CONTACT_MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update contact status / details
router.patch('/contacts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, icp_fit, email, phone, linkedin_url } = req.body;
  // icp_fit is a tri-state (yes / unsure / cleared-to-null), so it needs to be
  // settable to null explicitly — only apply it when the key was actually sent.
  const hasIcpFit = Object.prototype.hasOwnProperty.call(req.body, 'icp_fit');
  try {
    const result = await query(
      `UPDATE validation_contacts SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        icp_fit = CASE WHEN $3 THEN $4 ELSE icp_fit END,
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        linkedin_url = COALESCE($7, linkedin_url),
        updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [status, notes, hasIcpFit, icp_fit ?? null, email, phone, linkedin_url, id, req.userId]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.json({ contact: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    if (isMissingContactColumn(err)) return res.status(503).json({ error: CONTACT_MIGRATION_HINT });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /contacts/meetings?idea_id=X — meeting-request status for every contact
// under this idea (booked/awaiting/none), so OutreachTracker can show it without
// re-requesting after a reload.
router.get('/contacts/meetings', async (req: Request, res: Response) => {
  const { idea_id } = req.query;
  if (!idea_id) return res.status(400).json({ error: 'idea_id required' });
  try {
    const result = await query(
      `SELECT validation_contact_id, id AS interview_id, booking_status, booking_token,
              scheduled_at, meeting_link, duration_mins, invite_sent_at
       FROM interviews
       WHERE user_id = $1 AND idea_id = $2 AND validation_contact_id IS NOT NULL
       ORDER BY created_at DESC`,
      [req.userId, idea_id]
    );
    res.json({ meetings: result.rows });
  } catch (err: any) {
    console.error(err);
    if (isMissingContactColumn(err) || err.message?.includes('column "validation_contact_id" does not exist')) {
      return res.status(503).json({ error: SCHEDULING_MIGRATION_HINT });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /contacts/:id/preview-meeting-request — read-only: returns the default
// subject + message text for this contact's meeting-request email, so the
// frontend's "preview & edit before sending" modal can start from the exact
// same copy sendMeetingRequestEmail would use, without duplicating it and
// without creating an interview row or sending anything.
router.get('/contacts/:id/preview-meeting-request', async (req: Request, res: Response) => {
  const { id } = req.params;
  const durationMinsRaw = req.query.duration_mins;
  const durationMins = (() => { const n = Number(durationMinsRaw); return Number.isFinite(n) && n >= 5 && n <= 180 ? Math.round(n) : 20; })();

  try {
    const contactRes = await query<ContactRow>(
      `SELECT vc.*, i.name AS idea_name
       FROM validation_contacts vc
       JOIN ideas i ON i.id = vc.idea_id
       WHERE vc.id = $1 AND vc.user_id = $2`,
      [id, req.userId]
    );
    if (!contactRes.rows.length) return res.status(404).json({ error: 'Contact not found' });
    const c = contactRes.rows[0];
    const userRes = await query<{ name: string }>(`SELECT name FROM users WHERE id = $1`, [req.userId]);
    const organizerName = userRes.rows[0]?.name || 'A founder';

    res.json({
      subject: `MVP Club Interview Request: "${c.idea_name}"`,
      message: defaultMeetingRequestMessage({ organizerName, ideaName: c.idea_name, durationMins }),
      toName: c.name,
      toEmail: c.email || null,
    });
  } catch (err: any) {
    console.error('[validation] preview-meeting-request', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /contacts/:id/request-meeting — email this contact a link to pick an
// open slot from the founder's availability. Reuses (and re-sends) any
// still-pending request for the same contact rather than spawning duplicates.
router.post('/contacts/:id/request-meeting', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { duration_mins, problem, custom_subject, custom_message } = req.body;
  // Any reasonable custom length is accepted now, not just the 15/20/30 presets —
  // the founder can type a custom duration in the meeting-request panel.
  const durationMins = (() => { const n = Number(duration_mins); return Number.isFinite(n) && n >= 5 && n <= 180 ? Math.round(n) : 20; })();

  try {
    const contactRes = await query<ContactRow>(
      `SELECT vc.*, i.name AS idea_name
       FROM validation_contacts vc
       JOIN ideas i ON i.id = vc.idea_id
       WHERE vc.id = $1 AND vc.user_id = $2`,
      [id, req.userId]
    );
    if (!contactRes.rows.length) return res.status(404).json({ error: 'Contact not found' });
    const c = contactRes.rows[0];
    if (!c.email) return res.status(400).json({ error: 'Add an email for this contact first — nothing to send the request to.' });
    const userRes = await query<{ name: string }>(`SELECT name FROM users WHERE id = $1`, [req.userId]);
    const organizerName = userRes.rows[0]?.name || 'A founder';

    // Reuse an existing pending/booked request for this contact instead of
    // creating a second one (avoids duplicate booking links/emails).
    const existingRes = await query(
      `SELECT * FROM interviews WHERE validation_contact_id = $1 AND booking_status IN ('awaiting_response','booked') ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    let interview = existingRes.rows.length ? existingRes.rows[0] : null;

    if (interview && interview.booking_status === 'booked') {
      const alreadyHappened = interview.scheduled_at && new Date(interview.scheduled_at).getTime() < Date.now();
      if (!alreadyHappened) {
        return res.status(409).json({ error: 'This contact already has a meeting booked.', interview });
      }
      // The booked call is in the past — this is a follow-up request, not a
      // duplicate. Fall through to create a fresh interview row below rather
      // than reusing the old one, whose booking_token/scheduled_at belong to
      // the call that's already happened.
      interview = null;
    }

    if (interview) {
      // Resend of a still-pending request — preserve the *original* send date
      // (don't reset the "sent N days ago" clock) but backfill it if this
      // interview predates invite_sent_at being tracked at all.
      if (!interview.invite_sent_at) {
        const stampRes = await query(
          `UPDATE interviews SET invite_sent_at = NOW() WHERE id = $1 RETURNING *`,
          [interview.id]
        );
        interview = stampRes.rows[0];
      }
    } else {
      const token = crypto.randomBytes(16).toString('hex');
      const insertRes = await query(
        `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_email, duration_mins, booking_token, booking_status, validation_contact_id, invite_sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_response', $7, NOW()) RETURNING *`,
        [c.idea_id, req.userId, c.name, c.email, durationMins, token, id]
      );
      interview = insertRes.rows[0];
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const bookingLink = `${frontendUrl}/book/${interview.booking_token}`;

    const emailSent = await sendMeetingRequestEmail({
      toEmail: c.email,
      toName: c.name,
      organizerName,
      ideaName: c.idea_name,
      problem: typeof problem === 'string' ? problem : undefined,
      bookingLink,
      durationMins,
      customSubject: typeof custom_subject === 'string' ? custom_subject : undefined,
      customMessage: typeof custom_message === 'string' ? custom_message : undefined,
    });

    res.json({ interview, bookingLink, emailSent });
  } catch (err: any) {
    console.error('[validation] request-meeting', err);
    if (isMissingContactColumn(err) || err.message?.includes('column "booking_token" does not exist') || err.message?.includes('column "duration_mins" does not exist')) {
      return res.status(503).json({ error: SCHEDULING_MIGRATION_HINT });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk-request meetings for several contacts at once (used by the "Schedule
// interviews" Validate step). Unlike the single-contact route above, email is
// optional here — every contact still gets an interview record + booking link
// so a phone-only contact can be sent that link manually over WhatsApp; the
// email is simply skipped (not sent) when the contact has no address on file.
router.post('/contacts/bulk-request-meeting', async (req: Request, res: Response) => {
  const { contact_ids, duration_mins, problem, custom_subject, custom_message } = req.body;
  if (!Array.isArray(contact_ids) || !contact_ids.length) {
    return res.status(400).json({ error: 'contact_ids must be a non-empty array' });
  }
  // Any reasonable custom length is accepted now, not just the 15/20/30 presets —
  // the founder can type a custom duration in the meeting-request panel.
  const durationMins = (() => { const n = Number(duration_mins); return Number.isFinite(n) && n >= 5 && n <= 180 ? Math.round(n) : 20; })();

  try {
    const userRes = await query<{ name: string }>(`SELECT name FROM users WHERE id = $1`, [req.userId]);
    const organizerName = userRes.rows[0]?.name || 'A founder';
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

    const results: Array<{ contact_id: string; ok: boolean; error?: string; bookingLink?: string; emailSent?: boolean; hasPhone?: boolean }> = [];

    for (const id of contact_ids) {
      try {
        const contactRes = await query<ContactRow>(
          `SELECT vc.*, i.name AS idea_name
           FROM validation_contacts vc
           JOIN ideas i ON i.id = vc.idea_id
           WHERE vc.id = $1 AND vc.user_id = $2`,
          [id, req.userId]
        );
        if (!contactRes.rows.length) { results.push({ contact_id: id, ok: false, error: 'Contact not found' }); continue; }
        const c = contactRes.rows[0];

        const existingRes = await query(
          `SELECT * FROM interviews WHERE validation_contact_id = $1 AND booking_status IN ('awaiting_response','booked') ORDER BY created_at DESC LIMIT 1`,
          [id]
        );

        let interview = existingRes.rows.length ? existingRes.rows[0] : null;

        if (interview && interview.booking_status === 'booked') {
          const alreadyHappened = interview.scheduled_at && new Date(interview.scheduled_at).getTime() < Date.now();
          if (!alreadyHappened) {
            results.push({ contact_id: id, ok: false, error: 'Already booked' });
            continue;
          }
          // Past meeting — treat as a follow-up request, not a duplicate.
          interview = null;
        }

        if (interview) {
          // Resend of a still-pending request — preserve the *original* send
          // date, only backfilling it if this interview predates tracking.
          if (!interview.invite_sent_at) {
            const stampRes = await query(
              `UPDATE interviews SET invite_sent_at = NOW() WHERE id = $1 RETURNING *`,
              [interview.id]
            );
            interview = stampRes.rows[0];
          }
        } else {
          const token = crypto.randomBytes(16).toString('hex');
          const insertRes = await query(
            `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_email, duration_mins, booking_token, booking_status, validation_contact_id, invite_sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_response', $7, NOW()) RETURNING *`,
            [c.idea_id, req.userId, c.name, c.email || null, durationMins, token, id]
          );
          interview = insertRes.rows[0];
        }

        const bookingLink = `${frontendUrl}/book/${interview.booking_token}`;
        let emailSent = false;
        if (c.email) {
          emailSent = await sendMeetingRequestEmail({
            toEmail: c.email, toName: c.name, organizerName, ideaName: c.idea_name,
            problem: typeof problem === 'string' ? problem : undefined,
            bookingLink, durationMins,
            customSubject: typeof custom_subject === 'string' ? custom_subject : undefined,
            customMessage: typeof custom_message === 'string' ? custom_message : undefined,
          });
        }
        results.push({ contact_id: id, ok: true, bookingLink, emailSent, hasPhone: !!c.phone });
      } catch (innerErr: any) {
        console.error('[validation] bulk-request-meeting item', id, innerErr);
        results.push({ contact_id: id, ok: false, error: 'Internal error' });
      }
    }

    res.json({ results });
  } catch (err: any) {
    console.error('[validation] bulk-request-meeting', err);
    if (isMissingContactColumn(err) || err.message?.includes('column "booking_token" does not exist') || err.message?.includes('column "duration_mins" does not exist')) {
      return res.status(503).json({ error: SCHEDULING_MIGRATION_HINT });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a contact
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Block deletion once a meeting request has gone out for this contact — removing
    // them would orphan the interview/booking-link history, and if it's still
    // awaiting a response, could pull the rug out from under someone actively
    // picking a slot on their booking page. The frontend already disables the
    // remove button in this case; this is the server-side backstop for that rule.
    // Tolerant of the add-scheduling.sql migration not having run yet (in which
    // case validation_contact_id can't exist on any interview row, so there's
    // nothing to block on).
    try {
      const linked = await query(
        `SELECT id FROM interviews WHERE validation_contact_id = $1 AND user_id = $2 AND booking_status IN ('awaiting_response', 'booked') LIMIT 1`,
        [id, req.userId]
      );
      if (linked.rows.length) {
        return res.status(409).json({ error: "Can't remove this contact — a meeting request has already been sent to them." });
      }
    } catch (linkErr: any) {
      if (!(linkErr?.message || '').includes('column') || !(linkErr.message || '').includes('validation_contact_id')) {
        throw linkErr;
      }
      // Migration hasn't run — no interview could be linked to a contact yet, so nothing to block.
    }

    await query('DELETE FROM validation_contacts WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats: how many responses per source for an idea
router.get('/stats/:idea_id', async (req: Request, res: Response) => {
  const { idea_id } = req.params;
  try {
    const result = await query(
      `SELECT source,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('Replied','Call booked','Done')) as responded
       FROM validation_contacts
       WHERE user_id = $1 AND idea_id = $2
       GROUP BY source`,
      [req.userId, idea_id]
    );
    res.json({ stats: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /idea/react — a short, warm, Ollama-generated reaction to a single
// answer during the conversational Idea-stage agent flow (Idea Step 1,
// "what's your idea?"). Stateless, one call per turn — same self-hosted
// Ollama model as questions/check and questions/generate-script below.
router.post('/idea/react', async (req: Request, res: Response) => {
  const { question, answer } = req.body;
  if (typeof question !== 'string' || !question.trim() || typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'question and answer are required' });
  }
  try {
    const result = await reactToIdeaAnswer(question.trim(), answer.trim());
    res.json(result);
  } catch (err: any) {
    console.error('[validation] idea/react', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /idea/assemble-one-liner — once all 4 one-liner slots are answered,
// ask Ollama to smooth the founder's raw answers into one grammatically
// clean sentence in the fixed template, instead of the frontend's blunt
// concatenation (which left typos in and produced ungrammatical sentences
// like "...who not knowing if their idea is any good..."). Stateless, one
// call at the end of the Idea Step 1 conversation.
router.post('/idea/assemble-one-liner', async (req: Request, res: Response) => {
  const { building, audience, struggle, outcome } = req.body;
  if ([building, audience, struggle, outcome].some(v => typeof v !== 'string')) {
    return res.status(400).json({ error: 'building, audience, struggle, and outcome are required' });
  }
  try {
    const result = await assembleOneLinerSentence(building, audience, struggle, outcome);
    res.json(result);
  } catch (err: any) {
    console.error('[validation] idea/assemble-one-liner', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /idea/market-snapshot — once the Idea Step 1 one-liner is complete,
// an AI-drafted domain + rough TAM/SAM + short competitor list, rendered as
// an infographic on the frontend. Stateless, same pattern as idea/react and
// idea/assemble-one-liner above — the frontend already has ideaName/oneLiner
// client-side and persists the result itself via the usual entries upsert.
// See the long caveat comment above generateMarketSnapshot in
// aiQuestionCheck.ts before changing the prompt — this is the one AI feature
// in the app most prone to confidently naming a fabricated competitor, so
// the frontend must always label this as an AI draft to verify.
router.post('/idea/market-snapshot', async (req: Request, res: Response) => {
  const {
    ideaName, oneLiner,
    customerSegment, whoPays, problems, painConsequences, frequency,
    existingAlternatives, founderStatement,
  } = req.body;
  const str = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined;
  const ctx: MarketSnapshotContext = {
    ideaName: str(ideaName),
    oneLiner: str(oneLiner),
    // Optional — only populated once this step sits at the end of Hone and
    // the founder has actually filled these fields in.
    customerSegment: str(customerSegment),
    whoPays: str(whoPays),
    problems: str(problems),
    painConsequences: str(painConsequences),
    frequency: str(frequency),
    existingAlternatives: str(existingAlternatives),
    founderStatement: str(founderStatement),
  };
  try {
    const result = await generateMarketSnapshot(ctx);
    res.json(result);
  } catch (err: any) {
    console.error('[validation] idea/market-snapshot', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /idea/problem-interview — Hone Step 2's "Sage interviews you" option:
// an opt-in alternative to the static preset-chip grid. Stateless, same
// pattern as idea/market-snapshot above — the frontend holds the whole
// conversation and re-sends it (plus the newest founder message) each turn;
// the response is the next question (or a closing line) plus the full
// cumulative list of problems extracted so far, which the frontend merges
// into its own problem list by de-duping on text.
router.post('/idea/problem-interview', async (req: Request, res: Response) => {
  const { oneLiner, segmentRole, segmentDetail, history, founderMessage } = req.body;
  const cleanHistory: ProblemInterviewTurn[] = Array.isArray(history)
    ? history
        .filter((t: any) => t && (t.role === 'sage' || t.role === 'founder') && typeof t.text === 'string')
        .map((t: any) => ({ role: t.role, text: String(t.text).slice(0, 800) }))
    : [];
  const ctx: ProblemInterviewContext = {
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    segmentRole: typeof segmentRole === 'string' ? segmentRole : undefined,
    segmentDetail: typeof segmentDetail === 'string' ? segmentDetail : undefined,
    history: cleanHistory,
    founderMessage: typeof founderMessage === 'string' ? founderMessage.trim().slice(0, 800) : '',
  };
  if (!ctx.founderMessage) {
    res.status(400).json({ error: 'A message is required.' });
    return;
  }
  try {
    const result = await generateProblemInterviewTurn(ctx);
    res.json(result);
  } catch (err: any) {
    console.error('[validation] idea/problem-interview', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /idea/problem-chips — AI-tailored "Select everything that applies to
// your customer" suggestion chips for Hone step 2 ("What are the
// problems?"), sorted into the same five fixed dimensions (Time / Cost /
// Frustration / Access / Growth) the UI already groups by, but with items
// grounded in the founder's own one-liner and target segment instead of one
// fixed generic list shown to every founder.
router.post('/idea/problem-chips', async (req: Request, res: Response) => {
  const { oneLiner, segmentRole, segmentDetail, existingProblems } = req.body;
  const ctx: ProblemChipsContext = {
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    segmentRole: typeof segmentRole === 'string' ? segmentRole : undefined,
    segmentDetail: typeof segmentDetail === 'string' ? segmentDetail : undefined,
    existingProblems: Array.isArray(existingProblems) ? existingProblems.filter((p: any) => typeof p === 'string' && p.trim()).map((p: string) => p.slice(0, 200)) : undefined,
  };
  try {
    const groups = await generateProblemChips(ctx);
    res.json({ groups });
  } catch (err: any) {
    console.error('[validation] idea/problem-chips', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /idea/alternative-chips — AI-tailored coping-mechanism suggestion
// chips for Hone step 4 ("What do you think people are doing to solve
// this?"), sorted into the same six fixed categories (Manual & DIY /
// People & Help / General Tools / Workarounds / Research & Community /
// Nothing) the UI already groups by, but grounded in the founder's own
// problem statement, one-liner, and target segment.
router.post('/idea/alternative-chips', async (req: Request, res: Response) => {
  const { oneLiner, segmentRole, segmentDetail, problem, existingItems } = req.body;
  const ctx: AlternativeChipsContext = {
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    segmentRole: typeof segmentRole === 'string' ? segmentRole : undefined,
    segmentDetail: typeof segmentDetail === 'string' ? segmentDetail : undefined,
    problem: typeof problem === 'string' ? problem : undefined,
    existingItems: Array.isArray(existingItems) ? existingItems.filter((p: any) => typeof p === 'string' && p.trim()).map((p: string) => p.slice(0, 200)) : undefined,
  };
  try {
    const groups = await generateAlternativeChips(ctx);
    res.json({ groups });
  } catch (err: any) {
    console.error('[validation] idea/alternative-chips', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /questions/check — AI review of a single interview question against
// the app's own Do/Don't interview guidance (phrasing only: leading, hypothetical,
// or pitchy questions get flagged with a suggested rewrite). Used on "Build your
// interview script" whenever a question is added or edited.
router.post('/questions/check', async (req: Request, res: Response) => {
  const { question, hint } = req.body;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  try {
    const result = await checkQuestion(question.trim(), typeof hint === 'string' ? hint : undefined);
    res.json(result);
  } catch (err: any) {
    console.error('[validation] questions/check', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI check right now — please try again.' });
  }
});

// POST /questions/generate-script — AI-drafted interview script based on
// whatever the founder has already captured earlier in Hone/Validate (problem
// statement, target persona, hypotheses/assumptions, ICP jobs/frustrations/
// alternatives, key validation question). Used by the "✨ Auto-generate from
// your answers" button on "Build your interview script" — the frontend
// gathers this context client-side (it already has it all via `get()`) and
// posts it here rather than this route re-fetching idea state itself.
router.post('/questions/generate-script', async (req: Request, res: Response) => {
  const { problem, persona, assumptions, icpJobs, icpFrustrations, icpAlternatives, keyQuestion } = req.body;
  try {
    const questions = await generateInterviewScript({
      problem: typeof problem === 'string' ? problem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      assumptions: Array.isArray(assumptions) ? assumptions.filter((a: any) => typeof a === 'string' && a.trim()) : undefined,
      icpJobs: typeof icpJobs === 'string' ? icpJobs : undefined,
      icpFrustrations: typeof icpFrustrations === 'string' ? icpFrustrations : undefined,
      icpAlternatives: typeof icpAlternatives === 'string' ? icpAlternatives : undefined,
      keyQuestion: typeof keyQuestion === 'string' ? keyQuestion : undefined,
    });
    res.json({ questions });
  } catch (err: any) {
    console.error('[validation] questions/generate-script', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /questions/generate-guide — full solution-agnostic customer-discovery
// interview guide (private "Interview Focus" briefing + a timed, 30-minute
// question sequence), grounded ONLY in the founder's own Idea/Hone notes —
// never the proposed solution. Used by the "AI-assisted" mode of "Build your
// interview script" (Validate step 7); the frontend gathers the Idea/Hone +
// ICP context client-side and posts it here, same pattern as
// questions/generate-script above.
router.post('/questions/generate-guide', async (req: Request, res: Response) => {
  const {
    ideaName, oneLiner, whoExactly, problemSentence, painIfNothing, frequency,
    solutionAlternatives, whoPays, founderStatement, icpJobs, icpFrustrations,
    icpAlternatives, assumptions, existingQuestions,
  } = req.body;
  try {
    const guide = await generateDiscoveryGuide({
      ideaName: typeof ideaName === 'string' ? ideaName : undefined,
      oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
      whoExactly: typeof whoExactly === 'string' ? whoExactly : undefined,
      problemSentence: typeof problemSentence === 'string' ? problemSentence : undefined,
      painIfNothing: typeof painIfNothing === 'string' ? painIfNothing : undefined,
      frequency: typeof frequency === 'string' ? frequency : undefined,
      solutionAlternatives: typeof solutionAlternatives === 'string' ? solutionAlternatives : undefined,
      whoPays: typeof whoPays === 'string' ? whoPays : undefined,
      founderStatement: typeof founderStatement === 'string' ? founderStatement : undefined,
      icpJobs: typeof icpJobs === 'string' ? icpJobs : undefined,
      icpFrustrations: typeof icpFrustrations === 'string' ? icpFrustrations : undefined,
      icpAlternatives: typeof icpAlternatives === 'string' ? icpAlternatives : undefined,
      assumptions: Array.isArray(assumptions) ? assumptions.filter((a: any) => typeof a === 'string' && a.trim()) : undefined,
      // "Ask Sage for more questions" — the frontend sends every question
      // text already in the current guide so this call doesn't reproduce
      // them; undefined (not just empty) on the very first generate.
      existingQuestions: Array.isArray(existingQuestions) ? existingQuestions.filter((q: any) => typeof q === 'string' && q.trim()) : undefined,
    });
    res.json(guide);
  } catch (err: any) {
    console.error('[validation] questions/generate-guide', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /questions/generate-chips — on-demand AI "quick response" chips for
// ONE question, used by the small "🏷️" button next to a hand-typed question
// in the manual editor ("Your discovery questions", Validate step 7), and
// to backfill chips for a question from a script generated before this
// feature existed. Same self-hosted Ollama model as the rest of this file.
router.post('/questions/generate-chips', async (req: Request, res: Response) => {
  const { question, hint, problemDomain } = req.body;
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  try {
    const chips = await generateQuestionChips({
      question: question.trim(),
      hint: typeof hint === 'string' ? hint : undefined,
      problemDomain: typeof problemDomain === 'string' ? problemDomain : undefined,
    });
    res.json({ chips });
  } catch (err: any) {
    console.error('[validation] questions/generate-chips', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /shape/generate-hypothesis — "✨ Draft my MVP hypothesis" (Shape step
// "What will you build?"). Grounded in the founder's own validated evidence
// carried forward from Validate (confirmed pains, key insights, persona,
// what was learned/surprised them, demand signals) — the frontend gathers
// this client-side (it already has it all via `get()`) and posts it here,
// same pattern as questions/generate-script above. Candidates are
// constrained to the fixed chip vocab used by the Shape mad-libs picker.
router.post('/shape/generate-hypothesis', async (req: Request, res: Response) => {
  const { oneLiner, validatedProblem, persona, confirmedPains, keyInsights, learnings, surprises, demandSignalCount } = req.body;
  try {
    const candidates = await generateMvpHypotheses({
      oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
      validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      confirmedPains: Array.isArray(confirmedPains) ? confirmedPains.filter((p: any) => typeof p === 'string' && p.trim()) : undefined,
      keyInsights: Array.isArray(keyInsights) ? keyInsights.filter((i: any) => typeof i === 'string' && i.trim()) : undefined,
      learnings: Array.isArray(learnings) ? learnings.filter((l: any) => typeof l === 'string' && l.trim()) : undefined,
      surprises: Array.isArray(surprises) ? surprises.filter((s: any) => typeof s === 'string' && s.trim()) : undefined,
      demandSignalCount: typeof demandSignalCount === 'number' ? demandSignalCount : undefined,
    });
    res.json({ candidates });
  } catch (err: any) {
    console.error('[validation] shape/generate-hypothesis', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// Shared body parser for the two feature-evidence routes below — both take
// the same evidence-context shape, gathered client-side the same way as
// shape/generate-hypothesis (the frontend already has it all via `get()`).
function parseFeatureEvidenceContext(body: any): FeatureEvidenceContext {
  const { oneLiner, simplestVersion, validatedProblem, persona, confirmedPains, confirmedInsights, surprisingInsights, bustedInsights, demandSignalCount, communityFeedback } = body;
  return {
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    simplestVersion: typeof simplestVersion === 'string' ? simplestVersion : undefined,
    validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    confirmedPains: Array.isArray(confirmedPains) ? confirmedPains.filter((p: any) => typeof p === 'string' && p.trim()) : undefined,
    confirmedInsights: Array.isArray(confirmedInsights) ? confirmedInsights.filter((i: any) => typeof i === 'string' && i.trim()) : undefined,
    surprisingInsights: Array.isArray(surprisingInsights) ? surprisingInsights.filter((i: any) => typeof i === 'string' && i.trim()) : undefined,
    bustedInsights: Array.isArray(bustedInsights) ? bustedInsights.filter((i: any) => typeof i === 'string' && i.trim()) : undefined,
    demandSignalCount: typeof demandSignalCount === 'number' ? demandSignalCount : undefined,
    communityFeedback: Array.isArray(communityFeedback) ? communityFeedback.filter((t: any) => typeof t === 'string' && t.trim()) : undefined,
  };
}

// POST /shape/suggest-features — "✨ Suggest my 5 features" (Shape step
// "Shape your features"). Grounded in the same evidence as the MVP
// hypothesis feature, plus the hypothesis itself (simplestVersion from
// Step 2) so suggestions stay scoped to what the founder already decided
// to build rather than floating free of it.
router.post('/shape/suggest-features', async (req: Request, res: Response) => {
  try {
    const features = await generateFeatureSuggestions(parseFeatureEvidenceContext(req.body));
    res.json({ features });
  } catch (err: any) {
    console.error('[validation] shape/suggest-features', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /shape/check-features — "🔍 Check my features" (Shape step "Shape
// your features"). On-demand, batched check of whatever's currently in the
// founder's feature slots against their own validated evidence — catches
// scope creep on hand-typed features before they start building. Not
// auto-fired on every keystroke; the founder triggers it explicitly.
router.post('/shape/check-features', async (req: Request, res: Response) => {
  const { features } = req.body;
  if (!Array.isArray(features) || !features.filter((f: any) => typeof f === 'string' && f.trim()).length) {
    return res.status(400).json({ error: 'At least one feature is required' });
  }
  try {
    const results = await checkFeatureEvidence(
      features.filter((f: any) => typeof f === 'string'),
      parseFeatureEvidenceContext(req.body)
    );
    res.json({ results });
  } catch (err: any) {
    console.error('[validation] shape/check-features', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// Shared body parser for the pricing-suggest and check-pricing routes below.
function parsePricingContext(body: any): PricingContext {
  const { oneLiner, validatedProblem, persona, whoPays, quantifiedValue, demandSignalCount } = body;
  return {
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    whoPays: typeof whoPays === 'string' ? whoPays : undefined,
    quantifiedValue: typeof quantifiedValue === 'string' ? quantifiedValue : undefined,
    demandSignalCount: typeof demandSignalCount === 'number' ? demandSignalCount : undefined,
  };
}

// POST /shape/suggest-channels — "✨ Suggest my distribution channels"
// (Shape step "How will you reach users and charge?"). Grounded in real
// response-rate data from validation_contacts when the founder has run any
// outreach yet (same query as GET /stats/:idea_id above, inlined here so
// this stays a single request from the frontend), falling back to
// persona/problem-only reasoning otherwise.
router.post('/shape/suggest-channels', async (req: Request, res: Response) => {
  const { ideaId, oneLiner, validatedProblem, persona } = req.body;
  try {
    let outreachStats: { source: string; total: number; responded: number }[] = [];
    if (typeof ideaId === 'string' && ideaId) {
      const result = await query(
        `SELECT source,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('Replied','Call booked','Done')) as responded
         FROM validation_contacts
         WHERE user_id = $1 AND idea_id = $2
         GROUP BY source`,
        [req.userId, ideaId]
      );
      outreachStats = result.rows.map((r: any) => ({ source: r.source, total: Number(r.total), responded: Number(r.responded) }));
    }
    const channels = await generateDistributionSuggestions({
      oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
      validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      outreachStats,
    });
    res.json({ channels });
  } catch (err: any) {
    console.error('[validation] shape/suggest-channels', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /shape/suggest-pricing — "✨ Suggest pricing" (same step). Grounded in
// who-pays / quantified-value from Hone plus any signed LOI/pre-order
// demand signals from Validate — weaker evidence than features/hypothesis,
// so candidates are explicitly labeled evidence-backed vs. general pattern.
router.post('/shape/suggest-pricing', async (req: Request, res: Response) => {
  try {
    const candidates = await generatePricingSuggestions(parsePricingContext(req.body));
    res.json({ candidates });
  } catch (err: any) {
    console.error('[validation] shape/suggest-pricing', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /shape/check-pricing — standing "sanity check" button. Checks
// whatever revenue model/price is CURRENTLY picked (whether it came from
// Sage or was hand-picked — this route doesn't know or care which) against
// the founder's own evidence.
router.post('/shape/check-pricing', async (req: Request, res: Response) => {
  const { revenueModel, pricePoint } = req.body;
  const cleanModel: string[] = Array.isArray(revenueModel) ? revenueModel.filter((m: any) => typeof m === 'string' && m.trim()) : [];
  const cleanPrice = typeof pricePoint === 'string' ? pricePoint.trim() : '';
  if (!cleanModel.length && !cleanPrice) {
    return res.status(400).json({ error: 'Pick a revenue model or price point first' });
  }
  try {
    const result = await checkPricingEvidence(cleanModel, cleanPrice, parsePricingContext(req.body));
    res.json(result);
  } catch (err: any) {
    console.error('[validation] shape/check-pricing', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// Shared body parser for the Ship "Build My MVP" build-spec generator.
function parseBuildSpecContext(body: any): BuildSpecContext {
  const { ideaName, oneLiner, validatedProblem, persona, productType, mvpHypothesis, features, outOfScope, buildApproach, distribution, revenueModel, pricePoint, payer } = body;
  const strArr = (v: any): string[] => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  return {
    ideaName: typeof ideaName === 'string' ? ideaName : undefined,
    oneLiner: typeof oneLiner === 'string' ? oneLiner : undefined,
    validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    productType: strArr(productType),
    mvpHypothesis: typeof mvpHypothesis === 'string' ? mvpHypothesis : undefined,
    features: strArr(features),
    outOfScope: strArr(outOfScope),
    buildApproach: typeof buildApproach === 'string' ? buildApproach : undefined,
    distribution: strArr(distribution),
    revenueModel: strArr(revenueModel),
    pricePoint: typeof pricePoint === 'string' ? pricePoint : undefined,
    payer: typeof payer === 'string' ? payer : undefined,
  };
}

// POST /ship/build-spec — "Build My MVP" (Ship Step 1). Assembles the
// founder's entire validated journey (Hone → Validate → Shape) into a
// single AI-generated Build Specification: product definition, MVP
// hypothesis + user journey, feature list + explicit scope cuts, technical
// requirements, and an ordered build sequence. Everything downstream in
// Ship (tool recommendation, UI prompts, master prompt, per-feature coding
// prompts) is generated FROM this spec, so it's the one place accuracy
// matters most — hence the low temperature and heavy sanitization.
router.post('/ship/build-spec', async (req: Request, res: Response) => {
  try {
    const spec = await generateBuildSpec(parseBuildSpecContext(req.body));
    res.json({ spec });
  } catch (err: any) {
    console.error('[validation] ship/build-spec', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /ship/build-path — "Choose how you want to build" (Ship Step 2).
// Recommends ONE of app-builder / coding-env / dev-handoff based on the
// Build Spec's complexity (feature count, integrations, technical
// requirements) and the founder's self-reported coding comfort. Specific
// tool names and pricing are NOT generated here — they're a curated static
// list on the frontend, since a local LLM inventing product names or
// dollar figures is exactly the kind of confidently-wrong output founders
// might actually act on.
router.post('/ship/build-path', async (req: Request, res: Response) => {
  const { featureCount, integrationsCount, appType, database, authentication, payments, buildApproach, technicalConfidence } = req.body;
  try {
    const ctx: BuildPathContext = {
      featureCount: typeof featureCount === 'number' ? featureCount : undefined,
      integrationsCount: typeof integrationsCount === 'number' ? integrationsCount : undefined,
      appType: typeof appType === 'string' ? appType : undefined,
      database: typeof database === 'string' ? database : undefined,
      authentication: typeof authentication === 'string' ? authentication : undefined,
      payments: typeof payments === 'string' ? payments : undefined,
      buildApproach: typeof buildApproach === 'string' ? buildApproach : undefined,
      technicalConfidence: typeof technicalConfidence === 'string' ? technicalConfidence : undefined,
    };
    const recommendation = await recommendBuildPath(ctx);
    res.json(recommendation);
  } catch (err: any) {
    console.error('[validation] ship/build-path', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /ship/flows-screens — "Map your user flows & screens" (Ship Step 3).
// Turns the accepted Build Spec's feature list into the minimum set of
// primary user journeys and a screen inventory, each screen mapped back to
// the feature(s) it serves. Feeds directly into the UI Prompt Generator.
router.post('/ship/flows-screens', async (req: Request, res: Response) => {
  const { ideaName, featureList, coreUserJourney, appType, authentication, payments } = req.body;
  const strArr = (v: any): string[] => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  try {
    const ctx: FlowScreenContext = {
      ideaName: typeof ideaName === 'string' ? ideaName : undefined,
      featureList: strArr(featureList),
      coreUserJourney: strArr(coreUserJourney),
      appType: typeof appType === 'string' ? appType : undefined,
      authentication: typeof authentication === 'string' ? authentication : undefined,
      payments: typeof payments === 'string' ? payments : undefined,
    };
    const map = await generateFlowsAndScreens(ctx);
    res.json(map);
  } catch (err: any) {
    console.error('[validation] ship/flows-screens', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /ship/ui-prompt — "Generate your UI prompts" (Ship Step 4). One
// implementation-ready coding prompt for a single screen, covering role,
// product context, target user, screen purpose + CTA, required components,
// empty/loading/error states, responsive, accessibility, no-scope-creep,
// and acceptance criteria. Called once per screen from the frontend.
router.post('/ship/ui-prompt', async (req: Request, res: Response) => {
  const { ideaName, validatedProblem, persona, appType, authentication, payments, outOfScope, screenName, screenPurpose, screenCategory, screenFeatures } = req.body;
  const strArr = (v: any): string[] => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  if (typeof screenName !== 'string' || !screenName.trim()) {
    res.status(400).json({ error: 'A screen name is required.' });
    return;
  }
  try {
    const ctx: UIPromptContext = {
      ideaName: typeof ideaName === 'string' ? ideaName : undefined,
      validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      appType: typeof appType === 'string' ? appType : undefined,
      authentication: typeof authentication === 'string' ? authentication : undefined,
      payments: typeof payments === 'string' ? payments : undefined,
      outOfScope: strArr(outOfScope),
      screenName: screenName.trim(),
      screenPurpose: typeof screenPurpose === 'string' ? screenPurpose : '',
      screenCategory: typeof screenCategory === 'string' ? screenCategory : '',
      screenFeatures: strArr(screenFeatures),
    };
    const prompt = await generateUIPrompt(ctx);
    res.json({ prompt });
  } catch (err: any) {
    console.error('[validation] ship/ui-prompt', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /ship/feature-build-card — "Build your features" (Ship Step 6). One
// Build Card for a single feature from the accepted Build Spec's feature
// list: user story, why it matters, UI/user flow, data & business logic,
// edge cases, and acceptance criteria. Called once per feature from the
// frontend. The coding prompt and QA prompt derived from a card are
// assembled client-side, not generated here.
router.post('/ship/feature-build-card', async (req: Request, res: Response) => {
  const { ideaName, featureName, featureList, validatedProblem, persona, appType, outOfScope } = req.body;
  const strArr = (v: any): string[] => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  if (typeof featureName !== 'string' || !featureName.trim()) {
    res.status(400).json({ error: 'A feature name is required.' });
    return;
  }
  try {
    const ctx: FeatureBuildCardContext = {
      ideaName: typeof ideaName === 'string' ? ideaName : undefined,
      featureName: featureName.trim(),
      featureList: strArr(featureList),
      validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      appType: typeof appType === 'string' ? appType : undefined,
      outOfScope: strArr(outOfScope),
    };
    const card = await generateFeatureBuildCard(ctx);
    res.json({ card });
  } catch (err: any) {
    console.error('[validation] ship/feature-build-card', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

// POST /ship/vibe-coach — "Describe your next change" (Vibe Coding Coach,
// Ship Step 7). Turns a founder's plain-language change request, tagged
// with a change category, into an implementation-ready coding prompt for
// an existing MVP. Called once per change request from the frontend.
router.post('/ship/vibe-coach', async (req: Request, res: Response) => {
  const { ideaName, validatedProblem, persona, appType, featureList, outOfScope, category, description } = req.body;
  const strArr = (v: any): string[] => Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  if (typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ error: 'A description of the change is required.' });
    return;
  }
  try {
    const ctx: ChangeCoachContext = {
      ideaName: typeof ideaName === 'string' ? ideaName : undefined,
      validatedProblem: typeof validatedProblem === 'string' ? validatedProblem : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
      appType: typeof appType === 'string' ? appType : undefined,
      featureList: strArr(featureList),
      outOfScope: strArr(outOfScope),
      category: typeof category === 'string' && category.trim() ? category.trim() : 'Add a feature',
      description: description.trim(),
    };
    const prompt = await generateChangeCodingPrompt(ctx);
    res.json({ prompt });
  } catch (err: any) {
    console.error('[validation] ship/vibe-coach', err?.response?.data || err);
    res.status(502).json({ error: err?.message || 'Could not reach the AI right now — please try again.' });
  }
});

export default router;
