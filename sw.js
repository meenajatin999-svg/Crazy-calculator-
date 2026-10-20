// Service worker: makes Study Calculator work offline after it has been opened once online.
// Change CACHE whenever you update any file, so installed copies pick up the new version.
const CACHE = 'study-calculator-v2';
const ESSENTIAL = ['./', './index.html'];
const OPTIONAL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      const add = (url) => cache.add(new Request(url, { cache: 'reload' }));
      // The page itself must be cached or the install fails and is retried later.
      // Icons and the manifest are nice to have, so a missing one does not block offline use.
      return Promise.all(ESSENTIAL.map(add)).then(() => Promise.all(OPTIONAL.map((u) => add(u).catch(() => {}))));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && FONT_HOSTS.indexOf(url.hostname) < 0) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
      if (cached) {
        network.catch(() => {}); // refresh quietly in the background; ignore offline errors
        return cached;
      }
      return network.catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
