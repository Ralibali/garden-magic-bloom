/* Push notification handler (imported into the Workbox SW via importScripts). */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Odlingsdagboken', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Odlingsdagboken';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/app' },
    tag: data.tag || 'odlingsdagboken',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        try { await client.navigate(url); } catch {}
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
