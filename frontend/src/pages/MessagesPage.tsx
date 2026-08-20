import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { messagesApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { STAGE_LABELS, STAGE_COLORS, type Stage } from '@/types';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  other_user_id: string;
  other_name: string;
  other_initials: string;
  idea_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  content: string;
  created_at: string;
  read_at: string | null;
  edited_at?: string | null;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatar_initials: string;
  current_stage: Stage;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  if (hrs < 48)   return 'Yesterday';
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function fmtFull(d: string) {
  return new Date(d).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Avatar({ initials, size = 36, bg = '#6366f1' }: { initials: string; size?: number; bg?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${bg}20`, color: bg, fontSize: size * 0.35, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {(initials ?? '??').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: (convId: string, otherId: string, otherName: string, otherInitials: string) => void }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<UserResult[]>([]);
  const [recipient, setRecipient] = useState<UserResult | null>(null);
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || recipient) { setResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await messagesApi.searchUsers(query);
        setResults(r.data.users);
      } catch {} finally { setSearching(false); }
    }, 280);
  }, [query, recipient]);

  const send = async () => {
    if (!recipient || !body.trim()) return;
    setSending(true);
    try {
      const r = await messagesApi.getOrCreate(recipient.id);
      const convId = r.data.conversation_id;
      await messagesApi.send(convId, body.trim());
      onSent(convId, recipient.id, recipient.name, recipient.avatar_initials);
    } catch {} finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 520, maxWidth: '95vw', boxShadow: '0 24px 80px #0000003a', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 900, fontSize: 15, color: '#1d1d1f' }}>New message</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: 13, color: '#6e6e73', fontWeight: 800 }}>✕</button>
        </div>

        {/* To field */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#86868b', fontWeight: 700, minWidth: 20 }}>To</span>
            {recipient ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef2ff', borderRadius: 20, padding: '4px 12px 4px 8px' }}>
                <Avatar initials={recipient.avatar_initials} size={22} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{recipient.name}</span>
                <button onClick={() => { setRecipient(null); setQuery(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1d1d1f', background: 'transparent' }}
              />
            )}
          </div>
          {/* Dropdown results */}
          {results.length > 0 && !recipient && (
            <div style={{ position: 'absolute', left: 24, right: 24, top: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px #0000001a', border: '1px solid #d2d2d7', zIndex: 10, overflow: 'hidden' }}>
              {results.map(u => (
                <button key={u.id} onClick={() => { setRecipient(u); setQuery(''); setResults([]); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Avatar initials={u.avatar_initials} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#86868b' }}>{u.email}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', background: `${STAGE_COLORS[u.current_stage]}15`, color: STAGE_COLORS[u.current_stage], borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    {STAGE_LABELS[u.current_stage]}
                  </span>
                </button>
              ))}
              {searching && <div style={{ padding: '10px 16px', fontSize: 12, color: '#86868b' }}>Searching…</div>}
            </div>
          )}
        </div>

        {/* Body */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your message…"
          style={{ width: '100%', minHeight: 200, padding: '16px 24px', border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.6, color: '#1d1d1f', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#86868b' }}>Only visible to you and the recipient</span>
          <button
            onClick={send}
            disabled={!recipient || !body.trim() || sending}
            style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: recipient && body.trim() ? '#6366f1' : '#e5e7eb', color: recipient && body.trim() ? '#fff' : '#9ca3af', fontWeight: 800, fontSize: 13, cursor: recipient && body.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s' }}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const isMobile = useIsMobile();
  const { user } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive]   = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [convId, setConvId]   = useState<string | null>(null);
  const [draft, setDraft]     = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState(false);
  const [search, setSearch]   = useState('');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const editRef    = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const r = await messagesApi.listConversations();
      setConversations(r.data.conversations);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (conv: Conversation) => {
    setActive(conv);
    setMessages([]);
    setDraft('');
    try {
      const r = await messagesApi.getOrCreate(conv.other_user_id);
      const cid = r.data.conversation_id;
      setConvId(cid);
      setMessages(r.data.messages);
      // Mark as read
      await messagesApi.markRead(cid);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: false } : c));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch {}
    inputRef.current?.focus();
  };

  const handleComposeSent = (cid: string, otherId: string, otherName: string, otherInitials: string) => {
    setCompose(false);
    loadConversations().then(() => {
      // open the new conversation
      const fake: Conversation = { id: cid, other_user_id: otherId, other_name: otherName, other_initials: otherInitials, idea_name: null, last_message: null, last_message_at: null };
      openConversation(fake);
    });
  };

  const sendMessage = async () => {
    if (!draft.trim() || !convId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const r = await messagesApi.send(convId, text);
      setMessages(prev => [...prev, r.data.message]);
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, last_message: text, last_message_at: new Date().toISOString() } : c
      ));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { setDraft(text); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
    setTimeout(() => {
      editRef.current?.focus();
      const len = editRef.current?.value.length ?? 0;
      editRef.current?.setSelectionRange(len, len);
    }, 30);
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(''); };

  const saveEdit = async () => {
    if (!editingId || !editDraft.trim() || !convId || editSaving) return;
    setEditSaving(true);
    try {
      const r = await messagesApi.editMessage(convId, editingId, editDraft.trim());
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, ...r.data.message } : m));
      cancelEdit();
    } catch { /* keep editing open on error */ }
    finally { setEditSaving(false); }
  };

  // Auto-resize edit textarea
  useLayoutEffect(() => {
    if (editRef.current) {
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editDraft]);

  const filteredConvs = conversations.filter(c =>
    !search || c.other_name.toLowerCase().includes(search.toLowerCase()) || (c.last_message ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isMine = (msg: Message) => msg.sender_id === user?.id;

  // The last message overall sent by me — that's the only one eligible to edit
  const myMessages = messages.filter(m => m.sender_id === user?.id);
  const myLastMsgId = myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null;

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const d = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#f5f5f7', fontFamily: 'inherit', overflow: 'hidden' }}>

      {/* ══ LEFT PANEL — Inbox ══ */}
      <div style={{ width: isMobile ? '100%' : 300, borderRight: '1px solid #d2d2d7', background: '#fff', display: (isMobile && active) ? 'none' : 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Inbox header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#1d1d1f', letterSpacing: -0.3 }}>Inbox</span>
            <button
              onClick={() => setCompose(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
            >
              ✏️ Compose
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages…"
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 13, outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#86868b' }}>🔍</span>
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#86868b', fontSize: 13 }}>Loading…</div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
                {search ? 'No matches' : 'No messages yet.\nClick Compose to start a conversation.'}
              </div>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isActive = active?.other_user_id === conv.other_user_id;
              const hasUnread = conv.unread;
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 16px',
                    border: 'none', borderBottom: '1px solid #f5f5f7',
                    background: isActive ? '#eef2ff' : 'transparent',
                    borderLeft: `3px solid ${isActive ? '#6366f1' : 'transparent'}`,
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar initials={conv.other_initials} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: hasUnread ? 800 : 600, fontSize: 13, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{conv.other_name}</span>
                        <span style={{ fontSize: 10, color: '#86868b', flexShrink: 0, marginLeft: 4 }}>
                          {conv.last_message_at ? fmt(conv.last_message_at) : ''}
                        </span>
                      </div>
                      {conv.idea_name && (
                        <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginBottom: 2 }}>Re: {conv.idea_name}</div>
                      )}
                      <div style={{ fontSize: 12, color: hasUnread ? '#1d1d1f' : '#86868b', fontWeight: hasUnread ? 700 : 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {conv.last_message ?? 'No messages yet'}
                      </div>
                    </div>
                    {hasUnread && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL — Thread ══ */}
      {!active ? (
        <div style={{ flex: 1, display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: '#86868b' }}>
          <div style={{ fontSize: 52, filter: 'grayscale(0.3)' }}>✉️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1d1d1f' }}>Your private inbox</div>
          <div style={{ fontSize: 13, color: '#86868b', textAlign: 'center', lineHeight: 1.7, maxWidth: 280 }}>
            Messages are private between you and the recipient.<br />
            Click <strong>Compose</strong> to start a conversation.
          </div>
          <button onClick={() => setCompose(true)} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 20, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            ✏️ New message
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff' }}>

          {/* Thread header */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #d2d2d7', display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button
                onClick={() => setActive(null)}
                style={{ padding: '6px 10px', borderRadius: 20, border: '1.5px solid #d2d2d7', background: 'transparent', color: '#6e6e73', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                ← Inbox
              </button>
            )}
            <Avatar initials={active.other_initials} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#1d1d1f' }}>{active.other_name}</div>
              {active.idea_name && (
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Re: {active.idea_name}</div>
              )}
            </div>
            <button
              onClick={() => setCompose(true)}
              style={{ padding: '7px 16px', borderRadius: 20, border: '1.5px solid #d2d2d7', background: 'transparent', color: '#6e6e73', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              ✏️ New
            </button>
          </div>

          {/* Messages thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 80, color: '#86868b', fontSize: 13 }}>
                Say hello to {active.other_name.split(' ')[0]} 👋
              </div>
            ) : (
              grouped.map(({ date, msgs }) => (
                <div key={date}>
                  {/* Date divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
                    <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                    <span style={{ fontSize: 11, color: '#86868b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {new Date(date).toDateString() === new Date().toDateString() ? 'Today' :
                       new Date(date).toDateString() === new Date(Date.now()-86400000).toDateString() ? 'Yesterday' :
                       new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                  </div>

                  {msgs.map((msg, idx) => {
                    const mine = isMine(msg);
                    const prevMine = idx > 0 ? isMine(msgs[idx - 1]) : mine;
                    const showAvatar = !mine && prevMine !== mine;
                    const canEdit = mine && msg.id === myLastMsgId;
                    const isEditing = editingId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className="msg-row"
                        style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4, position: 'relative' }}
                      >
                        {!mine && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && <Avatar initials={msg.sender_initials} size={30} />}
                          </div>
                        )}
                        <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                          {isEditing ? (
                            <div style={{ minWidth: isMobile ? 160 : 220, background: '#eef2ff', borderRadius: '18px 18px 4px 18px', overflow: 'hidden', boxShadow: '0 2px 12px #6366f130' }}>
                              <textarea
                                ref={editRef}
                                value={editDraft}
                                onChange={e => setEditDraft(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                style={{ width: '100%', padding: '10px 16px', border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit', color: '#1d1d1f', background: 'transparent', boxSizing: 'border-box', minHeight: 44, overflow: 'hidden' }}
                              />
                              <div style={{ padding: '6px 10px', display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid #c7d2fe' }}>
                                <button onClick={cancelEdit} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#fff', color: '#6e6e73', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={saveEdit} disabled={editSaving || !editDraft.trim()} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}>
                                  {editSaving ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '10px 16px',
                                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: mine ? '#6366f1' : '#f3f4f6',
                                color: mine ? '#fff' : '#1d1d1f',
                                fontSize: 14, lineHeight: 1.6,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                boxShadow: mine ? '0 2px 8px #6366f130' : '0 1px 3px #0000000a',
                              }}
                            >
                              {msg.content}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: '#86868b', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {fmtFull(msg.created_at)}
                            {mine && msg.read_at && <span style={{ color: '#6366f1' }}>✓ Read</span>}
                            {msg.edited_at && <span style={{ fontStyle: 'italic' }}>edited</span>}
                            {canEdit && !isEditing && (
                              <button
                                onClick={() => startEdit(msg)}
                                style={{ background: '#f0f0ff', border: '1px solid #c4b5fd', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, color: '#5856d6', cursor: 'pointer' }}
                              >
                                ✏️ Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply composer */}
          <div style={{ padding: '14px 24px 18px', borderTop: '1px solid #d2d2d7', background: '#fff' }}>
            <div style={{ border: '1.5px solid #d2d2d7', borderRadius: 16, overflow: 'hidden', transition: 'border-color .15s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = '#d2d2d7')}
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Reply to ${active.other_name.split(' ')[0]}…`}
                rows={3}
                style={{ width: '100%', padding: '12px 16px', border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.55, fontFamily: 'inherit', color: '#1d1d1f', boxSizing: 'border-box', display: 'block' }}
              />
              <div style={{ padding: '8px 12px', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 11, color: '#86868b' }}>Enter to send · Shift+Enter for new line</span>
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  style={{ padding: '7px 18px', borderRadius: 10, border: 'none', background: draft.trim() ? '#6366f1' : '#e5e7eb', color: draft.trim() ? '#fff' : '#9ca3af', fontWeight: 800, fontSize: 13, cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s' }}
                >
                  {sending ? '…' : 'Send ↑'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {compose && <ComposeModal onClose={() => setCompose(false)} onSent={handleComposeSent} />}
    </div>
  );
}
