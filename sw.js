// קול במה – service worker. Lets the site install as a phone app.
// Always tries the network first, so updates show up right away; the saved copy is only an offline fallback.
const CACHE = 'kol-bama-v2'; // v2 (7.11.2026): new icons

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'icon-192.png'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return; // data from Supabase etc. is never cached
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Only the home page is kept as the offline copy (never some other page under the same name)
        const path = new URL(e.request.url).pathname;
        if (res.ok && (path.endsWith('/') || path.endsWith('/index.html'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./', copy));
        }
        return res;
      })
      .catch(() => caches.match('./'))
  );
});
