import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-09-21', { humeur: 4, sommeilRessenti: 'sommeil:mal', lieu: 'lieu:bureau', explosions: 1, pointsPositifs: 'déjeuner au calme' });
    await r.journal.patch('2026-09-23', { humeur: 7, lieu: 'lieu:teletravail', notes: 'réunion tendue le matin' });
    await r.journal.patch('2026-09-30', { humeur: 6 });
    await r.episodes.creer({ date: '2026-09-21', heure: '14:30', emotion: 'emotion:colere', intensite: 8, declencheur: 'declencheur:pris_pour_un_con' });
  });
  await page.getByRole('link', { name: 'Historique' }).click();
});

test('jours groupés par semaine, sans jour vide ni décompte', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Semaine du 28 septembre' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Semaine du 21 septembre' })).toBeVisible();
  const lundi = page.getByRole('link', { name: /lundi 21 sept\./ });
  await expect(lundi.locator('.puce')).toHaveText(['Bureau', 'nuit mal', 'humeur 4', 'explosions 1']);
  await expect(lundi.getByText('Colère 8 · « déjeuner au calme »')).toBeVisible();
  await expect(page.getByText('mardi 22 sept.')).toHaveCount(0);
  await expect(page.locator('.historique')).not.toContainText(/jours? (remplis|notés)|\d+\/7/);
});

test('recherche dans les textes et filtres', async ({ page }) => {
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByLabel('Rechercher dans les textes').fill('reunion');
  await expect(page.locator('mark')).toHaveText('réunion');
  await expect(page.getByText('humeur 4', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByLabel('Rechercher dans les textes')).toHaveCount(0);
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: 'Humeur' }).getByRole('button', { name: '7-10' }).click();
  await expect(page.getByText('humeur 7-10')).toBeVisible();
  await expect(page.getByText('humeur 7', { exact: true })).toBeVisible();
  await expect(page.getByText('humeur 4', { exact: true })).toHaveCount(0);
});

test('épisodes et modification d\'un jour passé', async ({ page }) => {
  await page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: /Épisodes/ }).click();
  await expect(page.getByText('Colère · 8 · Me sentir pris pour un con')).toBeVisible();
  await expect(page.getByRole('link', { name: /lundi 21 sept\. · 14:30/ })).toBeVisible();
  await page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: /Jours/ }).click();
  await page.getByRole('link', { name: /lundi 21 sept\./ }).click();
  await expect(page.getByRole('heading', { name: 'lundi 21 sept.' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Humeur', exact: true }).getByRole('button', { name: 'Humeur 4' })).toHaveAttribute('aria-pressed', 'true');
});

test('effacer une journée : confirmation, épisodes conservés, Annuler', async ({ page }) => {
  await page.getByRole('link', { name: /lundi 21 sept\./ }).click();
  await page.getByRole('button', { name: 'Effacer cette journée' }).click();
  const boite = page.getByRole('alertdialog', { name: 'Effacer la journée du lundi 21 sept. ?' });
  await expect(boite.getByText('Les épisodes et symptômes de ce jour sont conservés.')).toBeVisible();
  await boite.getByRole('button', { name: 'Effacer', exact: true }).click();
  await expect(page.getByText('Journée effacée')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Humeur', exact: true }).getByRole('button', { name: 'Humeur 4' })).toHaveAttribute('aria-pressed', 'false');
  expect((await page.evaluate(() => window.__carnet.repo.episodes.tous())).length).toBe(1);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('group', { name: 'Humeur', exact: true }).getByRole('button', { name: 'Humeur 4' })).toHaveAttribute('aria-pressed', 'true');
});
