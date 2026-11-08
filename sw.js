// קול במה – service worker. Lets the site install as a phone app.
// Always tries the network first, so updates show up right away; the saved copy is only an offline fallback.
// v3 (8.11.2026): Shai's studio lives on the same address (kolbama.github.io/shai-studio/). The old version
// saved her page as our home page, so when the internet was weak, קול במה opened her studio instead.
// Now we only touch our own home page, and never delete the other app's saved files.
const CACHE = 'kol-bama-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'icon-192.png'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kol-bama') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return; // data from Supabase etc. is never cached
  const path = new URL(e.request.url).pathname;
  if (path !== '/' && path !== '/index.html') return; // any other page (like /shai-studio/) is left alone
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./', copy));
        }
        return res;
      })
      .catch(() => caches.match('./'))
  );
});

// Phone notifications (8.11.2026). The server sends {title, body, url, tag}.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'קול במה', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'favicon-32.png',
    tag: d.tag || 'kol-bama',
    renotify: true,
    dir: 'rtl',
    lang: 'he',
    data: { url: d.url || './' }
  }));
});

// Tapping the notification opens קול במה (or brings the open window forward) on the right tab
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const mine = list.find(c => new URL(c.url).pathname === new URL(self.registration.scope).pathname);
    if (mine) return mine.navigate(url).then(c => (c || mine).focus()).catch(() => mine.focus());
    return self.clients.openWindow(url);
  }));
});
