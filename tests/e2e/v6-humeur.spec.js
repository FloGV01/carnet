import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';

// v6 : l'humeur du jour (moyenne des humeurs du moment). Le champ Humeur du soir est masqué par
// défaut ; tous les affichages lisent l'humeur du jour.
const repo = (page, f, arg) => page.evaluate(f, arg);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 14, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('le soir sans champ Humeur : 5 touchers, sans défilement à 390 × 797, en mode sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 797 });
  await page.reload();
  await expect(groupe(page, 'Lieu')).toHaveCount(1);
  await expect(groupe(page, 'Humeur')).toHaveCount(0);
  await toucher(page, 'Lieu', 'Bureau');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Contact humain', 'Oui');
  await toucher(page, 'Sport / mouvement', 'Non');
  await toucher(page, 'Traitement pris', 'Oui');
  await expect.poll(async () => (await entreeDuJour(page))?.traitementPris).toBe('traitementPris:oui');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const positifs = await page.locator('#points-positifs').boundingBox();
  const flottants = await page.locator('.actions-flottantes').boundingBox();
  expect(positifs.y + positifs.height).toBeLessThanOrEqual(flottants.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await entreeDuJour(page)).toMatchObject({ humeur: null });
});

test('un jour passé noté le soir garde son champ Humeur ; Réglages › Le soir le réaffiche', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-13', { humeur: 5, lieu: 'lieu:bureau' }));
  await aller(page, '#/jour/2026-10-13');
  await expect(groupe(page, 'Humeur').getByRole('button', { name: 'Humeur 5' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-jour')).toHaveText('Bureau · humeur 5');
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(groupe(page, 'Lieu')).toHaveCount(1);
  await expect(groupe(page, 'Humeur')).toHaveCount(0);
  await aller(page, '#/reglages/journee');
  await page.getByRole('switch', { name: 'Afficher Humeur' }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions']);
  await aller(page, '#/aujourdhui');
  await toucher(page, 'Humeur', '7');
  await expect.poll(async () => (await entreeDuJour(page))?.humeur).toBe(7);
});

test('l\'humeur du jour partout : résumé, Historique, trait du plus bas au plus haut dans Mes jours (v7 : rangée « Humeur (notes) », plus de moyenne dans Ma semaine)', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    // Le 13 : un soir à 9 (jamais mêlé) et cinq relevés, dont un « vers » et un à 01:00 le 14.
    await r.journal.patch('2026-10-13', { humeur: 9, lieu: 'lieu:bureau' });
    for (const [date, heure, humeur, vers] of [['2026-10-13', '09:00', 3], ['2026-10-13', '12:00', 5], ['2026-10-13', '16:00', 6, true],
      ['2026-10-13', '20:00', 6], ['2026-10-14', '01:00', 8]]) {
      await r.humeurs.creer({ date, heure, humeur, energie: null, vers: vers || null });
    }
  });
  await aller(page, '#/jour/2026-10-13');
  await expect(page.locator('.resume-jour')).toHaveText('Bureau · humeur 5,6');
  // Le champ du soir reste là (il porte une valeur), mais le résumé dit l'humeur du jour.
  await expect(groupe(page, 'Humeur').getByRole('button', { name: 'Humeur 9' })).toHaveAttribute('aria-pressed', 'true');

  await aller(page, '#/historique');
  await expect(page.locator('.puce')).toHaveText(['Bureau', 'humeur 5,6']);
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: 'Humeur' }).getByRole('button', { name: '5-6' }).click();
  await expect(page.locator('.puce')).toHaveText(['Bureau', 'humeur 5,6']);
  await page.getByRole('group', { name: 'Humeur' }).getByRole('button', { name: '7-10' }).click();
  await expect(page.getByText('Rien ne correspond.')).toBeVisible();

  await page.getByRole('link', { name: 'Analyse' }).click();
  await expect(page.getByRole('region', { name: 'Ma semaine' })).toHaveCount(0);
  const mesJours = page.locator('figure', { has: page.getByText('Mes jours', { exact: true }) });
  const graphe = mesJours.getByRole('img', { name: /^Mes jours, une colonne par jour : émotions, humeur \(notes de 1 à 10\), nuits/ });
  await expect(graphe.locator('line.g-trait')).toHaveCount(1);
  await expect(graphe.locator('text.g-etiquette')).toContainText(['Émotions', 'Humeur', '(notes)']);
  await expect(mesJours.getByText('note du plus bas au plus haut')).toBeVisible();
  await mesJours.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(mesJours.getByRole('cell', { name: /^humeur 5,6 \(de 3 à 8\)/ })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/humeur du soir/i);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);
});
