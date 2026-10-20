import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, basename } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

// v7 · Fondations 2b (B1) : les 39 icônes du lot entrent dans le module d'icônes, sans métadonnées, au trait de 2 ;
// s'y ajoutent « bien-etre » (une feuille) et « emotion ». Toute icône nommée dans l'app existe.
const MODULE = lire(join(RACINE, 'public', 'js', 'ui', 'icones.js'));
const TRACES = Object.fromEntries([...MODULE.matchAll(/^ {2}(\w+): '([^']+)',$/gm)].map((m) => [m[1], m[2]]));
const LOT = lister(join(RACINE, 'docs', 'design', 'retour-claude-design-v2', 'design_handoff_carnet_refonte', 'icons'), (p) => p.endsWith('.svg'));
// Clés plus anciennes que le lot, gardées pour ne pas renommer leurs usages.
const ANCIENNES = {
  'onglet-aujourdhui': 'aujourdhui', 'onglet-analyse': 'analyse', 'onglet-historique': 'historique', 'onglet-soins': 'soins',
  'onglet-reglages': 'reglages', 'points-positifs': 'positifs', 'notes-libres': 'note', 'moment-difficile': 'respiration',
  'en-consultation': 'bulle', 'chevron-droite': 'chevron', 'chevron-gauche': 'retour', 'memo-vocal': 'onde', dicter: 'micro',
};
const cle = (fichier) => ANCIENNES[fichier] || fichier.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const nombre = (x) => String(+Number(x).toFixed(3));

test('les 39 icônes du lot sont dans le module, avec leurs tracés', () => {
  assert.equal(LOT.length, 39);
  for (const f of LOT) {
    const nom = basename(f, '.svg');
    const d = TRACES[cle(nom)];
    assert.ok(d, `${nom} → ${cle(nom)}`);
    const svg = lire(f);
    for (const m of svg.matchAll(/<path d="([^"]+)"/g)) assert.ok(d.includes(m[1]), `${nom} : tracé ${m[1]}`);
    // Un cercle devient deux arcs de son rayon.
    for (const m of svg.matchAll(/<circle cx="[^"]+" cy="[^"]+" r="([^"]+)"/g)) {
      const r = nombre(m[1]);
      assert.ok(d.includes(`a${r} ${r} 0 1 0 ${nombre(2 * m[1])} 0`), `${nom} : cercle de rayon ${r}`);
    }
    assert.equal((svg.match(/<(path|circle|rect)\b/g) || []).length > 0, true);
  }
});

test('le module : au trait de 2 par défaut, sans métadonnées ni style ; « bien-etre » et « emotion » en plus', () => {
  assert.match(MODULE, /trait = 2,/);
  assert.ok(!/metadata|c2pa|style=/i.test(sansCommentaires(MODULE)));
  for (const n of ['bienEtre', 'emotion']) assert.match(TRACES[n] || '', /^M/, n);
  for (const d of Object.values(TRACES)) assert.match(d, /^M[\d.\s,MmLlHhVvCcSsQqTtAaZz-]+$/);
});

test('toute icône nommée dans l\'app existe dans le module', () => {
  const connues = new Set([...Object.keys(TRACES), 'stop']);
  const fautes = [];
  for (const f of lister(join(RACINE, 'public', 'js', 'ui'), (p) => p.endsWith('.js'))) {
    const code = sansCommentaires(lire(f));
    const noms = [...code.matchAll(/Icones\.(\w+)/g), ...code.matchAll(/\bicone[=:]\s*["'](\w+)["']/g)].map((m) => m[1]);
    for (const n of noms) if (!connues.has(n)) fautes.push(`${rel(f)} : ${n}`);
  }
  assert.deepEqual(fautes, []);
});
