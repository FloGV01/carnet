import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';

const grille = (page) => page.getByRole('dialog');
const episodes = (page) => page.evaluate(() => window.__carnet.repo.episodes.tous());

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 8, 30, 18, 42) });
  await page.goto('/');
  await viderBase(page);
});

test('un épisode en 7 touchers après l\'icône : créé au premier choix, récapitulatif, Terminer', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  await expect(page.getByRole('heading', { name: 'Ça a démarré avec…' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(grille(page).getByRole('button', { name: /Aujourd'hui · 18:42/ })).toBeVisible();
  await grille(page).getByRole('button', { name: 'Me sentir pris pour un con' }).click();
  await expect.poll(async () => (await episodes(page)).length).toBe(1);
  await expect(page).toHaveURL(/#\/episode\/ep_/);
  await grille(page).getByRole('button', { name: 'Colère' }).click();
  await grille(page).getByRole('button', { name: 'Intensité 7' }).click();
  await grille(page).getByRole('button', { name: 'Injustice' }).click();
  await grille(page).getByRole('button', { name: 'Retrait / isolement' }).click();
  await expect(grille(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await grille(page).getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByText('Épisode enregistré')).toBeVisible();
  await expect(page.getByRole('link', { name: /18:42\s+Colère · 7 · Me sentir pris pour un con/ })).toBeVisible();
  const [ep] = await episodes(page);
  expect(ep).toMatchObject({ date: '2026-09-30', heure: '18:42', declencheur: 'declencheur:pris_pour_un_con', emotion: 'emotion:colere',
    intensite: 7, dessous: 'dessous:injustice', reaction: 'reaction:retrait_isolement' });
});

test('Fermer à l\'étape 2 garde le choix ; Annuler retire l\'épisode', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  await grille(page).getByRole('button', { name: 'Conflit' }).click();
  await expect(page.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  await grille(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect.poll(async () => (await episodes(page)).map((e) => e.declencheur)).toEqual(['declencheur:conflit']);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await episodes(page)).length).toBe(0);
});

test('fermer sans rien choisir ne crée rien', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  await grille(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.getByText('Épisode enregistré')).toHaveCount(0);
  expect((await episodes(page)).length).toBe(0);
});

test('Passer, textes facultatifs, modification depuis le récapitulatif', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  for (let i = 0; i < 5; i++) await grille(page).getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(grille(page).getByRole('button', { name: 'Terminer' })).toBeVisible();
  await page.locator('#episodes-situation').fill('remarque en réunion');
  await expect.poll(async () => (await episodes(page))[0]?.situation).toBe('remarque en réunion');
  await grille(page).getByRole('button', { name: /Émotion/ }).click();
  await grille(page).getByRole('button', { name: 'Honte' }).click();
  await expect(grille(page).getByRole('button', { name: /Émotion\s*Honte/ })).toBeVisible();
  await expect.poll(async () => (await episodes(page))[0]?.emotion).toBe('emotion:honte');
});

test('un épisode noté à 01:30 apparaît sous la veille ; il se rouvre sur le récapitulatif', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-10-01', heure: '01:30', emotion: 'emotion:anxiete' }));
  await page.clock.setSystemTime(new Date(2026, 9, 1, 2, 0));
  await page.reload();
  await expect(page.getByRole('heading', { name: "Aujourd'hui · mercredi 30 sept." })).toBeVisible();
  await page.getByRole('link', { name: /01:30\s+Anxiété/ }).click();
  await expect(grille(page).getByRole('button', { name: 'Terminer' })).toBeVisible();
  await expect(grille(page).getByRole('button', { name: /Émotion\s*Anxiété/ })).toBeVisible();
});

test('supprimer demande confirmation, puis Annuler restaure', async ({ page }) => {
  const ep = await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-09-30', heure: '10:00', emotion: 'emotion:peur' }));
  await page.goto(`/#/aujourdhui`);
  await page.getByRole('link', { name: /10:00\s+Peur/ }).click();
  await grille(page).getByRole('button', { name: 'Supprimer cet épisode' }).click();
  await grille(page).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByText('Épisode supprimé')).toBeVisible();
  await expect.poll(async () => (await episodes(page)).length).toBe(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await episodes(page)).map((e) => e.id)).toEqual([ep.id]);
});

test('rechargement en plein parcours : rien n\'est perdu', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  await grille(page).getByRole('button', { name: 'Solitude' }).click();
  await grille(page).getByRole('button', { name: 'Tristesse' }).click();
  await expect.poll(async () => (await episodes(page))[0]?.emotion).toBe('emotion:tristesse');
  await page.reload();
  expect((await episodes(page))[0]).toMatchObject({ declencheur: 'declencheur:solitude', emotion: 'emotion:tristesse' });
});
