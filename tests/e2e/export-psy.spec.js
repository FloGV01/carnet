import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';

test('export PSY : aperçu complet, copie dans le geste, mémos et traitement exclus', async ({ page, context, browserName }) => {
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.addInitScript(() => {
    window.__copie = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copie = t; } } });
  });
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-09-29', { humeur: 5, lieu: 'lieu:bureau', pointsPositifs: 'marche', traitementPris: 'traitementPris:partiel' });
    await r.journal.patch('2026-09-30', { humeur: 7, explosions: 0 });
    await r.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 1000, data: new ArrayBuffer(4) });
    await r.traitements.creer({ date: '2026-09-30', changement: 'ajustement du soir' });
    await r.rdv.creer({ date: '2026-10-02', professionnel: 'professionnel:psychiatre' });
  });
  await page.goto('/#/aujourdhui');
  await page.evaluate(() => { location.hash = '#/export-psy'; });
  const apercu = page.getByLabel('Aperçu du texte');
  await expect(apercu).toContainText('SUIVI APP · 7 jours du jeu 24/09 au mer 30/09/2026');
  await expect(apercu).toContainText('mar 29/09 · Bureau · humeur 5');
  await expect(apercu).toContainText('PSY : fais-moi le récap de la semaine, format habituel.');
  await expect(apercu).not.toContainText(/partiel|ajustement|Psychiatre|mémo|jeu 24\/09 ·/i);
  await page.getByRole('button', { name: 'Copier les 7 derniers jours pour PSY' }).click();
  await expect(page.getByText('Copié. Prêt à coller dans PSY.')).toBeVisible();
  expect(await page.evaluate(() => window.__copie)).toContain('mer 30/09 · humeur 7 · explosions 0');
  await expect(page.getByRole('link', { name: 'Faire aussi une sauvegarde' })).toBeVisible();
});
