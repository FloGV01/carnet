import { test, expect } from '../aides/gardes.js';

// La couche de données dans le vrai moteur (WebKit), pas seulement dans fake-indexeddb.
test('écritures concurrentes, mémo, migration fictive : WebKit tient les invariants', async ({ page }) => {
  await page.goto('/');
  const res = await page.evaluate(async () => {
    const { creerRepository } = await import('/js/db/repository.js');
    const { ouvrirBase, MIGRATIONS } = await import('/js/db/migrations.js');
    const repo = creerRepository({ nom: 'carnet-e2e' });
    await Promise.all([
      repo.journal.patch('2026-09-30', { humeur: 7 }),
      repo.journal.patch('2026-09-30', { lieu: 'lieu:bureau' }),
      repo.journal.patch('2026-09-30', { explosions: 0 }),
    ]);
    const j = await repo.journal.lire('2026-09-30');
    const ep = await repo.episodes.creer({ date: '2026-10-01', heure: '01:30', emotion: 'emotion:colere' });
    const a = await repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, dureeMs: 1000, mime: 'audio/mp4', data: new Uint8Array([1, 2, 3]).buffer });
    const relu = await repo.audios.lire(a.id);
    const duJour = await repo.episodes.parJour('2026-09-30', '2026-09-30');
    await repo.fermer();
    const db = await ouvrirBase({ nom: 'carnet-e2e', horodatage: 'x', version: 7, migrations: { ...MIGRATIONS, 7(d) { d.createObjectStore('essai', { keyPath: 'id' }); } } });
    const snaps = await new Promise((ok) => { const r = db.transaction('snapshots').objectStore('snapshots').getAll(); r.onsuccess = () => ok(r.result); });
    db.close();
    await new Promise((ok) => { const r = indexedDB.deleteDatabase('carnet-e2e'); r.onsuccess = ok; r.onerror = ok; r.onblocked = ok; });

    // Vraies migrations 1 → 6 dans WebKit : données gardées, humeurs, listes v4 et v6 ajoutées une
    // fois, détail de contact v4 transformé en ligne (v5), notes et champ Humeur masqué (v6), séances (v7),
    // sujets d'un rendez-vous et « Nuit en détail » masqué (v8).
    const v1 = await ouvrirBase({ nom: 'carnet-e2e-v1', horodatage: 'x', version: 1, migrations: { 1: MIGRATIONS[1] } });
    await new Promise((ok) => {
      const t = v1.transaction(['journal', 'meta'], 'readwrite');
      t.objectStore('journal').put({ date: '2026-09-30', humeur: 4, contactAvec: ['contactAvec:famille'], contactEffet: 'contactEffet:neutre' });
      t.objectStore('meta').put({ cle: 'journee', valeur: { ordre: ['lieu', 'humeur'], masques: ['explosions'], heuresMoment: [] } });
      t.oncomplete = ok;
    });
    v1.close();
    const v2 = creerRepository({ nom: 'carnet-e2e-v1' });
    const lu = await v2.journal.lire('2026-09-30');
    const migre = { journal: lu.humeur, contacts: lu.contacts, ancien: 'contactAvec' in lu, listes: (await v2.listes.items()).length, sujets: (await v2.listes.items('sujetRdv')).length, humeurs: (await v2.humeurs.tous()).length, notes: (await v2.notes.tous()).length, seances: (await v2.seances.tous()).length, schema: await v2.meta.lire('schema'), journee: await v2.meta.lire('journee') };
    await v2.fermer();
    await new Promise((ok) => { const r = indexedDB.deleteDatabase('carnet-e2e-v1'); r.onsuccess = ok; r.onerror = ok; r.onblocked = ok; });
    return {
      humeur: j.humeur, lieu: j.lieu, explosions: j.explosions,
      octets: Array.from(new Uint8Array(relu.data)), duJour: duJour.map((e) => e.id === ep.id), snap: snaps[0] && snaps[0].id, migre,
    };
  });
  expect(res).toEqual({ humeur: 7, lieu: 'lieu:bureau', explosions: 0, octets: [1, 2, 3], duJour: [true], snap: 'avant-migration-v6',
    migre: { journal: 4, contacts: [{ avec: ['contactAvec:famille'], effet: 'contactEffet:neutre' }], ancien: false, listes: 204, sujets: 7, humeurs: 0, notes: 0, seances: 0, schema: 6,
      journee: { ordre: ['lieu', 'humeur'], masques: ['explosions', 'humeur', 'nuit'], heuresMoment: [] } } });
});
