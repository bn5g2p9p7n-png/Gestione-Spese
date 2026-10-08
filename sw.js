/* Service worker — conserva sul dispositivo i file dell'app (pagina, script, icone), così si apre anche senza rete.
   I dati di Supabase NON vengono salvati qui: senza rete l'app si apre ma i movimenti si leggono solo online
   (i nuovi movimenti, invece, vengono messi in coda e inviati dopo). Versione = nome cache: **cambiala ogni volta che
   modifichi index.html**, altrimenti l'app già installata continua a mostrare la
   versione vecchia. La versione la tiene allineata lo script sincronizza-cache.mjs: non cambiarla a mano. */
const VERSIONE = 'conto-r14';
const HASH = '78d69772e63bd43a';   // lo scrive sincronizza-cache.mjs: serve a capire se index.html e' cambiato
const RISORSE = ['./', './index.html', './supabase.js', './manifest.webmanifest',
                 './pwa-192.png', './pwa-512.png', './pwa-512-maskable.png', './apple-touch-icon.png'];

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
  // Le richieste con parametri (?verifica=…, ?v=…) servono solo a controllare la rete: vanno lasciate passare
  // senza salvarle in cache, altrimenti ogni controllo aggiungerebbe una copia da ~150 KB.
  if (url.search) return;

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
