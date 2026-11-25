/* Offline cache for Hitit. The version below changes whenever any app file changes,
   which makes the phone fetch the new files the next time the app is opened online. */
const VERSION = 'workout-log-d7578a7127';
const FILES = ["./", "app.css", "app.js", "manifest.webmanifest", "fonts/big-shoulders.woff2", "fonts/figtree.woff2", "icons/icon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('workout-log-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  /* cached copy first, so the app opens instantly and without signal; fall back to the network, then to the app page.
     The page is cached as './' only: Cloudflare redirects index.html to the folder address, and a redirected copy
     cannot be used to answer a page load. */
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
