// Service worker minimal : sert de base à l'installation ("Ajouter à
// l'écran d'accueil") et permet à l'appli de se recharger même avec une
// connexion faible. Ne met jamais en cache les appels vers Supabase
// (autre origine) : seul le "coquillage" de l'appli est concerné.
const CACHE_NAME = 'my-companion-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/supabaseClient.js',
  './js/auth.js',
  './js/data.js',
  './js/render.js',
  './js/chat.js',
  './js/albumUpload.js',
  './js/bootstrap.js',
  './js/backGuard.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
