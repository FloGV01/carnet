import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { espionnerAudio, audio } from '../aides/audio.js';

// v6 · « Me ressourcer » (spec §5) : la règle, éteinte au départ. Quand l'utilisateur note lui-même, maintenant,
// une énergie basse, « Pour récupérer, je… » s'affiche tel qu'écrit dans l'Émotion du moment (v7 : juste au-dessus
// du panneau des réponses) et l'écran ne se ferme pas seul. L'écran « Me ressourcer » est parti en v6.1 (P14) : la carte et la règle restent. Rien
// n'est calculé, compté ni gardé.
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

const vueMoment = (page) => page.getByRole('dialog', { name: 'Émotion du moment' });
const carte = (vue) => vue.getByRole('region', { name: 'Pour récupérer, je…' });
// Une famille de la roue (v7) : la toucher la choisit et montre ses mots, sans fermer l'écran ; un mot le peut.
const famille = (vue, nom) => vue.getByRole('group', { name: 'Émotion' }).getByRole('button', { name: nom, exact: true });
const mot = (vue, nom, fam) => vue.getByRole('button', { name: `${nom}, famille ${fam}`, exact: true });
const energie = (vue, nom) => vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: nom });
const respirer = (zone) => zone.getByRole('button', { name: 'Respirer', exact: true });
const noteeUneFois = (page) => page.getByText('Émotion du moment notée');
const ouvrirMoment = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(famille(vue, 'Colère')).toBeVisible();
  return vue;
};
// Note une émotion (une famille) et une énergie « basse », maintenant.
const noterBasse = async (page) => {
  const vue = await ouvrirMoment(page);
  await famille(vue, 'Tristesse').click();
  await energie(vue, 'Basse').click();
  return vue;
};
// L'écran se referme tout seul (comme avant la v6) : retour sur Aujourd'hui, avec le message. Quand la carte
// s'affiche, il reste ouvert : se refermer seul prouve donc qu'elle n'est pas apparue.
const seFermeSeul = async (page) => {
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(noteeUneFois(page)).toBeVisible();
};

// ---------- La règle, sur l'écran Émotion du moment ----------

test('règle allumée : une énergie basse notée maintenant affiche la liste au-dessus des réponses, l\'écran reste ouvert, ✕ le ferme', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  // Aucune invitation tant que rien n'est noté.
  await expect(carte(vue)).toHaveCount(0);
  await famille(vue, 'Peur').click();
  await expect(carte(vue)).toHaveCount(0);
  const groupeEnergie = vue.getByRole('group', { name: 'Énergie' });
  const avant = await groupeEnergie.boundingBox();
  await energie(vue, 'Basse').click();

  // La liste est affichée telle qu'écrite, entière, sans avoir à défiler (le corps de l'écran s'y cale), juste
  // au-dessus du panneau des réponses (v7) ; rien ne bouge sous le pouce.
  await expect(carte(vue)).toBeVisible();
  await expect(carte(vue)).toContainText('je m\'allonge');
  await expect(carte(vue)).toContainText('je ferme les yeux');
  await expect(respirer(carte(vue))).toBeVisible();
  await expect(carte(vue)).toBeInViewport({ ratio: 1 });
  const panneau = await vue.getByRole('region', { name: 'Réponses' }).boundingBox();
  const boite = await carte(vue).boundingBox();
  expect(boite.y + boite.height).toBeLessThanOrEqual(panneau.y);
  expect(await groupeEnergie.boundingBox()).toEqual(avant);

  // Émotion et énergie sont choisies, bien au-delà des 250 ms de la fermeture : l'écran reste là.
  await page.waitForTimeout(700);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(vue).toBeVisible();
  await expect(noteeUneFois(page)).toHaveCount(0);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:peur', energie: 'energie:basse', vers: null }]);

  // ✕ ferme l'écran et dit que le relevé est noté.
  await vue.getByRole('button', { name: 'Fermer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(noteeUneFois(page)).toBeVisible();
  // Aucune trace de l'affichage : le réglage est inchangé, le relevé n'a rien de plus.
  expect(await lireRegle(page)).toEqual({ energieBasse: true });
  const [h] = await releves(page)();
  expect(Object.keys(h).filter((k) => /ressour|liste|carte|affich/i.test(k))).toEqual([]);
});

test('règle allumée : l\'énergie seule suffit, la carte suit l\'énergie choisie et disparaît avec elle', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toBeVisible();
  await expect.poll(releves(page)).toMatchObject([{ emotion: null, humeur: null, energie: 'energie:basse', vers: null }]);
  // Une autre énergie retire la carte ; l'écran ne se ferme pas (l'émotion manque), sans rien dire.
  await energie(vue, 'Moyenne').click();
  await expect(carte(vue)).toHaveCount(0);
  await expect(vue).not.toContainText('Pour récupérer');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/#\/moment$/);
  // Basse de nouveau : la carte revient. Retirer l'énergie la retire.
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toBeVisible();
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toHaveCount(0);
  // Une autre énergie avec l'émotion : l'écran se ferme seul, comme avant. Une famille touchée montre ses mots et
  // l'écran les attend ; le mot touché, il se ferme.
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toBeVisible();
  await energie(vue, 'Haute').click();
  await famille(vue, 'Joie').click();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/#\/moment$/);
  await mot(vue, 'Amusé', 'Joie').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(noteeUneFois(page)).toBeVisible();
});

test('règle éteinte, par défaut : une énergie basse ne change rien, l\'écran se ferme seul', async ({ page }) => {
  await ecrirePlan(page);
  const vue = await noterBasse(page);
  await expect(carte(vue)).toHaveCount(0);
  await seFermeSeul(page);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse', energie: 'energie:basse' }]);
  // Rien n'est écrit tant que rien n'est réglé.
  expect(await lireRegle(page)).toBeNull();
});

test('règle éteinte explicitement : même chose, l\'écran se ferme seul', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page, { energieBasse: false });
  const vue = await noterBasse(page);
  await expect(carte(vue)).toHaveCount(0);
  await seFermeSeul(page);
});

test('règle allumée, un relevé « vers » : jamais de carte, même avec une énergie basse', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '14 h', exact: true }).click();
  await famille(vue, 'Surprise').click();
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toHaveCount(0);
  await seFermeSeul(page);
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '14:00', vers: true, emotion: 'roue:surprise', energie: 'energie:basse' }]);
});

test('règle allumée : passer de « maintenant » à « vers » retire la carte, et inversement', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  const vue = await ouvrirMoment(page);
  await energie(vue, 'Basse').click();
  await expect(carte(vue)).toBeVisible();
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '12 h', exact: true }).click();
  await expect(vue.getByRole('button', { name: 'C\'était vers 12 h' })).toBeVisible();
  await expect(carte(vue)).toHaveCount(0);
  // La liste reste ouverte après un choix (v6.1).
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: 'Maintenant', exact: true }).click();
  await expect(carte(vue)).toBeVisible();
});

test('règle allumée, « Pour récupérer, je… » vide ou absent : pas de carte, pas d\'invitation, l\'écran se ferme seul', async ({ page }) => {
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
    await expect(vue).not.toContainText(/Pour récupérer|Écrire ce qui me recharge/);
    await seFermeSeul(page);
  }
});

test('règle allumée : lecture du réglage ou du plan impossible, l\'écran se comporte comme avant', async ({ page }) => {
  await ecrirePlan(page);
  await ecrireRegle(page);
  await page.evaluate(() => {
    const meta = window.__carnet.repo.meta;
    const lireVraiment = meta.lire;
    meta.lire = (cle) => (['ressourcer', 'monPlan'].includes(cle) ? Promise.reject(new Error('lecture refusée')) : lireVraiment(cle));
  });
  const vue = await noterBasse(page);
  await expect(carte(vue)).toHaveCount(0);
  await seFermeSeul(page);
});

test('✕ touché dans les 250 ms de la fermeture automatique : « Émotion du moment notée » une seule fois', async ({ page }) => {
  const vue = await ouvrirMoment(page);
  await famille(vue, 'Sérénité').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:serenite' }]);
  await page.evaluate(() => {
    // L'écriture du second choix est retenue : la fermeture automatique (250 ms) sera programmée mais n'aura pas
    // encore sonné quand ✕ est touché, et l'écran attend la fin de l'écriture.
    const humeurs = window.__carnet.repo.humeurs;
    const modifierVraiment = humeurs.modifier;
    const retenue = new Promise((ok) => { window.__ouvrirEcriture = ok; });
    humeurs.modifier = async (...args) => { await retenue; return modifierVraiment(...args); };
    // Chaque message « Émotion du moment notée » a son propre identifiant : on les compte.
    window.__messages = new Set();
    window.__carnet.etatApp.abonner((e) => { if (e.toast && e.toast.texte === 'Émotion du moment notée') window.__messages.add(e.toast.id); });
  });
  // L'horloge s'arrête : aucun délai ne sonne avant qu'on le décide.
  await page.clock.pauseAt(new Date(2026, 9, 15, 20, 31));
  await energie(vue, 'Moyenne').click();
  await vue.getByRole('button', { name: 'Fermer' }).click();
  // Les 250 ms s'écoulent pendant que l'écriture est retenue : sans correctif, une seconde fermeture part.
  await page.clock.runFor(400);
  await page.evaluate(() => window.__ouvrirEcriture());
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(noteeUneFois(page)).toBeVisible();
  await page.clock.runFor(400);
  expect(await page.evaluate(() => window.__messages.size)).toBe(1);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:serenite', energie: 'energie:moyenne' }]);
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
  await page.waitForTimeout(500);
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
