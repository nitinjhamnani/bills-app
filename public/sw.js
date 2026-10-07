// Minimal app-shell service worker for Phase 0's PWA scaffold. Caches the shell on install and
// falls back to it for navigation requests when offline; everything else goes to the network.
// Replace with a generated Workbox service worker once the app has real offline data needs.
const CACHE_NAME = "b2bfintech-shell-v1";
const APP_SHELL = ["/", "/login", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? caches.match("/"))
    )
  );
});
