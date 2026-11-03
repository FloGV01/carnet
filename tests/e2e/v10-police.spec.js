import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import {
  vueMoment, bulle, mot, toucherMot, continuer, faisais, terminer, loupe, champLoupe, trouves, ajouterMot, couleurMot,
} from '../aides/emotion.js';

// v10 (1/9) · Une seule police (spec §4.3) : la police système partout, carte des émotions comprise, en gras comme en v9.
// Aucun élément des écrans qui étaient en New York n'en garde la trace ; les libellés des quatre bulles tiennent sans
// réduire leur corps au texte par défaut, et dans leur disque en très grand texte (point de vigilance 5, les écrans du
// relevé sont dans v9-emotion et v9-mot-perso). Relecture finale : l'interligne suit le corps ajusté, jusqu'à 53 px (AX5).
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const FLOTTANT = 'roue:perso:u-0a1b2c3d';
const MOTS_PERSO = { [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-10-01T08:00:00.000Z' } };
// Six relevés, un par zone et deux de plus : assez pour les bulles de Tes zones.
const RELEVES = ['roue:colere:irrite', 'roue:joie:fier', 'roue:tristesse:triste', 'roue:serenite:calme', 'roue:peur:anxieux', FLOTTANT];

const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
const charger = (page) => page.evaluate(async ([releves, perso]) => {
  const r = window.__carnet.repo;
  await r.meta.ecrire('motsPerso', perso);
  for (const [i, emotion] of releves.entries()) await r.humeurs.creer({ date: '2026-10-15', heure: `1${i}:00`, emotion, energie: 'energie:moyenne' });
}, [RELEVES, MOTS_PERSO]);
const bullesZones = (page) => page.getByRole('region', { name: 'Tes zones' }).getByRole('list', { name: 'Relevés par zone, sur la période' });
// De la taille du texte par défaut au plus grand texte d'iOS (AX5).
const TAILLES = [17, 19, 21, 23, 28, 33, 40, 47, 53];
const texteA = (page, taille) => page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
// Les libellés de `selecteur` : chaque ligne sur une ligne, dans le disque, l'interligne qui suit le corps, le corps jamais sous
// celui du texte par défaut. Les libellés se réajustent au rendu de l'écran, qui vient d'être ouvert à cette taille.
const libellesTiennent = async (page, selecteur, nbLignes, corpsMin, contexte) => {
  await page.evaluate(() => document.fonts.ready);
  const mesures = await corpsEtLignes(page, selecteur);
  expect(mesures.length, contexte).toBe(4);
  for (const { corps, interligne, lignes } of mesures) {
    expect(lignes, contexte).toEqual(Array(nbLignes).fill(1));
    expect(interligne / corps, contexte).toBeLessThan(1.2);
    expect(corps, contexte).toBeGreaterThanOrEqual(corpsMin);
  }
  expect(await horsDuDisque(page, selecteur), contexte).toEqual([]);
};
// Les textes des libellés de `selecteur` qui sortent de leur disque.
const horsDuDisque = (page, selecteur) => page.evaluate((sel) => {
  const res = [];
  const plage = document.createRange();
  for (const e of document.querySelectorAll(`${sel} .etiquette-bulle`)) {
    const r = e.closest('.face').getBoundingClientRect();
    const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
    const textes = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = textes.nextNode(); n; n = textes.nextNode()) {
      plage.selectNodeContents(n);
      for (const q of plage.getClientRects()) {
        if ([[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].some(([x, y]) => Math.hypot(x - cx, y - cy) > rayon + 0.5)) res.push(`${n.textContent} : hors de sa bulle`);
      }
    }
  }
  return [...new Set(res)];
}, selecteur);

// Toute police à empattements calculée sur la page, pseudo-éléments compris.
const serifs = (page) => page.evaluate(() => {
  const fautes = new Set();
  for (const e of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const f = getComputedStyle(e, pseudo).fontFamily;
      if (/ui-serif|georgia|new york|times|(?<!sans-)serif/i.test(f)) fautes.add(`${e.tagName} ${e.getAttribute('class') || ''} ${pseudo || ''} : ${f}`);
    }
  }
  return [...fautes];
});
// Sur un écran : aucune serif, et les sélecteurs qui étaient en New York sont là, en police système grasse.
const controler = async (page, ecran, selecteurs) => {
  await page.evaluate(() => document.fonts.ready);
  expect(await serifs(page), ecran).toEqual([]);
  for (const s of selecteurs) {
    const polices = await page.locator(s).evaluateAll((es) => es.map((e) => [getComputedStyle(e).fontFamily.split(',')[0], getComputedStyle(e).fontWeight]));
    expect(polices.length, `${ecran} : ${s}`).toBeGreaterThan(0);
    for (const p of polices) expect(p, `${ecran} : ${s}`).toEqual(['-apple-system', '700']);
  }
};
const arrondi = (x) => Math.round(parseFloat(x) * 10) / 10;
// Le corps de chaque libellé des bulles de `selecteur`, et le nombre de lignes de texte de chacune de ses lignes.
const corpsEtLignes = (page, selecteur) => page.locator(`${selecteur} .etiquette-bulle`).evaluateAll((es) => es.map((e) => ({
  corps: parseFloat(getComputedStyle(e).fontSize),
  interligne: parseFloat(getComputedStyle(e).lineHeight),
  lignes: [...e.querySelectorAll('.ligne-bulle')].map((l) => {
    const plage = document.createRange();
    plage.selectNodeContents(l);
    return new Set([...plage.getClientRects()].map((q) => Math.round(q.top))).size;
  }),
})));

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('aucune police à empattements calculée : écran 1, carte, mot choisi, écran 3, loupe, Mon mot, Analyse › Tes zones, Réglages › Mes mots ; tout en police système grasse', async ({ page }) => {
  test.setTimeout(60000);
  await charger(page);
  let vue = await ouvrir(page);
  await controler(page, 'écran 1', ['.titre-bulles', '.etiquette-bulle']);

  await bulle(vue, 'vert').click();
  await expect(mot(vue, 'Calme')).toBeVisible();
  await controler(page, 'carte', ['.etiquette-mot']);

  await toucherMot(vue, 'Calme');
  await expect(vue.locator('.carte-du-bas')).toBeVisible();
  await controler(page, 'mot choisi', ['.etiquette-mot']);

  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  await controler(page, 'écran 3', ['.mot-rappel', '.titre-faisais']);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  vue = await ouvrir(page);
  await loupe(vue).click();
  await champLoupe(vue).fill('epuise');
  await expect(trouves(vue).getByRole('button').first()).toBeVisible();
  await controler(page, 'loupe', ['.mot-resultat']);

  await champLoupe(vue).fill('Un mot à soi');
  await ajouterMot(vue).click();
  await expect(couleurMot(vue, 'rouge')).toBeVisible();
  await controler(page, 'Mon mot', ['.titre-mot', '.quatre-bulles.petites .etiquette-bulle']);

  await aller(page, '#/analyse');
  await expect(bullesZones(page)).toBeVisible({ timeout: 15000 });
  await controler(page, 'Analyse › Tes zones', ['.quatre-bulles.comptes .etiquette-bulle']);

  await aller(page, '#/reglages/emotions');
  await page.getByRole('region', { name: 'Mes mots', exact: true }).getByRole('button', { name: /^Flottant/ }).click();
  await expect(couleurMot(page.getByRole('region', { name: 'Mes mots', exact: true }), 'vert')).toBeVisible();
  await controler(page, 'Réglages › Mes mots', ['.quatre-bulles.petites .etiquette-bulle']);
});

test('au texte par défaut, les libellés des quatre bulles gardent leur corps et leurs deux lignes : 16,5 à l\'écran 1, 12 en petit et avec les comptes', async ({ page }) => {
  await charger(page);
  const vue = await ouvrir(page);
  await page.evaluate(() => document.fonts.ready);
  const ecran1 = await corpsEtLignes(page, '.quatre-bulles');
  expect(ecran1.length).toBe(4);
  for (const { corps, lignes } of ecran1) {
    expect(arrondi(corps)).toBe(16.5);
    expect(lignes).toEqual([1, 1]);
  }

  await loupe(vue).click();
  await champLoupe(vue).fill('Un mot à soi');
  await ajouterMot(vue).click();
  await expect(couleurMot(vue, 'rouge')).toBeVisible();
  const petites = await corpsEtLignes(page, '.quatre-bulles.petites');
  expect(petites.length).toBe(4);
  for (const { corps, lignes } of petites) {
    expect(arrondi(corps)).toBe(12);
    expect(lignes).toEqual([1, 1]);
  }

  await aller(page, '#/analyse');
  await expect(bullesZones(page)).toBeVisible({ timeout: 15000 });
  const comptes = await corpsEtLignes(page, '.quatre-bulles.comptes');
  expect(comptes.length).toBe(4);
  for (const { corps, lignes } of comptes) {
    expect(arrondi(corps)).toBe(12);
    expect(lignes).toEqual([1, 1, 1]);
  }

  // À la taille de texte suivante, les 126 pt de l'écran 1 gardent encore chaque ligne sur une ligne, au corps plein.
  await page.evaluate(() => { document.documentElement.style.fontSize = '19px'; });
  await ouvrir(page);
  await page.evaluate(() => document.fonts.ready);
  for (const { corps, lignes } of await corpsEtLignes(page, '.quatre-bulles')) {
    expect(arrondi(corps)).toBe(18.4);
    expect(lignes).toEqual([1, 1]);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte (17 à 53) : les libellés de Tes zones restent dans leur disque, sur une ligne chacun, et leurs lignes ne s\'écartent pas ; leur carte, « Par semaine » comprise, ne défile pas de côté', async ({ page }) => {
  test.setTimeout(120000);
  await charger(page);
  await aller(page, '#/analyse');
  await expect(bullesZones(page)).toBeVisible({ timeout: 15000 });
  for (const taille of TAILLES) {
    await texteA(page, taille);
    // Les libellés se réajustent au rendu de l'écran : on y revient à cette taille.
    await aller(page, '#/aujourdhui');
    await aller(page, '#/analyse');
    await expect(bullesZones(page)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.tes-zones .graphe-droite')).toHaveText('12 dernières semaines');
    await libellesTiennent(page, '.quatre-bulles.comptes', 3, 12, `Tes zones, ${taille} px`);
    const fautes = await page.evaluate(() => {
      const res = [];
      if (document.documentElement.scrollWidth > innerWidth + 0.5) res.push(`page : ${document.documentElement.scrollWidth} px`);
      // La carte elle-même : la page peut rester à sa largeur alors que les bulles sortent de la carte.
      const carte = document.querySelector('.tes-zones');
      if (carte.scrollWidth > carte.clientWidth + 0.5) res.push(`carte : ${carte.scrollWidth} px pour ${carte.clientWidth}`);
      const cadre = carte.getBoundingClientRect();
      for (const b of carte.querySelectorAll('.bulle-zone, .graphe-tete > *')) {
        const r = b.getBoundingClientRect();
        if (r.left < cadre.left - 0.5 || r.right > cadre.right + 0.5 || r.top < cadre.top - 0.5 || r.bottom > cadre.bottom + 0.5) res.push(`${b.className} : de ${r.left} à ${r.right}, hors de sa carte (de ${cadre.left} à ${cadre.right})`);
      }
      return [...new Set(res)];
    });
    expect(fautes, `${taille} px`).toEqual([]);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte (17 à 53) : les libellés de l\'écran 1 et de Mon mot gardent une ligne chacun, dans leur disque ; le corps ne passe jamais sous celui du texte par défaut, et l\'interligne le suit', async ({ page }) => {
  test.setTimeout(120000);
  for (const taille of TAILLES) {
    await texteA(page, taille);
    const vue = await ouvrir(page);
    await libellesTiennent(page, '.quatre-bulles', 2, 16.5, `écran 1, ${taille} px`);
    await loupe(vue).click();
    await champLoupe(vue).fill('Un mot à soi');
    await ajouterMot(vue).click();
    await expect(couleurMot(vue, 'rouge')).toBeVisible();
    await libellesTiennent(page, '.quatre-bulles.petites', 2, 12, `Mon mot, ${taille} px`);
    // Rien n'est né : on ressort sans couleur.
    await aller(page, '#/aujourdhui');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});
