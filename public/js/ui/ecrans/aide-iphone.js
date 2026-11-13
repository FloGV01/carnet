import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { pourAffichage } from '../../domain/typographie.js';

// Texte fixe, comme le pas-à-pas du rappel : ce que l'iPhone fait lui-même et comment le régler, puis comment changer
// d'icône sans rien perdre (v11), seule rubrique qui passe par l'app (Exporter, Importer) : l'introduction ne dit donc
// « Emozio ne lance rien et ne lit rien » que des réglages. La page ne lit, n'écrit ni ne compte rien, et le texte ne dit
// jamais quand s'en servir. Les chemins sont à vérifier sur l'iPhone. v12 (relecture de la tâche 8) : les textes passent par
// pourAffichage, comme ceux du rappel, titres compris : la ponctuation haute ne commence jamais une ligne, et un guillemet ne
// commence ni ne finit seul une ligne, même en grand texte. Les textes du code gardent leurs espaces simples.
const RUBRIQUES = [
  {
    titre: 'Sons d\'arrière-plan',
    etapes: [
      'Ouvre Réglages › Centre de contrôle et ajoute « Sons d\'arrière-plan ».',
      'Dans le Centre de contrôle, touche « Sons d\'arrière-plan » et choisis « Bruit sombre ».',
      'La première fois, l\'iPhone télécharge le son : lance-le une fois avec du réseau.',
    ],
    note: 'Le même réglage est dans Réglages › Accessibilité › Audio et visuel › Sons d\'arrière-plan.',
  },
  {
    titre: 'Concentration « Moment difficile »',
    etapes: [
      'Ouvre Réglages › Concentration, touche « + », puis « Personnalisé ».',
      'Nomme-la « Moment difficile », puis choisis une icône et une couleur.',
      'Dans « Personnes » et « Apps », choisis ce qui reste autorisé.',
      'Elle s\'allume et s\'éteint depuis le Centre de contrôle, avec « Concentration ».',
    ],
  },
  {
    titre: 'Réduire le point blanc',
    etapes: [
      'Ouvre Réglages › Accessibilité › Affichage et taille du texte, puis « Réduire le point blanc ». Un curseur règle l\'intensité.',
      'Ouvre Réglages › Accessibilité › Raccourci d\'accessibilité et coche « Réduire le point blanc ».',
      'Un triple clic sur le bouton latéral l\'allume ou l\'éteint. Quand plusieurs raccourcis sont cochés, une liste s\'ouvre d\'abord.',
    ],
  },
  {
    titre: 'Parole en direct',
    etapes: [
      'Ouvre Réglages › Accessibilité › Parole en direct et allume-la.',
      'Ajoute des phrases toutes prêtes dans « Phrases favorites ».',
      'Coche « Parole en direct » dans Réglages › Accessibilité › Raccourci d\'accessibilité. Un triple clic sur le bouton latéral ouvre alors un clavier : l\'iPhone dit à voix haute ce que tu écris.',
    ],
    note: 'Quand plusieurs raccourcis sont cochés, comme ici avec « Réduire le point blanc », le triple clic ouvre une liste.',
  },
  {
    titre: 'Toucher le dos',
    etapes: [
      'Ouvre Réglages › Accessibilité › Toucher › Toucher le dos.',
      'Choisis « Double toucher » ou « Triple toucher ».',
      'Dans la liste « Raccourcis », choisis celui à lancer.',
      'Deux ou trois petits coups au dos de l\'iPhone le lancent.',
    ],
  },
  {
    titre: 'Raccourci « Sieste »',
    etapes: [
      'Ouvre Raccourcis, touche « + » et nomme le raccourci « Sieste ».',
      'Ajoute l\'action « Démarrer le minuteur » et règle la durée.',
      'Ajoute « Définir la Concentration », puis choisis « Ne pas déranger ».',
      'Dans cette action, un réglage donne la fin : par défaut, elle reste allumée jusqu\'à ce que tu l\'éteignes.',
      'Ajoute « Définir les sons d\'arrière-plan » et choisis « Bruit sombre ».',
      'Pour le lancer, touche-le dans Raccourcis, ajoute-le à l\'écran d\'accueil ou associe-le à Toucher le dos.',
    ],
    note: 'Par défaut, le minuteur ne coupe ni la Concentration ni les sons : ils restent allumés jusqu\'à ce que tu les éteignes, depuis le Centre de contrôle. À la fin, c\'est le minuteur de l\'iPhone qui sonne. Emozio n\'envoie rien.',
  },
  // v11 (spec §10) : une icône déjà sur l'écran d'accueil ne change sans doute pas seule, et la supprimer efface ses
  // données. Les étapes de la spec, mot pour mot sauf le nom (« Emozio », accord de l'utilisateur du 07/11, qui veut aussi
  // le nouveau nom sous l'icône) : rien n'est supprimé avant la dernière, une fois la copie vérifiée.
  // v12 (spec v12 §7) : l'étape Safari commence par la phrase de la spec v12, mot pour mot. Une page de Safari servie par
  // une ancienne version garde l'ancienne icône, et le bandeau n'existe pas dans Safari : fermer l'onglet puis rouvrir
  // l'adresse la met à jour. L'accord de l'utilisateur sur la spec v12 prime sur le « mot pour mot » de la spec v11 ; le nom
  // se règle dans l'aperçu, l'icône s'y vérifie encore. L'étape suit jusqu'au bout le tutoiement de la phrase de la spec v12
  // (relecture de la tâche 8) : « Sinon, annule et recommence. » ; « Ajouter » est le libellé du bouton de l'aperçu.
  // La note dit ce que la copie ne garde pas (ce qui vit hors de la base, dans le stockage local de la page).
  {
    titre: 'Changer d\'icône sans rien perdre',
    etapes: [
      'Redémarrer l\'iPhone : l\'icône a peut-être changé. Si oui, et si son nom est « Emozio », c\'est fini.',
      'Dans l\'ancienne app : Réglages › Exporter, enregistrer dans Fichiers.',
      'Dans Safari, ferme l\'onglet d\'Emozio s\'il est ouvert, puis rouvre l\'adresse : la page se met à jour. Ensuite, Partager › Sur l\'écran d\'accueil. Le nom, « Emozio », reste modifiable dans l\'aperçu. Si l\'aperçu montre la nouvelle icône, Ajouter. Sinon, annule et recommence.',
      'Ouvrir la nouvelle app, Emozio, qui doit être vide : Réglages › Importer. Vérifier quelques jours dans l\'Historique.',
      'Ranger l\'ancienne app dans un dossier, et ne plus y écrire. La supprimer plus tard, ou jamais.',
    ],
    note: 'La copie ne garde pas les brouillons en cours, les réglages du lecteur ni les replis ouverts. Le micro sera sans doute à réautoriser.',
  },
];

export function AideIphone() {
  return html`<main class="ecran aide-iphone">
    <${Entete} titre="Aide iPhone" retour=${() => { location.hash = '#/reglages'; }} />
    <p class="note-import">${pourAffichage('Ce que l\'iPhone fait lui-même, et comment changer d\'icône sans rien perdre. Pour les réglages, tout se règle dans l\'iPhone : Emozio ne lance rien et ne lit rien de tout cela. Le nom des menus peut varier un peu selon la version d\'iOS.')}</p>
    ${RUBRIQUES.map((r) => html`<section class="aide-rubrique">
      <h2 class="libelle-section">${pourAffichage(r.titre)}</h2>
      <ol class="etapes">${r.etapes.map((e) => html`<li>${pourAffichage(e)}</li>`)}</ol>
      ${r.note && html`<p class="note-import">${pourAffichage(r.note)}</p>`}
    </section>`)}
  </main>`;
}
