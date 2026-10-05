import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SEED_V1, SEED_V2_AJOUTS, seedItems, normLabel } from '../../public/js/domain/vocabulaire.js';
import { NOMS_LISTES } from '../../public/js/domain/listes-def.js';
import { RACINE } from '../aides/fichiers.js';

const items = seedItems(SEED_V1, '2026-10-01T00:00:00.000Z');
const INSTANTANE = join(RACINE, 'tests', 'fixtures', 'ids-v1.json');

test('97 éléments, ids uniques et bien préfixés, 12 listes', () => {
  assert.equal(items.length, 97);
  assert.equal(new Set(items.map((i) => i.id)).size, 97);
  for (const it of items) assert.ok(it.id.startsWith(`${it.liste}:`), it.id);
  assert.deepEqual([...Object.keys(SEED_V1), ...Object.keys(SEED_V2_AJOUTS)].sort(), [...NOMS_LISTES].sort());
});

test('ajouts v4 : ids uniques, listes nouvelles, aucun recouvrement avec SEED_V1', () => {
  const v2 = seedItems(SEED_V2_AJOUTS, 'x');
  assert.equal(new Set(v2.map((i) => i.id)).size, v2.length);
  for (const liste of Object.keys(SEED_V2_AJOUTS)) assert.ok(!(liste in SEED_V1), liste);
  for (const it of v2) assert.match(it.id, /^[a-zA-Z]+:[a-z0-9_]+$/);
  assert.ok(v2.find((i) => i.id === 'typeExplosion:ne_sais_pas').horsClassement);
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
