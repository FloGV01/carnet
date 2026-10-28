// v9 (1/8) · La carte de How We Feel (spec §6 et §7) : la place des 144 mots sur la grille 12 × 12 (domain/carte-roue.js),
// leur zone et l'énergie notée avec eux, et la place des mots à soi hors du carré. Une donnée pure et figée : seule
// l'énergie, déduite du rang au toucher du mot, est enregistrée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAMILLES, familleDe, motsDeLaRoue } from '../../public/js/domain/roue.js';
import { PLACEMENT, ZONES, zoneDeCase, zoneDe, energieDe, motsDeLaCarte } from '../../public/js/domain/carte-roue.js';

const lire = (chemin) => readFileSync(new URL(`../../${chemin}`, import.meta.url), 'utf8');
const ANNEXES = 'docs/superpowers/specs/2026-10-28-carnet-v9';
const PROPOSITION = JSON.parse(lire(`${ANNEXES}/carte-proposee.json`));
const HWF = JSON.parse(lire(`${ANNEXES}/liste-hwf.json`));
const IDS = motsDeLaRoue().map((m) => m.id);
// Les trois changements de la spec §6 sur la proposition : Insouciant à la case d'Ensommeillé, Fatigué et Épuisé sans famille.
const CHANGES = { 'roue:serenite:ensommeille': 'roue:serenite:insouciant', 'roue:tristesse:fatigue': 'roue:aucune:fatigue', 'roue:tristesse:epuise': 'roue:aucune:epuise' };
const bande = (rang) => (rang <= 4 ? 'energie:basse' : rang <= 8 ? 'energie:moyenne' : 'energie:haute');
const cle = ({ col, rang }) => `${col},${rang}`;

test('144 cases, une par mot de la roue, ni plus ni moins ; colonne et rang de 1 à 12 ; aucune case partagée', () => {
  assert.equal(IDS.length, 144);
  assert.deepEqual(Object.keys(PLACEMENT).sort(), [...IDS].sort());
  for (const id of IDS) {
    const { col, rang } = PLACEMENT[id];
    assert.ok(Number.isInteger(col) && col >= 1 && col <= 12, `${id} : colonne ${col}`);
    assert.ok(Number.isInteger(rang) && rang >= 1 && rang <= 12, `${id} : rang ${rang}`);
  }
  assert.equal(new Set(Object.values(PLACEMENT).map(cle)).size, 144, 'toutes différentes : la grille est pleine');
  assert.ok(Object.isFrozen(PLACEMENT) && Object.isFrozen(PLACEMENT['roue:colere:irrite']), 'figé');
});

test('la carte de la spec : carte-proposee.json, avec Insouciant, Fatigué et Épuisé de la spec §6 ; chaque mot à la case de son mot How We Feel', () => {
  const attendu = Object.fromEntries(PROPOSITION.mots.map((m) => [CHANGES[m.id] || m.id, { col: m.col, rang: m.rang }]));
  assert.deepEqual(PLACEMENT, attendu);
  // La grille officielle (liste-hwf.json : ligne 1 en haut, rang = 13 − ligne) : le mot How We Feel de chaque case est
  // celui que la proposition donne à ce mot (son équivalent, ou le mot écarté dont il prend la place).
  for (const m of PROPOSITION.mots) assert.equal(HWF.grille[12 - m.rang][m.col - 1], m.caseHwf, m.libelle);
  assert.equal(HWF.grille[12 - PLACEMENT['roue:serenite:insouciant'].rang][PLACEMENT['roue:serenite:insouciant'].col - 1], 'Carefree');
  // Quelques cases : les coins, Survolté sur « Hyper », Accablé sur « Overwhelmed ».
  assert.deepEqual(PLACEMENT['roue:colere:enrage'], { col: 1, rang: 12 });
  assert.deepEqual(PLACEMENT['roue:joie:extasie'], { col: 12, rang: 12 });
  assert.deepEqual(PLACEMENT['roue:peur:sans-valeur'], { col: 1, rang: 1 });
  assert.deepEqual(PLACEMENT['roue:serenite:serein'], { col: 12, rang: 1 });
  assert.deepEqual(PLACEMENT['roue:peur:survolte'], { col: 6, rang: 12 });
  assert.deepEqual(PLACEMENT['roue:peur:accable'], { col: 3, rang: 11 });
  assert.deepEqual(PLACEMENT['roue:serenite:insouciant'], { col: 7, rang: 1 });
});

test('zoneDeCase : rouge col 1-6 et rang 7-12, jaune col 7-12 et rang 7-12, bleu col 1-6 et rang 1-6, vert col 7-12 et rang 1-6', () => {
  assert.deepEqual(ZONES, ['rouge', 'jaune', 'bleu', 'vert']);
  assert.ok(Object.isFrozen(ZONES));
  assert.equal(zoneDeCase(1, 12), 'rouge');
  assert.equal(zoneDeCase(6, 7), 'rouge');
  assert.equal(zoneDeCase(7, 7), 'jaune');
  assert.equal(zoneDeCase(12, 12), 'jaune');
  assert.equal(zoneDeCase(6, 6), 'bleu');
  assert.equal(zoneDeCase(1, 1), 'bleu');
  assert.equal(zoneDeCase(7, 6), 'vert');
  assert.equal(zoneDeCase(12, 1), 'vert');
  for (const [col, rang] of [[0, 5], [13, 5], [5, 0], [5, 13], [-1, 12], [1.5, 3], ['1', 3], [null, 3], [undefined, undefined]]) {
    assert.equal(zoneDeCase(col, rang), null, `${col}, ${rang}`);
  }
});

test('36 mots par zone ; un seul mot de la roue change de zone depuis la v8 : Accablé, du bleu au rouge', () => {
  const comptes = Object.fromEntries(ZONES.map((z) => [z, IDS.filter((id) => zoneDe(id) === z).length]));
  assert.deepEqual(comptes, { rouge: 36, jaune: 36, bleu: 36, vert: 36 });
  assert.equal(zoneDe('roue:peur:accable'), 'rouge');
  // La place des 79 mots en v8 : le tableau §9.3 de l'annexe v8 (hwf-placement.md), sauf Dégoût et Perplexe, ramenés dans
  // le quadrant de How We Feel (décision v8). Le quadrant (col 1-3 à gauche ; rang 4-6 en haut) donne la zone de la v8.
  const PAR_NOM = new Map(FAMILLES.flatMap((f) => f.mots.map((m) => [`${m.libelle}|${f.libelle}`, m.id])));
  const annexe = Object.fromEntries(lire('docs/superpowers/specs/2026-10-24-carnet-v8/hwf-placement.md').split('\n')
    .filter((l) => l.startsWith('| ')).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))
    .filter((c) => /^\d+$/.test(c[0]) && PAR_NOM.has(`${c[1]}|${c[2]}`))
    .map(([, mot, famille, col, rang]) => [PAR_NOM.get(`${mot}|${famille}`), { col: Number(col), rang: Number(rang) }]));
  Object.assign(annexe, { 'roue:degout:degout': { col: 1, rang: 3 }, 'roue:surprise:perplexe': { col: 3, rang: 4 } });
  assert.equal(Object.keys(annexe).length, 79);
  const zoneV8 = ({ col, rang }) => (rang >= 4 ? (col <= 3 ? 'rouge' : 'jaune') : (col <= 3 ? 'bleu' : 'vert'));
  const changes = Object.entries(annexe).filter(([id, p]) => zoneV8(p) !== zoneDe(id)).map(([id, p]) => [id, zoneV8(p), zoneDe(id)]);
  assert.deepEqual(changes, [['roue:peur:accable', 'bleu', 'rouge']]);
});

test('zoneDe et energieDe : un mot de chaque zone et de chaque bande ; l\'énergie suit le rang (1-4 basse, 5-8 moyenne, 9-12 haute)', () => {
  const cas = [
    ['roue:colere:enrage', 'rouge', 'energie:haute'], ['roue:peur:preoccupe', 'rouge', 'energie:moyenne'],
    ['roue:joie:extasie', 'jaune', 'energie:haute'], ['roue:joie:confiant', 'jaune', 'energie:moyenne'],
    ['roue:colere:mecontent', 'bleu', 'energie:moyenne'], ['roue:tristesse:vide', 'bleu', 'energie:basse'],
    ['roue:serenite:calme', 'vert', 'energie:moyenne'], ['roue:serenite:serein', 'vert', 'energie:basse'],
    // Les bords des bandes : rang 4, 5, 8 et 9.
    ['roue:tristesse:triste', 'bleu', 'energie:basse'], ['roue:aucune:fatigue', 'bleu', 'energie:moyenne'],
    ['roue:peur:tendu', 'rouge', 'energie:moyenne'], ['roue:joie:optimiste', 'jaune', 'energie:haute'],
    // Sans famille, mais avec une zone.
    ['roue:aucune:epuise', 'bleu', 'energie:basse'],
  ];
  for (const [id, zone, energie] of cas) {
    assert.equal(zoneDe(id), zone, id);
    assert.equal(energieDe(id), energie, id);
  }
  assert.equal(familleDe('roue:aucune:fatigue'), null);
  for (const id of IDS) {
    assert.equal(zoneDe(id), zoneDeCase(PLACEMENT[id].col, PLACEMENT[id].rang), id);
    assert.equal(energieDe(id), bande(PLACEMENT[id].rang), id);
  }
  // Une famille seule (relevé de la v7), un id inconnu ou mal formé : ni zone ni énergie.
  for (const id of ['roue:colere', 'roue:colere:inconnu', 'roue:aucune', 'emotion:colere', '', null, undefined, 3, 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.equal(zoneDe(id), null, String(id));
    assert.equal(energieDe(id), null, String(id));
  }
});

// Trois mots à soi : deux rouges, un vert, et un rouge mis de côté. Plus un mot sans zone (recréé à l'import, spec v9 §9).
const PERSO = Object.freeze({
  'roue:perso:u-aaaaaaa1': { libelle: 'Électrique', zone: 'rouge', famille: 'peur', definition: null, archive: false, createdAt: '2026-11-02T10:00:00.000Z' },
  'roue:perso:u-aaaaaaa2': { libelle: 'Débordé', zone: 'rouge', famille: null, definition: 'Plus de place pour rien.', archive: false, createdAt: '2026-11-01T10:00:00.000Z' },
  'roue:perso:u-aaaaaaa3': { libelle: 'Au chaud', zone: 'vert', famille: 'serenite', definition: null, archive: false, createdAt: '2026-11-03T10:00:00.000Z' },
  'roue:perso:u-aaaaaaa4': { libelle: 'Mis de côté', zone: 'rouge', famille: null, definition: null, archive: true, createdAt: '2026-10-30T10:00:00.000Z' },
  'roue:perso:u-aaaaaaa5': { libelle: 'Mot sans libellé', zone: null, famille: null, definition: null, archive: true, createdAt: '2026-10-29T10:00:00.000Z' },
});

test('mots à soi : la zone de la méta ; l\'énergie haute en rouge et en jaune, basse en bleu et en vert ; rien sans zone', () => {
  assert.equal(zoneDe('roue:perso:u-aaaaaaa1', PERSO), 'rouge');
  assert.equal(energieDe('roue:perso:u-aaaaaaa1', PERSO), 'energie:haute');
  assert.equal(zoneDe('roue:perso:u-aaaaaaa3', PERSO), 'vert');
  assert.equal(energieDe('roue:perso:u-aaaaaaa3', PERSO), 'energie:basse');
  // Mis de côté : la zone et l'énergie restent lisibles.
  assert.equal(zoneDe('roue:perso:u-aaaaaaa4', PERSO), 'rouge');
  assert.equal(energieDe('roue:perso:u-aaaaaaa4', PERSO), 'energie:haute');
  const jaune = { 'roue:perso:u-bbbbbbb1': { libelle: 'Pétillant', zone: 'jaune' }, 'roue:perso:u-bbbbbbb2': { libelle: 'Lourd', zone: 'bleu' } };
  assert.equal(energieDe('roue:perso:u-bbbbbbb1', jaune), 'energie:haute');
  assert.equal(energieDe('roue:perso:u-bbbbbbb2', jaune), 'energie:basse');
  // Sans zone, une zone inconnue, sans méta.
  assert.equal(zoneDe('roue:perso:u-aaaaaaa5', PERSO), null);
  assert.equal(energieDe('roue:perso:u-aaaaaaa5', PERSO), null);
  assert.equal(zoneDe('roue:perso:u-ccccccc1', { 'roue:perso:u-ccccccc1': { libelle: 'Orange', zone: 'orange' } }), null);
  assert.equal(zoneDe('roue:perso:u-aaaaaaa1'), null);
  assert.equal(energieDe('roue:perso:u-aaaaaaa1', null), null);
  // La méta ne déplace jamais un mot de la roue.
  assert.equal(zoneDe('roue:peur:accable', { 'roue:peur:accable': { libelle: 'Accablé', zone: 'bleu' } }), 'rouge');
});

test('motsDeLaCarte : les 144 dans l\'ordre de lecture, puis les mots à soi actifs, hors du carré, du côté extérieur de leur zone', () => {
  const sans = motsDeLaCarte();
  assert.equal(sans.length, 144);
  assert.deepEqual(motsDeLaCarte(null), sans);
  assert.deepEqual(motsDeLaCarte({}), sans);
  // De haut en bas, de gauche à droite ; chaque mot avec son libellé, sa case et sa zone.
  assert.deepEqual(sans.slice(0, 2), [
    { id: 'roue:colere:enrage', libelle: 'Enragé', col: 1, rang: 12, zone: 'rouge', perso: false },
    { id: 'roue:peur:terrifie', libelle: 'Terrifié', col: 2, rang: 12, zone: 'rouge', perso: false }]);
  assert.deepEqual(sans[143], { id: 'roue:serenite:serein', libelle: 'Serein', col: 12, rang: 1, zone: 'vert', perso: false });
  assert.deepEqual(sans.map((m) => [m.rang, m.col]), Array.from({ length: 144 }, (_, i) => [12 - Math.floor(i / 12), (i % 12) + 1]));
  for (const m of sans) assert.deepEqual([m.col, m.rang, m.zone], [PLACEMENT[m.id].col, PLACEMENT[m.id].rang, zoneDe(m.id)], m.id);

  // Deux rouges (dans l'ordre de création), un vert ; le mot mis de côté et le mot sans zone n'y sont pas.
  const avec = motsDeLaCarte(PERSO);
  assert.deepEqual(avec.slice(0, 144), sans);
  assert.deepEqual(avec.slice(144), [
    { id: 'roue:perso:u-aaaaaaa2', libelle: 'Débordé', col: 0, rang: 12, zone: 'rouge', perso: true },
    { id: 'roue:perso:u-aaaaaaa1', libelle: 'Électrique', col: 0, rang: 11, zone: 'rouge', perso: true },
    { id: 'roue:perso:u-aaaaaaa3', libelle: 'Au chaud', col: 13, rang: 1, zone: 'vert', perso: true },
  ]);
  assert.equal(new Set(avec.map(cle)).size, avec.length, 'aucune case partagée');
});

test('motsDeLaCarte : beaucoup de mots à soi, colonne par colonne vers l\'extérieur, du bord d\'énergie extérieur ; jamais sur un autre mot', () => {
  const perso = {};
  const CHIFFRE = { rouge: 'a', jaune: 'b', bleu: 'c', vert: 'd' };
  const ajouter = (zone, n) => {
    for (let i = 0; i < n; i++) {
      const id = `roue:perso:u-${CHIFFRE[zone].repeat(4)}${String(i).padStart(4, '0')}`;
      perso[id] = { libelle: `${zone} ${i}`, zone, famille: null, definition: null, archive: false, createdAt: `2026-11-01T10:${String(i).padStart(2, '0')}:00.000Z` };
    }
  };
  ajouter('rouge', 7);
  ajouter('jaune', 6);
  ajouter('bleu', 8);
  ajouter('vert', 1);
  const carte = motsDeLaCarte(perso);
  assert.equal(carte.length, 144 + 22);
  const places = (zone) => carte.filter((m) => m.perso && m.zone === zone).map((m) => [m.col, m.rang]);
  assert.deepEqual(places('rouge'), [[0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [-1, 12]]);
  assert.deepEqual(places('jaune'), [[13, 12], [13, 11], [13, 10], [13, 9], [13, 8], [13, 7]]);
  assert.deepEqual(places('bleu'), [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [-1, 1], [-1, 2]]);
  assert.deepEqual(places('vert'), [[13, 1]]);
  assert.equal(new Set(carte.map(cle)).size, carte.length, 'aucune case partagée');
  // Chaque mot à soi reste à hauteur de sa zone, du bon côté, hors du carré.
  for (const m of carte.filter((x) => x.perso)) {
    assert.ok(m.col < 1 || m.col > 12, m.libelle);
    assert.equal(m.col < 1, m.zone === 'rouge' || m.zone === 'bleu', m.libelle);
    assert.equal(m.rang >= 7, m.zone === 'rouge' || m.zone === 'jaune', m.libelle);
  }
});
