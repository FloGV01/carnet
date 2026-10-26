// Service worker de Carnet : tout est mis en cache à l'installation, le cache passe
// en premier, et une nouvelle version n'est activée qu'à la demande de la page
// (toucher du bandeau), jamais d'office : une saisie en cours n'est jamais coupée.
// <precache:debut> (généré par scripts/precache.mjs, ne pas modifier à la main)
const VERSION = '523e157ac518';
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
  "./js/analyse/avant-explosions.js",
  "./js/analyse/classements.js",
  "./js/analyse/colonnes.js",
  "./js/analyse/comprendre.js",
  "./js/analyse/emotions.js",
  "./js/analyse/energie-jour.js",
  "./js/analyse/fenetres.js",
  "./js/analyse/frise.js",
  "./js/analyse/humeur-jour.js",
  "./js/analyse/index.js",
  "./js/analyse/moments.js",
  "./js/analyse/reperes.js",
  "./js/analyse/seuils.js",
  "./js/analyse/stats.js",
  "./js/analyse/textes.js",
  "./js/app.js",
  "./js/db/erreurs.js",
  "./js/db/idb.js",
  "./js/db/migrations.js",
  "./js/db/repository.js",
  "./js/db/sauvegarde.js",
  "./js/db/zip.js",
  "./js/domain/apres-coup.js",
  "./js/domain/carte-roue.js",
  "./js/domain/champs.js",
  "./js/domain/contacts.js",
  "./js/domain/dates.js",
  "./js/domain/definitions-roue.js",
  "./js/domain/exercices.js",
  "./js/domain/explosions.js",
  "./js/domain/historique.js",
  "./js/domain/ids.js",
  "./js/domain/journee.js",
  "./js/domain/libelles.js",
  "./js/domain/listes-def.js",
  "./js/domain/mon-plan.js",
  "./js/domain/notes.js",
  "./js/domain/phrase.js",
  "./js/domain/programme.js",
  "./js/domain/releves.js",
  "./js/domain/respiration.js",
  "./js/domain/ressourcer.js",
  "./js/domain/roue.js",
  "./js/domain/seances.js",
  "./js/domain/soins.js",
  "./js/domain/traitement-actuel.js",
  "./js/domain/typographie.js",
  "./js/domain/verification.js",
  "./js/domain/vocabulaire.js",
  "./js/donnees.js",
  "./js/export/page-a4.js",
  "./js/export/pdf.js",
  "./js/export/psy.js",
  "./js/export/soignants.js",
  "./js/main.js",
  "./js/plateforme/cycle.js",
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
  "./js/ui/composants/carte-emotions.js",
  "./js/ui/composants/coche.js",
  "./js/ui/composants/confirmation.js",
  "./js/ui/composants/dicter.js",
  "./js/ui/composants/en-parler.js",
  "./js/ui/composants/entete-jour.js",
  "./js/ui/composants/entete.js",
  "./js/ui/composants/feuille-element.js",
  "./js/ui/composants/feuille.js",
  "./js/ui/composants/heure.js",
  "./js/ui/composants/interrupteur.js",
  "./js/ui/composants/lecteur.js",
  "./js/ui/composants/memo-vocal.js",
  "./js/ui/composants/mon-plan.js",
  "./js/ui/composants/multiples.js",
  "./js/ui/composants/notes.js",
  "./js/ui/composants/parcours.js",
  "./js/ui/composants/pastilles.js",
  "./js/ui/composants/pourquoi.js",
  "./js/ui/composants/questions.js",
  "./js/ui/composants/repli.js",
  "./js/ui/composants/respiration.js",
  "./js/ui/composants/ressourcer.js",
  "./js/ui/composants/rubrique.js",
  "./js/ui/composants/segmente.js",
  "./js/ui/composants/signal-sonore.js",
  "./js/ui/composants/sons.js",
  "./js/ui/composants/texte.js",
  "./js/ui/composants/toast.js",
  "./js/ui/composants/traitement-actuel.js",
  "./js/ui/composants/une-chose.js",
  "./js/ui/ecrans/aide-iphone.js",
  "./js/ui/ecrans/analyse.js",
  "./js/ui/ecrans/apres-coup-liste.js",
  "./js/ui/ecrans/apres-coup.js",
  "./js/ui/ecrans/attente.js",
  "./js/ui/ecrans/aujourdhui.js",
  "./js/ui/ecrans/bien-etre.js",
  "./js/ui/ecrans/comprendre.js",
  "./js/ui/ecrans/consultation.js",
  "./js/ui/ecrans/diagnostic.js",
  "./js/ui/ecrans/effacer.js",
  "./js/ui/ecrans/episode.js",
  "./js/ui/ecrans/export-psy.js",
  "./js/ui/ecrans/guide.js",
  "./js/ui/ecrans/historique.js",
  "./js/ui/ecrans/listes.js",
  "./js/ui/ecrans/ma-journee.js",
  "./js/ui/ecrans/moment-difficile.js",
  "./js/ui/ecrans/moment.js",
  "./js/ui/ecrans/mon-plan.js",
  "./js/ui/ecrans/parcours-fiche.js",
  "./js/ui/ecrans/programme.js",
  "./js/ui/ecrans/rappel.js",
  "./js/ui/ecrans/rdv.js",
  "./js/ui/ecrans/reglages-emotions.js",
  "./js/ui/ecrans/reglages-moment-difficile.js",
  "./js/ui/ecrans/reglages-ressourcer.js",
  "./js/ui/ecrans/reglages.js",
  "./js/ui/ecrans/sauvegarde.js",
  "./js/ui/ecrans/soignants.js",
  "./js/ui/ecrans/soins.js",
  "./js/ui/ecrans/symptome.js",
  "./js/ui/ecrans/traitement.js",
  "./js/ui/fiche.js",
  "./js/ui/glissement.js",
  "./js/ui/graphes/comprendre.js",
  "./js/ui/graphes/dessin-canvas.js",
  "./js/ui/graphes/geometrie.js",
  "./js/ui/graphes/graphes.js",
  "./js/ui/hooks.js",
  "./js/ui/icones.js",
  "./js/ui/lecture.js",
  "./js/ui/lib.js",
  "./js/ui/mesures.js",
  "./js/ui/sauvegarde.js",
  "./js/ui/seance.js",
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
