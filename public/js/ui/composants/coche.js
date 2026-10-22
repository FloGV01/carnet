import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Sélection commune (2b), pour tout bouton de choix (pastilles, segmentés, « C'était vers… », Rappels, filtres) :
// la coche, montrée devant le libellé d'un choix fait (composants.css) ;
export const coche = () => html`<span class="coche" aria-hidden="true">${Icones.coche({ trait: 3 })}</span>`;

// et le libellé, qui garde la largeur de sa version en 600 (data-libelle, copie invisible et muette) : choisir
// ne change pas la largeur d'un bouton, ses voisins ne bougent pas.
export const libelleChoix = (texte) => html`<span class="libelle-choix" data-libelle=${texte}>${texte}</span>`;
