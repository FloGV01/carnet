import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { generer } from '../fixtures/generateur.js';

// v8 : chaque nuit a ses heures (de 4 à 10 h) : la page porte « Nuit par nuit » sur 4 semaines, et reste d'une page.
test('vue soignants : aperçu dessiné, PDF d\'une page partagé', async ({ page }) => {
  test.setTimeout(120000);
  await installerPartageFactice(page);
  const journal = generer({ jours: 90, seed: 7, scenario: 'bureau', debut: '2026-07-02' }).map((j, i) => ({ ...j, heuresSommeil: 4 + (i % 7) }));
  await page.clock.install({ time: new Date(2026, 8, 29, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async (j) => {
    const r = window.__carnet.repo;
    for (const e of j) { const { date, ...x } = e; await r.journal.patch(date, x); }
    await r.rdv.creer({ date: '2026-10-08', professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Parler du sommeil' }] });
  }, journal);
  await aller(page, '#/soignants');
  const bouton = page.getByRole('button', { name: 'Partager en PDF' });
  await expect(bouton).toBeEnabled({ timeout: 15000 });
  const dims = await page.locator('canvas').evaluate((c) => [c.width, c.height]);
  expect(dims).toEqual([1654, 2339]);
  // La page de cet aperçu, refaite par les modules de l'app : « Nuit par nuit » sur 4 semaines, une barre par nuit, sous 273 mm.
  const page4 = await page.evaluate(async () => {
    const { modeleSoignants } = await import('/js/export/soignants.js');
    const { mettreEnPage, A4 } = await import('/js/export/page-a4.js');
    const { calculerAnalyse } = await import('/js/ui/ecrans/analyse.js');
    const r = window.__carnet.repo;
    const [{ resultat, carte }, journal, episodes, symptomes, traitements, rdvs, humeurs] = await Promise.all([
      calculerAnalyse(), r.journal.tous(), r.episodes.tous(), r.symptomes.tous(), r.traitements.tous(), r.rdv.tous(), r.humeurs.tous()]);
    const m = modeleSoignants({ journal, episodes, symptomes, traitements, humeurs }, { aujourdhui: r.aujourdhui(), carte, analyse: resultat, professionnel: 'professionnel:psychiatre', prenom: '', rdvs, traitements });
    const p = mettreEnPage(m);
    return { semaines: p.nuitsSemaines, barres: p.ops.filter((o) => o.type === 'nuit').length, tient: p.hauteur <= A4.hauteurMax };
  });
  expect(page4).toEqual({ semaines: 4, barres: 28, tient: true });
  await bouton.click();
  await expect.poll(async () => (await fichiersPartages(page)).length, { timeout: 30000 }).toBe(1);
  const [f] = await fichiersPartages(page);
  expect(f.nom).toBe('emozio-consultation-2026-09-29.pdf');
  expect(f.type).toBe('application/pdf');
  const debut = Buffer.from(f.octets.slice(0, 8)).toString('latin1');
  expect(debut).toBe('%PDF-1.4');
  const texte = Buffer.from(f.octets).toString('latin1');
  expect(texte).toContain('/Count 1');
  expect(texte).toContain('/Width 1654 /Height 2339');
});
