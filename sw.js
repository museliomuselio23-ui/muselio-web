/* Muselio — service worker minimal (installabilité PWA + cache du shell).
   On met en cache la coquille de l'app (pas les 82 Mo de catalogue ni les images
   distantes). Stratégie : network-first pour le HTML, cache-first pour le reste
   du shell, passthrough pour tout le reste. */
const CACHE = 'muselio-shell-v31';  // v31 : ajout nus du domaine public (images locales, sans liens externes)
const SHELL = ['./index.html', './i18n.js', './citations.json', './parcours.json',
               './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ne pas intercepter les gros shards du catalogue ni les images/API distantes.
  if (url.pathname.includes('/galerie/') || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(c => c || fetch(req)));
});
