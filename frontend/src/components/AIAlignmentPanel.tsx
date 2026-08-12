import { useState } from 'react';
import InterviewResultCharts from './InterviewResultCharts';

const BORDER = '#e5e5ea';
const USER_INPUT_COLOR = '#2563eb';

// Shows the AI's read on an interview's alignment (confirmed / partial /
// not confirmed), its supporting evidence quotes, a mismatch callout when
// the AI's read differs from the founder's manual score, a chat thread for
// pushing back on the call, and a manual retry when no AI classification
// exists yet. Defined at module scope (not a function nested inside a
// parent's render) so its own useState hooks are safe: a component
// redefined on every parent render gets a new identity each time and React
// remounts it, tearing down local state/focus on every keystroke — see the
// 2026-07-24 WorkPage.tsx nested-component fix in project memory for the
// exact bug class this avoids.
export default function AIAlignmentPanel({ interview, qa, problemSentence, painPoints, assumptions, persona, onUpdate, allInterviews, get, onAnalyzed }: {
  interview: any;
  qa: { question: string; answer: string }[];
  problemSentence?: string;
  // Individual pain-point sentences (not the joined problemSentence string) —
  // lets the AI tag each evidence quote with which one it relates to, which
  // is how "Vera" (see frontend/src/utils/veraVerdicts.ts) derives her
  // per-pain-point verdicts without a second AI call.
  painPoints?: string[];
  // Individual assumption sentences (Validate step 3, "What are you
  // assuming?") — same mechanism as painPoints above: lets the AI tag each
  // evidence quote with which assumption it relates to, which is how
  // frontend/src/utils/assumptionVerdicts.ts derives an assumption's
  // Confirmed/Busted/Mixed read without the founder ever picking it
  // manually.
  assumptions?: string[];
  persona?: string;
  onUpdate: (interview: any) => void;
  // Full interview list + the idea's field accessor — needed for the result
  // charts' aggregate views (trend/distribution/progress/confidence). Both
  // optional so this component still works standalone (e.g. tests) without
  // them; charts about THIS interview alone still render either way.
  allInterviews?: any[];
  get?: (k: string) => string;
  // Fired once a fresh AI classification lands (manual "Analyze with AI" or
  // re-analyze) — separate from onUpdate so the parent can pop the one-time
  // "Analysis complete" modal only for a genuine new result, not every chat
  // reply in "Reason with the AI".
  onAnalyzed?: (interview: any) => void;
}) {
  const [chatDraft, setChatDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [err, setErr] = useState('');

  const aiScore: 1 | 2 | 3 | null = interview?.ai_alignment_score ?? null;
  const humanScore: number | null = interview?.alignment_score ?? null;
  const evidence: { quote: string; signal: 'positive' | 'negative' | 'neutral' }[] = Array.isArray(interview?.ai_evidence) ? interview.ai_evidence : [];
  const chatLog: { role: 'founder' | 'ai'; text: string }[] = Array.isArray(interview?.ai_chat_log) ? interview.ai_chat_log : [];
  const mismatched = aiScore != null && humanScore != null && aiScore !== humanScore;

  const scoreMeta = (s: number | null) =>
    s === 3 ? { label: 'Confirmed', icon: '✅', color: '#059669' }
    : s === 2 ? { label: 'Partial signal', icon: '◐', color: '#d97706' }
    : s === 1 ? { label: 'Not confirmed', icon: '❌', color: '#dc2626' }
    : { label: 'Not yet analyzed', icon: '🤖', color: '#94a3b8' };
  const aiMeta = scoreMeta(aiScore);

  const runClassify = async () => {
    if (!qa.length || analyzing) return;
    setAnalyzing(true); setErr('');
    try {
      const res = await fetch(`/api/interviews/${interview.id}/ai-classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mvpclub_token')}` },
        body: JSON.stringify({ problemSentence, painPoints, assumptions, persona, qa }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.interview) { onUpdate(data.interview); onAnalyzed?.(data.interview); }
      else setErr('Could not reach the AI — try again in a moment.');
    } catch {
      setErr('Could not reach the AI — try again in a moment.');
    } finally {
      setAnalyzing(false);
    }
  };

  const sendReason = async () => {
    if (!chatDraft.trim() || sending) return;
    const message = chatDraft.trim();
    setChatDraft(''); setSending(true); setErr('');
    try {
      const res = await fetch(`/api/interviews/${interview.id}/ai-reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mvpclub_token')}` },
        body: JSON.stringify({ message, problemSentence, persona, qa }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.interview) onUpdate(data.interview);
      else setErr('Could not reach the AI — try again.');
    } catch {
      setErr('Could not reach the AI — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ border: `1.5px solid ${aiMeta.color}30`, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, background: `${aiMeta.color}0a`, borderBottom: `1px solid ${aiMeta.color}20` }}>
        <span style={{ fontSize: 18, marginTop: 1 }}>{aiScore != null ? aiMeta.icon : '🤖'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: aiMeta.color }}>AI's read: {aiMeta.label}</div>
          {interview?.ai_reasoning && (
            <div style={{ fontSize: 11.5, color: '#444', marginTop: 3, lineHeight: 1.5 }}>{interview.ai_reasoning}</div>
          )}
        </div>
        {aiScore == null ? (
          <button onClick={runClassify} disabled={analyzing || !qa.length}
            style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', background: analyzing ? '#e5e5ea' : '#1d1d1f', color: '#fff', fontSize: 11, fontWeight: 700, cursor: analyzing ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            {analyzing ? 'Analyzing…' : '🤖 Analyze with AI'}
          </button>
        ) : (
          evidence.length > 0 && (
            <button onClick={() => setEvidenceOpen(o => !o)}
              style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', color: '#6e6e73', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
              {evidenceOpen ? 'Hide evidence' : 'Show evidence'}
            </button>
          )
        )}
      </div>

      {mismatched && (
        <div style={{ padding: '9px 14px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
          ⚠️ Your call ({scoreMeta(humanScore).label}) differs from the AI's read ({aiMeta.label}) — {interview?.ai_reasoning || 'see its reasoning above.'}
        </div>
      )}

      {evidenceOpen && evidence.length > 0 && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column' as const, gap: 6, borderBottom: `1px solid ${BORDER}` }}>
          {evidence.map((e, i) => {
            const c = e.signal === 'positive' ? '#059669' : e.signal === 'negative' ? '#dc2626' : '#6e6e73';
            return (
              <div key={i} style={{ fontSize: 11.5, color: c, paddingLeft: 10, borderLeft: `2px solid ${c}`, lineHeight: 1.5 }}>"{e.quote}"</div>
            );
          })}
        </div>
      )}

      {aiScore != null && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Reason with the AI</div>
          {chatLog.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, maxHeight: 220, overflowY: 'auto' as const }}>
              {chatLog.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'founder' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', padding: '7px 11px', borderRadius: 10, fontSize: 12, lineHeight: 1.4,
                  background: m.role === 'founder' ? '#eef2ff' : '#f5f5f7',
                  color: '#1d1d1f',
                }}>
                  {m.text}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={chatDraft}
              onChange={e => setChatDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReason(); } }}
              placeholder="Disagree with the AI? Tell it why…"
              style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: USER_INPUT_COLOR }}
            />
            <button onClick={sendReason} disabled={sending || !chatDraft.trim()}
              style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 8, border: 'none', background: !chatDraft.trim() || sending ? '#e5e5ea' : '#1d1d1f', color: '#fff', fontSize: 12, fontWeight: 700, cursor: sending || !chatDraft.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {sending ? '…' : 'Send'}
            </button>
          </div>
          {err && <div style={{ fontSize: 11, color: '#dc2626' }}>{err}</div>}
        </div>
      )}

      {aiScore != null && get && (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 }}>Result charts</div>
          <InterviewResultCharts interview={interview} allInterviews={allInterviews && allInterviews.length ? allInterviews : [interview]} get={get} />
        </div>
      )}
    </div>
  );
}
