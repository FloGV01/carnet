import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

const PUBLIC = join(RACINE, 'public');
const js = lister(join(PUBLIC, 'js'), (p) => p.endsWith('.js'));
const PURS = ['public/js/domain/', 'public/js/analyse/', 'public/js/db/', 'public/js/export/', 'public/js/plateforme/'];

test('seul ui/ (et les points d\'entrée) importe ui/ ou vendor/', () => {
  for (const f of js) {
    const r = rel(f);
    if (r.startsWith('public/js/ui/') || r === 'public/js/app.js' || r === 'public/js/main.js') continue;
    const imports = [...lire(f).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const i of imports) assert.ok(!/\/ui\/|vendor\//.test(i), `${r} importe ${i}`);
  }
});

test('les modules purs n\'utilisent ni document ni window', () => {
  for (const f of js) {
    const r = rel(f);
    if (!PURS.some((p) => r.startsWith(p)) || r.startsWith('public/js/plateforme/')) continue;
    const code = sansCommentaires(lire(f));
    assert.ok(!/\b(document|window|localStorage)\b/.test(code), `${r} touche au DOM`);
  }
});

test('aucune URL http(s) dans public/ (hors espace de noms SVG)', () => {
  for (const f of lister(PUBLIC, (p) => /\.(js|css|html|webmanifest|svg)$/.test(p))) {
    const urls = (lire(f).match(/https?:\/\/[^\s'"`)]+/g) || []).filter((u) => !u.startsWith('http://www.w3.org/'));
    assert.deepEqual(urls, [], rel(f));
  }
});

test('aucun script ni style en ligne dans index.html', () => {
  const html = lire(join(PUBLIC, 'index.html'));
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'script en ligne');
  assert.ok(!/<style\b/.test(html) && !/\sstyle=/.test(html), 'style en ligne');
  assert.ok(!/\son[a-z]+=/.test(html), 'gestionnaire en ligne');
});

test('pas de toISOString().slice(0, 10) pour fabriquer une date du jour', () => {
  for (const f of js) assert.ok(!/toISOString\(\)\s*\.\s*(slice|substring|substr)\(\s*0\s*,\s*10\s*\)/.test(lire(f)), rel(f));
});

test('pas d\'eval ni de new Function dans le code de l\'app', () => {
  for (const f of js) assert.ok(!/\beval\(|new Function\(/.test(sansCommentaires(lire(f))), rel(f));
});
