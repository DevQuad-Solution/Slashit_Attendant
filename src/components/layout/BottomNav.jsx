import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage, chatStore, attNotifStore } from '../../storage';

export function BottomNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const _session = storage.load('session', {});
  const hubId = _session.hubId || '';
  const attId = _session.id    || '';
  const [unread,        setUnread]        = useState(0);
  const [attNotifCount, setAttNotifCount] = useState(0);

  useEffect(() => {
    const count = () => {
      if (!hubId) return;
      const msgs = chatStore.load(hubId);
      setUnread(msgs.filter(m => m.from === 'user' && !m.attendantRead).length);
      if (attId) setAttNotifCount(attNotifStore.unreadCount(attId));
    };
    count();
    const iv = setInterval(count, 3000);
    return () => clearInterval(iv);
  }, [hubId, attId]);

  const tabs = [
    { path: '/dashboard',     icon: '🏠', label: 'Hub' },
    { path: '/deliveries',    icon: '📦', label: 'Deliveries' },
    { path: '/scanner',       icon: '📷', label: 'Scan' },
    { path: '/notifications', icon: '🔔', label: 'Alerts', badge: attNotifCount },
    { path: '/chats',         icon: '💬', label: 'Chats', badge: unread },
  ];
  return (
    <>
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '8px 0 12px', zIndex: 40, boxShadow: '0 -4px 20px rgba(0,0,0,.08)' }}>
        {tabs.map(t => {
          const active = loc.pathname === t.path;
          if (t.path === '/scanner') return (
            <button key={t.path} onClick={() => nav(t.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none' }}>
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 14px rgba(37,99,235,.4)', marginTop: -20 }}>📷</div>
            </button>
          );
          return (
            <button key={t.path} onClick={() => nav(t.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', position: 'relative' }}>
              <span style={{ fontSize: 21, filter: active ? 'none' : 'grayscale(1)', opacity: active ? 1 : 0.6 }}>{t.icon}</span>
              {t.badge > 0 && <div style={{ position: 'absolute', top: 0, right: '18%', width: 16, height: 16, background: '#dc2626', borderRadius: '50%', fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{t.badge > 9 ? '9+' : t.badge}</div>}
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#2563eb' : '#94a3b8' }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
