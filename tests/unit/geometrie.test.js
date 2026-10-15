import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometrieFrise, geometrieJournee, DIM_FRISE, CRENEAUX } from '../../public/js/ui/graphes/geometrie.js';

const jour = (cle, extra = {}) => ({ cle, humeur: null, moyenne7: null, nuit: null, explosions: null, autres: 0, aDonnee: false, ...extra });

test('frise par jour : y(10) au bord haut, colonne vide sans rien, trait de moyenne seulement entre jours voisins', () => {
  const colonnes = [
    jour('2026-10-01', { humeur: 10, moyenne7: 6, nuit: 'sommeil:mal', explosions: 2, aDonnee: true }),
    jour('2026-10-02'),
    jour('2026-10-03', { humeur: 1, moyenne7: 5, explosions: 0, autres: 1, aDonnee: true }),
    jour('2026-10-04', { humeur: 4, moyenne7: 5.5, aDonnee: true }),
  ];
  const g = geometrieFrise({ pas: 'jour', colonnes });
  assert.equal(g.points[0].y, DIM_FRISE.haut);
  assert.equal(g.points[1].y, DIM_FRISE.basHumeur);
  assert.equal(g.moyenne.length, 1, 'seulement entre le 3 et le 4');
  assert.equal(g.encoches.length, 1, 'zéro explosion ne dessine rien');
  assert.equal(g.nuits.length, 1);
  assert.equal(g.autres.length, 1);
  assert.deepEqual(g.zones.map((z) => z.cle), ['2026-10-01', '2026-10-03', '2026-10-04'], 'rien à toucher sur un jour vide');
  assert.ok(!JSON.stringify(g).includes('NaN'));
});

test('v6 · frise par jour : un trait du plus bas au plus haut, seulement là où il y a un écart', () => {
  const colonnes = [
    jour('2026-10-01', { humeur: 5.5, humeurMin: 3, humeurMax: 8, aDonnee: true }),
    jour('2026-10-02', { humeur: 6, humeurMin: null, humeurMax: null, aDonnee: true }),
    jour('2026-10-03'),
    jour('2026-10-04', { humeur: 5, humeurMin: 5, humeurMax: 5, aDonnee: true }),
  ];
  const g = geometrieFrise({ pas: 'jour', colonnes });
  assert.equal(g.traits.length, 1, 'ni le soir, ni un jour vide, ni des relevés tous égaux');
  const [t] = g.traits;
  assert.equal(t.x, g.points[0].x);
  const y = (v) => Math.round((DIM_FRISE.haut + ((10 - v) / 9) * (DIM_FRISE.basHumeur - DIM_FRISE.haut)) * 10) / 10;
  assert.deepEqual(t, { x: g.points[0].x, y1: y(8), y2: y(3) });
  assert.ok(t.y1 < g.points[0].y && g.points[0].y < t.y2, 'le point est sur le trait');
  assert.deepEqual(geometrieFrise({ pas: 'semaine', colonnes: [{ cle: '2026-09-28', humeur: 5, humeurMin: 2, humeurMax: 9, fragile: false, nuits: null, explosions: null, autres: 0, aDonnee: true }] }).traits, [],
    'par semaine ou par mois, la moyenne seule');
});

test('frise par semaine : nuits empilées, anneau si fragile, explosions à l\'échelle', () => {
  const colonnes = [
    { cle: '2026-09-21', humeur: 5, fragile: true, nuits: { mal: 1, moyen: 0, bien: 2 }, explosions: 3, autres: 0, aDonnee: true },
    { cle: '2026-09-28', humeur: 6, fragile: false, nuits: null, explosions: 1, autres: 2, aDonnee: true },
  ];
  const g = geometrieFrise({ pas: 'semaine', colonnes });
  assert.equal(g.points[0].plein, false);
  assert.equal(g.nuits.length, 2);
  assert.ok(g.encoches[0].h > g.encoches[1].h);
  assert.equal(g.moyenne.length, 1);
});

test('ta journée : 12 créneaux de 4 h à 4 h, points sans segments, énergie empilée', () => {
  assert.deepEqual(CRENEAUX.slice(0, 2), [4, 6]);
  assert.equal(CRENEAUX[CRENEAUX.length - 1], 2);
  const g = geometrieJournee([{ debut: 10, fin: 12, moyenne: 6, fragile: false, energie: { 'energie:basse': 2, 'energie:moyenne': 1, 'energie:haute': 0 } }, { debut: 0, fin: 2, moyenne: null, energie: { 'energie:basse': 1 } }]);
  assert.equal(g.points.length, 1, 'créneau sans humeur : pas de point');
  assert.equal(g.energies.length, 3);
  assert.ok(g.zones[1].x > g.zones[0].x, 'minuit après la soirée');
  assert.ok(!('segments' in g));
});

test('v6 · Mes jours, détail d\'une colonne : l\'humeur, avec une décimale, et son écart', async () => {
  const { detailColonne } = await import('../../public/js/ui/graphes/graphes.js');
  const lib = (id) => id;
  assert.deepEqual(detailColonne('jour', { humeur: 17 / 3, humeurMin: 3, humeurMax: 8, entree: {} }, lib), ['humeur 5,7 (de 3 à 8)']);
  assert.deepEqual(detailColonne('jour', { humeur: 6, humeurMin: null, humeurMax: null, entree: {} }, lib), ['humeur 6']);
  assert.deepEqual(detailColonne('semaine', { humeur: 5.64, fragile: false }, lib), ['humeur 5,6 en moyenne']);
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

const colH = (cle, n, moyenne, min, max) => ({ cle, n, moyenne: n ? moyenne : null, min: n ? min : null, max: n ? max : null, fragile: n < 3 });
const colB = (cle, oui, n) => ({ cle, n, oui: n ? oui : 0, part: n ? oui / n : null, fragile: n < 3, libelle: n ? `${oui} jour${oui > 1 ? 's' : ''}` : null });

test('v6 · Comprendre, colonnes d\'humeur : point à la moyenne sur l\'axe 1 à 10, trait du plus bas au plus haut, anneau sous 3 valeurs, rien sans valeur', async () => {
  const { geometrieColonnes, DIM_COLONNES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const colonnes = [colH(0, 5, 10, 10, 10), colH(1, 2, 5.5, 3, 8), colH(2, 0), colH(3, 4, 1, 1, 1), colH(4, 3, 6, 4, 8), colH(5, 0), colH(6, 0)];
  const g = geometrieColonnes({ pas: 'semaine', mesure: 'humeur', colonnes });
  const y = (v) => r1(d.haut + ((10 - v) / 9) * (d.bas - d.haut));
  assert.deepEqual(g.points.map((p) => p.cle), [0, 1, 3, 4], 'une colonne sans valeur ne dessine rien');
  assert.deepEqual([g.points[0].y, g.points[2].y], [d.haut, d.bas]);
  assert.deepEqual(g.points.map((p) => p.plein), [true, false, true, true], 'anneau creux sous 3 valeurs');
  assert.deepEqual(g.traits, [{ x: g.points[1].x, y1: y(8), y2: y(3), cle: 1 }, { x: g.points[3].x, y1: y(8), y2: y(4), cle: 4 }]);
  assert.deepEqual(g.filets.map((f) => [f.v, f.y]), [[4, y(4)], [7, y(7)]]);
  assert.deepEqual(g.graduations.map((t) => t.v), [1, 4, 7, 10]);
  assert.deepEqual([g.barres, g.comptes], [[], []]);
  assert.deepEqual(g.etiquettes.map((e) => e.cle), [0, 1, 2, 3, 4, 5, 6], 'les sept jours sur l\'axe');
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
});

test('v6 · Comprendre, colonnes des autres mesures : barre haute de oui / n, compte au-dessus, creuse sous 3 valeurs, rien sans valeur', async () => {
  const { geometrieColonnes, DIM_COLONNES: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const colonnes = [colB(0, 3, 10), colB(1, 0, 4), colB(2, 0, 0), colB(3, 2, 2), colB(4, 10, 10), colB(5, 1, 5), colB(6, 0, 0)];
  const g = geometrieColonnes({ pas: 'semaine', mesure: 'nuitMal', colonnes });
  assert.deepEqual(g.points, []);
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
  const g = geometrieColonnes({ pas: 'lieu', mesure: 'humeur', colonnes: lieux.map((cle, i) => colH(cle, i + 1, 5, 4, 6)) });
  assert.equal(g.etiquettes.length, 6);
  assert.equal(new Set(g.etiquettes.map((e) => e.y)).size, 2, 'deux rangs');
  assert.ok(g.hauteur > d.hauteur);
  assert.deepEqual(horsCadre(g, d.largeur, g.hauteur), []);
  const g4 = geometrieColonnes({ pas: 'lieu', mesure: 'humeur', colonnes: lieux.slice(0, 4).map((cle) => colH(cle, 3, 5, 4, 6)) });
  assert.equal(new Set(g4.etiquettes.map((e) => e.y)).size, 1, 'un seul rang quand « Congé / repos » a la place');
  assert.equal(g4.hauteur, d.hauteur);
});

const nuit = (cle, n, coucher, lever) => ({ cle, n, fragile: n < 3, coucher: n ? coucher : null, lever: n ? lever : null });

test('v6 · Comprendre, nuits : axe de 20 h en haut à 12 h en bas, trait plein à 3 nuits, pointillé à 1 ou 2, absent sans nuit', async () => {
  const { geometrieNuits, DIM_NUITS: d } = await import('../../public/js/ui/graphes/geometrie.js');
  const colonnes = [nuit(0, 5, 1380, 1860), nuit(1, 2, 1440, 1920), nuit(2, 0), nuit(3, 3, 1200, 2160), nuit(4, 1, 1530, 1950), nuit(5, 0), nuit(6, 4, 1410, 1890)];
  const g = geometrieNuits(colonnes);
  const y = (m) => r1(d.haut + ((m - 1200) / 960) * (d.bas - d.haut));
  assert.deepEqual(g.graduations.map((t) => [t.texte, t.y]), [['20 h', d.haut], ['0 h', y(1440)], ['4 h', y(1680)], ['8 h', y(1920)], ['12 h', d.bas]]);
  assert.deepEqual(g.traits.map((t) => t.cle), [0, 1, 3, 4, 6], 'absent sans nuit');
  assert.deepEqual(g.traits.map((t) => t.plein), [true, false, true, false, true]);
  assert.deepEqual([g.traits[0].y1, g.traits[0].y2], [y(1380), y(1860)], 'du coucher (en haut) au lever (en bas)');
  assert.deepEqual([g.traits[2].y1, g.traits[2].y2, g.traits[2].horsAxe], [d.haut, d.bas, false], 'sur les bords, pas hors de l\'axe');
  assert.deepEqual(g.marques, []);
  assert.deepEqual(g.etiquettes.map((e) => e.cle), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(horsCadre(g, d.largeur, d.hauteur), []);
});

test('v6 · Comprendre, nuits : une médiane hors de l\'axe est ramenée au bord, avec horsAxe et une marque', async () => {
  const { geometrieNuits, DIM_NUITS: d } = await import('../../public/js/ui/graphes/geometrie.js');
  // Coucher à 18:30 (avant 20 h), lever à 13:30 (après 12 h), et les deux à la fois.
  const colonnes = [nuit(0, 4, 1110, 1860), nuit(1, 3, 1380, 2250), nuit(2, 1, 900, 2400), nuit(3, 0), nuit(4, 0), nuit(5, 0), nuit(6, 0)];
  const g = geometrieNuits(colonnes);
  assert.deepEqual(g.traits.map((t) => [t.cle, t.horsAxe]), [[0, true], [1, true], [2, true]]);
  assert.equal(g.traits[0].y1, d.haut);
  assert.equal(g.traits[1].y2, d.bas);
  assert.deepEqual([g.traits[2].y1, g.traits[2].y2], [d.haut, d.bas]);
  assert.deepEqual(g.marques.map((m) => [m.cle, m.sens]), [[0, 'haut'], [1, 'bas'], [2, 'haut'], [2, 'bas']]);
  for (const m of g.marques) {
    assert.equal(m.x, g.traits.find((t) => t.cle === m.cle).x);
    assert.ok(m.sens === 'haut' ? m.yPointe < m.yBase && m.yBase <= d.haut : m.yPointe > m.yBase && m.yBase >= d.bas, 'la marque pointe hors de l\'axe');
  }
  assert.deepEqual(horsCadre(g, d.largeur, d.hauteur), []);
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
  assert.deepEqual(GRAPHES, ['explosionsAvant', 'explosionsApres', 'energieAvant', 'retoursBureau', 'semaine', 'lieu', 'mois', 'nuits', 'activites', 'peseRecharge']);
  const phrases = new Set();
  for (const graphe of GRAPHES) {
    for (const mesure of ['humeur', 'nuitMal', 'explosion', 'energieBasse']) {
      const p3 = phraseAria(graphe, '3mois', lib, mesure);
      const pt = phraseAria(graphe, 'tout', lib, mesure);
      for (const p of [p3, pt]) {
        assert.ok(!/\d|%/.test(p), `aucun chiffre : ${p}`);
        assert.match(p, /« Voir en tableau »\.$/);
        phrases.add(p);
      }
      assert.match(p3, /sur les trois derniers mois/);
      assert.match(pt, /sur tout ce que tu as noté/);
    }
  }
  // Les colonnes disent leur mesure ; les autres graphiques n'en ont pas.
  assert.equal(phrases.size, 2 * (7 + 3 * 4));
  assert.match(phraseAria('semaine', 'tout', lib, 'nuitMal'), /nuits notées Mal/);
});
