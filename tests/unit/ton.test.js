import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { RACINE, lister, rel, lire, chainesJs } from '../aides/fichiers.js';
import { trouverInterdits } from '../aides/mots-interdits.js';

// Les libellés des listes (vocabulaire clinique) sont exemptés : ils ne se lissent pas.
const EXEMPTES = new Set(['public/js/domain/vocabulaire.js']);

test('aucune formulation interdite dans l\'app', () => {
  const fichiers = lister(join(RACINE, 'public'), (p) => /\.(js|html|webmanifest)$/.test(p) && !p.includes(`${'/'}vendor${'/'}`));
  const fautes = [];
  for (const f of fichiers) {
    if (EXEMPTES.has(rel(f))) continue;
    const texte = f.endsWith('.js') ? chainesJs(lire(f)) : lire(f);
    const trouves = trouverInterdits(texte);
    if (trouves.length) fautes.push(`${rel(f)} : ${trouves.join(', ')}`);
  }
  assert.deepEqual(fautes, []);
});

test('aucune formulation interdite dans le pas-à-pas du rappel', () => {
  const doc = join(RACINE, 'docs', 'rappel-du-soir.md');
  if (!existsSync(doc)) return;
  assert.deepEqual(trouverInterdits(lire(doc)), []);
});

test('le détecteur repère bien les formulations visées', () => {
  assert.deepEqual(trouverInterdits('Bravo, 3 jours d\'affilée !'), ['bravo', "jours d'affilee"]);
  assert.deepEqual(trouverInterdits('Tu n\'as pas rempli hier'), ["tu n'as pas"]);
  assert.deepEqual(trouverInterdits('Il y a 3 jours'), ['il y a N jours']);
  assert.deepEqual(trouverInterdits('Défilement, définir, MediaRecorder, serieHebdo'), []);
});

test('l\'extracteur ne garde que les chaînes', () => {
  const code = "class A extends B { constructor() { super(); } } const r = /['\"]/g; const t = html`<p>${x} Bravo</p>`; // super\nconst s = 'texte';";
  const ch = chainesJs(code);
  assert.ok(!/super/.test(ch));
  assert.match(ch, /Bravo/);
  assert.match(ch, /texte/);
});
