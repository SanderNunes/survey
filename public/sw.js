const CACHE_VERSION = 'v2';
const STATIC_CACHE = `africell-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `africell-dynamic-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/africell-logo-300x300.webp',
  '/favicon.ico',
];

// Skip caching for these external hostnames
const BYPASS_HOSTS = [
  'login.microsoftonline.com',
  'login.microsoft.com',
  'graph.microsoft.com',
  'api.assemblyai.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('africell-') && !n.endsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let auth, Graph and AssemblyAI calls pass through uncached
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;

  // SharePoint REST/OData — network only, no cache
  if (url.hostname.endsWith('.sharepoint.com')) return;

  // Navigation (HTML pages) — network-first, offline.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Vite hashed assets (/assets/…) — cache-first (immutable filenames)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static public assets (fonts, images, manifest) — cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else — network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Background Sync — notify the active tab to run the sync queue
self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-surveys') return;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' })))
  );
});
