import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { ErreurValidation } from '../../public/js/domain/champs.js';

test('base neuve : 97 éléments de liste, aujourd\'hui suit le jour logique', async () => {
  const { repo, horloge } = nouveauRepo();
  assert.equal((await repo.listes.items()).length, 97);
  assert.equal(repo.aujourdhui(), '2026-09-30');
  horloge.t = new Date(2026, 9, 1, 1, 30);
  assert.equal(repo.aujourdhui(), '2026-09-30');
  assert.equal(await repo.meta.lire('schema'), 1);
});

test('journal : patch partiel, fusion, horodatage, marque d\'écriture', async () => {
  const { repo, changements } = nouveauRepo();
  await repo.journal.patch('2026-09-30', { humeur: 6 });
  const e = await repo.journal.patch('2026-09-30', { lieu: 'lieu:bureau', explosions: 0 });
  assert.equal(e.humeur, 6);
  assert.equal(e.lieu, 'lieu:bureau');
  assert.equal(e.explosions, 0);
  assert.equal(e.notes, null);
  assert.ok(e.createdAt && e.updatedAt);
  assert.ok(await repo.meta.lire('derniereEcriture'));
  assert.deepEqual(changements.map((c) => c.store), ['journal', 'journal']);
});

test('journal : tout repasser à null supprime le jour', async () => {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-30', { humeur: 6 });
  assert.equal(await repo.journal.patch('2026-09-30', { humeur: null }), null);
  assert.equal(await repo.journal.lire('2026-09-30'), null);
});

test('deux patch rapides ne perdent rien', async () => {
  const { repo } = nouveauRepo();
  await Promise.all([
    repo.journal.patch('2026-09-30', { humeur: 7 }),
    repo.journal.patch('2026-09-30', { sommeilRessenti: 'sommeil:bien' }),
    repo.journal.patch('2026-09-30', { contactHumain: true }),
  ]);
  const e = await repo.journal.lire('2026-09-30');
  assert.equal(e.humeur, 7);
  assert.equal(e.sommeilRessenti, 'sommeil:bien');
  assert.equal(e.contactHumain, true);
});

test('référence inconnue ou valeur hors bornes : rien n\'est écrit', async () => {
  const { repo } = nouveauRepo();
  await assert.rejects(repo.journal.patch('2026-09-30', { lieu: 'lieu:lune' }), /référence inconnue/);
  await assert.rejects(repo.journal.patch('2026-09-30', { humeur: 12 }), ErreurValidation);
  assert.equal(await repo.journal.lire('2026-09-30'), null);
});

test('épisodes : créer, modifier, rattachement par jourEvenement', async () => {
  const { repo } = nouveauRepo();
  const ep = await repo.episodes.creer({ date: '2026-10-01', heure: '01:30', declencheur: 'declencheur:pris_pour_un_con' });
  assert.match(ep.id, /^ep_[0-9a-f]{16}$/);
  await repo.episodes.modifier(ep.id, { emotion: 'emotion:colere', intensite: 7 });
  await repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:surcharge' });
  await repo.episodes.creer({ date: '2026-10-01', heure: '09:00', emotion: 'emotion:calme' });
  const du30 = await repo.episodes.parJour('2026-09-30', '2026-09-30');
  assert.deepEqual(du30.map((e) => e.heure), ['18:42', '01:30']);
  const lu = await repo.episodes.lire(ep.id);
  assert.equal(lu.intensite, 7);
  assert.equal(lu.declencheur, 'declencheur:pris_pour_un_con');
});

test('supprimer puis restaurer un épisode avec son mémo', async () => {
  const { repo } = nouveauRepo();
  const ep = await repo.episodes.creer({ date: '2026-09-30', emotion: 'emotion:honte' });
  await repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, dureeMs: 2000, mime: 'audio/mp4', data: new ArrayBuffer(16) });
  const sauve = await repo.episodes.supprimer(ep.id);
  assert.equal(sauve.audios.length, 1);
  assert.equal(await repo.episodes.lire(ep.id), null);
  assert.equal((await repo.audios.parParent('episodes', ep.id)).length, 0);
  await repo.episodes.restaurer(sauve);
  assert.ok(await repo.episodes.lire(ep.id));
  assert.equal((await repo.audios.parParent('episodes', ep.id)).length, 1);
});

test('mémo du jour : crée l\'entrée, la garde même vide, part avec le dernier mémo', async () => {
  const { repo } = nouveauRepo();
  const a = await repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 24000, mime: 'audio/mp4', data: new ArrayBuffer(8) });
  assert.ok(await repo.journal.lire('2026-09-30'));
  await repo.journal.patch('2026-09-30', { humeur: 5 });
  assert.ok(await repo.journal.patch('2026-09-30', { humeur: null }), 'gardé car un mémo y est rattaché');
  const sup = await repo.audios.supprimer(a.id);
  assert.ok(sup.parent, 'entrée vide retirée avec le mémo');
  assert.equal(await repo.journal.lire('2026-09-30'), null);
  await repo.audios.restaurer(sup);
  assert.ok(await repo.journal.lire('2026-09-30'));
  const metas = await repo.audios.metas();
  assert.equal(metas.length, 1);
  assert.equal('data' in metas[0], false);
});

test('mémo sur une fiche inexistante : refus', async () => {
  const { repo } = nouveauRepo();
  await assert.rejects(repo.audios.creer({ parentStore: 'episodes', parentId: 'ep_x', data: new ArrayBuffer(1) }), /introuvable/i);
  await assert.rejects(repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', data: 'pas un buffer' }), /audio invalides/);
});

test('rendez-vous : un RDV sans date reste visible', async () => {
  const { repo } = nouveauRepo();
  await repo.rdv.creer({ professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Sommeil' }] });
  await repo.rdv.creer({ date: '2026-10-14', heure: '10:30', professionnel: 'professionnel:psychiatre' });
  assert.equal((await repo.rdv.tous()).length, 2);
});

test('journal.supprimer puis restaurer, plage et dates', async () => {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-29', { humeur: 4 });
  await repo.journal.patch('2026-09-30', { humeur: 6 });
  await repo.journal.patch('2026-10-01', { humeur: 8 });
  assert.deepEqual((await repo.journal.plage('2026-09-29', '2026-09-30')).map((e) => e.humeur), [4, 6]);
  const sauve = await repo.journal.supprimer('2026-09-30');
  assert.deepEqual(await repo.journal.dates(), ['2026-09-29', '2026-10-01']);
  await repo.journal.restaurer(sauve);
  assert.equal((await repo.journal.tous()).length, 3);
});

test('listes : créer réutilise un libellé équivalent, réactive un archivé', async () => {
  const { repo } = nouveauRepo();
  const exist = await repo.listes.creer('emotion', 'vide/RIEN');
  assert.equal(exist.id, 'emotion:vide_rien');
  const nouv = await repo.listes.creer('emotion', 'Lassitude');
  assert.match(nouv.id, /^emotion:u-[0-9a-f]{8}$/);
  assert.equal(nouv.ordre, 180);
  await repo.listes.archiver(nouv.id);
  const react = await repo.listes.creer('emotion', 'lassitude');
  assert.equal(react.id, nouv.id);
  assert.equal(react.archive, false);
});

test('listes : renommer garde l\'ancien libellé en alias, refuse un doublon', async () => {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-30', { lieu: 'lieu:bureau' });
  const r = await repo.listes.renommer('lieu:bureau', 'Bureau (site)');
  assert.deepEqual(r.alias, ['Bureau']);
  assert.equal((await repo.listes.trouver('lieu', 'bureau')).id, 'lieu:bureau');
  await assert.rejects(repo.listes.renommer('lieu:bureau', 'Télétravail'), (e) => e.code === 'LIBELLE_EXISTANT');
  assert.equal((await repo.journal.lire('2026-09-30')).lieu, 'lieu:bureau');
});

test('listes à sens fixe : renommer seulement', async () => {
  const { repo } = nouveauRepo();
  await repo.listes.renommer('sommeil:mal', 'Mauvaise nuit');
  await assert.rejects(repo.listes.creer('sommeil', 'Excellent'), (e) => e.code === 'SENS_FIXE');
  await assert.rejects(repo.listes.archiver('sommeil:mal'), (e) => e.code === 'SENS_FIXE');
  await assert.rejects(repo.listes.reordonner('sommeil', ['sommeil:bien']), (e) => e.code === 'SENS_FIXE');
});

test('listes : réordonner et restaurer', async () => {
  const { repo } = nouveauRepo();
  await repo.listes.reordonner('lieu', ['lieu:autre', 'lieu:bureau']);
  const ids = (await repo.listes.items('lieu')).map((i) => i.id);
  assert.deepEqual(ids.slice(0, 3), ['lieu:autre', 'lieu:bureau', 'lieu:teletravail']);
  await repo.listes.archiver('lieu:clinique');
  assert.equal((await repo.listes.restaurer('lieu:clinique')).archive, false);
});

test('traitements et symptômes', async () => {
  const { repo } = nouveauRepo();
  const tr = await repo.traitements.creer({ date: '2026-09-30', effetsSecondaires: ['effetSecondaire:aucun'], effetRessenti: 'effetRessenti:stable' });
  assert.deepEqual((await repo.traitements.parJour('2026-09-30', '2026-09-30')).map((x) => x.id), [tr.id]);
  const sy = await repo.symptomes.creer({ date: '2026-09-30', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures' });
  assert.equal((await repo.symptomes.modifier(sy.id, { symptome: null, intensite: null, duree: null })), null, 'fiche vidée supprimée');
});

test('méta : lire et écrire', async () => {
  const { repo } = nouveauRepo();
  assert.equal(await repo.meta.lire('reglages'), null);
  await repo.meta.ecrire('reglages', { signal: true });
  assert.deepEqual(await repo.meta.lire('reglages'), { signal: true });
});

test('Annuler la suppression d\'un mémo n\'écrase pas une saisie faite entre-temps', async () => {
  const { repo, changements } = nouveauRepo();
  const a = await repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 1000, data: new ArrayBuffer(4) });
  const sauve = await repo.audios.supprimer(a.id);
  assert.equal(await repo.journal.lire('2026-09-30'), null);
  await repo.journal.patch('2026-09-30', { humeur: 6 });
  changements.length = 0;
  assert.equal(await repo.audios.restaurer(sauve), true);
  assert.equal((await repo.journal.lire('2026-09-30')).humeur, 6);
  assert.equal((await repo.audios.parParent('journal', '2026-09-30')).length, 1);
  assert.deepEqual(changements.map((c) => c.store), ['journal', 'audios']);
});

test('Annuler « journée effacée » garde ce qui a été saisi entre-temps', async () => {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-30', { humeur: 4, lieu: 'lieu:bureau' });
  const sauve = await repo.journal.supprimer('2026-09-30');
  await repo.journal.patch('2026-09-30', { humeur: 7 });
  await repo.journal.restaurer(sauve);
  const e = await repo.journal.lire('2026-09-30');
  assert.equal(e.humeur, 7);
  assert.equal(e.lieu, 'lieu:bureau');
});

test('dernier mémo d\'un épisode vide : la fiche part avec lui, et revient avec Annuler', async () => {
  const { repo } = nouveauRepo();
  const ep = await repo.episodes.creer({ date: '2026-09-30', heure: '10:00' });
  const a = await repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, data: new ArrayBuffer(2) });
  assert.equal(a.date, '2026-09-30', 'date du mémo = date de sa fiche');
  const sauve = await repo.audios.supprimer(a.id);
  assert.equal(await repo.episodes.lire(ep.id), null);
  await repo.audios.restaurer(sauve);
  assert.ok(await repo.episodes.lire(ep.id));
  assert.equal((await repo.audios.parParent('episodes', ep.id)).length, 1);
});

test('jamais de mémo orphelin : fiche disparue entre-temps', async () => {
  const { repo } = nouveauRepo();
  const ep = await repo.episodes.creer({ date: '2026-09-30', emotion: 'emotion:peur' });
  const a = await repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, data: new ArrayBuffer(2) });
  const sauve = await repo.audios.supprimer(a.id);
  await repo.episodes.supprimer(ep.id);
  assert.equal(await repo.audios.restaurer(sauve), false);
  assert.equal((await repo.audios.metas()).length, 0);
});

test('épisode : retirer le seul choix supprime la fiche malgré l\'heure préremplie', async () => {
  const { repo } = nouveauRepo();
  const ep = await repo.episodes.creer({ date: '2026-09-30', heure: '18:42', declencheur: 'declencheur:injustice' });
  assert.equal(await repo.episodes.modifier(ep.id, { declencheur: null }), null);
  assert.equal(await repo.episodes.lire(ep.id), null);
});

test('creer avec un id fourni est idempotent (nouvel essai sans doublon)', async () => {
  const { repo } = nouveauRepo();
  await repo.episodes.creer({ date: '2026-09-30', emotion: 'emotion:joie' }, { id: 'ep_fixe' });
  await repo.episodes.creer({ date: '2026-09-30', emotion: 'emotion:joie' }, { id: 'ep_fixe' });
  assert.equal((await repo.episodes.tous()).length, 1);
});

test('meta.ecrire marque une écriture, sauf pour les méta techniques', async () => {
  const { repo, horloge } = nouveauRepo();
  horloge.t = new Date(2026, 8, 30, 22, 0);
  await repo.meta.ecrire('reglages', { signal: false });
  assert.equal(await repo.meta.lire('derniereEcriture'), horloge.t.toISOString());
  const avant = horloge.t.toISOString();
  horloge.t = new Date(2026, 8, 30, 23, 0);
  await repo.meta.ecrire('derniereSauvegarde', horloge.t.toISOString());
  assert.equal(await repo.meta.lire('derniereEcriture'), avant);
});

test('listes.libelles rend la carte id → libellé, archivés compris', async () => {
  const { repo } = nouveauRepo();
  await repo.listes.archiver('lieu:clinique');
  const carte = await repo.listes.libelles();
  assert.equal(carte.get('lieu:bureau'), 'Bureau');
  assert.equal(carte.get('lieu:clinique'), 'Clinique');
});

test('une écriture non attendue qui échoue rejette avec sa vraie cause', async () => {
  const { repo } = nouveauRepo();
  await repo.journal.patch('2026-09-30', { humeur: 5 });
  await assert.rejects(repo.tx(['journal'], 'readwrite', (t) => { t.objectStore('journal').add({ date: '2026-09-30' }); }), (e) => e && e.name === 'ConstraintError');
});
