import { html, useEffect } from '../lib.js';
import { Icones } from '../icones.js';
import { etatApp } from '../../store.js';

// Cadre d'un parcours plein écran (ma journée, épisode, symptôme, consultation) : Fermer, nom,
// point teinté, repère d'étapes en points. Pendant un parcours, la barre d'onglets et le bandeau
// sont masqués, et le retour sur Aujourd'hui après 30 min ne s'applique pas.
// En 2b : le nom suit « Fermer », précédé d'un petit carré à la couleur du parcours (v7, tâche 8) ; le repère
// d'étapes est fait de points, jamais d'une barre : faites, pleines à la couleur du parcours ; en cours, pleine avec
// un anneau en -tint-2 ; à venir, en --line (v8 : --surface-2 ne se voyait pas en clair). `icone` (v7, Émotion du
// moment) met le titre en grand en tête du corps, avec l'icône dans un carré à la couleur du parcours, au lieu du nom
// dans la barre ; `droite` se place à droite de « Fermer » ; `panneau` est le panneau des réponses, collé en bas de
// l'écran, sous le corps qui défile.
export function CadreParcours({ titre, teinte, etape, nbEtapes = 0, surFermer, sousTitre, pied, sansPoint = false, icone, droite, panneau, children }) {
  useEffect(() => {
    etatApp.maj({ parcoursOuvert: true });
    return () => etatApp.maj({ parcoursOuvert: false });
  }, []);
  const recap = etape === 'recap';
  const etatRepere = (i) => (recap || i < etape ? 'fait' : i === etape ? 'en-cours' : null);
  return html`<div class=${`parcours teinte-${teinte || 'jour'}${panneau ? ' avec-panneau' : ''}`} role="dialog" aria-modal="true" aria-label=${titre}>
    <header class="parcours-tete">
      <button type="button" class="fermer" onClick=${surFermer}>${Icones.fermer({ trait: 2 })}Fermer</button>
      ${!icone && html`<span class="nom" aria-hidden="true">${!sansPoint && html`<span class="point-teinte"></span>`}${titre}</span>`}
      ${nbEtapes > 0 && html`<span class="reperes" role="img" aria-label=${recap ? 'Récapitulatif' : `Étape ${etape + 1} sur ${nbEtapes}`}>
        ${Array.from({ length: nbEtapes }, (_, i) => html`<i class=${etatRepere(i)}></i>`)}
      </span>`}
      ${droite && html`<div class="parcours-droite">${droite}</div>`}
    </header>
    ${sousTitre}
    <div class="parcours-corps">
      ${icone && html`<h1 class="titre-parcours"><span class="carre-titre" aria-hidden="true">${Icones[icone]()}</span>${titre}</h1>`}
      ${children}
    </div>
    ${panneau && html`<section class="panneau-reponses" aria-label="Réponses">${panneau}</section>`}
    ${pied && html`<footer class="parcours-pied">${pied}</footer>`}
  </div>`;
}
