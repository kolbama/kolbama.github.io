// קול במה – service worker. Lets the site install as a phone app.
// Always tries the network first, so updates show up right away; the saved copy is only an offline fallback.
// v3 (8.11.2026): Shai's studio lives on the same address (kolbama.github.io/shai-studio/). The old version
// saved her page as our home page, so when the internet was weak, קול במה opened her studio instead.
// Now we only touch our own home page, and never delete the other app's saved files.
// v4 (19.11.2026): the libraries, fonts and icons are kept on the phone, so they don't download on every open.
// When a file in vendor/ or fonts/ changes: change the name below (kol-bama-v5…) so phones take the new one.
const CACHE = 'kol-bama-v4';
const STATIC = /^\/(vendor|fonts)\/|^\/(icon-192|icon-512|favicon-32|apple-touch-icon)\.png$/;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'icon-192.png', 'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/supabase.js', 'fonts/fonts.css'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kol-bama') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return; // data from Supabase etc. is never cached
  const path = url.pathname;
  // Our own libraries, fonts and icons: from the phone first, the internet only if missing
  if (STATIC.test(path)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  if (e.request.mode !== 'navigate') return;
  if (path !== '/' && path !== '/index.html') return; // any other page (like /shai-studio/) is left alone
  // The page itself: always the newest from the internet. If the internet is very slow (4 seconds) or down,
  // the saved copy opens instead, and the new one is saved quietly for next time.
  const net = fetch(e.request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
    }
    return res;
  });
  const slow = new Promise(r => setTimeout(r, 4000)).then(() => caches.match('./')).then(hit => hit || net);
  e.respondWith(Promise.race([net, slow]).catch(() => caches.match('./')));
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
