import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · « Me ressourcer » (spec §5) : la règle, éteinte au départ. Quand l'utilisateur note lui-même, maintenant,
// une énergie basse, « Pour récupérer, je… » s'affiche tel qu'écrit dans l'Émotion du moment (v7 : juste au-dessus
// du panneau des réponses ; v8 : l'énergie vient de la tuile, l'écran se ferme 1,5 s après le mot) et l'écran ne se
// ferme pas seul. L'écran « Me ressourcer » est parti en v6.1 (P14) : la carte et la règle restent. Rien
// n'est calculé, compté ni gardé.
// Mots inventés pour le test (jamais de donnée réelle).
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const lireRegle = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('ressourcer'));

// ---------- La règle, sur l'écran Émotion du moment ----------
// TRANSITOIRE (v9, 4/8) : l'écran de l'émotion devient celui de How We Feel, et « Pour récupérer, je… » passe à l'écran 3,
// après la flèche (spec §4.3), que la tâche 5 du plan v9 construit et où elle reprend ces tests ; d'ici là, la flèche
// ferme l'écran. Leur version de la v8 : git show febc289:tests/e2e/v6-ressourcer.spec.js. Le cas « ✕ touché pendant
// l'écriture » a sa version v9 dans tests/e2e/v9-emotion.spec.js (la fermeture automatique n'existe plus).
test.fixme('règle allumée : une énergie basse notée maintenant affiche la liste au-dessus des réponses, l\'écran reste ouvert, ✕ le ferme', () => {});
test.fixme('règle allumée : l\'énergie seule suffit, la carte suit l\'énergie choisie et disparaît avec elle', () => {});
test.fixme('règle éteinte, par défaut : une énergie basse ne change rien, l\'écran se ferme seul', () => {});
test.fixme('règle éteinte explicitement : même chose, l\'écran se ferme seul', () => {});
test.fixme('règle allumée, un relevé « vers » : jamais de carte, même avec une énergie basse', () => {});
test.fixme('règle allumée : passer de « maintenant » à « vers » retire la carte, et inversement', () => {});
test.fixme('règle allumée, « Pour récupérer, je… » vide ou absent : pas de carte, pas d\'invitation, l\'écran se ferme seul', () => {});
test.fixme('règle allumée : lecture du réglage ou du plan impossible, l\'écran se comporte comme avant', () => {});
test.fixme('Respirer dans la carte : la respiration démarre sur place, et le contexte audio naît dans le toucher', () => {});
test.fixme('Respirer dans la carte, signal éteint : le contexte audio naît quand même dans le toucher, puis se rendort', () => {});
test.fixme('un texte long dans la carte reste lisible : il passe à la ligne, sans déborder, et Respirer reste atteignable', () => {});
test.fixme('Réglages › Me ressourcer : l\'interrupteur allumé suffit à faire jouer la règle', () => {});

// ---------- Réglages › Me ressourcer ----------

test('Réglages › Me ressourcer : éteint par défaut, chaque toucher s\'enregistre, et le réglage se relit', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Me ressourcer', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/ressourcer$/);
  await expect(page.getByRole('heading', { name: 'Me ressourcer', level: 1 })).toBeVisible();
  const interrupteur = page.getByRole('switch', { name: 'Quand je note une énergie basse, montre-moi ma liste.', exact: true });
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  // Les défauts s'appliquent à la lecture : rien n'est écrit tant que rien n'est changé.
  expect(await lireRegle(page)).toBeNull();

  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => lireRegle(page)).toEqual({ energieBasse: true });
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Me ressourcer', exact: true }).click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => lireRegle(page)).toEqual({ energieBasse: false });

  // Retour : on revient dans Réglages.
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
});

test('Réglages › Me ressourcer : le texte ne dit ni alerte ni conseil, et la page n\'écrit rien d\'elle-même', async ({ page }) => {
  await aller(page, '#/reglages/ressourcer');
  const texte = await page.locator('main').innerText();
  expect(texte).not.toMatch(/alerte|tu devrais|pense à|il faut|attention/i);
  expect(texte).not.toMatch(/\d/);
  expect(await lireRegle(page)).toBeNull();
});

test('Réglages › Me ressourcer : lecture impossible, les défauts s\'appliquent et la page s\'affiche', async ({ page }) => {
  await page.evaluate(() => {
    const meta = window.__carnet.repo.meta;
    const lireVraiment = meta.lire;
    meta.lire = (cle) => (cle === 'ressourcer' ? Promise.reject(new Error('lecture refusée')) : lireVraiment(cle));
  });
  await aller(page, '#/reglages/ressourcer');
  await expect(page.getByRole('switch', { name: 'Quand je note une énergie basse, montre-moi ma liste.', exact: true })).toHaveAttribute('aria-checked', 'false');
});
