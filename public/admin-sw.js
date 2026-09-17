// Minimal service worker: enables PWA installability and caches the app shell
// for offline access. Deliberately does NOT cache API/data responses, since
// messages and donations must always be fresh.

const CACHE_NAME = 'dk-admin-shell-v1';
const APP_SHELL = ['/admin', '/admin-icon-192.png', '/admin-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin navigation requests with a cache-first fallback;
  // let all API/data calls go straight to the network untouched.
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/admin'))
    );
  }
});
