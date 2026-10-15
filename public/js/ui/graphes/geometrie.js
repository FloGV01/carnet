// Géométrie pure des graphiques (rendue en SVG à l'écran et sur canvas pour le PDF).
// Coordonnées arrondies au dixième. Une colonne vide ne dessine rien. 326 = largeur intérieure
// d'une carte sur un écran de 390 : une unité vaut un pixel.
const r1 = (x) => Math.round(x * 10) / 10;

// Haltère : deux proportions sur une échelle de 0 à 1.
export function geometrieHaltere(p1, p2, largeur = 306, marge = 8) {
  const x = (p) => r1(marge + p * (largeur - 2 * marge));
  return { x1: x(p1), x2: x(p2) };
}

// ---------- v5 · Mes jours (frise) ----------
// Trois rangées sur le même axe : humeur du jour (1 à 10, filets à 4 et 7), nuit, explosions et
// autres épisodes. Une colonne vide ne dessine rien. Pure : rendue en SVG et sur canvas (PDF).
// Par jour (v6), un trait vertical va du plus bas au plus haut des relevés : une journée mêlée se voit.
export const DIM_FRISE = { largeur: 326, gauche: 22, droite: 6, haut: 8, basHumeur: 104, nuitY: 114, nuitH: 12, explY: 132, explH: 20, axeY: 168, hauteur: 172 };
const CLASSE_NUIT = { 'sommeil:mal': 'sommeil-1', 'sommeil:moyen': 'sommeil-2', 'sommeil:bien': 'sommeil-3' };
const MOIS_AXE = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function geometrieFrise({ pas, colonnes }, d = DIM_FRISE) {
  const n = Math.max(1, colonnes.length);
  const largeurUtile = d.largeur - d.gauche - d.droite;
  const l = largeurUtile / n;
  const centre = (i) => d.gauche + l * (i + 0.5);
  const y = (v) => r1(d.haut + ((10 - v) / 9) * (d.basHumeur - d.haut));
  const larg = r1(Math.min(10, Math.max(2, l * 0.6)));
  const points = [];
  const traits = [];
  const moyenne = [];
  const nuits = [];
  const encoches = [];
  const autres = [];
  const zones = [];
  const maxExpl = Math.max(1, ...colonnes.map((c) => c.explosions || 0));
  let prec = null;
  colonnes.forEach((c, i) => {
    const x = r1(centre(i));
    if (c.humeur != null) points.push({ x, y: y(c.humeur), plein: pas === 'jour' || !c.fragile, cle: c.cle });
    if (pas === 'jour' && c.humeurMin != null && c.humeurMax > c.humeurMin) traits.push({ x, y1: y(c.humeurMax), y2: y(c.humeurMin) });
    // Jour : trait de la moyenne des 7 jours ; semaine et mois : segments entre colonnes voisines.
    const v = pas === 'jour' ? c.moyenne7 : c.humeur;
    if (v != null) { const p = { x, y: y(v) }; if (prec && prec.i === i - 1) moyenne.push({ x1: prec.x, y1: prec.y, x2: p.x, y2: p.y }); prec = { ...p, i }; }
    if (pas === 'jour') {
      if (c.nuit && CLASSE_NUIT[c.nuit]) nuits.push({ x: r1(x - larg / 2), y: d.nuitY, l: larg, h: d.nuitH, classe: CLASSE_NUIT[c.nuit] });
    } else if (c.nuits) {
      const total = c.nuits.mal + c.nuits.moyen + c.nuits.bien;
      let yy = d.nuitY + d.nuitH;
      for (const [cle, classe] of [['mal', 'sommeil-1'], ['moyen', 'sommeil-2'], ['bien', 'sommeil-3']]) {
        if (!c.nuits[cle]) continue;
        const h = r1((c.nuits[cle] / total) * d.nuitH);
        yy -= h;
        nuits.push({ x: r1(x - larg / 2), y: r1(yy), l: larg, h, classe });
      }
    }
    if (c.explosions > 0) {
      const h = pas === 'jour' ? d.explH : r1(Math.max(3, (c.explosions / maxExpl) * d.explH));
      encoches.push({ x: r1(x - larg / 2), y: r1(d.explY + d.explH - h), l: larg, h, n: c.explosions });
    }
    if (c.autres > 0) autres.push({ x, y: r1(d.explY + d.explH + 6), n: c.autres });
    if (c.aDonnee) zones.push({ x: r1(d.gauche + l * i), l: r1(l), cle: c.cle, i });
  });
  // Étiquettes de l'axe : au plus 7, en partant de la colonne la plus récente.
  const pasEtiquette = Math.max(1, Math.ceil(n / 7));
  const texte = (c) => {
    if (pas === 'mois') return MOIS_AXE[Number(c.cle.slice(5, 7)) - 1];
    return `${Number(c.cle.slice(8))}/${c.cle.slice(5, 7)}`;
  };
  const etiquettes = colonnes.map((c, i) => ({ x: r1(centre(i)), texte: texte(c), visible: (n - 1 - i) % pasEtiquette === 0 })).filter((e) => e.visible);
  return {
    points, traits, moyenne, nuits, encoches, autres, zones, etiquettes, largeurColonne: r1(l),
    filets: [4, 7].map((v) => ({ v, y: y(v) })), graduations: [1, 4, 7, 10].map((v) => ({ v, y: y(v) })),
  };
}

// ---------- v5 · Ta journée heure par heure ----------
// 12 créneaux de 2 h, de 4 h à 4 h. Points sans segments (chaque créneau réunit d'autres jours).
// Énergie : petite barre empilée Basse / Moyenne / Haute, en jours.
export const DIM_JOURNEE = { largeur: 326, gauche: 22, droite: 6, haut: 8, basHumeur: 96, energieY: 106, energieH: 26, axeY: 148, hauteur: 152 };
export const CRENEAUX = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2];

export function geometrieJournee(creneaux, d = DIM_JOURNEE) {
  const l = (d.largeur - d.gauche - d.droite) / CRENEAUX.length;
  const centre = (i) => d.gauche + l * (i + 0.5);
  const y = (v) => r1(d.haut + ((10 - v) / 9) * (d.basHumeur - d.haut));
  const larg = r1(l * 0.55);
  const parDebut = new Map(creneaux.map((c) => [c.debut, c]));
  const maxJours = Math.max(1, ...creneaux.map((c) => (c.energie ? Object.values(c.energie).reduce((s, x) => s + x, 0) : 0)));
  const points = [];
  const energies = [];
  const zones = [];
  CRENEAUX.forEach((debut, i) => {
    const c = parDebut.get(debut);
    if (!c) return;
    const x = r1(centre(i));
    if (c.moyenne != null) points.push({ x, y: y(c.moyenne), plein: !c.fragile, debut });
    let yy = d.energieY + d.energieH;
    for (const [cle, classe] of [['energie:basse', 'energie-1'], ['energie:moyenne', 'energie-2'], ['energie:haute', 'energie-3']]) {
      const nb = c.energie ? c.energie[cle] || 0 : 0;
      if (!nb) continue;
      const h = r1((nb / maxJours) * d.energieH);
      yy -= h;
      energies.push({ x: r1(x - larg / 2), y: r1(yy), l: larg, h: r1(Math.max(1, h - 0.5)), classe });
    }
    zones.push({ x: r1(d.gauche + l * i), l: r1(l), debut });
  });
  const etiquettes = CRENEAUX.map((debut, i) => ({ x: r1(centre(i) - l / 2), texte: `${debut} h` })).filter((_, i) => i % 2 === 0);
  return { points, energies, zones, etiquettes, filets: [4, 7].map((v) => ({ v, y: y(v) })), graduations: [1, 4, 7, 10].map((v) => ({ v, y: y(v) })) };
}
