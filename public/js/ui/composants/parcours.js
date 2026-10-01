import { html, useEffect } from '../lib.js';
import { etatApp } from '../../store.js';

// Cadre d'un parcours plein écran (épisode, symptôme) : ✕ Fermer, titre, repère d'étapes.
// Pendant un parcours, la barre d'onglets et le bandeau de mise à jour sont masqués.
export function CadreParcours({ titre, etape, nbEtapes, surFermer, sousTitre, pied, children }) {
  useEffect(() => {
    etatApp.maj({ parcoursOuvert: true });
    return () => etatApp.maj({ parcoursOuvert: false });
  }, []);
  const points = Array.from({ length: nbEtapes }, (_, i) => (etape === 'recap' || i < etape ? '●' : i === etape ? '●' : '○'));
  return html`<div class="parcours" role="dialog" aria-modal="true" aria-label=${titre}>
    <header class="parcours-tete">
      <button type="button" class="btn-lien" onClick=${surFermer}>✕ Fermer</button>
      <h1>${titre}</h1>
      <span class="reperes" aria-label=${etape === 'recap' ? 'Récapitulatif' : `Étape ${etape + 1} sur ${nbEtapes}`}>
        ${points.join(' ')}${etape === 'recap' ? ' ✓' : ''}</span>
    </header>
    ${sousTitre}
    <div class="parcours-corps">${children}</div>
    ${pied && html`<footer class="parcours-pied">${pied}</footer>`}
  </div>`;
}
