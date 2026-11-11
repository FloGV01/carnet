import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons, oklch } from '../aides/couleurs.js';
import { vueMoment, noter, continuer, faisais } from '../aides/emotion.js';
import { stabiliser, verserControle, ciblesPetites, rondsAccent, accentHorsDeSaPlace, liensSurSurface2 } from '../aides/controle.js';

// v12 · Le design simple façon Apple (spec docs/superpowers/specs/2026-11-09-emozio-v12-design.md, §5).
// Tâche 3 : les jetons, l'accent vert B et les choix. Un choix fait est un aplat d'accent, son texte et sa coche ✓ en
// --sur-accent, en 600 : la coche reste, dans les deux thèmes (jamais la couleur seule). Un choix non fait est transparent,
// avec son contour. Rien ne change de taille au toucher. La roue, l'interrupteur et les champs passent au même système. Les
// écrans de l'émotion et « Réveil la nuit » n'ont pas d'accent. Tâche 4 : Aujourd'hui façon Apple (l'en-tête, les cartes sans
// carré coloré, la bande du bas, les onglets), sans couleur de rubrique, et la page du soir qui ne grandit pas de plus de
// 120 px. Tâche 5 : les autres écrans et les graphiques ; l'accent vert reste à sa place (la règle de forme et le point de
// vigilance 3 sont contrôlés sur tous les écrans du contrôle, v7-controle.spec.js ; ici, leurs contrôles eux-mêmes), les
// graphiques sont à l'encre, une seule action en aplat par vue. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const THEMES = [['light', clair], ['dark', sombre]];
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const contourDe = (t) => `${rgb(t.contour)} 0px 0px 0px 1px inset`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Chaque bouton d'un groupe : sa boîte, son style, sa coche (montrée ou non, sa taille, sa couleur) et ce qui bouge.
const choixDe = (loc) => loc.evaluate(async (g) => {
  await Promise.all(g.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  return [...g.querySelectorAll('button')].map((b) => {
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const coche = b.querySelector(':scope > .coche');
    const svg = coche && coche.querySelector('svg');
    const vue = Boolean(coche) && getComputedStyle(coche).display !== 'none';
    return {
      nom: b.textContent.trim(), presse: b.getAttribute('aria-pressed'), boite: [r.left, r.top, r.width, r.height].map((x) => Math.round(x * 2) / 2),
      fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight, contour: s.boxShadow, transform: s.transform,
      coche: vue && { taille: Math.round(svg.getBoundingClientRect().width), trait: svg.getAttribute('stroke'), couleur: getComputedStyle(svg).color,
        cachee: coche.getAttribute('aria-hidden') },
    };
  });
});

test('v12 (3/9) · un choix fait garde sa coche, en clair et en sombre : un aplat d\'accent, le texte et la coche en --sur-accent, en 600 ; non fait, transparent avec son contour ; rien ne change de taille', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    // Une grille (Lieu), un segmenté (Sommeil), un Oui / Non (Traitement pris).
    for (const [nom, choix] of [['Lieu', 'Congé / repos'], ['Sommeil', 'Bien'], ['Traitement pris', 'Partiel']]) {
      const quoi = `${schema} · ${nom} › ${choix}`;
      const avant = await choixDe(groupe(page, nom));
      for (const b of avant) {
        expect(b.presse, `${quoi} : ${b.nom}`).toBe('false');
        expect([b.fond, b.contour, b.graisse, b.coche], `${quoi} : ${b.nom}, non fait`).toEqual([TRANSPARENT, contourDe(t), '400', false]);
      }
      await toucher(page, nom, choix);
      const apres = await choixDe(groupe(page, nom));
      const fait = apres.find((b) => b.presse === 'true');
      expect(fait.nom, quoi).toContain(choix);
      expect([fait.fond, fait.texte, fait.graisse, fait.contour], quoi).toEqual([rgb(t.accent), rgb(t['sur-accent']), '600', 'none']);
      // La coche ✓ : au trait, de la couleur du texte, cachée aux lecteurs d'écran (aria-pressed dit l'état).
      expect(fait.coche, quoi).toEqual({ taille: 16, trait: 'currentColor', couleur: rgb(t['sur-accent']), cachee: 'true' });
      expect(contraste(fait.texte, fait.fond), quoi).toBeGreaterThanOrEqual(4.5);
      // Rien ne change de taille ni de place : ni le choix fait, ni ses voisins, et aucun rebond.
      expect(apres.map((b) => b.boite), quoi).toEqual(avant.map((b) => b.boite));
      expect(apres.map((b) => b.transform), quoi).toEqual(apres.map(() => 'none'));
      for (const b of apres.filter((x) => x.presse === 'false')) expect([b.fond, b.coche], `${quoi} : ${b.nom}`).toEqual([TRANSPARENT, false]);
    }
  }
});

test('v12 (3/9) · dans un parcours, un chiffre choisi garde sa coche, en 700, sans rebond : sa boîte ne bouge pas', async ({ page }) => {
  const id = await page.evaluate(async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', intensite: 7 })).id);
  await aller(page, `#/episode/${id}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: /^Intensité/ }).click();
  const cinq = fiche.getByRole('button', { name: 'Intensité 5' });
  await expect(cinq).toHaveAttribute('aria-pressed', 'false');
  // L'horloge arrêtée : l'étape reste à l'écran après le toucher (le passage à la suite attend un délai).
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  const avant = await cinq.boundingBox();
  await cinq.click();
  await expect(cinq).toHaveAttribute('aria-pressed', 'true');
  // Juste après le toucher : ni rebond ni agrandissement (seuls le fond et le texte passent en fondu).
  expect(await cinq.evaluate((b) => [b.getAnimations().filter((a) => a.animationName || !['background-color', 'color'].includes(a.transitionProperty)).length,
    getComputedStyle(b).transform])).toEqual([0, 'none']);
  expect(await cinq.boundingBox()).toEqual(avant);
  const s = await cinq.evaluate(async (b) => {
    await Promise.all(b.getAnimations().map((a) => a.finished.catch(() => {})));
    return [getComputedStyle(b).backgroundColor, getComputedStyle(b).fontWeight, getComputedStyle(b.querySelector('.coche')).display !== 'none'];
  });
  expect(s).toEqual([rgb(clair.accent), '700', true]);
});

test('v12 (3/9) · la roue : une piste au contour, une fenêtre neutre ; notée, un aplat d\'accent ; les champs, transparents au contour, un anneau d\'accent au focus, le micro en accent', async ({ page }) => {
  const roue = groupe(page, 'Durée de la nuit');
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const piste = await roue.evaluate((g) => [getComputedStyle(g).backgroundColor, getComputedStyle(g).boxShadow, getComputedStyle(g, '::before').backgroundColor]);
    expect(piste, schema).toEqual([rgb(t.piste), contourDe(t), rgb(t.fenetre)]);
    // Le champ des points positifs, transparent au contour ; au focus, l'anneau d'accent ; le micro en accent.
    const champ = page.locator('#points-positifs');
    expect(await champ.evaluate((c) => [getComputedStyle(c).backgroundColor, getComputedStyle(c).boxShadow]), schema).toEqual([TRANSPARENT, contourDe(t)]);
    await champ.focus();
    expect(await champ.evaluate((c) => [getComputedStyle(c).borderTopColor, getComputedStyle(c).boxShadow]), schema)
      .toEqual([rgb(t.accent), `${rgb(t.accent)} 0px 0px 0px 1px`]);
    const micro = page.locator('.champ-avec-dicter', { has: champ }).getByRole('button', { name: 'Dicter' });
    expect(await micro.evaluate((b) => getComputedStyle(b).color), schema).toBe(rgb(t['accent-texte']));
    await champ.blur();
  }
});

test('v12 (3/9) · l\'interrupteur, comme sur iOS : allumé, un rail d\'accent et un bouton blanc ; éteint, un rail neutre au contour', async ({ page }) => {
  await aller(page, '#/reglages/journee');
  const inter = page.getByRole('switch', { name: 'Afficher Mes gratitudes' });
  await expect(inter).toHaveAttribute('aria-checked', 'true');
  const style = () => inter.evaluate(async (b) => {
    await Promise.all(b.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
    const k = b.querySelector('.interrupteur-bouton');
    return [getComputedStyle(b).backgroundColor, getComputedStyle(b).borderTopColor, getComputedStyle(k).backgroundColor];
  });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    expect(await style(), `${schema} : allumé`).toEqual([rgb(t.accent), rgb(t.accent), 'rgb(255, 255, 255)']);
    await inter.click();
    await expect(inter).toHaveAttribute('aria-checked', 'false');
    expect(await style(), `${schema} : éteint`).toEqual([rgb(t['surface-2']), rgb(t.contour), rgb(t.contour)]);
    await inter.click();
    await expect(inter).toHaveAttribute('aria-checked', 'true');
  }
});

// Le point de vigilance 3, pour les jetons : l'accent, lu sur l'écran rendu, est l'encre des écrans de l'émotion et le gris
// de la nuit, jamais le vert (la tâche 5 lit chaque élément de ces écrans).
test('v12 (3/9) · pas d\'accent sur les écrans de l\'émotion ni sur « Réveil la nuit » : l\'accent y est l\'encre, en clair et en sombre', async ({ page }) => {
  const lire = (loc) => loc.evaluate((e) => ['--accent', '--sur-accent', '--accent-texte', '--action', '--action-on'].map((n) => getComputedStyle(e).getPropertyValue(n).trim().toLowerCase()));
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await aller(page, '#/moment');
    const moment = page.locator('.moment-plein');
    await expect(moment).toBeVisible();
    expect(await lire(moment), schema).toEqual([t['moment-plein'], t['moment-plein-on'], t['moment-plein'], t['moment-plein'], t['moment-plein-on']]);
    await page.getByRole('dialog', { name: 'Émotion du moment' }).getByRole('button', { name: 'Fermer', exact: true }).click();
    await aller(page, '#/aujourdhui');
    await aller(page, '#/crise/reveil-nuit');
    const nuit = page.locator('.parcours.ecran-noir');
    await expect(nuit).toBeVisible();
    expect(await lire(nuit), schema).toEqual(['#8e8f92', '#000000', '#8e8f92', '#8e8f92', '#000000']);
    await nuit.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
});

// Relecture de la tâche 3 : en annulant --contour dans les écrans de l'émotion, la carte « Pour récupérer, je… » de l'écran 3
// perdait le cercle de sa respiration (un rond pâle sur la carte, à 1,16:1) et la forme de « Arrêter » (fond de la carte, sans
// contour : un mot seul). Comme en v11, sans accent : le cercle est cerclé à l'encre, et « Arrêter » a le fond --surface-2.
test('v12 (3/9) · l\'écran 3 de l\'émotion, carte « Pour récupérer, je… » : le cercle de la respiration cerclé à l\'encre (3:1 au moins sur la carte, jamais vert), « Arrêter » garde sa forme, en clair et en sombre', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await page.evaluate(async () => {
      const m = window.__carnet.repo.meta;
      await m.ecrire('monPlan', { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge\nje ferme les yeux', siAlors: [] });
      await m.ecrire('ressourcer', { energieBasse: true });
    });
    await aller(page, '#/moment');
    const vue = vueMoment(page);
    await noter(vue, 'bleu', 'Vide');
    await continuer(vue).click();
    await expect(faisais(vue)).toBeVisible();
    const carte = vue.getByRole('region', { name: 'Pour récupérer, je…' });
    await carte.getByRole('button', { name: 'Respirer', exact: true }).click();
    const arreter = carte.getByRole('button', { name: 'Arrêter', exact: true });
    await expect(arreter).toBeVisible();
    const mesure = () => carte.evaluate((c) => {
      const s = (e) => getComputedStyle(e);
      const cercle = c.querySelector('.cercle-respiration span');
      const b = [...c.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Arrêter');
      return { carte: s(c).backgroundColor, bord: [s(cercle).borderTopWidth, s(cercle).borderTopStyle, s(cercle).borderTopColor],
        arreter: b && { fond: s(b).backgroundColor, contour: s(b).boxShadow } };
    });
    const m = await mesure();
    const quoi = `${schema} · respiration en cours`;
    expect(m.carte, quoi).toBe(rgb(t.surface));
    // Le cercle : un bord opaque, à l'encre des écrans de l'émotion (le plein des ronds, comme en v11), lisible sur la carte.
    expect(m.bord, quoi).toEqual(['2px', 'solid', rgb(t['moment-plein'])]);
    expect(contraste(m.bord[2], m.carte), quoi).toBeGreaterThanOrEqual(3);
    expect(m.bord[2], `${quoi} : jamais l'accent`).not.toBe(rgb(t.accent));
    // « Arrêter » : un bouton neutre, au fond --surface-2 dans la carte (sans contour dans ces écrans), comme en v11.
    expect(m.arreter.fond, quoi).not.toBe(m.carte);
    expect(m.arreter.fond, quoi).toBe(rgb(t['surface-2']));
    // Arrêtée : le cercle reste cerclé.
    await arreter.click();
    await expect(carte.getByRole('button', { name: 'Commencer', exact: true })).toBeVisible();
    expect((await mesure()).bord, `${schema} · arrêtée`).toEqual(['2px', 'solid', rgb(t['moment-plein'])]);
  }
});

// ---------- Tâche 4 : Aujourd'hui façon Apple ----------

// La hauteur de la page du soir en v11 (b9870dd, mesurée le 10/11/2026 dans WebKit) : remplie comme le contrôle global
// (verserControle), à 390 × 844, au texte par défaut, sans zones sûres, document.documentElement.scrollHeight.
const HAUTEUR_SOIR_V11 = 1611;

test('v12 (4/9) · la page du soir, remplie comme le contrôle, grandit de 120 px au plus depuis la v11 (390 × 844, texte par défaut), en clair et en sombre', async ({ page }) => {
  await verserControle(page);
  for (const [schema] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    // Tout ce que la page montre ce soir-là : les trois relevés, la ligne Après coup et le prochain rendez-vous.
    await expect(page.locator('.liste-evenements > li')).toHaveCount(3);
    await expect(page.locator('.ligne-apres-coup-jour')).toBeVisible();
    await expect(page.locator('.ligne-rdv')).toBeVisible();
    await stabiliser(page);
    const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(hauteur - HAUTEUR_SOIR_V11, `${schema} : ${hauteur} px, contre ${HAUTEUR_SOIR_V11} en v11`).toBeLessThanOrEqual(120);
  }
});

// toHaveAccessibleName calcule le nom à la façon de Playwright, sans text-transform : il lirait « Jeudi 15 octobre » même si
// le navigateur exposait les capitales du sur-titre, comme Chromium (« Aujourd'hui, JEUDI 15 OCTOBRE », relecture de la
// tâche 4). Le nom est donc posé en toutes lettres par l'aria-label du h1, et le test le lit aussi : il est en casse normale,
// alors que le sur-titre s'affiche en capitales.
test('v12 (4/9) · le nom accessible de l\'en-tête ne change pas : « Aujourd\'hui, Jeudi 15 octobre », après minuit aussi, et « Mercredi 14 octobre » un autre jour, ouvert aussi depuis l\'Historique ; l\'aria-label du h1 le donne, en casse normale', async ({ page }) => {
  const titre = page.getByRole('heading', { level: 1 });
  const nomPose = async (nom) => {
    await expect(titre).toHaveAccessibleName(nom);
    await expect(titre).toHaveAttribute('aria-label', nom);
    expect(await titre.locator('.sur-titre').evaluate((e) => getComputedStyle(e).textTransform), nom).toBe('uppercase');
  };
  await nomPose('Aujourd\'hui, Jeudi 15 octobre');
  await expect(titre.locator('.grand-titre')).toHaveText('Aujourd\'hui, ');
  await expect(titre.locator('.sur-titre')).toHaveText('Jeudi 15 octobre');
  // Le grand titre est dessous à l'écran, mais d'abord dans le DOM : le texte se lit dans l'ordre du nom.
  expect(await titre.evaluate((h) => [...h.children].map((e) => e.className))).toEqual(['grand-titre', 'sur-titre']);
  await aller(page, '#/jour/2026-10-14');
  await nomPose('Mercredi 14 octobre');
  await expect(titre.locator('.grand-titre')).toHaveText('Mercredi 14');
  await expect(titre.locator('.sur-titre')).toHaveText('octobre');
  // Le 1er du mois.
  await aller(page, '#/jour/2026-10-01');
  await nomPose('Jeudi 1er octobre');
  await aller(page, '#/historique/jour/2026-10-14');
  await expect(page.getByRole('button', { name: 'Retour' })).toBeVisible();
  await nomPose('Mercredi 14 octobre');
  // Entre 0 h et 4 h, c'est encore jeudi.
  await page.clock.setSystemTime(new Date(2026, 9, 16, 1, 30));
  await aller(page, '#/aujourdhui');
  await page.reload();
  await nomPose('Aujourd\'hui, Jeudi 15 octobre');
});

// La couleur ne dit qu'une émotion (spec §5.1 et §5.6) : sur Aujourd'hui, bande du bas et onglets compris, chaque couleur
// peinte (texte, fond, bord, ombre, remplissage et trait d'une icône) est un gris, ou l'accent (choisi, agir, onglet actif,
// liens). Seuls les repères des émotions (.zone-*, les points du jour) ont leur couleur.
test('v12 (4/9) · aucune couleur de rubrique sur Aujourd\'hui : hors des zones des émotions, chaque couleur peinte est un gris ou l\'accent, en clair et en sombre', async ({ page }) => {
  await verserControle(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.episodes.creer({ date: '2026-10-15', heure: '18:40', emotion: 'emotion:colere', intensite: 6 });
    await r.symptomes.creer({ date: '2026-10-15', symptome: 'symptome:ruminations', intensite: 4 });
  });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.locator('.liste-evenements > li')).toHaveCount(5);
    // Des choix faits (Lieu, Sommeil, Traitement, la roue de la nuit), un détail ouvert, un repli ouvert.
    await toucher(page, 'Contact humain', 'Oui');
    await page.getByRole('button', { name: 'Sport en détail' }).click();
    await page.getByRole('button', { name: /^Ce qui a pesé/ }).click();
    await stabiliser(page);
    const peintes = await page.evaluate(() => {
      const res = [];
      const nom = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}`;
      for (const racine of [document.querySelector('main.aujourdhui'), document.querySelector('nav.onglets')]) {
        for (const el of [racine, ...racine.querySelectorAll('*')]) {
          if (el.closest('.zones-jour, .zone-rouge, .zone-jaune, .zone-bleu, .zone-vert')) continue;
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          const couleurs = [['color', s.color], ['background', s.backgroundColor], ['fill', s.fill], ['stroke', s.stroke],
            ...['Top', 'Right', 'Bottom', 'Left'].filter((c) => s[`border${c}Width`] !== '0px' && s[`border${c}Style`] !== 'none').map((c) => [`border-${c}`, s[`border${c}Color`]]),
            ...(s.boxShadow.match(/rgba?\([^)]*\)/g) || []).map((c) => ['box-shadow', c])];
          for (const [prop, c] of couleurs) if (/^rgba?\(/.test(c)) res.push([nom(el), prop, c]);
        }
      }
      return res;
    });
    const accent = new Set([rgb(t.accent), rgb(t['sur-accent']), rgb(t['accent-texte'])]);
    const alpha = (c) => { const m = c.match(/[\d.]+/g); return m.length > 3 ? Number(m[3]) : 1; };
    const fautes = peintes.filter(([, , c]) => alpha(c) > 0 && oklch(c).C >= 0.02 && !accent.has(`rgb(${canaux(c).join(', ')})`));
    expect(fautes, schema).toEqual([]);
    // L'accent sert bien : un choix fait, l'onglet actif, Émotion.
    expect(peintes.some(([n, p, c]) => n.startsWith('a.action-bande.moment') && p === 'background' && c === rgb(t.accent)), schema).toBe(true);
    expect(peintes.some(([n, p, c]) => n === 'a.onglet' && p === 'color' && c === rgb(t['accent-texte'])), schema).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
});

// Le point de vigilance 4, pour Aujourd'hui : en très grand texte, le grand titre est plafonné à 48 px ; l'en-tête, la bande
// du bas et « Congé / repos » choisi, avec sa coche, ne débordent pas de côté (rien hors de l'écran, aucun texte hors de sa
// boîte, sauf l'ellipse voulue d'« Émotion » et du résumé). Relecture de la tâche 4 : aujourd'hui et deux jours passés
// (« Mercredi 14 » sous OCTOBRE, « Mercredi 30 » sous SEPTEMBRE, les plus longs), de 17 à 53 px, AX2 (33) et AX4 (47)
// compris : ‹ et › restent ensemble, sur la même rangée, › à droite de ‹ et contre le bord droit (chacun à part, › passait
// seul à la ligne, à gauche sous le titre) ; chaque action de la bande garde une cible de 44 sur 44 (« Moment difficile »
// réduit à son icône ne faisait que 40 de large) ; « nuit dernière » ne sort pas de sa carte, et la page ne défile pas de
// côté jusqu'à 40 px (au-delà, « Télétravail », d'un seul mot, déborde déjà en v11).
test('v12 (4/9) · point de vigilance 4 : en très grand texte (17 à 53, 390 et 375, aujourd\'hui et deux jours passés), le grand titre plafonné à 48 px ; l\'en-tête, la bande et « Congé / repos » avec sa coche ne débordent pas de côté ; ‹ et › restent ensemble à droite ; les actions de la bande gardent 44 de large', async ({ page }) => {
  const titre = page.getByRole('heading', { level: 1 });
  for (const [jour, nom] of [[null, 'Aujourd\'hui, Jeudi 15 octobre'], ['2026-10-14', 'Mercredi 14 octobre'], ['2026-09-30', 'Mercredi 30 septembre']]) {
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; document.body.style.fontSize = ''; });
    await page.setViewportSize({ width: 390, height: 844 });
    if (jour) await aller(page, `#/jour/${jour}`);
    await expect(titre).toHaveAccessibleName(nom);
    await toucher(page, 'Lieu', 'Congé / repos');
    await expect(groupe(page, 'Lieu').getByRole('button', { name: /Congé \/ repos/ })).toHaveAttribute('aria-pressed', 'true');
    for (const largeur of [390, 375]) {
      await page.setViewportSize({ width: largeur, height: 844 });
      for (const px of [17, 23, 25, 28, 33, 36, 40, 47, 53]) {
        await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; document.body.style.fontSize = `${x}px`; window.scrollTo(0, 0); }, px);
        const quoi = `${jour || 'aujourd\'hui'} · ${largeur} · ${px} px`;
        const m = await page.evaluate(() => {
          const fautes = [];
          const coupe = (el) => getComputedStyle(el).textOverflow === 'ellipsis';
          const verifier = (el, boite) => {
            const r = el.getBoundingClientRect();
            if (!r.width) return;
            if (r.left < -0.5 || r.right > innerWidth + 0.5) fautes.push(`${el.className || el.tagName} hors de l'écran`);
            if (boite && (r.left < boite.left - 0.5 || r.right > boite.right + 0.5)) fautes.push(`${el.className || el.tagName} hors de sa boîte`);
            // Un texte qui dépasse de sa boîte (un élément qui porte du texte ; la cible de ‹ ›, qui déborde exprès de 4 px sur la
            // marge, n'en est pas un).
            const texte = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (texte && el.scrollWidth > el.clientWidth + 1 && !coupe(el)) fautes.push(`${el.className || el.tagName} : texte qui déborde`);
          };
          for (const el of document.querySelectorAll('.entete-jour, .entete-jour *, .actions-flottantes, .actions-flottantes *')) if ((!(el instanceof SVGElement) || el.tagName === 'svg') && el.tagName !== 'INPUT') verifier(el);
          const conge = [...document.querySelectorAll('[aria-label="Lieu"] button')].find((b) => b.textContent.includes('Congé'));
          const carte = conge.closest('.carte-champ').getBoundingClientRect();
          for (const el of [conge, ...conge.querySelectorAll('*')]) if (!(el instanceof SVGElement) || el.tagName === 'svg') verifier(el, carte);
          const sous = document.querySelector('.rubrique-sous');
          verifier(sous, sous.closest('.carte-champ').getBoundingClientRect());
          const coche = conge.querySelector('.coche');
          const [prec, suiv] = [...document.querySelectorAll('.nav-jour')].map((b) => b.getBoundingClientRect());
          const ligne = document.querySelector('.ligne-jour').getBoundingClientRect();
          return { fautes, grand: Number.parseFloat(getComputedStyle(document.querySelector('.grand-titre')).fontSize),
            coche: Boolean(coche) && getComputedStyle(coche).display !== 'none',
            navs: { rangee: Math.abs(prec.top - suiv.top) < 0.5, ordre: suiv.left >= prec.right - 0.5, bord: Math.abs(suiv.right - ligne.right) < 0.5 },
            actions: [...document.querySelectorAll('.actions-flottantes > a')].map((a) => [a.getAttribute('aria-label') || a.textContent.trim(),
              Math.round(a.getBoundingClientRect().width), Math.round(a.getBoundingClientRect().height)]),
            deCote: document.documentElement.scrollWidth > innerWidth };
        });
        expect(m.fautes, quoi).toEqual([]);
        expect(m.grand, quoi).toBe(Math.min(2 * px, 48));
        expect(m.coche, `${quoi} : la coche de « Congé / repos »`).toBe(true);
        expect(m.navs, `${quoi} : ‹ et › ensemble, à droite`).toEqual({ rangee: true, ordre: true, bord: true });
        // Un jour passé n'a pas d'Émotion : « Moment difficile » et « + Épisode ».
        expect(m.actions.length, quoi).toBe(jour ? 2 : 3);
        for (const [action, large, haut] of m.actions) expect(large >= 44 && haut >= 44, `${quoi} : « ${action} », ${large} × ${haut}, une cible de 44 sur 44`).toBe(true);
        // Ce qu'un doigt de 44 pt touche vraiment : chaque action de la bande, tout entière.
        expect(await ciblesPetites(page, '.actions-flottantes'), quoi).toEqual([]);
        if (px <= 40) expect(m.deCote, `${quoi} : la page ne défile pas de côté`).toBe(false);
      }
    }
  }
});


// ---------- Tâche 5 : les autres écrans et les graphiques ----------

// Les contrôles de l'accent (tests/aides/controle.js), qui passent sur chaque écran du contrôle global, voient pour de bon ce
// qu'ils cherchent : un point ou un disque vert sans texte ni icône, un rond d'un SVG à l'accent, l'accent dans un graphique,
// un lien vert sur --surface-2 ; et laissent passer un rond qui porte une icône (une commande) et un contrôle autour d'un
// graphique.
test('v12 (5/9) · les contrôles de l\'accent voient pour de bon un point vert, l\'accent dans un graphique et un lien vert sur --surface-2, et laissent passer une commande ronde à icône', async ({ page }) => {
  const accents = [rgb(clair.accent), rgb(clair['accent-texte'])];
  const verifier = async () => ({
    ronds: await rondsAccent(page, accents), lieux: await accentHorsDeSaPlace(page, accents),
    liens: await liensSurSurface2(page, rgb(clair['accent-texte']), rgb(clair['surface-2'])),
  });
  await verserControle(page);
  await aller(page, '#/analyse');
  await expect(page.locator('main')).not.toContainText('Calcul…', { timeout: 30000 });
  await expect(page.locator('figure.graphe').first()).toBeVisible();
  await stabiliser(page);
  expect(await verifier()).toEqual({ ronds: [], lieux: [], liens: [] });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    const el = (balise, classe, style, parent = main) => {
      const e = document.createElement(balise);
      e.className = classe;
      e.style.cssText = style;
      parent.append(e);
      return e;
    };
    el('i', 'essai-point', 'display: block; width: 10px; height: 10px; background: var(--accent);');
    el('div', 'essai-disque', 'width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--accent-texte);');
    const commande = el('button', 'essai-commande', 'width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--accent);');
    commande.append(document.querySelector('.onglets svg').cloneNode(true));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'essai-svg');
    svg.innerHTML = '<circle class="essai-rond" cx="6" cy="6" r="4" />';
    main.append(svg);
    svg.firstChild.style.fill = 'var(--accent)';
    const figure = document.querySelector('figure.graphe');
    el('span', 'essai-graphe', 'color: var(--accent-texte);', figure).textContent = 'vert';
    el('button', 'essai-controle', 'color: var(--accent-texte);', figure).textContent = 'Voir';
    el('span', 'essai-lien', 'color: var(--accent-texte);', el('div', 'essai-fond', 'background: var(--surface-2);')).textContent = 'Voir ce jour';
  });
  const f = await verifier();
  expect([...new Set(f.ronds.map((x) => x.split(' ')[0]))].sort()).toEqual(['circle.essai-rond', 'div.essai-disque', 'i.essai-point']);
  expect(f.lieux).toEqual(['graphe › span.essai-graphe : color à l\'accent']);
  expect(f.liens).toEqual(['« Voir ce jour » (span.essai-lien) : un lien vert sur --surface-2']);
});

// Spec §5.5 : la couleur ne dit qu'une émotion. Hors des zones et des familles, un graphique est à l'encre (--donnee*), jamais
// à l'accent ; ses séries se distinguent par leur forme et leur rampe : le pas le plus discret d'une rampe (nuit Mal, énergie
// basse) a un contour à 3:1 au moins sur la carte, et « peu de valeurs » est une barre creuse au contour à 3:1 au moins, sur la
// carte comme sur la piste (au lieu d'une barre pâlie à 0,45, 2,25:1).
test('v12 (5/9) · les graphiques sont à l\'encre : les séries de Mes jours se distinguent par leur forme, le pas discret des rampes a un contour à 3:1, « peu de valeurs » est une barre creuse au contour à 3:1, en clair et en sombre', async ({ page }) => {
  await verserControle(page);
  const neutre = (c) => c === 'none' || /rgba\(0, 0, 0, 0\)/.test(c) || oklch(c).C < 0.02;
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await aller(page, '#/analyse');
    await expect(page.locator('main')).not.toContainText('Calcul…', { timeout: 30000 });
    const mesJours = page.locator('figure.graphe', { hasText: 'Mes jours' });
    await expect(mesJours.locator('svg[role="img"]')).toBeVisible();
    const m = await mesJours.evaluate((f) => {
      const s = (e) => getComputedStyle(e);
      const serie = (sel) => [...f.querySelectorAll(sel)].map((e) => ({ forme: e.tagName, fill: s(e).fill, stroke: s(e).stroke }));
      return {
        carte: s(f).backgroundColor,
        series: {
          notes: serie('svg[role="img"] g.g-notes > circle'), nuits: serie('svg[role="img"] rect[class^="g-sommeil-"]'),
          explosions: serie('g.g-explosions > rect'), energie: serie('g.g-energie-basse > rect'), seances: serie('g.g-seances > polygon'),
        },
        rampe: [1, 2, 3].map((i) => s(f.querySelector(`.pas-rampe rect.g-sommeil-${i}`)).fill),
        discrets: [...f.querySelectorAll('rect.g-sommeil-1')].map((e) => [s(e).stroke, s(e).strokeWidth]),
      };
    });
    // Chaque série a sa forme : un point (rond) par note, une barre par nuit, une encoche par explosion, une barre par jour
    // d'énergie basse, un losange par séance de Bien-être.
    const formes = Object.fromEntries(Object.entries(m.series).map(([k, v]) => [k, [...new Set(v.map((x) => x.forme))]]));
    expect(formes, schema).toEqual({ notes: ['circle'], nuits: ['rect'], explosions: ['rect'], energie: ['rect'], seances: ['polygon'] });
    for (const [k, v] of Object.entries(m.series)) {
      for (const x of v) expect([x.fill, x.stroke].filter((c) => !neutre(c)), `${schema} · ${k} : à l'encre`).toEqual([]);
    }
    // La rampe des nuits : les trois pas de l'encre, distincts ; le pas discret, cerclé du pas suivant, à 3:1 sur la carte.
    expect(m.rampe, schema).toEqual([rgb(t['donnee-1']), rgb(t['donnee-2']), rgb(t['donnee-3'])]);
    expect(m.discrets.length, schema).toBeGreaterThan(1);
    for (const [trait, largeur] of m.discrets) {
      expect([trait, largeur], schema).toEqual([rgb(t['donnee-2']), '1px']);
      expect(contraste(trait, m.carte), `${schema} : contour du pas discret`).toBeGreaterThanOrEqual(3);
    }
    // Ta journée : l'énergie en rampe de l'encre, son pas discret cerclé de même.
    const journee = page.locator('figure.graphe', { hasText: 'Ta journée heure par heure' });
    const energie = await journee.evaluate((f) => [1, 2, 3].map((i) => { const r = f.querySelector(`.pas-rampe rect.g-energie-${i}`); return [getComputedStyle(r).fill, getComputedStyle(r).stroke]; }));
    expect(energie.map((x) => x[0]), schema).toEqual([rgb(t['donnee-1']), rgb(t['donnee-2']), rgb(t['donnee-3'])]);
    expect(energie[0][1], schema).toBe(rgb(t['donnee-2']));
    expect(contraste(energie[0][1], m.carte), schema).toBeGreaterThanOrEqual(3);
    // « Peu de valeurs », dans « Avant mes jours à énergie basse » : une barre creuse, jamais pâlie.
    await aller(page, '#/comprendre/energie');
    const avant = page.locator('figure.graphe', { hasText: 'Avant mes jours à énergie basse' });
    await expect(avant.locator('rect.g-barre-creuse').first()).toBeVisible();
    const creuses = await avant.evaluate((f) => ({
      carte: getComputedStyle(f).backgroundColor, piste: getComputedStyle(f.querySelector('rect.g-piste')).fill, pales: f.querySelectorAll('.g-peu').length,
      legende: Boolean([...f.querySelectorAll('.legende-graphe > span')].find((x) => x.textContent.includes('peu de valeurs') && x.querySelector('rect.g-barre-creuse'))),
      barres: [...f.querySelectorAll('rect.g-barre-creuse')].map((r) => [getComputedStyle(r).fill, getComputedStyle(r).stroke, getComputedStyle(r).opacity]),
    }));
    expect([creuses.pales, creuses.legende], schema).toEqual([0, true]);
    for (const [fond, trait, opacite] of creuses.barres) {
      expect([fond, trait, opacite], schema).toEqual([rgb(t.surface), rgb(t.donnee), '1']);
      expect(contraste(trait, creuses.carte), `${schema} : peu de valeurs, sur la carte`).toBeGreaterThanOrEqual(3);
      expect(contraste(trait, creuses.piste), `${schema} : peu de valeurs, sur la piste`).toBeGreaterThanOrEqual(3);
    }
  }
});

// Les aplats d'accent d'une vue : les éléments visibles peints à l'accent (hors des choix faits), dans l'écran ou le parcours.
const aplats = (page, accent) => page.evaluate((acc) => [...document.querySelectorAll('main *, .parcours *')]
  .filter((e) => e.getClientRects().length && getComputedStyle(e).backgroundColor === acc && !e.closest('[aria-pressed="true"]'))
  .map((e) => e.getAttribute('aria-label') || e.textContent.trim()), accent);
// Les rangées d'une liste : l'icône (place, fond, couleur) et le chevron.
const rangees = (loc) => loc.evaluate((ul) => [...ul.querySelectorAll('.ligne-carte')].map((a) => {
  const i = a.querySelector('.icone-ligne');
  return { texte: a.textContent.trim(), fond: getComputedStyle(i).backgroundColor, icone: getComputedStyle(i.querySelector('svg')).color,
    chevron: getComputedStyle(a.querySelector(':scope > svg:last-child')).color };
}));

// Spec §5.4 : une seule action en aplat par vue, « Reprendre » dans Bien-être et « Commencer » dans Moment difficile ; les petits
// ▶ des favoris et des listes deviennent une icône d'accent sans fond. Les rangées qui ouvrent quelque chose ont leur icône à
// l'accent, sans carré, et leur chevron en --contour. « Faite le… » du Programme est à l'encre (§5.3 : jamais un « fait » vert).
test('v12 (5/9) · une seule action en aplat par vue : « Reprendre » dans Bien-être, « Commencer » dans Moment difficile ; les ▶ des favoris et des listes, une icône d\'accent sans fond ; les entrées à l\'icône d\'accent ; « Faite le… » à l\'encre, en clair et en sombre', async ({ page }) => {
  await verserControle(page);
  await page.evaluate(async () => {
    localStorage.setItem('carnet:bien-etre:dernier', JSON.stringify('expiration-longue'));
    await window.__carnet.repo.meta.ecrire('favorisBienEtre', ['soupir', 'sons-de-fond']);
  });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await aller(page, '#/bien-etre');
    const entrees = page.getByRole('list', { name: 'Entrées' });
    await expect(entrees.getByRole('link')).toHaveCount(5);
    await expect(page.locator('.bien-etre .ligne-element')).toHaveCount(2);
    expect(await aplats(page, rgb(t.accent)), schema).toEqual(['Commencer Expiration longue']);
    const petits = await page.locator('.bien-etre .bouton-lecture.petit').evaluateAll((l) => l.map((b) => [getComputedStyle(b).backgroundColor, getComputedStyle(b).color,
      Math.round(b.getBoundingClientRect().width)]));
    expect(petits, schema).toEqual([[TRANSPARENT, rgb(t['accent-texte']), 48], [TRANSPARENT, rgb(t['accent-texte']), 48]]);
    for (const r of await rangees(entrees)) {
      expect([r.fond, r.icone, r.chevron], `${schema} · ${r.texte}`).toEqual([TRANSPARENT, rgb(t['accent-texte']), rgb(t.contour)]);
    }
    // Une liste d'entrée : aucun aplat, ses ▶ en icônes d'accent.
    await aller(page, '#/bien-etre/calmer');
    await expect(page.locator('.entree-bien-etre .ligne-element').first()).toBeVisible();
    expect(await aplats(page, rgb(t.accent)), schema).toEqual([]);
    // Le Programme : « Faite le… » et sa coche à l'encre.
    await aller(page, '#/bien-etre/programme');
    const faite = page.locator('.programme .seance-faite').first();
    await expect(faite).toContainText('Faite le');
    expect(await faite.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.querySelector('svg')).color]), schema).toEqual([rgb(t['text-2']), rgb(t.text)]);
    // Moment difficile : « Commencer » seul en aplat ; les exercices courts neutres ; Mon plan, son icône en --text-2.
    await aller(page, '#/aujourdhui');
    await aller(page, '#/moment-difficile');
    const vue = page.getByRole('dialog', { name: 'Moment difficile' });
    await expect(vue.getByRole('button', { name: 'Commencer', exact: true })).toBeVisible();
    expect(await aplats(page, rgb(t.accent)), schema).toEqual(['Commencer']);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
});

// Spec §5.3 : le curseur de volume, comme sur iOS, sa partie remplie à l'accent jusqu'au bouton, blanc. WebKit ne donne pas le
// style calculé des pseudo-éléments du curseur : on lit la part remplie (--part, posée par sons.js) et la feuille de style.
test('v12 (5/9) · le volume des sons de fond, comme sur iOS : la part remplie de la piste suit la valeur, à l\'accent ; le bouton est blanc', async ({ page }) => {
  await aller(page, '#/sons');
  const volume = page.getByRole('slider', { name: 'Volume' });
  await expect(volume).toHaveValue('0.5');
  const part = () => volume.evaluate((i) => i.style.getPropertyValue('--part'));
  expect(await part()).toBe('0.474');
  await volume.fill('1');
  await expect.poll(part).toBe('1');
  await volume.fill('0.05');
  await expect.poll(part).toBe('0');
  const regles = await page.evaluate(() => {
    const toutes = [...document.styleSheets].flatMap((f) => [...f.cssRules]);
    const de = (pseudo) => toutes.find((r) => r.selectorText && r.selectorText.includes('.reglage-volume') && r.selectorText.includes(pseudo));
    return { piste: de('slider-runnable-track').style.getPropertyValue('background-image') || de('slider-runnable-track').style.background,
      bouton: de('slider-thumb').style.backgroundColor };
  });
  expect(regles.piste).toContain('var(--accent) var(--rempli)');
  expect(regles.piste).toContain('var(--contour) var(--rempli)');
  expect(regles.bouton).toBe('rgb(255, 255, 255)');
});
