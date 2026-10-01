import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase } from '../aides/saisie.js';

test.beforeEach(async ({ page }) => { await page.goto('/'); await viderBase(page); });

test('les 7 champs en 7 touchers, sans frappe, sans défilement, sans bouton Enregistrer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  await toucher(page, 'Lieu', 'Bureau');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Humeur', '6');
  await toucher(page, 'Contact humain', 'Oui');
  await toucher(page, 'Sport / mouvement', 'Non');
  await toucher(page, 'Explosions', '0');
  await toucher(page, 'Traitement pris', 'Oui');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const zone = await page.locator('#points-positifs').boundingBox();
  const onglets = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox();
  expect(zone.y + zone.height).toBeLessThanOrEqual(onglets.y);
  await expect(page.getByRole('button', { name: /enregistrer/i })).toHaveCount(0);
  await expect(page.getByText('Enregistré')).toBeVisible();
  await expect.poll(() => entreeDuJour(page)).toMatchObject({
    lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:moyen', humeur: 6, contactHumain: true,
    sportMouvement: false, explosions: 0, traitementPris: 'traitementPris:oui',
  });
  await page.reload();
  await expect(groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-pressed', 'true');
  await expect(groupe(page, 'Explosions').getByRole('button', { name: 'Explosions 0' })).toHaveAttribute('aria-pressed', 'true');
});

test('un second toucher efface le choix', async ({ page }) => {
  await toucher(page, 'Humeur', '7');
  await expect.poll(async () => (await entreeDuJour(page))?.humeur).toBe(7);
  await toucher(page, 'Humeur', '7');
  await expect(groupe(page, 'Humeur').getByRole('button', { name: 'Humeur 7' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => entreeDuJour(page)).toBeNull();
});

test('les points positifs sont enregistrés à la frappe et survivent au rechargement', async ({ page }) => {
  await page.locator('#points-positifs').fill('marche de 20 min');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('marche de 20 min');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('brouillon')))).toEqual([]);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('marche de 20 min');
});

test('un brouillon non enregistré est repris au retour', async ({ page }) => {
  const date = await page.evaluate(() => window.__carnet.repo.aujourdhui());
  await page.evaluate((d) => localStorage.setItem(`carnet:brouillon:${d}:pointsPositifs`, JSON.stringify('texte rattrapé')), date);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('texte rattrapé');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('texte rattrapé');
});

test('Dicter place le curseur dans le champ et affiche l\'aide', async ({ page }) => {
  await page.getByRole('button', { name: 'Dicter' }).first().click();
  await expect(page.locator('#points-positifs')).toBeFocused();
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toBeVisible();
  await page.keyboard.insertText('dicté au clavier');
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toHaveCount(0);
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('dicté au clavier');
});

test('nuit en détail : heures effaçables, réveils, résumé du repli', async ({ page }) => {
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await page.locator('#coucher').fill('23:40');
  await page.locator('#lever').fill('07:10');
  await toucher(page, 'Réveils', '1');
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBe('07:10');
  await page.getByRole('button', { name: 'Effacer Lever' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBeNull();
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await expect(page.getByText('23:40 → · · 1 réveil')).toBeVisible();
});
