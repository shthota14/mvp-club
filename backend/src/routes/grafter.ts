import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { fetchUrl, runGrafterJob } from '../grafter/researchGateway';
import { buildBrian } from '../grafter/brainBuilder';
import { buildIcp } from '../grafter/icpBuilder';
import { enqueueGrafterJob } from '../grafter/queue';
import { buildSearchFilters } from '../grafter/searchFilters';
import { findContactForCompany } from '../grafter/contactFinder';
import { draftEmail, buildDisclosureFooter } from '../grafter/outreachDraft';
import { sendGmailMessage } from '../grafter/gmail';

const router = Router();
router.use(requireAuth);

// -- GRF-12: entitlement-check stub -------------------------------------------
// Always allows, for v1. The one place a future paywall (see the PRD's
// Monetization section) would plug in an actual check without touching
// every call site that has to gate on it.
function hasGrafterEntitlement(_userId: string): boolean {
  return true;
}

// -- GET /api/grafter/status --------------------------------------------------
// Tells the frontend whether this founder already has an idea Grafter can
// attach to. Used by GrafterPage on mount to decide whether to show the
// "what are you building" form (GRF-5's "no ideas" case) or skip straight
// to the website question against their existing idea.
router.get('/status', async (req: Request, res: Response) => {
  try {
    const result = await query<{ id: string; name: string; stage: string }>(
      `SELECT id, name, stage FROM ideas WHERE user_id = $1
       ORDER BY is_active DESC, updated_at DESC LIMIT 1`,
      [req.userId]
    );
    res.json({ idea: result.rows[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const StartSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  website: z.string().min(3).max(500),
});

// -- POST /api/grafter/start ---------------------------------------------------
// GRF-5: if the founder has no ideas row at all, creates a minimal one
// (name + stage='idea') with no extra screen -- the name comes from this
// same request, not a separate onboarding flow. GRF-6: fetches the given
// website through research-gateway and caches it, logging a grafter_run
// row either way. A fetch failure (bad URL, site down, robots.txt) is not
// a request failure -- Grafter still has an idea to work with; the frontend
// shows that the fetch didn't land instead of blocking the founder here.
router.post('/start', async (req: Request, res: Response) => {
  if (!hasGrafterEntitlement(req.userId!)) { res.status(403).json({ error: 'Grafter is not available on this account' }); return; }
  const parse = StartSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  const { name, website } = parse.data;

  try {
    const existing = await query<{ id: string; name: string; stage: string }>(
      `SELECT id, name, stage FROM ideas WHERE user_id = $1
       ORDER BY is_active DESC, updated_at DESC LIMIT 1`,
      [req.userId]
    );

    let idea = existing.rows[0];
    if (!idea) {
      if (!name) { res.status(400).json({ error: 'name is required for a first idea' }); return; }
      const created = await query<{ id: string; name: string; stage: string }>(
        `INSERT INTO ideas (user_id, name, description, stage, idea_status, is_active, moderation_status)
         VALUES ($1, $2, '', 'idea', 'active', TRUE, 'pending') RETURNING id, name, stage`,
        [req.userId, name]
      );
      idea = created.rows[0];
    }

    let fetched: { ok: boolean; cached: boolean; error?: string; statusCode?: number };
    try {
      fetched = await runGrafterJob(idea.id, 'fetch_site', { website }, async () => {
        const result = await fetchUrl(website);
        if (!result.ok) throw new Error(result.error ?? 'Fetch failed');
        return { ok: true, cached: result.cached, statusCode: result.statusCode };
      });
    } catch (err) {
      fetched = { ok: false, cached: false, error: err instanceof Error ? err.message : 'Fetch failed' };
    }

    res.json({ idea, fetched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// -- Brian: GRF-7/8/9/10 ------------------------------------------------------

interface BrianRow {
  id: string;
  idea_id: string;
  version: number;
  status: 'draft' | 'approved';
  fields: Record<string, { value: string; sources: string[] }>;
  needs_manual_input: boolean;
  created_at: string;
  approved_at: string | null;
}

async function getFounderIdea(userId: string): Promise<{ id: string; name: string; stage: string } | null> {
  const result = await query<{ id: string; name: string; stage: string }>(
    `SELECT id, name, stage FROM ideas WHERE user_id = $1
     ORDER BY is_active DESC, updated_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

async function getLatestBrian(ideaId: string): Promise<BrianRow | null> {
  const result = await query<BrianRow>(
    `SELECT * FROM grafter_company_brain WHERE idea_id = $1 ORDER BY version DESC LIMIT 1`,
    [ideaId]
  );
  return result.rows[0] ?? null;
}

async function getValidationAnswers(ideaId: string): Promise<{ icpJobs?: string; icpFrustrations?: string; icpAlternatives?: string }> {
  const result = await query<{ field_key: string; content: string | null }>(
    `SELECT field_key, content FROM stage_entries
     WHERE idea_id = $1 AND field_key IN ('icpJobs','icpFrustrations','icpAlternatives')`,
    [ideaId]
  );
  const answers: Record<string, string> = {};
  for (const row of result.rows) {
    if (row.content && row.content.trim()) answers[row.field_key] = row.content.trim();
  }
  return answers;
}

// GET /api/grafter/brain — the founder's latest Brian version, if any, plus
// whether they have Hone/Validate answers Grafter can build from (so the
// frontend knows which flow to offer before the founder even clicks build).
router.get('/brain', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.json({ brain: null, hasValidationData: false }); return; }
    const [brian, answers] = await Promise.all([getLatestBrian(idea.id), getValidationAnswers(idea.id)]);
    const hasValidationData = Object.keys(answers).length > 0;
    res.json({ brain: brian, hasValidationData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/brain/build — GRF-7 (AI synthesis from site + Hone/
// Validate answers) or GRF-8 (no validation answers: skip the AI guess and
// hand back an empty draft for the founder to fill via PATCH instead).
// Always creates a NEW version — this is also how GRF-10's "rebuild" works,
// there's no separate rebuild endpoint. GRF-11: every call logs a
// grafter_run row, even the manual-input path.
router.post('/brain/build', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(400).json({ error: 'Start Grafter first — no idea on file yet' }); return; }

    const lastFetch = await query<{ website: string | null }>(
      `SELECT input->>'website' AS website FROM grafter_run
       WHERE idea_id = $1 AND kind = 'fetch_site' ORDER BY started_at DESC LIMIT 1`,
      [idea.id]
    );
    const website = lastFetch.rows[0]?.website ?? null;
    if (!website) { res.status(400).json({ error: 'No website on file — go through Grafter\'s start step first' }); return; }

    const answers = await getValidationAnswers(idea.id);
    const hasValidationData = Object.keys(answers).length > 0;

    const versionResult = await query<{ next: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM grafter_company_brain WHERE idea_id = $1`,
      [idea.id]
    );
    const nextVersion = versionResult.rows[0].next;

    const built = await runGrafterJob(idea.id, 'brain_build', { website, mode: hasValidationData ? 'ai' : 'manual' }, async () => {
      if (!hasValidationData) return { needsManualInput: true, fields: {} };
      const site = await fetchUrl(website); // cached from the /start fetch — this rarely re-hits the network
      const fields = await buildBrian({
        siteContent: site.content ?? '',
        icpJobs: answers.icpJobs,
        icpFrustrations: answers.icpFrustrations,
        icpAlternatives: answers.icpAlternatives,
      });
      return { needsManualInput: false, fields };
    });

    const inserted = await query<BrianRow>(
      `INSERT INTO grafter_company_brain (idea_id, version, status, fields, needs_manual_input)
       VALUES ($1, $2, 'draft', $3, $4) RETURNING *`,
      [idea.id, nextVersion, JSON.stringify(built.fields ?? {}), built.needsManualInput]
    );
    res.status(201).json({ brain: inserted.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const BrianEditSchema = z.object({
  what_you_sell: z.string().max(300).optional(),
  who_its_for: z.string().max(300).optional(),
  pricing: z.string().max(300).optional(),
});

// PATCH /api/grafter/brain — GRF-9 (review/edit) and, doubling as the
// submit step for GRF-8's 3-question fallback: whatever field the founder
// types is saved as the current value with sources: ['founder_edit'], so
// the tag stays honest rather than still claiming 'website'/'validation_data'.
router.patch('/brain', async (req: Request, res: Response) => {
  const parse = BrianEditSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    const brian = await getLatestBrian(idea.id);
    if (!brian) { res.status(404).json({ error: 'No Brian to edit yet — build one first' }); return; }

    const fields = { ...brian.fields };
    for (const [key, value] of Object.entries(parse.data)) {
      if (value === undefined) continue;
      fields[key] = { value, sources: ['founder_edit'] };
    }
    const updated = await query<BrianRow>(
      `UPDATE grafter_company_brain SET fields = $2 WHERE id = $1 RETURNING *`,
      [brian.id, JSON.stringify(fields)]
    );
    res.json({ brain: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/brain/approve — GRF-10's approve half. Idempotent: an
// already-approved version is returned as-is rather than erroring.
router.post('/brain/approve', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    const brian = await getLatestBrian(idea.id);
    if (!brian) { res.status(404).json({ error: 'No Brian to approve yet — build one first' }); return; }
    if (brian.status === 'approved') { res.json({ brain: brian }); return; }
    const updated = await query<BrianRow>(
      `UPDATE grafter_company_brain SET status = 'approved', approved_at = NOW() WHERE id = $1 RETURNING *`,
      [brian.id]
    );
    res.json({ brain: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -- ICP: GRF-13/14/15 ---------------------------------------------------------
//
// Proposed from the APPROVED Brian only -- never built until Brian is
// approved, since an unapproved Brian might still change under the founder.
// Same versioning/edit/approve shape as Brian: build always makes a new
// version, PATCH tags edited fields 'founder_edit', approve is idempotent.
//
// getApprovedIcp is exported for GRF-18 (prospecting) to gate on once that
// job exists -- prospecting must not run without an approved ICP to match
// candidates against. No caller uses it yet.

interface IcpRow {
  id: string;
  idea_id: string;
  version: number;
  status: 'draft' | 'approved';
  fields: Record<string, { value: string; sources: string[] }>;
  created_at: string;
  approved_at: string | null;
}

async function getLatestIcp(ideaId: string): Promise<IcpRow | null> {
  const result = await query<IcpRow>(
    `SELECT * FROM grafter_icp WHERE idea_id = $1 ORDER BY version DESC LIMIT 1`,
    [ideaId]
  );
  return result.rows[0] ?? null;
}

export async function getApprovedIcp(ideaId: string): Promise<IcpRow | null> {
  const result = await query<IcpRow>(
    `SELECT * FROM grafter_icp WHERE idea_id = $1 AND status = 'approved' ORDER BY version DESC LIMIT 1`,
    [ideaId]
  );
  return result.rows[0] ?? null;
}

// GET /api/grafter/icp -- the founder's latest ICP version, if any, plus
// whether Brian is approved yet (so the frontend knows whether "build the
// ICP" is even offerable before the founder clicks it).
router.get('/icp', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.json({ icp: null, brianApproved: false }); return; }
    const [icp, brian] = await Promise.all([getLatestIcp(idea.id), getLatestBrian(idea.id)]);
    res.json({ icp, brianApproved: brian?.status === 'approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/icp/build -- GRF-13. Refuses until Brian is approved;
// otherwise always creates a NEW version (also how "rebuild" works, same
// convention as /brain/build). GRF-11: logs a grafter_run row.
router.post('/icp/build', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(400).json({ error: 'Start Grafter first -- no idea on file yet' }); return; }

    const brian = await getLatestBrian(idea.id);
    if (!brian || brian.status !== 'approved') {
      res.status(400).json({ error: 'Approve Brian before building an ICP' });
      return;
    }

    const answers = await getValidationAnswers(idea.id);
    const versionResult = await query<{ next: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM grafter_icp WHERE idea_id = $1`,
      [idea.id]
    );
    const nextVersion = versionResult.rows[0].next;

    const fields = await runGrafterJob(idea.id, 'icp_build', { brianVersion: brian.version }, () =>
      buildIcp({
        whatYouSell: brian.fields.what_you_sell?.value ?? '',
        whoItsFor: brian.fields.who_its_for?.value ?? '',
        pricing: brian.fields.pricing?.value ?? '',
        icpJobs: answers.icpJobs,
        icpFrustrations: answers.icpFrustrations,
        icpAlternatives: answers.icpAlternatives,
      })
    );

    const inserted = await query<IcpRow>(
      `INSERT INTO grafter_icp (idea_id, version, status, fields) VALUES ($1, $2, 'draft', $3) RETURNING *`,
      [idea.id, nextVersion, JSON.stringify(fields)]
    );
    res.status(201).json({ icp: inserted.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const IcpEditSchema = z.object({
  target_profile: z.string().max(300).optional(),
  jobs_to_be_done: z.string().max(300).optional(),
  frustrations: z.string().max(300).optional(),
  current_alternatives: z.string().max(300).optional(),
});

// PATCH /api/grafter/icp -- GRF-14. Edited fields are tagged 'founder_edit',
// same pattern as PATCH /brain.
router.patch('/icp', async (req: Request, res: Response) => {
  const parse = IcpEditSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    const icp = await getLatestIcp(idea.id);
    if (!icp) { res.status(404).json({ error: 'No ICP to edit yet -- build one first' }); return; }

    const fields = { ...icp.fields };
    for (const [key, value] of Object.entries(parse.data)) {
      if (value === undefined) continue;
      fields[key] = { value, sources: ['founder_edit'] };
    }
    const updated = await query<IcpRow>(
      `UPDATE grafter_icp SET fields = $2 WHERE id = $1 RETURNING *`,
      [icp.id, JSON.stringify(fields)]
    );
    res.json({ icp: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/icp/approve -- GRF-15. Idempotent, same as /brain/approve.
// This is the gate GRF-18's prospecting job will check via getApprovedIcp.
router.post('/icp/approve', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    const icp = await getLatestIcp(idea.id);
    if (!icp) { res.status(404).json({ error: 'No ICP to approve yet -- build one first' }); return; }
    if (icp.status === 'approved') { res.json({ icp }); return; }
    const updated = await query<IcpRow>(
      `UPDATE grafter_icp SET status = 'approved', approved_at = NOW() WHERE id = $1 RETURNING *`,
      [icp.id]
    );
    res.json({ icp: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -- Prospecting: GRF-18/19/20 -------------------------------------------------
//
// Enqueues onto grafter_run rather than running inline -- Apollo + the AI
// filter-extraction step are slow enough that GRF-16's worker exists
// specifically for this. See prospecting.ts for why every result it writes
// is real and sourced.

interface ProspectRow {
  id: string;
  name: string;
  website: string;
  domain: string;
  industry: string | null;
  employee_count: number | null;
  linkedin_url: string | null;
  apollo_org_id: string | null;
  source: string;
  reason: string | null;
  created_at: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  outreach_status: string | null;
  outreach_subject: string | null;
  outreach_body: string | null;
}

// POST /api/grafter/prospect -- GRF-18/GRF-15's gate: refuses until the
// ICP is approved. Returns immediately with a queued run id; the frontend
// polls GET /api/grafter/candidates for progress and results.
router.post('/prospect', async (req: Request, res: Response) => {
  if (!hasGrafterEntitlement(req.userId!)) { res.status(403).json({ error: 'Grafter is not available on this account' }); return; }
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(400).json({ error: 'No idea on file yet' }); return; }

    const icp = await getApprovedIcp(idea.id);
    if (!icp) { res.status(400).json({ error: 'Approve your ideal customer profile before finding companies' }); return; }

    const runId = await enqueueGrafterJob(idea.id, 'prospecting', {
      icpVersion: icp.version,
      targetProfile: icp.fields.target_profile?.value ?? '',
      jobsToBeDone: icp.fields.jobs_to_be_done?.value ?? '',
      frustrations: icp.fields.frustrations?.value ?? '',
      currentAlternatives: icp.fields.current_alternatives?.value ?? '',
    });
    res.status(202).json({ runId, status: 'queued' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/grafter/candidates -- the founder's candidate companies so far,
// plus the latest prospecting run's status so the frontend can poll
// without a websocket (queued/running -> keep polling; done/failed -> stop).
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.json({ candidates: [], run: null }); return; }

    const [candidates, run] = await Promise.all([
      query<ProspectRow>(
        `SELECT p.id, p.name, p.website, p.domain, p.industry, p.employee_count, p.linkedin_url,
                p.apollo_org_id, p.source, p.reason, p.created_at,
                c.id AS contact_id, c.name AS contact_name, c.title AS contact_title, c.email AS contact_email,
                o.status AS outreach_status, o.subject AS outreach_subject, o.body AS outreach_body
         FROM grafter_prospect p
         LEFT JOIN grafter_contact c ON c.prospect_id = p.id
         LEFT JOIN grafter_outreach o ON o.prospect_id = p.id
         WHERE p.idea_id = $1 ORDER BY p.created_at DESC`,
        [idea.id]
      ),
      query<{ id: string; status: string; error: string | null; output: any }>(
        `SELECT id, status, error, output FROM grafter_run
         WHERE idea_id = $1 AND kind = 'prospecting' ORDER BY started_at DESC LIMIT 1`,
        [idea.id]
      ),
    ]);

    res.json({ candidates: candidates.rows, run: run.rows[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -- Contact + outreach: Sprint 3 round 2 -------------------------------------
//
// Finding a contact and drafting/approving/sending an email are each their
// own explicit action -- never bundled or automatic. Apollo calls (contact
// lookup) and Gmail sends both cost real money or carry real consequences,
// so nothing here fires without the founder clicking something specific.

async function getOwnedProspect(userId: string, prospectId: string) {
  const idea = await getFounderIdea(userId);
  if (!idea) return null;
  const result = await query<{
    id: string; idea_id: string; name: string; domain: string; industry: string | null; apollo_org_id: string | null;
  }>(
    `SELECT id, idea_id, name, domain, industry, apollo_org_id FROM grafter_prospect WHERE id = $1 AND idea_id = $2`,
    [prospectId, idea.id]
  );
  return { idea, prospect: result.rows[0] ?? null };
}

interface ContactRow {
  id: string; name: string; title: string | null; email: string | null; email_status: string | null; linkedin_url: string | null; source: string | null;
}

// POST /api/grafter/candidates/:prospectId/contact -- looks up a real
// person at this company via Hunter.io's Domain Search. Costs Hunter
// credits per call, so it only ever runs when the founder clicks it for
// this specific candidate.
router.post('/candidates/:prospectId/contact', async (req: Request, res: Response) => {
  if (!hasGrafterEntitlement(req.userId!)) { res.status(403).json({ error: 'Grafter is not available on this account' }); return; }
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;

    const icp = await getApprovedIcp(idea.id);
    const { personTitles } = icp
      ? await buildSearchFilters({
          targetProfile: icp.fields.target_profile?.value ?? '',
          jobsToBeDone: icp.fields.jobs_to_be_done?.value ?? '',
          frustrations: icp.fields.frustrations?.value ?? '',
          currentAlternatives: icp.fields.current_alternatives?.value ?? '',
        })
      : { personTitles: [] };

    const found = await findContactForCompany(prospect.domain, personTitles);
    if (!found) {
      res.status(404).json({ error: 'No contact found at this company' });
      return;
    }

    const upserted = await query<ContactRow>(
      `INSERT INTO grafter_contact (idea_id, prospect_id, name, title, email, email_status, linkedin_url, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'hunter')
       ON CONFLICT (prospect_id) DO UPDATE SET
         name = EXCLUDED.name, title = EXCLUDED.title, email = EXCLUDED.email,
         email_status = EXCLUDED.email_status, linkedin_url = EXCLUDED.linkedin_url
       RETURNING id, name, title, email, email_status, linkedin_url`,
      [idea.id, prospect.id, found.name, found.title ?? null, found.email ?? null, found.emailStatus ?? null, found.linkedinUrl ?? null]
    );
    res.status(201).json({ contact: upserted.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

interface OutreachRow {
  id: string; status: string; subject: string; body: string; error: string | null; sent_at: string | null;
}

// POST /api/grafter/candidates/:prospectId/draft -- GRF-22. Requires a
// contact with an email on file; requires Brian + ICP both approved (the
// draft is grounded in them). Re-draftable while still 'drafted' -- once
// 'sent', the WHERE clause below makes this a no-op rather than an error,
// so a sent email can never be silently rewritten.
router.post('/candidates/:prospectId/draft', async (req: Request, res: Response) => {
  if (!hasGrafterEntitlement(req.userId!)) { res.status(403).json({ error: 'Grafter is not available on this account' }); return; }
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;

    const [brian, icp, contactRes, userRes] = await Promise.all([
      getLatestBrian(idea.id),
      getApprovedIcp(idea.id),
      query<ContactRow>(`SELECT id, name, title, email, email_status, linkedin_url, source FROM grafter_contact WHERE prospect_id = $1`, [prospect.id]),
      query<{ name: string | null }>(`SELECT name FROM users WHERE id = $1`, [req.userId]),
    ]);
    if (!brian || brian.status !== 'approved') { res.status(400).json({ error: 'Approve Brian before drafting outreach' }); return; }
    if (!icp) { res.status(400).json({ error: 'Approve your ideal customer profile before drafting outreach' }); return; }
    const contact = contactRes.rows[0];
    if (!contact?.email) { res.status(400).json({ error: 'Find a contact with an email for this company first' }); return; }

    const founderBusinessName = idea.name || userRes.rows[0]?.name || 'A founder using MVP Club';
    const drafted = await draftEmail({
      founderBusinessName,
      whatYouSell: brian.fields.what_you_sell?.value ?? '',
      whoItsFor: brian.fields.who_its_for?.value ?? '',
      targetProfile: icp.fields.target_profile?.value ?? '',
      companyName: prospect.name,
      companyIndustry: prospect.industry ?? undefined,
      contactName: contact.name,
      contactTitle: contact.title ?? undefined,
    });
    const body = drafted.body + buildDisclosureFooter(founderBusinessName, contact.source);

    const upserted = await query<OutreachRow>(
      `INSERT INTO grafter_outreach (idea_id, prospect_id, status, subject, body, art14_notice_included)
       VALUES ($1, $2, 'drafted', $3, $4, TRUE)
       ON CONFLICT (idea_id, prospect_id) DO UPDATE SET
         subject = EXCLUDED.subject, body = EXCLUDED.body, status = 'drafted', error = NULL
       WHERE grafter_outreach.status NOT IN ('sent')
       RETURNING id, status, subject, body, error, sent_at`,
      [idea.id, prospect.id, drafted.subject, body]
    );
    if (!upserted.rows.length) {
      // The WHERE clause blocked it -- this thread was already sent.
      const existing = await query<OutreachRow>(
        `SELECT id, status, subject, body, error, sent_at FROM grafter_outreach WHERE idea_id = $1 AND prospect_id = $2`,
        [idea.id, prospect.id]
      );
      res.status(409).json({ error: 'This outreach was already sent and cannot be redrafted', outreach: existing.rows[0] ?? null });
      return;
    }
    res.status(201).json({ outreach: upserted.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

const OutreachEditSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(5000).optional(),
});

// PATCH /api/grafter/candidates/:prospectId/draft -- GRF-23's edit half.
// The disclosure footer is stripped from whatever the founder submits (in
// case they copy-pasted a previous body) and re-appended fresh, so it can
// never be edited away.
router.patch('/candidates/:prospectId/draft', async (req: Request, res: Response) => {
  const parse = OutreachEditSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;

    const existing = await query<OutreachRow>(
      `SELECT id, status, subject, body, error, sent_at FROM grafter_outreach WHERE idea_id = $1 AND prospect_id = $2`,
      [idea.id, prospect.id]
    );
    const draft = existing.rows[0];
    if (!draft) { res.status(404).json({ error: 'No draft to edit yet -- draft one first' }); return; }
    if (draft.status === 'sent') { res.status(409).json({ error: 'This outreach was already sent and cannot be edited' }); return; }

    const [userRes, contactRes] = await Promise.all([
      query<{ name: string | null }>(`SELECT name FROM users WHERE id = $1`, [req.userId]),
      query<{ source: string | null }>(`SELECT source FROM grafter_contact WHERE prospect_id = $1`, [prospect.id]),
    ]);
    const founderBusinessName = idea.name || userRes.rows[0]?.name || 'A founder using MVP Club';
    const footer = buildDisclosureFooter(founderBusinessName, contactRes.rows[0]?.source);

    const nextSubject = parse.data.subject ?? draft.subject;
    let nextBody = parse.data.body ?? draft.body;
    const footerIndex = nextBody.indexOf('\n---\n');
    if (footerIndex !== -1) nextBody = nextBody.slice(0, footerIndex);
    nextBody = nextBody.trimEnd() + footer;

    const updated = await query<OutreachRow>(
      `UPDATE grafter_outreach SET subject = $2, body = $3, status = 'drafted' WHERE id = $1 RETURNING id, status, subject, body, error, sent_at`,
      [draft.id, nextSubject, nextBody]
    );
    res.json({ outreach: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/candidates/:prospectId/draft/approve -- GRF-23's gate.
// Nothing can be sent without this.
router.post('/candidates/:prospectId/draft/approve', async (req: Request, res: Response) => {
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;
    const existing = await query<OutreachRow>(
      `SELECT id, status, subject, body, error, sent_at FROM grafter_outreach WHERE idea_id = $1 AND prospect_id = $2`,
      [idea.id, prospect.id]
    );
    const draft = existing.rows[0];
    if (!draft) { res.status(404).json({ error: 'No draft to approve yet' }); return; }
    if (draft.status === 'sent') { res.json({ outreach: draft }); return; }
    const updated = await query<OutreachRow>(
      `UPDATE grafter_outreach SET status = 'approved' WHERE id = $1 RETURNING id, status, subject, body, error, sent_at`,
      [draft.id]
    );
    res.json({ outreach: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/candidates/:prospectId/send -- GRF-24. Every guard
// here is load-bearing: no mailbox, no send; paused, no send; not
// approved, no send; no email on file, no send.
router.post('/candidates/:prospectId/send', async (req: Request, res: Response) => {
  if (!hasGrafterEntitlement(req.userId!)) { res.status(403).json({ error: 'Grafter is not available on this account' }); return; }
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;

    if (await isOutreachPaused(idea.id)) { res.status(409).json({ error: 'Outreach is paused for this idea -- resume it first' }); return; }

    const [draftRes, contactRes] = await Promise.all([
      query<OutreachRow>(`SELECT id, status, subject, body, error, sent_at FROM grafter_outreach WHERE idea_id = $1 AND prospect_id = $2`, [idea.id, prospect.id]),
      query<ContactRow & { email: string | null }>(`SELECT id, name, title, email, email_status, linkedin_url FROM grafter_contact WHERE prospect_id = $1`, [prospect.id]),
    ]);
    const draft = draftRes.rows[0];
    const contact = contactRes.rows[0];
    if (!draft) { res.status(400).json({ error: 'No draft to send yet' }); return; }
    if (draft.status === 'sent') { res.json({ outreach: draft }); return; }
    if (draft.status !== 'approved' && draft.status !== 'failed') { res.status(400).json({ error: 'Approve this draft before sending it' }); return; }
    if (!contact?.email) { res.status(400).json({ error: 'No email on file for this contact' }); return; }

    const suppressed = await query(
      `SELECT 1 FROM grafter_suppressed_email WHERE idea_id = $1 AND email = $2`,
      [idea.id, contact.email]
    );
    if (suppressed.rows.length) { res.status(409).json({ error: 'This contact opted out -- cannot send' }); return; }

    try {
      const sent = await sendGmailMessage(req.userId!, contact.email, draft.subject, draft.body);
      const updated = await query<OutreachRow>(
        `UPDATE grafter_outreach SET status = 'sent', gmail_message_id = $2, gmail_thread_id = $3, sent_at = NOW(), error = NULL WHERE id = $1 RETURNING id, status, subject, body, error, sent_at`,
        [draft.id, sent.messageId, sent.threadId]
      );
      res.json({ outreach: updated.rows[0] });
    } catch (sendErr) {
      const message = sendErr instanceof Error ? sendErr.message : 'Send failed';
      await query(`UPDATE grafter_outreach SET status = 'failed', error = $2 WHERE id = $1`, [draft.id, message]);
      res.status(502).json({ error: message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/candidates/:prospectId/opt-out -- GRF-25. Manual for
// now (no reply parsing yet -- GRF-27) but the block it creates is real:
// checked by email address at send time, permanently, for this idea.
router.post('/candidates/:prospectId/opt-out', async (req: Request, res: Response) => {
  try {
    const owned = await getOwnedProspect(req.userId!, req.params.prospectId);
    if (!owned?.prospect) { res.status(404).json({ error: 'Candidate not found' }); return; }
    const { idea, prospect } = owned;
    const contactRes = await query<{ email: string | null }>(`SELECT email FROM grafter_contact WHERE prospect_id = $1`, [prospect.id]);
    const email = contactRes.rows[0]?.email;
    if (!email) { res.status(400).json({ error: 'No contact email on file for this candidate' }); return; }
    await query(
      `INSERT INTO grafter_suppressed_email (idea_id, email, reason) VALUES ($1, $2, 'founder marked opted out')
       ON CONFLICT (idea_id, email) DO NOTHING`,
      [idea.id, email]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -- Kill switch: GRF-26 ------------------------------------------------------
//
// Per-idea, not global or per-user -- pausing your own outreach must never
// affect anyone else's. Built now, before any real send exists, per the
// architecture review's explicit ordering requirement ("provenance, opt-out
// and a kill switch are preconditions for the first send" -- not something
// to retrofit after). GRF-24 (send) must check isOutreachPaused before
// every send, not just at draft time.

export async function isOutreachPaused(ideaId: string): Promise<boolean> {
  const result = await query<{ paused_at: string | null }>(
    `SELECT paused_at FROM grafter_outreach_settings WHERE idea_id = $1`,
    [ideaId]
  );
  return !!result.rows[0]?.paused_at;
}

// GET /api/grafter/outreach/status -- whether outreach is paused for this
// founder's idea, and since when.
router.get('/outreach/status', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.json({ paused: false, pausedAt: null, pausedReason: null }); return; }
    const result = await query<{ paused_at: string | null; paused_reason: string | null }>(
      `SELECT paused_at, paused_reason FROM grafter_outreach_settings WHERE idea_id = $1`,
      [idea.id]
    );
    const row = result.rows[0];
    res.json({ paused: !!row?.paused_at, pausedAt: row?.paused_at ?? null, pausedReason: row?.paused_reason ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/outreach/pause -- stops all future sends for this idea
// immediately. Idempotent.
router.post('/outreach/pause', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
    await query(
      `INSERT INTO grafter_outreach_settings (idea_id, paused_at, paused_reason)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (idea_id) DO UPDATE SET paused_at = NOW(), paused_reason = $2, updated_at = NOW()`,
      [idea.id, reason]
    );
    res.json({ paused: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/grafter/outreach/resume
router.post('/outreach/resume', async (req: Request, res: Response) => {
  try {
    const idea = await getFounderIdea(req.userId!);
    if (!idea) { res.status(404).json({ error: 'No idea on file' }); return; }
    await query(
      `INSERT INTO grafter_outreach_settings (idea_id, paused_at, paused_reason)
       VALUES ($1, NULL, NULL)
       ON CONFLICT (idea_id) DO UPDATE SET paused_at = NULL, paused_reason = NULL, updated_at = NOW()`,
      [idea.id]
    );
    res.json({ paused: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
