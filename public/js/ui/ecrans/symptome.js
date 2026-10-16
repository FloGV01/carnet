import { html } from '../lib.js';
import { ParcoursFiche } from './parcours-fiche.js';
import { MemoVocal } from '../composants/memo-vocal.js';

export const ETAPES_SYMPTOME = [
  { champ: 'symptome', liste: 'symptome', question: 'Quel symptôme ?', recap: 'Symptôme' },
  { champ: 'intensite', type: 'intensite', question: 'Intensité', sousQuestion: '1 = à peine, 10 = maximum', recap: 'Intensité' },
  { champ: 'duree', liste: 'duree', question: 'Combien de temps ?', recap: 'Durée' },
];
export const TEXTES_SYMPTOME = [
  { champ: 'contexte', etiquette: 'Contexte', icone: 'note', placeholder: 'Où, quand, avec qui…' },
  { champ: 'note', etiquette: 'Note', icone: 'note', placeholder: '' },
];
const memo = ({ id, date, assurerFiche }) => html`<${MemoVocal} parentStore="symptomes" parentId=${id} date=${date} assurerParent=${assurerFiche} />`;

export function Symptome({ id }) {
  return html`<${ParcoursFiche} store="symptomes" route="symptome" titre="Symptôme" nomFiche="Symptôme" etapes=${ETAPES_SYMPTOME}
    textes=${TEXTES_SYMPTOME} avecHeure=${false} id=${id} memo=${memo} teinte="sy" />`;
}
