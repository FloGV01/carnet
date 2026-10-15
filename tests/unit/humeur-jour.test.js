import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estHumeur, humeursDuJour, avecHumeurDuJour } from '../../public/js/analyse/humeur-jour.js';

const releve = (date, heure, humeur, plus = {}) => ({ id: `${date}-${heure}`, date, heure, humeur, energie: null, vers: null, faisais: null, ...plus });

test('estHumeur : un entier de 1 à 10, rien d\'autre', () => {
  for (const v of [1, 5, 10]) assert.equal(estHumeur(v), true, String(v));
  for (const v of [0, 11, -1, 5.5, '5', null, undefined, NaN, Infinity, true, []]) assert.equal(estHumeur(v), false, String(v));
});

test('humeursDuJour : moyenne des relevés du jour, avec le plus bas et le plus haut', () => {
  const humeurs = [releve('2026-10-05', '09:00', 3), releve('2026-10-05', '13:00', 8), releve('2026-10-05', '19:00', 6)];
  const m = humeursDuJour({ journal: [], humeurs });
  assert.deepEqual(m.get('2026-10-05'), { valeur: 17 / 3, min: 3, max: 8, n: 3, source: 'moment' });
  assert.equal(m.size, 1);
});

test('humeursDuJour : la moyenne n\'est pas arrondie (l\'arrondi est pour l\'affichage)', () => {
  const humeurs = [releve('2026-10-05', '09:00', 5), releve('2026-10-05', '13:00', 6), releve('2026-10-05', '19:00', 6)];
  assert.equal(humeursDuJour({ journal: [], humeurs }).get('2026-10-05').valeur, 17 / 3);
});

test('humeursDuJour : un seul relevé donne sa valeur, plus bas et plus haut égaux', () => {
  const m = humeursDuJour({ journal: [], humeurs: [releve('2026-10-05', '10:00', 7)] });
  assert.deepEqual(m.get('2026-10-05'), { valeur: 7, min: 7, max: 7, n: 1, source: 'moment' });
});

test('humeursDuJour : les relevés « vers » comptent comme les autres', () => {
  const humeurs = [releve('2026-10-05', '09:00', 4), releve('2026-10-05', '16:00', 8, { vers: true })];
  assert.deepEqual(humeursDuJour({ journal: [], humeurs }).get('2026-10-05'), { valeur: 6, min: 4, max: 8, n: 2, source: 'moment' });
});

test('humeursDuJour : un jour qui n\'a que des relevés « vers » a une humeur', () => {
  // « Vers 0 h » noté le 6 appartient au jour logique du 5.
  const humeurs = [releve('2026-10-06', '00:00', 5, { vers: true }), releve('2026-10-05', '15:00', 7, { vers: true })];
  const m = humeursDuJour({ journal: [], humeurs });
  assert.deepEqual(m.get('2026-10-05'), { valeur: 6, min: 5, max: 7, n: 2, source: 'moment' });
  assert.equal(m.size, 1);
});

test('humeursDuJour : un relevé à 01:00 le jour D+1 compte pour le jour D', () => {
  const humeurs = [releve('2026-10-05', '20:00', 6), releve('2026-10-06', '01:00', 2), releve('2026-10-06', '03:59', 4)];
  const m = humeursDuJour({ journal: [], humeurs });
  assert.deepEqual(m.get('2026-10-05'), { valeur: 4, min: 2, max: 6, n: 3, source: 'moment' });
  assert.equal(m.has('2026-10-06'), false, 'rien ne reste sur le jour D+1');
});

test('humeursDuJour : à 04:00 pile, le relevé est déjà du jour suivant', () => {
  const humeurs = [releve('2026-10-05', '20:00', 6), releve('2026-10-06', '04:00', 9)];
  const m = humeursDuJour({ journal: [], humeurs });
  assert.equal(m.get('2026-10-05').valeur, 6);
  assert.equal(m.get('2026-10-06').valeur, 9);
});

test('humeursDuJour : sans relevé, l\'humeur du soir reste la valeur du jour', () => {
  const journal = [{ date: '2026-10-04', humeur: 6 }];
  assert.deepEqual(humeursDuJour({ journal, humeurs: [] }).get('2026-10-04'), { valeur: 6, min: 6, max: 6, n: 1, source: 'soir' });
});

test('humeursDuJour : dès qu\'un relevé existe, le soir est ignoré, jamais mélangé', () => {
  const journal = [{ date: '2026-10-05', humeur: 10 }];
  const humeurs = [releve('2026-10-05', '09:00', 4), releve('2026-10-05', '19:00', 6)];
  assert.deepEqual(humeursDuJour({ journal, humeurs }).get('2026-10-05'), { valeur: 5, min: 4, max: 6, n: 2, source: 'moment' });
});

test('humeursDuJour : chaque jour choisit sa source, relevés ou soir', () => {
  const journal = [{ date: '2026-10-04', humeur: 3 }, { date: '2026-10-05', humeur: 9 }];
  const humeurs = [releve('2026-10-05', '12:00', 5)];
  const m = humeursDuJour({ journal, humeurs });
  assert.equal(m.get('2026-10-04').source, 'soir');
  assert.equal(m.get('2026-10-04').valeur, 3);
  assert.equal(m.get('2026-10-05').source, 'moment');
  assert.equal(m.get('2026-10-05').valeur, 5);
});

test('humeursDuJour : inconnue quand il n\'y a rien, sans entrée ni valeur par défaut', () => {
  const journal = [{ date: '2026-10-04', humeur: null }, { date: '2026-10-05' }];
  const m = humeursDuJour({ journal, humeurs: [] });
  assert.equal(m.size, 0);
  assert.equal(m.get('2026-10-04'), undefined);
  assert.equal(humeursDuJour({}).size, 0);
  assert.equal(humeursDuJour({ journal: undefined, humeurs: undefined }).size, 0);
});

test('humeursDuJour : une valeur hors 1 à 10 ou non entière n\'est pas une humeur', () => {
  const journal = [{ date: '2026-10-04', humeur: 11 }, { date: '2026-10-05', humeur: 5.5 }, { date: '2026-10-06', humeur: 0 }];
  const humeurs = [releve('2026-10-07', '10:00', 12), releve('2026-10-07', '11:00', 6.5), releve('2026-10-07', '12:00', '7')];
  assert.equal(humeursDuJour({ journal, humeurs }).size, 0);
});

test('humeursDuJour : un relevé qui n\'a que l\'énergie est ignoré', () => {
  const soloEnergie = releve('2026-10-05', '10:00', null, { energie: 'energie:basse' });
  // Seul : pas d'humeur ce jour-là.
  assert.equal(humeursDuJour({ journal: [], humeurs: [soloEnergie] }).size, 0);
  // Avec un soir : ce n'est pas un relevé d'humeur, le soir reste la valeur.
  assert.deepEqual(humeursDuJour({ journal: [{ date: '2026-10-05', humeur: 7 }], humeurs: [soloEnergie] }).get('2026-10-05'),
    { valeur: 7, min: 7, max: 7, n: 1, source: 'soir' });
  // Avec d'autres relevés : ni la moyenne ni le nombre ne bougent.
  const humeurs = [soloEnergie, releve('2026-10-05', '13:00', 4), releve('2026-10-05', '18:00', 8, { energie: 'energie:haute' })];
  assert.deepEqual(humeursDuJour({ journal: [], humeurs }).get('2026-10-05'), { valeur: 6, min: 4, max: 8, n: 2, source: 'moment' });
});

test('humeursDuJour : un relevé sans heure se rattache à sa date', () => {
  const humeurs = [{ id: 'x', date: '2026-10-05', humeur: 6 }];
  assert.equal(humeursDuJour({ journal: [], humeurs }).get('2026-10-05').valeur, 6);
});

test('avecHumeurDuJour : copie les entrées et pose les cinq champs de l\'humeur du jour', () => {
  const journal = [{ date: '2026-10-05', humeur: 9, sommeilRessenti: 'sommeil:bien', explosions: 1 }];
  const humeurs = [releve('2026-10-05', '09:00', 3), releve('2026-10-05', '19:00', 8)];
  const [j] = avecHumeurDuJour(journal, humeurs);
  assert.deepEqual(j, {
    date: '2026-10-05', sommeilRessenti: 'sommeil:bien', explosions: 1,
    humeur: 5.5, humeurMin: 3, humeurMax: 8, humeurN: 2, humeurSource: 'moment',
  });
});

test('avecHumeurDuJour : ne modifie pas ce qu\'on lui passe', () => {
  const journal = [{ date: '2026-10-05', humeur: 9 }];
  const humeurs = [releve('2026-10-05', '09:00', 3)];
  const avant = JSON.stringify([journal, humeurs]);
  const sortie = avecHumeurDuJour(journal, humeurs);
  assert.equal(JSON.stringify([journal, humeurs]), avant);
  assert.notEqual(sortie[0], journal[0]);
  assert.equal(journal[0].humeur, 9);
});

test('avecHumeurDuJour : un jour passé sans relevé garde son humeur du soir', () => {
  const [j] = avecHumeurDuJour([{ date: '2026-10-04', humeur: 6, lieu: 'lieu:x' }], []);
  assert.deepEqual(j, { date: '2026-10-04', lieu: 'lieu:x', humeur: 6, humeurMin: 6, humeurMax: 6, humeurN: 1, humeurSource: 'soir' });
});

test('avecHumeurDuJour : inconnue, les cinq champs disent qu\'il n\'y a rien', () => {
  const sortie = avecHumeurDuJour([{ date: '2026-10-04', humeur: null, lieu: 'lieu:x' }, { date: '2026-10-05', humeur: 12 }], []);
  assert.deepEqual(sortie[0], { date: '2026-10-04', lieu: 'lieu:x', humeur: null, humeurMin: null, humeurMax: null, humeurN: 0, humeurSource: null });
  assert.equal(sortie[1].humeur, null, 'une valeur hors 1 à 10 n\'est pas gardée');
  assert.equal(sortie[1].humeurSource, null);
});

test('avecHumeurDuJour : un jour qui n\'a que des relevés reçoit une entrée minimale', () => {
  const journal = [{ date: '2026-10-04', humeur: 6 }];
  const humeurs = [releve('2026-10-05', '10:00', 4), releve('2026-10-05', '15:00', 6, { vers: true })];
  const sortie = avecHumeurDuJour(journal, humeurs);
  assert.equal(sortie.length, 2);
  assert.deepEqual(sortie[1], { date: '2026-10-05', humeur: 5, humeurMin: 4, humeurMax: 6, humeurN: 2, humeurSource: 'moment' });
});

test('avecHumeurDuJour : pas d\'entrée pour un jour qui n\'a que des relevés sans humeur', () => {
  const humeurs = [releve('2026-10-05', '10:00', null, { energie: 'energie:haute' })];
  assert.deepEqual(avecHumeurDuJour([], humeurs), []);
});

test('avecHumeurDuJour : un relevé à 01:00 ajoute une entrée à la veille, et trie par date', () => {
  const journal = [{ date: '2026-10-07', humeur: 5 }, { date: '2026-10-03', humeur: 7 }];
  const humeurs = [releve('2026-10-06', '01:00', 2), releve('2026-10-05', '12:00', 9)];
  const sortie = avecHumeurDuJour(journal, humeurs);
  assert.deepEqual(sortie.map((j) => j.date), ['2026-10-03', '2026-10-05', '2026-10-07']);
  // Le relevé de 01:00 le 6 tombe sur le 5, avec celui de 12:00.
  assert.deepEqual(sortie[1], { date: '2026-10-05', humeur: 5.5, humeurMin: 2, humeurMax: 9, humeurN: 2, humeurSource: 'moment' });
});

test('avecHumeurDuJour : sans rien, une liste vide', () => {
  assert.deepEqual(avecHumeurDuJour([], []), []);
  assert.deepEqual(avecHumeurDuJour(undefined, undefined), []);
});
