/* INFAME FIGHTING — service worker (PWA offline) */
const CACHE = 'infame-v57';

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
  './src/start.mp3','./src/round1.mp3','./src/round2.mp3','./src/round3.mp3',
  './src/luchador1.png','./src/luchador2.png','./src/luchador3.png','./src/luchador4.png',
  './src/luchador5.png','./src/luchador6.png','./src/luchador7.png','./src/luchador8.png',
  './src/head-bruiser.glb','./src/head-zoner.glb','./src/head-rusher.glb','./src/head-grappler.glb',
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

/* ESTRATEGIA:
   - El JUEGO (navegacion y .html): RED PRIMERO. Asi cada recarga trae la
     version nueva; el cache solo entra si no hay conexion. Con cache-first
     el juego se quedaba congelado en una version antigua.
   - El RESTO (imagenes, audio, video, three.js): cache primero, que no cambian
     y conviene que carguen al instante y funcionen offline. */
function esJuego(req){
  return req.mode === 'navigate' || /\.html($|\?)/i.test(req.url);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (esJuego(req)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => undefined))
  );
});
