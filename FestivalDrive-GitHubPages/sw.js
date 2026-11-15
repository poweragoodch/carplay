const cacheName = 'festival-drive-v1';
const assets = ['./','./index.html','./app.js','./manifest.webmanifest','./icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets))));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('festival-drive-') && key !== cacheName).map(key => caches.delete(key))))
));
self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !assets.some(asset => new URL(asset,self.registration.scope).href === request.url)) return;
  event.respondWith(fetch(request).catch(() => caches.open(cacheName).then(cache => cache.match(request))));
});
