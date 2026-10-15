import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { lireTout } from '../../public/js/db/sauvegarde.js';
import { verifierDonnees } from '../../public/js/domain/verification.js';

const memo = (parentStore, parentId) => ({ parentStore, parentId, dureeMs: 1000, mime: 'audio/mp4', data: new ArrayBuffer(8) });

// Une base inventée avec une fiche dans chaque table de saisie et un mémo sur trois d'entre elles.
async function baseSaine() {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-29', { humeur: 4, lieu: 'lieu:teletravail' });
  await repo.journal.patch('2026-09-30', { humeur: 6, pointsPositifs: 'marche' });
  const ep = await repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:pris_pour_un_con' });
  const sy = await repo.symptomes.creer({ date: '2026-09-30', symptome: 'symptome:crise_angoisse', intensite: 5 });
  await repo.traitements.creer({ date: '2026-09-30', changement: 'inventé' });
  const rdv = await repo.rdv.creer({ date: '2026-10-02', professionnel: 'professionnel:psychiatre' });
  await repo.humeurs.creer({ date: '2026-09-30', heure: '12:00', humeur: 5 });
  await repo.audios.creer(memo('journal', '2026-09-30'));
  await repo.audios.creer(memo('episodes', ep.id));
  await repo.audios.creer(memo('symptomes', sy.id));
  await repo.audios.creer(memo('rdv', rdv.id));
  return lireTout(repo);
}

test('base saine : un nombre par table, aucun mémo sans fiche, aucune fiche illisible', async () => {
  const instantane = await baseSaine();
  const res = verifierDonnees(instantane);
  assert.deepEqual(Object.keys(res).sort(), ['fichesIllisibles', 'memosSansFiche', 'parTable']);
  assert.equal(res.memosSansFiche, 0);
  assert.equal(res.fichesIllisibles, 0);
  for (const [store, lignes] of Object.entries(instantane)) assert.equal(res.parTable[store], lignes.length, store);
  assert.equal(res.parTable.journal, 2);
  assert.equal(res.parTable.episodes, 1);
  assert.equal(res.parTable.audios, 4);
  assert.ok(res.parTable.listes > 0, 'les listes par défaut sont comptées');
});

test('une base vide, ou sans instantané, donne des zéros', () => {
  assert.deepEqual(verifierDonnees({}), { parTable: {}, memosSansFiche: 0, fichesIllisibles: 0 });
  assert.deepEqual(verifierDonnees(null), { parTable: {}, memosSansFiche: 0, fichesIllisibles: 0 });
  assert.deepEqual(verifierDonnees(undefined), { parTable: {}, memosSansFiche: 0, fichesIllisibles: 0 });
  const res = verifierDonnees({ journal: [], episodes: [], audios: [] });
  assert.deepEqual(res, { parTable: { journal: 0, episodes: 0, audios: 0 }, memosSansFiche: 0, fichesIllisibles: 0 });
});

test('un mémo dont la fiche n\'existe plus est compté, les autres non', async () => {
  const instantane = await baseSaine();
  // La fiche de l'épisode disparaît : son mémo devient orphelin, les trois autres gardent la leur.
  const sansEpisode = { ...instantane, episodes: [] };
  const res = verifierDonnees(sansEpisode);
  assert.equal(res.memosSansFiche, 1);
  assert.equal(res.fichesIllisibles, 0);
  assert.equal(res.parTable.audios, 4);
  assert.equal(res.parTable.episodes, 0);
});

test('le parent du journal se cherche par date, les autres par id', () => {
  const instantane = {
    journal: [{ date: '2026-09-30', humeur: 5 }],
    episodes: [{ id: 'ep_1', date: '2026-09-30', emotion: 'emotion:colere' }],
    audios: [
      { id: 'au_1', parentStore: 'journal', parentId: '2026-09-30' },
      { id: 'au_2', parentStore: 'journal', parentId: '2026-10-01' },
      { id: 'au_3', parentStore: 'episodes', parentId: 'ep_1' },
      // Le bon identifiant dans la mauvaise table, et une date de journal dans les épisodes : orphelins.
      { id: 'au_4', parentStore: 'symptomes', parentId: 'ep_1' },
      { id: 'au_5', parentStore: 'episodes', parentId: '2026-09-30' },
    ],
  };
  const res = verifierDonnees(instantane);
  assert.equal(res.memosSansFiche, 3);
  assert.equal(res.fichesIllisibles, 0);
});

test('un mémo sans parent connu ou mal formé est sans fiche', () => {
  const res = verifierDonnees({
    journal: [{ date: '2026-09-30' }],
    audios: [
      { id: 'au_1', parentStore: 'humeurs', parentId: 'hu_1' },
      { id: 'au_2', parentStore: 'journal' },
      { id: 'au_3', parentId: '2026-09-30' },
      { id: 'au_4', parentStore: 'journal', parentId: 20260930 },
      null,
    ],
  });
  assert.equal(res.memosSansFiche, 5);
});

test('une fiche illisible est comptée, et reste la fiche de son mémo', () => {
  const instantane = {
    journal: [
      { date: '2026-09-29', humeur: 4 },
      { date: '2026-09-30', humeur: 11 },
    ],
    audios: [{ id: 'au_1', parentStore: 'journal', parentId: '2026-09-30' }],
  };
  const res = verifierDonnees(instantane);
  assert.equal(res.fichesIllisibles, 1);
  assert.equal(res.memosSansFiche, 0);
  assert.equal(res.parTable.journal, 2);
});

test('les différentes façons d\'être illisible, dans chaque table de saisie', () => {
  const res = verifierDonnees({
    journal: [{ date: 'hier' }, { humeur: 5 }],
    episodes: [{ id: 'ep_1', date: '2026-09-30', emotion: 'lieu:bureau' }, { date: '2026-09-30' }, { id: 'ep_3', date: '2026-09-30', intensite: 0 }],
    symptomes: [{ id: 'sy_1', date: '2026-09-30', intensite: 'forte' }],
    traitements: [{ id: 'tr_1', date: '2026-09-30', effetsSecondaires: 'fatigue' }],
    rdv: [{ id: 'rdv_1', heure: '25:99' }],
    humeurs: [{ id: 'hu_1', date: '2026-09-30', heure: '12:00', humeur: 3.5 }],
    listes: [{ id: 'lieu:x', liste: 'lieu', libelle: 'Libellé qui n\'est pas une fiche' }],
    meta: [{ cle: 'inconnue', valeur: 1 }],
  });
  // journal 2, épisodes 3, symptômes 1, traitements 1, rendez-vous 1 (heure), humeurs 1. Listes et méta ne sont pas des fiches.
  assert.equal(res.fichesIllisibles, 9);
  assert.equal(res.parTable.listes, 1);
  assert.equal(res.parTable.meta, 1);
});

test('une entrée absente, nulle ou qui n\'est pas un objet est illisible, sans lever d\'erreur', () => {
  const res = verifierDonnees({ journal: [null, undefined, 'texte', 42, [], { date: '2026-09-30' }], episodes: 'pas un tableau' });
  assert.equal(res.fichesIllisibles, 5);
  assert.equal(res.parTable.journal, 6);
  assert.equal(res.parTable.episodes, undefined);
});

test('un champ inconnu ou une référence de liste inexistante ne rend pas la fiche illisible', () => {
  // Les ids inconnus sont gardés tels quels à l'import (jamais de perte) : ce n'est pas une erreur de lecture.
  const res = verifierDonnees({
    journal: [{ date: '2026-09-30', humeur: 5, champFutur: 'x', lieu: 'lieu:inconnu_publie_un_jour' }],
  });
  assert.equal(res.fichesIllisibles, 0);
});

test('le résultat ne contient que des nombres, jamais un libellé ni un texte', async () => {
  const instantane = await baseSaine();
  instantane.journal.push({ date: '2026-10-01', humeur: 99, pointsPositifs: 'TEXTE-LIBRE-SECRET' });
  instantane.listes.push({ id: 'lieu:x', liste: 'lieu', libelle: 'LIBELLE-SECRET' });
  const res = verifierDonnees(instantane);
  const nombres = [...Object.values(res.parTable), res.memosSansFiche, res.fichesIllisibles];
  for (const n of nombres) assert.ok(Number.isInteger(n) && n >= 0, String(n));
  const json = JSON.stringify(res);
  assert.ok(!json.includes('SECRET'));
  // Seules les clés du résultat et les noms de tables de l'instantané ont le droit d'être du texte.
  const cles = ['parTable', 'memosSansFiche', 'fichesIllisibles', ...Object.keys(instantane)];
  const restant = cles.reduce((j, cle) => j.split(`"${cle}"`).join(''), json);
  assert.ok(!/[a-z]{4,}/i.test(restant), json);
});

test('l\'instantané lu n\'est pas modifié', async () => {
  const instantane = await baseSaine();
  const copie = structuredClone(instantane);
  verifierDonnees(instantane);
  assert.deepEqual(instantane, copie);
});
