import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { feedbackApi } from '@/api/client';

// ── Global feedback / feature-request / bug-report widget ──────────────────
// Mounted once in AppShell.tsx so it's visible on every page. Opens from the
// "?" header menu's "Feedback" item (AppShell.tsx) — it used to also have its
// own persistent floating tab on the right edge, but that was redundant with
// the header entry point and, on mobile, overlapped page content; removed
// 2026-09-05 in favor of a single entry point.
// Submissions go to a private, admin-only inbox — see backend/src/routes/
// feedback.ts and the Feedback tab in AdminPage.tsx.

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { key: 'feature',     label: '💡 Feature idea', placeholder: 'What would you like to see?' },
  { key: 'bug',         label: '🐞 Bug',           placeholder: "What went wrong? Steps to reproduce help a lot." },
  { key: 'improvement', label: '✨ Improvement',   placeholder: 'What could work better?' },
  { key: 'feedback',    label: '💬 Feedback',      placeholder: "Anything on your mind — we're listening." },
] as const;

type Category = typeof CATEGORIES[number]['key'];

const COLOR = '#8b5cf6';
const PANEL_W = 320;

export default function FeedbackWidget({ open, onOpenChange }: Props) {
  const location = useLocation();
  const [category, setCategory]   = useState<Category>('feature');
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  const reset = () => {
    setCategory('feature');
    setMessage('');
    setSubmitted(false);
    setError('');
  };

  const close = () => {
    onOpenChange(false);
    // Wait out the slide-out transition before resetting so it doesn't flash
    setTimeout(reset, 300);
  };

  const submit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await feedbackApi.submit({ category, message: message.trim(), page_context: location.pathname });
      setSubmitted(true);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const active = CATEGORIES.find(c => c.key === category)!;

  return (
    <>
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
        {/* Header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f0f0f5',
          flexShrink: 0,
          background: `linear-gradient(135deg, ${COLOR}12 0%, ${COLOR}04 100%)`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: COLOR, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3 }}>
              💬 We're listening
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>
              Request a feature, report a bug, or tell us what's on your mind
            </div>
          </div>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer', padding: 2, lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {submitted ? (
            <div style={{ textAlign: 'center' as const, padding: '32px 8px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🙏</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1d1d1f', marginBottom: 6 }}>Thanks — got it!</div>
              <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: 16 }}>
                Your note was sent straight to the team.
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${COLOR}40`,
                  background: `${COLOR}08`, color: COLOR, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              {/* Category selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {CATEGORIES.map(c => {
                  const sel = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      style={{
                        padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', border: `1.5px solid ${sel ? COLOR : '#e5e5ea'}`,
                        background: sel ? `${COLOR}12` : '#fff', color: sel ? COLOR : '#6e6e73',
                        fontFamily: 'inherit', transition: 'all .12s',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                placeholder={active.placeholder}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${COLOR}40`, fontSize: 12, lineHeight: 1.6,
                  resize: 'vertical' as const, outline: 'none', fontFamily: 'inherit',
                  background: '#fff', color: '#1d1d1f', boxSizing: 'border-box' as const,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = COLOR)}
                onBlur={e => (e.currentTarget.style.borderColor = `${COLOR}40`)}
              />

              {error && (
                <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{error}</div>
              )}

              <button
                onClick={submit}
                disabled={!message.trim() || submitting}
                style={{
                  padding: '10px 0', borderRadius: 10, border: 'none',
                  background: message.trim() ? COLOR : '#e5e5ea',
                  color: message.trim() ? '#fff' : '#b0b0b8',
                  fontSize: 13, fontWeight: 700,
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Sending…' : 'Send to the team →'}
              </button>

              <div style={{ fontSize: 10, color: '#c0c0c8', textAlign: 'center' as const, lineHeight: 1.5 }}>
                Goes straight to the MVP Club team — not shared publicly.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
