import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { espionnerAudio, audio } from '../aides/audio.js';
import { installerParole, parole, seances, cacher, montrer, bols } from '../aides/lecteur.js';
import { contraste } from '../aides/couleurs.js';
import {
  vueMoment, bulle, noter, toucherMot, finMouvements, continuer, fermer, terminer, faisais, activite, changerMot, loupe, champLoupe, trouve, NOTEE,
} from '../aides/emotion.js';

// v10 (8/9) · « Pour ce moment : » après une émotion (spec §8 et §14.4) : sur l'écran 3 d'un relevé neuf dont le mot a une zone,
// après « Ce que je faisais », les exercices de la table de sa zone (domain/propositions.js). Un toucher : son et voix préparés
// dans le toucher, l'écriture finie, puis le lecteur de Bien-être, qui revient à Aujourd'hui, sans le message « notée ». Point de
// vigilance 2 (exercice touché avant la fin de la file d'écriture) et point de vigilance 5 (très grand texte).
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const TABLE = [
  ['rouge', 'Irrité', ['Le soupir', 'Ancrage court', 'Expiration longue']],
  ['jaune', 'Curieux', ['Savourer', 'Noter ce qui passe']],
  ['bleu', 'Vide', ['Scan court', 'Expiration longue', 'Noter ce qui passe']],
  ['vert', 'Calme', ['Savourer', 'Expiration longue']],
];
const DERNIER = 'carnet:bien-etre:dernier';
const lireDernier = (page) => page.evaluate((c) => localStorage.getItem(c), DERNIER);
const releves = (page) => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const adresse = (page) => page.evaluate(() => location.hash);
// Le titre porte une espace insécable avant le deux-points.
const section = (vue) => vue.getByRole('region', { name: /^Pour ce moment\s:$/ });
const exercice = (vue, titre) => section(vue).getByRole('button', { name: titre, exact: true });
const lecteur = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const ligneReleve = (page, texte) => page.locator('.liste-evenements a.releve').filter({ hasText: texte });
const creer = (page, h) => page.evaluate((x) => window.__carnet.repo.humeurs.creer(x).then((r) => r.id), h);
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
// Un mot noté, puis la flèche : l'écran 3, sa garde passée.
const ecran3 = async (page, zone, libelle) => {
  const vue = await ouvrir(page);
  await noter(vue, zone, libelle);
  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  await expect(terminer(vue)).not.toHaveAttribute('aria-disabled', 'true');
  return vue;
};
// L'horloge factice s'arrête : plus rien n'avance que par runFor, et une écriture ralentie reste en cours.
const figer = async (page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
// Chaque modification du relevé met ce temps-là (sur l'horloge de la page) à s'écrire : la file d'écriture reste en cours.
const ralentirEcritures = (page, ms) => page.evaluate((d) => {
  const { humeurs } = window.__carnet.repo;
  const modifier = humeurs.modifier;
  humeurs.modifier = (...a) => new Promise((ok) => { setTimeout(ok, d); }).then(() => modifier.apply(humeurs, a));
}, ms);
// Un toucher au doigt, à l'écran (sans les attentes de Playwright, qui veulent des images : l'horloge est arrêtée).
const toucher = async (page, cible) => {
  const b = await cible.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
};
// « Jouer même en mode silencieux » : la session demandée met la musique en pause, tant qu'elle n'est pas rendue.
const avecSessionForte = async (page) => {
  await espionnerAudio(page, { session: true });
  await page.evaluate(() => localStorage.setItem('carnet:lecteur:silencieux', 'true'));
};
// Le lecteur attend « Commencer » : le son préparé dans le toucher se rend ; rien ne joue, et rien n'en retient la musique.
const sonRendu = async (page) => {
  await expect.poll(async () => (await audio(page)).session).toBe('auto');
  expect(await audio(page)).toMatchObject({ contextes: 1, suspensions: 1, etat: 'suspended', notes: [] });
};
// « Commencer », touché : la session demandée revient, et le bol de début sonne.
const commencerAvecSon = async (page, l) => {
  await bouton(l, 'Commencer').click();
  await expect(bouton(l, 'Pause')).toBeVisible();
  expect((await audio(page)).session).toBe('playback');
  await expect.poll(async () => (await bols(page)).length).toBe(1);
};

// ---------- La section ----------

test('chaque zone : « Pour ce moment : » après « Ce que je faisais », les exercices de la table, dans son ordre ; rien aux écrans 1 et 2 ; le focus reste sur le mot ; « Terminer » ne retient rien', async ({ page }) => {
  test.setTimeout(60000);
  for (const [zone, libelle, titres] of TABLE) {
    const vue = await ouvrir(page);
    await expect(section(vue)).toHaveCount(0);
    await noter(vue, zone, libelle);
    await expect(section(vue), 'écran 2').toHaveCount(0);
    await continuer(vue).click();
    await expect(section(vue).getByRole('button'), libelle).toHaveText(titres);
    await expect(vue.getByRole('heading', { level: 2 }), libelle).toHaveText(['Ce que je faisais', /^Pour ce moment\s:$/]);
    await expect(section(vue)).toHaveText(new RegExp(`^Pour ce moment\\s:\\s*${titres.join('\\s*')}$`));
    // Rien ne vient chercher l'attention : le focus est sur le mot en rappel.
    await expect(vue.getByRole('heading', { name: libelle, level: 1, exact: true })).toBeFocused();
    // Dans le corps qui défile, après les activités, au-dessus de « Terminer ».
    const [activites, boite, fin] = await Promise.all([faisais(vue).boundingBox(), section(vue).boundingBox(), terminer(vue).boundingBox()]);
    expect(boite.y).toBeGreaterThanOrEqual(activites.y + activites.height);
    expect(boite.y + boite.height).toBeLessThanOrEqual(fin.y);
    await expect(section(vue)).toBeInViewport({ ratio: 1 });
    await terminer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
    await expect(page.getByText(NOTEE)).toBeVisible();
  }
  // Rien n'a été lancé : aucun élément retenu, aucune séance.
  expect(await lireDernier(page)).toBeNull();
  expect(await seances(page)).toEqual([]);
});

test('avec la carte « Pour récupérer » : elle reste en tête, « Pour ce moment : » vient après « Ce que je faisais » ; même pour un plan long, tout s\'atteint en défilant', async ({ page }) => {
  await page.evaluate(async () => {
    const { repo } = window.__carnet;
    await repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors', pourRecuperer: Array.from({ length: 14 }, (_, i) => `je me repose un peu, ligne ${i + 1}`).join('\n'), siAlors: [] });
    await repo.meta.ecrire('ressourcer', { energieBasse: true });
  });
  const vue = await ecran3(page, 'bleu', 'Vide');
  await expect(vue.getByRole('heading', { level: 2 })).toHaveText([/^Pour récupérer/, 'Ce que je faisais', /^Pour ce moment\s:$/]);
  await exercice(vue, 'Noter ce qui passe').scrollIntoViewIfNeeded();
  await expect(exercice(vue, 'Noter ce qui passe')).toBeInViewport({ ratio: 1 });
  await expect(terminer(vue)).toBeInViewport({ ratio: 1 });
});

test('« Pour ce moment : » vaut pour un relevé noté « vers », et pour un mot à soi : la table de sa zone', async ({ page }) => {
  const vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: '14 h', exact: true }).click();
  await noter(vue, 'vert', 'Calme');
  await continuer(vue).click();
  await expect(section(vue).getByRole('button')).toHaveText(['Savourer', 'Expiration longue']);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  await page.evaluate(() => window.__carnet.repo.meta.ecrire('motsPerso', {
    'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'jaune', famille: null, definition: null, archive: false, createdAt: '2026-10-01T10:00:00.000Z' },
  }));
  const v2 = await ouvrir(page);
  await loupe(v2).click();
  await champLoupe(v2).fill('Flottant');
  await trouve(v2, 'Flottant').click();
  await continuer(v2).click();
  await expect(section(v2).getByRole('button')).toHaveText(['Savourer', 'Noter ce qui passe']);
});

test('pas de section : un relevé rouvert, même après « Changer le mot » ; « Aucun mot » ; un mot à soi sans zone', async ({ page }) => {
  // Un relevé tout juste noté, rouvert depuis Ma journée : la section ne vaut que quand on note.
  const vue = await ecran3(page, 'rouge', 'Irrité');
  await expect(section(vue)).toBeVisible();
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await ligneReleve(page, 'Irrité').click();
  await expect(changerMot(vue)).toBeVisible();
  await expect(faisais(vue)).toBeVisible();
  await expect(section(vue)).toHaveCount(0);
  await changerMot(vue).click();
  await toucherMot(vue, 'Calme');
  await continuer(vue).click();
  await expect(vue.getByRole('heading', { name: 'Calme', level: 1, exact: true })).toBeVisible();
  await expect(section(vue)).toHaveCount(0);
  await terminer(vue).click();

  // Les anciens relevés sans mot, et un mot recréé à l'import, sans zone ni place sur la carte.
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('motsPerso', {
    'roue:perso:u-0a1b2c3e': { libelle: 'Mot ancien', zone: null, famille: null, definition: null, archive: true, createdAt: '2026-10-01T10:00:00.000Z' },
  }));
  for (const [titre, champs] of [
    ['Aucun mot', { energie: 'energie:basse' }],
    ['Aucun mot', { emotion: 'roue:colere' }],
    ['Mot ancien', { emotion: 'roue:perso:u-0a1b2c3e' }],
  ]) {
    const id = await creer(page, { date: '2026-10-15', heure: '09:00', ...champs });
    await aller(page, `#/moment/${id}`);
    await expect(vue.getByRole('heading', { name: titre, level: 1, exact: true })).toBeVisible();
    await expect(faisais(vue)).toBeVisible();
    await expect(section(vue), JSON.stringify(champs)).toHaveCount(0);
    await aller(page, '#/aujourdhui');
  }
});

// v11 (8/11) : l'écran suit le thème (spec §9). Sur le noir en sombre, comme avant ; sur le gris clair en clair, avec le texte et
// le contour du thème : les mêmes couleurs pour toutes les zones, dans chaque thème.
test('discret, dans les deux thèmes et pour toutes les zones : du texte et un contour, aucun fond, aucune couleur de zone ; contrastes AA ; des cibles de 44', async ({ page }) => {
  test.setTimeout(60000);
  const vus = { light: new Set(), dark: new Set() };
  const FONDS = { light: '#f2f2f7', dark: '#000000' };
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    const fondEcran = FONDS[colorScheme];
    for (const [zone, libelle, [premier]] of [TABLE[0], TABLE[3]]) {
      const vue = await ecran3(page, zone, libelle);
      const style = await exercice(vue, premier).evaluate((e) => {
        const c = getComputedStyle(e);
        return { fond: c.backgroundColor, texte: c.color, contour: c.borderTopColor, trait: c.borderTopWidth, hauteur: e.getBoundingClientRect().height };
      });
      expect(style.fond, libelle).toBe('rgba(0, 0, 0, 0)');
      expect(style.trait).toBe('1px');
      expect(await page.locator('.moment-plein').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(colorScheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(242, 242, 247)');
      expect(contraste(style.texte, fondEcran)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(style.contour, fondEcran)).toBeGreaterThanOrEqual(3);
      expect(style.hauteur).toBeGreaterThanOrEqual(44);
      const titre = await section(vue).getByRole('heading', { level: 2 }).evaluate((e) => getComputedStyle(e).color);
      expect(contraste(titre, fondEcran)).toBeGreaterThanOrEqual(4.5);
      vus[colorScheme].add(JSON.stringify([style.texte, style.contour, titre]));
      await terminer(vue).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
  // Les mêmes couleurs partout, dans chaque thème.
  expect([vus.light.size, vus.dark.size]).toEqual([1, 1]);
  await page.emulateMedia({ colorScheme: 'light' });
});

test('une carte de hauteur minimale (« Vide », à la taille normale) : rien sous la flèche de l\'écran 2, le corps s\'arrête à son haut, même quand il défile ; « Terminer » reste sous son centre', async ({ page }) => {
  // Un plan long : le corps défile, et les exercices passent à toutes les hauteurs.
  await page.evaluate(async () => {
    const { repo } = window.__carnet;
    await repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors', pourRecuperer: Array.from({ length: 14 }, (_, i) => `je me repose un peu, ligne ${i + 1}`).join('\n'), siAlors: [] });
    await repo.meta.ecrire('ressourcer', { energieBasse: true });
  });
  const vue = await ouvrir(page);
  await noter(vue, 'bleu', 'Vide');
  await expect(continuer(vue)).not.toHaveAttribute('aria-disabled', 'true');
  await finMouvements(page);
  const f = await continuer(vue).boundingBox();
  await continuer(vue).click();
  await expect(section(vue)).toBeAttached();
  const resultat = await page.evaluate(async (fleche) => {
    const corps = document.querySelector('.corps-faisais');
    const xs = [fleche.x + 1, fleche.x + fleche.width / 2, fleche.x + fleche.width - 1];
    const ys = [fleche.y + 0.5, fleche.y + fleche.height / 2, fleche.y + fleche.height - 1];
    const dansLeCorps = [];
    const max = corps.scrollHeight - corps.clientHeight;
    for (let pas = 0; pas <= 10; pas++) {
      corps.scrollTo({ top: (max * pas) / 10, behavior: 'instant' });
      await Promise.resolve();
      for (const x of xs) for (const y of ys) if (document.elementFromPoint(x, y).closest('.corps-faisais')) dansLeCorps.push([pas, x, y]);
    }
    return {
      defile: max > 0,
      dansLeCorps,
      centre: Boolean(document.elementFromPoint(xs[1], ys[1]).closest('.terminer-releve')),
      basDuCorps: corps.getBoundingClientRect().bottom,
    };
  }, f);
  expect(resultat.defile, 'le corps défile').toBe(true);
  expect(resultat.dansLeCorps).toEqual([]);
  expect(resultat.centre).toBe(true);
  expect(resultat.basDuCorps).toBeLessThanOrEqual(f.y + 0.5);
});

// Une carte qui grandit (une longue définition, le très grand texte) fait monter la flèche au-dessus du haut du pied : elle mord
// alors sur le corps. Corps non défilé, à l'arrivée, aucun exercice n'est sous son centre. À 33 px seulement, son bord gauche mord
// sur le bout d'un exercice (test suivant, la garde) ; en défilant, à 40 et 53 px, un exercice peut passer là où elle était.
const sousLaFleche = (page, fleche) => page.evaluate((f) => {
  const corps = document.querySelector('.corps-faisais');
  const centre = { x: f.x + f.width / 2, y: f.y + f.height / 2 };
  const surExercice = (x, y) => document.elementFromPoint(x, y)?.closest('.proposition')?.textContent ?? null;
  const disque = new Set();
  for (let x = f.x; x <= f.x + f.width; x += 2) {
    for (let y = f.y; y <= f.y + f.height; y += 2) {
      if (Math.hypot(x - centre.x, y - centre.y) <= f.width / 2 && surExercice(x, y)) disque.add(surExercice(x, y));
    }
  }
  return { defile: corps.scrollTop, exercices: document.querySelectorAll('.proposition').length, centre: surExercice(centre.x, centre.y), disque: [...disque] };
}, fleche);
// L'écran 2 d'un mot noté, dans la taille de texte demandée : la boîte de sa flèche (ronde), la garde passée.
const ecran2 = async (page, zone, libelle, taille) => {
  await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
  const vue = await ouvrir(page);
  await noter(vue, zone, libelle);
  await expect(continuer(vue)).not.toHaveAttribute('aria-disabled', 'true');
  await finMouvements(page);
  return { vue, fleche: await continuer(vue).boundingBox() };
};

test('une carte qui grandit (« Jaloux », et le très grand texte) : à l\'arrivée sur l\'écran 3, corps non défilé, aucun exercice sous le centre de la flèche de l\'écran 2, ni, sauf à 33 px, sous son disque', async ({ page }) => {
  test.setTimeout(180000);
  for (const [zone, libelle] of [['rouge', 'Jaloux'], ['bleu', 'Vide']]) {
    for (const taille of [17, 19, 21, 23, 28, 33, 40, 53]) {
      const { vue, fleche } = await ecran2(page, zone, libelle, taille);
      await continuer(vue).click();
      await expect(section(vue).getByRole('button').first()).toBeAttached();
      await finMouvements(page);
      const sous = await sousLaFleche(page, fleche);
      expect(sous.exercices, `${libelle}, ${taille} px`).toBeGreaterThan(0);
      expect(sous.defile, `${libelle}, ${taille} px`).toBe(0);
      expect(sous.centre, `${libelle}, ${taille} px`).toBeNull();
      if (taille !== 33) expect(sous.disque, `${libelle}, ${taille} px`).toEqual([]);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      await terminer(vue).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
});

test('la flèche montée sur un exercice (« Jaloux », 33 px) : un second toucher rapide au même endroit tombe sur l\'exercice, et la garde l\'arrête : rien n\'est préparé, rien n\'est lancé', async ({ page }) => {
  await espionnerAudio(page);
  const { vue, fleche } = await ecran2(page, 'rouge', 'Jaloux', 33);
  // Dans le disque de la flèche, à gauche de son centre.
  const x = fleche.x + 10;
  const y = fleche.y + fleche.height / 2 + 8;
  await figer(page);
  await page.touchscreen.tap(x, y);
  await expect(section(vue)).toBeAttached();
  expect(await page.evaluate(([a, b]) => document.elementFromPoint(a, b).closest('.proposition')?.textContent, [x, y])).toBe('Expiration longue');
  await expect(exercice(vue, 'Expiration longue')).toHaveAttribute('aria-disabled', 'true');
  await page.touchscreen.tap(x, y);
  expect(await adresse(page)).toBe('#/moment');
  expect((await audio(page)).contextes).toBe(0);
  await page.clock.runFor(1000);
  expect(await adresse(page)).toBe('#/moment');
  expect(await lireDernier(page)).toBeNull();
  await page.clock.resume();
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

// ---------- Le toucher ----------

test('point de vigilance 2 : mot touché, activité touchée, exercice touché aussitôt, l\'écriture encore en cours : son et voix préparés dans le toucher ; le lecteur s\'ouvre le relevé complet en base, et démarre ; il revient à Aujourd\'hui, sans le message « notée »', async ({ page }) => {
  await espionnerAudio(page);
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  const vue = await ecran3(page, 'rouge', 'Irrité');
  await ralentirEcritures(page, 800);
  // Ce que la base contient quand l'adresse change.
  await page.evaluate(() => window.addEventListener('hashchange', () => { window.__auDepart = window.__carnet.repo.humeurs.tous(); }, { once: true }));
  await figer(page);
  await toucher(page, activite(vue, 'Travail'));
  await toucher(page, exercice(vue, 'Le soupir'));
  // Le toucher a tout préparé ; l'écran attend : l'activité n'est pas encore écrite.
  expect(await adresse(page)).toBe('#/moment');
  expect((await audio(page)).contextes).toBe(1);
  expect((await parole(page)).amorces).toBe(1);
  expect((await releves(page))[0].faisais ?? null).toBeNull();
  await page.clock.runFor(800);
  await expect.poll(() => adresse(page)).toBe('#/exercice/soupir');
  expect(await page.evaluate(() => window.__auDepart)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute', faisais: ['activiteMoment:travail'] }]);
  await page.clock.resume();
  // Le lecteur a démarré seul, sur ce toucher, sans autre contexte audio.
  const l = lecteur(page, 'Le soupir');
  await expect(bouton(l, 'Pause')).toBeVisible();
  await expect(bouton(l, 'Commencer')).toHaveCount(0);
  await expect.poll(async () => (await parole(page)).dits.length).toBeGreaterThan(0);
  expect((await audio(page)).contextes).toBe(1);
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  expect(JSON.parse(await lireDernier(page))).toBe('soupir');
  // « Fermer » : Aujourd'hui, le relevé dans Ma journée, sans message ; arrêté tôt, aucune séance.
  await bouton(l, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(ligneReleve(page, 'Irrité')).toHaveCount(1);
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  expect(await seances(page)).toEqual([]);
  expect(await releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute', faisais: ['activiteMoment:travail'] }]);
});

test('un seul départ : un autre exercice, « Terminer » ou ✕ touchés pendant l\'écriture ne font rien de plus', async ({ page }) => {
  const vue = await ecran3(page, 'bleu', 'Vide');
  await ralentirEcritures(page, 800);
  await figer(page);
  await toucher(page, activite(vue, 'Travail'));
  await toucher(page, exercice(vue, 'Scan court'));
  await toucher(page, exercice(vue, 'Noter ce qui passe'));
  await toucher(page, terminer(vue));
  await toucher(page, fermer(vue));
  expect(await adresse(page)).toBe('#/moment');
  await page.clock.runFor(800);
  await expect.poll(() => adresse(page)).toBe('#/exercice/scan-court');
  await page.clock.resume();
  await expect(bouton(lecteur(page, 'Scan court'), 'Pause')).toBeVisible();
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  expect(JSON.parse(await lireDernier(page))).toBe('scan-court');
});

test('la garde : juste après la flèche, un exercice touché est ignoré, rien n\'est préparé ; la garde passée, il part', async ({ page }) => {
  await espionnerAudio(page);
  const vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Irrité');
  await expect(continuer(vue)).not.toHaveAttribute('aria-disabled', 'true');
  await figer(page);
  await toucher(page, continuer(vue));
  await expect(exercice(vue, 'Le soupir')).toHaveAttribute('aria-disabled', 'true');
  await toucher(page, exercice(vue, 'Le soupir'));
  expect(await adresse(page)).toBe('#/moment');
  expect((await audio(page)).contextes).toBe(0);
  await page.clock.runFor(400);
  await expect(exercice(vue, 'Le soupir')).not.toHaveAttribute('aria-disabled', 'true');
  await page.clock.resume();
  await exercice(vue, 'Le soupir').click();
  await expect(bouton(lecteur(page, 'Le soupir'), 'Pause')).toBeVisible();
});

test('une écriture de plus de 3 s : le lecteur s\'ouvre sans jouer seul, il attend « Commencer », et le son préparé se rendort ; il revient quand même à Aujourd\'hui', async ({ page }) => {
  await avecSessionForte(page);
  const vue = await ecran3(page, 'vert', 'Calme');
  await ralentirEcritures(page, 3200);
  await figer(page);
  await toucher(page, activite(vue, 'Repos'));
  await toucher(page, exercice(vue, 'Savourer'));
  expect((await audio(page)).session).toBe('playback');
  await page.clock.runFor(3200);
  await expect.poll(() => adresse(page)).toBe('#/exercice/savourer');
  await page.clock.resume();
  const l = lecteur(page, 'Savourer');
  await expect(bouton(l, 'Commencer')).toBeVisible();
  await expect(bouton(l, 'Pause')).toHaveCount(0);
  expect(await lireDernier(page)).toBeNull();
  expect(await releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme', faisais: ['activiteMoment:repos'] }]);
  await sonRendu(page);
  await commencerAvecSon(page, l);
  expect(JSON.parse(await lireDernier(page))).toBe('savourer');
  await bouton(l, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('une écriture finie juste sous 3 s, et l\'ouverture qui passe les 3 s : le lecteur attend « Commencer », le son préparé se rendort, et il revient quand même à Aujourd\'hui', async ({ page }) => {
  await avecSessionForte(page);
  const vue = await ecran3(page, 'vert', 'Calme');
  await ralentirEcritures(page, 2990);
  // Une ouverture lente, comme sur un iPhone occupé : l'adresse changée, l'horloge a pris 20 ms de plus.
  await page.evaluate(() => {
    const lire = performance.now.bind(performance);
    performance.now = () => lire() + (location.hash === '#/exercice/savourer' ? 20 : 0);
  });
  await figer(page);
  await toucher(page, activite(vue, 'Repos'));
  await toucher(page, exercice(vue, 'Savourer'));
  await page.clock.runFor(2990);
  await expect.poll(() => adresse(page)).toBe('#/exercice/savourer');
  await page.clock.resume();
  const l = lecteur(page, 'Savourer');
  await expect(bouton(l, 'Commencer')).toBeVisible();
  await expect(bouton(l, 'Pause')).toHaveCount(0);
  expect(await lireDernier(page)).toBeNull();
  await sonRendu(page);
  await commencerAvecSon(page, l);
  await bouton(l, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme', faisais: ['activiteMoment:repos'] }]);
});

test('point de vigilance 3 : l\'iPhone verrouillé pendant l\'écriture : le lecteur s\'ouvre sans jouer, le son préparé se rendort, et rien n\'est retenu ; au retour, rien ne part seul, il attend « Commencer », et revient quand même à Aujourd\'hui', async ({ page }) => {
  await avecSessionForte(page);
  const vue = await ecran3(page, 'vert', 'Calme');
  await ralentirEcritures(page, 800);
  await figer(page);
  await toucher(page, activite(vue, 'Repos'));
  await toucher(page, exercice(vue, 'Savourer'));
  await cacher(page);
  await page.clock.runFor(800);
  await expect.poll(() => adresse(page)).toBe('#/exercice/savourer');
  await page.clock.resume();
  const l = lecteur(page, 'Savourer');
  await expect(bouton(l, 'Commencer')).toBeVisible();
  await expect(bouton(l, 'Pause')).toHaveCount(0);
  await expect(l.locator('.lecteur-consigne')).toHaveCount(0);
  expect(await lireDernier(page)).toBeNull();
  expect(await releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme', faisais: ['activiteMoment:repos'] }]);
  await sonRendu(page);
  await montrer(page);
  await page.clock.runFor(1000);
  await expect(bouton(l, 'Commencer')).toBeVisible();
  await expect(bouton(l, 'Pause')).toHaveCount(0);
  expect(await lireDernier(page)).toBeNull();
  await commencerAvecSon(page, l);
  expect(JSON.parse(await lireDernier(page))).toBe('savourer');
  await bouton(l, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await seances(page)).toEqual([]);
});

test('à la durée retenue, mené au bout : la séance d\'origine bien-etre, sans programme ; à Aujourd\'hui, « Noter mon émotion » comme ailleurs ; le relevé ne change pas', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:duree:expiration-longue', '1'));
  const vue = await ecran3(page, 'vert', 'Calme');
  await exercice(vue, 'Expiration longue').click();
  const l = lecteur(page, 'Expiration longue');
  await expect(bouton(l, 'Pause')).toBeVisible();
  await expect(l.locator('.lecteur-reste')).toHaveText(/^il reste (1:\d\d|0:5\d)$/);
  const totalS = await page.evaluate(() => import('/js/domain/exercices.js').then((m) => m.dureeExerciceS(m.exerciceAvecDuree(m.exerciceDe('expiration-longue'), 1))));
  await figer(page);
  await page.clock.runFor((totalS + 1) * 1000);
  await expect(l.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(6000);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'expiration-longue', origine: 'bien-etre', fin: true });
  expect(s.programme ?? null).toBeNull();
  expect(await releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme', faisais: null }]);
  await page.clock.resume();
});

// ---------- Très grand texte ----------

// Rien ne sort par le côté : ni la page, ni le corps, ni la section ; aucun texte ne dépasse de sa boîte, aucun mot n'est coupé.
const debordements = (page) => page.evaluate(() => {
  const fautes = [];
  const largeur = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > largeur) fautes.push(`page : ${document.documentElement.scrollWidth}`);
  const corps = document.querySelector('.corps-faisais');
  if (corps.scrollWidth > corps.clientWidth) fautes.push(`corps : ${corps.scrollWidth} dans ${corps.clientWidth}`);
  const plage = document.createRange();
  for (const e of document.querySelectorAll('.pour-ce-moment, .titre-pour-ce-moment, .proposition')) {
    const r = e.getBoundingClientRect();
    if (r.left < 0 || r.right > largeur) fautes.push(`${e.textContent} : ${r.left} à ${r.right}`);
    if (e.scrollWidth > e.clientWidth + 1) fautes.push(`${e.textContent} : ${e.scrollWidth} dans ${e.clientWidth}`);
    if (e.classList.contains('pour-ce-moment')) continue;
    plage.selectNodeContents(e);
    const lignes = new Set([...plage.getClientRects()].map((q) => Math.round(q.top)));
    if (lignes.size > e.textContent.trim().split(/\s+/).length) fautes.push(`${e.textContent} : un mot coupé`);
    for (const q of plage.getClientRects()) if (q.left < r.left - 0.5 || q.right > r.right + 0.5) fautes.push(`${e.textContent} : hors de sa boîte`);
  }
  return fautes;
});

test('point de vigilance 5, très grand texte : la section tient sans débordement de côté, aucun mot coupé ; ses boutons restent des cibles de 44, et s\'atteignent en défilant ; « Terminer » reste à l\'écran', async ({ page }) => {
  test.setTimeout(60000);
  for (const [zone, libelle, titres] of [TABLE[0], TABLE[2]]) {
    const vue = await ecran3(page, zone, libelle);
    for (const taille of [17, 19, 21, 23, 28, 33, 40, 53]) {
      await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
      await page.evaluate(() => document.fonts.ready);
      expect(await debordements(page), `${libelle}, ${taille} px`).toEqual([]);
      for (const t of titres) {
        const b = exercice(vue, t);
        await b.scrollIntoViewIfNeeded();
        await expect(b, `${t}, ${taille} px`).toBeInViewport({ ratio: 1 });
        expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      await expect(terminer(vue), `${taille} px`).toBeInViewport({ ratio: 1 });
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await terminer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
  }
});
