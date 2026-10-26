import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometrieMesJours, geometrieJournee, DIM_MES_JOURS, DIM_MES_JOURS_PDF, CRENEAUX } from '../../public/js/ui/graphes/geometrie.js';

const jour = (cle, extra = {}) => ({ cle, humeur: null, moyenne7: null, nuit: null, explosions: null, autres: 0, aDonnee: false, ...extra });

// v7 : la frise « Mes jours » (geometrieMesJours) sert à l'écran et sur la page A4 de la Vue soignants (DIM_MES_JOURS_PDF).
const lignes = (g, cle) => g.rangees.find((r) => r.cle === cle);

test('Mes jours par jour : la note du jour de 10 en haut à 1 en bas, colonne vide sans rien, un trait seulement là où il y a un écart', () => {
  const colonnes = [
    jour('2026-10-01', { humeur: 10, nuit: 'sommeil:mal', explosions: 2, aDonnee: true }),
    jour('2026-10-02'),
    jour('2026-10-03', { humeur: 1, explosions: 0, autres: 1, aDonnee: true }),
    jour('2026-10-04', { humeur: 5.5, humeurMin: 3, humeurMax: 8, aDonnee: true }),
    jour('2026-10-05', { humeur: 5, humeurMin: 5, humeurMax: 5, aDonnee: true }),
  ];
  const g = geometrieMesJours({ pas: 'jour', colonnes, avecHumeur: true });
  const hum = lignes(g, 'humeur');
  assert.equal(g.notes.points[0].y, hum.y);
  assert.equal(g.notes.points[1].y, hum.y + hum.h);
  assert.deepEqual(g.notes.graduations, [{ v: 10, y: hum.y }, { v: 1, y: hum.y + hum.h }]);
  assert.equal(g.notes.traits.length, 1, 'ni un jour vide, ni des relevés tous égaux');
  assert.equal(g.notes.traits[0].x, g.notes.points[2].x);
  assert.equal(g.encoches.length, 1, 'zéro explosion ne dessine rien');
  assert.equal(g.nuits.length, 1);
  assert.equal(g.autres.length, 1);
  assert.deepEqual(g.zones.map((z) => z.cle), ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05'], 'rien à toucher sur un jour vide');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  // Sans note sur la période : ni rangée, ni graduation.
  assert.deepEqual(geometrieMesJours({ pas: 'jour', colonnes, avecHumeur: false }).notes, { points: [], traits: [], graduations: [] });
});

test('Mes jours par semaine : nuits empilées, anneau si fragile, explosions à l\'échelle, familles empilées dans l\'ordre de la roue', () => {
  const colonnes = [
    { cle: '2026-09-21', humeur: 5, fragile: true, nuits: { mal: 1, moyen: 0, bien: 2 }, explosions: 3, autres: 0, aDonnee: true,
      familles: { colere: 2, degout: 0, tristesse: 0, joie: 1, surprise: 0, peur: 0, serenite: 3 }, nEmotions: 6 },
    { cle: '2026-09-28', humeur: 6, fragile: false, nuits: null, explosions: 1, autres: 2, aDonnee: true, familles: null, nEmotions: 0 },
  ];
  const g = geometrieMesJours({ pas: 'semaine', colonnes, avecHumeur: true });
  assert.equal(g.notes.points[0].plein, false);
  assert.equal(g.nuits.length, 2);
  assert.ok(g.encoches[0].h > g.encoches[1].h);
  assert.deepEqual(g.barres.map((b) => b.famille), ['colere', 'joie', 'serenite']);
  assert.ok(g.barres[0].y > g.barres[1].y && g.barres[1].y > g.barres[2].y, 'de bas en haut');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
});

test('v7 · Mes jours sur la page A4 : des barres plus larges (barreMax), les mêmes rangées et le même ordre qu\'à l\'écran', () => {
  const colonnes = Array.from({ length: 12 }, (_, i) => ({ cle: `2026-${String(i + 1).padStart(2, '0')}`, humeur: 5, fragile: false, nuits: null, explosions: 1, autres: 0, aDonnee: true,
    familles: { colere: 1, degout: 0, tristesse: 0, joie: 0, surprise: 0, peur: 0, serenite: 2 }, nEmotions: 3 }));
  const ecran = geometrieMesJours({ pas: 'mois', colonnes, avecHumeur: true });
  const pdf = geometrieMesJours({ pas: 'mois', colonnes, avecHumeur: true }, {}, { ...DIM_MES_JOURS_PDF, largeur: 900 });
  assert.deepEqual(pdf.rangees.map((r) => r.cle), ecran.rangees.map((r) => r.cle));
  assert.deepEqual(pdf.barres.map((b) => b.famille), ecran.barres.map((b) => b.famille));
  assert.equal(ecran.barres[0].l, DIM_MES_JOURS.barreMax);
  assert.ok(pdf.barres[0].l > ecran.barres[0].l && pdf.barres[0].l <= DIM_MES_JOURS_PDF.barreMax);
  assert.deepEqual(horsCadre(pdf, pdf.dim.largeur, pdf.dim.hauteur), []);
});

test('ta journée (v7) : 12 créneaux de 4 h à 4 h, les familles d\'émotions empilées par créneau, l\'énergie empilée', async () => {
  const { famillesParHeure } = await import('../../public/js/analyse/emotions.js');
  assert.deepEqual(CRENEAUX.slice(0, 2), [4, 6]);
  assert.equal(CRENEAUX[CRENEAUX.length - 1], 2);
  const creneaux = [{ debut: 10, fin: 12, energie: { 'energie:basse': 2, 'energie:moyenne': 1, 'energie:haute': 0 } }, { debut: 0, fin: 2, energie: { 'energie:basse': 1 } }];
  // 10 h et 11 h : même créneau ; 01 h : le créneau de minuit, après la soirée.
  const parHeure = famillesParHeure([
    { heure: '10:00', famille: 'colere' }, { heure: '11:30', famille: 'serenite' }, { heure: '11:40', famille: 'colere' }, { heure: '01:00', famille: 'joie' },
  ]);
  const g = geometrieJournee({ parHeure, creneaux });
  assert.deepEqual(g.rangees.map((r) => r.cle), ['emotions', 'energie']);
  assert.deepEqual(g.barres.map((b) => [b.debut, b.famille]), [[10, 'colere'], [10, 'serenite'], [0, 'joie']], 'dans l\'ordre de la roue, du bas vers le haut');
  assert.ok(g.barres[1].y < g.barres[0].y, 'la sérénité au-dessus de la colère');
  assert.equal(g.energies.length, 3);
  assert.ok(g.zones[1].x > g.zones[0].x, 'minuit après la soirée');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  // Sans émotion (sous le seuil, parHeure nul) : la seule rangée Énergie ; sans rien : aucune rangée.
  assert.deepEqual(geometrieJournee({ parHeure: null, creneaux }).rangees.map((r) => r.cle), ['energie']);
  assert.deepEqual(geometrieJournee({ parHeure: null, creneaux: [] }).rangees, []);
});

test('v7 · Mes jours à l\'écran : une étiquette par rangée, un point par relevé à la couleur de sa famille, « Humeur (notes) » seulement avec des notes', async () => {
  const { geometrieMesJours } = await import('../../public/js/ui/graphes/geometrie.js');
  const { frise } = await import('../../public/js/analyse/frise.js');
  const humeurs = [
    { date: '2026-10-12', heure: '09:00', emotion: 'roue:colere:irrite' }, { date: '2026-10-12', heure: '18:00', emotion: 'roue:serenite' },
    { date: '2026-10-12', heure: '20:00', emotion: 'roue:joie:amuse' }, { date: '2026-10-14', heure: '10:00', emotion: 'roue:peur' },
  ];
  const f = frise({ journal: [{ date: '2026-10-13', sommeilRessenti: 'sommeil:mal' }], episodes: [], humeurs }, '2026-10-12', '2026-10-18');
  const g = geometrieMesJours(f);
  assert.deepEqual(g.rangees.map((r) => r.cle), ['emotions', 'nuits', 'explosions', 'autres'], 'sans note ni énergie : ni « Humeur (notes) » ni « Énergie basse »');
  assert.deepEqual(g.libelles.map((l) => l.lignes.map((x) => x.texte).join(' ')), ['Émotions', 'Nuits', 'Explosions', 'Épisodes']);
  assert.deepEqual(g.etiquettes.map((e) => e.texte), ['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  assert.deepEqual(g.points.map((p) => [p.cle, p.famille]), [['2026-10-12', 'colere'], ['2026-10-12', 'serenite'], ['2026-10-12', 'joie'], ['2026-10-14', 'peur']]);
  assert.ok(g.points[2].y < g.points[0].y, 'le troisième relevé du jour monte d\'un rang');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  // Avec une ancienne note : la rangée « Humeur (notes) », sous les émotions.
  const avecNote = frise({ journal: [{ date: '2026-10-13', humeur: 6, humeurN: 1 }], episodes: [], humeurs }, '2026-10-12', '2026-10-18');
  const g2 = geometrieMesJours(avecNote);
  assert.deepEqual(g2.rangees.map((r) => r.cle), ['emotions', 'humeur', 'nuits', 'explosions', 'autres']);
  assert.deepEqual(g2.libelles[1].lignes.map((x) => x.texte), ['Humeur', '(notes)']);
  assert.equal(g2.notes.points.length, 1);
  assert.deepEqual(horsCadre(g2, g2.dim.largeur, g2.dim.hauteur), []);
  // Par semaine : une barre par colonne, empilée par famille dans l'ordre de la roue.
  const parSemaine = frise({ journal: [], episodes: [], humeurs }, '2026-07-20', '2026-10-18');
  const g3 = geometrieMesJours(parSemaine);
  assert.equal(parSemaine.pas, 'semaine');
  assert.deepEqual(g3.barres.map((b) => b.famille), ['colere', 'joie', 'peur', 'serenite']);
  assert.deepEqual(horsCadre(g3, g3.dim.largeur, g3.dim.hauteur), []);
  // Beaucoup de relevés un même jour, sur 31 colonnes étroites : les points restent dans leur rangée.
  const plein = Array.from({ length: 14 }, (_, i) => ({ date: '2026-10-01', heure: `${String(6 + i).padStart(2, '0')}:00`, emotion: 'roue:joie' }));
  const g4 = geometrieMesJours(frise({ journal: [], episodes: [], humeurs: plein }, '2026-09-18', '2026-10-18'));
  const emo = g4.rangees[0];
  assert.ok(g4.points.every((p) => p.y - p.r >= emo.y - 0.1 && p.y + p.r <= emo.y + emo.h + 0.1));
});

// v6 · énergie basse (spec §3) : une rangée sous les épisodes, à l'écran seulement (avecEnergie). La page A4 ne la reçoit
// jamais : sans avecEnergie, la même colonne donne exactement la même frise.
test('v6 · Mes jours par jour : une marque par jour à énergie basse, rien pour les autres jours', () => {
  const colonnes = [
    jour('2026-10-01', { energieBasse: true, aDonnee: true }),
    jour('2026-10-02', { energieBasse: false }),
    jour('2026-10-03', { energieBasse: null }),
    jour('2026-10-04'),
    jour('2026-10-05', { energieBasse: true, humeur: 5, aDonnee: true }),
  ];
  const g = geometrieMesJours({ pas: 'jour', colonnes, avecEnergie: true });
  const ene = lignes(g, 'energie');
  assert.equal(g.energieBasse.length, 2, 'ni les jours sans basse, ni les jours sans relevé, ni zéro');
  assert.ok(g.energieBasse.every((m) => m.y === ene.y && m.h === ene.h && m.n === 1), 'la même marque chaque jour');
  assert.deepEqual(g.energieBasse.map((m) => m.x + m.l / 2), [g.zones[0].x + g.zones[0].l / 2, g.zones[1].x + g.zones[1].l / 2], 'au milieu de la colonne');
  assert.equal(g.rangees.at(-1).cle, 'energie', 'sous les autres épisodes');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
});

test('v6 · Mes jours par semaine ou par mois : une barre longue du nombre de jours, comme les explosions', () => {
  const col = (cle, energieBasse, extra = {}) => ({ cle, humeur: null, fragile: false, nuits: null, explosions: null, autres: 0, aDonnee: energieBasse > 0, energieBasse, ...extra });
  const colonnes = [col('2026-09-14', 6), col('2026-09-21', 1), col('2026-09-28', 0), col('2026-10-05', null), col('2026-10-12', 3)];
  for (const pas of ['semaine', 'mois']) {
    const g = geometrieMesJours({ pas, colonnes, avecEnergie: true });
    const ene = lignes(g, 'energie');
    assert.deepEqual(g.energieBasse.map((m) => m.n), [6, 1, 3], 'zéro jour et jour inconnu ne dessinent rien');
    assert.deepEqual(g.energieBasse.map((m) => m.h), [ene.h, 3, 6], 'à l\'échelle de la plus haute, 3 au moins');
    assert.ok(g.energieBasse.every((m) => m.y + m.h === ene.y + ene.h), 'posées sur le bas de la rangée');
    assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  }
});

test('v6 · Mes jours sans avecEnergie (la page A4) : ni rangée, ni marque, et rien d\'autre ne change', () => {
  const col = (cle, extra) => ({ cle, humeur: 5, fragile: false, nuits: { mal: 1, moyen: 0, bien: 1 }, explosions: 1, autres: 1, aDonnee: true, ...extra });
  const avec = [col('2026-09-21', { energieBasse: 4 }), col('2026-09-28', { energieBasse: 0 })];
  const sans = avec.map(({ energieBasse, ...c }) => c);
  const pdf = geometrieMesJours({ pas: 'semaine', colonnes: avec, avecHumeur: true }, {}, { ...DIM_MES_JOURS_PDF, largeur: 900 });
  assert.deepEqual(pdf, geometrieMesJours({ pas: 'semaine', colonnes: sans, avecHumeur: true }, {}, { ...DIM_MES_JOURS_PDF, largeur: 900 }));
  assert.deepEqual(pdf.energieBasse, []);
  assert.ok(!pdf.rangees.some((r) => r.cle === 'energie'));
});


test('v7 · Mes jours, rangée Bien-être : le même repère pour chaque colonne qui a une séance, sans nombre ; pas de rangée sans avecBienEtre', () => {
  const colonnes = [
    jour('2026-10-01', { bienEtre: true, aDonnee: true }), jour('2026-10-02', { bienEtre: false }), jour('2026-10-03'),
    jour('2026-10-04', { bienEtre: true, energieBasse: true, aDonnee: true }),
  ];
  const g = geometrieMesJours({ pas: 'jour', colonnes, avecEnergie: true, avecBienEtre: true });
  const bie = lignes(g, 'bienEtre');
  assert.deepEqual(bie.libelle, ['Bien-être']);
  assert.equal(g.rangees.at(-1).cle, 'bienEtre', 'la dernière rangée, sous l\'énergie basse');
  assert.deepEqual(g.bienEtre.map((m) => m.cle), ['2026-10-01', '2026-10-04']);
  assert.ok(g.bienEtre.every((m) => m.y === bie.y && m.h === bie.h && m.r === g.bienEtre[0].r && !('n' in m)), 'la même marque, sans nombre');
  assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  // Relecture finale : un losange plein (le contour arrondi se lisait « 0 » sur 30 jours), dans sa rangée, et deux
  // colonnes voisines gardent un écart, à 7 colonnes comme à 30 ou à 60 (par mois).
  for (const n of [7, 30, 60]) {
    const cols = Array.from({ length: n }, (_, i) => jour(`2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, { bienEtre: true, aDonnee: true }));
    const gn = geometrieMesJours({ pas: 'jour', colonnes: cols, avecBienEtre: true });
    const r = gn.bienEtre[0].r;
    assert.equal(gn.bienEtre.length, n);
    assert.ok(r >= 1.5 && r <= gn.bienEtre[0].h / 2, `${n} colonnes : r = ${r}`);
    assert.ok(2 * r <= gn.largeurColonne - 1, `${n} colonnes : ${2 * r} pour une colonne de ${gn.largeurColonne}`);
    assert.ok(gn.bienEtre.every((m) => m.x - m.r >= DIM_MES_JOURS.gauche - 1e-9 && m.x + m.r <= gn.dim.largeur), `${n} colonnes : dans le cadre`);
  }
  // Par semaine : un repère, qu'il y ait une séance ou dix dans la semaine.
  const semaines = geometrieMesJours({ pas: 'semaine', colonnes: [{ cle: '2026-09-28', bienEtre: true, aDonnee: true }, { cle: '2026-10-05', bienEtre: false }], avecBienEtre: true });
  assert.equal(semaines.bienEtre.length, 1);
  // Sans avecBienEtre (période sans séance, page A4) : ni rangée ni repère, et rien d'autre ne bouge.
  const sans = geometrieMesJours({ pas: 'jour', colonnes, avecEnergie: true });
  assert.deepEqual(sans.bienEtre, []);
  assert.ok(!sans.rangees.some((r) => r.cle === 'bienEtre'));
  assert.deepEqual(sans.energieBasse, g.energieBasse);
  assert.ok(sans.dim.hauteur < g.dim.hauteur);
});

test('v7 · Mes jours, détail d\'une colonne : « Bien-être » pour un jour ou une semaine avec une séance, jamais leur nombre', async () => {
  const { detailColonne } = await import('../../public/js/ui/graphes/graphes.js');
  const lib = (id) => id;
  assert.deepEqual(detailColonne('jour', { bienEtre: true, entree: {} }, lib), ['Bien-être']);
  assert.deepEqual(detailColonne('jour', { bienEtre: false, entree: {} }, lib), []);
  assert.deepEqual(detailColonne('semaine', { humeur: null, bienEtre: true }, lib), ['Bien-être']);
  assert.deepEqual(detailColonne('mois', { humeur: null, bienEtre: false }, lib), []);
});


test('v6 · Mes jours, détail d\'une colonne : l\'humeur, avec une décimale, et son écart', async () => {
  const { detailColonne } = await import('../../public/js/ui/graphes/graphes.js');
  const lib = (id) => id;
  assert.deepEqual(detailColonne('jour', { humeur: 17 / 3, humeurMin: 3, humeurMax: 8, entree: {} }, lib), ['humeur 5,7 (de 3 à 8)']);
  assert.deepEqual(detailColonne('jour', { humeur: 6, humeurMin: null, humeurMax: null, entree: {} }, lib), ['humeur 6']);
  assert.deepEqual(detailColonne('semaine', { humeur: 5.64, fragile: false }, lib), ['humeur 5,6 en moyenne']);
});

test('v6 · Mes jours, détail d\'une colonne : l\'énergie basse seulement quand il y en a, jamais un zéro', async () => {
  const { detailColonne } = await import('../../public/js/ui/graphes/graphes.js');
  const lib = (id) => id;
  assert.deepEqual(detailColonne('jour', { humeur: 6, energieBasse: true, entree: {} }, lib), ['humeur 6', 'énergie basse']);
  assert.deepEqual(detailColonne('jour', { humeur: 6, energieBasse: false, entree: {} }, lib), ['humeur 6']);
  assert.deepEqual(detailColonne('jour', { humeur: 6, energieBasse: null, entree: {} }, lib), ['humeur 6']);
  assert.deepEqual(detailColonne('semaine', { humeur: 5, fragile: false, energieBasse: 1 }, lib), ['humeur 5,0 en moyenne', '1 jour d\'énergie basse']);
  assert.deepEqual(detailColonne('mois', { humeur: null, energieBasse: 12 }, lib), ['12 jours d\'énergie basse']);
  assert.deepEqual(detailColonne('semaine', { humeur: 5, fragile: false, energieBasse: 0 }, lib), ['humeur 5,0 en moyenne']);
  assert.deepEqual(detailColonne('semaine', { humeur: 5, fragile: false, energieBasse: null }, lib), ['humeur 5,0 en moyenne']);
});

// ---------- v6 · Comprendre ----------

const r1 = (x) => Math.round(x * 10) / 10;

// Chaque nombre est fini, et chaque forme reste dans le cadre [0, largeur] × [0, hauteur] : les clés x, x1,
// x2, …X portent sur la largeur ; y, y1, y2, …Y, yBase, yPointe sur la hauteur ; x + l et y + h aussi.
function horsCadre(g, largeur, hauteur) {
  const fautes = [];
  const dedans = (v, max) => v >= -1e-9 && v <= max + 1e-9;
  const voir = (o, chemin) => {
    if (typeof o === 'number') { if (!Number.isFinite(o)) fautes.push(`${chemin} = ${o}`); return; }
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x, i) => voir(x, `${chemin}[${i}]`)); return; }
    for (const [k, v] of Object.entries(o)) {
      voir(v, `${chemin}.${k}`);
      if (!Number.isFinite(v)) continue;
      if (/^x\d?$|X$/.test(k) && !dedans(v, largeur)) fautes.push(`${chemin}.${k} = ${v} hors de [0, ${largeur}]`);
      if (/^y(\d|Base|Pointe)?$|Y$/.test(k) && !dedans(v, hauteur)) fautes.push(`${chemin}.${k} = ${v} hors de [0, ${hauteur}]`);
    }
    if (typeof o.l === 'number' && typeof o.x === 'number' && !dedans(o.x + o.l, largeur)) fautes.push(`${chemin} : x + l = ${o.x + o.l}`);
    if (typeof o.h === 'number' && typeof o.y === 'number' && !dedans(o.y + o.h, hauteur)) fautes.push(`${chemin} : y + h = ${o.y + o.h}`);
  };
  voir(g, 'g');
  return fautes;
}

test('v6 · le contrôle du cadre repère un NaN et une forme qui déborde', () => {
  assert.equal(horsCadre({ a: [{ x: NaN }] }, 10, 10).length, 1);
  assert.equal(horsCadre({ x: 8, l: 4, y: 0, h: 2 }, 10, 10).length, 1);
  assert.equal(horsCadre({ titreY: 12 }, 10, 10).length, 1);
  assert.deepEqual(horsCadre({ x: 6, l: 4, y: 8, h: 2, y1: 0 }, 10, 10), []);
});

const barre = (decalage, oui, n, dates = []) => ({ decalage, oui, n, part: n ? oui / n : null, peu: n < 3, dates });
const autres = (oui, n) => ({ oui, n, part: n ? oui / n : null, peu: n < 3 });

test('v6 · Comprendre, graphique aligné : un bloc par facteur, dans son cadre, une barre par décalage longue de oui / n, le repère des autres jours', async () => {
  const { geometrieAligne, DIM_ALIGNE: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const blocs = [
    { cle: 'nuitMal', barres: [barre(-3, 6, 10), barre(-2, 10, 10), barre(-1, 0, 4), barre(0, 0, 0)], autres: autres(27, 94) },
    { cle: 'pese:bruit', liste: 'pese', barres: [barre(-3, 1, 2), barre(-2, 2, 2), barre(-1, 3, 5), barre(0, 1, 1)], autres: autres(0, 0) },
  ];
  const g = geometrieAligne(blocs);
  assert.equal(g.length, 2);
  const [b1, b2] = g;
  assert.deepEqual(b1.lignes.map((l) => l.decalage), [-3, -2, -1, 0]);
  assert.ok(b1.titreY < b1.lignes[0].y, 'le titre du bloc, puis ses lignes');
  assert.equal(b1.lignes[0].barre.l, r1(0.6 * d.barreL));
  assert.equal(b1.lignes[1].barre.x + b1.lignes[1].barre.l, d.barreX + d.barreL, 'dix sur dix : toute la piste');
  assert.equal(b1.lignes[2].barre.l, 0, 'zéro sur quatre : une vraie valeur, sans longueur');
  assert.equal(b1.lignes[3].barre, null, 'aucune valeur connue : ni piste, ni barre');
  assert.deepEqual(b1.lignes[0].piste, { x: d.barreX, y: b1.lignes[0].barre.y, l: d.barreL, h: d.barreH });
  assert.equal(b1.lignes[3].piste, null);
  assert.deepEqual([b1.lignes[0].barre.peu, b2.lignes[0].barre.peu, b2.lignes[2].barre.peu], [false, true, false], 'peu de valeurs sous 3');
  // Le repère : à la proportion des autres jours, sur toutes les lignes du bloc, légendé dessous.
  assert.equal(b1.repere.x, r1(d.barreX + (27 / 94) * d.barreL));
  const derniere = b1.lignes[2].barre;
  assert.ok(b1.repere.y1 <= b1.lignes[0].barre.y && b1.repere.y2 >= derniere.y + derniere.h, 'le trait traverse le bloc');
  assert.ok(b1.repere.legendeY > b1.repere.y2);
  assert.equal(b1.repere.peu, false);
  assert.equal(b2.repere, null, 'sans autres jours connus, ni trait ni légende');
  assert.ok(b2.hauteur < b1.hauteur, 'un bloc sans légende est plus court');
  assert.deepEqual(b1.zones.map((z) => z.decalage), [-3, -2, -1], 'seules les barres qui ont des valeurs se touchent');
  assert.deepEqual(b2.zones.map((z) => z.decalage), [-3, -2, -1, 0]);
  for (const b of g) assert.deepEqual(horsCadre(b, d.largeur, b.hauteur), []);
  assert.deepEqual(geometrieAligne([]), []);
});

const colB = (cle, oui, n) => ({ cle, n, oui: n ? oui : 0, part: n ? oui / n : null, fragile: n < 3, libelle: n ? `${oui} jour${oui > 1 ? 's' : ''}` : null });

test('v6 · Comprendre, colonnes des autres mesures : barre haute de oui / n, compte au-dessus, creuse sous 3 valeurs, rien sans valeur', async () => {
  const { geometrieColonnes, DIM_COLONNES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const colonnes = [colB(0, 3, 10), colB(1, 0, 4), colB(2, 0, 0), colB(3, 2, 2), colB(4, 10, 10), colB(5, 1, 5), colB(6, 0, 0)];
  const g = geometrieColonnes({ pas: 'semaine', colonnes });
  assert.deepEqual(g.barres.map((b) => b.cle), [0, 3, 4, 5], 'zéro : pas de barre ; sans valeur : rien');
  assert.deepEqual(g.comptes.map((c) => c.cle), [0, 1, 3, 4, 5], '« 0 mardi » est un vrai compte ; une colonne sans valeur n\'a pas d\'étiquette');
  const par = new Map(g.barres.map((b) => [b.cle, b]));
  assert.equal(par.get(4).y + par.get(4).h, d.bas, 'les barres partent de la ligne de base');
  assert.ok(Math.abs(par.get(0).h - 0.3 * par.get(4).h) < 0.2, 'hauteur proportionnelle à oui / n');
  assert.deepEqual(g.barres.map((b) => b.creuse), [false, true, false, false], 'creuse sous 3 valeurs');
  for (const c of g.comptes) {
    const b = par.get(c.cle);
    assert.ok(c.y1 < c.y2 && c.y2 < (b ? b.y : d.bas), 'le compte est au-dessus de sa barre');
  }
  assert.deepEqual(g.base, { x1: d.gauche, x2: d.largeur - d.droite, y: d.bas });
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
});

test('v6 · Comprendre, colonnes par mois : au plus 7 étiquettes depuis le mois le plus récent, aucun compte dans des colonnes trop étroites', async () => {
  const { geometrieColonnes, DIM_COLONNES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const mois = Array.from({ length: 36 }, (_, i) => `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  const g = geometrieColonnes({ pas: 'mois', mesure: 'explosion', colonnes: mois.map((cle, i) => colB(cle, i % 4, i % 5 ? 6 : 0)) });
  assert.ok(g.etiquettes.length <= 7 && g.etiquettes.length >= 6);
  assert.equal(g.etiquettes[g.etiquettes.length - 1].cle, '2026-12');
  assert.deepEqual(g.comptes, [], 'les comptes restent dans « Voir en tableau »');
  assert.ok(g.barres.length > 0);
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
  const trois = geometrieColonnes({ pas: 'mois', mesure: 'explosion', colonnes: [colB('2026-08', 1, 4), colB('2026-09', 0, 3), colB('2026-10', 2, 5)] });
  assert.equal(trois.comptes.length, 3);
  assert.equal(trois.etiquettes.length, 3);
  // Huit mois tiennent encore « 12 » et « jours » : tous les mois ont leur compte et leur étiquette.
  const huit = geometrieColonnes({ pas: 'mois', mesure: 'explosion', colonnes: mois.slice(0, 8).map((cle) => colB(cle, 2, 5)) });
  assert.deepEqual([huit.comptes.length, huit.etiquettes.length], [8, 8]);
  assert.deepEqual(horsCadre(huit, d.largeur, huit.hauteur), []);
});

test('v6 · Comprendre, colonnes par lieu : étiquettes sur deux rangs quand les lieux sont serrés, toujours dans le cadre', async () => {
  const { geometrieColonnes, DIM_COLONNES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const lieux = ['bureau', 'teletravail', 'conge_repos', 'arret', 'clinique', 'autre'].map((s) => `lieu:${s}`);
  const g = geometrieColonnes({ pas: 'lieu', colonnes: lieux.map((cle, i) => colB(cle, 1, i + 1)) });
  assert.equal(g.etiquettes.length, 6);
  assert.equal(new Set(g.etiquettes.map((e) => e.y)).size, 2, 'deux rangs');
  assert.ok(g.hauteur > d.hauteur);
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
  const g4 = geometrieColonnes({ pas: 'lieu', colonnes: lieux.slice(0, 4).map((cle) => colB(cle, 1, 3)) });
  assert.equal(new Set(g4.etiquettes.map((e) => e.y)).size, 1, 'un seul rang quand « Congé / repos » a la place');
  assert.equal(g4.hauteur, d.hauteur);
});

test('v6 · Comprendre, activités : une barre par activité, longue comme ses relevés, découpée en énergie basse, moyenne et haute', async () => {
  const { geometrieActivites, DIM_BARRES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const g = geometrieActivites([
    { id: 'activiteMoment:travail', n: 12, basse: 6, moyenne: 4, haute: 2 },
    { id: 'activiteMoment:repos', n: 3, basse: 0, moyenne: 0, haute: 3 },
  ]);
  const [l1, l2] = g.groupes[0].lignes;
  assert.deepEqual([l1.cle, l2.cle], ['activiteMoment:travail', 'activiteMoment:repos'], 'l\'ordre reçu est gardé');
  assert.deepEqual(l1.segments.map((s) => s.classe), ['energie-1', 'energie-2', 'energie-3']);
  assert.deepEqual(l2.segments.map((s) => s.classe), ['energie-3'], 'une énergie sans relevé ne dessine rien');
  const fin = (s) => s[s.length - 1].x + s[s.length - 1].l;
  assert.equal(fin(l1.segments), d.largeur, 'la plus longue prend toute la largeur');
  assert.ok(Math.abs(fin(l2.segments) - d.largeur / 4) < 0.2, '3 relevés sur 12');
  assert.ok(Math.abs(l1.segments[1].x - d.largeur / 2) < 0.2, 'la moitié en énergie basse');
  assert.ok(l1.texteY < l1.segments[0].y && l2.texteY > l1.segments[0].y + l1.segments[0].h, 'le nom au-dessus de sa barre, les lignes à la suite');
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
});

test('v6 · Comprendre, pesé et rechargé : deux groupes titrés ; un groupe vide garde son titre, sans barre', async () => {
  const { geometrieBarres, DIM_BARRES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const ligne = (cle, n) => ({ cle, n, parts: [{ n, classe: 'barre' }] });
  const g = geometrieBarres([
    { cle: 'pese', titre: true, lignes: [ligne('pese:bruit', 4), ligne('pese:attente', 1)] },
    { cle: 'recharge', titre: true, lignes: [] },
  ]);
  const [pese, recharge] = g.groupes;
  assert.ok(pese.titreY < pese.lignes[0].texteY);
  assert.equal(pese.lignes[0].segments[0].l, d.largeur);
  assert.equal(pese.lignes[1].segments[0].l, r1(d.largeur / 4));
  assert.ok(recharge.titreY > pese.lignes[1].segments[0].y, 'le second groupe suit le premier');
  assert.deepEqual(recharge.lignes, []);
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
  // Un segment de moins d'une unité, au bout de la plus longue barre, reste dans le cadre.
  const fine = geometrieBarres([{ cle: 'a', titre: false, lignes: [{ cle: 'x', n: 400, parts: [{ n: 399, classe: 'energie-1' }, { n: 1, classe: 'energie-3' }] }] }]);
  assert.deepEqual(horsCadre(fine, d.largeur, fine.hauteur), []);
});

test('v6 · Comprendre, textes : « 6 sur 10 », « · (peu de valeurs) », rien sans valeur, et une phrase d\'accessibilité fixe sans chiffre', async () => {
  const { libelleCompte, libelleAutres, phraseAria, GRAPHES } = await import('../../public/js/ui/graphes/comprendre.js');
  assert.equal(libelleCompte({ oui: 6, n: 10, peu: false }), '6 sur 10');
  assert.equal(libelleCompte({ oui: 2, n: 2, peu: true }), '2 sur 2 · (peu de valeurs)');
  assert.equal(libelleCompte({ oui: 0, n: 4, peu: false }), '0 sur 4');
  assert.equal(libelleCompte({ oui: 0, n: 0, peu: true }), null);
  assert.equal(libelleAutres({ oui: 27, n: 94, peu: false }), 'les autres jours : 27 sur 94');
  assert.equal(libelleAutres({ oui: 1, n: 2, peu: true }), 'les autres jours : 1 sur 2 · (peu de valeurs)');
  assert.equal(libelleAutres({ oui: 0, n: 0, peu: true }), null);
  const carte = new Map([['sommeil:mal', 'Mal'], ['energie:basse', 'Basse']]);
  const lib = (id) => carte.get(id) || id;
  assert.deepEqual(GRAPHES, ['explosionsAvant', 'explosionsApres', 'energieAvant', 'retoursBureau', 'semaine', 'lieu', 'mois', 'mesNuits', 'activites',
    'peseRecharge', 'apresNuit', 'autourExplosions', 'autourBienEtre', 'emotionsActivites']);
  const phrases = new Set();
  for (const graphe of GRAPHES) {
    for (const mesure of ['emotions', 'nuitMal', 'explosion', 'energieBasse']) {
      const p3 = phraseAria(graphe, '3mois', lib, mesure);
      const pt = phraseAria(graphe, 'tout', lib, mesure);
      for (const p of [p3, pt]) {
        assert.ok(!/\d|%/.test(p), `aucun chiffre : ${p}`);
        assert.match(p, /« Voir en tableau »\.$/);
        phrases.add(p);
      }
      // v8 · Mes nuits a sa propre fenêtre, quelle que soit la période choisie.
      if (graphe === 'mesNuits') {
        assert.equal(p3, pt);
        assert.match(pt, /^Mes nuits, sur les quatre dernières semaines : /);
        continue;
      }
      assert.match(p3, /sur les trois derniers mois/);
      assert.match(pt, /sur tout ce que tu as noté/);
    }
  }
  // Les colonnes disent leur mesure ; les autres graphiques n'en ont pas ; Mes nuits ne dit pas la période.
  assert.equal(phrases.size, 2 * (10 + 3 * 4) + 1);
  assert.match(phraseAria('semaine', 'tout', lib, 'nuitMal'), /nuits notées Mal/);
});

test('v6 · Comprendre, phrase d\'accessibilité : la période est la clé du sélecteur, sans repli silencieux ; aucune promesse de toucher', async () => {
  const { phraseAria, GRAPHES } = await import('../../public/js/ui/graphes/comprendre.js');
  const lib = (id) => id;
  for (const periode of [undefined, null, '90', 'Tout', 'toString', { du: '2026-01-01', au: '2026-10-15' }, ['2026-01-01', '2026-10-15']]) {
    assert.throws(() => phraseAria('semaine', periode, lib, 'emotions'), /Période inconnue/, String(periode));
  }
  // Les zones de toucher n'ont pas de rôle : la phrase ne promet pas ce qu'un lecteur d'écran ne peut pas faire.
  for (const graphe of GRAPHES) assert.doesNotMatch(phraseAria(graphe, 'tout', lib), /[Tt]ouche/, graphe);
});

test('v6 · Comprendre, « Pourquoi ? » : une règle par graphique, tirée de SEUILS.comprendre, sans « undefined » ni libellé de liste', async () => {
  const { GRAPHES } = await import('../../public/js/ui/graphes/comprendre.js');
  const { REGLES_COMPRENDRE: R } = await import('../../public/js/analyse/textes.js');
  const { SEUILS } = await import('../../public/js/analyse/seuils.js');
  const { RACINE, lire, sansCommentaires } = await import('../aides/fichiers.js');
  const S = SEUILS.comprendre;
  // Chaque graphique (toutes les cartes PasAssez de l'écran en prennent un) a sa règle, et rien d'autre ; les colonnes à la
  // mesure « Émotions » (v7) ont la règle des émotions, celle du lieu à part.
  assert.deepEqual(Object.keys(R).sort(), [...GRAPHES, 'emotions', 'emotionsLieu'].sort());
  for (const [graphe, regle] of Object.entries(R)) {
    assert.equal(typeof regle, 'string', graphe);
    assert.match(regle, /^La règle : .+\.$/, graphe);
    assert.doesNotMatch(regle, /undefined|NaN|null|\[object/, graphe);
  }
  // Les nombres sont ceux de seuils.js.
  for (const g of ['explosionsAvant', 'explosionsApres', 'energieAvant', 'retoursBureau']) assert.match(R[g], new RegExp(`au moins ${S.minEvenements} `), g);
  for (const g of ['semaine', 'lieu', 'mois']) assert.match(R[g], new RegExp(`au moins ${S.minColonnes} .* au moins ${S.minValeurs} `), g);
  assert.match(R.activites, new RegExp(`${S.minActivite} relevés`));
  for (const g of ['emotions', 'emotionsLieu', 'apresNuit', 'autourExplosions', 'autourBienEtre', 'emotionsActivites']) assert.match(R[g], new RegExp(`au moins ${SEUILS.emotions.minReleves} émotions du moment`), g);
  // v8 · Mes nuits : sa fenêtre vient de SEUILS.comprendre ; Q18 nomme la liste « Ce que je faisais ».
  assert.match(R.mesNuits, new RegExp(`les ${S.nuitsSemaines} dernières semaines`));
  assert.match(R.emotionsActivites, /« Ce que je faisais »/);
  for (const g of ['autourExplosions', 'autourBienEtre']) assert.match(R[g], new RegExp(`les ${SEUILS.emotions.heuresAutour} heures`), g);
  // v7 · Autour du Bien-être : seules les séances lancées depuis Bien-être comptent, et la règle le dit.
  assert.match(R.autourBienEtre, /séance lancée depuis Bien-être/);
  // Aucun chiffre écrit à la main dans le bloc des règles : ils viennent tous de SEUILS.comprendre.
  const code = sansCommentaires(lire(`${RACINE}/public/js/analyse/textes.js`));
  const bloc = code.slice(code.indexOf('SEUILS.comprendre'), code.indexOf('export const PIED_EXPLOSIONS'));
  assert.ok(bloc.includes('REGLES_COMPRENDRE'), 'bloc des règles introuvable');
  assert.doesNotMatch(bloc, /\d/);
  // Pas de libellé de liste modifiable (« basse ») dans une règle : il peut être renommé dans Réglages › Listes.
  assert.doesNotMatch(R.energieAvant, /«/);
});

test('v8 · Comprendre, Mes nuits : une ligne par nuit notée, une barre longue comme ses heures à la teinte de sa qualité, aucune sans durée', async () => {
  const { geometrieMesNuits, DIM_MES_NUITS: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const nuits = [
    { date: '2026-10-01', heures: 6, qualite: 'sommeil:mal' },
    { date: '2026-10-02', heures: 12, qualite: 'sommeil:moyen' },
    { date: '2026-10-03', heures: null, qualite: 'sommeil:bien' },
    { date: '2026-10-05', heures: 4, qualite: null },
  ];
  const g = geometrieMesNuits(nuits);
  assert.equal(g.lignes.length, 4, 'une ligne par nuit notée, rien pour le 04');
  assert.deepEqual(g.lignes.map((l) => l.date), nuits.map((n) => n.date));
  assert.deepEqual(g.lignes.map((l) => l.barre && l.barre.classe), ['sommeil-1', 'sommeil-2', null, 'creuse']);
  // L'axe va de 0 à 12 h : 12 h remplit la piste, 6 h la moitié, 4 h le tiers ; toutes les barres partent de 0 h.
  assert.equal(g.max, 12);
  assert.deepEqual(g.graduations.map((t) => t.texte), ['0 h', '4 h', '8 h', '12 h']);
  const piste = g.lignes[1].barre.l;
  assert.equal(r1(g.lignes[0].barre.l), r1(piste / 2));
  assert.equal(r1(g.lignes[3].barre.l), r1(piste / 3));
  assert.ok(g.lignes.every((l) => !l.barre || l.barre.x === d.barreX));
  assert.equal(g.graduations[0].x, d.barreX);
  assert.ok(g.lignes.every((l, i) => i === 0 || l.y > g.lignes[i - 1].y), 'de haut en bas, dans l\'ordre des jours');
  // Le texte, à droite, ne chevauche pas la piste.
  assert.ok(d.barreX + piste <= g.texteX - d.texteL);
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
  // Une nuit ancienne de 14 h : l'axe va jusqu'à 16 h, et rien ne sort du cadre.
  const longue = geometrieMesNuits([...nuits, { date: '2026-10-06', heures: 14, qualite: null }]);
  assert.equal(longue.max, 16);
  assert.deepEqual(longue.graduations.map((t) => t.texte), ['0 h', '4 h', '8 h', '12 h', '16 h']);
  assert.deepEqual(horsCadre(longue, d.largeur, longue.hauteur), []);
});

// ---------- v6 · repères de traitement (spec §3) ----------

const colonnesJour = (n, extra = () => ({})) => Array.from({ length: n }, (_, i) => jour(`2026-09-${String(i + 1).padStart(2, '0')}`, { humeur: 10, nuit: 'sommeil:bien', explosions: 1, autres: 1, aDonnee: true, emotions: ['roue:joie'], ...extra(i) }));
const repere = (i, etiquette, cle = `c${i}`) => ({ i, cle, numeros: [], etiquette });

test('v6 · repères : sans repère, la frise ne change pas d\'un trait', () => {
  const colonnes = colonnesJour(7);
  for (const d of [DIM_MES_JOURS, { ...DIM_MES_JOURS_PDF, largeur: 900 }]) {
    const sans = geometrieMesJours({ pas: 'jour', colonnes, avecHumeur: true, avecEnergie: true }, {}, d);
    assert.deepEqual(geometrieMesJours({ pas: 'jour', colonnes, avecHumeur: true, avecEnergie: true }, { reperes: [] }, d), sans);
    assert.deepEqual(sans.reperes, []);
  }
});

test('v6 · repères : un trait fin par repère au centre de sa colonne, son numéro dans une bande sous les noms de colonnes, tout dans le cadre', () => {
  const colonnes = colonnesJour(7, (i) => ({ energieBasse: i % 2 === 0 }));
  for (const d of [DIM_MES_JOURS, { ...DIM_MES_JOURS_PDF, largeur: 900 }]) {
    const f = { pas: 'jour', colonnes, avecHumeur: true, avecEnergie: true };
    const sans = geometrieMesJours(f, {}, d);
    const g = geometrieMesJours(f, { reperes: [repere(1, '①'), repere(6, '②–③')] }, d);
    const bande = g.dim.hauteur - sans.dim.hauteur;
    assert.ok(bande > 0, 'une bande s\'ajoute');
    // Toutes les rangées descendent d'autant ; la largeur ne change pas.
    assert.deepEqual(g.rangees.map((r) => r1(r.y - bande)), sans.rangees.map((r) => r.y));
    assert.equal(g.dim.largeur, sans.dim.largeur);
    assert.deepEqual(g.zones.map((z) => z.x), sans.zones.map((z) => z.x));
    assert.deepEqual(g.reperes.map((r) => [r.cle, r.etiquette]), [['c1', '①'], ['c6', '②–③']]);
    const premiere = g.rangees[0];
    const derniere = g.rangees.at(-1);
    for (const r of g.reperes) {
      const z = g.zones.find((zz) => zz.i === Number(r.cle.slice(1)));
      assert.equal(r.x, r1(z.x + z.l / 2));
      assert.ok(r.texteY > d.teteH - 4 && r.texteY < r.y1 && r.y1 < premiere.y, 'le numéro sous les noms de colonnes, au-dessus du trait et des rangées');
      assert.ok(r.y2 >= derniere.y + derniere.h - 0.1, 'le trait traverse toutes les rangées');
    }
    assert.deepEqual(horsCadre(g, g.dim.largeur, g.dim.hauteur), []);
  }
});

test('v6 · repères : deux numéros trop proches passent sur un second rang ; un numéro au bord reste dans le cadre', () => {
  const colonnes = colonnesJour(30);
  const loin = geometrieMesJours({ pas: 'jour', colonnes }, { reperes: [repere(3, '①'), repere(10, '②')] });
  assert.deepEqual(loin.reperes.map((r) => r.rang), [0, 0]);
  const proches = geometrieMesJours({ pas: 'jour', colonnes }, { reperes: [repere(10, '①'), repere(11, '②'), repere(12, '③'), repere(29, '④–⑤')] });
  assert.deepEqual(proches.reperes.map((r) => r.rang), [0, 1, 0, 0], 'le 11 descend, le 12 remonte');
  assert.ok(proches.dim.hauteur > loin.dim.hauteur, 'un second rang, une bande plus haute');
  assert.ok(proches.reperes[1].texteY > proches.reperes[0].texteY);
  assert.ok(proches.reperes[1].texteY < proches.rangees[0].y);
  const dernier = proches.reperes[3];
  assert.ok(dernier.texteX < dernier.x, 'le numéro du bord droit est ramené dans le cadre, son trait reste à sa date');
  assert.deepEqual(horsCadre(proches, proches.dim.largeur, proches.dim.hauteur), []);
  // Par mois sur la largeur de la page A4 : de la place, un seul rang.
  const mois = Array.from({ length: 12 }, (_, i) => ({ cle: `2026-${String(i + 1).padStart(2, '0')}`, humeur: 5, fragile: false, nuits: null, explosions: null, autres: 0, aDonnee: true }));
  const pdf = geometrieMesJours({ pas: 'mois', colonnes: mois, avecHumeur: true }, { reperes: mois.map((c, i) => repere(i, '⑦–⑨', c.cle)) }, { ...DIM_MES_JOURS_PDF, largeur: 900 });
  assert.ok(pdf.reperes.every((r) => r.rang === 0));
  assert.deepEqual(horsCadre(pdf, 900, pdf.dim.hauteur), []);
});
