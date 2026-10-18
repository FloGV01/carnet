import { html, useEffect, useRef, useState } from '../lib.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { Icones } from '../icones.js';

// Section repliable ; quand elle contient des données, sa ligne les résume.
// `memoriser` : l'état ouvert ou fermé est gardé d'une ouverture de l'app à l'autre.
// `resumeSous` : pour un titre long, le résumé passe sous le titre au lieu d'y être coupé.
// `cleStockage` : clé du stockage local, à la place de `carnet:repli:<cle>`.
// `surBascule(ouvert)` : prévient l'écran quand le repli s'ouvre ou se ferme.
// `caler` (v6.1) : à l'ouverture par un toucher, la page se cale pour montrer le repli en haut de
// l'écran, en douceur, ou d'un saut si « Réduire les animations » est actif. Jamais au chargement
// (un repli resté ouvert ne fait rien défiler), jamais à la fermeture.
export function Repli({ cle, titre, resume, memoriser = true, resumeSous = false, cleStockage = `carnet:repli:${cle}`, surBascule, caler = false, children }) {
  const [ouvert, setOuvert] = useState(() => memoriser && lireLocal(cleStockage, false) === true);
  const zone = useRef(null);
  const aCaler = useRef(false);
  const basculer = () => {
    const v = !ouvert;
    setOuvert(v);
    aCaler.current = v && caler;
    if (memoriser) ecrireLocal(cleStockage, v);
    if (surBascule) surBascule(v);
  };
  useEffect(() => {
    if (!aCaler.current || !zone.current) return;
    aCaler.current = false;
    const reduit = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    zone.current.scrollIntoView({ block: 'start', behavior: reduit ? 'auto' : 'smooth' });
  }, [ouvert]);
  return html`<section ref=${zone} class=${resumeSous ? 'repli resume-sous' : 'repli'}>
    <button type="button" class="repli-tete" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${basculer}>
      <span class="repli-fleche" aria-hidden="true">${Icones.chevron({ trait: 2 })}</span>
      <span class="repli-titre">${titre}</span>
      ${!ouvert && resume && html`<span class="repli-resume">${resume}</span>`}
    </button>
    ${ouvert && html`<div class="repli-corps">${children}</div>`}
  </section>`;
}
