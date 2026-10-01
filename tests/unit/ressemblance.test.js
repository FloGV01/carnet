import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ressemblance, periodesBasses } from '../../public/js/analyse/ressemblance.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { addDays } from '../../public/js/domain/dates.js';
import { generer, genererPeriodes } from '../fixtures/generateur.js';

const items = seedItems(SEED_V1, 'x');
const fin = (j) => j[j.length - 1].date;
function avecSignature(j, { humeur = 6 } = {}) {
  const ext = [...j];
  for (let k = 0; k < 4; k++) ext.push({ ...j[0], date: addDays(fin(j), k + 1), humeur, sommeilRessenti: 'sommeil:mal', contactHumain: false, reveilsNocturnes: 3 });
  return ext;
}

test('périodes plus basses repérées sur les périodes plantées', () => {
  const j = genererPeriodes({ seed: 3 });
  const { periodes } = periodesBasses(j.map((x) => x.humeur));
  assert.equal(periodes.length, 4);
});

test('365 jours stables : aucun signal (pas de période)', () => {
  const j = generer({ jours: 365, seed: 5, scenario: 'nul' });
  const r = ressemblance({ journal: j }, { aujourdhui: fin(j), items });
  assert.equal(r.ressemble, false);
});

test('2 périodes seulement : signal inactif « peu de périodes »', () => {
  const j = genererPeriodes({ seed: 3, jours: 220, periodes: [90, 160] });
  assert.equal(ressemblance({ journal: j }, { aujourdhui: fin(j), items }).raison, 'peu_de_periodes');
});

test('signature plantée reconnue, phrase sans nombre de périodes ni date', () => {
  const j = avecSignature(genererPeriodes({ seed: 3 }));
  const r = ressemblance({ journal: j }, { aujourdhui: fin(j), items });
  assert.equal(r.actif, true);
  assert.equal(r.ressemble, true);
  assert.match(r.phrase, /^Ces 4 derniers jours ressemblent, surtout par .+ et .+, aux jours qui ont précédé certaines périodes plus basses\. C'est une ressemblance dans les chiffres, pas une prévision\.$/);
  assert.ok(!/\d/.test(r.phrase.replace('Ces 4 derniers jours', '')), 'aucun nombre de périodes ni date');
  assert.ok(!/alerte|attention|risque|rechute|crise/i.test(r.phrase));
  assert.ok(r.detail.every((d) => Number.isFinite(d.cesJours) && Number.isFinite(d.habitude)));
});

test('jours ordinaires : pas de ressemblance', () => {
  const j = genererPeriodes({ seed: 3 });
  const r = ressemblance({ journal: j }, { aujourdhui: fin(j), items });
  assert.equal(r.ressemble, false);
});

test('précision historique sous 1/3 : signal inactif', () => {
  const j = avecSignature(genererPeriodes({ seed: 3, leurres: [30, 50, 120, 135, 180, 195, 240, 255, 300] }));
  const r = ressemblance({ journal: j }, { aujourdhui: fin(j), items });
  assert.equal(r.actif, false);
  assert.ok(['precision', 'sensibilite', 'pas_de_signature'].includes(r.raison), r.raison);
});

test('période en cours, fenêtre incomplète, réglage désactivé', () => {
  const base = genererPeriodes({ seed: 3 });
  const enCours = [...base];
  for (let k = 0; k < 6; k++) enCours.push({ ...base[0], date: addDays(fin(base), k + 1), humeur: 2 });
  const r = ressemblance({ journal: enCours }, { aujourdhui: fin(enCours), items });
  assert.equal(r.ressemble, false);
  const trou = ressemblance({ journal: base }, { aujourdhui: addDays(fin(base), 3), items });
  assert.equal(trou.ressemble, false);
  assert.equal(ressemblance({ journal: base }, { aujourdhui: fin(base), items, actif: false }).raison, 'desactive');
});
