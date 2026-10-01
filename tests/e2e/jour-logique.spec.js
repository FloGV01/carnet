import { test, expect } from '../aides/gardes.js';
import { toucher, entreeDuJour, viderBase } from '../aides/saisie.js';

async function basculerVisibilite(page) {
  await page.evaluate(() => {
    const fixer = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
    fixer('hidden'); document.dispatchEvent(new Event('visibilitychange'));
    fixer('visible'); document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('à 01:30 la saisie va sur la veille ; le lendemain, retour au premier plan = nouvelle date', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 1, 1, 30) });
  await page.goto('/');
  await viderBase(page);
  await expect(page.getByRole('heading', { name: "Aujourd'hui · mercredi 30 sept." })).toBeVisible();
  await expect(page.getByText('Encore mercredi jusqu\'à 4 h.')).toBeVisible();
  await toucher(page, 'Lieu', 'Bureau');
  await expect.poll(async () => (await entreeDuJour(page, '2026-09-30'))?.lieu).toBe('lieu:bureau');
  await page.clock.setSystemTime(new Date(2026, 9, 1, 9, 0));
  await basculerVisibilite(page);
  await expect(page.getByRole('heading', { name: "Aujourd'hui · jeudi 1 oct." })).toBeVisible();
  await expect(page.getByText(/jusqu'à 4 h/)).toHaveCount(0);
});

test('jour passé : navigation, retour à aujourd\'hui, › désactivé sur aujourd\'hui', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 1, 20, 0) });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jour suivant' })).toBeDisabled();
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page.getByRole('heading', { name: 'mercredi 30 sept.' })).toBeVisible();
  await expect(page).toHaveURL(/#\/jour\/2026-09-30$/);
  await page.getByRole('link', { name: "Revenir à aujourd'hui" }).click();
  await expect(page.getByRole('heading', { name: "Aujourd'hui · jeudi 1 oct." })).toBeVisible();
});

test('après plus de 30 min en arrière-plan, retour sur Aujourd\'hui', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 1, 20, 0) });
  await page.goto('/');
  await page.getByRole('link', { name: 'Réglages' }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.setSystemTime(new Date(2026, 9, 1, 20, 45));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});
