import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { LISTES, NOMS_LISTES } from '../../public/js/domain/listes-def.js';

// v6.1 · Réglages (P16, A1) : la sauvegarde en tête, puis « Ma saisie » (Le soir, Listes, Rappels) et « Moment
// difficile » (Mon plan, Moment difficile, Me ressourcer, Aide iPhone), puis À propos, Zone sensible (v7 : la section
// Analyse disparaît avec le signal de ressemblance et les tendances).
// « Le soir » (ex-« Ma journée ») ne règle plus que les champs du soir ; les heures de l'humeur du moment passent
// dans Rappels, dans la même méta. L'index des Listes est rangé par écran. Écran de 390 × 844, celui du projet.
const nav = (page, nom) => page.getByRole('navigation').getByRole('link', { name: nom, exact: true });
const lireJournee = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('journee'));
const ecrireJournee = (page, v) => page.evaluate((x) => window.__carnet.repo.meta.ecrire('journee', x), v);
const heures = (page) => page.getByRole('group', { name: 'Heures des rappels', exact: true });
const heure = (page, h) => heures(page).getByRole('button', { name: `${h} h`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('ordre de Réglages : Sauvegarde, « Ma saisie », « Moment difficile », puis À propos, Zone sensible ; v7, plus de section Analyse', async ({ page }) => {
  await nav(page, 'Réglages').click();
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  // Intertitres et liens, dans l'ordre du document.
  const ordre = await page.locator('main.reglages').evaluate((m) => [...m.querySelectorAll('h2, a[href^="#/"]')].map((e) => e.textContent.trim()));
  expect(ordre).toEqual([
    'Sauvegarde',
    'Ma saisie', 'Le soir', 'Listes', 'Rappels',
    'Moment difficile', 'Mon plan', 'Moment difficile', 'Me ressourcer', 'Aide iPhone',
    'À propos', 'Zone sensible', 'Tout effacer',
  ]);
  await expect(page.locator('main.reglages')).not.toContainText(/Signal de ressemblance|Tendances/);
  await expect(page.getByRole('switch')).toHaveCount(0);
  // Chaque groupe de liens porte le nom de son intertitre et mène où il faut.
  const liens = async (nom) => page.getByRole('list', { name: nom, exact: true }).getByRole('link').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  expect(await liens('Ma saisie')).toEqual(['#/reglages/journee', '#/reglages/listes', '#/reglages/rappel']);
  expect(await liens('Moment difficile')).toEqual(['#/mon-plan', '#/reglages/moment-difficile', '#/reglages/ressourcer', '#/reglages/aide-iphone']);
  // La sauvegarde reste en tête : ses boutons avant le premier intertitre de liens.
  const exporter = await page.getByRole('button', { name: 'Exporter' }).boundingBox();
  const maSaisie = await page.getByRole('heading', { name: 'Ma saisie', level: 2 }).boundingBox();
  expect(exporter.y + exporter.height).toBeLessThanOrEqual(maSaisie.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Le soir : les seuls champs du soir, sans les heures ; un changement garde les heures de Rappels', async ({ page }) => {
  await ecrireJournee(page, { masques: ['explosions', 'humeur'], heuresMoment: [9] });
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Le soir', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/journee$/);
  await expect(page.getByRole('heading', { name: 'Le soir', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toHaveCount(0);
  // Huit champs et le repli « pesé · rechargé » ; ni heures, ni lien vers Rappels.
  await expect(page.getByRole('switch')).toHaveCount(9);
  await expect(heures(page)).toHaveCount(0);
  await expect(page.locator('main.ma-journee')).not.toContainText('Humeur du moment');
  await expect(page.locator('main.ma-journee a')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Afficher Lieu' }).click();
  await expect.poll(async () => (await lireJournee(page)).masques).toEqual(['explosions', 'humeur', 'lieu']);
  expect((await lireJournee(page)).heuresMoment).toEqual([9]);
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
});

test('Rappels : les heures de l\'humeur du moment s\'y choisissent d\'un toucher, dans la même méta', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Rappels', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/rappel$/);
  // De 6 h à 23 h, aucune choisie au départ.
  await expect(heures(page).getByRole('button')).toHaveCount(18);
  await expect(heures(page).getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.locator('main.rappel')).toContainText('Refais les mêmes étapes pour chaque heure choisie.');
  // v7 : l'écran s'appelle « Émotion du moment », et le bouton de la bande du bas « Émotion ».
  await expect(page.getByRole('heading', { name: 'Émotion du moment', level: 2 })).toBeVisible();
  await expect(page.locator('main.rappel')).toContainText('Texte de la notification : « Émotion du moment, si tu veux. » Ensuite, ouvre Carnet et touche « Émotion », en bas.');
  await expect(page.locator('main.rappel')).not.toContainText('Humeur');
  expect(await lireJournee(page)).toBeNull();

  // Des réglages du soir déjà faits : les heures s'y ajoutent sans rien toucher d'autre.
  await ecrireJournee(page, { ordre: ['humeur', 'lieu'], masques: ['explosions'], heuresMoment: [20] });
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/reglages/rappel');
  await expect(heure(page, 20)).toHaveAttribute('aria-pressed', 'true');
  await heure(page, 14).click();
  await expect(heure(page, 14)).toHaveAttribute('aria-pressed', 'true');
  await heure(page, 9).click();
  await expect.poll(async () => (await lireJournee(page)).heuresMoment).toEqual([9, 14, 20]);
  const j = await lireJournee(page);
  expect(j.masques).toEqual(['explosions']);
  expect(j.ordre.slice(0, 2)).toEqual(['humeur', 'lieu']);
  await expect(page.locator('main.rappel')).toContainText('Refais les mêmes étapes pour chaque heure : 09:00, 14:00, 20:00.');
  // Retouchée, une heure s'enlève.
  await heure(page, 20).click();
  await expect(heure(page, 20)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await lireJournee(page)).heuresMoment).toEqual([9, 14]);
  await expect(page.locator('main.rappel')).toContainText('pour chaque heure : 09:00, 14:00.');
  // Elles se relisent après un redémarrage.
  await page.reload();
  await aller(page, '#/reglages/rappel');
  await expect(heure(page, 9)).toHaveAttribute('aria-pressed', 'true');
  await expect(heure(page, 14)).toHaveAttribute('aria-pressed', 'true');
  await expect(heure(page, 19)).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Écrit en dur : l'index montre chaque liste sous l'écran où on la choisit, avec son libellé de toujours.
const GROUPES = [
  ['Le soir', ['Lieu', 'Sommeil ressenti', 'Contact : avec qui', 'Contact : comment c\'était', 'Types de sport', 'Durée du sport', 'Traitement pris', 'Ce qui a pesé', 'Ce qui a rechargé']],
  ['Émotion du moment', ['Énergie', 'Ce que je faisais']],
  ['Épisode', ['Déclencheur', 'Émotion', 'Ce qu\'il y avait dessous', 'Réaction', 'Professionnel']],
  ['Après coup', ['C\'était plutôt', 'Fragilités', 'Premiers signes', 'Ça ressemble à', 'Ce qui était trop', 'Besoins', 'Sur le moment', 'Plus tard']],
  ['Symptôme', ['Symptôme', 'Durée']],
  ['Soins', ["Sujets d'un rendez-vous", 'Effet secondaire', 'Effet ressenti']],
];

test('Listes : l\'index rangé par écran sous six intertitres, toutes les listes encore là, une fois chacune', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Listes', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/listes$/);
  await expect(page.locator('main.listes > h2')).toHaveText(GROUPES.map(([ecran]) => ecran));
  for (const [ecran, libelles] of GROUPES) {
    await expect(page.getByRole('list', { name: ecran, exact: true }).getByRole('link')).toHaveText(libelles);
  }
  // Aucune liste ne disparaît ni n'est renommée : chaque liste de l'app, une fois, avec son libellé.
  const tous = await page.locator('main.listes a[href^="#/reglages/listes/"]').evaluateAll((a) => a.map((x) => [x.getAttribute('href').split('/').pop(), x.textContent.trim()]));
  expect(tous.length).toBe(NOMS_LISTES.length);
  expect(tous.map(([nom]) => nom).sort()).toEqual([...NOMS_LISTES].sort());
  for (const [nom, libelle] of tous) expect(libelle).toBe(LISTES[nom].libelle);
  // Une liste ouverte depuis son groupe, puis Retour vers l'index.
  await page.getByRole('list', { name: 'Émotion du moment', exact: true }).getByRole('link', { name: 'Énergie' }).click();
  await expect(page).toHaveURL(/#\/reglages\/listes\/energie$/);
  await expect(page.getByRole('heading', { name: 'Énergie', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages\/listes$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
