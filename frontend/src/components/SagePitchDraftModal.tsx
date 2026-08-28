import { useState, useEffect } from 'react';
import type { Idea } from '@/types';
import { STAGE_LABELS, STAGE_COLORS } from '@/types';
import { pitchDeckApi } from '@/api/client';
import SageAvatar from './SageAvatar';

// ── Sage's narrative pitch draft ────────────────────────────────────────────
// Wires up the previously-dead "🎯 Pitch Draft" Quick Tool button (Shape
// stage, WorkPage.tsx) into a real Sage-drafted narrative companion to the
// deterministic "📊 Pitch Deck" .pptx export (IdeaDetailPage.tsx →
// pitchDeckApi.download → backend/src/routes/pitchdeck.ts). This modal is
// read-only and narrative, not a data-entry form — the actual editable
// business data still lives in the BMC/Hone/Validate steps and the .pptx
// export; Sage just helps the founder rehearse how they'd talk through it.
// One-shot generation (not a chat), same visual pattern as the Business
// Model Canvas "Ask Sage" tab and Validate step 7's discovery guide:
// SageAvatar + Caveat-voice copy + a single "🔄 Ask Sage" button, a
// "🧙 Sage is thinking…" loading state, and a plain-text "Ask Sage again"
// regenerate link once a draft exists.

interface PitchDraftSlide {
  id: string;
  title: string;
  hook: string;
  bullets: string[];
}

interface Props {
  idea: Idea;
  onClose: () => void;
}

// Same 15-slide order as the real .pptx export in pitchdeck.ts — kept here
// only as a per-section icon lookup for the read-only list below; the
// actual title/hook/bullets always come from the API response.
const SECTION_ICONS: Record<string, string> = {
  title: '🚀', vision: '🔭', problem: '🧩', solution: '💡', whyNow: '⏱️',
  market: '📈', validation: '🧪', businessModel: '💰', goToMarket: '📡',
  competition: '⚔️', roadmap: '🗺️', team: '👥', financials: '📊',
  fundingAsk: '🎯', closing: '🎬',
};

export default function SagePitchDraftModal({ idea, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [slides, setSlides]   = useState<PitchDraftSlide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [downloading, setDownloading]       = useState(false);
  const [downloadError, setDownloadError]   = useState<string | null>(null);
  const stageColor = STAGE_COLORS[idea.stage] ?? '#2563eb';

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await pitchDeckApi.generateDraft(idea.id);
      const list: PitchDraftSlide[] = Array.isArray(r.data?.slides) ? r.data.slides : [];
      if (!list.length) throw new Error('No draft came back — please try again.');
      setSlides(list);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not generate a draft right now — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await pitchDeckApi.download(idea.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${idea.name.replace(/[^a-z0-9]/gi, '_')}_pitch_deck.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Could not generate the pitch deck.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(9,9,20,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Modal container */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 401, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
        <div style={{
          width: '100%', maxWidth: 820,
          height: '100%', maxHeight: '88vh',
          background: '#f5f5f7',
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
          pointerEvents: 'all',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '0 20px', height: 64, flexShrink: 0,
            borderBottom: '1px solid #d2d2d7',
            background: '#ffffff',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${stageColor}, ${stageColor}aa, transparent)`, borderRadius: '20px 20px 0 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                🎯
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#111827', letterSpacing: -.4, lineHeight: 1 }}>Sage's Pitch Draft</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: .3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.name}</span>
              </div>
              <span style={{ width: 1, height: 22, background: '#e5e7eb', flexShrink: 0 }} />
              <span style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 20, background: `${stageColor}15`, color: stageColor, fontSize: 13, fontWeight: 700, border: `1px solid ${stageColor}25` }}>
                {STAGE_LABELS[idea.stage]}
              </span>
            </div>

            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f5f7', border: '1px solid #e5e7eb', color: '#6b7280', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              ✕
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!slides ? (
              <div style={{ background: '#fff', border: '1.5px solid #e5e5ea', borderRadius: 14, padding: '40px 24px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <SageAvatar size={144} />
                <div style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui", fontSize: 24, fontWeight: 700, color: '#1d1d1f' }}>
                  Ask Sage@MVP Club to draft your pitch
                </div>
                <div style={{ fontSize: 13, color: '#6e6e73', maxWidth: 460, lineHeight: 1.55 }}>
                  Sage reads your Business Model Canvas and idea notes, then writes a short spoken hook and a few talking points for each of the 15 slides in your pitch deck — something to rehearse from, not slide copy. Your canvas stays the source of truth; download the real deck any time below.
                </div>
                {error && <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>⚠️ {error}</div>}
                <button
                  onClick={runGenerate}
                  disabled={loading}
                  style={{ marginTop: 4, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? `${stageColor}80` : stageColor, color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}
                >
                  {loading ? '🧙 Sage is thinking…' : '🔄 Ask Sage'}
                </button>

                <div style={{ width: '100%', maxWidth: 460, marginTop: 18, paddingTop: 18, borderTop: '1px solid #eeeff6' }}>
                  {downloadError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>⚠️ {downloadError}</div>}
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    style={{ width: '100%', padding: '10px 18px', borderRadius: 10, border: '1.5px solid #d1d5db', cursor: downloading ? 'default' : 'pointer', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
                  >
                    {downloading ? '⏳ Generating…' : '📥 Download the deck as .pptx'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                  <SageAvatar size={40} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui", fontSize: 19, fontWeight: 700, color: '#1d1d1f' }}>
                      Sage's narrative draft is ready
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6e6e73' }}>{slides.length} slides · a hook + talking points for each — rehearse from these, or download the real deck</div>
                  </div>
                  <button
                    onClick={runGenerate}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: stageColor, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: loading ? 'default' : 'pointer' }}
                  >
                    {loading ? '🧙 Sage is thinking…' : '🔄 Ask Sage again'}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    style={{ padding: '9px 16px', borderRadius: 9, border: 'none', cursor: downloading ? 'default' : 'pointer', background: downloading ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                  >
                    {downloading ? '⏳ Generating…' : '📥 Download the deck as .pptx'}
                  </button>
                </div>
                {error && <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>⚠️ {error}</div>}
                {downloadError && <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>⚠️ {downloadError}</div>}

                {/* Slide-by-slide read-only list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {slides.map((s, i) => (
                    <div key={s.id} style={{ background: '#fff', border: '1.5px solid #e5e5ea', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
                      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                        {SECTION_ICONS[s.id] || '📄'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#b0b0b8', letterSpacing: .4 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: .4 }}>{s.title}</span>
                        </div>
                        {s.hook && (
                          <div style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui", fontSize: 20, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, marginBottom: s.bullets.length ? 6 : 0 }}>
                            "{s.hook}"
                          </div>
                        )}
                        {s.bullets.length > 0 && (
                          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {s.bullets.map((b, bi) => (
                              <li key={bi} style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{b}</li>
                            ))}
                          </ul>
                        )}
                        {!s.hook && s.bullets.length === 0 && (
                          <div style={{ fontSize: 12.5, color: '#b0b0b8', fontStyle: 'italic' }}>Sage didn't draft this section — try "Ask Sage again".</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '7px 20px',
            borderTop: '1px solid #d2d2d7',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, background: '#ffffff',
          }}>
            <div style={{ fontSize: 12, color: '#c0c0c8', fontWeight: 500 }}>
              🧙 Sage's talking points — the real editable data lives in your Business Model Canvas
            </div>
            <div style={{ fontSize: 12, color: '#c0c0c8', fontWeight: 500 }}>
              Esc to close · {idea.name}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
