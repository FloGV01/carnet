import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6.1 · Moment difficile (P14) : deux boutons, pas trois. « Me ressourcer » quitte l'écran (son contenu est dans
// Mon plan, la respiration est en haut), « Modifier mon plan » passe à droite du titre « Mon plan », en 44 pt, et
// l'écran #/ressourcer disparaît avec sa route. La règle de Réglages › Me ressourcer et sa carte dans l'Humeur du
// moment restent. Mots inventés pour le test (jamais de donnée réelle). Écran de 390 × 844, celui du projet.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const PLAN = {
  premiersSignes: 'ma voix monte',
  quandCaMonte: 'je sors marcher\nje bois de l\'eau',
  siSurcharge: 'je coupe le bruit',
  pourRecuperer: 'je m\'allonge',
  prevenir: 'une personne de confiance',
  siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }],
};
const ecrirePlan = (page, plan = PLAN) => page.evaluate((p) => window.__carnet.repo.meta.ecrire('monPlan', p), plan);
// Passe par Réglages pour que l'écran soit monté de nouveau (et relise le plan).
const ouvrir = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  const vue = page.getByRole('dialog', { name: 'Moment difficile' });
  await expect(vue.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeVisible();
  return vue;
};
const modifier = (vue) => vue.getByRole('link', { name: 'Modifier mon plan', exact: true });

test('plus de « Me ressourcer » sur Moment difficile, avec ou sans plan', async ({ page }) => {
  for (const plan of [null, PLAN]) {
    await ecrirePlan(page, plan);
    const vue = await ouvrir(page);
    await expect(vue.getByRole('link', { name: /ressourcer/i })).toHaveCount(0);
    await expect(vue.getByRole('button', { name: /ressourcer/i })).toHaveCount(0);
    await expect(vue.locator('a[href="#/ressourcer"]')).toHaveCount(0);
    await expect(vue).not.toContainText('Me ressourcer');
  }
});

test('« Modifier mon plan » à droite du titre, sur sa ligne, en 44 pt, entier à l\'écran en défilant s\'il le faut (v10 : les quatre exercices courts sont au-dessus), jamais sous le pied', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await ouvrir(page);
  const plan = vue.getByRole('region', { name: 'Mon plan' });
  const titre = vue.getByRole('heading', { name: 'Mon plan', level: 2 });
  // Le lien est dans la région du plan, juste après le titre : avant le contenu du plan.
  await expect(plan.getByRole('link', { name: 'Modifier mon plan', exact: true })).toHaveCount(1);
  const ordre = await plan.evaluate((s) => [...s.querySelectorAll('h2, a[href="#/mon-plan"], .contenu-plan')].map((e) => e.tagName === 'H2' ? 'titre' : e.tagName === 'A' ? 'modifier' : 'contenu'));
  expect(ordre).toEqual(['titre', 'modifier', 'contenu']);

  await modifier(vue).scrollIntoViewIfNeeded();
  const [t, m] = await Promise.all([titre, modifier(vue)].map((l) => l.boundingBox()));
  // Sur la ligne du titre : les deux boîtes se chevauchent en hauteur, le lien est à droite, calé sur le bord intérieur de
  // la carte du plan (2b, v7). Il montre « Modifier », et se nomme « Modifier mon plan ».
  expect(m.y).toBeLessThan(t.y + t.height);
  expect(m.y + m.height).toBeGreaterThan(t.y);
  expect(m.x).toBeGreaterThanOrEqual(t.x + t.width);
  const bordInterieur = await plan.evaluate((e) => e.getBoundingClientRect().right - parseFloat(getComputedStyle(e).paddingRight));
  expect(Math.abs((m.x + m.width) - bordInterieur)).toBeLessThanOrEqual(1);
  await expect(modifier(vue)).toHaveText('Modifier');
  // Une cible de 44 pt au moins dans les deux sens.
  expect(m.height).toBeGreaterThanOrEqual(44);
  expect(m.width).toBeGreaterThanOrEqual(44);
  // Atteint en défilant : entier à l'écran, et pas sous le pied « Noter un épisode ».
  await expect(modifier(vue)).toBeInViewport({ ratio: 1 });
  const pied = await vue.locator('.parcours-pied').boundingBox();
  expect(m.y + m.height).toBeLessThanOrEqual(pied.y);
  // Toujours discret : ni bouton plein, ni cadre.
  expect(await modifier(vue).evaluate((a) => getComputedStyle(a).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('« Modifier mon plan » ouvre Mon plan, et Retour ramène sur Moment difficile', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await ouvrir(page);
  await modifier(vue).click();
  await expect(page).toHaveURL(/#\/mon-plan$/);
  await expect(page.getByRole('textbox', { name: 'Quand ça monte, je…' })).toHaveValue(PLAN.quandCaMonte);
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/moment-difficile$/);
  await expect(modifier(page.getByRole('dialog', { name: 'Moment difficile' }))).toBeVisible();
});

test('sans plan : rien à droite du titre, « Écrire mon plan » dessous', async ({ page }) => {
  const vue = await ouvrir(page);
  await expect(modifier(vue)).toHaveCount(0);
  await expect(vue.locator('.plan-moment-tete a')).toHaveCount(0);
  const [t, e] = await Promise.all([vue.getByRole('heading', { name: 'Mon plan', level: 2 }), vue.getByRole('link', { name: 'Écrire mon plan' })].map((l) => l.boundingBox()));
  expect(e.y).toBeGreaterThanOrEqual(t.y + t.height);
});

test('#/ressourcer n\'existe plus : l\'adresse ramène sur Aujourd\'hui', async ({ page }) => {
  await ecrirePlan(page);
  await aller(page, '#/ressourcer');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByRole('heading', { name: /Aujourd'hui/, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Me ressourcer' })).toHaveCount(0);
  await expect(page.locator('.ressourcer-texte')).toHaveCount(0);
});

test('la règle reste : Réglages › Me ressourcer s\'ouvre toujours', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Me ressourcer', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/ressourcer$/);
  await expect(page.getByRole('switch', { name: 'Quand je choisis un mot d\'énergie basse, montre-moi ma liste.', exact: true })).toBeVisible();
});
