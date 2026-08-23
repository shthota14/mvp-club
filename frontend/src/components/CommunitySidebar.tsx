import { useState, useEffect, useCallback } from 'react';
import { communityApi } from '@/api/client';

// ── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  content: string;
  post_type: string;
  stage: string;
  author_name: string;
  author_initials: string;
  created_at: string;
  encourage_count?: number;
}

interface Props {
  /** The stage the founder is currently working in (drives the feed filter) */
  currentStage: string;
  /** Pre-filled draft text to prompt the user to share after a key action */
  autoDraft?: string | null;
  /** Called when the user dismisses or publishes the auto-draft */
  onAutoDraftDismiss?: () => void;
}

// ── Design tokens (match WorkPage) ──────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  idea:     '#7c3aed',
  hone:     '#2563eb',
  validate: '#059669',
  shape:    '#d97706',
  done:     '#dc2626',
};

const STAGE_LABELS: Record<string, string> = {
  idea:     'Idea',
  hone:     'Hone',
  validate: 'Validate',
  shape:    'Shape',
  done:     'Ship',
};

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  win:      { label: '🎉 Win',      color: '#059669', bg: '#f0fdf4' },
  update:   { label: '📝 Update',   color: '#2563eb', bg: '#eff6ff' },
  question: { label: '❓ Question', color: '#d97706', bg: '#fffbeb' },
  validation_request: { label: '🧪 Validation', color: '#7c3aed', bg: '#f5f3ff' },
};

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CommunitySidebar({ currentStage, autoDraft, onAutoDraftDismiss }: Props) {
  const [open, setOpen]           = useState(false);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [composing, setComposing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [postType, setPostType]   = useState<'win' | 'update' | 'question'>('win');
  const [posting, setPosting]     = useState(false);
  const [encouraged, setEncouraged] = useState<Set<string>>(new Set());

  const color = STAGE_COLORS[currentStage] ?? '#7c3aed';

  // ── Fetch posts when panel first opens ───────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await communityApi.listPosts(currentStage);
      // Show most recent last (chronological bottom-up) — slice 15
      setPosts((res.data.posts ?? []).slice(-15));
      setLoaded(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [currentStage]);

  useEffect(() => {
    if (open && !loaded) { fetchPosts(); }
  }, [open, loaded, fetchPosts]);

  // Refetch when stage changes (user navigated to different module)
  useEffect(() => {
    setLoaded(false);
    setPosts([]);
  }, [currentStage]);

  // ── Auto-draft: open panel + pre-fill compose ─────────────────────────────
  useEffect(() => {
    if (autoDraft) {
      setOpen(true);
      setDraftText(autoDraft);
      setPostType('win');
      setComposing(true);
    }
  }, [autoDraft]);

  // ── Post ──────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!draftText.trim()) return;
    setPosting(true);
    try {
      const res = await communityApi.createPost({
        content: draftText.trim(),
        stage: currentStage,
        post_type: postType,
      });
      const newPost: Post = res.data.post ?? {
        id: String(Date.now()),
        content: draftText.trim(),
        post_type: postType,
        stage: currentStage,
        author_name: 'You',
        author_initials: 'Y',
        created_at: new Date().toISOString(),
      };
      setPosts(prev => [...prev, newPost]);
      setComposing(false);
      setDraftText('');
      onAutoDraftDismiss?.();
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  const handleEncourage = async (postId: string) => {
    try { await communityApi.react(postId, 'encourage'); } catch { /* silent */ }
    setEncouraged(prev => {
      const n = new Set(prev);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
  };

  const dismiss = () => { setComposing(false); setDraftText(''); onAutoDraftDismiss?.(); };

  // ── Render ────────────────────────────────────────────────────────────────
  const PANEL_W = 300;

  return (
    <>
      {/* ── Toggle tab ── */}
      <div
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close community panel' : 'Open community panel'}
        style={{
          position: 'fixed',
          right: open ? PANEL_W : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 210,
          background: color,
          color: '#fff',
          borderRadius: '10px 0 0 10px',
          padding: '14px 7px',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '-2px 0 16px rgba(0,0,0,.14)',
          transition: 'right .25s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 16 }}>🏆</span>
        {/* Rotated text via transform */}
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 1,
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          transform: 'rotate(180deg)',
        }}>
          Community
        </span>
        <span style={{ fontSize: 12, opacity: .7 }}>{open ? '›' : '‹'}</span>
      </div>

      {/* ── Slide-in panel ── */}
      <div style={{
        position: 'fixed',
        right: open ? 0 : -PANEL_W - 4,
        top: 64,
        bottom: 0,
        width: PANEL_W,
        background: '#fff',
        borderLeft: '1px solid #e5e5ea',
        zIndex: 209,
        display: 'flex',
        flexDirection: 'column',
        transition: 'right .25s ease',
        boxShadow: open ? '-6px 0 28px rgba(0,0,0,.07)' : 'none',
        overflow: 'hidden',
      }}>

        {/* Panel header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f0f0f5',
          flexShrink: 0,
          background: `linear-gradient(135deg, ${color}12 0%, ${color}04 100%)`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3 }}>
            🏆 Community Proof · {STAGE_LABELS[currentStage] ?? currentStage}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>
            What founders are doing right now
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>

          {/* ── Compose area ── */}
          {composing ? (
            <div style={{
              background: `${color}08`, border: `1.5px solid ${color}35`,
              borderRadius: 14, padding: 14, flexShrink: 0,
            }}>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {(['win', 'update', 'question'] as const).map(t => {
                  const b = TYPE_BADGE[t];
                  const sel = postType === t;
                  return (
                    <button key={t} onClick={() => setPostType(t)} style={{
                      flex: 1, padding: '4px 0', borderRadius: 999, fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', border: `1.5px solid ${sel ? b.color : '#e5e5ea'}`,
                      background: sel ? b.bg : '#fff', color: sel ? b.color : '#9ca3af',
                      fontFamily: 'inherit', transition: 'all .12s',
                    }}>
                      {b.label}
                    </button>
                  );
                })}
              </div>

              {autoDraft && (
                <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 6 }}>
                  🎉 Auto-generated from your interview
                </div>
              )}
              <textarea
                autoFocus
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={3}
                placeholder={postType === 'win' ? 'What did you accomplish?' : postType === 'question' ? 'What are you trying to figure out?' : 'What\'s happening with your idea?'}
                style={{
                  width: '100%', padding: '9px 11px', borderRadius: 10,
                  border: `1.5px solid ${color}40`, fontSize: 12, lineHeight: 1.6,
                  resize: 'none' as const, outline: 'none', fontFamily: 'inherit',
                  background: '#fff', color: '#1d1d1f', boxSizing: 'border-box' as const,
                }}
                onFocus={e => (e.target.style.borderColor = color)}
                onBlur={e => (e.target.style.borderColor = `${color}40`)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  onClick={handlePost}
                  disabled={!draftText.trim() || posting}
                  style={{
                    flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                    background: draftText.trim() ? color : '#e5e5ea',
                    color: draftText.trim() ? '#fff' : '#b0b0b8',
                    fontSize: 12, fontWeight: 700,
                    cursor: draftText.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  {posting ? 'Sharing…' : 'Share →'}
                </button>
                <button onClick={dismiss} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1.5px solid #e5e5ea', background: '#fff',
                  color: '#6e6e73', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                border: `1.5px dashed ${color}50`, background: `${color}06`,
                color, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
                flexShrink: 0,
              }}
            >
              + Share an update with your stage
            </button>
          )}

          {/* ── Feed ── */}
          {loading && (
            <div style={{ textAlign: 'center' as const, color: '#c0c0c8', fontSize: 12, padding: '24px 0' }}>
              Loading…
            </div>
          )}

          {!loading && loaded && posts.length === 0 && (
            <div style={{ textAlign: 'center' as const, padding: '28px 0', color: '#b0b0b8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73' }}>
                No activity yet at this stage.
              </div>
              <div style={{ fontSize: 11, color: '#b0b0b8', marginTop: 4 }}>
                Be the first to share a win.
              </div>
            </div>
          )}

          {posts.map(post => {
            const badge = TYPE_BADGE[post.post_type] ?? TYPE_BADGE['update'];
            const initials = (post.author_name || '?')
              .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            const isEnc = encouraged.has(post.id);
            const postColor = STAGE_COLORS[post.stage] ?? color;

            return (
              <div key={post.id} style={{
                background: '#fafafa', border: '1.5px solid #f0f0f5',
                borderRadius: 12, padding: '11px 13px',
                display: 'flex', flexDirection: 'column' as const, gap: 8,
                flexShrink: 0,
              }}>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: postColor, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#fff',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#1d1d1f',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {post.author_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' as const }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 999, background: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 10, color: '#c0c0c8' }}>{timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div style={{ fontSize: 12, color: '#3a3a3c', lineHeight: 1.65 }}>
                  {post.content}
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleEncourage(post.id)}
                  style={{
                    alignSelf: 'flex-start' as const,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 999,
                    border: `1.5px solid ${isEnc ? '#059669' : '#e5e5ea'}`,
                    background: isEnc ? '#f0fdf4' : '#fff',
                    color: isEnc ? '#059669' : '#6e6e73',
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  👍 {isEnc ? 'Encouraged!' : 'Encourage'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '9px 14px',
          borderTop: '1px solid #f0f0f5',
          flexShrink: 0, flexDirection: 'column' as const,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <div style={{ fontSize: 10, color: '#c0c0c8', textAlign: 'center' as const }}>
            Founders in {STAGE_LABELS[currentStage] ?? currentStage} stage
          </div>
        </div>
      </div>
    </>
  );
}
