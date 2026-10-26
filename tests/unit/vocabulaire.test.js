import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, SEED_V6_AJOUTS, seedItems, normLabel } from '../../public/js/domain/vocabulaire.js';
import { LISTES, NOMS_LISTES } from '../../public/js/domain/listes-def.js';
import { RACINE } from '../aides/fichiers.js';

const items = seedItems(SEED_V1, '2026-10-01T00:00:00.000Z');
const INSTANTANE = join(RACINE, 'tests', 'fixtures', 'ids-v1.json');

test('97 éléments, ids uniques et bien préfixés, 12 listes', () => {
  assert.equal(items.length, 97);
  assert.equal(new Set(items.map((i) => i.id)).size, 97);
  for (const it of items) assert.ok(it.id.startsWith(`${it.liste}:`), it.id);
  assert.deepEqual([...Object.keys(SEED_V1), ...Object.keys(SEED_V2_AJOUTS), ...Object.keys(SEED_V4_AJOUTS), ...Object.keys(SEED_V6_AJOUTS)].sort(), [...NOMS_LISTES].sort());
});

test('ajouts v4 : ids uniques, listes nouvelles, aucun recouvrement avec SEED_V1', () => {
  const v2 = seedItems(SEED_V2_AJOUTS, 'x');
  assert.equal(new Set(v2.map((i) => i.id)).size, v2.length);
  for (const liste of Object.keys(SEED_V2_AJOUTS)) assert.ok(!(liste in SEED_V1), liste);
  for (const it of v2) assert.match(it.id, /^[a-zA-Z]+:[a-z0-9_]+$/);
  assert.ok(v2.find((i) => i.id === 'typeExplosion:ne_sais_pas').horsClassement);
});

// SEED_V4_AJOUTS (DB_VERSION 4, app v6) : instantané écrit en dur, comme les ids publiés, qui ne changent plus.
const IDS_V4 = [
  'pese:bruit', 'pese:lumiere', 'pese:monde', 'pese:changement', 'pese:attente', 'pese:demandes', 'pese:fatigue',
  'pese:masquer', 'pese:trajets', 'pese:demarches',
  'recharge:seul', 'recharge:calme', 'recharge:interet', 'recharge:bouger', 'recharge:dehors', 'recharge:stimmer',
  'recharge:musique', 'recharge:sieste',
  'activiteMoment:travail', 'activiteMoment:trajet', 'activiteMoment:courses', 'activiteMoment:maison',
  'activiteMoment:monde', 'activiteMoment:repos',
];

test('ajouts v6 : instantané des ids, aucun doublon, listes nouvelles', () => {
  const v4 = seedItems(SEED_V4_AJOUTS, 'x');
  assert.deepEqual(v4.map((i) => i.id), IDS_V4);
  assert.equal(new Set(v4.map((i) => i.id)).size, v4.length);
  for (const it of v4) assert.match(it.id, /^[a-zA-Z]+:[a-z0-9_]+$/);
  for (const liste of Object.keys(SEED_V4_AJOUTS)) assert.ok(!(liste in SEED_V1) && !(liste in SEED_V2_AJOUTS), liste);
  assert.ok(Object.isFrozen(SEED_V4_AJOUTS));
});

test('ajouts v6 : libellés, ordre, ni « Je ne sais pas » ni « Aucun » (un champ vide est une donnée valide)', () => {
  const v4 = seedItems(SEED_V4_AJOUTS, 'x');
  const lib = (id) => v4.find((i) => i.id === id).libelle;
  assert.equal(lib('pese:masquer'), 'Masquer (faire comme si)');
  assert.equal(lib('pese:demandes'), 'Trop de demandes');
  assert.equal(lib('recharge:dehors'), 'Dehors / nature');
  assert.equal(lib('activiteMoment:courses'), 'Courses / démarches');
  assert.equal(lib('activiteMoment:maison'), 'Chez moi');
  assert.deepEqual(v4.filter((i) => i.liste === 'recharge').map((i) => i.libelle),
    ['Être seul', 'Calme', 'Intérêt spécifique', 'Bouger', 'Dehors / nature', 'Stimmer', 'Musique', 'Sieste / repos']);
  assert.ok(v4.every((i) => !i.exclusif && !i.horsClassement && !i.agreable && i.origine === 'defaut'));
  // Les sept premiers de « Ce qui a pesé » reprennent mot pour mot ceux de « Ce qui était trop » (Après coup).
  const trop = seedItems(SEED_V2_AJOUTS, 'x').filter((i) => i.liste === 'sourceSurcharge').map((i) => i.libelle);
  assert.deepEqual(v4.filter((i) => i.liste === 'pese').slice(0, 7).map((i) => i.libelle), trop);
});

test('ajouts v6 : les trois listes sont modifiables (sans sens figé) et nommées pour l\'écran Listes', () => {
  assert.equal(LISTES.pese.libelle, 'Ce qui a pesé');
  assert.equal(LISTES.recharge.libelle, 'Ce qui a rechargé');
  assert.equal(LISTES.activiteMoment.libelle, 'Ce que je faisais');
  for (const nom of ['pese', 'recharge', 'activiteMoment']) assert.ok(!LISTES[nom].sensFixe, nom);
});

// SEED_V6_AJOUTS (DB_VERSION 6, app v8) : les sujets d'un rendez-vous (spec v8 §7, Q22), écrits en dur.
test('ajouts v8 : les sept sujets d\'un rendez-vous, dans l\'ordre, ids figés, une liste nouvelle et modifiable', () => {
  const v6 = seedItems(SEED_V6_AJOUTS, 'x');
  assert.deepEqual(v6.map((i) => i.id), ['sujetRdv:sommeil', 'sujetRdv:traitement', 'sujetRdv:explosions', 'sujetRdv:fatigue',
    'sujetRdv:travail', 'sujetRdv:emotions', 'sujetRdv:autre']);
  assert.deepEqual(v6.map((i) => i.libelle), ['Sommeil', 'Traitement', 'Explosions', 'Fatigue', 'Travail', 'Émotions', 'Autre chose']);
  assert.deepEqual(v6.map((i) => i.ordre), [10, 20, 30, 40, 50, 60, 70]);
  assert.ok(v6.every((i) => i.liste === 'sujetRdv' && !i.exclusif && !i.horsClassement && !i.agreable && !i.archive && i.origine === 'defaut'));
  assert.deepEqual(Object.keys(SEED_V6_AJOUTS), ['sujetRdv']);
  for (const seed of [SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS]) assert.ok(!('sujetRdv' in seed));
  assert.ok(Object.isFrozen(SEED_V6_AJOUTS));
  assert.equal(LISTES.sujetRdv.libelle, "Sujets d'un rendez-vous");
  assert.ok(!LISTES.sujetRdv.sensFixe, 'on peut ajouter, renommer, réordonner et archiver un sujet');
});

test('instantané des ids : SEED_V1 est figé', () => {
  const ids = items.map((i) => i.id);
  if (!existsSync(INSTANTANE)) writeFileSync(INSTANTANE, `${JSON.stringify(ids, null, 1)}\n`);
  assert.deepEqual(ids, JSON.parse(readFileSync(INSTANTANE, 'utf8')));
});

test('vocabulaire clinique non lissé', () => {
  const lib = (id) => items.find((i) => i.id === id).libelle;
  assert.equal(lib('declencheur:pris_pour_un_con'), 'Me sentir pris pour un con');
  assert.equal(lib('dessous:pas_vu_reconnu'), 'Ne pas être vu / reconnu');
  assert.equal(lib('declencheur:surcharge_sensorielle'), 'Surcharge sensorielle (bruit, monde)');
  assert.ok(items.find((i) => i.id === 'effetSecondaire:aucun').exclusif);
  assert.ok(items.find((i) => i.id === 'declencheur:rien_identifie').horsClassement);
});

test('normLabel ignore casse, accents, espaces autour de « / » et apostrophes', () => {
  assert.equal(normLabel('Vide/rien'), normLabel('Vide / rien'));
  assert.equal(normLabel("Rien d’identifié"), normLabel("rien d'identifie"));
  assert.equal(normLabel('  Imprévu   /   changement '), 'imprevu / changement');
});
