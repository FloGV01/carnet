import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import {
  vueMoment, bulle, bulles, carte, noter, toucherMot, continuer, carteDuBas, terminer, faisais, activite, loupe, champLoupe, trouve,
  ajouterMot, couleurMot, finMouvements,
} from '../aides/emotion.js';
import { motsDeLaCarte } from '../../public/js/domain/carte-roue.js';
import { couleurCase, couleurLisible } from '../../public/js/ui/carte-geometrie.js';

// v11 (8/11) · Les écrans de l'émotion en clair (spec §9) : l'écran 1, la carte, l'écran 3, un relevé rouvert, la loupe et
// Mon mot suivent le thème du système. En clair, le fond gris clair d'Aujourd'hui, le verre blanc translucide, la carte du
// bas blanche au rond « Continuer » foncé, « Terminer » foncé, et le mot choisi en noir sur une capsule de la couleur de sa
// case (à la carte du bas et à l'écran 3). En sombre, rien ne change (les attentes noires de v9-emotion, v9-mot-perso,
// v10-apres-emotion et v7-fondations). Les 144 bulles gardent leur couleur et leur texte noir dans les deux thèmes ; rien
// n'est recalculé quand le thème change, écran ouvert. « Réveil la nuit » reste noir (v10-lecteur, v10-crise, v10-bien-etre).
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const FOND_CLAIR = 'rgb(231, 234, 238)';
const FONCE = 'rgb(24, 27, 31)';
const BLANC = 'rgb(255, 255, 255)';
const NOIR = 'rgb(0, 0, 0)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const MOTS_CARTE = motsDeLaCarte(null);
const caseDe = (libelle) => { const m = MOTS_CARTE.find((x) => x.libelle === libelle); return couleurCase(m.col, m.rang); };
const fondEcran = (page) => page.locator('.moment-plein').evaluate((e) => getComputedStyle(e).backgroundColor);
const style = (loc, ...props) => loc.evaluate((e, p) => p.map((x) => getComputedStyle(e)[x]), props);
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
const creer = (page, h) => page.evaluate((x) => window.__carnet.repo.humeurs.creer(x).then((r) => r.id), h);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await viderBase(page);
});

test('en clair, le fond gris clair d\'Aujourd\'hui sur l\'écran 1, la carte, l\'écran 3, un relevé rouvert, la loupe et Mon mot ; le verre blanc, la carte du bas blanche, « Continuer » et « Terminer » foncés', async ({ page }) => {
  await aller(page, '#/aujourdhui');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(FOND_CLAIR);
  const vue = await ouvrir(page);
  expect(await fondEcran(page), 'écran 1').toBe(FOND_CLAIR);
  expect(await style(vue.locator('.verre').first(), 'backgroundColor', 'color')).toEqual(['rgba(255, 255, 255, 0.78)', FONCE]);
  expect(await style(vue.locator('.titre-bulles'), 'color')).toEqual([FONCE]);

  await bulle(vue, 'vert').click();
  await expect(carte(vue)).toBeVisible();
  expect(await fondEcran(page), 'carte').toBe(FOND_CLAIR);
  // Le voile du haut prend la couleur du fond ; le verre de la carte, blanc translucide aussi.
  expect((await style(vue.locator('.carte-fondu'), 'backgroundImage'))[0]).toMatch(/^linear-gradient\(rgba\(231, 234, 238, 0\.6\)/);
  expect(await style(vue.locator('.ecran-carte .verre').first(), 'backgroundColor')).toEqual(['rgba(255, 255, 255, 0.78)']);
  await toucherMot(vue, 'Calme');
  await expect(carteDuBas(vue)).toBeVisible();
  expect(await style(carteDuBas(vue), 'backgroundColor')).toEqual([BLANC]);
  expect(await style(carteDuBas(vue).locator('.definition-carte-du-bas'), 'color')).toEqual([FONCE]);
  expect(await style(continuer(vue), 'backgroundColor', 'color')).toEqual([FONCE, BLANC]);

  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  expect(await fondEcran(page), 'écran 3').toBe(FOND_CLAIR);
  expect(await style(terminer(vue), 'backgroundColor', 'color')).toEqual([FONCE, BLANC]);
  expect(await style(vue.locator('.titre-faisais'), 'color')).toEqual([FONCE]);
  // Une activité non choisie, sur une carte blanche, comme les choix d'Aujourd'hui.
  expect(await style(activite(vue, 'Travail'), 'backgroundColor')).toEqual([rgb(clair.surface)]);
  for (const sel of ['.titre-faisais', '.titre-pour-ce-moment']) {
    const [c] = await style(vue.locator(sel), 'color');
    expect(contraste(c, FOND_CLAIR), sel).toBeGreaterThanOrEqual(4.5);
  }
  const [contour] = await style(vue.locator('.proposition').first(), 'borderTopColor');
  expect(contraste(contour, FOND_CLAIR)).toBeGreaterThanOrEqual(3);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  // Le même relevé, rouvert depuis Ma journée.
  await page.locator('.liste-evenements a.releve').first().click();
  await expect(vue.locator('.supprimer-releve')).toBeVisible();
  expect(await fondEcran(page), 'relevé rouvert').toBe(FOND_CLAIR);
  for (const sel of ['.detail-rappel', '.supprimer-releve', '.changer-mot']) {
    const [c] = await style(vue.locator(sel), 'color');
    expect(contraste(c, FOND_CLAIR), sel).toBeGreaterThanOrEqual(4.5);
  }
  await terminer(vue).click();

  // La loupe : le champ en verre blanc, le texte foncé ; le mot trouvé au texte de sa zone (AA sur le clair), son début de
  // définition en gris.
  await ouvrir(page);
  await loupe(vue).click();
  await champLoupe(vue).fill('epuise');
  await expect(trouve(vue, 'Épuisé')).toBeVisible();
  expect(await fondEcran(page), 'loupe').toBe(FOND_CLAIR);
  expect(await style(vue.locator('.champ-loupe'), 'backgroundColor')).toEqual(['rgba(255, 255, 255, 0.78)']);
  expect(await style(champLoupe(vue), 'color')).toEqual([FONCE]);
  const [motTrouve, extrait] = await trouve(vue, 'Épuisé').evaluate((b) => [b.querySelector('.mot-resultat'), b.querySelector('.extrait-resultat')].map((e) => getComputedStyle(e).color));
  expect(motTrouve).toBe(rgb(clair['c-zone-bleu-text']));
  for (const c of [motTrouve, extrait]) expect(contraste(c, FOND_CLAIR)).toBeGreaterThanOrEqual(4.5);

  // « Ajouter mon mot « … » », derrière un rond foncé au « + » blanc.
  await champLoupe(vue).fill('brumeux');
  expect(await style(vue.locator('.rond-ajouter'), 'backgroundColor', 'color')).toEqual([FONCE, BLANC]);
  expect(await style(ajouterMot(vue), 'color')).toEqual([FONCE]);

  // Mon mot : le titre foncé ; la couleur choisie cerclée de foncé (3:1 sur le fond) ; le rond « Continuer » foncé.
  await ajouterMot(vue).click();
  await expect(vue.getByRole('heading', { name: 'Mon mot', level: 1 })).toBeVisible();
  expect(await fondEcran(page), 'Mon mot').toBe(FOND_CLAIR);
  expect(await style(vue.locator('.titre-mot'), 'color')).toEqual([FONCE]);
  await couleurMot(vue, 'bleu').click();
  await expect(couleurMot(vue, 'bleu')).toHaveAttribute('aria-pressed', 'true');
  const [anneau, trait] = await style(couleurMot(vue, 'bleu'), 'outlineColor', 'outlineStyle');
  expect([anneau, trait]).toEqual([FONCE, 'solid']);
  expect(contraste(anneau, FOND_CLAIR)).toBeGreaterThanOrEqual(3);
  expect(await style(continuer(vue), 'backgroundColor', 'color')).toEqual([FONCE, BLANC]);
});

test('en clair, le mot choisi s\'écrit en noir sur une capsule de la couleur de sa case, à la carte du bas et à l\'écran 3 (Gai, un jaune ; Enragé, un profond) ; en sombre, sans capsule, comme avant', async ({ page }) => {
  for (const [zone, libelle] of [['jaune', 'Gai'], ['rouge', 'Enragé']]) {
    for (const schema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: schema });
      const vue = await ouvrir(page);
      await noter(vue, zone, libelle);
      const motBas = carteDuBas(vue).locator('.mot-carte-du-bas');
      await expect(motBas).toHaveText(libelle);
      const [texteBas, fondBas, rayonBas] = await style(motBas, 'color', 'backgroundColor', 'borderTopLeftRadius');
      await continuer(vue).click();
      const rappel = vue.getByRole('heading', { name: libelle, level: 1, exact: true });
      await expect(rappel).toBeVisible();
      await finMouvements(page);
      const [texteRappel, fondRappel, rayonRappel] = await style(rappel, 'color', 'backgroundColor', 'borderTopLeftRadius');
      if (schema === 'light') {
        for (const [texte, fond, rayon, ou] of [[texteBas, fondBas, rayonBas, 'carte du bas'], [texteRappel, fondRappel, rayonRappel, 'écran 3']]) {
          expect([texte, fond], `${libelle}, ${ou}`).toEqual([NOIR, rgb(caseDe(libelle))]);
          expect(contraste(texte, fond), `${libelle}, ${ou}`).toBeGreaterThanOrEqual(4.5);
          expect(parseFloat(rayon), `${libelle}, ${ou} : une capsule`).toBeGreaterThan(8);
        }
      } else {
        // En sombre, la couleur de la case, éclaircie pour rester lisible (couleurLisible), sans fond : comme en v9.
        expect([texteBas, fondBas], `${libelle}, carte du bas`).toEqual([rgb(couleurLisible(caseDe(libelle))), TRANSPARENT]);
        expect([texteRappel, fondRappel], `${libelle}, écran 3`).toEqual([rgb(couleurLisible(caseDe(libelle))), TRANSPARENT]);
      }
      await terminer(vue).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
});

test('les 144 bulles gardent la couleur de leur case et leur texte noir, et les quatre de l\'écran 1 leurs couleurs, en clair comme en sombre', async ({ page }) => {
  const attendu = Object.fromEntries(MOTS_CARTE.map((m) => [m.libelle, rgb(couleurCase(m.col, m.rang))]));
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const faces = await bulles(vue).locator('.bulle-zone').evaluateAll((bs) => bs.map((b) => [getComputedStyle(b.querySelector('.face')).backgroundColor, getComputedStyle(b).color]));
    expect(faces, schema).toEqual([['rgb(254, 76, 64)', NOIR], ['rgb(255, 208, 76)', NOIR], ['rgb(120, 159, 255)', NOIR], ['rgb(76, 227, 155)', NOIR]]);
    await bulle(vue, 'bleu').click();
    await expect(carte(vue).getByRole('button')).toHaveCount(144);
    const vus = await carte(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => [b.textContent, getComputedStyle(b.querySelector('.demi.gauche')).backgroundColor,
      getComputedStyle(b.querySelector('.etiquette-mot')).color]));
    expect(vus).toHaveLength(144);
    for (const [nom, fond, texte] of vus) expect([fond, texte], `${schema} ${nom}`).toEqual([attendu[nom], NOIR]);
    await aller(page, '#/aujourdhui');
  }
});

test('en clair, un mot à soi sans couleur se lit en noir, sans capsule ; « Aucun mot » en gris, à 4,5:1 ; en sombre, blanc et gris comme avant', async ({ page }) => {
  const sansZone = 'roue:perso:u-5a6b7c8d';
  await page.evaluate((id) => window.__carnet.repo.meta.ecrire('motsPerso', { [id]: { libelle: 'Nuageux', zone: null, famille: null, definition: null,
    archive: true, createdAt: '2026-10-01T08:00:00.000Z' } }), sansZone);
  const soi = await creer(page, { date: '2026-10-15', heure: '18:00', emotion: sansZone, energie: 'energie:basse' });
  const ancien = await creer(page, { date: '2026-10-15', heure: '10:00', humeur: 6, energie: 'energie:moyenne' });
  await page.reload();
  await appPrete(page);
  const vue = vueMoment(page);
  for (const [schema, fond, texteSoi, gris] of [['light', FOND_CLAIR, NOIR, rgb(clair['text-2'])], ['dark', NOIR, BLANC, 'rgb(144, 144, 144)']]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, `#/moment/${soi}`);
    const nuageux = vue.getByRole('heading', { name: 'Nuageux', level: 1, exact: true });
    await expect(nuageux).toBeVisible();
    expect(await fondEcran(page)).toBe(fond);
    const [texte, sonFond] = await style(nuageux, 'color', 'backgroundColor');
    expect([texte, sonFond], schema).toEqual([texteSoi, TRANSPARENT]);
    expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
    await aller(page, '#/aujourdhui');
    await aller(page, `#/moment/${ancien}`);
    const aucun = vue.getByRole('heading', { name: 'Aucun mot', level: 1, exact: true });
    await expect(aucun).toBeVisible();
    const [c, f] = await style(aucun, 'color', 'backgroundColor');
    expect([c, f], schema).toEqual([gris, TRANSPARENT]);
    expect(contraste(c, fond), schema).toBeGreaterThanOrEqual(4.5);
    await aller(page, '#/aujourdhui');
  }
});

// Le thème change, écran ouvert (le réglage de l'iPhone qui bascule à la tombée du jour) : tout suit par le CSS seul, sans
// recharger ni réécrire les couleurs que l'écran pose (--c, --c-fill de la carte du bas ; --c-mot, --c-fill de l'écran 3).
test('bascule à chaud : le thème qui change, écran ouvert, change le fond, la carte du bas et le mot, sans recharger ni réécrire --c-mot', async ({ page }) => {
  const vue = await ouvrir(page);
  await noter(vue, 'jaune', 'Gai');
  await expect(carteDuBas(vue)).toBeVisible();
  await finMouvements(page);
  // Toute réécriture d'un attribut style de la carte du bas ou de l'écran 3, comptée.
  const surveiller = (sel) => page.locator(sel).evaluate((e) => {
    window.__reecritures = [];
    new MutationObserver((l) => window.__reecritures.push(...l.map((m) => m.attributeName))).observe(e, { attributes: true, attributeFilter: ['style'] });
  });
  await surveiller('.carte-du-bas');
  const styleBas = await carteDuBas(vue).getAttribute('style');
  const motBas = carteDuBas(vue).locator('.mot-carte-du-bas');
  const etats = [];
  for (const schema of ['dark', 'light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    etats.push([schema, await fondEcran(page), ...(await style(carteDuBas(vue), 'backgroundColor')), ...(await style(motBas, 'color', 'backgroundColor'))]);
  }
  expect(etats).toEqual([
    ['dark', NOIR, 'rgb(44, 44, 46)', rgb(couleurLisible(caseDe('Gai'))), TRANSPARENT],
    ['light', FOND_CLAIR, BLANC, NOIR, rgb(caseDe('Gai'))],
    ['dark', NOIR, 'rgb(44, 44, 46)', rgb(couleurLisible(caseDe('Gai'))), TRANSPARENT],
  ]);
  expect(await carteDuBas(vue).getAttribute('style')).toBe(styleBas);
  expect(await page.evaluate(() => window.__reecritures)).toEqual([]);

  // L'écran 3.
  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  await finMouvements(page);
  await surveiller('.ecran-faisais');
  const ecran3 = vue.locator('.ecran-faisais');
  const cMot = await ecran3.evaluate((e) => e.style.getPropertyValue('--c-mot'));
  expect(cMot).toBe(couleurLisible(caseDe('Gai')));
  const rappel = vue.getByRole('heading', { name: 'Gai', level: 1 });
  const vus = [];
  for (const schema of ['light', 'dark', 'light']) {
    await page.emulateMedia({ colorScheme: schema });
    vus.push([schema, await fondEcran(page), ...(await style(rappel, 'color', 'backgroundColor')), ...(await style(terminer(vue), 'backgroundColor'))]);
  }
  expect(vus).toEqual([
    ['light', FOND_CLAIR, NOIR, rgb(caseDe('Gai')), FONCE],
    ['dark', NOIR, rgb(couleurLisible(caseDe('Gai'))), TRANSPARENT, BLANC],
    ['light', FOND_CLAIR, NOIR, rgb(caseDe('Gai')), FONCE],
  ]);
  expect(await ecran3.evaluate((e) => e.style.getPropertyValue('--c-mot'))).toBe(cMot);
  expect(await page.evaluate(() => window.__reecritures)).toEqual([]);
  // Rien n'a rechargé la page : le relevé est celui du premier mot, et l'écran 3 est toujours là.
  await expect(page).toHaveURL(/#\/moment$/);
  await terminer(vue).click();
  expect(await page.evaluate(() => window.__carnet.repo.humeurs.tous().then((l) => l.map((h) => h.emotion)))).toEqual(['roue:joie:gai']);
});

// Au clavier : le contour du focus foncé sur le clair (3:1 au moins), blanc sur le noir, comme avant.
test('au clavier, le contour du focus d\'un bouton en verre et d\'une bulle de l\'écran 1 : foncé en clair, blanc en sombre, à 3:1 au moins sur le fond', async ({ page }) => {
  for (const [schema, attendu, fond] of [['light', FONCE, FOND_CLAIR], ['dark', BLANC, NOIR]]) {
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    await expect(bulles(vue)).not.toHaveAttribute('aria-disabled', 'true');
    // D'un bouton à l'autre (Option+Tab dans Safari), depuis le titre qui a le focus à l'ouverture, jusqu'à la bulle jaune et
    // à un bouton en verre (la page reprend au début après le dernier bouton).
    const vus = {};
    for (let i = 0; i < 16 && Object.keys(vus).length < 2; i++) {
      await page.keyboard.press('Alt+Tab');
      const actif = await page.evaluate(() => {
        const e = document.activeElement;
        const quoi = e.matches('.verre') ? 'verre' : e.getAttribute('aria-label') === 'Énergie haute, agréable' ? 'bulle' : null;
        const s = getComputedStyle(e);
        return quoi && [quoi, e.matches(':focus-visible'), s.outlineColor, s.outlineStyle];
      });
      if (actif) vus[actif[0]] = actif.slice(1);
    }
    expect(vus, schema).toEqual({ verre: [true, attendu, 'solid'], bulle: [true, attendu, 'solid'] });
    expect(contraste(attendu, fond)).toBeGreaterThanOrEqual(3);
    await aller(page, '#/aujourdhui');
  }
});
