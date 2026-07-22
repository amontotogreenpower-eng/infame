const C='infame-v1';
const A=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png',
 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>{
    const net=fetch(e.request).then(res=>{
      if(res&&res.ok&&e.request.method==='GET'){
        const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));
      }
      return res;
    }).catch(()=>r);
    return r||net;
  }));
});
