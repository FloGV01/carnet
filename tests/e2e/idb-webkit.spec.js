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
    const db = await ouvrirBase({ nom: 'carnet-e2e', horodatage: 'x', version: 2, migrations: { ...MIGRATIONS, 2(d) { d.createObjectStore('essai', { keyPath: 'id' }); } } });
    const snaps = await new Promise((ok) => { const r = db.transaction('snapshots').objectStore('snapshots').getAll(); r.onsuccess = () => ok(r.result); });
    db.close();
    await new Promise((ok) => { const r = indexedDB.deleteDatabase('carnet-e2e'); r.onsuccess = ok; r.onerror = ok; r.onblocked = ok; });
    return {
      humeur: j.humeur, lieu: j.lieu, explosions: j.explosions,
      octets: Array.from(new Uint8Array(relu.data)), duJour: duJour.map((e) => e.id === ep.id), snap: snaps[0] && snaps[0].id,
    };
  });
  expect(res).toEqual({ humeur: 7, lieu: 'lieu:bureau', explosions: 0, octets: [1, 2, 3], duJour: [true], snap: 'avant-migration-v1' });
});
