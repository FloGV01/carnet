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
import { connexionDisponible, prendreRetour, lireAttente, oublierAttente, issueRetour } from './plateforme/spotify.js';

// Le retour de Spotify (v11, spec §8.3), tout en haut : ?code=, ?state= et ?error= sont lus et retirés de l'adresse avant le
// guide d'installation et avant le retour sur Aujourd'hui. Hors de l'app installée, un code s'affiche, à copier (page du
// code) ; dans l'app, la connexion se finit (ou dit son échec) dans Mes refuges. Sans identifiant, rien n'est lu.
const retourSpotify = connexionDisponible() ? prendreRetour(window) : null;
const guide = doitAfficherGuide(window);
const issueSpotify = issueRetour({ retour: retourSpotify, attente: retourSpotify && lireAttente(window), guide });
if (issueSpotify === 'echec') oublierAttente(window);
const versRefuges = issueSpotify === 'finir' || issueSpotify === 'echec';
if (versRefuges) etatApp.maj({ retourSpotify: issueSpotify === 'finir' ? { issue: 'finir', code: retourSpotify.code } : { issue: 'echec' } });

// L'app s'ouvre toujours sur Aujourd'hui, quel que soit le hash de départ (au retour de Spotify, sur Mes refuges).
history.replaceState(null, '', `${location.pathname}${location.search}#/${versRefuges ? 'refuges' : ROUTE_ACCUEIL}`);
etatApp.maj({ route: lireRoute(location.hash) });
window.addEventListener('hashchange', (e) => {
  try { etatApp.maj({ routePrecedente: new URL(e.oldURL).hash }); } catch { /* ancienne adresse illisible */ }
  const route = lireRoute(location.hash);
  if (route.inconnue) history.replaceState(null, '', `${location.pathname}${location.search}#/${ROUTE_ACCUEIL}`);
  etatApp.maj({ route });
  window.scrollTo(0, 0);
});

initialiserSw({ surMajDisponible: () => etatApp.maj({ majDisponible: true }) }).catch(() => {});
if (estModeApp(window)) demanderPersistance();

// Retour au premier plan : le jour logique est recalculé ; après 30 min d'absence,
// retour sur Aujourd'hui, sauf pendant un parcours (déjà enregistré). L'Émotion du moment (#/moment, neuve ou rouverte)
// est un plein écran où tout s'écrit au toucher : elle se ferme aussi (relecture finale de la v9). Laissée ouverte le
// soir après un mot, elle gardait ce relevé comme relevé en cours, et un mot touché le matin le réécrivait, daté de la
// veille.
const estReleve = (hash) => /^#\/moment(\/|$)/.test(hash);
survivreAuCycle({
  surMinute: () => etatApp.maj((e) => ({ horloge: (e.horloge || 0) + 1 })),
  surRetour: (absenceMs) => {
    etatApp.maj((e) => ({ horloge: (e.horloge || 0) + 1 }));
    if (absenceMs > 30 * 60 * 1000 && (!etatApp.lire().parcoursOuvert || estReleve(location.hash))) location.hash = `#/${ROUTE_ACCUEIL}`;
  },
});

// v4 : jour à partir duquel un compteur d'explosions vide vaut 0 (domain/explosions.js).
// Écrit une seule fois, au premier lancement de cette version ; les jours d'avant restent inconnus.
if (!guide) {
  repo.meta.lire('explosionsDepuis')
    .then((v) => (v ? null : repo.meta.ecrire('explosionsDepuis', repo.aujourdhui())))
    .catch(() => {});
}

// Accès de test, uniquement en local.
if (estLocal(location)) window.__carnet = { repo, etatApp };

// Le texte d'attente « Carnet » du HTML est retiré : Preact ne le remplace pas de lui-même.
const racine = document.getElementById('app');
racine.textContent = '';
render(html`<${App} guide=${guide} codeSpotify=${issueSpotify === 'copier' ? retourSpotify.code : null} />`, racine);
