import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { contraste } from '../aides/couleurs.js';
import { trouverInterdits } from '../aides/mots-interdits.js';
import {
  vueMoment, bulle, carte, mot, retour, continuer, carteDuBas, terminer, loupe, champLoupe, trouves, trouve, ajouterMot,
  nomMot, couleurMot, familleMot, definitionMot, NOMS_BULLES,
} from '../aides/emotion.js';
import { DEFINITIONS } from '../../public/js/domain/definitions-roue.js';
import { energieDe } from '../../public/js/domain/carte-roue.js';

// v9 (6/8) · La loupe et le mot à soi (spec §4.4 et §4.5). La loupe, en haut à droite des écrans 1 et 2, cherche dans
// les noms et les définitions, sans accents ni casse ; un mot trouvé est choisi comme sur la carte, qui s'ouvre centrée
// sur lui. « Ajouter mon mot « … » » ouvre l'écran du mot à soi : il naît au choix de sa couleur et entre aussitôt dans
// le relevé ; sa famille et sa définition le complètent. Réglages › Émotions › « Mes mots » le renomme, le change, le
// met de côté ou l'efface (point de vigilance 4). Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const lirePerso = (page) => () => page.evaluate(() => window.__carnet.repo.meta.lire('motsPerso'));
const ecrirePerso = (page, perso) => page.evaluate((p) => window.__carnet.repo.meta.ecrire('motsPerso', p), perso);
const creer = (page, liste) => page.evaluate(async (l) => {
  const ids = [];
  for (const h of l) ids.push((await window.__carnet.repo.humeurs.creer(h)).id);
  return ids;
}, liste);
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
const finGarde = (groupe) => expect(groupe).not.toHaveAttribute('aria-disabled', 'true');
// La ligne d'un relevé dans Ma journée.
const ligneReleve = (page, texte) => page.locator('.liste-evenements a.releve').filter({ hasText: texte });
const FLOTTANT = 'roue:perso:u-0a1b2c3d';
const BOUILLONNANT = 'roue:perso:u-0a1b2c3e';
const DEUX_MOTS = {
  [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: null, definition: 'Un peu ailleurs, sans attache.', archive: false, createdAt: '2026-10-01T08:00:00.000Z' },
  [BOUILLONNANT]: { libelle: 'Bouillonnant', zone: 'rouge', famille: 'colere', definition: null, archive: false, createdAt: '2026-10-02T08:00:00.000Z' },
};
// Le point de zone d'une ligne de Ma journée, et ce qu'elle dit.
const pointDe = (ligne) => ligne.locator('.point-releve').evaluate((p) => [...p.classList].find((c) => c.startsWith('zone-') || c === 'point-creux'));

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('la loupe de l\'écran 1 : champ actif ; « epuise » trouve Épuisé, à la couleur de sa zone, avec sa définition ; le toucher l\'écrit, et la carte s\'ouvre centrée sur lui, avec la carte du bas', async ({ page }) => {
  const vue = await ouvrir(page);
  // ✕ en haut à gauche, la loupe en haut à droite, avant le titre ; aux mesures des boutons en verre (48 × 44).
  const noms = await vue.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent));
  expect(noms.slice(0, 2)).toEqual(['Fermer', 'Chercher un mot']);
  const boite = await loupe(vue).boundingBox();
  expect([Math.round(boite.x + boite.width), Math.round(boite.width), Math.round(boite.height)]).toEqual([390 - 16, 48, 44]);

  await loupe(vue).click();
  await expect(champLoupe(vue)).toBeFocused();
  await expect(vue.getByRole('button', { name: 'Revenir au choix de la couleur', exact: true })).toBeVisible();
  await expect(trouves(vue)).toHaveCount(0);
  await expect(ajouterMot(vue)).toHaveCount(0);
  await champLoupe(vue).pressSequentially('epuise');
  await expect(trouves(vue).getByRole('button')).toHaveCount(1);
  await expect(trouve(vue, 'Épuisé')).toHaveText(`Épuisé ${DEFINITIONS['roue:aucune:epuise']}`);
  // Le mot à la couleur de sa zone (le bleu), lisible sur le noir ; le début de sa définition en gris.
  const couleurs = await trouve(vue, 'Épuisé').evaluate((b) => [getComputedStyle(b.querySelector('.mot-resultat')).color, getComputedStyle(b.querySelector('.extrait-resultat')).color]);
  expect(couleurs[0]).toBe('rgb(120, 159, 255)');
  for (const c of couleurs) expect(contraste(c, 'rgb(0, 0, 0)')).toBeGreaterThanOrEqual(4.5);
  // Rien n'est écrit en cherchant.
  expect(await releves(page)()).toEqual([]);

  await trouve(vue, 'Épuisé').click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '21:00', emotion: 'roue:aucune:epuise', energie: energieDe('roue:aucune:epuise') }]);
  await expect(mot(vue, 'Épuisé')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Épuisé');
  await expect(carteDuBas(vue).locator('.definition-carte-du-bas')).toHaveText(DEFINITIONS['roue:aucune:epuise']);
  // Centrée sur lui, au milieu de l'écran.
  await expect.poll(() => mot(vue, 'Épuisé').evaluate((b) => { const r = b.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - 195, r.top + r.height / 2 - 422) < 2; })).toBe(true);
  // ← ramène à l'écran 1 (la carte vient de lui), le mot gardé ; la flèche mène à l'écran 3.
  await retour(vue).click();
  await expect(bulle(vue, 'rouge')).toBeVisible();
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:aucune:epuise' }]);
});

test('un mot de définition trouve son mot ; noms d\'abord, définitions ensuite ; la correction de l\'utilisateur compte ; le texte reste d\'une ouverture à l\'autre', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('definitionsRoue', { 'roue:colere:irrite': 'Agacé par un bruit qui revient.' }));
  const vue = await ouvrir(page);
  await loupe(vue).click();
  await champLoupe(vue).fill('chavire');
  await expect(trouves(vue).getByRole('button')).toHaveCount(1);
  await expect(trouve(vue, 'Ému')).toBeVisible();
  // « repos » : Reposé par son nom, puis Fatigué par sa définition (« … du repos. »).
  await champLoupe(vue).fill('REPOS');
  await expect(trouves(vue).locator('.mot-resultat')).toHaveText(['Reposé', 'Fatigué']);
  // La définition corrigée : elle se cherche et se montre.
  await champLoupe(vue).fill('bruit qui revient');
  await expect(trouves(vue).getByRole('button')).toHaveText(['Irrité Agacé par un bruit qui revient.']);
  // Le texte reste quand on revient aux bulles puis à la loupe.
  await vue.getByRole('button', { name: 'Revenir au choix de la couleur', exact: true }).click();
  await expect(bulle(vue, 'rouge')).toBeVisible();
  await loupe(vue).click();
  await expect(champLoupe(vue)).toHaveValue('bruit qui revient');
  await expect(trouve(vue, 'Irrité')).toBeVisible();
  // Rien d'écrit, nulle part.
  expect(await releves(page)()).toEqual([]);
  expect(await lirePerso(page)()).toBeNull();
});

test('la loupe de la carte : ← y ramène ; un mot trouvé déjà choisi reste choisi (la loupe n\'efface pas) ; un autre le remplace, énergie comprise', async ({ page }) => {
  const vue = await ouvrir(page);
  await bulle(vue, 'rouge').click();
  await mot(vue, 'Irrité').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute' }]);
  // ← d'abord, la loupe ensuite, puis les mots.
  const noms = await vue.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent));
  expect(noms.slice(0, 2)).toEqual(['Revenir au choix de la couleur', 'Chercher un mot']);
  await loupe(vue).click();
  await expect(champLoupe(vue)).toBeFocused();
  await vue.getByRole('button', { name: 'Revenir à la carte', exact: true }).click();
  await expect(mot(vue, 'Irrité')).toHaveAttribute('aria-pressed', 'true');

  await loupe(vue).click();
  await champLoupe(vue).fill('irrite');
  await trouve(vue, 'Irrité').click();
  await expect(mot(vue, 'Irrité')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Irrité');
  await page.clock.runFor(500);
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute' }]);

  await finGarde(carte(vue));
  await loupe(vue).click();
  await champLoupe(vue).fill('calme');
  await trouve(vue, 'Calme').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme', energie: energieDe('roue:serenite:calme') }]);
  expect(await releves(page)()).toHaveLength(1);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText(['Calme']);
});

test('« Ajouter mon mot » : sans résultat ; le mot naît au choix de sa couleur et entre dans le relevé ; famille et définition le complètent ; la flèche montre la carte, le mot hors du carré de sa zone', async ({ page }) => {
  const vue = await ouvrir(page);
  await loupe(vue).click();
  // Un nom déjà sur la carte : rien à ajouter.
  await champLoupe(vue).fill('calme');
  await expect(trouve(vue, 'Calme')).toBeVisible();
  await expect(ajouterMot(vue)).toHaveCount(0);
  await champLoupe(vue).fill('  brumeux ');
  await expect(trouves(vue)).toHaveCount(0);
  await expect(vue.locator('.sans-resultat')).toHaveText('Aucun mot de la carte ne contient ce texte.');
  await expect(ajouterMot(vue)).toHaveText('Ajouter mon mot « Brumeux »');
  await ajouterMot(vue).click();

  // L'écran du mot : le nom déjà rempli, les quatre couleurs, aucune choisie ; ni famille ni définition encore ; rien d'écrit.
  await expect(vue.getByRole('heading', { name: 'Mon mot', level: 1 })).toBeFocused();
  await expect(nomMot(vue)).toHaveValue('Brumeux');
  for (const zone of Object.keys(NOMS_BULLES)) await expect(couleurMot(vue, zone)).toHaveAttribute('aria-pressed', 'false');
  await expect(vue.getByRole('group', { name: 'Famille', exact: true })).toHaveCount(0);
  await expect(definitionMot(vue)).toHaveCount(0);
  await expect(continuer(vue)).toHaveCount(0);
  expect(await lirePerso(page)()).toBeNull();
  expect(await releves(page)()).toEqual([]);

  // Une couleur : le mot existe, et le relevé le porte, avec l'énergie de sa zone (le bleu : basse).
  await couleurMot(vue, 'bleu').click();
  await expect.poll(async () => Object.keys((await lirePerso(page)()) || {}).length).toBe(1);
  const [id] = Object.keys(await lirePerso(page)());
  expect(id).toMatch(/^roue:perso:u-[0-9a-f]{8}$/);
  expect((await lirePerso(page)())[id]).toEqual({ libelle: 'Brumeux', zone: 'bleu', famille: null, definition: null, archive: false, createdAt: expect.stringMatching(/^2026-10-15T/) });
  await expect.poll(releves(page)).toMatchObject([{ emotion: id, energie: 'energie:basse', date: '2026-10-15', heure: '21:00' }]);
  await expect(couleurMot(vue, 'bleu')).toHaveAttribute('aria-pressed', 'true');
  // La couleur retouchée ne change rien ; une autre change la sienne, et l'énergie du relevé.
  await couleurMot(vue, 'bleu').click();
  await couleurMot(vue, 'rouge').click();
  await expect.poll(async () => (await lirePerso(page)())[id].zone).toBe('rouge');
  await expect.poll(releves(page)).toMatchObject([{ emotion: id, energie: 'energie:haute' }]);
  expect(await releves(page)()).toHaveLength(1);

  // La famille au toucher, la définition à la sortie du champ. Rien n'est coché d'avance (rien par défaut) : une famille
  // vide est une donnée ; « Aucune », touchée alors, n'écrit rien et ne coche rien.
  const familles = vue.getByRole('group', { name: 'Famille', exact: true });
  await expect(familles.getByRole('button', { pressed: true })).toHaveCount(0);
  await familleMot(vue, 'Aucune').click();
  await expect(familles.getByRole('button', { pressed: true })).toHaveCount(0);
  expect((await lirePerso(page)())[id].famille).toBeNull();
  await familleMot(vue, 'Tristesse').click();
  await expect.poll(async () => (await lirePerso(page)())[id].famille).toBe('tristesse');
  await definitionMot(vue).fill('Les idées dans le brouillard.');
  await vue.getByRole('heading', { name: 'Mon mot', level: 1 }).click();
  await expect.poll(async () => (await lirePerso(page)())[id].definition).toBe('Les idées dans le brouillard.');
  // Un nom déjà pris : refusé, dit sous le champ ; le mot garde le sien.
  await nomMot(vue).fill('calme');
  await nomMot(vue).press('Enter');
  await expect(vue.getByRole('alert')).toHaveText('Ce mot est déjà sur la carte.');
  expect((await lirePerso(page)())[id].libelle).toBe('Brumeux');
  // Une famille écrite ensuite n'efface pas l'alerte : le champ montre toujours un nom qui n'est pas enregistré.
  await familleMot(vue, 'Joie').click();
  await expect.poll(async () => (await lirePerso(page)())[id].famille).toBe('joie');
  await expect(nomMot(vue)).toHaveValue('calme');
  await expect(vue.getByRole('alert')).toHaveText('Ce mot est déjà sur la carte.');
  await expect(nomMot(vue)).toHaveAttribute('aria-invalid', 'true');
  expect((await lirePerso(page)())[id].libelle).toBe('Brumeux');
  await nomMot(vue).fill('Brumeux');
  await nomMot(vue).blur();
  await expect(vue.locator('.erreur-mot')).toHaveText('');

  // La flèche : la carte, centrée sur lui, choisi ; il est dans le rouge, à gauche de tous ses mots (hors du carré).
  await continuer(vue).click();
  await expect(carte(vue).getByRole('button')).toHaveCount(145);
  await expect(mot(vue, 'Brumeux')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Brumeux');
  await expect(carteDuBas(vue).locator('.definition-carte-du-bas')).toHaveText('Les idées dans le brouillard.');
  await expect.poll(() => mot(vue, 'Brumeux').evaluate((b) => { const r = b.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - 195, r.top + r.height / 2 - 422) < 2; })).toBe(true);
  const place = await page.evaluate(() => {
    const rouges = [...document.querySelectorAll('[data-zone="rouge"] .bulle-mot')];
    const sien = rouges.find((b) => b.textContent === 'Brumeux');
    const x = (b) => b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2;
    return { dansLeRouge: Boolean(sien), aGauche: x(sien) < Math.min(...rouges.filter((b) => b !== sien).map(x)) };
  });
  expect(place).toEqual({ dansLeRouge: true, aGauche: true });
  // La flèche, puis Terminer : Ma journée montre le relevé, son nom, au point rouge.
  await continuer(vue).click();
  await expect(vue.getByRole('heading', { name: 'Brumeux', level: 1 })).toBeVisible();
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(ligneReleve(page, 'Brumeux')).toHaveCount(1);
  expect(await pointDe(ligneReleve(page, 'Brumeux'))).toBe('zone-rouge');
  // Rouverte, la loupe le trouve, par son nom et par sa définition ; plus d'« Ajouter » pour ce nom.
  const vue2 = await ouvrir(page);
  await loupe(vue2).click();
  await champLoupe(vue2).fill('brouillard');
  await expect(trouves(vue2).getByRole('button')).toHaveText(['Brumeux Les idées dans le brouillard.']);
  await champLoupe(vue2).fill('BRUMEUX');
  await expect(ajouterMot(vue2)).toHaveCount(0);
});

test('à la création, un nom déjà sur la carte est refusé au choix de la couleur : rien n\'est écrit ; ← ramène à la loupe, son texte gardé', async ({ page }) => {
  const vue = await ouvrir(page);
  await loupe(vue).click();
  await champLoupe(vue).fill('nuageux');
  await ajouterMot(vue).click();
  await nomMot(vue).fill('Épuisé');
  await couleurMot(vue, 'vert').click();
  await expect(vue.getByRole('alert')).toHaveText('Ce mot est déjà sur la carte.');
  await expect(couleurMot(vue, 'vert')).toHaveAttribute('aria-pressed', 'false');
  await page.clock.runFor(300);
  expect(await lirePerso(page)()).toBeNull();
  expect(await releves(page)()).toEqual([]);
  // Un nom vide aussi.
  await nomMot(vue).fill('   ');
  await couleurMot(vue, 'vert').click();
  await expect(vue.getByRole('alert')).toHaveText('Ce mot n\'a pas de nom.');
  expect(await lirePerso(page)()).toBeNull();
  await vue.getByRole('button', { name: 'Revenir à la recherche', exact: true }).click();
  await expect(champLoupe(vue)).toHaveValue('nuageux');
  await expect(ajouterMot(vue)).toHaveText('Ajouter mon mot « Nuageux »');
});

test('plein écran noir, en clair comme en sombre, pour la loupe et le mot à soi : ni barre d\'onglets, ni défilement de côté ; aucune violation de CSP', async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.sourceFile || ''}`));
  });
  await page.reload();
  await appPrete(page);
  const etat = () => page.evaluate(() => {
    const ecran = document.querySelector('.moment-plein');
    return { fond: getComputedStyle(ecran).backgroundColor, onglets: document.querySelectorAll('nav.onglets').length,
      deCote: document.documentElement.scrollWidth > innerWidth || scrollX !== 0 };
  });
  const attendu = { fond: 'rgb(0, 0, 0)', onglets: 0, deCote: false };
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    await loupe(vue).click();
    await champLoupe(vue).fill('e');
    expect(await etat(), `${schema}, loupe`).toEqual(attendu);
    await champLoupe(vue).fill(`un mot très long pour voir ${schema}`);
    expect(trouverInterdits(await vue.textContent())).toEqual([]);
    await ajouterMot(vue).click();
    expect(await etat(), `${schema}, mot à soi`).toEqual(attendu);
    await couleurMot(vue, 'jaune').click();
    await expect(familleMot(vue, 'Joie')).toBeVisible();
    expect(await etat(), `${schema}, mot à soi créé`).toEqual(attendu);
    // Aucune formulation interdite (CLAUDE.md : ni jugement, ni engagement).
    expect(trouverInterdits(await vue.textContent())).toEqual([]);
    // Le texte noir de chaque petite bulle reste AA sur sa couleur médiane.
    for (const zone of Object.keys(NOMS_BULLES)) {
      const [fond, texte] = await couleurMot(vue, zone).evaluate((b) => [getComputedStyle(b.querySelector('.face')).backgroundColor, getComputedStyle(b).color]);
      expect(contraste(fond, texte), `${schema}, ${zone}`).toBeGreaterThanOrEqual(4.5);
    }
    await continuer(vue).click();
    await expect(carteDuBas(vue)).toBeVisible();
    await continuer(vue).click();
    await terminer(vue).click();
    await expect(page.locator('nav.onglets')).toBeVisible();
  }
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
});

// Point de vigilance 2, pour les écrans de la tâche 6 : les libellés des petites bulles restent dans leur disque, et
// aucune ligne de texte ne sort de l'écran.
const debordements = (page, selecteur) => page.evaluate((sel) => {
  const fautes = [];
  if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px`);
  const plage = document.createRange();
  const lignes = (e) => {
    const res = [];
    const textes = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = textes.nextNode(); n; n = textes.nextNode()) { plage.selectNodeContents(n); res.push(...plage.getClientRects()); }
    return res;
  };
  for (const e of document.querySelectorAll('.etiquette-bulle')) {
    const r = e.closest('.face').getBoundingClientRect();
    const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
    if (lignes(e).some((q) => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].some(([x, y]) => Math.hypot(x - cx, y - cy) > rayon + 0.5))) fautes.push(`${e.textContent} : hors de sa bulle`);
  }
  for (const e of document.querySelectorAll(sel)) for (const q of lignes(e)) if (q.width > 0 && (q.left < -0.5 || q.right > innerWidth + 0.5)) fautes.push(`${e.className} : hors de l'écran`);
  return [...new Set(fautes)];
}, selecteur);

test('point de vigilance 2 : en très grand texte (17 à 23), la loupe et l\'écran du mot tiennent en largeur, les libellés des petites bulles dans leur disque', async ({ page }) => {
  test.setTimeout(90000);
  await ecrirePerso(page, { [FLOTTANT]: { ...DEUX_MOTS[FLOTTANT], definition: 'Une sensation lente et diffuse, comme un brouillard qui reste posé sur tout ce que je fais depuis le matin.' } });
  for (const taille of [17, 19, 21, 23]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const vue = await ouvrir(page);
    await loupe(vue).click();
    await champLoupe(vue).fill('e');
    await page.evaluate(() => document.fonts.ready);
    expect(await debordements(page, '.ecran-loupe *'), `loupe, ${taille} px`).toEqual([]);
    await champLoupe(vue).fill('Un mot à soi au nom vraiment très long');
    await ajouterMot(vue).click();
    await couleurMot(vue, 'rouge').click();
    await expect(familleMot(vue, 'Surprise')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await debordements(page, '.ecran-mot *'), `mot à soi, ${taille} px`).toEqual([]);
    await continuer(vue).click();
    await continuer(vue).click();
    await terminer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
    // Le mot suivant prendra un autre nom.
    await page.evaluate(async () => {
      const r = window.__carnet.repo;
      await r.meta.modifier('motsPerso', (p) => Object.fromEntries(Object.entries(p).filter(([, m]) => !m.libelle.startsWith('Un mot à soi'))));
      for (const h of await r.humeurs.tous()) await r.humeurs.supprimer(h.id);
    });
  }
  // Réglages › « Mes mots », le formulaire ouvert, au plus grand.
  await aller(page, '#/reglages/emotions');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  await mesMots.getByRole('button', { name: /^Flottant/ }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(await debordements(page, '.mes-mots *'), 'Mes mots, 23 px').toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('Réglages › Émotions › « Mes mots » : après « Sans famille » ; renommer, changer de couleur et de famille ; Ma journée suit, l\'énergie enregistrée reste', async ({ page }) => {
  await ecrirePerso(page, DEUX_MOTS);
  await creer(page, [{ date: '2026-10-15', heure: '18:00', emotion: BOUILLONNANT, energie: 'energie:haute' }]);
  await aller(page, '#/reglages/emotions');
  await expect(page.locator('main h2').last()).toHaveText('Mes mots');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  // Sur la carte, dans l'ordre de création : le mot, sa couleur et sa famille, sa définition.
  await expect(mesMots.locator('.bouton-definition')).toHaveText([
    'Flottant Énergie basse · agréable · Sans famille Un peu ailleurs, sans attache.',
    'Bouillonnant Énergie haute · désagréable · Colère',
  ]);
  // « Sans famille » reste la seule section de ce nom.
  await expect(page.getByRole('region', { name: 'Sans famille', exact: true })).toHaveCount(1);

  await mesMots.getByRole('button', { name: /^Bouillonnant/ }).click();
  const editeur = mesMots.getByRole('group', { name: 'Bouillonnant', exact: true });
  await expect(editeur).toBeFocused();
  await expect(nomMot(editeur)).toHaveValue('Bouillonnant');
  await expect(couleurMot(editeur, 'rouge')).toHaveAttribute('aria-pressed', 'true');
  await expect(familleMot(editeur, 'Colère')).toHaveAttribute('aria-pressed', 'true');
  // Utilisé : « Mettre de côté », pas « Effacer ».
  await expect(editeur.getByRole('button', { name: 'Mettre de côté', exact: true })).toBeVisible();
  expect(trouverInterdits(await mesMots.textContent())).toEqual([]);
  await expect(editeur.getByRole('button', { name: 'Effacer', exact: true })).toHaveCount(0);

  await nomMot(editeur).fill('Bouillant');
  await nomMot(editeur).press('Enter');
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].libelle).toBe('Bouillant');
  const editeur2 = mesMots.getByRole('group', { name: 'Bouillant', exact: true });
  await couleurMot(editeur2, 'jaune').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].zone).toBe('jaune');
  await familleMot(editeur2, 'Joie').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].famille).toBe('joie');
  // Retoucher la famille choisie : plus de famille, et rien de coché. « Aucune » fait de même.
  const familles = editeur2.getByRole('group', { name: 'Famille', exact: true });
  await familleMot(editeur2, 'Joie').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].famille).toBeNull();
  await expect(familles.getByRole('button', { pressed: true })).toHaveCount(0);
  await familleMot(editeur2, 'Peur').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].famille).toBe('peur');
  await familleMot(editeur2, 'Aucune').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].famille).toBeNull();
  await expect(familles.getByRole('button', { pressed: true })).toHaveCount(0);
  await definitionMot(editeur2).fill('Tout chauffe dedans.');
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].definition).toBe('Tout chauffe dedans.');
  // Un nom pris par un autre mot de la carte : refusé.
  await nomMot(editeur2).fill('flottant');
  await nomMot(editeur2).blur();
  await expect(editeur2.getByRole('alert')).toHaveText('Ce mot est déjà sur la carte.');
  expect((await lirePerso(page)())[BOUILLONNANT].libelle).toBe('Bouillant');
  // Une couleur écrite ensuite ne l'efface pas : le champ montre un nom qui n'est pas enregistré.
  await couleurMot(editeur2, 'bleu').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].zone).toBe('bleu');
  await expect(nomMot(editeur2)).toHaveValue('flottant');
  await expect(editeur2.getByRole('alert')).toHaveText('Ce mot est déjà sur la carte.');
  // Remis tel qu'il est enregistré : plus rien à dire.
  await nomMot(editeur2).fill('Bouillant');
  await nomMot(editeur2).blur();
  await expect(editeur2.getByRole('alert')).toHaveText('');
  await couleurMot(editeur2, 'jaune').click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].zone).toBe('jaune');

  // Ma journée : le nouveau nom, au point de la nouvelle zone ; le relevé n'est pas réécrit (son énergie reste).
  await aller(page, '#/aujourdhui');
  await expect(ligneReleve(page, 'Bouillant')).toHaveCount(1);
  expect(await pointDe(ligneReleve(page, 'Bouillant'))).toBe('zone-jaune');
  expect(await releves(page)()).toMatchObject([{ emotion: BOUILLONNANT, energie: 'energie:haute' }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('point de vigilance 4 : un mot utilisé se met de côté (hors de la carte et de la loupe, lisible dans ses relevés), puis revient ; un mot jamais utilisé s\'efface, après confirmation', async ({ page }) => {
  await ecrirePerso(page, DEUX_MOTS);
  await creer(page, [{ date: '2026-10-15', heure: '18:00', emotion: BOUILLONNANT, energie: 'energie:haute' }]);
  await aller(page, '#/reglages/emotions');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  await mesMots.getByRole('button', { name: /^Bouillonnant/ }).click();
  await mesMots.getByRole('button', { name: 'Mettre de côté', exact: true }).click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].archive).toBe(true);
  // Il passe sous « Mis de côté », et peut revenir.
  const deCote = mesMots.getByRole('list', { name: 'Mis de côté', exact: true });
  await expect(deCote.getByRole('button', { name: 'Remettre sur la carte', exact: true })).toBeVisible();
  await expect(mesMots.getByRole('list', { name: 'Sur la carte', exact: true }).locator('.bouton-definition')).toHaveText([/^Flottant/]);

  // Hors de la carte et de la loupe ; lisible dans Ma journée, au point de sa zone.
  const vue = await ouvrir(page);
  await bulle(vue, 'rouge').click();
  await expect(carte(vue).getByRole('button')).toHaveCount(145);
  await expect(mot(vue, 'Bouillonnant')).toHaveCount(0);
  await expect(mot(vue, 'Flottant')).toHaveCount(1);
  await loupe(vue).click();
  await champLoupe(vue).fill('bouillon');
  await expect(trouves(vue)).toHaveCount(0);
  await aller(page, '#/aujourdhui');
  await expect(ligneReleve(page, 'Bouillonnant')).toHaveCount(1);
  expect(await pointDe(ligneReleve(page, 'Bouillonnant'))).toBe('zone-rouge');

  // « Remettre sur la carte » : il y revient.
  await aller(page, '#/reglages/emotions');
  await mesMots.getByRole('button', { name: /^Bouillonnant/ }).click();
  await mesMots.getByRole('button', { name: 'Remettre sur la carte', exact: true }).click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].archive).toBe(false);
  await expect(mesMots.getByRole('list', { name: 'Mis de côté', exact: true })).toHaveCount(0);

  // Flottant ne sert dans aucun relevé : « Effacer », confirmé ; Annuler d'abord ne fait rien.
  await mesMots.getByRole('button', { name: /^Flottant/ }).click();
  await expect(mesMots.getByRole('button', { name: 'Mettre de côté', exact: true })).toHaveCount(0);
  await mesMots.getByRole('button', { name: 'Effacer', exact: true }).click();
  const boite = page.getByRole('alertdialog', { name: 'Effacer « Flottant » ?' });
  await expect(boite).toBeVisible();
  await expect(boite.locator('.boite-texte')).toHaveText('Aucun relevé ne s\'en sert. Il quitte la carte et la loupe.');
  await boite.getByRole('button', { name: 'Annuler' }).click();
  expect(Object.keys(await lirePerso(page)())).toContain(FLOTTANT);
  await mesMots.getByRole('button', { name: 'Effacer', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Effacer' }).click();
  await expect.poll(async () => Object.keys(await lirePerso(page)())).toEqual([BOUILLONNANT]);
  await expect(mesMots.locator('.bouton-definition')).toHaveText([/^Bouillonnant/]);
});

test('un mot mis de côté qui ne sert plus (son relevé supprimé) : l\'aide et la confirmation ne parlent ni de ses relevés ni de la carte qu\'il a déjà quittée', async ({ page }) => {
  await ecrirePerso(page, DEUX_MOTS);
  const [releve] = await creer(page, [{ date: '2026-10-15', heure: '18:00', emotion: BOUILLONNANT, energie: 'energie:haute' }]);
  await aller(page, '#/reglages/emotions');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  await mesMots.getByRole('button', { name: /^Bouillonnant/ }).click();
  await expect(mesMots.getByText('Il sert dans un relevé : mis de côté, il quitte la carte et la loupe, et ses relevés le gardent.')).toBeVisible();
  await mesMots.getByRole('button', { name: 'Mettre de côté', exact: true }).click();
  await expect.poll(async () => (await lirePerso(page)())[BOUILLONNANT].archive).toBe(true);
  // Mis de côté et toujours utilisé : ses relevés le gardent ; il ne s'efface pas.
  await expect(mesMots.getByText('Il n\'est plus sur la carte ni dans la loupe ; ses relevés le gardent.')).toBeVisible();
  await expect(mesMots.getByRole('button', { name: 'Effacer', exact: true })).toHaveCount(0);

  // Son relevé supprimé, il ne sert plus : l'aide ne parle plus de relevés, et il peut s'effacer.
  await page.evaluate((id) => window.__carnet.repo.humeurs.supprimer(id), releve);
  await page.reload();
  await aller(page, '#/reglages/emotions');
  await mesMots.getByRole('button', { name: /^Bouillonnant/ }).click();
  const editeur = mesMots.getByRole('group', { name: 'Bouillonnant', exact: true });
  await expect(editeur.locator('.aide-carte')).toHaveText('Il n\'est plus sur la carte ni dans la loupe.');
  await expect(editeur.getByRole('button', { name: 'Remettre sur la carte', exact: true })).toBeVisible();
  await editeur.getByRole('button', { name: 'Effacer', exact: true }).click();
  // La confirmation ne dit pas qu'il quitte la carte : il n'y est plus.
  const boite = page.getByRole('alertdialog', { name: 'Effacer « Bouillonnant » ?' });
  await expect(boite.locator('.boite-texte')).toHaveText('Aucun relevé ne s\'en sert.');
  expect(trouverInterdits(await boite.textContent())).toEqual([]);
  await boite.getByRole('button', { name: 'Effacer' }).click();
  await expect.poll(async () => Object.keys(await lirePerso(page)())).toEqual([FLOTTANT]);
  await expect(mesMots.getByRole('list', { name: 'Mis de côté', exact: true })).toHaveCount(0);
});

test('un mot recréé à l\'import (« Mot sans libellé », sans couleur) : sous « Mis de côté » ; une couleur choisie, il peut revenir sur la carte', async ({ page }) => {
  const absent = 'roue:perso:u-99999999';
  await ecrirePerso(page, { [absent]: { libelle: 'Mot sans libellé', zone: null, famille: null, definition: null, archive: true, createdAt: '2026-10-10T08:00:00.000Z' } });
  await creer(page, [{ date: '2026-10-15', heure: '18:00', emotion: absent, energie: 'energie:basse' }]);
  await aller(page, '#/reglages/emotions');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  await expect(mesMots.getByRole('list', { name: 'Mis de côté', exact: true }).locator('.bouton-definition')).toHaveText(['Mot sans libellé Sans couleur · Sans famille']);
  await mesMots.getByRole('button', { name: /^Mot sans libellé/ }).click();
  await expect(mesMots.getByRole('button', { name: 'Remettre sur la carte', exact: true })).toHaveCount(0);
  await expect(mesMots.getByText('Choisis sa couleur pour le remettre sur la carte.')).toBeVisible();
  await nomMot(mesMots).fill('Retrouvé');
  await nomMot(mesMots).press('Enter');
  await expect.poll(async () => (await lirePerso(page)())[absent].libelle).toBe('Retrouvé');
  await couleurMot(mesMots, 'vert').click();
  await expect.poll(async () => (await lirePerso(page)())[absent].zone).toBe('vert');
  await mesMots.getByRole('button', { name: 'Remettre sur la carte', exact: true }).click();
  await expect.poll(async () => (await lirePerso(page)())[absent].archive).toBe(false);
  const vue = await ouvrir(page);
  await bulle(vue, 'vert').click();
  await expect(mot(vue, 'Retrouvé')).toHaveCount(1);
  // Le relevé n'a pas changé ; il porte le nom d'aujourd'hui.
  expect(await releves(page)()).toMatchObject([{ emotion: absent, energie: 'energie:basse' }]);
});

// Contre-relecture : un mot à soi qui n'est pas mis de côté mais n'a pas de couleur (une méta écrite à la main ; l'import
// le met maintenant de côté, sauvegarde.test.js). Le choix de sa couleur le faisait entrer sur la carte sans vérifier son
// nom : deux bulles « Calme ». Il y entre seulement avec un nom qu'aucun mot de la carte ne porte.
test('un mot sans couleur, pas mis de côté : sa couleur ne le met pas sur la carte sous un nom déjà pris ; renommé, il y entre', async ({ page }) => {
  const sansCouleur = 'roue:perso:u-99999998';
  await ecrirePerso(page, { [sansCouleur]: { libelle: 'Calme', zone: null, famille: null, definition: null, archive: false, createdAt: '2026-10-10T08:00:00.000Z' } });
  await aller(page, '#/reglages/emotions');
  const mesMots = page.getByRole('region', { name: 'Mes mots', exact: true });
  await mesMots.getByRole('button', { name: /^Calme/ }).click();
  await expect(mesMots.getByText('Choisis sa couleur pour le remettre sur la carte.')).toBeVisible();
  await couleurMot(mesMots, 'vert').click();
  await expect(mesMots.locator('.erreur-mot')).toHaveText('Ce mot est déjà sur la carte.');
  await page.clock.runFor(300);
  expect((await lirePerso(page)())[sansCouleur].zone).toBeNull();
  await nomMot(mesMots).fill('Calme à moi');
  await nomMot(mesMots).press('Enter');
  await expect.poll(async () => (await lirePerso(page)())[sansCouleur].libelle).toBe('Calme à moi');
  await couleurMot(mesMots, 'vert').click();
  await expect.poll(async () => (await lirePerso(page)())[sansCouleur].zone).toBe('vert');
  await expect(mesMots.locator('.erreur-mot')).toHaveText('');
  const vue = await ouvrir(page);
  await bulle(vue, 'vert').click();
  await expect(mot(vue, 'Calme')).toHaveCount(1);
  await expect(mot(vue, 'Calme à moi')).toHaveCount(1);
});
