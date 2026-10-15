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
// Rangées sur le même axe : humeur du jour (1 à 10, filets à 4 et 7), nuit, explosions et autres épisodes.
// Une colonne vide ne dessine rien. Pure : rendue en SVG et sur canvas (PDF).
// Par jour (v6), un trait vertical va du plus bas au plus haut des relevés : une journée mêlée se voit.
// DIM_FRISE est celle du PDF. L'écran ajoute, quand un relevé d'énergie est noté sur la période, la rangée
// « énergie basse » (v6) sous les autres épisodes : DIM_FRISE_ENERGIE, la seule à avoir energieY. Sans
// energieY, aucune marque d'énergie : la frise du PDF ne change pas.
export const DIM_FRISE = { largeur: 326, gauche: 22, droite: 6, haut: 8, basHumeur: 104, nuitY: 114, nuitH: 12, explY: 132, explH: 20, axeY: 168, hauteur: 172 };
export const DIM_FRISE_ENERGIE = { ...DIM_FRISE, energieY: 168, energieH: 12, axeY: 194, hauteur: 198 };
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
  const energieBasse = [];
  const zones = [];
  const maxExpl = Math.max(1, ...colonnes.map((c) => c.explosions || 0));
  // Jours à énergie basse d'une colonne : 1 pour un jour « basse » (true), le nombre de jours par semaine ou mois.
  const joursBas = (c) => (c.energieBasse === true ? 1 : c.energieBasse || 0);
  const maxEnergie = Math.max(1, ...colonnes.map(joursBas));
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
    // Énergie basse : une marque les jours concernés, une barre du nombre de jours par semaine ou par mois.
    // Faux, zéro et inconnu ne dessinent rien.
    const jours = joursBas(c);
    if (d.energieY != null && jours > 0) {
      const h = pas === 'jour' ? d.energieH : r1(Math.max(3, (jours / maxEnergie) * d.energieH));
      energieBasse.push({ x: r1(x - larg / 2), y: r1(d.energieY + d.energieH - h), l: larg, h, n: jours });
    }
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
    points, traits, moyenne, nuits, encoches, autres, energieBasse, zones, etiquettes, largeurColonne: r1(l),
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

// ---------- v6 · Comprendre ----------
// Une valeur absente (n = 0) ne dessine rien : ni barre, ni point, ni compte. Une valeur hors de l'axe est
// ramenée au bord, avec horsAxe.

// Graphique aligné (spec §2.2) : un bloc par facteur, chacun dans son propre cadre (le détail d'une barre
// touchée s'affiche sous son bloc). Un bloc : son titre, puis une ligne par décalage (libellé à gauche, piste
// et barre longue de oui / n, compte à droite), puis le repère des autres jours : un trait pointillé vertical
// sur toutes les lignes, légendé dessous. La colonne du compte tient « 2 sur 2 · (peu de valeurs) », celle du
// libellé « Le jour du retour ».
export const DIM_ALIGNE = { largeur: 326, barreX: 86, barreL: 106, compteX: 198, titreH: 20, ligneH: 22, barreH: 10, legendeH: 18 };

export function geometrieAligne(blocs, d = DIM_ALIGNE) {
  return blocs.map((b) => {
    let y = d.titreH;
    const zones = [];
    const lignes = b.barres.map((barre) => {
      const ligne = { decalage: barre.decalage, y: r1(y + d.ligneH / 2), piste: null, barre: null };
      if (barre.n > 0) {
        const yb = r1(y + (d.ligneH - d.barreH) / 2);
        ligne.piste = { x: d.barreX, y: yb, l: d.barreL, h: d.barreH };
        ligne.barre = { x: d.barreX, y: yb, l: r1(barre.part * d.barreL), h: d.barreH, peu: barre.peu };
        zones.push({ x: 0, y: r1(y), l: d.largeur, h: d.ligneH, decalage: barre.decalage });
      }
      y += d.ligneH;
      return ligne;
    });
    const a = b.autres;
    let repere = null;
    if (a && a.n > 0) {
      const legendeY = r1(y + 12);
      repere = { x: r1(d.barreX + a.part * d.barreL), y1: d.titreH, y2: r1(y), legendeY, legende: { x: 3, y1: r1(legendeY - 8), y2: r1(legendeY + 1), texteX: 10 }, peu: a.peu };
      y += d.legendeH;
    }
    return { titreY: 13, lignes, repere, zones, hauteur: r1(y) };
  });
}

// Colonnes (spec §2.5, graphiques 1, 2 et 5) : jour de la semaine, lieu ou mois. Humeur : un point à la
// moyenne sur l'axe de 1 à 10 (filets à 4 et 7), un trait du plus bas au plus haut, un anneau sous 3 valeurs.
// Autres mesures : une barre haute de oui / n, creuse sous 3 valeurs, et son compte au-dessus (sur deux
// lignes, « 3 » puis « lundis ») quand la colonne est assez large ; sinon le compte reste dans le tableau.
// Les sept jours sont toujours assez larges (« mercredis » tient entre ses voisins).
// Les mêmes colonnes pour toutes les mesures, pour que le choix de mesure ne déplace rien.
export const DIM_COLONNES = { largeur: 326, gauche: 22, droite: 6, haut: 8, bas: 132, axeY: 148, hauteur: 152, rang: 12, large: 30, lieuSerre: 72 };

export function geometrieColonnes({ pas, mesure, colonnes }, d = DIM_COLONNES) {
  const n = Math.max(1, colonnes.length);
  const l = (d.largeur - d.gauche - d.droite) / n;
  const centre = (i) => r1(d.gauche + l * (i + 0.5));
  const y = (v) => r1(d.haut + ((10 - v) / 9) * (d.bas - d.haut));
  const hMax = d.bas - d.haut - 24; // la place des deux lignes du compte au-dessus de la plus haute barre
  const larg = r1(Math.min(24, l * 0.6));
  const large = l >= d.large; // tient « 12 » et « jours », ou « sept. »
  const points = [];
  const traits = [];
  const barres = [];
  const comptes = [];
  colonnes.forEach((c, i) => {
    if (!c.n) return;
    const x = centre(i);
    if (mesure === 'humeur') {
      points.push({ x, y: y(c.moyenne), plein: !c.fragile, cle: c.cle });
      if (c.max > c.min) traits.push({ x, y1: y(c.max), y2: y(c.min), cle: c.cle });
      return;
    }
    const h = r1(c.part * hMax);
    const sommet = r1(d.bas - h);
    if (h > 0) barres.push({ x: r1(x - larg / 2), y: sommet, l: larg, h, creuse: c.fragile, cle: c.cle });
    if (large) comptes.push({ x, y1: r1(sommet - 15), y2: r1(sommet - 4), cle: c.cle });
  });
  // L'axe : chaque jour ; chaque lieu, sur deux rangs s'ils sont serrés ; chaque mois si la place le permet,
  // sinon au plus 7, en partant du plus récent.
  const pasMois = pas === 'mois' && !large ? Math.ceil(n / 7) : 1;
  const deuxRangs = pas === 'lieu' && l < d.lieuSerre;
  const etiquettes = colonnes.map((c, i) => ({ x: centre(i), y: deuxRangs && i % 2 ? d.axeY + d.rang : d.axeY, cle: c.cle }))
    .filter((_, i) => (n - 1 - i) % pasMois === 0);
  return {
    points, traits, barres, comptes, etiquettes, largeurColonne: r1(l),
    base: { x1: d.gauche, x2: d.largeur - d.droite, y: d.bas },
    filets: [4, 7].map((v) => ({ v, y: y(v) })), graduations: [1, 4, 7, 10].map((v) => ({ v, y: y(v) })),
    hauteur: deuxRangs ? d.hauteur + d.rang : d.hauteur,
  };
}

// Tes nuits selon le jour (spec §2.5, graphique 4) : une colonne par soir de coucher, du lundi au dimanche.
// Axe en minutes depuis minuit du soir du coucher, de 20 h (1200, en haut) à 12 h le lendemain (2160, en bas).
// Un trait de la médiane du coucher à celle du lever, plein à partir de 3 nuits, en pointillé avec 1 ou 2.
// Une médiane hors de l'axe est ramenée au bord, avec horsAxe et une marque qui pointe vers l'extérieur.
export const DIM_NUITS = { largeur: 326, gauche: 30, droite: 6, haut: 12, bas: 140, axeY: 160, hauteur: 164 };
export const AXE_NUITS = { debut: 1200, fin: 2160 };

export function geometrieNuits(colonnes, d = DIM_NUITS) {
  const { debut, fin } = AXE_NUITS;
  const n = Math.max(1, colonnes.length);
  const l = (d.largeur - d.gauche - d.droite) / n;
  const centre = (i) => r1(d.gauche + l * (i + 0.5));
  const y = (m) => r1(d.haut + ((Math.min(fin, Math.max(debut, m)) - debut) / (fin - debut)) * (d.bas - d.haut));
  const hors = (m) => (m < debut ? 'haut' : m > fin ? 'bas' : null);
  const traits = [];
  const marques = [];
  colonnes.forEach((c, i) => {
    if (!c.n) return;
    const x = centre(i);
    const sens = [hors(c.coucher), hors(c.lever)].filter(Boolean);
    traits.push({ x, y1: y(Math.min(c.coucher, c.lever)), y2: y(Math.max(c.coucher, c.lever)), plein: !c.fragile, horsAxe: sens.length > 0, cle: c.cle });
    for (const s of new Set(sens)) {
      marques.push(s === 'haut' ? { x, yBase: d.haut - 5, yPointe: d.haut - 10, sens: s, cle: c.cle } : { x, yBase: d.bas + 5, yPointe: d.bas + 10, sens: s, cle: c.cle });
    }
  });
  const graduations = [debut, 1440, 1680, 1920, fin].map((m) => ({ m, y: y(m), texte: `${(m / 60) % 24} h` }));
  const etiquettes = colonnes.map((c, i) => ({ x: centre(i), y: d.axeY, cle: c.cle }));
  return { traits, marques, graduations, etiquettes, filets: graduations.map((g) => ({ x1: d.gauche, x2: d.largeur, y: g.y })) };
}

// Barres horizontales empilées (spec §2.4) : des groupes (titrés ou non), une ligne par élément : son nom et
// son compte au-dessus, puis une barre longue comme son nombre (de relevés, de jours), sur une échelle
// commune à tous les groupes, découpée en parts dans l'ordre reçu. Une part nulle ne dessine rien.
export const DIM_BARRES = { largeur: 326, titreH: 22, texteH: 14, barreH: 10, ligneH: 34 };

export function geometrieBarres(groupes, d = DIM_BARRES) {
  const max = Math.max(1, ...groupes.flatMap((g) => g.lignes.map((x) => x.n)));
  let y = 0;
  const res = groupes.map((g) => {
    let titreY = null;
    if (g.titre) { titreY = r1(y + 14); y += d.titreH; }
    const lignes = g.lignes.map((ligne) => {
      const texteY = r1(y + 11);
      const yb = r1(y + d.texteH + 2);
      const longueur = (ligne.n / max) * d.largeur;
      const parts = ligne.parts.filter((p) => p.n > 0);
      const somme = parts.reduce((s, p) => s + p.n, 0) || 1;
      let x = 0;
      const segments = parts.map((p, k) => {
        const w = (p.n / somme) * longueur;
        const xs = r1(x);
        // Un filet d'une unité sépare deux parts ; une part fine garde une unité, sans sortir du cadre.
        const s = { x: xs, y: yb, l: r1(Math.min(d.largeur - xs, Math.max(1, k < parts.length - 1 ? w - 1 : w))), h: d.barreH, classe: p.classe };
        x += w;
        return s;
      });
      y += d.ligneH;
      return { cle: ligne.cle, texteY, segments };
    });
    return { cle: g.cle, titreY, lignes };
  });
  return { groupes: res, hauteur: r1(Math.max(1, y)) };
}

// Selon ce que tu faisais (spec §2.4, graphique 3) : relevés d'énergie basse, moyenne et haute, en rampe.
export function geometrieActivites(activites, d = DIM_BARRES) {
  const lignes = activites.map((a) => ({
    cle: a.id, n: a.n,
    parts: [{ n: a.basse, classe: 'energie-1' }, { n: a.moyenne, classe: 'energie-2' }, { n: a.haute, classe: 'energie-3' }],
  }));
  return geometrieBarres([{ cle: 'activites', titre: false, lignes }], d);
}
