/**
 * Attendant App.jsx — Routing shell only.
 * All pages live in src/features/<feature>/pages/<Page>.jsx
 */
import { useState, useEffect } from 'react';
import { toast, _wireToast } from './toast.js';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { storage, chatStore, msgStore, notifStore, adminLog, adminChatLog,
         broadcastSlashMessage, attNotifStore, pushBrowserNotif } from './storage.js';
import { api, setToken, getToken, clearToken } from './api.js';
import { fmt, delay, fromNow, fmtTime, fmtDate } from './data.js';

// ── Page imports ──────────────────────────────────────────────────────────────
import { DashboardPage }              from './features/dashboard/pages/DashboardPage';
import { DeliveriesPage }             from './features/deliveries/pages/DeliveriesPage';
import { CollectionsPage }            from './features/collections/pages/CollectionsPage';
import { ScannerPage }                from './features/scanner/pages/ScannerPage';
import { RatingsPage }                from './features/ratings/pages/RatingsPage';
import { ChatsPage }                  from './features/chats/pages/ChatsPage';
import { AttendantNotificationsPage } from './features/notifications/pages/AttendantNotificationsPage';
import { AttendantSidebar } from './components/layout/AttendantSidebar';

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;overflow:hidden}
  body{background:#f0f4ff;color:#1e293b;font-family:'Inter',system-ui,sans-serif;font-size:14px;margin:0}
  input,textarea,select{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;color:#1e293b;font-size:14px;width:100%;outline:none;transition:border-color .2s;font-family:inherit}
  input:focus,textarea:focus,select:focus{border-color:#2563eb;background:#fff}
  button{cursor:pointer;border:none;outline:none;transition:all .15s;font-family:inherit}
  ::-webkit-scrollbar{width:0}
  .toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;background:#1e293b;color:#fff;border-radius:12px;padding:10px 18px;font-size:13px;font-weight:600;animation:toastIn .2s ease;white-space:nowrap;max-width:90vw}
  .toast.success{background:#1d4ed8}
  .toast.error{background:#dc2626}
  @keyframes toastIn{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin .8s linear infinite}
  .active-scale:active{transform:scale(.97)}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .pulse{animation:pulse 2s infinite}
  /* ── Desktop sidebar ── */
  @media(min-width:900px){
    .att-layout{display:flex;height:100vh;overflow:hidden}
    .att-sidebar{width:220px;flex-shrink:0;background:#fff;border-right:1.5px solid #e2e8f0;position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;z-index:40;transition:width .25s;overflow:hidden}
    .att-sidebar.collapsed{width:64px}
    .att-main{margin-left:220px;flex:1;min-width:0;transition:margin-left .25s;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
    .att-sidebar.collapsed+.att-main{margin-left:64px}
    .att-bottom-nav{display:none!important}
    .att-spacer{display:none!important}
  }
  @media(max-width:899px){
    .att-layout{display:block;height:100vh;overflow:hidden}
    .att-sidebar{display:none!important}
    .att-main{margin-left:0!important;width:100%;height:100vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding-bottom:72px}
    .att-bottom-nav{display:flex!important}
  }
`;

// ── Toast system ─────────────────────────────────────────────────────────────
// toast singleton lives in toast.js — imported here + wired via _wireToast
function ToastProvider() {
  const [t, setT] = useState(null);
  // Wire the display function so toast.success/error works from any feature page
  _wireToast((v) => { setT(v); setTimeout(() => setT(null), 2800); });
  if (!t) return null;
  return <div className={`toast ${t.t}`}>{t.m}</div>;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,.06)', ...style }}>{children}</div>
);

export const Btn = ({ children, variant = 'primary', size = 'md', loading, onClick, style = {}, full, disabled }) => {
  const V = {
    primary:   { background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,.3)' },
    secondary: { background: '#f1f5f9', color: '#334155', border: '1.5px solid #e2e8f0' },
    success:   { background: '#16a34a', color: '#fff' },
    danger:    { background: '#dc2626', color: '#fff' },
    warning:   { background: '#d97706', color: '#fff' },
    ghost:     { background: 'transparent', color: '#64748b' },
    white:     { background: 'rgba(255,255,255,.2)', color: '#fff', border: '1.5px solid rgba(255,255,255,.3)' },
  };
  const S = {
    sm: { fontSize: 12, padding: '7px 14px', borderRadius: 8 },
    md: { fontSize: 14, padding: '11px 20px', borderRadius: 12 },
  };
  return (
    <button disabled={disabled || loading} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, cursor: (disabled || loading) ? 'not-allowed' : 'pointer', opacity: (disabled || loading) ? 0.6 : 1, width: full ? '100%' : undefined, ...V[variant], ...S[size], ...style }}>
      {loading && <span className="spin" style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />}
      {children}
    </button>
  );
};

export const Badge = ({ label, bg = '#dbeafe', color = '#1d4ed8' }) => (
  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: bg, color }}>{label}</span>
);

// ── Session bridge ────────────────────────────────────────────────────────────
// currentAttendant is kept as a module variable for the Login flow.
// All other pages read from storage.load('session') directly.
let currentAttendant = storage.load('session', null);

// ── Push permission ───────────────────────────────────────────────────────────
function usePushPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav() {
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
      <div style={{ height: 72 }} />
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 600, background: '#fff', borderTop: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '8px 0 12px', zIndex: 40, boxShadow: '0 -4px 20px rgba(0,0,0,.08)' }}>
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

// ── Login ─────────────────────────────────────────────────────────────────────
function Login() {
  const nav = useNavigate();
  const [phone,       setPhone]       = useState('');
  const [pin,         setPin]         = useState('');
  const [loading,     setLoading]     = useState(false);
  const [pinVisible,  setPinVisible]  = useState(false);
  usePushPermission();

  const login = async () => {
    if (!phone || !pin) { toast.error('Fill all fields'); return; }
    if (pin.length !== 6 || isNaN(pin)) { toast.error('PIN must be 6 digits'); return; }
    setLoading(true);
    try {
      // POST /auth/attendant/signin { identifier, password }
      // Response: { data: { attendant: {...}, accessToken } }
      const res       = await api.auth.attendantSignin(phone.trim(), pin.trim());
      const token     = res.data?.accessToken;
      const attendant = res.data?.attendant || res.data?.user;
      if (!token) throw new Error('Login failed — check your phone and PIN');
      setToken(token);
      currentAttendant = { ...attendant, id: attendant?._id || attendant?.id };
      storage.save('session', currentAttendant);
      toast.success('Welcome, ' + (currentAttendant.name || 'Attendant').split(' ')[0] + '! 👋');
      nav('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid phone or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#dce8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(37,99,235,.13)', padding: '40px 32px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <img src="/logo.jpg" alt="SlashIt" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
          <span style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>SlashIt</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', marginBottom: 6 }}>Attendant Portal</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Sign in to your hub management account</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>Phone Number</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08012345678" onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>6-Digit PIN</div>
            <input type={pinVisible ? 'text' : 'password'} maxLength={6} value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••"
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.4em', textAlign: 'center' }} />
          </div>
        </div>
        <button onClick={login} disabled={loading}
          style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 15, borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading && <span className="spin" style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />}
          Sign In
        </button>
      </div>
    </div>
  );
}

// ── Route guard ───────────────────────────────────────────────────────────────
function Protected({ children }) {
  if (!storage.load('session', null)) return <Navigate to="/" replace />;
  return (
    <div className="att-layout">
      {/* Desktop sidebar — CSS hides on mobile */}
      <AttendantSidebar />
      {/* Main content area — scrolls independently */}
      <div className="att-main">
        {children}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{CSS}</style>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<Login />} />
          <Route path="/dashboard"     element={<Protected><DashboardPage /></Protected>} />
          <Route path="/deliveries"    element={<Protected><DeliveriesPage /></Protected>} />
          <Route path="/collections"   element={<Protected><CollectionsPage /></Protected>} />
          <Route path="/scanner"       element={<Protected><ScannerPage /></Protected>} />
          <Route path="/ratings"       element={<Protected><RatingsPage /></Protected>} />
          <Route path="/chats"         element={<Protected><ChatsPage /></Protected>} />
          <Route path="/notifications" element={<Protected><AttendantNotificationsPage /></Protected>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
