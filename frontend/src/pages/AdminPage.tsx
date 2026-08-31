import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, messagesApi, communityApi } from '@/api/client';
import { STAGE_LABELS, STAGE_COLORS, type Stage } from '@/types';
import { useApp } from '@/context/AppContext';
import IdeaCanvasModal from '@/components/IdeaCanvasModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminIdea {
  id: string;
  name: string;
  description: string | null;
  stage: Stage;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  author_id: string;
  author_name: string;
  author_email: string;
  avatar_initials: string;
}

interface AdminPost {
  id: string;
  content: string;
  post_type: string;
  moderation_status: 'visible' | 'flagged' | 'approved' | 'rejected' | 'held';
  flag_reason: string | null;
  created_at: string;
  author_name: string;
  author_email: string;
  avatar_initials: string;
  idea_name?: string | null;
  idea_id?: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  current_stage: Stage;
  is_admin: boolean;
  suspended: boolean;
  created_at: string;
  idea_count: string;
}

interface AdminProgressUser {
  id: string;
  name: string;
  email: string;
  current_stage: Stage;
  created_at: string;
  idea_count: string;
  last_active: string | null;
  streak_days: number;
}

interface AdminFeedback {
  id: string;
  category: 'feature' | 'bug' | 'improvement' | 'feedback';
  message: string;
  page_context: string | null;
  status: 'new' | 'reviewing' | 'planned' | 'done' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  author_name: string;
  author_email: string;
  avatar_initials: string;
}

interface Stats {
  ideas: { pending: string; approved: string; rejected: string; total: string };
  posts: { flagged: string; held: string; rejected: string; total: string };
  users: { total: string };
  feedback: { new: string; total: string };
}

type MainTab = 'ideas' | 'posts' | 'users' | 'progress' | 'feedback' | 'analytics' | 'tools';
type IdeaFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PostFilter = 'all' | 'flagged' | 'held' | 'rejected' | 'approved';
type FeedbackFilter = 'new' | 'reviewing' | 'planned' | 'done' | 'dismissed' | 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const IDEA_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#d97706', bg: '#fef3c7' },
  approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

const POST_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  visible:  { label: 'Visible',  color: '#15803d', bg: '#dcfce7' },
  approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
  flagged:  { label: 'Flagged',  color: '#dc2626', bg: '#fee2e2' },
  held:     { label: 'On Hold',  color: '#d97706', bg: '#fef3c7' },
  rejected: { label: 'Rejected', color: '#6e6e73', bg: '#f3f4f6' },
};

const FEEDBACK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: 'New',        color: '#8b5cf6', bg: '#f5f3ff' },
  reviewing: { label: 'Reviewing',  color: '#2563eb', bg: '#eff6ff' },
  planned:   { label: 'Planned',    color: '#d97706', bg: '#fef3c7' },
  done:      { label: 'Done',       color: '#15803d', bg: '#dcfce7' },
  dismissed: { label: 'Dismissed',  color: '#6e6e73', bg: '#f3f4f6' },
};

const FEEDBACK_CATEGORY: Record<string, { label: string; color: string; bg: string }> = {
  feature:     { label: '💡 Feature idea', color: '#8b5cf6', bg: '#f5f3ff' },
  bug:         { label: '🐞 Bug',          color: '#dc2626', bg: '#fee2e2' },
  improvement: { label: '✨ Improvement',  color: '#2563eb', bg: '#eff6ff' },
  feedback:    { label: '💬 Feedback',     color: '#15803d', bg: '#dcfce7' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ status, map }: { status: string; map: Record<string, { label: string; color: string; bg: string }> }) {
  const s = map[status] ?? { label: status, color: '#6e6e73', bg: '#f3f4f6' };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.4, whiteSpace: 'nowrap' as const }}>
      {s.label}
    </span>
  );
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#e2e8f0', color: '#475569', fontSize: size * 0.33, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: -0.5 }}>
      {(initials ?? '??').slice(0, 2).toUpperCase()}
    </div>
  );
}

function Btn({ label, color, onClick, disabled, danger, filled }: { label: string; color?: string; onClick: () => void; disabled?: boolean; danger?: boolean; filled?: boolean }) {
  const [hov, setHov] = useState(false);
  const c = danger ? '#dc2626' : (color ?? '#374151');
  const isFilled = filled || danger;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${isFilled ? c : `${c}40`}`,
        background: isFilled ? (hov ? (danger ? '#b91c1c' : c) : c) : (hov ? `${c}12` : 'transparent'),
        color: isFilled ? '#fff' : c,
        opacity: disabled ? 0.4 : 1, transition: 'all .12s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 140, background: '#fff', borderRadius: 16, padding: '18px 22px', border: '1px solid #d2d2d7' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: -1 }}>{value}</div>
    </div>
  );
}

// Single-series (unique visitors/day, last 30 days) bar chart — hand-rolled
// inline SVG rather than a charting library, since this is the only chart in
// the admin dashboard. One hue, thin bars, rounded tops, a recessive baseline,
// and a per-bar hover tooltip; no legend needed for a single series.
function AnalyticsDailyChart({ data }: { data: { day: string; uniqueVisitors: number; pageViews: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return <div style={{ fontSize: 13, color: '#86868b', padding: '32px 0', textAlign: 'center' as const }}>No visits recorded yet.</div>;
  }
  const max = Math.max(1, ...data.map(d => d.uniqueVisitors));
  const W = 720, H = 160, padL = 4, padR = 4, barGap = 3;
  const barW = (W - padL - padR) / data.length - barGap;

  return (
    <div style={{ position: 'relative' as const }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* Recessive baseline */}
        <line x1={padL} y1={H} x2={W - padR} y2={H} stroke="#e5e5ea" strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max(2, (d.uniqueVisitors / max) * (H - 8));
          const x = padL + i * (barW + barGap);
          const y = H - h;
          const isHover = hover === i;
          return (
            <g key={d.day}>
              <rect
                x={x} y={y} width={Math.max(1, barW)} height={h} rx={2}
                fill={isHover ? '#4f46e5' : '#6366f1'}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(h => (h === i ? null : h))}
                style={{ cursor: 'pointer' }}
              />
              {/* Wider invisible hit target so thin bars are easy to hover */}
              <rect x={x - barGap / 2} y={0} width={barW + barGap} height={H} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(h => (h === i ? null : h))} />
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div style={{
          position: 'absolute' as const, bottom: H - (data[hover].uniqueVisitors / max) * (H - 8) + 30,
          left: `${((hover + 0.5) / data.length) * 100}%`, transform: 'translateX(-50%)',
          background: '#1d1d1f', color: '#fff', borderRadius: 8, padding: '6px 10px',
          fontSize: 11, whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, zIndex: 5,
        }}>
          <div style={{ fontWeight: 700 }}>{new Date(data[hover].day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          <div style={{ color: 'rgba(255,255,255,.7)' }}>{data[hover].uniqueVisitors} visitor{data[hover].uniqueVisitors !== 1 ? 's' : ''} · {data[hover].pageViews} view{data[hover].pageViews !== 1 ? 's' : ''}</div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#86868b', marginTop: 6 }}>
        <span>{new Date(data[0].day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ── Idea row with expandable post management ──────────────────────────────────
function IdeaRow({ idea, onModerate, onDelete, onViewAs }: {
  idea: AdminIdea;
  onModerate: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewAs: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded]           = useState(false);
  const [posts, setPosts]                 = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading]   = useState(false);
  const [acting, setActing]               = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCanvas, setShowCanvas]       = useState(false);
  const [viewingAs, setViewingAs]         = useState(false);

  const loadPosts = async () => {
    if (posts.length) { setExpanded(e => !e); return; }
    setExpanded(true);
    setPostsLoading(true);
    try {
      const r = await adminApi.getIdeaPosts(idea.id);
      setPosts(r.data.posts);
    } catch {} finally { setPostsLoading(false); }
  };

  const moderatePost = async (postId: string, status: string) => {
    setActing(postId);
    try {
      await adminApi.moderatePost(postId, status);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, moderation_status: status as AdminPost['moderation_status'] } : p));
    } catch {} finally { setActing(null); }
  };

  const stageColor = STAGE_COLORS[idea.stage];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #d2d2d7', overflow: 'hidden' }}>
      {/* ── Main row ── */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' as const }}>
        <Avatar initials={idea.avatar_initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1d1d1f' }}>{idea.name}</span>
            <span style={{ background: `${stageColor}15`, color: stageColor, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 800 }}>
              {STAGE_LABELS[idea.stage]}
            </span>
            <Badge status={idea.moderation_status} map={IDEA_STATUS} />
          </div>
          {idea.description && (
            <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.55, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {idea.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#86868b' }}>
            <strong style={{ color: '#6e6e73' }}>{idea.author_name}</strong> · {idea.author_email} · {timeAgo(idea.created_at)}
          </div>
        </div>

        {/* Actions — stacked: moderation row + utility row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
          {/* Moderation buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {idea.moderation_status !== 'approved' && (
              <Btn label="✓ Approve" color="#15803d" filled onClick={async () => { setActing('idea'); await onModerate(idea.id, 'approved'); setActing(null); }} disabled={acting === 'idea'} />
            )}
            {idea.moderation_status !== 'rejected' && (
              <Btn label="✕ Reject" color="#dc2626" onClick={async () => { setActing('idea'); await onModerate(idea.id, 'rejected'); setActing(null); }} disabled={acting === 'idea'} />
            )}
            {idea.moderation_status !== 'pending' && (
              <Btn label="↩ Reset to pending" onClick={async () => { setActing('idea'); await onModerate(idea.id, 'pending'); setActing(null); }} disabled={acting === 'idea'} />
            )}
          </div>

          {/* Utility row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <Btn
              label="👁 View as author"
              color="#7c2d12"
              filled
              disabled={viewingAs}
              onClick={async () => { setViewingAs(true); await onViewAs(idea.author_id); setViewingAs(false); }}
            />
            <Btn label={expanded ? '▲ Hide comments' : '▾ View comments'} onClick={loadPosts} />
            <button
              onClick={() => setShowCanvas(true)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #6366f130', background: '#eef2ff', color: '#6366f1', whiteSpace: 'nowrap', transition: 'all .12s' }}
            >
              ⬡ View BMC
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #fca5a5', background: '#fee2e2', color: '#dc2626', transition: 'all .12s', whiteSpace: 'nowrap' }}
              >
                🗑 Delete idea
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fff7f7', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '4px 10px', flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>Permanently delete?</span>
                <Btn label="Yes, delete" danger onClick={async () => { await onDelete(idea.id); }} />
                <Btn label="Cancel" onClick={() => setConfirmDelete(false)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Posts panel ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#f5f5f7' }}>
          {postsLoading ? (
            <div style={{ padding: '20px 24px', fontSize: 12, color: '#86868b' }}>Loading posts…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '20px 24px', fontSize: 12, color: '#86868b' }}>No posts for this idea yet.</div>
          ) : (
            <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#86868b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                {posts.length} comment{posts.length !== 1 ? 's' : ''}
              </div>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${post.moderation_status === 'flagged' ? '#fecaca' : '#d2d2d7'}`, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Avatar initials={post.avatar_initials} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{post.author_name}</span>
                        <span style={{ fontSize: 11, color: '#86868b' }}>{timeAgo(post.created_at)}</span>
                        <Badge status={post.moderation_status} map={POST_STATUS} />
                        {post.flag_reason && (
                          <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>⚠ {post.flag_reason}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                        {post.content}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                        {post.moderation_status !== 'visible' && post.moderation_status !== 'approved' && (
                          <Btn label="✓ Approve" color="#15803d" filled onClick={() => moderatePost(post.id, 'approved')} disabled={acting === post.id} />
                        )}
                        {post.moderation_status !== 'rejected' && (
                          <Btn label="✕ Reject" danger onClick={() => moderatePost(post.id, 'rejected')} disabled={acting === post.id} />
                        )}
                        {post.moderation_status !== 'held' && (
                          <Btn label="⏸ Hold" color="#d97706" onClick={() => moderatePost(post.id, 'held')} disabled={acting === post.id} />
                        )}
                        {(post.moderation_status === 'rejected' || post.moderation_status === 'held') && (
                          <Btn label="↩ Restore" color="#6b7280" onClick={() => moderatePost(post.id, 'visible')} disabled={acting === post.id} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BMC modal ── */}
      {showCanvas && (
        <IdeaCanvasModal
          idea={{ id: idea.id, name: idea.name, description: idea.description, stage: idea.stage, is_active: false, user_id: '', moderation_status: idea.moderation_status, created_at: idea.created_at, updated_at: idea.created_at }}
          viewOnly
          onClose={() => setShowCanvas(false)}
        />
      )}
    </div>
  );
}

// ── User row with management actions ─────────────────────────────────────────
function UserRow({ user: u, onResetPassword, onSuspend, onDelete }: {
  user: AdminUser;
  onResetPassword: (id: string, pw: string) => Promise<void>;
  onSuspend: (id: string, suspended: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showReset, setShowReset]         = useState(false);
  const [newPw, setNewPw]                 = useState('');
  const [pwMsg, setPwMsg]                 = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [acting, setActing]               = useState(false);
  const sc = STAGE_COLORS[u.current_stage];

  const doReset = async () => {
    if (newPw.length < 6) { setPwMsg('Min 6 characters'); return; }
    setActing(true);
    try {
      await onResetPassword(u.id, newPw);
      setPwMsg('✓ Password reset');
      setNewPw('');
      setTimeout(() => { setPwMsg(''); setShowReset(false); }, 2000);
    } catch { setPwMsg('Error — try again'); }
    finally { setActing(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${u.suspended ? '#fecaca' : '#d2d2d7'}`, overflow: 'hidden' }}>
      {/* Main row */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar initials={(u.name ?? '??').slice(0, 2)} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#1d1d1f' }}>{u.name}</span>
            {u.suspended && (
              <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>SUSPENDED</span>
            )}
            <span style={{ background: `${sc}15`, color: sc, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>
              {STAGE_LABELS[u.current_stage]}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#86868b' }}>{u.email} · <strong style={{ color: '#6e6e73' }}>{u.idea_count}</strong> ideas · joined {timeAgo(u.created_at)}</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Btn label="🔑 Reset password" color="#6366f1" onClick={() => { setShowReset(s => !s); setPwMsg(''); }} />
          {u.suspended
            ? <Btn label="✓ Unsuspend" color="#15803d" filled onClick={async () => { setActing(true); await onSuspend(u.id, false); setActing(false); }} disabled={acting} />
            : <Btn label="⏸ Suspend" color="#d97706" onClick={async () => { setActing(true); await onSuspend(u.id, true); setActing(false); }} disabled={acting} />
          }
          {!confirmDelete
            ? <button onClick={() => setConfirmDelete(true)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #fca5a5', background: '#fee2e2', color: '#dc2626', whiteSpace: 'nowrap' }}>
                🗑 Delete member
              </button>
            : <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fff7f7', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '4px 10px' }}>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>Delete + all their data?</span>
                <Btn label="Yes" danger onClick={async () => { setActing(true); await onDelete(u.id); }} disabled={acting} />
                <Btn label="Cancel" onClick={() => setConfirmDelete(false)} />
              </div>
          }
        </div>
      </div>

      {/* Password reset panel */}
      {showReset && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#f5f5f7', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600, whiteSpace: 'nowrap' }}>New password for {u.name.split(' ')[0]}:</span>
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doReset()}
            placeholder="min 6 characters"
            style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 13, outline: 'none', maxWidth: 260 }}
          />
          <Btn label={acting ? 'Saving…' : 'Set password'} color="#6366f1" filled onClick={doReset} disabled={acting} />
          {pwMsg && <span style={{ fontSize: 12, color: pwMsg.startsWith('✓') ? '#15803d' : '#dc2626', fontWeight: 700 }}>{pwMsg}</span>}
        </div>
      )}
    </div>
  );
}

// ── Feedback row with status + internal notes management ──────────────────────
function FeedbackRow({ item, onUpdate }: {
  item: AdminFeedback;
  onUpdate: (id: string, data: { status?: string; admin_notes?: string }) => Promise<void>;
}) {
  const [notes, setNotes]       = useState(item.admin_notes ?? '');
  const [showNotes, setShowNotes] = useState(!!item.admin_notes);
  const [saving, setSaving]     = useState(false);
  const [acting, setActing]     = useState(false);
  const cat = FEEDBACK_CATEGORY[item.category] ?? FEEDBACK_CATEGORY.feedback;

  const setStatus = async (status: string) => {
    setActing(true);
    try { await onUpdate(item.id, { status }); } finally { setActing(false); }
  };

  const saveNotes = async () => {
    setSaving(true);
    try { await onUpdate(item.id, { admin_notes: notes }); } finally { setSaving(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${item.status === 'new' ? '#ddd6fe' : '#d2d2d7'}`, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar initials={item.avatar_initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{item.author_name}</span>
            <span style={{ fontSize: 11, color: '#86868b' }}>{item.author_email}</span>
            <span style={{ fontSize: 11, color: '#86868b' }}>{timeAgo(item.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ background: cat.bg, color: cat.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>{cat.label}</span>
            <Badge status={item.status} map={FEEDBACK_STATUS} />
            {item.page_context && (
              <span style={{ fontSize: 10, color: '#86868b' }}>
                on <code style={{ background: '#f3f4f6', borderRadius: 4, padding: '1px 5px' }}>{item.page_context}</code>
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.6, background: '#f5f5f7', borderRadius: 10, padding: '10px 14px', marginBottom: 10, whiteSpace: 'pre-wrap', borderLeft: `3px solid ${cat.color}` }}>
            {item.message}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: showNotes ? 10 : 0 }}>
            {(['new', 'reviewing', 'planned', 'done', 'dismissed'] as const).filter(s => s !== item.status).map(s => (
              <Btn key={s} label={`→ ${FEEDBACK_STATUS[s].label}`} color={FEEDBACK_STATUS[s].color} onClick={() => setStatus(s)} disabled={acting} />
            ))}
            <Btn label={showNotes ? 'Hide notes' : '📝 Notes'} onClick={() => setShowNotes(s => !s)} />
          </div>
          {showNotes && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes (not visible to the submitter)…"
                rows={2}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 12, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit' }}
              />
              <Btn label={saving ? 'Saving…' : 'Save'} color="#6366f1" filled onClick={saveNotes} disabled={saving} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AnalyticsWindow { window: string; uniqueVisitors: number; pageViews: number }
interface AnalyticsDaily { day: string; uniqueVisitors: number; pageViews: number }
interface AnalyticsLink { label: string; clicks: number; uniqueClickers: number }
interface AnalyticsData {
  path: string;
  windows: AnalyticsWindow[];
  allTime: { totalPageViews: number; totalClicks: number; visitorDays: number };
  daily: AnalyticsDaily[];
  links: AnalyticsLink[];
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { logout, impersonate } = useApp();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  // Deep-linkable from the feedback-notification link (/admin?tab=feedback)
  const [tab, setTab]             = useState<MainTab>(() => (new URLSearchParams(window.location.search).get('tab') === 'feedback' ? 'feedback' : 'ideas'));
  const [stats, setStats]         = useState<Stats | null>(null);
  const [ideas, setIdeas]         = useState<AdminIdea[]>([]);
  const [posts, setPosts]         = useState<AdminPost[]>([]);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [progress, setProgress]   = useState<AdminProgressUser[]>([]);
  const [progressSort, setProgressSort] = useState<{ key: 'name' | 'current_stage' | 'idea_count' | 'last_active' | 'streak_days'; dir: 'asc' | 'desc' }>({ key: 'last_active', dir: 'desc' });
  const [feedback, setFeedback]   = useState<AdminFeedback[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [ideaFilter, setIdeaFilter] = useState<IdeaFilter>('all');
  const [postFilter, setPostFilter] = useState<PostFilter>('flagged');
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('new');
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [digestState, setDigestState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [digestQueued, setDigestQueued] = useState<number | null>(null);
  const [newsState, setNewsState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [newsResult, setNewsResult] = useState<{ fetched: number; kept: number; stored: number } | null>(null);

  // Poll unread message count every 30s
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try { const r = await messagesApi.unreadCount(); if (!cancelled) setUnread(r.data.unread); } catch {}
    };
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const loadStats = useCallback(async () => {
    try { const r = await adminApi.getStats(); setStats(r.data); } catch {}
  }, []);

  const loadIdeas = useCallback(async (filter: IdeaFilter) => {
    setLoading(true);
    try {
      const r = await adminApi.listIdeas(filter === 'all' ? undefined : filter);
      setIdeas(r.data.ideas);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadPosts = useCallback(async (filter: PostFilter) => {
    setLoading(true);
    try {
      const r = await adminApi.listPosts(filter === 'all' ? undefined : filter);
      setPosts(r.data.posts);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.listUsers();
      setUsers(r.data.users);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getProgress();
      setProgress(r.data.users);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadFeedback = useCallback(async (filter: FeedbackFilter) => {
    setLoading(true);
    try {
      const r = await adminApi.listFeedback(filter === 'all' ? undefined : filter);
      setFeedback(r.data.submissions);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setAnalyticsError(null);
    try {
      const r = await adminApi.getAnalytics('/');
      setAnalytics(r.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      setAnalyticsError(
        status
          ? `Request failed (${status}). ${typeof serverMsg === 'string' ? serverMsg : 'Check the server logs — this usually means the analytics_events / analytics_daily_agg tables haven\'t been created yet (run the latest migration).'}`
          : 'Could not reach the server. Check your connection or try again.'
      );
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    setSearch('');
    if (tab === 'ideas')          loadIdeas(ideaFilter);
    else if (tab === 'posts')     loadPosts(postFilter);
    else if (tab === 'users')     loadUsers();
    else if (tab === 'progress')  loadProgress();
    else if (tab === 'feedback')  loadFeedback(feedbackFilter);
    else if (tab === 'analytics') loadAnalytics();
  }, [tab, ideaFilter, postFilter, feedbackFilter, loadIdeas, loadPosts, loadUsers, loadProgress, loadFeedback, loadAnalytics]);

  // Admin "view as user": mint an impersonation token, swap it into the
  // session, and drop into that member's own Journey view.
  const handleViewAs = async (id: string) => {
    const r = await adminApi.impersonate(id);
    impersonate(r.data.token, r.data.user);
    navigate('/journey');
  };

  const handleModerateIdea = async (id: string, status: string) => {
    await adminApi.moderateIdea(id, status);
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, moderation_status: status as AdminIdea['moderation_status'] } : i));
    loadStats();
  };

  const handleDeleteIdea = async (id: string) => {
    await adminApi.deleteIdea(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
    loadStats();
  };

  const handleModeratePost = async (id: string, status: string) => {
    await adminApi.moderatePost(id, status);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, moderation_status: status as AdminPost['moderation_status'] } : p));
    loadStats();
  };

  const handleUpdateFeedback = async (id: string, data: { status?: string; admin_notes?: string }) => {
    const r = await adminApi.updateFeedback(id, data);
    // A status change moves an item out of any specific (non-"all") filter —
    // drop it from the list in that case. Otherwise (or on the "all" filter,
    // or a notes-only save) just update it in place.
    if (data.status && feedbackFilter !== 'all') {
      setFeedback(prev => prev.filter(f => f.id !== id));
    } else {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, ...r.data.submission } : f));
    }
    if (data.status) loadStats();
  };

  // Filtered by search
  const filteredIdeas = ideas.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.author_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPosts = posts.filter(p =>
    !search || p.content.toLowerCase().includes(search.toLowerCase()) || p.author_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProgress = progress
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const { key, dir } = progressSort;
      const mul = dir === 'asc' ? 1 : -1;
      if (key === 'name')          return a.name.localeCompare(b.name) * mul;
      if (key === 'current_stage') return a.current_stage.localeCompare(b.current_stage) * mul;
      if (key === 'idea_count')    return (Number(a.idea_count) - Number(b.idea_count)) * mul;
      if (key === 'streak_days')   return (a.streak_days - b.streak_days) * mul;
      // last_active — nulls (never active) sort last regardless of direction
      const at = a.last_active ? new Date(a.last_active).getTime() : -1;
      const bt = b.last_active ? new Date(b.last_active).getTime() : -1;
      if (at === -1 && bt === -1) return 0;
      if (at === -1) return 1;
      if (bt === -1) return -1;
      return (at - bt) * mul;
    });
  const toggleProgressSort = (key: typeof progressSort.key) =>
    setProgressSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'current_stage' ? 'asc' : 'desc' });
  const filteredFeedback = feedback.filter(f =>
    !search || f.message.toLowerCase().includes(search.toLowerCase()) || f.author_name.toLowerCase().includes(search.toLowerCase())
  );

  // Tab styles
  const mainTab = (active: boolean): React.CSSProperties => ({
    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73',
    border: 'none', boxShadow: active ? '0 1px 4px #0001' : 'none', transition: 'all .14s',
  });

  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    background: active ? (color ? `${color}18` : '#111827') : 'transparent',
    color: active ? (color ?? '#fff') : '#6e6e73',
    border: `1px solid ${active ? (color ?? '#111827') : '#d2d2d7'}`,
    transition: 'all .12s',
  });

  const alertCount = (stats ? Number(stats.ideas.pending) + Number(stats.posts.flagged) + Number(stats.feedback?.new ?? 0) : 0);

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f7', fontFamily: 'inherit' }}>

      {/* ── Top bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d2d2d7', minHeight: 56, display: 'flex', alignItems: 'center', padding: '10px 28px', gap: 14, flexWrap: 'wrap' as const }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#1d1d1f', letterSpacing: -0.3 }}>🛡 Admin Control Panel</div>
          <div style={{ fontSize: 9, color: '#86868b', fontWeight: 500, marginTop: 1 }}>MVP Club · From idea to launched — one step at a time.</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
          {alertCount > 0 && (<>
            {stats && Number(stats.ideas.pending) > 0 && (
              <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
                {stats.ideas.pending} ideas pending
              </span>
            )}
            {stats && Number(stats.posts.flagged) > 0 && (
              <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
                {stats.posts.flagged} posts flagged
              </span>
            )}
            {stats && Number(stats.feedback?.new ?? 0) > 0 && (
              <span style={{ background: '#f5f3ff', color: '#8b5cf6', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
                {stats.feedback.new} new feedback
              </span>
            )}
          </>)}
          {/* Help button */}
          <button
            onClick={() => navigate('/help?guide=getting-started')}
            title="How-to guides"
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'transparent', border: '1.5px solid #d2d2d7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#6e6e73', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            ?
          </button>

          {/* Private inbox */}
          <button
            onClick={() => navigate('/messages')}
            title="Private inbox"
            style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', background: 'transparent', border: '1.5px solid #d2d2d7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            ✉️
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button
            onClick={() => { logout(); navigate('/'); }}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #d2d2d7', background: 'transparent', color: '#6e6e73', transition: 'all .12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 80px' }}>

        {/* ── Stats row ── */}
        {stats && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatCard label="Pending ideas"  value={stats.ideas.pending}  color="#d97706" />
            <StatCard label="Live ideas"     value={stats.ideas.approved} color="#15803d" />
            <StatCard label="Rejected ideas" value={stats.ideas.rejected} color="#dc2626" />
            <StatCard label="Flagged posts"  value={stats.posts.flagged}  color="#dc2626" />
            <StatCard label="Held posts"     value={stats.posts.held}     color="#d97706" />
            <StatCard label="New feedback"   value={stats.feedback?.new ?? 0} color="#8b5cf6" />
            <StatCard label="Members"        value={stats.users.total}    color="#6366f1" />
          </div>
        )}

        {/* ── Main tabs + search ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 14, padding: 4, flexWrap: 'wrap' as const }}>
            {(['ideas', 'posts', 'users', 'progress', 'feedback', 'analytics', 'tools'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={mainTab(tab === t)}>
                {t === 'ideas' ? '💡 Ideas' : t === 'posts' ? '💬 Comments' : t === 'users' ? '👥 Members' : t === 'progress' ? '📊 Progress' : t === 'feedback' ? '📮 Feedback' : t === 'analytics' ? '📈 Analytics' : '⚙️ Tools'}
                {t === 'feedback' && stats && Number(stats.feedback?.new ?? 0) > 0 && (
                  <span style={{ marginLeft: 6, background: '#8b5cf6', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                    {stats.feedback.new}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab !== 'tools' && tab !== 'analytics' && (
            <input
              placeholder={`Search ${tab}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 13, outline: 'none', background: '#fff', minWidth: 200 }}
            />
          )}
          {tab !== 'tools' && tab !== 'analytics' && (
            <span style={{ fontSize: 12, color: '#86868b', marginLeft: 'auto' }}>
              {tab === 'ideas' ? filteredIdeas.length : tab === 'posts' ? filteredPosts.length : tab === 'users' ? filteredUsers.length : tab === 'progress' ? filteredProgress.length : filteredFeedback.length} result{(tab === 'ideas' ? filteredIdeas.length : tab === 'posts' ? filteredPosts.length : tab === 'users' ? filteredUsers.length : tab === 'progress' ? filteredProgress.length : filteredFeedback.length) !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ══════ IDEAS ══════ */}
        {tab === 'ideas' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {([['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']] as [IdeaFilter, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setIdeaFilter(v)} style={pill(ideaFilter === v, v === 'pending' ? '#d97706' : v === 'approved' ? '#15803d' : v === 'rejected' ? '#dc2626' : undefined)}>
                  {l}{v !== 'all' && stats ? ` (${stats.ideas[v as keyof typeof stats.ideas] ?? ''})` : ''}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b', fontSize: 13 }}>Loading…</div>
            ) : filteredIdeas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14 }}>No ideas here</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredIdeas.map(idea => (
                  <IdeaRow
                    key={idea.id}
                    idea={idea}
                    onModerate={handleModerateIdea}
                    onDelete={handleDeleteIdea}
                    onViewAs={handleViewAs}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ POSTS ══════ */}
        {tab === 'posts' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {([['flagged', 'Flagged', '#dc2626'], ['held', 'On Hold', '#d97706'], ['rejected', 'Rejected', '#6b7280'], ['approved', 'Approved', '#15803d'], ['all', 'All', undefined]] as [PostFilter, string, string | undefined][]).map(([v, l, c]) => (
                <button key={v} onClick={() => setPostFilter(v)} style={pill(postFilter === v, c)}>
                  {l}{v === 'flagged' && stats ? ` (${stats.posts.flagged})` : v === 'held' && stats ? ` (${stats.posts.held})` : ''}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>Loading…</div>
            ) : filteredPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 14 }}>No posts in this state</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredPosts.map(post => (
                  <div key={post.id} style={{
                    background: '#fff', borderRadius: 16, padding: '16px 20px',
                    border: `1px solid ${post.moderation_status === 'flagged' ? '#fecaca' : '#d2d2d7'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar initials={post.avatar_initials} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>{post.author_name}</span>
                          <span style={{ fontSize: 11, color: '#86868b' }}>{post.author_email}</span>
                          <span style={{ fontSize: 11, color: '#86868b' }}>{timeAgo(post.created_at)}</span>
                          <Badge status={post.moderation_status} map={POST_STATUS} />
                          {post.flag_reason && (
                            <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>⚠ {post.flag_reason}</span>
                          )}
                        </div>
                        {post.idea_name && (
                          <div style={{ fontSize: 11, color: '#86868b', marginBottom: 6 }}>
                            On idea: <strong style={{ color: '#6366f1' }}>{post.idea_name}</strong>
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.6, background: '#f5f5f7', borderRadius: 10, padding: '10px 14px', marginBottom: 10, whiteSpace: 'pre-wrap', borderLeft: `3px solid ${POST_STATUS[post.moderation_status]?.color ?? '#d2d2d7'}` }}>
                          {post.content}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {post.moderation_status !== 'visible' && post.moderation_status !== 'approved' && (
                            <Btn label="✓ Approve" color="#15803d" filled onClick={() => handleModeratePost(post.id, 'approved')} />
                          )}
                          {post.moderation_status !== 'rejected' && (
                            <Btn label="✕ Reject" danger onClick={() => handleModeratePost(post.id, 'rejected')} />
                          )}
                          {post.moderation_status !== 'held' && (
                            <Btn label="⏸ Hold" color="#d97706" onClick={() => handleModeratePost(post.id, 'held')} />
                          )}
                          {(post.moderation_status === 'rejected' || post.moderation_status === 'held') && (
                            <Btn label="↩ Restore" color="#6b7280" onClick={() => handleModeratePost(post.id, 'visible')} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ MEMBERS ══════ */}
        {tab === 'users' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onResetPassword={async (id, pw) => { await adminApi.resetPassword(id, pw); }}
                    onSuspend={async (id, s) => {
                      await adminApi.suspendUser(id, s);
                      setUsers(prev => prev.map(x => x.id === id ? { ...x, suspended: s } : x));
                    }}
                    onDelete={async (id) => {
                      await adminApi.deleteUser(id);
                      setUsers(prev => prev.filter(x => x.id !== id));
                      loadStats();
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ PROGRESS (bird's-eye view across every member) ══════ */}
        {tab === 'progress' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>Loading…</div>
            ) : filteredProgress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 14 }}>No members yet</div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #d2d2d7', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 8, padding: '10px 20px', borderBottom: '1px solid #f0f0f2', background: '#fafafa' }}>
                  {([
                    ['name', 'Member'],
                    ['current_stage', 'Stage'],
                    ['idea_count', 'Ideas'],
                    ['streak_days', 'Streak'],
                    ['last_active', 'Last active'],
                  ] as [typeof progressSort.key, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleProgressSort(key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#86868b', textTransform: 'uppercase' as const, letterSpacing: 0.6 }}
                    >
                      {label}
                      {progressSort.key === key && <span style={{ fontSize: 9 }}>{progressSort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  ))}
                  <span />
                </div>
                {filteredProgress.map(u => {
                  const sc = STAGE_COLORS[u.current_stage];
                  return (
                    <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f5f5f7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Avatar initials={(u.name ?? '??').slice(0, 2)} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                          <div style={{ fontSize: 10.5, color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        </div>
                      </div>
                      <span style={{ background: `${sc}15`, color: sc, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700, width: 'fit-content' }}>
                        {STAGE_LABELS[u.current_stage]}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{u.idea_count}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: u.streak_days >= 2 ? '#d97706' : '#c7c7cc' }}>
                        {u.streak_days >= 2 ? `🔥 ${u.streak_days}d` : '—'}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#6e6e73' }}>{u.last_active ? timeAgo(u.last_active) : 'never'}</span>
                      <Btn label="👁 View as" color="#7c2d12" filled onClick={() => handleViewAs(u.id)} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════ FEEDBACK ══════ */}
        {tab === 'feedback' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {([['new', 'New', '#8b5cf6'], ['reviewing', 'Reviewing', '#2563eb'], ['planned', 'Planned', '#d97706'], ['done', 'Done', '#15803d'], ['dismissed', 'Dismissed', '#6b7280'], ['all', 'All', undefined]] as [FeedbackFilter, string, string | undefined][]).map(([v, l, c]) => (
                <button key={v} onClick={() => setFeedbackFilter(v)} style={pill(feedbackFilter === v, c)}>
                  {l}{v === 'new' && stats ? ` (${stats.feedback?.new ?? 0})` : ''}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>Loading…</div>
            ) : filteredFeedback.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14 }}>Nothing here</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredFeedback.map(item => (
                  <FeedbackRow key={item.id} item={item} onUpdate={handleUpdateFeedback} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ ANALYTICS ══════ */}
        {tab === 'analytics' && (
          <div style={{ maxWidth: 760 }}>
            {analyticsError ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 4 }}>Couldn't load analytics</div>
                <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5, marginBottom: 12 }}>{analyticsError}</div>
                <button onClick={() => loadAnalytics()} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  Try again
                </button>
              </div>
            ) : !analytics ? (
              <div style={{ fontSize: 13, color: '#86868b', padding: '32px 0' }}>Loading…</div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: '#86868b', marginBottom: 16 }}>
                  Hero page (<code>mvpclub.io/</code>) — visitors are identified only by a salted hash of IP, never the address itself,
                  and only visitors who accepted the "Analytics" cookie category are counted.
                </div>

                {/* Standard windows — exact counts, all within the 90-day raw-retention window */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  {analytics.windows.map(w => (
                    <div key={w.window} style={{ flex: 1, minWidth: 130, background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #d2d2d7' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#86868b', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6 }}>
                        {w.window === 'today' ? 'Today' : `Last ${w.window}`}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#6366f1', letterSpacing: -1 }}>{w.uniqueVisitors}</div>
                      <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>unique visitor{w.uniqueVisitors !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 12, color: '#3a3a3c', marginTop: 6 }}>{w.pageViews} page view{w.pageViews !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>

                {/* Daily trend chart */}
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #d2d2d7', padding: '20px 24px', marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1d1d1f', marginBottom: 2 }}>Unique visitors per day</div>
                  <div style={{ fontSize: 12, color: '#86868b', marginBottom: 16 }}>Last 30 days · hover a bar for the exact count</div>
                  <AnalyticsDailyChart data={analytics.daily} />
                </div>

                {/* Link clicks */}
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #d2d2d7', overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '18px 24px 4px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1d1d1f' }}>Which links get clicked</div>
                    <div style={{ fontSize: 12, color: '#86868b', marginTop: 2, marginBottom: 12 }}>Last 30 days, ranked by clicks</div>
                  </div>
                  {analytics.links.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#86868b', padding: '8px 24px 20px' }}>No clicks recorded yet.</div>
                  ) : (
                    <div>
                      {analytics.links.map((l, i) => {
                        const max = Math.max(...analytics.links.map(x => x.clicks));
                        return (
                          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ width: 160, fontSize: 12.5, fontWeight: 600, color: '#3a3a3c', flexShrink: 0 }}>{l.label}</div>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                              <div style={{ width: `${(l.clicks / max) * 100}%`, height: '100%', background: '#6366f1', borderRadius: 6 }} />
                            </div>
                            <div style={{ width: 100, textAlign: 'right' as const, flexShrink: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#1d1d1f' }}>{l.clicks}</span>
                              <span style={{ fontSize: 11, color: '#86868b' }}> ({l.uniqueClickers} people)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* All-time totals */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                  <StatCard label="Total page views (all time)" value={analytics.allTime.totalPageViews} color="#0066cc" />
                  <StatCard label="Total link clicks (all time)" value={analytics.allTime.totalClicks} color="#0066cc" />
                  <div style={{ flex: 1, minWidth: 140, background: '#fff', borderRadius: 16, padding: '18px 22px', border: '1px solid #d2d2d7' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#86868b', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6 }}>Visitor-days (all time)</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#86868b', letterSpacing: -1 }}>{analytics.allTime.visitorDays}</div>
                    <div style={{ fontSize: 11, color: '#86868b', marginTop: 4, lineHeight: 1.4 }}>
                      Not the same as unique people — raw visit records are purged after 90 days, so someone who visits on two different,
                      already-purged days is counted twice here. Use the windows above for an exact unique-visitor count.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════ TOOLS ══════ */}
        {tab === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>

            {/* Weekly Digest card */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #d2d2d7', overflow: 'hidden' }}>
              {/* Header band */}
              <div style={{ background: '#0066cc', padding: '20px 24px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📧</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Weekly Momentum Digest</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>Sends a personalised Monday email to every member with email notifications enabled</div>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* What it does */}
                <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.6, marginBottom: 20 }}>
                  Each email shows the founder's current stage, how many updates they made last week, and one specific next step. Founders who were active get an encouragement; dormant ones get a nudge.
                  The digest is <strong>automatically scheduled every Monday at 08:00 UTC</strong> — use this button to send it on demand for testing or a one-off blast.
                </div>

                {/* Status indicator */}
                {digestState === 'done' && digestQueued !== null && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>Digest queued for {digestQueued} member{digestQueued !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Emails will arrive within a few minutes. Check server logs for delivery status.</div>
                    </div>
                  </div>
                )}
                {digestState === 'error' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>Failed to start digest</div>
                      <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>Check server logs for details. Make sure SMTP_USER and SMTP_PASS are set in your .env.</div>
                    </div>
                  </div>
                )}

                <button
                  disabled={digestState === 'running'}
                  onClick={async () => {
                    setDigestState('running');
                    setDigestQueued(null);
                    try {
                      const r = await adminApi.triggerWeeklyDigest();
                      setDigestQueued(r.data.queued ?? 0);
                      setDigestState('done');
                      setTimeout(() => setDigestState('idle'), 30000);
                    } catch {
                      setDigestState('error');
                      setTimeout(() => setDigestState('idle'), 10000);
                    }
                  }}
                  style={{
                    padding: '11px 24px', borderRadius: 12, border: 'none',
                    background: digestState === 'running' ? '#d2d2d7' : digestState === 'done' ? '#dcfce7' : '#0066cc',
                    color: digestState === 'done' ? '#15803d' : '#fff',
                    fontWeight: 800, fontSize: 14, cursor: digestState === 'running' ? 'not-allowed' : 'pointer',
                    transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {digestState === 'running' ? (
                    <>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff4', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                      Sending…
                    </>
                  ) : digestState === 'done' ? '✓ Sent!' : '📧 Send weekly digest now'}
                </button>
              </div>
            </div>

            {/* Early-Stage Funding News card */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #d2d2d7', overflow: 'hidden' }}>
              {/* Header band */}
              <div style={{ background: '#7c3aed', padding: '20px 24px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📰</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Early-Stage Funding News</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>Real angel/pre-seed/seed headlines shown on the Community home page</div>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* What it does */}
                <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.6, marginBottom: 20 }}>
                  Fetches real headlines from Google News RSS, then uses the local Ollama model to drop anything that isn't genuinely an early-stage funding story and write a one-line blurb — it never invents headlines.
                  This runs <strong>automatically every day at 07:00 UTC</strong> — use this button to refresh it now instead of waiting.
                </div>

                {/* Status indicator */}
                {newsState === 'done' && newsResult !== null && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>
                        {newsResult.stored} headline{newsResult.stored !== 1 ? 's' : ''} stored
                      </div>
                      <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                        {newsResult.fetched} candidate{newsResult.fetched !== 1 ? 's' : ''} fetched, {newsResult.kept} kept after AI curation. Visible on the Community home page now.
                      </div>
                    </div>
                  </div>
                )}
                {newsState === 'error' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>Refresh failed</div>
                      <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>Check server logs — make sure the "startup_news_items" migration has been run and the ollama service is up.</div>
                    </div>
                  </div>
                )}

                <button
                  disabled={newsState === 'running'}
                  onClick={async () => {
                    setNewsState('running');
                    setNewsResult(null);
                    try {
                      const r = await communityApi.refreshStartupNews();
                      setNewsResult(r.data);
                      setNewsState('done');
                      setTimeout(() => setNewsState('idle'), 30000);
                    } catch {
                      setNewsState('error');
                      setTimeout(() => setNewsState('idle'), 10000);
                    }
                  }}
                  style={{
                    padding: '11px 24px', borderRadius: 12, border: 'none',
                    background: newsState === 'running' ? '#d2d2d7' : newsState === 'done' ? '#dcfce7' : '#7c3aed',
                    color: newsState === 'done' ? '#15803d' : '#fff',
                    fontWeight: 800, fontSize: 14, cursor: newsState === 'running' ? 'not-allowed' : 'pointer',
                    transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {newsState === 'running' ? (
                    <>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff4', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                      Fetching &amp; curating…
                    </>
                  ) : newsState === 'done' ? '✓ Refreshed!' : '📰 Refresh startup news now'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* spinner keyframe */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
