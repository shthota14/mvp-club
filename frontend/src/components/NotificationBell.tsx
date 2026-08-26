import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/api/client';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Notification {
  id: string;
  type: 'new_post' | 'new_comment' | 'encourage' | 'network_offer' | 'new_reply' | 'meeting_booked';
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  new_post:      '📝',
  new_comment:   '💬',
  new_reply:     '↩️',
  encourage:     '👍',
  network_offer: '🤝',
  meeting_booked: '📅',
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await notificationsApi.unreadCount();
        if (!cancelled) setUnread(r.data.count);
      } catch {}
    };
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const r = await notificationsApi.list();
      setNotifications(r.data.notifications ?? []);
    } catch {}
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(v => {
      if (!v) fetchNotifications();
      return !v;
    });
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnread(c => Math.max(0, c - 1));
    }
    if (n.link) {
      setOpen(false);
      // Most notification links are in-app routes (a post, a thread) and go
      // through the router -- but meeting_booked links straight to the
      // external Jitsi join URL, which react-router's navigate() can't open.
      if (/^https?:\/\//i.test(n.link)) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.link);
      }
    }
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
    setUnread(0);
  };

  const iconBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: '50%',
    background: 'transparent', border: '1px solid #d2d2d7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all .18s', flexShrink: 0,
    color: '#6e6e73', fontSize: 15, position: 'relative',
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        title="Notifications"
        style={iconBtn}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 15, height: 15, borderRadius: 8,
            background: '#ff3b30', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
            padding: '0 3px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: isMobile ? 'fixed' : 'absolute',
          top: isMobile ? 64 : 42,
          right: isMobile ? 0 : 0,
          left: isMobile ? 0 : 'auto',
          width: isMobile ? '100%' : 340,
          maxHeight: isMobile ? 'calc(100vh - 64px)' : 440,
          background: '#fff',
          borderRadius: isMobile ? 0 : 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          border: '1px solid #e5e5ea',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid #f0f0f5',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#007aff', fontWeight: 500, padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>
                Loading…
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>
                No notifications yet
              </div>
            )}
            {!loading && notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 16px',
                  background: n.is_read ? 'transparent' : '#f0f6ff',
                  cursor: n.link ? 'pointer' : 'default',
                  borderBottom: '1px solid #f5f5f7',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = n.is_read ? '#f5f5f7' : '#e8f0fe'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : '#f0f6ff'; }}
              >
                {/* Icon */}
                <span style={{ fontSize: 18, flexShrink: 0, paddingTop: 1 }}>
                  {TYPE_ICON[n.type] ?? '🔔'}
                </span>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#1d1d1f', lineHeight: 1.4 }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{
                      fontSize: 12, color: '#6e6e73', marginTop: 2, lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.body}
                    </div>
                  )}
                  {n.type === 'meeting_booked' && n.link && (
                    <div style={{ fontSize: 12, color: '#007aff', fontWeight: 600, marginTop: 3 }}>
                      🔗 Join call →
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {/* Unread dot */}
                {!n.is_read && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#007aff', flexShrink: 0, alignSelf: 'center',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
