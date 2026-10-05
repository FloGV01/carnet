import { html } from '../lib.js';
import { ParcoursFiche } from './parcours-fiche.js';
import { MemoVocal } from '../composants/memo-vocal.js';

// Ordre retenu avec l'utilisateur : le déclencheur d'abord (plus facile à dire que l'émotion).
export const ETAPES_EPISODE = [
  { champ: 'declencheur', liste: 'declencheur', question: 'Ça a démarré avec…', recap: 'Déclencheur' },
  { champ: 'emotion', liste: 'emotion', question: 'Ça ressemblait plutôt à…', recap: 'Émotion' },
  { champ: 'intensite', type: 'intensite', question: 'Intensité', sousQuestion: '1 = à peine, 10 = maximum', recap: 'Intensité' },
  { champ: 'dessous', liste: 'dessous', question: 'Et en dessous, il y avait peut-être…', recap: 'En dessous' },
  { champ: 'reaction', liste: 'reaction', question: 'Ta réaction', recap: 'Réaction' },
];
const TEXTES = [
  { champ: 'situation', etiquette: 'Situation', icone: 'note', placeholder: "Ce qui s'est passé…" },
  { champ: 'ceQuiAAide', etiquette: 'Ce qui a aidé', icone: 'positifs', placeholder: 'Une personne, un geste…' },
];

const memo = ({ id, date, assurerFiche }) => html`<${MemoVocal} parentStore="episodes" parentId=${id} date=${date} assurerParent=${assurerFiche} />`;

export function Episode({ id }) {
  return html`<${ParcoursFiche} store="episodes" route="episode" titre="Épisode" nomFiche="Épisode" etapes=${ETAPES_EPISODE}
    textes=${TEXTES} avecHeure=${true} id=${id} memo=${memo} teinte="ep" avecPlan=${true} />`;
}
