const CACHE_NAME = 'financeiro-crm-v12-10';
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['./?v=1210','./index.html?v=1210','./manifest.webmanifest?v=1210','./icon-180.png?v=1210','./icon-192.png?v=1210','./icon-512.png?v=1210','./favicon.png?v=1210','./version.json?v=1210']).catch(()=>null)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message', event => { if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.mode === 'navigate' || req.url.includes('index.html') || req.url.includes('version.json')){
    event.respondWith(fetch(req, {cache:'no-store'}).catch(()=>caches.match('./?v=1210').then(r=>r||caches.match('./index.html?v=1210'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)); return res; }).catch(()=>cached)));
});
