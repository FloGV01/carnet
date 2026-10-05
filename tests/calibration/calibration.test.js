// Calibration (npm run test:calibration) : taux de faux constats sur des données sans effet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bonnesJournees } from '../../public/js/analyse/bonnes-journees.js';
import { sommeilHumeur } from '../../public/js/analyse/sommeil.js';
import { generer } from '../fixtures/generateur.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';

const N = 60;

test('bonnes journées : au plus 8 % de faux constats avec humeur autocorrélée (AR(1), lieu par blocs)', () => {
  let faux = 0;
  for (let seed = 1000; seed < 1000 + N; seed++) {
    const j = generer({ jours: 180, seed, scenario: 'ar1' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.length) faux++;
  }
  console.log(`  bonnes journées AR(1) : ${faux}/${N}`);
  assert.ok(faux / N <= 0.08, `${faux}/${N}`);
});

test('sommeil : au plus 5 % de faux positifs sans effet', () => {
  let faux = 0;
  for (let seed = 2000; seed < 2000 + N; seed++) {
    const j = generer({ jours: 150, seed, scenario: 'nul' });
    const r = sommeilHumeur(j, j[j.length - 1].date);
    if (r.meme.constat || r.lendemain.constat) faux++;
  }
  console.log(`  sommeil sans effet : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

test('puissance : un vrai effet est retrouvé dans la plupart des cas', () => {
  let trouves = 0;
  for (let seed = 3000; seed < 3020; seed++) {
    const j = generer({ jours: 180, seed, scenario: 'bureau' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.some((c) => c.variable === 'lieu')) trouves++;
  }
  console.log(`  puissance « bureau +3 » : ${trouves}/20`);
  assert.ok(trouves >= 16, `${trouves}/20`);
});

test('budget (machine au repos) : 1 100 jours en moins de 300 ms sans constat, 1,5 s avec constats', () => {
  const items = seedItems(SEED_V1, 'x');
  for (const [scenario, max] of [['nul', 300], ['sommeilJourMeme', 1500]]) {
    const journal = generer({ jours: 1100, seed: 31, scenario });
    let dt = Infinity;
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      analyze({ journal, episodes: [], symptomes: [], traitements: [] }, { aujourdhui: journal[journal.length - 1].date, items });
      dt = Math.min(dt, performance.now() - t0);
    }
    console.log(`  budget ${scenario} : ${Math.round(dt)} ms`);
    assert.ok(dt < max, `${scenario} : ${Math.round(dt)} ms`);
  }
});

test('signal : au plus 2 affichages par an sur des données sans signature (humeur autocorrélée)', async () => {
  const { ressemblance } = await import('../../public/js/analyse/ressemblance.js');
  const { addDays } = await import('../../public/js/domain/dates.js');
  const items = seedItems(SEED_V1, 'x');
  let parle = 0; let evaluations = 0;
  for (const seed of [41, 42, 43]) {
    const journal = generer({ jours: 500, seed, scenario: 'ar1' });
    const debut = journal[135].date;
    for (let k = 0; k < 365; k += 3) {
      const r = ressemblance({ journal }, { aujourdhui: addDays(debut, k), items });
      evaluations++;
      if (r.ressemble) parle++;
    }
  }
  const parAn = (parle / evaluations) * 365;
  console.log(`  signal sans signature : ${parle}/${evaluations} évaluations, soit ${parAn.toFixed(1)} jours par an`);
  assert.ok(parAn <= 2, `${parAn.toFixed(1)} jours par an`);
});

// v4 : compteur du soir masqué, explosions notées en épisodes (règle de domain/explosions.js, comme
// dans analyze). « rupture » : compteur jusqu'au jour 300, puis la moitié des explosions en épisodes.
test('signal v4 : compteur masqué, puis rupture compteur → épisodes, toujours au plus 2 jours par an', async () => {
  const { ressemblance } = await import('../../public/js/analyse/ressemblance.js');
  const { journalAvecExplosions } = await import('../../public/js/domain/explosions.js');
  const { addDays } = await import('../../public/js/domain/dates.js');
  const items = seedItems(SEED_V1, 'x');
  for (const mode of ['masque', 'rupture']) {
    let parle = 0; let evaluations = 0;
    for (const seed of [41, 42, 43]) {
      const brut = generer({ jours: 500, seed, scenario: 'ar1', trous: mode === 'masque' ? 0.2 : 0 });
      const episodes = [];
      const journal = brut.map((j, i) => {
        if (mode === 'rupture' && i < 300) return j;
        if (j.explosions > 0 && (mode === 'masque' || i % 2 === 0)) episodes.push({ id: `e${i}`, date: j.date, heure: '18:00', reaction: 'reaction:explosion' });
        return { ...j, explosions: null };
      });
      const regle = journalAvecExplosions(journal, episodes, { zeroDepuis: brut[0].date, ajouterJours: false });
      const debut = brut[135].date;
      for (let k = 0; k < 365; k += 3) {
        const r = ressemblance({ journal: regle }, { aujourdhui: addDays(debut, k), items });
        evaluations++;
        if (r.ressemble) parle++;
      }
    }
    const parAn = (parle / evaluations) * 365;
    console.log(`  signal v4 (${mode}) : ${parle}/${evaluations} évaluations, soit ${parAn.toFixed(1)} jours par an`);
    assert.ok(parAn <= 2, `${mode} : ${parAn.toFixed(1)} jours par an`);
  }
});

test('bonnes journées : au plus 8 % de faux constats, humeur φ = 0,9 et lieu par plages hors grille', () => {
  let faux = 0;
  for (let seed = 1000; seed < 1000 + N; seed++) {
    const j = generer({ jours: 180, seed, scenario: 'ar1Long' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.length) faux++;
  }
  console.log(`  bonnes journées φ 0,9 : ${faux}/${N}`);
  assert.ok(faux / N <= 0.08, `${faux}/${N}`);
});

test('sommeil : au plus 5 % de faux positifs, humeur φ = 0,9 et nuits qui se répètent', () => {
  let faux = 0;
  for (let seed = 2000; seed < 2000 + N; seed++) {
    const j = generer({ jours: 150, seed, scenario: 'ar1Long' });
    const r = sommeilHumeur(j, j[j.length - 1].date);
    if (r.meme.constat || r.lendemain.constat) faux++;
  }
  console.log(`  sommeil φ 0,9 : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

test('sommeil : effet du jour même + humeur autocorrélée, au plus 5 % de faux constats le lendemain', () => {
  let faux = 0;
  for (let seed = 4000; seed < 4000 + N; seed++) {
    const j = generer({ jours: 200, seed, scenario: 'jourMemeAR' });
    if (sommeilHumeur(j, j[j.length - 1].date).lendemain.constat) faux++;
  }
  console.log(`  lendemain sous effet du jour même : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

test('puissance : un emploi du temps fixe (bureau lun/mar/jeu, +3) est retrouvé', () => {
  let trouves = 0;
  for (let seed = 3000; seed < 3020; seed++) {
    const j = generer({ jours: 182, seed, scenario: 'emploiDuTemps' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.some((c) => c.variable === 'lieu')) trouves++;
  }
  console.log(`  puissance emploi du temps : ${trouves}/20`);
  assert.ok(trouves >= 16, `${trouves}/20`);
});

test('bonnes journées : au plus 10 % de journaux avec un faux constat sur un an de recalcul quotidien', () => {
  const n = 30;
  let touches = 0;
  for (let seed = 5000; seed < 5000 + n; seed++) {
    const j = generer({ jours: 425, seed, scenario: 'nul' });
    let deja = new Set();
    for (let k = 60; k < j.length; k++) {
      const r = bonnesJournees(j.slice(0, k + 1), j[k].date, deja);
      deja = new Set(r.constats.map((c) => `bj:${c.cle}`));
      if (r.constats.length) { touches++; break; }
    }
  }
  console.log(`  un an de recalcul quotidien : ${touches}/${n}`);
  assert.ok(touches / n <= 0.10, `${touches}/${n}`);
});
