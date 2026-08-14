import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { communityApi, ideasApi, donationsApi, challengesApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { Stage, STAGE_LABELS, STAGE_COLORS } from '@/types';
import IdeaCanvasModal from '@/components/IdeaCanvasModal';
import NetworkOfferModal from '@/components/NetworkOfferModal';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Types ─────────────────────────────────────────────────────────────────────
interface IdeaCard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  community_ask: string | null;
  stage: Stage;
  idea_status: 'active' | 'done' | 'archived';
  business_domain: string | null;
  author_name: string;
  author_initials: string;
  post_count: number;
  updated_at: string;
}

// ── Reactions ─────────────────────────────────────────────────────────────────
const REACTIONS = [
  { key: 'cheer',    emoji: '👏', label: 'Cheer'        },
  { key: 'fire',     emoji: '🔥', label: 'Hot idea'     },
  { key: 'bulb',     emoji: '💡', label: 'Insightful'   },
  { key: 'question', emoji: '🤔', label: 'Tell me more' },
] as const;
type RKey = typeof REACTIONS[number]['key'];

type RxStore = Record<string, { counts: Record<string, number>; mine: RKey | null }>;

// Seeded pseudo-random initial count so cards feel lived-in
function seedCount(ideaId: string, key: string): number {
  let h = 0;
  for (const c of `${ideaId}${key}`) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h % 12; // 0–11
}

function loadRx(): RxStore {
  try { return JSON.parse(localStorage.getItem('mvpclub_reactions') ?? '{}'); }
  catch { return {}; }
}
function saveRx(d: RxStore) {
  localStorage.setItem('mvpclub_reactions', JSON.stringify(d));
}

function ensureRx(store: RxStore, ideaId: string): RxStore {
  if (store[ideaId]) return store;
  const counts: Record<string, number> = {};
  REACTIONS.forEach(r => { counts[r.key] = seedCount(ideaId, r.key); });
  return { ...store, [ideaId]: { counts, mine: null } };
}

function engagementScore(idea: IdeaCard, store: RxStore): number {
  const rx = store[idea.id];
  const rxTotal = rx ? Object.values(rx.counts).reduce((a, b) => a + b, 0) : 0;
  return idea.post_count * 3 + rxTotal;
}

// ── Misc helpers ──────────────────────────────────────────────────────────────
const COMMUNITY_ASK_DEFAULTS: Record<Stage, string> = {
  idea:     'Looking for early feedback on this concept.',
  hone:     'Help me sharpen my value prop and audience.',
  validate: 'Seeking users to speak with about this pain point.',
  shape:    'Looking for advice on MVP scope.',
  done:     'Open to collaborators and investors.',
};

const STAGE_FILTER: { value: Stage | 'all'; label: string }[] = [
  { value: 'all',      label: 'All stages' },
  { value: 'idea',     label: '💡 Idea' },
  { value: 'hone',     label: '🎯 Hone' },
  { value: 'validate', label: '🧪 Validate' },
  { value: 'shape',    label: '🔨 Shape' },
  { value: 'done',     label: '🚀 Shipped' },
];

type SortMode = 'engagement' | 'newest' | 'responses';
const SORT_OPTS: { value: SortMode; label: string }[] = [
  { value: 'engagement', label: '🔥 Most active' },
  { value: 'newest',     label: '🕒 Newest'      },
  { value: 'responses',  label: '💬 Most replies' },
];

// ── Ideas tab display modes ──────────────────────────────────────────────────
// Five ways to browse the same filtered/sorted idea list — persisted locally so
// each person's preferred view sticks across visits.
type ViewMode = 'grid' | 'list' | 'kanban' | 'spotlight' | 'domain';
const VIEW_MODES: { value: ViewMode; icon: string; label: string }[] = [
  { value: 'grid',      icon: '▦',  label: 'Grid' },
  { value: 'list',      icon: '☰',  label: 'List' },
  { value: 'kanban',    icon: '🗂️', label: 'Kanban' },
  { value: 'spotlight', icon: '⭐', label: 'Spotlight' },
  { value: 'domain',    icon: '🏷️', label: 'By domain' },
];
const VIEW_STORAGE_KEY = 'mvpclub_community_view';
const KANBAN_STAGES: Stage[] = ['idea', 'hone', 'validate', 'shape', 'done'];

// An idea can be idea_status:'done' while its stage field still reads e.g. 'shape' —
// this mirrors the same "done wins" display rule IdeaHeroCard already uses for its badge.
const effectiveStage = (idea: IdeaCard): Stage => idea.idea_status === 'done' ? 'done' : idea.stage;

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Literary Serif theme ────────────────────────────────────────────────────
// Same warm, editorial treatment applied to the Community idea page — cream
// chrome, serif typography, brown/gold accent, near-square cards. Keeps the
// exact token values used there so the two pages feel like one system.
// Functional/semantic color-coding (STAGE_COLORS, post-type badges, pain
// point health/tension, challenge status, leaderboard ranks, etc.) is left
// untouched throughout this file — only the neutral chrome is restyled.
const LIT = {
  pageBg:           '#fbf8f2',
  card:             '#ffffff',
  cardTint:         '#faf6ee',
  text:             '#2b2318',
  muted:            '#8a7d64',
  secondary:        '#6b5d47',
  accent:           '#8a5a2b',
  accentSoft:       '#f3e7d4',
  accentSoftBorder: '#dfc9a3',
  border:           '#ece3d1',
  radius:           4,
  shadow:           '0 2px 14px rgba(70,50,15,.06)',
  headFont:         "'Playfair Display', Georgia, serif",
  bodyFont:         "'Cormorant Garamond', Georgia, serif",
};

// Tab bar active-state color — Classic Orange (#f07d19), chosen from the
// 60-shade swatch review. Scoped to the tab bar only; every other button,
// border, and accent on this page still uses LIT.accent.
const TAB_ACTIVE_COLOR = '#f07d19';

function Avatar({ initials, color, size = 38 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 5, background: color, color: '#fff', fontSize: size * 0.33, fontWeight: 800, fontFamily: LIT.headFont, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Reaction bar ──────────────────────────────────────────────────────────────
function ReactionBar({ ideaId, store, onToggle }: {
  ideaId: string;
  store: RxStore;
  onToggle: (ideaId: string, key: RKey) => void;
}) {
  const rx = store[ideaId] ?? { counts: {}, mine: null };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}
    >
      {REACTIONS.map(r => {
        const active = rx.mine === r.key;
        const count  = (rx.counts[r.key] ?? 0) + (active ? 0 : 0); // count already includes delta
        return (
          <button
            key={r.key}
            title={r.label}
            onClick={e => { e.stopPropagation(); onToggle(ideaId, r.key); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              border: `1.5px solid ${active ? LIT.accent : LIT.border}`,
              background: active ? LIT.accent : LIT.card,
              color: active ? '#fff' : LIT.secondary,
              transition: 'all .12s',
            }}
          >
            <span style={{ fontSize: 14 }}>{r.emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Idea Card ─────────────────────────────────────────────────────────────────
function IdeaHeroCard({ idea, onClick, onViewCanvas, onOfferNetwork, isOwnIdea, rxStore, onReact, rank }: {
  idea: IdeaCard;
  onClick: () => void;
  onViewCanvas: (e: React.MouseEvent) => void;
  onOfferNetwork: (e: React.MouseEvent) => void;
  isOwnIdea: boolean;
  rxStore: RxStore;
  onReact: (ideaId: string, key: RKey) => void;
  rank: number;
}) {
  const navigate = useNavigate();
  const color = STAGE_COLORS[idea.stage];
  const ask   = idea.community_ask || COMMUNITY_ASK_DEFAULTS[idea.stage];
  const [hovered, setHovered] = useState(false);
  const score = engagementScore(idea, rxStore);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: LIT.card,
        border: `1.5px solid ${hovered ? color + '60' : LIT.border}`,
        borderRadius: LIT.radius,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color .2s, box-shadow .2s, transform .15s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered
          ? `0 8px 32px ${color}20, 0 2px 8px rgba(70,50,15,0.08)`
          : LIT.shadow,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Coloured top accent bar */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${color}, ${color}80)`,
        flexShrink: 0,
      }} />

      {/* Card body */}
      <div style={{ padding: '20px 22px 18px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>

        {/* Top row: stage badge + rank */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `${color}12`, color,
            border: `1.5px solid ${color}30`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: 10, fontWeight: 800, letterSpacing: .6,
          }}>
            {idea.idea_status === 'done' ? '🚀 Shipped' : STAGE_LABELS[idea.stage]}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#fdf4ff' : '#f5f5f7',
            border: `1px solid ${rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#d8b4fe' : '#e5e5ea'}`,
            borderRadius: 20, padding: '3px 9px',
            fontSize: 10, fontWeight: 800,
            color: rank === 1 ? '#92400e' : rank === 2 ? '#475569' : rank === 3 ? '#7c3aed' : '#b0b0b8',
          }}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
            <span style={{ marginLeft: 3, opacity: .8 }}>{score} pts</span>
          </div>
        </div>

        {/* Idea name */}
        <div style={{
          fontSize: 19, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.25,
          marginBottom: 10, color: LIT.text, fontFamily: LIT.headFont,
        }}>
          {idea.name}
        </div>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <Avatar initials={idea.author_initials} color={color} size={24} />
          <span
            onClick={e => { e.stopPropagation(); navigate(`/community/member/${encodeURIComponent(idea.author_name)}`); }}
            style={{ fontWeight: 600, fontSize: 12, color: LIT.secondary, cursor: 'pointer', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = LIT.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = LIT.secondary)}
          >{idea.author_name}</span>
          <span style={{ fontSize: 11, color: LIT.muted }}>· {timeAgo(idea.updated_at)}</span>
          {idea.business_domain && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700,
              color: LIT.secondary, background: LIT.cardTint,
              border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '2px 8px',
              textTransform: 'capitalize', flexShrink: 0,
            }}>
              {DOMAIN_LABELS[idea.business_domain] ?? idea.business_domain}
            </span>
          )}
        </div>

        {/* Description */}
        {idea.description && (
          <div style={{
            fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, lineHeight: 1.65, marginBottom: 14,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {idea.description}
          </div>
        )}

        {/* Seeking block — left-bordered callout */}
        <div style={{
          marginBottom: 16,
          borderLeft: `3px solid ${color}`,
          borderRadius: '0 3px 3px 0',
          background: `${color}08`,
          padding: '9px 12px',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>
            🙋 Seeking
          </div>
          <div style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.text, fontWeight: 500, lineHeight: 1.5 }}>
            {ask}
          </div>
        </div>

        {/* Reaction bar */}
        <ReactionBar ideaId={idea.id} store={rxStore} onToggle={onReact} />

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingTop: 12, borderTop: `1px solid ${LIT.border}`, marginTop: 'auto',
        }}>
          <span style={{ fontSize: 11, color: LIT.muted, fontWeight: 600 }}>💬 {idea.post_count} {idea.post_count !== 1 ? 'replies' : 'reply'}</span>

          <div style={{ flex: 1 }} />

          {!isOwnIdea && (
            <button onClick={onOfferNetwork} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 11px', borderRadius: 3,
              background: LIT.accentSoft, border: `1.5px solid ${LIT.accentSoftBorder}`,
              color: LIT.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}>
              🤝 Offer network
            </button>
          )}
          <button onClick={onViewCanvas} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 11px', borderRadius: 3,
            background: hovered ? `${color}10` : LIT.cardTint,
            border: `1.5px solid ${hovered ? `${color}40` : LIT.border}`,
            color: hovered ? color : LIT.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            transition: 'all .15s', flexShrink: 0,
          }}>
            ⬡ Canvas
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700,
            color: hovered ? color : LIT.muted,
            transition: 'color .15s',
          }}>
            View <span style={{ fontSize: 13 }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  agritech:    '🌾 Agritech',
  'b2b-saas':  '💼 B2B SaaS',
  cleantech:   '♻️ Cleantech',
  consumer:    '📱 Consumer',
  devtools:    '🛠️ Dev Tools',
  edtech:      '🎓 Edtech',
  fintech:     '💰 Fintech',
  foodtech:    '🍔 Foodtech',
  healthtech:  '🏥 Healthtech',
  'hr-tech':   '👥 HR Tech',
  legaltech:   '⚖️ Legaltech',
  logistics:   '🚚 Logistics',
  marketplace: '🏪 Marketplace',
  media:       '🎙️ Media',
  proptech:    '🏠 Proptech',
};

// ── Compact idea display components (List / Kanban views) ───────────────────

// Dense single-row summary of an idea — used by the List view so far more
// ideas fit on screen at once than the full IdeaHeroCard grid allows.
function IdeaListRow({ idea, rank, onClick, rxStore }: {
  idea: IdeaCard;
  rank: number;
  onClick: () => void;
  rxStore: RxStore;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const color = STAGE_COLORS[idea.stage];
  const ask   = idea.community_ask || COMMUNITY_ASK_DEFAULTS[idea.stage];
  const score = engagementScore(idea, rxStore);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: isMobile ? 'wrap' as const : 'nowrap' as const,
        padding: '10px 14px',
        background: LIT.card,
        border: `1.5px solid ${hovered ? color + '50' : LIT.border}`,
        borderRadius: LIT.radius,
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? `0 4px 14px ${color}18` : 'none',
      }}
    >
      <span style={{ width: 24, textAlign: 'center', fontSize: 11, fontWeight: 800, color: rank <= 3 ? '#b45309' : LIT.muted, flexShrink: 0 }}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </span>
      <Avatar initials={idea.author_initials} color={color} size={26} />
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>{idea.name}</span>
          <span
            onClick={e => { e.stopPropagation(); navigate(`/community/member/${encodeURIComponent(idea.author_name)}`); }}
            style={{ fontSize: 11, color: LIT.muted, cursor: 'pointer' }}
          >{idea.author_name} · {timeAgo(idea.updated_at)}</span>
        </div>
        <div style={{ fontSize: 12.5, fontFamily: LIT.bodyFont, color: LIT.secondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          🙋 {ask}
        </div>
      </div>
      {idea.business_domain && (
        <span style={{ fontSize: 10, fontWeight: 700, color: LIT.secondary, background: LIT.cardTint, border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
          {DOMAIN_LABELS[idea.business_domain] ?? idea.business_domain}
        </span>
      )}
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: .4, flexShrink: 0,
        background: `${color}12`, color, border: `1.5px solid ${color}30`,
        borderRadius: 20, padding: '3px 10px',
      }}>
        {idea.idea_status === 'done' ? '🚀 Shipped' : STAGE_LABELS[idea.stage]}
      </span>
      <span style={{ fontSize: 11, color: LIT.muted, fontWeight: 600, flexShrink: 0, width: 68, textAlign: 'right' as const }}>💬 {idea.post_count} · {score}pt</span>
    </div>
  );
}

// Narrow card for Kanban columns — same underlying idea data as IdeaHeroCard,
// stripped down to fit a ~260px lane without the reaction bar / footer actions.
function IdeaKanbanCard({ idea, onClick, rxStore }: {
  idea: IdeaCard;
  onClick: () => void;
  rxStore: RxStore;
}) {
  const color = STAGE_COLORS[idea.stage];
  const ask   = idea.community_ask || COMMUNITY_ASK_DEFAULTS[idea.stage];
  const score = engagementScore(idea, rxStore);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: LIT.card,
        border: `1.5px solid ${hovered ? color + '50' : LIT.border}`,
        borderRadius: LIT.radius, padding: '12px 14px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? `0 4px 14px ${color}18` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Avatar initials={idea.author_initials} color={color} size={20} />
        <span style={{ fontSize: 11, fontWeight: 600, color: LIT.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.author_name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: LIT.muted, fontWeight: 700, flexShrink: 0 }}>{score}pt</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont, lineHeight: 1.3 }}>{idea.name}</div>
      <div style={{ fontSize: 11.5, fontFamily: LIT.bodyFont, color: LIT.secondary, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
        🙋 {ask}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 10, color: LIT.muted, fontWeight: 600 }}>
        <span>💬 {idea.post_count}</span>
        {idea.business_domain && <span>· {DOMAIN_LABELS[idea.business_domain] ?? idea.business_domain}</span>}
      </div>
    </div>
  );
}

// ── Win / Activity post types ────────────────────────────────────────────────

interface ActivityPost {
  id: string;
  user_id: string;
  idea_id: string | null;
  stage: Stage;
  content: string;
  post_type: string;
  created_at: string;
  author_name: string;
  author_initials: string;
  encourage_count?: number;
  comment_count?: number;
}

const WIN_STARTERS = [
  'I validated my idea with users today.',
  'I talked to my first potential customer.',
  'I shipped something and got feedback.',
  'I found a co-founder.',
  'I got my first signup.',
  'I finished my MVP definition.',
  'I completed all my validation interviews.',
  'I launched my landing page.',
];

const POST_TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  win:                { label: '🎉 Win',        color: '#059669', bg: '#f0fdf4' },
  update:             { label: '📝 Update',     color: '#2563eb', bg: '#eff6ff' },
  question:           { label: '❓ Question',   color: '#d97706', bg: '#fffbeb' },
  validation_request: { label: '🧪 Validation', color: '#7c3aed', bg: '#f5f3ff' },
  pain_point:         { label: '🎯 Pain point', color: '#dc2626', bg: '#fff5f5' },
  collab:             { label: '🤝 Collab',     color: '#92400e', bg: '#fffbeb' },
};

// ── Share a Win Modal ─────────────────────────────────────────────────────────

function ShareWinModal({ userStage, onClose, onPosted }: {
  userStage: Stage;
  onClose: () => void;
  onPosted: (post: ActivityPost) => void;
}) {
  const [text, setText]       = useState('');
  const [type, setType]       = useState<'win' | 'update' | 'question'>('win');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted]   = useState(false);
  const color = STAGE_COLORS[userStage];

  const handle = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await communityApi.createPost({ content: text.trim(), stage: userStage, post_type: type });
      setPosted(true);
      onPosted(res.data.post ?? { id: Date.now().toString(), user_id: '', idea_id: null, stage: userStage, content: text.trim(), post_type: type, created_at: new Date().toISOString(), author_name: 'You', author_initials: 'Y' });
      setTimeout(onClose, 1400);
    } catch { /* silent */ } finally { setPosting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 520, background: LIT.card, borderRadius: LIT.radius,
        boxShadow: '0 32px 80px rgba(0,0,0,.18)', zIndex: 301, overflow: 'hidden',
      }}>
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '24px 28px 28px' }}>
          {posted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>Shared with the community!</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4, color: LIT.text, fontFamily: LIT.headFont }}>Share with the community</div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 20, fontFamily: LIT.bodyFont }}>What happened? Other {STAGE_LABELS[userStage]} founders will see this.</div>

              {/* Type selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['win', 'update', 'question'] as const).map(t => {
                  const badge = POST_TYPE_BADGE[t];
                  const sel = type === t;
                  return (
                    <button key={t} onClick={() => setType(t)} style={{
                      padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: `1.5px solid ${sel ? badge.color : LIT.border}`,
                      background: sel ? badge.bg : LIT.card, color: sel ? badge.color : LIT.muted,
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}>
                      {badge.label}
                    </button>
                  );
                })}
              </div>

              {/* Starter chips */}
              {type === 'win' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {WIN_STARTERS.map(s => (
                    <button key={s} onClick={() => setText(s)} style={{
                      padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                      cursor: 'pointer', border: `1.5px solid ${LIT.border}`, background: text === s ? `${color}12` : LIT.cardTint,
                      color: text === s ? color : LIT.secondary, fontFamily: 'inherit',
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={type === 'win' ? 'What did you accomplish?' : type === 'question' ? 'What are you trying to figure out?' : 'What\'s happening with your idea?'}
                style={{
                  width: '100%', minHeight: 100, padding: '12px 14px',
                  border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 15,
                  resize: 'vertical', outline: 'none', fontFamily: LIT.bodyFont,
                  lineHeight: 1.6, color: LIT.text, background: LIT.cardTint, boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = color)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={handle}
                  disabled={!text.trim() || posting}
                  style={{
                    flex: 2, padding: '13px', borderRadius: LIT.radius,
                    background: text.trim() ? color : LIT.border,
                    color: text.trim() ? '#fff' : LIT.muted,
                    border: 'none', fontSize: 14, fontWeight: 700,
                    cursor: text.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}
                >
                  {posting ? 'Posting…' : 'Share →'}
                </button>
                <button onClick={onClose} style={{
                  flex: 1, padding: '13px', borderRadius: LIT.radius,
                  background: LIT.card, color: LIT.secondary,
                  border: `1.5px solid ${LIT.border}`, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Activity Post Card ────────────────────────────────────────────────────────

function ActivityCard({ post, onEncourage, onViewIdea }: {
  post: ActivityPost;
  onEncourage: (id: string) => void;
  onViewIdea: (ideaId: string) => void;
}) {
  const [encouraged, setEncouraged] = useState(false);
  const color = STAGE_COLORS[post.stage];
  const badge = POST_TYPE_BADGE[post.post_type] ?? POST_TYPE_BADGE['update'];

  // Pain-point and collab posts store structured data as encoded JSON
  // (||PP||{...}||END|| / ||COLLAB||{...}||END||) and have their own tabs
  // with proper cards — the API excludes them from this generic feed, but
  // decode defensively here too in case one ever slips through, so it never
  // renders as raw JSON.
  const pp = post.post_type === 'pain_point' ? decodePP(post.content) : null;
  const collab = post.post_type === 'collab' ? decodeCollab(post.content) : null;
  const displayContent = pp ? pp.description : collab ? `Looking for: ${collab.looking_for}` : post.content;

  const diff = Date.now() - new Date(post.created_at).getTime();
  const mins = Math.floor(diff / 60000);
  const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : Math.floor(mins/60) < 24 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/86400000*60)}d ago`;

  return (
    <div style={{
      background: LIT.card, borderRadius: LIT.radius,
      border: `1.5px solid ${LIT.border}`,
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {post.author_initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>{post.author_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: badge.bg, color: badge.color, letterSpacing: 0.3,
            }}>{badge.label}</span>
            <span style={{ fontSize: 11, color: LIT.muted }}>{ago}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: 15, color: LIT.text, lineHeight: 1.65, fontFamily: LIT.bodyFont }}>
        {displayContent}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => { setEncouraged(e => !e); onEncourage(post.id); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 100,
            border: `1.5px solid ${encouraged ? '#059669' : LIT.border}`,
            background: encouraged ? '#f0fdf4' : LIT.card,
            color: encouraged ? '#059669' : LIT.secondary,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          👍 {encouraged ? 'Encouraged!' : 'Encourage'}
        </button>
        {post.idea_id && (
          <button
            onClick={() => onViewIdea(post.idea_id!)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 100,
              border: `1.5px solid ${LIT.border}`, background: LIT.card,
              color: LIT.secondary, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🔍 Ask how
          </button>
        )}
      </div>
    </div>
  );
}

// ── Proof Tab ─────────────────────────────────────────────────────────────────

function ProofTab({ userStage, userId, onNavigate }: { userStage: Stage; userId?: string; onNavigate: (path: string) => void }) {
  const [sameStageIdeas, setSameStageIdeas]   = useState<IdeaCard[]>([]);
  const [activityPosts, setActivityPosts]     = useState<ActivityPost[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showCompose, setShowCompose]         = useState(false);
  const [myIdea, setMyIdea]                   = useState<IdeaCard | null>(null);
  const color = STAGE_COLORS[userStage];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [ideasRes, postsRes] = await Promise.all([
          communityApi.listIdeas(userStage),
          communityApi.listPosts(userStage),
        ]);
        if (!cancelled) {
          const ideas: IdeaCard[] = ideasRes.data.ideas ?? [];
          setSameStageIdeas(ideas);
          setMyIdea(ideas.find(i => i.user_id === userId) ?? null);
          const posts: ActivityPost[] = postsRes.data.posts ?? [];
          setActivityPosts(posts.slice().reverse());
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userStage, userId]);

  const others = sameStageIdeas.filter(i => i.user_id !== userId);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: LIT.muted, fontSize: 14, fontFamily: LIT.bodyFont }}>Loading…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

      {/* Stage context banner */}
      <div style={{
        borderRadius: LIT.radius, padding: '20px 24px',
        background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
        border: `1.5px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, fontFamily: LIT.headFont }}>
            You're in {STAGE_LABELS[userStage]}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: LIT.text, letterSpacing: -0.4, fontFamily: LIT.headFont }}>
            {others.length > 0
              ? `${others.length} other founder${others.length !== 1 ? 's' : ''} at your stage right now.`
              : "You're one of the first founders at this stage!"}
          </div>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            padding: '11px 22px', borderRadius: 100,
            background: color, color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          + Share an update
        </button>
      </div>

      {/* Founders at your stage */}
      {others.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, fontFamily: LIT.headFont }}>
            Founders {userStage === 'done' ? 'who shipped' : `in ${STAGE_LABELS[userStage].toLowerCase()}`}
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {others.map(idea => (
              <button
                key={idea.id}
                onClick={() => onNavigate(`/community/${idea.id}`)}
                style={{
                  flexShrink: 0, width: 140,
                  background: LIT.card, border: `1.5px solid ${LIT.border}`,
                  borderRadius: LIT.radius, padding: '14px 14px 12px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = LIT.border; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 10,
                }}>
                  {idea.author_initials}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: LIT.text, marginBottom: 3, lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {idea.name}
                </div>
                <div
                  onClick={e => { e.stopPropagation(); onNavigate(`/community/member/${encodeURIComponent(idea.author_name)}`); }}
                  style={{ fontSize: 11, color: LIT.muted, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#7c3aed')}
                  onMouseLeave={e => (e.currentTarget.style.color = LIT.muted)}
                >{idea.author_name}</div>
                {idea.post_count > 0 && (
                  <div style={{ fontSize: 10, color: color, fontWeight: 700, marginTop: 6 }}>💬 {idea.post_count} posts</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: LIT.headFont }}>
            Recent activity · {STAGE_LABELS[userStage]}
          </div>
        </div>

        {activityPosts.length === 0 ? (
          <div style={{
            background: LIT.cardTint, borderRadius: LIT.radius, padding: '36px 24px',
            textAlign: 'center', border: `1.5px dashed ${LIT.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: LIT.text, marginBottom: 6, fontFamily: LIT.bodyFont }}>
              No activity yet at this stage
            </div>
            <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 20, fontFamily: LIT.bodyFont }}>
              Be the first to share an update — it helps other founders see they're not alone.
            </div>
            <button
              onClick={() => setShowCompose(true)}
              style={{
                padding: '10px 22px', borderRadius: 100,
                background: color, color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Share your first update →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activityPosts.map((post, i) => {
              const dotColor = POST_TYPE_BADGE[post.post_type]?.color ?? LIT.accent;
              const isLast = i === activityPosts.length - 1;
              return (
                <div key={post.id} style={{ display: 'flex', gap: 12 }}>
                  {/* Timeline rail — dot colored by post type, same motif as the Thread tab */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: 10, flexShrink: 0, paddingTop: 22 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 3px ${LIT.pageBg}, 0 0 0 4.5px ${dotColor}55`, flexShrink: 0 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: LIT.border, marginTop: 6, minHeight: 24 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                    <ActivityCard
                      post={post}
                      onEncourage={() => { try { communityApi.react(post.id, 'encourage'); } catch {} }}
                      onViewIdea={id => onNavigate(`/community/${id}`)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My idea quick-link */}
      {myIdea && (
        <div style={{
          background: LIT.cardTint, borderRadius: LIT.radius, padding: '16px 20px',
          border: `1.5px solid ${LIT.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: LIT.headFont }}>Your idea</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>{myIdea.name}</div>
          </div>
          <button onClick={() => onNavigate(`/community/${myIdea.id}`)} style={{
            padding: '8px 16px', borderRadius: 100, border: `1.5px solid ${color}`, background: 'transparent',
            color, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
          }}>
            View idea page →
          </button>
        </div>
      )}

      {showCompose && (
        <ShareWinModal
          userStage={userStage}
          onClose={() => setShowCompose(false)}
          onPosted={post => setActivityPosts(prev => [post, ...prev])}
        />
      )}
    </div>
  );
}

// ── Collab types & helpers ────────────────────────────────────────────────────

interface CollabPost {
  id: string;
  user_id: string;
  author_id: string;
  content: string;
  stage: Stage;
  created_at: string;
  author_name: string;
  author_initials: string;
  interest_count: number;
  encourage_count: number;
  user_reacted: 'interest' | 'encourage' | null;
}

interface CollabData {
  initiative: string;
  looking_for: string;
  offering: string;
  commitment: 'full-time' | 'part-time' | 'advisory';
  stage: Stage;
}

function encodeCollab(data: CollabData): string {
  return `||COLLAB||${JSON.stringify(data)}||END||`;
}
function decodeCollab(content: string): CollabData | null {
  const m = content.match(/\|\|COLLAB\|\|(.+?)\|\|END\|\|/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

const COMMITMENT_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'full-time': { label: '🚀 Full-time',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  'part-time': { label: '⚡ Part-time',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'advisory':  { label: '💡 Advisory',   color: '#059669', bg: '#f0fdf4', border: '#86efac' },
};

const STAGE_LABELS_COLLAB: Record<string, string> = {
  idea: '💡 Idea', hone: '🎯 Hone', validate: '🧪 Validate', shape: '🔨 Shape', done: '🚀 Ship',
};

// ── Post Collab Modal ─────────────────────────────────────────────────────────

function PostCollabModal({ onClose, onPosted }: {
  onClose: () => void;
  onPosted: (collab: CollabPost) => void;
}) {
  const [initiative,  setInitiative]  = useState('');
  const [lookingFor,  setLookingFor]  = useState('');
  const [offering,    setOffering]    = useState('');
  const [commitment,  setCommitment]  = useState<CollabData['commitment']>('part-time');
  const [stage,       setStage]       = useState<Stage>('idea');
  const [posting,     setPosting]     = useState(false);
  const [posted,      setPosted]      = useState(false);

  const valid = initiative.trim().length >= 10 && lookingFor.trim().length >= 3 && offering.trim().length >= 3;

  const handle = async () => {
    if (!valid) return;
    setPosting(true);
    try {
      const content = encodeCollab({ initiative: initiative.trim(), looking_for: lookingFor.trim(), offering: offering.trim(), commitment, stage });
      const res = await communityApi.createPost({ content, stage, post_type: 'collab' });
      setPosted(true);
      const collab: CollabPost = res.data.post ?? { id: Date.now().toString(), user_id: '', author_id: '', content, stage, created_at: new Date().toISOString(), author_name: 'You', author_initials: 'Y', interest_count: 0, encourage_count: 0, user_reacted: null };
      setTimeout(() => { onPosted(collab); onClose(); }, 1200);
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  const field = (label: string, required?: boolean) => (
    <label style={{ fontSize: 12, fontWeight: 700, color: LIT.secondary, fontFamily: LIT.headFont, display: 'block', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: LIT.radius,
    border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none',
    fontFamily: LIT.bodyFont, color: LIT.text, boxSizing: 'border-box',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '94%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto',
        background: LIT.card, borderRadius: LIT.radius,
        boxShadow: LIT.shadow, zIndex: 301,
      }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${LIT.accent}, ${LIT.accentSoftBorder})`, borderRadius: `${LIT.radius}px ${LIT.radius}px 0 0` }} />
        <div style={{ padding: '24px 28px 28px' }}>
          {posted ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>Initiative posted!</div>
              <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont, marginTop: 6 }}>The community can now discover and express interest.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4, color: LIT.text, fontFamily: LIT.headFont }}>
                Post a collab opportunity
              </div>
              <div style={{ fontSize: 14, color: LIT.muted, fontFamily: LIT.bodyFont, marginBottom: 24 }}>
                Share what you're building and who you need. Interested founders will reach out directly.
              </div>

              {/* Initiative */}
              {field('What are you building?', true)}
              <textarea
                autoFocus
                value={initiative}
                onChange={e => setInitiative(e.target.value)}
                placeholder="e.g. An AI scheduling tool for independent therapists — I've validated demand with 12 interviews and need a technical co-founder to build the MVP."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65, marginBottom: 18 }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Looking for */}
              {field('What role / skill are you looking for?', true)}
              <input
                value={lookingFor}
                onChange={e => setLookingFor(e.target.value)}
                placeholder="e.g. Full-stack engineer, product designer, growth marketer"
                style={{ ...inputStyle, marginBottom: 18 }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* What you offer */}
              {field('What do you bring to the table?', true)}
              <input
                value={offering}
                onChange={e => setOffering(e.target.value)}
                placeholder="e.g. Domain expertise, customer relationships, product vision, equity"
                style={{ ...inputStyle, marginBottom: 18 }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Commitment */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.secondary, fontFamily: LIT.headFont, display: 'block', marginBottom: 8 }}>
                Commitment level
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {(Object.entries(COMMITMENT_STYLES) as [CollabData['commitment'], typeof COMMITMENT_STYLES[string]][]).map(([k, s]) => (
                  <button key={k} onClick={() => setCommitment(k)} style={{
                    flex: 1, padding: '10px 6px', borderRadius: LIT.radius, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', textAlign: 'center',
                    border: `2px solid ${commitment === k ? s.color : LIT.border}`,
                    background: commitment === k ? s.bg : LIT.cardTint,
                    color: commitment === k ? s.color : LIT.muted,
                  }}>{s.label}</button>
                ))}
              </div>

              {/* Stage */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.secondary, fontFamily: LIT.headFont, display: 'block', marginBottom: 8 }}>
                Your current stage
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                {(Object.entries(STAGE_LABELS_COLLAB) as [Stage, string][]).map(([s, label]) => (
                  <button key={s} onClick={() => setStage(s)} style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                    border: `1.5px solid ${stage === s ? STAGE_COLORS[s] : LIT.border}`,
                    background: stage === s ? `${STAGE_COLORS[s]}12` : LIT.card,
                    color: stage === s ? STAGE_COLORS[s] : LIT.muted,
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handle}
                  disabled={!valid || posting}
                  style={{
                    flex: 2, padding: '14px', borderRadius: LIT.radius, border: 'none',
                    background: valid ? LIT.accent : LIT.border,
                    color: valid ? '#fff' : LIT.muted,
                    fontSize: 14, fontWeight: 700,
                    cursor: valid ? 'pointer' : 'not-allowed', fontFamily: LIT.headFont,
                  }}
                >
                  {posting ? 'Posting…' : '🤝 Post this initiative →'}
                </button>
                <button onClick={onClose} style={{
                  flex: 1, padding: '14px', borderRadius: LIT.radius,
                  border: `1.5px solid ${LIT.border}`, background: LIT.card,
                  color: LIT.secondary, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: LIT.bodyFont,
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Express Interest Modal ────────────────────────────────────────────────────

function ExpressInterestModal({ collab, currentUserId, onClose, onSent }: {
  collab: CollabPost;
  currentUserId?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const data = decodeCollab(collab.content);

  // Can't message yourself
  const isSelf = currentUserId === collab.author_id;

  const handle = async () => {
    if (!message.trim() || isSelf) return;
    setSending(true);
    try {
      // React with 'interest' to mark it
      await communityApi.react(collab.id, 'interest');
      // Open / create conversation and send intro message
      const convRes = await communityApi.getOrCreateConversation(collab.author_id);
      const convId: string = convRes.data.conversation_id;
      const fullMsg = `🤝 Collab interest: "${data?.initiative ?? 'your initiative'}"\n\n${message.trim()}`;
      await communityApi.sendMessage(convId, fullMsg);
      setSent(true);
      setTimeout(() => { onSent(); onClose(); }, 1400);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 310, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '90%', maxWidth: 480, background: LIT.card, borderRadius: LIT.radius,
        boxShadow: LIT.shadow, zIndex: 311, overflow: 'hidden',
      }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${LIT.accent}, ${LIT.accentSoftBorder})` }} />
        <div style={{ padding: '24px 28px 28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🤝</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>Message sent to {collab.author_name}!</div>
              <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont, marginTop: 6 }}>They'll see it in their inbox.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: LIT.text, marginBottom: 4, fontFamily: LIT.headFont }}>
                🤝 Express your interest
              </div>
              <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont, marginBottom: 16 }}>
                Your message goes directly to <strong>{collab.author_name}</strong>'s inbox.
              </div>

              {/* Initiative recap */}
              <div style={{ background: LIT.accentSoft, border: `1.5px solid ${LIT.accentSoftBorder}`, borderRadius: LIT.radius, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: LIT.accent, fontFamily: LIT.headFont }}>Initiative</div>
                <div style={{ fontSize: 14, color: LIT.text, fontFamily: LIT.bodyFont, lineHeight: 1.55, marginTop: 4 }}>{data?.initiative ?? collab.content}</div>
                {data && (
                  <div style={{ marginTop: 8, fontSize: 12, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
                    Looking for: <strong>{data.looking_for}</strong>
                  </div>
                )}
              </div>

              {isSelf ? (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: LIT.radius, padding: '12px 14px', fontSize: 14, fontFamily: LIT.bodyFont, color: '#92400e', marginBottom: 20 }}>
                  This is your own initiative — you can't express interest in it.
                </div>
              ) : (
                <>
                  <label style={{ fontSize: 12, fontWeight: 700, color: LIT.secondary, fontFamily: LIT.headFont, display: 'block', marginBottom: 6 }}>
                    Your intro message
                  </label>
                  <textarea
                    autoFocus
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Hi ${collab.author_name.split(' ')[0]}, I'm interested in collaborating on this. Here's what I bring: ...`}
                    rows={4}
                    style={{
                      width: '100%', padding: '11px 13px', borderRadius: LIT.radius,
                      border: `1.5px solid ${LIT.border}`, fontSize: 14, lineHeight: 1.65,
                      resize: 'vertical', outline: 'none', fontFamily: LIT.bodyFont, color: LIT.text,
                      boxSizing: 'border-box', marginBottom: 20,
                    }}
                    onFocus={e => (e.target.style.borderColor = LIT.accent)}
                    onBlur={e => (e.target.style.borderColor = LIT.border)}
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                {!isSelf && (
                  <button
                    onClick={handle}
                    disabled={!message.trim() || sending}
                    style={{
                      flex: 2, padding: '13px', borderRadius: LIT.radius, border: 'none',
                      background: message.trim() ? LIT.accent : LIT.border,
                      color: message.trim() ? '#fff' : LIT.muted,
                      fontSize: 13, fontWeight: 700,
                      cursor: message.trim() ? 'pointer' : 'not-allowed', fontFamily: LIT.headFont,
                    }}
                  >
                    {sending ? 'Sending…' : 'Send message →'}
                  </button>
                )}
                <button onClick={onClose} style={{
                  flex: 1, padding: '13px', borderRadius: LIT.radius,
                  border: `1.5px solid ${LIT.border}`, background: LIT.card,
                  color: LIT.secondary, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: LIT.bodyFont,
                }}>
                  {isSelf ? 'Close' : 'Cancel'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Collab Card ───────────────────────────────────────────────────────────────

function CollabCard({ collab, currentUserId, onExpressInterest, onEncourage }: {
  collab: CollabPost;
  currentUserId?: string;
  onExpressInterest: (c: CollabPost) => void;
  onEncourage: (id: string) => void;
}) {
  const data = decodeCollab(collab.content);
  const commitStyle = data ? (COMMITMENT_STYLES[data.commitment] ?? COMMITMENT_STYLES['part-time']) : COMMITMENT_STYLES['part-time'];
  const stageColor = data ? (STAGE_COLORS[data.stage] ?? '#7c3aed') : '#7c3aed';
  const initials = (collab.author_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isInterested  = collab.user_reacted === 'interest';
  const isEncouraging = collab.user_reacted === 'encourage';
  const isSelf = currentUserId === collab.author_id;

  return (
    <div style={{
      background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius,
      overflow: 'hidden', boxShadow: LIT.shadow,
      transition: 'box-shadow .2s, transform .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(138,90,43,.16)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = LIT.shadow; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Stage-coloured top bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${stageColor},${stageColor}60)` }} />

      <div style={{ padding: '20px 22px 18px' }}>
        {/* Badges row */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100,
            background: commitStyle.bg, color: commitStyle.color, border: `1.5px solid ${commitStyle.border}`,
          }}>
            {commitStyle.label}
          </span>
          {data?.stage && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
              background: `${stageColor}12`, color: stageColor, border: `1.5px solid ${stageColor}30`,
            }}>
              {STAGE_LABELS_COLLAB[data.stage]}
            </span>
          )}
          {isSelf && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
              Your post
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: LIT.muted, fontFamily: LIT.bodyFont }}>{timeAgo(collab.created_at)}</span>
        </div>

        {/* Initiative description */}
        <div style={{ fontSize: 16, fontWeight: 600, color: LIT.text, lineHeight: 1.65, marginBottom: 16, fontFamily: LIT.headFont }}>
          {data?.initiative ?? collab.content}
        </div>

        {/* Role needed + offering */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: LIT.accentSoft, border: `1px solid ${LIT.accentSoftBorder}`,
              borderRadius: LIT.radius, padding: '9px 13px',
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>🔍</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: LIT.muted, letterSpacing: .5, marginBottom: 2, fontFamily: LIT.headFont, textTransform: 'uppercase' }}>LOOKING FOR</div>
                <div style={{ fontSize: 13, color: LIT.text, fontFamily: LIT.bodyFont, fontWeight: 500 }}>{data.looking_for}</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: LIT.radius, padding: '9px 13px',
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', letterSpacing: .5, marginBottom: 2, fontFamily: LIT.headFont, textTransform: 'uppercase' }}>WHAT I BRING</div>
                <div style={{ fontSize: 13, color: LIT.text, fontFamily: LIT.bodyFont, fontWeight: 500 }}>{data.offering}</div>
              </div>
            </div>
          </div>
        )}

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: stageColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 11, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
            Posted by <strong>{collab.author_name}</strong>
          </span>
          {collab.interest_count > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: LIT.accent, fontWeight: 700 }}>
              {collab.interest_count} interested
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onExpressInterest(collab)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 100,
              border: `2px solid ${isInterested ? LIT.accent : isSelf ? LIT.border : LIT.accent}`,
              background: isInterested ? LIT.accentSoft : isSelf ? LIT.cardTint : LIT.accent,
              color: isInterested ? LIT.accent : isSelf ? LIT.muted : '#fff',
              fontSize: 12, fontWeight: 700, cursor: isSelf ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all .15s',
              opacity: isSelf ? 0.5 : 1,
            }}
            title={isSelf ? 'This is your own post' : undefined}
          >
            🤝 {isInterested ? 'Interested!' : isSelf ? 'Your initiative' : 'Express interest'}
          </button>

          <button
            onClick={() => onEncourage(collab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '9px 14px', borderRadius: 100,
              border: `1.5px solid ${isEncouraging ? '#059669' : LIT.border}`,
              background: isEncouraging ? '#f0fdf4' : LIT.card,
              color: isEncouraging ? '#059669' : LIT.secondary,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            👍 {isEncouraging ? 'Looks good!' : 'Looks good'}
            {collab.encourage_count > 0 && !isEncouraging && (
              <span style={{ fontSize: 11, color: LIT.muted }}>· {collab.encourage_count}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Collabs Tab ───────────────────────────────────────────────────────────────

function CollabsTab({ userId }: { userId?: string }) {
  const [collabs,        setCollabs]        = useState<CollabPost[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showPost,       setShowPost]       = useState(false);
  const [commitFilter,   setCommitFilter]   = useState<'all' | CollabData['commitment']>('all');
  const [stageFilter,    setStageFilter]    = useState<'all' | Stage>('all');
  const [interestTarget, setInterestTarget] = useState<CollabPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    communityApi.listCollabs()
      .then(res => { if (!cancelled) setCollabs(res.data.collabs ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleEncourage = async (id: string) => {
    try { await communityApi.react(id, 'encourage'); } catch { /* silent */ }
    setCollabs(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      user_reacted: c.user_reacted === 'encourage' ? null : 'encourage',
      encourage_count: c.encourage_count + (c.user_reacted === 'encourage' ? -1 : 1),
    }));
  };

  const handleInterestSent = (id: string) => {
    setCollabs(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      user_reacted: 'interest',
      interest_count: c.interest_count + 1,
    }));
  };

  const filtered = collabs
    .filter(c => commitFilter === 'all' || decodeCollab(c.content)?.commitment === commitFilter)
    .filter(c => stageFilter  === 'all' || decodeCollab(c.content)?.stage      === stageFilter);

  const chipBtn = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
    border: `1.5px solid ${active ? (color ?? LIT.text) : LIT.border}`,
    background: active ? (color ?? LIT.text) : LIT.card,
    color: active ? '#fff' : LIT.secondary,
    transition: 'all .15s',
  });

  return (
    <div>
      {/* Hero */}
      <div style={{
        borderRadius: LIT.radius, padding: '28px 32px', marginBottom: 28,
        background: `linear-gradient(135deg, ${LIT.accentSoft} 0%, ${LIT.cardTint} 100%)`,
        border: `1.5px solid ${LIT.accentSoftBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: LIT.muted, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 6, fontFamily: LIT.headFont }}>
            🤝 Collab Board
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: LIT.text, letterSpacing: -0.5, fontFamily: LIT.headFont, marginBottom: 6 }}>
            Find your co-founder or collaborator.
          </div>
          <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont, maxWidth: 480, lineHeight: 1.6 }}>
            Post an initiative you're working on and what you need. Or browse what other founders are building — and reach out if you can help.
          </div>
        </div>
        <button
          onClick={() => setShowPost(true)}
          style={{
            padding: '13px 26px', borderRadius: 100, border: 'none',
            background: LIT.accent,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, fontFamily: LIT.headFont,
            boxShadow: LIT.shadow,
          }}
        >
          🤝 Post an initiative
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setCommitFilter('all')}         style={chipBtn(commitFilter === 'all')}>All commitments</button>
        <button onClick={() => setCommitFilter('full-time')}  style={chipBtn(commitFilter === 'full-time',  '#7c3aed')}>🚀 Full-time</button>
        <button onClick={() => setCommitFilter('part-time')}  style={chipBtn(commitFilter === 'part-time',  '#2563eb')}>⚡ Part-time</button>
        <button onClick={() => setCommitFilter('advisory')}   style={chipBtn(commitFilter === 'advisory',   '#059669')}>💡 Advisory</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setStageFilter('all')} style={chipBtn(stageFilter === 'all')}>All stages</button>
        {(Object.entries(STAGE_LABELS_COLLAB) as [Stage, string][]).map(([s, label]) => (
          <button key={s} onClick={() => setStageFilter(s)} style={chipBtn(stageFilter === s, STAGE_COLORS[s])}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: LIT.muted, fontFamily: LIT.bodyFont, padding: '60px 0', fontSize: 15 }}>Loading…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: LIT.cardTint, borderRadius: LIT.radius, border: `1.5px dashed ${LIT.border}` }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont, marginBottom: 6 }}>No initiatives posted yet</div>
          <div style={{ fontSize: 14, color: LIT.muted, fontFamily: LIT.bodyFont, marginBottom: 20 }}>
            Be the first. Share what you're building and who you need.
          </div>
          <button onClick={() => setShowPost(true)} style={{
            padding: '11px 24px', borderRadius: 100, border: 'none',
            background: LIT.accent,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: LIT.headFont,
          }}>
            Post the first initiative →
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map(c => (
            <CollabCard
              key={c.id}
              collab={c}
              currentUserId={userId}
              onExpressInterest={setInterestTarget}
              onEncourage={handleEncourage}
            />
          ))}
        </div>
      )}

      {showPost && (
        <PostCollabModal
          onClose={() => setShowPost(false)}
          onPosted={c => { setCollabs(prev => [c, ...prev]); setShowPost(false); }}
        />
      )}

      {interestTarget && (
        <ExpressInterestModal
          collab={interestTarget}
          currentUserId={userId}
          onClose={() => setInterestTarget(null)}
          onSent={() => handleInterestSent(interestTarget.id)}
        />
      )}
    </div>
  );
}

// ── How Much Picker ───────────────────────────────────────────────────────────

function HowMuchPicker({ onAmountChange }: { onAmountChange?: (v: string) => void }) {
  const tiers = [
    { amount: '10',  label: 'Supporter',   desc: 'Keeps the lights on for the community' },
    { amount: '50',  label: 'Contributor', desc: 'Funds a month of platform development' },
    { amount: '200', label: 'Champion',    desc: 'Helps us reach more founders who need this' },
  ];
  const [selected, setSelected]   = useState<string | null>(null);
  const [custom,   setCustom]     = useState('');
  const isCustom = selected === 'custom';
  const finalAmount = isCustom ? custom : selected;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
        How much?
      </div>

      {/* Tier cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {tiers.map(t => {
          const on = selected === t.amount;
          return (
            <button key={t.amount} onClick={() => { const next = on ? null : t.amount; setSelected(next); setCustom(''); onAmountChange?.(next ?? ''); }}
              style={{
                flex: 1, padding: '16px 10px', borderRadius: LIT.radius, cursor: 'pointer',
                border: `2px solid ${on ? LIT.accent : LIT.border}`,
                background: on ? LIT.accentSoft : LIT.cardTint,
                textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s',
              }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: on ? LIT.accent : LIT.text, fontFamily: LIT.headFont, marginBottom: 4 }}>${t.amount}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? LIT.accent : LIT.text, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: LIT.secondary, lineHeight: 1.5, fontFamily: LIT.bodyFont }}>{t.desc}</div>
            </button>
          );
        })}

        {/* Custom tile */}
        <button onClick={() => { const next = isCustom ? null : 'custom'; setSelected(next); if (!next) { setCustom(''); onAmountChange?.(''); } }}
          style={{
            flex: 1, padding: '16px 10px', borderRadius: LIT.radius, cursor: 'pointer',
            border: `2px solid ${isCustom ? LIT.accent : LIT.border}`,
            background: isCustom ? LIT.accentSoft : LIT.cardTint,
            textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s',
          }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: isCustom ? LIT.accent : LIT.muted, fontFamily: LIT.headFont, marginBottom: 4 }}>✏️</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: isCustom ? LIT.accent : LIT.text, marginBottom: 3 }}>Custom</div>
          <div style={{ fontSize: 12, color: LIT.secondary, lineHeight: 1.5, fontFamily: LIT.bodyFont }}>Your own amount</div>
        </button>
      </div>

      {/* Custom amount input */}
      {isCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `2px solid ${LIT.accent}`, borderRadius: LIT.radius, overflow: 'hidden', background: LIT.card }}>
          <span style={{ padding: '12px 14px', fontSize: 16, fontWeight: 700, color: LIT.accent, background: LIT.accentSoft, borderRight: `1.5px solid ${LIT.accentSoftBorder}` }}>$</span>
          <input
            autoFocus
            type="number"
            min="1"
            value={custom}
            onChange={e => { setCustom(e.target.value); onAmountChange?.(e.target.value); }}
            placeholder="Enter amount"
            style={{
              flex: 1, padding: '12px 14px', border: 'none', outline: 'none',
              fontSize: 16, fontWeight: 700, color: LIT.text,
              fontFamily: 'inherit', background: 'transparent',
            }}
          />
          {custom && (
            <span style={{ padding: '12px 14px', fontSize: 12, color: LIT.accent, fontWeight: 700, background: LIT.accentSoft, borderLeft: `1.5px solid ${LIT.accentSoftBorder}` }}>
              USD
            </span>
          )}
        </div>
      )}

      {/* Selected summary */}
      {finalAmount && (
        <div style={{ marginTop: 10, fontSize: 13, color: LIT.secondary, textAlign: 'center', fontFamily: LIT.bodyFont }}>
          You're contributing <strong style={{ color: LIT.accent }}>${finalAmount}</strong> — thank you 💛
        </div>
      )}
    </div>
  );
}

// ── Pay It Forward Modal ──────────────────────────────────────────────────────

function PayItForwardModal({ onClose }: { onClose: () => void }) {
  const [donationAmount, setDonationAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCheckout = async () => {
    if (!donationAmount || Number(donationAmount) < 1) {
      setError('Please select or enter an amount first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await donationsApi.createCheckout(Number(donationAmount));
      window.location.href = res.data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };
  const uses = [
    { icon: '🔓', pct: 35, color: '#7c3aed', label: 'Platform & infrastructure',  desc: 'Hosting, servers, database, and the APIs that keep MVP Club running reliably for every user.' },
    { icon: '🛠️', pct: 25, color: '#2563eb', label: 'Product development',         desc: 'Building and improving the guided journey — new stages, smarter tools, better frameworks for founders.' },
    { icon: '🤝', pct: 20, color: '#059669', label: 'Community programs',           desc: 'Mentorship connections, founder events, community moderation, and keeping the network healthy and active.' },
    { icon: '🧭', pct: 15, color: '#d97706', label: 'Educational content',          desc: 'Playbooks, validation frameworks, templates, and stage-by-stage guides that help founders move faster.' },
    { icon: '🌱', pct:  5, color: '#dc2626', label: 'Outreach',                     desc: 'Reaching first-time founders and underrepresented builders who need this most but might not find it on their own.' },
  ];

  const moments = [
    { stage: 'Idea',     color: '#7c3aed' },
    { stage: 'Hone',     color: '#2563eb' },
    { stage: 'Validate', color: '#059669' },
    { stage: 'Shape',    color: '#d97706' },
    { stage: 'Ship',     color: '#dc2626' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '94%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto',
        background: LIT.card, borderRadius: LIT.radius,
        boxShadow: '0 40px 100px rgba(0,0,0,.22)', zIndex: 401,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>

        {/* ── Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0533 0%, #0f1e4a 60%, #0a2a1a 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '48px 44px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background orbs */}
          {[
            { w: 260, h: 260, top: -80, right: -60, bg: 'rgba(124,58,237,.18)' },
            { w: 180, h: 180, top: 40,  right: 120,  bg: 'rgba(37,99,235,.12)' },
            { w: 140, h: 140, bottom: -40, left: 60,  bg: 'rgba(5,150,105,.12)' },
          ].map((o, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              width: o.w, height: o.h,
              top: o.top, right: (o as { right?: number }).right, bottom: (o as { bottom?: number }).bottom, left: (o as { left?: number }).left,
              background: o.bg, filter: 'blur(40px)', pointerEvents: 'none',
            }} />
          ))}

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🤝</div>
            <h2 style={{
              fontSize: 'clamp(26px,4vw,36px)', fontWeight: 700, color: '#fff',
              fontFamily: LIT.headFont, letterSpacing: -1, lineHeight: 1.15,
              margin: '0 0 14px',
            }}>
              Support MVP Club
            </h2>
            <p style={{ fontSize: 16, fontFamily: LIT.bodyFont, color: 'rgba(255,255,255,.6)', lineHeight: 1.75, maxWidth: 480, margin: 0 }}>
              MVP Club is free for every founder and community user — and we intend to keep it that way.
              No ads, no investors, no paywalls. Your donation directly funds the platform and the community around it.
            </p>
          </div>
        </div>

        <div style={{ padding: '36px 44px 44px' }}>

          {/* ── Who can contribute ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
              Anyone can contribute
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 20, left: 20, right: 20, height: 2,
                background: 'linear-gradient(90deg, #7c3aed, #2563eb, #059669, #d97706, #dc2626)',
                zIndex: 0,
              }} />
              {moments.map((m, i) => (
                <div key={m.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: m.color,
                    border: `3px solid ${m.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                    boxShadow: `0 0 0 4px ${m.color}20`,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color, textAlign: 'center' }}>
                    {m.stage}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 20, padding: '14px 18px', borderRadius: 12,
              background: '#f0fdf4', border: '1.5px solid #86efac',
            }}>
              <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.65 }}>
                Whether you're just getting started or you've already launched — if MVP Club has been useful to you or the startup community you care about, any contribution is welcome and appreciated.
              </div>
            </div>
          </div>

          {/* ── Where it goes — Donut chart ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
              Where it goes
            </div>

            {/* Donut + legend side by side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 20, flexWrap: 'wrap' }}>

              {/* SVG Donut */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {(() => {
                    const cx = 90, cy = 90, r = 70, strokeW = 28;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    return uses.map(u => {
                      const dash = (u.pct / 100) * circumference;
                      const gap  = circumference - dash;
                      const rotation = (offset / 100) * 360 - 90;
                      offset += u.pct;
                      return (
                        <circle
                          key={u.label}
                          cx={cx} cy={cy} r={r}
                          fill="none"
                          stroke={u.color}
                          strokeWidth={strokeW}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={0}
                          transform={`rotate(${rotation} ${cx} ${cy})`}
                          style={{ transition: 'stroke-opacity .2s' }}
                          onMouseEnter={e => (e.currentTarget.style.strokeOpacity = '0.75')}
                          onMouseLeave={e => (e.currentTarget.style.strokeOpacity = '1')}
                        >
                          <title>{u.label} — {u.pct}%</title>
                        </circle>
                      );
                    });
                  })()}
                  {/* Centre label */}
                  <text x="90" y="85" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: LIT.text, fontFamily: LIT.headFont }}>100%</text>
                  <text x="90" y="103" textAnchor="middle" style={{ fontSize: 10, fill: LIT.muted, fontFamily: 'system-ui, sans-serif' }}>of donations</text>
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 180 }}>
                {uses.map(u => (
                  <div key={u.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: LIT.text }}>{u.icon} {u.label}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: u.color }}>{u.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {uses.map(u => (
                <div key={u.label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: LIT.radius,
                  background: `${u.color}08`, border: `1.5px solid ${u.color}20`,
                }}>
                  <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{u.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: LIT.text }}>{u.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: u.color }}>{u.pct}%</span>
                    </div>
                    <div style={{ fontSize: 13, color: LIT.secondary, lineHeight: 1.55, fontFamily: LIT.bodyFont }}>{u.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── How much ── */}
          <HowMuchPicker onAmountChange={setDonationAmount} />

          {/* ── CTA ── */}
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                flex: 2, padding: '15px', borderRadius: LIT.radius, border: 'none',
                background: loading ? LIT.border : `linear-gradient(135deg, ${LIT.accent}, #6b4520)`,
                color: loading ? LIT.muted : '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', textAlign: 'center',
                boxShadow: loading ? 'none' : LIT.shadow,
                transition: 'all .15s',
              }}
            >
              {loading ? 'Redirecting to Stripe…' : '💛 Support MVP Club →'}
            </button>
            <button onClick={onClose} style={{
              flex: 1, padding: '15px', borderRadius: LIT.radius,
              border: `1.5px solid ${LIT.border}`, background: LIT.card,
              color: LIT.secondary, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Maybe later
            </button>
          </div>

          <p style={{ fontSize: 12, color: LIT.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.6, fontFamily: LIT.bodyFont }}>
            No pressure. MVP Club is free for everyone, always. Every contribution — big or small — goes directly into keeping it that way.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Pain Point types ──────────────────────────────────────────────────────────

interface PainPoint {
  id: string;
  user_id: string;
  content: string;
  stage: Stage;
  created_at: string;
  author_name: string;
  author_initials: string;
  encourage_count: number;
  pursue_count: number;
  comment_count: number;
  user_reacted: 'encourage' | 'pursue' | null;
}

// Encoded JSON in content field: ||PP||{...}||END||
// Falls back to raw content if not present.
interface PainPointData {
  description: string;
  audience: string;
  frequency: string;
  impact: 'low' | 'medium' | 'high';
  domain: string;
}

function encodePP(data: PainPointData): string {
  return `||PP||${JSON.stringify(data)}||END||`;
}

function decodePP(content: string): PainPointData | null {
  const m = content.match(/\|\|PP\|\|(.+?)\|\|END\|\|/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

const IMPACT_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:   { color: '#dc2626', bg: '#fff5f5', border: '#fca5a5', label: '🔥 High impact' },
  medium: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: '⚡ Medium impact' },
  low:    { color: '#059669', bg: '#f0fdf4', border: '#86efac', label: '💡 Low impact' },
};

const FREQ_OPTS = ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Occasionally'];
const IMPACT_OPTS = [
  { v: 'high',   label: '🔥 High — blocking or costly' },
  { v: 'medium', label: '⚡ Medium — annoying but managed' },
  { v: 'low',    label: '💡 Low — nice to fix' },
] as const;

// ── Log Pain Point Modal ──────────────────────────────────────────────────────

function LogPainPointModal({ onClose, onLogged }: {
  onClose: () => void;
  onLogged: (pp: PainPoint) => void;
}) {
  const [description, setDescription] = useState('');
  const [audience,    setAudience]    = useState('');
  const [frequency,   setFrequency]   = useState('');
  const [impact,      setImpact]      = useState<'low' | 'medium' | 'high'>('medium');
  const [domain,      setDomain]      = useState('');
  const [posting,     setPosting]     = useState(false);
  const [posted,      setPosted]      = useState(false);

  const valid = description.trim().length >= 10 && audience.trim().length >= 3 && frequency;

  const handle = async () => {
    if (!valid) return;
    setPosting(true);
    try {
      const content = encodePP({ description: description.trim(), audience: audience.trim(), frequency, impact, domain: domain.trim() });
      const res = await communityApi.createPost({ content, stage: 'idea', post_type: 'pain_point' });
      setPosted(true);
      const pp = res.data.post ?? { id: Date.now().toString(), content, stage: 'idea', created_at: new Date().toISOString(), author_name: 'You', author_initials: 'Y', encourage_count: 0, pursue_count: 0, comment_count: 0, user_reacted: null };
      setTimeout(() => { onLogged(pp); onClose(); }, 1200);
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '94%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
        background: LIT.card, borderRadius: LIT.radius,
        boxShadow: '0 32px 80px rgba(70,50,15,.18)', zIndex: 301,
      }}>
        {/* Top accent */}
        <div style={{ height: 5, background: LIT.accent, borderRadius: `${LIT.radius}px ${LIT.radius}px 0 0` }} />

        <div style={{ padding: '24px 28px 28px' }}>
          {posted ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>Pain point logged!</div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginTop: 6, fontFamily: LIT.bodyFont }}>Other founders can now discover and pursue it.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4, color: LIT.text, fontFamily: LIT.headFont }}>
                Log a pain point
              </div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 24, fontFamily: LIT.bodyFont }}>
                Describe a real problem you've seen. Other founders can pick it up and build a solution.
              </div>

              {/* Description */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                What's the pain? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Freelancers spend 3+ hours a week chasing overdue invoices with no visibility into when they'll get paid."
                rows={3}
                style={{ width: '100%', padding: '11px 13px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, fontSize: 14, lineHeight: 1.65, resize: 'vertical' as const, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 18, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Who */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                Who experiences this? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Freelancers, small agencies, consultants"
                style={{ width: '100%', padding: '11px 13px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 18, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Frequency */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>
                How often does it happen? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 18 }}>
                {FREQ_OPTS.map(f => (
                  <button key={f} onClick={() => setFrequency(f)} style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                    border: `1.5px solid ${frequency === f ? LIT.accent : LIT.border}`,
                    background: frequency === f ? LIT.accentSoft : LIT.card,
                    color: frequency === f ? LIT.accent : LIT.secondary,
                  }}>{f}</button>
                ))}
              </div>

              {/* Impact */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>
                How painful is it?
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {IMPACT_OPTS.map(o => {
                  const ic = IMPACT_COLORS[o.v];
                  const sel = impact === o.v;
                  return (
                    <button key={o.v} onClick={() => setImpact(o.v)} style={{
                      flex: 1, padding: '10px 6px', borderRadius: LIT.radius, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', textAlign: 'center' as const,
                      border: `2px solid ${sel ? ic.color : LIT.border}`,
                      background: sel ? ic.bg : LIT.cardTint,
                      color: sel ? ic.color : LIT.muted,
                    }}>{o.label}</button>
                  );
                })}
              </div>

              {/* Domain (optional) */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                Industry / domain <span style={{ color: LIT.muted, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. Fintech, Healthcare, Education…"
                style={{ width: '100%', padding: '11px 13px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 24, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handle}
                  disabled={!valid || posting}
                  style={{
                    flex: 2, padding: '14px', borderRadius: LIT.radius, border: 'none',
                    background: valid ? LIT.accent : LIT.border,
                    color: valid ? '#fff' : LIT.muted,
                    fontSize: 14, fontWeight: 700,
                    cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}
                >
                  {posting ? 'Logging…' : '🎯 Log this pain point →'}
                </button>
                <button onClick={onClose} style={{
                  flex: 1, padding: '14px', borderRadius: LIT.radius,
                  border: `1.5px solid ${LIT.border}`, background: LIT.card,
                  color: LIT.secondary, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Pain Point Investigation UI ───────────────────────────────────────────────

// Contribution type system — stored as prefix in comment content
const CONTRIB_TYPES = [
  { key: 'question',   icon: '🔍', label: 'Ask a deeper question',     pts: '+42',  color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'  },
  { key: 'idea',       icon: '💡', label: 'Propose a solution',         pts: '+28',  color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'assumption', icon: '⚠️', label: 'Challenge an assumption',    pts: '+31',  color: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  { key: 'evidence',   icon: '📊', label: 'Add evidence',               pts: '+18',  color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  { key: 'experience', icon: '🔄', label: 'Share a similar experience', pts: '+19',  color: '#dc2626', bg: 'rgba(220,38,38,0.07)'   },
  { key: 'experiment', icon: '🧪', label: 'Suggest an experiment',      pts: '+24',  color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'impact',     icon: '🎯', label: 'Estimate impact',            pts: '+15',  color: '#059669', bg: 'rgba(5,150,105,0.07)'   },
] as const;
type ContribKey = typeof CONTRIB_TYPES[number]['key'];

const CONTRIB_PREFIX_RE = /^\[TYPE:(\w+)\]\s*([\s\S]+)/;

function encodeContrib(type: ContribKey, text: string): string {
  return `[TYPE:${type}] ${text}`;
}
function parseContrib(content: string): { type: ContribKey | null; text: string } {
  const m = content.match(CONTRIB_PREFIX_RE);
  if (m) return { type: m[1] as ContribKey, text: m[2] };
  return { type: null, text: content };
}

// Derive health metrics from real pain point data
function ppHealth(pp: PainPoint, data: PainPointData | null) {
  const definition = data ? (data.domain ? 88 : 70) : 55;
  const evidence   = Math.min(95, (pp.encourage_count ?? 0) * 9 + 10);
  const agreement  = Math.min(95, (pp.pursue_count ?? 0) * 18 + 5);
  const confidence = Math.round((definition * 0.25 + evidence * 0.4 + agreement * 0.35));
  return { definition, evidence, agreement, confidence };
}


// Tension labels derived from encourage vs pursue ratio
function ppTension(pp: PainPoint) {
  const total = (pp.encourage_count ?? 0) + (pp.pursue_count ?? 0);
  if (total === 0) return null;
  const encPct = Math.round(((pp.encourage_count ?? 0) / total) * 100);
  const purPct = 100 - encPct;
  return {
    a: { label: 'This is a real problem', pct: encPct },
    b: { label: 'Need a better solution', pct: purPct },
  };
}

// ── Investigation Cards ───────────────────────────────────────────────────────

function PainPointCards({ items, onOpen }: {
  items: PainPoint[];
  onOpen: (pp: PainPoint) => void;
}) {
  const getProgressColor = (pct: number) => {
    if (pct >= 70) return '#059669';
    if (pct >= 45) return '#2563eb';
    if (pct >= 25) return '#d97706';
    return '#dc2626';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
      {items.map(pp => {
        const data   = decodePP(pp.content);
        const health = ppHealth(pp, data);
        const tension = ppTension(pp);
        const col    = getProgressColor(health.confidence);
        const imp    = IMPACT_COLORS[data?.impact ?? 'medium'] ?? IMPACT_COLORS['medium'];
        const totalParticipants = (pp.encourage_count ?? 0) + (pp.pursue_count ?? 0) + (pp.comment_count ?? 0);

        return (
          <div
            key={pp.id}
            onClick={() => onOpen(pp)}
            style={{
              background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius,
              padding: '22px 24px 20px', cursor: 'pointer',
              transition: 'border-color .15s, box-shadow .15s, transform .12s',
              display: 'flex', flexDirection: 'column',
              boxShadow: LIT.shadow,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = LIT.accent;
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 28px rgba(138,90,43,.12)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = LIT.border;
              (e.currentTarget as HTMLDivElement).style.boxShadow = LIT.shadow;
              (e.currentTarget as HTMLDivElement).style.transform = 'none';
            }}
          >
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: LIT.headFont }}>
                Pain Point · {timeAgo(pp.created_at)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: imp.bg, color: imp.color, border: `1px solid ${imp.border}`,
              }}>{imp.label}</span>
            </div>

            {/* Description */}
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.4, marginBottom: 8, color: LIT.text, flex: 1, fontFamily: LIT.headFont }}>
              {data?.description ?? pp.content}
            </div>

            {/* Audience */}
            {data?.audience && (
              <div style={{ fontSize: 13, color: LIT.secondary, marginBottom: 14, fontFamily: LIT.bodyFont }}>
                👥 {data.audience}  ·  🔄 {data.frequency}
              </div>
            )}

            {/* Confidence bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 6, background: LIT.cardTint, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${health.confidence}%`, background: col, borderRadius: 99, transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: col, minWidth: 32 }}>{health.confidence}%</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
              {[
                { val: pp.encourage_count ?? 0, lbl: 'Confirmed' },
                { val: pp.comment_count ?? 0,   lbl: 'Insights'  },
                { val: pp.pursue_count ?? 0,     lbl: 'Pursuing'  },
              ].map(s => (
                <div key={s.lbl}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: LIT.text, fontFamily: LIT.headFont }}>{s.val}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: LIT.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Tension strip (only if there's data) */}
            {tension && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(37,99,235,.05) 0%, rgba(220,38,38,.05) 100%)',
                border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '9px 12px', marginBottom: 14,
                fontSize: 12, fontWeight: 600, color: LIT.secondary, fontFamily: LIT.bodyFont,
              }}>
                <div style={{ marginBottom: 4 }}>⚡ Community perspective</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: '#2563eb', fontWeight: 800 }}>{tension.a.pct}% {tension.a.label}</span>
                  <span style={{ color: LIT.border }}>·</span>
                  <span style={{ color: '#dc2626', fontWeight: 800 }}>{tension.b.pct}% {tension.b.label}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: LIT.muted, fontWeight: 600, fontFamily: LIT.bodyFont }}>
                {totalParticipants > 0 ? `${totalParticipants} contributor${totalParticipants !== 1 ? 's' : ''}` : 'Be the first to investigate →'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: LIT.accent }}>Investigate →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pain Point Detail Modal ───────────────────────────────────────────────────

interface PPComment {
  id: string;
  content: string;
  author_name: string;
  author_initials: string;
  created_at: string;
}

const BIZ_REACTIONS = [
  { key: 'useful',     icon: '❤️', label: 'Useful — shaped our understanding' },
  { key: 'thinking',   icon: '🧠', label: 'Changed our thinking entirely'      },
  { key: 'implement',  icon: '🚀', label: 'We\'re implementing this'           },
  { key: 'nonapply',   icon: '❌', label: 'Doesn\'t apply to our context'      },
] as const;
type BizRxKey = typeof BIZ_REACTIONS[number]['key'];

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(str: string) {
  const cols = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#c026d3'];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return cols[h % cols.length];
}

function PainPointDetailModal({ pp, onClose, onReact }: {
  pp: PainPoint;
  onClose: () => void;
  onReact: (id: string, type: 'encourage' | 'pursue') => void;
}) {
  const navigate = useNavigate();
  const data     = decodePP(pp.content);
  const health   = ppHealth(pp, data);
  const tension  = ppTension(pp);
  const imp      = IMPACT_COLORS[data?.impact ?? 'medium'] ?? IMPACT_COLORS['medium'];

  const [comments, setComments]       = useState<PPComment[]>([]);
  const [loadingCmts, setLoadingCmts] = useState(true);
  const [activeType, setActiveType]   = useState<ContribKey>('question');
  const [contribText, setContribText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState<string | null>(null);
  const [bizRx, setBizRx]             = useState<BizRxKey | null>(null);
  const [localEncourage, setLocalEncourage] = useState(pp.encourage_count ?? 0);
  const [localPursue, setLocalPursue]       = useState(pp.pursue_count ?? 0);
  const [myReacted, setMyReacted]           = useState(pp.user_reacted);
  const [showBuildModal, setShowBuildModal] = useState(false);

  useEffect(() => {
    communityApi.getComments(pp.id)
      .then(res => setComments(res.data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoadingCmts(false));
  }, [pp.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleContrib = async () => {
    if (!contribText.trim()) return;
    setSubmitting(true);
    try {
      const content = encodeContrib(activeType, contribText.trim());
      const res = await communityApi.addComment(pp.id, content);
      const newCmt: PPComment = res.data.comment ?? {
        id: Date.now().toString(), content,
        author_name: 'You', author_initials: 'Y', created_at: new Date().toISOString(),
      };
      setComments(prev => [...prev, newCmt]);
      setContribText('');
      const t = CONTRIB_TYPES.find(c => c.key === activeType);
      showToast(`✔ ${t?.label} added · ${t?.pts} pts`);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleReactLocal = async (type: 'encourage' | 'pursue') => {
    await onReact(pp.id, type);
    const wasThis = myReacted === type;
    if (type === 'encourage') setLocalEncourage(n => wasThis ? n - 1 : n + 1);
    else setLocalPursue(n => wasThis ? n - 1 : n + 1);
    setMyReacted(wasThis ? null : type);
  };

  const activeContrib = CONTRIB_TYPES.find(c => c.key === activeType)!;

  // Build simple tree from comments
  const progressCol = health.confidence >= 70 ? '#059669' : health.confidence >= 45 ? '#2563eb' : '#d97706';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 900,
        background: LIT.pageBg, zIndex: 301,
        overflowY: 'auto', boxShadow: '-8px 0 40px rgba(70,50,15,.14)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${LIT.border}`, padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600, color: LIT.secondary, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: LIT.headFont }}>
            Pain Point Investigation
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 6, background: LIT.cardTint, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${health.confidence}%`, background: progressCol, borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: progressCol }}>{health.confidence}% confidence</span>
          </div>
        </div>

        <div style={{ padding: '24px 28px', flex: 1 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: imp.bg, color: imp.color, border: `1px solid ${imp.border}` }}>{imp.label}</span>
              {data?.domain && <span style={{ fontSize: 11, color: LIT.muted }}>{data.domain}</span>}
              <span style={{ fontSize: 11, color: LIT.muted, marginLeft: 'auto' }}>
                by{' '}
                <span
                  onClick={() => navigate(`/community/member/${encodeURIComponent(pp.author_name)}`)}
                  style={{ cursor: 'pointer', fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.color = LIT.accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = LIT.muted)}
                >{pp.author_name}</span>
                {' '}· {timeAgo(pp.created_at)}
              </span>
            </div>

            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.3, marginBottom: 8, color: LIT.text, fontFamily: LIT.headFont }}>
              {data?.description ?? pp.content}
            </div>

            {data && (
              <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 16, fontFamily: LIT.bodyFont }}>
                👥 {data.audience} · 🔄 {data.frequency}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <button
                onClick={() => handleReactLocal('encourage')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 100,
                  border: `1.5px solid ${myReacted === 'encourage' ? LIT.accent : LIT.border}`,
                  background: myReacted === 'encourage' ? LIT.accentSoft : LIT.card,
                  color: myReacted === 'encourage' ? LIT.accent : LIT.secondary,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                🙋 I have this too · <strong>{localEncourage}</strong>
              </button>
              <button
                onClick={() => {
                  if (myReacted === 'pursue') {
                    // Already pursuing — just toggle off
                    handleReactLocal('pursue');
                  } else {
                    // First time: react + open build modal
                    handleReactLocal('pursue');
                    setShowBuildModal(true);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 100,
                  border: `1.5px solid ${myReacted === 'pursue' ? LIT.accent : LIT.border}`,
                  background: myReacted === 'pursue' ? LIT.accentSoft : LIT.card,
                  color: myReacted === 'pursue' ? LIT.accent : LIT.secondary,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                🚀 I want to build this · <strong>{localPursue}</strong>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

            {/* Left: Contribution input + feed */}
            <div>
              {/* Contribution input */}
              <div style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '16px 18px', marginBottom: 16, boxShadow: LIT.shadow }}>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 12 }}>
                  {CONTRIB_TYPES.map(ct => (
                    <button
                      key={ct.key}
                      onClick={() => setActiveType(ct.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 100,
                        border: `1.5px solid ${activeType === ct.key ? ct.color : LIT.border}`,
                        background: activeType === ct.key ? ct.bg : LIT.card,
                        color: activeType === ct.key ? ct.color : LIT.muted,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                      }}
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={contribText}
                  onChange={e => setContribText(e.target.value)}
                  placeholder={`${activeContrib.icon} ${activeContrib.label}…`}
                  rows={3}
                  style={{
                    width: '100%', padding: '11px 13px', borderRadius: LIT.radius,
                    border: `1.5px solid ${contribText ? activeContrib.color : LIT.border}`,
                    fontSize: 14, lineHeight: 1.65, resize: 'vertical' as const,
                    outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const,
                    marginBottom: 10, transition: 'border-color .15s', color: LIT.text,
                  }}
                  onFocus={e => (e.target.style.borderColor = activeContrib.color)}
                  onBlur={e => (e.target.style.borderColor = contribText ? activeContrib.color : LIT.border)}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: LIT.muted, fontFamily: LIT.bodyFont }}>{activeContrib.pts} pts for this type</span>
                  <button
                    onClick={handleContrib}
                    disabled={!contribText.trim() || submitting}
                    style={{
                      padding: '8px 20px', borderRadius: 100, border: 'none',
                      background: contribText.trim() ? activeContrib.color : LIT.border,
                      color: contribText.trim() ? '#fff' : LIT.muted,
                      fontSize: 13, fontWeight: 700, cursor: contribText.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}
                  >
                    {submitting ? 'Adding…' : 'Add →'}
                  </button>
                </div>
              </div>

              {/* Contribution feed */}
              {loadingCmts && <div style={{ color: LIT.muted, padding: '12px 0', fontSize: 14, fontFamily: LIT.bodyFont }}>Loading…</div>}
              {!loadingCmts && comments.length === 0 && (
                <div style={{ color: LIT.muted, fontSize: 14, fontStyle: 'italic', padding: '12px 0', fontFamily: LIT.bodyFont }}>
                  No contributions yet — be the first.
                </div>
              )}
              {!loadingCmts && comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...comments].reverse().map(c => {
                    const { type, text } = parseContrib(c.content);
                    const ct = type ? CONTRIB_TYPES.find(ct => ct.key === type) : null;
                    const ini = initials(c.author_name);
                    const col = avatarColor(c.author_name);
                    return (
                      <div key={c.id} style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '13px 15px', boxShadow: LIT.shadow }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: col, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: LIT.text }}>{c.author_name}</span>
                          <span style={{ fontSize: 10, color: LIT.muted }}>{timeAgo(c.created_at)}</span>
                          {ct && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ct.bg, color: ct.color }}>
                              {ct.icon} {ct.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: LIT.text, fontFamily: LIT.bodyFont }}>{text}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Stats */}
              <div style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '14px 16px', boxShadow: LIT.shadow }}>
                {[
                  { icon: '🙋', label: 'Confirmed', val: localEncourage },
                  { icon: '💬', label: 'Contributions', val: comments.length },
                  { icon: '🚀', label: 'Pursuing', val: localPursue },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? `1px solid ${LIT.border}` : 'none' }}>
                    <span style={{ fontSize: 13, color: LIT.secondary, fontFamily: LIT.bodyFont }}>{s.icon} {s.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: LIT.text, fontFamily: LIT.headFont }}>{s.val}</span>
                  </div>
                ))}
              </div>

              {/* Community tension */}
              {tension && (
                <div style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '14px 16px', boxShadow: LIT.shadow }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, fontFamily: LIT.headFont }}>⚡ Community split</div>
                  {[
                    { ...tension.a, color: '#2563eb' },
                    { ...tension.b, color: '#dc2626' },
                  ].map((t, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: t.color }}>{t.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: LIT.cardTint, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${t.pct}%`, background: t.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* How does this land */}
              <div style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '14px 16px', boxShadow: LIT.shadow }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, fontFamily: LIT.headFont }}>How does this land?</div>
                {BIZ_REACTIONS.map(r => (
                  <div
                    key={r.key}
                    onClick={() => { setBizRx(r.key); showToast(`${r.icon} Noted`); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderRadius: LIT.radius, cursor: 'pointer', marginBottom: 4, transition: 'all .15s',
                      border: `1.5px solid ${bizRx === r.key ? LIT.accent : 'transparent'}`,
                      background: bizRx === r.key ? LIT.accentSoft : 'transparent',
                    }}
                    onMouseEnter={e => { if (bizRx !== r.key) (e.currentTarget as HTMLDivElement).style.background = LIT.cardTint; }}
                    onMouseLeave={e => { if (bizRx !== r.key) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <span style={{ fontSize: 13, color: bizRx === r.key ? LIT.accent : LIT.secondary, fontFamily: LIT.bodyFont }}>{r.label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: LIT.text, color: '#fff', padding: '12px 20px', borderRadius: LIT.radius,
            fontSize: 13, fontWeight: 700, zIndex: 400,
            boxShadow: '0 8px 28px rgba(70,50,15,.18)',
            animation: 'fadeIn .2s ease',
          }}>
            {toast}
          </div>
        )}
      </div>

      {/* Build Idea Modal */}
      {showBuildModal && (
        <BuildIdeaModal
          pp={pp}
          data={data}
          onClose={() => setShowBuildModal(false)}
        />
      )}
    </>
  );
}

// ── Log Conversation Modal ────────────────────────────────────────────────────

const SIGNAL_OPTS = [
  { key: 'validates',  label: '✅ Validates',  desc: 'They confirmed the problem is real and painful', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  { key: 'challenges', label: '⚠️ Challenges', desc: 'They pushed back or revealed a flaw in my thinking', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  { key: 'neutral',    label: '➖ Neutral',     desc: 'Interesting but didn\'t strongly confirm or deny', color: '#6e6e73', bg: 'rgba(110,110,115,0.1)' },
] as const;
type SignalKey = typeof SIGNAL_OPTS[number]['key'];

function LogConversationModal({
  challenge, onClose, onLogged,
}: {
  challenge: Challenge;
  onClose: () => void;
  onLogged: (count: number, verdict: string | null) => void;
}) {
  const [role, setRole]     = useState('');
  const [q1, setQ1]         = useState('');
  const [q2, setQ2]         = useState('');
  const [q3, setQ3]         = useState('');
  const [signal, setSignal] = useState<SignalKey>('validates');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState<{ count: number; verdict: string | null } | null>(null);

  const submit = async () => {
    if (!role.trim()) { setError('Who did you talk to?'); return; }
    setSaving(true); setError('');
    try {
      const res = await challengesApi.logConversation(challenge.id, {
        interviewee_role: role.trim(),
        quote_1: q1.trim() || undefined,
        quote_2: q2.trim() || undefined,
        quote_3: q3.trim() || undefined,
        signal,
      });
      const { conversation_count, verdict_signal } = res.data;
      setDone({ count: conversation_count, verdict: verdict_signal ?? null });
      onLogged(conversation_count, verdict_signal ?? null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Could not save. Try again.');
    } finally { setSaving(false); }
  };

  const remaining = challenge.conversations_goal - challenge.conversation_count;
  const VERDICT_META_LOCAL = {
    validated: { icon: '✅', label: 'Validated — the evidence stacks up. Ready to shape your MVP.', color: '#059669' },
    pivoted:   { icon: '🔄', label: 'Time to pivot — conversations revealed a fundamental problem.', color: '#d97706' },
    uncertain: { icon: '🤔', label: 'Still uncertain — consider 5 more targeted conversations.', color: '#6e6e73' },
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 540,
        background: LIT.card, borderRadius: LIT.radius, zIndex: 501, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(70,50,15,.2)',
      }}>
        <div style={{ height: 4, background: LIT.accent }} />
        <div style={{ padding: '24px 26px 26px', maxHeight: '90vh', overflowY: 'auto' }}>

          {done ? (
            // ── Done state ──
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{done.verdict ? VERDICT_META_LOCAL[done.verdict as keyof typeof VERDICT_META_LOCAL]?.icon ?? '🎉' : '🎉'}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: LIT.text, marginBottom: 8, fontFamily: LIT.headFont }}>
                {done.verdict ? 'Challenge complete!' : `${done.count} / ${challenge.conversations_goal} logged`}
              </div>
              {done.verdict && (
                <div style={{
                  fontSize: 14, color: VERDICT_META_LOCAL[done.verdict as keyof typeof VERDICT_META_LOCAL]?.color ?? LIT.secondary,
                  background: LIT.cardTint, borderRadius: LIT.radius, padding: '12px 16px', marginBottom: 20, lineHeight: 1.6, fontFamily: LIT.bodyFont,
                }}>
                  {VERDICT_META_LOCAL[done.verdict as keyof typeof VERDICT_META_LOCAL]?.label}
                </div>
              )}
              {!done.verdict && (
                <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 20, fontFamily: LIT.bodyFont }}>
                  {challenge.conversations_goal - done.count} more to go. Keep going!
                </div>
              )}
              <button
                onClick={onClose}
                style={{ width: '100%', padding: '11px', border: 'none', borderRadius: LIT.radius, background: LIT.text, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Done
              </button>
            </div>
          ) : (
            // ── Form state ──
            <>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: LIT.accent, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 6, fontFamily: LIT.headFont }}>
                  Conversation {challenge.conversation_count + 1} of {challenge.conversations_goal}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: LIT.text, letterSpacing: -0.3, marginBottom: 4, fontFamily: LIT.headFont }}>
                  Log this conversation
                </div>
                <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
                  {remaining - 1 > 0 ? `${remaining - 1} more after this.` : 'This is the last one — verdict incoming.'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Role */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                    Who did you talk to?
                  </label>
                  <input
                    autoFocus
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder='e.g. "Head of Sales at a 50-person SaaS startup"'
                    style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 14, fontFamily: LIT.bodyFont, outline: 'none', boxSizing: 'border-box' as const, color: LIT.text }}
                    onFocus={e => (e.target.style.borderColor = LIT.accent)}
                    onBlur={e => (e.target.style.borderColor = LIT.border)}
                  />
                </div>

                {/* Signal */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>
                    What did this conversation signal?
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SIGNAL_OPTS.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setSignal(s.key)}
                        style={{
                          textAlign: 'left' as const, padding: '10px 13px', borderRadius: LIT.radius, fontFamily: 'inherit',
                          border: `1.5px solid ${signal === s.key ? s.color : LIT.border}`,
                          background: signal === s.key ? s.bg : LIT.card,
                          cursor: 'pointer', transition: 'all .12s',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: signal === s.key ? s.color : LIT.text, fontFamily: LIT.bodyFont }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: LIT.muted, marginTop: 2, fontFamily: LIT.bodyFont }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quotes */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                    Key quotes (optional — these become your evidence)
                  </label>
                  {[
                    { val: q1, set: setQ1, ph: 'Most memorable thing they said…' },
                    { val: q2, set: setQ2, ph: 'Another quote or insight…' },
                    { val: q3, set: setQ3, ph: 'Surprising or unexpected moment…' },
                  ].map((item, i) => (
                    <textarea
                      key={i}
                      value={item.val}
                      onChange={e => item.set(e.target.value)}
                      placeholder={item.ph}
                      rows={2}
                      style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 14, fontFamily: LIT.bodyFont, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, lineHeight: 1.5, color: LIT.secondary, marginBottom: 6 }}
                      onFocus={e => (e.target.style.borderColor = LIT.accent)}
                      onBlur={e => (e.target.style.borderColor = LIT.border)}
                    />
                  ))}
                </div>

                {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onClose} style={{ flex: 1, padding: '11px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: LIT.card, color: LIT.secondary, fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!role.trim() || saving}
                    style={{
                      flex: 2, padding: '11px', border: 'none', borderRadius: LIT.radius, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      cursor: role.trim() ? 'pointer' : 'default',
                      background: role.trim() ? LIT.accent : LIT.border,
                      color: role.trim() ? '#fff' : LIT.muted,
                    }}
                  >
                    {saving ? 'Saving…' : 'Log conversation →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Challenges Tab ────────────────────────────────────────────────────────────

interface Challenge {
  id: string;
  idea_id: string;
  idea_name: string;
  target_profile: string;
  target_domain: string | null;
  status: 'active' | 'completed' | 'abandoned';
  conversations_goal: number;
  deadline: string;
  verdict_signal: 'validated' | 'pivoted' | 'uncertain' | null;
  created_at: string;
  author_name: string;
  author_initials: string;
  conversation_count: number;
  vouch_count: number;
  fit_count: number;
  i_vouched: boolean;
  i_fit: boolean;
  is_mine: boolean;
}

const VERDICT_META = {
  validated: { icon: '✅', label: 'Validated',  color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
  pivoted:   { icon: '🔄', label: 'Pivoted',     color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
  uncertain: { icon: '🤔', label: 'Uncertain',   color: '#6e6e73', bg: 'rgba(110,110,115,0.1)' },
};

function daysLeft(deadline: string): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function ChallengeCard({
  challenge, onLogConvo, onHelp, highlight,
}: {
  challenge: Challenge;
  onLogConvo: (c: Challenge) => void;
  onHelp: (c: Challenge) => void;
  highlight?: boolean;
}) {
  const navigate = useNavigate();
  const prog = Math.min(1, challenge.conversation_count / challenge.conversations_goal);
  const days = daysLeft(challenge.deadline);
  const verdict = challenge.verdict_signal ? VERDICT_META[challenge.verdict_signal] : null;
  const done = challenge.status === 'completed';

  return (
    <div
      id={`challenge-${challenge.id}`}
      style={{
        background: LIT.card, borderRadius: LIT.radius,
        border: highlight
          ? `2px solid ${LIT.accent}`
          : `1.5px solid ${done ? '#d1fae5' : LIT.border}`,
        padding: '20px 22px',
        boxShadow: highlight
          ? `0 0 0 4px ${LIT.accentSoft}, ${LIT.shadow}`
          : LIT.shadow,
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          {/* Author + idea */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: avatarColor(challenge.author_name), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {challenge.author_initials}
            </div>
            <div>
              <span
                onClick={() => navigate(`/community/member/${encodeURIComponent(challenge.author_name)}`)}
                style={{ fontSize: 12, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.muted, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = LIT.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = LIT.muted)}
              >{challenge.author_name}</span>
              <span style={{ fontSize: 12, color: LIT.muted }}> is validating </span>
              <span
                onClick={() => navigate(`/community/${challenge.idea_id}`)}
                style={{ fontSize: 12, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.accent, cursor: 'pointer' }}
              >{challenge.idea_name}</span>
            </div>
          </div>

          {/* Target profile */}
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: LIT.bodyFont, color: LIT.text, lineHeight: 1.4, marginBottom: 6 }}>
            Needs to talk to: <span style={{ color: LIT.accent }}>{challenge.target_profile}</span>
          </div>
          {challenge.target_domain && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: LIT.cardTint, color: LIT.muted, border: `1px solid ${LIT.border}` }}>
              {challenge.target_domain}
            </span>
          )}
        </div>

        {/* Status / verdict */}
        {done && verdict ? (
          <div style={{ flexShrink: 0, textAlign: 'right' as const }}>
            <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: verdict.bg, color: verdict.color, border: `1px solid ${verdict.color}30` }}>
              {verdict.icon} {verdict.label}
            </div>
          </div>
        ) : (
          <div style={{ flexShrink: 0, textAlign: 'right' as const }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: days <= 3 ? '#dc2626' : LIT.text }}>{days}d left</div>
            <div style={{ fontSize: 10, color: LIT.muted }}>of 14 days</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: LIT.muted }}>Conversations</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: done ? '#059669' : LIT.text }}>
            {challenge.conversation_count} / {challenge.conversations_goal}
          </span>
        </div>
        <div style={{ height: 6, background: LIT.border, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${prog * 100}%`,
            background: done ? '#059669' : 'linear-gradient(90deg,#7c3aed,#2563eb)',
            borderRadius: 99, transition: 'width .4s ease',
          }} />
        </div>
      </div>

      {/* Social proof */}
      {(challenge.vouch_count > 0 || challenge.fit_count > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, fontSize: 12, color: LIT.muted }}>
          {challenge.vouch_count > 0 && <span>🤝 {challenge.vouch_count} willing to vouch</span>}
          {challenge.fit_count > 0 && <span>🙋 {challenge.fit_count} match this profile</span>}
        </div>
      )}

      {/* Actions */}
      {!done && (
        <div style={{ display: 'flex', gap: 8 }}>
          {challenge.is_mine ? (
            <button
              onClick={() => onLogConvo(challenge)}
              style={{
                flex: 1, padding: '9px', borderRadius: LIT.radius, border: 'none',
                background: LIT.accent, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Log a conversation +
            </button>
          ) : (challenge.i_vouched || challenge.i_fit) ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: LIT.radius,
              background: LIT.accentSoft,
              border: `1.5px solid ${LIT.accentSoftBorder}`,
            }}>
              <span style={{ fontSize: 13 }}>{challenge.i_vouched ? '🤝' : '🙋'}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: LIT.accent }}>
                {challenge.i_vouched ? 'You offered an intro' : 'You said you fit this profile'} — thank you!
              </span>
            </div>
          ) : (
            <button
              onClick={() => onHelp(challenge)}
              style={{
                flex: 1, padding: '9px', borderRadius: LIT.radius, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                border: `1.5px solid ${LIT.border}`, background: LIT.cardTint, color: LIT.text,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = LIT.accentSoft; e.currentTarget.style.borderColor = LIT.accent; e.currentTarget.style.color = LIT.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = LIT.cardTint; e.currentTarget.style.borderColor = LIT.border; e.currentTarget.style.color = LIT.text; }}
            >
              Can you help? →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Challenge Detail Modal ────────────────────────────────────────────────────

function ChallengeDetailModal({
  challenge, onClose, onSubmitted,
}: {
  challenge: Challenge;
  onClose: () => void;
  onSubmitted: (type: 'vouch' | 'fit') => void;
}) {
  type Step = 'intro' | 'vouch-form' | 'fit-form' | 'share' | 'done';
  const [step, setStep]               = useState<Step>('intro');
  const [loading, setLoading]         = useState(false);
  const [helpType, setHelpType]       = useState<'vouch' | 'fit' | null>(null);
  const [copied, setCopied]           = useState(false);

  // vouch form fields
  const [contactName,  setContactName]  = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [howKnow,      setHowKnow]      = useState('');
  const [note,         setNote]         = useState('');

  // fit form fields
  const [myEmail,      setMyEmail]      = useState('');
  const [myLinkedin,   setMyLinkedin]   = useState('');
  const [fitNote,      setFitNote]      = useState('');

  const submit = async () => {
    if (!helpType) return;
    setLoading(true);
    try {
      if (helpType === 'vouch') {
        const payload = [
          `Contact: ${contactName}`,
          `Email/LinkedIn: ${contactEmail}`,
          howKnow ? `Relationship: ${howKnow}` : '',
          note ? `Note: ${note}` : '',
        ].filter(Boolean).join('\n');
        await challengesApi.addOffer(challenge.id, 'vouch', payload);
      } else {
        const payload = [
          `My email: ${myEmail}`,
          myLinkedin ? `LinkedIn: ${myLinkedin}` : '',
          fitNote ? `Background: ${fitNote}` : '',
        ].filter(Boolean).join('\n');
        await challengesApi.addOffer(challenge.id, 'fit', payload);
      }
      setStep('done');
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const box: React.CSSProperties = {
    background: LIT.card, borderRadius: LIT.radius, padding: '32px 28px', width: '100%', maxWidth: 520,
    boxShadow: LIT.shadow, position: 'relative', maxHeight: '90vh', overflowY: 'auto',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '10px 12px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`,
    fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.text, outline: 'none', background: LIT.cardTint,
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 5, display: 'block' };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={box}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: LIT.muted }}>×</button>

        {/* ── Step: intro ── */}
        {step === 'intro' && (
          <>
            {/* Idea context */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.accent, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 }}>
                Proof of Demand Challenge
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, lineHeight: 1.25, marginBottom: 6 }}>
                {challenge.idea_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: avatarColor(challenge.author_name), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>
                  {challenge.author_initials}
                </div>
                <span style={{ fontSize: 12, color: LIT.muted }}>by <strong style={{ color: LIT.text }}>{challenge.author_name}</strong></span>
              </div>
            </div>

            {/* Personal ask */}
            <div style={{ background: LIT.cardTint, borderRadius: LIT.radius, padding: '18px 20px', marginBottom: 24, border: `1.5px solid ${LIT.border}` }}>
              <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.text, lineHeight: 1.7 }}>
                👋 <strong>Can you help?</strong>
                <br /><br />
                I'm trying to validate an idea and would appreciate a conversation or a warm intro to someone in your network.
                <br /><br />
                <span style={{ color: LIT.secondary }}>The people I'd love to speak with:</span>
                <br />
                <strong style={{ color: LIT.accent }}>{challenge.target_profile}</strong>
                {challenge.target_domain && <span style={{ color: LIT.secondary }}> · {challenge.target_domain}</span>}
              </div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: LIT.muted }}>Conversations so far</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: LIT.text }}>{challenge.conversation_count} / {challenge.conversations_goal}</span>
              </div>
              <div style={{ height: 6, background: LIT.border, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(1, challenge.conversation_count / challenge.conversations_goal) * 100}%`,
                  background: 'linear-gradient(90deg,#7c3aed,#2563eb)',
                  borderRadius: 99,
                }} />
              </div>
            </div>

            {/* CTA */}
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 12 }}>How would you like to help?</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <button
                onClick={() => { setHelpType('vouch'); setStep('vouch-form'); }}
                style={{
                  padding: '14px 18px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`,
                  background: LIT.card, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = LIT.accent; e.currentTarget.style.background = LIT.accentSoft; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = LIT.border; e.currentTarget.style.background = LIT.card; }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, marginBottom: 3 }}>🤝 I can connect you with someone</div>
                <div style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.secondary }}>I know someone in my network who could help — I'll share their details</div>
              </button>
              <button
                onClick={() => { setHelpType('fit'); setStep('fit-form'); }}
                style={{
                  padding: '14px 18px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`,
                  background: LIT.card, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = LIT.accent; e.currentTarget.style.background = LIT.accentSoft; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = LIT.border; e.currentTarget.style.background = LIT.card; }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, marginBottom: 3 }}>🙋 I can answer those questions myself</div>
                <div style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.secondary }}>I fit this profile and I'm happy to chat directly</div>
              </button>
              <button
                onClick={() => setStep('share')}
                style={{
                  padding: '14px 18px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`,
                  background: LIT.card, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = LIT.border; e.currentTarget.style.background = LIT.card; }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, marginBottom: 3 }}>📢 Share this ask with your network</div>
                <div style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.secondary }}>Pass it on — the more people see it, the better their chances of finding the right person</div>
              </button>
              <button
                onClick={onClose}
                style={{ padding: '10px', borderRadius: LIT.radius, border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: LIT.muted, fontFamily: 'inherit' }}
              >
                I'm not the right person for this one
              </button>
            </div>
          </>
        )}

        {/* ── Step: share ── */}
        {step === 'share' && (() => {
          const shareUrl = `${window.location.origin}/c/${challenge.id}`;

          // Full message for copy + WhatsApp + LinkedIn
          const fullText = [
            `👋 Can you help?`,
            ``,
            `${challenge.author_name} is validating a startup idea and looking to connect with people who can share their experience or answer a few quick questions.`,
            ``,
            `Looking to speak with: ${challenge.target_profile}${challenge.target_domain ? ` (${challenge.target_domain})` : ''}.`,
            ``,
            `If you fit this profile or know someone who does, click the link to connect 👇`,
          ].join('\n');

          // Keep tweet under 200 chars — URL adds ~23 via t.co
          const tweetText = `Can you help? A founder in @mvpclub needs 5 conversations to validate their idea. Know the right person or happy to chat? 👇`;

          const encodedUrl      = encodeURIComponent(shareUrl);
          const encodedTweet    = encodeURIComponent(tweetText);
          const encodedWhatsApp = encodeURIComponent(`${fullText}\n${shareUrl}`);

          return (
            <>
              <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: LIT.muted, fontFamily: 'inherit', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Back
              </button>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 4 }}>📢 Share this ask</div>
              <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, marginBottom: 20, lineHeight: 1.55 }}>
                Pass this on to your network — one share could surface exactly the right person.
              </div>

              {/* Preview card */}
              <div style={{ background: LIT.cardTint, borderRadius: LIT.radius, padding: '14px 16px', marginBottom: 20, fontSize: 13.5, fontFamily: LIT.bodyFont, color: LIT.text, lineHeight: 1.7, whiteSpace: 'pre-line' as const }}>
                {fullText}
              </div>

              {/* Copy link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${fullText}\n${shareUrl}`).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  });
                }}
                style={{
                  width: '100%', padding: '11px', borderRadius: LIT.radius, marginBottom: 10,
                  border: `1.5px solid ${copied ? '#059669' : LIT.border}`,
                  background: copied ? '#f0fdf4' : LIT.card,
                  color: copied ? '#059669' : LIT.text,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .2s',
                }}
              >
                {copied ? '✅ Copied to clipboard!' : '🔗 Copy message + link'}
              </button>

              {/* Platform share buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, padding: '10px', borderRadius: LIT.radius, textAlign: 'center' as const,
                    background: '#0a66c2', color: '#fff', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', display: 'block',
                  }}
                >
                  LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedTweet}&url=${encodedUrl}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, padding: '10px', borderRadius: LIT.radius, textAlign: 'center' as const,
                    background: '#000', color: '#fff', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', display: 'block',
                  }}
                >
                  X
                </a>
                <a
                  href={`https://wa.me/?text=${encodedWhatsApp}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, padding: '10px', borderRadius: LIT.radius, textAlign: 'center' as const,
                    background: '#25d366', color: '#fff', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', display: 'block',
                  }}
                >
                  WhatsApp
                </a>
              </div>

              <button
                onClick={onClose}
                style={{ width: '100%', marginTop: 16, padding: '10px', borderRadius: LIT.radius, border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: LIT.muted, fontFamily: 'inherit' }}
              >
                Done
              </button>
            </>
          );
        })()}

        {/* ── Step: vouch form ── */}
        {step === 'vouch-form' && (
          <>
            <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: LIT.muted, fontFamily: 'inherit', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Back
            </button>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 4 }}>🤝 Share a contact</div>
            <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, marginBottom: 24, lineHeight: 1.55 }}>
              Share the details of someone in your network who could help. {challenge.author_name} will reach out to them directly — your name won't be shared unless you include it in the note.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <label style={labelStyle}>Contact's name *</label>
                <input style={inputStyle} placeholder="e.g. Jane Doe" value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Their email or LinkedIn *</label>
                <input style={inputStyle} placeholder="jane@company.com or linkedin.com/in/jane" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>How do you know them?</label>
                <input style={inputStyle} placeholder="e.g. Former colleague, friend, community member" value={howKnow} onChange={e => setHowKnow(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Note to {challenge.author_name} (optional)</label>
                <textarea
                  style={{ ...inputStyle, height: 72, resize: 'none' as const }}
                  placeholder="Anything helpful to mention when reaching out…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, background: LIT.card, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: LIT.secondary }}>
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || !contactName.trim() || !contactEmail.trim()}
                style={{
                  flex: 2, padding: '10px', borderRadius: LIT.radius, border: 'none',
                  background: (!contactName.trim() || !contactEmail.trim()) ? LIT.border : LIT.accent,
                  color: (!contactName.trim() || !contactEmail.trim()) ? LIT.muted : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: (!contactName.trim() || !contactEmail.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Sending…' : 'Send intro details →'}
              </button>
            </div>
          </>
        )}

        {/* ── Step: fit form ── */}
        {step === 'fit-form' && (
          <>
            <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: LIT.muted, fontFamily: 'inherit', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Back
            </button>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 4 }}>🙋 Happy to help</div>
            <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, marginBottom: 24, lineHeight: 1.55 }}>
              Great — {challenge.author_name} will reach out to you directly for a quick conversation. Just leave your details below.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <label style={labelStyle}>Your email *</label>
                <input style={inputStyle} placeholder="you@email.com" value={myEmail} onChange={e => setMyEmail(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn or website (optional)</label>
                <input style={inputStyle} placeholder="linkedin.com/in/you" value={myLinkedin} onChange={e => setMyLinkedin(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Why you fit — brief context</label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: 'none' as const }}
                  placeholder={`e.g. I've worked in this space for 5 years and your target profile matches my role exactly…`}
                  value={fitNote}
                  onChange={e => setFitNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, background: LIT.card, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: LIT.secondary }}>
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || !myEmail.trim()}
                style={{
                  flex: 2, padding: '10px', borderRadius: LIT.radius, border: 'none',
                  background: !myEmail.trim() ? LIT.border : LIT.accent,
                  color: !myEmail.trim() ? LIT.muted : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: !myEmail.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Sending…' : 'Share my details →'}
              </button>
            </div>
          </>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{helpType === 'vouch' ? '🤝' : '🙋'}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 8 }}>
              {helpType === 'vouch' ? 'Intro sent!' : 'Details shared!'}
            </div>
            <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, lineHeight: 1.6, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
              {helpType === 'vouch'
                ? `${challenge.author_name} can now reach out to make the connection. You just helped a founder move forward.`
                : `${challenge.author_name} will reach out to you soon. Thanks for putting your hand up — this is exactly the kind of thing that gets startups off the ground.`}
            </div>
            <button
              onClick={() => { onSubmitted(helpType!); onClose(); }}
              style={{ padding: '12px 28px', borderRadius: LIT.radius, border: 'none', background: LIT.text, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengesTab({ highlightId }: { highlightId?: string | null }) {
  const [challenges, setChallenges]   = useState<Challenge[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');
  const [logTarget, setLogTarget]     = useState<Challenge | null>(null);
  const [helpTarget, setHelpTarget]   = useState<Challenge | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await challengesApi.list();
      setChallenges(res.data.challenges ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as { message?: string })?.message ?? 'Failed to load challenges';
      setLoadError(msg);
      console.error('[ChallengesTab] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Scroll to highlighted challenge once loaded
  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`challenge-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, loading]);

  const handleOfferSubmitted = (c: Challenge, type: 'vouch' | 'fit') => {
    setChallenges(prev => prev.map(ch => ch.id !== c.id ? ch : {
      ...ch,
      i_vouched: type === 'vouch' ? true : ch.i_vouched,
      i_fit:     type === 'fit'   ? true : ch.i_fit,
      vouch_count: type === 'vouch' ? ch.vouch_count + 1 : ch.vouch_count,
      fit_count:   type === 'fit'   ? ch.fit_count   + 1 : ch.fit_count,
    }));
  };

  const active    = challenges.filter(c => c.status === 'active');
  const completed = challenges.filter(c => c.status === 'completed');

  if (loading) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '60px 0', color: LIT.muted }}>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: LIT.bodyFont }}>Loading challenges…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '60px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Couldn't load challenges</div>
        <div style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.secondary, marginBottom: 20 }}>{loadError}</div>
        <button
          onClick={load}
          style={{ padding: '10px 20px', borderRadius: LIT.radius, border: 'none', background: LIT.text, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: LIT.headFont, letterSpacing: -0.4, color: LIT.text, marginBottom: 4 }}>
          🎯 Proof of Demand Challenges
        </div>
        <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary }}>
          Founders committing to 5 customer conversations in 14 days. Help them get there — one intro can change everything.
        </div>
      </div>

      {challenges.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '56px 0' }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🤝</div>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: LIT.headFont, color: LIT.text, marginBottom: 8 }}>No active challenges yet</div>
          <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.secondary, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 8px' }}>
            When founders post their 5-conversation challenge, it'll show up here. Each card tells you exactly who they need to speak to — and you can send their contact details directly.
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {active.map(c => (
            <ChallengeCard key={c.id} challenge={c} onLogConvo={setLogTarget} onHelp={setHelpTarget} highlight={highlightId === c.id} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: LIT.headFont, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 12 }}>
            Completed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completed.map(c => (
              <ChallengeCard key={c.id} challenge={c} onLogConvo={setLogTarget} onHelp={setHelpTarget} highlight={highlightId === c.id} />
            ))}
          </div>
        </>
      )}

      {/* Log conversation modal */}
      {logTarget && (
        <LogConversationModal
          challenge={logTarget}
          onClose={() => setLogTarget(null)}
          onLogged={(count, verdict) => {
            setChallenges(prev => prev.map(c => c.id !== logTarget.id ? c : {
              ...c,
              conversation_count: count,
              status: verdict ? 'completed' as const : c.status,
              verdict_signal: (verdict ?? c.verdict_signal) as Challenge['verdict_signal'],
            }));
            setLogTarget(null);
          }}
        />
      )}

      {/* Challenge detail + help modal */}
      {helpTarget && (
        <ChallengeDetailModal
          challenge={helpTarget}
          onClose={() => setHelpTarget(null)}
          onSubmitted={(type) => { handleOfferSubmitted(helpTarget, type); }}
        />
      )}
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────

interface LBEntry {
  name: string;
  initials: string;
  total: number;
  count: number;
  breakdown: Partial<Record<ContribKey, number>>;
}

const MEDAL = ['🥇', '🥈', '🥉'];

// Map ContribKey → numeric pts value
const CONTRIB_PTS: Record<ContribKey, number> = Object.fromEntries(
  CONTRIB_TYPES.map(c => [c.key, parseInt(c.pts.replace('+', ''), 10)])
) as Record<ContribKey, number>;

function LeaderboardTab() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ppCount, setPpCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ppRes = await communityApi.listPainPoints();
        const pps: PainPoint[] = ppRes.data.posts ?? [];
        if (!cancelled) setPpCount(pps.length);

        // Fetch all comments in parallel
        const commentBatches: PPComment[][] = await Promise.all(
          pps.map(pp =>
            communityApi.getComments(pp.id)
              .then(r => (r.data.comments ?? []) as PPComment[])
              .catch(() => [] as PPComment[])
          )
        );

        if (cancelled) return;

        // Aggregate per author
        const map = new Map<string, LBEntry>();
        commentBatches.flat().forEach(cmt => {
          const { type } = parseContrib(cmt.content);
          if (!type) return;
          const pts = CONTRIB_PTS[type] ?? 0;
          const key = cmt.author_name;
          const existing = map.get(key);
          if (existing) {
            existing.total += pts;
            existing.count += 1;
            existing.breakdown[type] = (existing.breakdown[type] ?? 0) + 1;
          } else {
            map.set(key, {
              name: cmt.author_name,
              initials: cmt.author_initials || initials(cmt.author_name),
              total: pts,
              count: 1,
              breakdown: { [type]: 1 },
            });
          }
        });

        const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total);
        if (!cancelled) setEntries(sorted);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const maxPts = entries[0]?.total ?? 1;

  if (loading) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '60px 0', color: LIT.muted, fontFamily: LIT.bodyFont }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Tallying thinking points…</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '60px 24px', color: LIT.muted, fontFamily: LIT.bodyFont }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>💭</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: LIT.text, marginBottom: 8, fontFamily: LIT.headFont }}>No contributions yet</div>
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>
          Be the first to investigate a pain point — ask a question, share evidence, or propose a solution.
        </div>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4, color: LIT.text, marginBottom: 4, fontFamily: LIT.headFont }}>
          🏆 Thinking Points Leaderboard
        </div>
        <div style={{ fontSize: 14, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
          Points earned by investigating {ppCount} pain point{ppCount !== 1 ? 's' : ''} · Questions score highest (+42)
        </div>
      </div>

      {/* Top 3 podium cards */}
      {top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
          {top3.map((e, i) => {
            const isFirst = i === 0;
            return (
              <div
                key={e.name}
                style={{
                  background: isFirst
                    ? 'linear-gradient(135deg, #fef9c3, #fef3c7)'
                    : LIT.card,
                  border: `2px solid ${isFirst ? '#fbbf24' : i === 1 ? '#d1d5db' : '#d97706'}`,
                  borderRadius: LIT.radius,
                  padding: '20px 16px',
                  textAlign: 'center' as const,
                  position: 'relative' as const,
                  boxShadow: isFirst ? '0 8px 24px rgba(251,191,36,.2)' : '0 2px 8px rgba(0,0,0,.06)',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>{MEDAL[i]}</div>
                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: isFirst ? '#fbbf24' : i === 1 ? '#9ca3af' : '#d97706',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#fff',
                  margin: '0 auto 10px',
                }}>
                  {e.initials}
                </div>
                <div
                  onClick={() => navigate(`/community/member/${encodeURIComponent(e.name)}`)}
                  style={{ fontSize: 13, fontWeight: 800, color: LIT.text, marginBottom: 4, lineHeight: 1.3, cursor: 'pointer', fontFamily: LIT.headFont }}
                  onMouseEnter={el => (el.currentTarget.style.color = LIT.accent)}
                  onMouseLeave={el => (el.currentTarget.style.color = LIT.text)}
                >
                  {e.name}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: isFirst ? '#b45309' : '#374151', marginBottom: 4 }}>
                  {e.total.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: LIT.muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 10 }}>
                  pts · {e.count} contribution{e.count !== 1 ? 's' : ''}
                </div>
                {/* Type breakdown chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, justifyContent: 'center' }}>
                  {(Object.entries(e.breakdown) as [ContribKey, number][])
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, cnt]) => {
                      const ct = CONTRIB_TYPES.find(c => c.key === type);
                      if (!ct) return null;
                      return (
                        <span key={type} style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 20,
                          background: ct.bg, color: ct.color, fontWeight: 700,
                        }}>
                          {ct.icon} {cnt}
                        </span>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked list for #4+ */}
      {rest.length > 0 && (
        <div style={{ background: LIT.card, borderRadius: LIT.radius, border: `1.5px solid ${LIT.border}`, overflow: 'hidden' }}>
          {rest.map((e, i) => {
            const rank = i + 4;
            const barW = Math.max(4, Math.round((e.total / maxPts) * 100));
            return (
              <div
                key={e.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderBottom: i < rest.length - 1 ? `1px solid ${LIT.border}` : 'none',
                }}
              >
                {/* Rank */}
                <div style={{ width: 28, textAlign: 'right' as const, fontSize: 13, fontWeight: 800, color: LIT.muted, flexShrink: 0 }}>
                  {rank}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${LIT.accent}, #6b4520)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {e.initials}
                </div>

                {/* Name + bar + breakdown */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span
                      onClick={() => navigate(`/community/member/${encodeURIComponent(e.name)}`)}
                      style={{ fontSize: 13, fontWeight: 700, color: LIT.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, cursor: 'pointer', fontFamily: LIT.headFont }}
                      onMouseEnter={el => (el.currentTarget.style.color = LIT.accent)}
                      onMouseLeave={el => (el.currentTarget.style.color = LIT.text)}
                    >
                      {e.name}
                    </span>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap' as const, flexShrink: 0 }}>
                      {(Object.entries(e.breakdown) as [ContribKey, number][])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([type, cnt]) => {
                          const ct = CONTRIB_TYPES.find(c => c.key === type);
                          if (!ct) return null;
                          return (
                            <span key={type} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 20, background: ct.bg, color: ct.color, fontWeight: 700 }}>
                              {ct.icon}{cnt > 1 ? ` ×${cnt}` : ''}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 4, background: LIT.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg, ${LIT.accent}, #6b4520)`, borderRadius: 99 }} />
                  </div>
                </div>

                {/* Points */}
                <div style={{ fontSize: 14, fontWeight: 900, color: LIT.text, flexShrink: 0 }}>
                  {e.total.toLocaleString()}
                  <span style={{ fontSize: 10, color: LIT.muted, fontWeight: 600, marginLeft: 2 }}>pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div style={{ textAlign: 'center' as const, fontSize: 12, color: LIT.muted, marginTop: 20, fontFamily: LIT.bodyFont }}>
        Points: 🔍 +42 · ⚠️ +31 · 💡 +28 · 🧪 +24 · 🔄 +19 · 📊 +18 · 🎯 +15
      </div>
    </div>
  );
}

// ── Pain Points Tab ───────────────────────────────────────────────────────────

// ── Build Idea Modal (Pain Point → Idea pipeline) ─────────────────────────────
function BuildIdeaModal({
  pp, data, onClose,
}: {
  pp: PainPoint;
  data: PainPointData | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  // Pre-fill from pain point
  const defaultName = data?.description
    ? (data.description.length > 60 ? data.description.slice(0, 57) + '…' : data.description)
    : pp.content.slice(0, 60);
  const defaultDesc = [
    data?.description ?? pp.content,
    data?.audience ? `Target: ${data.audience}.` : '',
    data?.frequency ? `Frequency: ${data.frequency}.` : '',
  ].filter(Boolean).join(' ');

  const [name, setName]     = useState(defaultName);
  const [desc, setDesc]     = useState(defaultDesc);
  const [stage, setStage]   = useState<Stage>('idea');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  const STAGE_OPTS: Stage[] = ['idea', 'hone', 'validate', 'shape'];

  const create = async () => {
    if (!name.trim()) { setError('Give your idea a name.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await ideasApi.create({
        name: name.trim(),
        description: desc.trim(),
        stage,
        ...(data?.domain ? { business_domain: data.domain } : {}),
      });
      setCreatedId(res.data.idea?.id ?? null);
    } catch {
      setError('Could not create idea. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 520,
        background: LIT.card, borderRadius: LIT.radius,
        boxShadow: '0 32px 80px rgba(70,50,15,.2)',
        zIndex: 401, overflow: 'hidden',
        animation: 'fadeSlideIn .2s ease',
      }}>
        {/* Accent bar */}
        <div style={{ height: 4, background: LIT.accent }} />

        <div style={{ padding: '26px 28px 28px' }}>
          {createdId ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' as const, padding: '8px 0 4px' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🚀</div>
              <div style={{ fontSize: 21, fontWeight: 700, color: LIT.text, marginBottom: 8, fontFamily: LIT.headFont }}>Idea created!</div>
              <div style={{ fontSize: 15, color: LIT.secondary, lineHeight: 1.6, marginBottom: 24, fontFamily: LIT.bodyFont }}>
                It's live in your community profile. Head there to post updates, attract collaborators, and track your progress.
              </div>
              {/* Source pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: LIT.accentSoft, border: `1px solid ${LIT.accentSoftBorder}`, borderRadius: 20, padding: '5px 12px', fontSize: 11, color: LIT.accent, fontWeight: 600, marginBottom: 24 }}>
                🎯 Sourced from this pain point
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '11px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: LIT.card, color: LIT.secondary, fontFamily: 'inherit' }}
                >
                  Stay here
                </button>
                <button
                  onClick={() => { onClose(); navigate(`/community/${createdId}`); }}
                  style={{ flex: 2, padding: '11px', border: 'none', borderRadius: LIT.radius, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: LIT.text, color: '#fff', fontFamily: 'inherit' }}
                >
                  View your idea →
                </button>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Source pain point badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: LIT.accentSoft, border: `1px solid ${LIT.accentSoftBorder}`, borderRadius: 20, padding: '4px 11px', fontSize: 11, color: LIT.accent, fontWeight: 600, marginBottom: 16 }}>
                🎯 Building from this pain point
              </div>

              <div style={{ fontSize: 21, fontWeight: 700, color: LIT.text, letterSpacing: -0.4, marginBottom: 4, fontFamily: LIT.headFont }}>
                Turn this pain into an idea
              </div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 22, lineHeight: 1.5, fontFamily: LIT.bodyFont }}>
                We've pre-filled this from the pain point. Edit anything before you post.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>Idea name</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={120}
                    style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 14, fontFamily: LIT.bodyFont, outline: 'none', boxSizing: 'border-box' as const, color: LIT.text }}
                    onFocus={e => (e.target.style.borderColor = LIT.accent)}
                    onBlur={e => (e.target.style.borderColor = LIT.border)}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>What's the problem you're solving?</label>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 14, fontFamily: LIT.bodyFont, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, lineHeight: 1.6, color: LIT.secondary }}
                    onFocus={e => (e.target.style.borderColor = LIT.accent)}
                    onBlur={e => (e.target.style.borderColor = LIT.border)}
                  />
                </div>

                {/* Stage */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.6, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>Where are you at?</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STAGE_OPTS.map(s => (
                      <button
                        key={s}
                        onClick={() => setStage(s)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${stage === s ? STAGE_COLORS[s] : LIT.border}`,
                          background: stage === s ? STAGE_COLORS[s] + '18' : LIT.card,
                          color: stage === s ? STAGE_COLORS[s] : LIT.muted,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                        }}
                      >
                        {STAGE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    onClick={onClose}
                    style={{ flex: 1, padding: '11px', border: `1.5px solid ${LIT.border}`, borderRadius: LIT.radius, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: LIT.card, color: LIT.secondary, fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={create}
                    disabled={!name.trim() || saving}
                    style={{
                      flex: 2, padding: '11px', border: 'none', borderRadius: LIT.radius,
                      fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default',
                      background: name.trim() ? LIT.accent : LIT.border,
                      color: name.trim() ? '#fff' : LIT.muted,
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}
                  >
                    {saving ? 'Creating…' : 'Create idea →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Pain Point Card Legend ────────────────────────────────────────────────────
// Arrow connector helpers
const ArrowRight = () => (
  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
    <div style={{ width: 28, height: 1, background: LIT.accentSoftBorder }} />
    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `6px solid ${LIT.accentSoftBorder}` }} />
  </div>
);
const ArrowLeft = () => (
  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: `6px solid ${LIT.accentSoftBorder}` }} />
    <div style={{ width: 28, height: 1, background: LIT.accentSoftBorder }} />
  </div>
);

function PainPointCardLegend() {
  const [open, setOpen] = useState(false);

  // Card height is ~248px. Left 3 items / right 4 items are distributed with space-around.
  const CARD_H = 248;

  const leftAnnotations = [
    { title: 'The pain point',    body: 'The problem statement. Click anywhere on the card to open the full investigation thread.' },
    { title: 'Who + how often',   body: 'The audience affected and how frequently they encounter it.' },
    { title: 'Confidence score',  body: '0–100% signal strength: definition quality + community evidence + agreement.' },
  ];

  const rightAnnotations = [
    { title: 'Age + impact',        body: 'When posted and severity level — high, medium, or low.' },
    { title: 'Three signals',        body: 'Confirmed = "I feel this". Insights = contributions. Pursuing = building a fix.' },
    { title: 'Community tension',   body: 'Split between validating the problem vs. needing a better solution.' },
    { title: 'Investigate →',       body: 'Click to open the investigation and add a typed contribution.' },
  ];

  return (
    <div style={{
      marginBottom: 18,
      border: `1.5px solid ${LIT.accentSoftBorder}`,
      borderRadius: LIT.radius,
      background: LIT.accentSoft,
      overflow: 'hidden',
    }}>
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🗺️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: LIT.accent, fontFamily: LIT.headFont }}>How to read these cards</span>
        </div>
        <span style={{ fontSize: 13, color: LIT.accent, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
      </button>

      {/* Legend body */}
      {open && (
        <div style={{ padding: '0 16px 20px' }}>

          {/* 3-column anatomy diagram */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px 1fr', gap: '0 0', alignItems: 'stretch' }}>

            {/* LEFT annotations — point right → card */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: CARD_H, paddingRight: 4 }}>
              {leftAnnotations.map(a => (
                <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: LIT.text, lineHeight: 1.3, fontFamily: LIT.headFont }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: LIT.secondary, lineHeight: 1.4, maxWidth: 160, fontFamily: LIT.bodyFont }}>{a.body}</div>
                  </div>
                  <ArrowRight />
                </div>
              ))}
            </div>

            {/* CENTRE — mini card mock */}
            <div style={{
              background: LIT.card, border: `1.5px solid ${LIT.border}`,
              borderRadius: LIT.radius, padding: '14px 14px',
              fontSize: 11, boxShadow: LIT.shadow,
            }}>
              {/* Eyebrow */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 8, color: LIT.muted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, fontFamily: LIT.headFont }}>Pain point · 3h ago</span>
                <span style={{ fontSize: 8, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '1px 6px', fontWeight: 700, border: '1px solid #fcd34d' }}>High</span>
              </div>
              {/* Description */}
              <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.35, color: LIT.text, marginBottom: 6, fontFamily: LIT.headFont }}>
                PMF takes 12+ months with no clear signal
              </div>
              {/* Audience */}
              <div style={{ fontSize: 9, color: LIT.secondary, marginBottom: 9, fontFamily: LIT.bodyFont }}>👥 Early founders · 🔄 Constantly</div>
              {/* Confidence bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                <div style={{ flex: 1, height: 4, background: LIT.cardTint, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '62%', background: '#2563eb', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#2563eb' }}>62%</span>
              </div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
                {[['7','Confirmed'],['12','Insights'],['4','Pursuing']].map(([v,l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: LIT.text, fontFamily: LIT.headFont }}>{v}</div>
                    <div style={{ fontSize: 7, fontWeight: 600, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* Tension */}
              <div style={{ background: LIT.cardTint, border: `1px solid ${LIT.border}`, borderRadius: 7, padding: '5px 8px', marginBottom: 9, fontSize: 9, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>⚡ Community tension</div>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>64% real problem</span>
                <span style={{ color: LIT.border }}> · </span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>36% need solution</span>
              </div>
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: LIT.muted, fontFamily: LIT.bodyFont }}>23 contributors</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: LIT.accent }}>Investigate →</span>
              </div>
            </div>

            {/* RIGHT annotations — point left ← card */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: CARD_H, paddingLeft: 4 }}>
              {rightAnnotations.map(a => (
                <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowLeft />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: LIT.text, lineHeight: 1.3, fontFamily: LIT.headFont }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: LIT.secondary, lineHeight: 1.4, maxWidth: 160, fontFamily: LIT.bodyFont }}>{a.body}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Contribution type strip */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: LIT.accent, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8, fontFamily: LIT.headFont }}>
              Inside the investigation — tap a type to contribute
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {[
                { icon: '🔍', label: 'Question',   pts: '+42', color: '#7c3aed' },
                { icon: '💡', label: 'Solution',   pts: '+28', color: '#2563eb' },
                { icon: '⚠️', label: 'Assumption', pts: '+31', color: '#d97706' },
                { icon: '📊', label: 'Evidence',   pts: '+18', color: '#059669' },
                { icon: '🔄', label: 'Experience', pts: '+19', color: '#dc2626' },
                { icon: '🧪', label: 'Experiment', pts: '+24', color: '#2563eb' },
                { icon: '🎯', label: 'Impact',     pts: '+15', color: '#059669' },
              ].map(ct => (
                <span key={ct.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: ct.color + '10', color: ct.color,
                  border: `1px solid ${ct.color}30`,
                }}>
                  {ct.icon} {ct.label}
                  <span style={{ opacity: 0.6, fontWeight: 500, fontSize: 9 }}>{ct.pts}</span>
                </span>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function PainPointsTab({ onNavigate: _onNavigate }: { onNavigate: (path: string) => void }) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showLog,    setShowLog]    = useState(false);
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [detailPP, setDetailPP] = useState<PainPoint | null>(null);

  useEffect(() => {
    let cancelled = false;
    communityApi.listPainPoints()
      .then(res => { if (!cancelled) setPainPoints(res.data.pain_points ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleReact = async (id: string, type: 'encourage' | 'pursue') => {
    try { await communityApi.react(id, type); } catch { /* silent */ }
    setPainPoints(prev => prev.map(p => {
      if (p.id !== id) return p;
      const wasThis = p.user_reacted === type;
      return {
        ...p,
        user_reacted: wasThis ? null : type,
        encourage_count: type === 'encourage' ? p.encourage_count + (wasThis ? -1 : 1) : p.encourage_count,
        pursue_count:    type === 'pursue'    ? p.pursue_count    + (wasThis ? -1 : 1) : p.pursue_count,
      };
    }));
  };

  const filtered = impactFilter === 'all'
    ? painPoints
    : painPoints.filter(p => { const d = decodePP(p.content); return d?.impact === impactFilter; });

  const chipBtn = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap' as const, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
    border: `1.5px solid ${active ? (color ?? LIT.text) : LIT.border}`,
    background: active ? (color ?? LIT.text) : LIT.card,
    color: active ? '#fff' : LIT.secondary,
    transition: 'all .15s',
  });

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        borderRadius: LIT.radius, padding: '28px 32px', marginBottom: 28,
        background: LIT.accentSoft,
        border: `1.5px solid ${LIT.accentSoftBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: LIT.accent, letterSpacing: 1.3, textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: LIT.headFont }}>
            🎯 Community Pain Points
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: LIT.text, letterSpacing: -0.5, fontFamily: LIT.headFont, marginBottom: 6 }}>
            Real problems waiting for a founder.
          </div>
          <div style={{ fontSize: 14, color: LIT.secondary, maxWidth: 480, fontFamily: LIT.bodyFont }}>
            Log a pain point you've observed. Other founders can discover it, pursue it, and build a solution — turning your observation into someone's startup.
          </div>
        </div>
        <button
          onClick={() => setShowLog(true)}
          style={{
            padding: '13px 26px', borderRadius: 100, border: 'none',
            background: LIT.accent,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(138,90,43,.25)',
          }}
        >
          🎯 Log a pain point
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' as const }}>
        <button onClick={() => setImpactFilter('all')}    style={chipBtn(impactFilter === 'all')}>All pain points</button>
        <button onClick={() => setImpactFilter('high')}   style={chipBtn(impactFilter === 'high',   '#dc2626')}>🔥 High impact</button>
        <button onClick={() => setImpactFilter('medium')} style={chipBtn(impactFilter === 'medium', '#d97706')}>⚡ Medium impact</button>
        <button onClick={() => setImpactFilter('low')}    style={chipBtn(impactFilter === 'low',    '#059669')}>💡 Low impact</button>
        {painPoints.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: LIT.muted, alignSelf: 'center', fontWeight: 600, fontFamily: LIT.bodyFont }}>
            {filtered.length} pain point{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center' as const, color: LIT.muted, padding: '60px 0', fontSize: 14, fontFamily: LIT.bodyFont }}>
          Loading pain points…
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center' as const, padding: '60px 24px',
          background: LIT.cardTint, borderRadius: LIT.radius,
          border: `1.5px dashed ${LIT.border}`,
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: LIT.text, marginBottom: 6, fontFamily: LIT.headFont }}>
            {impactFilter === 'all' ? 'No pain points logged yet' : `No ${impactFilter}-impact pain points yet`}
          </div>
          <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 20, fontFamily: LIT.bodyFont }}>
            {impactFilter === 'all'
              ? 'Be the first. Log a real problem you\'ve seen — another founder might build the solution.'
              : 'Try a different filter or log one yourself.'}
          </div>
          <button onClick={() => setShowLog(true)} style={{
            padding: '11px 24px', borderRadius: 100, border: 'none',
            background: LIT.accent,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Log the first pain point →
          </button>
        </div>
      )}

      {/* Card legend */}
      {!loading && filtered.length > 0 && <PainPointCardLegend />}

      {/* Cards grid */}
      {!loading && filtered.length > 0 && (
        <PainPointCards items={filtered} onOpen={setDetailPP} />
      )}

      {/* Log modal */}
      {showLog && (
        <LogPainPointModal
          onClose={() => setShowLog(false)}
          onLogged={pp => { setPainPoints(prev => [pp, ...prev]); setShowLog(false); }}
        />
      )}

      {/* Investigation detail slide-over */}
      {detailPP && (
        <PainPointDetailModal
          pp={detailPP}
          onClose={() => setDetailPP(null)}
          onReact={handleReact}
        />
      )}
    </div>
  );
}

// ── Early-Stage Funding News widget ─────────────────────────────────────────
// Real angel/pre-seed/seed-round headlines scraped from Google News RSS,
// then rephrased in Ollama's own words — refreshed daily. No outbound link
// to the source site; the source is named as plain-text attribution only.
// See backend/src/utils/startupNewsFeed.ts.

interface StartupNewsItem {
  id: string;
  headline: string;
  source: string;
  published_at: string | null;
}

function newsAgo(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

// Fetches the curated news items once, for the compact pill-chip row
// (placement option #44) shown in the same spot as the original banner.
function useStartupNews() {
  const [items, setItems]     = useState<StartupNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.listStartupNews()
      .then(res => setItems(res.data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

// Placement option #44 — same spot as the original banner (right under the
// "MVP Club is free" support banner), but instead of big cards, a single
// row of small rounded pill-chips, headline text only, auto-scrolling like a
// news ticker. Still no outbound link — just the rephrased headline and a
// plain-text source/timestamp on hover via title=.
function StartupNewsPillRow() {
  const { items, loading } = useStartupNews();
  const [now, setNow] = useState(() => new Date());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ height: 26, width: 120 + (i % 2) * 40, borderRadius: 100, background: '#111', border: '1px solid #333' }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  // Duplicate the list so the looping animation has no visible seam.
  const trackItems = [...items, ...items];
  const duration = Math.max(45, items.length * 14);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#000', letterSpacing: .5, fontFamily: LIT.headFont }}>
          📰 Funding news
        </span>
        <span style={{ fontSize: 11, color: '#000', fontFamily: '"Courier New", Courier, monospace', letterSpacing: .3 }}>
          {dateStr} · {timeStr}
        </span>
      </div>

      <div
        style={{ overflow: 'hidden', width: '100%' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div style={{
          display: 'flex', gap: 8, width: 'max-content',
          animation: `newsTickerScroll ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}>
          {trackItems.map((item, i) => (
            <span
              key={`${item.id}-${i}`}
              title={`${item.source}${item.published_at ? ` · ${newsAgo(item.published_at)}` : ''}`}
              style={{
                flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: '#f2f2f2',
                background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 100,
                padding: '5px 14px', fontFamily: '"Courier New", Courier, monospace',
                letterSpacing: .3, cursor: 'default',
              }}
            >
              {item.headline}
            </span>
          ))}
        </div>
      </div>

      {/* Ticker keyframe — moves the (doubled) track left→right in a seamless loop */}
      <style>{`@keyframes newsTickerScroll { from { transform: translateX(-50%); } to { transform: translateX(0%); } }`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useApp();
  const isMobile = useIsMobile();
  const [tab, setTab]                   = useState<'proof' | 'ideas' | 'pain' | 'collab' | 'leaderboard' | 'challenges'>(() => {
    const t = searchParams.get('tab');
    return (t === 'challenges' || t === 'ideas' || t === 'proof' || t === 'pain' || t === 'collab' || t === 'leaderboard') ? t : 'ideas';
  });
  const [highlightChallengeId] = useState<string | null>(() => searchParams.get('highlight'));
  const [showPayItForward, setShowPayItForward] = useState(false);
  const [ideas, setIdeas]               = useState<IdeaCard[]>([]);
  const [stageFilter, setStageFilter]   = useState<Stage | 'all'>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [sortMode, setSortMode]         = useState<SortMode>('engagement');
  const [viewMode, setViewMode]         = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (['grid', 'list', 'kanban', 'spotlight', 'domain'] as const).includes(saved as ViewMode) ? (saved as ViewMode) : 'grid';
  });
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, viewMode); }, [viewMode]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [canvasIdea, setCanvasIdea]     = useState<IdeaCard | null>(null);
  const [offerIdea, setOfferIdea]       = useState<IdeaCard | null>(null);
  const [rxStore, setRxStore]           = useState<RxStore>(loadRx);

  // Determine user's current stage from their active idea
  const [userStage, setUserStage] = useState<Stage>('idea');
  useEffect(() => {
    ideasApi.list().then(res => {
      const active = (res.data.ideas ?? []).find((i: { is_active: boolean; idea_status: string; stage: Stage }) => i.is_active && i.idea_status === 'active');
      if (active) setUserStage(active.stage);
    }).catch(() => {});
  }, []);

  const fetchIdeas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await communityApi.listIdeas(stageFilter === 'all' ? undefined : stageFilter);
      const fetched: IdeaCard[] = res.data.ideas ?? [];
      // Seed reaction counts for any new ideas
      setRxStore(prev => {
        let next = { ...prev };
        fetched.forEach(idea => { next = ensureRx(next, idea.id); });
        saveRx(next);
        return next;
      });
      setIdeas(fetched);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not load ideas. Is the backend running?');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchIdeas(); }, [stageFilter]);
  useEffect(() => { setDomainFilter('all'); }, [stageFilter]);

  const handleReact = useCallback((ideaId: string, key: RKey) => {
    setRxStore(prev => {
      const entry = prev[ideaId] ?? { counts: {}, mine: null };
      const prevMine = entry.mine;
      let counts = { ...entry.counts };
      if (prevMine === key) {
        // deselect
        counts[key] = Math.max(0, (counts[key] ?? 0) - 1);
        const next = { ...prev, [ideaId]: { counts, mine: null } };
        saveRx(next); return next;
      }
      if (prevMine) {
        // switch reaction
        counts[prevMine] = Math.max(0, (counts[prevMine] ?? 0) - 1);
      }
      counts[key] = (counts[key] ?? 0) + 1;
      const next = { ...prev, [ideaId]: { counts, mine: key } };
      saveRx(next); return next;
    });
  }, []);

  const availableDomains = Object.entries(
    ideas.reduce<Record<string, number>>((acc, i) => {
      if (i.business_domain) acc[i.business_domain] = (acc[i.business_domain] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([d]) => d);

  const filtered = domainFilter === 'all' ? ideas : ideas.filter(i => i.business_domain === domainFilter);

  const displayed = [...filtered].sort((a, b) => {
    if (sortMode === 'newest')     return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sortMode === 'responses')  return b.post_count - a.post_count;
    return engagementScore(b, rxStore) - engagementScore(a, rxStore); // engagement
  });

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
    border: `1.5px solid ${active ? LIT.accent : LIT.border}`,
    background: active ? LIT.accent : LIT.card,
    color: active ? '#fff' : LIT.secondary,
    transition: 'all .15s',
  });

  return (
    <div style={{ background: LIT.pageBg, minHeight: '100vh', fontFamily: LIT.bodyFont }}>
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '32px 40px 80px', color: LIT.text }}>

      {/* Header */}
      <div style={{ marginBottom: 28, borderBottom: `1px solid ${LIT.border}`, paddingBottom: 24 }}>
        <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 10 }}>Community</div>
        <h1 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1, fontFamily: LIT.headFont, margin: '0 0 16px', color: LIT.text }}>
          Ideas from every founder!
        </h1>
        {/* Tab bar — active state uses TAB_ACTIVE_COLOR (Classic Orange #f07d19,
            picked from the 60-shade swatch review), kept separate from
            LIT.accent so the rest of the page's brown/gold chrome is
            untouched. */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
          {([
            { key: 'ideas',  label: '💡 All Ideas' },
            { key: 'proof',  label: '🏆 Community Proof' },
            { key: 'pain',        label: '🎯 Pain Points' },
            { key: 'collab',      label: '🤝 Collabs' },
            { key: 'challenges',  label: '🎯 Challenges' },
            { key: 'leaderboard', label: '🏆 Leaderboard' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                border: `1.5px solid ${tab === t.key ? TAB_ACTIVE_COLOR : LIT.border}`,
                background: tab === t.key ? TAB_ACTIVE_COLOR : LIT.card,
                color: tab === t.key ? '#fff' : LIT.secondary,
                fontFamily: 'inherit', transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Support banner ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        padding: '14px 24px',
        marginBottom: 28,
        borderRadius: LIT.radius,
        background: LIT.cardTint,
        border: `1.5px solid ${LIT.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🤝</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: LIT.text }}>MVP Club is free — and we'd like to keep it that way. </span>
            <span style={{ fontSize: 13, fontFamily: LIT.bodyFont, color: LIT.secondary }}>If this has helped you, consider supporting the community.</span>
          </div>
        </div>
        <button
          onClick={() => setShowPayItForward(true)}
          style={{
            padding: '9px 20px',
            borderRadius: 100,
            background: LIT.accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(138,90,43,.2)',
          }}
        >
          Support MVP Club →
        </button>
      </div>

      {/* Early-Stage Funding News — compact pill-chip row, community home page only */}
      {tab === 'ideas' && <StartupNewsPillRow />}

      {/* Proof tab */}
      {tab === 'proof' && (
        <ProofTab userStage={userStage} userId={user?.id} onNavigate={navigate} />
      )}

      {/* Pain Points tab */}
      {tab === 'pain' && (
        <PainPointsTab onNavigate={navigate} />
      )}

      {/* Collabs tab */}
      {tab === 'collab' && (
        <CollabsTab userId={user?.id} />
      )}

      {/* Challenges tab */}
      {tab === 'challenges' && (
        <ChallengesTab highlightId={highlightChallengeId} />
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <LeaderboardTab />
      )}

      {/* Ideas tab controls + grid */}
      {tab === 'ideas' && <>
      {/* Stage filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
        {STAGE_FILTER.map(f => (
          <button key={f.value} onClick={() => setStageFilter(f.value)} style={filterBtn(stageFilter === f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Domain filter */}
      {!loading && availableDomains.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
          <button onClick={() => setDomainFilter('all')} style={filterBtn(domainFilter === 'all')}>All domains</button>
          {availableDomains.map(d => (
            <button key={d} onClick={() => setDomainFilter(domainFilter === d ? 'all' : d)} style={filterBtn(domainFilter === d)}>
              {DOMAIN_LABELS[d] ?? d}
            </button>
          ))}
        </div>
      )}

      {/* Sort controls + view switcher — same row, sort on the left, view on the right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, letterSpacing: .5, whiteSpace: 'nowrap' }}>Sort by</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {SORT_OPTS.map(s => (
              <button key={s.value} onClick={() => setSortMode(s.value)} style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                border: `1.5px solid ${sortMode === s.value ? LIT.accent : LIT.border}`,
                background: sortMode === s.value ? LIT.accent : LIT.card,
                color: sortMode === s.value ? '#fff' : LIT.secondary,
                transition: 'all .15s',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, letterSpacing: .5, whiteSpace: 'nowrap' }}>View</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {VIEW_MODES.map(v => (
              <button key={v.value} title={v.label} onClick={() => setViewMode(v.value)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                border: `1.5px solid ${viewMode === v.value ? LIT.accent : LIT.border}`,
                background: viewMode === v.value ? LIT.accent : LIT.card,
                color: viewMode === v.value ? '#fff' : LIT.secondary,
                transition: 'all .15s',
              }}>
                <span>{v.icon}</span>
                {!isMobile && <span>{v.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: LIT.radius, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: LIT.muted, padding: 80, fontSize: 15, fontFamily: LIT.bodyFont }}>Loading ideas…</div>
      )}

      {/* Empty */}
      {!loading && displayed.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 80, color: LIT.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{domainFilter !== 'all' ? '🔍' : '🌱'}</div>
          <div style={{ fontFamily: LIT.headFont, fontSize: 16, fontWeight: 700, marginBottom: 6, color: LIT.text }}>
            {domainFilter !== 'all' ? `No ${DOMAIN_LABELS[domainFilter] ?? domainFilter} ideas yet` : 'No ideas here yet'}
          </div>
          <div style={{ fontSize: 14, fontFamily: LIT.bodyFont }}>
            {domainFilter !== 'all' ? 'Try a different domain or clear the filter.' : 'Be the first to post your idea and get community feedback.'}
          </div>
          {domainFilter !== 'all' && (
            <button onClick={() => setDomainFilter('all')} style={{ marginTop: 16, background: LIT.cardTint, color: LIT.text, border: `1px solid ${LIT.border}`, borderRadius: 3, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Grid — the original default view: full-detail cards */}
      {!loading && displayed.length > 0 && viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {displayed.map((idea, idx) => (
            <IdeaHeroCard
              key={idea.id}
              idea={idea}
              rank={idx + 1}
              rxStore={rxStore}
              onReact={handleReact}
              isOwnIdea={idea.user_id === user?.id}
              onClick={() => navigate(`/community/${idea.id}`)}
              onViewCanvas={e => { e.stopPropagation(); setCanvasIdea(idea); }}
              onOfferNetwork={e => { e.stopPropagation(); setOfferIdea(idea); }}
            />
          ))}
        </div>
      )}

      {/* List — dense rows, most ideas per screen */}
      {!loading && displayed.length > 0 && viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map((idea, idx) => (
            <IdeaListRow
              key={idea.id}
              idea={idea}
              rank={idx + 1}
              rxStore={rxStore}
              onClick={() => navigate(`/community/${idea.id}`)}
            />
          ))}
        </div>
      )}

      {/* Kanban — one column per stage, so you can see where the whole community is at a glance */}
      {!loading && displayed.length > 0 && viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
          {KANBAN_STAGES.map(st => {
            const items = displayed.filter(i => effectiveStage(i) === st);
            const color = STAGE_COLORS[st];
            return (
              <div key={st} style={{ flex: '0 0 260px', width: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0 2px 8px', borderBottom: `2px solid ${color}` }}>
                  <span style={{ fontFamily: LIT.headFont, fontSize: 12, fontWeight: 700, color }}>{st === 'done' ? '🚀 Shipped' : STAGE_LABELS[st]}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: LIT.muted }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                  {items.length === 0 && (
                    <div style={{ fontSize: 11, color: LIT.muted, textAlign: 'center', padding: '16px 0' }}>No ideas here</div>
                  )}
                  {items.map(idea => (
                    <IdeaKanbanCard key={idea.id} idea={idea} rxStore={rxStore} onClick={() => navigate(`/community/${idea.id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Spotlight — top 3 by the active sort get a featured section, rest below */}
      {!loading && displayed.length > 0 && viewMode === 'spotlight' && (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: LIT.accent, textTransform: 'uppercase' as const, marginBottom: 12 }}>🌟 Spotlight</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {displayed.slice(0, 3).map((idea, idx) => (
                <IdeaHeroCard
                  key={idea.id}
                  idea={idea}
                  rank={idx + 1}
                  rxStore={rxStore}
                  onReact={handleReact}
                  isOwnIdea={idea.user_id === user?.id}
                  onClick={() => navigate(`/community/${idea.id}`)}
                  onViewCanvas={e => { e.stopPropagation(); setCanvasIdea(idea); }}
                  onOfferNetwork={e => { e.stopPropagation(); setOfferIdea(idea); }}
                />
              ))}
            </div>
          </div>
          {displayed.length > 3 && (
            <>
              <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase' as const, marginBottom: 12 }}>More ideas</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {displayed.slice(3).map((idea, idx) => (
                  <IdeaHeroCard
                    key={idea.id}
                    idea={idea}
                    rank={idx + 4}
                    rxStore={rxStore}
                    onReact={handleReact}
                    isOwnIdea={idea.user_id === user?.id}
                    onClick={() => navigate(`/community/${idea.id}`)}
                    onViewCanvas={e => { e.stopPropagation(); setCanvasIdea(idea); }}
                    onOfferNetwork={e => { e.stopPropagation(); setOfferIdea(idea); }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* By domain — grouped into sections, biggest domain first */}
      {!loading && displayed.length > 0 && viewMode === 'domain' && (() => {
        const groups: Record<string, IdeaCard[]> = {};
        displayed.forEach(idea => {
          const key = idea.business_domain || 'other';
          (groups[key] ||= []).push(idea);
        });
        const order = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([k]) => k);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {order.map(domainKey => (
              <div key={domainKey}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontFamily: LIT.headFont, fontSize: 16, fontWeight: 700, color: LIT.text }}>
                    {domainKey === 'other' ? '🗂️ Other' : (DOMAIN_LABELS[domainKey] ?? domainKey)}
                  </span>
                  <span style={{ fontSize: 12, color: LIT.muted, fontWeight: 600 }}>{groups[domainKey].length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                  {groups[domainKey].map(idea => {
                    const idx = displayed.indexOf(idea);
                    return (
                      <IdeaHeroCard
                        key={idea.id}
                        idea={idea}
                        rank={idx + 1}
                        rxStore={rxStore}
                        onReact={handleReact}
                        isOwnIdea={idea.user_id === user?.id}
                        onClick={() => navigate(`/community/${idea.id}`)}
                        onViewCanvas={e => { e.stopPropagation(); setCanvasIdea(idea); }}
                        onOfferNetwork={e => { e.stopPropagation(); setOfferIdea(idea); }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
      </>}

      {showPayItForward && <PayItForwardModal onClose={() => setShowPayItForward(false)} />}

      {canvasIdea && (
        <IdeaCanvasModal
          idea={{ ...canvasIdea, is_active: false, created_at: canvasIdea.updated_at } as never}
          isActive={false}
          onClose={() => setCanvasIdea(null)}
          onMakeActive={() => {}}
          viewOnly
        />
      )}

      {offerIdea && (
        <NetworkOfferModal
          ideaId={offerIdea.id}
          ideaName={offerIdea.name}
          onClose={() => setOfferIdea(null)}
          onSuccess={() => setOfferIdea(null)}
        />
      )}
    </div>
    </div>
  );
}
