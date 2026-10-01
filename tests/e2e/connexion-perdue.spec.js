import { test, expect } from '../aides/gardes.js';
import { toucher, entreeDuJour, viderBase } from '../aides/saisie.js';

test('connexion à la base fermée de force : réouverture et « Enregistré »', async ({ page }) => {
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => { const db = await window.__carnet.repo.ouvrir(); db.close(); });
  await toucher(page, 'Humeur', '5');
  await expect(page.getByText('Enregistré')).toBeVisible();
  await expect.poll(async () => (await entreeDuJour(page))?.humeur).toBe(5);
});
