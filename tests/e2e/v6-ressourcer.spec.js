import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { espionnerAudio, audio } from '../aides/audio.js';
import { vueMoment, bulle, mot, retour, noter, continuer, fermer, terminer, faisais, NOTEE } from '../aides/emotion.js';

// v6 · « Me ressourcer » (spec §5) : la règle, éteinte au départ. Quand l'utilisateur note lui-même, maintenant,
// une énergie basse, « Pour récupérer, je… » s'affiche tel qu'écrit dans l'Émotion du moment (v7 : juste au-dessus
// du panneau des réponses ; v8 : l'énergie vient de la tuile, l'écran se ferme 1,5 s après le mot) et l'écran ne se
// ferme pas seul. v9 (5/8) : l'énergie est celle de la case du mot (rangs 1 à 4 : basse), et la carte vient en tête de
// l'écran 3, après la flèche, au-dessus de « Ce que je faisais » (spec §4.3) ; l'écran ne se ferme jamais seul. Un relevé
// rouvert ne la montre pas : la règle joue quand on note. L'écran « Me ressourcer » est parti en v6.1 (P14) : la carte et
// la règle restent. Rien n'est calculé, compté ni gardé.
// Mots inventés pour le test (jamais de donnée réelle).
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const PLAN = { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge\nje ferme les yeux', siAlors: [] };
const ecrirePlan = (page, plan = PLAN) => page.evaluate((p) => window.__carnet.repo.meta.ecrire('monPlan', p), plan);
const ecrireRegle = (page, valeur = { energieBasse: true }) => page.evaluate((v) => window.__carnet.repo.meta.ecrire('ressourcer', v), valeur);
const lireRegle = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('ressourcer'));
const ecrireRespiration = (page, valeur) => page.evaluate((v) => window.__carnet.repo.meta.ecrire('respiration', v), valeur);
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());

const carte = (vue) => vue.getByRole('region', { name: 'Pour récupérer, je…' });
const respirer = (zone) => zone.getByRole('button', { name: 'Respirer', exact: true });
const ouvrirMoment = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
// Note un mot d'énergie basse (Vide : bleu, rang 3), maintenant, puis la flèche : l'écran 3.
const noterBasse = async (page) => {
  const vue = await ouvrirMoment(page);
  await noter(vue, 'bleu', 'Vide');
  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  return vue;
};
// Sans la carte, l'écran 3 est là quand même ; « Terminer » le ferme, avec le message.
const sansCarte = async (page, vue) => {
  await expect(faisais(vue)).toBeVisible();
  await expect(carte(vue)).toHaveCount(0);
  await expect(vue).not.toContainText(/Pour récupérer|Écrire ce qui me recharge/);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
};

// ---------- La règle, sur l'écran 3 de l'Émotion du moment ----------

test('règle allumée : un mot d\'énergie basse noté maintenant affiche la liste en tête de l\'écran 3, au-dessus de « Ce que je faisais » ; l\'écran reste ouvert, ✕ le ferme', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  // Rien sur les écrans 1 et 2, même le mot choisi.
  await noter(vue, 'bleu', 'Vide');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse:vide', energie: 'energie:basse', vers: null }]);
  await expect(carte(vue)).toHaveCount(0);
  await continuer(vue).click();

  // La liste est affichée telle qu'écrite, entière, sans avoir à défiler, sous le mot et au-dessus des activités.
  await expect(carte(vue)).toBeVisible();
  await expect(carte(vue)).toContainText('je m\'allonge');
  await expect(carte(vue)).toContainText('je ferme les yeux');
  await expect(respirer(carte(vue))).toBeVisible();
  await expect(carte(vue)).toBeInViewport({ ratio: 1 });
  const [rappel, boite, titre] = await Promise.all([vue.getByRole('heading', { level: 1 }).boundingBox(), carte(vue).boundingBox(),
    vue.getByRole('heading', { name: 'Ce que je faisais', level: 2 }).boundingBox()]);
  expect(boite.y).toBeGreaterThanOrEqual(rappel.y + rappel.height);
  expect(boite.y + boite.height).toBeLessThanOrEqual(titre.y);

  // Bien au-delà de l'ancien délai de fermeture : l'écran reste là.
  await page.clock.runFor(1800);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  // ✕ ferme l'écran et dit que le relevé est noté.
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  // Aucune trace de l'affichage : le réglage est inchangé, le relevé n'a rien de plus.
  expect(await lireRegle(page)).toEqual({ energieBasse: true });
  const [h] = await releves(page)();
  expect(Object.keys(h).filter((k) => /ressour|liste|carte|affich/i.test(k))).toEqual([]);
});

test('règle allumée : seul un mot d\'énergie basse l\'affiche ; un mot d\'énergie moyenne (rangs 5 à 8) ou haute, non', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  for (const [zone, libelle, energie] of [['rouge', 'Préoccupé', 'energie:moyenne'], ['jaune', 'Curieux', 'energie:haute'], ['vert', 'Calme', 'energie:moyenne']]) {
    const vue = await ouvrirMoment(page);
    await noter(vue, zone, libelle);
    await expect.poll(async () => (await releves(page)()).map((h) => h.energie)).toContain(energie);
    await continuer(vue).click();
    await sansCarte(page, vue);
  }
  // Serein (vert, rang 3) : basse, la carte.
  const vue = await ouvrirMoment(page);
  await noter(vue, 'vert', 'Serein');
  await continuer(vue).click();
  await expect(carte(vue)).toBeVisible();
});

test('règle éteinte, par défaut : une énergie basse ne change rien, l\'écran 3 n\'a que « Ce que je faisais »', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await noterBasse(page);
  await sansCarte(page, vue);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse:vide', energie: 'energie:basse' }]);
  // Rien n'est écrit tant que rien n'est réglé.
  expect(await lireRegle(page)).toBeNull();
});

test('règle éteinte explicitement : même chose', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page, { energieBasse: false });
  const vue = await noterBasse(page);
  await sansCarte(page, vue);
});

test('règle allumée, un relevé « vers » : jamais de carte, même avec une énergie basse', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '14 h', exact: true }).click();
  await noter(vue, 'bleu', 'Vide');
  await continuer(vue).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '14:00', vers: true, emotion: 'roue:tristesse:vide', energie: 'energie:basse' }]);
  await sansCarte(page, vue);
});

test('règle allumée : l\'heure changée après le mot (« vers », puis « Maintenant ») décide, à l\'écran 3', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  await noter(vue, 'bleu', 'Vide');
  // De retour aux couleurs : « vers 12 h », puis la carte, le mot toujours choisi, et la flèche : pas de carte.
  await retour(vue).click();
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '12 h', exact: true }).click();
  await expect.poll(releves(page)).toMatchObject([{ heure: '12:00', vers: true, emotion: 'roue:tristesse:vide' }]);
  await bulle(vue, 'bleu').click();
  await expect(mot(vue, 'Vide')).toHaveAttribute('aria-pressed', 'true');
  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  await expect(carte(vue)).toHaveCount(0);
  await terminer(vue).click();
  // Une autre fois, « vers » puis « Maintenant » : la carte.
  const vue2 = await ouvrirMoment(page);
  await vue2.getByRole('button', { name: 'Maintenant' }).click();
  await vue2.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '12 h', exact: true }).click();
  await vue2.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: 'Maintenant', exact: true }).click();
  await noter(vue2, 'bleu', 'Vide');
  await continuer(vue2).click();
  await expect(carte(vue2)).toBeVisible();
});

test('règle allumée, « Pour récupérer, je… » vide ou absent : pas de carte, pas d\'invitation', async ({ page }) => {
  await ecrireRegle(page);
  const plans = [
    ['aucun plan', null],
    ['une autre rubrique seule', { quandCaMonte: 'je sors marcher', siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }] }],
    ['des espaces', { quandCaMonte: 'je sors marcher', pourRecuperer: '  \n  ' }],
  ];
  for (const [, plan] of plans) {
    await page.evaluate((p) => window.__carnet.repo.meta.ecrire('monPlan', p), plan);
    await aller(page, '#/aujourdhui');
    const vue = await noterBasse(page);
    await sansCarte(page, vue);
  }
});

test('règle allumée : lecture du réglage ou du plan impossible, l\'écran 3 se comporte comme sans la règle', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  await page.evaluate(() => {
    const meta = window.__carnet.repo.meta;
    const lireVraiment = meta.lire;
    meta.lire = (cle) => (['ressourcer', 'monPlan'].includes(cle) ? Promise.reject(new Error('lecture refusée')) : lireVraiment(cle));
  });
  const vue = await noterBasse(page);
  await sansCarte(page, vue);
});

test('règle allumée : un relevé rouvert depuis Ma journée ne montre pas la carte, même d\'énergie basse et noté maintenant', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await noterBasse(page);
  await expect(carte(vue)).toBeVisible();
  await terminer(vue).click();
  await page.locator('.liste-evenements a.releve').filter({ hasText: 'Vide' }).click();
  await expect(vue.getByRole('heading', { name: 'Vide', level: 1 })).toBeVisible();
  await expect(faisais(vue)).toBeVisible();
  await expect(carte(vue)).toHaveCount(0);
});

// ---------- « Respirer » : la respiration sur place, démarrée aussitôt, son préparé dans le toucher ----------

test('Respirer dans la carte : la respiration démarre sur place, et le contexte audio naît dans le toucher', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  await ecrireRespiration(page, { duree: 2, rythme: '5-5', son: true });
  await espionnerAudio(page, { session: true });
  const vue = await noterBasse(page);
  await expect(carte(vue)).toBeVisible();
  await expect(vue.locator('.respiration')).toHaveCount(0);
  // Rien n'est créé avant le toucher : iOS n'accepte un contexte audio que dans un geste.
  expect((await audio(page)).contextes).toBe(0);

  await respirer(carte(vue)).click();
  // Créé dans le toucher même, avant que la respiration soit à l'écran : un seul, en session « ambiante ».
  expect(await audio(page)).toMatchObject({ contextes: 1, montees: [false], session: 'ambient' });
  await expect(carte(vue).locator('.phase-respiration')).toHaveText('Inspire');
  await expect(carte(vue).getByRole('button', { name: 'Arrêter' })).toBeVisible();
  await expect(carte(vue).getByRole('button', { name: 'Arrêter' })).toBeInViewport();
  await expect(respirer(carte(vue))).toHaveCount(0);
  await expect.poll(async () => (await audio(page)).notes.length).toBe(1);
  expect(await audio(page)).toMatchObject({ contextes: 1, etat: 'running' });
  // La liste reste sous les yeux pendant l'exercice, et l'écran ne se ferme pas.
  await expect(carte(vue)).toContainText('je m\'allonge');
  await page.clock.runFor(5400);
  await expect(carte(vue).locator('.phase-respiration')).toHaveText('Expire');
  await expect(page).toHaveURL(/#\/moment$/);
});

test('Respirer dans la carte, signal éteint : le contexte audio naît quand même dans le toucher, puis se rendort', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  await ecrireRespiration(page, { duree: 2, rythme: '5-5', son: false });
  await espionnerAudio(page, { session: true });
  const vue = await noterBasse(page);
  await expect(carte(vue)).toBeVisible();
  expect((await audio(page)).contextes).toBe(0);
  // Le toucher prépare le contexte sans regarder le réglage ; la respiration le rendort aussitôt, sans une note.
  await respirer(carte(vue)).click();
  await expect(carte(vue).locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(2000);
  expect(await audio(page)).toMatchObject({ contextes: 1, montees: [false], etat: 'suspended' });
  expect((await audio(page)).notes).toHaveLength(0);
});

test('un texte long dans la carte reste lisible : il passe à la ligne, sans déborder, et Respirer reste atteignable', async ({ page }) => {
  const long = Array.from({ length: 80 }, (_, i) => `mot${i}`).join(' ');
  await ecrirePlan(page, { pourRecuperer: `${long}\nune ligne courte`, siAlors: [] });
  await ecrireRegle(page);
  const vue = await noterBasse(page);
  await expect(carte(vue)).toContainText('une ligne courte');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const largeur = await carte(vue).locator('.ressourcer-texte').evaluate((p) => p.scrollWidth <= p.clientWidth);
  expect(largeur).toBe(true);
  await respirer(carte(vue)).scrollIntoViewIfNeeded();
  await expect(respirer(carte(vue))).toBeInViewport();
  // « Terminer » reste à l'écran, sous le corps qui défile.
  await expect(terminer(vue)).toBeInViewport({ ratio: 1 });
});

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

test('Réglages › Me ressourcer : l\'interrupteur allumé suffit à faire jouer la règle', async ({ page }) => {
  await ecrirePlan(page);
  await aller(page, '#/reglages/ressourcer');
  await page.getByRole('switch', { name: 'Quand je note une énergie basse, montre-moi ma liste.', exact: true }).click();
  await expect.poll(() => lireRegle(page)).toEqual({ energieBasse: true });
  const vue = await noterBasse(page);
  await expect(carte(vue)).toBeVisible();
  await page.clock.runFor(1800);
  await expect(page).toHaveURL(/#\/moment$/);
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
