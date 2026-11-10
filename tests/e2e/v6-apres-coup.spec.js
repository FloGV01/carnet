import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, jetons } from '../aides/couleurs.js';

// v6 · Après coup (spec §4) : deux accès, depuis la fiche d'un épisode rouvert et depuis
// Aujourd'hui. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (sept jours : du 9 au 15).
const creer = (page, e) => page.evaluate(async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const relire = (page, id) => page.evaluate((i) => window.__carnet.repo.episodes.lire(i), id);
const COLERE = { emotion: 'emotion:colere', declencheur: 'declencheur:conflit' };
const { clair } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('fiche rouverte : « Mon plan · Après coup » visible sans défiler à 390 × 844 ; l\'Après coup s\'ouvre, Fermer revient à la fiche', async ({ page }) => {
  const id = await creer(page, { date: '2026-10-10', heure: '18:42', ...COLERE, intensite: 7, dessous: 'dessous:injustice', reaction: 'reaction:retrait_isolement' });
  await aller(page, `#/episode/${id}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const ligne = fiche.locator('.ligne-plan');
  await expect(ligne).toContainText(/Mon plan\s*·\s*Après coup/);
  await expect(ligne.getByRole('button', { name: 'Mon plan' })).toBeInViewport({ ratio: 1 });
  await expect(ligne.getByRole('link', { name: 'Après coup' })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.querySelector('.parcours-corps').scrollTop)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await ligne.getByRole('link', { name: 'Après coup' }).click();
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(vue.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  await vue.getByRole('button', { name: 'Colère' }).click();
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/episode/${id}$`));
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche.getByRole('link', { name: /Après coup · TCC/ })).toContainText('Colère');
  // Mon plan s'ouvre toujours, sur la même ligne.
  await ligne.getByRole('button', { name: 'Mon plan' }).click();
  await expect(page.getByRole('dialog', { name: 'Mon plan' })).toBeVisible();
});

test('fiche rouverte : la carte du bas a son cadre, neutre au texte d\'accent (v12) ; vide, elle dit comment y venir ; remplie, elle garde son résumé', async ({ page }) => {
  const vide = await creer(page, { date: '2026-10-10', heure: '18:42', ...COLERE });
  const remplie = await creer(page, { date: '2026-10-11', heure: '19:00', ...COLERE, apresCoup: { types: ['typeExplosion:colere'], repereA: 6, jour: '2026-10-15' } });
  await aller(page, `#/episode/${vide}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  const carte = fiche.getByRole('link', { name: /Après coup · TCC/ });
  await carte.scrollIntoViewIfNeeded();
  await expect(carte.locator('.titre-apres-coup')).toHaveText('Après coup · TCC');
  await expect(carte).toContainText('Retour à froid, quand tu veux : le soir, un autre jour, ou avant une séance.');
  const cadre = await carte.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bord: s.borderTopWidth, couleurBord: s.borderTopColor, fond: s.backgroundColor, rayon: s.borderTopLeftRadius, texte: s.color };
  });
  expect(cadre.bord).toBe('1px');
  expect(cadre.fond).not.toBe('rgba(0, 0, 0, 0)');
  expect(cadre.rayon).not.toBe('0px');
  // v12 (3/9) : les épisodes n'ont plus de couleur ; le cadre est au contour, le texte en accent (la carte ouvre l'Après coup).
  expect([cadre.couleurBord, cadre.fond, cadre.texte]).toEqual([rgb(clair.contour), rgb(clair.surface), rgb(clair['accent-texte'])]);

  await aller(page, `#/episode/${remplie}`);
  const carteRemplie = fiche.getByRole('link', { name: /Après coup · TCC/ });
  await expect(carteRemplie).toContainText('Colère · remarqué à 6/10');
  await expect(carteRemplie).not.toContainText('Retour à froid');
});

test('nouvel épisode, à chaud : pas de ligne « Après coup » ni « En parler » en haut ; la réaction choisie ramène à Aujourd\'hui, la carte du bas attend la fiche rouverte', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'Conflit' }).click();
  await expect(fiche.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  await expect(fiche.locator('.ligne-plan')).toHaveText('Mon plan');
  await expect(fiche.getByRole('link', { name: /Après coup/ })).toHaveCount(0);
  await fiche.getByRole('button', { name: 'Colère' }).click();
  await fiche.getByRole('button', { name: 'Intensité 7' }).click();
  await fiche.getByRole('button', { name: 'Injustice' }).click();
  await expect(fiche.locator('.ligne-plan')).toHaveText('Mon plan');
  await fiche.getByRole('button', { name: 'Retrait / isolement' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(fiche).toHaveCount(0);
  await page.getByRole('link', { name: /21:00\s+Colère · 7 · Conflit/ }).click();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche.locator('.ligne-plan')).toContainText(/Mon plan\s*·\s*Après coup\s*·\s*En parler/);
  const carte = fiche.getByRole('link', { name: /Après coup · TCC/ });
  await carte.scrollIntoViewIfNeeded();
  await expect(carte).toContainText('Retour à froid, quand tu veux : le soir, un autre jour, ou avant une séance.');
});

test('Aujourd\'hui : la ligne n\'apparaît que s\'il y a un épisode sur les sept derniers jours logiques, jamais sur un jour passé', async ({ page }) => {
  const ligne = page.getByRole('link', { name: /Après coup \(TCC\) · tes épisodes récents/ });
  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect(ligne).toHaveCount(0);
  // Trop anciens : le 8 (huit jours) et 02:00 le 9 (jour logique du 8).
  await creer(page, { date: '2026-10-08', heure: '12:00', ...COLERE });
  await creer(page, { date: '2026-10-09', heure: '02:00', ...COLERE });
  await aller(page, '#/analyse');
  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect(ligne).toHaveCount(0);
  // 02:00 le 10 : jour logique du 9, le plus ancien des sept jours.
  await creer(page, { date: '2026-10-10', heure: '02:00', ...COLERE });
  await expect(ligne).toBeVisible();
  await expect(ligne).toHaveAttribute('href', '#/apres-coup');
  // v6.1 : juste sous la ligne « Mémo vocal », avant les replis du soir, hors de Ma journée.
  await expect(page.locator('.evenements-jour').getByRole('link', { name: /Après coup/ })).toHaveCount(0);
  expect(await ligne.evaluate((a) => Boolean(document.querySelector('#points-positifs').compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)
    && a.nextElementSibling.matches('.replis'))).toBe(true);
  await expect(ligne).toHaveText(/^\s*Après coup \(TCC\) · tes épisodes récents\s*$/);
  // Une page de jour passé ne l'a pas, même avec un épisode ce jour-là.
  await aller(page, '#/jour/2026-10-09');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect(ligne).toHaveCount(0);
});

test('la liste : tous les épisodes des sept jours, du plus récent au plus ancien, sans nombre ni état ; un toucher ouvre l\'Après coup, Fermer revient à la liste', async ({ page }) => {
  const b = await creer(page, { date: '2026-10-10', heure: '18:42', ...COLERE, intensite: 7, apresCoup: { types: ['typeExplosion:colere'], jour: '2026-10-15' } });
  await creer(page, { date: '2026-10-11', heure: '02:00', emotion: 'emotion:tristesse', intensite: 4 });
  await creer(page, { date: '2026-10-14', heure: '08:30', emotion: 'emotion:anxiete', intensite: 5 });
  await creer(page, { date: '2026-10-15', heure: '20:00', emotion: 'emotion:frustration', intensite: 3 });
  await creer(page, { date: '2026-10-08', heure: '12:00', emotion: 'emotion:peur', intensite: 9 }); // hors des sept jours
  await aller(page, '#/aujourdhui');
  await page.getByRole('link', { name: /Après coup \(TCC\) · tes épisodes récents/ }).click();
  await expect(page).toHaveURL(/#\/apres-coup$/);
  await expect(page.getByRole('heading', { name: 'Après coup (TCC)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aujourd\'hui' })).toHaveAttribute('aria-current', 'page');

  const lignes = page.locator('main li a');
  await expect(lignes).toHaveText([
    'jeu 15/10 20:00 · Frustration · 3',
    'mer 14/10 08:30 · Anxiété · 5',
    'sam 10/10 02:00 · Tristesse · 4', // 02:00 le 11 : encore le samedi, après la soirée
    'sam 10/10 18:42 · Colère · 7',
  ]);
  // Toutes les lignes ont la même forme, que l'Après coup soit rempli ou non, et la page n'a ni nombre ni état.
  const formes = await lignes.evaluateAll((els) => els.map((a) => `${a.className}|${a.children.length}|${a.querySelectorAll('svg').length}`));
  expect(new Set(formes).size).toBe(1);
  await expect(page.locator('main')).not.toContainText(/fait|faire|✓|\d+ épisodes?|NaN|undefined/i);

  // Un toucher : l'Après coup de cet épisode, directement. Fermer : la liste.
  await page.getByRole('link', { name: /sam 10\/10 02:00/ }).click();
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(page).toHaveURL(/#\/apres-coup\/ep_/);
  await expect(vue.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  await expect(vue).toContainText('Épisode du samedi 10 oct. · 02:00');
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/apres-coup$/);
  await expect(lignes).toHaveCount(4);

  // Un Après coup déjà rempli s'ouvre sur son récapitulatif ; Terminer revient aussi à la liste.
  await page.getByRole('link', { name: /sam 10\/10 18:42/ }).click();
  await expect(page).toHaveURL(new RegExp(`#/apres-coup/${b}$`));
  await expect(vue.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await vue.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/apres-coup$/);
  await expect(lignes).toHaveCount(4);

  // Retour : Aujourd'hui.
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('l\'Après coup lit l\'humeur du jour : « Ce jour-là : Bureau · humeur 5,7 », pas l\'humeur du soir', async ({ page }) => {
  const id = await creer(page, { date: '2026-10-14', heure: '20:00', ...COLERE, intensite: 6 });
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-14', { humeur: 9, lieu: 'lieu:bureau' }); // l'humeur du soir, jamais mêlée aux relevés
    for (const [heure, humeur] of [['09:00', 4], ['12:00', 6], ['16:00', 7]]) await r.humeurs.creer({ date: '2026-10-14', heure, humeur, energie: null, vers: null });
  });
  await aller(page, `#/apres-coup/${id}`);
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await vue.getByRole('button', { name: 'Passer' }).click();
  await expect(vue.getByRole('heading', { name: 'Ce jour-là, ce qui me fragilisait déjà…' })).toBeVisible();
  await expect(vue.locator('.phrase-resume')).toHaveText('Ce jour-là : Bureau · humeur 5,7');
  expect((await relire(page, id)).apresCoup ?? null).toBeNull();
});
