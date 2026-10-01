import { test, expect } from '../aides/gardes.js';

test('ouvre toujours sur Aujourd\'hui, même avec un autre hash au départ', async ({ page }) => {
  await page.goto('/#/reglages');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByRole('heading', { name: "Aujourd'hui" })).toBeVisible();
});

test('les onglets mènent aux écrans, sans pastille ni compteur', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav.getByRole('link')).toHaveText(["Aujourd'hui", 'Analyse', 'Historique', 'Soins', 'Réglages']);
  await nav.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByText('Tes données restent sur cet iPhone.')).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Réglages' })).toHaveAttribute('aria-current', 'page');
});

test('l\'appui long sur la version ouvre le diagnostic', async ({ page }) => {
  await page.goto('/');
  await page.goto('/#/reglages');
  const version = page.locator('.version-app');
  const boite = await version.boundingBox();
  await page.mouse.move(boite.x + 5, boite.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Diagnostic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Partager un ZIP' })).toBeVisible();
});

test('une route inconnue ramène sur Aujourd\'hui', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { location.hash = '#/nimporte'; });
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});
