// Admin PWA service worker: app-shell caching + web push (payload-less; fetches the latest notification).
const CACHE = 'mb-admin-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/admin/icon-192.png']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => new Response('<!doctype html><meta name=viewport content="width=device-width"><body style="background:#0b0b0d;color:#d4af37;font-family:sans-serif;text-align:center;padding:4rem"><h1>You are offline</h1><p>Reconnect to manage your shop.</p>', { headers: { 'content-type': 'text/html' } })));
    return;
  }
  if (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/admin/icon')) {
    e.respondWith(caches.open(CACHE).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }));
  }
});
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let n = { title: 'MelanaBlac', body: 'You have a new update.', url: '/admin/' };
    try { const r = await fetch('/api/admin/notifications/latest', { credentials: 'include' }); if (r.ok) { const j = await r.json(); if (j) n = j; } } catch {}
    await self.registration.showNotification(n.title, { body: n.body, icon: '/admin/icon-192.png', badge: '/admin/icon-192.png', data: { url: n.url || '/admin/' }, tag: 'mb-' + (n.id || Date.now()) });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/admin/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => { for (const c of cs) if (c.url.includes('/admin')) { c.navigate(url); return c.focus(); } return self.clients.openWindow(url); }));
});
