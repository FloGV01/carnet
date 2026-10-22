// Changer de jour en glissant (v7, arbitrage B4 du plan v6.2), sur Aujourd'hui et la page d'un jour. Un glissement
// horizontal net : au moins 60 px, ou un geste rapide (30 px au moins, à 0,5 px/ms), et nettement plus horizontal que
// vertical (|dx| > 1,5 × |dy|). Vers la droite, la veille ; vers la gauche, le lendemain (l'écran refuse d'aller
// au-delà d'aujourd'hui). Le défilement vertical n'est jamais gêné : rien n'est empêché, on ne fait que lire le geste.
export const GLISSEMENT_MIN_PX = 60;
export const GLISSEMENT_RAPIDE_PX = 30;
export const GLISSEMENT_RAPIDE_PX_MS = 0.5;

// dx, dy : déplacement du doigt (px) ; duree : du toucher au lâcher (ms). 'precedent', 'suivant' ou null.
export function sensGlissement(dx, dy, duree) {
  const ax = Math.abs(dx);
  if (!(ax > 1.5 * Math.abs(dy))) return null;
  // ax / duree ≥ 0,5, écrit sans division : un geste trop bref pour être mesuré (0 ms) est rapide.
  const rapide = ax >= GLISSEMENT_RAPIDE_PX && ax >= GLISSEMENT_RAPIDE_PX_MS * duree;
  if (ax < GLISSEMENT_MIN_PX && !rapide) return null;
  return dx > 0 ? 'precedent' : 'suivant';
}

// Un geste qui part d'un champ de texte (son bouton « Dicter » compris), d'une feuille, d'une boîte de dialogue ou d'un
// parcours ouvert, ou d'un élément qui défile de côté, ne change pas de jour.
const IGNORES = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), .champ-avec-dicter, .feuille, .voile, .parcours, '
  + '[role="dialog"], [role="alertdialog"]';
export function departIgnore(cible) {
  if (!cible || typeof cible.closest !== 'function') return true;
  if (cible.closest(IGNORES)) return true;
  for (let el = cible; el && el.nodeType === 1; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /^(auto|scroll)$/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}
