import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase } from '../aides/saisie.js';

// v5 : Moment difficile, « J'ai fini pour ce soir », plus de Pas à pas.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 6, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

test('Moment difficile : un toucher, cohérence cardiaque, Mon plan tel qu\'écrit, Noter un épisode', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors marcher', siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }] }));
  await expect(page.getByRole('link', { name: 'Pas à pas' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Moment difficile' }).click();
  const vue = page.getByRole('dialog', { name: 'Moment difficile' });
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(vue).toContainText('je sors marcher');
  await expect(vue).toContainText('Si la chaleur monte, alors je respire');
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(5200);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(5 * 60 * 1000);
  await expect(vue.locator('.phase-respiration')).toHaveText('5 minutes de respiration.');
  await expect(vue.getByRole('button', { name: 'Recommencer' })).toBeVisible();
  await vue.getByRole('link', { name: 'Noter un épisode' }).click();
  await expect(page.getByRole('heading', { name: 'Ça a démarré avec…' })).toBeVisible();
});

test('Moment difficile sans plan : une ligne neutre, aucun conseil', async ({ page }) => {
  await page.getByRole('link', { name: 'Moment difficile' }).click();
  await expect(page.getByRole('dialog', { name: 'Moment difficile' })).toContainText("Rien d'écrit pour l'instant.");
});

test('« J\'ai fini pour ce soir » : la page se replie sur la phrase du jour, Rouvrir la saisie', async ({ page }) => {
  await expect(page.getByRole('button', { name: "J'ai fini pour ce soir" })).toHaveCount(0);
  await toucher(page, 'Humeur', '6');
  await toucher(page, 'Lieu', 'Bureau');
  await page.getByRole('button', { name: "J'ai fini pour ce soir" }).click();
  const soiree = page.getByRole('region', { name: 'Ta soirée' });
  await expect(soiree).toContainText('Bureau · humeur 6');
  await expect(groupe(page, 'Humeur')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Ta soirée' })).toBeVisible();
  await page.getByRole('button', { name: 'Rouvrir la saisie' }).click();
  await expect(groupe(page, 'Humeur').getByRole('button', { name: 'Humeur 6' })).toHaveAttribute('aria-pressed', 'true');
  // Rien n'est compté ni enregistré : la base ne garde que la saisie.
  const meta = await page.evaluate(() => window.__carnet.repo.meta.lire('fini'));
  expect(meta).toBeNull();
});
