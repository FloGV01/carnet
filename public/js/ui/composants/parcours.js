import { html, useEffect } from '../lib.js';
import { Icones } from '../icones.js';
import { etatApp } from '../../store.js';

// Cadre d'un parcours plein écran (ma journée, épisode, symptôme, consultation) : Fermer, nom,
// point teinté, repère d'étapes en points. Pendant un parcours, la barre d'onglets et le bandeau
// sont masqués, et le retour sur Aujourd'hui après 30 min ne s'applique pas.
export function CadreParcours({ titre, teinte, etape, nbEtapes = 0, surFermer, sousTitre, pied, sansPoint = false, children }) {
  useEffect(() => {
    etatApp.maj({ parcoursOuvert: true });
    return () => etatApp.maj({ parcoursOuvert: false });
  }, []);
  const recap = etape === 'recap';
  return html`<div class=${`parcours teinte-${teinte || 'jour'}`} role="dialog" aria-modal="true" aria-label=${titre}>
    <header class="parcours-tete">
      <button type="button" class="fermer" onClick=${surFermer}>${Icones.fermer({ trait: 2 })}Fermer</button>
      <span class="nom" aria-hidden="true">· ${titre}${!sansPoint && html` <span class="point-teinte"></span>`}</span>
      ${nbEtapes > 0 && html`<span class="reperes" role="img" aria-label=${recap ? 'Récapitulatif' : `Étape ${etape + 1} sur ${nbEtapes}`}>
        ${Array.from({ length: nbEtapes }, (_, i) => html`<i class=${recap || i <= etape ? 'fait' : ''}></i>`)}
      </span>`}
    </header>
    ${sousTitre}
    <div class="parcours-corps">${children}</div>
    ${pied && html`<footer class="parcours-pied">${pied}</footer>`}
  </div>`;
}
