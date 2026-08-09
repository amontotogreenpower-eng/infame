/* INFAME FIGHTING — service worker (PWA offline) */
const CACHE = 'infame-v60';

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
  './src/ring-model.glb','./src/ring-video.mp4','./src/ring-image.jpg','./src/ring-mat.jpg',
  /* Indice de la libreria de modelos. Los .glb en si NO se precachean: pesan
     mucho y no se sabe cuales hay; el fetch normal ya los guarda al usarlos. */
  './src/glb/index.json',
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

/* NUNCA SE GUARDA UNA RESPUESTA QUE NO SEA 200. Guardar un 404 en una
   estrategia "cache primero" es veneno: los recursos OPCIONALES del juego
   (src/ring-video.mp4, src/ring-mat.jpg, src/ring-model.glb, las cabezas
   .glb, la Intro...) faltan a proposito hasta que uno los sube, y el 404 de
   la primera visita se quedaba grabado. A partir de ahi el archivo YA NO SE
   PEDIA NUNCA MAS: podias subirlo al servidor y el juego seguia sin verlo.
   Medido: sin archivo -> 404 guardado en cache con status 404; se sube el
   archivo, el servidor responde 200 con cache-buster... y el juego seguia
   recibiendo 404 tras recargar. */
function guardable(res){
  return !!res && res.ok && res.status === 200;
}
function esJuego(req){
  return req.mode === 'navigate' || /\.html($|\?)/i.test(req.url);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (esJuego(req)) {
    e.respondWith(
      fetch(req).then(res => {
        if (guardable(res)) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  /* Un acierto de cache solo vale si es una respuesta BUENA. Asi, ademas, las
     caches ya envenenadas por la version anterior se curan solas: el 404
     guardado se ignora y se vuelve a preguntar a la red. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit && hit.ok) return hit;
      return fetch(req).then(res => {
        if (guardable(res)) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);      // sin red: mejor lo que hubiera que nada
    })
  );
});
