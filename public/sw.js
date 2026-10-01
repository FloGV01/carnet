// Service worker de Carnet : tout est mis en cache à l'installation, le cache passe
// en premier, et une nouvelle version n'est activée qu'à la demande de la page
// (toucher du bandeau), jamais d'office : une saisie en cours n'est jamais coupée.
// <precache:debut> (généré par scripts/precache.mjs, ne pas modifier à la main)
const VERSION = '588d2cf4dff4';
const FICHIERS = [
  "./",
  "./css/base.css",
  "./css/composants.css",
  "./css/ecrans.css",
  "./css/tokens.css",
  "./icons/apple-touch-icon.png",
  "./icons/icone-192.png",
  "./icons/icone-512.png",
  "./icons/icone-maskable-512.png",
  "./icons/icone.svg",
  "./index.html",
  "./js/app.js",
  "./js/db/zip.js",
  "./js/export/pdf.js",
  "./js/main.js",
  "./js/plateforme/micro.js",
  "./js/plateforme/mode.js",
  "./js/plateforme/partage.js",
  "./js/plateforme/persistance.js",
  "./js/plateforme/presse-papier.js",
  "./js/plateforme/sw-client.js",
  "./js/routeur.js",
  "./js/store.js",
  "./js/ui/composants/bandeau-maj.js",
  "./js/ui/composants/barre-onglets.js",
  "./js/ui/composants/entete.js",
  "./js/ui/composants/toast.js",
  "./js/ui/ecrans/attente.js",
  "./js/ui/ecrans/diagnostic.js",
  "./js/ui/ecrans/guide.js",
  "./js/ui/ecrans/reglages.js",
  "./js/ui/icones.js",
  "./js/ui/lib.js",
  "./js/version.js",
  "./manifest.webmanifest",
  "./vendor/LICENCES.txt",
  "./vendor/hooks.module.js",
  "./vendor/htm.module.js",
  "./vendor/preact-htm.js",
  "./vendor/preact.module.js"
];
// <precache:fin>

const CACHE = `carnet-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nom of await caches.keys()) {
      if (nom.startsWith('carnet-') && nom !== CACHE) await caches.delete(nom);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('./index.html')) || fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
  })());
});
