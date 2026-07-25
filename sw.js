/* INFAME FIGHTING — service worker (PWA offline) */
const CACHE = 'infame-v55';

/* Assets a precachear. Se usa allSettled: si alguno falta (p.ej. Intro.mp4
   todavia no subido) la instalacion NO falla. */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './src/Intro.mp4',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first con red de reserva; lo que llega por red se guarda para
   la proxima vez (three.js del CDN, Intro.mp4, etc.). */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => {
      // sin red y sin cache: para navegaciones, servir el juego
      if (req.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
