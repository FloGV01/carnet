import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { concatener } from '../../public/js/db/zip.js';
import {
  exporter, construireSauvegarde, analyserFichiers, remplacer, chiffrerPerte, lireTout,
  revenirAvantImport, copieAvantImport, toutEffacer, FORMAT_VERSION, metaRemplacee, STORES_DONNEES, MISES_A_NIVEAU,
} from '../../public/js/db/sauvegarde.js';
import { SEED_V4_AJOUTS, SEED_V6_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { phrasePerte, phraseMeta } from '../../public/js/ui/ecrans/sauvegarde.js';
import { TEXTE_EFFACER } from '../../public/js/ui/ecrans/effacer.js';
import {
  creerMot, mettreDeCote, modifierMot, remettreSurLaCarte, motsActifs, chercher, normaliserPerso, ErreurMot, LIBELLE_MAX, MOT_SANS_LIBELLE,
} from '../../public/js/domain/mots-perso.js';
import { normLabel } from '../../public/js/domain/vocabulaire.js';
import { libelleEmotion, familleDe } from '../../public/js/domain/roue.js';
import { zoneDe, energieDe, motsDeLaCarte } from '../../public/js/domain/carte-roue.js';

const octetsDe = (f) => concatener(f.morceaux);
const enc = new TextEncoder();
const json = (o) => [{ nom: 'x.json', octets: enc.encode(JSON.stringify(o)) }];
const contenuDe = (f) => JSON.parse(new TextDecoder().decode(octetsDe(f)));
// Identifiants des listes versées par la v6 (SEED_V4_AJOUTS).
const IDS_V6 = seedItems(SEED_V4_AJOUTS, 'x').map((i) => i.id);
// Identifiants des sujets d'un rendez-vous, versés par la v8 (SEED_V6_AJOUTS).
const IDS_V8 = seedItems(SEED_V6_AJOUTS, 'x').map((i) => i.id);
// Pose une copie « avant-import » telle qu'une version donnée l'écrivait.
const poserCopie = (repo, copie) => repo.tx(['snapshots'], 'readwrite', (t) => new Promise((ok) => { t.objectStore('snapshots').put(copie).onsuccess = ok; }));

async function remplir(repo) {
  await repo.journal.patch('2026-09-29', { humeur: 4, lieu: 'lieu:teletravail' });
  await repo.journal.patch('2026-09-30', { humeur: 6, pointsPositifs: 'marche' });
  const ep = await repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:pris_pour_un_con' });
  await repo.rdv.creer({ professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Sommeil' }] });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  return ep;
}

test('aller-retour JSON sans mémo : identique à l\'original', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1.0.0' });
  assert.match(f.nom, /^carnet-sauvegarde-2026-09-30-2100\.json$/);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  assert.equal(analyse.resume.journees, 2);
  assert.equal(analyse.resume.du, '2026-09-29');
  const b = nouveauRepo();
  await b.repo.journal.patch('2026-01-01', { humeur: 9 });
  await remplacer(b.repo, analyse);
  const avant = await lireTout(a.repo);
  const apres = await lireTout(b.repo);
  for (const s of ['journal', 'episodes', 'rdv', 'listes']) assert.deepEqual(apres[s], avant[s], s);
  assert.equal(await b.repo.journal.lire('2026-01-01'), null);
});

test('aller-retour ZIP avec mémos, y compris en plusieurs parties', async () => {
  const a = nouveauRepo();
  const ep = await remplir(a.repo);
  const octets = (n, v) => new Uint8Array(n).fill(v).buffer;
  await a.repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 3000, mime: 'audio/mp4', data: octets(600, 1) });
  await a.repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, dureeMs: 2000, mime: 'audio/mp4', data: octets(700, 2) });
  const donnees = await lireTout(a.repo);
  const fichiers = construireSauvegarde(donnees, { maintenant: new Date(2026, 8, 30, 21, 0), versionApp: '1.0.0', seuil: 1000 });
  assert.equal(fichiers.length, 2);
  assert.match(fichiers[0].nom, /-partie-1-sur-2\.zip$/);
  const seule = analyserFichiers([{ nom: fichiers[0].nom, octets: octetsDe(fichiers[0]) }]);
  assert.equal(seule.manquants, 1);
  const analyse = analyserFichiers(fichiers.map((f) => ({ nom: f.nom, octets: octetsDe(f) })));
  assert.equal(analyse.manquants, 0);
  assert.equal(analyse.resume.memos, 2);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  const relus = await b.repo.audios.parParent('episodes', ep.id);
  assert.deepEqual(Array.from(new Uint8Array(relus[0].data)).slice(0, 3), [2, 2, 2]);
});

test('fichiers refusés : illisible, autre format, version future, tronqué', () => {
  assert.throws(() => analyserFichiers([{ nom: 'x', octets: enc.encode('{pas du json') }]), /illisible/);
  assert.throws(() => analyserFichiers(json({ format: 'autre' })), /ne ressemble pas/);
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: FORMAT_VERSION + 1 })), (e) => e.code === 'BACKUP_VERSION_FUTURE');
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 1, counts: { journal: 3 }, data: { journal: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 4, counts: { notes: 2 }, data: { notes: [{ id: 'no_1', date: '2026-09-30', heure: '20:00', texte: 'Une' }] } })),
    (e) => e.code === 'BACKUP_INCOMPLET', 'format 4 : notes tronquées');
  assert.throws(() => analyserFichiers([{ nom: 'x.zip', octets: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]) }]), (e) => e.code === 'BACKUP_INCOMPLET');
});

test('enregistrements invalides listés, id de liste inconnu recréé archivé', () => {
  const s = {
    format: 'carnet-sauvegarde', formatVersion: 1, exportedAt: '2026-09-30T19:00:00.000Z', counts: { journal: 2, listes: 0 },
    data: { journal: [{ date: '2026-09-30', lieu: 'lieu:u-disparu', humeur: 5 }, { date: '2026-02-31', humeur: 3 }], listes: [] },
  };
  const a = analyserFichiers([{ nom: 's.json', octets: enc.encode(JSON.stringify(s)) }]);
  assert.equal(a.erreurs.length, 1);
  assert.equal(a.valides.journal.length, 1);
  const cree = a.valides.listes.find((i) => i.id === 'lieu:u-disparu');
  assert.ok(cree.archive);
  assert.match(cree.libelle, /Élément sans libellé/);
});

test('perte chiffrée : ce qui est ici et absent du fichier', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1' });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  await a.repo.journal.patch('2026-10-01', { humeur: 7 });
  await a.repo.episodes.creer({ date: '2026-10-01', emotion: 'emotion:joie' });
  await a.repo.notes.creer({ date: '2026-10-01', heure: '09:00', texte: 'Écrite après l\'export' });
  const perte = chiffrerPerte(await lireTout(a.repo), analyse);
  assert.equal(perte.journal, 1);
  assert.equal(perte.episodes, 1);
  assert.equal(perte.notes, 1);
});

test('une panne pendant l\'application n\'écrit rien ; 3 copies au maximum ; retour avant import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1' });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  const b = nouveauRepo();
  await b.repo.journal.patch('2026-01-01', { humeur: 9 });
  await assert.rejects(remplacer(b.repo, analyse, { panne: 'episodes' }), /panne/);
  assert.equal((await b.repo.journal.lire('2026-01-01')).humeur, 9);
  assert.equal(await copieAvantImport(b.repo), null);
  for (let i = 0; i < 4; i++) { b.horloge.t = new Date(2026, 9, 1, 10, i); await remplacer(b.repo, analyse); }
  const snaps = await b.repo.tx(['snapshots'], 'readonly', (t) => new Promise((ok) => { const r = t.objectStore('snapshots').getAll(); r.onsuccess = () => ok(r.result); }));
  assert.equal(snaps.filter((x) => x.type === 'avant-import').length, 3);
  assert.equal(await b.repo.journal.lire('2026-01-01'), null);
  await revenirAvantImport(b.repo);
  assert.equal((await b.repo.journal.lire('2026-09-30')).humeur, 6, 'état juste avant le dernier import');
});

test('tout effacer : données vidées, listes par défaut recréées', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  await a.repo.meta.ecrire('explosionsDepuis', '2026-09-15');
  await a.repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors' });
  await a.repo.notes.creer({ date: '2026-09-30', heure: '20:00', texte: 'Une idée' });
  await toutEffacer(a.repo);
  const tout = await lireTout(a.repo);
  assert.equal(await a.repo.meta.lire('explosionsDepuis'), '2026-09-15', 'date de la v4 gardée');
  assert.equal(await a.repo.meta.lire('monPlan'), null);
  assert.equal(tout.journal.length, 0);
  assert.equal(tout.episodes.length, 0);
  assert.equal(tout.notes.length, 0);
  assert.equal(tout.listes.length, 204, 'listes v1, v4, v6 et v8');
  for (const id of [...IDS_V6, ...IDS_V8]) assert.ok(tout.listes.some((i) => i.id === id), `${id} réensemencé`);
  assert.equal(tout.listes.find((i) => i.id === 'lieu:bureau').libelle, 'Bureau');
  assert.ok(await a.repo.meta.lire('installation'));
});

test('v4 : une sauvegarde v1 se met à niveau (listes v4 ajoutées, aucune humeur), une v2 garde ses humeurs', async () => {
  const v1 = {
    format: 'carnet-sauvegarde', formatVersion: 1, exportedAt: '2026-09-30T19:00:00.000Z',
    counts: { journal: 1, listes: 1 },
    data: { journal: [{ date: '2026-09-30', humeur: 6 }], listes: [{ id: 'lieu:bureau', liste: 'lieu', libelle: 'Au bureau', ordre: 10, archive: false, alias: [] }] },
  };
  const a = analyserFichiers(json(v1));
  assert.equal(a.sauvegarde.formatVersion, FORMAT_VERSION);
  assert.deepEqual(a.valides.humeurs, []);
  assert.equal(a.valides.listes.find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  assert.ok(a.valides.listes.find((i) => i.id === 'typeExplosion:colere'));
  assert.throws(() => analyserFichiers(json({ ...v1, counts: { journal: 1, listes: 2 } })), (e) => e.code === 'BACKUP_INCOMPLET', 'troncature toujours repérée');
  assert.throws(() => analyserFichiers(json({ ...v1, data: { ...v1.data, listes: {} } })), (e) => e.code === 'BACKUP_INCOMPLET', 'listes illisibles : abîmé, pas illisible');

  const { repo } = nouveauRepo();
  await repo.humeurs.creer({ date: '2026-09-30', heure: '10:00', humeur: 5, energie: 'energie:haute' });
  await repo.journal.patch('2026-09-30', { activites: [{ type: 'typeSport:velo', duree: 'dureeSport:plus_60' }] });
  const [f] = await exporter(repo, { versionApp: 'test' });
  const contenu = JSON.parse(new TextDecoder().decode(concatener(f.morceaux)));
  assert.equal(contenu.formatVersion, FORMAT_VERSION);
  assert.equal(contenu.counts.humeurs, 1);
  const b = analyserFichiers([{ nom: f.nom, octets: concatener(f.morceaux) }]);
  assert.equal(b.valides.humeurs[0].energie, 'energie:haute');
  assert.equal(b.valides.journal[0].activites[0].duree, 'dureeSport:plus_60');
});

test('v4 : l\'import remplace Mon plan et les réglages, « Revenir » les restaure, la date des explosions reste', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  await a.repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors' });
  const [f] = await exporter(a.repo, { versionApp: '1' });
  const contenu = JSON.parse(new TextDecoder().decode(concatener(f.morceaux)));
  assert.equal(contenu.data.meta.find((m) => m.cle === 'schema'), undefined, 'clé technique non exportée');

  const b = nouveauRepo();
  await b.repo.meta.ecrire('journee', { masques: [] });
  await b.repo.meta.ecrire('monPlan', { quandCaMonte: 'je respire' });
  await b.repo.meta.ecrire('explosionsDepuis', '2026-09-15');
  await remplacer(b.repo, analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]));
  assert.equal(await b.repo.meta.lire('journee'), null, 'absente du fichier : retirée');
  assert.deepEqual(await b.repo.meta.lire('monPlan'), { quandCaMonte: 'je sors' });
  assert.equal(await b.repo.meta.lire('explosionsDepuis'), '2026-09-15', 'absente du fichier : gardée');
  assert.equal(await b.repo.meta.lire('schema'), 6);

  await revenirAvantImport(b.repo);
  assert.deepEqual(metaRemplacee([{ cle: 'monPlan', valeur: { a: 1 } }, { cle: 'journee', valeur: { b: 2 } }, { cle: 'schema', valeur: 2 }, { cle: 'explosionsDepuis', valeur: 'x' }],
    [{ cle: 'journee', valeur: { b: 2 } }]), ['monPlan'], 'aperçu : seul ce qui change est annoncé');
  assert.deepEqual(await b.repo.meta.lire('journee'), { masques: [] });
  assert.deepEqual(await b.repo.meta.lire('monPlan'), { quandCaMonte: 'je respire' });
  assert.equal(await b.repo.meta.lire('schema'), 6);
});

test('v5 : une sauvegarde v2 (un détail de contact par jour) devient une ligne de contacts, telle quelle', () => {
  const v2 = {
    format: 'carnet-sauvegarde', formatVersion: 2, exportedAt: '2026-10-05T19:00:00.000Z',
    counts: { journal: 3 },
    data: { journal: [
      { date: '2026-10-03', contactHumain: true, contactAvec: ['contactAvec:famille', 'contactAvec:collegues'], contactEffet: 'contactEffet:couteux' },
      { date: '2026-10-04', contactHumain: true, contactAvec: null, contactEffet: 'contactEffet:neutre' },
      { date: '2026-10-05', humeur: 6, contactAvec: null, contactEffet: null },
    ] },
  };
  const a = analyserFichiers(json(v2));
  const j = Object.fromEntries(a.valides.journal.map((e) => [e.date, e]));
  assert.deepEqual(j['2026-10-03'].contacts, [{ avec: ['contactAvec:famille', 'contactAvec:collegues'], effet: 'contactEffet:couteux' }], 'l\'effet reste attaché aux deux ensemble');
  assert.deepEqual(j['2026-10-04'].contacts, [{ avec: null, effet: 'contactEffet:neutre' }]);
  assert.equal(j['2026-10-05'].contacts, null);
  assert.ok(a.valides.journal.every((e) => !('contactAvec' in e) && !('contactEffet' in e)));
});

test('v6 : une sauvegarde au format 3 se met à niveau (listes v6, notes vides, champ Humeur masqué)', () => {
  const v3 = {
    format: 'carnet-sauvegarde', formatVersion: 3, exportedAt: '2026-10-06T19:00:00.000Z',
    counts: { journal: 1, listes: 2, meta: 1 },
    data: {
      journal: [{ date: '2026-10-06', humeur: 6 }],
      listes: [
        { id: 'lieu:bureau', liste: 'lieu', libelle: 'Au bureau', ordre: 10, archive: false, alias: [] },
        // Un id de la v6 déjà présent n'est jamais écrasé ni compté deux fois.
        { id: 'pese:bruit', liste: 'pese', libelle: 'Le bruit', ordre: 10, archive: true, alias: [] },
      ],
      meta: [{ cle: 'journee', valeur: { ordre: ['humeur', 'lieu'], masques: ['explosions'], heuresMoment: [] } }],
    },
  };
  const avant = structuredClone(v3);
  const a = analyserFichiers(json(v3));
  assert.deepEqual(v3, avant, 'mise à niveau pure : le fichier lu n\'est pas modifié');
  assert.equal(a.sauvegarde.formatVersion, FORMAT_VERSION);
  assert.equal(a.sauvegarde.counts.listes, 2 + IDS_V6.length - 1 + IDS_V8.length, 'listes v6, puis sujets de la v8');
  for (const id of [...IDS_V6, ...IDS_V8]) assert.equal(a.sauvegarde.data.listes.filter((i) => i.id === id).length, 1, id);
  assert.deepEqual(a.valides.listes.find((i) => i.id === 'pese:bruit'), v3.data.listes[1]);
  assert.equal(a.valides.listes.find((i) => i.id === 'recharge:sieste').createdAt, v3.exportedAt);
  assert.deepEqual(a.sauvegarde.data.notes, []);
  assert.equal(a.sauvegarde.counts.notes, 0);
  assert.equal(a.resume.notes, 0);
  // v8 : « Nuit en détail » rejoint aussi les champs masqués (mise à niveau du format 5).
  assert.deepEqual(a.valides.meta, [{ cle: 'journee', valeur: { ordre: ['humeur', 'lieu'], masques: ['explosions', 'humeur', 'nuit'], heuresMoment: [] } }]);

  // Champ Humeur : ajouté seulement à des champs masqués déjà réglés, jamais en double.
  const journee = (valeur) => analyserFichiers(json({ ...v3, data: { ...v3.data, meta: [{ cle: 'journee', valeur }] } })).valides.meta[0].valeur;
  assert.deepEqual(journee({ masques: ['humeur', 'explosions'] }), { masques: ['humeur', 'explosions', 'nuit'] });
  assert.deepEqual(journee({ masques: [] }), { masques: ['humeur', 'nuit'] });
  assert.deepEqual(journee({ ordre: ['lieu'] }), { ordre: ['lieu'] });
  assert.equal(journee(null), null);

  // Sans compte des listes, rien n'est inventé ; un fichier tronqué reste refusé.
  const sansCompte = analyserFichiers(json({ ...v3, counts: { journal: 1 } }));
  assert.equal(sansCompte.sauvegarde.counts.listes, undefined);
  assert.ok(sansCompte.valides.listes.some((i) => i.id === 'activiteMoment:travail'));
  assert.throws(() => analyserFichiers(json({ ...v3, counts: { journal: 2 } })), (e) => e.code === 'BACKUP_INCOMPLET');
});

test('v6 : les notes et le lien d\'une question survivent à un export suivi d\'un import', async () => {
  const a = nouveauRepo();
  const ep = await remplir(a.repo);
  const note = await a.repo.notes.creer({ date: '2026-10-01', heure: '01:30', texte: 'Une idée, en vrac' });
  const rdv = await a.repo.rdv.creer({ professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Parler de la colère', lien: { store: 'episodes', id: ep.id } }] });
  const [f] = await exporter(a.repo, { versionApp: '6.0.0' });
  const contenu = contenuDe(f);
  assert.equal(contenu.formatVersion, FORMAT_VERSION);
  assert.equal(contenu.schemaVersion, 6);
  assert.equal(contenu.counts.notes, 1);
  assert.deepEqual(contenu.data.notes, [note]);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.equal(analyse.resume.notes, 1);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.notes.tous(), [note]);
  assert.deepEqual((await b.repo.rdv.lire(rdv.id)).questions, [{ texte: 'Parler de la colère', abordee: false, lien: { store: 'episodes', id: ep.id } }]);
});

test('v6 : l\'import remplace les notes, « Revenir » les remet', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '6.0.0' });
  const b = nouveauRepo();
  const note = await b.repo.notes.creer({ date: '2026-09-30', heure: '20:00', texte: 'Ici seulement' });
  await remplacer(b.repo, analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]));
  assert.deepEqual(await b.repo.notes.tous(), [], 'absente du fichier : effacée');
  assert.deepEqual((await copieAvantImport(b.repo)).data.notes, [note]);
  await revenirAvantImport(b.repo);
  assert.deepEqual(await b.repo.notes.tous(), [note]);
});

test('v6 : « Revenir » vers une copie prise avant la v6 garde les notes et remet les listes v6', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  // Copie « avant-import » telle que la v5 l'écrivait : ni notes, ni listes de la v6.
  const { notes, audios, ...data } = await lireTout(a.repo);
  const copie = {
    id: 'avant-import-2026-09-30T17:00:00.000Z', type: 'avant-import', date: '2026-09-30T17:00:00.000Z', schemaVersion: 3,
    data: { ...data, listes: data.listes.filter((i) => !IDS_V6.includes(i.id)) },
  };
  await poserCopie(a.repo, copie);
  const note = await a.repo.notes.creer({ date: '2026-10-01', heure: '09:00', texte: 'Écrite après la copie' });
  await a.repo.journal.patch('2026-10-01', { humeur: 7 });
  await revenirAvantImport(a.repo);
  assert.equal(await a.repo.journal.lire('2026-10-01'), null, 'la copie est restaurée');
  assert.deepEqual(await a.repo.notes.tous(), [note]);
  const listes = await a.repo.listes.items();
  assert.equal(listes.length, 204);
  for (const id of [...IDS_V6, ...IDS_V8]) assert.ok(listes.some((i) => i.id === id), `${id} remis`);
  assert.equal(listes.find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
});

test('v6 : « Revenir » vers une copie d\'avant la v6 masque le champ Humeur, une copie de la v6 garde le choix fait', async () => {
  const { repo } = nouveauRepo();
  const journee = (masques) => [{ cle: 'journee', valeur: { ordre: ['lieu', 'humeur'], masques, heuresMoment: [] } }];
  const copie = (date, schemaVersion) => ({ id: `avant-import-${date}`, type: 'avant-import', date, schemaVersion, data: { journal: [], listes: [], meta: journee(['explosions']) } });
  await repo.meta.ecrire('journee', { masques: [] });
  await poserCopie(repo, copie('2026-09-30T17:00:00.000Z', 3));
  await revenirAvantImport(repo);
  // v8 : une copie d'avant la v8 masque aussi « Nuit en détail », comme la migration 6.
  assert.deepEqual(await repo.meta.lire('journee'), journee(['explosions', 'humeur', 'nuit'])[0].valeur, 'copie de la v5 : comme les migrations');
  // En v6, l'utilisateur a pu réafficher Humeur : ce choix n'est pas défait.
  await poserCopie(repo, copie('2026-09-30T18:00:00.000Z', 4));
  await revenirAvantImport(repo);
  assert.deepEqual(await repo.meta.lire('journee'), journee(['explosions', 'nuit'])[0].valeur);
});

test('v8 : « Revenir » vers une copie d\'avant la v8 masque « Nuit en détail », une copie de la v8 garde le choix fait', async () => {
  const { repo } = nouveauRepo();
  const journee = (masques) => ({ ordre: ['lieu', 'sommeil'], masques, heuresMoment: [] });
  const copie = (date, schemaVersion) => ({ id: `avant-import-${date}`, type: 'avant-import', date, schemaVersion, data: { journal: [], listes: [], meta: [{ cle: 'journee', valeur: journee(['explosions', 'humeur']) }] } });
  await poserCopie(repo, copie('2026-10-20T17:00:00.000Z', 5));
  await revenirAvantImport(repo);
  assert.deepEqual(await repo.meta.lire('journee'), journee(['explosions', 'humeur', 'nuit']), 'copie de la v7 : comme la migration 6');
  // En v8, l'utilisateur a pu réafficher « Nuit en détail » : ce choix n'est pas défait.
  await poserCopie(repo, copie('2026-10-26T18:00:00.000Z', 6));
  await revenirAvantImport(repo);
  assert.deepEqual(await repo.meta.lire('journee'), journee(['explosions', 'humeur']));
});

test('v6 : aperçu de l\'import, les notes et les nouveaux réglages ont leurs mots', () => {
  assert.equal(phrasePerte({ notes: 2 }), '2 notes présentes ici et absentes du fichier seront effacées.');
  assert.equal(phrasePerte({ notes: 1 }), '1 note présente ici et absente du fichier sera effacée.');
  assert.equal(phrasePerte({ journal: 1, notes: 3 }), '1 journée et 3 notes présentes ici et absentes du fichier seront effacées.');
  assert.equal(phrasePerte({ episodes: 1, notes: 1 }), '1 épisode et 1 note présents ici et absents du fichier seront effacés.');
  assert.equal(phrasePerte({ episodes: 1 }), '1 épisode présent ici et absent du fichier sera effacé.');
  assert.equal(phrasePerte({ notes: 0 }), null);
  assert.equal(phraseMeta(['respiration']), 'Les réglages de la respiration seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan', 'uneChoseALaFois', 'ressourcer']),
    'Mon plan, les réglages de « Une chose à la fois » et les réglages de « Me ressourcer » seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan']), 'Mon plan sera remplacé par ce que contient le fichier.');
});

test('v6.1 : les réglages de meta.journee se nomment d\'après Le soir et Rappels, plus d\'après « Ma journée »', () => {
  assert.equal(phraseMeta(['journee']), 'Les réglages du soir et des rappels seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan', 'journee']), 'Mon plan et les réglages du soir et des rappels seront remplacés par ce que contient le fichier.');
});

// ---- v7 ----

test('v7 : les séances et les émotions survivent à un export suivi d\'un import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const s1 = await a.repo.seances.creer({ date: '2026-09-30', heure: '18:00', exercice: 'scan-corporel', dureeS: 600, origine: 'bien-etre' });
  const s2 = await a.repo.seances.creer({ date: '2026-10-01', heure: '01:30', exercice: 'coherence', dureeS: 75, origine: 'moment-difficile' });
  const hu = await a.repo.humeurs.creer({ date: '2026-09-30', heure: '20:00', emotion: 'roue:colere:irrite', energie: 'energie:moyenne' });
  const [f] = await exporter(a.repo, { versionApp: '7.0.0' });
  const contenu = contenuDe(f);
  assert.equal(contenu.formatVersion, FORMAT_VERSION);
  assert.equal(contenu.schemaVersion, 6);
  assert.equal(contenu.counts.seances, 2);
  assert.deepEqual(Object.keys(contenu.data), ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'notes', 'seances', 'listes', 'meta', 'audios']);
  assert.deepEqual(contenu.data.seances, [s1, s2].sort((x, y) => x.id.localeCompare(y.id)));
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  assert.equal(analyse.resume.seances, 2);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  assert.deepEqual((await b.repo.seances.tous()).sort((x, y) => x.id.localeCompare(y.id)), [s1, s2].sort((x, y) => x.id.localeCompare(y.id)));
  assert.deepEqual(await b.repo.humeurs.lire(hu.id), hu);
  assert.deepEqual((await b.repo.seances.parJour('2026-09-30', '2026-09-30')).map((x) => x.id), [s1.id, s2.id], 'bascule de 4 h gardée');
});

test('v7 : l\'import remplace les séances, la perte les annonce, « Revenir » les remet', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '7.0.0' });
  const b = nouveauRepo();
  const ici = await b.repo.seances.creer({ date: '2026-09-30', heure: '20:00', exercice: 'coherence', dureeS: 120, origine: 'ressourcer' });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.equal(chiffrerPerte(await lireTout(b.repo), analyse).seances, 1);
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.seances.tous(), [], 'absente du fichier : effacée');
  assert.deepEqual((await copieAvantImport(b.repo)).data.seances, [ici]);
  await revenirAvantImport(b.repo);
  assert.deepEqual(await b.repo.seances.tous(), [ici]);
});

test('v7 : « Revenir » vers une copie prise avant la v7 garde les séances', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  // Copie « avant-import » telle que la v6 l'écrivait : pas de séances.
  const { seances, audios, ...data } = await lireTout(a.repo);
  await poserCopie(a.repo, { id: 'avant-import-2026-09-30T17:00:00.000Z', type: 'avant-import', date: '2026-09-30T17:00:00.000Z', schemaVersion: 4, data });
  const se = await a.repo.seances.creer({ date: '2026-10-01', heure: '09:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
  await a.repo.journal.patch('2026-10-01', { lieu: 'lieu:bureau' });
  await revenirAvantImport(a.repo);
  assert.equal(await a.repo.journal.lire('2026-10-01'), null, 'la copie est restaurée');
  assert.deepEqual(await a.repo.seances.tous(), [se]);
});

test('v7 : une sauvegarde au format 4 passe au format courant (point de vigilance 1) : notes gardées, émotion vide, aucune séance', async () => {
  const releves = [
    { id: 'hu_0000000000000001', date: '2026-10-18', heure: '12:00', humeur: 6, energie: 'energie:moyenne', vers: null, faisais: null, createdAt: 'x', updatedAt: 'x' },
    { id: 'hu_0000000000000002', date: '2026-10-19', heure: '01:30', humeur: 4, energie: null, vers: true, faisais: ['activiteMoment:repos'], createdAt: 'x', updatedAt: 'x' },
  ];
  const v4 = {
    format: 'carnet-sauvegarde', formatVersion: 4, schemaVersion: 4, exportedAt: '2026-10-19T19:00:00.000Z',
    counts: { journal: 1, humeurs: 2, notes: 1 },
    data: {
      journal: [{ date: '2026-10-18', humeur: 5, lieu: 'lieu:bureau' }],
      humeurs: releves,
      notes: [{ id: 'no_1', date: '2026-10-18', heure: '21:00', texte: 'Une idée' }],
    },
  };
  const avant = structuredClone(v4);
  const a = analyserFichiers(json(v4));
  assert.deepEqual(v4, avant, 'mise à niveau pure : le fichier lu n\'est pas modifié');
  assert.equal(a.sauvegarde.formatVersion, FORMAT_VERSION);
  assert.deepEqual(a.sauvegarde.data.seances, []);
  assert.equal(a.sauvegarde.counts.seances, 0);
  assert.equal(a.resume.seances, 0);
  assert.deepEqual(a.sauvegarde.data.humeurs.map((h) => h.emotion), [null, null], 'emotion: null ajouté aux relevés');
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual(a.valides.humeurs.map((h) => [h.id, h.humeur, h.emotion, h.energie, h.vers]), [
    ['hu_0000000000000001', 6, null, 'energie:moyenne', null], ['hu_0000000000000002', 4, null, null, true]]);
  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  const lus = (await repo.humeurs.tous()).sort((x, y) => x.id.localeCompare(y.id));
  assert.deepEqual(lus.map((h) => [h.humeur, h.emotion]), [[6, null], [4, null]], 'les notes de 1 à 10 restent');
  assert.equal((await repo.journal.lire('2026-10-18')).humeur, 5, 'l\'humeur du soir aussi');
  assert.equal((await repo.notes.tous()).length, 1);
  assert.deepEqual(await repo.seances.tous(), []);
  // Un fichier au format 4 tronqué reste refusé.
  assert.throws(() => analyserFichiers(json({ ...v4, counts: { humeurs: 3 } })), (e) => e.code === 'BACKUP_INCOMPLET');
});

test('v7 : un format 5 tronqué est refusé, une séance illisible est ignorée', () => {
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 5, counts: { seances: 2 }, data: { seances: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  const a = analyserFichiers(json({
    format: 'carnet-sauvegarde', formatVersion: 5, exportedAt: '2026-10-20T19:00:00.000Z', counts: { seances: 3, humeurs: 1 },
    data: {
      seances: [
        { id: 'se_1', date: '2026-10-20', heure: '09:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' },
        { id: 'se_2', date: '2026-10-20', heure: '10:00', exercice: 'coherence', origine: 'ailleurs' },
        { id: 'se_3', date: '2026-10-20', heure: '10:30', dureeS: 300, origine: 'bien-etre' },
      ],
      humeurs: [{ id: 'hu_1', date: '2026-10-20', heure: '11:00', emotion: 'roue:colere:inconnu' }],
    },
  }));
  assert.equal(a.valides.seances.length, 1);
  assert.equal(a.valides.humeurs.length, 0);
  assert.equal(a.erreurs.length, 3);
  assert.match(a.erreurs.join(' ; '), /seances n° 2 : origine/);
  assert.match(a.erreurs.join(' ; '), /seances n° 3 : exercice : absente/, 'une séance sans exercice est illisible');
  assert.match(a.erreurs.join(' ; '), /humeurs n° 1 : emotion/);
});

test('v7 : aperçu de l\'import, les séances ont leurs mots', () => {
  assert.equal(phrasePerte({ seances: 1 }), '1 séance de Bien-être présente ici et absente du fichier sera effacée.');
  assert.equal(phrasePerte({ notes: 1, seances: 2 }), '1 note et 2 séances de Bien-être présentes ici et absentes du fichier seront effacées.');
  assert.equal(phrasePerte({ episodes: 1, seances: 1 }), '1 épisode et 1 séance de Bien-être présents ici et absents du fichier seront effacés.');
  assert.equal(phrasePerte({ seances: 0 }), null);
});

// « Tout effacer » vide tous les stores de données (STORES_DONNEES) : son texte les nomme tous. Un nouveau store fait
// échouer ce test tant que le texte ne le cite pas.
test('v7 : le texte de « Tout effacer » nomme tout ce que toutEffacer efface, séances de Bien-être comprises', () => {
  const NOMS = {
    journal: ['journées'], episodes: ['épisodes'], symptomes: ['symptômes'], traitements: ['fiches'], rdv: ['rendez-vous'],
    humeurs: ['relevés d\'émotion du moment'], notes: ['notes'], seances: ['séances de Bien-être'], listes: ['Les listes'],
    meta: ['Mon plan', 'ton traitement actuel', 'les réglages'], audios: ['mémos'],
  };
  assert.deepEqual(Object.keys(NOMS).sort(), [...STORES_DONNEES].sort());
  for (const [store, mots] of Object.entries(NOMS)) for (const m of mots) assert.ok(TEXTE_EFFACER.includes(m), `${store} : « ${m} »`);
});

// ---- v8 ----

test('v8 : durée de la nuit, séance « Faite » du Programme et définitions corrigées survivent à un export suivi d\'un import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const nuit = await a.repo.journal.patch('2026-09-30', { sommeilRessenti: 'sommeil:mal', heuresSommeil: 6 });
  const faite = await a.repo.seances.creer({ date: '2026-09-30', heure: '18:00', exercice: 'respiration-abdominale', dureeS: 300, origine: 'bien-etre', fin: true, programme: 'respiration-abdominale' });
  const arretee = await a.repo.seances.creer({ date: '2026-09-30', heure: '19:00', exercice: 'scan-corporel', dureeS: 120, origine: 'bien-etre', programme: 'scan-corporel' });
  const definitions = { 'roue:colere:irrite': 'Agacé par un bruit qui revient.', 'roue:serenite:calme': 'Rien ne presse.' };
  await a.repo.meta.ecrire('definitionsRoue', definitions);
  const [f] = await exporter(a.repo, { versionApp: '8.0.0' });
  const contenu = contenuDe(f);
  assert.equal(contenu.formatVersion, FORMAT_VERSION);
  assert.equal(contenu.schemaVersion, 6);
  assert.equal(contenu.data.journal.find((j) => j.date === '2026-09-30').heuresSommeil, 6);
  assert.deepEqual(contenu.data.seances.find((x) => x.id === faite.id), faite);
  assert.deepEqual([contenu.data.seances.find((x) => x.id === arretee.id).fin, contenu.data.seances.find((x) => x.id === arretee.id).programme], [null, 'scan-corporel']);
  assert.deepEqual(contenu.data.meta.find((m) => m.cle === 'definitionsRoue'), { cle: 'definitionsRoue', valeur: definitions });
  assert.equal(contenu.data.listes.filter((i) => i.liste === 'sujetRdv').length, IDS_V8.length, 'les sujets sont dans le fichier');

  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.journal.lire('2026-09-30'), nuit);
  assert.deepEqual(await b.repo.seances.lire(faite.id), faite);
  assert.deepEqual(await b.repo.seances.lire(arretee.id), arretee);
  assert.deepEqual(await b.repo.meta.lire('definitionsRoue'), definitions);
  const avant = await lireTout(a.repo);
  const apres = await lireTout(b.repo);
  for (const s of ['journal', 'seances', 'listes']) assert.deepEqual(apres[s], avant[s], s);
  // Et un second export redonne les mêmes octets.
  const [g] = await exporter(b.repo, { versionApp: '8.0.0' });
  assert.ok(Buffer.from(octetsDe(g)).equals(Buffer.from(octetsDe(f))));
});

// v8, point de vigilance 1 : une sauvegarde de la v7 (format 5) passe au format 6 sans rien perdre ni inventer.
test('v8 : une sauvegarde au format 5 passe au format courant : sujets ajoutés sans écraser, séances sans fin, nuits sans heures', async () => {
  const v5 = {
    format: 'carnet-sauvegarde', formatVersion: 5, schemaVersion: 5, exportedAt: '2026-10-23T19:00:00.000Z',
    counts: { journal: 2, seances: 2, humeurs: 1, listes: 2, meta: 1 },
    data: {
      journal: [
        { date: '2026-10-22', sommeilRessenti: 'sommeil:mal', heureCoucher: '23:40', heureLever: '06:10', reveilsNocturnes: 3 },
        { date: '2026-10-23', sommeilRessenti: 'sommeil:bien' },
      ],
      seances: [
        { id: 'se_1', date: '2026-10-22', heure: '18:00', exercice: 'respiration-carree', dureeS: 260, origine: 'bien-etre' },
        { id: 'se_2', date: '2026-10-23', heure: '01:30', exercice: 'coherence', dureeS: 300, origine: 'moment-difficile' },
      ],
      humeurs: [{ id: 'hu_1', date: '2026-10-22', heure: '12:00', emotion: 'roue:colere', energie: 'energie:haute' }],
      listes: [
        { id: 'lieu:bureau', liste: 'lieu', libelle: 'Au bureau', ordre: 10, archive: false, alias: [] },
        // Un sujet déjà présent n'est jamais écrasé ni compté deux fois.
        { id: 'sujetRdv:fatigue', liste: 'sujetRdv', libelle: 'Fatigue du soir', ordre: 40, archive: true, alias: ['Fatigue'] },
      ],
      meta: [{ cle: 'monPlan', valeur: { quandCaMonte: 'Je sors' } }],
    },
  };
  const avant = structuredClone(v5);
  const a = analyserFichiers(json(v5));
  assert.deepEqual(v5, avant, 'mise à niveau pure : le fichier lu n\'est pas modifié');
  assert.equal(a.sauvegarde.formatVersion, FORMAT_VERSION);
  assert.deepEqual(a.erreurs, []);
  assert.equal(a.sauvegarde.counts.listes, 2 + IDS_V8.length - 1);
  for (const id of IDS_V8) assert.equal(a.sauvegarde.data.listes.filter((i) => i.id === id).length, 1, id);
  assert.deepEqual(a.valides.listes.find((i) => i.id === 'sujetRdv:fatigue'), v5.data.listes[1]);
  assert.equal(a.valides.listes.find((i) => i.id === 'sujetRdv:sommeil').createdAt, v5.exportedAt);
  assert.equal(a.sauvegarde.counts.seances, 2, 'aucune séance ajoutée ni retirée');
  assert.deepEqual(a.sauvegarde.data.seances, v5.data.seances, 'aucune séance transformée');
  assert.deepEqual(a.sauvegarde.data.journal, v5.data.journal, 'aucune nuit transformée');
  assert.deepEqual(a.valides.seances.map((x) => [x.id, x.fin, x.programme]), [['se_1', null, null], ['se_2', null, null]], 'aucune séance v7 « Faite »');
  assert.deepEqual(a.valides.journal.map((j) => [j.date, j.heuresSommeil, j.heureCoucher, j.heureLever, j.reveilsNocturnes]),
    [['2026-10-22', null, '23:40', '06:10', 3], ['2026-10-23', null, null, null, null]], 'aucun nombre d\'heures inventé');
  assert.equal(a.valides.humeurs[0].emotion, 'roue:colere', 'une famille seule de la v7 reste valable');
  assert.deepEqual(a.valides.meta, v5.data.meta, 'sans réglage du soir, rien n\'est écrit : la valeur par défaut masque « Nuit en détail »');
  // Des champs masqués déjà réglés gagnent « Nuit en détail », une fois (comme la migration 6) ; sans masques, rien.
  const journee = (valeur) => analyserFichiers(json({ ...v5, counts: { ...v5.counts, meta: 1 }, data: { ...v5.data, meta: [{ cle: 'journee', valeur }] } })).valides.meta[0].valeur;
  assert.deepEqual(journee({ ordre: ['lieu'], masques: ['explosions', 'humeur'], heuresMoment: [18] }), { ordre: ['lieu'], masques: ['explosions', 'humeur', 'nuit'], heuresMoment: [18] });
  assert.deepEqual(journee({ masques: ['nuit', 'explosions'] }), { masques: ['nuit', 'explosions'] });
  assert.deepEqual(journee({ masques: [] }), { masques: ['nuit'] });
  assert.deepEqual(journee({ heuresMoment: [9] }), { heuresMoment: [9] });
  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  assert.equal((await repo.journal.lire('2026-10-22')).heureLever, '06:10');
  assert.equal((await repo.seances.tous()).length, 2);
  assert.equal(await repo.meta.lire('definitionsRoue'), null);
  // Sans compte des listes, rien n'est inventé ; un fichier tronqué reste refusé.
  assert.equal(analyserFichiers(json({ ...v5, counts: { journal: 2 } })).sauvegarde.counts.listes, undefined);
  assert.throws(() => analyserFichiers(json({ ...v5, counts: { ...v5.counts, seances: 3 } })), (e) => e.code === 'BACKUP_INCOMPLET');
});

test('v8 : un format 6 tronqué est refusé, une nuit ou une séance hors bornes est ignorée', () => {
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 6, counts: { journal: 2 }, data: { journal: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  const a = analyserFichiers(json({
    format: 'carnet-sauvegarde', formatVersion: 6, exportedAt: '2026-10-24T19:00:00.000Z', counts: { journal: 3, seances: 3 },
    data: {
      journal: [{ date: '2026-10-22', heuresSommeil: 7 }, { date: '2026-10-23', heuresSommeil: 3 }, { date: '2026-10-24', heuresSommeil: '7' }],
      seances: [
        { id: 'se_1', date: '2026-10-24', heure: '09:00', exercice: 'respiration-abdominale', dureeS: 300, origine: 'bien-etre', fin: true, programme: 'respiration-abdominale' },
        { id: 'se_2', date: '2026-10-24', heure: '10:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre', fin: 'oui' },
        { id: 'se_3', date: '2026-10-24', heure: '11:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre', programme: 12 },
      ],
    },
  }));
  assert.deepEqual(a.valides.journal.map((j) => j.heuresSommeil), [7]);
  assert.deepEqual(a.valides.seances.map((x) => x.id), ['se_1']);
  assert.equal(a.erreurs.length, 4);
  assert.match(a.erreurs.join(' ; '), /journal n° 2 : heuresSommeil : de 4 à 10 par demi-heure attendu/);
  assert.match(a.erreurs.join(' ; '), /journal n° 3 : heuresSommeil : de 4 à 10 par demi-heure attendu/);
  assert.match(a.erreurs.join(' ; '), /seances n° 2 : fin : vrai ou vide attendu/);
  assert.match(a.erreurs.join(' ; '), /seances n° 3 : programme : texte attendu/);
});

test('v8 : l\'import remplace les définitions corrigées, l\'aperçu le dit, « Revenir » les remet', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  await a.repo.meta.ecrire('definitionsRoue', { 'roue:joie:curieux': 'Envie d\'en savoir plus.' });
  const [f] = await exporter(a.repo, { versionApp: '8.0.0' });
  const sansDefinitions = nouveauRepo();
  await remplir(sansDefinitions.repo);
  const [g] = await exporter(sansDefinitions.repo, { versionApp: '8.0.0' });

  const b = nouveauRepo();
  const ici = { 'roue:colere:irrite': 'Ma définition, écrite ici.' };
  await b.repo.meta.ecrire('definitionsRoue', ici);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(metaRemplacee((await lireTout(b.repo)).meta, analyse.valides.meta), ['definitionsRoue']);
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.meta.lire('definitionsRoue'), { 'roue:joie:curieux': 'Envie d\'en savoir plus.' }, 'celles du fichier');
  await revenirAvantImport(b.repo);
  assert.deepEqual(await b.repo.meta.lire('definitionsRoue'), ici, '« Revenir » remet celles d\'ici');
  // Un fichier sans correction : celles d'ici sont retirées, comme toute clé de l'utilisateur absente du fichier.
  const sans = analyserFichiers([{ nom: g.nom, octets: octetsDe(g) }]);
  assert.deepEqual(metaRemplacee((await lireTout(b.repo)).meta, sans.valides.meta), ['definitionsRoue']);
  await remplacer(b.repo, sans);
  assert.equal(await b.repo.meta.lire('definitionsRoue'), null);
  // Les mêmes corrections des deux côtés : rien n'est annoncé.
  assert.deepEqual(metaRemplacee([{ cle: 'definitionsRoue', valeur: ici }], [{ cle: 'definitionsRoue', valeur: ici }]), []);
});

test('v8 : aperçu de l\'import, les définitions des émotions ont leurs mots et leur accord', () => {
  assert.equal(phraseMeta(['definitionsRoue']), 'Les définitions des émotions seront remplacées par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan', 'definitionsRoue']), 'Mon plan et les définitions des émotions seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['respiration']), 'Les réglages de la respiration seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan']), 'Mon plan sera remplacé par ce que contient le fichier.');
  assert.equal(phraseMeta(['inconnue', 'definitionsRoue']), 'Les définitions des émotions seront remplacées par ce que contient le fichier.');
});

test('v10 : aperçu de l\'import, les exercices épinglés ont leurs mots', () => {
  assert.equal(phraseMeta(['favorisBienEtre']), 'Les exercices épinglés seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['monPlan', 'favorisBienEtre']), 'Mon plan et les exercices épinglés seront remplacés par ce que contient le fichier.');
});

test('v10 : aperçu de l\'import, une épingle posée puis retirée ne laisse rien à annoncer ; une liste qui a des éléments, si', () => {
  const vide = [{ cle: 'favorisBienEtre', valeur: [] }];
  assert.deepEqual(metaRemplacee(vide, []), [], 'absente du fichier : rien n\'est perdu');
  assert.deepEqual(metaRemplacee(vide, [{ cle: 'favorisBienEtre', valeur: ['soupir'] }]), [], 'le fichier en a : rien n\'est perdu non plus');
  const epingle = [{ cle: 'favorisBienEtre', valeur: ['soupir'] }];
  assert.deepEqual(metaRemplacee(epingle, []), ['favorisBienEtre']);
  assert.deepEqual(metaRemplacee(epingle, [{ cle: 'favorisBienEtre', valeur: [] }]), ['favorisBienEtre']);
  assert.deepEqual(metaRemplacee(epingle, [{ cle: 'favorisBienEtre', valeur: ['soupir'] }]), []);
});

test('v10 : les exercices épinglés survivent à un aller-retour de sauvegarde, dans leur ordre ; absents du fichier, ils sont retirés', async () => {
  const a = nouveauRepo();
  await a.repo.meta.ecrire('favorisBienEtre', ['savourer', 'sons-de-fond', 'coherence']);
  const [f] = await exporter(a.repo, { versionApp: '10.0.0' });
  assert.deepEqual(contenuDe(f).data.meta.find((m) => m.cle === 'favorisBienEtre'), { cle: 'favorisBienEtre', valeur: ['savourer', 'sons-de-fond', 'coherence'] });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  const b = nouveauRepo();
  await b.repo.meta.ecrire('favorisBienEtre', ['soupir']);
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.meta.lire('favorisBienEtre'), ['savourer', 'sons-de-fond', 'coherence']);
  // Une sauvegarde sans épingle (une autre version) : la méta qui n'est pas dans le fichier s'en va, comme les autres.
  const c = nouveauRepo();
  const [g] = await exporter(c.repo, { versionApp: '10.0.0' });
  await remplacer(b.repo, analyserFichiers([{ nom: g.nom, octets: octetsDe(g) }]));
  assert.equal(await b.repo.meta.lire('favorisBienEtre'), null);
});

test('v8 : « Revenir » vers une copie prise avant la v8 remet les sujets d\'un rendez-vous, sans écraser ceux de la copie', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  // Copie « avant-import » telle que la v7 l'écrivait : ni sujets, ni champs de la v8.
  const { audios, ...data } = await lireTout(a.repo);
  const sujet = { id: 'sujetRdv:sommeil', liste: 'sujetRdv', libelle: 'Mes nuits', ordre: 10, archive: false, alias: ['Sommeil'], origine: 'defaut', createdAt: 'x', updatedAt: 'x' };
  const copie = {
    id: 'avant-import-2026-09-30T17:00:00.000Z', type: 'avant-import', date: '2026-09-30T17:00:00.000Z', schemaVersion: 5,
    data: { ...data, listes: [...data.listes.filter((i) => i.liste !== 'sujetRdv'), sujet] },
  };
  await poserCopie(a.repo, copie);
  await revenirAvantImport(a.repo);
  const listes = await a.repo.listes.items('sujetRdv');
  assert.equal(listes.length, IDS_V8.length);
  for (const id of IDS_V8) assert.equal(listes.filter((i) => i.id === id).length, 1, id);
  assert.deepEqual(listes.find((i) => i.id === 'sujetRdv:sommeil'), sujet, 'le sujet de la copie est gardé');
  assert.equal((await a.repo.listes.items()).length, 204);
});

// ---- v9 ----

// Mots à soi inventés pour les tests (spec v9 §4.5).
const FLOTTANT = 'roue:perso:u-0a1b2c3d';
const DEBORDE = 'roue:perso:u-11111111';
const motsPersoDe = (meta) => (meta.find((m) => m.cle === 'motsPerso') || {}).valeur;

test('v9 : un format 7 tronqué est refusé, une sauvegarde au format 6 passe au format 7 sans rien transformer', () => {
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 7, counts: { humeurs: 2 }, data: { humeurs: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  // Les relevés de la v8 que la v9 lit autrement : énergie seule, famille seule de la v7, Accablé (bleu en v8, rouge en v9).
  const v6 = {
    format: 'carnet-sauvegarde', formatVersion: 6, schemaVersion: 6, exportedAt: '2026-10-26T19:00:00.000Z',
    counts: { journal: 1, humeurs: 3, meta: 1 },
    data: {
      journal: [{ date: '2026-10-25', sommeilRessenti: 'sommeil:bien', heuresSommeil: 8 }],
      humeurs: [
        { id: 'hu_1', date: '2026-10-25', heure: '09:00', energie: 'energie:basse' },
        { id: 'hu_2', date: '2026-10-25', heure: '12:00', emotion: 'roue:colere', energie: 'energie:haute' },
        { id: 'hu_3', date: '2026-10-25', heure: '18:00', emotion: 'roue:peur:accable', energie: 'energie:basse' },
      ],
      meta: [{ cle: 'definitionsRoue', valeur: { 'roue:joie:curieux': 'Envie d\'en savoir plus.' } }],
    },
  };
  const avant = structuredClone(v6);
  assert.deepEqual(MISES_A_NIVEAU[6](v6), { ...v6, formatVersion: 7 });
  const a = analyserFichiers(json(v6));
  assert.deepEqual(v6, avant, 'mise à niveau pure');
  assert.equal(a.sauvegarde.formatVersion, FORMAT_VERSION);
  assert.deepEqual(a.sauvegarde.data, v6.data, 'rien n\'est transformé');
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual(a.valides.humeurs.map((h) => [h.id, h.emotion, h.energie]),
    [['hu_1', null, 'energie:basse'], ['hu_2', 'roue:colere', 'energie:haute'], ['hu_3', 'roue:peur:accable', 'energie:basse']], 'énergies telles que saisies');
  assert.deepEqual(a.valides.meta, v6.data.meta, 'aucun mot à soi inventé');
});

test('v9 : les mots à soi et leurs relevés survivent à un export suivi d\'un import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const maintenant = a.repo.maintenant();
  let { perso } = creerMot(null, { libelle: 'Flottant', zone: 'bleu', famille: 'tristesse' }, { id: FLOTTANT, maintenant });
  ({ perso } = creerMot(perso, { libelle: 'Débordé', zone: 'rouge', definition: 'Plus de place pour rien.' }, { id: DEBORDE, maintenant }));
  await a.repo.meta.ecrire('motsPerso', perso);
  const h1 = await a.repo.humeurs.creer({ date: '2026-09-30', heure: '10:00', emotion: FLOTTANT, energie: energieDe(FLOTTANT, perso) });
  const h2 = await a.repo.humeurs.creer({ date: '2026-09-30', heure: '11:00', emotion: DEBORDE, energie: energieDe(DEBORDE, perso), faisais: ['activiteMoment:travail'] });
  // Débordé, utilisé, est mis de côté : il reste dans la méta et ses relevés le lisent toujours.
  perso = mettreDeCote(perso, DEBORDE);
  await a.repo.meta.ecrire('motsPerso', perso);

  const [f] = await exporter(a.repo, { versionApp: '9.0.0' });
  const contenu = contenuDe(f);
  assert.equal(contenu.formatVersion, FORMAT_VERSION);
  assert.equal(contenu.schemaVersion, 6);
  assert.deepEqual(motsPersoDe(contenu.data.meta), perso);
  assert.deepEqual(contenu.data.humeurs.map((h) => h.emotion).sort(), [FLOTTANT, DEBORDE].sort());

  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  assert.deepEqual(motsPersoDe(analyse.valides.meta), perso, 'aucun mot recréé : tous sont connus');
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.humeurs.lire(h1.id), h1);
  assert.deepEqual(await b.repo.humeurs.lire(h2.id), h2);
  const lus = await b.repo.meta.lire('motsPerso');
  assert.deepEqual(lus, perso);
  assert.equal(libelleEmotion(DEBORDE, lus), 'Débordé');
  assert.equal(zoneDe(DEBORDE, lus), 'rouge');
  assert.deepEqual(motsActifs(lus).map((m) => m.id), [FLOTTANT]);
  // Et un second export redonne les mêmes octets.
  const [g] = await exporter(b.repo, { versionApp: '9.0.0' });
  assert.ok(Buffer.from(octetsDe(g)).equals(Buffer.from(octetsDe(f))));
});

// Point de vigilance 4 : un relevé qui cite un mot à soi que le fichier ne connaît pas (méta perdue ou retouchée à la main)
// n'est jamais perdu. Le mot est recréé mis de côté, « Mot sans libellé », sans zone ni famille, daté du fichier.
test('v9 : un relevé qui cite un mot à soi absent du fichier le recrée, mis de côté, sans libellé ni zone', async () => {
  const absent = 'roue:perso:u-99999999';
  const illisible = 'roue:perso:u-33333333';
  const flottant = { libelle: 'Flottant', zone: 'bleu', famille: 'tristesse', definition: null, archive: false, createdAt: '2026-11-01T08:00:00.000Z' };
  const v7 = {
    format: 'carnet-sauvegarde', formatVersion: 7, schemaVersion: 6, exportedAt: '2026-11-05T19:00:00.000Z',
    counts: { humeurs: 6, meta: 1 },
    data: {
      humeurs: [
        { id: 'hu_1', date: '2026-11-04', heure: '09:00', emotion: FLOTTANT, energie: 'energie:basse' },
        { id: 'hu_2', date: '2026-11-04', heure: '10:00', emotion: absent, energie: 'energie:haute', faisais: ['activiteMoment:travail'] },
        { id: 'hu_3', date: '2026-11-04', heure: '11:00', emotion: absent },
        { id: 'hu_4', date: '2026-11-04', heure: '12:00', emotion: illisible, energie: 'energie:basse' },
        // Refusés : une date impossible (rien n'est recréé pour lui), un id qui n'a pas la forme d'un mot à soi.
        { id: 'hu_5', date: '2026-13-04', heure: '13:00', emotion: 'roue:perso:u-77777777' },
        { id: 'hu_6', date: '2026-11-04', heure: '14:00', emotion: 'roue:perso:zzz' },
      ],
      meta: [{ cle: 'motsPerso', valeur: { [FLOTTANT]: flottant, [illisible]: { libelle: '  ', zone: 'rouge' } } }],
    },
  };
  const avant = structuredClone(v7);
  const a = analyserFichiers(json(v7));
  assert.deepEqual(v7, avant, 'le fichier lu n\'est pas modifié');
  assert.equal(a.erreurs.length, 2);
  assert.match(a.erreurs[0], /humeurs n° 5 : date : date invalide/);
  assert.match(a.erreurs[1], /humeurs n° 6 : emotion : émotion inconnue/);
  assert.deepEqual(a.valides.humeurs.map((h) => h.id), ['hu_1', 'hu_2', 'hu_3', 'hu_4'], 'aucun relevé perdu');
  const recree = { libelle: MOT_SANS_LIBELLE, zone: null, famille: null, definition: null, archive: true, createdAt: v7.exportedAt };
  assert.deepEqual(motsPersoDe(a.valides.meta), { [FLOTTANT]: flottant, [illisible]: recree, [absent]: recree });

  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  const perso = await repo.meta.lire('motsPerso');
  const lu = await repo.humeurs.lire('hu_2');
  assert.equal(lu.energie, 'energie:haute', 'l\'énergie enregistrée reste');
  assert.deepEqual(lu.faisais, ['activiteMoment:travail']);
  assert.equal(libelleEmotion(absent, perso), 'Mot sans libellé');
  assert.equal(familleDe(absent, perso), null);
  assert.equal(zoneDe(absent, perso), null, 'zone inconnue');
  assert.equal(energieDe(absent, perso), null);
  assert.ok(!motsDeLaCarte(perso).some((m) => m.id === absent || m.id === illisible), 'hors de la carte');
  assert.deepEqual(motsActifs(perso).map((m) => m.id), [FLOTTANT], 'hors de la recherche');
  // Le relevé reste modifiable : le mot recréé est connu de la validation.
  assert.deepEqual((await repo.humeurs.modifier('hu_3', { vers: true })).emotion, absent);

  // Sans méta du tout, la méta est créée avec le seul mot recréé ; sans rien à recréer, la méta du fichier reste, remise en
  // forme (relecture finale) : l'entrée illisible, qu'aucun relevé ne cite plus, s'en va.
  const sansMeta = analyserFichiers(json({ ...v7, counts: { humeurs: 1 }, data: { humeurs: [v7.data.humeurs[1]] } }));
  assert.deepEqual(sansMeta.erreurs, []);
  assert.deepEqual(sansMeta.valides.meta, [{ cle: 'motsPerso', valeur: { [absent]: recree } }]);
  const rienARecreer = analyserFichiers(json({ ...v7, counts: { humeurs: 1, meta: 1 }, data: { humeurs: [v7.data.humeurs[0]], meta: v7.data.meta } }));
  assert.deepEqual(rienARecreer.valides.meta, [{ cle: 'motsPerso', valeur: { [FLOTTANT]: flottant } }]);
});

// Relecture finale : la méta `motsPerso` d'un fichier qui ne vient pas de Carnet (écrite à la main) est remise dans la
// forme que l'app écrit avant la lecture des relevés : une seule bulle par nom sur la carte et dans la loupe, un libellé
// à la longueur du clavier, zone, famille, définition et mise de côté lisibles. Aucun relevé n'est perdu.
test('v9 : l\'import remet en forme les mots à soi d\'un fichier écrit à la main ; une seule bulle par nom, les relevés gardés', async () => {
  const id = (n) => `roue:perso:u-${String(n).padStart(8, '0')}`;
  const mot = (libelle, champs = {}) => ({ libelle, zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-11-01T08:00:00.000Z', ...champs });
  const brut = {
    [id(1)]: mot('Calme'), // le nom d'un des 144
    [id(2)]: mot('Flou', { zone: 'bleu', createdAt: '2026-11-02T08:00:00.000Z' }),
    [id(3)]: mot('flou', { zone: 'jaune', createdAt: '2026-11-03T08:00:00.000Z' }), // le même nom, créé après
    [id(4)]: mot('Très long'.padEnd(5000, '.'), { zone: 'rouge' }),
    [id(5)]: mot('Pas de côté', { archive: 'non' }),
    [id(6)]: mot('Violet', { zone: 'violet', famille: 'amour', definition: 12 }),
    [id(7)]: mot('  Ailleurs  ', { famille: 'serenite', definition: '  Un peu loin.  ' }),
    'roue:perso:zzz': mot('Mal formé'),
  };
  const humeurs = Object.keys(brut).filter((k) => k !== 'roue:perso:zzz')
    .map((emotion, i) => ({ id: `hu_${i + 1}`, date: '2026-11-04', heure: `1${i}:00`, emotion }));
  const fichier = {
    format: 'carnet-sauvegarde', formatVersion: 7, schemaVersion: 6, exportedAt: '2026-11-05T19:00:00.000Z',
    counts: { humeurs: humeurs.length, meta: 1 }, data: { humeurs, meta: [{ cle: 'motsPerso', valeur: brut }] },
  };
  const avant = structuredClone(fichier);
  const a = analyserFichiers(json(fichier));
  assert.deepEqual(fichier, avant, 'le fichier lu n\'est pas modifié');
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual(a.valides.humeurs.map((h) => h.emotion), humeurs.map((h) => h.emotion), 'aucun relevé perdu');
  const perso = motsPersoDe(a.valides.meta);
  assert.equal(perso['roue:perso:zzz'], undefined, 'un id mal formé n\'est pas un mot à soi');
  assert.equal(perso[id(1)].archive, true, 'Calme est déjà sur la carte');
  assert.equal(perso[id(2)].archive, false);
  assert.equal(perso[id(3)].archive, true, 'flou : le nom de Flou, créé avant lui');
  assert.equal(perso[id(4)].libelle.length, LIBELLE_MAX);
  assert.equal(perso[id(5)].archive, false, 'seul true met de côté');
  assert.deepEqual([perso[id(6)].zone, perso[id(6)].famille, perso[id(6)].definition, perso[id(6)].archive], [null, null, null, true], 'sans zone de la carte, mis de côté');
  assert.deepEqual([perso[id(7)].libelle, perso[id(7)].famille, perso[id(7)].definition], ['Ailleurs', 'serenite', 'Un peu loin.']);
  // Sur la carte : une bulle par nom (les 144, Flou, le long libellé coupé, « Pas de côté », Ailleurs) ; la loupe ne
  // trouve qu'un Calme.
  const carte = motsDeLaCarte(perso);
  assert.equal(carte.length, 148);
  assert.equal(new Set(carte.map((m) => normLabel(m.libelle))).size, carte.length);
  assert.deepEqual(chercher(perso, 'calme').filter((r) => normLabel(r.libelle) === 'calme').map((r) => r.id), ['roue:serenite:calme']);
  // Écrits tels quels, les relevés relisent leur mot ; une méta déjà propre ne change pas.
  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  const lu = await repo.meta.lire('motsPerso');
  assert.equal(libelleEmotion(id(3), lu), 'flou');
  assert.equal(zoneDe(id(6), lu), null);
  assert.deepEqual(normaliserPerso(lu), lu);
});

// Contre-relecture : un mot à soi d'un fichier écrit à la main, sans zone de la carte (absente, null ou inconnue) et pas
// mis de côté, restait ainsi après l'import : hors de la carte, il échappait au contrôle « une seule bulle par nom », et
// le choix de sa couleur (Réglages › Mes mots, modifierMot) l'y faisait entrer avec le nom d'un autre (deux « Calme »).
// Il est maintenant mis de côté, comme un mot recréé : il revient par sa couleur, puis « Remettre sur la carte », qui
// refuse un nom déjà pris.
test('v9 : un mot à soi importé sans zone de la carte est mis de côté ; il ne revient pas sur la carte avec un nom déjà pris', async () => {
  const id = (n) => `roue:perso:u-${String(n).padStart(8, '0')}`;
  const brut = {
    [id(1)]: { libelle: 'Calme', zone: 'violet', famille: null, definition: null, archive: false, createdAt: '2026-11-01T08:00:00.000Z' },
    [id(2)]: { libelle: 'Flou', zone: null, archive: false, createdAt: '2026-11-02T08:00:00.000Z' },
    [id(3)]: { libelle: 'flou', archive: false, createdAt: '2026-11-03T08:00:00.000Z' },
    [id(4)]: { libelle: 'Ailleurs', zone: 'orange', archive: false, createdAt: '2026-11-04T08:00:00.000Z' },
  };
  const fichier = {
    format: 'carnet-sauvegarde', formatVersion: 7, schemaVersion: 6, exportedAt: '2026-11-05T19:00:00.000Z',
    counts: { humeurs: 1, meta: 1 }, data: { humeurs: [{ id: 'hu_1', date: '2026-11-04', heure: '10:00', emotion: id(1) }], meta: [{ cle: 'motsPerso', valeur: brut }] },
  };
  const a = analyserFichiers(json(fichier));
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual(a.valides.humeurs.map((h) => h.emotion), [id(1)], 'le relevé est gardé');
  const perso = motsPersoDe(a.valides.meta);
  for (const n of [1, 2, 3, 4]) assert.deepEqual([perso[id(n)].zone, perso[id(n)].archive], [null, true], id(n));
  assert.deepEqual(normaliserPerso(perso), perso);
  assert.equal(motsDeLaCarte(perso).length, 144);
  assert.deepEqual(motsActifs(perso), []);

  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  const lu = await repo.meta.lire('motsPerso');
  assert.equal(libelleEmotion(id(1), lu), 'Calme', 'ses relevés le lisent toujours');
  // Sa couleur choisie, il reste de côté ; « Remettre sur la carte » refuse un nom déjà pris.
  const pris = (e) => e instanceof ErreurMot && e.code === 'LIBELLE_EXISTANT';
  let suite = modifierMot(lu, id(1), { zone: 'vert' });
  assert.deepEqual([suite[id(1)].zone, suite[id(1)].archive], ['vert', true]);
  assert.ok(!motsDeLaCarte(suite).some((m) => m.id === id(1)), 'pas sur la carte');
  assert.throws(() => remettreSurLaCarte(suite, id(1)), pris, 'Calme est un des 144');
  // Flou revient, puis flou, même nom sans casse, est refusé.
  suite = remettreSurLaCarte(modifierMot(modifierMot(suite, id(2), { zone: 'bleu' }), id(3), { zone: 'jaune' }), id(2));
  assert.throws(() => remettreSurLaCarte(suite, id(3)), pris);
  const carte = motsDeLaCarte(suite);
  assert.equal(carte.length, 145);
  assert.equal(new Set(carte.map((m) => normLabel(m.libelle))).size, carte.length, 'une seule bulle par nom');
});

test('v9 : l\'import remplace les mots à soi, l\'aperçu le dit, « Revenir » les remet', async () => {
  const ici = creerMot(null, { libelle: 'Ici', zone: 'vert' }, { id: FLOTTANT, maintenant: '2026-11-01T08:00:00.000Z' }).perso;
  const fichier = creerMot(null, { libelle: 'Du fichier', zone: 'jaune' }, { id: DEBORDE, maintenant: '2026-11-02T08:00:00.000Z' }).perso;
  const a = nouveauRepo();
  await remplir(a.repo);
  await a.repo.meta.ecrire('motsPerso', fichier);
  const [f] = await exporter(a.repo, { versionApp: '9.0.0' });

  const b = nouveauRepo();
  await b.repo.meta.ecrire('motsPerso', ici);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(metaRemplacee((await lireTout(b.repo)).meta, analyse.valides.meta), ['motsPerso']);
  await remplacer(b.repo, analyse);
  assert.deepEqual(await b.repo.meta.lire('motsPerso'), fichier);
  await revenirAvantImport(b.repo);
  assert.deepEqual(await b.repo.meta.lire('motsPerso'), ici);

  assert.equal(phraseMeta(['motsPerso']), 'Les mots ajoutés à la carte des émotions seront remplacés par ce que contient le fichier.');
  assert.equal(phraseMeta(['definitionsRoue', 'motsPerso']),
    'Les définitions des émotions et les mots ajoutés à la carte des émotions seront remplacés par ce que contient le fichier.');
});

// ---- v11 ----

test('v11 : le format 9 est refusé, un format 8 tronqué aussi, une sauvegarde au format 7 passe au format 8 sans rien transformer', () => {
  assert.equal(FORMAT_VERSION, 8);
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 9, counts: {}, data: {} })), (e) => e.code === 'BACKUP_VERSION_FUTURE');
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 8, counts: { journal: 2 }, data: { journal: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  const v7 = {
    format: 'carnet-sauvegarde', formatVersion: 7, schemaVersion: 6, exportedAt: '2026-11-04T19:00:00.000Z',
    counts: { journal: 1, episodes: 1, meta: 1 },
    data: {
      journal: [{ date: '2026-11-03', sommeilRessenti: 'sommeil:bien', heuresSommeil: 7, pointsPositifs: 'Marche au soleil' }],
      episodes: [{ id: 'ep_1', date: '2026-11-02', heure: '18:00', situation: 'Réunion déplacée', apresCoup: { jour: '2026-11-03', pensees: 'Encore un changement' } }],
      meta: [{ cle: 'favorisBienEtre', valeur: ['soupir'] }],
    },
  };
  const avant = structuredClone(v7);
  assert.deepEqual(MISES_A_NIVEAU[7](v7), { ...v7, formatVersion: 8 });
  const a = analyserFichiers(json(v7));
  assert.deepEqual(v7, avant, 'mise à niveau pure');
  assert.equal(a.sauvegarde.formatVersion, 8);
  assert.deepEqual(a.sauvegarde.data, v7.data, 'rien n\'est transformé');
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual([a.valides.journal[0].heuresSommeil, a.valides.journal[0].gratitudes], [7, null], 'aucune gratitude inventée');
  assert.deepEqual([a.valides.episodes[0].ceQueJeRetiens, a.valides.episodes[0].apresCoup.jour], [null, '2026-11-03']);
  assert.deepEqual(a.valides.meta, v7.data.meta, 'aucun refuge inventé');
});

test('v11 : une nuit à 7 h 30, des gratitudes, « Ce que j\'en retiens » et Mes refuges survivent à un export suivi d\'un import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  await a.repo.journal.patch('2026-09-30', { heuresSommeil: 7.5, gratitudes: 'Le pain partagé avec la voisine.' });
  // Une journée qui n'a que des gratitudes.
  await a.repo.journal.patch('2026-09-28', { gratitudes: 'Merci au collègue pour le trajet.' });
  const ep = await a.repo.episodes.creer({ date: '2026-09-29', heure: '18:00', situation: 'Réunion déplacée', apresCoup: { jour: '2026-09-29', pensees: 'Encore' } });
  await a.repo.episodes.modifier(ep.id, { ceQueJeRetiens: 'Demander l\'ordre du jour la veille.' });
  const refuges = {
    titres: 'Une chanson calme\nUne autre, plus lente',
    playlists: [
      { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: 'spotify' },
      { nom: null, lien: 'music://music.apple.com/fr/playlist/x', source: null },
    ],
  };
  await a.repo.meta.ecrire('refuges', refuges);

  const [f] = await exporter(a.repo, { versionApp: '11.0.0' });
  const contenu = contenuDe(f);
  assert.equal(contenu.formatVersion, 8);
  assert.equal(contenu.data.journal.find((j) => j.date === '2026-09-30').heuresSommeil, 7.5);
  assert.deepEqual(contenu.data.meta.find((m) => m.cle === 'refuges'), { cle: 'refuges', valeur: refuges });

  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  const nuit = await b.repo.journal.lire('2026-09-30');
  assert.deepEqual([nuit.heuresSommeil, nuit.gratitudes], [7.5, 'Le pain partagé avec la voisine.']);
  assert.equal((await b.repo.journal.lire('2026-09-28')).gratitudes, 'Merci au collègue pour le trajet.');
  const relu = await b.repo.episodes.lire(ep.id);
  assert.equal(relu.ceQueJeRetiens, 'Demander l\'ordre du jour la veille.');
  assert.deepEqual(relu.apresCoup, ep.apresCoup, 'l\'Après coup n\'en est pas touché');
  assert.deepEqual(await b.repo.meta.lire('refuges'), refuges);
  // Et un second export redonne les mêmes octets.
  const [g] = await exporter(b.repo, { versionApp: '11.0.0' });
  assert.ok(Buffer.from(octetsDe(g)).equals(Buffer.from(octetsDe(f))));
});

// Point de vigilance 4 : une sauvegarde abîmée ou modifiée à la main. Ses refuges sont remis dans la forme que l'app écrit :
// tout ce qui ne va pas est ignoré ou remis en forme, sans erreur, et rien d'autre du fichier n'est perdu.
test('v11 : des refuges abîmés ou écrits à la main sont remis en forme à l\'import, sans erreur ; vides, ils ne sont pas gardés', async () => {
  const fichier = (valeur, autres = []) => ({
    format: 'carnet-sauvegarde', formatVersion: 8, schemaVersion: 6, exportedAt: '2026-11-05T19:00:00.000Z',
    counts: { journal: 1, meta: 1 + autres.length },
    data: { journal: [{ date: '2026-11-04', pointsPositifs: 'Marche' }], meta: [{ cle: 'refuges', valeur }, ...autres] },
  });
  const refugesDe = (a) => (a.valides.meta.find((m) => m.cle === 'refuges') || {}).valeur;
  const brut = {
    titres: '  Une chanson calme  ',
    playlists: [
      { nom: '<img src=x onerror=alert(1)>', lien: 'javascript:alert(1)', source: null },
      null,
      { nom: '', lien: 'data:text/html,x' },
      { nom: 'Sans chiffrement', lien: 'http://open.spotify.com/playlist/x' },
      { nom: 'Ailleurs', lien: 'https://open.spotify.com.autre.test/p', source: 'spotify' },
      { nom: 'De trop', lien: 'https://open.spotify.com/playlist/y' },
    ],
    jeton: 'jamais gardé',
  };
  const avant = structuredClone(brut);
  const a = analyserFichiers(json(fichier(brut)));
  assert.deepEqual(brut, avant, 'le fichier lu n\'est pas modifié');
  assert.deepEqual(a.erreurs, []);
  assert.deepEqual(refugesDe(a), {
    titres: 'Une chanson calme',
    playlists: [
      { nom: '<img src=x onerror=alert(1)>', lien: null, source: null },
      { nom: 'Sans chiffrement', lien: null, source: null },
      { nom: 'Ailleurs', lien: null, source: null },
    ],
  }, 'trois au plus, sans lien d\'un autre schéma ni d\'un autre hôte, et sans « Spotify » quand son lien est refusé ; une ligne sans nom ni lien lisible disparaît ; un nom reste du texte');
  assert.equal(a.resume.journees, 1, 'le reste du fichier est lu');

  // Cinq playlists : les trois premières lisibles ; un lien de partage perd son « ?si= » ; une autre source vaut null.
  const cinq = analyserFichiers(json(fichier({
    playlists: [1, 2, 3, 4, 5].map((n) => ({ nom: `P${n}`, lien: `https://open.spotify.com/playlist/p${n}?si=abc`, source: n === 2 ? 'deezer' : 'spotify' })),
  })));
  assert.deepEqual(cinq.erreurs, []);
  assert.deepEqual(refugesDe(cinq), {
    titres: null,
    playlists: [1, 2, 3].map((n) => ({ nom: `P${n}`, lien: `https://open.spotify.com/playlist/p${n}`, source: n === 2 ? null : 'spotify' })),
  });

  // Un mauvais type, ou des refuges vides : la clé n'est pas gardée, et rien n'est en erreur.
  for (const valeur of ['du texte', 12, null, [], { titres: '   ', playlists: [{ nom: ' ', lien: 'ftp://x' }] }]) {
    const vide = analyserFichiers(json(fichier(valeur)));
    assert.deepEqual(vide.erreurs, [], JSON.stringify(valeur));
    assert.equal(refugesDe(vide), undefined, JSON.stringify(valeur));
    assert.equal(vide.valides.journal.length, 1);
  }
  // Deux clés « refuges » dans un fichier écrit à la main : la première seule, comme les mots à soi.
  const deux = analyserFichiers(json(fichier({ titres: 'Premier' }, [{ cle: 'refuges', valeur: { titres: 'Second' } }])));
  assert.deepEqual(deux.valides.meta.filter((m) => m.cle === 'refuges'), [{ cle: 'refuges', valeur: { titres: 'Premier', playlists: [] } }]);

  // Écrits tels quels : la base n'a que la forme propre.
  const { repo } = nouveauRepo();
  await remplacer(repo, a);
  assert.deepEqual(await repo.meta.lire('refuges'), refugesDe(a));
});

test('v11 : l\'import remplace Mes refuges ; un fichier qui n\'en a pas les retire, « Revenir » les remet', async () => {
  const ici = { titres: 'Écrits ici', playlists: [] };
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '11.0.0' });
  const b = nouveauRepo();
  await b.repo.meta.ecrire('refuges', ici);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(metaRemplacee((await lireTout(b.repo)).meta, analyse.valides.meta), ['refuges']);
  await remplacer(b.repo, analyse);
  assert.equal(await b.repo.meta.lire('refuges'), null);
  await revenirAvantImport(b.repo);
  assert.deepEqual(await b.repo.meta.lire('refuges'), ici);
});
