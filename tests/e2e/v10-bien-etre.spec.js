import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { espionnerAudio, audio } from '../aides/audio.js';
import { installerParole, parole, seances, environ } from '../aides/lecteur.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

// v10 (7/9) · Bien-être par besoin (spec §7 et §14.4) : l'accueil (« Reprendre », « Favoris », cinq entrées, à des places fixes), la
// liste de chaque entrée (un bouton lecture et une épingle par ligne), ce que lance chaque élément et où il revient, le dernier
// élément retenu, les favoris et leur sauvegarde, le point de vigilance 4 (favori ou « Reprendre » inconnu), le point de vigilance 5
// (très grand texte), l'épingle sur chaque ligne du Programme, et un exercice du Programme lancé ailleurs, qui ne date rien.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const CLE = 'carnet:bien-etre:dernier';
// v11 (6/11) : Mes refuges, cinquième entrée, après le Programme (spec §8.4).
const NB_ENTREES = 5;
const LISTES = {
  calmer: ['Me calmer vite', ['Le soupir', 'Expiration longue', 'Ancrage court', 'Noter ce qui passe', 'Cohérence cardiaque', 'Minuteur silencieux']],
  dormir: ['Dormir ou me rendormir', ['Réveil la nuit', 'Expiration longue', 'Scan court', 'Sons de fond']],
  concentrer: ['Me concentrer', ['Minuteur de concentration', 'Sons de fond', 'Noter ce qui passe']],
};
const accueil = (page) => page.locator('main.bien-etre');
const liste = (page) => page.locator('main.entree-bien-etre');
const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const lancer = (zone, titre) => bouton(zone, `Commencer ${titre}`);
const epingle = (zone, titre) => bouton(zone, `Épingler ${titre}`);
// Le lien d'une ligne : ce qui ouvre son écran « avant ».
const lien = (zone, titre) => zone.getByRole('link', { name: new RegExp(`^${titre}`) });
const adresse = (page) => page.evaluate(() => location.hash);
const lireCle = (page) => page.evaluate((c) => localStorage.getItem(c), CLE);
const dernier = async (page) => JSON.parse(await lireCle(page));
const poser = (page, valeur) => page.evaluate(([c, v]) => localStorage.setItem(c, v), [CLE, valeur]);
const lireFavoris = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('favorisBienEtre'));
const ecrireFavoris = (page, v) => page.evaluate((x) => window.__carnet.repo.meta.ecrire('favorisBienEtre', x), v);
const reprendre = (page) => accueil(page).getByRole('region', { name: 'Reprendre' });
const favoris = (page) => accueil(page).getByRole('region', { name: 'Favoris' });
const entrees = (page) => accueil(page).getByRole('list', { name: 'Entrées' }).getByRole('link');
const fermerVers = async (page, v, cible) => {
  await bouton(v, 'Fermer').click();
  await expect.poll(() => adresse(page)).toBe(cible);
};
// Rien ne sort de l'écran par le côté, et aucun texte ne dépasse de son lien.
const rienNeDeborde = async (page) => {
  const fautes = await page.evaluate(() => {
    const largeur = document.documentElement.clientWidth;
    const f = [];
    if (document.documentElement.scrollWidth > largeur) f.push(`page : ${document.documentElement.scrollWidth}`);
    for (const b of document.querySelectorAll('main a, main button, main li, main section, main .exercice-titre, main .exercice-description, main .seance-faite, main .ligne-libelle')) {
      const r = b.getBoundingClientRect();
      if (r.width && (r.left < 0 || r.right > largeur)) f.push(`${b.tagName} ${b.textContent} : ${r.left} à ${r.right}`);
      if (b.scrollWidth > b.clientWidth + 1 && b.clientWidth > 0) f.push(`${b.tagName} ${b.textContent} : ${b.scrollWidth} dans ${b.clientWidth}`);
    }
    return f;
  });
  expect(fautes).toEqual([]);
};

// ---------- L'accueil ----------

test('l\'accueil plein : « Reprendre », « Favoris », les cinq entrées, la ligne fixe, l\'un sous l\'autre, à des places qui ne bougent pas avec les séances ; aucun chiffre', async ({ page }) => {
  await ecrireFavoris(page, ['soupir', 'sons-de-fond']);
  await poser(page, JSON.stringify('expiration-longue'));
  await aller(page, '#/bien-etre');
  await expect(reprendre(page).getByRole('heading', { name: 'Reprendre', level: 2 })).toBeVisible();
  await expect(reprendre(page).locator('.exercice-titre')).toHaveText('Expiration longue');
  await expect(lancer(reprendre(page), 'Expiration longue')).toBeVisible();
  await expect(favoris(page).getByRole('heading', { name: 'Favoris', level: 2 })).toBeVisible();
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Le soupir', 'Sons de fond']);
  await expect(favoris(page).getByRole('button')).toHaveCount(2);
  await expect(lancer(favoris(page), 'Sons de fond')).toBeVisible();
  // Sur l'accueil, on lance : l'épingle est dans les listes et sur l'écran de départ.
  await expect(accueil(page).locator('.epingle')).toHaveCount(0);
  await expect(entrees(page)).toHaveText(['Me calmer vite', 'Dormir ou me rendormir', 'Me concentrer', 'Programme', 'Mes refuges']);
  const cases = () => page.evaluate(() => [...document.querySelectorAll('main.bien-etre > *')].map((x) => { const r = x.getBoundingClientRect(); return [x.tagName, r.y, r.height]; }));
  const avant = await cases();
  expect(avant.map((x) => x[0])).toEqual(['HEADER', 'SECTION', 'SECTION', 'UL', 'P']);
  for (const [i, x] of avant.entries()) if (i) expect(x[1]).toBeGreaterThanOrEqual(avant[i - 1][1] + avant[i - 1][2]);
  const texte = await accueil(page).innerText();
  expect(texte).not.toMatch(/séance|aujourd'hui|déjà|fois|série|\d|%/i);
  // Cibles de 44 au moins, et le bouton rond de « Reprendre » (v12 : 52, la maquette ; 64 jusqu'à la v11).
  expect(Math.round((await lancer(reprendre(page), 'Expiration longue').boundingBox()).width)).toBe(52);
  for (const b of await accueil(page).locator('a, button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Des séances de toutes sortes, y compris de cet exercice, ne changent rien.
  await page.evaluate(async () => {
    for (const [date, exercice, fin, programme] of [['2026-10-15', 'expiration-longue', true, null], ['2026-10-14', 'soupir', true, null], ['2026-10-13', 'les-sons', true, 'les-sons'], ['2026-10-12', 'coherence', null, null]]) {
      await window.__carnet.repo.seances.creer({ date, heure: '10:00', exercice, dureeS: 300, origine: 'bien-etre', fin, programme });
    }
  });
  await page.reload();
  await appPrete(page);
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  expect(await cases()).toEqual(avant);
  expect(await accueil(page).innerText()).toBe(texte);
});

test('tant que les favoris ne sont pas lus, rien sous « Reprendre » : les cinq entrées arrivent ensemble, à leur place, sans sauter sous le doigt', async ({ page }) => {
  await ecrireFavoris(page, ['soupir', 'sons-de-fond']);
  await poser(page, JSON.stringify('expiration-longue'));
  await page.evaluate(() => {
    const meta = window.__carnet.repo.meta;
    const lire = meta.lire;
    const attente = new Promise((ok) => { window.__leverFavoris = ok; });
    meta.lire = (cle) => (cle === 'favorisBienEtre' ? attente.then(() => lire(cle)) : lire(cle));
  });
  await aller(page, '#/bien-etre');
  await expect(reprendre(page).locator('.exercice-titre')).toHaveText('Expiration longue');
  await page.clock.runFor(2000);
  await expect(favoris(page)).toHaveCount(0);
  await expect(accueil(page).locator('.entrees')).toHaveCount(0);
  await expect(accueil(page).locator('.ligne-fixe')).toHaveCount(0);
  const haut = (await reprendre(page).boundingBox()).y;
  // Chaque changement de l'écran note ce qu'il voit des entrées : aucune, ou les cinq, jamais une partie.
  await page.evaluate(() => {
    window.__vues = [];
    const ecran = document.querySelector('main.bien-etre');
    new MutationObserver(() => window.__vues.push(ecran.querySelectorAll('.entrees a').length)).observe(ecran, { childList: true, subtree: true });
    window.__leverFavoris();
  });
  await expect(entrees(page)).toHaveText(['Me calmer vite', 'Dormir ou me rendormir', 'Me concentrer', 'Programme', 'Mes refuges']);
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Le soupir', 'Sons de fond']);
  expect(await page.evaluate(() => [...new Set(window.__vues)])).toEqual([NB_ENTREES]);
  expect((await reprendre(page).boundingBox()).y).toBe(haut);
  const place = (await accueil(page).locator('.entrees').boundingBox()).y;
  expect(place).toBeGreaterThanOrEqual((await favoris(page).boundingBox()).y + (await favoris(page).boundingBox()).height);
  // À la même place que si la lecture n'avait pas tardé.
  await aller(page, '#/aujourdhui');
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  expect((await accueil(page).locator('.entrees').boundingBox()).y).toBe(place);
});

test('les cinq entrées s\'ouvrent ; chaque liste, dans son ordre, avec un bouton lecture et une épingle par ligne, ses durées, et sans Savourer ; « Retour » ramène à l\'accueil, onglet Bien-être allumé', async ({ page }) => {
  for (const [id, [titre, elements]] of Object.entries(LISTES)) {
    await aller(page, '#/bien-etre');
    await entrees(page).filter({ hasText: titre }).click();
    await expect.poll(() => adresse(page)).toBe(`#/bien-etre/${id}`);
    const l = liste(page);
    await expect(l.getByRole('heading', { name: titre, level: 1 })).toBeVisible();
    await expect(l.locator('.exercice-titre')).toHaveText(elements);
    for (const t of elements) {
      await expect(lancer(l, t)).toBeVisible();
      await expect(epingle(l, t)).toHaveAttribute('aria-pressed', 'false');
      for (const b of [lancer(l, t), epingle(l, t), lien(l, t)]) {
        const r = await b.boundingBox();
        expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.width).toBeGreaterThanOrEqual(44);
      }
    }
    await expect(l).not.toContainText('Savourer');
    await expect(l.locator('.ligne-fixe')).toHaveText('Tu peux t\'arrêter à tout moment.');
    await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  }
  // « Programme » ouvre l'écran du Programme.
  await entrees(page).filter({ hasText: 'Programme' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre/programme');
  await expect(page.locator('main.programme')).toBeVisible();
  // v11 : « Mes refuges » ouvre son écran ; « Retour » ramène à l'accueil, onglet Bien-être allumé.
  await aller(page, '#/bien-etre');
  await entrees(page).filter({ hasText: 'Mes refuges' }).click();
  await expect.poll(() => adresse(page)).toBe('#/refuges');
  await expect(page.getByRole('heading', { name: 'Mes refuges', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  // La durée sur la ligne : celle que le lecteur jouera.
  await aller(page, '#/bien-etre/calmer');
  await expect(lien(liste(page), 'Le soupir').locator('.exercice-description')).toHaveText(/^3\smin\s·\slà où tu es$/);
  await expect(lien(liste(page), 'Cohérence cardiaque').locator('.exercice-description')).toBeVisible();
  await page.evaluate(() => { localStorage.setItem('carnet:duree:soupir', '5'); localStorage.setItem('carnet:duree:ancrage-court', '5'); });
  await aller(page, '#/bien-etre/dormir');
  await aller(page, '#/bien-etre/calmer');
  await expect(lien(liste(page), 'Le soupir').locator('.exercice-description')).toHaveText(/^5\smin\s·\slà où tu es$/);
  // Une durée fixe ne change pas, même avec une clé qui traîne.
  await expect(lien(liste(page), 'Ancrage court').locator('.exercice-description')).toHaveText(/^2\smin\s·\slà où tu es$/);
});

// ---------- Ce qui se lance, et où on revient ----------

test('le bouton lecture d\'un exercice démarre d\'un toucher, à la durée retenue, le son né dans ce toucher ; le lecteur revient à l\'entrée ; aucune `programme` dans la séance', async ({ page }) => {
  await espionnerAudio(page);
  await page.evaluate(() => localStorage.setItem('carnet:duree:soupir', '1'));
  await aller(page, '#/bien-etre/calmer');
  expect((await audio(page)).contextes).toBe(0);
  await lancer(liste(page), 'Le soupir').click();
  await expect.poll(() => adresse(page)).toBe('#/exercice/soupir');
  const v = vue(page, 'Le soupir');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(bouton(v, 'Commencer')).toHaveCount(0);
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste (1:00|0:59)$/);
  expect((await audio(page)).contextes).toBe(1);
  // Le comportement du lecteur de Bien-être : le compte à rebours, puis « Noter mon émotion ».
  expect(await dernier(page)).toBe('soupir');
  await page.clock.runFor(61000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'soupir', origine: 'bien-etre', fin: true, programme: null });
  await page.clock.runFor(6200);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre/calmer');
  await expect(page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
});

test('le reste de la ligne ouvre l\'écran « avant » : il attend « Commencer », rien n\'est retenu tant qu\'il n\'a pas commencé ; « Fermer » revient à l\'entrée', async ({ page }) => {
  await espionnerAudio(page);
  await aller(page, '#/bien-etre/dormir');
  await lien(liste(page), 'Expiration longue').click();
  await expect.poll(() => adresse(page)).toBe('#/exercice/expiration-longue');
  let v = vue(page, 'Expiration longue');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(v.getByRole('group', { name: 'Durée' })).toBeVisible();
  await page.clock.runFor(4000);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  expect((await audio(page)).contextes).toBe(0);
  expect(await lireCle(page)).toBeNull();
  await fermerVers(page, v, '#/bien-etre/dormir');
  // « Commencer » retient l'exercice, et revient au même endroit.
  await lien(liste(page), 'Scan court').click();
  v = vue(page, 'Scan court');
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Pause')).toBeVisible();
  expect(await dernier(page)).toBe('scan-court');
  await fermerVers(page, v, '#/bien-etre/dormir');
});

test('la cohérence cardiaque : le bouton lecture démarre, aux réglages de Moment difficile ; le reste de la ligne ouvre l\'écran « avant », où se règlent sa durée et son rythme', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('respiration', { duree: 2, rythme: '4-6', son: false }));
  await aller(page, '#/bien-etre/calmer');
  await lancer(liste(page), 'Cohérence cardiaque').click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre/coherence');
  let v = vue(page, 'Cohérence cardiaque');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste (2:00|1:59)$/);
  expect(await dernier(page)).toBe('coherence');
  await fermerVers(page, v, '#/bien-etre/calmer');
  await lien(liste(page), 'Cohérence cardiaque').click();
  v = vue(page, 'Cohérence cardiaque');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(v.locator('.lecteur-duree')).toHaveText(/^2\smin\s·\sassis$/);
  await v.getByRole('combobox', { name: 'Durée', exact: true }).selectOption('5');
  await v.getByRole('combobox', { name: 'Rythme', exact: true }).selectOption('5-5');
  await expect(v.locator('.lecteur-duree')).toHaveText(/^5\smin\s·\sassis$/);
  // Le même réglage que Moment difficile ; le signal sonore n'a pas bougé.
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.meta.lire('respiration'))).toMatchObject({ duree: 5, rythme: '5-5', son: false });
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste (5:00|4:59)$/);
  await expect(v.getByRole('combobox')).toHaveCount(0);
  await fermerVers(page, v, '#/bien-etre/calmer');
});

test('les minuteurs et les sons : le bouton lecture et le reste de la ligne ouvrent leur écran, qui attend son « Commencer » et revient à l\'entrée ; l\'élément est retenu ; les sons rouvrent avec le dernier son', async ({ page }) => {
  await espionnerAudio(page);
  await page.evaluate(() => localStorage.setItem('carnet:sons', JSON.stringify({ son: 'pluie', minuterie: 60, volume: 0.5 })));
  for (const [entree, titre, hash, id] of [['calmer', 'Minuteur silencieux', '#/minuteur', 'minuteur'], ['concentrer', 'Minuteur de concentration', '#/concentration', 'concentration'], ['dormir', 'Sons de fond', '#/sons', 'sons-de-fond']]) {
    for (const cible of [lancer, lien]) {
      await page.evaluate((c) => localStorage.removeItem(c), CLE);
      await aller(page, `#/bien-etre/${entree}`);
      await cible(liste(page), titre).click();
      await expect.poll(() => adresse(page)).toBe(hash);
      const v = vue(page, titre);
      await expect(bouton(v, 'Commencer')).toBeVisible();
      expect((await audio(page)).contextes).toBe(0);
      expect(await dernier(page)).toBe(id);
      await fermerVers(page, v, `#/bien-etre/${entree}`);
    }
  }
  // « Reprendre » rouvre les sons, avec ce qui était choisi ; ils attendent toujours leur « Commencer » ; retour à l'accueil.
  await aller(page, '#/bien-etre');
  await expect(reprendre(page).locator('.exercice-titre')).toHaveText('Sons de fond');
  await lancer(reprendre(page), 'Sons de fond').click();
  const v = vue(page, 'Sons de fond');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(v.getByRole('button', { name: 'Son : Pluie douce' })).toHaveAttribute('aria-pressed', 'true');
  await expect(v.getByRole('button', { name: 'Minuterie : 60 min' })).toHaveAttribute('aria-pressed', 'true');
  expect((await audio(page)).contextes).toBe(0);
  await fermerVers(page, v, '#/bien-etre');
});

test('« Réveil la nuit » depuis « Dormir ou me rendormir » : le lecteur de Bien-être, sur fond noir, avec son compte à rebours et ses réglages', async ({ page }) => {
  await aller(page, '#/bien-etre/dormir');
  await lien(liste(page), 'Réveil la nuit').click();
  const v = vue(page, 'Réveil la nuit');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(epingle(v, 'Réveil la nuit')).toBeVisible();
  await expect(v.getByRole('list', { name: 'Réglages du lecteur' }).getByText('Jouer même en mode silencieux')).toBeVisible();
  // Ce chemin-ci sonne, au contraire de Moment difficile : Repères + souffle au départ (docs/recette-iphone.md).
  await expect(v.getByRole('list', { name: 'Réglages du lecteur' }).getByRole('combobox', { name: 'Son', exact: true })).toHaveValue('souffle');
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste /);
  expect(await page.locator('.parcours').evaluate((x) => getComputedStyle(x).backgroundColor)).toBe('rgb(0, 0, 0)');
  await fermerVers(page, v, '#/bien-etre/dormir');
});

// ---------- « Reprendre » ----------

test('« Reprendre » : absent, puis le dernier élément lancé, même arrêté avant 60 s ; il relance depuis le début et revient à l\'accueil ; sans date ni « déjà fait »', async ({ page }) => {
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  await expect(reprendre(page)).toHaveCount(0);
  await aller(page, '#/bien-etre/calmer');
  await lancer(liste(page), 'Ancrage court').click();
  let v = vue(page, 'Ancrage court');
  const premiere = v.locator('.lecteur-consigne');
  await expect(premiere).toBeVisible();
  const debut = await premiere.innerText();
  // Plus loin dans l'exercice, puis quitté avant 60 s : aucune séance, mais il est retenu.
  await bouton(v, 'Suivant').click();
  await expect(premiere).not.toHaveText(debut);
  await page.clock.runFor(10000);
  await fermerVers(page, v, '#/bien-etre/calmer');
  expect(await seances(page)).toEqual([]);
  await aller(page, '#/bien-etre');
  const carte = reprendre(page);
  await expect(carte.locator('.exercice-titre')).toHaveText('Ancrage court');
  await expect(carte).not.toContainText(/\d|déjà|hier|il y a|fait/i);
  // Le bouton relance depuis le début, dans le lecteur, et le lecteur revient à l'accueil.
  await lancer(carte, 'Ancrage court').click();
  await expect.poll(() => adresse(page)).toBe('#/exercice/ancrage-court');
  v = vue(page, 'Ancrage court');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(v.locator('.lecteur-consigne')).toHaveText(debut);
  await expect(bouton(v, 'Précédent')).toBeDisabled();
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste (2:00|1:59)$/);
  await fermerVers(page, v, '#/bien-etre');
  // Le lien de la carte ouvre l'écran « avant ».
  await reprendre(page).getByRole('link').click();
  v = vue(page, 'Ancrage court');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await fermerVers(page, v, '#/bien-etre');
});

test('« Reprendre » retient ce qui est lancé depuis les entrées, les favoris, « Reprendre » et le Programme, mais pas Moment difficile', async ({ page }) => {
  await ecrireFavoris(page, ['savourer']);
  // Un favori.
  await aller(page, '#/bien-etre');
  await lancer(favoris(page), 'Savourer').click();
  await expect(bouton(vue(page, 'Savourer'), 'Pause')).toBeVisible();
  expect(await dernier(page)).toBe('savourer');
  await fermerVers(page, vue(page, 'Savourer'), '#/bien-etre');
  await expect(reprendre(page).locator('.exercice-titre')).toHaveText('Savourer');
  // Une séance du Programme : à « Commencer ». Un simple coup d'œil ne compte pas.
  await aller(page, '#/bien-etre/programme');
  await page.locator('main.programme').getByRole('link', { name: /^Les sons/ }).click();
  const p = vue(page, 'Les sons');
  await expect(bouton(p, 'Commencer')).toBeVisible();
  expect(await dernier(page)).toBe('savourer');
  await bouton(p, 'Commencer').click();
  await expect(bouton(p, 'Pause')).toBeVisible();
  expect(await dernier(page)).toBe('les-sons');
  await fermerVers(page, p, '#/bien-etre/programme');
  // Moment difficile : ni un exercice court, ni la respiration.
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await bouton(md, 'Panique').click();
  await expect(bouton(vue(page, 'Panique'), 'Pause')).toBeVisible();
  await fermerVers(page, vue(page, 'Panique'), '#/moment-difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await md.getByRole('button', { name: 'Arrêter' }).click();
  expect(await dernier(page)).toBe('les-sons');
  await aller(page, '#/bien-etre');
  await expect(reprendre(page).locator('.exercice-titre')).toHaveText('Les sons');
});

test('relancer le même élément n\'écrit rien : la clé n\'est écrite que si la valeur change', async ({ page }) => {
  await page.evaluate((cle) => {
    window.__ecritures = [];
    const ecrire = Storage.prototype.setItem;
    Storage.prototype.setItem = function (c, v) { if (c === cle) window.__ecritures.push(v); return ecrire.call(this, c, v); };
  }, CLE);
  const ecritures = () => page.evaluate(() => window.__ecritures);
  await aller(page, '#/bien-etre/calmer');
  // Le premier lancement écrit ; le même, relancé depuis sa ligne puis depuis « Reprendre », non.
  await lancer(liste(page), 'Le soupir').click();
  await expect(bouton(vue(page, 'Le soupir'), 'Pause')).toBeVisible();
  expect(await ecritures()).toEqual(['"soupir"']);
  await fermerVers(page, vue(page, 'Le soupir'), '#/bien-etre/calmer');
  await lancer(liste(page), 'Le soupir').click();
  await expect(bouton(vue(page, 'Le soupir'), 'Pause')).toBeVisible();
  await fermerVers(page, vue(page, 'Le soupir'), '#/bien-etre/calmer');
  await aller(page, '#/bien-etre');
  await lancer(reprendre(page), 'Le soupir').click();
  await expect(bouton(vue(page, 'Le soupir'), 'Pause')).toBeVisible();
  await fermerVers(page, vue(page, 'Le soupir'), '#/bien-etre');
  expect(await ecritures()).toEqual(['"soupir"']);
  // Un minuteur, retenu au toucher sur sa ligne : une écriture, deux touchers.
  await aller(page, '#/bien-etre/calmer');
  for (const cible of [lancer, lien]) {
    await cible(liste(page), 'Minuteur silencieux').click();
    await fermerVers(page, vue(page, 'Minuteur silencieux'), '#/bien-etre/calmer');
  }
  expect(await ecritures()).toEqual(['"soupir"', '"minuteur"']);
  // Un autre élément réécrit, et la valeur retenue est bien la dernière.
  await lancer(liste(page), 'Le soupir').click();
  await expect(bouton(vue(page, 'Le soupir'), 'Pause')).toBeVisible();
  expect(await ecritures()).toEqual(['"soupir"', '"minuteur"', '"soupir"']);
  expect(await dernier(page)).toBe('soupir');
});

// ---------- Les favoris ----------

test('épingler deux éléments depuis une entrée, puis un depuis le lecteur : l\'ordre est gardé ; désépingler ; rien d\'écrit comme saisie ; la région disparaît', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('derniereEcriture', 'marque'));
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  await expect(favoris(page)).toHaveCount(0);
  await aller(page, '#/bien-etre/dormir');
  await epingle(liste(page), 'Sons de fond').click();
  await expect(epingle(liste(page), 'Sons de fond')).toHaveAttribute('aria-pressed', 'true');
  await epingle(liste(page), 'Réveil la nuit').click();
  await expect(epingle(liste(page), 'Réveil la nuit')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lireFavoris(page)).toEqual(['sons-de-fond', 'reveil-nuit']);
  // Un exercice qui n'est dans aucune entrée : depuis son écran « avant ».
  await aller(page, '#/exercice/savourer');
  await epingle(vue(page, 'Savourer'), 'Savourer').click();
  await expect.poll(() => lireFavoris(page)).toEqual(['sons-de-fond', 'reveil-nuit', 'savourer']);
  // Même épinglé ailleurs, il l'est partout où il paraît.
  await aller(page, '#/bien-etre/concentrer');
  await expect(epingle(liste(page), 'Sons de fond')).toHaveAttribute('aria-pressed', 'true');
  await expect(epingle(liste(page), 'Minuteur de concentration')).toHaveAttribute('aria-pressed', 'false');
  await aller(page, '#/bien-etre');
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Sons de fond', 'Réveil la nuit', 'Savourer']);
  // Le lien d'un favori ouvre son écran « avant » : l'épingle y est, même pour Savourer ; retour à l'accueil, une ligne de moins.
  await lien(favoris(page), 'Savourer').click();
  const v = vue(page, 'Savourer');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await epingle(v, 'Savourer').click();
  await expect.poll(() => lireFavoris(page)).toEqual(['sons-de-fond', 'reveil-nuit']);
  await fermerVers(page, v, '#/bien-etre');
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Sons de fond', 'Réveil la nuit']);
  // Désépingler le reste, depuis une entrée : plus de région.
  await aller(page, '#/bien-etre/dormir');
  await epingle(liste(page), 'Sons de fond').click();
  await epingle(liste(page), 'Réveil la nuit').click();
  await expect.poll(() => lireFavoris(page)).toEqual([]);
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  await expect(favoris(page)).toHaveCount(0);
  // Une épingle n'est pas une saisie ; aucun élément n'a été lancé.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('derniereEcriture'))).toBe('marque');
  expect(await lireCle(page)).toBeNull();
  await expect(reprendre(page)).toHaveCount(0);
});

test('les favoris vont dans la sauvegarde et reviennent à l\'import ; « Reprendre » reste sur l\'appareil', async ({ page }) => {
  await aller(page, '#/bien-etre/calmer');
  await epingle(liste(page), 'Noter ce qui passe').click();
  await epingle(liste(page), 'Minuteur silencieux').click();
  await expect.poll(() => lireFavoris(page)).toEqual(['noting', 'minuteur']);
  await poser(page, JSON.stringify('noting'));
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  const [f] = await fichiersPartages(page);
  const contenu = JSON.parse(Buffer.from(f.octets).toString('utf8'));
  expect(contenu.data.meta.find((m) => m.cle === 'favorisBienEtre')).toEqual({ cle: 'favorisBienEtre', valeur: ['noting', 'minuteur'] });
  expect(JSON.stringify(contenu)).not.toContain(CLE);
  // Ici, un autre favori : l'aperçu l'annonce, l'import remet ceux du fichier, dans leur ordre.
  await ecrireFavoris(page, ['savourer']);
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText('Les exercices épinglés seront remplacés par ce que contient le fichier.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await aller(page, '#/bien-etre');
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Noter ce qui passe', 'Minuteur silencieux']);
});

test('point de vigilance 4 : un favori inconnu, des doublons, une méta ou une clé abîmées sont ignorés, sans erreur ni ligne vide', async ({ page }) => {
  // Un mélange : seuls les connus restent, dans leur ordre.
  await ecrireFavoris(page, ['retiré-depuis', 'soupir', 3, null, 'soupir', { a: 1 }, 'toString', 'sons-de-fond']);
  await poser(page, JSON.stringify('retiré-depuis'));
  await aller(page, '#/bien-etre');
  await expect(entrees(page)).toHaveCount(NB_ENTREES);
  await expect(reprendre(page)).toHaveCount(0);
  await expect(favoris(page).getByRole('listitem')).toHaveCount(2);
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Le soupir', 'Sons de fond']);
  // Rien que de l'inconnu, ou pas une liste : pas de région du tout. Une clé qui n'est pas un identifiant : pas de carte.
  for (const [meta, cle] of [
    [['retiré-depuis', 'autre'], JSON.stringify(42)],
    ['abîmée', '"pas du JSON'],
    [{ soupir: true }, JSON.stringify({ id: 'soupir' })],
    [[], JSON.stringify('toString')],
    [null, JSON.stringify(['soupir'])],
    [null, 'null'],
  ]) {
    await ecrireFavoris(page, meta);
    await poser(page, cle);
    await aller(page, '#/aujourdhui');
    await aller(page, '#/bien-etre');
    await expect(entrees(page)).toHaveCount(NB_ENTREES);
    await expect(reprendre(page)).toHaveCount(0);
    await expect(favoris(page)).toHaveCount(0);
    await expect(accueil(page).locator('.ligne-element')).toHaveCount(0);
    // La clé abîmée n'est pas réécrite pour rien.
    expect(await lireCle(page)).toBe(cle);
  }
  // Et la clé se répare d'elle-même au prochain lancement.
  await aller(page, '#/bien-etre/calmer');
  await lancer(liste(page), 'Le soupir').click();
  await expect(bouton(vue(page, 'Le soupir'), 'Pause')).toBeVisible();
  expect(await dernier(page)).toBe('soupir');
});

// ---------- Le Programme ----------

test('l\'épingle sur chaque ligne du Programme (spec §14.4) : à côté du lien, un toucher n\'ouvre rien ; épingler et désépingler, l\'ordre gardé dans la méta ; « Faite le », le lien et la présentation ne bougent pas ; aucun bouton lecture', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.seances.creer({ date: '2026-10-12', heure: '10:00', exercice: 'les-sons', origine: 'bien-etre', dureeS: 300, fin: true, programme: 'les-sons' });
    await r.meta.ecrire('derniereEcriture', 'marque');
  });
  await aller(page, '#/bien-etre/programme');
  const ecran = page.locator('main.programme');
  await expect(ecran.locator('.epingle')).toHaveCount(17);
  await expect(ecran.locator('.ligne-seance')).toHaveCount(17);
  // Rien d'autre sur la ligne : l'épingle hors du lien, pas de bouton lecture ; cibles de 44, chacune à droite de son lien.
  await expect(ecran.locator('a .epingle, a button')).toHaveCount(0);
  await expect(ecran.locator('.bouton-lecture')).toHaveCount(0);
  await expect(ecran.getByRole('link')).toHaveCount(17);
  await expect(ecran.locator('.presentation-programme')).toContainText('Inspiré de la sophrologie');
  const titres = await ecran.locator('.exercice-titre').allInnerTexts();
  expect(titres).toHaveLength(17);
  for (const t of titres) {
    const b = epingle(ecran, t);
    await expect(b).toHaveAttribute('aria-pressed', 'false');
    const [r, l] = await Promise.all([b.boundingBox(), lien(ecran, t).boundingBox()]);
    expect(r.width).toBeGreaterThanOrEqual(44);
    expect(r.height).toBeGreaterThanOrEqual(44);
    expect(l.x + l.width).toBeLessThanOrEqual(r.x);
    expect(Math.abs((l.y + l.height / 2) - (r.y + r.height / 2))).toBeLessThan(2);
  }
  // Une séance d'avant, la cohérence, celle du bout : dans l'ordre des touchers, pas dans celui du Programme. Aucun écran ne s'ouvre.
  for (const t of ['Scan corporel', 'Cohérence cardiaque', 'Les sons']) {
    await epingle(ecran, t).click();
    await expect(epingle(ecran, t)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect.poll(() => lireFavoris(page)).toEqual(['scan-corporel', 'coherence', 'les-sons']);
  expect(await adresse(page)).toBe('#/bien-etre/programme');
  // « Faite le » est resté, et le lien ouvre toujours l'écran « avant » de la séance, épingle allumée.
  await expect(lien(ecran, 'Les sons').locator('.seance-faite')).toHaveText('Faite le 12/10');
  await expect(ecran.locator('.seance-faite')).toHaveCount(1);
  await lien(ecran, 'Les sons').click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre/programme/les-sons');
  const v = vue(page, 'Les sons');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(epingle(v, 'Les sons')).toHaveAttribute('aria-pressed', 'true');
  await fermerVers(page, v, '#/bien-etre/programme');
  // L'accueil les montre dans cet ordre, et l'écran s'en souvient.
  await aller(page, '#/bien-etre');
  await expect(favoris(page).locator('.exercice-titre')).toHaveText(['Scan corporel', 'Cohérence cardiaque', 'Les sons']);
  await page.reload();
  await appPrete(page);
  await aller(page, '#/bien-etre/programme');
  await expect(epingle(ecran, 'Cohérence cardiaque')).toHaveAttribute('aria-pressed', 'true');
  await expect(ecran.locator('.epingle[aria-pressed="true"]')).toHaveCount(3);
  // Désépingler celle du milieu ne change pas l'ordre des autres.
  await epingle(ecran, 'Cohérence cardiaque').click();
  await expect(epingle(ecran, 'Cohérence cardiaque')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lireFavoris(page)).toEqual(['scan-corporel', 'les-sons']);
  // Une épingle n'est ni une saisie, ni un lancement.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('derniereEcriture'))).toBe('marque');
  expect(await lireCle(page)).toBeNull();
});

test('un exercice du Programme lancé en favori puis mené au bout : « Faite le » du Programme ne change pas, et la séance n\'a pas de `programme`', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-10-12', heure: '10:00', exercice: 'pause-une-minute', origine: 'bien-etre', dureeS: 60, fin: true, programme: 'pause-une-minute' }));
  // Épinglé depuis l'écran « avant » de la séance du Programme.
  await aller(page, '#/bien-etre/programme');
  await page.locator('main.programme').getByRole('link', { name: /^Pause d'une minute/ }).click();
  await epingle(vue(page, 'Pause d\'une minute'), 'Pause d\'une minute').click();
  await expect.poll(() => lireFavoris(page)).toEqual(['pause-une-minute']);
  await fermerVers(page, vue(page, 'Pause d\'une minute'), '#/bien-etre/programme');
  // Lancé en favori : #/exercice/, pas l'adresse du Programme ; mené au bout ; retour à l'accueil.
  await aller(page, '#/bien-etre');
  await lancer(favoris(page), 'Pause d\'une minute').click();
  await expect.poll(() => adresse(page)).toBe('#/exercice/pause-une-minute');
  const v = vue(page, 'Pause d\'une minute');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await page.clock.runFor(60500);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).length).toBe(2);
  const s = (await seances(page)).find((x) => x.date === '2026-10-15');
  expect(s).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre', fin: true, programme: null });
  environ(s.dureeS, 60);
  await page.clock.runFor(6200);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await aller(page, '#/bien-etre/programme');
  await expect(page.locator('main.programme').getByRole('link', { name: /^Pause d'une minute/ }).locator('.seance-faite')).toHaveText('Faite le 12/10');
  await expect(page.locator('main.programme .seance-faite')).toHaveCount(1);
  // Par « Reprendre », non plus.
  await aller(page, '#/bien-etre');
  await lancer(reprendre(page), 'Pause d\'une minute').click();
  await expect.poll(() => adresse(page)).toBe('#/exercice/pause-une-minute');
  await page.clock.runFor(60500);
  await expect.poll(async () => (await seances(page)).length).toBe(3);
  await aller(page, '#/bien-etre/programme');
  await expect(page.locator('main.programme').getByRole('link', { name: /^Pause d'une minute/ }).locator('.seance-faite')).toHaveText('Faite le 12/10');
});

test('la voix est préparée dans le toucher du bouton lecture, quand elle est allumée', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await aller(page, '#/bien-etre/calmer');
  await lancer(liste(page), 'Ancrage court').click();
  await expect(bouton(vue(page, 'Ancrage court'), 'Pause')).toBeVisible();
  expect((await parole(page)).amorces).toBe(1);
});

// ---------- Très grand texte ----------

test('point de vigilance 5, très grand texte : l\'accueil, les listes et le Programme tiennent sans débordement de côté ; à 53 px, les boutons passent sous leur lien', async ({ page }) => {
  test.setTimeout(90000);
  await ecrireFavoris(page, ['minuteur', 'concentration', 'ancrage-54321', 'cinq-zones']);
  await poser(page, JSON.stringify('concentration'));
  await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-10-12', heure: '10:00', exercice: 'tension-detente', origine: 'bien-etre', dureeS: 300, fin: true, programme: 'tension-detente' }));
  // Sous son lien : le haut du bouton sous le bas du lien.
  const dessous = async (l, b) => {
    const [x, y] = await Promise.all([l.boundingBox(), b.boundingBox()]);
    expect(y.y).toBeGreaterThanOrEqual(x.y + x.height);
  };
  for (const taille of [17, 19, 21, 23, 28, 33, 40, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    await aller(page, '#/bien-etre');
    await expect(entrees(page)).toHaveCount(NB_ENTREES);
    await expect(favoris(page).getByRole('listitem')).toHaveCount(4);
    await rienNeDeborde(page);
    if (taille === 53) await dessous(reprendre(page).locator('.lien-reprendre'), lancer(reprendre(page), 'Minuteur de concentration'));
    for (const id of Object.keys(LISTES)) {
      await aller(page, `#/bien-etre/${id}`);
      await expect(liste(page).getByRole('listitem')).toHaveCount(LISTES[id][1].length);
      await rienNeDeborde(page);
      // Le bouton lecture et l'épingle restent des cibles de 44, à leur place.
      for (const b of await liste(page).locator('.bouton-lecture, .epingle').all()) {
        const r = await b.boundingBox();
        expect(r.width).toBeGreaterThanOrEqual(44);
        expect(r.height).toBeGreaterThanOrEqual(44);
      }
      if (taille === 53) for (const t of LISTES[id][1]) await dessous(lien(liste(page), t), lancer(liste(page), t));
    }
    // Le Programme : ses 17 lignes, une séance faite comprise, et leurs épingles.
    await aller(page, '#/bien-etre/programme');
    const ecran = page.locator('main.programme');
    await expect(ecran.locator('.epingle')).toHaveCount(17);
    await expect(ecran.locator('.seance-faite')).toHaveCount(1);
    await rienNeDeborde(page);
    for (const b of await ecran.locator('.epingle').all()) {
      const r = await b.boundingBox();
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    }
    if (taille === 53) for (const t of await ecran.locator('.exercice-titre').allInnerTexts()) await dessous(lien(ecran, t), epingle(ecran, t));
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  // Au texte par défaut : la ligne garde le titre, l'épingle et le bouton côte à côte.
  await aller(page, '#/bien-etre/calmer');
  const l = lien(liste(page), 'Noter ce qui passe');
  await expect(l).toBeVisible();
  const [a, b, c] = await Promise.all([l.boundingBox(), epingle(liste(page), 'Noter ce qui passe').boundingBox(), lancer(liste(page), 'Noter ce qui passe').boundingBox()]);
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
  expect(b.x + b.width).toBeLessThanOrEqual(c.x);
  expect(Math.abs((a.y + a.height / 2) - (c.y + c.height / 2))).toBeLessThan(2);
});
