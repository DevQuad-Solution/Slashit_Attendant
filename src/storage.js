// ─── Persistent Storage Utility ───────────────────────────────────────────────
const NS       = 'slashit_attendant_';
const USER_NS  = 'slashit_user_';
const ADMIN_NS = 'slashit_admin_';

export const storage = {
  save: (key, data) => {
    try { localStorage.setItem(NS + key, JSON.stringify(data)); } catch(e) {}
  },
  load: (key, fallback) => {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  },
  loadUser: (key, fallback) => {
    try {
      const raw = localStorage.getItem(USER_NS + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  },
  remove: (key) => {
    try { localStorage.removeItem(NS + key); } catch(e) {}
  },
};

// ─── Hub Support Chat ─────────────────────────────────────────────────────────
export const chatStore = {
  load: (hubId) => {
    try { const r = localStorage.getItem(`slashit_hub_chat_${hubId}`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  },
  save: (hubId, msgs) => {
    try { localStorage.setItem(`slashit_hub_chat_${hubId}`, JSON.stringify(msgs)); } catch(e) {}
  },
  send: (hubId, msg) => {
    const msgs = chatStore.load(hubId);
    chatStore.save(hubId, [msg, ...msgs]);
  },
};

// ─── Per-user slash message inbox ─────────────────────────────────────────────
export const msgStore = {
  load: (userId) => {
    try { const r = localStorage.getItem(`slashit_user_messages_${userId}`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  },
  push: (userId, msg) => {
    const msgs = msgStore.load(userId);
    localStorage.setItem(`slashit_user_messages_${userId}`, JSON.stringify([msg, ...msgs]));
  },
};

// ─── Per-user bell notifications ─────────────────────────────────────────────
export const notifStore = {
  push: (userId, notif) => {
    try {
      const raw = localStorage.getItem(`${USER_NS}notifications`);
      const notifs = raw ? JSON.parse(raw) : [];
      notifs.unshift(notif);
      localStorage.setItem(`${USER_NS}notifications`, JSON.stringify(notifs));
    } catch(e) {}
  },
};

// ─── Admin message log ────────────────────────────────────────────────────────
export const adminLog = {
  push: (entry) => {
    try {
      const raw = localStorage.getItem(`${ADMIN_NS}message_log`);
      const log = raw ? JSON.parse(raw) : [];
      log.unshift(entry);
      localStorage.setItem(`${ADMIN_NS}message_log`, JSON.stringify(log));
    } catch(e) {}
  },
};

// ─── Admin chat log ───────────────────────────────────────────────────────────
export const adminChatLog = {
  push: (entry) => {
    try {
      const raw = localStorage.getItem(`${ADMIN_NS}chat_log`);
      const log = raw ? JSON.parse(raw) : [];
      log.unshift(entry);
      localStorage.setItem(`${ADMIN_NS}chat_log`, JSON.stringify(log));
    } catch(e) {}
  },
  load: () => {
    try { const r = localStorage.getItem(`${ADMIN_NS}chat_log`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  },
};

// ─── Attendant bell notifications ─────────────────────────────────────────────
export const attNotifStore = {
  load: (attId) => {
    try { const r = localStorage.getItem(`slashit_attendant_notifs_${attId}`); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  },
  push: (attId, notif) => {
    try {
      const existing = attNotifStore.load(attId);
      existing.unshift(notif);
      localStorage.setItem(`slashit_attendant_notifs_${attId}`, JSON.stringify(existing));
    } catch(e) {}
  },
  markAllRead: (attId) => {
    try {
      const existing = attNotifStore.load(attId);
      localStorage.setItem(`slashit_attendant_notifs_${attId}`, JSON.stringify(existing.map(n => ({ ...n, isRead: true }))));
    } catch(e) {}
  },
  unreadCount: (attId) => attNotifStore.load(attId).filter(n => !n.isRead).length,
};

// ─── Browser Push Notification helper ────────────────────────────────────────
// Fires an OS-level popup. Works when tab is open or backgrounded.
export function pushBrowserNotif(title, body, icon = '/logo.jpg') {
  try {
    if (!('Notification' in window)) return;
    const send = () => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon });
      }
    };
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body, icon }); });
    } else {
      send();
    }
  } catch(e) {}
}

// ─── broadcastSlashMessage ────────────────────────────────────────────────────
export function broadcastSlashMessage({ collection, type, text, attendantName, hubName, pickupFrom, pickupTo }) {
  if (!collection?.members) return;
  const now = new Date().toISOString();
  collection.members.forEach(member => {
    const userId = member.userId;
    if (!userId) return;
    msgStore.push(userId, {
      id: `msg-${type}-${Date.now()}-${userId}`,
      type, slashId: collection.slashId, slashName: collection.productName,
      hubName: hubName || collection.hubName, text, sentAt: now, isRead: false,
    });
    notifStore.push(userId, {
      id: `notif-${type}-${Date.now()}-${userId}`,
      type,
      title: type==='slash_full'?'⚡ Slash Full!':type==='pickup_ready'?'📦 Ready for Pickup!':type==='completed'?'🎉 Slash Complete!':'↩️ Slash Dissolved',
      body: text.replace(/\[SlashIt\] /,'').slice(0,100),
      isRead: false, createdAt: now, slashId: collection.slashId,
    });
  });
  if (type === 'pickup_ready') {
    adminLog.push({
      id: `log-${Date.now()}`, hubId: collection.hubId, hubName: hubName || collection.hubName,
      attendantName: attendantName || 'Attendant', slashId: collection.slashId, slashName: collection.productName,
      type, pickupFrom: pickupFrom||'', pickupTo: pickupTo||'',
      membersNotified: collection.members.filter(m=>m.status==='pending').length,
      totalMembers: collection.members.length, sentAt: now,
    });
  }
}
