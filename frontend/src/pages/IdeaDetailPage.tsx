import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { communityApi, ideasApi, pitchDeckApi, interviewsApi } from '@/api/client';
import { Stage, STAGE_LABELS, STAGE_COLORS } from '@/types';
import IdeaCanvasModal from '@/components/IdeaCanvasModal';
import NetworkOfferModal from '@/components/NetworkOfferModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface IdeaDetail {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  community_ask: string | null;
  stage: Stage;
  idea_status: 'active' | 'done' | 'archived';
  business_domain: string | null;
  author_name: string;
  author_email: string;
  author_initials: string;
  post_count: number;
  bookmark_count: number;
  follow_count: number;
  is_bookmarked: boolean;
  is_following: boolean;
  updated_at: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  idea_id: string;
  stage: Stage;
  content: string;
  post_type: string;
  author_name: string;
  author_initials: string;
  encourage_count: number;
  ask_count: number;
  comment_count: number;
  user_reacted: 'encourage' | 'ask' | null;
  created_at: string;
}

interface NetworkOffer {
  id: string;
  offeror_name: string;
  offeror_initials: string;
  contact_name: string;
  contact_description: string;
  contact_type: 'linkedin' | 'email';
  contact_value: string;
  relationship: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  content: string;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_initials: string;
  content: string;
  created_at: string;
}

interface HelpRequest {
  id: string;
  type: 'talk' | 'advise' | 'intro' | 'share';
  text: string;
  resolved: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const POST_TYPES = [
  { key: 'win',                label: '🏆 Win',      short: '🏆',  color: '#16a34a', bg: '#f0fdf4' },
  { key: 'question',           label: '❓ Question',  short: '❓',  color: '#2563eb', bg: '#eff6ff' },
  { key: 'validation_request', label: '🧪 Feedback', short: '🧪', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'update',             label: '📝 Update',   short: '📝',  color: '#d97706', bg: '#fffbeb' },
];

const TYPE_PLACEHOLDERS: Record<string, string> = {
  win:                "Share a win — what's working, what you learned, what surprised you…",
  question:           "Ask a question — what are you stuck on? The community has answers…",
  validation_request: "Request feedback — be specific about what kind of input helps most…",
  update:             "Post an update — where are you at? What changed since last time?",
};

const STAGE_ORDER: Stage[] = ['idea', 'hone', 'validate', 'shape', 'done'];

const COMMUNITY_ASK_DEFAULTS: Record<Stage, string> = {
  idea:     'Looking for early feedback — does this solve a real problem?',
  hone:     'Help me sharpen my value proposition and target audience.',
  validate: 'Seeking early users to speak with about this pain point.',
  shape:    'Looking for advice on MVP scope and what to cut.',
  done:     'Open to collaborators, early adopters, and investors.',
};

// Mirrors MARKET_DOMAIN_LABELS in WorkPage.tsx — used to render the domain
// pill on a publicly-shared Sage Market Snapshot.
const MARKET_DOMAIN_LABELS: Record<string, string> = {
  agritech: 'Agritech', 'b2b-saas': 'B2B SaaS', cleantech: 'Cleantech',
  consumer: 'Consumer', devtools: 'Dev Tools', edtech: 'Edtech',
  fintech: 'Fintech', foodtech: 'Foodtech', healthtech: 'Healthtech',
  'hr-tech': 'HR Tech', legaltech: 'Legaltech', logistics: 'Logistics',
  marketplace: 'Marketplace', media: 'Media', proptech: 'Proptech',
};

// ── Literary Serif theme ────────────────────────────────────────────────────
// Warm, editorial visual treatment for the Community idea page — one of a set
// of style-direction mockups the founder picked from. Applies to page chrome,
// cards, and typography. Deliberately leaves the functional color-coding for
// post types, help types, contribution types, and pipeline stages
// (STAGE_COLORS) untouched, since those carry meaning beyond decoration.
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

const HELP_TYPES = [
  { key: 'talk',   emoji: '🗣️', label: 'Talk to me',  placeholder: 'e.g. Want to chat about my pricing model',    color: '#2563eb', bg: '#eff6ff' },
  { key: 'advise', emoji: '🧠', label: 'Advise me',   placeholder: 'e.g. Need advice on enterprise sales',         color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'intro',  emoji: '🤝', label: 'Intro me',    placeholder: 'e.g. Looking for ops or logistics advisors',    color: '#059669', bg: '#f0fdf4' },
  { key: 'share',  emoji: '📣', label: 'Share this',  placeholder: 'e.g. Could use help spreading the word',        color: '#d97706', bg: '#fffbeb' },
] as const;
type HelpType = typeof HELP_TYPES[number]['key'];

// ── Investigation / Typed Contribution ────────────────────────────────────────
const CONTRIB_TYPES = [
  { key: 'question',   icon: '🔍', label: 'Deeper question',      pts: '+42', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'  },
  { key: 'idea',       icon: '💡', label: 'Propose solution',      pts: '+28', color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'assumption', icon: '⚠️', label: 'Challenge assumption',  pts: '+31', color: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  { key: 'evidence',   icon: '📊', label: 'Add evidence',          pts: '+18', color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  { key: 'experience', icon: '🔄', label: 'Your experience',       pts: '+19', color: '#dc2626', bg: 'rgba(220,38,38,0.07)'   },
  { key: 'experiment', icon: '🧪', label: 'Suggest experiment',    pts: '+24', color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'impact',     icon: '🎯', label: 'Estimate impact',       pts: '+15', color: '#059669', bg: 'rgba(5,150,105,0.07)'   },
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

// ── Help request helpers ───────────────────────────────────────────────────────
function parseHelpRequests(communityAsk: string | null, stageFallback?: string): HelpRequest[] {
  const raw = communityAsk || stageFallback || null;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HelpRequest[];
  } catch { /* not JSON */ }
  // Legacy plain string → single "talk" request
  return [{ id: 'legacy-0', type: 'talk', text: raw, resolved: false }];
}

function serializeHelpRequests(reqs: HelpRequest[]): string {
  return JSON.stringify(reqs);
}

// Encode/parse [[ASK_REF:N]] in post content for ask-reply linking
function encodeAskRef(index: number, content: string): string {
  return `[[ASK_REF:${index}]]\n${content}`;
}
function parseAskRef(content: string): { askIndex: number; clean: string } | null {
  const m = content.match(/^\[\[ASK_REF:(\d+)\]\]\n?/);
  if (!m) return null;
  return { askIndex: parseInt(m[1], 10), clean: content.slice(m[0].length) };
}

// ── Animations ────────────────────────────────────────────────────────────────
function useAnimations() {
  useEffect(() => {
    const id = 'idea-detail-anim';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes popIn {
        0%   { transform: scale(.8); opacity: 0; }
        60%  { transform: scale(1.12); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: .5; }
      }
      .post-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07) !important; }
      .reaction-btn:hover { transform: scale(1.05); }
      .compose-type-btn:hover { opacity: 1 !important; }
    `;
    document.head.appendChild(s);
  }, []);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 5,
      background: color, color: '#fff',
      fontSize: size * 0.32, fontWeight: 800,
      fontFamily: LIT.headFont,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ── ComposeBox ────────────────────────────────────────────────────────────────
function ComposeBox({
  text, setText, postType, setPostType,
  onSubmit, posting, userInitials,
  helpRequests, selectedAsk, setSelectedAsk,
}: {
  text: string;
  setText: (v: string) => void;
  postType: string;
  setPostType: (v: string) => void;
  onSubmit: () => void;
  posting: boolean;
  userInitials: string;
  helpRequests?: HelpRequest[];
  selectedAsk: number | null;
  setSelectedAsk: (v: number | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const currentType = POST_TYPES.find(t => t.key === postType) ?? POST_TYPES[0];

  // Auto-resize
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 72)}px`;
  }, [text]);

  return (
    <div style={{
      background: LIT.card,
      border: `2px solid ${focused ? currentType.color : LIT.border}`,
      borderRadius: LIT.radius,
      transition: 'border-color .2s, box-shadow .2s',
      boxShadow: focused
        ? `0 0 0 4px ${currentType.color}14, 0 4px 20px rgba(70,50,15,.08)`
        : LIT.shadow,
      overflow: 'hidden',
    }}>
      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px 0' }}>
        <Avatar initials={userInitials} color={LIT.accent} size={34} />
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); }
          }}
          placeholder={TYPE_PLACEHOLDERS[postType] ?? 'Share your take…'}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            fontSize: 15, lineHeight: 1.7, fontFamily: 'inherit',
            color: '#111', background: 'transparent',
            minHeight: 72, overflow: 'hidden', padding: 0,
          }}
          rows={1}
        />
      </div>

      {/* Ask selector — only shown when open help requests exist */}
      {helpRequests && helpRequests.some(r => !r.resolved) && (
        <div style={{ padding: '0 18px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b0b0b8', flexShrink: 0 }}>Responding to:</span>
          <button
            onClick={() => setSelectedAsk(null)}
            style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${selectedAsk === null ? LIT.accent : '#e5e5ea'}`,
              background: selectedAsk === null ? LIT.accentSoft : '#fff',
              color: selectedAsk === null ? LIT.accent : '#b0b0b8',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            General
          </button>
          {helpRequests.map((req, idx) => {
            if (req.resolved) return null;
            const ht = HELP_TYPES.find(t => t.key === req.type) ?? HELP_TYPES[0];
            return (
              <button
                key={req.id}
                onClick={() => setSelectedAsk(idx)}
                title={req.text}
                style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1.5px solid ${selectedAsk === idx ? ht.color : '#e5e5ea'}`,
                  background: selectedAsk === idx ? ht.bg : '#fff',
                  color: selectedAsk === idx ? ht.color : '#b0b0b8',
                  cursor: 'pointer', fontFamily: 'inherit',
                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}
              >
                {ht.emoji} {req.text.length > 22 ? req.text.slice(0, 22) + '…' : req.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 14px',
        marginTop: 8,
        borderTop: `1px solid ${focused || text.trim() ? currentType.color + '18' : '#f5f5f7'}`,
        transition: 'border-color .2s',
      }}>
        {/* Type chips */}
        <div style={{ display: 'flex', gap: 4 }}>
          {POST_TYPES.map(t => {
            const sel = postType === t.key;
            return (
              <button
                key={t.key}
                className="compose-type-btn"
                onClick={() => setPostType(t.key)}
                title={t.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: sel ? '5px 12px' : '5px 10px',
                  borderRadius: 100,
                  border: `1.5px solid ${sel ? t.color : 'transparent'}`,
                  background: sel ? t.bg : 'transparent',
                  color: sel ? t.color : '#b0b0b8',
                  fontSize: 12, fontWeight: sel ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                  opacity: sel ? 1 : .7,
                }}
              >
                <span>{t.short}</span>
                {sel && <span>{t.label.split(' ').slice(1).join(' ')}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {text.length > 50 && (
            <span style={{
              fontSize: 11, fontWeight: 500,
              color: text.length > 580 ? '#dc2626' : '#b0b0b8',
            }}>
              {text.length}/600
            </span>
          )}
          {!text.trim() && (
            <span style={{ fontSize: 11, color: '#d2d2d7', fontWeight: 500 }}>⌘↵ to post</span>
          )}
          <button
            onClick={onSubmit}
            disabled={!text.trim() || posting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 12,
              border: 'none',
              background: text.trim() && !posting ? currentType.color : '#f0f0f0',
              color: text.trim() && !posting ? '#fff' : '#b0b0b8',
              fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default',
              transition: 'all .2s', fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {posting ? (
              <span style={{ animation: 'pulse 1s infinite' }}>Posting…</span>
            ) : 'Post →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({
  post, onReact, canEdit,
  isEditing, editPostDraft, setEditPostDraft,
  onStartEdit, onSaveEdit, onCancelEdit, editPostSaving,
  userInitials, helpRequests,
}: {
  post: Post;
  onReact: (id: string, type: 'encourage' | 'ask') => void;
  canEdit: boolean;
  isEditing: boolean;
  editPostDraft: string;
  setEditPostDraft: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editPostSaving: boolean;
  userInitials: string;
  helpRequests: HelpRequest[];
}) {
  const navigate = useNavigate();
  const pt = POST_TYPES.find(t => t.key === post.post_type) ?? POST_TYPES[0];
  const [hovered, setHovered] = useState(false);
  const askRef = parseAskRef(post.content);
  const displayContent = askRef ? askRef.clean : post.content;
  const linkedAsk = askRef && helpRequests[askRef.askIndex] ? helpRequests[askRef.askIndex] : null;
  const linkedHT = linkedAsk ? (HELP_TYPES.find(t => t.key === linkedAsk.type) ?? HELP_TYPES[0]) : null;
  const [showReplies, setShowReplies] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [postingReply, setPostingReply] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [contribType, setContribType] = useState<ContribKey>('question');
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const toggleReplies = async () => {
    const opening = !showReplies;
    setShowReplies(opening);
    if (opening && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await communityApi.getComments(post.id);
        setComments(res.data.comments ?? []);
      } catch { /* ignore */ }
      finally { setLoadingComments(false); }
    }
    if (opening) setTimeout(() => replyInputRef.current?.focus(), 150);
  };

  const submitReply = async () => {
    if (!replyText.trim() || postingReply) return;
    setPostingReply(true);
    try {
      const res = await communityApi.addComment(post.id, encodeContrib(contribType, replyText.trim()));
      setComments(prev => [...prev, res.data.comment]);
      setCommentCount(c => c + 1);
      setReplyText('');
    } catch { /* ignore */ }
    finally { setPostingReply(false); }
  };

  return (
    <div
      className="post-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 12,
        padding: '16px 18px',
        borderRadius: LIT.radius,
        background: LIT.card,
        border: `1.5px solid ${LIT.border}`,
        borderLeft: `4px solid ${pt.color}`,
        transition: 'box-shadow .2s',
        animation: 'fadeSlideIn .25s ease',
        position: 'relative',
      }}
    >
      <Avatar initials={post.author_initials} color={STAGE_COLORS[post.stage]} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
          <span
            onClick={() => navigate(`/community/member/${encodeURIComponent(post.author_name)}`)}
            style={{ fontFamily: LIT.headFont, fontWeight: 700, fontSize: 15, color: LIT.text, cursor: 'pointer' }}
          >{post.author_name}</span>
          <span style={{ fontSize: 11, color: LIT.muted, fontWeight: 500 }}>{timeAgo(post.created_at)}</span>
          <span style={{
            background: pt.bg, color: pt.color,
            borderRadius: 20, padding: '2px 9px',
            fontSize: 10, fontWeight: 800, letterSpacing: .4,
            flexShrink: 0,
          }}>{pt.label}</span>
          {linkedAsk && linkedHT && (
            <span style={{
              background: linkedHT.bg, color: linkedHT.color,
              borderRadius: 20, padding: '2px 9px', border: `1px solid ${linkedHT.color}30`,
              fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>
              ↩ {linkedHT.emoji} {linkedAsk.text.length > 28 ? linkedAsk.text.slice(0, 28) + '…' : linkedAsk.text}
            </span>
          )}
          {canEdit && !isEditing && hovered && (
            <button
              onClick={onStartEdit}
              style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 8,
                border: '1px solid #e5e5ea', background: '#fafafa',
                color: LIT.accent, cursor: 'pointer',
                animation: 'fadeSlideIn .15s ease',
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div>
            <textarea
              autoFocus
              value={editPostDraft}
              onChange={e => setEditPostDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
                if (e.key === 'Escape') onCancelEdit();
              }}
              rows={3}
              style={{
                width: '100%', fontSize: 14, lineHeight: 1.7,
                padding: '10px 14px', border: `2px solid ${pt.color}`,
                borderRadius: 12, outline: 'none', resize: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box' as const,
                background: pt.bg,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={onCancelEdit} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e5ea', background: '#fff', color: '#6e6e73', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={onSaveEdit}
                disabled={editPostSaving || !editPostDraft.trim()}
                style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: pt.color, color: '#fff', cursor: 'pointer', opacity: editPostSaving ? .6 : 1 }}
              >
                {editPostSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 15.5, fontFamily: LIT.bodyFont, lineHeight: 1.7, color: LIT.text, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
            {displayContent}
          </div>
        )}

        {/* Reactions */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            <button
              className="reaction-btn"
              onClick={() => onReact(post.id, 'encourage')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 100,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${post.user_reacted === 'encourage' ? '#16a34a' : '#e5e5ea'}`,
                background: post.user_reacted === 'encourage' ? '#f0fdf4' : '#fafafa',
                color: post.user_reacted === 'encourage' ? '#15803d' : '#6e6e73',
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              <span>👍</span>
              {post.encourage_count > 0 && (
                <span style={{ animation: 'popIn .2s ease' }}>{post.encourage_count}</span>
              )}
            </button>
            <button
              className="reaction-btn"
              onClick={() => onReact(post.id, 'ask')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 100,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${post.user_reacted === 'ask' ? '#2563eb' : '#e5e5ea'}`,
                background: post.user_reacted === 'ask' ? '#eff6ff' : '#fafafa',
                color: post.user_reacted === 'ask' ? '#1d4ed8' : '#6e6e73',
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              <span>🔍</span>
              {post.ask_count > 0 && (
                <span style={{ animation: 'popIn .2s ease' }}>{post.ask_count}</span>
              )}
            </button>
            {/* Reply thread toggle */}
            <button
              className="reaction-btn"
              onClick={toggleReplies}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 100,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${showReplies ? LIT.accent : '#e5e5ea'}`,
                background: showReplies ? LIT.accentSoft : '#fafafa',
                color: showReplies ? LIT.accent : '#6e6e73',
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              <span>💬</span>
              <span>{commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}` : 'Reply'}</span>
            </button>
          </div>
        )}

        {/* Investigation reply thread */}
        {showReplies && !isEditing && (
          <div style={{ marginTop: 14, paddingLeft: 14, borderLeft: '2px solid #ededf0' }}>
            {loadingComments && (
              <div style={{ fontSize: 12, color: '#b0b0b8', padding: '6px 0', animation: 'pulse 1.5s infinite' }}>
                Loading contributions…
              </div>
            )}
            {!loadingComments && comments.length === 0 && (
              <div style={{ fontSize: 12, color: '#c7c7cc', padding: '6px 0 10px', fontStyle: 'italic' }}>
                No contributions yet — pick a type below and add yours
              </div>
            )}

            {/* Typed contributions */}
            {comments.map(c => {
              const parsed = parseContrib(c.content);
              const ct = parsed.type ? CONTRIB_TYPES.find(t => t.key === parsed.type) : null;
              return (
                <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 14, animation: 'fadeSlideIn .15s ease' }}>
                  <Avatar initials={c.author_initials} color={ct ? ct.color : LIT.accent} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' as const }}>
                      <span
                        onClick={() => navigate(`/community/member/${encodeURIComponent(c.author_name)}`)}
                        style={{ fontSize: 12, fontWeight: 800, color: '#111', cursor: 'pointer' }}
                      >{c.author_name}</span>
                      {ct && (
                        <span style={{
                          background: ct.bg, color: ct.color,
                          borderRadius: 20, padding: '1px 8px',
                          fontSize: 10, fontWeight: 800,
                          border: `1px solid ${ct.color}30`,
                          flexShrink: 0,
                        }}>
                          {ct.icon} {ct.label}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: '#c7c7cc', fontWeight: 500 }}>{timeAgo(c.created_at)}</span>
                      {ct && <span style={{ fontSize: 10, color: ct.color, fontWeight: 700 }}>{ct.pts}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{parsed.text}</div>
                  </div>
                </div>
              );
            })}

            {/* Contribution palette */}
            <div style={{ marginTop: 10, padding: '14px', background: '#fafafa', borderRadius: 14, border: '1.5px solid #f0f0f0' }}>
              {/* Type selector chips */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                {CONTRIB_TYPES.map(ct => {
                  const sel = contribType === ct.key;
                  return (
                    <button
                      key={ct.key}
                      onClick={() => setContribType(ct.key)}
                      title={ct.label}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: sel ? '4px 10px' : '4px 8px',
                        borderRadius: 100,
                        border: `1.5px solid ${sel ? ct.color : 'transparent'}`,
                        background: sel ? ct.bg : 'transparent',
                        color: sel ? ct.color : '#b0b0b8',
                        fontSize: 11, fontWeight: sel ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all .15s',
                      }}
                    >
                      <span>{ct.icon}</span>
                      {sel && <span>{ct.label}</span>}
                      {sel && <span style={{ opacity: .65, fontSize: 10 }}>{ct.pts}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Textarea + submit */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Avatar initials={userInitials} color={LIT.accent} size={24} />
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitReply(); }
                  }}
                  placeholder={`${CONTRIB_TYPES.find(t => t.key === contribType)?.icon ?? ''} ${CONTRIB_TYPES.find(t => t.key === contribType)?.label ?? 'Add a contribution'}…`}
                  rows={2}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${(CONTRIB_TYPES.find(t => t.key === contribType)?.color ?? '#e5e5ea') + '50'}`,
                    borderRadius: 12, padding: '8px 12px', fontSize: 13,
                    outline: 'none', fontFamily: 'inherit', color: '#111',
                    background: '#fff', resize: 'none' as const,
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => {
                    const ct = CONTRIB_TYPES.find(t => t.key === contribType);
                    if (ct) e.currentTarget.style.borderColor = ct.color;
                  }}
                  onBlur={e => {
                    const ct = CONTRIB_TYPES.find(t => t.key === contribType);
                    e.currentTarget.style.borderColor = (ct?.color ?? '#e5e5ea') + '50';
                  }}
                />
                {replyText.trim() && (
                  <button
                    onClick={submitReply}
                    disabled={postingReply}
                    style={{
                      background: CONTRIB_TYPES.find(t => t.key === contribType)?.color ?? LIT.accent,
                      color: '#fff', border: 'none',
                      borderRadius: 10, padding: '8px 14px', fontSize: 13,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      flexShrink: 0, opacity: postingReply ? .6 : 1,
                      transition: 'opacity .15s',
                    }}
                  >
                    {postingReply ? '…' : '↩ Post'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Help Board ────────────────────────────────────────────────────────────────
function HelpBoard({
  helpRequests, isOwner, onUpdate, onOpenPM,
}: {
  helpRequests: HelpRequest[];
  isOwner: boolean;
  onUpdate: (reqs: HelpRequest[]) => void;
  onOpenPM: (initialMessage: string) => void;
}) {
  const [adding, setAdding]   = useState(false);
  const [newType, setNewType] = useState<HelpType>('talk');
  const [newText, setNewText] = useState('');
  const [saving, setSaving]   = useState(false);
  const [thankIdx, setThankIdx] = useState<number | null>(null);
  const [thankText, setThankText] = useState('');

  const htFor = (key: string) => HELP_TYPES.find(t => t.key === key) ?? HELP_TYPES[0];

  const addRequest = async () => {
    if (!newText.trim() || saving) return;
    setSaving(true);
    const newReq: HelpRequest = { id: `${Date.now()}`, type: newType, text: newText.trim(), resolved: false };
    onUpdate([...helpRequests, newReq]);
    setNewText(''); setAdding(false); setSaving(false);
  };

  const toggleResolve = (idx: number) => {
    const req = helpRequests[idx];
    if (!req.resolved) {
      // Prompt for thank-you before resolving
      setThankIdx(idx);
      setThankText('');
    } else {
      // Re-open without prompt
      onUpdate(helpRequests.map((r, i) => i === idx ? { ...r, resolved: false } : r));
    }
  };

  const confirmResolve = () => {
    if (thankIdx === null) return;
    onUpdate(helpRequests.map((r, i) => i === thankIdx ? { ...r, resolved: true } : r));
    setThankIdx(null);
  };

  const remove = (id: string) => onUpdate(helpRequests.filter(r => r.id !== id));

  const openItems     = helpRequests.filter(r => !r.resolved);
  const resolvedItems = helpRequests.filter(r => r.resolved);

  return (
    <div style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, overflow: 'hidden', marginBottom: 36, boxShadow: LIT.shadow }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LIT.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📌</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 2 }}>
            {isOwner ? 'Your help requests' : 'How you can help'}
          </div>
          <div style={{ fontSize: 13, color: LIT.secondary, fontFamily: LIT.bodyFont }}>
            {openItems.length === 0
              ? (isOwner ? 'No open asks — add one below' : 'No open asks right now')
              : `${openItems.length} open ask${openItems.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {isOwner && helpRequests.length < 3 && !adding && (
          <button
            onClick={() => setAdding(true)}
            style={{ background: LIT.cardTint, border: `1.5px solid ${LIT.border}`, borderRadius: 3, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: LIT.text, fontFamily: 'inherit' }}
          >
            + Add ask
          </button>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {helpRequests.length === 0 && !adding && (
          <div style={{ padding: '20px 0', textAlign: 'center' as const, color: LIT.muted, fontSize: 14, fontFamily: LIT.bodyFont, fontStyle: 'italic' }}>
            {isOwner ? 'Tell the community what kind of help you need.' : 'No specific asks yet.'}
          </div>
        )}

        {helpRequests.map((req, idx) => {
          const ht = htFor(req.type);
          return (
            <div key={req.id} style={{
              padding: '14px 16px', borderRadius: 3,
              background: req.resolved ? LIT.cardTint : ht.bg,
              border: `1.5px solid ${req.resolved ? LIT.border : ht.color + '35'}`,
              opacity: req.resolved ? .65 : 1,
              transition: 'all .2s',
              animation: 'fadeSlideIn .2s ease',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
                <span style={{
                  background: req.resolved ? LIT.border : '#fff',
                  border: `1.5px solid ${req.resolved ? LIT.border : ht.color + '50'}`,
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 11, fontWeight: 800, color: req.resolved ? LIT.muted : ht.color,
                  flexShrink: 0,
                }}>
                  {ht.emoji} {ht.label}
                </span>
                {req.resolved && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '2px 8px' }}>
                    ✓ Resolved
                  </span>
                )}

                {isOwner ? (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleResolve(idx)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, border: `1px solid ${req.resolved ? '#e5e5ea' : '#86efac'}`, background: req.resolved ? '#fff' : '#f0fdf4', color: req.resolved ? '#6e6e73' : '#059669', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {req.resolved ? '↩ Reopen' : '✓ Resolve'}
                    </button>
                    <button
                      onClick={() => remove(req.id)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  !req.resolved && (
                    <button
                      onClick={() => onOpenPM(
                        `Hi! I saw you're looking for someone to "${ht.label.toLowerCase()}" — "${req.text}". I think I can help with that!`
                      )}
                      style={{ marginLeft: 'auto', background: ht.color, color: '#fff', border: 'none', borderRadius: 10, padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                    >
                      I can help →
                    </button>
                  )
                )}
              </div>

              <div style={{ fontSize: 13, color: req.resolved ? '#b0b0b8' : '#222', lineHeight: 1.65 }}>
                {req.text}
              </div>

              {/* Thank-you prompt for this item */}
              {thankIdx === idx && (
                <div style={{ marginTop: 12, padding: '12px', background: '#fff', border: '1.5px solid #86efac', borderRadius: 12, animation: 'fadeSlideIn .15s ease' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
                    🎉 Mark as resolved — say thanks?
                  </div>
                  <textarea
                    value={thankText}
                    onChange={e => setThankText(e.target.value)}
                    placeholder="Optional: post a thank-you to the thread…"
                    rows={2}
                    style={{ width: '100%', fontSize: 12, padding: '8px 12px', border: '1.5px solid #e5e5ea', borderRadius: 10, outline: 'none', resize: 'none' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setThankIdx(null)} style={{ flex: 1, padding: '7px', border: '1px solid #e5e5ea', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#6e6e73', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={confirmResolve} style={{ flex: 2, padding: '7px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#059669', color: '#fff', fontFamily: 'inherit' }}>
                      {thankText.trim() ? 'Resolve + post thanks' : 'Resolve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add form */}
        {adding && (
          <div style={{ padding: '16px', background: '#fafafa', border: '1.5px dashed #e5e5ea', borderRadius: 14, animation: 'fadeSlideIn .15s ease' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0b0b8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Type of help</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const }}>
              {HELP_TYPES.map(ht => (
                <button
                  key={ht.key}
                  onClick={() => setNewType(ht.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${newType === ht.key ? ht.color : '#e5e5ea'}`,
                    background: newType === ht.key ? ht.bg : '#fff',
                    color: newType === ht.key ? ht.color : '#6e6e73',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {ht.emoji} {ht.label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRequest(); if (e.key === 'Escape') { setAdding(false); setNewText(''); } }}
              placeholder={htFor(newType).placeholder + '…'}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e5ea', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 12, color: '#111' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setAdding(false); setNewText(''); }} style={{ flex: 1, padding: '9px', border: '1px solid #e5e5ea', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#6e6e73', fontFamily: 'inherit' }}>Cancel</button>
              <button
                onClick={addRequest}
                disabled={!newText.trim() || saving}
                style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: newText.trim() ? 'pointer' : 'default', background: newText.trim() ? htFor(newType).color : '#f0f0f0', color: newText.trim() ? '#fff' : '#b0b0b8', fontFamily: 'inherit' }}
              >
                {saving ? 'Saving…' : 'Add ask'}
              </button>
            </div>
          </div>
        )}

        {resolvedItems.length > 0 && openItems.length > 0 && (
          <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
        )}
      </div>
    </div>
  );
}

// ── PM Modal ──────────────────────────────────────────────────────────────────
function PMModal({
  idea, onClose, currentUserId, initialMessage = '',
}: {
  idea: IdeaDetail;
  onClose: () => void;
  currentUserId: string;
  initialMessage?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [convId, setConvId]     = useState<string | null>(null);
  const [text, setText]         = useState(initialMessage);
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [focused, setFocused]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stageColor = STAGE_COLORS[idea.stage];

  useEffect(() => {
    communityApi.getOrCreateConversation(idea.user_id, idea.id)
      .then(res => { setConvId(res.data.conversation_id); setMessages(res.data.messages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [idea.id, idea.user_id]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 44)}px`;
  }, [text]);

  const send = async () => {
    if (!text.trim() || !convId) return;
    setSending(true);
    try {
      const res = await communityApi.sendMessage(convId, text.trim());
      setMessages(prev => [...prev, res.data.message]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } finally { setSending(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 520, maxHeight: '82vh',
        background: '#fff', borderRadius: 28,
        boxShadow: '0 32px 80px rgba(0,0,0,.25)',
        zIndex: 301, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'fadeSlideIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f5f5f7', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: stageColor, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {idea.author_initials}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>{idea.author_name}</div>
            <div style={{ fontSize: 11, color: '#b0b0b8', marginTop: 1 }}>Re: {idea.name}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6e6e73', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, background: '#fafafa' }}>
          {loading && <div style={{ textAlign: 'center', color: '#b0b0b8', padding: 24, fontSize: 13, animation: 'pulse 1.5s infinite' }}>Loading conversation…</div>}
          {!loading && messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#b0b0b8', padding: '40px 20px', fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
              <div style={{ fontWeight: 600, color: '#3a3a3c', marginBottom: 4 }}>Start a conversation</div>
              <div>Ask about their progress, offer help, or explore collaboration.</div>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', animation: 'fadeSlideIn .15s ease' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? LIT.accent : stageColor, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {msg.sender_initials}
                </div>
                <div style={{
                  maxWidth: '74%', padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe ? '#111' : '#fff',
                  color: isMe ? '#fff' : '#111',
                  fontSize: 13, lineHeight: 1.6,
                  boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                }}>
                  {msg.content}
                  <div style={{ fontSize: 10, opacity: .5, marginTop: 5, textAlign: isMe ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #f5f5f7', background: '#fff' }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            border: `2px solid ${focused ? LIT.accent : '#e5e5ea'}`,
            borderRadius: 16, padding: '10px 14px',
            transition: 'border-color .2s',
            boxShadow: focused ? '0 0 0 3px rgba(99,102,241,.1)' : 'none',
          }}>
            <textarea
              ref={taRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
              placeholder="Type a message…"
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontSize: 14, lineHeight: 1.55, fontFamily: 'inherit',
                color: '#111', background: 'transparent',
                minHeight: 24, overflow: 'hidden',
              }}
              rows={1}
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              style={{
                background: text.trim() && !sending ? '#111' : '#f0f0f0',
                color: text.trim() && !sending ? '#fff' : '#b0b0b8',
                border: 'none', borderRadius: 10, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default',
                transition: 'all .15s', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {sending ? '…' : 'Send →'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#c7c7cc', marginTop: 6, paddingLeft: 2 }}>⌘↵ to send</div>
        </div>
      </div>
    </>
  );
}

// ── Stage Tracker ─────────────────────────────────────────────────────────────
function StageTracker({ currentStage }: { currentStage: Stage }) {
  const idx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      {STAGE_ORDER.map((s, i) => {
        const past   = i < idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STAGE_ORDER.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: active ? 12 : 9, height: active ? 12 : 9, borderRadius: '50%',
                background: active || past ? STAGE_COLORS[s] : LIT.card,
                border: `2px solid ${active || past ? STAGE_COLORS[s] : LIT.border}`,
                boxShadow: active ? `0 0 0 3px ${STAGE_COLORS[s]}22` : 'none',
                transition: 'all .15s',
              }} />
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' as const,
                color: active ? STAGE_COLORS[s] : past ? LIT.secondary : LIT.muted,
                opacity: active || past ? 1 : .6, whiteSpace: 'nowrap' as const,
              }}>
                {STAGE_LABELS[s]}
              </div>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div style={{ flex: 1, height: 1, background: past ? STAGE_COLORS[s] + '55' : LIT.border, marginTop: -16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const isMobile = useIsMobile();
  useAnimations();

  const [idea, setIdea]           = useState<IdeaDetail | null>(null);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [text, setText]           = useState('');
  const [postType, setPostType]   = useState('win');
  const [posting, setPosting]     = useState(false);
  const [showPM, setShowPM]           = useState(false);
  const [showCanvas, setShowCanvas]   = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [bookmarked, setBookmarked]   = useState(false);
  const [following, setFollowing]     = useState(false);
  const [networkOffers, setNetworkOffers] = useState<NetworkOffer[]>([]);
  const [networkOfferCount, setNetworkOfferCount] = useState(0);
  const [editingPostId, setEditingPostId]   = useState<string | null>(null);
  const [deckLoading, setDeckLoading]       = useState(false);
  const [editPostDraft, setEditPostDraft]   = useState('');
  const [editPostSaving, setEditPostSaving] = useState(false);
  const [helpRequests, setHelpRequests]     = useState<HelpRequest[]>([]);
  const [selectedAsk, setSelectedAsk]       = useState<number | null>(null);
  const [pmInitialMessage, setPmInitialMessage] = useState('');
  const [activeView, setActiveView]       = useState<'community' | 'validation'>('community');
  const [interviews, setInterviews]       = useState<any[]>([]);
  const [ivLoading, setIvLoading]         = useState(false);
  const [canvasPreview, setCanvasPreview] = useState<Record<string, string> | null>(null);
  // Sections the founder has explicitly opted into showing publicly (see the
  // Privacy panel and the "Public" toggles across the work wizard — Idea,
  // Hone, and Shape stages so far). Each field is null unless its owner has
  // consented — the backend enforces this, this is just what it hands back.
  // The Business Model Canvas section is the one exception: it's still
  // fetched through /canvas (canvasPreview above), which now applies the
  // same consent check server-side rather than duplicating that data here.
  const [publicSections, setPublicSections] = useState<{
    oneLiner: string | null;
    marketSnapshot: { domain: string; tam: { value: string; basis: string }; sam: { value: string; basis: string }; competitors: { name: string; note: string }[] } | null;
    honeSummary: { problem: string | null; customer: string | null } | null;
    shapeSummary: { mvpHypothesis: string | null; features: string[] } | null;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchIdea = async () => {
    try {
      const res = await communityApi.getIdea(id!);
      const ideaData: IdeaDetail = res.data.idea;
      setIdea(ideaData);
      setBookmarked(ideaData.is_bookmarked);
      setFollowing(ideaData.is_following);
      setHelpRequests(parseHelpRequests(ideaData.community_ask, COMMUNITY_ASK_DEFAULTS[ideaData.stage]));
    } catch { setError('Could not load idea.'); }
  };

  const saveHelpRequests = async (reqs: HelpRequest[]) => {
    if (!idea) return;
    setHelpRequests(reqs);
    try {
      await ideasApi.update(idea.id, { community_ask: serializeHelpRequests(reqs) });
    } catch { /* silently ignore — state already updated optimistically */ }
  };

  const fetchPosts = async () => {
    try {
      const res = await communityApi.getIdeaPosts(id!);
      setPosts(res.data.posts);
    } catch { /* ignore */ }
  };

  const fetchNetworkOffers = async (ideaId: string) => {
    try {
      const res = await communityApi.getNetworkOffers(ideaId);
      if (res.data.is_owner) {
        setNetworkOffers(res.data.offers ?? []);
        setNetworkOfferCount(res.data.offers?.length ?? 0);
      } else {
        setNetworkOfferCount(res.data.count ?? 0);
      }
    } catch { /* ignore */ }
  };

  const fetchInterviews = async (ideaId: string) => {
    setIvLoading(true);
    try {
      const res = await interviewsApi.list(ideaId);
      // Backend returns the interviews as a plain array, not { interviews: [...] }.
      setInterviews(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
    finally { setIvLoading(false); }
  };

  // Every section the founder may have opted into showing publicly — one-liner,
  // Sage Market Snapshot, Hone problem/customer, Shape hypothesis/features (all
  // via /public-sections), and the Business Model Canvas preview (via /canvas,
  // which applies its own consent check). Fetched for every visitor, but each
  // piece only comes back non-null if its section's toggle is actually on.
  const fetchPublicSummary = async (ideaId: string) => {
    try {
      const res = await communityApi.getIdeaCanvas(ideaId);
      setCanvasPreview(res.data.blocks ?? null);
    } catch { /* ignore */ }
    try {
      const res = await communityApi.getPublicSections(ideaId);
      setPublicSections(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchIdea(), fetchPosts()]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (idea) fetchNetworkOffers(idea.id);
  }, [idea?.id]);

  useEffect(() => {
    if (idea) fetchPublicSummary(idea.id);
  }, [idea?.id]);

  const submit = async () => {
    if (!text.trim() || !idea) return;
    setPosting(true);
    try {
      let content = text.trim();
      if (selectedAsk !== null) content = encodeAskRef(selectedAsk, content);
      await communityApi.addIdeaPost(idea.id, { content, post_type: postType });
      setText('');
      setSelectedAsk(null);
      await fetchPosts();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally { setPosting(false); }
  };

  const startEditPost = (post: Post) => { setEditingPostId(post.id); setEditPostDraft(post.content); };
  const cancelEditPost = () => { setEditingPostId(null); setEditPostDraft(''); };

  const saveEditPost = async () => {
    if (!editingPostId || !editPostDraft.trim() || editPostSaving) return;
    setEditPostSaving(true);
    try {
      const r = await communityApi.editPost(editingPostId, editPostDraft.trim());
      setPosts(prev => prev.map(p => p.id === editingPostId ? { ...p, content: r.data.post.content } : p));
      cancelEditPost();
    } catch { /* leave open */ }
    finally { setEditPostSaving(false); }
  };

  const react = async (postId: string, type: 'encourage' | 'ask') => {
    await communityApi.reactToPost(postId, type);
    fetchPosts();
  };

  const toggleBookmark = async () => {
    if (!idea) return;
    const res = await communityApi.bookmarkIdea(idea.id);
    setBookmarked(res.data.bookmarked);
  };

  const toggleFollow = async () => {
    if (!idea) return;
    const res = await communityApi.followIdea(idea.id);
    setFollowing(res.data.following);
  };

  if (loading) {
    return (
      <div style={{ background: LIT.pageBg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${LIT.border}`, borderTopColor: LIT.accent, animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 14, fontFamily: LIT.bodyFont, color: LIT.muted }}>Loading idea…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div style={{ background: LIT.pageBg, minHeight: '100vh', fontFamily: LIT.bodyFont }}>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 80, textAlign: 'center', color: LIT.muted, padding: '80px 24px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontFamily: LIT.headFont, fontSize: 18, fontWeight: 700, color: LIT.text, marginBottom: 6 }}>{error || 'Idea not found'}</div>
        <div style={{ fontSize: 15, marginBottom: 24 }}>It may have been removed or the link is invalid.</div>
        <button onClick={() => navigate('/community')} style={{ background: LIT.accent, color: '#fff', border: 'none', borderRadius: 3, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Back to Community</button>
      </div>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[idea.stage];
  const communityAsk = idea.community_ask || COMMUNITY_ASK_DEFAULTS[idea.stage];
  const isOwnIdea = idea.user_id === user?.id;
  const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;

  return (
    <div style={{ background: LIT.pageBg, minHeight: '100vh', fontFamily: LIT.bodyFont }}>
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '28px 40px 80px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' as const }}>
        <button
          onClick={() => navigate('/community')}
          style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: LIT.text, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Community
        </button>
        <div style={{ background: idea.idea_status === 'done' ? '#dcfce7' : `${stageColor}15`, color: idea.idea_status === 'done' ? '#16a34a' : stageColor, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
          {idea.idea_status === 'done' ? '🚀 Shipped' : STAGE_LABELS[idea.stage]}
        </div>
        {idea.business_domain && (
          <div style={{ background: LIT.card, color: LIT.secondary, border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' as const }}>
            {idea.business_domain}
          </div>
        )}
        {isOwnIdea && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <button onClick={() => navigate(`/community/${idea.id}/scratchpad`)} style={{ background: LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: 3, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: LIT.text }}>
              ✏️ Scratchpad
            </button>
            <button onClick={() => { setActiveView('validation'); fetchInterviews(idea.id); }} style={{ background: activeView === 'validation' ? LIT.text : LIT.card, border: `1.5px solid ${LIT.border}`, borderRadius: 3, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: activeView === 'validation' ? '#fff' : LIT.text }}>
              🧪 Validation
            </button>
            <button
              onClick={async () => {
                if (deckLoading) return;
                setDeckLoading(true);
                try {
                  const res = await pitchDeckApi.download(idea.id);
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `${idea.name.replace(/[^a-z0-9]/gi, '_')}_pitch_deck.pptx`;
                  a.click(); URL.revokeObjectURL(url);
                } catch { alert('Could not generate pitch deck.'); }
                finally { setDeckLoading(false); }
              }}
              style={{ background: deckLoading ? LIT.card : LIT.accent, border: 'none', borderRadius: 3, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: deckLoading ? 'default' : 'pointer', color: deckLoading ? LIT.muted : '#fff', opacity: deckLoading ? .7 : 1 }}
            >
              {deckLoading ? '⏳ Generating…' : '📊 Pitch Deck'}
            </button>
          </div>
        )}
      </div>

      {/* Tab bar — only show for own idea */}
      {isOwnIdea && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1.5px solid #e5e5ea', paddingBottom: 0 }}>
          {[
            { key: 'community', label: '🏆 Community' },
            { key: 'validation', label: '🧪 Validation' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveView(tab.key as 'community' | 'validation');
                if (tab.key === 'validation' && idea) fetchInterviews(idea.id);
              }}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: activeView === tab.key ? 700 : 500,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                color: activeView === tab.key ? '#1d1d1f' : '#6e6e73',
                borderBottom: activeView === tab.key ? '2px solid #1d1d1f' : '2px solid transparent',
                marginBottom: -1.5, transition: 'all .15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Validation panel */}
      {activeView === 'validation' && isOwnIdea && (() => {
        const confirmed    = interviews.filter(iv => iv.alignment_score === 3);
        const partial      = interviews.filter(iv => iv.alignment_score === 2);
        const notConfirmed = interviews.filter(iv => iv.alignment_score === 1);
        const total        = interviews.length;
        const alignCfg = (score: number | null) =>
          score === 3 ? { label: 'Confirmed ✅',      color: '#059669', bg: '#f0fdf4', border: '#86efac' }
          : score === 2 ? { label: 'Partial ◐',       color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
          : score === 1 ? { label: 'Not confirmed ❌', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
          :               { label: 'Pending',           color: '#b0b0b8', bg: '#f5f5f7', border: '#e5e5ea' };

        if (ivLoading) return (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#b0b0b8', fontSize: 14 }}>Loading interviews…</div>
        );

        if (total === 0) return (
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d1d1f', marginBottom: 8 }}>No interviews logged yet</div>
            <div style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 24 }}>
              Interview logs from your validation stage will appear here. Each conversation you record builds your evidence base.
            </div>
            <button
              onClick={() => navigate('/work')}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#1d1d1f', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Go to validation →
            </button>
          </div>
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Interviewed',    value: total,              color: '#1d1d1f', bg: '#f5f5f7' },
                { label: 'Confirmed',      value: confirmed.length,   color: '#059669', bg: '#f0fdf4' },
                { label: 'Partial signal', value: partial.length,     color: '#d97706', bg: '#fffbeb' },
                { label: 'Not confirmed',  value: notConfirmed.length, color: '#dc2626', bg: '#fef2f2' },
              ].map(k => (
                <div key={k.label} style={{ padding: '16px 18px', borderRadius: 14, background: k.bg, border: `1.5px solid ${k.color}20` }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: k.color, marginTop: 5, fontWeight: 600 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Alignment bar */}
            {total > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b0b0b8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Signal distribution</div>
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 12 }}>
                  {confirmed.length    > 0 && <div style={{ flex: confirmed.length,    background: '#059669' }} title={`${confirmed.length} confirmed`} />}
                  {partial.length      > 0 && <div style={{ flex: partial.length,      background: '#d97706' }} title={`${partial.length} partial`} />}
                  {notConfirmed.length > 0 && <div style={{ flex: notConfirmed.length, background: '#dc2626' }} title={`${notConfirmed.length} not confirmed`} />}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {[
                    { label: 'Confirmed',      count: confirmed.length,    color: '#059669' },
                    { label: 'Partial',        count: partial.length,      color: '#d97706' },
                    { label: 'Not confirmed',  count: notConfirmed.length, color: '#dc2626' },
                  ].filter(l => l.count > 0).map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6e6e73' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                      {l.label} ({l.count})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3a3c' }}>All conversations</div>
              {interviews.map((iv, i) => {
                const cfg = alignCfg(iv.alignment_score);
                // Extract signals from key_insights: lines like "[Signal1, Signal2] quote"
                const sigMatches = (iv.key_insights || '').match(/\[([^\]]+)\]/g) || [];
                const signals = [...new Set(sigMatches.flatMap((m: string) => m.slice(1,-1).split(',').map((s: string) => s.trim())))];
                // Extract quotes: lines starting with " or after ]
                const quotes = (iv.key_insights || '').split('\n').filter((l: string) => {
                  const after = l.replace(/^\s*\[[^\]]*\]\s*/, '').trim();
                  return after.length > 3 && !l.startsWith('Q');
                }).slice(0, 2);

                return (
                  <div key={iv.id} style={{ background: '#fff', border: `1.5px solid ${cfg.border}`, borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                        {(iv.interviewee_name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{iv.interviewee_name || 'Unknown'}</div>
                          {iv.interviewee_role && <div style={{ fontSize: 12, color: '#6e6e73' }}>{iv.interviewee_role}</div>}
                          <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700 }}>
                            {cfg.label}
                          </div>
                        </div>

                        {/* Signal chips */}
                        {signals.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                            {signals.map((sig: string) => (
                              <span key={sig} style={{ padding: '2px 8px', borderRadius: 12, background: '#f5f5f7', border: '1px solid #e5e5ea', fontSize: 11, color: '#6e6e73', fontWeight: 600 }}>
                                {sig}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Key quotes */}
                        {quotes.length > 0 && (
                          <div style={{ borderLeft: '3px solid #e5e5ea', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {quotes.map((q: string, qi: number) => (
                              <div key={qi} style={{ fontSize: 12, color: '#3a3a3c', fontStyle: 'italic', lineHeight: 1.5 }}>"{q.trim()}"</div>
                            ))}
                          </div>
                        )}

                        {/* Full insights toggle */}
                        {iv.key_insights && !quotes.length && (
                          <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.6, marginTop: 4 }}>
                            {iv.key_insights.slice(0, 200)}{iv.key_insights.length > 200 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div style={{ padding: '20px', borderRadius: 14, background: '#f5f5f7', border: '1.5px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>Continue your validation</div>
                <div style={{ fontSize: 12, color: '#6e6e73' }}>Log more conversations, view your summary dashboard, or start your survey.</div>
              </div>
              <button onClick={() => navigate('/work')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d1d1f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Open workbook →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Two-column layout — community view */}
      {(activeView === 'community' || !isOwnIdea) && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: isMobile ? 24 : 48, alignItems: 'start' }}>

        {/* ── LEFT ─────────────────────────────────────────────────────────── */}
        <div>
          {/* Author + meta */}
          <div
            onClick={() => navigate(`/community/member/${encodeURIComponent(idea.author_name)}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, cursor: 'pointer' }}
            title={`View ${idea.author_name}'s ideas & contributions`}
          >
            <Avatar initials={idea.author_initials} color={stageColor} size={46} />
            <div>
              <div style={{ fontFamily: LIT.headFont, fontWeight: 700, fontSize: 17, color: LIT.text }}>{idea.author_name}</div>
              <div style={{ fontSize: 13, color: LIT.muted, marginTop: 2 }}>Posted {timeAgo(idea.created_at)}</div>
            </div>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: -.4, lineHeight: 1.12, margin: '0 0 14px', color: LIT.text, fontFamily: LIT.headFont }}>
            {idea.name}
          </h1>

          {/* Description */}
          {idea.description && (
            <p style={{ fontSize: 18, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.7, margin: '0 0 28px', fontWeight: 500 }}>
              {idea.description}
            </p>
          )}

          {/* What they're building — Hone's problem/customer and Shape's
              hypothesis/features, each only shown once its own section has
              been opted into public view (Privacy panel in the work wizard).
              These used to be one always-public block; now each half is
              independently gated, so the whole block only appears once at
              least one of them is on. */}
          {publicSections && (publicSections.honeSummary || publicSections.shapeSummary) && (
            <div style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '24px 26px', marginBottom: 28, boxShadow: LIT.shadow }}>
              <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 16 }}>What they're building</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {publicSections.honeSummary?.problem && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stageColor, marginBottom: 4 }}>Problem</div>
                    <div style={{ fontSize: 15, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.6 }}>{publicSections.honeSummary.problem}</div>
                  </div>
                )}
                {publicSections.honeSummary?.customer && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stageColor, marginBottom: 4 }}>Who it's for</div>
                    <div style={{ fontSize: 15, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.6 }}>{publicSections.honeSummary.customer}</div>
                  </div>
                )}
                {publicSections.shapeSummary?.mvpHypothesis && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stageColor, marginBottom: 4 }}>The hypothesis</div>
                    <div style={{ fontSize: 15, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.6 }}>{publicSections.shapeSummary.mvpHypothesis}</div>
                  </div>
                )}
                {publicSections.shapeSummary && publicSections.shapeSummary.features.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stageColor, marginBottom: 8 }}>Key features</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                      {publicSections.shapeSummary.features.map((f, i) => (
                        <span key={i} style={{ fontSize: 13, fontWeight: 600, color: LIT.text, background: LIT.cardTint, border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '5px 12px' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Their one-liner — only rendered when the founder has explicitly
              toggled it public from the work wizard; consent is enforced
              server-side, this just reflects what came back. */}
          {publicSections?.oneLiner && (
            <div style={{ background: '#fdfdfb', border: '1px solid #d7dbe0', borderRadius: 6, padding: '24px 28px', marginBottom: 28, boxShadow: '0 1px 0 #fff inset, 0 3px 12px rgba(30,40,55,.06)' }}>
              <div style={{ fontFamily: "'Kalam', cursive", fontSize: 13, fontWeight: 700, color: '#5c6b7a', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12, transform: 'rotate(-0.8deg)' }}>Their one-liner</div>
              <div style={{ fontSize: 23, lineHeight: 1.55, color: '#1f3a5f', fontFamily: "'Kalam', cursive", fontWeight: 400, transform: 'rotate(-0.3deg)' }}>{publicSections.oneLiner}</div>
            </div>
          )}

          {/* Sage Market Snapshot — same opt-in gating as the one-liner above.
              Read-only mirror of the founder's own panel in the work wizard. */}
          {publicSections?.marketSnapshot && (
            <div style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '24px 26px', marginBottom: 28, boxShadow: LIT.shadow }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: stageColor, background: `${stageColor}12`, border: `1.5px solid ${stageColor}30`, borderRadius: 20, padding: '3px 10px' }}>
                  {MARKET_DOMAIN_LABELS[publicSections.marketSnapshot.domain] ?? publicSections.marketSnapshot.domain}
                </span>
                {/* Waterfall bridge — TAM narrowing down to SAM. The SAM bar's
                    height is an illustrative "narrows to a serviceable slice"
                    motif, not a computed ratio (tam/sam values are free-text
                    strings like "$4.2B" or "500K businesses" and aren't safe
                    to parse into a real proportion). */}
                <div style={{ borderRadius: 3, padding: '30px 40px', background: LIT.cardTint, border: `1px solid ${LIT.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 190, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <div style={{ width: 84, height: '100%', background: LIT.accentSoft, border: `1.5px solid ${LIT.accentSoftBorder}`, borderRadius: 4 }} />
                      <div style={{ marginTop: 8, fontSize: 18, textAlign: 'center' as const, fontFamily: LIT.headFont, fontWeight: 700, color: LIT.text }}>
                        {publicSections.marketSnapshot.tam.value || '—'}
                        <span style={{ display: 'block', fontSize: 13, color: LIT.muted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, fontFamily: LIT.bodyFont, marginTop: 1 }}>TAM</span>
                      </div>
                    </div>
                    <div style={{ alignSelf: 'center', color: LIT.muted, fontSize: 18, marginBottom: 40 }}>→</div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <div style={{ width: 84, height: '52%', background: LIT.accent, border: `1.5px solid ${LIT.accent}`, borderRadius: 4 }} />
                      <div style={{ marginTop: 8, fontSize: 18, textAlign: 'center' as const, fontFamily: LIT.headFont, fontWeight: 700, color: LIT.text }}>
                        {publicSections.marketSnapshot.sam.value || '—'}
                        <span style={{ display: 'block', fontSize: 13, color: LIT.accent, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, fontFamily: LIT.bodyFont, marginTop: 1 }}>SAM</span>
                      </div>
                    </div>
                  </div>
                  {(publicSections.marketSnapshot.tam.basis || publicSections.marketSnapshot.sam.basis) && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9, fontSize: 16, color: LIT.secondary, lineHeight: 1.6, marginTop: 56, borderTop: `1px solid ${LIT.border}`, paddingTop: 39 }}>
                      {publicSections.marketSnapshot.tam.basis && <div><span style={{ fontWeight: 800, color: LIT.text }}>TAM</span> — {publicSections.marketSnapshot.tam.basis}</div>}
                      {publicSections.marketSnapshot.sam.basis && <div><span style={{ fontWeight: 800, color: LIT.accent }}>SAM</span> — {publicSections.marketSnapshot.sam.basis}</div>}
                    </div>
                  )}
                </div>
                {publicSections.marketSnapshot.competitors.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: LIT.secondary, textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 10, fontFamily: LIT.headFont }}>Peers / Competitors</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {publicSections.marketSnapshot.competitors.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', border: `1px solid ${LIT.border}`, borderRadius: 3, padding: '9px 11px' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 4, background: LIT.accentSoft, color: LIT.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, fontFamily: LIT.headFont }}>
                            {c.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: LIT.text, marginBottom: 3 }}>{c.name}</div>
                            <div style={{ fontSize: 13, color: LIT.secondary, lineHeight: 1.5 }}>{c.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Board */}
          <HelpBoard
            helpRequests={helpRequests}
            isOwner={isOwnIdea}
            onUpdate={saveHelpRequests}
            onOpenPM={(msg) => { setPmInitialMessage(msg); setShowPM(true); }}
          />

          {/* Thread header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ fontFamily: LIT.headFont, fontSize: 17, fontWeight: 700, color: LIT.text }}>Thread</div>
            <div style={{ background: LIT.cardTint, border: `1px solid ${LIT.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: LIT.secondary }}>
              {idea.post_count} {idea.post_count === 1 ? 'response' : 'responses'}
            </div>
            <div style={{ flex: 1, height: 1, background: LIT.border }} />
          </div>

          {/* Posts — type-coded timeline: a colored dot per post (matching its
              Win/Question/Feedback/Update badge color) on a connecting rail,
              so the type of every response is readable at a glance without
              breaking chronological order. */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
            {posts.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '52px 24px',
                background: LIT.cardTint, borderRadius: LIT.radius,
                border: `1.5px dashed ${LIT.border}`,
              }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>💬</div>
                <div style={{ fontFamily: LIT.headFont, fontSize: 17, fontWeight: 700, color: LIT.text, marginBottom: 6 }}>No responses yet</div>
                <div style={{ fontSize: 14, color: LIT.muted, fontFamily: LIT.bodyFont, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                  Be the first to weigh in. Your feedback could be exactly what this founder needs.
                </div>
              </div>
            )}
            {posts.map((post, i) => {
              const isMine = post.user_id === user?.id;
              const canEdit = isMine && post.id === lastPostId;
              const ptColor = POST_TYPES.find(t => t.key === post.post_type)?.color ?? LIT.accent;
              const isLast = i === posts.length - 1;
              return (
                <div key={post.id} style={{ display: 'flex', gap: 14 }}>
                  {/* Timeline rail */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0, paddingTop: 22 }}>
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: ptColor, boxShadow: `0 0 0 3px ${LIT.pageBg}, 0 0 0 4.5px ${ptColor}55`, flexShrink: 0 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: LIT.border, marginTop: 6, minHeight: 24 }} />}
                  </div>
                  {/* Post card */}
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 20 }}>
                    <PostCard
                      post={post}
                      onReact={react}
                      canEdit={canEdit}
                      isEditing={editingPostId === post.id}
                      editPostDraft={editPostDraft}
                      setEditPostDraft={setEditPostDraft}
                      onStartEdit={() => startEditPost(post)}
                      onSaveEdit={saveEditPost}
                      onCancelEdit={cancelEditPost}
                      editPostSaving={editPostSaving}
                      userInitials={user?.avatar_initials ?? '?'}
                      helpRequests={helpRequests}
                    />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div>
            <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 12 }}>
              Add your take
            </div>
            <ComposeBox
              text={text}
              setText={setText}
              postType={postType}
              setPostType={setPostType}
              onSubmit={submit}
              posting={posting}
              userInitials={user?.avatar_initials ?? '?'}
              helpRequests={helpRequests}
              selectedAsk={selectedAsk}
              setSelectedAsk={setSelectedAsk}
            />
          </div>
        </div>

        {/* ── RIGHT sidebar ─────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Founder card */}
          <div style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '22px 24px', boxShadow: LIT.shadow }}>
            <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 16 }}>Founder</div>
            <div
              onClick={() => navigate(`/community/member/${encodeURIComponent(idea.author_name)}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, cursor: 'pointer' }}
              title={`View ${idea.author_name}'s ideas & contributions`}
            >
              <Avatar initials={idea.author_initials} color={stageColor} size={50} />
              <div>
                <div style={{ fontFamily: LIT.headFont, fontWeight: 700, fontSize: 17, color: LIT.text }}>{idea.author_name}</div>
                <div style={{ fontSize: 13, color: LIT.muted, marginTop: 2 }}>MVP Club member</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 0, marginBottom: 18, background: LIT.cardTint, borderRadius: 3, overflow: 'hidden', border: `1px solid ${LIT.border}` }}>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center' as const, borderRight: `1px solid ${LIT.border}` }}>
                <div style={{ fontFamily: LIT.headFont, fontSize: 19, fontWeight: 700, color: LIT.text }}>{idea.follow_count}</div>
                <div style={{ fontSize: 10.5, color: LIT.muted, fontWeight: 600, marginTop: 1, letterSpacing: .5 }}>FOLLOWERS</div>
              </div>
              <div style={{ flex: 1, padding: '12px', textAlign: 'center' as const }}>
                <div style={{ fontFamily: LIT.headFont, fontSize: 19, fontWeight: 700, color: LIT.text }}>{idea.bookmark_count}</div>
                <div style={{ fontSize: 10.5, color: LIT.muted, fontWeight: 600, marginTop: 1, letterSpacing: .5 }}>SAVES</div>
              </div>
            </div>

            {!isOwnIdea && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => setShowPM(true)}
                  style={{ width: '100%', background: LIT.accent, color: '#fff', border: 'none', borderRadius: 3, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  💬 Send a message
                </button>
                <button
                  onClick={() => setShowOfferModal(true)}
                  style={{ width: '100%', background: LIT.accentSoft, color: LIT.accent, border: `1.5px solid ${LIT.accentSoftBorder}`, borderRadius: 3, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  🤝 Offer your network
                </button>
              </div>
            )}

            {networkOfferCount > 0 && (
              <div style={{ marginTop: 10, textAlign: 'center' as const, fontSize: 12, color: LIT.accent, fontWeight: 600, background: LIT.accentSoft, padding: '8px', borderRadius: 3 }}>
                🤝 {networkOfferCount} network offer{networkOfferCount !== 1 ? 's' : ''} received
              </div>
            )}
          </div>

          {/* Stage */}
          <div style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '20px 22px', boxShadow: LIT.shadow }}>
            <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.muted, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 14 }}>Journey stage</div>
            <StageTracker currentStage={idea.stage} />
          </div>

          {/* Seeking */}
          <div style={{
            background: LIT.cardTint,
            border: `1px solid ${stageColor}45`,
            borderRadius: LIT.radius, padding: '20px 22px',
          }}>
            <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: stageColor, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 10 }}>What they need</div>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: LIT.text, lineHeight: 1.6, fontFamily: LIT.bodyFont }}>{communityAsk}</div>
          </div>

          {/* BMC preview — was a bare link, now shows the actual Value Proposition
              text so visitors see real substance before deciding to open the full canvas.
              Gated on there actually being consented content — /canvas now enforces the
              Business Model Canvas toggle server-side, so an empty response here means
              the founder hasn't opted this section in (not that the fetch failed). */}
          {canvasPreview && Object.keys(canvasPreview).length > 0 && (
            <button
              onClick={() => setShowCanvas(true)}
              style={{
                width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 10,
                padding: '18px 22px', borderRadius: LIT.radius,
                background: LIT.cardTint, border: `1px solid ${LIT.border}`,
                cursor: 'pointer', textAlign: 'left' as const, transition: 'all .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = stageColor + '60'; (e.currentTarget as HTMLButtonElement).style.background = stageColor + '08'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = LIT.border; (e.currentTarget as HTMLButtonElement).style.background = LIT.cardTint; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: LIT.headFont, fontSize: 14, fontWeight: 700, color: LIT.text }}>⬡ Business Model Canvas</div>
                <span style={{ fontSize: 16, color: LIT.muted }}>→</span>
              </div>
              {canvasPreview.vp ? (
                <div style={{ fontSize: 13.5, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                  {canvasPreview.vp}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: LIT.muted, fontWeight: 500 }}>See how they've mapped their business</div>
              )}
            </button>
          )}

          {/* Save + Follow */}
          {!isOwnIdea && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={toggleBookmark}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${bookmarked ? '#f59e0b' : LIT.border}`, background: bookmarked ? '#fffbeb' : LIT.card, color: bookmarked ? '#b45309' : LIT.secondary, transition: 'all .15s' }}
              >
                {bookmarked ? '🔖 Saved' : '🔖 Save'}
              </button>
              <button
                onClick={toggleFollow}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${following ? LIT.accent : LIT.border}`, background: following ? LIT.accentSoft : LIT.card, color: following ? LIT.accent : LIT.secondary, transition: 'all .15s' }}
              >
                {following ? '🔔 Following' : '🔔 Follow'}
              </button>
            </div>
          )}

          {/* Network offers — owner only */}
          {isOwnIdea && networkOffers.length > 0 && (
            <div style={{ background: LIT.card, border: `1px solid ${LIT.accentSoftBorder}`, borderRadius: LIT.radius, padding: '20px 22px', boxShadow: LIT.shadow }}>
              <div style={{ fontFamily: LIT.headFont, fontSize: 11, fontWeight: 700, color: LIT.accent, textTransform: 'uppercase' as const, letterSpacing: 1.6, marginBottom: 16 }}>
                🤝 Network offers ({networkOffers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {networkOffers.map(offer => (
                  <div key={offer.id} style={{ paddingBottom: 14, borderBottom: `1px solid ${LIT.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 5, background: LIT.accentSoft, color: LIT.accent, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {offer.offeror_initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: LIT.text }}>{offer.offeror_name}</span>
                      <span style={{ fontSize: 11, color: LIT.muted, marginLeft: 'auto' }}>{timeAgo(offer.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: LIT.text, marginBottom: 2 }}>
                      Intro to {offer.contact_name}
                      {offer.relationship && <span style={{ fontSize: 12, fontWeight: 400, color: LIT.muted }}> · {offer.relationship}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: LIT.secondary, fontFamily: LIT.bodyFont, lineHeight: 1.55, marginBottom: 6 }}>{offer.contact_description}</div>
                    <div style={{ fontSize: 12, color: LIT.accent, fontWeight: 600 }}>
                      {offer.contact_type === 'linkedin' ? '🔗' : '✉'} {offer.contact_value}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: LIT.muted, marginTop: 8 }}>Details also sent to your inbox.</div>
            </div>
          )}
        </div>
      </div>}

      {/* Modals */}
      {showPM && <PMModal idea={idea} onClose={() => { setShowPM(false); setPmInitialMessage(''); }} currentUserId={user?.id ?? ''} initialMessage={pmInitialMessage} />}

      {showCanvas && (
        <IdeaCanvasModal
          idea={{ ...idea, is_active: false } as never}
          isActive={false}
          onClose={() => setShowCanvas(false)}
          onMakeActive={() => {}}
          viewOnly
        />
      )}

      {showOfferModal && (
        <NetworkOfferModal
          ideaId={idea.id}
          ideaName={idea.name}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); setNetworkOfferCount(c => c + 1); }}
        />
      )}
    </div>
    </div>
  );
}
