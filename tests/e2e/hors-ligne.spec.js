import { test, expect } from '../aides/gardes.js';

test('l\'app se relance hors ligne une fois le service worker prêt', async ({ page, context }) => {
  await page.goto('/?sw');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: "Aujourd'hui" })).toBeVisible();
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('prêt', { exact: true })).toBeVisible();
  await context.setOffline(false);
});
