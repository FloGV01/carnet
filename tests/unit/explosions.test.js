import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explosionsParJour, valeurExplosions, journalAvecExplosions, saisieDuSoir } from '../../public/js/domain/explosions.js';
import { avecHumeurDuJour } from '../../public/js/analyse/humeur-jour.js';

const ep = (date, heure, reaction = 'reaction:explosion') => ({ id: `${date}${heure}`, date, heure, reaction });
const V4 = '2026-09-29';

test('épisodes « Explosion » comptés par jour logique (avant 4 h, la veille) ; les autres réactions jamais', () => {
  const n = explosionsParJour([ep('2026-10-01', '01:30'), ep('2026-10-01', '18:00'), ep('2026-10-01', '19:00', 'reaction:rien_fait')]);
  assert.deepEqual([...n], [['2026-09-30', 1], ['2026-10-01', 1]]);
});

test('le plus grand des deux, jamais la somme ; zéro seulement si le jour est noté et depuis la v4', () => {
  assert.equal(valeurExplosions(2, 1), 2);
  assert.equal(valeurExplosions(0, 1), 1);
  assert.equal(valeurExplosions(null, 2), 2);
  const opt = { jourNote: true, zeroSiNote: true, zeroDepuis: V4 };
  assert.equal(valeurExplosions(null, 0, { ...opt, date: '2026-09-30' }), 0);
  assert.equal(valeurExplosions(null, 0, { ...opt, date: '2026-09-28' }), null, 'avant la v4, un compteur vide reste inconnu');
  assert.equal(valeurExplosions(null, 2, { ...opt, date: '2026-09-28' }), 2);
  assert.equal(valeurExplosions(null, 0, { ...opt, zeroSiNote: false, date: '2026-09-30' }), null);
  assert.equal(valeurExplosions(null, 0, { jourNote: true, zeroSiNote: true, date: '2026-09-30' }), null, 'sans date de bascule : sémantique v3');
});

test('journal recalculé : anciens compteurs gardés, champ masqué toujours compté, jours d\'épisode seuls à part', () => {
  const journal = [{ date: '2026-09-27', humeur: 5 }, { date: '2026-09-28', explosions: 2, humeur: 5 }, { date: '2026-09-29', humeur: 6, explosions: null }, { date: '2026-09-30', humeur: 4 }];
  const r = journalAvecExplosions(journal, [ep('2026-09-30', '12:00'), ep('2026-10-01', '09:00')], { zeroDepuis: V4, jourNote: saisieDuSoir(journal) });
  assert.deepEqual(r.map((j) => [j.date, j.explosions ?? null]), [['2026-09-27', null], ['2026-09-28', 2], ['2026-09-29', 0], ['2026-09-30', 1], ['2026-10-01', 1]]);
  assert.equal(r[1], journal[1], 'entrée inchangée réutilisée telle quelle');
  const sansAjout = journalAvecExplosions(journal, [ep('2026-10-01', '09:00')], { zeroDepuis: V4, ajouterJours: false });
  assert.deepEqual(sansAjout.map((j) => j.date), journal.map((j) => j.date), 'aucune journée fabriquée pour le moteur');
});

test('jourNote omis : aucun zéro n\'est compté, un jour de relevés seuls n\'est jamais « 0 explosion »', () => {
  const brut = [{ date: '2026-09-30', humeur: 4 }];
  const enrichi = avecHumeurDuJour(brut, [{ id: 'hu1', date: '2026-10-01', heure: '09:00', humeur: 6 }]);
  assert.deepEqual(enrichi.map((j) => j.date), ['2026-09-30', '2026-10-01'], 'le jour de relevés seuls est bien dans le journal enrichi');
  const valeurs = (r) => r.map((j) => [j.date, j.explosions ?? null]);
  assert.deepEqual(valeurs(journalAvecExplosions(enrichi, [], { zeroDepuis: V4 })), [['2026-09-30', null], ['2026-10-01', null]]);
  // Avec le prédicat du journal brut : le soir noté vaut 0, le jour de relevés seuls reste inconnu.
  assert.deepEqual(valeurs(journalAvecExplosions(enrichi, [], { zeroDepuis: V4, jourNote: saisieDuSoir(brut) })), [['2026-09-30', 0], ['2026-10-01', null]]);
});
