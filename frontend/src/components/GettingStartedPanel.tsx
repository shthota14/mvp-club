import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ideasApi, communityApi } from '@/api/client';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  onboardingDone: boolean;
}

interface Progress {
  hasIdea: boolean;
  hasOneLiner: boolean;
  completedIdea: boolean;  // hone entries exist
  hasPosted: boolean;
  loaded: boolean;
}

const MILESTONES = [
  { id: 'account',  label: 'Create your account',       link: undefined,     tip: '' },
  { id: 'idea',     label: 'Add your first idea',        link: '/work',       tip: 'Start your idea →' },
  { id: 'oneliner', label: 'Write your one-liner',       link: '/work',       tip: 'Go to Work →' },
  { id: 'stage',    label: 'Complete the Idea stage',    link: '/work',       tip: 'Go to Work →' },
  { id: 'post',     label: 'Post in Community',          link: '/community',  tip: 'Go to Community →' },
] as const;

export default function GettingStartedPanel({ onboardingDone }: Props) {
  const { user, ideas } = useApp();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);
  const [progress, setProgress] = useState<Progress>({
    hasIdea: false, hasOneLiner: false, completedIdea: false, hasPosted: false, loaded: false,
  });

  const dismissKey  = user ? `mvpclub_gsp_dismissed_${user.id}` : null;
  const [dismissed, setDismissed] = useState(() =>
    dismissKey ? !!localStorage.getItem(dismissKey) : true
  );

  const activeIdea = ideas.find(i => i.is_active) ?? ideas[0] ?? null;

  // Load progress once user + ideas ready
  useEffect(() => {
    if (!onboardingDone || !user || dismissed) return;

    let cancelled = false;
    const load = async () => {
      let hasOneLiner    = false;
      let completedIdea  = false;
      let hasPosted      = false;

      if (activeIdea) {
        try {
          const res    = await ideasApi.getEntries(activeIdea.id);
          const entries: { stage: string; field_key: string; content: string }[] = res.data.entries ?? [];
          hasOneLiner   = entries.some(e => e.field_key === 'oneLiner' && e.content?.trim());
          completedIdea = entries.some(e => e.stage === 'hone');
        } catch {}
      }

      try {
        const res   = await communityApi.listPosts();
        const posts: { user_id: string }[] = res.data.posts ?? [];
        hasPosted   = posts.some(p => p.user_id === user.id);
      } catch {}

      if (!cancelled) {
        setProgress({
          hasIdea: ideas.length > 0,
          hasOneLiner,
          completedIdea,
          hasPosted,
          loaded: true,
        });
      }
    };

    load();
    return () => { cancelled = true; };
  }, [onboardingDone, user?.id, dismissed, ideas.length, activeIdea?.id]);

  const done = (id: typeof MILESTONES[number]['id']) => {
    if (id === 'account')  return true;
    if (id === 'idea')     return progress.hasIdea;
    if (id === 'oneliner') return progress.hasOneLiner;
    if (id === 'stage')    return progress.completedIdea;
    if (id === 'post')     return progress.hasPosted;
    return false;
  };

  const doneCount = MILESTONES.filter(m => done(m.id)).length;
  const allDone   = doneCount === MILESTONES.length;

  // Auto-dismiss when all done
  useEffect(() => {
    if (!allDone || !progress.loaded) return;
    const t = setTimeout(() => {
      if (dismissKey) localStorage.setItem(dismissKey, 'true');
      setDismissed(true);
    }, 3500);
    return () => clearTimeout(t);
  }, [allDone, progress.loaded]);

  // Re-check when user navigates back (focus event)
  useEffect(() => {
    if (!onboardingDone || !user || dismissed || !activeIdea) return;
    const refresh = () => {
      setProgress(p => ({ ...p, loaded: false }));
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [onboardingDone, user?.id, dismissed, activeIdea?.id]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  };

  // Don't show if not ready, dismissed, or user is admin
  if (!user || user.is_admin || !onboardingDone || dismissed || !progress.loaded) return null;

  // On mobile, hide when bottom tab bar is visible to avoid overlap
  if (isMobile) return null;

  // ── Collapsed chip ──────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 300,
          background: '#1d1d1f', color: '#fff', border: 'none',
          borderRadius: 999, padding: '10px 18px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        🚀 Getting started
        <span style={{
          background: '#34c759', color: '#fff',
          borderRadius: 10, fontSize: 10, fontWeight: 800,
          padding: '1px 7px', letterSpacing: 0,
        }}>
          {doneCount}/{MILESTONES.length}
        </span>
      </button>
    );
  }

  // ── Expanded panel ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 300,
      width: 304,
      background: '#fff', borderRadius: 16,
      boxShadow: '0 8px 36px rgba(0,0,0,0.18)',
      border: '1px solid #e5e5ea',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#1d1d1f', padding: '13px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            🚀 Getting started
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {doneCount} of {MILESTONES.length} done
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setExpanded(false)}
            title="Minimise"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
          >
            −
          </button>
          <button
            onClick={handleDismiss}
            title="Dismiss forever"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#f0f0f5' }}>
        <div style={{
          height: '100%',
          width: `${(doneCount / MILESTONES.length) * 100}%`,
          background: '#34c759',
          transition: 'width .5s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      {/* Milestones */}
      <div style={{ padding: '6px 0 4px' }}>
        {MILESTONES.map(m => {
          const isDone  = done(m.id);
          const canClick = !isDone && !!m.link;
          return (
            <div
              key={m.id}
              onClick={() => canClick && m.link && navigate(m.link)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 16px',
                cursor: canClick ? 'pointer' : 'default',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (canClick) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Check circle */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#34c759' : 'transparent',
                border: isDone ? 'none' : '1.5px solid #d2d2d7',
                fontSize: 10, color: '#fff', fontWeight: 800,
                transition: 'all .2s',
              }}>
                {isDone ? '✓' : ''}
              </div>

              {/* Label */}
              <span style={{
                flex: 1, fontSize: 13, color: isDone ? '#aeaeb2' : '#1d1d1f',
                fontWeight: 500,
                textDecoration: isDone ? 'line-through' : 'none',
                textDecorationColor: '#d2d2d7',
              }}>
                {m.label}
              </span>

              {/* CTA arrow */}
              {canClick && (
                <span style={{ fontSize: 11, color: '#007aff', fontWeight: 600, flexShrink: 0 }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* All-done banner */}
      {allDone && (
        <div style={{
          margin: '0 12px 12px',
          padding: '10px 14px',
          background: '#f0fdf4', borderRadius: 10,
          border: '1px solid #bbf7d0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
            🎉 You're all set! Great start.
          </div>
          <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 2 }}>
            This panel will close in a moment
          </div>
        </div>
      )}
    </div>
  );
}
