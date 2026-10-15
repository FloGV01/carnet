import { test, expect } from '../aides/gardes.js';
import { aller, appPrete } from '../aides/saisie.js';

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
  await version.scrollIntoViewIfNeeded();
  const boite = await version.boundingBox();
  await page.mouse.move(boite.x + 5, boite.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Diagnostic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Partager un ZIP' })).toBeVisible();
});

test('« Vérifier mes données » : des nombres seulement, jamais un libellé ni un texte', async ({ page }) => {
  await page.goto('/');
  await appPrete(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-09-30', { humeur: 6, pointsPositifs: 'TEXTE-INVENTE' });
    await r.listes.renommer('lieu:bureau', 'LIBELLE-INVENTE');
    const ep = await r.episodes.creer({ date: '2026-09-30', emotion: 'emotion:colere' });
    await r.audios.creer({ parentStore: 'episodes', parentId: ep.id, dureeMs: 1000, mime: 'audio/mp4', data: new ArrayBuffer(8) });
    // Ce que le repository refuse d'écrire : un mémo dont la fiche a disparu, et une fiche hors bornes.
    await r.tx(['audios', 'journal'], 'readwrite', (t) => {
      t.objectStore('audios').put({ id: 'au_orphelin', parentStore: 'episodes', parentId: 'ep_disparue', date: '2026-09-30', createdAt: '2026-09-30T20:00:00.000Z', dureeMs: 1000, mime: 'audio/mp4', data: new ArrayBuffer(8) });
      t.objectStore('journal').put({ date: '2026-09-29', humeur: 99 });
    });
  });
  await aller(page, '#/diagnostic');
  await expect(page.getByRole('heading', { name: 'Diagnostic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mes données' })).toBeVisible();
  await page.getByRole('button', { name: 'Vérifier mes données' }).click();
  const lignes = page.locator('.diag [aria-live] dl');
  await expect(lignes.locator('dt', { hasText: 'Mémos sans fiche' })).toBeVisible();
  const dd = await lignes.locator('dd').allTextContents();
  expect(dd.length).toBeGreaterThan(2);
  for (const v of dd) expect(v).toMatch(/^\d+$/);
  const valeur = async (nom) => Number(await lignes.locator('dt', { hasText: nom }).locator('xpath=following-sibling::dd[1]').textContent());
  expect(await valeur('Mémos sans fiche')).toBe(1);
  expect(await valeur('Fiches illisibles')).toBe(1);
  expect(await valeur('journal')).toBe(2);
  expect(await valeur('episodes')).toBe(1);
  expect(await valeur('audios')).toBe(2);
  const corps = await page.locator('.diag').innerText();
  expect(corps).not.toContain('TEXTE-INVENTE');
  expect(corps).not.toContain('LIBELLE-INVENTE');
});

test('une route inconnue ramène sur Aujourd\'hui', async ({ page }) => {
  await page.goto('/');
  await aller(page, '#/nimporte');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('le texte d\'attente disparaît une fois l\'app affichée', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Aujourd'hui/ })).toBeVisible();
  await expect(page.locator('.chargement')).toHaveCount(0);
});
