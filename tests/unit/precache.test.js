import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE } from '../aides/fichiers.js';
import { calculer } from '../../scripts/precache.mjs';

test('sw.js et version.js sont à jour', () => {
  const sortie = execFileSync('node', [join(RACINE, 'scripts', 'precache.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(sortie, /à jour/);
});

test('le précache couvre index.html, le manifest, le vendor et les icônes, jamais sw.js', () => {
  const { liste } = calculer();
  for (const f of ['./', './index.html', './manifest.webmanifest', './vendor/preact-htm.js', './icons/v11-apple-touch-icon.png', './js/main.js']) {
    assert.ok(liste.includes(f), f);
  }
  // v11 : l'icône prend un nouveau nom (spec §10), l'ancien ne revient pas dans le précache.
  assert.ok(!liste.includes('./icons/apple-touch-icon.png'), 'ancien nom de l\'icône');
  assert.ok(!liste.includes('./sw.js'));
  const sw = readFileSync(join(RACINE, 'public', 'sw.js'), 'utf8');
  assert.ok(!/skipWaiting\(\)\s*;?\s*\n\s*\}\);\s*\n\s*self\.addEventListener\('activate'/.test(sw), 'pas de skipWaiting à l\'installation');
});

// v11 (10/11) : chaque icône citée par le manifest et par index.html existe sur le disque, sous son nom v11 ; le fond bleu
// de l'ancienne icône a disparu du script et du dessin (sinon l'icône masquable garderait un cadre bleu, spec §10).
test('v11 : les icônes du manifest et d\'index.html existent ; plus de #3B4A6B dans icones.mjs ni icone.svg', () => {
  const pub = join(RACINE, 'public');
  const manifest = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8'));
  const srcs = manifest.icons.map((i) => i.src);
  assert.deepEqual(srcs, ['icons/v11-icone-192.png', 'icons/v11-icone-512.png', 'icons/v11-icone-maskable-512.png']);
  const index = readFileSync(join(pub, 'index.html'), 'utf8');
  const apple = [...index.matchAll(/<link rel="apple-touch-icon" href="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(apple, ['icons/v11-apple-touch-icon.png']);
  for (const f of [...srcs, ...apple]) assert.ok(existsSync(join(pub, f)), f);
  for (const f of [join(RACINE, 'scripts', 'icones.mjs'), join(pub, 'icons', 'icone.svg')]) {
    assert.ok(!/#3B4A6B/i.test(readFileSync(f, 'utf8')), f);
  }
  // Sans width ni height sur la racine du dessin : icones.mjs les pose, l'attribut serait en double.
  const racine = readFileSync(join(pub, 'icons', 'icone.svg'), 'utf8').match(/<svg[^>]*>/)[0];
  assert.match(racine, /viewBox="0 0 1024 1024"/);
  assert.ok(!/\s(width|height)=/.test(racine), racine);
});
