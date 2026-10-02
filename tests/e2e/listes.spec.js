import { test, expect } from '../aides/gardes.js';
import { viderBase, toucher, groupe, aller } from '../aides/saisie.js';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('renommer se voit partout : Aujourd\'hui, Historique, export PSY', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ lieu: 'lieu:bureau' });
  await aller(page, '#/reglages/listes/lieu');
  await page.getByRole('button', { name: 'Renommer Bureau' }).click();
  const champ = page.getByLabel('Nouveau libellé pour Bureau');
  await champ.fill('Au bureau');
  await champ.press('Enter');
  await expect(page.getByRole('button', { name: 'Renommer Au bureau' })).toBeVisible();
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await expect(groupe(page, 'Lieu').getByRole('button', { name: 'Au bureau' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Historique' }).click();
  await expect(page.getByText(/Au bureau/)).toBeVisible();
  await aller(page, '#/export-psy');
  await expect(page.getByLabel('Aperçu du texte')).toContainText('mer 30/09 · Au bureau');
});

test('archiver : disparaît des choix, reste lisible ; restaurer', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-09-30', heure: '10:00', emotion: 'emotion:honte' }));
  await aller(page, '#/reglages/listes/emotion');
  await page.getByRole('listitem').filter({ hasText: 'Honte' }).getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByRole('heading', { name: 'Archivés' })).toBeVisible();
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await expect(page.getByRole('link', { name: /10:00\s+Honte/ })).toBeVisible();
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Honte' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await aller(page, '#/reglages/listes/emotion');
  await page.getByRole('listitem').filter({ hasText: 'Honte' }).getByRole('button', { name: 'Restaurer' }).click();
  await expect(page.getByRole('heading', { name: 'Archivés' })).toHaveCount(0);
});

test('réordonner, ajouter, refuser un doublon ; sens fixe = renommer seulement', async ({ page }) => {
  await aller(page, '#/reglages/listes/lieu');
  await page.getByRole('button', { name: 'Descendre Bureau' }).click();
  await expect.poll(async () => (await page.evaluate(() => window.__carnet.repo.listes.items('lieu'))).slice(0, 2).map((i) => i.id)).toEqual(['lieu:teletravail', 'lieu:bureau']);
  await page.getByLabel('Nouvel élément').fill('Café calme');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByRole('button', { name: 'Renommer Café calme' })).toBeVisible();
  await page.getByLabel('Nouvel élément').fill('télétravail');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  expect((await page.evaluate(() => window.__carnet.repo.listes.items('lieu'))).length).toBe(7);
  await aller(page, '#/reglages/listes/sommeil');
  await expect(page.getByText('Cette liste se renomme seulement.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Archiver' })).toHaveCount(0);
  await expect(page.getByLabel('Nouvel élément')).toHaveCount(0);
});

test('« + Ajouter » dans un parcours crée l\'élément et le choisit', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '+ Ajouter' }).click();
  const champ = page.getByLabel('Nouvel élément : Déclencheur');
  await champ.fill('Bruit de travaux');
  await champ.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  const [ep] = await page.evaluate(() => window.__carnet.repo.episodes.tous());
  expect(ep.declencheur).toMatch(/^declencheur:u-/);
});
