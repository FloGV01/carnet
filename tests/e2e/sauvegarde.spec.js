import { test, expect } from '../aides/gardes.js';
import { viderBase, toucher, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

async function exporterVers(page) {
  await page.goto('/#/reglages/sauvegarde');
  await aller(page, '#/reglages/sauvegarde');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  return (await fichiersPartages(page))[0];
}

test('exporter puis restaurer sur une base vidée redonne les mêmes données', async ({ page }) => {
  await toucher(page, 'Humeur', '6');
  await toucher(page, 'Lieu', 'Bureau');
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere' }));
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ humeur: 6 });
  const f = await exporterVers(page);
  expect(f.nom).toBe('carnet-sauvegarde-2026-09-30-2100.json');
  await expect(page.getByText(/Dernière sauvegarde : 30 septembre 2026/)).toBeVisible();
  await viderBase(page);
  await aller(page, '#/reglages/sauvegarde');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/Ce fichier contient 1 journée, 1 épisode/)).toBeVisible();
  await page.getByRole('button', { name: 'Remplacer par ce fichier' }).click();
  await expect(page.getByText('Sauvegarde importée.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ humeur: 6, lieu: 'lieu:bureau' });
  expect((await page.evaluate(() => window.__carnet.repo.episodes.tous())).length).toBe(1);
});

test('perte chiffrée, refus d\'un fichier illisible, revenir à l\'état d\'avant l\'import', async ({ page }) => {
  await toucher(page, 'Humeur', '6');
  const f = await exporterVers(page);
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-09-29', { humeur: 3 }));
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oups') });
  await expect(page.getByText('Ce fichier est illisible.')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText('Ce qui est ici et absent du fichier sera effacé : 1 journée.')).toBeVisible();
  await expect(page.getByRole('button', { name: "Exporter d'abord" })).toBeVisible();
  await page.getByRole('button', { name: 'Remplacer par ce fichier' }).click();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  await page.getByRole('button', { name: "Revenir à l'état d'avant l'import" }).click();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toMatchObject({ humeur: 3 });
});

test('avec un mémo, la sauvegarde est un ZIP qui se restaure avec le son', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 1000, mime: 'audio/mp4', data: new Uint8Array([9, 8, 7]).buffer }));
  const f = await exporterVers(page);
  expect(f.nom).toMatch(/\.zip$/);
  await viderBase(page);
  await aller(page, '#/reglages/sauvegarde');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/zip', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/1 mémo vocal/)).toBeVisible();
  await page.getByRole('button', { name: 'Remplacer par ce fichier' }).click();
  await expect(page.getByText('Sauvegarde importée.')).toBeVisible();
  const octets = await page.evaluate(async () => { const [m] = await window.__carnet.repo.audios.parParent('journal', '2026-09-30'); return Array.from(new Uint8Array(m.data)); });
  expect(octets).toEqual([9, 8, 7]);
});

test('tout effacer : exige le mot EFFACER', async ({ page }) => {
  await toucher(page, 'Humeur', '8');
  await aller(page, '#/reglages/effacer');
  const bouton = page.getByRole('button', { name: 'Effacer définitivement' });
  await expect(bouton).toBeDisabled();
  await page.getByLabel('Écris EFFACER pour confirmer').fill('EFFACER');
  await bouton.click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await page.evaluate(() => window.__carnet.repo.journal.tous())).toEqual([]);
});
