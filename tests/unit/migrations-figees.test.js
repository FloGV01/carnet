import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATIONS } from '../../public/js/db/migrations.js';
import { SEED_V1 } from '../../public/js/domain/vocabulaire.js';
import { RACINE } from '../aides/fichiers.js';

const VERROU = join(RACINE, 'tests', 'unit', 'migrations.lock.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');

test('migrations publiées et SEED_V1 figés', () => {
  const actuel = { SEED_V1: sha(JSON.stringify(SEED_V1)) };
  for (const [v, f] of Object.entries(MIGRATIONS)) actuel[`MIGRATION_${v}`] = sha(f.toString());
  if (!existsSync(VERROU)) writeFileSync(VERROU, `${JSON.stringify(actuel, null, 2)}\n`);
  const fige = JSON.parse(readFileSync(VERROU, 'utf8'));
  for (const [cle, h] of Object.entries(fige)) assert.equal(actuel[cle], h, `${cle} a changé : une migration publiée ne se modifie pas`);
});
