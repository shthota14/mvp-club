import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { createJitsiMeeting, createTeamsMeeting, teamsConfigured, formatMeetingName } from '../utils/meeting';
import { sendInterviewInviteEmail, sendOrganizerCalendarInvite } from '../utils/mailer';
import { createNotification } from '../utils/notify';
import { DEFAULT_QUESTIONS, extForMime } from '../utils/interviewQuestions';
import { classifyInterviewAlignment, reasonAboutAlignment, AlignmentQA, AlignmentChatTurn } from '../utils/aiQuestionCheck';

const router = express.Router();
router.use(requireAuth);

// ── Interviews ────────────────────────────────────────────────────────────────

// GET /api/interviews/summary?idea_id=X
router.get('/summary', async (req: Request, res: Response) => {
  const { idea_id } = req.query;
  if (!idea_id) return res.status(400).json({ error: 'idea_id required' });
  const result = await query(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
       COUNT(*) FILTER (WHERE alignment_score = 3)::int as confirmed,
       COUNT(*) FILTER (WHERE alignment_score = 2)::int as partial,
       COUNT(*) FILTER (WHERE alignment_score = 1)::int as not_confirmed,
       array_agg(key_insights ORDER BY created_at DESC) FILTER (WHERE key_insights IS NOT NULL AND key_insights != '') as insights
     FROM interviews
     WHERE idea_id = $1 AND user_id = $2`,
    [idea_id, req.userId]
  );
  res.json(result.rows[0]);
});

// GET /api/interviews?idea_id=X
router.get('/', async (req: Request, res: Response) => {
  const { idea_id } = req.query;
  if (!idea_id) return res.status(400).json({ error: 'idea_id required' });

  // Primary: exact idea_id match
  const result = await query(
    `SELECT * FROM interviews
     WHERE idea_id = $1 AND user_id = $2
     ORDER BY scheduled_at ASC NULLS LAST, created_at DESC`,
    [idea_id, req.userId]
  );

  // If no rows found, also try legacy interviews where idea_id was never set
  // (created before idea_id tracking was added — associate them on the fly)
  if (result.rows.length === 0) {
    const orphaned = await query(
      `SELECT * FROM interviews
       WHERE idea_id IS NULL AND user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    if (orphaned.rows.length > 0) {
      // Silently back-fill idea_id so they appear correctly next time
      await query(
        `UPDATE interviews SET idea_id = $1 WHERE idea_id IS NULL AND user_id = $2`,
        [idea_id, req.userId]
      );
      return res.json(orphaned.rows.map((r: any) => ({ ...r, idea_id })));
    }
  }

  res.json(result.rows);
});

// GET /api/interviews/providers — which meeting platforms are configured
router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    jitsi: true, // public meet.jit.si -- always available, no config needed
    teams: teamsConfigured(),
    smtp:  !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  });
});

// POST /api/interviews
router.post('/', async (req: Request, res: Response) => {
  const { idea_id, interviewee_name, interviewee_role, interviewee_email, scheduled_at, meeting_provider, meeting_link, validation_contact_id, questions } = req.body;
  if (!idea_id || !interviewee_name) return res.status(400).json({ error: 'idea_id and interviewee_name required' });

  try {
    // Try full insert (incl. the validation_contact_id link, added by add-scheduling.sql) and
    // fall back a tier at a time if the relevant migration(s) haven't run yet, so adding
    // someone to interview from their contact card still works before the migration is applied
    // — it just won't be linked back to the contact until then.
    let ivResult;
    try {
      ivResult = await query(
        `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_role, interviewee_email, scheduled_at, meeting_provider, meeting_link, validation_contact_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [idea_id, req.userId, interviewee_name, interviewee_role || '', interviewee_email || '', scheduled_at || null, meeting_provider || '', meeting_link || '', validation_contact_id || null]
      );
    } catch (colErr: unknown) {
      const msg = (colErr as { message?: string })?.message || '';
      if (msg.includes('column') && msg.includes('validation_contact_id')) {
        // add-scheduling.sql hasn't run — retry without the link column
        try {
          ivResult = await query(
            `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_role, interviewee_email, scheduled_at, meeting_provider, meeting_link)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [idea_id, req.userId, interviewee_name, interviewee_role || '', interviewee_email || '', scheduled_at || null, meeting_provider || '', meeting_link || '']
          );
        } catch (colErr2: unknown) {
          const msg2 = (colErr2 as { message?: string })?.message || '';
          if (msg2.includes('column') && (msg2.includes('interviewee_email') || msg2.includes('meeting_provider'))) {
            ivResult = await query(
              `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_role, scheduled_at)
               VALUES ($1, $2, $3, $4, $5) RETURNING *`,
              [idea_id, req.userId, interviewee_name, interviewee_role || '', scheduled_at || null]
            );
          } else {
            throw colErr2;
          }
        }
      } else if (msg.includes('column') && (msg.includes('interviewee_email') || msg.includes('meeting_provider'))) {
        // Migration not yet run — insert without new columns
        ivResult = await query(
          `INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_role, scheduled_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [idea_id, req.userId, interviewee_name, interviewee_role || '', scheduled_at || null]
        );
      } else {
        throw colErr;
      }
    }
    const interview = ivResult.rows[0];

    // Seed questions — the founder's own interview script when supplied,
    // otherwise the generic default bank (unchanged behavior for other callers).
    const seedQuestions: string[] = Array.isArray(questions) && questions.length
      ? questions.filter((q: unknown) => typeof q === 'string' && q.trim())
      : DEFAULT_QUESTIONS;
    for (let i = 0; i < seedQuestions.length; i++) {
      await query(
        `INSERT INTO interview_questions (interview_id, question, order_index) VALUES ($1, $2, $3)`,
        [interview.id, seedQuestions[i], i]
      );
    }

    res.status(201).json(interview);
  } catch (err) {
    console.error('[interviews] POST', err);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// POST /api/interviews/:id/book-meeting — create meeting + send invites
router.post('/:id/book-meeting', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Fetch interview + idea + user
    const ivRes = await query(
      `SELECT iv.*, i.name AS idea_name, u.name AS organizer_name, u.email AS organizer_email
       FROM interviews iv
       JOIN ideas i ON i.id = iv.idea_id
       JOIN users u ON u.id = iv.user_id
       WHERE iv.id = $1 AND iv.user_id = $2`,
      [id, req.userId]
    );
    if (!ivRes.rows.length) return res.status(404).json({ error: 'Interview not found' });

    const iv = ivRes.rows[0] as {
      id: string; interviewee_name: string; interviewee_email: string;
      scheduled_at: string; meeting_provider: string; meeting_link: string;
      idea_name: string; organizer_name: string; organizer_email: string;
    };

    if (!iv.scheduled_at) return res.status(400).json({ error: 'Interview must have a scheduled time' });

    const startTime = new Date(iv.scheduled_at);
    const endTime   = new Date(startTime.getTime() + 45 * 60 * 1000); // 45 mins default

    let meetingLink = iv.meeting_link;
    let meetingId   = '';
    let meetingProvider = iv.meeting_provider;

    // Auto-create a meeting link if one doesn't already exist. 'zoom' here
    // covers legacy interview rows created before this switched to Jitsi --
    // treated the same as no provider at all, since Jitsi is now the default.
    if ((!iv.meeting_provider || iv.meeting_provider === 'zoom') && !meetingLink) {
      const jm = createJitsiMeeting({ topic: formatMeetingName({
        ideaName: iv.idea_name,
        intervieweeName: iv.interviewee_name || 'Guest',
        organizerName: iv.organizer_name || 'Founder',
        startTime,
      }) });
      meetingLink = jm.joinUrl;
      meetingId   = jm.meetingId;
      meetingProvider = 'jitsi';
    } else if (iv.meeting_provider === 'teams' && teamsConfigured()) {
      const tm = await createTeamsMeeting({
        subject: formatMeetingName({
          ideaName: iv.idea_name,
          intervieweeName: iv.interviewee_name || 'Guest',
          organizerName: iv.organizer_name || 'Founder',
          startTime,
        }),
        startTime: startTime.toISOString(),
        endTime:   endTime.toISOString(),
        organizerEmail: iv.organizer_email,
      });
      meetingLink = tm.joinUrl;
      meetingId   = tm.meetingId;
    }

    // Save meeting link back to DB (meeting_provider too, so a legacy 'zoom'
    // row that just got a fresh Jitsi link stops being mislabeled afterwards)
    await query(
      `UPDATE interviews SET meeting_link = $1, meeting_id = $2, meeting_provider = $3, invite_sent_at = NOW() WHERE id = $4`,
      [meetingLink, meetingId, meetingProvider, id]
    );

    // Send .ics email to interviewee (if email provided). Both sends are independent
    // and each wrapped in its own try/catch: the meeting link is already saved above,
    // so a mail hiccup here must never turn an already-booked meeting into a 500 for
    // the founder — and the organizer's own confirmation no longer depends on the
    // interviewee's invite having succeeded (previously it was skipped whenever that
    // first send failed or the contact had no email, so the founder never heard back).
    let icsContent: string | null = null;
    if (iv.interviewee_email) {
      try {
        icsContent = await sendInterviewInviteEmail({
          organizerName:    iv.organizer_name,
          organizerEmail:   iv.organizer_email,
          intervieweeName:  iv.interviewee_name,
          intervieweeEmail: iv.interviewee_email,
          ideaName:         iv.idea_name,
          startTime,
          endTime,
          meetingLink,
          meetingProvider:  meetingProvider,
        });
      } catch (mailErr) {
        console.error('[interviews] book-meeting: failed to send interviewee invite -- booking still confirmed', mailErr);
      }
    }

    // Send confirmation + .ics to organiser
    try {
      await sendOrganizerCalendarInvite({
        organizerName:   iv.organizer_name,
        organizerEmail:  iv.organizer_email,
        intervieweeName: iv.interviewee_name,
        intervieweeEmail: iv.interviewee_email || undefined,
        ideaName:        iv.idea_name,
        startTime,
        endTime,
        meetingLink,
        meetingProvider: meetingProvider,
        icsContent: icsContent || undefined,
      });
    } catch (mailErr) {
      console.error('[interviews] book-meeting: failed to send organizer confirmation -- booking still confirmed', mailErr);
    }

    // In-app bell alert -- same as the self-serve booking flow in
    // scheduling.ts, just triggered by the founder clicking "book meeting"
    // manually here instead of a contact booking a slot themselves.
    await createNotification(
      req.userId!,
      'meeting_booked',
      `📅 Meeting link ready — ${iv.interviewee_name || 'your interview'}`,
      `${startTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — about "${iv.idea_name}"`,
      meetingLink || null
    );

    const updated = await query(`SELECT * FROM interviews WHERE id = $1`, [id]);
    res.json({ interview: updated.rows[0], meetingLink, inviteSent: !!iv.interviewee_email });
  } catch (err) {
    console.error('[interviews] book-meeting', err);
    res.status(500).json({ error: 'Failed to book meeting' });
  }
});

// PATCH /api/interviews/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { interviewee_name, interviewee_role, interviewee_email, scheduled_at, status, notes, key_insights, meeting_provider, meeting_link, alignment_score, confirmed_problem } = req.body;

  try {
    let result;
    try {
      // Tier 1 (full schema, incl. add-interview-ai-classification.sql):
      // when the caller explicitly sets alignment_score (the manual
      // override buttons), recompute score_overridden by comparing it to
      // whatever the AI's own ai_alignment_score currently is — true only
      // when they genuinely differ, false if the founder picked the same
      // bucket the AI already had (or reverted back to it). Leaves
      // score_overridden untouched on any PATCH that doesn't touch
      // alignment_score (e.g. saving notes) so re-classification later
      // never has to guess whether a prior save was a real override.
      result = await query(
        `UPDATE interviews SET
           interviewee_name  = COALESCE($1, interviewee_name),
           interviewee_role  = COALESCE($2, interviewee_role),
           scheduled_at      = COALESCE($3, scheduled_at),
           status            = COALESCE($4, status),
           notes             = COALESCE($5, notes),
           key_insights      = COALESCE($6, key_insights),
           interviewee_email = COALESCE($9, interviewee_email),
           meeting_provider  = COALESCE($10, meeting_provider),
           meeting_link      = COALESCE($11, meeting_link),
           alignment_score   = COALESCE($12, alignment_score),
           confirmed_problem = COALESCE($13, confirmed_problem),
           score_overridden  = CASE
             WHEN $12::int IS NOT NULL AND ai_alignment_score IS NOT NULL THEN ($12::int IS DISTINCT FROM ai_alignment_score)
             WHEN $12::int IS NOT NULL THEN false
             ELSE score_overridden
           END,
           updated_at        = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [interviewee_name, interviewee_role, scheduled_at, status, notes, key_insights, id, req.userId, interviewee_email, meeting_provider, meeting_link, alignment_score ?? null, confirmed_problem ?? null]
      );
    } catch (colErr: unknown) {
      const msg = (colErr as { message?: string })?.message || '';
      if (msg.includes('column') && (msg.includes('ai_alignment_score') || msg.includes('score_overridden'))) {
        // Tier 2: add-interview-alignment.sql has run but
        // add-interview-ai-classification.sql hasn't yet — update without
        // touching the AI-only columns.
        try {
          result = await query(
            `UPDATE interviews SET
               interviewee_name  = COALESCE($1, interviewee_name),
               interviewee_role  = COALESCE($2, interviewee_role),
               scheduled_at      = COALESCE($3, scheduled_at),
               status            = COALESCE($4, status),
               notes             = COALESCE($5, notes),
               key_insights      = COALESCE($6, key_insights),
               interviewee_email = COALESCE($9, interviewee_email),
               meeting_provider  = COALESCE($10, meeting_provider),
               meeting_link      = COALESCE($11, meeting_link),
               alignment_score   = COALESCE($12, alignment_score),
               confirmed_problem = COALESCE($13, confirmed_problem),
               updated_at        = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [interviewee_name, interviewee_role, scheduled_at, status, notes, key_insights, id, req.userId, interviewee_email, meeting_provider, meeting_link, alignment_score ?? null, confirmed_problem ?? null]
          );
        } catch (colErr2: unknown) {
          const msg2 = (colErr2 as { message?: string })?.message || '';
          if (msg2.includes('column') && (msg2.includes('interviewee_email') || msg2.includes('meeting_provider') || msg2.includes('alignment_score'))) {
            result = await query(
              `UPDATE interviews SET
                 interviewee_name = COALESCE($1, interviewee_name),
                 interviewee_role = COALESCE($2, interviewee_role),
                 scheduled_at     = COALESCE($3, scheduled_at),
                 status           = COALESCE($4, status),
                 notes            = COALESCE($5, notes),
                 key_insights     = COALESCE($6, key_insights),
                 updated_at       = NOW()
               WHERE id = $7 AND user_id = $8
               RETURNING *`,
              [interviewee_name, interviewee_role, scheduled_at, status, notes, key_insights, id, req.userId]
            );
          } else {
            throw colErr2;
          }
        }
      } else if (msg.includes('column') && (msg.includes('interviewee_email') || msg.includes('meeting_provider') || msg.includes('alignment_score'))) {
        // Tier 3: no migrations at all — update base columns only
        result = await query(
          `UPDATE interviews SET
             interviewee_name = COALESCE($1, interviewee_name),
             interviewee_role = COALESCE($2, interviewee_role),
             scheduled_at     = COALESCE($3, scheduled_at),
             status           = COALESCE($4, status),
             notes            = COALESCE($5, notes),
             key_insights     = COALESCE($6, key_insights),
             updated_at       = NOW()
           WHERE id = $7 AND user_id = $8
           RETURNING *`,
          [interviewee_name, interviewee_role, scheduled_at, status, notes, key_insights, id, req.userId]
        );
      } else {
        throw colErr;
      }
    }
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[interviews] PATCH', err);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// POST /api/interviews/:id/ai-classify — run (or re-run) the AI's alignment
// classification for one interview's Q&A transcript. Called automatically
// right after a founder finishes logging a conversation (see WorkPage's
// classifyInterview helper), and also exposed as a manual "🤖 Analyze with
// AI" retry in the UI for interviews logged before this feature existed, or
// if the automatic call failed (e.g. Ollama wasn't reachable yet).
router.post('/:id/ai-classify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { problemSentence, painPoints, assumptions, persona, qa } = req.body as { problemSentence?: string; painPoints?: string[]; assumptions?: string[]; persona?: string; qa?: AlignmentQA[] };

  const cleanQa: AlignmentQA[] = Array.isArray(qa)
    ? qa.filter((r): r is AlignmentQA => !!r && typeof r.question === 'string' && typeof r.answer === 'string' && r.answer.trim().length > 0)
    : [];
  if (!cleanQa.length) return res.status(400).json({ error: 'No answered questions to classify yet' });

  try {
    const ivRes = await query(`SELECT * FROM interviews WHERE id = $1 AND user_id = $2`, [id, req.userId]);
    if (!ivRes.rows.length) return res.status(404).json({ error: 'Interview not found' });
    const iv = ivRes.rows[0] as { interviewee_name?: string; interviewee_role?: string };

    const classification = await classifyInterviewAlignment({
      problemSentence,
      painPoints,
      assumptions,
      persona,
      intervieweeName: iv.interviewee_name,
      intervieweeRole: iv.interviewee_role,
      qa: cleanQa,
    });

    let updated;
    try {
      // Only auto-set the founder-facing alignment_score/confirmed_problem
      // when they haven't already manually overridden it away from a prior
      // AI read (score_overridden) — a brand-new interview gets the AI's
      // score as its badge, but a founder's explicit override is never
      // silently replaced by a later (re-)classification.
      updated = await query(
        `UPDATE interviews SET
           ai_alignment_score = $1,
           ai_reasoning        = $2,
           ai_evidence          = $3::jsonb,
           alignment_score      = CASE WHEN score_overridden THEN alignment_score ELSE $1 END,
           confirmed_problem    = CASE WHEN score_overridden THEN confirmed_problem ELSE ($1 = 3) END,
           updated_at           = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [classification.score, classification.reasoning, JSON.stringify(classification.evidence), id, req.userId]
      );
    } catch (colErr: unknown) {
      const msg = (colErr as { message?: string })?.message || '';
      if (msg.includes('column') && msg.includes('ai_alignment_score')) {
        return res.status(503).json({ error: 'The add-interview-ai-classification.sql migration needs to be run before AI classification can be saved.' });
      }
      throw colErr;
    }

    res.json({ interview: updated.rows[0], classification });
  } catch (err: any) {
    console.error('[interviews] ai-classify', err);
    res.status(500).json({ error: err?.message || 'Failed to classify interview' });
  }
});

// POST /api/interviews/:id/ai-reason — "reason with the AI": the founder
// pushes back on (or asks about) the AI's classification, and the AI
// replies, possibly revising its score/reasoning if genuinely persuaded.
// Requires the interview to already have an AI classification (i.e.
// ai-classify has run at least once).
router.post('/:id/ai-reason', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, problemSentence, persona, qa } = req.body as { message?: string; problemSentence?: string; persona?: string; qa?: AlignmentQA[] };
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  const cleanQa: AlignmentQA[] = Array.isArray(qa)
    ? qa.filter((r): r is AlignmentQA => !!r && typeof r.question === 'string' && typeof r.answer === 'string' && r.answer.trim().length > 0)
    : [];

  try {
    const ivRes = await query(`SELECT * FROM interviews WHERE id = $1 AND user_id = $2`, [id, req.userId]);
    if (!ivRes.rows.length) return res.status(404).json({ error: 'Interview not found' });
    const iv = ivRes.rows[0] as {
      interviewee_name?: string; interviewee_role?: string;
      ai_alignment_score?: 1 | 2 | 3 | null; ai_reasoning?: string | null; ai_chat_log?: AlignmentChatTurn[] | null;
    };
    if (iv.ai_alignment_score == null) {
      return res.status(400).json({ error: 'This interview has not been AI-classified yet — run "Analyze with AI" first.' });
    }

    const history: AlignmentChatTurn[] = Array.isArray(iv.ai_chat_log) ? iv.ai_chat_log : [];
    const result = await reasonAboutAlignment({
      problemSentence,
      persona,
      intervieweeName: iv.interviewee_name,
      intervieweeRole: iv.interviewee_role,
      qa: cleanQa,
      priorScore: iv.ai_alignment_score,
      priorReasoning: iv.ai_reasoning || '',
      history,
      founderMessage: message.trim(),
    });

    const newHistory: AlignmentChatTurn[] = [
      ...history,
      { role: 'founder', text: message.trim() },
      { role: 'ai', text: result.reply },
    ];
    const revised = result.updatedScore != null;

    const updated = await query(
      `UPDATE interviews SET
         ai_chat_log        = $1::jsonb,
         ai_alignment_score = COALESCE($2, ai_alignment_score),
         ai_reasoning        = COALESCE($3, ai_reasoning),
         alignment_score      = CASE WHEN $2::int IS NOT NULL AND NOT score_overridden THEN $2::int ELSE alignment_score END,
         confirmed_problem    = CASE WHEN $2::int IS NOT NULL AND NOT score_overridden THEN ($2::int = 3) ELSE confirmed_problem END,
         updated_at           = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [JSON.stringify(newHistory), result.updatedScore, result.updatedReasoning, id, req.userId]
    );

    res.json({ interview: updated.rows[0], reply: result.reply, revised });
  } catch (err: any) {
    console.error('[interviews] ai-reason', err);
    res.status(500).json({ error: err?.message || 'Failed to reason with AI' });
  }
});

// DELETE /api/interviews/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await query(`DELETE FROM interviews WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
  res.json({ ok: true });
});

// ── Audio recordings ──────────────────────────────────────────────────────────
// Whole-interview recordings (question_n null) and per-question voice notes.
// Files live on the uploads volume; rows in interview_recordings.

const RECORDINGS_DIR = path.join(process.env.UPLOADS_DIR || '/app/uploads', 'recordings');
try { fs.mkdirSync(RECORDINGS_DIR, { recursive: true }); } catch { /* readonly fs in some envs */ }

// POST /api/interviews/:id/recordings — raw audio body (audio/*), ?question_n=&duration_ms=
router.post('/:id/recordings',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '40mb' }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const questionN = req.query.question_n != null && req.query.question_n !== '' ? parseInt(String(req.query.question_n), 10) : null;
    const durationMs = req.query.duration_ms ? parseInt(String(req.query.duration_ms), 10) : null;
    const mime = String(req.headers['content-type'] || 'audio/webm');
    const body = req.body as Buffer;
    if (!body || !body.length) return res.status(400).json({ error: 'Empty audio body' });

    try {
      const iv = await query('SELECT id FROM interviews WHERE id = $1 AND user_id = $2', [id, req.userId]);
      if (!iv.rows.length) return res.status(404).json({ error: 'Interview not found' });

      const rid = crypto.randomUUID();
      const filename = `${rid}.${extForMime(mime)}`;
      fs.writeFileSync(path.join(RECORDINGS_DIR, filename), body);

      const result = await query(
        `INSERT INTO interview_recordings (id, interview_id, user_id, question_n, mime, filename, duration_ms, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [rid, id, req.userId, questionN, mime, filename, durationMs, body.length]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[interviews] recording upload', err);
      res.status(500).json({ error: 'Failed to save recording (has the add-interview-recordings.sql migration run?)' });
    }
  }
);

// GET /api/interviews/:id/recordings — list for one interview
router.get('/:id/recordings', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, interview_id, question_n, mime, duration_ms, size_bytes, created_at
       FROM interview_recordings WHERE interview_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [req.params.id, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[interviews] recordings list', err);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// GET /api/interviews/recordings/:rid/audio — stream the audio file
router.get('/recordings/:rid/audio', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT filename, mime FROM interview_recordings WHERE id = $1 AND user_id = $2',
      [req.params.rid, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Recording not found' });
    const { filename, mime } = result.rows[0];
    const filePath = path.join(RECORDINGS_DIR, path.basename(filename));
    if (!fs.existsSync(filePath)) return res.status(410).json({ error: 'Audio file missing from storage' });
    res.setHeader('Content-Type', mime || 'audio/webm');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[interviews] recording stream', err);
    res.status(500).json({ error: 'Failed to stream recording' });
  }
});

// DELETE /api/interviews/recordings/:rid
router.delete('/recordings/:rid', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM interview_recordings WHERE id = $1 AND user_id = $2 RETURNING filename',
      [req.params.rid, req.userId]
    );
    if (result.rows.length) {
      try { fs.unlinkSync(path.join(RECORDINGS_DIR, path.basename(result.rows[0].filename))); } catch { /* already gone */ }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[interviews] recording delete', err);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

// ── Questions ─────────────────────────────────────────────────────────────────

// GET /api/interviews/:id/questions
router.get('/:id/questions', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT iq.* FROM interview_questions iq
     JOIN interviews iv ON iv.id = iq.interview_id
     WHERE iq.interview_id = $1 AND iv.user_id = $2
     ORDER BY iq.order_index ASC, iq.created_at ASC`,
    [req.params.id, req.userId]
  );
  res.json(result.rows);
});

// POST /api/interviews/:id/questions
router.post('/:id/questions', async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  const orderResult = await query(
    `SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM interview_questions WHERE interview_id = $1`,
    [req.params.id]
  );
  const next = orderResult.rows[0].next;

  const result = await query(
    `INSERT INTO interview_questions (interview_id, question, order_index) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, question, next]
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /api/interviews/:id/questions/:qid
router.patch('/:id/questions/:qid', async (req: Request, res: Response) => {
  const { question, answer } = req.body;
  const result = await query(
    `UPDATE interview_questions SET
       question = COALESCE($1, question),
       answer   = COALESCE($2, answer)
     WHERE id = $3
     RETURNING *`,
    [question, answer, req.params.qid]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// DELETE /api/interviews/:id/questions/:qid
router.delete('/:id/questions/:qid', async (req: Request, res: Response) => {
  await query(`DELETE FROM interview_questions WHERE id = $1`, [req.params.qid]);
  res.json({ ok: true });
});

export default router;
