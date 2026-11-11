import { html, useEffect, useRef, useState } from '../lib.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { Icones } from '../icones.js';

const ECART_SOUS_BANDEAU = 8;

// Section repliable ; quand elle contient des données, sa ligne les résume.
// `memoriser` : l'état ouvert ou fermé est gardé d'une ouverture de l'app à l'autre.
// `resumeSous` : pour un titre long, le résumé passe sous le titre au lieu d'y être coupé.
// `cleStockage` : clé du stockage local, à la place de `carnet:repli:<cle>`.
// `surBascule(ouvert)` : prévient l'écran quand le repli s'ouvre ou se ferme.
// `icone` (2b, v7) : le repli est une carte, l'icône à gauche du titre et le chevron à droite. Dans la liste groupée
// d'Aujourd'hui (.replis), les replis sont les rangées d'une seule carte, le résumé sous le titre (`resumeSous`). v12 (spec
// §5.4) : plus de carré coloré ; un repli ouvre quelque chose, son icône est à l'accent, et son chevron en --contour.
// `caler` (v6.1) : à l'ouverture par un toucher, la page se cale pour montrer le repli en haut de
// l'écran, en douceur, ou d'un saut si « Réduire les animations » est actif. Jamais au chargement
// (un repli resté ouvert ne fait rien défiler), jamais à la fermeture. Le haut de l'écran est sous le
// bandeau « Nouvelle version prête » quand il est là (collé en haut, zone sûre comprise), sinon sous la
// zone sûre (scroll-margin-top du repli).
export function Repli({ cle, titre, resume, memoriser = true, resumeSous = false, cleStockage = `carnet:repli:${cle}`, surBascule, caler = false, icone, children }) {
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
    const bandeau = document.querySelector('.bandeau');
    const haut = bandeau ? bandeau.getBoundingClientRect().height + ECART_SOUS_BANDEAU : parseFloat(getComputedStyle(zone.current).scrollMarginTop) || 0;
    const cible = window.scrollY + zone.current.getBoundingClientRect().top - haut;
    window.scrollTo({ top: Math.max(0, Math.round(cible)), behavior: reduit ? 'auto' : 'smooth' });
  }, [ouvert]);
  const fleche = html`<span class="repli-fleche" aria-hidden="true">${Icones.chevron({ trait: 2 })}</span>`;
  const resumeVu = !ouvert && resume && html`<span class="repli-resume">${resume}</span>`;
  return html`<section ref=${zone} class=${['repli', resumeSous && 'resume-sous', icone && 'repli-carte'].filter(Boolean).join(' ')}>
    <button type="button" class="repli-tete" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${basculer}>
      ${icone ? html`<span class="repli-icone" aria-hidden="true">${Icones[icone]()}</span>` : fleche}
      ${icone && resumeSous
    ? html`<span class="repli-textes"><span class="repli-titre">${titre}</span>${resumeVu}</span>`
    : html`<span class="repli-titre">${titre}</span>${resumeVu}`}
      ${icone && fleche}
    </button>
    ${ouvert && html`<div class="repli-corps">${children}</div>`}
  </section>`;
}
