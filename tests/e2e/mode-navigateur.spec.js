import { test, expect } from '../aides/gardes.js';

test('hors app installée : seulement le guide, aucune saisie possible', async ({ page }) => {
  await page.goto('/?forcer-guide');
  await expect(page.getByRole('heading', { name: 'Installer Carnet' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.locator('button, input, textarea, select')).toHaveCount(0);
});
