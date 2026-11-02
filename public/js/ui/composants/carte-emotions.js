// La carte des émotions (v9, spec §4.2 ; visuel-hwf.md §2), comme How We Feel : toute la grille de 12 × 12, plus les mots
// à soi hors du carré de leur zone (domain/carte-roue.js, motsDeLaCarte), en bulles de 96 pt à la couleur de leur case,
// dans un cadre plein écran qui défile librement dans les deux sens ; la page, elle, ne défile jamais de côté.
// - Ouverte depuis une bulle de l'écran 1, elle est centrée sur le milieu de sa zone (`centre`).
// - Un mot choisi (`choisi`) devient la double capsule de 156 pt ; ses voisines passent à 120 puis 108 pt (la lentille de
//   ui/carte-geometrie.js) et la carte glisse jusqu'à lui, au milieu de l'écran. Les bulles changent de place et de
//   taille en 450 ms ; avec « Réduire les animations », tout est immédiat (base.css), recentrage compris.
// - La lentille suit le glissement (v10, spec §4.1) : son centre est le mot du milieu de la fenêtre (motDuMilieu), des
//   cercles de 156, 120, 108 et 96 pt. Ses changements sont posés par CSSOM, une fois par image au plus, sans rendu des 144
//   bulles. Glisser n'écrit rien : ni .choisi, ni aria-pressed, ni relevé. Le mot choisi garde sa double capsule, à
//   l'échelle que la lentille lui donne. Avec « Réduire les animations », rien n'est branché : seul le mot choisi a sa
//   lentille, comme en v9.
// - Toucher un mot appelle `surMot(id)`, qui écrit (le mot, ou rien s'il était déjà choisi). Pendant la garde (`enGarde`,
//   350 ms après un changement de vue ou un mot choisi), la carte ignore les touchers et est aria-disabled. Les bulles
//   peuvent bouger sous un doigt posé (la lentille, de 36 à 48 pt) : seul compte le mot sous le doigt quand il se pose, et
//   le toucher est ignoré si un autre le remplace quand il se lève (point de vigilance 1 de la v10).
// Le plan a la taille de toutes les dispositions possibles, plus une demi-fenêtre de chaque côté : n'importe quel mot,
// même au bord, peut venir au centre. Les bulles y sont posées par CSSOM (transform, --c), sans attribut style.
// Pour VoiceOver, chaque zone est un groupe nommé (« Énergie haute · désagréable »), ses mots dans l'ordre de lecture de
// la carte ; chaque bulle est un bouton à son mot, aria-pressed quand il est choisi.
import { html, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from '../lib.js';
import { ZONES, NOMS_ZONES } from '../../domain/carte-roue.js';
import { couleurCase, disposition, etendue, motDuMilieu, pointDe, DIAMETRE } from '../carte-geometrie.js';
import { ajusterEtiquettes, zonesSures } from '../mesures.js';

const RAYON = DIAMETRE / 2;
// La hauteur du voile noir du haut sous la zone sûre (.carte-fondu, visuel §2.7), qui couvre aussi les boutons.
const VOILE_PX = 84;
// Le plus petit corps d'un libellé de bulle (12 pt au texte par défaut ; visuel §2.6), et la marge gardée au bord du disque.
const PLANCHER_PX = 9;
const MARGE_PX = 3;
// Un recentrage doux dure moins que ça : au-delà, la lentille reprend le milieu, même s'il n'est pas arrivé (interrompu).
const RECENTRAGE_MS = 1200;
// Entre le doigt levé et le clic, moins que ça : au-delà, l'appui n'a pas donné de clic (un toucher entre deux bulles).
const APPUI_MS = 500;
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
  // La lentille suit-elle le glissement ? Lu à l'ouverture.
  const [suit] = useState(() => !reduit());
  // Une demi-fenêtre de marge autour de toutes les places : la carte occupe tout l'écran (inset 0). Les bords en pt
  // entiers (la lentille mesurée a des dixièmes) : la place régulière d'un mot l'est aussi, et le défilement, entier,
  // amène le mot choisi pile au milieu.
  const [mx, my] = [Math.ceil(window.innerWidth / 2), Math.ceil(window.innerHeight / 2)];
  const [x0, y0] = [Math.floor(geo.minX), Math.floor(geo.minY)];
  const [ox, oy] = [mx - x0, my - y0];
  const taille = { width: `${Math.ceil(geo.maxX) - x0 + 2 * mx}px`, height: `${Math.ceil(geo.maxY) - y0 + 2 * my}px` };
  // L'origine du plan, pour ce qui s'exécute hors du rendu (le défilement).
  const repere = useRef(null);
  repere.current = { ox, oy };
  // Le recentrage doux en cours après un mot touché : { left, top, jusqua }, ou null. La carte fait alors passer d'autres
  // mots au milieu, la lentille reste sur le mot touché.
  const recentrage = useRef(null);
  // Le défilement qui amène un point au milieu d'une fenêtre. `borne` : sans dépasser le bord des bulles (plus la moitié
  // d'un écart), pour l'ouverture sur une zone, qui montre ainsi des bulles jusqu'aux bords de l'écran ; un mot choisi,
  // lui, vient toujours au milieu, même au bord de la carte (visuel §2.1). En haut, la borne laisse la place du voile et
  // des boutons (la zone sûre et 84 pt, visuel §2.7) : ouverte sur le rouge ou le jaune, la carte vient au milieu de la
  // zone, et les mots du rang 12, les plus intenses, ne passent ni sous ← et la loupe ni sous le voile (relecture finale).
  const defilementPour = ({ x, y }, borne, largeur, hauteur) => {
    let [left, top] = [x + ox - largeur / 2, y + oy - hauteur / 2];
    if (borne) {
      const r = geo.regulier;
      const pad = RAYON + 5;
      const voile = zonesSures().haut + VOILE_PX;
      left = Math.max(r.minX + ox - pad, Math.min(left, r.maxX + ox + pad - largeur));
      top = Math.max(r.minY + oy - pad - voile, Math.min(top, r.maxY + oy + pad - hauteur));
    }
    return { left, top };
  };
  // À l'ouverture : le défilement du milieu de la zone touchée, sinon du mot choisi, sinon du milieu de la carte, et le mot
  // du milieu de cette fenêtre, centre de la lentille. Sur le rouge ou le jaune, la lentille écarte les mots du rang 12
  // vers le haut : la carte descend d'autant s'il le faut, ils restent sous le voile et les boutons (relecture finale).
  const ouverture = (largeur, hauteur) => {
    const { left, top } = defilementPour(pointDe(mots, centre ? { zone: centre } : { id: choisi }), Boolean(centre) || !choisi, largeur, hauteur);
    const id = motDuMilieu(mots, { x: left + largeur / 2 - ox, y: top + hauteur / 2 - oy });
    if (!suit || (centre !== 'rouge' && centre !== 'jaune')) return { left, top, id };
    const haut = Math.min(...[...disposition(mots, id).values()].map((p) => p.y));
    return { left, top: Math.min(top, Math.floor(haut + oy - zonesSures().haut - VOILE_PX)), id };
  };
  // Un mot choisi : la carte glisse jusqu'à lui, ou y saute avec « Réduire les animations ».
  const centrerSur = (id) => {
    const c = cadre.current;
    if (!c) return;
    const { left, top } = defilementPour(pointDe(mots, { id }), false, c.clientWidth, c.clientHeight);
    const glisse = !reduit();
    if (glisse) recentrage.current = { left, top, jusqua: performance.now() + RECENTRAGE_MS };
    c.scrollTo({ left, top, behavior: glisse ? 'smooth' : 'auto' });
  };
  // Le centre de la lentille, dès le premier rendu : les bulles y naissent à leur place, sans transition. Avec « Réduire
  // les animations », elle ne sert pas : le centre est le mot choisi, comme en v9.
  const lentille = useRef(undefined);
  if (lentille.current === undefined) lentille.current = ouverture(window.innerWidth, window.innerHeight).id;
  const centreDesPlaces = suit ? lentille.current : choisi;
  const places = useMemo(() => disposition(mots, centreDesPlaces), [mots, centreDesPlaces]);
  const transformDe = (p) => `translate(${(p.x + repere.current.ox - RAYON).toFixed(1)}px, ${(p.y + repere.current.oy - RAYON).toFixed(1)}px) scale(${p.echelle})`;
  // Déplace la lentille sans rendu. Le rendu suivant écrit la même valeur, ou aucune : il part de lentille.current.
  const poserLentille = (id) => {
    lentille.current = id;
    const p = disposition(mots, id);
    for (const b of cadre.current.querySelectorAll('.bulle-mot')) b.style.transform = transformDe(p.get(b.dataset.mot));
  };
  // À l'ouverture : la carte à sa place ; le focus va à la zone touchée (sinon à la carte), sans la faire bouger.
  useLayoutEffect(() => {
    const { left, top } = ouverture(cadre.current.clientWidth, cadre.current.clientHeight);
    cadre.current.scrollTo({ left, top, behavior: 'auto' });
    const cible = (centre && cadre.current.querySelector(`[data-zone="${centre}"]`)) || cadre.current.querySelector('.zone-carte');
    if (cible) cible.focus({ preventScroll: true });
  }, []);
  // Un mot choisi ensuite : la lentille va sur lui, la carte glisse jusqu'à lui. Un mot effacé : rien ne bouge sous le doigt.
  const ouverte = useRef(false);
  useLayoutEffect(() => {
    if (!ouverte.current) { ouverte.current = true; return; }
    if (!choisi) return;
    if (suit) poserLentille(choisi);
    centrerSur(choisi);
  }, [choisi]);
  // Pendant le glissement (doigt posé, puis élan), la lentille suit le milieu de la fenêtre, à chaque image au plus. Un
  // recentrage doux se laisse finir : il arrive sur le mot touché, où est déjà la lentille.
  useEffect(() => {
    if (!suit) return undefined;
    const c = cadre.current;
    let image = 0;
    const suivre = () => {
      image = 0;
      const r = recentrage.current;
      if (r) {
        const arrive = Math.abs(c.scrollLeft - r.left) <= 1 && Math.abs(c.scrollTop - r.top) <= 1;
        if (!arrive && performance.now() < r.jusqua) return;
        recentrage.current = null;
      }
      const { ox: x, oy: y } = repere.current;
      const id = motDuMilieu(mots, { x: c.scrollLeft + c.clientWidth / 2 - x, y: c.scrollTop + c.clientHeight / 2 - y }, lentille.current);
      if (id !== lentille.current) poserLentille(id);
    };
    const surDefilement = () => { if (!image) image = requestAnimationFrame(suivre); };
    c.addEventListener('scroll', surDefilement, { passive: true });
    return () => { c.removeEventListener('scroll', surDefilement); cancelAnimationFrame(image); };
  }, [mots]);
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

  // Le toucher en cours : { id, leve }, la bulle sous le doigt quand il s'est posé et l'heure où il s'est levé. Sans appui
  // (VoiceOver, le clavier), le clic dit lui-même sa bulle. Quand le défilement prend la main (pointercancel), le toucher
  // est abandonné et le recentrage aussi : la lentille suit ce doigt, qui reprend la carte. Un doigt seulement posé ne
  // libère rien : un second toucher, que la garde ignore, laisse la lentille sur le mot touché ; sans pointercancel,
  // RECENTRAGE_MS la libère quand même.
  const appui = useRef(null);
  const surPose = (e) => {
    const b = e.target.closest('.bulle-mot');
    appui.current = { id: b ? b.dataset.mot : null, leve: null };
  };
  const surLeve = () => { if (appui.current) appui.current.leve = performance.now(); };
  const surAbandon = () => { appui.current = null; recentrage.current = null; };
  const toucher = (id) => {
    const a = appui.current;
    appui.current = null;
    if (enGarde) return;
    const actuel = a && (a.leve === null || performance.now() - a.leve < APPUI_MS);
    if (actuel && a.id !== id) return;
    surMot(id);
  };
  const bulle = (m) => {
    const est = m.id === choisi;
    const style = { '--c': m.couleur, transform: transformDe(places.get(m.id)) };
    return html`<button type="button" key=${m.id} class=${est ? 'bulle-mot choisi' : 'bulle-mot'} data-mot=${m.id} aria-pressed=${est ? 'true' : 'false'} style=${style}
      onClick=${() => toucher(m.id)}>
      <span class="demi droite" aria-hidden="true"></span><span class="demi gauche"><span class="etiquette-mot">${m.libelle}</span></span>
    </button>`;
  };
  // Dans chaque zone, l'ordre de lecture de la carte : du rang le plus haut au plus bas, de gauche à droite.
  const parZone = useMemo(() => Object.fromEntries(ZONES.map((z) => [z, mots.filter((m) => m.zone === z)
    .sort((a, b) => b.rang - a.rang || a.col - b.col)])), [mots]);
  return html`<div class="carte-defile" ref=${cadre}>
    <div class="carte-plan" role="group" aria-label="Émotion" aria-disabled=${enGarde ? 'true' : null} style=${taille}
      onPointerDown=${surPose} onPointerUp=${surLeve} onPointerCancel=${surAbandon}>
      ${ZONES.map((z) => html`<div key=${z} class="zone-carte" role="group" aria-label=${NOMS_ZONES[z]} data-zone=${z} tabindex="-1">
        ${parZone[z].map(bulle)}
      </div>`)}
    </div>
  </div>`;
}
