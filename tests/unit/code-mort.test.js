import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

// v8 (Q32) : le code mort laissé par la v7 est retiré, et ne revient pas. Les phrases calculées restent refusées : leur
// moteur (stats.js au-delà de la moyenne et de la médiane) ne revient pas sans l'accord de l'utilisateur, git le garde.
const PUBLIC = join(RACINE, 'public');
const CSS = lister(join(PUBLIC, 'css'), (p) => p.endsWith('.css'));
const SOURCES = lister(PUBLIC, (p) => /\.(js|html)$/.test(p) && !p.includes('/vendor/')).map((f) => sansCommentaires(lire(f))).join('\n');

// Un mot entier du code (classe, identifiant, chaîne) : ni lettre, ni chiffre, ni tiret autour.
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const present = (mot) => new RegExp(`(^|[^\\w-])${echapper(mot)}($|[^\\w-])`).test(SOURCES);
// Les débuts de classes fabriquées dans le code : `teinte-${…}`, `emo-${…}`, `g-${…}`…
const PREFIXES = [...new Set([...SOURCES.matchAll(/([a-zA-Z][\w-]*-)\$\{/g)].map((m) => m[1]))];
// Une classe sert si elle est écrite telle quelle dans le code, ou fabriquée : un début connu suivi d'une fin qui sert
// elle-même (`g-` + `rampe-4`, où `rampe-${…}` est aussi fabriqué).
const sert = (classe) => present(classe)
  || PREFIXES.some((p) => classe.startsWith(p) && classe.length > p.length && sert(classe.slice(p.length)));

// Les classes des sélecteurs d'une feuille (ce qui précède chaque « { », hors règles @).
function classesDe(css) {
  const res = new Set();
  for (const m of sansCommentaires(css).matchAll(/([^{}]+)\{/g)) {
    const selecteur = m[1].trim();
    if (selecteur.startsWith('@')) continue;
    for (const c of selecteur.matchAll(/\.([a-zA-Z_][\w-]*)/g)) res.add(c[1]);
  }
  return res;
}

test('aucune classe CSS sans usage : chaque classe d\'une feuille est écrite ou fabriquée dans le code de l\'app', () => {
  const fautes = [];
  for (const f of CSS) for (const c of classesDe(lire(f))) if (!sert(c)) fautes.push(`${rel(f)} : .${c}`);
  assert.deepEqual(fautes, []);
});

test('le contrôle des classes repère bien une classe sans usage', () => {
  assert.equal(sert('aujourdhui'), true);
  assert.equal(sert('teinte-sommeil'), true, 'fabriquée : teinte-${…}');
  assert.equal(sert('g-rampe-4'), true, 'fabriquée deux fois : g-${…} puis rampe-${…}');
  assert.deepEqual([...classesDe('.a .b-c:hover, .d > .e { x: 1 } @media (x) { .f { y: .5 } }')], ['a', 'b-c', 'd', 'e', 'f']);
  for (const c of ['lien-ligne', 'lien-bouton', 'profil-journee', 'classe-inventee-sans-usage']) assert.equal(sert(c), false, c);
});

test('code mort retiré : oui-non.js, avantExplosions, et stats.js réduit à la moyenne et à la médiane', () => {
  assert.equal(existsSync(join(PUBLIC, 'js', 'ui', 'composants', 'oui-non.js')), false);
  assert.equal(present('avantExplosions'), false);
  for (const nom of ['wilson', 'newcombe', 'fisher', 'spearman', 'testPermutation', 'generateur', 'ecartType', 'quantile']) {
    assert.equal(new RegExp(`export (function|const) ${nom}\\b`).test(lire(join(PUBLIC, 'js', 'analyse', 'stats.js'))), false, nom);
  }
  // Aucun module de l'app n'est oublié dans un coin : chacun est importé par un autre (ou est le point d'entrée).
  const modules = lister(join(PUBLIC, 'js'), (p) => p.endsWith('.js') && !p.includes('/vendor/')).map((p) => rel(p).replace(/^public\/js\//, ''));
  const orphelins = modules.filter((m) => m !== 'main.js' && !new RegExp(`['"/]${echapper(m.split('/').pop())}['"]`).test(SOURCES));
  assert.deepEqual(orphelins, []);
});
