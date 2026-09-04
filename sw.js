/**
 * sw.js — Service Worker para OrdenaLetras
 * Permite funcionamiento offline (caché de recursos estáticos).
 */

const CACHE_NAME = 'ordenaletras-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/utils.js',
  './js/storage.js',
  './js/supabaseClient.js',
  './js/audio.js',
  './js/words.js',
  './js/game.js',
  './js/ui.js',
  './js/main.js',
  './data/words.json',
  './OrdenaLetras_icono_oficial.jpg',
  // Fuente de Google (si hay conectividad se cachea; si no, el CSS tiene fallback)
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap',
];

// ── Install: cachear recursos estáticos ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Intentar cachear cada asset individualmente para no fallar todo si uno falla
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] No se pudo cachear: ${url}`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches antiguas ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first para recursos locales, Network-first para remotos ─────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo gestionar GET
  if (event.request.method !== 'GET') return;

  // Recursos del propio origen: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Recursos externos (ej. Google Fonts): network con fallback a cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
