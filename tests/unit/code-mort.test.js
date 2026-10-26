import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

// v8 (Q32) : le code mort laissé par la v7 est retiré, et ne revient pas. Les phrases calculées restent refusées : leur
// moteur (stats.js au-delà de la moyenne et de la médiane) ne revient pas sans l'accord de l'utilisateur, git le garde.
const PUBLIC = join(RACINE, 'public');
const CSS = lister(join(PUBLIC, 'css'), (p) => p.endsWith('.css'));
const SOURCES = lister(PUBLIC, (p) => /\.(js|html)$/.test(p) && !p.includes('/vendor/')).map((f) => sansCommentaires(lire(f))).join('\n');
const MODULES = new Map(lister(join(PUBLIC, 'js'), (p) => p.endsWith('.js') && !p.includes('/vendor/')).map((f) => [f, sansCommentaires(lire(f))]));

// Un mot entier du code (classe, identifiant, chaîne) : ni lettre, ni chiffre, ni tiret autour.
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const present = (mot) => new RegExp(`(^|[^\\w-])${echapper(mot)}($|[^\\w-])`).test(SOURCES);
// Les débuts de classes fabriquées dans le code : `teinte-${…}`, `emo-${…}`, `g-${…}`…, relevés seulement là où le code
// écrit une classe (relecture v8) : l'attribut class=${…}, ou ce qu'il donne à un nom qui dit « classe » (classe:,
// classeEcran =, classeCercle =). Le nom le plus proche avant le gabarit décide : un id (`note-${note.id}`), une clé, un
// aria-labelledby ou un nom de fichier fabriqué de même n'est pas une classe, et ne fait pas passer `.note-carte`.
const NOM = /([\w-]+)\s*(?:=\$\{|(?<![=!<>])=(?![=>])|:)/g;
function prefixesDeClasses(code) {
  const res = new Set();
  for (const m of code.matchAll(/([a-zA-Z][\w-]*-)\$\{/g)) {
    const noms = [...code.slice(Math.max(0, m.index - 400), m.index).matchAll(NOM)];
    if (noms.length && /class/i.test(noms[noms.length - 1][1])) res.add(m[1]);
  }
  return [...res];
}
const PREFIXES = prefixesDeClasses(SOURCES);
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
  for (const c of ['lien-ligne', 'lien-bouton', 'profil-journee', 'note-carte', 'classe-inventee-sans-usage']) assert.equal(sert(c), false, c);
  // Les débuts relevés : ceux des classes, pas ceux d'un id, d'une clé ou d'un aria-labelledby.
  assert.deepEqual(prefixesDeClasses('<${C} id=${`note-${n.id}`} key=${`k-${i}`} /><div class=${`pastilles colonnes-${c}${t ? ` teinte-${t}` : \'\'}`}'
    + ' aria-labelledby=${`legende-${z}`}><rect class=${x === \'a\' ? \'g-a\' : `g-${x}`} />'
    + 'const classeCercle = [\'cercle\', enCours && `phase-${p}`]; const d = { classe: `rampe-${i}`, controle: `detail-${i}` };'),
  ['colonnes-', 'teinte-', 'g-', 'phase-', 'rampe-']);
});

test('code mort retiré : oui-non.js, avantExplosions, et stats.js réduit à la moyenne et à la médiane', () => {
  assert.equal(existsSync(join(PUBLIC, 'js', 'ui', 'composants', 'oui-non.js')), false);
  assert.equal(present('avantExplosions'), false);
  for (const nom of ['wilson', 'newcombe', 'fisher', 'spearman', 'testPermutation', 'generateur', 'ecartType', 'quantile']) {
    assert.equal(new RegExp(`export (function|const) ${nom}\\b`).test(lire(join(PUBLIC, 'js', 'analyse', 'stats.js'))), false, nom);
  }
});

// Les modules qu'on n'atteint pas depuis les points d'entrée, en suivant les seules instructions d'import (import … from,
// export … from, import '…', import(…)). Un nom de module écrit ailleurs, dans la liste du précache de sw.js ou dans une
// chaîne, n'importe rien (relecture v8 : chercher le nom dans tout le code, sw.js compris, ne pouvait jamais échouer).
const IMPORT = /\b(?:import|export)\b\s*(?:[^'"`;]*?\bfrom\s*)?\(?\s*['"]([^'"]+)['"]/g;
function orphelins(modules, entrees) {
  const atteints = new Set();
  const suivre = (f) => {
    if (atteints.has(f) || !modules.has(f)) return;
    atteints.add(f);
    for (const m of modules.get(f).matchAll(IMPORT)) if (m[1].startsWith('.')) suivre(join(dirname(f), m[1]));
  };
  entrees.forEach(suivre);
  return [...modules.keys()].filter((f) => !atteints.has(f));
}

test('aucun module de l\'app n\'est oublié dans un coin : chacun est atteint par ses imports depuis main.js', () => {
  assert.deepEqual(orphelins(MODULES, [join(PUBLIC, 'js', 'main.js')]).map(rel), []);
});

test('le contrôle des modules repère bien un orphelin, même nommé dans la liste du service worker', () => {
  const modules = new Map([
    ['/a/js/main.js', 'import { b } from \'./ui/b.js\';\nimport \'./effet.js\';'],
    ['/a/js/ui/b.js', 'export { c } from \'../c.js\';\nexport const b = () => import(\'./tard.js\');'],
    ['/a/js/c.js', 'export const c = 1; const importer = () => \'./oublie.js\';'],
    ['/a/js/effet.js', ''], ['/a/js/ui/tard.js', ''],
    ['/a/js/oublie.js', 'export const x = 2;'],
    ['/a/js/sw.js', 'const FICHIERS = [\'./js/oublie.js\', \'oublie.js\'];'],
  ]);
  assert.deepEqual(orphelins(modules, ['/a/js/main.js']), ['/a/js/oublie.js', '/a/js/sw.js']);
});
