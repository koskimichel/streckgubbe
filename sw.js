// Enkel offline-cache. Höj VERSION när filer ändras.
const VERSION = 'streckgubbe3-v11';
const FILER = ['./', 'index.html', 'spel.js', 'config.js', 'ljud.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

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
  if (new URL(e.request.url).origin !== self.location.origin) return;   // bara spelets egna filer
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok) {                                                       // cacha aldrig felsvar
        var kopia = r.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, kopia); });
      }
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
