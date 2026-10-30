// La carte des émotions (v9, spec §4.2 ; visuel-hwf.md §2), comme How We Feel : toute la grille de 12 × 12, plus les mots
// à soi hors du carré de leur zone (domain/carte-roue.js, motsDeLaCarte), en bulles de 96 pt à la couleur de leur case,
// dans un cadre plein écran qui défile librement dans les deux sens ; la page, elle, ne défile jamais de côté.
// - Ouverte depuis une bulle de l'écran 1, elle est centrée sur le milieu de sa zone (`centre`).
// - Un mot choisi (`choisi`) devient la double capsule de 156 pt ; ses voisines passent à 120 puis 108 pt (la lentille de
//   ui/carte-geometrie.js) et la carte glisse jusqu'à lui, au milieu de l'écran. Les bulles changent de place et de
//   taille en 450 ms ; avec « Réduire les animations », tout est immédiat (base.css), recentrage compris.
// - Toucher un mot appelle `surMot(id)`, qui écrit (le mot, ou rien s'il était déjà choisi). Pendant la garde (`enGarde`,
//   350 ms après un changement de vue ou un mot choisi), la carte ignore les touchers et est aria-disabled.
// Le plan a la taille de toutes les dispositions possibles, plus une demi-fenêtre de chaque côté : n'importe quel mot,
// même au bord, peut venir au centre. Les bulles y sont posées par CSSOM (transform, --c), sans attribut style.
// Pour VoiceOver, chaque zone est un groupe nommé (« Énergie haute · désagréable »), ses mots dans l'ordre de lecture de
// la carte ; chaque bulle est un bouton à son mot, aria-pressed quand il est choisi.
import { html, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from '../lib.js';
import { ZONES, NOMS_ZONES } from '../../domain/carte-roue.js';
import { couleurCase, disposition, etendue, pointDe, DIAMETRE } from '../carte-geometrie.js';
import { ajusterEtiquettes, zonesSures } from '../mesures.js';

const RAYON = DIAMETRE / 2;
// La hauteur du voile noir du haut sous la zone sûre (.carte-fondu, visuel §2.7), qui couvre aussi les boutons.
const VOILE_PX = 84;
// Le plus petit corps d'un libellé de bulle (12 pt au texte par défaut ; visuel §2.6), et la marge gardée au bord du disque.
const PLANCHER_PX = 9;
const MARGE_PX = 3;
// Le disque d'une bulle, en px de l'écran ; aucun pour le mot choisi (la double capsule, plus large que son libellé).
const disque = (e) => {
  const b = e.closest('.bulle-mot');
  if (b.classList.contains('choisi')) return null;
  const r = b.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 - MARGE_PX * (r.width / DIAMETRE) };
};
const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Les mots de la carte, avec la couleur de leur case.
export const motsColores = (mots) => mots.map((m) => ({ ...m, couleur: couleurCase(m.col, m.rang) }));

export function CarteEmotions({ mots, choisi = null, centre = null, enGarde = false, surMot }) {
  const cadre = useRef(null);
  const [, redessiner] = useReducer((n) => n + 1, 0);
  const geo = useMemo(() => etendue(mots), [mots]);
  const places = useMemo(() => disposition(mots, choisi), [mots, choisi]);
  // Une demi-fenêtre de marge autour de toutes les places : la carte occupe tout l'écran (inset 0). Les bords en pt
  // entiers (la lentille mesurée a des dixièmes) : la place régulière d'un mot l'est aussi, et le défilement, entier,
  // amène le mot choisi pile au milieu.
  const [mx, my] = [Math.ceil(window.innerWidth / 2), Math.ceil(window.innerHeight / 2)];
  const [x0, y0] = [Math.floor(geo.minX), Math.floor(geo.minY)];
  const [ox, oy] = [mx - x0, my - y0];
  const taille = { width: `${Math.ceil(geo.maxX) - x0 + 2 * mx}px`, height: `${Math.ceil(geo.maxY) - y0 + 2 * my}px` };
  // Amène un point au milieu de l'écran. `borne` : sans dépasser le bord des bulles (plus la moitié d'un écart), pour
  // l'ouverture sur une zone, qui montre ainsi des bulles jusqu'aux bords de l'écran ; un mot choisi, lui, vient
  // toujours au milieu, même au bord de la carte (visuel §2.1). En haut, la borne laisse la place du voile et des
  // boutons (la zone sûre et 84 pt, visuel §2.7) : ouverte sur le rouge ou le jaune, la carte vient au milieu de la
  // zone, et les mots du rang 12, les plus intenses, ne passent ni sous ← et la loupe ni sous le voile (relecture finale).
  const centrer = ({ x, y }, { doux = false, borne = false } = {}) => {
    const c = cadre.current;
    if (!c) return;
    let [left, top] = [x + ox - c.clientWidth / 2, y + oy - c.clientHeight / 2];
    if (borne) {
      const r = geo.regulier;
      const pad = RAYON + 5;
      const voile = zonesSures().haut + VOILE_PX;
      left = Math.max(r.minX + ox - pad, Math.min(left, r.maxX + ox + pad - c.clientWidth));
      top = Math.max(r.minY + oy - pad - voile, Math.min(top, r.maxY + oy + pad - c.clientHeight));
    }
    c.scrollTo({ left, top, behavior: doux && !reduit() ? 'smooth' : 'auto' });
  };
  // À l'ouverture : le milieu de la zone touchée, sinon le mot choisi, sinon le milieu de la carte ; le focus va à la zone
  // touchée (sinon à la carte), sans la faire bouger.
  useLayoutEffect(() => {
    centrer(pointDe(mots, centre ? { zone: centre } : { id: choisi }), { borne: Boolean(centre) || !choisi });
    const cible = (centre && cadre.current.querySelector(`[data-zone="${centre}"]`)) || cadre.current.querySelector('.zone-carte');
    if (cible) cible.focus({ preventScroll: true });
  }, []);
  // Un mot choisi ensuite : la carte glisse jusqu'à lui.
  const ouverte = useRef(false);
  useLayoutEffect(() => {
    if (!ouverte.current) { ouverte.current = true; return; }
    if (choisi) centrer(pointDe(mots, { id: choisi }), { doux: true });
  }, [choisi]);
  // La fenêtre change de taille (l'iPhone tourne) : les marges suivent.
  useEffect(() => {
    window.addEventListener('resize', redessiner);
    return () => window.removeEventListener('resize', redessiner);
  }, []);
  // Chaque libellé tient dans les 78 pt utiles de sa bulle (80 %, visuel §2.6) et dans son disque, même en très grand
  // texte.
  useEffect(() => {
    let actif = true;
    const ajuster = () => { if (actif && cadre.current) ajusterEtiquettes(cadre.current.querySelectorAll('.etiquette-mot'), PLANCHER_PX, disque); };
    ajuster();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
    return () => { actif = false; };
  }, [mots]);

  const bulle = (m) => {
    const p = places.get(m.id);
    const est = m.id === choisi;
    const style = { '--c': m.couleur, transform: `translate(${(p.x + ox - RAYON).toFixed(1)}px, ${(p.y + oy - RAYON).toFixed(1)}px) scale(${p.echelle})` };
    return html`<button type="button" key=${m.id} class=${est ? 'bulle-mot choisi' : 'bulle-mot'} aria-pressed=${est ? 'true' : 'false'} style=${style}
      onClick=${() => { if (!enGarde) surMot(m.id); }}>
      <span class="demi droite" aria-hidden="true"></span><span class="demi gauche"><span class="etiquette-mot">${m.libelle}</span></span>
    </button>`;
  };
  // Dans chaque zone, l'ordre de lecture de la carte : du rang le plus haut au plus bas, de gauche à droite.
  const parZone = useMemo(() => Object.fromEntries(ZONES.map((z) => [z, mots.filter((m) => m.zone === z)
    .sort((a, b) => b.rang - a.rang || a.col - b.col)])), [mots]);
  return html`<div class="carte-defile" ref=${cadre}>
    <div class="carte-plan" role="group" aria-label="Émotion" aria-disabled=${enGarde ? 'true' : null} style=${taille}>
      ${ZONES.map((z) => html`<div key=${z} class="zone-carte" role="group" aria-label=${NOMS_ZONES[z]} data-zone=${z} tabindex="-1">
        ${parZone[z].map(bulle)}
      </div>`)}
    </div>
  </div>`;
}
