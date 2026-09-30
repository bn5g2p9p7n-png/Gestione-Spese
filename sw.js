/* Service worker — rende l'app utilizzabile anche senza rete (i dati restano sul dispositivo
   fino alla prossima connessione). Versione = nome cache: **cambiala ogni volta che
   modifichi index.html**, altrimenti l'app già installata continua a mostrare la
   versione vecchia. Esempio: conto-v1, poi conto-v2. */
const VERSIONE = 'conto-v2';
const RISORSE = ['./', './index.html', './supabase.js', './manifest.webmanifest',
                 './pwa-192.png', './pwa-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSIONE);
    await Promise.allSettled(RISORSE.map((r) => c.add(r)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chiavi = await caches.keys();
    await Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const stessaOrigine = url.origin === self.location.origin;

  // L'app (HTML/JS/CSS) prova la rete prima, poi la cache: così le novità si vedono subito.
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && stessaOrigine) {
        const c = await caches.open(VERSIONE);
        c.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (stessaOrigine && req.mode === 'navigate') {
        const base = await caches.match('./index.html');
        if (base) return base;
      }
      throw err;
    }
  })());
});
