// « Une chose à la fois » (v6) : le plan d'un écran à la fois, en très grand texte, pour les moments où
// lire une liste est trop dur. Une carte par ligne, Précédent et Suivant, « Tout voir ». Rien n'y est
// compté, enregistré ni conclu : ni « 3 sur 7 », ni message de fin, et jamais de verrou d'écran. Le Fermer
// est celui du cadre de l'écran qui l'accueille.
import { html, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserUneChose } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

// Une lecture qui échoue donne les réglages par défaut : les cartes restent atteignables.
export const lireUneChose = () => repo.meta.lire('uneChoseALaFois').catch(() => null).then(normaliserUneChose);

export function UneChose({ cartes, surToutVoir }) {
  const [place, setPlace] = useState(0);
  const carte = cartes[place];
  if (!carte) return null;
  return html`<div class="une-chose">
    <section class="une-chose-carte" aria-live="polite" aria-atomic="true">
      <p class="une-chose-rubrique">${carte.rubrique}</p>
      <p class="une-chose-texte">${carte.texte}</p>
    </section>
    <div class="une-chose-actions">
      <button type="button" class="btn" disabled=${place === 0} onClick=${() => setPlace(place - 1)}>${Icones.retour({ trait: 2 })}Précédent</button>
      <button type="button" class="btn btn-plein" disabled=${place === cartes.length - 1} onClick=${() => setPlace(place + 1)}>Suivant${Icones.chevron({ trait: 2 })}</button>
      <button type="button" class="btn-lien une-chose-tout" onClick=${surToutVoir}>Tout voir</button>
    </div>
  </div>`;
}
