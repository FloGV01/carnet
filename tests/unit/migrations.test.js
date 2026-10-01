import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { ouvrirBase, MIGRATIONS, STORES, DB_VERSION } from '../../public/js/db/migrations.js';
import { req } from '../../public/js/db/idb.js';
import { nouveauRepo } from '../aides/repo.js';

const H = '2026-10-01T10:00:00.000Z';
const lireTout = (db, store) => new Promise((ok) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => ok(r.result); });

test('base neuve : 9 stores, version 1', async () => {
  const db = await ouvrirBase({ fabrique: new IDBFactory(), horodatage: H });
  assert.equal(db.version, DB_VERSION);
  assert.deepEqual([...db.objectStoreNames].sort(), [...STORES].sort());
  assert.equal((await lireTout(db, 'listes')).length, 97);
  db.close();
});

test('réouverture sans nouvel ensemencement', async () => {
  const fabrique = new IDBFactory();
  const { repo } = nouveauRepo({ fabrique });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  await repo.fermer();
  const db = await ouvrirBase({ fabrique, horodatage: H });
  const listes = await lireTout(db, 'listes');
  assert.equal(listes.length, 97);
  assert.equal(listes.find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  db.close();
});

test('une v2 fictive garde les données, prend une copie et respecte un libellé renommé', async () => {
  const fabrique = new IDBFactory();
  const { repo } = nouveauRepo({ fabrique });
  await repo.journal.patch('2026-09-30', { humeur: 6, lieu: 'lieu:bureau' });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  await repo.fermer();
  const v2 = {
    ...MIGRATIONS,
    2(db, tx) {
      db.createObjectStore('nouveau', { keyPath: 'id' });
      const os = tx.objectStore('listes');
      const r = os.get('lieu:bureau');
      r.onsuccess = () => { if (!r.result) os.put({ id: 'lieu:bureau', libelle: 'Bureau' }); };
    },
  };
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: v2 });
  assert.equal(db.version, 2);
  assert.equal((await lireTout(db, 'journal'))[0].humeur, 6);
  assert.equal((await lireTout(db, 'listes')).find((i) => i.id === 'lieu:bureau').libelle, 'Au bureau');
  const snaps = await lireTout(db, 'snapshots');
  assert.equal(snaps[0].id, 'avant-migration-v1');
  assert.equal(snaps[0].data.journal[0].humeur, 6);
  db.close();
});

test('une migration qui échoue laisse la v1 intacte', async () => {
  const fabrique = new IDBFactory();
  const { repo } = nouveauRepo({ fabrique });
  await repo.journal.patch('2026-09-30', { humeur: 3 });
  await repo.fermer();
  const casse = { ...MIGRATIONS, 2() { throw new Error('boum'); } };
  await assert.rejects(ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: casse }));
  const db = await ouvrirBase({ fabrique, horodatage: H });
  assert.equal(db.version, 1);
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
  const v2 = { ...MIGRATIONS, 2() {} };
  const db = await ouvrirBase({ fabrique, horodatage: H, version: 2, migrations: v2 });
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
