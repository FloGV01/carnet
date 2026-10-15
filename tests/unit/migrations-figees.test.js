import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATIONS } from '../../public/js/db/migrations.js';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { RACINE } from '../aides/fichiers.js';

const VERROU = join(RACINE, 'tests', 'unit', 'migrations.lock.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');

// Tout ce qu'une migration publiée lit est figé : son code, les listes qu'elle verse et seedItems.
// Une nouvelle migration s'ajoute au verrou à la main (aucune empreinte n'est écrite d'office).
test('migrations publiées, SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS et seedItems figés', () => {
  const actuel = { SEED_V1: sha(JSON.stringify(SEED_V1)), SEED_V2_AJOUTS: sha(JSON.stringify(SEED_V2_AJOUTS)), SEED_V4_AJOUTS: sha(JSON.stringify(SEED_V4_AJOUTS)), SEED_ITEMS: sha(seedItems.toString()) };
  for (const [v, f] of Object.entries(MIGRATIONS)) actuel[`MIGRATION_${v}`] = sha(f.toString());
  if (process.env.FIGER_MIGRATIONS === '1') writeFileSync(VERROU, `${JSON.stringify(actuel, null, 2)}\n`);
  assert.ok(existsSync(VERROU), 'migrations.lock.json absent');
  const fige = JSON.parse(readFileSync(VERROU, 'utf8'));
  assert.deepEqual(Object.keys(fige).sort(), Object.keys(actuel).sort(), 'chaque migration et chaque liste versée a son empreinte');
  for (const [cle, h] of Object.entries(fige)) assert.equal(actuel[cle], h, `${cle} a changé : une migration publiée ne se modifie pas`);
});
