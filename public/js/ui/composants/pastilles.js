import { html, useRef, useState } from '../lib.js';
import { coche, libelleChoix } from './coche.js';
import { decouperLibelle } from '../../domain/libelles.js';

// Grille de choix : un toucher choisit, un second toucher sur le choix sélectionné l'efface.
// L'écriture part au click (jamais au touchstart) pour qu'un défilement ne sélectionne rien.
// Choisi : un aplat d'accent, graisse 600 et coche (sélection commune, composants.css ; v12 : plus de couleur de
// rubrique). Une option peut porter son nom pour VoiceOver (`aria`) quand son libellé affiché est
// découpé (« 4 h » et, en petit, « ou moins »).
export function Pastilles({ etiquette, options, valeur, surChoix, colonnes = 3, classe = '', ariaPrefixe, surAjouter }) {
  return html`<div class=${`pastilles colonnes-${colonnes} ${classe}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = valeur === o.valeur;
      const { principal, precision } = decouperLibelle(o.libelle);
      return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'}
        aria-label=${o.aria || (ariaPrefixe ? `${ariaPrefixe} ${o.libelle}` : null)}
        onClick=${() => surChoix(choisi ? null : o.valeur)}>
        ${coche()}
        <span class="texte-pastille">${libelleChoix(principal)}${precision && html`<small>${libelleChoix(precision)}</small>`}</span>
      </button>`;
    })}
    ${surAjouter && html`<${PastilleAjout} etiquette=${etiquette} surAjouter=${surAjouter} />`}
  </div>`;
}

// « + Ajouter » : crée un élément de liste depuis la grille et le choisit aussitôt.
function PastilleAjout({ etiquette, surAjouter }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef(null);
  const valider = async () => {
    const v = zone.current && zone.current.value.trim();
    setOuvert(false);
    if (v) await surAjouter(v);
  };
  if (!ouvert) return html`<button type="button" class="pastille pastille-ajout" onClick=${() => { setOuvert(true); setTimeout(() => zone.current && zone.current.focus(), 0); }}>+ Ajouter</button>`;
  return html`<div class="ajout-pastille">
    <input ref=${zone} class="champ-ligne" aria-label=${`Nouvel élément : ${etiquette}`} enterkeyhint="done"
      onKeyDown=${(e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') setOuvert(false); }} />
    <button type="button" class="btn" onClick=${valider}>Ajouter</button>
  </div>`;
}
