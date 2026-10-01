import { test, expect } from '../aides/gardes.js';

test('nouvelle version : bandeau, puis rechargement au toucher seulement', async ({ page, request }) => {
  await page.goto('/?sw');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.evaluate(() => { window.__marqueur = 1; });
  await request.get('/__test/bump-sw');
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  const bandeau = page.getByText('Nouvelle version prête');
  await expect(bandeau).toBeVisible();
  expect(await page.evaluate(() => window.__marqueur)).toBe(1);
  await page.getByRole('button', { name: 'Recharger' }).click();
  await page.waitForFunction(() => window.__marqueur === undefined);
  await expect(page.getByRole('heading', { name: "Aujourd'hui" })).toBeVisible();
  await expect(bandeau).toHaveCount(0);
});
