// Enkel offline-cache. Höj VERSION när filer ändras.
const VERSION = 'streckgubbe-v1';
const FILER = ['./', 'index.html', 'spel.js', 'config.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILER); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (namn) {
    return Promise.all(namn.filter(function (n) { return n !== VERSION; }).map(function (n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var kopia = r.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, kopia); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
