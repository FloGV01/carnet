import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { RACINE, lister, rel, lire } from '../aides/fichiers.js';
import { EMPREINTES_PRIVEES } from '../aides/empreintes-privees.js';
import { normaliser } from '../aides/mots-interdits.js';

const empreinte = (m) => createHash('sha256').update(m).digest('hex');

test('aucun mot personnel dans public/, tests/fixtures/ et docs/', () => {
  const dossiers = ['public', 'tests/fixtures', 'docs'].map((d) => join(RACINE, d)).filter(existsSync);
  const fautes = [];
  for (const d of dossiers) {
    for (const f of lister(d, (p) => /\.(js|css|html|json|md|webmanifest|svg|txt)$/.test(p))) {
      const mots = new Set(normaliser(lire(f)).split(/[^a-z0-9]+/).filter((m) => m.length > 2));
      for (const m of mots) if (EMPREINTES_PRIVEES.has(empreinte(m))) fautes.push(`${rel(f)} (empreinte ${empreinte(m).slice(0, 8)})`);
    }
  }
  assert.deepEqual(fautes, []);
});
