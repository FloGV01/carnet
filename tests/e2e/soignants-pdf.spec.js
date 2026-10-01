import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { generer } from '../fixtures/generateur.js';

test('vue soignants : aperçu dessiné, PDF d\'une page partagé', async ({ page }) => {
  test.setTimeout(120000);
  await installerPartageFactice(page);
  const journal = generer({ jours: 90, seed: 7, scenario: 'bureau', debut: '2026-07-02' });
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
  await bouton.click();
  await expect.poll(async () => (await fichiersPartages(page)).length, { timeout: 30000 }).toBe(1);
  const [f] = await fichiersPartages(page);
  expect(f.nom).toBe('carnet-consultation-2026-09-29.pdf');
  expect(f.type).toBe('application/pdf');
  const debut = Buffer.from(f.octets.slice(0, 8)).toString('latin1');
  expect(debut).toBe('%PDF-1.4');
  const texte = Buffer.from(f.octets).toString('latin1');
  expect(texte).toContain('/Count 1');
  expect(texte).toContain('/Width 1654 /Height 2339');
});
