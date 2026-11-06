// קול במה – service worker. Lets the site install as a phone app.
// Always tries the network first, so updates show up right away; the saved copy is only an offline fallback.
const CACHE = 'kol-bama-v1';

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
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./', copy));
        return res;
      })
      .catch(() => caches.match('./'))
  );
});
