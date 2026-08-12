import { useState, useRef, useEffect } from 'react';
import { recordingsApi } from '@/api/client';

// ── Interview audio: reusable recorder + playback ─────────────────────────────
// RecorderButton — records via MediaRecorder and uploads to the backend.
//   questionN = null → whole-interview recording; 1–7 → per-question voice note.
// RecordingRow — lazy-loads the audio blob on first play, with delete.

export interface InterviewRecording {
  id: string;
  interview_id: string;
  question_n: number | null;
  mime: string;
  duration_ms: number | null;
  size_bytes: number | null;
  created_at: string;
}

const GREEN = '#059669';
const RED = '#dc2626';

export function fmtDur(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function RecorderButton({ interviewId, questionN = null, compact = false, label, onSaved }: {
  interviewId: string;
  questionN?: number | null;
  compact?: boolean;
  label?: string;
  onSaved: (rec: InterviewRecording) => void;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading' | 'denied'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop cleanly if unmounted mid-recording
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stream.getTracks().forEach(t => t.stop());
      try { recRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) { setState('idle'); return; }
        setState('uploading');
        try {
          const r = await recordingsApi.upload(interviewId, blob, {
            questionN,
            durationMs: Date.now() - startedRef.current,
          });
          onSaved(r.data);
        } catch { /* upload failed — recording lost; keep UX simple */ }
        setState('idle');
        setElapsed(0);
      };
      rec.start(1000); // gather chunks every second so long recordings survive
      recRef.current = rec;
      startedRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(Date.now() - startedRef.current), 500);
      setState('recording');
    } catch {
      setState('denied');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const stop = () => { try { recRef.current?.stop(); } catch { setState('idle'); } };

  const recording = state === 'recording';
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
    border: `1.5px solid ${recording ? RED : state === 'denied' ? RED : '#d1d5db'}`,
    background: recording ? '#fef2f2' : '#fff',
    color: recording ? RED : state === 'denied' ? RED : '#374151',
    padding: compact ? '5px 10px' : '8px 14px',
    fontSize: compact ? 11 : 12.5,
    transition: 'all .15s',
  };

  if (state === 'uploading') {
    return <span style={{ ...base, cursor: 'default', color: GREEN, borderColor: `${GREEN}60` }}>⏳ Saving…</span>;
  }
  if (state === 'denied') {
    return <span style={{ ...base, cursor: 'default' }}>🚫 Mic blocked</span>;
  }
  return (
    <button onClick={recording ? stop : start} style={base} title={recording ? 'Stop and save' : 'Record audio'}>
      {recording
        ? <><span style={{ width: 8, height: 8, borderRadius: 2, background: RED, animation: 'ivhub-pulse 1s infinite' }} /> Stop · {fmtDur(elapsed)}</>
        : <>🎙️ {label ?? 'Record'}</>}
      <style>{'@keyframes ivhub-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }'}</style>
    </button>
  );
}

export function RecordingRow({ rec, onDeleted, dense = false }: {
  rec: InterviewRecording;
  onDeleted: (id: string) => void;
  dense?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    if (url || loading) return;
    setLoading(true);
    try {
      const r = await recordingsApi.audioBlob(rec.id);
      setUrl(URL.createObjectURL(r.data));
    } catch { /* noop */ }
    setLoading(false);
  };

  const del = async () => {
    setDeleting(true);
    try { await recordingsApi.remove(rec.id); onDeleted(rec.id); } catch { setDeleting(false); }
  };

  const when = new Date(rec.created_at);
  const whenLabel = isNaN(when.getTime()) ? '' : when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: dense ? '5px 8px' : '7px 10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      {url ? (
        <audio controls src={url} style={{ height: 28, flex: 1, minWidth: 0 }} />
      ) : (
        <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: dense ? 11.5 : 12.5, fontWeight: 600, color: GREEN, padding: 0, flex: 1, textAlign: 'left' as const }}>
          {loading ? '⏳ Loading…' : '▶️ Play'}
          <span style={{ color: '#6b7280', fontWeight: 500 }}>
            {rec.question_n ? `Q${rec.question_n} note` : 'Full interview'}
            {rec.duration_ms ? ` · ${fmtDur(rec.duration_ms)}` : ''}
            {whenLabel ? ` · ${whenLabel}` : ''}
          </span>
        </button>
      )}
      <button onClick={del} disabled={deleting} title="Delete recording" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: dense ? 11 : 12, fontFamily: 'inherit', flexShrink: 0 }}>
        {deleting ? '…' : '🗑'}
      </button>
    </div>
  );
}
