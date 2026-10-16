// @ts-nocheck
// Service worker della v1 (da far rivedere a Tech Ops, D5). Non passa da Vite: vite.config.js (plugin swV1) lo copia
// nel dist come sw-v1.js, inserendo la versione e l'elenco dei file del build al posto dei due segnaposto.
// Tutti i percorsi sono relativi alla posizione del service worker: funziona anche sotto un sottopercorso (/pwa-natale/).
// Solo richieste GET alla stessa origine; tutto il resto non viene toccato.
/* eslint-disable */
const VERSIONE = 'cb4bcdeb5026';
const PREFISSO = 'posta-elfi-v1-app-';
const CACHE = PREFISSO + VERSIONE;
/** @type {string[]} percorsi relativi (shell, asset con hash, icone, manifest, pacchetto audio) */
const FILE = ["assets/index-v1-CeLcnbQZ.js","assets/index-v1-D7wDInMF.css","audio/pacchetto-v1/audio-v1-1fe36271.bin","audio/pacchetto-v1/manifest.json","icone/apple-touch-icon.png","icone/icon-192.png","index.html","manifest.webmanifest"];
const base = new URL('./', self.location.href);
const url = (f) => new URL(f, base).href;
const PAGINA = url('index.html');
// indice del pacchetto audio: prima la rete (può uscire una versione nuova), poi la cache
const DA_RETE_PRIMA = [url('audio/pacchetto-v1/manifest.json'), url('manifest.webmanifest')];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', ...FILE].map((f) => new Request(url(f), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chiavi) =>
        Promise.all(chiavi.filter((k) => k.startsWith(PREFISSO) && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || !u.href.startsWith(base.href)) return;
  if (r.headers.has('range')) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).catch(() =>
        caches
          .match(PAGINA, { cacheName: CACHE, ignoreVary: true })
          .then((x) => x || caches.match(url('./'), { cacheName: CACHE, ignoreVary: true })),
      ),
    );
    return;
  }
  const senzaQuery = u.origin + u.pathname;
  if (DA_RETE_PRIMA.includes(senzaQuery)) {
    e.respondWith(
      fetch(r)
        .then((risp) => {
          if (risp.ok) {
            const copia = risp.clone();
            e.waitUntil(caches.open(CACHE).then((c) => c.put(senzaQuery, copia)));
          }
          return risp;
        })
        .catch(() =>
          caches.match(senzaQuery, { cacheName: CACHE, ignoreVary: true }).then((x) => x || Response.error()),
        ),
    );
    return;
  }
  e.respondWith(
    caches.match(r, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true }).then((x) => x || fetch(r)),
  );
});
