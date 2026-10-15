import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Mes jours (spec §3) : la rangée « énergie basse », à l'écran seulement. Données inventées.
const releves = (page, liste) => page.evaluate(async (l) => {
  for (const [date, heure, humeur, energie, vers] of l) await window.__carnet.repo.humeurs.creer({ date, heure, humeur, energie, vers: vers || null });
}, liste);
const mesJours = (page) => page.locator('figure', { has: page.getByText('Mes jours', { exact: true }) });
const periode = (page, nom) => page.getByRole('group', { name: 'Période' }).getByRole('button', { name: nom });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('aucun relevé d\'énergie : pas de rangée, pas de ligne dans la légende', async ({ page }) => {
  await releves(page, [['2026-10-12', '10:00', 5, null], ['2026-10-13', '10:00', 6, null]]);
  await aller(page, '#/analyse');
  const graphe = mesJours(page).getByRole('img', { name: /^Mes jours\. Humeur entre / });
  await expect(graphe).toBeVisible();
  await expect(graphe).toHaveAttribute('viewBox', '0 0 326 172');
  await expect(graphe.locator('g.teinte-humeur > rect.g-barre')).toHaveCount(0);
  await expect(mesJours(page).locator('.legende-frise')).not.toContainText('énergie basse');
  await expect(mesJours(page)).not.toContainText(/énergie/i);
});

test('énergie basse : une marque les jours concernés (01:00 et « vers 0 h » comptés), des barres par semaine, jamais de zéro', async ({ page }) => {
  await releves(page, [
    ['2026-10-11', '10:00', 5, 'energie:basse'], ['2026-10-11', '18:00', 6, 'energie:haute'], // un seul jour, le 11
    ['2026-10-13', '01:00', 4, 'energie:basse'], // le 13 à 01:00 : le 12
    ['2026-10-14', '00:00', 4, 'energie:basse', true], // « vers 0 h » le 14 : le 13
    ['2026-10-13', '12:00', 6, 'energie:moyenne'],
    ['2026-10-14', '12:00', 7, 'energie:moyenne'], // énergie notée, pas basse : aucune marque
  ]);
  await aller(page, '#/analyse');
  const figure = mesJours(page);
  const graphe = figure.getByRole('img', { name: /^Mes jours\. Humeur entre / });
  const marques = graphe.locator('g.teinte-humeur > rect.g-barre');
  await expect(graphe).toHaveAttribute('viewBox', '0 0 326 198');
  await expect(figure.locator('.legende-frise')).toContainText('énergie basse');
  await expect(marques).toHaveCount(3);
  // Les jours qui portent une donnée se touchent : les 11, 12, 13 et 14. Le 14 (énergie moyenne) n'a pas de marque.
  const zones = graphe.locator('rect.g-zone');
  await expect(zones).toHaveCount(4);
  await zones.nth(2).click();
  await expect(figure.locator('.detail-colonne')).toContainText('énergie basse');
  await zones.nth(3).click();
  await expect(figure.locator('.detail-colonne')).not.toContainText('énergie');

  // Par semaine : le nombre de jours, en barre (1 jour la semaine du 5, 2 jours la semaine du 12).
  await periode(page, /3 mois/).click();
  const semaines = figure.getByRole('img', { name: /^Mes jours\. Moyenne par semaine entre / });
  await expect(semaines.locator('g.teinte-humeur > rect.g-barre')).toHaveCount(2);
  await expect(figure.locator('.legende-frise')).toContainText('jours d\'énergie basse');
  await figure.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(figure.getByRole('cell', { name: /1 jour d'énergie basse/ })).toHaveCount(1);
  await expect(figure.getByRole('cell', { name: /2 jours d'énergie basse/ })).toHaveCount(1);
  await expect(figure.getByRole('cell', { name: /(^|\s)0 jour/ })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);
});
