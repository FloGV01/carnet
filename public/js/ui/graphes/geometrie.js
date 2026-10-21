// Géométrie pure des graphiques (rendue en SVG à l'écran et sur canvas pour le PDF).
// Coordonnées arrondies au dixième. Une colonne vide ne dessine rien. 326 = largeur intérieure
// d'une carte sur un écran de 390 : une unité vaut un pixel.
import { jourSemaine as jourSemaineCle } from '../../domain/dates.js';
import { FAMILLES, familleDe as familleDeRoue } from '../../domain/roue.js';

// Les familles de la roue, dans leur ordre : l'ordre d'empilement des barres d'émotions.
const ORDRE_FAMILLES = FAMILLES.map((f) => f.cle);

const r1 = (x) => Math.round(x * 10) / 10;

// ---------- v5 · Mes jours (frise) ----------
// Rangées sur le même axe : humeur du jour (1 à 10, filets à 4 et 7), nuit, explosions et autres épisodes.
// Une colonne vide ne dessine rien. Pure : rendue en SVG et sur canvas (PDF).
// Par jour (v6), un trait vertical va du plus bas au plus haut des relevés : une journée mêlée se voit.
// DIM_FRISE est celle du PDF. Avec DIM_FRISE_ENERGIE, la seule à avoir energieY, la rangée « énergie basse » (v6) vient
// sous les autres épisodes. Sans energieY, aucune marque d'énergie : la frise du PDF ne change pas. v7 : l'écran dessine
// Mes jours par geometrieMesJours (plus bas), avec ses étiquettes de rangées.
// Repères de traitement (v6, analyse/reperes.js) : un trait fin au centre de chaque colonne qui porte un
// changement, son numéro (①, ①–②) en haut, dans une bande ajoutée au-dessus de l'humeur : toutes les rangées
// descendent d'autant, et `dim` rend les dimensions ainsi décalées (celles du viewBox). Deux numéros trop
// proches passent sur un second rang. Sans repère, `dim` est la dimension reçue et rien ne bouge.
export const DIM_FRISE = { largeur: 326, gauche: 22, droite: 6, haut: 8, basHumeur: 104, nuitY: 114, nuitH: 12, explY: 132, explH: 20, axeY: 168, hauteur: 172 };
export const DIM_FRISE_ENERGIE = { ...DIM_FRISE, energieY: 168, energieH: 12, axeY: 194, hauteur: 198 };
const CLASSE_NUIT = { 'sommeil:mal': 'sommeil-1', 'sommeil:moyen': 'sommeil-2', 'sommeil:bien': 'sommeil-3' };
const MOIS_AXE = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
// Taille des numéros (unités du graphique) : la même à l'écran (ecrans.css, .g-changement-num) et sur le PDF.
export const TAILLE_REPERE = 11;
const REPERE = { taille: TAILLE_REPERE, rang: 13, marge: 3, ecart: 2, rangsMax: 2 };
const Y_FRISE = ['haut', 'basHumeur', 'nuitY', 'explY', 'energieY', 'axeY', 'hauteur'];
const CERCLES = /[\u2460-\u2473\u3251-\u325f\u32b1-\u32bf]/u;
// Largeur estimée d'un numéro : un chiffre cerclé fait environ un cadratin, le tiret et les chiffres moins.
const largeurNumero = (t) => [...t].reduce((s, c) => s + (CERCLES.test(c) ? 1 : 0.6), 0) * REPERE.taille;

// Les numéros, de gauche à droite : chacun sur le premier rang où il ne touche pas le précédent, ramené
// dans le cadre au bord droit (son trait reste à sa date).
function placerNumeros(reperes, centre, largeur) {
  const fins = [];
  return reperes.map((r) => {
    const x = r1(centre(r.i));
    const w = largeurNumero(r.etiquette);
    const texteX = r1(Math.min(largeur - w / 2, Math.max(w / 2, x)));
    let rang = fins.findIndex((fin) => texteX - w / 2 >= fin + REPERE.ecart);
    if (rang < 0) rang = fins.length < REPERE.rangsMax ? fins.length : fins.indexOf(Math.min(...fins));
    fins[rang] = texteX + w / 2;
    return { cle: r.cle, etiquette: r.etiquette, x, texteX, rang };
  });
}

export function geometrieFrise({ pas, colonnes, reperes = [] }, base = DIM_FRISE) {
  const n = Math.max(1, colonnes.length);
  const largeurUtile = base.largeur - base.gauche - base.droite;
  const l = largeurUtile / n;
  const centre = (i) => base.gauche + l * (i + 0.5);
  const numeros = placerNumeros(reperes, centre, base.largeur);
  const rangs = numeros.length ? Math.max(...numeros.map((r) => r.rang)) + 1 : 0;
  const bande = rangs ? rangs * REPERE.rang + REPERE.marge : 0;
  const d = bande ? Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Y_FRISE.includes(k) ? v + bande : v])) : base;
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
  // Le trait part sous son numéro et descend jusqu'au-dessus de l'axe, à travers toutes les rangées.
  const traitsReperes = numeros.map((r) => ({ ...r, texteY: (r.rang + 1) * REPERE.rang - 2, y1: (r.rang + 1) * REPERE.rang + 1, y2: d.axeY - 10 }));
  return {
    points, traits, moyenne, nuits, encoches, autres, energieBasse, zones, etiquettes, largeurColonne: r1(l),
    filets: [4, 7].map((v) => ({ v, y: y(v) })), graduations: [1, 4, 7, 10].map((v) => ({ v, y: y(v) })),
    reperes: traitsReperes, dim: d,
  };
}

// ---------- v7 · Mes jours à l'écran (2b) ----------
// Une étiquette au début de chaque rangée, les colonnes à droite, leurs noms en tête (L M M J V S D sur 7 jours). Rangées,
// dans l'ordre : Émotions (un point par relevé, à la couleur de sa famille, dans l'ordre des heures, du bas vers le haut ;
// par semaine ou par mois, une barre par colonne, empilée par famille dans l'ordre de la roue, longue comme le nombre de
// relevés), Humeur (notes) seulement si la période a des anciennes notes de 1 à 10 (le point de la note du jour et un trait
// du plus bas au plus haut), Nuits, Explosions, Autres épisodes, Énergie basse (si un relevé d'énergie est noté). Les
// repères de traitement : leurs numéros sous les noms de colonnes, leurs traits à travers les rangées. Une colonne vide ne
// dessine rien. La frise du PDF reste celle de geometrieFrise. Pure.
export const DIM_MES_JOURS = {
  largeur: 326, gauche: 80, droite: 4, teteH: 22, ecart: 8,
  emotionsH: 44, humeurH: 40, nuitH: 14, explH: 16, autresH: 12, energieH: 12,
};
const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const LIBELLES_RANGEES = {
  emotions: ['Émotions'], humeur: ['Humeur', '(notes)'], nuits: ['Nuits'], explosions: ['Explosions'],
  autres: ['Épisodes'], energie: ['Énergie', 'basse'],
};
// Une étiquette de deux lignes prend 26 unités : sa rangée aussi, la bande dessinée au milieu.
const LIGNE_ETIQUETTE = 13;

// Les points d'une colonne : en une pile (deux côte à côte si la colonne est large), resserrés si la rangée est pleine.
function pilePoints(familles, x, bas, h, l) {
  const r = l >= 20 ? 3.5 : l >= 10 ? 2.5 : 1.8;
  const k = l >= 22 && familles.length > 1 ? 2 : 1;
  const rangs = Math.ceil(familles.length / k);
  const pas = rangs > 1 ? Math.min(2 * r + 2, (h - 2 * r) / (rangs - 1)) : 0;
  return familles.map((famille, j) => {
    const rang = Math.floor(j / k);
    const seul = k === 2 && j === familles.length - 1 && j % 2 === 0;
    const dx = k === 2 && !seul ? (j % 2 ? 1 : -1) * (r + 0.8) : 0;
    return { x: r1(x + dx), y: r1(bas - r - rang * pas), r, famille };
  });
}

export function geometrieMesJours({ pas, colonnes, avecHumeur = false, avecEnergie = false }, { reperes = [], familleDe = familleDeRoue, ordreFamilles = ORDRE_FAMILLES } = {}, d = DIM_MES_JOURS) {
  const n = Math.max(1, colonnes.length);
  const l = (d.largeur - d.gauche - d.droite) / n;
  const centre = (i) => d.gauche + l * (i + 0.5);
  const larg = r1(Math.min(12, Math.max(2, l * 0.6)));
  // Les noms des colonnes : au plus 7, en partant de la plus récente.
  const pasEtiquette = Math.max(1, Math.ceil(n / 7));
  const nom = (c) => {
    if (pas === 'jour' && n <= 7) return LETTRES[jourSemaineCle(c.cle)];
    if (pas === 'mois') return MOIS_AXE[Number(c.cle.slice(5, 7)) - 1];
    return `${Number(c.cle.slice(8))}/${c.cle.slice(5, 7)}`;
  };
  const etiquettes = colonnes.map((c, i) => ({ x: r1(centre(i)), y: 13, texte: nom(c), visible: (n - 1 - i) % pasEtiquette === 0 })).filter((e) => e.visible);
  const numeros = placerNumeros(reperes, centre, d.largeur);
  const rangsNum = numeros.length ? Math.max(...numeros.map((r) => r.rang)) + 1 : 0;
  let y = d.teteH + (rangsNum ? rangsNum * REPERE.rang + REPERE.marge : 0) + d.ecart;
  const filet = { x1: 0, x2: d.largeur, y: d.teteH - 4 };
  // Les rangées présentes, chacune à sa hauteur.
  const rangees = [];
  const ajouter = (cle, h) => {
    const libelle = LIBELLES_RANGEES[cle];
    const H = Math.max(h, libelle.length * LIGNE_ETIQUETTE);
    const r = { cle, y: r1(y + (H - h) / 2), h, milieu: r1(y + H / 2), libelle };
    rangees.push(r);
    y += H + d.ecart;
    return r;
  };
  const emo = ajouter('emotions', d.emotionsH);
  const hum = avecHumeur ? ajouter('humeur', d.humeurH) : null;
  const nui = ajouter('nuits', d.nuitH);
  const exp = ajouter('explosions', d.explH);
  const aut = ajouter('autres', d.autresH);
  const ene = avecEnergie ? ajouter('energie', d.energieH) : null;
  const hauteur = r1(y - d.ecart + 2);

  const points = [];
  const barres = [];
  const notes = { points: [], traits: [] };
  const nuits = [];
  const encoches = [];
  const autres = [];
  const energieBasse = [];
  const zones = [];
  const yNote = (v) => r1(hum.y + ((10 - v) / 9) * hum.h);
  const totalFamilles = (c) => (c.familles ? Object.values(c.familles).reduce((s, x) => s + x, 0) : 0);
  const maxEmotions = Math.max(1, ...colonnes.map(totalFamilles));
  const maxExpl = Math.max(1, ...colonnes.map((c) => c.explosions || 0));
  const joursBas = (c) => (c.energieBasse === true ? 1 : c.energieBasse || 0);
  const maxEnergie = Math.max(1, ...colonnes.map(joursBas));
  colonnes.forEach((c, i) => {
    const x = r1(centre(i));
    const xb = r1(x - larg / 2);
    if (pas === 'jour') {
      const familles = (c.emotions || []).map(familleDe).filter(Boolean);
      points.push(...pilePoints(familles, x, emo.y + emo.h, emo.h, l).map((p) => ({ ...p, cle: c.cle })));
    } else if (totalFamilles(c) > 0) {
      const total = totalFamilles(c);
      let yy = emo.y + emo.h;
      const hTotal = Math.max(3, (total / maxEmotions) * emo.h);
      for (const famille of ordreFamilles) {
        const k = c.familles[famille] || 0;
        if (!k) continue;
        const h = (k / total) * hTotal;
        yy -= h;
        barres.push({ x: xb, y: r1(yy), l: larg, h: r1(Math.max(0.8, h - 0.6)), famille, cle: c.cle });
      }
    }
    if (hum && c.humeur != null) {
      notes.points.push({ x, y: yNote(c.humeur), plein: pas === 'jour' || !c.fragile, cle: c.cle });
      if (pas === 'jour' && c.humeurMin != null && c.humeurMax > c.humeurMin) notes.traits.push({ x, y1: yNote(c.humeurMax), y2: yNote(c.humeurMin) });
    }
    if (pas === 'jour') {
      if (c.nuit && CLASSE_NUIT[c.nuit]) nuits.push({ x: xb, y: nui.y, l: larg, h: nui.h, classe: CLASSE_NUIT[c.nuit] });
    } else if (c.nuits) {
      const total = c.nuits.mal + c.nuits.moyen + c.nuits.bien;
      let yy = nui.y + nui.h;
      for (const [cle, classe] of [['mal', 'sommeil-1'], ['moyen', 'sommeil-2'], ['bien', 'sommeil-3']]) {
        if (!c.nuits[cle]) continue;
        const h = r1((c.nuits[cle] / total) * nui.h);
        yy -= h;
        nuits.push({ x: xb, y: r1(yy), l: larg, h, classe });
      }
    }
    if (c.explosions > 0) {
      const h = pas === 'jour' ? exp.h : r1(Math.max(3, (c.explosions / maxExpl) * exp.h));
      encoches.push({ x: xb, y: r1(exp.y + exp.h - h), l: larg, h, n: c.explosions });
    }
    if (c.autres > 0) autres.push({ x, y: r1(aut.y + aut.h / 2), n: c.autres });
    const jours = joursBas(c);
    if (ene && jours > 0) {
      const h = pas === 'jour' ? ene.h : r1(Math.max(3, (jours / maxEnergie) * ene.h));
      energieBasse.push({ x: xb, y: r1(ene.y + ene.h - h), l: larg, h, n: jours });
    }
    if (c.aDonnee) zones.push({ x: r1(d.gauche + l * i), l: r1(l), cle: c.cle, i });
  });
  // Le trait d'un repère part sous son numéro et traverse toutes les rangées.
  const bas = rangees[rangees.length - 1];
  const traitsReperes = numeros.map((r) => ({
    ...r, texteY: r1(d.teteH + (r.rang + 1) * REPERE.rang - 2), y1: r1(d.teteH + (r.rang + 1) * REPERE.rang + 1), y2: r1(Math.max(bas.y + bas.h, bas.milieu)),
  }));
  // Les étiquettes des rangées : une ligne au milieu de la rangée, ou deux lignes autour.
  const libelles = rangees.map((r) => ({
    cle: r.cle, lignes: r.libelle.map((t, k) => ({ texte: t, y: r1(r.milieu + (k - (r.libelle.length - 1) / 2) * LIGNE_ETIQUETTE) })),
  }));
  return {
    dim: { largeur: d.largeur, hauteur }, largeurColonne: r1(l), rangees, libelles, filet, etiquettes,
    points, barres, notes, nuits, encoches, autres, energieBasse, zones, reperes: traitsReperes,
  };
}

// ---------- v5 · Ta journée heure par heure (v7 : les familles d'émotions) ----------
// 12 créneaux de 2 h, de 4 h à 4 h. Deux rangées étiquetées, comme Mes jours : Émotions (une barre par créneau, empilée
// par famille dans l'ordre de la roue, longue comme le nombre de relevés), et Énergie (petite barre empilée Basse /
// Moyenne / Haute, en jours). Une rangée sans donnée n'est pas dessinée.
export const DIM_JOURNEE = { largeur: 326, gauche: 80, droite: 4, haut: 4, ecart: 10, emotionsH: 64, energieH: 26, axeH: 16 };
export const CRENEAUX = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2];

// parHeure : famillesParHeure (emotions.js), ou null ; creneaux : les créneaux d'énergie de profilJournee, ou [].
export function geometrieJournee({ parHeure = null, creneaux = [], ordreFamilles = ORDRE_FAMILLES }, d = DIM_JOURNEE) {
  const l = (d.largeur - d.gauche - d.droite) / CRENEAUX.length;
  const centre = (i) => d.gauche + l * (i + 0.5);
  const larg = r1(l * 0.55);
  let y = d.haut;
  const rangees = [];
  const parCreneau = CRENEAUX.map((debut) => {
    const compte = Object.fromEntries(ordreFamilles.map((f) => [f, 0]));
    if (parHeure) for (const h of [debut, debut + 1]) for (const f of ordreFamilles) compte[f] += (parHeure[h] && parHeure[h][f]) || 0;
    return { debut, compte, total: ordreFamilles.reduce((s, f) => s + compte[f], 0) };
  });
  const avecEmotions = parCreneau.some((c) => c.total > 0);
  const emo = avecEmotions ? (() => { const r = { cle: 'emotions', y, h: d.emotionsH, libelle: ['Émotions'] }; y += d.emotionsH + d.ecart; rangees.push(r); return r; })() : null;
  const avecEnergie = creneaux.length > 0;
  const ene = avecEnergie ? (() => { const r = { cle: 'energie', y, h: d.energieH, libelle: ['Énergie'] }; y += d.energieH + d.ecart; rangees.push(r); return r; })() : null;
  const axeY = r1(y + 6);
  const hauteur = r1(y + d.axeH);
  const barres = [];
  const energies = [];
  const zones = [];
  const maxEmotions = Math.max(1, ...parCreneau.map((c) => c.total));
  if (emo) {
    parCreneau.forEach((c, i) => {
      if (!c.total) return;
      let yy = emo.y + emo.h;
      const hTotal = Math.max(3, (c.total / maxEmotions) * emo.h);
      for (const famille of ordreFamilles) {
        if (!c.compte[famille]) continue;
        const h = (c.compte[famille] / c.total) * hTotal;
        yy -= h;
        barres.push({ x: r1(centre(i) - larg / 2), y: r1(yy), l: larg, h: r1(Math.max(0.8, h - 0.6)), famille, debut: c.debut });
      }
    });
  }
  const parDebut = new Map(creneaux.map((c) => [c.debut, c]));
  const maxJours = Math.max(1, ...creneaux.map((c) => (c.energie ? Object.values(c.energie).reduce((s, x) => s + x, 0) : 0)));
  CRENEAUX.forEach((debut, i) => {
    const c = parDebut.get(debut);
    if (ene && c) {
      let yy = ene.y + ene.h;
      for (const [cle, classe] of [['energie:basse', 'energie-1'], ['energie:moyenne', 'energie-2'], ['energie:haute', 'energie-3']]) {
        const nb = c.energie ? c.energie[cle] || 0 : 0;
        if (!nb) continue;
        const h = r1((nb / maxJours) * ene.h);
        yy -= h;
        energies.push({ x: r1(centre(i) - larg / 2), y: r1(yy), l: larg, h: r1(Math.max(1, h - 0.5)), classe });
      }
    }
    if (c || parCreneau[i].total) zones.push({ x: r1(d.gauche + l * i), l: r1(l), debut });
  });
  const etiquettes = CRENEAUX.map((debut, i) => ({ x: r1(centre(i) - l / 2), texte: `${debut} h` })).filter((_, i) => i % 2 === 0);
  const libelles = rangees.map((r) => ({ cle: r.cle, lignes: r.libelle.map((t) => ({ texte: t, y: r1(r.y + r.h / 2) })) }));
  return { dim: { largeur: d.largeur, hauteur }, axeY, rangees, libelles, barres, energies, zones, etiquettes, parCreneau };
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

// Colonnes (spec §2.5, graphiques 1, 2 et 5) : jour de la semaine, lieu ou mois, pour les mesures oui / non (v7 : les
// émotions par famille sont des barres empilées, geometrieBarres). Une barre haute de oui / n, creuse sous 3 valeurs,
// et son compte au-dessus (sur deux lignes, « 3 » puis « lundis ») quand la colonne est assez large ; sinon le compte
// reste dans le tableau.
// Les sept jours sont toujours assez larges (« mercredis » tient entre ses voisins).
// Les mêmes colonnes pour toutes les mesures, pour que le choix de mesure ne déplace rien.
export const DIM_COLONNES = { largeur: 326, gauche: 22, droite: 6, haut: 8, bas: 132, axeY: 148, hauteur: 152, rang: 12, large: 30, lieuSerre: 72 };

export function geometrieColonnes({ pas, colonnes }, d = DIM_COLONNES) {
  const n = Math.max(1, colonnes.length);
  const l = (d.largeur - d.gauche - d.droite) / n;
  const centre = (i) => r1(d.gauche + l * (i + 0.5));
  const hMax = d.bas - d.haut - 24; // la place des deux lignes du compte au-dessus de la plus haute barre
  const larg = r1(Math.min(24, l * 0.6));
  const large = l >= d.large; // tient « 12 » et « jours », ou « sept. »
  const barres = [];
  const comptes = [];
  colonnes.forEach((c, i) => {
    if (!c.n) return;
    const x = centre(i);
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
    barres, comptes, etiquettes, largeurColonne: r1(l),
    base: { x1: d.gauche, x2: d.largeur - d.droite, y: d.bas },
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
