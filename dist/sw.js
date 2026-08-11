// SlashIt Service Worker
// In development (localhost): immediately unregister to avoid breaking Vite
// In production: cache-first strategy for offline support

const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

if (IS_DEV) {
  // Immediately unregister this SW in development
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', () => {
    self.registration.unregister().then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    });
  });
} else {
  // Production: proper caching strategy
  const CACHE_NAME = 'slashit-v15';
  const STATIC = ['/', '/index.html', '/logo.jpg', '/manifest.json'];

  self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
  });

  self.addEventListener('activate', (e) => {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (url.hostname !== self.location.hostname) return;
    if (url.pathname.startsWith('/api/')) return;

    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok && e.request.mode === 'navigate') {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(cached =>
            cached ||
            (e.request.mode === 'navigate'
              ? caches.match('/index.html').then(fb => fb || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
              : new Response('Network error', { status: 503, headers: { 'Content-Type': 'text/plain' } })
            )
          )
        )
    );
  });

  self.addEventListener('message', (e) => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  });

  self.addEventListener('push', (e) => {
    const data = e.data?.json() || {};
    e.waitUntil(self.registration.showNotification(data.title || 'SlashIt ⚡', {
      body: data.body || 'You have a new update', icon: '/logo.jpg', badge: '/logo.jpg',
      vibrate: [200, 100, 200], data: data.url || '/',
    }));
  });

  self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(list => {
        for (const c of list) { if ('focus' in c) return c.focus(); }
        if (clients.openWindow) return clients.openWindow(e.notification.data || '/');
      })
    );
  });
}
