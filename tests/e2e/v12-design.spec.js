import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v12 · Le design simple façon Apple (spec docs/superpowers/specs/2026-11-09-emozio-v12-design.md, §5).
// Tâche 3 : les jetons, l'accent vert B et les choix. Un choix fait est un aplat d'accent, son texte et sa coche ✓ en
// --sur-accent, en 600 : la coche reste, dans les deux thèmes (jamais la couleur seule). Un choix non fait est transparent,
// avec son contour. Rien ne change de taille au toucher. La roue, l'interrupteur et les champs passent au même système. Les
// écrans de l'émotion et « Réveil la nuit » n'ont pas d'accent. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00
// (390 × 844).
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
