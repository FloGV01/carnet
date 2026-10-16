import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';

// Texte fixe, comme le pas-à-pas du rappel : ce que l'iPhone fait lui-même, et comment le régler.
// Rien n'est lu, écrit ni compté, et le texte ne dit jamais quand s'en servir. Les chemins sont à vérifier sur l'iPhone.
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
    note: 'Par défaut, le minuteur ne coupe ni la Concentration ni les sons : ils restent allumés jusqu\'à ce que tu les éteignes, depuis le Centre de contrôle. À la fin, c\'est le minuteur de l\'iPhone qui sonne. Carnet n\'envoie rien.',
  },
];

export function AideIphone() {
  return html`<main class="ecran aide-iphone">
    <${Entete} titre="Aide iPhone" retour=${() => { location.hash = '#/reglages'; }} />
    <p class="note-import">Ce que l'iPhone fait lui-même. Tout se règle dans l'iPhone : Carnet ne lance rien et ne lit rien de tout cela. Le nom des menus peut varier un peu selon la version d'iOS.</p>
    ${RUBRIQUES.map((r) => html`<section class="aide-rubrique">
      <h2 class="libelle-section">${r.titre}</h2>
      <ol class="etapes">${r.etapes.map((e) => html`<li>${e}</li>`)}</ol>
      ${r.note && html`<p class="note-import">${r.note}</p>`}
    </section>`)}
  </main>`;
}
