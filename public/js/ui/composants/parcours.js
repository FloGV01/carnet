import { html, useEffect } from '../lib.js';
import { Icones } from '../icones.js';
import { etatApp } from '../../store.js';
import { useGesteRetour } from './geste-retour.js';

// Un écran plein (un parcours, ou les écrans de l'émotion, v9) : tant qu'il est ouvert, la barre d'onglets et le
// bandeau sont masqués (app.js), et le retour sur Aujourd'hui après 30 min ne s'applique pas.
export function usePleinEcran() {
  useEffect(() => {
    etatApp.maj({ parcoursOuvert: true });
    return () => etatApp.maj({ parcoursOuvert: false });
  }, []);
}

// Cadre d'un parcours plein écran (ma journée, épisode, symptôme, consultation) : Fermer, nom, repère d'étapes en points.
// En 2b : le nom suit « Fermer » ; le repère d'étapes est fait de points, jamais d'une barre : à venir, un contour de 1,5 px
// en --text-2, sans fond (v8 : --surface-2, puis --line, ne se voyaient pas assez en clair). v12 (spec §5.3 et §5.4) : les
// parcours n'ont plus de couleur à eux. Le petit carré de couleur devant le nom est retiré ; les étapes faites et en cours
// sont à l'encre, jamais en vert (un point vert, et un « fait » vert), l'étape en cours avec un anneau --contour. `icone`
// (v7, le lecteur de Bien-être) met le titre en grand en tête du corps, avec son icône en --text-2, au lieu du nom dans la
// barre. v9 : l'Émotion du moment, qui portait la puce de droite et le panneau des réponses collé en bas, a ses propres
// écrans pleins (ui/ecrans/moment.js).
// `noir` (v10, « Réveil la nuit ») : fond noir dans les deux thèmes (.ecran-noir), pour ne pas éclairer la chambre ; il le
// reste en v11, quand les écrans de l'émotion, noirs comme lui jusque-là, suivent le thème.
// `relecture` (v11, spec §11) : un écran où l'on relit (le récapitulatif d'un épisode ou d'un symptôme rouvert, celui de
// l'Après coup). Le doigt qui glisse vers la droite y fait comme « Fermer » (geste-retour.js), et la classe .relecture le
// laisse passer (glissement.js, ecrans.css). Partout ailleurs (une saisie, un exercice, un minuteur), aucun geste.
export function CadreParcours({ titre, etape, nbEtapes = 0, surFermer, sousTitre, pied, icone, noir = false, relecture = false, children }) {
  usePleinEcran();
  useGesteRetour(relecture ? surFermer : null);
  const recap = etape === 'recap';
  const etatRepere = (i) => (recap || i < etape ? 'fait' : i === etape ? 'en-cours' : null);
  return html`<div class=${`parcours${noir ? ' ecran-noir' : ''}${relecture ? ' relecture' : ''}`} role="dialog" aria-modal="true" aria-label=${titre}>
    <header class="parcours-tete">
      <button type="button" class="fermer" onClick=${surFermer}>${Icones.fermer({ trait: 2 })}Fermer</button>
      ${!icone && html`<span class="nom" aria-hidden="true">${titre}</span>`}
      ${nbEtapes > 0 && html`<span class="reperes" role="img" aria-label=${recap ? 'Récapitulatif' : `Étape ${etape + 1} sur ${nbEtapes}`}>
        ${Array.from({ length: nbEtapes }, (_, i) => html`<i class=${etatRepere(i)}></i>`)}
      </span>`}
    </header>
    ${sousTitre}
    <div class="parcours-corps">
      ${icone && html`<h1 class="titre-parcours"><span class="icone-titre" aria-hidden="true">${Icones[icone]()}</span>${titre}</h1>`}
      ${children}
    </div>
    ${pied && html`<footer class="parcours-pied">${pied}</footer>`}
  </div>`;
}
