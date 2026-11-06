// Mesures de l'écran pour le Diagnostic (v8, Q27) : les zones sûres de l'iPhone et la hauteur utile. Des chiffres techniques
// seulement, rien sur l'usage. v11 : la marge du soir et celle de « J'ai fini pour ce soir » sont retirées avec la règle du
// soir sans défiler (spec §13) : les roues et les gratitudes l'allongent, c'est le choix de l'utilisateur.
// v9 : et le corps des libellés des bulles de l'émotion, ajusté à leur place (ajusterEtiquettes, en bas).

// Les zones sûres en px, lues sur une sonde invisible qui reprend les variables de tokens.css (--zone-*) : ce que l'app
// utilise vraiment, simulation des tests comprise.
export function zonesSures() {
  const sonde = document.createElement('div');
  sonde.className = 'sonde-zones';
  sonde.setAttribute('aria-hidden', 'true');
  document.body.append(sonde);
  const s = getComputedStyle(sonde);
  const px = (v) => Math.round((parseFloat(v) || 0) * 10) / 10;
  const zones = { haut: px(s.paddingTop), bas: px(s.paddingBottom), gauche: px(s.paddingLeft), droite: px(s.paddingRight) };
  sonde.remove();
  return zones;
}

// La hauteur utile : la hauteur de la fenêtre, moins les zones sûres du haut et du bas.
export function hauteurUtile(zones = zonesSures()) {
  return { fenetre: window.innerHeight, largeur: window.innerWidth, utile: Math.round((window.innerHeight - zones.haut - zones.bas) * 10) / 10 };
}

// Les libellés des bulles de l'émotion (v9, point de vigilance 2) : chacun tient dans la largeur de sa boîte et, si
// `cercleDe` le donne ({ cx, cy, r }, en px de l'écran), dans le disque de sa bulle. Un mot trop long pour sa boîte
// (« Reconnaissant », ou tout mot en très grand texte) passe à un corps plus petit, par demi-point, sans descendre sous
// `plancher` ; plusieurs mots passent à la ligne, eux, et si leurs lignes débordent du disque, le corps baisse aussi.
// Mesuré d'un bloc (une lecture pour tous), puis corrigé là où il le faut ; avec `uniforme`, tous prennent ensuite le
// plus petit corps trouvé (les quatre bulles de l'écran 1, qui se lisent ensemble). Le corps est posé par CSSOM
// (element.style), jamais en attribut : la CSP le permet.
// Une ligne de texte de `e` sort-elle du disque ? Seuls les nœuds de texte comptent, pas les boîtes qui les portent.
const horsDuCercle = (e, c) => {
  if (!c) return false;
  const textes = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  const plage = document.createRange();
  for (let n = textes.nextNode(); n; n = textes.nextNode()) {
    plage.selectNodeContents(n);
    const dehors = [...plage.getClientRects()].some((q) => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]]
      .some(([x, y]) => Math.hypot(x - c.cx, y - c.cy) > c.r + 0.5));
    if (dehors) return true;
  }
  return false;
};
export function ajusterEtiquettes(elements, plancher, cercleDe = () => null, { uniforme = false } = {}) {
  const els = [...elements];
  for (const e of els) e.style.fontSize = '';
  const trop = (e) => e.scrollWidth - e.clientWidth > 0.5;
  const mesures = els.map((e) => ({ corps: parseFloat(getComputedStyle(e).fontSize), ratio: trop(e) ? e.clientWidth / e.scrollWidth : 1 }));
  els.forEach((e, i) => {
    const { corps, ratio } = mesures[i];
    if (ratio < 1) e.style.fontSize = `${Math.max(plancher, Math.floor(corps * ratio * 2) / 2)}px`;
  });
  for (const e of els) {
    const cercle = cercleDe(e);
    let corps = parseFloat(getComputedStyle(e).fontSize);
    while ((trop(e) || horsDuCercle(e, cercle)) && corps > plancher) { corps -= 0.5; e.style.fontSize = `${corps}px`; }
  }
  if (!uniforme || !els.length) return;
  const corps = Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  for (const e of els) e.style.fontSize = `${corps}px`;
}
