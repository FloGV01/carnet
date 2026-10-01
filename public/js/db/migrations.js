// Schéma versionné de la base « carnet ». Une migration publiée est FIGÉE : elle ne lit
// aucune constante vivante (empreintes dans tests/unit/migrations.lock.json).
// Règles : uniquement des ajouts, jamais de suppression de store ou d'index portant des données.
import { SEED_V1, seedItems } from '../domain/vocabulaire.js';
import { DataError } from './erreurs.js';

export const DB_VERSION = 1;
export const STORES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'listes', 'meta', 'snapshots', 'audios'];
export const MAX_SNAPSHOTS = 3;

export const MIGRATIONS = {
  1(db, tx, ctx) {
    db.createObjectStore('journal', { keyPath: 'date' });
    for (const nom of ['episodes', 'symptomes', 'traitements']) db.createObjectStore(nom, { keyPath: 'id' }).createIndex('date', 'date');
    db.createObjectStore('rdv', { keyPath: 'id' });
    const listes = db.createObjectStore('listes', { keyPath: 'id' });
    listes.createIndex('liste', 'liste');
    const meta = db.createObjectStore('meta', { keyPath: 'cle' });
    db.createObjectStore('snapshots', { keyPath: 'id' });
    const audios = db.createObjectStore('audios', { keyPath: 'id' });
    audios.createIndex('parent', ['parentStore', 'parentId']);
    audios.createIndex('date', 'date');
    for (const item of seedItems(SEED_V1, ctx.horodatage)) listes.put(item);
    meta.put({ cle: 'schema', valeur: 1 });
    meta.put({ cle: 'installation', valeur: ctx.horodatage });
  },
};

// Copie de secours des stores existants, dans la transaction de mise à niveau (sans audios).
function copieAvantMigration(db, tx, ancienne, horodatage) {
  const aCopier = [...db.objectStoreNames].filter((n) => !['snapshots', 'audios'].includes(n));
  const contenu = {};
  let restant = aCopier.length;
  const ecrire = () => {
    const snaps = tx.objectStore('snapshots');
    snaps.put({ id: `avant-migration-v${ancienne}`, type: 'avant-migration', date: horodatage, schemaVersion: ancienne, data: contenu });
  };
  for (const nom of aCopier) {
    const r = tx.objectStore(nom).getAll();
    r.onsuccess = () => { contenu[nom] = r.result; restant -= 1; if (restant === 0) ecrire(); };
  }
}

export function ouvrirBase({
  nom = 'carnet', fabrique = globalThis.indexedDB, horodatage, surVersionChange, surBloque,
  version = DB_VERSION, migrations = MIGRATIONS,
} = {}) {
  return new Promise((ok, ko) => {
    let r;
    try { r = fabrique.open(nom, version); } catch (e) { ko(e); return; }
    r.onupgradeneeded = (e) => {
      const db = r.result;
      const tx = r.transaction;
      const ctx = { horodatage };
      if (e.oldVersion > 0) copieAvantMigration(db, tx, e.oldVersion, horodatage);
      for (let v = e.oldVersion + 1; v <= version; v++) migrations[v](db, tx, ctx);
    };
    r.onblocked = () => { if (surBloque) surBloque(); };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => {
        Promise.resolve().then(() => surVersionChange && surVersionChange()).catch(() => {}).finally(() => db.close());
      };
      ok(db);
    };
    r.onerror = () => {
      const err = r.error;
      if (err && err.name === 'VersionError') ko(new DataError('VERSION_FUTURE', 'Cette base vient d\'une version plus récente de Carnet.'));
      else ko(err);
    };
  });
}
