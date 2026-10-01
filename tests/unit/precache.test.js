import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE } from '../aides/fichiers.js';
import { calculer } from '../../scripts/precache.mjs';

test('sw.js et version.js sont à jour', () => {
  const sortie = execFileSync('node', [join(RACINE, 'scripts', 'precache.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(sortie, /à jour/);
});

test('le précache couvre index.html, le manifest, le vendor et les icônes, jamais sw.js', () => {
  const { liste } = calculer();
  for (const f of ['./', './index.html', './manifest.webmanifest', './vendor/preact-htm.js', './icons/apple-touch-icon.png', './js/main.js']) {
    assert.ok(liste.includes(f), f);
  }
  assert.ok(!liste.includes('./sw.js'));
  const sw = readFileSync(join(RACINE, 'public', 'sw.js'), 'utf8');
  assert.ok(!/skipWaiting\(\)\s*;?\s*\n\s*\}\);\s*\n\s*self\.addEventListener\('activate'/.test(sw), 'pas de skipWaiting à l\'installation');
});
