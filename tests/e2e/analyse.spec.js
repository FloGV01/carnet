import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';
import { generer } from '../fixtures/generateur.js';

async function charger(page, journal) {
  await page.evaluate(async (j) => {
    const r = window.__carnet.repo;
    for (const e of j) { const { date, ...reste } = e; await r.journal.patch(date, reste); }
  }, journal);
}

test('avec 3 jours : « Pas encore assez de données pour le dire. » et sa règle', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await charger(page, [{ date: '2026-09-28', humeur: 5 }, { date: '2026-09-29', humeur: 7 }, { date: '2026-09-30', humeur: 3 }]);
  await page.getByRole('link', { name: 'Analyse' }).click();
  await expect(page.getByRole('heading', { name: 'Ce que tes journées à 7 ou plus ont en commun' })).toBeVisible();
  await expect(page.getByText('Pas encore assez de données pour le dire.').first()).toBeVisible();
  const constats = page.locator('section', { has: page.getByRole('heading', { name: 'Ce que tes journées à 7 ou plus ont en commun' }) });
  await constats.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(page.getByText(/La règle : au moins 5 journées à 7 ou plus/)).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  await expect(page.getByRole('region', { name: 'Ma semaine' })).toContainText('5,0');
});

test('avec 180 jours synthétiques : constats, Mes jours, tableau, sans débordement horizontal', async ({ page }) => {
  const journal = generer({ jours: 180, seed: 7, scenario: 'bureau', debut: '2026-04-03' });
  const fin = journal[journal.length - 1].date;
  const [a, m, j] = fin.split('-').map(Number);
  await page.clock.install({ time: new Date(a, m - 1, j, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await charger(page, journal);
  await page.getByRole('link', { name: 'Analyse' }).click();
  await expect(page.getByText(/présent dans tes journées à 7 ou plus : une journée/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Ce sont des observations sur tes données, pas des causes.')).toBeVisible();
  // v5 : Mes jours, par jour sur 30 jours, par semaine sur 3 mois et sur 180 jours (Tout : par mois
  // seulement au-delà de 26 semaines, voir v5-analyse.test.js).
  await expect(page.getByRole('img', { name: /^Mes jours\. Humeur entre/ })).toBeVisible();
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /3 mois/ }).click();
  await expect(page.getByRole('img', { name: /^Mes jours\. Moyenne par semaine entre/ })).toBeVisible();
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /Tout/ }).click();
  await expect(page.getByRole('img', { name: /^Mes jours\. Moyenne par semaine entre/ })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Voir en tableau' }).first().click();
  await expect(page.getByRole('columnheader', { name: 'Semaine' })).toBeVisible();
  // Tendances : environ 6 mois d'historique, la règle prudente s'applique (rien d'inventé).
  await expect(page.getByRole('heading', { name: 'Tendances' })).toBeVisible();
});
