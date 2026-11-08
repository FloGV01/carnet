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

// Relecture finale : un défilement lancé par le code n'est pas un glissement. Retoucher la valeur notée l'efface, et la
// bande revient au centre en douceur ; un doigt posé sur la bande pendant ce recentrage, immobile ou la page qui défile,
// prenait ses `scroll` pour un glissement : au lever, la valeur du milieu s'écrivait à la place de l'effacement (7 h, ou
// Neutre). Seul un doigt qui a bougé de côté peut marquer un geste. Le doigt posé ici n'a pas de point de contact : il ne
// bouge jamais.
test('vigilance 1 · le recentrage du code n\'est pas un glissement : un doigt posé pendant qu\'il ramène la bande au centre, après un effacement, immobile ou la page qui défile, n\'écrit rien (la nuit, le contact)', async ({ page }) => {
  const CAS = [
    { nom: 'Durée de la nuit', notee: '9 h', centre: '7 h', champ: (e) => e?.heuresSommeil ?? null, attendu: 9 },
    { nom: 'Comment c\'était', notee: 'Coûteux', centre: 'Neutre', champ: (e) => e?.contacts ?? null, attendu: [{ avec: null, effet: 'contactEffet:couteux' }] },
  ];
  for (const c of CAS) {
    for (const pageDefile of [false, true]) {
      const quoi = `${c.nom}${pageDefile ? ', la page qui défile' : ', doigt immobile'}`;
      await viderBase(page);
      const g = groupe(page, c.nom);
      await expect(g).toBeVisible();
      await g.scrollIntoViewIfNeeded();
      await dans(g, c.notee).click();
      await expect.poll(async () => c.champ(await lue(page)), quoi).toEqual(c.attendu);
      await centreeDans(g, c.notee);
      await figer(page);
      // Retouchée : effacée, la bande part vers le centre ; dès son premier `scroll`, le doigt se pose, la page défile ou
      // non, et les `scroll` suivants du recentrage arrivent doigt posé, jusqu'à sa cible ; puis le doigt se lève.
      const vus = await g.evaluate(async (r, [notee, centre, defile]) => {
        const bande = r.querySelector('.roue-defile');
        const bouton = (nom) => [...bande.querySelectorAll('.roue-valeur')].find((x) => x.textContent === nom);
        const prochain = (x) => new Promise((ok) => x.addEventListener('scroll', ok, { once: true }));
        const [rb, q] = [bande.getBoundingClientRect(), bouton(centre).getBoundingClientRect()];
        const cible = bande.scrollLeft + q.left + q.width / 2 - (rb.left + rb.width / 2);
        let n = 0;
        bouton(notee).click();
        await prochain(bande);
        bande.dispatchEvent(new Event('touchstart', { bubbles: true }));
        if (defile) { const p = prochain(window); window.scrollBy(0, 120); await p; }
        while (Math.abs(bande.scrollLeft - cible) >= 1) { await prochain(bande); n += 1; }
        bande.dispatchEvent(new Event('touchend', { bubbles: true }));
        return n;
      }, [c.notee, c.centre, pageDefile]);
      expect(vus, `${quoi} : des scroll du recentrage, doigt posé`).toBeGreaterThan(0);
      await expect.poll(async () => c.champ(await lue(page)), quoi).toBeNull();
      const apres = await lue(page);
      await page.clock.runFor(1000);
      await page.clock.resume();
      await page.clock.runFor(1000);
      expect(await lue(page), `${quoi} : rien d'écrit après l'effacement, updatedAt compris`).toEqual(apres);
      await expect(g.locator('[aria-pressed="true"]'), quoi).toHaveCount(0);
      await centreeDans(g, c.centre);
    }
  }
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

// Relecture finale : la taille du texte qui change écran ouvert (Centre de contrôle › Taille du texte, sur l'iPhone) ne
// donne ni `resize` ni `visibilitychange`. En grandissant, WebKit gardait la valeur au centre ; en rapetissant, la bande
// partait au bout, et la fenêtre teintée montrait « 10 h ou plus » pour une nuit de 7 h 30. Chaque roue se recale, sans
// rien écrire.
test('la taille du texte qui change écran ouvert, sans resize : chaque roue reste sur sa valeur (la nuit notée, le contact et le sport vides), sans rien écrire', async ({ page }) => {
  await noter(page, [[AUJ, 7.5]]);
  const avant = await lue(page);
  await centree(page, '7 h 30');
  for (const taille of ['33px', '', '24px', '']) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t; }, taille);
    await centree(page, '7 h 30');
    await expect(presses(page)).toHaveText(['7 h 30']);
    await centreeDans(groupe(page, 'Comment c\'était'), 'Neutre');
    await centreeDans(groupe(page, 'Durée du sport'), '15 à 30 min');
  }
  await page.clock.runFor(1000);
  expect(await lue(page)).toEqual(avant);
});

// ---------- v11 (3/11) · Les roues Sport et Contact humain (spec §5.4) ----------
// Sous Oui / Non, la roue de la durée de la première activité et celle de l'effet du premier contact, toujours visibles,
// avec les règles de celle du Sommeil. Une valeur notée sur rien de noté met Oui, un Non reste un Non, l'effacer laisse le
// Oui. Le détail règle la durée et l'effet sur la même roue, sur les mêmes données ; la carte montre la première ligne.

const SPORT = ['Moins de 15 min', '15 à 30 min', '30 à 60 min', 'Plus d\'1 h'];
const EFFETS = ['Ressourçant', 'Neutre', 'Coûteux'];
// Chaque carte : son Oui / Non, sa roue, ses valeurs, la valeur glissée, la première et la dernière, avec leur identifiant,
// le champ du Oui, celui des lignes et celui de la ligne.
const CARTES = [
  { ouiNon: 'Sport / mouvement', nom: 'Durée du sport', valeurs: SPORT, champOui: 'sportMouvement', lignes: 'activites', champ: 'duree',
    glissee: ['30 à 60 min', 'dureeSport:de_30_a_60'], premiere: ['Moins de 15 min', 'dureeSport:moins_15'], derniere: ['Plus d\'1 h', 'dureeSport:plus_60'] },
  { ouiNon: 'Contact humain', nom: 'Comment c\'était', valeurs: EFFETS, champOui: 'contactHumain', lignes: 'contacts', champ: 'effet',
    glissee: ['Coûteux', 'contactEffet:couteux'], premiere: ['Ressourçant', 'contactEffet:ressourcant'], derniere: ['Coûteux', 'contactEffet:couteux'] },
];
const dans = (g, nom) => g.getByRole('button', { name: nom, exact: true });
const ecartDans = (g, nom) => dans(g, nom).evaluate((b) => {
  const [d, r] = [b.closest('.roue-defile').getBoundingClientRect(), b.getBoundingClientRect()];
  return Math.abs(r.left + r.width / 2 - (d.left + d.width / 2));
});
const centreeDans = (g, nom) => expect.poll(() => ecartDans(g, nom), `${nom} au milieu`).toBeLessThanOrEqual(1);
const oui = (page, nom) => groupe(page, nom).getByRole('button', { name: 'Oui' });
const non = (page, nom) => groupe(page, nom).getByRole('button', { name: 'Non' });

test('Sport et Contact : sous Oui / Non, vides, rien de marqué et la valeur du milieu au centre ; glisser note la première ligne et met Oui ; retoucher efface sans toucher au Oui ; sur un Non, le Non reste', async ({ page }) => {
  for (const c of CARTES) {
    const g = groupe(page, c.nom);
    const premiereValeur = async () => (await lue(page))?.[c.lignes]?.[0]?.[c.champ] ?? null;
    await viderBase(page);
    // Vide : les valeurs de la liste, dans l'ordre, rien de marqué, celle du milieu au centre (15 à 30 min, Neutre).
    await expect(g.getByRole('button'), c.nom).toHaveText(c.valeurs);
    await expect(g.locator('[aria-pressed="true"]'), c.nom).toHaveCount(0);
    await centreeDans(g, c.valeurs[Math.floor((c.valeurs.length - 1) / 2)]);
    const place = await g.evaluate((r) => {
      const carte = r.closest('.carte-champ');
      return { paire: Boolean(carte.closest('.deux-colonnes')), sous: r.getBoundingClientRect().top >= carte.querySelector('.segmente').getBoundingClientRect().bottom };
    });
    expect(place, c.nom).toEqual({ paire: true, sous: true });
    await page.clock.runFor(1000);
    expect(await lue(page), c.nom).toBeNull();
    // Glissée sur rien de noté : la première ligne, et Oui.
    await glisserRoue(g, c.glissee[0]);
    await page.clock.runFor(300);
    await expect.poll(() => lue(page), c.nom).toMatchObject({ [c.champOui]: true, [c.lignes]: [{ [c.champ]: c.glissee[1] }] });
    await expect(dans(g, c.glissee[0])).toHaveAttribute('aria-pressed', 'true');
    await expect(oui(page, c.ouiNon)).toHaveAttribute('aria-pressed', 'true');
    await centreeDans(g, c.glissee[0]);
    // Retouchée : effacée, la ligne vide sort ; le Oui reste.
    await dans(g, c.glissee[0]).click();
    await expect.poll(() => lue(page), c.nom).toMatchObject({ [c.champOui]: true, [c.lignes]: null });
    await expect(g.locator('[aria-pressed="true"]'), c.nom).toHaveCount(0);
    await expect(oui(page, c.ouiNon)).toHaveAttribute('aria-pressed', 'true');
    // Un Non : une valeur touchée, puis une valeur glissée, ne le changent pas.
    await non(page, c.ouiNon).click();
    await expect.poll(async () => (await lue(page))?.[c.champOui], c.nom).toBe(false);
    await dans(g, c.premiere[0]).click();
    await expect.poll(premiereValeur, c.nom).toBe(c.premiere[1]);
    await expect(non(page, c.ouiNon)).toHaveAttribute('aria-pressed', 'true');
    expect((await lue(page))[c.champOui], c.nom).toBe(false);
    await glisserRoue(g, c.derniere[0]);
    await page.clock.runFor(300);
    await expect.poll(premiereValeur, c.nom).toBe(c.derniere[1]);
    await expect(non(page, c.ouiNon)).toHaveAttribute('aria-pressed', 'true');
    expect((await lue(page))[c.champOui], c.nom).toBe(false);
  }
});

test('deux lignes : la carte montre et change la première, le détail ouvert suit ; une valeur changée dans le détail recentre la carte, sans écriture de plus', async ({ page }) => {
  await repo(page, (d) => window.__carnet.repo.journal.patch(d, {
    sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:moins_15' }, { type: 'typeSport:velo', duree: 'dureeSport:plus_60' }],
    contactHumain: true, contacts: [{ avec: ['contactAvec:amis'], effet: 'contactEffet:neutre' }, { avec: ['contactAvec:famille'], effet: 'contactEffet:couteux' }],
  }), AUJ);
  await page.reload();
  const [sport, effet] = [groupe(page, 'Durée du sport'), groupe(page, 'Comment c\'était')];
  await expect(sport.locator('[aria-pressed="true"]')).toHaveText(['Moins de 15 min']);
  await expect(effet.locator('[aria-pressed="true"]')).toHaveText(['Neutre']);
  await centreeDans(sport, 'Moins de 15 min');
  await centreeDans(effet, 'Neutre');
  await page.getByRole('button', { name: 'Sport en détail', exact: true }).click();
  await page.getByRole('button', { name: 'Contact en détail', exact: true }).click();
  const [duree1, duree2, effet1, effet2] = ['Activité 1 : durée', 'Activité 2 : durée', 'Contact 1 : comment c\'était', 'Contact 2 : comment c\'était'].map((n) => groupe(page, n));
  await expect(duree1.locator('[aria-pressed="true"]')).toHaveText(['Moins de 15 min']);
  await expect(effet2.locator('[aria-pressed="true"]')).toHaveText(['Coûteux']);
  // La carte change la première ligne ; la seconde reste ; le détail ouvert suit, au milieu.
  await glisserRoue(sport, '30 à 60 min');
  await page.clock.runFor(300);
  await expect.poll(async () => (await lue(page))?.activites).toEqual([{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }, { type: 'typeSport:velo', duree: 'dureeSport:plus_60' }]);
  await expect(duree1.locator('[aria-pressed="true"]')).toHaveText(['30 à 60 min']);
  await expect(duree2.locator('[aria-pressed="true"]')).toHaveText(['Plus d\'1 h']);
  await centreeDans(duree1, '30 à 60 min');
  await dans(effet, 'Ressourçant').click();
  await expect.poll(async () => (await lue(page))?.contacts).toEqual([{ avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }, { avec: ['contactAvec:famille'], effet: 'contactEffet:couteux' }]);
  await expect(effet1.locator('[aria-pressed="true"]')).toHaveText(['Ressourçant']);
  await centreeDans(effet1, 'Ressourçant');
  // Le détail change la première ligne : la carte la montre, au milieu, et n'écrit rien de plus.
  for (const [detail, carte, nom, champ, attendu] of [[duree1, sport, '15 à 30 min', 'activites', 'dureeSport:de_15_a_30'], [effet1, effet, 'Coûteux', 'contacts', 'contactEffet:couteux']]) {
    await dans(detail, nom).click();
    await expect.poll(async () => (await lue(page))?.[champ]?.[0]).toMatchObject({ [champ === 'activites' ? 'duree' : 'effet']: attendu });
    await expect(carte.locator('[aria-pressed="true"]')).toHaveText([nom]);
    await centreeDans(carte, nom);
    const avant = await lue(page);
    await page.clock.runFor(1000);
    expect(await lue(page), nom).toEqual(avant);
  }
  expect((await lue(page)).activites[1]).toEqual({ type: 'typeSport:velo', duree: 'dureeSport:plus_60' });
  expect((await lue(page)).contacts[1]).toEqual({ avec: ['contactAvec:famille'], effet: 'contactEffet:couteux' });
});

// Les fautes de mise en page des cartes Sport et Contact et de leurs détails : une carte hors de l'écran, ce qu'elle contient
// hors d'elle (les valeurs d'une roue mises à part : elles défilent dans la bande), la bande hors de sa carte, une valeur
// coupée, plus large que la bande, sous 44 × 44, ou son texte hors du bouton. Le reste n'est pas mesuré ici : en très grand
// texte, « nuit dernière », « Télétravail » et, dans le détail, le type « Renforcement » sortent déjà de l'écran (écrans
// hérités, v10, hors de la v11) ; les pastilles du détail (type, « avec qui ») ne changent pas.
const fautesDesRoues = (page) => page.evaluate(() => {
  const fautes = [];
  for (const c of document.querySelectorAll('.deux-colonnes > .carte-champ, .carte-detail')) {
    const carte = c.getBoundingClientRect();
    const nom = c.querySelector('.titre-rubrique').textContent;
    if (carte.left < -0.5 || carte.right > innerWidth + 0.5) fautes.push(`${nom} : carte hors de l'écran`);
    for (const e of c.querySelectorAll('*')) {
      if (e.closest('.roue-defile, .carte-detail .pastilles')) continue;
      const q = e.getBoundingClientRect();
      if (q.width > 0 && (q.left < carte.left - 0.5 || q.right > carte.right + 0.5)) fautes.push(`${nom} : ${e.tagName.toLowerCase()} « ${(e.textContent || '').trim().slice(0, 20)} » hors de la carte`);
    }
  }
  const plage = document.createRange();
  for (const g of document.querySelectorAll('.deux-colonnes .roue-choix, .carte-detail .roue-choix')) {
    const nom = g.getAttribute('aria-label');
    const carte = g.closest('.carte-champ').getBoundingClientRect();
    const r = g.getBoundingClientRect();
    if (r.left < carte.left - 0.5 || r.right > carte.right + 0.5) fautes.push(`${nom} : bande hors de sa carte`);
    const d = g.querySelector('.roue-defile');
    if (d.scrollHeight > d.clientHeight + 0.5) fautes.push(`${nom} : la bande défile en hauteur`);
    for (const b of g.querySelectorAll('.roue-valeur')) {
      const q = b.getBoundingClientRect();
      if (b.scrollWidth > b.clientWidth + 0.5 || b.scrollHeight > b.clientHeight + 0.5) fautes.push(`${nom} : ${b.textContent} coupé`);
      if (q.width > r.width + 0.5) fautes.push(`${nom} : ${b.textContent} plus large que la bande`);
      if (q.width < 44 || q.height < 44) fautes.push(`${nom} : ${b.textContent} : ${q.width} × ${q.height}`);
      plage.selectNodeContents(b);
      for (const t of plage.getClientRects()) if (t.width > 0 && (t.left < q.left - 0.5 || t.right > q.right + 0.5 || t.top < q.top - 0.5 || t.bottom > q.bottom + 0.5)) fautes.push(`${nom} : texte de ${b.textContent} hors du bouton`);
    }
  }
  return fautes;
});

test('la rangée Contact et Sport n\'a que 60 px de plus avec ses roues ; aucune lettre d\'une voisine ne se voit dans ces cartes étroites ; de 17 à 53 px de texte (390 et 375), cartes et détails ouverts ou non, rien n\'en sort de côté ni n\'est coupé', async ({ page }) => {
  // Les deux roues, toujours visibles, ajoutent 60 px au plus à la rangée (environ 54, spec §13).
  const hauteurs = await page.locator('.deux-colonnes').evaluate((p) => {
    const avec = p.getBoundingClientRect().height;
    const roues = [...p.querySelectorAll('.roue-choix')];
    for (const r of roues) r.style.setProperty('display', 'none');
    const sans = p.getBoundingClientRect().height;
    for (const r of roues) r.style.removeProperty('display');
    return { roues: roues.length, ajout: avec - sans };
  });
  expect(hauteurs.roues).toBe(2);
  expect(hauteurs.ajout).toBeGreaterThan(0);
  expect(hauteurs.ajout).toBeLessThanOrEqual(60);
  // Cartes étroites : la valeur du milieu prend toute la bande (sa fenêtre peinte, la bande moins 8 px de chaque côté) ;
  // aucun texte d'une voisine n'y entre, à 390 et à 375, vides (Neutre, 15 à 30 min au milieu) ou une valeur notée.
  const voisinesVues = () => page.evaluate(() => {
    const vues = [];
    const plage = document.createRange();
    for (const g of document.querySelectorAll('.deux-colonnes .roue-choix')) {
      const d = g.querySelector('.roue-defile').getBoundingClientRect();
      for (const b of g.querySelectorAll('.roue-valeur')) {
        const q = b.getBoundingClientRect();
        if (Math.abs(q.left + q.width / 2 - (d.left + d.width / 2)) <= 1) continue;
        plage.selectNodeContents(b);
        if ([...plage.getClientRects()].some((t) => t.width > 0 && t.right > d.left + 0.5 && t.left < d.right - 0.5)) vues.push(b.textContent);
      }
    }
    return vues;
  });
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    await centreeDans(groupe(page, 'Comment c\'était'), 'Neutre');
    expect(await voisinesVues(), `${largeur} · vides`).toEqual([]);
  }
  await dans(groupe(page, 'Durée du sport'), 'Moins de 15 min').click();
  await dans(groupe(page, 'Comment c\'était'), 'Ressourçant').click();
  await expect.poll(() => lue(page)).toMatchObject({ activites: [{ duree: 'dureeSport:moins_15' }], contacts: [{ effet: 'contactEffet:ressourcant' }] });
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    await centreeDans(groupe(page, 'Comment c\'était'), 'Ressourçant');
    await centreeDans(groupe(page, 'Durée du sport'), 'Moins de 15 min');
    expect(await voisinesVues(), `${largeur} · notées`).toEqual([]);
  }
  // Les plus longues notées (Moins de 15 min, Ressourçant), détails fermés puis ouverts.
  for (const ouverts of [false, true]) {
    if (ouverts) {
      await page.getByRole('button', { name: 'Sport en détail', exact: true }).click();
      await page.getByRole('button', { name: 'Contact en détail', exact: true }).click();
      await expect(page.locator('.carte-detail .roue-choix')).toHaveCount(2);
    }
    for (const largeur of [390, 375]) {
      await page.setViewportSize({ width: largeur, height: 844 });
      for (const px of [17, 18, 19, 20, 21, 22, 28, 33, 40, 47, 53]) {
        await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; document.body.style.fontSize = ''; }, px);
        const quoi = `${ouverts ? 'détails ouverts' : 'cartes'} · ${largeur} · ${px} px`;
        expect(await fautesDesRoues(page), quoi).toEqual([]);
        // Côte à côte, les Oui / Non restent alignés (v7), « Moins de 15 min » passé à la ligne ou non : les deux roues ont
        // la même hauteur.
        const paire = await page.evaluate(() => {
          const [contact, sport] = [...document.querySelectorAll('.deux-colonnes > .carte-champ')];
          const haut = (c, x) => c.querySelector(x).getBoundingClientRect();
          return { cote: Math.abs(contact.getBoundingClientRect().top - sport.getBoundingClientRect().top) < 1,
            ouiNon: Math.abs(haut(contact, '.segmente').top - haut(sport, '.segmente').top), roues: Math.abs(haut(contact, '.roue-choix').height - haut(sport, '.roue-choix').height) };
        });
        if (px <= 21 && largeur === 390) expect(paire.cote, `${quoi} : côte à côte`).toBe(true);
        if (paire.cote) expect([paire.ouiNon, paire.roues], `${quoi} : Oui / Non alignés, roues de même hauteur`).toEqual([0, 0]);
        // Relecture finale : côte à côte, les deux fenêtres laissent 8 px de gris de chaque côté, et le texte de la plus
        // longue valeur notée (« Moins de 15 min » passé à la ligne, « Ressourçant » sur une) en garde 6 jusqu'à leur bord.
        if (paire.cote && !ouverts) {
          await centreeDans(groupe(page, 'Comment c\'était'), 'Ressourçant');
          await centreeDans(groupe(page, 'Durée du sport'), 'Moins de 15 min');
          for (const r of await sousLesBords(page)) {
            expect(r.marge, `${quoi} · ${r.roue}`).toBeCloseTo(8, 1);
            expect(r.jeu, `${quoi} · ${r.roue}`).toBeGreaterThanOrEqual(6);
          }
        }
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    }
  }
});

// Relecture de la tâche 3 : côte à côte, la fenêtre peinte laisse voir la bande grise sur 8 px de chaque côté. Toute la
// bande est pourtant à la valeur du milieu : un toucher sur cette marge, où l'on ne voit que le gris, note ou efface la
// valeur qui se voit au milieu, jamais une voisine invisible (Coûteux, et le Oui du contact avec). À 2 px de chaque bord
// de la bande, à mi-hauteur, à 390 et à 375 : vides, notées au milieu de la liste, puis aux deux bouts. Relecture finale :
// la fenêtre est la même dans les deux roues (celle du Sport, à la largeur de « Moins de 15 min », ne laissait que 2 px de
// gris), et le texte de la valeur du milieu garde 6 px au moins jusqu'à son bord (« Moins de 15 min » passe à la ligne).
const sousLesBords = (page) => page.evaluate(() => [...document.querySelectorAll('.deux-colonnes .roue-choix')].map((g) => {
  const d = g.querySelector('.roue-defile').getBoundingClientRect();
  const sous = (x) => document.elementFromPoint(x, d.top + d.height / 2)?.closest('.roue-valeur')?.textContent ?? null;
  const fenetre = Number.parseFloat(getComputedStyle(g, '::before').width);
  const marge = (d.width - fenetre) / 2;
  const milieu = [...g.querySelectorAll('.roue-valeur')].find((b) => { const q = b.getBoundingClientRect(); return Math.abs(q.left + q.width / 2 - (d.left + d.width / 2)) <= 1; });
  const plage = document.createRange();
  plage.selectNodeContents(milieu);
  const lignes = [...plage.getClientRects()].filter((t) => t.width > 0);
  const jeu = Math.min(...lignes.map((t) => t.left - (d.left + marge)), ...lignes.map((t) => d.right - marge - t.right));
  return { roue: g.getAttribute('aria-label'), sous: [sous(d.left + 2), sous(d.left + d.width / 2), sous(d.right - 2)], marge, jeu };
}));
const auBord = async (page, nom, cote) => {
  const d = await groupe(page, nom).locator('.roue-defile').boundingBox();
  return [cote === 'gauche' ? d.x + 2 : d.x + d.width - 2, d.y + d.height / 2];
};

test('côte à côte, un toucher sur la marge grise autour de la fenêtre vise la valeur du milieu, jamais une voisine invisible (390 et 375, vides, notées au milieu et aux deux bouts)', async ({ page }) => {
  const auMilieu = async (contact, sport) => {
    for (const largeur of [390, 375]) {
      const quoi = `${largeur} · ${contact}, ${sport}`;
      await page.setViewportSize({ width: largeur, height: 844 });
      await page.locator('.deux-colonnes').scrollIntoViewIfNeeded();
      await centreeDans(groupe(page, 'Comment c\'était'), contact);
      await centreeDans(groupe(page, 'Durée du sport'), sport);
      const vu = await sousLesBords(page);
      expect(vu.map((r) => [r.roue, ...r.sous]), quoi).toEqual([['Comment c\'était', contact, contact, contact], ['Durée du sport', sport, sport, sport]]);
      // Le dessin ne change pas : dans les deux cartes, la bande grise se voit sur 8 px de chaque côté de la fenêtre, et le
      // texte du milieu est à 6 px au moins du bord de celle-ci.
      for (const r of vu) {
        expect(r.marge, `${quoi} · ${r.roue}`).toBeCloseTo(8, 1);
        expect(r.jeu, `${quoi} · ${r.roue}`).toBeGreaterThanOrEqual(6);
      }
    }
  };
  await auMilieu('Neutre', '15 à 30 min');
  // Vides, à 375 : un toucher sur la marge de droite du contact note Neutre (et Oui), sur celle de gauche du sport 15 à
  // 30 min.
  await page.touchscreen.tap(...await auBord(page, 'Comment c\'était', 'droite'));
  await expect.poll(() => lue(page)).toMatchObject({ contactHumain: true, contacts: [{ effet: 'contactEffet:neutre' }] });
  await page.touchscreen.tap(...await auBord(page, 'Durée du sport', 'gauche'));
  await expect.poll(() => lue(page)).toMatchObject({ sportMouvement: true, activites: [{ duree: 'dureeSport:de_15_a_30' }] });
  await auMilieu('Neutre', '15 à 30 min');
  // Notées : un toucher sur la marge efface la valeur du milieu, celle qui se voit ; le Oui reste.
  await page.touchscreen.tap(...await auBord(page, 'Comment c\'était', 'gauche'));
  await page.touchscreen.tap(...await auBord(page, 'Durée du sport', 'droite'));
  await expect.poll(() => lue(page)).toMatchObject({ contactHumain: true, contacts: null, sportMouvement: true, activites: null });
  // Aux deux bouts de la liste : d'un côté la place d'une voisine, de l'autre celle d'un espaceur, à 0.
  for (const [contact, sport] of [['Ressourçant', 'Moins de 15 min'], ['Coûteux', 'Plus d\'1 h']]) {
    await dans(groupe(page, 'Comment c\'était'), contact).click();
    await dans(groupe(page, 'Durée du sport'), sport).click();
    await expect(page.locator('.deux-colonnes [aria-pressed="true"]')).toHaveText(['Oui', contact, 'Oui', sport]);
    await auMilieu(contact, sport);
  }
});
