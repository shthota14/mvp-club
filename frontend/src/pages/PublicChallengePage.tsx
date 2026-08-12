import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = '/api';

interface PublicChallenge {
  id: string;
  idea_name: string;
  target_profile: string;
  target_domain: string | null;
  author_name: string;
  conversations_goal: number;
  conversation_count: number;
  deadline: string;
  status: string;
}

function daysLeft(deadline: string) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
}

export default function PublicChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // form state
  type HelpType = 'vouch' | 'fit' | null;
  const [helpType, setHelpType]         = useState<HelpType>(null);
  const [contactName, setContactName]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [note, setNote]                 = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [submitError, setSubmitError]   = useState('');

  useEffect(() => {
    if (!id) return;
    axios.get(`${API}/challenges/public/${id}`)
      .then(r => setChallenge(r.data.challenge))
      .catch((e) => {
        const status = e?.response?.status;
        const msg = e?.response?.data?.error ?? e?.message ?? 'Unknown error';
        setError(`${status === 404 ? 'This challenge is no longer active or the link has expired.' : `Error ${status}: ${msg}`}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async () => {
    if (!challenge || !helpType || !contactEmail.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await axios.post(`${API}/challenges/public/${challenge.id}/offer`, {
        offer_type: helpType,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim(),
        note: note.trim() || null,
      });
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e5ea',
    fontSize: 14, fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#fafafa',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9fb' }}>
      <div style={{ fontSize: 14, color: '#9ca3af' }}>Loading…</div>
    </div>
  );

  if (error || !challenge) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9fb', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Link unavailable</div>
        <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>{error || 'This challenge link is no longer active.'}</div>
      </div>
    </div>
  );

  const prog = Math.min(1, challenge.conversation_count / challenge.conversations_goal);
  const days = daysLeft(challenge.deadline);

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9fb', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', letterSpacing: 0.5 }}>MVP Club · Community</div>
        </div>

        {/* Ask card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: 20 }}>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
            👋 Can you help?
          </div>

          <div style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', lineHeight: 1.3, marginBottom: 16 }}>
            {challenge.idea_name}
          </div>

          <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.7, marginBottom: 20 }}>
            <strong>{challenge.author_name}</strong> is validating a startup idea and would appreciate a conversation or a warm intro to someone in your network.
          </div>

          {/* Who they need */}
          <div style={{ background: '#f5f3ff', borderRadius: 14, padding: '16px 18px', marginBottom: 20, border: '1.5px solid #ede9fe' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              The people I'd love to speak with
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', lineHeight: 1.4 }}>
              {challenge.target_profile}
            </div>
            {challenge.target_domain && (
              <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 4 }}>{challenge.target_domain}</div>
            )}
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73' }}>Conversations so far</span>
              <span style={{ fontSize: 11, color: '#6e6e73' }}>
                {challenge.conversation_count}/{challenge.conversations_goal} · {days}d left
              </span>
            </div>
            <div style={{ height: 6, background: '#f0f0f5', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${prog * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#2563eb)', borderRadius: 99 }} />
            </div>
          </div>
        </div>

        {/* Help form */}
        {submitted ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{helpType === 'vouch' ? '🤝' : '🙋'}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6 }}>
              {helpType === 'vouch'
                ? `${challenge.author_name} will receive the contact details and reach out to make the connection.`
                : `${challenge.author_name} will reach out to you directly for a quick conversation.`}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f', marginBottom: 16 }}>How can you help?</div>

            {/* Type selector */}
            {!helpType && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                <button
                  onClick={() => setHelpType('vouch')}
                  style={{ padding: '14px 16px', borderRadius: 14, border: '1.5px solid #e5e5ea', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>🤝 I can connect you with someone</div>
                  <div style={{ fontSize: 12, color: '#6e6e73' }}>I know someone in my network who could help — I'll share their details</div>
                </button>
                <button
                  onClick={() => setHelpType('fit')}
                  style={{ padding: '14px 16px', borderRadius: 14, border: '1.5px solid #e5e5ea', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>🙋 I can answer those questions myself</div>
                  <div style={{ fontSize: 12, color: '#6e6e73' }}>I fit this profile and I'm happy to chat directly</div>
                </button>
              </div>
            )}

            {/* Contact form */}
            {helpType && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: helpType === 'vouch' ? '#7c3aed' : '#2563eb' }}>
                    {helpType === 'vouch' ? '🤝 Sharing a contact' : '🙋 Happy to chat'}
                  </div>
                  <button onClick={() => setHelpType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9ca3af', fontFamily: 'inherit', padding: 0 }}>
                    change
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {helpType === 'vouch' && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, display: 'block' }}>
                        Contact's name
                      </label>
                      <input style={inputStyle} placeholder="e.g. Jane Doe" value={contactName} onChange={e => setContactName(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, display: 'block' }}>
                      {helpType === 'vouch' ? 'Their email or LinkedIn *' : 'Your email *'}
                    </label>
                    <input
                      style={inputStyle}
                      placeholder={helpType === 'vouch' ? 'jane@company.com or linkedin.com/in/jane' : 'you@email.com'}
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, display: 'block' }}>
                      {helpType === 'vouch' ? 'Note (optional)' : 'Brief background (optional)'}
                    </label>
                    <textarea
                      style={{ ...inputStyle, height: 80, resize: 'none' }}
                      placeholder={helpType === 'vouch'
                        ? 'Anything helpful to mention when reaching out…'
                        : 'Why you fit this profile, your experience…'}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>
                </div>

                {submitError && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 12 }}>{submitError}</div>}

                <button
                  onClick={submit}
                  disabled={submitting || !contactEmail.trim()}
                  style={{
                    width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, border: 'none',
                    background: !contactEmail.trim() ? '#e5e5ea' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
                    color: !contactEmail.trim() ? '#9ca3af' : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: !contactEmail.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {submitting ? 'Sending…' : helpType === 'vouch' ? 'Send intro details →' : 'Share my details →'}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: '#b0b0b8' }}>
          MVP Club · Helping founders validate ideas and build real startups
        </div>
      </div>
    </div>
  );
}
