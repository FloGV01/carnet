// « Une chose à la fois » (v6) : le plan d'un écran à la fois, en très grand texte, pour les moments où
// lire une liste est trop dur. Une carte par ligne, Précédent et Suivant, « Tout voir ». Rien n'y est
// compté, enregistré ni conclu : ni « 3 sur 7 », ni message de fin, et jamais de verrou d'écran. Le Fermer
// est celui du cadre de l'écran qui l'accueille.
import { html, useEffect, useLayoutEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserUneChose } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

// Une lecture qui échoue donne les réglages par défaut : les cartes restent atteignables.
export const lireUneChose = () => repo.meta.lire('uneChoseALaFois').catch(() => null).then(normaliserUneChose);

export function UneChose({ cartes, surToutVoir }) {
  const [place, setPlace] = useState(0);
  const carte = cartes[place];
  const zone = useRef(null);
  const precedent = useRef(null);
  const suivant = useRef(null);
  const touche = useRef(null); // le bouton qu'on vient de toucher
  // Chaque carte s'ouvre en haut : la zone est la même d'une carte à l'autre, son défilement ne se reporte pas.
  useLayoutEffect(() => { if (zone.current) zone.current.scrollTop = 0; }, [place]);
  // À l'ouverture, le focus va sur la carte (un lecteur d'écran la lit). Quand le bouton touché devient
  // inactif (première ou dernière carte), le focus passe à l'autre au lieu de se perdre.
  useEffect(() => {
    const b = touche.current;
    touche.current = null;
    if (!zone.current) return;
    if (!b) zone.current.focus();
    else if (b.current.disabled) (b === suivant ? precedent : suivant).current.focus();
  }, [place]);
  if (!carte) return null;
  const aller = (n, bouton) => { touche.current = bouton; setPlace(n); };
  return html`<div class="une-chose">
    <section class="une-chose-carte" tabindex="-1" aria-live="polite" aria-atomic="true" ref=${zone}>
      <p class="une-chose-rubrique">${carte.rubrique}</p>
      <p class="une-chose-texte">${carte.texte}</p>
    </section>
    <div class="une-chose-actions">
      <button type="button" class="btn" ref=${precedent} disabled=${place === 0} onClick=${() => aller(place - 1, precedent)}>${Icones.retour({ trait: 2 })}Précédent</button>
      <button type="button" class="btn btn-plein" ref=${suivant} disabled=${place === cartes.length - 1} onClick=${() => aller(place + 1, suivant)}>Suivant${Icones.chevron({ trait: 2 })}</button>
      <button type="button" class="btn-lien une-chose-tout" onClick=${surToutVoir}>Tout voir</button>
    </div>
  </div>`;
}
