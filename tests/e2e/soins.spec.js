import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';

const rdvs = (page) => page.evaluate(() => window.__carnet.repo.rdv.tous());

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 1, 20, 0) });
  await page.goto('/');
  await viderBase(page);
  await page.getByRole('link', { name: 'Soins' }).click();
});

test('rendez-vous : création au premier toucher, questions, passage dans « Passés », RDV sans date', async ({ page }) => {
  await expect(page.getByText("Aucun rendez-vous noté pour l'instant.")).toBeVisible();
  await page.getByRole('link', { name: 'Rendez-vous' }).click();
  await page.getByRole('button', { name: 'Psychiatre' }).click();
  await expect.poll(async () => (await rdvs(page)).length).toBe(1);
  await expect(page.getByText('Date à fixer')).toBeVisible();
  const q = page.getByLabel('Une question pour ce rendez-vous');
  await q.fill('Sommeil non réparateur');
  await q.press('Enter');
  await q.fill('Effets du matin');
  await q.press('Enter');
  await expect.poll(async () => (await rdvs(page))[0].questions?.length).toBe(2);
  await page.locator('#rdv-date').fill('2026-10-14');
  await page.locator('#rdv-heure').fill('10:30');
  await expect.poll(async () => (await rdvs(page))[0].heure).toBe('10:30');
  await page.getByRole('button', { name: '‹ Retour' }).click();
  await expect(page.getByRole('heading', { name: 'À venir' })).toBeVisible();
  await expect(page.getByText('Psychiatre · mercredi 14 oct. 10:30').first()).toBeVisible();
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await expect(page.getByRole('link', { name: /Prochain RDV : Psychiatre · mercredi 14 oct\. 10:30/ })).toBeVisible();
  await page.clock.setSystemTime(new Date(2026, 9, 15, 9, 0));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByRole('heading', { name: 'Passés' })).toBeVisible();
  await page.evaluate(() => window.__carnet.repo.rdv.creer({ professionnel: 'professionnel:neuropsychologue' }));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByText('Neuropsychologue · Date à fixer').first()).toBeVisible();
});

test('question ajoutée depuis la carte du prochain rendez-vous', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.rdv.creer({ date: '2026-10-05', professionnel: 'professionnel:psychiatre' }));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  const q = page.getByLabel('Une question pour ce rendez-vous');
  await q.fill('Parler du travail');
  await q.press('Enter');
  await expect.poll(async () => (await rdvs(page))[0].questions).toEqual([{ texte: 'Parler du travail', abordee: false }]);
});

test('traitement : « Aucun » exclusif, effet ressenti, pied de page', async ({ page }) => {
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: /Traitement/ }).click();
  await expect(page.getByText('Ce journal sert à préparer tes échanges avec ton psychiatre.')).toBeVisible();
  await page.getByRole('link', { name: 'Traitement' }).click();
  const effets = page.getByRole('group', { name: 'Effets secondaires' });
  await effets.getByRole('button', { name: 'Somnolence' }).click();
  await effets.getByRole('button', { name: 'Vertiges' }).click();
  await effets.getByRole('button', { name: 'Aucun' }).click();
  await expect(effets.getByRole('button', { name: 'Somnolence' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('group', { name: 'Effet ressenti' }).getByRole('button', { name: /Stable/ }).click();
  await expect.poll(() => page.evaluate(async () => (await window.__carnet.repo.traitements.tous())[0])).toMatchObject({
    date: '2026-10-01', effetsSecondaires: ['effetSecondaire:aucun'], effetRessenti: 'effetRessenti:stable' });
});
