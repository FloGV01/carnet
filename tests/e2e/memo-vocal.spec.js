import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';
import { installerMicroFactice } from '../aides/micro-stub.js';

// Micro factice (voir tests/aides/micro-stub.js) : la logique de l'app, pas la capture réelle.
const audios = (page) => page.evaluate(() => window.__carnet.repo.audios.metas());

test.beforeEach(async ({ page }) => { await installerMicroFactice(page); await page.goto('/'); await viderBase(page); });

test('mémo du jour : enregistrer, puce, relecture après rechargement, supprimer puis Annuler', async ({ page }) => {
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await expect(page.getByRole('button', { name: /Arrêter/ })).toBeVisible();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: /Arrêter/ }).click();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
  const [a] = await audios(page);
  expect(a.taille).toBeGreaterThan(0);
  expect(a.parentStore).toBe('journal');
  expect(await page.evaluate((d) => window.__carnet.repo.journal.lire(d), a.parentId)).not.toBeNull();
  await page.reload();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
  await page.getByRole('button', { name: 'Écouter le mémo' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer le mémo' }).click();
  await expect(page.getByText('Mémo supprimé')).toBeVisible();
  expect((await audios(page)).length).toBe(0);
  expect(await page.evaluate((d) => window.__carnet.repo.journal.lire(d), a.parentId)).toBeNull();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
});

test('passage en arrière-plan : l\'enregistrement s\'arrête et le mémo est gardé', async ({ page }) => {
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await audios(page)).length).toBe(1);
});

test('mémo dans un épisode : la fiche est créée si besoin', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Passer ›' }).click();
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Arrêter/ }).click();
  await expect(page.getByText(/Mémo vocal · 0:0/)).toBeVisible();
  const [a] = await audios(page);
  expect(a.parentStore).toBe('episodes');
  expect(await page.evaluate((id) => window.__carnet.repo.episodes.lire(id), a.parentId)).not.toBeNull();
});
