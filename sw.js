/* Gata service worker — app-shell cache for offline + fast loads.
   Bump CACHE when you change app files so clients pick up the update. */
const CACHE = 'gata-v6';
const ASSETS = ['./', './index.html', './app.css', './content.js', './features.js', './app.js', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache Firebase / Google traffic — always go to network.
  if (/gstatic|googleapis|firebase|google\.com/.test(url.host)) return;
  // App shell: network-first so updates land, falling back to cache offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
  }
});
