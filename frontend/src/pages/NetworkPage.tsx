import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { networkApi } from '@/api/client';
import type { Advisor, NetworkContact, Stage } from '@/types';
import { STAGE_LABELS, STAGE_COLORS } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HelpRequestForm {
  problem: string;
  specificAsk: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: color + '22', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const AVATAR_COLORS = ['#5856d6', '#0066cc', '#34c759', '#ff9500', '#ff3b30', '#af52de'];
function colorFor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function TagPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 100,
      background: '#f5f5f7', color: '#6e6e73',
      border: '1px solid #e5e7eb', display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

function StagePill({ stage }: { stage: Stage }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
      background: STAGE_COLORS[stage] + '18',
      color: STAGE_COLORS[stage],
      padding: '4px 10px', borderRadius: 100,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

// ── Request Sheet ─────────────────────────────────────────────────────────────

interface SheetProps {
  target: { id: string; name: string; type: 'advisor' | 'contact' } | null;
  userStage: Stage;
  onClose: () => void;
  onSent: () => void;
}

function RequestSheet({ target, userStage, onClose, onSent }: SheetProps) {
  const [form, setForm] = useState<HelpRequestForm>({ problem: '', specificAsk: '' });
  const [channel, setChannel] = useState<'linkedin' | 'email'>('linkedin');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const previewMessage =
    form.problem || form.specificAsk
      ? `Hi ${target?.name?.split(' ')[0]}, I'm a founder currently in the ${STAGE_LABELS[userStage]} stage.` +
        (form.problem ? ` I'm stuck on: ${form.problem}.` : '') +
        (form.specificAsk ? ` My specific ask: ${form.specificAsk}.` : '') +
        ` Would you be open to connecting?`
      : '';

  async function handleSend() {
    if (!form.problem.trim() || !form.specificAsk.trim()) {
      setError('Please fill in both fields before sending.');
      return;
    }
    if (!target) return;
    setSending(true);
    setError('');
    try {
      await networkApi.sendRequest({
        advisor_id: target.type === 'advisor' ? target.id : undefined,
        network_contact_id: target.type === 'contact' ? target.id : undefined,
        stage: userStage,
        problem: form.problem.trim(),
        specific_ask: form.specificAsk.trim(),
        channel,
      });
      setSent(true);
      onSent();
    } catch {
      setError('Failed to send request. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (!target) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px 16px 0 0',
          padding: '24px 20px 40px', width: '100%', maxWidth: 480,
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 20px' }} />

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#f0fdf4', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 14px', fontSize: 22,
            }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Request sent</div>
            <div style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 24 }}>
              Your message to <strong>{target.name}</strong> was recorded via {channel}.
              You'll be notified when they respond.
            </div>
            <button onClick={onClose} style={{
              padding: '10px 28px', borderRadius: 20, border: '1px solid #e5e7eb',
              background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Request help</div>
                <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
                  From <strong>{target.name}</strong>
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1,
              }}>×</button>
            </div>

            {/* Stage */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Your stage</div>
              <StagePill stage={userStage} />
            </div>

            {/* Problem */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                What are you stuck on?
              </label>
              <textarea
                value={form.problem}
                onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
                placeholder="e.g. I'm not getting replies when I reach out to potential users"
                rows={3}
                style={{
                  width: '100%', fontSize: 14, borderRadius: 10,
                  border: '1px solid #e5e7eb', padding: '10px 12px',
                  resize: 'none', fontFamily: 'inherit', color: '#111827',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Specific ask */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Specific ask
              </label>
              <input
                type="text"
                value={form.specificAsk}
                onChange={e => setForm(f => ({ ...f, specificAsk: e.target.value }))}
                placeholder="e.g. 30-min call to review my outreach script"
                style={{
                  width: '100%', fontSize: 14, borderRadius: 10,
                  border: '1px solid #e5e7eb', padding: '10px 12px',
                  fontFamily: 'inherit', color: '#111827', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Message preview */}
            {previewMessage && (
              <div style={{
                background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: 12, marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Message preview
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{previewMessage}</div>
              </div>
            )}

            {error && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</div>}

            {/* Channel buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setChannel('linkedin'); handleSend(); }}
                disabled={sending}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  background: channel === 'linkedin' ? '#e8f0fe' : '#f8fafc',
                  color: channel === 'linkedin' ? '#1a56db' : '#374151',
                  border: `1px solid ${channel === 'linkedin' ? '#c7d7f8' : '#e5e7eb'}`,
                  fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <span>in</span> LinkedIn
              </button>
              <button
                onClick={() => { setChannel('email'); handleSend(); }}
                disabled={sending}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  background: '#f8fafc', color: '#374151',
                  border: '1px solid #e5e7eb',
                  fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                ✉ Email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────

interface AddContactModalProps {
  onClose: () => void;
  onAdded: (contact: NetworkContact) => void;
}

function AddContactModal({ onClose, onAdded }: AddContactModalProps) {
  const [form, setForm] = useState({ name: '', contact_type: 'linkedin' as 'linkedin' | 'email', contact_value: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.name.trim() || !form.contact_value.trim()) {
      setError('Name and contact detail are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await networkApi.addContact(form);
      onAdded(res.data.contact);
      onClose();
    } catch {
      setError('Failed to save contact.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Add a contact</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Jamie Lin"
            style={{ width: '100%', fontSize: 14, borderRadius: 10, border: '1px solid #e5e7eb', padding: '10px 12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Contact via</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['linkedin', 'email'] as const).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, contact_type: t }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: form.contact_type === t ? '#f0f0ff' : '#f8fafc',
                  color: form.contact_type === t ? '#5856d6' : '#6e6e73',
                  border: `1px solid ${form.contact_type === t ? '#c4b5fd' : '#e5e7eb'}`,
                }}
              >
                {t === 'linkedin' ? '🔗 LinkedIn' : '✉ Email'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            {form.contact_type === 'linkedin' ? 'LinkedIn URL or username' : 'Email address'}
          </label>
          <input
            type={form.contact_type === 'email' ? 'email' : 'text'}
            value={form.contact_value}
            onChange={e => setForm(f => ({ ...f, contact_value: e.target.value }))}
            placeholder={form.contact_type === 'linkedin' ? 'linkedin.com/in/username' : 'their@email.com'}
            style={{ width: '100%', fontSize: 14, borderRadius: 10, border: '1px solid #e5e7eb', padding: '10px 12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. ex-product at Stripe, met at YC event"
            style={{ width: '100%', fontSize: 14, borderRadius: 10, border: '1px solid #e5e7eb', padding: '10px 12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: '#111827', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save contact'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NetworkPage() {
  const { user } = useApp();
  const [tab, setTab] = useState<'advisors' | 'contacts'>('advisors');
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<Stage | 'all'>('all');
  const [requestTarget, setRequestTarget] = useState<{ id: string; name: string; type: 'advisor' | 'contact' } | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const userStage: Stage = user?.current_stage ?? 'idea';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [adRes, coRes] = await Promise.all([
          networkApi.listAdvisors(),
          networkApi.listContacts(),
        ]);
        setAdvisors(adRes.data.advisors);
        setContacts(coRes.data.contacts);
      } catch {
        // silently fail; empty states shown
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredAdvisors = filterStage === 'all'
    ? advisors
    : advisors.filter(a => a.stages.includes(filterStage));

  const stages: Array<{ value: Stage | 'all'; label: string }> = [
    { value: 'all', label: 'All stages' },
    { value: 'idea', label: '💡 Idea' },
    { value: 'hone', label: '🎯 Hone' },
    { value: 'validate', label: '🧪 Validate' },
    { value: 'shape', label: '🔨 Shape' },
    { value: 'done', label: '🚀 Ship' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Extended Network</h1>
          {sentCount > 0 && (
            <span style={{
              background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
              fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 100,
            }}>
              {sentCount} sent
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
          Get specific help from people who've been where you are — curated advisors or your own trusted contacts.
        </p>
      </div>

      {/* Your stage context */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13, color: '#6e6e73' }}>You're currently at</span>
        <StagePill stage={userStage} />
        <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 'auto' }}>Advisors matching your stage are highlighted</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {(['advisors', 'contacts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === t ? '#111827' : '#fff',
              color: tab === t ? '#fff' : '#6e6e73',
              transition: 'all .15s',
            }}
          >
            {t === 'advisors' ? '⭐ MVP Club Advisors' : '👤 My Contacts'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* ── ADVISORS TAB ── */}
          {tab === 'advisors' && (
            <>
              {/* Stage filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                {stages.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setFilterStage(s.value as Stage | 'all')}
                    style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: filterStage === s.value ? '#111827' : '#f5f5f7',
                      color: filterStage === s.value ? '#fff' : '#6e6e73',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {filteredAdvisors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                  No advisors for this stage yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredAdvisors.map(a => {
                    const matchesStage = a.stages.includes(userStage);
                    return (
                      <div
                        key={a.id}
                        style={{
                          background: '#fff', border: `1px solid ${matchesStage ? '#c4b5fd' : '#e5e7eb'}`,
                          borderRadius: 14, padding: '16px 18px',
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          boxShadow: matchesStage ? '0 0 0 3px #f0ecff' : 'none',
                        }}
                      >
                        <Avatar initials={a.avatar_initials} color={colorFor(a.name)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{a.name}</span>
                            {matchesStage && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, background: '#f0ecff', color: '#7c3aed',
                                padding: '2px 8px', borderRadius: 100, letterSpacing: '0.04em',
                              }}>
                                MATCHES YOUR STAGE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2, marginBottom: 8 }}>{a.role}</div>
                          {a.bio && (
                            <div style={{ fontSize: 13, color: '#374151', marginBottom: 10, lineHeight: 1.5 }}>{a.bio}</div>
                          )}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {a.expertise.map(tag => <TagPill key={tag} label={tag} />)}
                          </div>
                        </div>
                        <button
                          onClick={() => setRequestTarget({ id: a.id, name: a.name, type: 'advisor' })}
                          style={{
                            padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                            background: '#111827', color: '#fff', border: 'none', cursor: 'pointer',
                            flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          Ask
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── MY CONTACTS TAB ── */}
          {tab === 'contacts' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contacts.map(c => (
                  <div
                    key={c.id}
                    style={{
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <Avatar initials={c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()} color={colorFor(c.name)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                        {c.contact_type === 'linkedin' ? '🔗 LinkedIn' : '✉ Email'} · {c.contact_value}
                      </div>
                      {c.notes && (
                        <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>{c.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setRequestTarget({ id: c.id, name: c.name, type: 'contact' })}
                      style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        background: '#111827', color: '#fff', border: 'none', cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Ask
                    </button>
                  </div>
                ))}

                {/* Add contact CTA */}
                <button
                  onClick={() => setShowAddContact(true)}
                  style={{
                    border: '1.5px dashed #d1d5db', borderRadius: 14,
                    padding: '16px', display: 'flex', alignItems: 'center', gap: 12,
                    background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '1.5px dashed #d1d5db', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18, color: '#9ca3af', flexShrink: 0,
                  }}>+</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Add a contact</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Import from LinkedIn or add by email</div>
                  </div>
                </button>

                {contacts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0 0', color: '#9ca3af', fontSize: 13 }}>
                    Add people from your network who could advise you at any stage.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Request sheet */}
      {requestTarget && (
        <RequestSheet
          target={requestTarget}
          userStage={userStage}
          onClose={() => setRequestTarget(null)}
          onSent={() => { setSentCount(c => c + 1); setRequestTarget(null); }}
        />
      )}

      {/* Add contact modal */}
      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onAdded={contact => setContacts(cs => [contact, ...cs])}
        />
      )}
    </div>
  );
}
