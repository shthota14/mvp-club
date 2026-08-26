import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

// ── Design tokens (mirrors SurveyPage.tsx, the other public/no-auth page) ──────
const FF  = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif';
const T1  = '#0f0f13';
const T2  = '#6e6e73';
const T3  = '#b0b0b8';
const AC  = '#7c3aed';
const ACM = '#a78bfa';
const BG  = '#f7f7f9';

type BookInfo =
  | { status: 'booked'; ideaName: string; organizerName: string; scheduledAt: string; meetingLink: string; durationMins: number }
  | { status: 'no_availability'; ideaName: string; organizerName: string }
  | { status: 'open'; ideaName: string; organizerName: string; durationMins: number; timezone: string; slots: string[] };

function dayLabel(d: Date) {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function BookingPage() {
  const { token } = useParams<{ token: string }>();

  const [info,       setInfo]       = useState<BookInfo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [notFound,   setNotFound]   = useState(false);

  const [selected,   setSelected]   = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState('');
  const [booked,     setBooked]     = useState<{ scheduledAt: string; meetingLink: string } | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/book/${token}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Something went wrong.'); }
        return r.json();
      })
      .then(d => { if (d) setInfo(d); })
      .catch((e: Error) => setErrorMsg(e.message || 'Something went wrong.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  // Group open slots by local calendar day
  const slotsByDay = useMemo(() => {
    if (!info || info.status !== 'open') return [];
    const groups = new Map<string, Date[]>();
    for (const iso of info.slots) {
      const d = new Date(iso);
      const key = d.toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    return Array.from(groups.entries()).map(([key, dates]) => ({ key, date: dates[0], times: dates }));
  }, [info]);

  const handleConfirm = async () => {
    if (!token || !selected) return;
    setConfirming(true);
    setConfirmErr('');
    try {
      const res = await fetch(`/api/book/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: selected }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Slot likely got taken by someone else — refresh the list so they can pick again.
        setConfirmErr(d.error || 'Something went wrong — please try again.');
        setSelected(null);
        load();
        return;
      }
      setBooked({ scheduledAt: d.scheduledAt, meetingLink: d.meetingLink });
    } catch {
      setConfirmErr('Something went wrong — please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: `0 8px 24px ${AC}40` }}>📅</div>
        <div style={{ fontSize: 14, color: T2, fontWeight: 500 }}>Loading available times…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 10 }}>Booking link not found</div>
        <div style={{ fontSize: 14, color: T2, lineHeight: 1.7 }}>This link may have expired or been removed.</div>
      </div>
    </div>
  );

  if (errorMsg) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 10 }}>Can't load this booking page</div>
        <div style={{ fontSize: 14, color: T2, lineHeight: 1.7 }}>{errorMsg}</div>
      </div>
    </div>
  );

  if (!info) return null;

  // ── Success (just booked this session) ─────────────────────────────────────
  if (booked) {
    const d = new Date(booked.scheduledAt);
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${AC}18 0%,${BG} 50%)`, fontFamily: FF, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 16px 48px ${AC}50`, fontSize: 40 }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T1, marginBottom: 10 }}>{booked.meetingLink ? 'Your free video call is booked!' : "You're booked!"}</div>
          <div style={{ fontSize: 15, color: T2, lineHeight: 1.7, marginBottom: 24 }}>
            {d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
            {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — a calendar invite is on its way to your inbox.
          </div>
          <button onClick={() => window.close()}
            style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 12, border: 'none', background: AC, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 8px 24px ${AC}40` }}>
            Close
          </button>
          <div style={{ fontSize: 12, color: T2, marginTop: 12 }}>The video call link is in the calendar invite on its way to your inbox — you can close this tab now.</div>
        </div>
      </div>
    );
  }

  // ── Already booked (someone confirmed this earlier) ─────────────────────────
  if (info.status === 'booked') {
    const d = new Date(info.scheduledAt);
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${AC}18 0%,${BG} 50%)`, fontFamily: FF, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 16px 48px ${AC}50`, fontSize: 40 }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T1, marginBottom: 10 }}>{info.meetingLink ? 'This free video call is already booked' : 'This chat is already booked'}</div>
          <div style={{ fontSize: 15, color: T2, lineHeight: 1.7, marginBottom: 24 }}>
            {info.organizerName} — {d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
            {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </div>
          {info.meetingLink && (
            <a href={info.meetingLink} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 12, background: AC, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: `0 8px 24px ${AC}40` }}>
              Join call →
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── No availability set up yet ───────────────────────────────────────────────
  if (info.status === 'no_availability') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF, padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🗓️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 10 }}>No open times yet</div>
          <div style={{ fontSize: 14, color: T2, lineHeight: 1.7 }}>
            {info.organizerName} hasn't set their availability yet — check back soon, or reply to their email directly.
          </div>
        </div>
      </div>
    );
  }

  // ── Open slots ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: FF }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: `0 8px 24px ${AC}40`, fontSize: 24 }}>📅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 6 }}>
            Free {info.durationMins}-min video call with {info.organizerName}
          </div>
          <div style={{ fontSize: 14, color: T2, lineHeight: 1.6 }}>
            About &ldquo;{info.ideaName}&rdquo; — no cost to you, just pick a time that works. Times shown in your local time zone.
          </div>
        </div>

        {confirmErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
            {confirmErr}
          </div>
        )}

        {slotsByDay.length === 0 ? (
          <div style={{ textAlign: 'center', color: T2, fontSize: 14, padding: '40px 0' }}>
            No open times in the next couple weeks — check back soon.
          </div>
        ) : (
          // Single continuous scroll — no per-day card boxes. Each day is just a
          // sticky "— LABEL —" header (pinned to the top of the page background
          // as you scroll past it) followed by that day's time pills flowing
          // directly into the page, then straight into the next day's header.
          <div>
            {slotsByDay.map(({ key, date, times }) => (
              <div key={key} style={{ marginBottom: 22 }}>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 1, background: BG,
                  padding: '10px 0 10px', fontSize: 12, fontWeight: 800, color: AC, letterSpacing: 0.4,
                }}>
                  — {dayLabel(date).toUpperCase()} —
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {times.map(t => {
                    const iso = t.toISOString();
                    const isSel = selected === iso;
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelected(iso)}
                        style={{
                          padding: '9px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${isSel ? AC : '#e5e5ea'}`,
                          background: isSel ? AC : '#fff',
                          color: isSel ? '#fff' : T1,
                          transition: 'all .15s',
                        }}
                      >
                        {t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div style={{ position: 'sticky', bottom: 20, marginTop: 28, background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ fontSize: 13.5, color: T1, fontWeight: 600, lineHeight: 1.4 }}>
              {new Date(selected).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' at '}
              {new Date(selected).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                padding: '11px 22px', borderRadius: 10, background: confirming ? T3 : AC, color: '#fff',
                fontSize: 13.5, fontWeight: 700, border: 'none', cursor: confirming ? 'default' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {confirming ? 'Booking…' : 'Confirm time'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
