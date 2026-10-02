import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';

test('symptôme : parcours en 3 étapes depuis Aujourd\'hui, listé sous le jour', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 1, 20, 0) });
  await page.goto('/');
  await viderBase(page);
  await page.getByRole('link', { name: 'Symptôme', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'Ruminations' }).click();
  await d.getByRole('button', { name: 'Intensité 6' }).click();
  await d.getByRole('button', { name: 'Quelques heures' }).click();
  await page.locator('#symptomes-contexte').fill('après une réunion');
  await expect.poll(async () => (await page.evaluate(() => window.__carnet.repo.symptomes.tous()))[0]?.contexte).toBe('après une réunion');
  await d.getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByRole('link', { name: /Ruminations · 6 · Quelques heures/ })).toBeVisible();
  const [s] = await page.evaluate(() => window.__carnet.repo.symptomes.tous());
  expect(s).toMatchObject({ date: '2026-10-01', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures' });
});
