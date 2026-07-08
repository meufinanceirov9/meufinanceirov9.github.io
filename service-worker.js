const CACHE_NAME = 'financeiro-crm-v13-00-local-estavel';
const ASSETS = [
  './',
  './index.html?v=1300',
  './styles.css?v=1300',
  './core.js?v=1300',
  './app.js?v=1300',
  './manifest.webmanifest',
  './version.json',
  './favicon.png',
  './icon-180.png',
  './icon-192.png',
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
  }).catch(() => caches.match('./index.html?v=1300'))));
});
