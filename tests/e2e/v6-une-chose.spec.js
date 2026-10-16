import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · « Une chose à la fois » (spec §6) : le plan d'un écran à la fois, en très grand texte, rien de compté
// ni d'enregistré, aucun verrou d'écran. Réglé dans Réglages › Moment difficile (méta `uneChoseALaFois`).
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

// Mots inventés pour le test (jamais de donnée réelle). Plusieurs lignes dans deux rubriques, une ligne vide au milieu.
const PLAN = {
  premiersSignes: 'ma voix monte',
  quandCaMonte: 'je sors marcher\n\nje bois de l\'eau',
  siSurcharge: 'je coupe le bruit',
  pourRecuperer: 'je m\'allonge',
  prevenir: 'une personne de confiance',
  siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }],
};
const ecrirePlan = (page, plan = PLAN) => page.evaluate((p) => window.__carnet.repo.meta.ecrire('monPlan', p), plan);
const lireReglage = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('uneChoseALaFois'));
const bouton = (page, nom) => page.getByRole('button', { name: nom, exact: true });
// Passe par Réglages pour que l'écran soit monté de nouveau (et relise plan et réglages).
const ouvrir = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  return page.getByRole('dialog', { name: 'Moment difficile' });
};
const cartesOuvertes = (page) => page.getByRole('dialog', { name: 'Une chose à la fois' });
const ouvrirCartes = async (page) => {
  const vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  const cartes = cartesOuvertes(page);
  await expect(cartes).toBeVisible();
  return cartes;
};
// Lit la carte affichée : le nom de la rubrique en petit, puis le texte en grand.
const lireCarte = async (cartes) => ({
  rubrique: await cartes.locator('.une-chose-rubrique').innerText(),
  texte: await cartes.locator('.une-chose-texte').innerText(),
});
// Parcourt toutes les cartes avec Suivant, du début à la fin.
const toutesLesCartes = async (cartes) => {
  const lues = [await lireCarte(cartes)];
  while (await bouton(cartes, 'Suivant').isEnabled()) {
    await bouton(cartes, 'Suivant').click();
    lues.push(await lireCarte(cartes));
  }
  return lues;
};
const espionnerVerrou = (page) => page.evaluate(() => {
  const j = { demandes: 0, rendus: 0 };
  window.__verrou = j;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => { j.demandes += 1; return { release: async () => { j.rendus += 1; } }; } },
  });
});
const verrou = (page) => page.evaluate(() => window.__verrou);

test('l\'ordre de l\'écran : respiration, « Une chose à la fois », Me ressourcer, Mon plan tel qu\'écrit, Noter un épisode', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await ouvrir(page);
  await expect(vue.getByRole('button', { name: 'Une chose à la fois', exact: true })).toBeVisible();
  await expect(vue.getByRole('link', { name: 'Me ressourcer', exact: true })).toBeVisible();
  const blocs = ['respiration', 'une-chose-acces', 'ressourcer-acces', 'plan-moment', 'parcours-pied'];
  const ordre = await vue.evaluate((d, noms) => [...d.querySelectorAll(noms.map((n) => `.${n}`).join(', '))].map((e) => noms.find((n) => e.classList.contains(n))), blocs);
  expect(ordre).toEqual(blocs);
  // Mon plan reste affiché en entier, « Mes premiers signes » comprise (seules les cartes la laissent de côté par défaut).
  await expect(vue.getByRole('region', { name: 'Mon plan' })).toContainText('ma voix monte');
  await expect(vue.getByRole('region', { name: 'Mon plan' })).toContainText('Si la chaleur monte, alors je respire');
  await expect(vue.getByRole('link', { name: 'Noter un épisode' })).toBeVisible();
});

test('les cartes : une ligne par écran, le nom de la rubrique en petit, Précédent et Suivant', async ({ page }) => {
  await ecrirePlan(page);
  const cartes = await ouvrirCartes(page);
  // Par défaut : toutes les rubriques sauf « Mes premiers signes », sans les si… alors…, une ligne vide écartée.
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Quand ça monte, je…', texte: 'je sors marcher' });
  await expect(bouton(cartes, 'Précédent')).toBeDisabled();
  await expect(bouton(cartes, 'Suivant')).toBeEnabled();
  await bouton(cartes, 'Suivant').click();
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Quand ça monte, je…', texte: 'je bois de l\'eau' });
  await expect(bouton(cartes, 'Précédent')).toBeEnabled();
  await bouton(cartes, 'Suivant').click();
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Si c\'est trop, je…', texte: 'je coupe le bruit' });
  await bouton(cartes, 'Précédent').click();
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Quand ça monte, je…', texte: 'je bois de l\'eau' });
  await bouton(cartes, 'Suivant').click();
  await bouton(cartes, 'Suivant').click();
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Pour récupérer, je…', texte: 'je m\'allonge' });
  await bouton(cartes, 'Suivant').click();
  expect(await lireCarte(cartes)).toEqual({ rubrique: 'Qui prévenir', texte: 'une personne de confiance' });
  // La dernière carte : Suivant s'arrête, sans rien dire de plus.
  await expect(bouton(cartes, 'Suivant')).toBeDisabled();
  await expect(bouton(cartes, 'Précédent')).toBeEnabled();
});

test('aucun compteur, aucun message de fin, rien d\'enregistré', async ({ page }) => {
  await ecrirePlan(page);
  const cartes = await ouvrirCartes(page);
  const toutLeTexte = async () => (await cartes.innerText()).replace(/\s+/g, ' ');
  const lues = await toutesLesCartes(cartes);
  expect(lues).toHaveLength(5);
  // Au début, à la fin et entre les deux : pas un chiffre, ni « sur », « / », « fin », « terminé », « bravo ».
  expect(await toutLeTexte()).not.toMatch(/\d|\bsur\b|\/|\bfin\b|termin|bravo|félicit/i);
  await bouton(cartes, 'Précédent').click();
  expect(await toutLeTexte()).not.toMatch(/\d|\bsur\b|\/|\bfin\b|termin|bravo|félicit/i);
  // L'affichage n'a ni barre ni liste de repères, et Carnet ne garde aucune trace de la lecture.
  await expect(cartes.locator('progress, [role="progressbar"], .reperes')).toHaveCount(0);
  expect(await lireReglage(page)).toBeNull();
});

test('« Tout voir » ramène à Mon plan en liste, Fermer à l\'écran de départ', async ({ page }) => {
  await ecrirePlan(page);
  const cartes = await ouvrirCartes(page);
  await bouton(cartes, 'Suivant').click();
  await cartes.getByRole('button', { name: 'Tout voir', exact: true }).click();
  await expect(cartesOuvertes(page)).toHaveCount(0);
  const vue = page.getByRole('dialog', { name: 'Moment difficile' });
  await expect(vue).toBeVisible();
  const plan = vue.getByRole('region', { name: 'Mon plan' });
  await expect(plan).toBeInViewport();
  await expect(vue.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeFocused();
  await expect(plan).toContainText('ma voix monte');
  await expect(page).toHaveURL(/#\/moment-difficile$/);

  // Fermer : retour à Moment difficile, et rouvrir repart de la première carte (aucune place gardée).
  await vue.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  expect((await lireCarte(cartesOuvertes(page))).texte).toBe('je sors marcher');
  await bouton(cartesOuvertes(page), 'Suivant').click();
  await cartesOuvertes(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(cartesOuvertes(page)).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Moment difficile' })).toBeVisible();
  await expect(page).toHaveURL(/#\/moment-difficile$/);
  await expect(vue.getByRole('button', { name: 'Une chose à la fois', exact: true })).toBeFocused();
  await vue.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  expect((await lireCarte(cartesOuvertes(page))).texte).toBe('je sors marcher');
  // Le Fermer de Moment difficile, lui, ramène sur Aujourd'hui.
  await cartesOuvertes(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('aucun verrou d\'écran sur les cartes : ni demandé, ni gardé quand on y arrive pendant la respiration', async ({ page }) => {
  await ecrirePlan(page);
  await espionnerVerrou(page);
  let cartes = await ouvrirCartes(page);
  await toutesLesCartes(cartes);
  await bouton(cartes, 'Précédent').click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(await verrou(page)).toEqual({ demandes: 0, rendus: 0 });

  // La respiration, elle, garde l'écran allumé. Les cartes la remplacent : le verrou est rendu et rien n'est redemandé.
  await cartes.getByRole('button', { name: 'Tout voir', exact: true }).click();
  const vue = page.getByRole('dialog', { name: 'Moment difficile' });
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  await vue.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  cartes = cartesOuvertes(page);
  await expect(cartes).toBeVisible();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await bouton(cartes, 'Suivant').click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.runFor(3000);
  expect(await verrou(page)).toEqual({ demandes: 1, rendus: 1 });
});

test('sans plan : « Écrire mon plan » remplace la phrase, et rien n\'ouvre les cartes', async ({ page }) => {
  const vue = await ouvrir(page);
  await expect(vue.getByRole('region', { name: 'Mon plan' })).toBeVisible();
  await expect(vue.getByRole('link', { name: 'Écrire mon plan' })).toBeVisible();
  await expect(vue).not.toContainText('Rien d\'écrit pour l\'instant');
  await expect(vue).not.toContainText('s\'écrit dans Réglages');
  await expect(vue.getByRole('link', { name: 'Modifier mon plan' })).toHaveCount(0);
  // Pas de carte à montrer : pas de bouton qui ne mène à rien.
  await expect(vue.getByRole('button', { name: 'Une chose à la fois', exact: true })).toHaveCount(0);
  await vue.getByRole('link', { name: 'Écrire mon plan' }).click();
  await expect(page).toHaveURL(/#\/mon-plan$/);
  await expect(page.getByRole('heading', { name: 'Mon plan', level: 1 })).toBeVisible();
  // Retour : on revient là où on était, sur Moment difficile.
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/moment-difficile$/);
});

test('avec un plan : un « Modifier mon plan » discret, et plus « Écrire mon plan »', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await ouvrir(page);
  await expect(vue.getByRole('link', { name: 'Modifier mon plan' })).toBeVisible();
  await expect(vue.getByRole('link', { name: 'Écrire mon plan' })).toHaveCount(0);
  await expect(vue).not.toContainText('Rien d\'écrit pour l\'instant');
  // Discret : ni bouton plein, ni cadre.
  expect(await vue.getByRole('link', { name: 'Modifier mon plan' }).evaluate((a) => getComputedStyle(a).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await vue.getByRole('link', { name: 'Modifier mon plan' }).click();
  await expect(page).toHaveURL(/#\/mon-plan$/);
  await expect(page.getByRole('textbox', { name: 'Quand ça monte, je…' })).toHaveValue(PLAN.quandCaMonte);
});

test('un plan dont seules les rubriques écartées sont écrites : pas de bouton, Mon plan reste affiché', async ({ page }) => {
  await ecrirePlan(page, { premiersSignes: 'ma voix monte' });
  const vue = await ouvrir(page);
  await expect(vue.getByRole('button', { name: 'Une chose à la fois', exact: true })).toHaveCount(0);
  await expect(vue.getByRole('region', { name: 'Mon plan' })).toContainText('ma voix monte');
  await expect(vue.getByRole('link', { name: 'Modifier mon plan' })).toBeVisible();
});

test('Réglages › Moment difficile › Une chose à la fois : les défauts, et chaque toucher s\'enregistre', async ({ page }) => {
  await ecrirePlan(page);
  await aller(page, '#/reglages/moment-difficile');
  await expect(page.getByRole('heading', { name: 'Une chose à la fois', level: 2 })).toBeVisible();
  const interrupteur = (nom) => page.getByRole('switch', { name: nom, exact: true });
  const defauts = { 'Mes premiers signes': 'false', 'Quand ça monte, je…': 'true', 'Si c\'est trop, je…': 'true', 'Pour récupérer, je…': 'true', 'Qui prévenir': 'true', 'Si… alors…': 'false' };
  for (const [nom, etat] of Object.entries(defauts)) await expect(interrupteur(nom)).toHaveAttribute('aria-checked', etat);
  // Les défauts s'appliquent à la lecture : rien n'est écrit tant que rien n'est changé.
  expect(await lireReglage(page)).toBeNull();

  await interrupteur('Mes premiers signes').click();
  await expect(interrupteur('Mes premiers signes')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => lireReglage(page)).toEqual({ rubriques: ['premiersSignes', 'quandCaMonte', 'siSurcharge', 'pourRecuperer', 'prevenir'], siAlors: false });
  // Deux touchers rapprochés ne s'écrasent pas.
  await interrupteur('Qui prévenir').click();
  await interrupteur('Si… alors…').click();
  await expect.poll(() => lireReglage(page)).toEqual({ rubriques: ['premiersSignes', 'quandCaMonte', 'siSurcharge', 'pourRecuperer'], siAlors: true });
  await expect(interrupteur('Qui prévenir')).toHaveAttribute('aria-checked', 'false');
  await expect(interrupteur('Si… alors…')).toHaveAttribute('aria-checked', 'true');
  // La respiration n'est pas touchée par ces réglages.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('respiration'))).toBeNull();

  // Les réglages se relisent, et les cartes les suivent : « Mes premiers signes » d'abord, les si… alors… à la fin.
  await aller(page, '#/reglages');
  await aller(page, '#/reglages/moment-difficile');
  await expect(interrupteur('Mes premiers signes')).toHaveAttribute('aria-checked', 'true');
  await expect(interrupteur('Qui prévenir')).toHaveAttribute('aria-checked', 'false');
  const cartes = await ouvrirCartes(page);
  expect(await toutesLesCartes(cartes)).toEqual([
    { rubrique: 'Mes premiers signes', texte: 'ma voix monte' },
    { rubrique: 'Quand ça monte, je…', texte: 'je sors marcher' },
    { rubrique: 'Quand ça monte, je…', texte: 'je bois de l\'eau' },
    { rubrique: 'Si c\'est trop, je…', texte: 'je coupe le bruit' },
    { rubrique: 'Pour récupérer, je…', texte: 'je m\'allonge' },
    { rubrique: 'Si… alors…', texte: 'Si la chaleur monte, alors je respire' },
  ]);
});

test('toutes les rubriques éteintes : aucune carte, donc aucun bouton, et Mon plan reste complet', async ({ page }) => {
  await ecrirePlan(page);
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('uneChoseALaFois', { rubriques: [], siAlors: false }));
  const vue = await ouvrir(page);
  await expect(vue.getByRole('button', { name: 'Une chose à la fois', exact: true })).toHaveCount(0);
  await expect(vue.getByRole('region', { name: 'Mon plan' })).toContainText('je coupe le bruit');
  // Seuls les si… alors… choisis : le bouton revient.
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('uneChoseALaFois', { rubriques: [], siAlors: true }));
  const vue2 = await ouvrir(page);
  await vue2.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  expect(await toutesLesCartes(cartesOuvertes(page))).toEqual([{ rubrique: 'Si… alors…', texte: 'Si la chaleur monte, alors je respire' }]);
  await expect(bouton(cartesOuvertes(page), 'Suivant')).toBeDisabled();
  await expect(bouton(cartesOuvertes(page), 'Précédent')).toBeDisabled();
});

test('lecture des réglages impossible : les défauts s\'appliquent, les cartes s\'ouvrent', async ({ page }) => {
  await ecrirePlan(page);
  await page.evaluate(() => {
    const meta = window.__carnet.repo.meta;
    const lireVraiment = meta.lire;
    meta.lire = (cle) => (cle === 'uneChoseALaFois' ? Promise.reject(new Error('lecture refusée')) : lireVraiment(cle));
  });
  const cartes = await ouvrirCartes(page);
  expect((await lireCarte(cartes)).texte).toBe('je sors marcher');
  await aller(page, '#/reglages/moment-difficile');
  await expect(page.getByRole('switch', { name: 'Quand ça monte, je…', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('un texte très long reste lisible : il défile dans la carte, les boutons restent à l\'écran', async ({ page }) => {
  const long = Array.from({ length: 60 }, (_, i) => `mot${i}`).join(' ');
  await ecrirePlan(page, { quandCaMonte: `${long}\nune ligne courte`, siAlors: [] });
  const cartes = await ouvrirCartes(page);
  await expect(bouton(cartes, 'Suivant')).toBeInViewport();
  await expect(bouton(cartes, 'Précédent')).toBeInViewport();
  const mesures = await cartes.evaluate((d) => {
    const zone = d.querySelector('.une-chose-carte');
    return { defile: zone.scrollHeight > zone.clientHeight, debordeX: document.documentElement.scrollWidth > document.documentElement.clientWidth || zone.scrollWidth > zone.clientWidth };
  });
  expect(mesures).toEqual({ defile: true, debordeX: false });
  // Très grand texte : bien plus gros que le texte courant (16 px).
  const taille = await cartes.locator('.une-chose-texte').evaluate((p) => parseFloat(getComputedStyle(p).fontSize));
  expect(taille).toBeGreaterThanOrEqual(28);
  await bouton(cartes, 'Suivant').click();
  expect((await lireCarte(cartes)).texte).toBe('une ligne courte');
});

test('chaque carte s\'ouvre en haut : le défilement de la carte précédente ne se reporte pas, dans les deux sens', async ({ page }) => {
  const long = (p) => Array.from({ length: 60 }, (_, i) => `${p}${i}`).join(' ');
  await ecrirePlan(page, { quandCaMonte: `${long('un')}\n${long('deux')}\nune ligne courte`, siAlors: [] });
  const cartes = await ouvrirCartes(page);
  const zone = cartes.locator('.une-chose-carte');
  const defiler = (y) => zone.evaluate((z, haut) => { z.scrollTop = haut; return z.scrollTop; }, y);
  const haut = () => zone.evaluate((z) => z.scrollTop);
  expect(await haut()).toBe(0);
  expect(await defiler(300)).toBeGreaterThan(0);
  await bouton(cartes, 'Suivant').click();
  expect((await lireCarte(cartes)).texte).toMatch(/^deux0 /);
  expect(await haut()).toBe(0);
  expect(await defiler(300)).toBeGreaterThan(0);
  await bouton(cartes, 'Précédent').click();
  expect((await lireCarte(cartes)).texte).toMatch(/^un0 /);
  expect(await haut()).toBe(0);
  // Vers une carte courte, puis retour : toujours en haut.
  await defiler(300);
  await bouton(cartes, 'Suivant').click();
  await bouton(cartes, 'Suivant').click();
  expect(await haut()).toBe(0);
  await bouton(cartes, 'Précédent').click();
  expect(await haut()).toBe(0);
});

test('le focus suit : sur la carte à l\'ouverture, puis sur l\'autre bouton quand celui qu\'on touche devient inactif', async ({ page }) => {
  await ecrirePlan(page);
  const cartes = await ouvrirCartes(page);
  await expect(cartes.locator('.une-chose-carte')).toBeFocused();
  await toutesLesCartes(cartes);
  await expect(bouton(cartes, 'Suivant')).toBeDisabled();
  await expect(bouton(cartes, 'Précédent')).toBeFocused();
  while (await bouton(cartes, 'Précédent').isEnabled()) await bouton(cartes, 'Précédent').click();
  await expect(bouton(cartes, 'Précédent')).toBeDisabled();
  await expect(bouton(cartes, 'Suivant')).toBeFocused();
});
