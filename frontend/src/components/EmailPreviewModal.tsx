import { useState, useEffect } from 'react';
import { validationApi } from '@/api/client';

const T1 = '#1d1d1f'; const T2 = '#6e6e73'; const T3 = '#b0b0b8'; const BORDER = '#e5e5ea';

interface Props {
  // Single-contact send when this has one id, bulk send when it has several
  // — both hit the same preview endpoint (keyed off the first id, since
  // subject/message defaults only vary by idea + organizer, not by contact).
  contactIds: string[];
  recipientLabel: string;
  durationMins: number;
  problem?: string;
  accentColor: string;
  onClose: () => void;
  onSent: (result: any) => void;
}

// Lets a founder see and edit the meeting-request email — subject and the
// opening message — before it actually goes out. The greeting, booking
// link, and sign-off stay auto-generated (shown here as a fixed preview
// block) so a badly-timed edit can never break the actual booking link.
export default function EmailPreviewModal({
  contactIds,
  recipientLabel,
  durationMins,
  problem,
  accentColor,
  onClose,
  onSent,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [toName, setToName] = useState('');
  const [toEmail, setToEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');

  const firstContactId = contactIds[0];
  const isBulk = contactIds.length > 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadErr('');
    (async () => {
      try {
        const r = await validationApi.previewMeetingRequest(firstContactId, { duration_mins: durationMins });
        if (cancelled) return;
        setSubject(r.data.subject || '');
        setMessage(r.data.message || '');
        setToName(r.data.toName || '');
        setToEmail(r.data.toEmail || null);
      } catch {
        if (!cancelled) setLoadErr("Couldn't load the email preview — please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [firstContactId, durationMins]);

  const handleSend = async () => {
    setSending(true);
    setSendErr('');
    try {
      let result: any;
      if (isBulk) {
        const r = await validationApi.bulkRequestMeeting({
          contact_ids: contactIds,
          duration_mins: durationMins,
          problem,
          custom_subject: subject,
          custom_message: message,
        });
        result = r.data;
      } else {
        const r = await validationApi.requestMeeting(firstContactId, {
          duration_mins: durationMins,
          problem,
          custom_subject: subject,
          custom_message: message,
        });
        result = r.data;
      }
      onSent(result);
      onClose();
    } catch (e: any) {
      setSendErr(e?.response?.data?.error || "Couldn't send — please try again.");
    } finally {
      setSending(false);
    }
  };

  const firstName = (toName || recipientLabel || '').trim().split(/\s+/)[0] || 'there';

  return (
    <>
      <div onClick={sending ? undefined : onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(9,9,20,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', background: '#fff', borderRadius: 18, padding: '26px 26px 22px', maxWidth: 560, width: '100%', maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T1, marginBottom: 3 }}>✉️ Preview &amp; edit before sending</div>
          <div style={{ fontSize: 12.5, color: T2, marginBottom: 18 }}>
            To: {isBulk ? recipientLabel : `${toName || recipientLabel}${toEmail ? ` <${toEmail}>` : ''}`}
          </div>

          {loading ? (
            <div style={{ padding: '36px 0', textAlign: 'center' as const, color: T3, fontSize: 13 }}>Loading preview…</div>
          ) : loadErr ? (
            <div style={{ padding: '20px 0', textAlign: 'center' as const, color: '#dc2626', fontSize: 13 }}>{loadErr}</div>
          ) : (
            <>
              <label style={{ fontSize: 10.5, fontWeight: 800, color: T3, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 13.5, fontFamily: 'inherit', marginTop: 4, marginBottom: 16, boxSizing: 'border-box' as const }}
              />

              <div style={{ fontSize: 12, color: T2, marginBottom: 8 }}>
                Hi {firstName}{isBulk ? ' — each contact will see their own name here' : ''},
              </div>

              <label style={{ fontSize: 10.5, fontWeight: 800, color: T3, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 13.5, fontFamily: 'inherit', marginTop: 4, marginBottom: 12, boxSizing: 'border-box' as const, resize: 'vertical' as const, lineHeight: 1.5 }}
              />

              <div style={{ fontSize: 11.5, color: T3, background: '#f8fafc', borderRadius: 10, padding: '10px 12px', lineHeight: 1.7, border: `1px solid ${BORDER}` }}>
                Book a time that suits you: <span style={{ color: accentColor, fontWeight: 700 }}>[your unique booking link — added automatically]</span><br />
                Pick any available slot, and I will receive the confirmation straight away.<br />
                Thank you in advance—I truly appreciate your time.<br /><br />
                Best regards,<br />
                <em>— your name, added automatically</em>
              </div>

              {sendErr && <div style={{ color: '#dc2626', fontSize: 12.5, marginTop: 12 }}>{sendErr}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  onClick={onClose}
                  disabled={sending}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: '#fff', color: T2, fontSize: 13.5, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !message.trim()}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: accentColor, color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: (sending || !subject.trim() || !message.trim()) ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.7 : 1 }}
                >
                  {sending ? 'Sending…' : isBulk ? `Send to ${contactIds.length} →` : 'Send invite →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
