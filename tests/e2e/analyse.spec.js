import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';
import { generer } from '../fixtures/generateur.js';

// Analyse sur 180 jours synthétiques d'anciennes notes de 1 à 10 (v5, v6). v7 : plus aucune phrase calculée sur la note
// (bonnes journées, sommeil et humeur, tendances) ; les notes restent visibles, en rangée « Humeur (notes) » de Mes jours.
async function charger(page, journal) {
  await page.evaluate(async (j) => {
    const r = window.__carnet.repo;
    for (const e of j) { const { date, ...reste } = e; await r.journal.patch(date, reste); }
  }, journal);
}

test('avec 180 jours synthétiques : Mes jours par jour puis par semaine, tableau, sans débordement ni phrase calculée', async ({ page }) => {
  const journal = generer({ jours: 180, seed: 7, scenario: 'bureau', debut: '2026-04-03' });
  const fin = journal[journal.length - 1].date;
  const [a, m, j] = fin.split('-').map(Number);
  await page.clock.install({ time: new Date(a, m - 1, j, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await charger(page, journal);
  await page.getByRole('link', { name: 'Analyse' }).click();
  // Mes jours : par jour sur 30 jours, par semaine sur 3 mois et sur 180 jours (Tout : par mois seulement au-delà de 26
  // semaines, voir v5-analyse.test.js). Les notes de 1 à 10 y ont leur rangée.
  await expect(page.getByRole('img', { name: /^Mes jours, une colonne par jour : émotions, humeur \(notes de 1 à 10\), nuits/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /3 mois/ }).click();
  await expect(page.getByRole('img', { name: /^Mes jours, une colonne par semaine : émotions, humeur \(notes de 1 à 10\)/ })).toBeVisible();
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /Tout/ }).click();
  await expect(page.getByRole('img', { name: /^Mes jours, une colonne par semaine : / })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Voir en tableau' }).first().click();
  await expect(page.getByRole('columnheader', { name: 'Semaine' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /humeur \d,\d en moyenne/ }).first()).toBeVisible();
  // Les analyses retirées (v7) : ni Tendances, ni « journées à 7 ou plus », ni « Sommeil et humeur ».
  await expect(page.locator('main')).not.toContainText(/Tendances|journées à 7 ou plus|Sommeil et humeur|Sur tout ton historique|Pour info|humeur moyenne/);
});
