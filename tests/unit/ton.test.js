import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { RACINE, lister, rel, lire, chainesJs } from '../aides/fichiers.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';
import { SEED_V2_AJOUTS, SEED_V4_AJOUTS, SEED_V6_AJOUTS } from '../../public/js/domain/vocabulaire.js';
import { LISTES } from '../../public/js/domain/listes-def.js';

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

// Les listes v4 ont été écrites pour l'app (pas reprises du Numbers) : elles suivent la règle.
test('aucune formulation interdite dans les listes v4', () => {
  const fautes = Object.values(SEED_V2_AJOUTS).flat().map(([, libelle]) => [libelle, trouverInterdits(libelle)]).filter(([, t]) => t.length);
  assert.deepEqual(fautes, []);
});

// Les listes de la v6 (SEED_V4_AJOUTS) et leurs titres : mêmes règles.
test('aucune formulation interdite dans les listes de la v6', () => {
  const textes = [...Object.values(SEED_V4_AJOUTS).flat().map(([, libelle]) => libelle), ...['pese', 'recharge', 'activiteMoment'].map((n) => LISTES[n].libelle)];
  assert.equal(textes.length, 27);
  const fautes = textes.map((t) => [t, trouverInterdits(t)]).filter(([, f]) => f.length);
  assert.deepEqual(fautes, []);
});

// La liste de la v8 (sujets d'un rendez-vous) et son titre : mêmes règles.
test('aucune formulation interdite dans la liste de la v8', () => {
  const textes = [...SEED_V6_AJOUTS.sujetRdv.map(([, libelle]) => libelle), LISTES.sujetRdv.libelle];
  assert.equal(textes.length, 8);
  assert.deepEqual(textes.map((t) => [t, trouverInterdits(t)]).filter(([, f]) => f.length), []);
});

test('aucune formulation interdite dans le pas-à-pas du rappel', () => {
  const doc = join(RACINE, 'docs', 'rappel-du-soir.md');
  if (!existsSync(doc)) return;
  assert.deepEqual(trouverInterdits(lire(doc)), []);
});

// v6 · La page d'aide iPhone (spec §6) : texte fixe qui dit comment régler, jamais quand s'en servir ni ce qui
// vaut mieux. Elle suit déjà la règle générale ci-dessus ; ces formulations de conseil s'y ajoutent.
const CONSEILS = [/essaie/, /recommand/, /conseil/, /mieux/, /ideal/, /utile/, /efficace/, /en cas de/, /quand tu es/, /si tu es/, /t'aider/];
const trouverConseils = (texte) => CONSEILS.filter((re) => re.test(normaliser(texte))).map(String);

test('la page d\'aide iPhone décrit les réglages, sans recommander de stratégie', () => {
  const page = join(RACINE, 'public', 'js', 'ui', 'ecrans', 'aide-iphone.js');
  assert.ok(existsSync(page), 'écran manquant : public/js/ui/ecrans/aide-iphone.js');
  const texte = chainesJs(lire(page));
  assert.deepEqual(trouverInterdits(texte), []);
  assert.deepEqual(trouverConseils(texte), []);
  // Les six rubriques de la spec, dans l'ordre.
  const rubriques = ["Sons d'arrière-plan", 'Bruit sombre', 'Concentration', 'Moment difficile', 'Réduire le point blanc', 'Parole en direct', 'Toucher le dos', 'Sieste'];
  const n = normaliser(texte);
  const places = rubriques.map((r) => n.indexOf(normaliser(r)));
  assert.ok(places.every((p) => p >= 0), `rubrique absente : ${rubriques.filter((_, i) => places[i] < 0)}`);
  assert.deepEqual(places, [...places].sort((a, b) => a - b), 'ordre des rubriques');
});

test('le détecteur de conseils repère les formulations visées', () => {
  assert.deepEqual(trouverConseils('Essaie le bruit sombre'), ['/essaie/']);
  assert.deepEqual(trouverConseils('Si tu es en colère, c\'est mieux'), ['/mieux/', '/si tu es/']);
  assert.deepEqual(trouverConseils('Ouvre Réglages, touche « + », nomme-le « Sieste ».'), []);
});

test('le détecteur repère bien les formulations visées', () => {
  assert.deepEqual(trouverInterdits('Bravo, 3 jours d\'affilée !'), ['bravo', "jours d'affilee"]);
  assert.deepEqual(trouverInterdits('Tu n\'as pas rempli hier'), ["tu n'as pas"]);
  assert.deepEqual(trouverInterdits('Il y a 3 jours'), ['il y a N jours']);
  assert.deepEqual(trouverInterdits('Il aurait fallu sortir'), ['aurait fallu']);
  assert.deepEqual(trouverInterdits('Défilement, définir, MediaRecorder, serieHebdo'), []);
});

test('l\'extracteur ne garde que les chaînes', () => {
  const code = "class A extends B { constructor() { super(); } } const r = /['\"]/g; const t = html`<p>${x} Bravo</p>`; // super\nconst s = 'texte';";
  const ch = chainesJs(code);
  assert.ok(!/super/.test(ch));
  assert.match(ch, /Bravo/);
  assert.match(ch, /texte/);
});
