import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6.1 · Épisode (P8, P9, P10) : un épisode nouveau se ferme seul après « Ta réaction » (toast et Annuler comme
// après « Fermer ») ; rouvert, il montre son récapitulatif et « Terminer ». Le récapitulatif d'un épisode ou d'un
// symptôme ne répète plus ses choix en phrase. Sur un épisode rouvert, « En parler » rejoint la ligne du haut.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (écran de 390 × 844, celui du projet).
const episodes = (page) => page.evaluate(() => window.__carnet.repo.episodes.tous());
const creer = (page, e) => page.evaluate(async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const COLERE = { date: '2026-10-15', heure: '18:42', declencheur: 'declencheur:conflit', emotion: 'emotion:colere', intensite: 7,
  dessous: 'dessous:injustice', reaction: 'reaction:retrait_isolement' };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('nouvel épisode depuis Aujourd\'hui : « + Épisode », 5 choix, puis le retour automatique ; le toast « Épisode enregistré · Annuler »', async ({ page }) => {
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  let touchers = 0;
  const toucher = async (loc) => { await loc.click(); touchers += 1; };
  await toucher(page.getByRole('link', { name: 'Épisode', exact: true }));
  for (const [question, choix] of [['Ça a démarré avec…', 'Conflit'], ['Ça ressemblait plutôt à…', 'Colère'], ['Intensité', 'Intensité 7'],
    ['Et en dessous, il y avait peut-être…', 'Injustice']]) {
    await expect(fiche.getByRole('heading', { name: question, exact: true })).toBeVisible();
    await expect(fiche.getByRole('button', { name: 'Terminer' })).toHaveCount(0);
    await toucher(fiche.getByRole('button', { name: choix, exact: true }));
  }
  await expect(fiche.getByRole('heading', { name: 'Ta réaction' })).toBeVisible();
  // L'horloge s'arrête : le choix reste visible 250 ms, puis la fiche se ferme.
  await page.clock.pauseAt(new Date(2026, 9, 15, 21, 1));
  const reaction = fiche.getByRole('button', { name: 'Retrait / isolement' });
  await toucher(reaction);
  await expect(reaction).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(200);
  await expect(fiche).toBeVisible();
  await page.clock.runFor(100);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(fiche).toHaveCount(0);
  expect(touchers).toBe(6);
  const toast = page.getByRole('status').filter({ hasText: 'Épisode enregistré' });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('button', { name: 'Annuler' })).toBeVisible();

  // L'horloge repart : la journée se recharge, le toast dure ses 5 s.
  await page.clock.resume();
  await expect(page.getByRole('link', { name: /21:00\s+Colère · 7 · Conflit/ })).toBeVisible();
  const [ep] = await episodes(page);
  expect(ep).toMatchObject({ date: '2026-10-15', heure: '21:00', declencheur: 'declencheur:conflit', emotion: 'emotion:colere', intensite: 7,
    dessous: 'dessous:injustice', reaction: 'reaction:retrait_isolement' });
  // Annuler retire l'épisode, comme après « Fermer ».
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await episodes(page)).length).toBe(0);
  await expect(page.getByRole('link', { name: /Colère · 7 · Conflit/ })).toHaveCount(0);
});

test('nouvel épisode : « Passer » sur « Ta réaction » ferme aussi ; sans aucun choix, rien n\'est créé et aucun toast', async ({ page }) => {
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  await fiche.getByRole('button', { name: 'Conflit' }).click();
  await expect(fiche.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  for (let i = 0; i < 4; i++) await fiche.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByRole('status').filter({ hasText: 'Épisode enregistré' })).toBeVisible();
  expect((await episodes(page)).map((e) => e.declencheur)).toEqual(['declencheur:conflit']);

  await page.evaluate(() => window.__carnet.etatApp.maj({ toast: null }));
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  for (let i = 0; i < 5; i++) await fiche.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.locator('.toast')).toHaveCount(0);
  expect((await episodes(page)).length).toBe(1);
});

test('nouvel épisode depuis un jour passé : la fiche se ferme sur ce jour', async ({ page }) => {
  await aller(page, '#/jour/2026-10-13');
  await expect(page.getByRole('link', { name: 'Revenir à aujourd\'hui' })).toBeVisible();
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  for (const choix of ['Conflit', 'Colère', 'Intensité 7', 'Injustice', 'Retrait / isolement']) await fiche.getByRole('button', { name: choix, exact: true }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-13$/);
  await expect(page.getByRole('status').filter({ hasText: 'Épisode enregistré' })).toBeVisible();
  await expect.poll(async () => (await episodes(page)).map((e) => e.date)).toEqual(['2026-10-13']);
});

test('épisode rouvert : récapitulatif et « Terminer » ; une étape corrigée, même la réaction, ramène au récapitulatif', async ({ page }) => {
  await creer(page, COLERE);
  await page.reload();
  await page.getByRole('link', { name: /18:42\s+Colère · 7 · Conflit/ }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche.getByRole('button', { name: 'Terminer' })).toBeVisible();
  await expect(fiche.locator('#episodes-situation')).toBeVisible();
  await fiche.getByRole('button', { name: /^Réaction/ }).click();
  await expect(fiche.getByRole('heading', { name: 'Ta réaction' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Explosion' }).click();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche.getByRole('button', { name: /Réaction\s*Explosion/ })).toBeVisible();
  await fiche.getByRole('button', { name: /^Réaction/ }).click();
  await fiche.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect((await episodes(page))[0].reaction).toBe('reaction:explosion');
});

test('récapitulatifs sans phrase en double : le tableau seul, chaque ligne touchable ; la phrase reste au fil des étapes', async ({ page }) => {
  await creer(page, COLERE);
  await page.reload();
  await page.getByRole('link', { name: /18:42\s+Colère · 7 · Conflit/ }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche.locator('.phrase-recap, .phrase-resume')).toHaveCount(0);
  await expect(fiche).not.toContainText(/démarré avec/i);
  await expect(fiche.locator('.recap .ligne-recap')).toHaveText([/Déclencheur\s*Conflit/, /Émotion\s*Colère/, /Intensité\s*7/,
    /En dessous\s*Injustice/, /Réaction\s*Retrait \/ isolement/]);
  // Une étape rouverte garde sa phrase des choix faits.
  await fiche.getByRole('button', { name: /^Émotion/ }).click();
  await expect(fiche.locator('.phrase-resume')).toContainText('Ça a démarré avec Conflit, ça ressemblait à colère');
  await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();

  await page.getByRole('link', { name: 'Symptôme', exact: true }).click();
  const symptome = page.getByRole('dialog', { name: 'Symptôme' });
  for (const choix of ['Ruminations', 'Intensité 6', 'Quelques heures']) await symptome.getByRole('button', { name: choix, exact: true }).click();
  await expect(symptome.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(symptome.locator('.phrase-recap, .phrase-resume')).toHaveCount(0);
  await expect(symptome.locator('.recap .ligne-recap')).toHaveText([/Symptôme\s*Ruminations/, /Intensité\s*6/, /Durée\s*Quelques heures/]);
  await symptome.getByRole('button', { name: /^Durée/ }).click();
  await expect(symptome.getByRole('heading', { name: 'Combien de temps ?' })).toBeVisible();
});

test('épisode rouvert : « Mon plan · Après coup · En parler » en haut, en 44 pt, sans déborder à 390 ; « En parler » ouvre la même feuille, le lien du bas reste', async ({ page }) => {
  const id = await creer(page, COLERE);
  await aller(page, `#/episode/${id}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const ligne = fiche.locator('.ligne-plan');
  await expect(ligne).toHaveText(/^Mon plan\s*·\s*Après coup\s*·\s*En parler$/);
  const enParler = ligne.getByRole('button', { name: 'En parler', exact: true });
  for (const cible of [ligne.getByRole('button', { name: 'Mon plan' }), ligne.getByRole('link', { name: 'Après coup' }), enParler]) {
    await expect(cible).toBeInViewport({ ratio: 1 });
    const b = await cible.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
  const mesure = await ligne.evaluate((l) => ({ deborde: l.scrollWidth - l.clientWidth, droite: Math.max(...[...l.children].map((e) => e.getBoundingClientRect().right)),
    largeur: document.documentElement.clientWidth }));
  expect(mesure.largeur).toBe(390);
  expect(mesure.deborde).toBe(0);
  expect(mesure.droite).toBeLessThanOrEqual(mesure.largeur - 16);

  await enParler.click();
  const feuille = page.getByRole('dialog', { name: 'En parler au rendez-vous' });
  await expect(feuille.getByRole('textbox', { name: 'Question' })).toHaveValue('Épisode du jeu 15/10, 18 h 42 · Colère 7/10 · Retrait / isolement');
  await page.keyboard.press('Escape');
  await expect(feuille).toHaveCount(0);
  await expect(enParler).toBeFocused();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  // Le lien du bas reste, et ouvre la même feuille.
  const bas = fiche.getByRole('button', { name: 'En parler au rendez-vous' });
  await expect(bas).toHaveCount(1);
  await bas.click();
  await expect(feuille.getByRole('textbox', { name: 'Question' })).toHaveValue('Épisode du jeu 15/10, 18 h 42 · Colère 7/10 · Retrait / isolement');
});
