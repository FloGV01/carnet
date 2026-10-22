// Calibration (npm run test:calibration). v7 : les analyses calculées sur la note de 1 à 10 (bonnes journées, sommeil
// et humeur, tendances, signal de ressemblance) sont retirées, avec leurs calibrations. Il reste le contrôle du générateur
// de données inventées et le budget de temps de l'analyse, émotions du moment comprises.
// Chaque calibration tourne sur les deux formes de données. « soir » : une humeur du soir entière par jour (v5).
// « releves » : 0 à 6 relevés du moment par jour, aucune humeur du soir ; l'humeur du jour est leur moyenne.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecHumeurDuJour } from '../../public/js/analyse/humeur-jour.js';
import { moyenne } from '../../public/js/analyse/stats.js';
import { jourEvenement } from '../../public/js/domain/dates.js';
import { generer } from '../fixtures/generateur.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { FAMILLES } from '../../public/js/domain/roue.js';

const FORMES = ['soir', 'releves'];

// Données brutes { journal, humeurs } de la forme voulue.
function donnees(forme, options) {
  return forme === 'releves' ? generer({ ...options, releves: true }) : { journal: generer(options), humeurs: [] };
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

// v7 : chaque relevé porte aussi une émotion de la roue (un mot, ou une famille seule une fois sur cinq), comme après la
// mise à jour ; l'analyse les compte par période (analyse/emotions.js).
const MOTS = FAMILLES.flatMap((f) => [f.id, ...f.mots.map((m) => m.id)]);
const avecEmotions = (humeurs) => humeurs.map((h, i) => ({ ...h, emotion: MOTS[(i * 7) % MOTS.length] }));

calibration('budget (machine au repos) : 1 100 jours, émotions du moment comprises, en moins de 300 ms', (forme) => {
  const items = seedItems(SEED_V1, 'x');
  for (const [scenario, max] of [['nul', 300], ['bureau', 300]]) {
    const brut = donnees(forme, { jours: 1100, seed: 31, scenario });
    const { journal } = brut;
    const humeurs = avecEmotions(brut.humeurs);
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
