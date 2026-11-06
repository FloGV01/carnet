import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, entreeDuJour, glisser, glisserRoue } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { cacher, montrer } from '../aides/lecteur.js';

// v11 (2/11) · La roue et le Sommeil (spec §5) : la durée de la nuit sur une roue couchée, toujours visible, sous
// Mal · Moyen · Bien, par demi-heure. Vide : rien de marqué, centrée sur 7 h, jamais la nuit de la veille. Glisser note la
// valeur au centre à l'arrêt ; toucher note et centre ; retoucher efface. Le point de vigilance 1 : ce qui n'est pas un
// glissement n'écrit rien, un glissement n'efface jamais, un toucher éteint le geste en cours, une valeur en attente
// s'écrit sur son jour. Accessibilité : de vrais boutons, 4,5:1 sous le fondu des bords, de 17 à 53 px de texte. Données
// inventées.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-15';
const VEILLE = '2026-10-14';
const VALEURS = ['4 h ou moins', '4 h 30', '5 h', '5 h 30', '6 h', '6 h 30', '7 h', '7 h 30', '8 h', '8 h 30', '9 h', '9 h 30', '10 h ou plus'];
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const THEMES = [['light', clair], ['dark', sombre]];
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const roue = (page) => groupe(page, 'Durée de la nuit');
const valeur = (page, nom) => roue(page).getByRole('button', { name: nom, exact: true });
const presses = (page) => roue(page).locator('[aria-pressed="true"]');
// L'écart (px) entre le centre d'une valeur et le milieu de la bande.
const ecartAuMilieu = (page, nom) => valeur(page, nom).evaluate((b) => {
  const [d, r] = [b.closest('.roue-defile').getBoundingClientRect(), b.getBoundingClientRect()];
  return Math.abs(r.left + r.width / 2 - (d.left + d.width / 2));
});
const centree = (page, nom) => expect.poll(() => ecartAuMilieu(page, nom), `${nom} au milieu`).toBeLessThanOrEqual(1);
// Le fond du milieu de la bande (::before du groupe).
const fondDuMilieu = (page) => roue(page).evaluate((g) => getComputedStyle(g, '::before').backgroundColor);
// L'entrée d'un jour en base (null s'il n'y en a pas), et l'heure de sa dernière écriture.
const lue = (page, date = AUJ) => page.evaluate((d) => window.__carnet.repo.journal.lire(d), date).then((e) => e || null);
const heures = async (page, date = AUJ) => (await lue(page, date))?.heuresSommeil ?? null;
// Pose une nuit en base, puis rouvre l'app ; l'horloge avance ensuite d'une seconde : toute écriture plus tardive change
// `updatedAt`.
async function noter(page, nuits) {
  await repo(page, async (n) => { for (const [d, h] of n) await window.__carnet.repo.journal.patch(d, { heuresSommeil: h }); }, nuits);
  await page.reload();
  await expect(roue(page)).toBeVisible();
  await page.clock.runFor(1000);
}
// L'horloge de l'app arrêtée : seul `runFor` fait passer les 150 ms de la fin d'un glissement (et le rendu d'après coup,
// dont les effets attendent l'horloge). `resume` la fait repartir.
const figer = async (page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const bande = (page) => roue(page).locator('.roue-defile');

// ---------- La roue, vide, glissée, touchée ----------

test('vide : 13 valeurs dans l\'ordre, rien de marqué, 7 h au milieu sur un fond neutre, rien en base ; la nuit de la veille n\'est pas reprise', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-14', { sommeilRessenti: 'sommeil:bien', heuresSommeil: 9 }));
  await page.reload();
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await expect(roue(page).getByRole('button')).toHaveText(VALEURS);
    await expect(presses(page)).toHaveCount(0);
    await centree(page, '7 h');
    expect(await fondDuMilieu(page), schema).toBe(rgb(t.surface));
  }
  // Sous Mal · Moyen · Bien, dans la carte Sommeil ; le lien « Durée › » de la v8 est parti.
  const g = await roue(page).evaluate((r) => {
    const carte = r.closest('.carte-champ');
    return { sommeil: carte.classList.contains('teinte-sommeil'), sous: r.getBoundingClientRect().top >= carte.querySelector('.segmente').getBoundingClientRect().bottom,
      liens: carte.querySelectorAll('.lien-rubrique').length };
  });
  expect(g).toEqual({ sommeil: true, sous: true, liens: 0 });
  await page.clock.runFor(1000);
  expect(await lue(page)).toBeNull();
});

test('glisser jusqu\'à 7 h 30 le note à l\'arrêt de la bande, 150 ms après le doigt levé ; le résumé du jour le dit', async ({ page }) => {
  await figer(page);
  await glisserRoue(roue(page), '7 h 30');
  await page.clock.runFor(149);
  expect(await lue(page), 'la bande n\'est pas encore arrêtée').toBeNull();
  await page.clock.runFor(2);
  await page.clock.resume();
  await expect.poll(() => heures(page)).toBe(7.5);
  await expect(valeur(page, '7 h 30')).toHaveAttribute('aria-pressed', 'true');
  await expect(presses(page)).toHaveCount(1);
  await expect(page.locator('.resume-jour')).toHaveText('nuit 7 h 30');
  await centree(page, '7 h 30');
  await toucher(page, 'Sommeil', 'Mal');
  await expect(page.locator('.resume-jour')).toHaveText('nuit mal · 7 h 30');
});

test('toucher une valeur la note et la centre ; la retoucher l\'efface, et la bande revient sur 7 h ; le fond du milieu suit, en clair et en sombre', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await valeur(page, '8 h').click();
    await expect.poll(() => heures(page), schema).toBe(8);
    await expect(valeur(page, '8 h')).toHaveAttribute('aria-pressed', 'true');
    await centree(page, '8 h');
    expect(await fondDuMilieu(page), schema).toBe(rgb(t['c-sommeil-tint']));
    // Notée : en 700, à la couleur du texte de la rubrique, lisible sur sa teinte.
    const s = await valeur(page, '8 h').evaluate((b) => ({ graisse: getComputedStyle(b).fontWeight, couleur: getComputedStyle(b).color }));
    expect(s, schema).toEqual({ graisse: '700', couleur: rgb(t['c-sommeil-text']) });
    expect(contraste(s.couleur, rgb(t['c-sommeil-tint'])), schema).toBeGreaterThanOrEqual(4.5);
    // Retouchée : effacée, rien de marqué, 7 h au milieu, le fond neutre.
    await valeur(page, '8 h').click();
    await expect.poll(() => heures(page), schema).toBeNull();
    await expect(presses(page)).toHaveCount(0);
    await centree(page, '7 h');
    expect(await fondDuMilieu(page), schema).toBe(rgb(t.surface));
    // Une valeur hors de la vue se touche aussi : la bande l'amène au milieu.
    await valeur(page, '10 h ou plus').click();
    await expect.poll(() => heures(page), schema).toBe(10);
    await centree(page, '10 h ou plus');
    await valeur(page, '4 h ou moins').click();
    await expect.poll(() => heures(page), schema).toBe(4);
    await centree(page, '4 h ou moins');
  }
});

test('« Réduire les animations » : la valeur touchée est au milieu aussitôt, sans rien qui bouge', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(roue(page)).toBeVisible();
  for (const nom of ['9 h 30', '5 h']) {
    await valeur(page, nom).click();
    const vu = await valeur(page, nom).evaluate((b) => {
      const [d, r] = [b.closest('.roue-defile').getBoundingClientRect(), b.getBoundingClientRect()];
      return { ecart: Math.abs(r.left + r.width / 2 - (d.left + d.width / 2)), animations: document.getAnimations().length };
    });
    expect(vu.ecart, nom).toBeLessThanOrEqual(1);
    expect(vu.animations, nom).toBe(0);
  }
  await expect.poll(() => heures(page)).toBe(5);
  // Retouchée : 7 h au milieu, aussitôt.
  await valeur(page, '5 h').click();
  expect(await ecartAuMilieu(page, '7 h')).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('un glissement parti de la bande ne change pas de jour ; changer de jour recentre la roue sur la nuit de ce jour, sans rien écrire', async ({ page }) => {
  await noter(page, [[AUJ, 7.5], [VEILLE, 9]]);
  const avant = await Promise.all([lue(page, AUJ), lue(page, VEILLE)]);
  await centree(page, '7 h 30');
  await glisser(page, '.roue-choix', 120, 4);
  await glisser(page, '.roue-choix .roue-valeur', -120, 0, 0);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // La veille : sa nuit, au milieu ; l'avant-veille, vide : 7 h au milieu, rien de marqué.
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect(valeur(page, '9 h')).toHaveAttribute('aria-pressed', 'true');
  await centree(page, '9 h');
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-13$/);
  await expect(presses(page)).toHaveCount(0);
  await centree(page, '7 h');
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await centree(page, '7 h 30');
  await page.clock.runFor(300);
  expect(await Promise.all([lue(page, AUJ), lue(page, VEILLE)])).toEqual(avant);
  expect(await lue(page, '2026-10-13')).toBeNull();
});

// ---------- Point de vigilance 1 : ce qui n'est pas un glissement n'écrit rien ----------

test('vigilance 1 · un doigt posé puis levé sans défilement, la page qui défile le doigt posé sur la bande, un défilement sans doigt (le code, le focus de VoiceOver), la fenêtre qui change : rien n\'est écrit', async ({ page }) => {
  await expect(roue(page)).toBeVisible();
  const toucherBande = (type) => bande(page).evaluate((b, t) => b.dispatchEvent(new Event(t, { bubbles: true })), type);
  // Doigt posé puis levé, sans `scroll`.
  await toucherBande('touchstart');
  await toucherBande('touchend');
  await page.clock.runFor(300);
  // La page défile, le doigt posé sur la bande : la bande ne bouge pas.
  const avant = await bande(page).evaluate((b) => b.scrollLeft);
  await toucherBande('touchstart');
  await page.evaluate(async () => { await new Promise((ok) => { window.addEventListener('scroll', ok, { once: true }); window.scrollBy(0, 200); }); });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await toucherBande('touchend');
  await page.clock.runFor(300);
  expect(await bande(page).evaluate((b) => b.scrollLeft)).toBe(avant);
  // La bande défile sans doigt : par le code, puis par le focus (VoiceOver amène la valeur dans la vue).
  await bande(page).evaluate(async (b) => {
    const cible = [...b.querySelectorAll('.roue-valeur')].find((x) => x.textContent === '8 h 30');
    await new Promise((ok) => { b.addEventListener('scroll', ok, { once: true }); b.scrollLeft += cible.getBoundingClientRect().left - b.getBoundingClientRect().left; });
  });
  await page.clock.runFor(300);
  await valeur(page, '4 h ou moins').focus();
  await expect.poll(() => valeur(page, '4 h ou moins').evaluate((b) => {
    const [d, r] = [b.closest('.roue-defile').getBoundingClientRect(), b.getBoundingClientRect()];
    return r.left >= d.left - 0.5 && r.right <= d.right + 0.5;
  })).toBe(true);
  await page.clock.runFor(300);
  // La fenêtre qui change de taille : la bande recentrée, sans rien écrire.
  await page.setViewportSize({ width: 375, height: 844 });
  await page.setViewportSize({ width: 390, height: 844 });
  await centree(page, '7 h');
  await page.clock.runFor(300);
  expect(await lue(page)).toBeNull();
});

test('vigilance 1 · une valeur au centre égale à la valeur notée n\'écrit rien, et un glissement n\'efface jamais ; revenu à son départ sur une nuit vide, il note ce qu\'il montre', async ({ page }) => {
  // 7 h 30 notée, la bande glissée sur 8 h puis revenue sur 7 h 30 : rien n'est écrit, 7 h 30 reste.
  await noter(page, [[AUJ, 7.5]]);
  const avant = await lue(page);
  await glisserRoue(roue(page), '8 h', '7 h 30');
  await page.clock.runFor(300);
  expect(await lue(page)).toEqual(avant);
  await expect(valeur(page, '7 h 30')).toHaveAttribute('aria-pressed', 'true');
  // Glissée sur 8 h 30 : notée, sans bascule.
  await glisserRoue(roue(page), '8 h 30');
  await page.clock.runFor(300);
  await expect.poll(() => heures(page)).toBe(8.5);
  await expect(valeur(page, '8 h 30')).toHaveAttribute('aria-pressed', 'true');
  // Une nuit vide : glissée sur 7 h 30, puis revenue sur 7 h, où elle était. Le geste a fait défiler la bande : 7 h est noté.
  await viderBase(page);
  await expect(roue(page)).toBeVisible();
  await centree(page, '7 h');
  await glisserRoue(roue(page), '7 h 30', '7 h');
  await page.clock.runFor(300);
  await expect.poll(() => heures(page)).toBe(7);
  await expect(valeur(page, '7 h')).toHaveAttribute('aria-pressed', 'true');
});

test('vigilance 1 · un toucher pendant un glissement en attente : la valeur touchée l\'emporte', async ({ page }) => {
  await expect(roue(page)).toBeVisible();
  await figer(page);
  await glisserRoue(roue(page), '9 h');
  await valeur(page, '6 h').click();
  await page.clock.runFor(1000);
  await page.clock.resume();
  await expect.poll(() => heures(page)).toBe(6);
  await expect(valeur(page, '6 h')).toHaveAttribute('aria-pressed', 'true');
  await centree(page, '6 h');
  await page.clock.runFor(500);
  expect(await heures(page)).toBe(6);
});

// Le test d'avant passerait aussi sans l'extinction du geste : la bande, centrée sur 6 h, le montre déjà quand le geste
// finit. Celui-ci l'exige (relecture de la tâche 2) : sans elle, la fin du geste réécrit la valeur que l'on vient
// d'effacer (7,5 au lieu de rien).
test('vigilance 1 · un toucher éteint le glissement en cours : la valeur notée, effacée d\'un toucher pendant un glissement en attente, n\'est pas réécrite', async ({ page }) => {
  await noter(page, [[AUJ, 7.5]]);
  await expect(valeur(page, '7 h 30')).toHaveAttribute('aria-pressed', 'true');
  await figer(page);
  await glisserRoue(roue(page), '9 h');
  await valeur(page, '7 h 30').click();
  await page.clock.runFor(1000);
  await page.clock.resume();
  await centree(page, '7 h');
  await page.clock.runFor(1000);
  await expect.poll(() => heures(page)).toBeNull();
  await expect(presses(page)).toHaveCount(0);
});

test('vigilance 1 · une valeur en attente s\'écrit aussitôt, sur son jour : au changement de jour, la page cachée, à pagehide', async ({ page }) => {
  await noter(page, [[VEILLE, 9]]);
  const veille = await lue(page, VEILLE);
  // Le jour change avant que la bande ne s'arrête : 8 h s'écrit sur aujourd'hui, la veille garde sa nuit.
  await figer(page);
  await glisserRoue(roue(page), '8 h');
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect.poll(() => heures(page)).toBe(8);
  await page.clock.resume();
  await expect(valeur(page, '9 h')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(300);
  expect(await lue(page, VEILLE)).toEqual(veille);
  // La page cachée (écran verrouillé, autre app), sur la veille : 9 h 30 s'écrit tout de suite.
  await figer(page);
  await glisserRoue(roue(page), '9 h 30');
  await cacher(page);
  await expect.poll(() => heures(page, VEILLE)).toBe(9.5);
  await montrer(page);
  // pagehide (l'app fermée), de retour sur aujourd'hui : 6 h 30.
  await page.clock.resume();
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(valeur(page, '8 h')).toHaveAttribute('aria-pressed', 'true');
  await figer(page);
  await glisserRoue(roue(page), '6 h 30');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(() => heures(page)).toBe(6.5);
  await page.clock.resume();
  expect(await heures(page, VEILLE)).toBe(9.5);
});

// ---------- Accessibilité ----------

test('accessibilité : un vrai bouton par valeur, 44 × 44 au moins, sans curseur ARIA ; la carte Sommeil n\'a que 60 px de plus que Traitement pris', async ({ page }) => {
  await expect(roue(page)).toBeVisible();
  const boutons = await roue(page).evaluate((g) => [...g.querySelectorAll('.roue-valeur')].map((b) => {
    const r = b.getBoundingClientRect();
    return { balise: b.tagName, type: b.type, nom: b.getAttribute('aria-label'), presse: b.getAttribute('aria-pressed'), l: r.width, h: r.height };
  }));
  expect(boutons).toHaveLength(13);
  for (const b of boutons) {
    expect([b.balise, b.type, b.nom, b.presse]).toEqual(['BUTTON', 'button', null, 'false']);
    expect(b.l).toBeGreaterThanOrEqual(44);
    expect(b.h).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator('[role="slider"]')).toHaveCount(0);
  await expect(roue(page)).toHaveAttribute('aria-label', 'Durée de la nuit');
  const [sommeil, traitement] = await Promise.all(['Sommeil', 'Traitement pris'].map((n) => page.locator('.carte-champ', { has: groupe(page, n) }).evaluate((c) => c.getBoundingClientRect().height)));
  expect(sommeil - traitement).toBeGreaterThan(0);
  expect(sommeil - traitement).toBeLessThanOrEqual(60);
});

// Le contraste effectif des valeurs qui se voient dans la bande, le fondu des bords compris (relecture de la tâche 2 : la
// couleur calculée ignore le masque). Le masque est lu sur une capture : la bande peinte en blanc sur un groupe noir, le
// texte transparent, chaque colonne de la ligne du milieu donne son alpha (le blanc mêlé au noir). Pour chaque valeur dont
// le texte se voit, l'alpha le plus bas sur l'étendue visible de ce texte mêle sa couleur à son fond (la fenêtre du
// milieu, sinon le fond de la bande) : le contraste de ce mélange sur ce fond. Rend [{ nom, alpha, contraste }].
async function sousLeMasque(page) {
  const PEINTS = [['background', '#000'], ['--surface', '#000'], ['--c-tint', '#000'], ['--text', 'transparent'], ['--c-text', 'transparent']];
  const vues = await roue(page).evaluate((g, peints) => {
    document.activeElement?.blur();
    const d = g.querySelector('.roue-defile');
    const rb = d.getBoundingClientRect();
    const [fenetre, fond] = [getComputedStyle(g, '::before').backgroundColor, getComputedStyle(g).backgroundColor];
    const res = [];
    for (const b of g.querySelectorAll('.roue-valeur')) {
      const plage = document.createRange();
      plage.selectNodeContents(b);
      const rr = [...plage.getClientRects()].filter((r) => r.width > 0);
      const [de, a] = [Math.max(Math.min(...rr.map((r) => r.left)), rb.left), Math.min(Math.max(...rr.map((r) => r.right)), rb.right)];
      if (a - de < 1) continue;
      const q = b.getBoundingClientRect();
      const auMilieu = Math.abs(q.left + q.width / 2 - (rb.left + rb.width / 2)) <= 1;
      res.push({ nom: b.textContent, de: de - rb.left, a: a - rb.left, couleur: getComputedStyle(b).color, fond: auMilieu ? fenetre : fond });
    }
    for (const [p, v] of peints) g.style.setProperty(p, v);
    d.style.setProperty('background', '#fff');
    return res;
  }, PEINTS);
  const png = await bande(page).screenshot({ scale: 'css', caret: 'initial' });
  const alphas = await roue(page).evaluate(async (g, [b64, peints]) => {
    for (const [p] of peints) g.style.removeProperty(p);
    g.querySelector('.roue-defile').style.removeProperty('background');
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }));
    const toile = document.createElement('canvas');
    [toile.width, toile.height] = [image.width, image.height];
    const k = toile.getContext('2d');
    k.drawImage(image, 0, 0);
    const ligne = k.getImageData(0, Math.floor(image.height / 2), image.width, 1).data;
    return Array.from({ length: image.width }, (_, x) => ligne[4 * x] / 255);
  }, [png.toString('base64'), PEINTS]);
  return vues.map((v) => {
    const alpha = Math.min(...alphas.slice(Math.round(v.de), Math.round(v.a)));
    const [t, f] = [canaux(v.couleur), canaux(v.fond)];
    return { nom: v.nom, alpha, contraste: contraste(`rgb(${t.map((c, i) => alpha * c + (1 - alpha) * f[i]).join(', ')})`, v.fond) };
  });
}

// La capture de Playwright glisse une feuille de style dans la page (WebKit, pour synchroniser les animations) : la CSP
// la refuse, et les gardes y verraient une erreur. Ce test seul passe outre la CSP ; il ne lit que le rendu.
test.describe('sous le fondu des bords', () => {
  test.use({ bypassCSP: true });
  test('accessibilité : le fondu des bords n\'éteint aucune valeur qui se voit, 4,5:1 au moins sous le masque (390 et 375, clair et sombre, vide et une nuit notée)', async ({ page }) => {
    await expect(roue(page)).toBeVisible();
    for (const notee of [null, '7 h 30']) {
      if (notee) {
        await valeur(page, notee).click();
        await expect.poll(() => heures(page)).toBe(7.5);
      }
      for (const largeur of [390, 375]) {
        await page.setViewportSize({ width: largeur, height: 844 });
        await centree(page, notee || '7 h');
        for (const [schema] of THEMES) {
          await page.emulateMedia({ colorScheme: schema });
          const quoi = `${notee || 'vide'} · ${largeur} · ${schema}`;
          const vues = await sousLeMasque(page);
          // La valeur du milieu et ses deux voisines au moins : les cibles visibles d'un toucher.
          expect(vues.length, quoi).toBeGreaterThanOrEqual(3);
          expect(vues.filter((v) => v.contraste < 4.5).map((v) => `${v.nom} : alpha ${v.alpha.toFixed(2)}, ${v.contraste.toFixed(2)}:1`), quoi).toEqual([]);
        }
      }
    }
  });
});

test('de 17 à 53 px de texte (390 et 375) : la bande reste dans sa carte, aucune valeur ne sort de côté, aucun libellé n\'est coupé, la plus longue notée comprise', async ({ page }) => {
  await valeur(page, '4 h ou moins').click();
  await expect.poll(() => heures(page)).toBe(4);
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const px of [17, 21, 28, 33, 40, 47, 53]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; document.body.style.fontSize = ''; }, px);
      const quoi = `${largeur} · ${px} px`;
      const m = await roue(page).evaluate((g) => {
        const fautes = [];
        const carte = g.closest('.carte-champ').getBoundingClientRect();
        const r = g.getBoundingClientRect();
        if (r.left < carte.left - 0.5 || r.right > carte.right + 0.5) fautes.push('bande hors de sa carte');
        if (carte.left < -0.5 || carte.right > innerWidth + 0.5) fautes.push('carte hors de l\'écran');
        const d = g.querySelector('.roue-defile');
        if (d.scrollHeight > d.clientHeight + 0.5) fautes.push('la bande défile en hauteur');
        const plage = document.createRange();
        for (const b of g.querySelectorAll('.roue-valeur')) {
          const q = b.getBoundingClientRect();
          if (b.scrollWidth > b.clientWidth + 0.5 || b.scrollHeight > b.clientHeight + 0.5) fautes.push(`${b.textContent} coupé`);
          if (q.width > r.width + 0.5) fautes.push(`${b.textContent} plus large que la bande`);
          if (q.width < 44 || q.height < 44) fautes.push(`${b.textContent} : ${q.width} × ${q.height}`);
          plage.selectNodeContents(b);
          for (const t of plage.getClientRects()) if (t.width > 0 && (t.left < q.left - 0.5 || t.right > q.right + 0.5 || t.top < q.top - 0.5 || t.bottom > q.bottom + 0.5)) fautes.push(`texte de ${b.textContent} hors du bouton`);
        }
        return fautes;
      });
      expect(m, quoi).toEqual([]);
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});
