import { useState } from 'react';
import { communityApi } from '@/api/client';
import { useApp } from '@/context/AppContext';

interface Props {
  ideaId: string;
  ideaName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CopyBox({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <button
          onClick={copy}
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
            background: copied ? '#dcfce7' : '#f0f0ff',
            color: copied ? '#15803d' : '#5856d6',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div style={{
        background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 10,
        padding: '12px 14px', fontSize: 13, color: '#1d1d1f', lineHeight: 1.7,
        whiteSpace: 'pre-wrap', fontFamily: 'inherit',
      }}>
        {text}
      </div>
    </div>
  );
}

export default function NetworkOfferModal({ ideaId, ideaName, onClose, onSuccess }: Props) {
  const { user } = useApp();

  const [form, setForm] = useState({
    contact_name:        '',
    contact_description: '',
    contact_type:        'linkedin' as 'linkedin' | 'email',
    contact_value:       '',
    relationship:        '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  // Message the offeror sends to their LinkedIn contact
  const messageToContact = done
    ? `Hi ${form.contact_name.split(' ')[0]},

Hope you're doing well! I came across a founder on MVP Club building something I think you'd find interesting.

Their idea: "${ideaName}"

Based on what I know about your background, I think you'd be really valuable to them — specifically: ${form.contact_description}

I've already connected you with them on the platform so they may reach out. Would you be open to a quick chat if they do?

Thanks,
${user?.name ?? 'A community member'}`
    : '';

  async function submit() {
    if (!form.contact_name.trim() || !form.contact_description.trim()) {
      setError('Please fill in the contact name and how they can help.');
      return;
    }
    if (form.contact_type === 'email' && !form.contact_value.trim()) {
      setError('Email address is required for email contacts.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await communityApi.offerNetwork(ideaId, {
        contact_name:        form.contact_name.trim(),
        contact_description: form.contact_description.trim(),
        contact_type:        form.contact_type,
        contact_value:       form.contact_value.trim(),
        relationship:        form.relationship.trim() || undefined,
      });
      setDone(true);
      onSuccess();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to submit offer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 500,
        background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,.2)',
        zIndex: 401, overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 3 }}>🤝 Offer your network</div>
            <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
              Know someone who could help with <strong>{ideaName}</strong>? Introduce them.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#b0b0b8', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {done ? (
            <div style={{ padding: '24px' }}>
              {/* Success header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>✅</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Intro sent to the founder</div>
                  <div style={{ fontSize: 13, color: '#6e6e73' }}>They've been notified via private message.</div>
                </div>
              </div>

              {/* Step 2 — warm the contact */}
              <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  ⚡ Step 2 — warm your contact first
                </div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                  The intro works best if <strong>{form.contact_name.split(' ')[0]}</strong> hears from you before the founder reaches out.
                  Copy the message below and send it now.
                </div>
              </div>

              {/* Generated message */}
              <CopyBox
                label={`Message to send to ${form.contact_name.split(' ')[0]}`}
                text={messageToContact}
              />

              {/* Open / Search LinkedIn */}
              {form.contact_type === 'linkedin' && (() => {
                const hasUrl = form.contact_value.trim().length > 0;
                const href = hasUrl
                  ? (form.contact_value.startsWith('http') ? form.contact_value : `https://${form.contact_value}`)
                  : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(form.contact_name)}`;
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '11px 0', borderRadius: 12, marginBottom: 12,
                      background: '#0a66c2', color: '#fff', fontWeight: 700, fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: 16 }}>in</span>
                    {hasUrl
                      ? `Open ${form.contact_name.split(' ')[0]}'s LinkedIn profile`
                      : `Search "${form.contact_name}" on LinkedIn`}
                  </a>
                );
              })()}

              {form.contact_type === 'email' && (
                <a
                  href={`mailto:${form.contact_value}?subject=Quick intro — ${ideaName}&body=${encodeURIComponent(messageToContact)}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '11px 0', borderRadius: 12, marginBottom: 12,
                    background: '#111827', color: '#fff', fontWeight: 700, fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  ✉ Open email to {form.contact_name.split(' ')[0]}
                </a>
              )}

              <button
                onClick={onClose}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1.5px solid #d2d2d7', background: 'transparent', color: '#6e6e73', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={labelStyle}>Contact name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Chen"
                  value={form.contact_name}
                  onChange={e => set('contact_name', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>How can they help with this idea? <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  placeholder="e.g. She's a UX researcher who specialises in consumer apps and could run a user research session."
                  value={form.contact_description}
                  onChange={e => set('contact_description', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Your relationship to them</label>
                <input
                  type="text"
                  placeholder="e.g. former colleague, met at YC event"
                  value={form.relationship}
                  onChange={e => set('relationship', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>How to reach them</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {(['linkedin', 'email'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => set('contact_type', t)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        background: form.contact_type === t ? '#f0f0ff' : '#f5f5f7',
                        color: form.contact_type === t ? '#5856d6' : '#6e6e73',
                        border: `1.5px solid ${form.contact_type === t ? '#c4b5fd' : '#d2d2d7'}`,
                        transition: 'all .15s',
                      }}
                    >
                      {t === 'linkedin' ? '🔗 LinkedIn' : '✉ Email'}
                    </button>
                  ))}
                </div>
                <input
                  type={form.contact_type === 'email' ? 'email' : 'text'}
                  placeholder={form.contact_type === 'linkedin' ? 'linkedin.com/in/username (optional)' : 'their@email.com *'}
                  value={form.contact_value}
                  onChange={e => set('contact_value', e.target.value)}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#86868b', marginTop: 5 }}>
                  {form.contact_type === 'linkedin'
                    ? 'Skip this if you don\'t have their URL — we\'ll generate a LinkedIn search for the founder.'
                    : 'Required so the founder can reach out directly.'}
                </div>
              </div>

              <div style={{ background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
                🔒 Sent <strong>only to the idea founder</strong> via private message. You'll also get a ready-to-copy warm-up note to send your contact.
              </div>

              {error && <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{error}</div>}

              <button
                onClick={submit}
                disabled={saving}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: '#000', color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Sending…' : 'Send introduction offer →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#3a3a3c',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, padding: '10px 14px',
  border: '1.5px solid #d2d2d7', borderRadius: 10,
  fontFamily: 'inherit', color: '#111', background: '#fff',
  boxSizing: 'border-box', outline: 'none',
};
