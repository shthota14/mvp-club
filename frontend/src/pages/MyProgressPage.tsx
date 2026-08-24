import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ideasApi } from '@/api/client';
import { STAGE_LABELS, STAGE_COLORS, type Stage, type Idea } from '@/types';
import { useIsMobile } from '@/hooks/useIsMobile';
import IdeaCanvasModal from '@/components/IdeaCanvasModal';
import FounderWizardModal, { loadFounderProfile, loadIdeaAnswers, calcEffort, type EffortResult, type FounderProfile, type IdeaAnswers } from '@/components/FounderWizardModal';
import RoadmapWidget from '@/components/RoadmapWidget';

const STAGE_ORDER: Stage[] = ['idea', 'hone', 'validate', 'shape', 'done'];

// ── Vault card layout modes ──────────────────────────────────────────────────
// Same five ways to browse a set of ideas that the Community tab offers,
// scoped down to just the founder's own ideas — persisted locally so the
// chosen layout sticks across visits, same as Community's own switcher.
type VaultViewMode = 'grid' | 'list' | 'kanban' | 'spotlight' | 'domain';
const VAULT_VIEW_MODES: { value: VaultViewMode; icon: string; label: string }[] = [
  { value: 'grid',      icon: '▦',  label: 'Grid' },
  { value: 'list',      icon: '☰',  label: 'List' },
  { value: 'kanban',    icon: '🗂️', label: 'Kanban' },
  { value: 'spotlight', icon: '⭐', label: 'Spotlight' },
  { value: 'domain',    icon: '🏷️', label: 'By domain' },
];
const VAULT_VIEW_STORAGE_KEY = 'mvpclub_vault_view';

const STAGE_ICONS: Record<Stage, string> = {
  idea: '💡', hone: '🎯', validate: '🧪', shape: '🔨', done: '🚀',
};


const DOMAIN_LABELS: Record<string, string> = {
  agritech: 'Agritech', 'b2b-saas': 'B2B SaaS', cleantech: 'Cleantech',
  consumer: 'Consumer', devtools: 'Dev Tools', edtech: 'Edtech',
  fintech: 'Fintech', foodtech: 'Foodtech', healthtech: 'Healthtech',
  'hr-tech': 'HR Tech', legaltech: 'Legaltech', logistics: 'Logistics',
  marketplace: 'Marketplace', media: 'Media', proptech: 'Proptech',
};

const NEXT_STEPS: Record<Stage, { headline: string; desc: string; cta: string; ctaDest: 'work' | 'community' }> = {
  idea:     { headline: 'Capture your idea', desc: 'Write your one-liner — what are you building and who is it for?', cta: 'Start →', ctaDest: 'work' },
  hone:     { headline: 'Sharpen your thinking', desc: 'Define the exact problem, the exact person, and why it matters.', cta: 'Continue honing →', ctaDest: 'work' },
  validate: { headline: 'Talk to real people', desc: 'Log conversations that confirm or challenge your assumptions.', cta: 'Start validation →', ctaDest: 'work' },
  shape:    { headline: 'Define your MVP', desc: "Strip everything that isn't essential. Pick 3 features max.", cta: 'Shape your MVP →', ctaDest: 'work' },
  done:     { headline: 'You shipped!', desc: 'Share your MVP with the community and find your first users.', cta: 'Share in community →', ctaDest: 'community' },
};

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]}.`;
}

function daysSinceUpdated(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// ── Timeline / RAG ───────────────────────────────────────────────────────────

const STAGE_TL: Record<Stage, { target: number; warn: number; danger: number; icon: string; color: string }> = {
  idea:     { target: 7,   warn: 14,  danger: 28,  icon: '💡', color: '#2563eb' },
  hone:     { target: 14,  warn: 28,  danger: 45,  icon: '🎯', color: '#7c3aed' },
  validate: { target: 60,  warn: 90,  danger: 120, icon: '🧪', color: '#059669' },
  shape:    { target: 28,  warn: 45,  danger: 60,  icon: '🔨', color: '#d97706' },
  done:     { target: 28,  warn: 45,  danger: 60,  icon: '🚀', color: '#0ea5e9' },
};

const STAGE_CUMULATIVE_START: Record<Stage, number> = {
  idea: 0, hone: 7, validate: 21, shape: 81, done: 109,
};

function getDaysInStage(idea: Idea): number {
  const totalDays = Math.floor((Date.now() - new Date(idea.created_at).getTime()) / 86400000);
  return Math.max(0, totalDays - (STAGE_CUMULATIVE_START[idea.stage as Stage] ?? 0));
}

function getTotalDays(idea: Idea): number {
  return Math.floor((Date.now() - new Date(idea.created_at).getTime()) / 86400000);
}

function getRAG(idea: Idea): 'green' | 'amber' | 'red' {
  if (idea.stage === 'done') return 'green';
  const daysIn = getDaysInStage(idea);
  const tl = STAGE_TL[idea.stage as Stage];
  if (!tl || tl.target === 0) return 'green';
  if (daysIn <= tl.target) return 'green';
  if (daysIn <= tl.warn)   return 'amber';
  return 'red';
}

const RAG_STYLE = {
  green: { bg: '#f0fdf4', color: '#059669', border: '#86efac', label: '✓ On track' },
  amber: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d', label: '⚠ Running late' },
  red:   { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', label: '🔴 Overdue' },
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function JourneyHero({ idea, onAction }: { idea: Idea; onAction: () => void }) {
  const stage = idea.stage as Stage;
  const color = STAGE_COLORS[stage];
  const next  = NEXT_STEPS[stage];
  const stale = daysSinceUpdated(idea.updated_at);
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1.5px solid #f0f0f5' }}>
      {/* Stage progress track */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STAGE_ORDER.map((s, i) => {
          const meta = { idea: '💡', hone: '🎯', validate: '🧪', shape: '🔨', done: '🚀' }[s];
          const isCurrent = i === currentIdx;
          const isDone    = i < currentIdx;
          const c         = STAGE_COLORS[s];
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STAGE_ORDER.length - 1 ? 1 : 'none' as const }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: isCurrent ? 36 : 28, height: isCurrent ? 36 : 28, borderRadius: '50%',
                  background: isCurrent ? c : isDone ? c : '#e5e5ea',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isCurrent ? 15 : 12, flexShrink: 0,
                  boxShadow: isCurrent ? `0 0 0 5px ${c}22` : 'none',
                  opacity: isDone ? 0.45 : 1, transition: 'all .2s',
                }}>
                  {isDone
                    ? <span style={{ fontSize: 10, color: '#fff', fontWeight: 800 }}>✓</span>
                    : <span>{meta}</span>}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: isCurrent ? 800 : 500,
                  color: isCurrent ? c : '#c0c0c8',
                  letterSpacing: 0.8, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                }}>
                  {s === 'done' ? 'Ship' : s}
                </span>
                {(s === 'shape' || s === 'done') && (
                  <span style={{ fontSize: 8, fontWeight: 500, color: '#c0c0c8', fontStyle: 'italic' as const, whiteSpace: 'nowrap' as const }}>
                    optional
                  </span>
                )}
              </div>
              {i < STAGE_ORDER.length - 1 && (
                s === 'validate' ? (
                  <div style={{
                    flex: 1, marginBottom: 18, marginLeft: 4, marginRight: 4,
                    borderTop: `2px dashed ${i < currentIdx ? `${STAGE_COLORS.shape}70` : '#d2d2d7'}`,
                  }} />
                ) : (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 18, marginLeft: 4, marginRight: 4,
                    background: i < currentIdx
                      ? `linear-gradient(90deg, ${STAGE_COLORS[STAGE_ORDER[i]]}66, ${STAGE_COLORS[STAGE_ORDER[i+1]]}66)`
                      : '#e5e5ea',
                  }} />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Next step card */}
      <div style={{
        background: '#fff', borderRadius: 16, border: `1.5px solid ${color}30`,
        boxShadow: `0 4px 24px ${color}10`, overflow: 'hidden', maxWidth: 540,
      }}>
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '22px 26px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999,
              background: `${color}12`, fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, textTransform: 'uppercase' as const,
            }}>
              {(stage === 'shape' || stage === 'done')
                ? <>{STAGE_ICONS[stage]} {STAGE_LABELS[stage]} · Optional</>
                : <>{STAGE_ICONS[stage]} {STAGE_LABELS[stage]} · Core stage {currentIdx + 1} of 3</>}
            </span>
            {stale >= 3 && (
              <span style={{ fontSize: 11, color: '#c0c0c8' }}>{stale}d idle</span>
            )}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c8', letterSpacing: 1.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Your next step</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: '#1d1d1f', fontFamily: 'var(--font-display)', marginBottom: 8, lineHeight: 1.3 }}>
            {next.headline}
          </div>
          <div style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.65, marginBottom: 20 }}>{next.desc}</div>
          {stale >= 5 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 16, lineHeight: 1.5 }}>
              💬 It's been {stale} days. Even 20 minutes beats waiting for the perfect moment.
            </div>
          )}
          <button
            onClick={onAction}
            style={{ width: '100%', padding: '13px', borderRadius: 10, background: color, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {next.cta}
          </button>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3a3c' }}>{idea.name}</div>
            <a href={`/community/${idea.id}`} style={{ fontSize: 12, color: '#c0c0c8', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1d1d1f')}
              onMouseLeave={e => (e.currentTarget.style.color = '#c0c0c8')}>
              View idea page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stage steps + drilldown detail ───────────────────────────────────────────

const STAGE_STEPS: Record<string, string[]> = {
  idea:     ['Write one-liner', 'Define your why', 'Choose domain'],
  hone:     ['Target customer', 'Describe problem', 'Score idea', 'Founder statement'],
  validate: ['Who to talk to', 'Key question', 'Reach out', 'Log conversations', 'Review verdict'],
  shape:    ['Simplest version', '3 core features', 'Go-live date', 'Build plan'],
  done:     ['Build MVP', 'Find first users', 'Ship it'],
};

interface StepDetail {
  what: string;
  why: string;
  tip: string;
  example: string;
  effort: string;
}

const STEP_DETAILS: Record<string, Record<string, StepDetail>> = {
  idea: {
    'Write one-liner': {
      what: 'Write a single sentence that describes what you\'re building, who it\'s for, and what problem it solves.',
      why: 'A sharp one-liner forces clarity. If you can\'t say it in one sentence, you don\'t understand it yet.',
      tip: 'Use the formula: "I\'m building [X] for [Y] who struggle with [Z]."',
      example: '"I\'m building an AI scheduling tool for freelancers who waste hours chasing clients for meeting times."',
      effort: '~30 mins',
    },
    'Define your why': {
      what: 'Write 2–3 sentences about why this problem matters to you personally — your unfair advantage or lived experience.',
      why: 'Investors and early customers trust founders who have a personal connection to the problem.',
      tip: 'Be specific. "I lost $20k to this problem" beats "I think it\'s a big market."',
      example: '"I spent 3 years as a nurse and watched colleagues burn out from manual rostering. I know every edge case."',
      effort: '~20 mins',
    },
    'Choose domain': {
      what: 'Tag your idea with an industry category (e.g. Healthtech, B2B SaaS, Marketplace).',
      why: 'Domain focus sharpens your thinking and helps you find the right advisors, competitors, and communities.',
      tip: 'Pick the most specific category that fits. "SaaS" is too broad; "HR Tech for remote-first SMBs" is better.',
      example: '"Healthtech → Remote patient monitoring → Chronic disease management"',
      effort: '~10 mins',
    },
  },
  hone: {
    'Target customer': {
      what: 'Describe the exact person who has this problem: job title, company size, daily context, pain frequency.',
      why: 'The narrower your target, the easier it is to find them, reach them, and build for them.',
      tip: 'Name a real person you know who has this problem. Build for them first.',
      example: '"Head of Engineering at a 20–50 person startup who spends 4+ hrs/week in code review and has no dedicated QA team."',
      effort: '~45 mins',
    },
    'Describe problem': {
      what: 'Write what happens today when your customer hits this problem — step by step — and what it costs them.',
      why: 'Understanding the current workaround reveals what people are already paying (time or money) to solve this.',
      tip: 'Use the phrase: "Right now, when [customer] needs to [goal], they have to [painful workaround]."',
      example: '"Right now, when a startup Head of Eng needs to review a PR, they have to manually read diffs, leave comments, chase devs on Slack, and repeat — losing 2–3hrs per PR."',
      effort: '~1 hr',
    },
    'Score idea': {
      what: 'Rate your idea on three dimensions (1–10): Desirability (do people want it?), Feasibility (can you build it?), Viability (can you make money?).',
      why: 'Scoring forces honest assessment before you invest more time. A 3/10 on viability is a red flag worth catching early.',
      tip: 'Score it now, then re-score after your first 5 customer interviews. The delta is the insight.',
      example: 'Desirability 8 · Feasibility 6 · Viability 7 → Total: 21/30',
      effort: '~30 mins',
    },
    'Founder statement': {
      what: 'Write a 2-sentence pitch that combines who you are, what you\'re building, and why you\'re the right person to build it.',
      why: 'This becomes your intro at events, your LinkedIn headline, and your cold email opener.',
      tip: 'End with a question hook: "…and I\'d love to show you a demo — when\'s a good time?"',
      example: '"I\'m Shyam, ex-ML engineer, building an AI podcast platform for B2B SaaS companies. We replace a $15k/yr agency with a $99/mo tool — happy to send you a free pilot."',
      effort: '~30 mins',
    },
  },
  validate: {
    'Who to talk to': {
      what: 'List 5 specific people — names and contact info — who match your target customer profile.',
      why: 'Vague targets lead to vague interviews. Naming real people forces you to commit.',
      tip: 'Start with warm contacts: ex-colleagues, LinkedIn 2nd connections, Reddit community members.',
      example: '"1. James T (ex-colleague, Eng Lead at Canva) 2. Maria S (met at ProductCon, PM at Atlassian) …"',
      effort: '~1 hr',
    },
    'Key question': {
      what: 'Write the single most important question you need answered to validate or kill this idea.',
      why: 'One sharp question beats ten fuzzy ones. It forces you to know what "validated" actually means.',
      tip: 'Your key question should be falsifiable — if you can\'t imagine a "no" answer, it\'s too leading.',
      example: '"Do you currently pay (money or significant time) to solve this problem, and would a $99/mo tool be worth switching to?"',
      effort: '~30 mins',
    },
    'Reach out': {
      what: 'Contact your 5 targets. Use direct outreach, a survey link, or the community challenge.',
      why: 'The fastest path to insight is a real conversation. Email + LinkedIn DM + community all work.',
      tip: 'Keep your ask small: "15 minutes to share your experience — no pitch, just research."',
      example: '"Hey James — I\'m researching code review pain points. Would you spare 15 mins this week? No pitch, just listening."',
      effort: '~2 hrs',
    },
    'Log conversations': {
      what: 'Record what each person actually said — verbatim quotes, not summaries. Log pain intensity (1–5) and willingness to pay.',
      why: 'Verbatim quotes are evidence. Paraphrases are opinions. You\'ll need the raw data for your verdict.',
      tip: 'Ask "tell me about the last time this happened" — past behaviour beats hypothetical intent every time.',
      example: '"She said: \'We wasted an entire sprint because nobody caught the auth bug in review — it cost us 2 weeks of rework.\' Pain: 5/5. WTP: yes, up to $200/mo."',
      effort: '~5–8 hrs total',
    },
    'Review verdict': {
      what: 'Tally your conversations and assign a verdict: Validated · Needs pivot · Uncertain.',
      why: 'You need a decision rule before you build. Three or more "I\'d pay for this" = validated.',
      tip: 'Validated ≠ unanimous. A strong majority of clear yeses with willingness to pay is enough to proceed.',
      example: '"3/5 confirmed the pain. 2/5 willing to pay today. 1 intro to their VP offered. → Verdict: Validated."',
      effort: '~1 hr',
    },
  },
  shape: {
    'Simplest version': {
      what: 'Write a one-paragraph hypothesis: "The simplest thing I can build in 4 weeks that proves the core value is…"',
      why: 'Constraints produce focus. Defining "simplest" prevents scope creep before you even start.',
      tip: 'Ask yourself: what would make someone pay us $1 today? That\'s your MVP.',
      example: '"A Chrome extension that highlights unreviewed code blocks and auto-pings the reviewer on Slack. No dashboard, no analytics — just the alert."',
      effort: '~2 hrs',
    },
    '3 core features': {
      what: 'Pick exactly 3 features. Write each as a user story: "As a [user], I want to [action] so that [outcome]."',
      why: 'Three is the magic number. More than three and you\'re building a product, not an MVP.',
      tip: 'For each feature ask: "If we shipped without this, would the core value break?" If no — cut it.',
      example: '"1. As an Eng Lead, I want to see all open PRs flagged by risk level so I know where to focus. 2. As a reviewer, I want one-click approval so I\'m not blocked on UI. 3. As a dev, I want a Slack ping when my PR is approved so I can merge fast."',
      effort: '~3 hrs',
    },
    'Go-live date': {
      what: 'Set a specific calendar date to ship — not "in 4 weeks" but "July 28th". Tell someone.',
      why: 'A public commitment creates accountability. Vague timelines slip; named dates don\'t.',
      tip: 'Work backwards from the date. If you have 4 weeks and 3 features, that\'s ~1 week per feature plus 1 week buffer.',
      example: '"Ship to 3 beta users by July 28th. Demo video posted to community by Aug 4th."',
      effort: '~30 mins',
    },
    'Build plan': {
      what: 'Break each feature into tasks. For each task: owner, effort estimate (hrs), and done-when criteria.',
      why: 'A plan without tasks is a wish. Breaking it down reveals blockers before you hit them.',
      tip: 'No task should be larger than 4 hrs. If it is, break it down further.',
      example: '"Feature 1: PR risk score. Tasks: (a) scrape GitHub PR data (2h) (b) build risk model (4h) (c) render badge in extension (2h) → Total: 8h"',
      effort: '~2 hrs',
    },
  },
  done: {
    'Build MVP': {
      what: 'Build only the 3 features from your build plan. Resist adding anything else.',
      why: 'Shipping fast beats shipping perfect. Your first users will tell you what matters — don\'t guess.',
      tip: 'Set a "feature freeze" 3 days before your go-live date. No new features after that point.',
      example: 'Chrome extension shipped with 3 features, basic auth, and a feedback form.',
      effort: '2–6 weeks',
    },
    'Find first users': {
      what: 'Identify 10 specific people who will use the product from day one. Reach out personally to each.',
      why: 'Your first 10 users are your co-founders. Their feedback shapes everything. Generic launch posts don\'t find them.',
      tip: 'Go back to your 5 validation interview contacts first. They already said they\'d pay.',
      example: '"5 from validation interviews, 3 from ProductHunt launch, 2 from personal network. All onboarded manually."',
      effort: '~1 week',
    },
    'Ship it': {
      what: 'Deploy to production. Share the link publicly. Post to the community. Write your launch post.',
      why: 'Shipping is the milestone. Everything before this is theory — shipping makes it real.',
      tip: 'Don\'t wait for perfect. A working product with 3 users beats a polished deck with 0.',
      example: '"Launched on ProductHunt (Day: 8th), posted in 3 Slack communities, emailed 50 beta waitlist — 23 signups in 24hrs."',
      effort: '1–2 days',
    },
  },
};

// ── Conversation plan generator ──────────────────────────────────────────────
interface ConvSlot { persona: string; timeEst: string; suggestedDay: number; }

function generateConversationPlan(ideaName: string, count: number, targetDays: number): ConvSlot[] {
  const n = ideaName.toLowerCase();

  const isFood    = /food|meal|recipe|cook|fridge|kitchen|eat|grocery|restaurant|diet|nutrition/.test(n);
  const isHealth  = /health|medical|doctor|patient|wellness|fitness|clinic|therapy|mental|pharma/.test(n);
  const isEdu     = /learn|student|tutor|course|school|study|teach|education|skill|train|quiz/.test(n);
  const isFinance = /finance|money|budget|invest|bank|tax|expense|saving|wealth|payment|payroll/.test(n);
  const isDev     = /code|dev|api|engineer|bot|ai|software|tech|automation|saas|data|platform|debug/.test(n);
  const isB2B     = /b2b|enterprise|business|company|team|workflow|ops|operations|corporate|hr|crm/.test(n);

  const SETS: Record<string, { personas: string[]; times: string[] }> = {
    food:    { personas: ['Busy home cook (30–45)', 'Meal-prep enthusiast', 'Parent cooking for family', 'Health-conscious millennial', 'Student on a budget', 'Fitness-focused adult', 'Weekend amateur chef'],    times: ['45 min', '1 hr',   '1 hr',   '45 min', '30 min', '1 hr',   '1.5 hrs'] },
    health:  { personas: ['Patient with chronic condition', 'General practitioner (GP)', 'Family caregiver', 'Health-conscious adult (25–40)', 'Practice manager', 'Telehealth user', 'Wellness coach'],             times: ['1 hr',   '1.5 hrs', '1 hr',   '45 min', '1.5 hrs', '45 min', '1 hr'  ] },
    edu:     { personas: ['College student (undergrad)', 'Working professional upskilling', 'High school teacher', 'Parent of K-12 child', 'Bootcamp graduate', 'Online self-learner', 'Corporate L&D manager'],    times: ['45 min', '1 hr',   '1.5 hrs','45 min', '30 min', '45 min', '1.5 hrs'] },
    finance: { personas: ['Freelancer tracking expenses', 'Young professional budgeting', 'Small business owner', 'Grad with student debt', 'Mid-career investor', 'Gig economy worker', 'Retiree planning income'], times: ['1 hr',   '45 min', '1.5 hrs','45 min', '1 hr',   '30 min', '1 hr'  ] },
    dev:     { personas: ['Solo indie hacker / founder', 'Tech lead at seed-stage startup', 'Early-career developer', 'DevOps / platform engineer', 'Technical product manager', 'Freelance developer', 'CTO at series-A'], times: ['1 hr', '1.5 hrs','45 min', '1 hr',   '1.5 hrs', '45 min', '1 hr'  ] },
    b2b:     { personas: ['Decision maker at SMB (10–50)', 'Head of operations', 'Procurement manager', 'Team lead (10–30 ppl)', 'Startup founder (series A)', 'Product manager at B2B SaaS', 'VP of engineering'], times: ['1.5 hrs','1 hr',   '1 hr',   '45 min', '1.5 hrs', '1 hr',   '1.5 hrs'] },
    generic: { personas: ['Early adopter in target segment', 'Domain expert / practitioner', 'Potential power user', 'Adjacent market user', 'Skeptic who still has the pain', 'Referral from your network', 'Power-user of competing product'], times: ['45 min','1.5 hrs','1 hr','45 min','1 hr','30 min','1.5 hrs'] },
  };

  const key = isFood ? 'food' : isHealth ? 'health' : isEdu ? 'edu' : isFinance ? 'finance' : isDev ? 'dev' : isB2B ? 'b2b' : 'generic';
  const { personas, times } = SETS[key];

  return Array.from({ length: count }, (_, i) => ({
    persona: personas[i % personas.length],
    timeEst: times[i % times.length],
    suggestedDay: Math.round((i + 0.5) * (targetDays / count)),
  }));
}

// ── Timeline Modal (Gantt) ────────────────────────────────────────────────────

function TimelineModal({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [selectedStep, setSelectedStep] = useState<{ stageKey: string; stepName: string } | null>(null);
  const [validateTarget, setValidateTarget] = useState(5);
  const [validateExpanded, setValidateExpanded] = useState(false);

  // Display label for steps — 'Log conversations' expands to 'Log N conversations'
  function getStepLabel(sk: string, step: string) {
    if (sk === 'validate' && step === 'Log conversations') return `Log ${validateTarget} conversations`;
    return step;
  }

  const totalDays   = getTotalDays(idea);
  const daysInStage = getDaysInStage(idea);
  const rag         = getRAG(idea);
  const rs          = RAG_STYLE[rag];
  const currentIdx  = STAGE_ORDER.indexOf(idea.stage as Stage);
  const startDate   = new Date(idea.created_at);

  function exportPDF() {
    const win = window.open('', '_blank');
    if (!win) return;
    const el = document.getElementById('gantt-print-area');
    if (!el) return;
    win.document.write(`
      <html><head><title>${idea.name} — Timeline</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1d1d1f; padding: 32px; }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #6e6e73; margin-bottom: 24px; }
        .stats { display: flex; gap: 32px; margin-bottom: 24px; }
        .stat-val { font-size: 22px; font-weight: 800; }
        .stat-lbl { font-size: 11px; color: #8e8e93; }
        .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #b0b0b8; margin-bottom: 14px; }
        .stage-row { margin-bottom: 18px; }
        .stage-label { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
        .bar-wrap { background: #f5f5f7; border-radius: 6px; height: 18px; position: relative; margin-bottom: 6px; }
        .bar { position: absolute; top: 0; height: 100%; border-radius: 6px; }
        .chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .chip { font-size: 10px; padding: 2px 8px; border-radius: 20px; border: 1px solid #e5e5ea; }
        .chip-done { background: #f0fdf4; color: #16a34a; border-color: #86efac; }
        .chip-active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
        .chip-future { background: #f5f5f7; color: #c0c0c8; }
        .axis { display: flex; justify-content: space-between; margin-top: 8px; font-size: 9px; color: #aeaeb2; }
        .legend { display: flex; gap: 16px; margin-top: 24px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6e6e73; }
        .legend-dot { width: 10px; height: 8px; border-radius: 2px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  }

  // Total axis length = max of (actual days so far) and (full target: 109d)
  const FULL_TARGET = 109; // sum of all stage targets
  const axisEnd     = Math.max(totalDays + 14, FULL_TARGET + 14); // a little breathing room

  // Helper: day offset → percentage on axis
  const pct = (day: number) => Math.min(100, Math.max(0, (day / axisEnd) * 100));

  // Build stage bars
  const stageBars = STAGE_ORDER.map((stageKey, i) => {
    const tl          = STAGE_TL[stageKey as Stage];
    const isCompleted = i < currentIdx;
    const isCurrent   = i === currentIdx;
    const isFuture    = i > currentIdx;

    const cumulStart = STAGE_CUMULATIVE_START[stageKey as Stage];
    const daysSpent  = isCompleted ? tl.target : isCurrent ? daysInStage : 0;
    const barEnd     = isCompleted
      ? cumulStart + tl.target
      : isCurrent
        ? cumulStart + daysInStage
        : cumulStart + tl.target; // future: show target width

    // RAG for this stage
    let stageRag: 'green' | 'amber' | 'red' = 'green';
    if (isCurrent && tl.target > 0) {
      if (daysSpent > tl.danger) stageRag = 'red';
      else if (daysSpent > tl.warn)   stageRag = 'amber';
      else if (daysSpent > tl.target) stageRag = 'amber';
    }

    // Bar color — green=completed, light-green=on track, light-orange=at risk, light-red=delayed, grey=future
    const barColor = isFuture
      ? '#e5e5ea'
      : isCompleted
        ? '#4ade80'                                   // solid green ✓ done
        : stageRag === 'red'   ? '#fecaca'            // light red — delayed
        : stageRag === 'amber' ? '#fed7aa'            // light orange — at risk
        : '#bbf7d0';                                  // light green — on track

    return { stageKey, tl, isCompleted, isCurrent, isFuture, cumulStart, barEnd, daysSpent, stageRag, barColor };
  });

  const LABEL_W    = 72;   // px for stage labels (left sticky)
  const BADGE_W    = 96;   // px for badges (right sticky)
  const DAY_W      = 12;   // px per calendar day
  const chartWidth = (Math.ceil(axisEnd) + 1) * DAY_W;
  const dayToPx    = (day: number) => Math.max(0, day * DAY_W);
  const todayPx    = dayToPx(totalDays);

  const drillDetail = selectedStep
    ? (STEP_DETAILS[selectedStep.stageKey]?.[selectedStep.stepName] ?? null)
    : null;
  const drillStageColor = selectedStep
    ? STAGE_TL[selectedStep.stageKey as Stage]?.color ?? '#1d1d1f'
    : '#1d1d1f';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 400, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '96%', maxWidth: 980,
        maxHeight: '92vh', overflowY: 'auto',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,.2)', zIndex: 401,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Color bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#2563eb,#7c3aed,#059669,#d97706,#1d1d1f)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -.4, color: '#1d1d1f', marginBottom: 3 }}>{idea.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#8e8e93' }}>
                Started {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {totalDays} days ago
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: rs.bg, color: rs.color, border: `1.5px solid ${rs.border}` }}>
                {rs.label}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, border: '1.5px solid #e5e5ea', background: '#fafafa', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#3a3a3c', cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1d1d1f'; e.currentTarget.style.background = '#f5f5f7'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.background = '#fafafa'; }}
            >
              ↓ Export PDF
            </button>
            <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#6e6e73', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', borderBottom: '1px solid #f0f0f5', flexShrink: 0 }}>
          {[
            { val: `${totalDays}d`, lbl: 'Total elapsed' },
            { val: `${daysInStage}d`, lbl: 'In current stage', color: rag === 'red' ? '#dc2626' : rag === 'amber' ? '#d97706' : '#059669' },
            { val: `${currentIdx} / 4`, lbl: 'Stages done' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 20px', borderRight: i < 2 ? '1px solid #f0f0f5' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -.5, color: s.color ?? '#1d1d1f' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Body: Gantt + optional drilldown */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, minHeight: 0 }}>

          {/* ── Gantt panel ── */}
          <div id="gantt-print-area" style={{ flex: 1, minWidth: 0, padding: '20px 24px 24px', borderRight: selectedStep ? '1px solid #f0f0f5' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#b0b0b8', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 16 }}>
              Gantt · Calendar View {selectedStep && <span style={{ color: '#7c3aed', marginLeft: 8 }}>← Click a step to drill in</span>}
            </div>

            {/* Scrollable Gantt body — sticky labels + fixed-width day track */}
            <div style={{ overflowX: 'auto', overflowY: 'visible', marginBottom: 4 }}>
              <div style={{ minWidth: LABEL_W + chartWidth + BADGE_W }}>

                {stageBars.map(({ stageKey, tl, isCompleted, isCurrent, isFuture, cumulStart, barEnd, daysSpent, stageRag, barColor }) => {
                  const barLeft     = dayToPx(cumulStart);
                  const barRight    = dayToPx(barEnd);
                  const barWidth    = Math.max(barRight - barLeft, 2);
                  const targetEndPx = dayToPx(cumulStart + tl.target);
                  const steps       = STAGE_STEPS[stageKey] ?? [];

                  return (
                    <div key={stageKey}>
                      {/* Main stage row */}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: stageKey === 'validate' && validateExpanded ? 2 : 5 }}>

                        {/* Sticky label */}
                        <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky' as const, left: 0, zIndex: 5, background: '#fff', display: 'flex', alignItems: 'center', gap: 4, paddingRight: 6, overflow: 'visible' as const }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: isCompleted ? '#22c55e' : isCurrent ? (stageRag === 'red' ? '#ef4444' : stageRag === 'amber' ? '#f97316' : '#22c55e') : '#e5e5ea',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                            boxShadow: isCurrent ? `0 0 0 3px ${stageRag === 'red' ? '#ef444425' : stageRag === 'amber' ? '#f9731625' : '#22c55e25'}` : 'none',
                          }}>
                            {isCompleted ? <span style={{ fontSize: 9, color: '#fff', fontWeight: 900 }}>✓</span> : <span>{tl.icon}</span>}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: isCurrent ? 800 : 600, color: isFuture ? '#c0c0c8' : '#3a3a3c', textTransform: 'capitalize' as const, flex: 1 }}>
                            {stageKey === 'done' ? 'Ship' : stageKey}
                          </span>
                          {stageKey === 'validate' && (
                            <button onClick={() => setValidateExpanded(e => !e)} title={validateExpanded ? 'Collapse' : 'Expand conversations'} style={{ padding: '2px 5px', background: validateExpanded ? tl.color : `${tl.color}20`, border: `1px solid ${tl.color}60`, borderRadius: 5, cursor: 'pointer', fontSize: 10, color: validateExpanded ? '#fff' : tl.color, lineHeight: 1, flexShrink: 0, transition: 'all .15s', fontFamily: 'inherit', fontWeight: 700 }}>
                              <span style={{ display: 'inline-block', transform: validateExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', fontSize: 9 }}>▶</span>
                            </button>
                          )}
                        </div>

                        {/* Fixed-width px track */}
                        <div style={{ width: chartWidth, flexShrink: 0, position: 'relative', height: 28, background: '#f5f5f7', borderRadius: 8, overflow: 'hidden' }}>
                          {/* Today line */}
                          <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1.5, background: 'rgba(0,0,0,0.10)', zIndex: 0 }} />
                          {/* Bar */}
                          <div style={{
                            position: 'absolute', left: barLeft, width: barWidth,
                            top: 0, bottom: 0, borderRadius: 6, background: barColor,
                            opacity: isFuture ? 0.4 : 1,
                            border: isCompleted ? '1.5px solid #22c55e' : isCurrent && stageRag === 'red' ? '1.5px solid #ef4444' : isCurrent && stageRag === 'amber' ? '1.5px solid #f97316' : isCurrent ? '1.5px solid #16a34a' : 'none',
                            display: 'flex', alignItems: 'center', zIndex: 1,
                          }}>
                            {barWidth > 30 && <span style={{ fontSize: 9, fontWeight: 700, color: isFuture ? '#9ca3af' : isCompleted ? '#fff' : stageRag === 'red' ? '#b91c1c' : stageRag === 'amber' ? '#c2410c' : '#15803d', paddingLeft: 5, whiteSpace: 'nowrap' as const }}>{isFuture ? `${tl.target}d` : `${daysSpent}d`}</span>}
                          </div>
                          {/* Target dashed line */}
                          {!isCompleted && tl.target > 0 && <div style={{ position: 'absolute', left: targetEndPx, top: 0, bottom: 0, width: 1.5, borderLeft: '1.5px dashed #059669', opacity: 0.45, zIndex: 2 }} />}
                          {/* Step chips */}
                          <div style={{ position: 'absolute', left: barRight + 6, right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', zIndex: 3 }}>
                            {steps.map((step) => {
                              const isSelected = selectedStep?.stageKey === stageKey && selectedStep?.stepName === step;
                              return (
                                <button key={step} onClick={() => setSelectedStep(isSelected ? null : { stageKey, stepName: step })} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, flexShrink: 0, fontSize: 9, fontWeight: 700, background: isSelected ? tl.color : isCompleted ? '#dcfce7' : isCurrent ? `${tl.color}18` : 'transparent', color: isSelected ? '#fff' : isCompleted ? '#16a34a' : isCurrent ? tl.color : '#b0b0b8', border: `1px solid ${isSelected ? tl.color : isCompleted ? '#86efac' : isCurrent ? tl.color + '35' : '#e0e0e5'}`, opacity: isFuture && !isSelected ? 0.6 : 1, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                                  {isSelected ? '▼' : isCompleted ? '✓' : isCurrent ? '●' : '○'} {getStepLabel(stageKey, step)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sticky badge */}
                        <div style={{ width: BADGE_W, flexShrink: 0, position: 'sticky' as const, right: 0, zIndex: 5, background: '#fff', paddingLeft: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: 3 }}>
                          {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: RAG_STYLE[stageRag].bg, color: RAG_STYLE[stageRag].color, border: `1px solid ${RAG_STYLE[stageRag].border}`, whiteSpace: 'nowrap' as const }}>{stageRag === 'green' ? `${tl.target - daysSpent}d left` : stageRag === 'amber' ? `+${daysSpent - tl.target}d` : `+${daysSpent - tl.warn}d`}</span>}
                          {isCompleted && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>✓ done</span>}
                          {isFuture && <span style={{ fontSize: 10, color: '#d1d5db' }}>~{tl.target}d</span>}
                          {stageKey === 'validate' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <button onClick={() => setValidateTarget(t => Math.max(5, t - 1))} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #d1d5db', background: '#f5f5f7', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: validateTarget <= 5 ? 'not-allowed' : 'pointer', color: validateTarget <= 5 ? '#c0c0c8' : '#3a3a3c', fontFamily: 'inherit', flexShrink: 0 }}>−</button>
                              <span style={{ fontSize: 11, fontWeight: 700, color: tl.color, minWidth: 14, textAlign: 'center' as const }}>{validateTarget}</span>
                              <button onClick={() => setValidateTarget(t => t + 1)} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #d1d5db', background: '#f5f5f7', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3a3a3c', fontFamily: 'inherit', flexShrink: 0 }}>+</button>
                              <span style={{ fontSize: 9, color: '#9ca3af' }}>👥</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Validate conversation sub-rows */}
                      {stageKey === 'validate' && validateExpanded && (() => {
                        const convPlan = generateConversationPlan(idea.name, validateTarget, tl.target);
                        return (
                          <div style={{ marginBottom: 5 }}>
                            {convPlan.map((slot, i) => {
                              const slotDays     = tl.target / validateTarget;
                              const slotStartDay = cumulStart + i * slotDays;
                              const slotEndDay   = cumulStart + (i + 1) * slotDays;
                              const slotLeft     = dayToPx(slotStartDay);
                              const slotRight    = dayToPx(slotEndDay);
                              const slotWidth    = Math.max(slotRight - slotLeft, 2);
                              const slotColor    = isFuture ? '#e5e5ea' : isCompleted ? `${tl.color}55` : `${tl.color}45`;
                              const slotBorder   = isFuture ? '#d1d5db' : tl.color + '70';
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                                  <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky' as const, left: 0, zIndex: 5, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: isFuture ? '#d1d5db' : isCompleted ? '#9ca3af' : tl.color }}>#{i + 1}</span>
                                  </div>
                                  <div style={{ width: chartWidth, flexShrink: 0, position: 'relative', height: 20, background: '#f5f5f7', borderRadius: 5, overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: slotLeft, width: slotWidth, top: 2, bottom: 2, borderRadius: 4, background: slotColor, border: `1px solid ${slotBorder}` }} />
                                    <div style={{ position: 'absolute', left: slotRight + 5, right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                                      <span style={{ fontSize: 9.5, fontWeight: 600, color: isFuture ? '#c0c0c8' : isCompleted ? '#6b7280' : '#3a3a3c', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {slot.persona}</span>
                                    </div>
                                  </div>
                                  <div style={{ width: BADGE_W, flexShrink: 0, position: 'sticky' as const, right: 0, zIndex: 5, background: '#fff', paddingLeft: 8, display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: isFuture ? '#c0c0c8' : tl.color }}>⏱ {slot.timeEst}</span>
                                    <span style={{ fontSize: 9, color: '#aeaeb2' }}>Day {slot.suggestedDay}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Day-by-day axis */}
                <div style={{ display: 'flex', marginTop: 4 }}>
                  <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky' as const, left: 0, zIndex: 5, background: '#fff' }} />
                  <div style={{ width: chartWidth, flexShrink: 0, position: 'relative', height: 38, borderTop: '1px solid #e5e5ea' }}>
                    {Array.from({ length: Math.ceil(axisEnd) + 1 }, (_, d) => {
                      const x       = dayToPx(d);
                      const isToday = d === totalDays;
                      const isWeek  = d % 7 === 0;
                      const date    = new Date(startDate);
                      date.setDate(date.getDate() + d);
                      const label   = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      if (!isToday && !isWeek) return (
                        <div key={d} style={{ position: 'absolute', left: x, top: 0 }}>
                          <div style={{ width: 1, height: 3, background: '#e0e0e5' }} />
                        </div>
                      );
                      return (
                        <div key={d} style={{ position: 'absolute', left: x, top: 0 }}>
                          <div style={{ width: isToday ? 2 : 1, height: isToday ? 8 : 5, background: isToday ? '#1d1d1f' : '#b0b0b8' }} />
                          <div style={{ fontSize: 8.5, fontWeight: isToday ? 800 : 400, color: isToday ? '#1d1d1f' : '#aeaeb2', marginTop: 1, whiteSpace: 'nowrap' as const, transform: 'translateX(-50%)' }}>
                            {isToday ? 'Today' : label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ width: BADGE_W, flexShrink: 0, position: 'sticky' as const, right: 0, background: '#fff' }} />
                </div>

              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 18, paddingTop: 14, borderTop: '1px solid #f5f5f7', flexWrap: 'wrap' as const, marginLeft: LABEL_W }}>
              {[['#4ade80','Completed'],['#bbf7d0','On track'],['#fed7aa','Running late'],['#fecaca','Overdue'],['#e5e5ea','Upcoming']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6e6e73' }}>
                  <div style={{ width: 10, height: 7, borderRadius: 2, background: c }} />{l}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6e6e73' }}>
                <div style={{ width: 10, height: 0, borderTop: '1.5px dashed #059669' }} />Target end
              </div>
            </div>
          </div>

          {/* ── Drilldown panel ── */}
          {selectedStep && drillDetail && (
            <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, padding: '20px 20px 24px', overflowY: 'auto' as const, background: '#fafafa' }}>
              {/* Stage + step title */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: drillStageColor, marginBottom: 4 }}>
                  {selectedStep.stageKey} · Step detail
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f', lineHeight: 1.3, marginBottom: 8 }}>
                  {getStepLabel(selectedStep.stageKey, selectedStep.stepName)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${drillStageColor}12`, color: drillStageColor, border: `1px solid ${drillStageColor}30` }}>
                  ⏱ {(selectedStep?.stageKey === 'validate' && selectedStep?.stepName === 'Log conversations') ? `~${validateTarget}–${validateTarget * 2} hrs total` : drillDetail.effort}
                </div>
              </div>

              {/* Detail sections */}
              {[
                { emoji: '📌', label: 'What to do', text: (selectedStep?.stageKey === 'validate' && selectedStep?.stepName === 'Log conversations') ? `Have ${validateTarget} conversations and record what each person actually said — verbatim quotes, not summaries. Log pain intensity (1–5) and willingness to pay.` : drillDetail.what },
                { emoji: '💡', label: 'Why it matters', text: drillDetail.why },
                { emoji: '⚡', label: 'Pro tip', text: drillDetail.tip },
                { emoji: '📎', label: 'Example', text: drillDetail.example },
              ].map(({ emoji, label, text }) => (
                <div key={label} style={{ marginBottom: 14, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #f0f0f5' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8e8e93', letterSpacing: .8, marginBottom: 5 }}>
                    {emoji} {label}
                  </div>
                  <div style={{ fontSize: 12, color: '#3a3a3c', lineHeight: 1.6 }}>{text}</div>
                </div>
              ))}

              {/* CTA */}
              <button
                onClick={() => { onClose(); window.location.href = '/work'; }}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: drillStageColor, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4, transition: 'opacity .15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Go do this step →
              </button>

              <button
                onClick={() => setSelectedStep(null)}
                style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1px solid #e5e5ea', background: 'transparent', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#8e8e93', cursor: 'pointer', marginTop: 8 }}
              >
                ← Back to chart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── New Idea Modal ────────────────────────────────────────────────────────────

function NewIdeaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (idea: Idea) => void }) {
  const isMobile = useIsMobile();
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [stage, setStage]   = useState<Stage>('idea');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const create = async () => {
    if (!name.trim()) { setError('Give your idea a name.'); return; }
    setSaving(true);
    try {
      const res = await ideasApi.create({ name: name.trim(), description: desc.trim(), stage, ...(domain ? { business_domain: domain } : {}) });
      onCreated(res.data.idea);
    } catch {
      setError('Could not create idea. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '90%', maxWidth: 520, background: '#fff', borderRadius: 24,
        border: '1px solid #e5e5ea', boxShadow: '0 32px 80px rgba(0,0,0,.18)',
        zIndex: 301, maxHeight: '88dvh', overflowY: 'auto', overflowX: 'hidden',
      }}>
        {/* Accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#2563eb,#059669)' }} />

        <div style={{ padding: '28px 32px 32px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -.5, marginBottom: 4, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>New idea</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 28 }}>Every startup starts with a thought worth chasing.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                Idea name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                autoFocus value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="e.g. AI meal planner for what's in your fridge"
                style={{ width: '100%', padding: '13px 16px', border: `2px solid ${error ? '#fca5a5' : '#e5e5ea'}`, borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#1d1d1f', transition: 'border-color .15s' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#7c3aed'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = error ? '#fca5a5' : '#e5e5ea'; }}
              />
              {error && <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6 }}>{error}</div>}
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                One-liner <span style={{ color: '#b0b0b8', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="What does it do and who is it for?"
                rows={2}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e5ea', borderRadius: 12, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit', background: '#fff', color: '#1d1d1f', transition: 'border-color .15s' }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#7c3aed'; }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#e5e5ea'; }}
              />
            </div>

            {/* Stage */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Where are you starting?</label>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 6 }}>
                {(['idea','hone','validate','shape','done'] as Stage[]).map(s => {
                  const sel = stage === s;
                  const color = STAGE_COLORS[s];
                  return (
                    <button key={s} onClick={() => setStage(s)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${sel ? color : '#e5e5ea'}`, background: sel ? `${color}12` : '#fafafa', transition: 'all .15s', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 16 }}>{STAGE_ICONS[s]}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: sel ? color : '#b0b0b8', letterSpacing: .5, textTransform: 'uppercase' }}>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Domain */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                Domain <span style={{ color: '#b0b0b8', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <select value={domain} onChange={e => setDomain(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e5ea', borderRadius: 12, fontSize: 14, outline: 'none', background: '#fff', color: domain ? '#1d1d1f' : '#b0b0b8', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box' }}>
                <option value="">Select a domain…</option>
                {Object.entries(DOMAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button onClick={create} disabled={!name.trim() || saving}
                style={{ flex: 2, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: name.trim() && !saving ? 'pointer' : 'default', opacity: name.trim() && !saving ? 1 : .4 }}>
                {saving ? 'Creating…' : 'Create →'}
              </button>
              <button onClick={onClose}
                style={{ flex: 1, background: '#fff', color: '#6e6e73', border: '1.5px solid #e5e5ea', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Idea Card ─────────────────────────────────────────────────────────────────

function VaultCard({ idea, isActive, onClick, onStatusChange, onViewCanvas, onTimeline, onRoadmap }: {
  idea: Idea;
  isActive: boolean;
  onClick: () => void;
  onStatusChange: (id: string, status: 'active' | 'done' | 'archived') => void;
  onViewCanvas: (e: React.MouseEvent) => void;
  onTimeline: (e: React.MouseEvent) => void;
  onRoadmap: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const color      = STAGE_COLORS[idea.stage as Stage];
  const stageIdx   = STAGE_ORDER.indexOf(idea.stage as Stage);
  const isDone     = idea.idea_status === 'done';
  const isArchived = idea.idea_status === 'archived';
  // Idea/Hone/Validate are the core, required journey — Shape/Ship are an
  // optional continuation. Progress reflects the core (validate = 100%), so
  // an idea that stops at Validate reads as "done," not "60% finished."
  const CORE_STAGE_COUNT = 3;
  const isOptionalStage  = stageIdx >= CORE_STAGE_COUNT;
  const progress   = isDone ? 100 : Math.round((Math.min(stageIdx + 1, CORE_STAGE_COUNT) / CORE_STAGE_COUNT) * 100);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <div
        onClick={onClick}
        style={{
          background: '#fff',
          border: `1.5px solid ${hovered ? color : isActive ? color + '60' : '#e5e5ea'}`,
          borderRadius: 16,
          padding: '24px',
          cursor: 'pointer',
          transition: 'all .18s',
          boxShadow: hovered ? `0 8px 32px ${color}18` : isActive ? `0 2px 12px ${color}12` : '0 1px 4px rgba(0,0,0,.04)',
          transform: hovered ? 'translateY(-2px)' : 'none',
          opacity: isArchived ? .55 : 1,
          display: 'flex', flexDirection: 'column', gap: 16,
          userSelect: 'none',
        }}
      >
        {/* Top row: stage + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: isDone ? '#f0fdf4' : `${color}10`,
            color: isDone ? '#059669' : color,
            border: `1px solid ${isDone ? '#86efac' : color + '30'}`,
            borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700,
          }}>
            <span>{STAGE_ICONS[idea.stage as Stage]}</span>
            <span>{isDone ? 'Shipped' : STAGE_LABELS[idea.stage as Stage]}</span>
            {!isDone && isOptionalStage && (
              <span style={{ marginLeft: 2, fontSize: 9, fontWeight: 700, color: '#8e8e93' }}>· optional</span>
            )}
          </div>

          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#059669' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', boxShadow: '0 0 0 3px rgba(5,150,105,.2)' }} />
              Active
            </div>
          )}
        </div>

        {/* Idea name */}
        <div>
          <div style={{
            fontSize: 16, fontWeight: 700, letterSpacing: -.3, lineHeight: 1.35,
            color: '#1d1d1f', fontFamily: 'var(--font-display)', marginBottom: 6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {idea.name}
          </div>
          {idea.description && (
            <div style={{
              fontSize: 13, color: '#6e6e73', lineHeight: 1.55,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {idea.description}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b0b0b8', textTransform: 'uppercase', letterSpacing: .5 }}>Progress</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: isDone ? '#059669' : color }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: '#f0f0f5', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: isDone ? '#059669' : color, borderRadius: 2, transition: 'width .4s' }} />
          </div>
          {/* Stage dots */}
          <div style={{ display: 'flex', marginTop: 8, gap: 4 }}>
            {STAGE_ORDER.map((s, i) => {
              const done = i < stageIdx || isDone;
              const active = i === stageIdx && !isDone;
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={
                    i >= 3
                      ? { width: '100%', height: 0, borderTop: `2px dashed ${done ? STAGE_COLORS[s] : active ? `${color}50` : '#e5e5ea'}`, transition: 'border-color .3s' }
                      : { width: '100%', height: 3, borderRadius: 2, background: done ? STAGE_COLORS[s] : active ? `${color}50` : '#e5e5ea', transition: 'background .3s' }
                  } />
                  <span style={{ fontSize: 8, fontWeight: 600, fontStyle: i >= 3 ? 'italic' as const : 'normal' as const, color: done || active ? (done ? STAGE_COLORS[s] : color) : '#d2d2d7', textTransform: 'uppercase', letterSpacing: .3 }}>
                    {s.slice(0, 4)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); onTimeline(e); }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid #e5e5ea', background: '#fafafa', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: '#6e6e73', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1d1d1f'; e.currentTarget.style.color = '#1d1d1f'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#6e6e73'; }}
          >
            📊 Timeline
          </button>
          <button
            onClick={e => { e.stopPropagation(); onRoadmap(e); }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid #ede9fe', background: '#f5f3ff', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: '#7c3aed', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; }}
          >
            ✨ Roadmap
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => {
              const rag = getRAG(idea);
              const rs  = RAG_STYLE[rag];
              return (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                  {rs.label}
                </span>
              );
            })()}
            <span style={{ fontSize: 11, color: '#b0b0b8' }}>
              {timeAgo(idea.updated_at ?? idea.created_at)}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: hovered ? '#1d1d1f' : '#d2d2d7', transition: 'color .15s' }}>
            Do the Work →
          </div>
        </div>
      </div>

      {/* ··· menu */}
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: hovered ? '#f5f5f7' : 'transparent',
          border: `1px solid ${hovered ? '#e5e5ea' : 'transparent'}`,
          borderRadius: 6, width: 26, height: 26, fontSize: 14, cursor: 'pointer',
          color: '#b0b0b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, transition: 'all .15s', zIndex: 2,
        }}
      >
        ···
      </button>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', top: 44, right: 10, zIndex: 20,
            background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 170, overflow: 'hidden',
          }}>
            <button onClick={e => { e.stopPropagation(); onViewCanvas(e); setMenuOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              ⬡ View canvas
            </button>
            {idea.idea_status !== 'active' && (
              <button onClick={() => { onStatusChange(idea.id, 'active'); setMenuOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                ↩ Reactivate
              </button>
            )}
            {idea.idea_status === 'active' && (
              <button onClick={() => { onStatusChange(idea.id, 'done'); setMenuOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                🚀 Mark as shipped
              </button>
            )}
            {idea.idea_status !== 'archived' && (
              <button onClick={() => { onStatusChange(idea.id, 'archived'); setMenuOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6e6e73', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                📦 Archive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Compact idea display components (List / Kanban views) ───────────────────
// Mirrors CommunityPage's IdeaListRow / IdeaKanbanCard, scoped to the vault's
// own fields (no author/reactions — this is always the founder's own idea).

function VaultListRow({ idea, isActive, onClick }: {
  idea: Idea;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color  = STAGE_COLORS[idea.stage as Stage];
  const isDone = idea.idea_status === 'done';
  const rag    = getRAG(idea);
  const rs     = RAG_STYLE[rag];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const,
        padding: '10px 14px',
        background: '#fff',
        border: `1.5px solid ${hovered ? color + '50' : isActive ? color + '40' : '#e5e5ea'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? `0 4px 14px ${color}18` : 'none',
        opacity: idea.idea_status === 'archived' ? .55 : 1,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{STAGE_ICONS[idea.stage as Stage]}</span>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{idea.name}</span>
          {isActive && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>● Active</span>}
        </div>
        {idea.description && (
          <div style={{ fontSize: 12, color: '#8a8a92', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {idea.description}
          </div>
        )}
      </div>
      {idea.business_domain && (
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', background: '#f5f5f7', border: '1px solid #e5e5ea', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
          {DOMAIN_LABELS[idea.business_domain] ?? idea.business_domain}
        </span>
      )}
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
        {rs.label}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: .4, flexShrink: 0,
        background: isDone ? '#f0fdf4' : `${color}12`, color: isDone ? '#059669' : color,
        border: `1.5px solid ${isDone ? '#86efac' : color + '30'}`,
        borderRadius: 20, padding: '3px 10px',
      }}>
        {isDone ? '🚀 Shipped' : STAGE_LABELS[idea.stage as Stage]}
      </span>
      <span style={{ fontSize: 11, color: '#b0b0b8', fontWeight: 600, flexShrink: 0, width: 60, textAlign: 'right' as const }}>{timeAgo(idea.updated_at ?? idea.created_at)}</span>
    </div>
  );
}

// Narrow card for Kanban columns — same underlying idea data as VaultCard,
// stripped down to fit a ~260px lane.
function VaultKanbanCard({ idea, isActive, onClick }: {
  idea: Idea;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = STAGE_COLORS[idea.stage as Stage];
  const rag   = getRAG(idea);
  const rs    = RAG_STYLE[rag];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? color + '50' : isActive ? color + '40' : '#e5e5ea'}`,
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? `0 4px 14px ${color}18` : 'none',
        opacity: idea.idea_status === 'archived' ? .55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
          {rs.label}
        </span>
        {isActive && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#059669', flexShrink: 0 }}>● Active</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)', lineHeight: 1.35 }}>{idea.name}</div>
      {idea.description && (
        <div style={{ fontSize: 11, color: '#8a8a92', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {idea.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 10, color: '#b0b0b8', fontWeight: 600 }}>
        <span>{timeAgo(idea.updated_at ?? idea.created_at)}</span>
        {idea.business_domain && <span>· {DOMAIN_LABELS[idea.business_domain] ?? idea.business_domain}</span>}
      </div>
    </div>
  );
}

// ── Add new card placeholder ──────────────────────────────────────────────────

function AddCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#f5f3ff' : '#fafafa',
        border: `2px dashed ${hovered ? '#7c3aed' : '#d2d2d7'}`,
        borderRadius: 16, padding: '32px 24px',
        cursor: 'pointer', transition: 'all .18s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: 200, fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: hovered ? '#7c3aed' : '#e5e5ea',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, transition: 'all .18s',
      }}>
        {hovered ? '✨' : '+'}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: hovered ? '#7c3aed' : '#6e6e73', transition: 'color .18s' }}>
        New idea
      </div>
      <div style={{ fontSize: 12, color: '#b0b0b8', textAlign: 'center', lineHeight: 1.5 }}>
        Start with a name — that's all you need
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyProgressPage() {
  const navigate   = useNavigate();
  const { user, ideas, activeIdea, setActiveIdea, refreshIdeas } = useApp();

  const isMobile = useIsMobile();
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [canvasIdea, setCanvasIdea]   = useState<Idea | null>(null);
  const [switching, setSwitching]     = useState(false);
  const [showArchived, setShowArchived]   = useState(false);
  const [viewMode, setViewMode] = useState<VaultViewMode>(() => {
    const saved = localStorage.getItem(VAULT_VIEW_STORAGE_KEY);
    return (['grid', 'list', 'kanban', 'spotlight', 'domain'] as const).includes(saved as VaultViewMode) ? (saved as VaultViewMode) : 'grid';
  });
  useEffect(() => { localStorage.setItem(VAULT_VIEW_STORAGE_KEY, viewMode); }, [viewMode]);
  const [timelineIdea, setTimelineIdea]   = useState<Idea | null>(null);
  const [wizardIdea,    setWizardIdea]    = useState<Idea | null>(null);
  const [roadmapIdea,   setRoadmapIdea]   = useState<Idea | null>(null);
  const [effortResult,  setEffortResult]  = useState<EffortResult | null>(null);
  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(null);
  const [ideaAnswers,   setIdeaAnswers]   = useState<IdeaAnswers | null>(null);

  const active      = ideas.filter(i => i.idea_status === 'active');
  const shipped     = ideas.filter(i => i.idea_status === 'done');
  const archived    = ideas.filter(i => i.idea_status === 'archived');
  const nonArchived = active.concat(shipped);

  const handleClick = async (idea: Idea) => {
    if (switching) return;
    setSwitching(true);
    try {
      if (idea.id !== activeIdea?.id) {
        await ideasApi.update(idea.id, { is_active: true });
        setActiveIdea(idea);
      }
      navigate('/work');
    } catch { /* ignore */ }
    finally { setSwitching(false); }
  };

  const handleStatusChange = async (id: string, status: 'active' | 'done' | 'archived') => {
    try {
      await ideasApi.update(id, { idea_status: status });
      await refreshIdeas();
      if (activeIdea?.id === id && status !== 'active') setActiveIdea(null as unknown as Idea);
    } catch { /* ignore */ }
  };

  const handleCreated = async (idea: Idea) => {
    setShowNewIdea(false);
    await refreshIdeas();
    setActiveIdea(idea);
    navigate('/work');
  };

  const handleJourneyAction = () => {
    if (!activeIdea) { navigate('/progress'); return; }
    const dest = NEXT_STEPS[activeIdea.stage as Stage].ctaDest;
    navigate(dest === 'community' ? '/community' : '/work');
  };

  // Helper: open roadmap or wizard for any idea
  const openRoadmapFor = (idea: Idea) => {
    const profile = user ? loadFounderProfile(user.id) : null;
    const answers = loadIdeaAnswers(idea.id);
    if (profile && answers) {
      setFounderProfile(profile);
      setIdeaAnswers(answers);
      setEffortResult(calcEffort(profile, answers));
      setRoadmapIdea(idea);
    } else {
      setWizardIdea(idea);
    }
  };

  // Auto-load active idea estimates on mount
  useEffect(() => {
    if (!activeIdea || !user) return;
    const profile = loadFounderProfile(user.id);
    const answers = loadIdeaAnswers(activeIdea.id);
    if (profile && answers) {
      setFounderProfile(profile);
      setIdeaAnswers(answers);
      setEffortResult(calcEffort(profile, answers));
    }
  }, [activeIdea?.id, user?.id]);

  const renderGrid = (group: Idea[], withAddCard = false) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
    }}>
      {group.map(idea => (
        <VaultCard
          key={idea.id}
          idea={idea}
          isActive={idea.id === activeIdea?.id}
          onClick={() => handleClick(idea)}
          onStatusChange={handleStatusChange}
          onViewCanvas={e => { e.stopPropagation(); setCanvasIdea(idea); }}
          onTimeline={e => { e.stopPropagation(); setTimelineIdea(idea); }}
          onRoadmap={e => { e.stopPropagation(); openRoadmapFor(idea); }}
        />
      ))}
      {withAddCard && <AddCard onClick={() => setShowNewIdea(true)} />}
    </div>
  );

  // List — dense rows, most ideas visible at once
  const renderList = (group: Idea[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {group.map(idea => (
        <VaultListRow
          key={idea.id}
          idea={idea}
          isActive={idea.id === activeIdea?.id}
          onClick={() => handleClick(idea)}
        />
      ))}
    </div>
  );

  // Kanban — one column per stage, so you can see where all your ideas stand at a glance
  const renderKanban = (group: Idea[]) => (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
      {STAGE_ORDER.map(st => {
        const items = group.filter(i => (i.idea_status === 'done' ? 'done' : i.stage) === st);
        const color = STAGE_COLORS[st];
        return (
          <div key={st} style={{ flex: '0 0 260px', width: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0 2px 8px', borderBottom: `2px solid ${color}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color }}>{st === 'done' ? '🚀 Shipped' : STAGE_LABELS[st]}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#b0b0b8' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
              {items.length === 0 && (
                <div style={{ fontSize: 11, color: '#c0c0c8', textAlign: 'center', padding: '16px 0' }}>No ideas here</div>
              )}
              {items.map(idea => (
                <VaultKanbanCard key={idea.id} idea={idea} isActive={idea.id === activeIdea?.id} onClick={() => handleClick(idea)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Spotlight — the idea you're actively working on gets featured, rest below
  const renderSpotlight = (group: Idea[]) => {
    const spotlighted = group.filter(i => i.id === activeIdea?.id);
    const rest = group.filter(i => i.id !== activeIdea?.id);
    return (
      <>
        {spotlighted.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#b45309', textTransform: 'uppercase' as const, marginBottom: 12 }}>🌟 Spotlight — what you're working on</div>
            {renderGrid(spotlighted)}
          </div>
        )}
        {rest.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#b0b0b8', textTransform: 'uppercase' as const, marginBottom: 12 }}>
              {spotlighted.length > 0 ? 'More ideas' : 'All ideas'}
            </div>
            {renderGrid(rest)}
          </>
        )}
      </>
    );
  };

  // By domain — grouped into sections, biggest domain first
  const renderDomain = (group: Idea[]) => {
    const groups: Record<string, Idea[]> = {};
    group.forEach(idea => {
      const key = idea.business_domain || 'other';
      (groups[key] ||= []).push(idea);
    });
    const order = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([k]) => k);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {order.map(domainKey => (
          <div key={domainKey}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f' }}>
                {domainKey === 'other' ? '🗂️ Other' : (DOMAIN_LABELS[domainKey] ?? domainKey)}
              </span>
              <span style={{ fontSize: 12, color: '#b0b0b8', fontWeight: 600 }}>{groups[domainKey].length}</span>
            </div>
            {renderGrid(groups[domainKey])}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '40px 40px 100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#b0b0b8', marginBottom: 8 }}>My Idea Vault</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1, color: '#1d1d1f', fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
            Your ideas, all in one place. Click any idea to open the work wizard.
          </p>
        </div>
        <button
          onClick={() => setShowNewIdea(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 999,
            background: '#1d1d1f', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
        >
          + New idea
        </button>
      </div>

      {/* ── Empty state ── */}
      {ideas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>💡</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -.5, marginBottom: 8, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
            Your vault is empty
          </div>
          <div style={{ fontSize: 15, color: '#6e6e73', marginBottom: 32, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
            Every great startup started as a single thought.
          </div>
          <button onClick={() => setShowNewIdea(true)}
            style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.18)' }}>
            + Start my first idea
          </button>
        </div>
      )}

      {/* ── View switcher — same five layouts as the Community tab ── */}
      {ideas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b0b0b8', letterSpacing: .5, whiteSpace: 'nowrap' }}>View</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {VAULT_VIEW_MODES.map(v => (
              <button key={v.value} title={v.label} onClick={() => setViewMode(v.value)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                border: `1.5px solid ${viewMode === v.value ? '#1d1d1f' : '#e5e5ea'}`,
                background: viewMode === v.value ? '#1d1d1f' : '#fff',
                color: viewMode === v.value ? '#fff' : '#6e6e73',
                transition: 'all .15s',
              }}>
                <span>{v.icon}</span>
                {!isMobile && <span>{v.label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Grid view: Active & In Progress / Shipped, grouped as before ── */}
      {viewMode === 'grid' && active.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>In Progress</span>
            <span style={{ background: '#f5f5f7', border: '1px solid #e5e5ea', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#6e6e73' }}>{active.length}</span>
          </div>
          {renderGrid(active, true)}
        </div>
      )}

      {/* If no active ideas yet, show just the add card */}
      {viewMode === 'grid' && active.length === 0 && ideas.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 16 }}>In Progress</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <AddCard onClick={() => setShowNewIdea(true)} />
          </div>
        </div>
      )}

      {viewMode === 'grid' && shipped.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>🚀 Shipped</span>
            <span style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#059669' }}>{shipped.length}</span>
          </div>
          {renderGrid(shipped)}
        </div>
      )}

      {/* ── List / Kanban / Spotlight / By-domain: your active + shipped ideas together ── */}
      {viewMode !== 'grid' && nonArchived.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          {viewMode === 'list'      && renderList(nonArchived)}
          {viewMode === 'kanban'    && renderKanban(nonArchived)}
          {viewMode === 'spotlight' && renderSpotlight(nonArchived)}
          {viewMode === 'domain'    && renderDomain(nonArchived)}
        </div>
      )}
      {viewMode !== 'grid' && nonArchived.length === 0 && ideas.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <AddCard onClick={() => setShowNewIdea(true)} />
          </div>
        </div>
      )}

      {/* ── Archived (collapsible) ── */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showArchived ? 16 : 0 }}
          >
            <span style={{ fontSize: 12, transition: 'transform .2s', display: 'inline-block', transform: showArchived ? 'rotate(90deg)' : 'none', color: '#b0b0b8' }}>▶</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#b0b0b8' }}>Archived</span>
            <span style={{ background: '#f5f5f7', border: '1px solid #e5e5ea', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#b0b0b8' }}>{archived.length}</span>
          </button>
          {showArchived && renderGrid(archived)}
        </div>
      )}

      {/* ── Modals ── */}
      {wizardIdea && user && (
        <FounderWizardModal
          userId={user.id}
          ideaId={wizardIdea.id}
          ideaName={wizardIdea.name}
          initialProfile={founderProfile}
          initialAnswers={loadIdeaAnswers(wizardIdea.id)}
          onDone={(result, profile, answers) => {
            setEffortResult(result);
            setFounderProfile(profile);
            setIdeaAnswers(answers);
            setRoadmapIdea(wizardIdea);
            setWizardIdea(null);
          }}
          onClose={() => setWizardIdea(null)}
        />
      )}
      {roadmapIdea && effortResult && founderProfile && ideaAnswers && (
        <RoadmapWidget
          result={effortResult}
          profile={founderProfile}
          answers={ideaAnswers}
          ideaName={roadmapIdea.name}
          onRecalculate={() => { setWizardIdea(roadmapIdea); setRoadmapIdea(null); }}
          onClose={() => setRoadmapIdea(null)}
        />
      )}
      {timelineIdea && (
        <TimelineModal idea={timelineIdea} onClose={() => setTimelineIdea(null)} />
      )}
      {showNewIdea && (
        <NewIdeaModal onClose={() => setShowNewIdea(false)} onCreated={handleCreated} />
      )}

      {canvasIdea && (
        <IdeaCanvasModal
          idea={canvasIdea}
          isActive={canvasIdea.id === activeIdea?.id}
          onClose={() => setCanvasIdea(null)}
          onMakeActive={async (idea) => {
            await ideasApi.update(idea.id, { is_active: true });
            setActiveIdea(idea);
            setCanvasIdea(idea);
            await refreshIdeas();
          }}
        />
      )}
    </div>
  );
}
