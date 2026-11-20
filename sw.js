/* Capri: service worker per le notifiche (nessuna cache: il sito resta sempre aggiornato). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Capri', body: e.data ? e.data.text() : '' }; }
  var title = d.title || 'Capri';
  var opts = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'badge-96.png',
    tag: d.tag || 'capri',
    renotify: true,
    timestamp: Date.now(),
    data: { url: d.url || './#oggi' }
  };
  var jobs = [self.registration.showNotification(title, opts)];
  if (typeof d.badge === 'number' && self.navigator && self.navigator.setAppBadge) {
    jobs.push((d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(function () {}));
  }
  e.waitUntil(Promise.all(jobs));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0) {
        if (c.navigate) c.navigate(url).catch(function () {});
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
