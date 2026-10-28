import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { vueMoment, tuiles, tuile, carte, mot, retourEnergie, touteLaCarte, definition, NOTEE } from '../aides/emotion.js';
import { FAMILLES, MOTS_SANS_FAMILLE } from '../../public/js/domain/roue.js';
import { DEFINITIONS } from '../../public/js/domain/definitions-roue.js';
import { ENERGIES, COTES, EXEMPLES, cleZone, motsDeZone } from '../../public/js/domain/carte-roue.js';

// v8 (2/9) · L'écran « Émotion du moment » en carte, comme How We Feel (spec §4) : une tuile (l'énergie, sous « plutôt
// désagréable » ou « plutôt agréable »), puis un mot sur la carte de bulles, sa définition, et l'écran se ferme 1,5 s
// plus tard. Point de vigilance 5 : deux touchers rapides, l'appui long, l'énergie seule. Réglages › Émotions.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const lireCorrections = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('definitionsRoue'));
const MOTS = FAMILLES.flatMap((f) => f.mots.map((m) => ({ ...m, famille: f.libelle, cle: f.cle })));
const PAR_ID = new Map(MOTS.map((m) => [m.id, m]));
const nomBulle = (id) => `${PAR_ID.get(id).libelle}, famille ${PAR_ID.get(id).famille}`;
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(tuile(vue, 'Haute')).toBeVisible();
  return vue;
};
// La garde de 350 ms passée (la carte ou les tuiles ne sont plus aria-disabled).
const finGarde = (groupe) => expect(groupe).not.toHaveAttribute('aria-disabled', 'true');
// Un appui long à la souris, au centre d'une bulle.
const appuiLong = async (page, bouton, ms = 800) => {
  const b = await bouton.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('relevé en deux touchers : une tuile (l\'énergie), un mot (sa définition) ; l\'écran se ferme 1,5 s plus tard ; plus de note de 1 à 10 ni de famille seule', async ({ page }) => {
  const vue = await ouvrir(page);
  // Six tuiles, trois énergies sur deux côtés, sous « plutôt désagréable » et « plutôt agréable ».
  await expect(tuiles(vue).getByRole('button')).toHaveText([/^Haute/, /^Haute/, /^Moyenne/, /^Moyenne/, /^Basse/, /^Basse/]);
  expect(await tuiles(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')))).toEqual(
    ['haute', 'moyenne', 'basse'].flatMap((e) => [`Énergie ${e}, plutôt désagréable`, `Énergie ${e}, plutôt agréable`]),
  );
  await expect(vue.locator('.cote-tuiles')).toHaveText(['plutôt désagréable', 'plutôt agréable']);
  // Chaque tuile montre ses mots d'exemple, dans l'ordre.
  for (const e of ENERGIES) {
    for (const c of COTES) {
      const t = tuile(vue, e, c === 'gauche' ? 'désagréable' : 'agréable');
      await expect(t.locator('.exemple-tuile')).toHaveText(EXEMPLES[cleZone({ energie: e, cote: c })].map((id) => PAR_ID.get(id).libelle));
    }
  }
  await expect(vue.getByRole('button', { name: /^Humeur \d/ })).toHaveCount(0);
  await expect(vue.getByRole('button', { name: 'Colère', exact: true })).toHaveCount(0);
  // Aucun mot qui juge : ni « positif », ni « négatif », ni « bon », ni « mauvais ».
  await expect(vue).not.toContainText(/positi|négati|\bbon(ne)?s?\b|mauvais/i);

  // Toucher 1 : l'énergie est notée, la carte s'ouvre sur sa zone.
  await tuile(vue, 'Moyenne').click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '21:00', emotion: null, humeur: null, energie: 'energie:moyenne', vers: null }]);
  await expect(carte(vue)).toBeVisible();
  await expect(definition(vue)).toHaveText('Un appui long sur un mot montre son sens, sans le choisir.');
  // Toucher 2 : le mot est noté, sa bulle choisie, sa définition affichée ; l'écran attend 1,5 s.
  await mot(vue, 'Mécontent', 'Colère').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:mecontent', energie: 'energie:moyenne' }]);
  await expect(mot(vue, 'Mécontent', 'Colère')).toHaveAttribute('aria-pressed', 'true');
  await expect(definition(vue)).toHaveText('Mécontent : ce qui se passe, ou ce qu\'on a reçu, ne convient pas.');
  await page.clock.runFor(900);
  await expect(page).toHaveURL(/#\/moment$/);
  // Un autre toucher change le mot et relance le délai.
  await mot(vue, 'Honteux', 'Tristesse').click();
  await expect(definition(vue)).toHaveText('Honteux : l\'envie de se cacher, de disparaître du regard des autres.');
  await page.clock.runFor(900);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page.getByText(NOTEE)).toBeVisible({ timeout: 2000 });
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:tristesse:honteux', humeur: null, energie: 'energie:moyenne', vers: null }]);
  // « Annuler » retire le relevé.
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
});

// « Maintenant ▾ » et la liste « C'était vers… » (v6.1) : seule la puce l'ouvre et la ferme.
const puceQuand = (vue) => vue.locator('.ligne-date > .btn-lien');
const listeVers = (vue) => vue.getByRole('group', { name: 'C\'était vers…' });

test('la fermeture attend sous « Maintenant ▾ » : ouvert dans le délai, l\'écran reste ; une heure choisie, ou la liste refermée, relance le délai', async ({ page }) => {
  let vue = await ouvrir(page);
  await tuile(vue, 'Haute', 'agréable').click();
  await mot(vue, 'Amusé', 'Joie').click();
  await page.clock.runFor(600);
  await puceQuand(vue).click();
  await expect(listeVers(vue)).toBeVisible();
  // Bien au-delà du délai : l'écran attend, la liste ouverte.
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(listeVers(vue)).toBeVisible();
  // Une heure choisie : le relevé passe à « vers 20 h », et l'écran se ferme 1,5 s plus tard.
  await listeVers(vue).getByRole('button', { name: '20 h', exact: true }).click();
  await expect.poll(releves(page)).toMatchObject([{ heure: '20:00', vers: true, emotion: 'roue:joie:amuse', energie: 'energie:haute' }]);
  await page.clock.runFor(900);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 2000 });
  await expect(page.getByText(NOTEE)).toBeVisible();

  // La liste ouverte puis refermée sans choisir : le délai repart à sa fermeture.
  vue = await ouvrir(page);
  await tuile(vue, 'Basse').click();
  await mot(vue, 'Vide', 'Tristesse').click();
  await puceQuand(vue).click();
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/#\/moment$/);
  await puceQuand(vue).click();
  await expect(listeVers(vue)).toHaveCount(0);
  await page.clock.runFor(900);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 2000 });
  await expect.poll(async () => (await releves(page)()).find((h) => h.emotion === 'roue:tristesse:vide')).toMatchObject({ heure: '21:00', vers: null });
});

test('supprimer un relevé du jour pendant le délai : l\'écran reste, « Relevé supprimé · Annuler » aussi ; un nouveau mot réarme la fermeture', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.humeurs.creer({ date: '2026-10-15', heure: '10:20', emotion: 'roue:serenite:calme', energie: 'energie:basse' }));
  const vue = await ouvrir(page);
  const jour = vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' });
  // Le relevé en cours, supprimé dans le délai.
  await tuile(vue, 'Basse').click();
  await mot(vue, 'Vide', 'Tristesse').click();
  await expect(jour.getByRole('button', { name: 'Supprimer le relevé de 21:00' })).toBeVisible();
  await jour.getByRole('button', { name: 'Supprimer le relevé de 21:00' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(1);
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  // Un autre relevé du jour, supprimé dans le délai d'un nouveau mot : l'écran reste, et son « Annuler » le rend.
  await retourEnergie(vue).click();
  await expect(tuiles(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  await tuile(vue, 'Basse').click();
  await mot(vue, 'Isolé', 'Tristesse').click();
  await expect.poll(async () => (await releves(page)()).length).toBe(2);
  await jour.getByRole('button', { name: 'Supprimer le relevé de 10:20' }).click();
  await expect(page.getByText('Relevé supprimé')).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page.getByText('Relevé supprimé')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await releves(page)()).map((h) => h.heure).sort()).toEqual(['10:20', '21:00']);
  // Un nouveau mot : la fermeture revient.
  await mot(vue, 'Replié', 'Tristesse').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 3000 });
  await expect.poll(async () => (await releves(page)()).find((h) => h.heure === '21:00')).toMatchObject({ emotion: 'roue:tristesse:replie', energie: 'energie:basse' });
});

test('la carte s\'ouvre centrée sur la zone de la tuile ; elle glisse dans les deux sens, rien n\'est grisé ; la glisser relance le délai', async ({ page }) => {
  const vue = await ouvrir(page);
  // La zone d'une tuile : ses mots, et la carte en entier (79 bulles), la même à chaque fois.
  const zone = async (cle) => carte(vue).evaluate((c, k) => {
    const z = c.querySelector(`[data-zone="${k}"]`).getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return { gauche: z.left >= r.left - 0.5, droite: z.right <= r.right + 0.5, haut: z.top >= r.top - 0.5 && z.top < r.bottom,
      glisse: [c.scrollWidth > c.clientWidth, c.scrollHeight > c.clientHeight] };
  }, cle);
  for (const e of ENERGIES) {
    for (const c of COTES) {
      await tuile(vue, e, c === 'gauche' ? 'désagréable' : 'agréable').click();
      const cle = cleZone({ energie: e, cote: c });
      await expect(carte(vue).getByRole('button')).toHaveCount(79);
      // Les mots de la zone, dans l'ordre de la carte (domain/carte-roue.js, section de la v8).
      expect(await carte(vue).locator(`[data-zone="${cle}"] button`).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label'))))
        .toEqual(motsDeZone({ energie: e, cote: c }).map(nomBulle));
      expect(await zone(cle), cle).toEqual({ gauche: true, droite: true, haut: true, glisse: [true, true] });
      // Rien n'est grisé : aucune bulle désactivée ni transparente, la garde passée.
      await finGarde(carte(vue));
      expect(await carte(vue).getByRole('button').evaluateAll((bs) => bs.filter((b) => b.disabled || b.getAttribute('aria-disabled') || parseFloat(getComputedStyle(b).opacity) < 1).length)).toBe(0);
      await retourEnergie(vue).click();
    }
  }
  // Un mot choisi, puis la carte qui glisse : l'écran attend, et se ferme 1,5 s après le dernier glissement.
  await tuile(vue, 'Haute', 'agréable').click();
  await mot(vue, 'Amusé', 'Joie').click();
  // Chaque glissement attend son événement « scroll » (ou 200 ms, en butée) : le délai repart avant l'avance suivante.
  for (let i = 0; i < 5; i++) {
    await page.clock.runFor(500);
    await carte(vue).evaluate((c) => new Promise((ok) => { c.addEventListener('scroll', ok, { once: true }); setTimeout(ok, 200); c.scrollBy({ left: -40, top: 30 }); }));
  }
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 3000 });
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:joie:amuse', energie: 'energie:haute' }]);
});

// Les bulles entières dans le cadre de la carte, parmi celles qu'on lui donne (leurs noms).
const entieres = (vue, noms) => carte(vue).evaluate((c, ns) => {
  const r = c.getBoundingClientRect();
  return ns.filter((n) => {
    const q = c.querySelector(`.bulle-carte[aria-label="${n}"]`).getBoundingClientRect();
    return q.left >= r.left - 0.5 && q.right <= r.right + 0.5 && q.top >= r.top - 0.5 && q.bottom <= r.bottom + 0.5;
  });
}, noms);

test('les mots d\'exemple d\'une tuile sont entiers dans le cadre dès l\'ouverture de la carte, même quand la zone, plus haute, s\'ouvre sur son haut', async ({ page }) => {
  const vue = await ouvrir(page);
  for (const e of ENERGIES) {
    for (const c of COTES) {
      const cle = cleZone({ energie: e, cote: c });
      await tuile(vue, e, c === 'gauche' ? 'désagréable' : 'agréable').click();
      await expect(carte(vue).getByRole('button')).toHaveCount(79);
      const noms = EXEMPLES[cle].map(nomBulle);
      expect(await entieres(vue, noms), cle).toEqual(noms);
      await retourEnergie(vue).click();
    }
  }
  // Les zones Moyenne et Basse à gauche sont plus hautes que le cadre : leurs derniers mots ne se voient qu'en glissant.
  await tuile(vue, 'Moyenne').click();
  expect(await entieres(vue, [nomBulle('roue:colere:mecontent'), nomBulle('roue:tristesse:honteux')])).toEqual([]);
});

// Deux touchers à 120 ms d'écart, ici au même point, le centre d'une tuile : sur l'iPhone, width=device-width supprime le
// délai du double toucher, ce sont deux clics. La vue change entre les deux : le second tombe sur la carte qui vient de
// paraître. Les 120 ms sont mesurées sur l'horloge de la page, arrêtée avant le premier toucher (v8, 9/9) : l'horloge qui
// courait ajoutait le temps réel entre les deux, et sous la charge de npm test la garde de 350 ms a expiré une fois avant
// le second. L'appelant la relance (page.clock.resume()) une fois ses vérifications faites.
const toucherDeuxFois = async (page, [x1, y1], [x2, y2]) => {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  await page.touchscreen.tap(x1, y1);
  await page.clock.runFor(120);
  await page.touchscreen.tap(x2, y2);
};
const doubleToucher = async (page, bouton) => {
  const b = await bouton.boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await toucherDeuxFois(page, [x, y], [x, y]);
  return [x, y];
};
const finAnimations = (vue) => vue.locator('.panneau-reponses').evaluate((p) => Promise.all(p.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));
const NOMS_ENERGIE = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };

// Le centre d'une bulle bien visible dans le cadre de la carte (la première de la zone).
const bulleVisible = (vue, cle) => carte(vue).evaluate((c, k) => {
  const r = c.getBoundingClientRect();
  const b = [...c.querySelectorAll(`[data-zone="${k}"] .bulle-carte`)].find((x) => {
    const q = x.getBoundingClientRect();
    return q.left >= r.left && q.right <= r.right && q.top >= r.top && q.bottom <= r.bottom;
  });
  const q = b.getBoundingClientRect();
  return { nom: b.getAttribute('aria-label'), x: q.left + q.width / 2, y: q.top + q.height / 2 };
}, cle);

test('point de vigilance 5 : deux touchers rapides, sur une tuile puis au même endroit ou sur une bulle qui vient de paraître, ne choisissent aucun mot (avec ou sans « Réduire les animations »)', async ({ page }) => {
  test.setTimeout(120000);
  for (const mouvement of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion: mouvement });
    const vue = await ouvrir(page);
    // « Ce que je faisais » ouvert : un mot choisi par erreur ne fermerait pas l'écran, on le verrait.
    await vue.getByRole('button', { name: /^Ce que je faisais/ }).click();
    for (const e of ENERGIES) {
      for (const c of COTES) {
        const quoi = `${e} ${c}, ${mouvement}`;
        const laTuile = tuile(vue, NOMS_ENERGIE[e], c === 'gauche' ? 'désagréable' : 'agréable');
        // 1. Deux touchers au même point, le centre de la tuile.
        await finAnimations(vue);
        await finGarde(tuiles(vue));
        await doubleToucher(page, laTuile);
        await expect(carte(vue), quoi).toBeVisible();
        await page.clock.runFor(400);
        await page.clock.resume();
        expect(await releves(page)(), quoi).toMatchObject([{ emotion: null, energie: `energie:${e}` }]);
        await expect(carte(vue).getByRole('button', { pressed: true }), quoi).toHaveCount(0);
        // 2. La tuile, puis 120 ms plus tard une bulle qui vient de paraître sous le doigt : rien n'est choisi.
        const bulle = await bulleVisible(vue, cleZone({ energie: e, cote: c }));
        await retourEnergie(vue).click();
        await finGarde(tuiles(vue));
        await laTuile.click();
        await expect(laTuile, quoi).toHaveAttribute('aria-pressed', 'false');
        const t = await laTuile.boundingBox();
        await toucherDeuxFois(page, [t.x + t.width / 2, t.y + t.height / 2], [bulle.x, bulle.y]);
        await expect(carte(vue), quoi).toBeVisible();
        await page.clock.runFor(400);
        await page.clock.resume();
        expect(await releves(page)(), quoi).toMatchObject([{ emotion: null, energie: `energie:${e}` }]);
        await expect(carte(vue).getByRole('button', { pressed: true }), quoi).toHaveCount(0);
        // La garde passée, le même toucher choisit la bulle : c'est bien la garde qui a joué.
        await page.touchscreen.tap(bulle.x, bulle.y);
        await expect(carte(vue).getByRole('button', { name: bulle.nom, exact: true }), quoi).toHaveAttribute('aria-pressed', 'true');
        await carte(vue).getByRole('button', { name: bulle.nom, exact: true }).click();
        await expect(carte(vue).getByRole('button', { pressed: true }), quoi).toHaveCount(0);
        await retourEnergie(vue).click();
      }
    }
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.evaluate(async () => { for (const h of await window.__carnet.repo.humeurs.tous()) await window.__carnet.repo.humeurs.supprimer(h.id); });
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('point de vigilance 5 : un appui long montre la définition sans rien choisir ; l\'écran ne se ferme pas ; un toucher ensuite choisit', async ({ page }) => {
  const vue = await ouvrir(page);
  await tuile(vue, 'Basse').click();
  await finGarde(carte(vue));
  const vide = mot(vue, 'Vide', 'Tristesse');
  await appuiLong(page, vide);
  await expect(definition(vue)).toHaveText('Vide : plus rien à l\'intérieur, comme engourdi.');
  await expect(vide).toHaveAttribute('aria-pressed', 'false');
  await expect(vide).toHaveClass(/montree/);
  await page.clock.runFor(1800);
  await expect(page).toHaveURL(/#\/moment$/);
  expect(await releves(page)()).toMatchObject([{ emotion: null, energie: 'energie:basse' }]);
  // Un appui long levé hors de la bulle (le doigt a glissé) : rien n'est choisi, et le clic suivant sans pointeur
  // (Entrée, une aide technique) n'est pas avalé : Isolé est choisi du premier coup.
  const b = await vide.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.clock.runFor(800);
  await page.mouse.move(5, 5, { steps: 4 });
  await page.mouse.up();
  await expect(vide).toHaveAttribute('aria-pressed', 'false');
  expect(await releves(page)()).toMatchObject([{ emotion: null, energie: 'energie:basse' }]);
  await mot(vue, 'Isolé', 'Tristesse').press('Enter');
  await expect(mot(vue, 'Isolé', 'Tristesse')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse:isole' }]);
  // Un appui long sur un autre mot, un mot déjà choisi : rien ne change que la définition ; le délai est relancé.
  await appuiLong(page, vide);
  await expect(definition(vue)).toHaveText('Vide : plus rien à l\'intérieur, comme engourdi.');
  await expect(mot(vue, 'Isolé', 'Tristesse')).toHaveAttribute('aria-pressed', 'true');
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:tristesse:isole' }]);
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 3000 });
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse:isole', energie: 'energie:basse' }]);
});

test('point de vigilance 5 : fermer avec l\'énergie seule la garde ; « Toute la carte » ouvre la carte sans énergie', async ({ page }) => {
  let vue = await ouvrir(page);
  await tuile(vue, 'Haute').click();
  await expect(carte(vue)).toBeVisible();
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  await expect.poll(releves(page)).toMatchObject([{ emotion: null, energie: 'energie:haute' }]);
  // Fermer sans rien : aucun relevé de plus, aucun message.
  vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await releves(page)()).toHaveLength(1);

  // « Toute la carte » : la carte, sans tuile choisie ni relevé ; un mot note l'émotion seule, puis l'écran se ferme.
  vue = await ouvrir(page);
  await touteLaCarte(vue).click();
  await expect(carte(vue).getByRole('button')).toHaveCount(79);
  await page.clock.runFor(150);
  expect(await releves(page)()).toHaveLength(1);
  // Au milieu de la carte : la bande Moyenne, des deux côtés du centre.
  const vu = await carte(vue).evaluate((c) => {
    const r = c.getBoundingClientRect();
    const dedans = (z) => { const q = c.querySelector(`[data-zone="${z}"]`).getBoundingClientRect(); return q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom; };
    return ['moyenne-gauche', 'moyenne-droite'].map(dedans);
  });
  expect(vu).toEqual([true, true]);
  await mot(vue, 'Calme', 'Sérénité').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/, { timeout: 3000 });
  await expect.poll(async () => (await releves(page)()).find((h) => h.emotion)).toMatchObject({ emotion: 'roue:serenite:calme', energie: null });
  // Retour aux tuiles : aucune n'est cochée sans énergie.
  vue = await ouvrir(page);
  await expect(tuiles(vue).getByRole('button', { pressed: true })).toHaveCount(0);
});

// Relecture finale : « Toute la carte » s'ouvre au milieu, sur la moitié de chaque zone Moyenne ; or la légende de gauche
// était au bord gauche de sa zone, et celle de droite au bord droit : toutes deux hors du cadre, rien ne disait quel côté
// était désagréable et lequel agréable. Elles sont rangées contre le centre, comme les bulles, et tiennent dans la moitié.
test('« Toute la carte » montre ses deux légendes entières, plutôt désagréable à gauche et plutôt agréable à droite, à 390 et 375 de large, au texte par défaut et à 23 px ; depuis une tuile, la légende de la zone aussi', async ({ page }) => {
  // Les légendes dont le texte est entier dans le cadre de la carte, à la marge de la page (14 px) au moins de ses côtés.
  const visibles = (vue, ids) => carte(vue).evaluate((c, ls) => {
    const r = c.getBoundingClientRect();
    return ls.map((id) => c.querySelector(`#${id}`)).filter((l) => {
      const plage = document.createRange();
      plage.selectNodeContents(l);
      const t = plage.getBoundingClientRect();
      return t.left >= r.left + 13.5 && t.right <= r.right - 13.5 && t.top >= r.top - 0.5 && t.bottom <= r.bottom + 0.5;
    }).map((l) => [l.textContent, Math.round(l.getBoundingClientRect().left - r.left)]);
  }, ids);
  for (const largeur of [390, 375]) {
    for (const taille of [null, 23]) {
      const quoi = `${largeur} · ${taille || 'texte par défaut'}`;
      await page.setViewportSize({ width: largeur, height: 844 });
      await page.evaluate((x) => { document.documentElement.style.fontSize = x ? `${x}px` : ''; }, taille);
      const vue = await ouvrir(page);
      await touteLaCarte(vue).click();
      await expect(carte(vue).getByRole('button')).toHaveCount(79);
      const [gauche, droite] = await visibles(vue, ['legende-moyenne-gauche', 'legende-moyenne-droite']);
      expect([gauche?.[0], droite?.[0]], quoi).toEqual(['Moyenne · plutôt désagréable', 'Moyenne · plutôt agréable']);
      expect(gauche[1], `${quoi} : désagréable à gauche`).toBeLessThan(droite[1]);
      await retourEnergie(vue).click();
      for (const e of ENERGIES) {
        for (const c of COTES) {
          const cle = cleZone({ energie: e, cote: c });
          await tuile(vue, e, c === 'gauche' ? 'désagréable' : 'agréable').click();
          await expect(carte(vue).getByRole('button')).toHaveCount(79);
          expect(await visibles(vue, [`legende-${cle}`]), `${quoi} · ${cle}`).toHaveLength(1);
          await retourEnergie(vue).click();
        }
      }
      await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
});

// Style d'une bulle de la carte et de son libellé.
const stylesBulles = (vue) => carte(vue).evaluate(async (c) => {
  await Promise.all(c.closest('.panneau-reponses').getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  return [...c.querySelectorAll('button')].map((b) => {
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const svg = b.querySelector(':scope > .coche svg');
    return { nom: b.getAttribute('aria-label'), choisi: b.getAttribute('aria-pressed') === 'true', fond: s.backgroundColor, texte: s.color,
      graisse: s.fontWeight, rayon: s.borderTopLeftRadius, largeur: b.offsetWidth, hauteur: b.offsetHeight,
      coche: Boolean(svg && getComputedStyle(b.querySelector(':scope > .coche')).display !== 'none' && svg.getBoundingClientRect().width >= 15),
      trait: svg ? svg.getAttribute('stroke-width') : null, famille: [...b.classList].find((k) => k.startsWith('emo-')).slice(4) };
  });
});

test('bulles et tuiles, en clair et en sombre : couleur de la famille, AA, 44 pt au moins, rondes ; le choix fait a -fill, -on, 600 et la coche', async ({ page }) => {
  // Le texte d'une famille (-text) sur sa teinte (-tint-2) et, sur une tuile, sur --surface-2.
  for (const [schema, t] of [['clair', clair], ['sombre', sombre]]) {
    for (const f of FAMILLES) {
      expect(contraste(t[`c-emo-${f.cle}-text`], t[`c-emo-${f.cle}-tint-2`]), `${schema} ${f.libelle}`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(t[`c-emo-${f.cle}-text`], t['surface-2']), `${schema} ${f.libelle} sur une tuile`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(t[`c-emo-${f.cle}-on`], t[`c-emo-${f.cle}-fill`]), `${schema} ${f.libelle} choisie`).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    await vue.getByRole('button', { name: /^Ce que je faisais/ }).click();
    // Les tuiles non choisies : --surface-2, texte --text, 400 (comme tout choix non fait), sans coche ; leurs mots
    // d'exemple à la couleur de leur famille.
    const tuilesStyles = await tuiles(vue).evaluate((g) => [...g.querySelectorAll('button')].map((b) => ({
      fond: getComputedStyle(b).backgroundColor, texte: getComputedStyle(b).color, graisse: getComputedStyle(b).fontWeight, hauteur: b.offsetHeight,
      exemples: [...b.querySelectorAll('.exemple-tuile')].map((x) => [[...x.classList].find((k) => k.startsWith('emo-')).slice(4), getComputedStyle(x).color]),
    })));
    for (const s of tuilesStyles) {
      expect([s.fond, s.texte, s.graisse], schema).toEqual([rgb(t['surface-2']), rgb(t.text), '400']);
      expect(s.hauteur).toBeGreaterThanOrEqual(44);
      for (const [f, couleur] of s.exemples) expect(couleur, `${schema} ${f}`).toBe(rgb(t[`c-emo-${f}-text`]));
    }
    await tuile(vue, 'Haute', 'agréable').click();
    // Toutes les bulles des six zones.
    const avant = await stylesBulles(vue);
    expect(avant).toHaveLength(79);
    for (const b of avant) {
      const c = (role) => rgb(t[`c-emo-${b.famille}${role}`]);
      expect([b.fond, b.texte, b.graisse, b.coche], `${schema} ${b.nom}`).toEqual([c('-tint-2'), c('-text'), '500', false]);
      expect(contraste(b.fond, b.texte), `${schema} ${b.nom} : AA`).toBeGreaterThanOrEqual(4.5);
      expect(Math.min(b.largeur, b.hauteur), `${schema} ${b.nom} : 44 pt`).toBeGreaterThanOrEqual(44);
      expect(Math.abs(b.largeur - b.hauteur), `${schema} ${b.nom} : ronde`).toBeLessThanOrEqual(1);
      expect(b.rayon).toBe('50%');
    }
    // Un mot choisi : -fill, -on, 600, coche de trait 3 ; il grossit sans bouger ses voisines.
    const places = () => carte(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => [b.offsetLeft, b.offsetTop, b.offsetWidth]));
    const placesAvant = await places();
    await mot(vue, 'Inspiré', 'Joie').click();
    await expect(mot(vue, 'Inspiré', 'Joie')).toHaveAttribute('aria-pressed', 'true');
    const apres = await stylesBulles(vue);
    const [choisie] = apres.filter((b) => b.choisi);
    expect(choisie.nom).toBe('Inspiré, famille Joie');
    expect([choisie.fond, choisie.texte, choisie.graisse, choisie.coche, choisie.trait]).toEqual([rgb(t['c-emo-joie-fill']), rgb(t['c-emo-joie-on']), '600', true, '3']);
    expect(await places()).toEqual(placesAvant);
    const echelle = await mot(vue, 'Inspiré', 'Joie').evaluate((b) => b.getBoundingClientRect().width / b.offsetWidth);
    expect(echelle).toBeGreaterThan(1.05);
    // La définition : le mot à la couleur de sa famille, AA sur le panneau.
    const [couleur, fond] = await vue.locator('.mot-definition').evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.closest('.panneau-reponses')).backgroundColor]);
    expect(couleur).toBe(rgb(t['c-emo-joie-text']));
    expect(contraste(couleur, fond)).toBeGreaterThanOrEqual(4.5);
    // La tuile choisie, de retour aux tuiles : la couleur du parcours, -on, 600 et coche.
    await retourEnergie(vue).click();
    const choisieT = await tuile(vue, 'Haute', 'agréable').evaluate((b) => ({
      fond: getComputedStyle(b).backgroundColor, texte: getComputedStyle(b).color, graisse: getComputedStyle(b).fontWeight,
      coche: getComputedStyle(b.querySelector('.coche')).display !== 'none', exemples: [...b.querySelectorAll('.exemple-tuile')].map((x) => getComputedStyle(x).color),
    }));
    expect(choisieT).toEqual({ fond: rgb(t['c-humeur-fill']), texte: rgb(t['c-humeur-on']), graisse: '600', coche: true, exemples: choisieT.exemples.map(() => rgb(t['c-humeur-on'])) });
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.evaluate(async () => { for (const h of await window.__carnet.repo.humeurs.tous()) await window.__carnet.repo.humeurs.supprimer(h.id); });
  }
});

// Chaque libellé dans sa bulle (coins compris, dans le cercle) et chaque tuile sans débordement ; la page ne défile pas
// de côté ; les boutons hors de la carte (qui glisse) restent dans l'écran.
const debordements = (vue) => vue.evaluate((v) => {
  const fautes = [];
  if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px`);
  for (const b of v.querySelectorAll('.bulle-carte')) {
    const r = b.getBoundingClientRect();
    const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
    const l = b.querySelector('.libelle-choix');
    const rg = document.createRange();
    rg.selectNodeContents(l.firstChild);
    for (const q of rg.getClientRects()) {
      if (![[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].every(([x, y]) => Math.hypot(x - cx, y - cy) <= rayon + 0.5)) fautes.push(`${b.getAttribute('aria-label')} : hors du cercle`);
    }
    if (Math.abs(r.width - r.height) > 1) fautes.push(`${b.getAttribute('aria-label')} : pas ronde`);
  }
  for (const b of v.querySelectorAll('.tuile-emotion, .definition-carte, .tete-reponse')) {
    if (b.scrollWidth > b.clientWidth + 0.5) fautes.push(`${b.className} : déborde`);
  }
  for (const b of v.querySelectorAll('button')) {
    if (b.closest('.carte-cadre')) continue;
    const r = b.getBoundingClientRect();
    if (r.width && (r.left < -0.5 || r.right > innerWidth + 0.5)) fautes.push(`${b.textContent.trim()} : hors de l'écran`);
  }
  return fautes;
});

test('en grand texte (17, 19, 21, 23), les tuiles et la carte : chaque mot dans sa bulle, rien ne déborde des 390 px', async ({ page }) => {
  test.setTimeout(60000);
  for (const taille of [17, 19, 21, 23]) {
    const vue = await ouvrir(page);
    await vue.getByRole('button', { name: /^Ce que je faisais/ }).click();
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    expect(await debordements(vue), `tuiles, ${taille} px`).toEqual([]);
    await tuile(vue, 'Moyenne').click();
    await expect(carte(vue).getByRole('button')).toHaveCount(79);
    await finAnimations(vue);
    expect(await debordements(vue), `carte, ${taille} px`).toEqual([]);
    // Le mot le plus long, choisi, et la définition la plus longue.
    await mot(vue, 'Désillusionné', 'Surprise').click();
    await finAnimations(vue);
    expect(await debordements(vue), `Désillusionné choisi, ${taille} px`).toEqual([]);
    await mot(vue, 'Jaloux', 'Colère').click();
    await expect(definition(vue)).toContainText('Jaloux');
    expect(await debordements(vue), `définition de Jaloux, ${taille} px`).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
});

// Le haut du nom d'énergie de chaque tuile, et le nombre de lignes de ses mots d'exemple, dans l'ordre des tuiles.
const nomsDesTuiles = (vue) => tuiles(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => {
  const lignes = new Set([...b.querySelectorAll('.exemple-tuile')].map((x) => Math.round(x.getBoundingClientRect().top)));
  return { haut: b.querySelector('.libelle-choix').getBoundingClientRect().top, lignes: lignes.size };
}));

test('les tuiles (contrôle v8) : sur une rangée, les deux noms d\'énergie sont à la même hauteur, même quand les mots d\'exemple d\'une seule passent à la ligne ; tuile choisie comprise', async ({ page }) => {
  for (const taille of [null, 21, 23]) {
    const vue = await ouvrir(page);
    await page.evaluate((x) => { document.documentElement.style.fontSize = x ? `${x}px` : ''; }, taille);
    for (const choisie of [false, true]) {
      if (choisie) {
        await tuile(vue, 'Haute', 'agréable').click();
        await retourEnergie(vue).click();
        await expect(tuile(vue, 'Haute', 'agréable')).toHaveAttribute('aria-pressed', 'true');
      }
      const noms = await nomsDesTuiles(vue);
      const ou = `${taille ? `${taille} px` : 'défaut'}${choisie ? ', Haute agréable choisie' : ''}`;
      // Au texte par défaut, la tuile Haute de droite a ses exemples sur deux lignes, celle de gauche sur une : le cas
      // où un contenu centré décalait les deux noms.
      if (!taille) expect([noms[0].lignes, noms[1].lignes], ou).toEqual([1, 2]);
      for (let r = 0; r < 3; r += 1) expect(Math.abs(noms[2 * r].haut - noms[2 * r + 1].haut), `${ou}, rangée ${r + 1}`).toBeLessThanOrEqual(0.5);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
});

test('Réglages › Émotions : les mots par famille et leur sens ; un toucher ouvre le champ, la sortie l\'enregistre ; « Revenir au texte de Carnet »', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Émotions', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/emotions$/);
  await expect(page.getByRole('heading', { name: 'Émotions', level: 1 })).toBeVisible();
  // Sept familles, dans l'ordre de la roue, puis « Sans famille » (v9 : Fatigué, Épuisé) ; sous chacune, ses mots et le
  // texte de Carnet.
  await expect(page.locator('main h2')).toHaveText([...FAMILLES.map((f) => f.libelle), 'Sans famille']);
  // Le point de « Sans famille » est creux : aucune couleur de famille.
  await expect(page.getByRole('region', { name: 'Sans famille', exact: true }).locator('.point-famille')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  for (const f of [...FAMILLES, { libelle: 'Sans famille', mots: MOTS_SANS_FAMILLE }]) {
    const section = page.getByRole('region', { name: f.libelle, exact: true });
    await expect(section.locator('.mot-definitions')).toHaveText(f.mots.map((m) => m.libelle));
    await expect(section.locator('.texte-definitions')).toHaveText(f.mots.map((m) => DEFINITIONS[m.id]));
  }
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(0);
  // La sortie du champ l'enregistre.
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(1);
  // Un autre mot : le premier se referme sur son nouveau texte.
  await page.getByRole('button', { name: /^Calme Rien/ }).click();
  await expect(page.getByRole('textbox', { name: 'Calme', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Irrité Agacé par un bruit qui revient.' })).toBeVisible();
  // Vider le champ pour le réécrire : la correction reste jusqu'à la sortie, et « Revenir au texte de Carnet » avec elle.
  await page.getByRole('button', { name: 'Irrité Agacé par un bruit qui revient.' }).click();
  const irrite = page.getByRole('textbox', { name: 'Irrité', exact: true });
  await expect(irrite).toBeFocused();
  await irrite.fill('');
  await page.clock.runFor(700);
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(1);
  expect(await lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });
  await irrite.pressSequentially('Agacé par un bruit qui revient.');
  await page.clock.runFor(700);
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(1);
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await page.clock.runFor(300);
  expect(await lireCorrections(page)).toEqual({ 'roue:colere:irrite': 'Agacé par un bruit qui revient.' });

  // Sur la carte, le texte corrigé : un appui long sur Irrité (Moyenne, plutôt désagréable).
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await tuile(vue, 'Moyenne').click();
  await finGarde(carte(vue));
  await mot(vue, 'Irrité', 'Colère').scrollIntoViewIfNeeded();
  await appuiLong(page, mot(vue, 'Irrité', 'Colère'));
  await expect(definition(vue)).toHaveText('Irrité : agacé par un bruit qui revient.');
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();

  // « Revenir au texte de Carnet » retire la correction ; la carte reprend le texte de Carnet.
  await aller(page, '#/reglages/emotions');
  await page.getByRole('button', { name: 'Revenir au texte de Carnet' }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({});
  await expect(page.getByRole('button', { name: `Irrité ${DEFINITIONS['roue:colere:irrite']}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revenir au texte de Carnet' })).toHaveCount(0);
  // Un champ vidé, ou remis au texte de Carnet, n'est pas une correction.
  await page.getByRole('button', { name: /^Calme Rien/ }).click();
  const calme = page.getByRole('textbox', { name: 'Calme', exact: true });
  await calme.fill('');
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await page.clock.runFor(700);
  expect(await lireCorrections(page)).toEqual({});
  // v9 : un mot sans famille se corrige comme les autres, puis revient au texte de Carnet.
  const sansFamille = page.getByRole('region', { name: 'Sans famille', exact: true });
  await sansFamille.getByRole('button', { name: `Fatigué ${DEFINITIONS['roue:aucune:fatigue']}` }).click();
  const fatigue = page.getByRole('textbox', { name: 'Fatigué', exact: true });
  await expect(fatigue).toBeFocused();
  await fatigue.fill('Lourd, envie de poser la tête.');
  await page.getByRole('heading', { name: 'Émotions', level: 1 }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({ 'roue:aucune:fatigue': 'Lourd, envie de poser la tête.' });
  await sansFamille.getByRole('button', { name: 'Revenir au texte de Carnet' }).click();
  await expect.poll(() => lireCorrections(page)).toEqual({});
  await expect(page.getByRole('textbox', { name: 'Fatigué', exact: true })).toHaveValue(DEFINITIONS['roue:aucune:fatigue']);
  // Épuisé ouvert, Fatigué se referme sur le texte de Carnet.
  await sansFamille.getByRole('button', { name: `Épuisé ${DEFINITIONS['roue:aucune:epuise']}` }).click();
  await expect(page.getByRole('textbox', { name: 'Épuisé', exact: true })).toBeFocused();
  await expect(sansFamille.getByRole('button', { name: `Fatigué ${DEFINITIONS['roue:aucune:fatigue']}` })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
});
