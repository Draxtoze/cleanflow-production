const CACHE = 'cleanflow-production-v200';
const ASSETS = ['./', './index.html', './styles.css', './js/app.js', './js/store.js', './js/business.js', './js/reservations.js', './js/i18n.js','./js/reports.js','./vendor/jspdf.umd.min.js','./vendor/jszip.min.js','./vendor/NotoSans-Regular.ttf','./vendor/NotoSans-Bold.ttf', './assets/cleanflow-icon.png'];
ASSETS.push('./js/operations.js','./js/operations-i18n.js','./js/operations.css','./js/updates-i18n.js');
ASSETS.push('./js/v2.js','./js/v2.css','./js/v2-i18n.js','./js/preferences.js','./js/backup.js','./js/legacy-i18n.js');
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
