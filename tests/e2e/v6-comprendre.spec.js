import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { generer } from '../fixtures/generateur.js';
import { addDays } from '../../public/js/domain/dates.js';

// v6 · Comprendre (spec §2) : un écran ouvert depuis l'Analyse, trois onglets, graphiques seulement.
// Données inventées (aucune donnée réelle).
const AUJ = '2026-10-15';
const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
const repo = (page, f, arg) => page.evaluate(f, arg);
const groupe = (page, nom) => page.getByRole('group', { name: nom, exact: true });
const bouton = (page, nom, libelle) => groupe(page, nom).getByRole('button', { name: `${nom} : ${libelle}`, exact: true });
// La carte d'un graphique, par son titre.
const carte = (page, titre) => page.locator('figure.graphe', { has: page.getByText(titre, { exact: true }) });
const lireLocal = (page, cle) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), cle);

async function demarrer(page) {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
}

// 180 jours qui finissent aujourd'hui : le générateur (lieu, nuit, contact, explosions, humeurs du moment),
// puis, sans hasard, ce qu'il ne note pas : l'énergie et « Ce que je faisais » des relevés, pesé et rechargé,
// le coucher et le lever.
const ENERGIES = ['energie:basse', 'energie:moyenne', 'energie:haute', 'energie:moyenne'];
const ACTIVITES = ['activiteMoment:travail', 'activiteMoment:trajet', 'activiteMoment:maison', 'activiteMoment:repos'];
const COUCHERS = ['22:40', '23:15', '23:50', '00:30', '01:10'];
const LEVERS = ['06:45', '07:20', '08:10', '09:05'];
function jours180() {
  const { journal, humeurs } = generer({ jours: 180, seed: 11, releves: true, debut: addDays(AUJ, -179) });
  return {
    journal: journal.map((j, i) => ({
      ...j,
      pese: i % 3 === 0 ? ['pese:bruit'] : i % 7 === 0 ? ['pese:monde', 'pese:trajets'] : null,
      recharge: i % 4 === 0 ? ['recharge:calme'] : i % 5 === 0 ? ['recharge:dehors'] : null,
      heureCoucher: COUCHERS[i % COUCHERS.length], heureLever: LEVERS[i % LEVERS.length],
    })),
    humeurs: humeurs.map(({ id, ...h }, k) => ({ ...h, energie: ENERGIES[k % ENERGIES.length], faisais: [ACTIVITES[k % ACTIVITES.length]] })),
  };
}
async function charger180(page) {
  await repo(page, async ({ journal, humeurs }) => {
    const r = window.__carnet.repo;
    for (const { date, ...reste } of journal) await r.journal.patch(date, reste);
    for (const h of humeurs) await r.humeurs.creer(h);
  }, jours180());
}

test('accès depuis l\'Analyse, trois onglets, le dernier rouvert ; sans données, « Pas encore assez » partout', async ({ page }) => {
  await demarrer(page);
  await page.getByRole('link', { name: 'Analyse' }).click();
  await page.getByRole('link', { name: 'Comprendre' }).click();
  await expect(page).toHaveURL(/#\/comprendre\/explosions$/);
  await expect(page.getByRole('heading', { name: 'Comprendre' })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Analyse' })).toHaveAttribute('aria-current', 'page');
  await expect(groupe(page, 'Comprendre').getByRole('button')).toHaveText(['Explosions', 'Énergie', 'Rythmes']);
  await expect(bouton(page, 'Comprendre', 'Explosions')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Période', 'Tout')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Avant ou après', 'Avant')).toHaveAttribute('aria-pressed', 'true');
  await expect(carte(page, 'Avant mes explosions')).toContainText(PAS_ASSEZ);

  await bouton(page, 'Comprendre', 'Énergie').click();
  await expect(page).toHaveURL(/#\/comprendre\/energie$/);
  for (const titre of ['Ce qui a pesé, ce qui a rechargé', 'Avant mes jours à énergie basse', 'Selon ce que tu faisais']) {
    await expect(carte(page, titre)).toContainText(PAS_ASSEZ);
  }

  await bouton(page, 'Comprendre', 'Rythmes').click();
  await expect(page).toHaveURL(/#\/comprendre\/rythmes$/);
  await expect(groupe(page, 'Mesure').getByRole('button')).toHaveText(['Humeur', 'Nuits Mal', 'Explosions', 'Énergie basse']);
  await expect(bouton(page, 'Mesure', 'Humeur')).toHaveAttribute('aria-pressed', 'true');
  for (const titre of ['Selon le jour de la semaine', 'Selon le lieu', "Autour d'un retour au bureau", 'Tes nuits selon le jour', 'Selon le mois']) {
    await expect(carte(page, titre)).toContainText(PAS_ASSEZ);
  }
  expect(await lireLocal(page, 'carnet:comprendre:onglet')).toBe('rythmes');

  // « ‹ Retour » ramène à l'Analyse ; la ligne « Comprendre › » rouvre le dernier onglet.
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/analyse$/);
  await expect(page.getByRole('link', { name: 'Comprendre' })).toHaveAttribute('href', '#/comprendre/rythmes');
  await page.getByRole('link', { name: 'Comprendre' }).click();
  await expect(page).toHaveURL(/#\/comprendre\/rythmes$/);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
});

test('« Pas encore assez de données » avec 2 explosions ; « Pourquoi ? » donne la règle sans décompte ; à 3, le graphique', async ({ page }) => {
  await demarrer(page);
  await repo(page, async () => {
    for (const date of ['2026-10-10', '2026-10-12']) {
      await window.__carnet.repo.episodes.creer({ date, heure: '18:00', emotion: 'emotion:colere', reaction: 'reaction:explosion' });
    }
  });
  await aller(page, '#/comprendre/explosions');
  const avant = carte(page, 'Avant mes explosions');
  await expect(avant).toContainText(PAS_ASSEZ);
  await avant.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(avant.locator('.encadre-regle')).toHaveText('La règle : au moins 3 jours avec une explosion sur la période.');
  await expect(avant).not.toContainText('2');
  await expect(avant.getByRole('button', { name: 'Voir en tableau' })).toHaveCount(0);
  await bouton(page, 'Avant ou après', 'Après').click();
  await expect(carte(page, 'Après mes explosions')).toContainText(PAS_ASSEZ);

  await repo(page, () => window.__carnet.repo.episodes.creer({ date: '2026-10-14', heure: '18:00', emotion: 'emotion:colere', reaction: 'reaction:explosion' }));
  await expect(page.getByRole('group', { name: /^Après mes explosions, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(PAS_ASSEZ);
});

test('180 jours inventés : les graphiques des trois onglets, les choix gardés, sans débordement', async ({ page }) => {
  test.setTimeout(90000);
  await demarrer(page);
  await charger180(page);
  await aller(page, '#/comprendre/explosions');

  await expect(page.getByRole('group', { name: /^Avant mes explosions, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(carte(page, 'Avant mes explosions')).toContainText('Ce sont tes notes, rassemblées : pas des causes.');
  await expect(carte(page, 'Avant mes explosions').getByText('A pesé : Bruit', { exact: true })).toBeVisible();
  await bouton(page, 'Avant ou après', 'Après').click();
  await expect(page.getByRole('group', { name: /^Après mes explosions, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(carte(page, 'Après mes explosions').getByText('A rechargé : Calme', { exact: true })).toBeVisible();

  await bouton(page, 'Comprendre', 'Énergie').click();
  await expect(page.getByRole('img', { name: /^Ce qui a pesé, ce qui a rechargé, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Avant mes jours à énergie basse, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Selon ce que tu faisais, sur tout ce que tu as noté : / })).toBeVisible();
  // Les activités dans l'ordre de leur liste.
  await expect(carte(page, 'Selon ce que tu faisais').locator('text.g-nom')).toHaveText(['Travail', 'Trajet', 'Chez moi', 'Repos']);

  await bouton(page, 'Comprendre', 'Rythmes').click();
  await expect(page.getByRole('img', { name: /^Selon le jour de la semaine, sur tout ce que tu as noté : l'humeur du jour/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Selon le lieu, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Autour d'un retour au bureau, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Tes nuits selon le jour, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Selon le mois, sur tout ce que tu as noté : l'humeur du jour/ })).toBeVisible();

  // Le choix de mesure sert aux graphiques 1, 2 et 5 ; mesure et période sont gardées.
  await bouton(page, 'Mesure', 'Explosions').click();
  for (const titre of ['Selon le jour de la semaine', 'Selon le lieu', 'Selon le mois']) {
    await expect(page.getByRole('img', { name: new RegExp(`^${titre}, sur tout ce que tu as noté : la part des jours avec une explosion`) })).toBeVisible();
  }
  await bouton(page, 'Période', '3 mois').click();
  await expect(page.getByRole('img', { name: /^Selon le jour de la semaine, sur les trois derniers mois : la part des jours avec une explosion/ })).toBeVisible();
  expect(await lireLocal(page, 'carnet:comprendre:mesure')).toBe('explosion');
  expect(await lireLocal(page, 'carnet:comprendre:periode')).toBe('3mois');
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.reload();
  await aller(page, '#/analyse');
  await page.getByRole('link', { name: 'Comprendre' }).click();
  await expect(page).toHaveURL(/#\/comprendre\/rythmes$/);
  await expect(bouton(page, 'Mesure', 'Explosions')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Période', '3 mois')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: /^Selon le mois, sur les trois derniers mois : la part des jours avec une explosion/ })).toBeVisible();
});

test('180 jours inventés : « Voir en tableau », le toucher d\'une barre et ses dates, la phrase d\'accessibilité sans valeur', async ({ page }) => {
  test.setTimeout(90000);
  await demarrer(page);
  await charger180(page);
  await aller(page, '#/comprendre/explosions');
  const avant = carte(page, 'Avant mes explosions');
  await expect(avant.getByRole('group')).toBeVisible();

  // « Voir en tableau » : les valeurs, un en-tête neutre au-dessus des décalages et des autres jours.
  await avant.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(avant.getByRole('columnheader')).toHaveText(['Jour', 'Compte']);
  await expect(avant.getByRole('cell', { name: 'La veille' }).first()).toBeVisible();
  await expect(avant.getByRole('cell', { name: 'Les autres jours' }).first()).toBeVisible();
  await expect(avant.getByRole('cell', { name: /^\d+ sur \d+$/ }).first()).toBeVisible();
  await avant.getByRole('button', { name: 'Voir le graphe' }).click();

  // Toucher une barre : son compte, puis les dates des jours repères ; toucher de nouveau ferme.
  const zone = avant.locator('rect.g-zone').first();
  await zone.click();
  const detail = avant.getByRole('status');
  await expect(detail).toContainText(/^Nuit notée Mal, 3 jours avant · \d+ sur \d+/);
  await zone.click();
  await expect(detail).toHaveCount(0);

  // La barre touchée ne passe ni d'un graphique à l'autre, ni d'une période à l'autre.
  await zone.click();
  await expect(detail).toHaveCount(1);
  await bouton(page, 'Avant ou après', 'Après').click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await bouton(page, 'Avant ou après', 'Avant').click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await zone.click();
  await bouton(page, 'Période', '3 mois').click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await bouton(page, 'Période', 'Tout').click();

  await zone.click();
  const lien = detail.getByRole('link').first();
  const href = await lien.getAttribute('href');
  expect(href).toMatch(/^#\/jour\/\d{4}-\d{2}-\d{2}$/);
  await lien.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));

  // Chaque graphique, dans chaque onglet : une phrase fixe, sans chiffre.
  const phrases = [];
  for (const onglet of ['explosions', 'energie', 'rythmes']) {
    await aller(page, `#/comprendre/${onglet}`);
    await expect(page.locator('figure.graphe').first()).toBeVisible();
    phrases.push(...await page.locator('figure.graphe [role="group"], figure.graphe svg[role="img"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))));
  }
  expect(phrases).toHaveLength(1 + 3 + 5);
  for (const p of phrases) {
    expect(p).toMatch(/« Voir en tableau »\.$/);
    expect(p).not.toMatch(/\d|%/);
  }
});
