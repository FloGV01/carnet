import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Barre d'onglets façon iOS (v12, spec §5.4) : fond --barre ; l'onglet actif est en --accent-texte, avec son icône pleine et
// son libellé en 600, sans pilule (composants.css) : la forme dit aussi quel onglet est ouvert, pas la couleur seule. Les
// autres sont au trait, en --text-2. v7 : Aujourd'hui · Analyse · Bien-être · Soins · Réglages ; l'Historique rejoint
// l'Analyse (sa porte). `icone` : la clé de l'icône quand elle diffère de l'id (l'icône pleine ajoute « Plein » à la clé).
export const ONGLETS_V1 = [
  { id: 'aujourdhui', libelle: "Aujourd'hui", hash: '#/aujourdhui' },
  { id: 'analyse', libelle: 'Analyse', hash: '#/analyse' },
  { id: 'bien-etre', icone: 'bienEtre', libelle: 'Bien-être', hash: '#/bien-etre' },
  { id: 'soins', libelle: 'Soins', hash: '#/soins' },
  { id: 'reglages', libelle: 'Réglages', hash: '#/reglages' },
];

export function BarreOnglets({ actif, onglets = ONGLETS_V1 }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${onglets.map((o) => {
      const cle = o.icone || o.id;
      const estActif = o.id === actif;
      return html`<a class="onglet" href=${o.hash} aria-current=${estActif ? 'page' : null}>
        <span class="onglet-icone">${(estActif ? Icones[`${cle}Plein`] : Icones[cle])({ trait: 1.8 })}</span><span class="onglet-libelle">${o.libelle}</span></a>`;
    })}
  </nav>`;
}
