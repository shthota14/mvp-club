import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ideasApi, communityApi } from '@/api/client';
import { STAGE_COLORS, type Stage, type Idea } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ['idea', 'hone', 'validate', 'shape', 'done'];

const STAGE_META: Record<Stage, { icon: string; label: string; stageNum: number }> = {
  idea:     { icon: '💡', label: 'Idea',     stageNum: 1 },
  hone:     { icon: '🎯', label: 'Hone',     stageNum: 2 },
  validate: { icon: '🧪', label: 'Validate', stageNum: 3 },
  shape:    { icon: '🔨', label: 'Shape',    stageNum: 4 },
  done:     { icon: '🚀', label: 'Ship',     stageNum: 5 },
};

const NEXT_STEPS: Record<Stage, { headline: string; desc: string; cta: string; ctaDest: 'work' | 'community' }> = {
  idea: {
    headline: 'Capture your idea',
    desc: 'Write your one-liner — what are you building and who is it for? A clear idea is your compass for every decision ahead.',
    cta: 'Start →',
    ctaDest: 'work',
  },
  hone: {
    headline: 'Sharpen your thinking',
    desc: 'Define the exact problem, the exact person, and why it matters. The more specific you are, the better.',
    cta: 'Continue honing →',
    ctaDest: 'work',
  },
  validate: {
    headline: 'Talk to real people',
    desc: 'Identify 3 specific people you can speak to about this problem today. Not categories — actual humans.',
    cta: 'Start validation →',
    ctaDest: 'work',
  },
  shape: {
    headline: 'Define your MVP',
    desc: "Strip everything that isn't essential. Pick 3 features max. Commit to what you're not building.",
    cta: 'Shape your MVP →',
    ctaDest: 'work',
  },
  done: {
    headline: 'You shipped!',
    desc: 'Share your MVP with the community, find your first users, and start measuring what matters.',
    cta: 'Share in community →',
    ctaDest: 'community',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const first = name.split(' ')[0];
  return `Good ${time}, ${first}.`;
}

function daysSinceUpdated(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentPost {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

// ── Stage Progress Track ───────────────────────────────────────────────────────

function StageTrack({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {STAGE_ORDER.map((stage, i) => {
        const meta = STAGE_META[stage];
        const color = STAGE_COLORS[stage];
        const isCurrent = i === currentIdx;
        const isDone = i < currentIdx;

        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: i < STAGE_ORDER.length - 1 ? '1' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: isCurrent ? 38 : 30,
                height: isCurrent ? 38 : 30,
                borderRadius: '50%',
                background: isCurrent ? color : isDone ? color : '#e5e5ea',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCurrent ? 17 : 13,
                boxShadow: isCurrent ? `0 0 0 5px ${color}22` : 'none',
                transition: 'all .2s',
                flexShrink: 0,
                opacity: isDone ? 0.45 : 1,
              }}>
                {isDone
                  ? <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</span>
                  : <span>{meta.icon}</span>
                }
              </div>
              <span style={{
                fontSize: 9, fontWeight: isCurrent ? 800 : 500,
                color: isCurrent ? color : '#c0c0c8',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {meta.label}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: i < currentIdx
                  ? `linear-gradient(90deg, ${STAGE_COLORS[stage]}66, ${STAGE_COLORS[STAGE_ORDER[i + 1]]}66)`
                  : '#e5e5ea',
                marginBottom: 20,
                marginLeft: 4, marginRight: 4,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── No Idea State ─────────────────────────────────────────────────────────────

function NoIdeaCard({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      border: '1.5px solid #e5e5ea',
      boxShadow: '0 8px 40px rgba(0,0,0,.06)',
      overflow: 'hidden', maxWidth: 520, width: '100%',
      textAlign: 'center', padding: '48px 40px',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>💡</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.8, fontFamily: 'var(--font-display)', color: '#1d1d1f', marginBottom: 8 }}>
        Start your first idea
      </div>
      <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, marginBottom: 32, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
        Every startup begins with a thought worth chasing.
      </div>
      <button
        onClick={onStart}
        style={{
          padding: '14px 32px', borderRadius: 100,
          background: '#1d1d1f', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', letterSpacing: -0.3,
        }}
      >
        Create your idea →
      </button>
    </div>
  );
}

// ── Main Journey Card ──────────────────────────────────────────────────────────

function JourneyCard({
  idea, recentPosts, onAction,
}: {
  idea: Idea; recentPosts: RecentPost[]; onAction: () => void;
}) {
  const stage = idea.stage as Stage;
  const meta = STAGE_META[stage];
  const next = NEXT_STEPS[stage];
  const color = STAGE_COLORS[stage];
  const stale = daysSinceUpdated(idea.updated_at);

  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      border: '1.5px solid #e5e5ea',
      boxShadow: '0 8px 40px rgba(0,0,0,.06)',
      overflow: 'hidden', maxWidth: 520, width: '100%',
    }}>
      {/* Stage color bar */}
      <div style={{ height: 5, background: color }} />

      <div style={{ padding: '28px 32px 32px' }}>
        {/* Stage badge + idle indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 100,
            background: `${color}15`,
            fontSize: 11, fontWeight: 700, color,
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            {meta.icon} {meta.label} · Stage {meta.stageNum} of 5
          </span>
          {stale >= 3 && (
            <span style={{ fontSize: 11, color: '#c0c0c8', fontWeight: 500 }}>
              {stale}d idle
            </span>
          )}
        </div>

        {/* Next step */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c8', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Your next step
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: -0.6,
          color: '#1d1d1f', marginBottom: 10,
          fontFamily: 'var(--font-display)', lineHeight: 1.25,
        }}>
          {next.headline}
        </div>
        <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.65, marginBottom: 28 }}>
          {next.desc}
        </div>

        {/* Idle nudge */}
        {stale >= 5 && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fde68a',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#92400e', marginBottom: 20, lineHeight: 1.5,
          }}>
            💬 It's been {stale} days. Even 20 minutes of progress beats waiting for the perfect moment.
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onAction}
          style={{
            width: '100%', padding: '15px', borderRadius: 12,
            background: color, color: '#fff',
            border: 'none', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: -0.3,
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {next.cta}
        </button>

      </div>

      {/* Recent community activity */}
      {recentPosts.length > 0 && (
        <div style={{ background: '#fafafa', borderTop: '1px solid #f0f0f5', padding: '16px 32px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            Recent activity on your idea
          </div>
          {recentPosts.slice(0, 2).map(post => (
            <div key={post.id} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#6e6e73', flexShrink: 0,
              }}>
                {post.author_name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#3a3a3c' }}>{post.author_name} </span>
                <span style={{ fontSize: 12, color: '#6e6e73' }}>
                  {post.content.replace(/\*\*/g, '').replace(/\[\[ASK_REF:\d+\]\]\n?/g, '').slice(0, 80)}
                  {post.content.length > 80 ? '…' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JourneyPage() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [ideas, setIdeas]             = useState<Idea[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await ideasApi.list();
        const all: Idea[] = res.data.ideas ?? [];
        if (!cancelled) setIdeas(all);

        const active = all.find(i => i.is_active && i.idea_status === 'active');
        if (active) {
          try {
            const pr = await communityApi.getIdeaPosts(active.id);
            const posts: RecentPost[] = (pr.data.posts ?? []).slice(-5).reverse();
            if (!cancelled) setRecentPosts(posts);
          } catch { /* non-fatal */ }
        }
      } catch { /* show empty state */ } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const activeIdea = ideas.find(i => i.is_active && i.idea_status === 'active')
    ?? ideas.find(i => i.idea_status === 'active');

  const handleAction = () => {
    if (!activeIdea) { navigate('/progress'); return; }
    const dest = NEXT_STEPS[activeIdea.stage as Stage].ctaDest;
    navigate(dest === 'community' ? '/community' : '/work');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#fafafa',
      }}>
        <div style={{ fontSize: 14, color: '#c0c0c8' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'linear-gradient(180deg, #f9f9fb 0%, #fff 60%)',
      paddingTop: 64,
    }}>
      <div style={{
        maxWidth: 600, margin: '0 auto',
        padding: '48px 24px 80px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Greeting */}
        <div style={{
          fontSize: 28, fontWeight: 700, letterSpacing: -0.8,
          color: '#1d1d1f', marginBottom: 4,
          fontFamily: 'var(--font-display)', textAlign: 'center',
        }}>
          {greeting(user?.name ?? 'there')}
        </div>
        <div style={{
          fontSize: 15, color: '#9ca3af', marginBottom: 40,
          fontStyle: 'italic', fontFamily: 'var(--font-display)', textAlign: 'center',
        }}>
          {activeIdea ? "Here's where you left off." : 'Ready to build something real?'}
        </div>

        {/* Stage progress track */}
        {activeIdea && <StageTrack currentStage={activeIdea.stage as Stage} />}

        {/* Main card */}
        {activeIdea
          ? <JourneyCard idea={activeIdea} recentPosts={recentPosts} onAction={handleAction} />
          : <NoIdeaCard onStart={() => navigate('/progress')} />
        }

        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Community', path: '/community' },
            { label: 'My Idea Vault', path: '/progress' },
            { label: 'Messages', path: '/messages' },
          ].map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: '8px 18px', borderRadius: 100,
                background: 'transparent', border: '1.5px solid #e5e5ea',
                fontSize: 13, fontWeight: 600, color: '#6e6e73',
                cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1d1d1f'; e.currentTarget.style.color = '#1d1d1f'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#6e6e73'; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
