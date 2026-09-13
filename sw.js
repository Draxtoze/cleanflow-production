const CACHE = 'cleanflow-production-v140';
const ASSETS = ['./', './index.html', './styles.css', './js/app.js', './js/store.js', './js/business.js', './js/reservations.js', './js/i18n.js','./js/reports.js','./vendor/jspdf.umd.min.js','./vendor/jszip.min.js','./vendor/NotoSans-Regular.ttf','./vendor/NotoSans-Bold.ttf', './assets/cleanflow-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
