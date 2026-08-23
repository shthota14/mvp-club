import { useState, useEffect, useCallback } from 'react';
import { ideasApi, interviewsApi, recordingsApi } from '@/api/client';
import InterviewScriptCard, { InterviewResponseSheet } from './InterviewScriptCard';
import { InterviewRecording } from './InterviewAudio';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Interview Hub ─────────────────────────────────────────────────────────────
// Global quick access to the interview script and every interview, from any
// page. Each interview gets its own tab with a structured response sheet:
// question-by-question signals, quotes, voice notes, and the inference read.

const VC = '#059669';
const BORDER = '#e5e5ea';
const T1 = '#1d1d1f';
const T2 = '#6e6e73';
const T3 = '#aeaeb2';

// Interviews are a Validate-stage tool — don't surface the floater during
// Idea/Hone, before there's a working idea to interview people about. Checked
// against EVERY idea, not just whichever one happens to be flagged "active" —
// founders often juggle several ideas at once, and the active one can easily
// be an earlier-stage idea while a different one has already reached Validate.
const STAGES_WITH_INTERVIEWS = new Set(['validate', 'shape', 'done']);

interface Idea {
  id: string;
  name: string;
  is_active: boolean;
  stage: string;
  idea_status?: string;
}

interface Interview {
  id: string;
  interviewee_name: string;
  interviewee_role: string;
  scheduled_at: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  key_insights: string;
  meeting_link?: string;
  alignment_score?: number | null;
}

const ALIGN_BADGE = (score: number | null | undefined) =>
  score === 3 ? { icon: '✅', label: 'Confirmed',     color: '#059669', bg: '#f0fdf4' }
  : score === 2 ? { icon: '◐', label: 'Partial',       color: '#d97706', bg: '#fffbeb' }
  : score === 1 ? { icon: '❌', label: 'Not confirmed', color: '#dc2626', bg: '#fef2f2' }
  :               { icon: '⬜', label: 'Not scored',    color: '#8e8e93', bg: '#f5f5f7' };

const STATUS_STYLE: Record<Interview['status'], { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Scheduled',   color: '#2563eb', bg: '#eff6ff' },
  in_progress: { label: 'In progress', color: '#d97706', bg: '#fffbeb' },
  completed:   { label: 'Completed',   color: '#059669', bg: '#f0fdf4' },
  cancelled:   { label: 'Cancelled',   color: '#8e8e93', bg: '#f5f5f7' },
};

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Not scheduled';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function InterviewHub() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'script' | 'interviews'>('script');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaId, setIdeaId] = useState<string>('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIvId, setSelectedIvId] = useState<string | null>(null);
  const [captureIv, setCaptureIv] = useState<Interview | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftInsights, setDraftInsights] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [recsByIv, setRecsByIv] = useState<Record<string, InterviewRecording[]>>({});
  const [showRawNotes, setShowRawNotes] = useState(false);

  // Load ideas on mount so the floating button can show live progress
  useEffect(() => {
    ideasApi.list().then(r => {
      const list: Idea[] = (r.data.ideas || []).filter((i: Idea) => i.idea_status !== 'archived');
      setIdeas(list);
      const active = list.find(i => i.is_active) || list[0];
      // Default to the active idea only if it's actually reached Validate+;
      // otherwise default to whichever idea has, so opening the hub doesn't
      // land on an idea that has no script/interviews to show yet.
      const validateIdea = list.find(i => STAGES_WITH_INTERVIEWS.has(i.stage));
      const initial = (active && STAGES_WITH_INTERVIEWS.has(active.stage)) ? active : (validateIdea || active);
      if (initial) setIdeaId(initial.id);
    }).catch(() => {});
  }, []);

  const fetchInterviews = useCallback(() => {
    if (!ideaId) return;
    setLoading(true);
    interviewsApi.list(ideaId)
      .then(r => setInterviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ideaId]);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);
  useEffect(() => { if (open) fetchInterviews(); }, [open]); // refresh on every open

  // Keep a valid selected tab; sync draft editors to the selected interview
  useEffect(() => {
    if (!interviews.length) { setSelectedIvId(null); return; }
    if (!selectedIvId || !interviews.some(iv => iv.id === selectedIvId)) {
      selectInterview(interviews[0]);
    }
  }, [interviews]);

  const selectInterview = (iv: Interview) => {
    setSelectedIvId(iv.id);
    setDraftNotes(iv.notes || '');
    setDraftInsights(iv.key_insights || '');
    setShowRawNotes(false);
    if (!recsByIv[iv.id]) {
      recordingsApi.list(iv.id)
        .then(r => setRecsByIv(m => ({ ...m, [iv.id]: Array.isArray(r.data) ? r.data : [] })))
        .catch(() => {});
    }
  };

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const activeIdea = ideas.find(i => i.id === ideaId);
  const selectedIv = interviews.find(iv => iv.id === selectedIvId) || null;
  const readyToShow = ideas.some(i => STAGES_WITH_INTERVIEWS.has(i.stage));

  const saveInterview = async (iv: Interview) => {
    setSavingId(iv.id);
    try {
      await interviewsApi.update(iv.id, { notes: draftNotes, key_insights: draftInsights });
      setInterviews(list => list.map(x => x.id === iv.id ? { ...x, notes: draftNotes, key_insights: draftInsights } : x));
    } catch { /* keep drafts so nothing is lost */ }
    setSavingId(null);
  };

  const addInterview = async () => {
    const name = newName.trim();
    if (!name || !ideaId) return;
    try {
      const r = await interviewsApi.create({ idea_id: ideaId, interviewee_name: name });
      setNewName('');
      setInterviews(list => [...list, r.data]);
      selectInterview(r.data);
    } catch { /* noop */ }
  };

  const useScriptWith = (iv: Interview) => {
    setCaptureIv(iv);
    setTab('script');
  };

  const saveCaptureInsights = async (text: string, suggestedAlignment?: 1 | 2 | 3) => {
    if (!captureIv) return;
    const merged = captureIv.key_insights ? `${captureIv.key_insights}\n\n${text}` : text;
    try {
      const patch: Record<string, unknown> = { key_insights: merged, status: 'completed' };
      if (suggestedAlignment) {
        patch.alignment_score = suggestedAlignment;
        patch.confirmed_problem = suggestedAlignment === 3;
      }
      await interviewsApi.update(captureIv.id, patch);
      setInterviews(list => list.map(x => x.id === captureIv.id
        ? { ...x, key_insights: merged, status: 'completed', ...(suggestedAlignment ? { alignment_score: suggestedAlignment } : {}) }
        : x));
      setCaptureIv(c => c ? { ...c, key_insights: merged } : c);
    } catch { /* noop */ }
  };

  const doneCount = interviews.filter(iv => iv.status === 'completed').length;

  return (
    <>
      {/* ── Floating access button — only once at least one idea has reached Validate+ ── */}
      {!open && readyToShow && (
        <button
          onClick={() => setOpen(true)}
          title="Interview Hub — script & interviews"
          style={{
            // bottom offset clears the GettingStartedPanel bubble (bottom 24) and the mobile tab bar
            position: 'fixed', right: 20, bottom: isMobile ? 92 : 84, zIndex: 900,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '12px 14px' : '12px 18px',
            borderRadius: 999, border: 'none', cursor: 'pointer',
            background: VC, color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            boxShadow: '0 6px 20px rgba(5,150,105,.35)',
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>🎙️</span>
          {!isMobile && <span>Interviews{interviews.length ? ` · ${doneCount}/${interviews.length}` : ''}</span>}
        </button>
      )}

      {/* ── Drawer ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.35)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: isMobile ? '100%' : 560, maxWidth: '100vw',
            background: '#f5f5f7', display: 'flex', flexDirection: 'column',
            boxShadow: '-12px 0 40px rgba(0,0,0,.18)',
          }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '14px 18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>🎙️</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T1, letterSpacing: -0.3 }}>Interview Hub</div>
                    {ideas.length > 1 ? (
                      <select
                        value={ideaId}
                        onChange={e => { setIdeaId(e.target.value); setSelectedIvId(null); setCaptureIv(null); }}
                        style={{ fontSize: 11, color: T2, border: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0, cursor: 'pointer', maxWidth: 240 }}
                      >
                        {ideas.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    ) : (
                      <div style={{ fontSize: 11, color: T2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                        {activeIdea?.name || 'No idea yet'}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${BORDER}`, background: '#fff', color: T2, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>✕</button>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 2, marginTop: 12 }}>
                {([
                  { k: 'script' as const, label: '📝 Script' },
                  { k: 'interviews' as const, label: `🗣️ Interviews${interviews.length ? ` (${interviews.length})` : ''}` },
                ]).map(t => (
                  <button key={t.k} onClick={() => setTab(t.k)} style={{
                    padding: '9px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: tab === t.k ? 700 : 500,
                    color: tab === t.k ? VC : T2,
                    background: 'transparent',
                    borderBottom: `2.5px solid ${tab === t.k ? VC : 'transparent'}`,
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {!ideaId && (
                <div style={{ textAlign: 'center', color: T2, fontSize: 13, padding: '40px 20px' }}>
                  Create an idea first — your interview script is generated from it.
                </div>
              )}

              {/* ── Script tab ── */}
              {ideaId && tab === 'script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {captureIv && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '9px 12px' }}>
                      <span style={{ fontSize: 15 }}>🎤</span>
                      <div style={{ flex: 1, fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
                        Capturing live for <strong>{captureIv.interviewee_name}</strong> — chip answers save to their insights.
                      </div>
                      <button onClick={() => setCaptureIv(null)} style={{ border: 'none', background: 'none', color: '#166534', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Stop ✕</button>
                    </div>
                  )}
                  <InterviewScriptCard
                    key={`${ideaId}-${captureIv?.id ?? 'view'}`}
                    ideaId={ideaId}
                    captureMode={!!captureIv}
                    interviewId={captureIv?.id}
                    intervieweeName={captureIv?.interviewee_name}
                    onSaveInsights={captureIv ? saveCaptureInsights : undefined}
                  />
                </div>
              )}

              {/* ── Interviews tab: one tab per person, structured response sheet ── */}
              {ideaId && tab === 'interviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Quick add */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addInterview(); }}
                      placeholder="Add someone to interview…"
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
                    />
                    <button onClick={addInterview} disabled={!newName.trim()} style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none', cursor: newName.trim() ? 'pointer' : 'default',
                      background: newName.trim() ? VC : '#d2d2d7', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    }}>+ Add</button>
                  </div>

                  {loading && <div style={{ textAlign: 'center', color: T3, fontSize: 12, padding: 20 }}>Loading…</div>}
                  {!loading && interviews.length === 0 && (
                    <div style={{ textAlign: 'center', color: T2, fontSize: 13, padding: '30px 20px', background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}` }}>
                      No interviews yet. Add someone above — then open the Script tab when you talk to them.
                    </div>
                  )}

                  {/* Interviewee tab strip */}
                  {interviews.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                      {interviews.map(iv => {
                        const ab = ALIGN_BADGE(iv.alignment_score);
                        const sel = iv.id === selectedIvId;
                        return (
                          <button key={iv.id} onClick={() => selectInterview(iv)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                            padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                            border: `1.5px solid ${sel ? VC : BORDER}`,
                            background: sel ? VC : '#fff',
                            color: sel ? '#fff' : T1,
                            fontSize: 12, fontWeight: sel ? 800 : 600,
                            transition: 'all .12s',
                          }}>
                            <span style={{ fontSize: 12 }}>{ab.icon}</span>
                            {iv.interviewee_name?.split(' ')[0] || 'Unnamed'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected interview panel */}
                  {selectedIv && (() => {
                    const iv = selectedIv;
                    const ab = ALIGN_BADGE(iv.alignment_score);
                    const st = STATUS_STYLE[iv.status] || STATUS_STYLE.scheduled;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Person header */}
                        <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontSize: 14.5, fontWeight: 800, color: T1 }}>
                                {iv.interviewee_name || 'Unnamed'}
                                {iv.interviewee_role && <span style={{ fontWeight: 500, color: T2, fontSize: 12.5 }}> · {iv.interviewee_role}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>{fmtWhen(iv.scheduled_at)}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: ab.bg, color: ab.color }}>{ab.icon} {ab.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' as const }}>
                            <button onClick={() => useScriptWith(iv)} style={{
                              padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                              background: VC, color: '#fff', fontSize: 12, fontWeight: 700,
                            }}>🎤 Use script with {iv.interviewee_name?.split(' ')[0] || 'them'}</button>
                            {iv.meeting_link && (
                              <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{
                                padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${VC}40`, color: VC,
                                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                              }}>📹 Join meeting</a>
                            )}
                          </div>
                        </div>

                        {/* Structured question-by-question response sheet */}
                        <InterviewResponseSheet
                          ideaId={ideaId}
                          interviewId={iv.id}
                          recordings={recsByIv[iv.id] || []}
                          onDeleteRecording={id => setRecsByIv(m => ({ ...m, [iv.id]: (m[iv.id] || []).filter(x => x.id !== id) }))}
                        />

                        {/* Key insights (saved summary — travels with the interview) */}
                        <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' as const, color: T3 }}>Key insights</div>
                            <button onClick={() => setShowRawNotes(v => !v)} style={{ border: 'none', background: 'none', color: VC, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {showRawNotes ? 'Done editing' : '✏️ Edit'}
                            </button>
                          </div>
                          {showRawNotes ? (
                            <>
                              <textarea value={draftInsights} onChange={e => setDraftInsights(e.target.value)} rows={5}
                                placeholder="What surprised you? What confirmed or killed an assumption?"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical', background: '#fbfbfd', marginBottom: 8 }} />
                              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' as const, color: T3, marginBottom: 4 }}>Notes</div>
                              <textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} rows={3}
                                placeholder="What happened in the conversation…"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical', background: '#fbfbfd', marginBottom: 8 }} />
                              <button onClick={() => saveInterview(iv)} disabled={savingId === iv.id} style={{
                                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                background: savingId === iv.id ? '#d2d2d7' : T1, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                              }}>{savingId === iv.id ? 'Saving…' : 'Save'}</button>
                            </>
                          ) : (
                            <div style={{ fontSize: 12.5, color: iv.key_insights ? '#374151' : T3, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>
                              {iv.key_insights || 'Nothing saved yet — capture signals via the script, or hit Edit to type.'}
                              {iv.notes ? `\n\n— Notes —\n${iv.notes}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
