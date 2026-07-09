const CACHE_NAME = 'financeiro-crm-v13-05-rendimento-automatico-caixinhas';
const FALLBACK_HTML = './index.html?v=1305';
const ASSETS = [
  FALLBACK_HTML,
  './styles.css?v=1305',
  './core.js?v=1305',
  './app.js?v=1305',
  './manifest.webmanifest?v=1305',
  './manifest.webmanifest',
  './version.json',
  './favicon-v13-05.png?v=1305',
  './favicon-v13-05.png',
  './favicon-v13-05.ico?v=1305',
  './favicon-v13-05.ico',
  './favicon.png?v=1305',
  './favicon.png',
  './favicon.ico?v=1305',
  './favicon.ico',
  './icon-v13-05-180.png?v=1305',
  './icon-v13-05-180.png',
  './icon-v13-05-192.png?v=1305',
  './icon-v13-05-192.png',
  './icon-v13-05-512.png?v=1305',
  './icon-v13-05-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('financeiro-crm') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const request = event.request;
  const accept = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || accept.includes('text/html');

  if(isNavigation){
    event.respondWith(
      fetch(request, {cache:'no-store'}).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(FALLBACK_HTML, copy)).catch(()=>{});
        return response;
      }).catch(() => caches.match(FALLBACK_HTML))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
      return response;
    }).catch(() => caches.match(FALLBACK_HTML)))
  );
});
