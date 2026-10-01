// Démarrage : retour systématique sur Aujourd'hui, service worker, stockage protégé, rendu.
import { html, render } from './ui/lib.js';
import { App } from './app.js';
import { etatApp } from './store.js';
import { lireRoute, ROUTE_ACCUEIL } from './routeur.js';
import { doitAfficherGuide, estModeApp } from './plateforme/mode.js';
import { initialiserSw } from './plateforme/sw-client.js';
import { demanderPersistance } from './plateforme/persistance.js';
import { survivreAuCycle } from './plateforme/cycle.js';
import { estLocal } from './plateforme/mode.js';
import { repo } from './donnees.js';

const guide = doitAfficherGuide(window);

// L'app s'ouvre toujours sur Aujourd'hui, quel que soit le hash de départ.
history.replaceState(null, '', `${location.pathname}${location.search}#/${ROUTE_ACCUEIL}`);
etatApp.maj({ route: lireRoute(location.hash) });
window.addEventListener('hashchange', () => {
  const route = lireRoute(location.hash);
  if (route.inconnue) history.replaceState(null, '', `${location.pathname}${location.search}#/${ROUTE_ACCUEIL}`);
  etatApp.maj({ route });
  window.scrollTo(0, 0);
});

initialiserSw({ surMajDisponible: () => etatApp.maj({ majDisponible: true }) }).catch(() => {});
if (estModeApp(window)) demanderPersistance();

// Retour au premier plan : le jour logique est recalculé ; après 30 min d'absence,
// retour sur Aujourd'hui, sauf pendant un parcours (déjà enregistré).
survivreAuCycle({
  surMinute: () => etatApp.maj((e) => ({ horloge: (e.horloge || 0) + 1 })),
  surRetour: (absenceMs) => {
    etatApp.maj((e) => ({ horloge: (e.horloge || 0) + 1 }));
    if (absenceMs > 30 * 60 * 1000 && !etatApp.lire().parcoursOuvert) location.hash = `#/${ROUTE_ACCUEIL}`;
  },
});

// Accès de test, uniquement en local.
if (estLocal(location)) window.__carnet = { repo, etatApp };

render(html`<${App} guide=${guide} />`, document.getElementById('app'));
