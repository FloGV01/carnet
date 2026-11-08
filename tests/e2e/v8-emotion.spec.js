import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { vueMoment, bulle, toucherMot, carteDuBas, finir } from '../aides/emotion.js';
import { FAMILLES, MOTS_SANS_FAMILLE } from '../../public/js/domain/roue.js';
import { DEFINITIONS } from '../../public/js/domain/definitions-roue.js';

// v8 (2/9) · Réglages › Émotions : le sens des mots de la roue, corrigé au toucher, et la carte qui montre le texte corrigé.
// L'écran « Émotion du moment » de la v8 (les six tuiles, la carte dans son panneau, l'appui long, la fermeture 1,5 s
// après le mot) est remplacé en v9 (4/8) par les écrans plein écran de How We Feel : tests/e2e/v9-emotion.spec.js.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const lireCorrections = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('definitionsRoue'));

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('Réglages › Émotions : les mots par famille et leur sens ; un toucher ouvre le champ, la sortie l\'enregistre ; « Revenir au texte d\'Emozio »', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Émotions', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/emotions$/);
  await expect(page.getByRole('heading', { name: 'Émotions', level: 1 })).toBeVisible();
  // Sept familles, dans l'ordre de la roue, puis « Sans famille » (v9 : Fatigué, Épuisé) ; sous chacune, ses mots et le
  // texte d'Emozio. Enfin « Mes mots » (v9, 6/8 : les mots à soi, tests/e2e/v9-mot-perso.spec.js), vide ici.
  await expect(page.locator('main h2')).toHaveText([...FAMILLES.map((f) => f.libelle), 'Sans famille', 'Mes mots']);
  // Le point de « Sans famille » est creux : aucune couleur de famille.
  await expect(page.getByRole('region', { name: 'Sans famille', exact: true }).locator('.point-famille')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  for (const f of [...FAMILLES, { libelle: 'Sans famille', mots: MOTS_SANS_FAMILLE }]) {
    const section = page.getByRole('region', { name: f.libelle, exact: true });
    await expect(section.locator('.mot-definitions')).toHaveText(f.mots.map((m) => m.libelle));
    await expect(section.locator('.texte-definitions')).toHaveText(f.mots.map((m) => DEFINITIONS[m.id]));
  }
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(0);
  expect(await lireCorrections(page)).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Un toucher ouvre le champ du mot, avec son texte, prêt à écrire.
  await page.getByRole('button', { name: /^Irrité Agacé/ }).click();
  const champ = page.getByRole('textbox', { name: 'Irrité', exact: true });
  await expect(champ).toBeFocused();
  await expect(champ).toHaveValue(DEFINITIONS['roue:colere:irrite']);
  await champ.fill('Agacé par un bruit qui revient.');
  // Rien n'est enregistré pendant la frappe, même après une pause : seulement à la sortie du champ.
  await page.clock.runFor(700);
  expect(await lireCorrections(page)).toBeNull();
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(0);
  // La sortie du champ l'enregistre.
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(1);
  // Un autre mot : le premier se referme sur son nouveau texte.
  await page.getByRole('button', { name: /^Calme Rien/ }).click();
  await expect(page.getByRole('textbox', { name: 'Calme', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Irrité Agacé par un bruit qui revient.' })).toBeVisible();
  // Vider le champ pour le réécrire : la correction reste jusqu'à la sortie, et « Revenir au texte d'Emozio » avec elle.
  await page.getByRole('button', { name: 'Irrité Agacé par un bruit qui revient.' }).click();
  const irrite = page.getByRole('textbox', { name: 'Irrité', exact: true });
  await expect(irrite).toBeFocused();
  await irrite.fill('');
  await page.clock.runFor(700);
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(1);
  expect(await lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });
  await irrite.pressSequentially('Agacé par un bruit qui revient.');
  await page.clock.runFor(700);
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(1);
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await page.clock.runFor(300);
  expect(await lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });

  // Sur la carte (v9), le texte corrigé : Irrité touché, sa carte du bas le montre ; la flèche, puis Terminer, ferment,
  // avec le relevé.
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await bulle(vue, 'rouge').click();
  await toucherMot(vue, 'Irrité');
  await expect(carteDuBas(vue).locator('.definition-carte-du-bas')).toHaveText('Agacé par un bruit qui revient.');
  await finir(vue);
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  // « Revenir au texte d'Emozio » retire la correction ; la carte reprend le texte d'Emozio.
  await aller(page, '#/reglages/emotions');
  await page.getByRole('button', { name: 'Revenir au texte d\'Emozio' }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({});
  await expect(page.getByRole('button', { name: `Irrité ${DEFINITIONS['roue:colere:irrite']}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revenir au texte d\'Emozio' })).toHaveCount(0);
  // Un champ vidé, ou remis au texte d'Emozio, n'est pas une correction.
  await page.getByRole('button', { name: /^Calme Rien/ }).click();
  const calme = page.getByRole('textbox', { name: 'Calme', exact: true });
  await calme.fill('');
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await page.clock.runFor(700);
  expect(await lireCorrections(page)).toEqual({});
  // v9 : un mot sans famille se corrige comme les autres, puis revient au texte d'Emozio.
  const sansFamille = page.getByRole('region', { name: 'Sans famille', exact: true });
  await sansFamille.getByRole('button', { name: `Fatigué ${DEFINITIONS['roue:aucune:fatigue']}` }).click();
  const fatigue = page.getByRole('textbox', { name: 'Fatigué', exact: true });
  await expect(fatigue).toBeFocused();
  await fatigue.fill('Lourd, envie de poser la tête.');
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({ 'roue:aucune:fatigue': 'Lourd, envie de poser la tête.' });
  await sansFamille.getByRole('button', { name: 'Revenir au texte d\'Emozio' }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({});
  await expect(page.getByRole('textbox', { name: 'Fatigué', exact: true })).toHaveValue(DEFINITIONS['roue:aucune:fatigue']);
  // Épuisé ouvert, Fatigué se referme sur le texte d'Emozio.
  await sansFamille.getByRole('button', { name: `Épuisé ${DEFINITIONS['roue:aucune:epuise']}` }).click();
  await expect(page.getByRole('textbox', { name: 'Épuisé', exact: true })).toBeFocused();
  await expect(sansFamille.getByRole('button', { name: `Fatigué ${DEFINITIONS['roue:aucune:fatigue']}` })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
});
