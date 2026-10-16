import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { ouvrirBase, MIGRATIONS, STORES, DB_VERSION } from '../../public/js/db/migrations.js';
import { req } from '../../public/js/db/idb.js';
import { nouveauRepo } from '../aides/repo.js';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';

const NB_V1 = seedItems(SEED_V1, 'x').length;
const NB_V2 = NB_V1 + seedItems(SEED_V2_AJOUTS, 'x').length;
const NB_V4 = NB_V2 + seedItems(SEED_V4_AJOUTS, 'x').length;
const SEULE_V1 = { 1: MIGRATIONS[1] };
const JUSQUA_V3 = { 1: MIGRATIONS[1], 2: MIGRATIONS[2], 3: MIGRATIONS[3] };
// Base créée telle qu'en v1 (avant la v4), avec un peu de données.
async function baseV1(fabrique, remplir) {
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 1, migrations: SEULE_V1 });
  await new Promise((ok, ko) => { const t = db.transaction(['journal', 'listes'], 'readwrite'); remplir(t); t.oncomplete = ok; t.onerror = () => ko(t.error); });
  db.close();
}
// Base créée telle qu'en v3 (app v5), avec un peu de données.
async function baseV3(fabrique, remplir) {
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 3, migrations: JUSQUA_V3 });
  await new Promise((ok, ko) => { const t = db.transaction([...db.objectStoreNames], 'readwrite'); remplir(t); t.oncomplete = ok; t.onerror = () => ko(t.error); });
  db.close();
}

const H = '2026-10-01T10:00:00.000Z';
const lireTout = (db, store) => new Promise((ok) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => ok(r.result); });
const lireMeta = async (db, cle) => (await lireTout(db, 'meta')).find((m) => m.cle === cle);

test('base neuve : 11 stores, version 4, listes v1, v4 et v6, aucun réglage écrit', async () => {
  const db = await ouvrirBase({ fabrique: new IDBFactory(), horodatage: H });
  assert.equal(db.version, DB_VERSION);
  assert.equal(DB_VERSION, 4);
  assert.equal(STORES.length, 11);
  assert.deepEqual([...db.objectStoreNames].sort(), [...STORES].sort());
  assert.equal((await lireTout(db, 'listes')).length, NB_V4);
  const meta = await lireTout(db, 'meta');
  assert.equal(meta.find((m) => m.cle === 'journee'), undefined, 'les réglages du soir se lisent par défaut (domain/journee.js)');
  assert.equal(meta.find((m) => m.cle === 'schema').valeur, 4);
  db.close();
});

test('migration 1 → 4 : données gardées, copie prise, libellé renommé respecté, listes ajoutées une fois', async () => {
  const fabrique = new IDBFactory();
  await baseV1(fabrique, (t) => {
    t.objectStore('journal').put({ date: '2026-09-30', humeur: 6, lieu: 'lieu:bureau' });
    t.objectStore('listes').put({ id: 'lieu:bureau', liste: 'lieu', libelle: 'Au bureau', ordre: 10, archive: false, alias: ['Bureau'] });
  });
  const db = await ouvrirBase({ fabrique, horodatage: H });
  assert.equal(db.version, 4);
  assert.equal((await lireTout(db, 'journal'))[0].humeur, 6);
  const listes = await lireTout(db, 'listes');
  assert.equal(listes.find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  assert.equal(listes.length, NB_V4);
  assert.ok(listes.find((i) => i.id === 'energie:basse'));
  assert.ok(listes.find((i) => i.id === 'pese:bruit'));
  const snaps = await lireTout(db, 'snapshots');
  assert.equal(snaps[0].id, 'avant-migration-v1');
  assert.equal(snaps[0].data.journal[0].humeur, 6);
  assert.deepEqual(await lireTout(db, 'humeurs'), []);
  assert.deepEqual(await lireTout(db, 'notes'), []);
  db.close();
  const db2 = await ouvrirBase({ fabrique, horodatage: H });
  assert.equal((await lireTout(db2, 'listes')).length, NB_V4, 'réouverture : aucun doublon');
  db2.close();
});

test('migration 3 → 4 : store notes, listes v6 ajoutées une fois sans écraser, enregistrements intacts, copie, masque Humeur', async () => {
  const fabrique = new IDBFactory();
  const ordre = ['humeur', 'lieu', 'sommeil', 'contact', 'sport', 'explosions', 'traitement', 'positifs'];
  const journal = { date: '2026-10-10', humeur: 6, lieu: 'lieu:bureau', contacts: [{ avec: ['contactAvec:famille'], effet: 'contactEffet:neutre' }], createdAt: H, updatedAt: H };
  const humeur = { id: 'hu_0000000000000001', date: '2026-10-11', heure: '01:30', humeur: 4, energie: 'energie:basse', createdAt: H, updatedAt: H };
  const episode = { id: 'ep_0000000000000001', date: '2026-10-10', heure: '18:42', emotion: 'emotion:colere', createdAt: H, updatedAt: H };
  const renomme = { id: 'pese:bruit', liste: 'pese', libelle: 'Le bruit', ordre: 30, archive: false, alias: ['Bruit'], origine: 'defaut', createdAt: H, updatedAt: H };
  const archive = { id: 'recharge:sieste', liste: 'recharge', libelle: 'Sieste / repos', ordre: 80, archive: true, alias: [], origine: 'defaut', createdAt: H, updatedAt: H };
  await baseV3(fabrique, (t) => {
    t.objectStore('journal').put(journal);
    t.objectStore('humeurs').put(humeur);
    t.objectStore('episodes').put(episode);
    t.objectStore('listes').put(renomme);
    t.objectStore('listes').put(archive);
    t.objectStore('meta').put({ cle: 'journee', valeur: { ordre, masques: ['explosions'], heuresMoment: [9, 14] } });
  });

  const db = await ouvrirBase({ fabrique, horodatage: '2026-10-15T08:00:00.000Z' });
  assert.equal(db.version, 4);
  const notes = db.transaction('notes').objectStore('notes');
  assert.equal(notes.keyPath, 'id');
  assert.deepEqual([...notes.indexNames], ['date']);
  assert.equal(notes.index('date').keyPath, 'date');

  const listes = await lireTout(db, 'listes');
  assert.equal(listes.length, NB_V4, 'chaque élément v6 une seule fois');
  assert.deepEqual(listes.find((i) => i.id === 'pese:bruit'), renomme, 'libellé renommé gardé');
  assert.deepEqual(listes.find((i) => i.id === 'recharge:sieste'), archive, 'élément archivé gardé');
  const nouveau = listes.find((i) => i.id === 'activiteMoment:travail');
  assert.equal(nouveau.libelle, 'Travail');
  assert.equal(nouveau.createdAt, '2026-10-15T08:00:00.000Z');

  assert.deepEqual(await lireTout(db, 'journal'), [journal]);
  assert.deepEqual(await lireTout(db, 'humeurs'), [humeur]);
  assert.deepEqual(await lireTout(db, 'episodes'), [episode]);
  assert.deepEqual(await lireTout(db, 'notes'), []);

  const [snap] = await lireTout(db, 'snapshots');
  assert.equal(snap.id, 'avant-migration-v3');
  assert.equal(snap.schemaVersion, 3);
  assert.deepEqual(snap.data.journal, [journal]);
  assert.equal(snap.data.notes, undefined);
  assert.deepEqual(snap.data.meta.find((m) => m.cle === 'journee').valeur.masques, ['explosions'], 'la copie garde les réglages d\'avant');

  assert.equal((await lireMeta(db, 'schema')).valeur, 4);
  assert.deepEqual((await lireMeta(db, 'journee')).valeur, { ordre, masques: ['explosions', 'humeur'], heuresMoment: [9, 14] });
  db.close();

  const db2 = await ouvrirBase({ fabrique, horodatage: H });
  assert.equal((await lireTout(db2, 'listes')).length, NB_V4, 'réouverture : aucun doublon');
  assert.deepEqual((await lireMeta(db2, 'journee')).valeur.masques, ['explosions', 'humeur']);
  db2.close();
});

test('migration 3 → 4 : Humeur masquée seulement si des champs masqués sont réglés, jamais en double', async () => {
  const cas = [
    { avant: { cle: 'journee', valeur: { masques: ['humeur', 'explosions'] } }, apres: { cle: 'journee', valeur: { masques: ['humeur', 'explosions'] } } },
    { avant: { cle: 'journee', valeur: { masques: [] } }, apres: { cle: 'journee', valeur: { masques: ['humeur'] } } },
    { avant: { cle: 'journee', valeur: { heuresMoment: [9] } }, apres: { cle: 'journee', valeur: { heuresMoment: [9] } } },
    { avant: { cle: 'journee', valeur: null }, apres: { cle: 'journee', valeur: null } },
    { avant: null, apres: undefined },
  ];
  for (const { avant, apres } of cas) {
    const fabrique = new IDBFactory();
    await baseV3(fabrique, (t) => { if (avant) t.objectStore('meta').put(avant); });
    const db = await ouvrirBase({ fabrique, horodatage: H });
    assert.deepEqual(await lireMeta(db, 'journee'), apres, JSON.stringify(avant));
    db.close();
  }
});

test('réouverture sans nouvel ensemencement', async () => {
  const fabrique = new IDBFactory();
  const { repo } = nouveauRepo({ fabrique });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  await repo.fermer();
  const db = await ouvrirBase({ fabrique, horodatage: H });
  const listes = await lireTout(db, 'listes');
  assert.equal(listes.length, NB_V4);
  assert.equal(listes.find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  db.close();
});

test('migration 2 → 4 : le détail de contact v4 devient une ligne, tel quel ; le reste est intact', async () => {
  const fabrique = new IDBFactory();
  const db2 = await ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: { 1: MIGRATIONS[1], 2: MIGRATIONS[2] } });
  await new Promise((ok, ko) => {
    const t = db2.transaction('journal', 'readwrite');
    const j = t.objectStore('journal');
    j.put({ date: '2026-10-03', humeur: 5, contactHumain: true, contactAvec: ['contactAvec:famille', 'contactAvec:collegues'], contactEffet: 'contactEffet:couteux' });
    j.put({ date: '2026-10-04', humeur: 6, contactAvec: null, contactEffet: 'contactEffet:neutre' });
    j.put({ date: '2026-10-05', humeur: 7, contactAvec: null, contactEffet: null });
    j.put({ date: '2026-10-06', humeur: 8 });
    t.oncomplete = ok; t.onerror = () => ko(t.error);
  });
  db2.close();
  const db = await ouvrirBase({ fabrique, horodatage: H });
  assert.equal(db.version, 4);
  const j = Object.fromEntries((await lireTout(db, 'journal')).map((e) => [e.date, e]));
  assert.deepEqual(j['2026-10-03'], { date: '2026-10-03', humeur: 5, contactHumain: true, contacts: [{ avec: ['contactAvec:famille', 'contactAvec:collegues'], effet: 'contactEffet:couteux' }] });
  assert.deepEqual(j['2026-10-04'].contacts, [{ avec: null, effet: 'contactEffet:neutre' }]);
  assert.deepEqual(j['2026-10-05'], { date: '2026-10-05', humeur: 7 });
  assert.deepEqual(j['2026-10-06'], { date: '2026-10-06', humeur: 8 });
  const snaps = await lireTout(db, 'snapshots');
  assert.equal(snaps[0].id, 'avant-migration-v2');
  assert.equal(snaps[0].data.journal.find((e) => e.date === '2026-10-03').contactEffet, 'contactEffet:couteux', 'la copie garde l\'ancien format');
  assert.equal((await lireMeta(db, 'schema')).valeur, 4);
  db.close();
});

test('une v5 fictive garde les données, prend une copie et respecte un libellé renommé', async () => {
  const fabrique = new IDBFactory();
  const { repo } = nouveauRepo({ fabrique });
  await repo.journal.patch('2026-09-30', { humeur: 6, lieu: 'lieu:bureau' });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  await repo.fermer();
  const v5 = {
    ...MIGRATIONS,
    5(db, tx) {
      db.createObjectStore('nouveau', { keyPath: 'id' });
      const os = tx.objectStore('listes');
      const r = os.get('lieu:bureau');
      r.onsuccess = () => { if (!r.result) os.put({ id: 'lieu:bureau', libelle: 'Bureau' }); };
    },
  };
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 5, migrations: v5 });
  assert.equal(db.version, 5);
  assert.equal((await lireTout(db, 'journal'))[0].humeur, 6);
  assert.equal((await lireTout(db, 'listes')).find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  const snaps = await lireTout(db, 'snapshots');
  assert.equal(snaps[0].id, 'avant-migration-v4');
  assert.equal(snaps[0].data.journal[0].humeur, 6);
  db.close();
});

test('une migration qui échoue laisse la v1 intacte', async () => {
  const fabrique = new IDBFactory();
  await baseV1(fabrique, (t) => t.objectStore('journal').put({ date: '2026-09-30', humeur: 3 }));
  const casse = { ...SEULE_V1, 2() { throw new Error('boum'); } };
  await assert.rejects(ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: casse }), (e) => e.code === 'MIGRATION_ECHOUEE');
  // Une requête refusée en cours de migration (clé invalide) annule tout de la même façon.
  const requeteRefusee = { ...SEULE_V1, 2(db, tx) { db.createObjectStore('humeurs', { keyPath: 'id' }); tx.objectStore('listes').put({ sansId: true }); } };
  await assert.rejects(ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: requeteRefusee }), (e) => e.code === 'MIGRATION_ECHOUEE' || e.name === 'DataError');
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 1, migrations: SEULE_V1 });
  assert.equal(db.version, 1);
  assert.deepEqual([...db.objectStoreNames].includes('humeurs'), false);
  assert.equal((await lireTout(db, 'journal'))[0].humeur, 3);
  db.close();
});

test('base plus récente que le code : VERSION_FUTURE', async () => {
  const fabrique = new IDBFactory();
  await new Promise((ok) => { const r = fabrique.open('carnet', 7); r.onsuccess = () => { r.result.close(); ok(); }; });
  const { repo } = nouveauRepo({ fabrique });
  await assert.rejects(repo.journal.lire('2026-09-30'), (e) => e.code === 'VERSION_FUTURE');
});

test('connexion perdue : réouverture puis écriture rejouée', async () => {
  const { repo } = nouveauRepo();
  const db = await repo.ouvrir();
  db.close();
  const e = await repo.journal.patch('2026-09-30', { humeur: 5 });
  assert.equal(e.humeur, 5);
});

test('une autre connexion qui monte de version ferme la nôtre proprement', async () => {
  const fabrique = new IDBFactory();
  let averti = 0;
  const { repo } = nouveauRepo({ fabrique, surVersionChange: () => { averti += 1; } });
  await repo.journal.patch('2026-09-30', { humeur: 5 });
  const v5 = { ...MIGRATIONS, 5() {} };
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 5, migrations: v5 });
  assert.equal(averti, 1);
  db.close();
  await assert.rejects(repo.journal.lire('2026-09-30'), (e) => e.code === 'VERSION_FUTURE');
});

test('req rejette sur erreur de requête', async () => {
  const db = await ouvrirBase({ fabrique: new IDBFactory(), horodatage: H });
  const tx = db.transaction('journal', 'readwrite');
  await assert.rejects(req(tx.objectStore('journal').add({ date: 'x' })).then(() => req(tx.objectStore('journal').add({ date: 'x' }))));
  db.close();
});
