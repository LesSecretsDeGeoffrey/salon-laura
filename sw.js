/* Service worker minimal — met l'app en cache pour qu'elle s'ouvre
   même sans réseau. Les données, elles, viennent toujours du réseau
   (Supabase) : on ne met JAMAIS de réponse d'API en cache, sinon Laura
   verrait des chiffres périmés sans le savoir. */

const CACHE = 'salon-laura-v2';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './icone.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Tout ce qui n'est pas la coquille de l'app part directement au réseau.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) return;

  // Réseau d'abord, cache en secours : l'app se met à jour toute seule
  // au prochain chargement, et reste ouvrable hors ligne.
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copie = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
