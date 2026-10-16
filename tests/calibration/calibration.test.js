// Calibration (npm run test:calibration) : taux de faux constats sur des données sans effet.
// v6 : chaque calibration tourne sur les deux formes de données. « soir » : une humeur du soir
// entière par jour (v5). « releves » : 0 à 6 relevés du moment par jour, aucune humeur du soir ;
// l'humeur du jour est leur moyenne. Les deux sont lues comme analyze() les lit (avecHumeurDuJour).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bonnesJournees } from '../../public/js/analyse/bonnes-journees.js';
import { sommeilHumeur } from '../../public/js/analyse/sommeil.js';
import { avecHumeurDuJour } from '../../public/js/analyse/humeur-jour.js';
import { moyenne } from '../../public/js/analyse/stats.js';
import { jourEvenement } from '../../public/js/domain/dates.js';
import { generer } from '../fixtures/generateur.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';

const N = 60;
const FORMES = ['soir', 'releves'];

// Données brutes { journal, humeurs } de la forme voulue.
function donnees(forme, options) {
  return forme === 'releves' ? generer({ ...options, releves: true }) : { journal: generer(options), humeurs: [] };
}
// Journal dont `humeur` est l'humeur du jour, comme dans analyze().
function journalDuJour(forme, options) {
  const { journal, humeurs } = donnees(forme, options);
  return avecHumeurDuJour(journal, humeurs);
}
// Une calibration, déclarée une fois par forme de données.
function calibration(nom, fn) {
  for (const forme of FORMES) test(`${nom} [${forme}]`, () => fn(forme));
}

test('générateur, forme « releves » : 0 à 6 relevés par jour, de 8 h à 22 h, bruit σ = 1, effet planté gardé', () => {
  const options = { jours: 400, seed: 9, scenario: 'bureau', trous: 0.1 };
  const soir = generer(options);
  const { journal, humeurs } = generer({ ...options, releves: true });
  // Le même journal, sans humeur du soir : les relevés ont leur propre suite aléatoire.
  assert.deepEqual(journal, soir.map((j) => ({ ...j, humeur: null })));
  const parJour = new Map(journal.map((j) => [j.date, []]));
  for (const h of humeurs) {
    assert.ok(Number.isInteger(h.humeur) && h.humeur >= 1 && h.humeur <= 10, `humeur ${h.humeur}`);
    assert.ok(h.heure >= '08:00' && h.heure <= '22:00', `heure ${h.heure}`);
    assert.equal(jourEvenement(h.date, h.heure), h.date);
    assert.ok(parJour.has(h.date), `relevé un jour non noté : ${h.date}`);
    parJour.get(h.date).push(h.humeur);
  }
  assert.equal(new Set(humeurs.map((h) => h.id)).size, humeurs.length, 'identifiants uniques');
  const tailles = new Set([...parJour.values()].map((xs) => xs.length));
  assert.deepEqual([...tailles].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  // Bruit dans la journée : écart-type intra-jour poolé proche de 1 (σ = 1, plus l'arrondi).
  let carres = 0;
  let ddl = 0;
  for (const xs of parJour.values()) {
    if (xs.length < 2) continue;
    const m = moyenne(xs);
    carres += xs.reduce((s, x) => s + (x - m) ** 2, 0);
    ddl += xs.length - 1;
  }
  const sd = Math.sqrt(carres / ddl);
  console.log(`  écart-type intra-jour : ${sd.toFixed(2)}`);
  assert.ok(sd > 0.9 && sd < 1.2, `écart-type intra-jour ${sd.toFixed(2)}`);
  // L'effet planté (bureau +3) porte sur l'humeur latente : l'humeur du jour le garde.
  const ecartBureau = (js) => {
    const avec = js.filter((j) => j.humeur != null);
    return moyenne(avec.filter((j) => j.lieu === 'lieu:bureau').map((j) => j.humeur)) - moyenne(avec.filter((j) => j.lieu !== 'lieu:bureau').map((j) => j.humeur));
  };
  const eSoir = ecartBureau(soir);
  const eReleves = ecartBureau(avecHumeurDuJour(journal, humeurs));
  console.log(`  effet bureau : ${eSoir.toFixed(2)} (soir), ${eReleves.toFixed(2)} (relevés)`);
  assert.ok(eReleves > 2.5 && Math.abs(eReleves - eSoir) < 0.3, `${eSoir.toFixed(2)} contre ${eReleves.toFixed(2)}`);
});

calibration('bonnes journées : au plus 8 % de faux constats avec humeur autocorrélée (AR(1), lieu par blocs)', (forme) => {
  let faux = 0;
  for (let seed = 1000; seed < 1000 + N; seed++) {
    const j = journalDuJour(forme, { jours: 180, seed, scenario: 'ar1' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.length) faux++;
  }
  console.log(`  bonnes journées AR(1) [${forme}] : ${faux}/${N}`);
  assert.ok(faux / N <= 0.08, `${faux}/${N}`);
});

calibration('sommeil : au plus 5 % de faux positifs sans effet', (forme) => {
  let faux = 0;
  for (let seed = 2000; seed < 2000 + N; seed++) {
    const j = journalDuJour(forme, { jours: 150, seed, scenario: 'nul' });
    const r = sommeilHumeur(j, j[j.length - 1].date);
    if (r.meme.constat || r.lendemain.constat) faux++;
  }
  console.log(`  sommeil sans effet [${forme}] : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

calibration('puissance : un vrai effet est retrouvé dans la plupart des cas', (forme) => {
  let trouves = 0;
  for (let seed = 3000; seed < 3020; seed++) {
    const j = journalDuJour(forme, { jours: 180, seed, scenario: 'bureau' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.some((c) => c.variable === 'lieu')) trouves++;
  }
  console.log(`  puissance « bureau +3 » [${forme}] : ${trouves}/20`);
  assert.ok(trouves >= 16, `${trouves}/20`);
});

calibration('budget (machine au repos) : 1 100 jours en moins de 300 ms sans constat, 1,5 s avec constats', (forme) => {
  const items = seedItems(SEED_V1, 'x');
  for (const [scenario, max] of [['nul', 300], ['sommeilJourMeme', 1500]]) {
    const { journal, humeurs } = donnees(forme, { jours: 1100, seed: 31, scenario });
    let dt = Infinity;
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      analyze({ journal, humeurs, episodes: [], symptomes: [], traitements: [] }, { aujourdhui: journal[journal.length - 1].date, items });
      dt = Math.min(dt, performance.now() - t0);
    }
    console.log(`  budget ${scenario} [${forme}] : ${Math.round(dt)} ms`);
    assert.ok(dt < max, `${scenario} : ${Math.round(dt)} ms`);
  }
});

calibration('signal : au plus 2 affichages par an sur des données sans signature (humeur autocorrélée)', async (forme) => {
  const { ressemblance } = await import('../../public/js/analyse/ressemblance.js');
  const { addDays } = await import('../../public/js/domain/dates.js');
  const items = seedItems(SEED_V1, 'x');
  let parle = 0; let evaluations = 0;
  for (const seed of [41, 42, 43]) {
    const journal = journalDuJour(forme, { jours: 500, seed, scenario: 'ar1' });
    const debut = journal[135].date;
    for (let k = 0; k < 365; k += 3) {
      const r = ressemblance({ journal }, { aujourdhui: addDays(debut, k), items });
      evaluations++;
      if (r.ressemble) parle++;
    }
  }
  const parAn = (parle / evaluations) * 365;
  console.log(`  signal sans signature [${forme}] : ${parle}/${evaluations} évaluations, soit ${parAn.toFixed(1)} jours par an`);
  assert.ok(parAn <= 2, `${parAn.toFixed(1)} jours par an`);
});

// v4 : compteur du soir masqué, explosions notées en épisodes (règle de domain/explosions.js, comme
// dans analyze). « rupture » : compteur jusqu'au jour 300, puis la moitié des explosions en épisodes.
calibration('signal v4 : compteur masqué, puis rupture compteur → épisodes, toujours au plus 2 jours par an', async (forme) => {
  const { ressemblance } = await import('../../public/js/analyse/ressemblance.js');
  const { journalAvecExplosions, saisieDuSoir } = await import('../../public/js/domain/explosions.js');
  const { addDays } = await import('../../public/js/domain/dates.js');
  const items = seedItems(SEED_V1, 'x');
  for (const mode of ['masque', 'rupture']) {
    let parle = 0; let evaluations = 0;
    for (const seed of [41, 42, 43]) {
      const brut = journalDuJour(forme, { jours: 500, seed, scenario: 'ar1', trous: mode === 'masque' ? 0.2 : 0 });
      const episodes = [];
      const journal = brut.map((j, i) => {
        if (mode === 'rupture' && i < 300) return j;
        if (j.explosions > 0 && (mode === 'masque' || i % 2 === 0)) episodes.push({ id: `e${i}`, date: j.date, heure: '18:00', reaction: 'reaction:explosion' });
        return { ...j, explosions: null };
      });
      const regle = journalAvecExplosions(journal, episodes, { zeroDepuis: brut[0].date, ajouterJours: false, jourNote: saisieDuSoir(journal) });
      const debut = brut[135].date;
      for (let k = 0; k < 365; k += 3) {
        const r = ressemblance({ journal: regle }, { aujourdhui: addDays(debut, k), items });
        evaluations++;
        if (r.ressemble) parle++;
      }
    }
    const parAn = (parle / evaluations) * 365;
    console.log(`  signal v4 (${mode}) [${forme}] : ${parle}/${evaluations} évaluations, soit ${parAn.toFixed(1)} jours par an`);
    assert.ok(parAn <= 2, `${mode} : ${parAn.toFixed(1)} jours par an`);
  }
});

calibration('bonnes journées : au plus 8 % de faux constats, humeur φ = 0,9 et lieu par plages hors grille', (forme) => {
  let faux = 0;
  for (let seed = 1000; seed < 1000 + N; seed++) {
    const j = journalDuJour(forme, { jours: 180, seed, scenario: 'ar1Long' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.length) faux++;
  }
  console.log(`  bonnes journées φ 0,9 [${forme}] : ${faux}/${N}`);
  assert.ok(faux / N <= 0.08, `${faux}/${N}`);
});

calibration('sommeil : au plus 5 % de faux positifs, humeur φ = 0,9 et nuits qui se répètent', (forme) => {
  let faux = 0;
  for (let seed = 2000; seed < 2000 + N; seed++) {
    const j = journalDuJour(forme, { jours: 150, seed, scenario: 'ar1Long' });
    const r = sommeilHumeur(j, j[j.length - 1].date);
    if (r.meme.constat || r.lendemain.constat) faux++;
  }
  console.log(`  sommeil φ 0,9 [${forme}] : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

calibration('sommeil : effet du jour même + humeur autocorrélée, au plus 5 % de faux constats le lendemain', (forme) => {
  let faux = 0;
  for (let seed = 4000; seed < 4000 + N; seed++) {
    const j = journalDuJour(forme, { jours: 200, seed, scenario: 'jourMemeAR' });
    if (sommeilHumeur(j, j[j.length - 1].date).lendemain.constat) faux++;
  }
  console.log(`  lendemain sous effet du jour même [${forme}] : ${faux}/${N}`);
  assert.ok(faux / N <= 0.05, `${faux}/${N}`);
});

calibration('puissance : un emploi du temps fixe (bureau lun/mar/jeu, +3) est retrouvé', (forme) => {
  let trouves = 0;
  for (let seed = 3000; seed < 3020; seed++) {
    const j = journalDuJour(forme, { jours: 182, seed, scenario: 'emploiDuTemps' });
    if (bonnesJournees(j, j[j.length - 1].date).constats.some((c) => c.variable === 'lieu')) trouves++;
  }
  console.log(`  puissance emploi du temps [${forme}] : ${trouves}/20`);
  assert.ok(trouves >= 16, `${trouves}/20`);
});

calibration('bonnes journées : au plus 10 % de journaux avec un faux constat sur un an de recalcul quotidien', (forme) => {
  const n = 30;
  let touches = 0;
  for (let seed = 5000; seed < 5000 + n; seed++) {
    const j = journalDuJour(forme, { jours: 425, seed, scenario: 'nul' });
    let deja = new Set();
    for (let k = 60; k < j.length; k++) {
      const r = bonnesJournees(j.slice(0, k + 1), j[k].date, deja);
      deja = new Set(r.constats.map((c) => `bj:${c.cle}`));
      if (r.constats.length) { touches++; break; }
    }
  }
  console.log(`  un an de recalcul quotidien [${forme}] : ${touches}/${n}`);
  assert.ok(touches / n <= 0.10, `${touches}/${n}`);
});

// v5 · Tendances (humeur du jour, 4 semaines contre les 8 d'avant) : recalcul tous les 3 jours
// pendant un an, avec la mémoire d'affichage, sur des journaux sans aucun changement réel.
calibration('tendances : au plus 8 % de journaux avec une fausse phrase en un an (AR(1), φ = 0,9, composante lente)', async (forme) => {
  const { tendances } = await import('../../public/js/analyse/tendances.js');
  for (const scenario of ['ar1', 'ar1Long', 'lente']) {
    let journaux = 0;
    const n = 40;
    for (let seed = 100; seed < 100 + n; seed++) {
      const j = journalDuJour(forme, { jours: 760, seed, scenario, trous: 0.18 });
      let deja = new Set();
      let parle = false;
      for (let k = 0; k < 365; k += 3) {
        const r = tendances(j, j[Math.min(j.length - 1, 370 + k)].date, deja);
        deja = new Set(r.constat ? [r.constat.cle] : []);
        if (r.constat) parle = true;
      }
      if (parle) journaux++;
    }
    console.log(`  tendances ${scenario} [${forme}] : ${journaux}/${n} journaux avec une phrase sur un an`);
    assert.ok(journaux / n <= 0.08, `${scenario} : ${journaux}/${n}`);
  }
});

// Le changement est ajouté à ce qui est noté : l'humeur du soir, ou chaque relevé.
calibration('tendances : un changement durable de 3 points est retrouvé au moins une fois sur trois (AR(1))', async (forme) => {
  const { tendances } = await import('../../public/js/analyse/tendances.js');
  const plus3 = (depuis) => (e) => (e.date >= depuis && e.humeur != null ? { ...e, humeur: Math.max(1, Math.min(10, Math.round(e.humeur + 3))) } : e);
  let trouves = 0;
  const n = 40;
  for (let seed = 700; seed < 700 + n; seed++) {
    const { journal, humeurs } = donnees(forme, { jours: 560, seed, scenario: 'ar1', trous: 0.18 });
    const debut = journal.length - 70;
    const decale = plus3(journal[debut].date);
    const jj = avecHumeurDuJour(journal.map(decale), humeurs.map(decale));
    let deja = new Set();
    let vu = false;
    for (let i = debut + 14; i < jj.length; i++) {
      const r = tendances(jj, jj[i].date, deja);
      deja = new Set(r.constat ? [r.constat.cle] : []);
      if (r.constat && r.constat.sens === 'haut') vu = true;
    }
    if (vu) trouves++;
  }
  console.log(`  tendances, changement de +3 [${forme}] : ${trouves}/${n}`);
  assert.ok(trouves / n >= 1 / 3, `${trouves}/${n}`);
});

// v5 · Budget de bout en bout : au moins une phrase parmi bonnes journées, sommeil (jour même,
// lendemain) et Tendances, avec la même mémoire d'affichage que analyze(), recalcul tous les
// 3 jours pendant un an, 18 % de trous. Plafond : 10 % des journaux, scénario par scénario.
calibration('budget de bout en bout : au plus 10 % de journaux avec une fausse phrase en un an', async (forme) => {
  const { tendances } = await import('../../public/js/analyse/tendances.js');
  for (const scenario of ['ar1', 'ar1Long', 'lente', 'emploiDuTemps']) {
    let journaux = 0;
    const n = 30;
    for (let seed = 100; seed < 100 + n; seed++) {
      // emploiDuTemps sans effet (effet: 0) : la structure de la semaine seule, aucun vrai écart.
      const j = journalDuJour(forme, { jours: 760, seed, scenario, trous: 0.18, effet: 0 });
      let deja = new Set();
      let parle = false;
      for (let k = 0; k < 365 && !parle; k += 3) {
        const J = j[Math.min(j.length - 1, 370 + k)].date;
        const bj = bonnesJournees(j, J, deja);
        const so = sommeilHumeur(j, J, deja);
        const t = tendances(j, J, deja);
        deja = new Set([...bj.constats.map((c) => `bj:${c.cle}`), ...(so.meme.constat ? ['sommeil:meme'] : []), ...(so.lendemain.constat ? ['sommeil:lendemain'] : []), ...(t.constat ? [t.constat.cle] : [])]);
        if (deja.size) parle = true;
      }
      if (parle) journaux++;
    }
    console.log(`  bout en bout ${scenario} [${forme}] : ${journaux}/${n} journaux avec une phrase sur un an`);
    assert.ok(journaux / n <= 0.10, `${scenario} : ${journaux}/${n}`);
  }
});
