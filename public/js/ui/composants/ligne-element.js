// Une ligne d'un élément de Bien-être (v10, spec §7 et §14.4) : un exercice, la cohérence cardiaque, un minuteur ou les sons de
// fond. Son titre, le bouton lecture à droite, et l'épingle dans les listes des entrées.
// - Le bouton lecture lance d'un toucher : un exercice et la cohérence démarrent aussitôt dans le lecteur (le son et la voix
//   préparés dans ce toucher) ; les minuteurs et les sons ouvrent leur écran, qui attend son propre « Commencer ».
// - Le reste de la ligne ouvre l'écran « avant » du lecteur, qui attend « Commencer » : c'est là que se choisit la durée et que
//   s'enlève l'épingle d'un exercice qui n'est dans aucune entrée.
// Chacun revient à l'écran d'où il part (`retour`). Rien n'est lancé sans un toucher, rien n'est compté.
import { html } from '../lib.js';
import { Epingle } from './epingle.js';
import { dureeRetenue, lancerLecture, ouvrirDepart, retenirDernier } from './lecteur.js';
import { Icones } from '../icones.js';
import { titreElement } from '../../domain/entrees-bien-etre.js';
import { dureeEtPosture, exerciceDe } from '../../domain/exercices.js';
import { pourAffichage } from '../../domain/typographie.js';
import { versHash } from '../../routeur.js';

// Ce qui n'est pas dans le lecteur : son écran, sa ligne de description.
const ECRANS = { minuteur: 'minuteur', concentration: 'concentration', 'sons-de-fond': 'sons' };
const DETAILS = {
  coherence: 'Inspire et expire au rythme réglé.',
  minuteur: 'Un bol au début, un bol à la fin.',
  concentration: 'Un temps de travail, avec ou sans son de fond.',
  'sons-de-fond': 'Bruit brun, bruit rose, vagues, pluie douce.',
};
const aSonEcran = (id) => Object.hasOwn(ECRANS, id);

export function hashElement(id) {
  if (aSonEcran(id)) return versHash(ECRANS[id]);
  return id === 'coherence' ? versHash('coherence') : versHash('exercice', { id });
}

// Lancé : un élément du lecteur démarre (le lecteur le retient en commençant) ; les autres ouvrent leur écran, et sont retenus ici.
export function lancerElement(id, { retour }) {
  if (aSonEcran(id)) {
    retenirDernier(id);
    ouvrirDepart(hashElement(id), { retour });
    return;
  }
  lancerLecture(hashElement(id), { retour });
}
// Le toucher sur le reste de la ligne : l'écran « avant » du lecteur, qui saura où revenir. Les autres n'ont que leur écran.
export const surOuvrir = (id, retour) => (e) => {
  e.preventDefault();
  if (aSonEcran(id)) lancerElement(id, { retour });
  else ouvrirDepart(hashElement(id), { retour });
};

// La durée (celle qui est retenue, pour un exercice qui en a une au choix) et la posture, ou une ligne de description.
function detailElement(id) {
  const exercice = exerciceDe(id);
  return exercice ? dureeEtPosture({ ...exercice, dureeMin: dureeRetenue(exercice) }) : DETAILS[id];
}

// avecEpingle : dans la liste d'une entrée. Sans elle (les favoris de l'accueil), le titre seul : aucun chiffre sur l'accueil.
export function LigneElement({ id, retour, avecEpingle = false }) {
  const titre = titreElement(id);
  return html`<li class="ligne-element">
    <a class="ligne-element-corps" href=${hashElement(id)} onClick=${surOuvrir(id, retour)}>
      <span class="exercice-titre">${titre}</span>
      ${avecEpingle && html`<span class="exercice-description">${pourAffichage(detailElement(id))}</span>`}
    </a>
    <span class="ligne-element-actions">
      ${avecEpingle && html`<${Epingle} id=${id} titre=${titre} />`}
      <button type="button" class="bouton-lecture petit" aria-label=${`Commencer ${titre}`} onClick=${() => lancerElement(id, { retour })}>${Icones.lecture()}</button>
    </span>
  </li>`;
}
