const CACHE_NAME = 'financeiro-crm-v13-03-revisao-funcionamento-local';
const ASSETS = [
  './',
  './index.html?v=1303',
  './styles.css?v=1303',
  './core.js?v=1303',
  './app.js?v=1303',
  './manifest.webmanifest?v=1303',
  './manifest.webmanifest',
  './version.json',
  './favicon.png?v=1303',
  './favicon.png',
  './favicon.ico?v=1303',
  './favicon.ico',
  './icon-180.png?v=1303',
  './icon-180.png',
  './icon-192.png?v=1303',
  './icon-192.png',
  './icon-512.png?v=1303',
  './icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
    return response;
  }).catch(() => caches.match('./index.html?v=1303'))));
});
