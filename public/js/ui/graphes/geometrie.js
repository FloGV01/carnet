// Géométrie pure des graphiques (rendue en SVG à l'écran et sur canvas pour le PDF).
// Coordonnées arrondies au dixième. Une colonne vide ne dessine rien. 326 = largeur intérieure
// d'une carte sur un écran de 390 : une unité vaut un pixel.
import { jourSemaine as jourSemaineCle } from '../../domain/dates.js';
import { FAMILLES } from '../../domain/roue.js';
import { ZONES, zoneDe as zoneDeCarte } from '../../domain/carte-roue.js';

// Les familles de la roue, dans leur ordre : l'ordre d'empilement des barres d'émotions.
const ORDRE_FAMILLES = FAMILLES.map((f) => f.cle);

const r1 = (x) => Math.round(x * 10) / 10;

// ---------- Mes jours : constantes communes ----------
// Repères de traitement (v6, analyse/reperes.js) : un trait fin au centre de chaque colonne qui porte un changement, son
// numéro (①, ①–②) en haut. Deux numéros trop proches passent sur un second rang.
const CLASSE_NUIT = { 'sommeil:mal': 'sommeil-1', 'sommeil:moyen': 'sommeil-2', 'sommeil:bien': 'sommeil-3' };
const MOIS_AXE = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
// Taille des numéros (unités du graphique) : la même à l'écran (ecrans.css, .g-changement-num) et sur le PDF.
export const TAILLE_REPERE = 11;
const REPERE = { taille: TAILLE_REPERE, rang: 13, marge: 3, ecart: 2, rangsMax: 2 };
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

// ---------- v7 · Mes jours, à l'écran (2b) et sur la page A4 ----------
// Une étiquette au début de chaque rangée, les colonnes à droite, leurs noms en tête (L M M J V S D sur 7 jours). Rangées,
// dans l'ordre : Émotions (un point par relevé, à la couleur de la zone de son mot (v9 ; de sa famille en v7 et v8), creux
// et neutre sans zone (famille seule de la v7), dans l'ordre des heures, du bas vers le haut ; par semaine ou par mois,
// une barre par colonne, empilée par famille dans l'ordre de la roue, longue comme le nombre de relevés), Humeur (notes)
// seulement si la période a des anciennes notes de 1 à 10 (le point de la note du jour et un trait du plus bas au plus
// haut), Nuits, Explosions, Autres épisodes, Énergie basse (si un relevé d'énergie est noté), Bien-être
// (v7 : un repère par jour, semaine ou mois qui a une séance, sans total ; si la période en a une ; un losange plein). Les
// repères de traitement : leurs numéros sous les noms de colonnes, leurs traits à travers les rangées. Une colonne vide ne
// dessine rien. La Vue soignants (PDF) dessine la même frise par semaine ou par mois, aux dimensions DIM_MES_JOURS_PDF (sa
// largeur suit le cadre de la page), sans la rangée d'énergie (avecEnergie faux) ni celle du Bien-être. Pure.
// barreMax : la largeur la plus grande d'une barre (12 à l'écran ; plus large sur la page, pour que le motif de chaque
// famille se lise imprimé en noir et blanc).
export const DIM_MES_JOURS = {
  largeur: 326, gauche: 80, droite: 4, teteH: 22, ecart: 8,
  emotionsH: 44, humeurH: 40, nuitH: 14, explH: 16, autresH: 12, energieH: 12, bienEtreH: 8, barreMax: 12,
};
export const DIM_MES_JOURS_PDF = { ...DIM_MES_JOURS, gauche: 84, emotionsH: 56, humeurH: 28, barreMax: 40 };
const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const LIBELLES_RANGEES = {
  emotions: ['Émotions'], humeur: ['Humeur', '(notes)'], nuits: ['Nuits'], explosions: ['Explosions'],
  autres: ['Épisodes'], energie: ['Énergie', 'basse'], bienEtre: ['Bien-être'],
};
// Une étiquette de deux lignes prend 26 unités : sa rangée aussi, la bande dessinée au milieu.
const LIGNE_ETIQUETTE = 13;

// Les points d'une colonne : en une pile (deux côte à côte si la colonne est large), resserrés si la rangée est pleine.
// zones : la zone de chaque relevé, ou null (point creux).
function pilePoints(zones, x, bas, h, l) {
  const r = l >= 20 ? 3.5 : l >= 10 ? 2.5 : 1.8;
  const k = l >= 22 && zones.length > 1 ? 2 : 1;
  const rangs = Math.ceil(zones.length / k);
  const pas = rangs > 1 ? Math.min(2 * r + 2, (h - 2 * r) / (rangs - 1)) : 0;
  return zones.map((zone, j) => {
    const rang = Math.floor(j / k);
    const seul = k === 2 && j === zones.length - 1 && j % 2 === 0;
    const dx = k === 2 && !seul ? (j % 2 ? 1 : -1) * (r + 0.8) : 0;
    return { x: r1(x + dx), y: r1(bas - r - rang * pas), r, zone };
  });
}

// zoneDe (v9) : la zone d'un mot, à passer avec les mots à soi (domain/carte-roue.js, zoneDe(id, perso)).
export function geometrieMesJours({ pas, colonnes, avecHumeur = false, avecEnergie = false, avecBienEtre = false }, { reperes = [], zoneDe = zoneDeCarte, ordreFamilles = ORDRE_FAMILLES } = {}, d = DIM_MES_JOURS) {
  const n = Math.max(1, colonnes.length);
  const l = (d.largeur - d.gauche - d.droite) / n;
  const centre = (i) => d.gauche + l * (i + 0.5);
  const larg = r1(Math.min(d.barreMax ?? 12, Math.max(2, l * 0.6)));
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
  const bie = avecBienEtre ? ajouter('bienEtre', d.bienEtreH ?? 8) : null;
  const hauteur = r1(y - d.ecart + 2);

  const points = [];
  const barres = [];
  // graduations : le haut (10) et le bas (1) de la rangée des notes, que la page A4 écrit à gauche des colonnes.
  const notes = { points: [], traits: [], graduations: [] };
  const nuits = [];
  const encoches = [];
  const autres = [];
  const energieBasse = [];
  const bienEtre = [];
  const zones = [];
  const yNote = (v) => r1(hum.y + ((10 - v) / 9) * hum.h);
  if (hum) notes.graduations.push({ v: 10, y: yNote(10) }, { v: 1, y: yNote(1) });
  // Le total d'une colonne : la somme des familles dessinées, et d'elles seules (une clé inconnue ne fausse pas la hauteur).
  const totalFamilles = (c) => (c.familles ? ordreFamilles.reduce((s, f) => s + (c.familles[f] || 0), 0) : 0);
  const maxEmotions = Math.max(1, ...colonnes.map(totalFamilles));
  const maxExpl = Math.max(1, ...colonnes.map((c) => c.explosions || 0));
  const joursBas = (c) => (c.energieBasse === true ? 1 : c.energieBasse || 0);
  const maxEnergie = Math.max(1, ...colonnes.map(joursBas));
  // Le losange Bien-être : la hauteur de sa rangée au plus, et 2 px entre deux colonnes voisines (1 px au moins).
  const rLosange = bie ? r1(Math.min(bie.h / 2, Math.max(1.5, (l - 2) / 2))) : 0;
  colonnes.forEach((c, i) => {
    const x = r1(centre(i));
    const xb = r1(x - larg / 2);
    if (pas === 'jour') {
      // Un point par relevé à émotion, Fatigué et Épuisé compris (sans famille, mais dans une zone).
      const zones = (c.emotions || []).map((id) => zoneDe(id) || null);
      points.push(...pilePoints(zones, x, emo.y + emo.h, emo.h, l).map((p) => ({ ...p, cle: c.cle })));
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
    // Un repère de la même taille pour chaque colonne qui a une séance : ni hauteur ni nombre. Un losange plein, centré
    // en x sur la colonne et au milieu de la rangée (y, h), de demi-diagonale r. Une barre pleine se confondait en sombre
    // avec « nuit bien » (1:1 entre les deux bleus), et le contour arrondi qui l'a remplacée (v8, Q29) se lisait « 0 »
    // sur 30 jours (relecture finale) : la forme les distingue, les teintes ne changent pas.
    if (bie && c.bienEtre) bienEtre.push({ x, y: bie.y, h: bie.h, r: rLosange, cle: c.cle });
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
    points, barres, notes, nuits, encoches, autres, energieBasse, bienEtre, zones, reperes: traitsReperes,
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

// ---------- v9 · Tes zones, par semaine (spec §8 et §13.2) ----------
// Une colonne par semaine (les 12 dernières, analyse/emotions.js, zonesParSemaine), la plus ancienne à gauche : une barre
// empilée par zone, de bas en haut dans l'ordre des zones (rouge, jaune, bleu, vert, celui de la légende), longue comme
// le nombre de relevés de la semaine, sur une échelle commune. Une semaine sans relevé ne dessine rien et ne se touche
// pas. Sous les barres, le filet de base et le lundi de chaque semaine (« 29/09 »), un sur deux en partant de la plus
// récente. zones : la colonne entière de chaque semaine qui a un relevé, à toucher pour son détail.
export const DIM_ZONES_SEMAINES = { largeur: 326, haut: 4, barresH: 96, axeH: 18, barreMax: 16 };

export function geometrieZonesSemaines(semaines, d = DIM_ZONES_SEMAINES) {
  const n = Math.max(1, semaines.length);
  const l = d.largeur / n;
  const centre = (i) => l * (i + 0.5);
  const larg = r1(Math.min(d.barreMax, l * 0.6));
  const bas = d.haut + d.barresH;
  const total = (s) => ZONES.reduce((t, z) => t + (s[z] || 0), 0);
  const max = Math.max(1, ...semaines.map(total));
  const barres = [];
  const zones = [];
  semaines.forEach((s, i) => {
    const t = total(s);
    if (!t) return;
    let yy = bas;
    const hTotal = Math.max(3, (t / max) * d.barresH);
    for (const zone of ZONES) {
      const k = s[zone] || 0;
      if (!k) continue;
      const h = (k / t) * hTotal;
      yy -= h;
      barres.push({ x: r1(centre(i) - larg / 2), y: r1(yy), l: larg, h: r1(Math.max(0.8, h - 0.6)), zone, cle: s.semaine });
    }
    zones.push({ x: r1(l * i), l: r1(l), cle: s.semaine });
  });
  const etiquettes = semaines.map((s, i) => ({ x: r1(centre(i)), texte: `${Number(s.semaine.slice(8))}/${s.semaine.slice(5, 7)}`, cle: s.semaine }))
    .filter((_, i) => (n - 1 - i) % 2 === 0);
  return { dim: { largeur: d.largeur, hauteur: r1(bas + d.axeH) }, base: { x1: 0, x2: d.largeur, y: r1(bas + 0.5) }, axeY: r1(bas + 13), barres, zones, etiquettes };
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

// Mes nuits (v8, Q15 et §7 bis) : une ligne par nuit notée, dans l'ordre des jours. Le jour à gauche ; une barre longue
// comme les heures dormies, à la teinte de sa qualité (la rampe du sommeil, comme Mes jours ; creuse sans qualité) ; le
// texte de la nuit à droite (« Mal · 6 h »), qui dit aussi la qualité d'une nuit sans durée, laquelle n'a pas de barre.
// Une seule échelle, de 0 à 12 h, gradué toutes les 4 h en haut ; plus loin seulement si une nuit ancienne a duré
// davantage. Ni ligne pour une nuit non notée, ni rien sur l'heure du coucher ou la régularité.
export const DIM_MES_NUITS = { largeur: 326, barreX: 58, texteL: 104, ecart: 10, haut: 18, ligneH: 16, barreH: 8 };
export const AXE_MES_NUITS = { min: 12, pas: 4 };

export function geometrieMesNuits(nuits, d = DIM_MES_NUITS) {
  const { min, pas } = AXE_MES_NUITS;
  const plusLongue = Math.max(0, ...nuits.map((n) => n.heures ?? 0));
  const max = Math.max(min, Math.ceil(plusLongue / pas) * pas);
  const L = d.largeur - d.barreX - d.texteL - d.ecart;
  const x = (h) => r1(d.barreX + (Math.max(0, h) / max) * L);
  const lignes = nuits.map((n, i) => {
    const y = d.haut + i * d.ligneH;
    const barre = n.heures == null ? null
      : { x: d.barreX, y: r1(y + (d.ligneH - d.barreH) / 2), l: r1(Math.max(2, x(n.heures) - d.barreX)), h: d.barreH, classe: CLASSE_NUIT[n.qualite] || 'creuse' };
    return { date: n.date, y: r1(y + d.ligneH / 2), barre };
  });
  const bas = r1(d.haut + nuits.length * d.ligneH);
  const graduations = [];
  for (let h = 0; h <= max; h += pas) graduations.push({ heures: h, x: x(h), y: 8, texte: `${h} h` });
  return { lignes, graduations, filets: graduations.map((g) => ({ x: g.x, y1: d.haut - 4, y2: bas })), texteX: d.largeur, hauteur: r1(bas + 2), max };
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
