import { test } from 'node:test';
import assert from 'node:assert/strict';
import { episodesRecents, premierJourRecent, ligneEpisodeRecent } from '../../public/js/domain/apres-coup.js';

const ep = (id, date, heure, plus = {}) => ({ id, date, heure, ...plus });
const AUJOURDHUI = '2026-10-15';
const ids = (liste) => liste.map((e) => e.id);

test('premierJourRecent : sept jours logiques, aujourd\'hui compris', () => {
  assert.equal(premierJourRecent('2026-10-15'), '2026-10-09');
  assert.equal(premierJourRecent('2026-03-02'), '2026-02-24');
});

test('episodesRecents : les sept derniers jours logiques, rattachés par jourEvenement (un épisode à 02:00 compte pour la veille)', () => {
  const liste = [
    ep('aujourdhui', '2026-10-15', '18:00'),
    ep('limite-basse', '2026-10-09', '12:00'), // le plus ancien des sept jours
    ep('juste-avant', '2026-10-08', '23:00'), // hors fenêtre
    ep('nuit-dans', '2026-10-10', '02:00'), // 02:00 le 10 : jour logique du 9, dedans
    ep('nuit-hors', '2026-10-09', '02:00'), // 02:00 le 9 : jour logique du 8, dehors
    ep('apres-minuit', '2026-10-16', '02:00'), // 02:00 le 16 : encore le 15
    ep('lendemain', '2026-10-16', '05:00'), // le 16, pas encore arrivé
    ep('sans-heure', '2026-10-12', null),
  ];
  assert.deepEqual(ids(episodesRecents(liste, AUJOURDHUI)), ['apres-minuit', 'aujourdhui', 'sans-heure', 'nuit-dans', 'limite-basse']);
});

test('episodesRecents : du plus récent au plus ancien, sans toucher à la liste reçue, quel que soit son ordre', () => {
  const liste = [
    ep('c', '2026-10-13', '09:00'), ep('a', '2026-10-15', '08:00'), ep('d', '2026-10-13', '07:30'),
    ep('b', '2026-10-14', '23:50'), ep('e', '2026-10-13', null),
  ];
  const copie = structuredClone(liste);
  assert.deepEqual(ids(episodesRecents(liste, AUJOURDHUI)), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(liste, copie);
});

test('episodesRecents : après minuit, un épisode reste après ceux de la soirée du même jour logique', () => {
  const liste = [ep('soir', '2026-10-14', '23:00'), ep('nuit', '2026-10-15', '01:30'), ep('matin', '2026-10-14', '08:00')];
  assert.deepEqual(ids(episodesRecents(liste, AUJOURDHUI)), ['nuit', 'soir', 'matin']);
});

test('episodesRecents : tout épisode de la fenêtre est rendu, rien d\'autre ; une liste absente ou une fiche sans date ne casse rien', () => {
  assert.deepEqual(episodesRecents([], AUJOURDHUI), []);
  assert.deepEqual(episodesRecents(null, AUJOURDHUI), []);
  assert.deepEqual(episodesRecents(undefined, AUJOURDHUI), []);
  assert.deepEqual(ids(episodesRecents([ep('x', undefined, '10:00'), null, ep('y', '2026-10-15', '10:00')], AUJOURDHUI)), ['y']);
});

const CARTE = new Map([['emotion:colere', 'Colère'], ['declencheur:bruit', 'Bruit']]);

test('ligneEpisodeRecent : « sam 10/10 18:42 · Colère · 7 »', () => {
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-10', '18:42', { emotion: 'emotion:colere', intensite: 7 }), CARTE), 'sam 10/10 18:42 · Colère · 7');
});

test('ligneEpisodeRecent : le jour est le jour logique (02:00 le 11 se lit le 10) ; sans heure, sans émotion, sans intensité', () => {
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-11', '02:00', { emotion: 'emotion:colere', intensite: 4 }), CARTE), 'sam 10/10 02:00 · Colère · 4');
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-10', null, { emotion: 'emotion:colere' }), CARTE), 'sam 10/10 · Colère');
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-10', '18:42', { intensite: 3 }), CARTE), 'sam 10/10 18:42 · 3');
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-10', '18:42', { declencheur: 'declencheur:bruit' }), CARTE), 'sam 10/10 18:42 · Bruit');
  assert.equal(ligneEpisodeRecent(ep('a', '2026-10-10', '18:42'), CARTE), 'sam 10/10 18:42 · Épisode');
});

test('ligneEpisodeRecent : toutes les lignes ont la même forme, sans nombre ajouté ni état', () => {
  const lignes = [
    ep('a', '2026-10-10', '18:42', { emotion: 'emotion:colere', intensite: 7, apresCoup: { types: ['typeExplosion:colere'], siJe: 'x' } }),
    ep('b', '2026-10-11', '02:00', { emotion: 'emotion:colere', intensite: 4 }),
    ep('c', '2026-10-12', null),
  ].map((e) => ligneEpisodeRecent(e, CARTE));
  for (const l of lignes) assert.match(l, /^[a-z]{3} \d\d\/\d\d( \d\d:\d\d)?( · [^·]+){1,2}$/, l);
  assert.ok(!lignes.some((l) => /fait|faire|✓|\//.test(l.replace(/^[a-z]{3} \d\d\/\d\d/, ''))), 'aucun état dans la ligne');
});
