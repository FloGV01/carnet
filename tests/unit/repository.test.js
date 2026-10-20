import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { ErreurValidation } from '../../public/js/domain/champs.js';
import { versDateHeure } from '../../public/js/domain/dates.js';

test('base neuve : 197 éléments de liste (v1, v4 et v6), aujourd\'hui suit le jour logique', async () => {
  const { repo, horloge } = nouveauRepo();
  assert.equal((await repo.listes.items()).length, 197);
  assert.equal(repo.aujourdhui(), '2026-09-30');
  horloge.t = new Date(2026, 9, 1, 1, 30);
  assert.equal(repo.aujourdhui(), '2026-09-30');
  assert.equal(await repo.meta.lire('schema'), 5);
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

test('v4 : humeurs du moment par jour logique, références vérifiées, suppression puis Annuler', async () => {
  const { repo } = nouveauRepo();
  const a = await repo.humeurs.creer({ date: '2026-10-01', heure: '01:30', humeur: 4, energie: 'energie:basse' });
  await repo.humeurs.creer({ date: '2026-09-30', heure: '14:00', humeur: 6 });
  assert.deepEqual((await repo.humeurs.parJour('2026-09-30', '2026-09-30')).map((h) => h.heure), ['14:00', '01:30']);
  await assert.rejects(repo.humeurs.creer({ date: '2026-09-30', heure: '15:00', humeur: 5, energie: 'lieu:bureau' }), ErreurValidation);
  const sauve = await repo.humeurs.supprimer(a.id);
  assert.equal(await repo.humeurs.lire(a.id), null);
  await repo.humeurs.restaurer(sauve);
  assert.equal((await repo.humeurs.lire(a.id)).humeur, 4);
});

test('v6 : un relevé déjà créé passe à « vers » : date, heure et vers changent ensemble, le jour logique suit', async () => {
  const { repo, horloge } = nouveauRepo();
  horloge.t = new Date(2026, 9, 13, 1, 30);
  const jour = repo.aujourdhui();
  assert.equal(jour, '2026-10-12');
  // Créé « maintenant » (01:30 le 13), donc au jour logique du 12.
  const r = await repo.humeurs.creer({ date: '2026-10-13', heure: '01:30', humeur: 6, energie: 'energie:basse' });
  assert.deepEqual([r.vers, r.faisais], [null, null]);
  // « Vers 22 h » : 2026-10-12 22:00.
  const a = await repo.humeurs.modifier(r.id, { ...versDateHeure(horloge.t, 22), vers: true });
  assert.deepEqual([a.date, a.heure, a.vers, a.humeur, a.energie], ['2026-10-12', '22:00', true, 6, 'energie:basse']);
  assert.equal(a.createdAt, r.createdAt);
  // Puis « vers 0 h » : 2026-10-13 00:00, toujours au jour logique du 12.
  const b = await repo.humeurs.modifier(r.id, { ...versDateHeure(horloge.t, 0), vers: true });
  assert.deepEqual([b.date, b.heure, b.vers], ['2026-10-13', '00:00', true]);
  assert.deepEqual((await repo.humeurs.parJour(jour, jour)).map((h) => [h.id, h.date, h.heure]), [[r.id, '2026-10-13', '00:00']]);
  assert.deepEqual(await repo.humeurs.parJour('2026-10-13', '2026-10-13'), [], 'pas au 13');
  // Retour à « maintenant » : vers repasse à null (jamais false).
  const c = await repo.humeurs.modifier(r.id, { date: '2026-10-13', heure: '01:31', vers: null });
  assert.deepEqual([c.heure, c.vers], ['01:31', null]);
  assert.equal((await repo.humeurs.modifier(r.id, { vers: false })).vers, null);
  assert.equal((await repo.humeurs.tous()).length, 1, 'un seul relevé, jamais de doublon');
});

test('v6 : un relevé « vers » vidé est supprimé ; « vers » et activités seuls ne le gardent pas', async () => {
  const { repo } = nouveauRepo();
  const r = await repo.humeurs.creer({ date: '2026-09-30', heure: '14:00', vers: true, humeur: 5, energie: 'energie:basse' });
  const sansHumeur = await repo.humeurs.modifier(r.id, { humeur: null, faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] });
  assert.deepEqual([sansHumeur.energie, sansHumeur.vers, sansHumeur.faisais], ['energie:basse', true, ['activiteMoment:travail', 'activiteMoment:trajet']]);
  assert.equal(await repo.humeurs.modifier(r.id, { energie: null }), null, 'vers et activités seuls : le relevé part');
  assert.equal(await repo.humeurs.lire(r.id), null);
  assert.deepEqual(await repo.humeurs.tous(), []);
  // Les activités sont des références de liste vérifiées.
  const s = await repo.humeurs.creer({ date: '2026-09-30', heure: '16:00', vers: true, humeur: 4 });
  await assert.rejects(repo.humeurs.modifier(s.id, { faisais: ['pese:bruit'] }), ErreurValidation);
});

test('v4 : activités, contact et après coup enregistrés, références imbriquées refusées si inconnues', async () => {
  const { repo } = nouveauRepo();
  const j = await repo.journal.patch('2026-09-30', { sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }] });
  assert.equal(j.activites[0].type, 'typeSport:marche');
  await assert.rejects(repo.journal.patch('2026-09-30', { activites: [{ type: 'typeSport:inconnu' }] }), ErreurValidation);
  const e = await repo.episodes.creer({ date: '2026-09-30', heure: '18:00', reaction: 'reaction:explosion' });
  const m = await repo.episodes.modifier(e.id, { apresCoup: { types: ['typeExplosion:surcharge'], tropDe: ['sourceSurcharge:bruit'], repereA: 7 } });
  assert.deepEqual(m.apresCoup.tropDe, ['sourceSurcharge:bruit']);
  await assert.rejects(repo.episodes.modifier(e.id, { apresCoup: { signes: ['signe:nexistepas'] } }), ErreurValidation);
});

test('v6 : notes en vrac, créer et modifier, jour logique, texte effacé supprime la note', async () => {
  const { repo, horloge, changements } = nouveauRepo();
  const n = await repo.notes.creer({ date: '2026-10-01', heure: '01:30', texte: '  Une idée, en vrac  ' });
  assert.match(n.id, /^no_[0-9a-f]{16}$/);
  assert.equal(n.texte, 'Une idée, en vrac');
  assert.ok(n.createdAt && n.updatedAt);
  await repo.notes.creer({ date: '2026-09-30', heure: '14:00', texte: 'Autre idée' });
  await repo.notes.creer({ date: '2026-10-01', heure: '09:00', texte: 'Le lendemain' });
  assert.deepEqual((await repo.notes.parJour('2026-09-30', '2026-09-30')).map((x) => x.heure), ['14:00', '01:30'], 'avant 04:00, c\'est la veille');
  await assert.rejects(repo.notes.creer({ date: '2026-09-30', texte: 'Sans heure' }), ErreurValidation, 'date et heure posées par l\'app');

  horloge.t = new Date(2026, 9, 1, 8, 0);
  const m = await repo.notes.modifier(n.id, { texte: 'Idée reprise' });
  assert.deepEqual({ date: m.date, heure: m.heure, texte: m.texte, createdAt: m.createdAt }, { date: '2026-10-01', heure: '01:30', texte: 'Idée reprise', createdAt: n.createdAt });
  assert.equal(m.updatedAt, horloge.t.toISOString());
  assert.equal((await repo.notes.lire(n.id)).texte, 'Idée reprise');
  assert.equal(await repo.notes.modifier(n.id, { texte: '   ' }), null);
  assert.equal(await repo.notes.lire(n.id), null);
  assert.equal((await repo.notes.tous()).length, 2);
  assert.equal(changements.filter((c) => c.store === 'notes').length, 5, 'trois créations, deux modifications');
});

// ---- v7 ----

test('v7 : un relevé avec une émotion seule est gardé ; famille, mot, retour à la famille, puis plus rien', async () => {
  const { repo } = nouveauRepo();
  const r = await repo.humeurs.creer({ date: '2026-09-30', heure: '14:00', emotion: 'roue:colere' });
  assert.equal(r.emotion, 'roue:colere');
  assert.equal(r.humeur, null, 'plus de note dans un nouveau relevé');
  assert.equal((await repo.humeurs.modifier(r.id, { emotion: 'roue:colere:irrite' })).emotion, 'roue:colere:irrite');
  assert.equal((await repo.humeurs.modifier(r.id, { emotion: 'roue:colere' })).emotion, 'roue:colere');
  assert.equal((await repo.humeurs.lire(r.id)).emotion, 'roue:colere');
  assert.equal(await repo.humeurs.modifier(r.id, { emotion: null }), null, 'sans émotion ni énergie, le relevé part');
  assert.equal(await repo.humeurs.lire(r.id), null);
  // Avec l'énergie, retirer l'émotion garde le relevé.
  const s2 = await repo.humeurs.creer({ date: '2026-09-30', heure: '15:00', emotion: 'roue:serenite:en-securite', energie: 'energie:haute' });
  assert.equal((await repo.humeurs.modifier(s2.id, { emotion: null })).energie, 'energie:haute');
  await assert.rejects(repo.humeurs.creer({ date: '2026-09-30', heure: '16:00', emotion: 'roue:colere:inconnu' }), ErreurValidation);
  await assert.rejects(repo.humeurs.creer({ date: '2026-09-30', heure: '16:00', emotion: 'emotion:colere' }), ErreurValidation, 'une émotion d\'épisode n\'est pas un mot de la roue');
  assert.equal((await repo.humeurs.tous()).length, 1);
});

test('v7 : séances, créer, modifier, supprimer, jour logique, aucune référence de liste', async () => {
  const { repo, changements } = nouveauRepo();
  const a = await repo.seances.creer({ date: '2026-10-01', heure: '01:30', exercice: 'coherence', dureeS: 300, origine: 'moment-difficile' });
  assert.match(a.id, /^se_[0-9a-f]{16}$/);
  assert.deepEqual({ exercice: a.exercice, dureeS: a.dureeS, origine: a.origine }, { exercice: 'coherence', dureeS: 300, origine: 'moment-difficile' });
  assert.ok(a.createdAt && a.updatedAt);
  await repo.seances.creer({ date: '2026-09-30', heure: '18:00', exercice: 'scan-corporel', dureeS: 600, origine: 'bien-etre' });
  await repo.seances.creer({ date: '2026-10-01', heure: '09:00', exercice: 'coherence', dureeS: 120, origine: 'ressourcer' });
  assert.deepEqual((await repo.seances.parJour('2026-09-30', '2026-09-30')).map((x) => x.heure), ['18:00', '01:30'], 'avant 04:00, c\'est la veille');
  assert.deepEqual((await repo.seances.parJour('2026-10-01', '2026-10-01')).map((x) => x.heure), ['09:00']);
  assert.equal((await repo.seances.modifier(a.id, { dureeS: 240 })).dureeS, 240);
  const photo = await repo.seances.supprimer(a.id);
  assert.equal(await repo.seances.lire(a.id), null);
  await repo.seances.restaurer(photo);
  assert.equal((await repo.seances.lire(a.id)).dureeS, 240);
  assert.equal((await repo.seances.tous()).length, 3);
  assert.ok(changements.some((c) => c.store === 'seances'));
  assert.ok(await repo.meta.lire('derniereEcriture'), 'une séance compte comme une écriture');
  for (const brut of [
    { date: '2026-10-01', heure: '10:00', exercice: 'coherence', dureeS: 60, origine: 'ailleurs' },
    { date: '2026-10-01', heure: '10:00', exercice: 'coherence', dureeS: -1, origine: 'bien-etre' },
    { date: '2026-10-01', heure: '10:00', exercice: 'coherence', dureeS: 86401, origine: 'bien-etre' },
    { date: '2026-10-01', heure: '10:00', exercice: 'coherence', dureeS: 1.5, origine: 'bien-etre' },
    { date: '2026-10-01', exercice: 'coherence', dureeS: 60, origine: 'bien-etre' },
  ]) await assert.rejects(repo.seances.creer(brut), ErreurValidation, JSON.stringify(brut));
  assert.equal((await repo.seances.tous()).length, 3, 'rien n\'est écrit');
});
