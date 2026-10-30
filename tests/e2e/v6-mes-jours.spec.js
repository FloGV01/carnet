import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Mes jours (spec §3) : la rangée « énergie basse », à l'écran seulement. v7 : des étiquettes de rangées (2b), la
// rangée Émotions en tête ; les relevés portent une émotion, plus de note. Données inventées.
const releves = (page, liste) => page.evaluate(async (l) => {
  for (const [date, heure, emotion, energie, vers] of l) await window.__carnet.repo.humeurs.creer({ date, heure, emotion, energie, vers: vers || null });
}, liste);
const etiquettes = (graphe) => graphe.locator('text.g-etiquette');
// Sans note, sans énergie, sans repère : Émotions, Nuits, Explosions, Épisodes.
const HAUTEUR_SIMPLE = 143;
const mesJours = (page) => page.locator('figure', { has: page.getByText('Mes jours', { exact: true }) });
const periode = (page, nom) => page.getByRole('group', { name: 'Période' }).getByRole('button', { name: nom });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('aucun relevé d\'énergie : pas de rangée, pas de ligne dans la légende', async ({ page }) => {
  await releves(page, [['2026-10-12', '10:00', 'roue:colere:irrite', null], ['2026-10-13', '10:00', 'roue:serenite', null]]);
  await aller(page, '#/analyse');
  const graphe = mesJours(page).getByRole('img', { name: /^Mes jours, une colonne par jour : émotions, nuits, explosions, épisodes\./ });
  await expect(graphe).toBeVisible();
  await expect(graphe).toHaveAttribute('viewBox', `0 0 326 ${HAUTEUR_SIMPLE}`);
  await expect(etiquettes(graphe)).toHaveText(['Émotions', 'Nuits', 'Explosions', 'Épisodes']);
  await expect(graphe.locator('g.teinte-energie > rect.g-barre')).toHaveCount(0);
  // v9 : la légende des zones nomme « Énergie haute · désagréable »… (une zone, pas la rangée) ; rien d'autre, ni dans le
  // graphique ni dans la légende, ne parle d'énergie.
  await expect(graphe).not.toContainText(/énergie/i);
  const legende = await mesJours(page).locator('.legende-frise > span:not([class^="zone-"])').allTextContents();
  expect(legende.join(' ')).not.toMatch(/énergie/i);
  expect(await mesJours(page).locator('.legende-frise > span[class^="zone-"]').allTextContents())
    .toEqual(['Énergie haute · désagréable', 'Énergie haute · agréable', 'Énergie basse · désagréable', 'Énergie basse · agréable']);
});

test('énergie basse : une marque les jours concernés (01:00 et « vers 0 h » comptés), des barres par semaine, jamais de zéro', async ({ page }) => {
  await releves(page, [
    ['2026-10-11', '10:00', 'roue:joie', 'energie:basse'], ['2026-10-11', '18:00', 'roue:joie', 'energie:haute'], // un seul jour, le 11
    ['2026-10-13', '01:00', 'roue:peur', 'energie:basse'], // le 13 à 01:00 : le 12
    ['2026-10-14', '00:00', 'roue:peur', 'energie:basse', true], // « vers 0 h » le 14 : le 13
    ['2026-10-13', '12:00', 'roue:joie', 'energie:moyenne'],
    ['2026-10-14', '12:00', 'roue:surprise', 'energie:moyenne'], // énergie notée, pas basse : aucune marque
  ]);
  await aller(page, '#/analyse');
  const figure = mesJours(page);
  const graphe = figure.getByRole('img', { name: /^Mes jours, une colonne par jour : émotions, nuits, explosions, épisodes, énergie basse\./ });
  const marques = graphe.locator('g.teinte-energie > rect.g-barre');
  await expect(etiquettes(graphe)).toHaveText(['Émotions', 'Nuits', 'Explosions', 'Épisodes', 'Énergie', 'basse']);
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
  const semaines = figure.getByRole('img', { name: /^Mes jours, une colonne par semaine : / });
  await expect(semaines.locator('g.teinte-energie > rect.g-barre')).toHaveCount(2);
  await figure.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(figure.getByRole('cell', { name: /1 jour d'énergie basse/ })).toHaveCount(1);
  await expect(figure.getByRole('cell', { name: /2 jours d'énergie basse/ })).toHaveCount(1);
  await expect(figure.getByRole('cell', { name: /(^|\s)0 jour/ })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);
});

// v6 · repères de traitement (spec §3). Textes inventés, jamais un vrai médicament.
const fiches = (page, liste) => page.evaluate(async (l) => {
  for (const [date, changement, effetRessenti] of l) await window.__carnet.repo.traitements.creer({ date, changement, effetRessenti: effetRessenti || null });
}, liste);

test('repères de traitement : un trait numéroté par changement, sa légende sous le graphique, « ①–② » dans une même semaine', async ({ page }) => {
  await releves(page, [['2026-10-12', '10:00', 'roue:colere', null], ['2026-10-13', '10:00', 'roue:serenite:calme', null]]);
  await fiches(page, [
    ['2026-10-14', 'retour à la dose initiale'],
    ['2026-09-20', 'ajout d\'une prise le matin'],
    ['2026-10-12', 'passage à la dose du soir'],
    ['2026-10-10', null, 'effetRessenti:moins_bien'], // des effets seulement : pas de repère
  ]);
  await aller(page, '#/analyse');
  const figure = mesJours(page);
  const graphe = figure.getByRole('img', { name: /^Mes jours, / });
  const legende = figure.locator('.legende-reperes li');
  // 30 jours, par jour : trois traits, numérotés dans l'ordre chronologique, au-dessus des rangées.
  await expect(graphe.locator('line.g-changement')).toHaveCount(3);
  await expect(graphe.locator('text.g-changement-num')).toHaveText(['①', '②', '③']);
  await expect(legende).toHaveText([
    '① 20/09 · changement : ajout d\'une prise le matin',
    '② 12/10 · changement : passage à la dose du soir',
    '③ 14/10 · changement : retour à la dose initiale',
  ]);
  const [, , , hauteur] = (await graphe.getAttribute('viewBox')).split(' ').map(Number);
  expect(hauteur).toBeGreaterThan(HAUTEUR_SIMPLE);

  // 3 mois, par semaine : le 12 et le 14 tombent dans la semaine du 12, un seul trait.
  await periode(page, /3 mois/).click();
  await expect(graphe.locator('text.g-changement-num')).toHaveText(['①', '②–③']);
  await expect(legende).toHaveCount(3);
  // « Voir en tableau » garde la légende.
  await figure.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(legende).toHaveCount(3);
  await figure.getByRole('button', { name: 'Voir le graphe' }).click();

  // 7 jours : la numérotation suit les repères visibles.
  await periode(page, /7 j/).click();
  await expect(graphe.locator('text.g-changement-num')).toHaveText(['①', '②']);
  await expect(legende).toHaveText(['① 12/10 · changement : passage à la dose du soir', '② 14/10 · changement : retour à la dose initiale']);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);

  // La vue soignants se dessine avec ses repères.
  await aller(page, '#/soignants');
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
});

test('aucun changement noté : ni trait, ni légende', async ({ page }) => {
  await releves(page, [['2026-10-12', '10:00', 'roue:colere', null]]);
  await fiches(page, [['2026-10-12', null, 'effetRessenti:moins_bien']]);
  await aller(page, '#/analyse');
  const figure = mesJours(page);
  await expect(figure.getByRole('img', { name: /^Mes jours, / })).toHaveAttribute('viewBox', `0 0 326 ${HAUTEUR_SIMPLE}`);
  await expect(figure.locator('line.g-changement')).toHaveCount(0);
  await expect(figure.locator('.legende-reperes')).toHaveCount(0);
});
