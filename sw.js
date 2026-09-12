const CACHE = 'cleanflow-production-v1';
const ASSETS = ['./', './index.html', './styles.css', './js/app.js', './js/store.js', './js/business.js', './assets/cleanflow-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));