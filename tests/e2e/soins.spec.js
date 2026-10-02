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
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'À venir' })).toBeVisible();
  const prochain = page.getByRole('region', { name: 'Prochain rendez-vous' });
  await expect(prochain.getByRole('link', { name: /Psychiatre\s*mercredi 14 octobre · 10:30/ })).toBeVisible();
  await expect(prochain.getByRole('button', { name: 'Sommeil non réparateur' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await expect(page.getByRole('link', { name: /Prochain RDV : Psychiatre · mercredi 14 oct\. 10:30/ })).toBeVisible();
  await page.clock.setSystemTime(new Date(2026, 9, 15, 9, 0));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByRole('heading', { name: 'Passés' })).toBeVisible();
  await page.evaluate(() => window.__carnet.repo.rdv.creer({ professionnel: 'professionnel:neuropsychologue' }));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByRole('link', { name: /Neuropsychologue\s*Date à fixer/ })).toBeVisible();
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
  await page.getByRole('link', { name: 'Changement', exact: true }).click();
  const effets = page.getByRole('group', { name: 'Effets secondaires' });
  await effets.getByRole('button', { name: 'Somnolence' }).click();
  await effets.getByRole('button', { name: 'Vertiges' }).click();
  await effets.getByRole('button', { name: 'Aucun' }).click();
  await expect(effets.getByRole('button', { name: 'Somnolence' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('group', { name: 'Effet ressenti' }).getByRole('button', { name: /Stable/ }).click();
  await expect.poll(() => page.evaluate(async () => (await window.__carnet.repo.traitements.tous())[0])).toMatchObject({
    date: '2026-10-01', effetsSecondaires: ['effetSecondaire:aucun'], effetRessenti: 'effetRessenti:stable' });
});

test('en consultation : chiffres des 30 jours, questions cochées, compte rendu, Terminer', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const repo = window.__carnet.repo;
    await repo.journal.patch('2026-09-29', { humeur: 5, sommeilRessenti: 'sommeil:mal', explosions: 1 });
    await repo.journal.patch('2026-09-30', { humeur: 7, sommeilRessenti: 'sommeil:bien', explosions: 0 });
    return repo.rdv.creer({ date: '2026-10-05', heure: '10:30', professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Parler du sommeil', abordee: false }] });
  });
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await page.getByRole('link', { name: 'En consultation' }).click();
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  await expect(vue.getByRole('heading', { name: 'Psychiatre' })).toBeVisible();
  await expect(vue.getByText('lundi 5 octobre · 10:30')).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  const chiffres = vue.getByRole('region', { name: '30 derniers jours' });
  await expect(chiffres.locator('.valeur-chiffre')).toHaveText(['6,0', '1', '1', '0']);
  await vue.getByRole('button', { name: 'Parler du sommeil' }).click();
  await expect.poll(async () => (await page.evaluate((id) => window.__carnet.repo.rdv.lire(id), r.id)).questions[0].abordee).toBe(true);
  await vue.locator('#consultation-compte-rendu').fill('garder le même rythme');
  await expect.poll(async () => (await page.evaluate((id) => window.__carnet.repo.rdv.lire(id), r.id)).compteRendu).toBe('garder le même rythme');
  await vue.getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByRole('heading', { name: 'Soins' })).toBeVisible();
});

test('traitement actuel : première saisie sans fiche, puis une fiche datée par jour de changement', async ({ page }) => {
  const fiches = () => page.evaluate(() => window.__carnet.repo.traitements.tous());
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: /Traitement/ }).click();
  const carte = page.getByRole('region', { name: 'Mon traitement actuel' });
  await carte.getByRole('button', { name: 'Ajouter un médicament' }).click();
  await carte.getByLabel('Médicament', { exact: true }).fill('Médicament A');
  await carte.getByLabel('Dose, Matin').fill('½');
  await carte.getByLabel('Dose, Soir').fill('1');
  await carte.getByRole('button', { name: 'Fermer' }).click();
  await expect(carte.getByRole('columnheader', { name: 'Soir' })).toBeVisible();
  await expect(carte.getByRole('row', { name: /Médicament A\s*½\s*1/ })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await fiches()).toEqual([]);
  // Le lendemain : un changement crée une fiche datée, un second changement du jour la complète.
  await page.clock.setSystemTime(new Date(2026, 9, 2, 20, 0));
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await carte.getByRole('button', { name: 'Modifier Médicament A' }).click();
  await carte.getByLabel('Dose, Soir').fill('1½');
  await carte.getByLabel('Dose, Coucher').fill('1');
  await carte.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(async () => (await fiches()).map((f) => f.changement)).toEqual(['Médicament A : soir 1 → 1½, coucher · → 1']);
  expect((await fiches())[0].date).toBe('2026-10-02');
  await carte.getByRole('button', { name: 'Modifier Médicament A' }).click();
  await carte.getByLabel('Dose, Matin').fill('1');
  await carte.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(async () => (await fiches()).map((f) => f.changement)).toEqual(['Médicament A : matin ½ → 1, soir 1 → 1½, coucher · → 1']);
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByRole('region', { name: 'Mon traitement actuel' }).getByRole('columnheader', { name: 'Coucher' })).toBeVisible();
});
