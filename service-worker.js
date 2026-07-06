const CACHE_NAME = 'financeiro-crm-v12-07';
const CORE_ASSETS = [
  './',
  './index.html?v=1207',
  './manifest.webmanifest?v=1207',
  './favicon.png?v=1207',
  './icon-180.png?v=1207',
  './icon-192.png?v=1207',
  './icon-512.png?v=1207'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(()=>{})));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('financeiro-crm-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const fresh = await fetch(request, {cache:'no-store'});
    if(fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  }catch(err){
    const cached = await cache.match(request);
    return cached || cache.match('./index.html?v=1207') || new Response('Offline', {status:503});
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const freshPromise = fetch(request).then(resp => { if(resp && resp.ok) cache.put(request, resp.clone()); return resp; }).catch(()=>null);
  return cached || freshPromise || new Response('', {status:404});
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if(req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')){
    event.respondWith(networkFirst(req));
    return;
  }
  if(url.pathname.endsWith('version.json') || url.pathname.endsWith('manifest.webmanifest') || url.pathname.endsWith('service-worker.js')){
    event.respondWith(networkFirst(req));
    return;
  }
  if(/\.(png|jpg|jpeg|webp|svg|css|js)$/i.test(url.pathname)){
    event.respondWith(staleWhileRevalidate(req));
  }
});
