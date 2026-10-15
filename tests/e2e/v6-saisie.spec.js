import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';

// v6 : saisie du soir. « Ce qui a pesé · ce qui a rechargé » : un repli sous « Nuit en détail ».
const repo = (page, f, arg) => page.evaluate(f, arg);
const TITRE = 'Ce qui a pesé · ce qui a rechargé';
// Une journée sans plus aucune valeur n'a plus d'entrée : le champ vaut alors null.
const champDuJour = (page, champ) => async () => (await entreeDuJour(page))?.[champ] ?? null;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 14, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const repli = (page) => page.getByRole('button', { name: new RegExp(`^${TITRE}`) });

test('ce qui a pesé, ce qui a rechargé : replié après « Nuit en détail », un toucher enregistre, un second efface', async ({ page }) => {
  await expect(page.locator('.replis .repli-titre')).toHaveText(['Nuit en détail', TITRE, 'Sport en détail', 'Contact en détail', 'Notes libres']);
  await expect(repli(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupe(page, 'Ce qui a pesé')).toHaveCount(0);

  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button')).toHaveCount(10);
  await expect(groupe(page, 'Ce qui a rechargé').getByRole('button')).toHaveCount(8);
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await entreeDuJour(page))?.pese).toEqual(['pese:bruit']);
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(champDuJour(page, 'pese')).toBeNull();
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(async () => (await entreeDuJour(page))?.recharge).toEqual(['recharge:calme']);
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(champDuJour(page, 'recharge')).toBeNull();
});

test('replié, le repli résume ce qui est noté ; sans rien de noté, il ne dit rien', async ({ page }) => {
  await expect(repli(page).locator('.repli-resume')).toHaveCount(0);
  await repli(page).click();
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await toucher(page, 'Ce qui a pesé', 'Trajets');
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(async () => (await entreeDuJour(page))?.pese).toEqual(['pese:bruit', 'pese:trajets']);
  await expect.poll(async () => (await entreeDuJour(page))?.recharge).toEqual(['recharge:calme']);
  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé')).toHaveCount(0);
  await expect(repli(page).locator('.repli-resume')).toHaveText('pesé : bruit, trajets · rechargé : calme');
  // Une seule des deux listes : l'autre n'est pas mentionnée.
  await repli(page).click();
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await toucher(page, 'Ce qui a pesé', 'Trajets');
  await repli(page).click();
  await expect(repli(page).locator('.repli-resume')).toHaveText('rechargé : calme');
  // Il se relit tel quel après un rechargement.
  await page.reload();
  await expect(repli(page).locator('.repli-resume')).toHaveText('rechargé : calme');
});

test('masqué dans Réglages › Ma journée, le repli reste affiché un jour où il porte des valeurs', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-13', { lieu: 'lieu:bureau', pese: ['pese:bruit'] }));
  await aller(page, '#/reglages/journee');
  const interrupteur = page.getByRole('switch', { name: `Afficher ${TITRE}` });
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  // Sans place dans l'ordre des champs : pas de flèches.
  await expect(page.getByRole('button', { name: /^(Monter|Descendre) Ce qui a pesé/ })).toHaveCount(0);
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur', 'peseRecharge']);
  expect((await repo(page, () => window.__carnet.repo.meta.lire('journee'))).ordre).not.toContain('peseRecharge');

  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('button', { name: /Nuit en détail/ })).toBeVisible();
  await expect(repli(page)).toHaveCount(0);
  await aller(page, '#/jour/2026-10-13');
  await expect(repli(page).locator('.repli-resume')).toHaveText('pesé : bruit');
  // Il s'ouvre et se corrige comme d'habitude.
  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'true');

  await aller(page, '#/reglages/journee');
  await page.getByRole('switch', { name: `Afficher ${TITRE}` }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur']);
  await aller(page, '#/aujourdhui');
  await expect(repli(page)).toHaveCount(1);
});

test('un long résumé replié reste dans la page : coupé par une ellipse, sans défilement de côté', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 797 });
  await repo(page, () => window.__carnet.repo.journal.patch(window.__carnet.repo.aujourdhui(), {
    pese: ['pese:bruit', 'pese:lumiere', 'pese:monde', 'pese:changement', 'pese:attente'],
    recharge: ['recharge:seul', 'recharge:calme', 'recharge:interet'],
  }));
  await page.reload();
  const resume = repli(page).locator('.repli-resume');
  await expect(resume).toContainText('pesé : bruit, lumière, monde, changement, attente · rechargé : être seul, calme');
  const mesures = await page.evaluate(() => {
    const tete = document.querySelector('.repli.resume-sous .repli-tete');
    const r = tete.querySelector('.repli-resume');
    return {
      droiteResume: r.getBoundingClientRect().right, droiteTete: tete.getBoundingClientRect().right,
      coupe: r.scrollWidth > r.clientWidth, ellipse: getComputedStyle(r).textOverflow,
      debordePage: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(mesures.droiteResume).toBeLessThanOrEqual(mesures.droiteTete);
  expect(mesures.coupe).toBe(true);
  expect(mesures.ellipse).toBe('ellipsis');
  expect(mesures.debordePage).toBe(false);
});
