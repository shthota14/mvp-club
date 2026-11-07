import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Public, unauthenticated "Intelligence & Insights" payload for /insights.
//
// Everything here is an AGGREGATE — counts, weekly series, distributions and
// an anonymised graph. No names, emails, idea descriptions or post contents
// ever leave this endpoint, because the page is reachable without an account.
// Founders in the network graph are relabelled "Founder 01…" server-side; the
// only human-readable labels are idea names (already shown on the community
// surfaces), business domains and tool names.
//
// Every block carries a `kind`:
//   'live'      — computed directly from the database on each refresh
//   'estimate'  — derived from live counts with a stated formula
//   'sample'    — illustrative data for a chart MVP Club doesn't track yet
// The frontend renders that badge on every panel so a visitor can always tell
// what is measured and what is not.

const STAGES = ['idea', 'hone', 'validate', 'shape', 'done'] as const;
type Stage = typeof STAGES[number];
const STAGE_RANK: Record<Stage, number> = { idea: 0, hone: 1, validate: 2, shape: 3, done: 4 };

// Number of steps per stage, mirrored from STEP_TITLES in frontend WorkPage.tsx.
// Only used to turn "distinct field keys saved" into a 0–1 depth for the
// ridgeline; it doesn't need to be exact.
const STEPS_PER_STAGE: Record<Stage, number> = { idea: 1, hone: 6, validate: 9, shape: 5, done: 11 };

// Minutes credited per AI-assisted action for the "hours saved" estimate.
// Stated on the KPI tooltip in the UI — change both together.
const MIN_PER_GRAFTER_DRAFT = 15;      // prospect research + first-touch email drafted by Grafter
const MIN_PER_AI_INTERVIEW = 20;       // interview transcript classified + evidence extracted
const MIN_PER_STEP_LOGGED = 6;         // guided step vs. figuring out the question yourself

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();

function clampRange(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 90;
  return Math.min(365, Math.max(14, Math.round(n)));
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const r = await query<{ n: string }>(sql, params);
  return Number(r.rows[0]?.n ?? 0);
}

// Weekly buckets (ISO weeks, Monday start) back from today, oldest first.
function weekBuckets(rangeDays: number): string[] {
  const weeks = Math.max(2, Math.ceil(rangeDays / 7));
  const out: string[] = [];
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday.getTime() - i * 7 * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function weeklySeries(sql: string, params: unknown[], buckets: string[]): Promise<number[]> {
  // sql must select `wk` (date) and `n` (count) grouped by week.
  const r = await query<{ wk: Date | string; n: string }>(sql, params);
  const map = new Map<string, number>();
  for (const row of r.rows) {
    const key = (row.wk instanceof Date ? row.wk.toISOString() : String(row.wk)).slice(0, 10);
    map.set(key, Number(row.n));
  }
  return buckets.map(b => map.get(b) ?? 0);
}

const WEEK = (col: string) => `date_trunc('week', ${col})::date AS wk`;

async function buildPayload(rangeDays: number) {
  const buckets = weekBuckets(rangeDays);
  const since = buckets[0];

  // ── KPIs ────────────────────────────────────────────────────────────────
  const [members, ideasTotal, projectsCompleted, stepsLogged, interviewsLogged, interviewsAi, grafterDrafted, grafterSent, grafterReplied, challengesTotal, postsTotal] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM users`),
    count(`SELECT COUNT(*) AS n FROM ideas`),
    count(`SELECT COUNT(*) AS n FROM ideas WHERE stage = 'done' OR idea_status = 'done'`),
    count(`SELECT COUNT(*) AS n FROM stage_entries WHERE COALESCE(content,'') <> ''`),
    count(`SELECT COUNT(*) AS n FROM interviews`),
    count(`SELECT COUNT(*) AS n FROM interviews WHERE ai_alignment_score IS NOT NULL`),
    count(`SELECT COUNT(*) AS n FROM grafter_outreach`),
    count(`SELECT COUNT(*) AS n FROM grafter_outreach WHERE status IN ('sent','replied')`),
    count(`SELECT COUNT(*) AS n FROM grafter_outreach WHERE status = 'replied'`),
    count(`SELECT COUNT(*) AS n FROM challenges`),
    count(`SELECT COUNT(*) AS n FROM community_posts`),
  ]);
  const hoursSaved = Math.round((grafterDrafted * MIN_PER_GRAFTER_DRAFT + interviewsAi * MIN_PER_AI_INTERVIEW + stepsLogged * MIN_PER_STEP_LOGGED) / 60);

  // ── Journey Sankey: how far every idea has travelled ─────────────────────
  // An idea at stage X has passed through every earlier stage, so the flow
  // Idea→Hone carries every idea whose rank ≥ 1, and so on. Archived ideas
  // leave the river at the stage they were parked. Validate's Build/Pivot/Drop
  // verdicts come from the stage_entries field the Decision step writes.
  const stageRows = await query<{ stage: Stage; idea_status: string; n: string }>(
    `SELECT stage, COALESCE(idea_status,'active') AS idea_status, COUNT(*) AS n FROM ideas GROUP BY 1,2`
  );
  const reached = [0, 0, 0, 0, 0];
  const parked = [0, 0, 0, 0, 0];
  for (const r of stageRows.rows) {
    const rank = STAGE_RANK[r.stage] ?? 0;
    const n = Number(r.n);
    for (let i = 0; i <= rank; i++) reached[i] += n;
    if (r.idea_status === 'archived') parked[rank] += n;
  }
  const verdictRows = await query<{ v: string; n: string }>(
    `SELECT LOWER(TRIM(content)) AS v, COUNT(*) AS n FROM stage_entries WHERE stage='validate' AND field_key='valVerdict' AND COALESCE(content,'')<>'' GROUP BY 1`
  );
  const verdicts: Record<string, number> = { build: 0, pivot: 0, drop: 0 };
  for (const r of verdictRows.rows) if (r.v in verdicts) verdicts[r.v] = Number(r.n);

  const sankeyNodes = [
    { id: 'idea', label: 'Idea' }, { id: 'hone', label: 'Hone' }, { id: 'validate', label: 'Validate' },
    { id: 'shape', label: 'Shape' }, { id: 'done', label: 'Launched' },
    { id: 'parked', label: 'Parked' }, { id: 'pivot', label: 'Pivoted' }, { id: 'drop', label: 'Dropped' },
  ];
  const sankeyLinks: { source: string; target: string; value: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const flow = reached[i + 1];
    if (flow > 0) sankeyLinks.push({ source: STAGES[i], target: STAGES[i + 1], value: flow });
  }
  for (let i = 0; i < 5; i++) if (parked[i] > 0) sankeyLinks.push({ source: STAGES[i], target: 'parked', value: parked[i] });
  if (verdicts.pivot > 0) sankeyLinks.push({ source: 'validate', target: 'pivot', value: verdicts.pivot });
  if (verdicts.drop > 0) sankeyLinks.push({ source: 'validate', target: 'drop', value: verdicts.drop });

  // ── Learning ridgeline: depth of work per stage, per idea ────────────────
  const depthRows = await query<{ stage: Stage; idea_id: string; keys: string }>(
    `SELECT stage, idea_id, COUNT(DISTINCT field_key) AS keys FROM stage_entries WHERE COALESCE(content,'')<>'' AND stage IN ('idea','hone','validate','shape','done') GROUP BY 1,2`
  );
  const depthByStage: Record<Stage, number[]> = { idea: [], hone: [], validate: [], shape: [], done: [] };
  for (const r of depthRows.rows) depthByStage[r.stage]?.push(Number(r.keys));
  const learning = STAGES.map(stage => {
    const raw = depthByStage[stage];
    const sorted = [...raw].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 1;
    const scale = Math.max(1, p95);
    return {
      stage, label: stage === 'done' ? 'Get it done' : stage[0].toUpperCase() + stage.slice(1),
      steps: STEPS_PER_STAGE[stage], ideas: raw.length,
      median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
      values: raw.slice(0, 600).map(v => Math.min(1, v / scale)),
    };
  });

  // ── Community engagement streamgraph (weekly) ────────────────────────────
  const [wPosts, wPain, wComments, wReactions, wInterviews, wChallenges, wPolls] = await Promise.all([
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM community_posts WHERE created_at >= $1 AND COALESCE(post_type,'win') <> 'pain_point' GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM community_posts WHERE created_at >= $1 AND post_type = 'pain_point' GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM comments WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM reactions WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM interviews WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM challenges WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM community_poll_votes WHERE created_at >= $1 GROUP BY 1`, [since], buckets).catch(() => buckets.map(() => 0)),
  ]);

  // ── Productivity / AI adoption (weekly) ──────────────────────────────────
  const [wSteps, wIdeas, wInterviewsDone, wAiClassified, wGrafterDrafted, wGrafterSent, wGrafterReplied, wMembers] = await Promise.all([
    weeklySeries(`SELECT ${WEEK('updated_at')}, COUNT(*) AS n FROM stage_entries WHERE updated_at >= $1 AND COALESCE(content,'')<>'' GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM ideas WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('updated_at')}, COUNT(*) AS n FROM interviews WHERE updated_at >= $1 AND status = 'completed' GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('updated_at')}, COUNT(*) AS n FROM interviews WHERE updated_at >= $1 AND ai_alignment_score IS NOT NULL GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM grafter_outreach WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('sent_at')}, COUNT(*) AS n FROM grafter_outreach WHERE sent_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('replied_at')}, COUNT(*) AS n FROM grafter_outreach WHERE replied_at >= $1 GROUP BY 1`, [since], buckets),
    weeklySeries(`SELECT ${WEEK('created_at')}, COUNT(*) AS n FROM users WHERE created_at >= $1 GROUP BY 1`, [since], buckets),
  ]);
  const hoursSavedWeekly = buckets.map((_, i) =>
    Math.round(((wGrafterDrafted[i] * MIN_PER_GRAFTER_DRAFT + wAiClassified[i] * MIN_PER_AI_INTERVIEW + wSteps[i] * MIN_PER_STEP_LOGGED) / 60) * 10) / 10
  );

  // ── Network graph (anonymised) ───────────────────────────────────────────
  // Founders are the 40 most active users; ideas are those founders' ideas
  // (cap 80); domains and tools are shared hubs. Founder labels are replaced
  // by an ordinal before leaving the server.
  const founderRows = await query<{ id: string; activity: string }>(
    `SELECT u.id,
            (SELECT COUNT(*) FROM ideas i WHERE i.user_id=u.id) * 3
          + (SELECT COUNT(*) FROM community_posts p WHERE p.user_id=u.id)
          + (SELECT COUNT(*) FROM comments c WHERE c.user_id=u.id)
          + (SELECT COUNT(*) FROM interviews iv WHERE iv.user_id=u.id) AS activity
     FROM users u
     ORDER BY activity DESC, u.created_at ASC
     LIMIT 40`
  );
  const founderIds = founderRows.rows.map(r => r.id);
  const founderAlias = new Map<string, string>();
  founderIds.forEach((id, i) => founderAlias.set(id, `f${i + 1}`));

  type Node = { id: string; type: 'founder' | 'idea' | 'domain' | 'tool'; label: string; size: number; stage?: string };
  const nodes: Node[] = founderRows.rows.map((r, i) => ({ id: `f${i + 1}`, type: 'founder', label: `Founder ${String(i + 1).padStart(2, '0')}`, size: 1 + Math.min(6, Number(r.activity) / 4) }));
  const links: { source: string; target: string; kind: string }[] = [];

  if (founderIds.length) {
    const ideaRows = await query<{ id: string; user_id: string; name: string; stage: string; business_domain: string | null; has_grafter: boolean; has_ai_interviews: boolean; followers: string; interviews: string }>(
      `SELECT i.id, i.user_id, i.name, i.stage, i.business_domain,
              EXISTS (SELECT 1 FROM grafter_run g WHERE g.idea_id=i.id) AS has_grafter,
              EXISTS (SELECT 1 FROM interviews iv WHERE iv.idea_id=i.id AND iv.ai_alignment_score IS NOT NULL) AS has_ai_interviews,
              (SELECT COUNT(*) FROM idea_follows f WHERE f.idea_id=i.id) AS followers,
              (SELECT COUNT(*) FROM interviews iv WHERE iv.idea_id=i.id) AS interviews
       FROM ideas i WHERE i.user_id = ANY($1::uuid[]) AND COALESCE(i.idea_status,'active') <> 'archived'
       ORDER BY i.updated_at DESC LIMIT 80`, [founderIds]
    );
    const ideaIds = ideaRows.rows.map(r => r.id);
    const domains = new Set<string>();
    let usesGrafter = 0, usesAi = 0;
    for (const r of ideaRows.rows) {
      const nid = `i_${r.id.slice(0, 8)}`;
      nodes.push({ id: nid, type: 'idea', label: r.name.slice(0, 40), size: 1.5 + Math.min(5, Number(r.followers) * 0.6 + Number(r.interviews) * 0.3), stage: r.stage });
      const owner = founderAlias.get(r.user_id);
      if (owner) links.push({ source: owner, target: nid, kind: 'owns' });
      if (r.business_domain) { domains.add(r.business_domain); links.push({ source: nid, target: `d_${r.business_domain}`, kind: 'domain' }); }
      if (r.has_grafter) { usesGrafter++; links.push({ source: nid, target: 't_grafter', kind: 'tool' }); }
      if (r.has_ai_interviews) { usesAi++; links.push({ source: nid, target: 't_ai_interviews', kind: 'tool' }); }
    }
    for (const d of domains) nodes.push({ id: `d_${d}`, type: 'domain', label: d.replace(/-/g, ' '), size: 2.5 });
    if (usesGrafter) nodes.push({ id: 't_grafter', type: 'tool', label: 'Grafter (AI sales)', size: 2 + Math.min(5, usesGrafter / 2) });
    if (usesAi) nodes.push({ id: 't_ai_interviews', type: 'tool', label: 'AI interview analysis', size: 2 + Math.min(5, usesAi / 2) });

    if (ideaIds.length) {
      const followRows = await query<{ user_id: string; idea_id: string }>(
        `SELECT user_id, idea_id FROM idea_follows WHERE user_id = ANY($1::uuid[]) AND idea_id = ANY($2::uuid[]) LIMIT 300`, [founderIds, ideaIds]
      );
      for (const r of followRows.rows) {
        const a = founderAlias.get(r.user_id);
        if (a) links.push({ source: a, target: `i_${r.idea_id.slice(0, 8)}`, kind: 'follows' });
      }
    }
    const convoRows = await query<{ a: string; b: string }>(
      `SELECT DISTINCT c.user_id AS a, p.user_id AS b FROM comments c JOIN community_posts p ON p.id=c.post_id
       WHERE c.user_id <> p.user_id AND c.user_id = ANY($1::uuid[]) AND p.user_id = ANY($1::uuid[]) LIMIT 300`, [founderIds]
    );
    for (const r of convoRows.rows) {
      const a = founderAlias.get(r.a), b = founderAlias.get(r.b);
      if (a && b) links.push({ source: a, target: b, kind: 'comments' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    weeks: buckets,
    kpis: {
      members:           { value: members,           kind: 'live',     label: 'Members',            note: 'Accounts created on MVP Club' },
      projectsCompleted: { value: projectsCompleted, kind: 'live',     label: 'MVPs launched',      note: 'Ideas that reached the Get it done stage' },
      stepsLogged:       { value: stepsLogged,       kind: 'live',     label: 'Steps completed',    note: 'Guided steps founders have filled in across all stages' },
      hoursSaved:        { value: hoursSaved,        kind: 'estimate', label: 'Hours saved by AI',  note: `${MIN_PER_GRAFTER_DRAFT} min per Grafter outreach drafted, ${MIN_PER_AI_INTERVIEW} min per AI-classified interview, ${MIN_PER_STEP_LOGGED} min per guided step` },
      ideasTotal:        { value: ideasTotal,        kind: 'live',     label: 'Ideas started' },
      interviews:        { value: interviewsLogged,  kind: 'live',     label: 'Customer interviews' },
      challenges:        { value: challengesTotal,   kind: 'live',     label: 'Validation challenges' },
      posts:             { value: postsTotal,        kind: 'live',     label: 'Community posts' },
    },
    journey: { kind: 'live', nodes: sankeyNodes, links: sankeyLinks, reached, verdicts },
    learning: { kind: 'live', stages: learning },
    engagement: {
      kind: 'live',
      series: [
        { key: 'posts',      label: 'Wins & updates',    values: wPosts },
        { key: 'comments',   label: 'Comments',          values: wComments },
        { key: 'reactions',  label: 'Encouragements',    values: wReactions },
        { key: 'painPoints', label: 'Pain points logged', values: wPain },
        { key: 'interviews', label: 'Interviews',        values: wInterviews },
        { key: 'challenges', label: 'Challenges',        values: wChallenges },
        { key: 'polls',      label: 'Poll votes',        values: wPolls },
      ],
    },
    productivity: {
      kind: 'live',
      series: [
        { key: 'steps',       label: 'Steps completed',        values: wSteps },
        { key: 'ideas',       label: 'Ideas started',          values: wIdeas },
        { key: 'interviews',  label: 'Interviews completed',   values: wInterviewsDone },
        { key: 'members',     label: 'New members',            values: wMembers },
      ],
      hoursSaved: { kind: 'estimate', label: 'Hours saved (est.)', values: hoursSavedWeekly },
    },
    ai: {
      kind: 'live',
      interviewsAiShare: interviewsLogged ? Math.round((interviewsAi / interviewsLogged) * 100) : 0,
      interviewsAi, interviewsTotal: interviewsLogged,
      grafter: { drafted: grafterDrafted, sent: grafterSent, replied: grafterReplied },
      series: [
        { key: 'aiClassified',   label: 'AI-classified interviews', values: wAiClassified },
        { key: 'grafterDrafted', label: 'Grafter drafts',           values: wGrafterDrafted },
        { key: 'grafterSent',    label: 'Grafter emails sent',      values: wGrafterSent },
        { key: 'grafterReplied', label: 'Replies',                  values: wGrafterReplied },
      ],
    },
    network: { kind: 'live', anonymised: true, nodes, links },
  };
}

router.get('/', async (req: Request, res: Response) => {
  const rangeDays = clampRange(req.query.range);
  const key = String(rangeDays);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(hit.payload);
    return;
  }
  try {
    const payload = await buildPayload(rangeDays);
    cache.set(key, { at: Date.now(), payload });
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(payload);
  } catch (err) {
    console.error('[insights]', err);
    res.status(500).json({ error: 'Insights are temporarily unavailable' });
  }
});

export default router;
