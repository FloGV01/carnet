import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, simulerZonesSures } from '../aides/saisie.js';
import { contraste } from '../aides/couleurs.js';
import {
  vueMoment, bulles, bulle, carte, mot, toucherMot, finMouvements, retour, fermer, continuer, carteDuBas, noter, finir, faisais, activite, terminer, changerMot,
  supprimerReleve, NOMS_BULLES, NOTEE, SUPPRIME,
} from '../aides/emotion.js';
import { DEFINITIONS } from '../../public/js/domain/definitions-roue.js';
import { energieDe, motsDeLaCarte } from '../../public/js/domain/carte-roue.js';
import { couleurCase, couleurLisible } from '../../public/js/ui/carte-geometrie.js';
import { canaux } from '../aides/couleurs.js';

// v9 (4/8) · L'émotion comme How We Feel, en plein écran (spec §4.1, §4.2, §5 et §7 ; visuel-hwf.md §1, §2 et §4) :
// l'écran 1 (quatre bulles, « Maintenant ▾ ») et l'écran 2 (la carte de 144 mots, la carte du bas, la flèche). Toucher
// une couleur n'écrit rien ; toucher un mot écrit le relevé (le mot et l'énergie de sa case) ; le retoucher l'efface.
// Points de vigilance 2 (très grand texte), 3 (relevé interrompu) et 5 (deux touchers rapides). v9 (5/8) : la flèche
// mène à l'écran 3, « Ce que je faisais », et « Terminer » ferme ; un relevé rouvert (#/moment/ID) s'ouvre sur l'écran 3
// (tests en fin de fichier, point de vigilance 1 compris). Données inventées. Horloge : jeudi 15 octobre 2026, 21:00
// (390 × 844).
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());
// La couleur de la case d'un mot de la carte (visuel §2.5), en « rgb(…) ».
const MOTS_CARTE = motsDeLaCarte(null);
const caseDe = (libelle) => { const m = MOTS_CARTE.find((x) => x.libelle === libelle); return couleurCase(m.col, m.rang); };
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const rgbCase = (libelle) => rgb(caseDe(libelle));
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  return vue;
};
// La garde de 350 ms passée (plus rien d'aria-disabled).
const finGarde = (groupe) => expect(groupe).not.toHaveAttribute('aria-disabled', 'true');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('une couleur n\'écrit rien ; le mot écrit le relevé, avec l\'énergie de sa case ; la carte du bas dit son sens ; la flèche, puis Terminer, ferment', async ({ page }) => {
  const vue = await ouvrir(page);
  await expect(vue.getByRole('heading', { name: 'Touche la couleur la plus proche de ce moment', level: 1 })).toBeVisible();
  expect(await bulles(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')))).toEqual(Object.values(NOMS_BULLES));
  await expect(bulles(vue).locator('.face')).toHaveText(['Énergie hauteDésagréable', 'Énergie hauteAgréable', 'Énergie basseDésagréable', 'Énergie basseAgréable']);
  // Aucun mot qui juge.
  await expect(vue).not.toContainText(/positi|négati|\bbon(ne)?s?\b|mauvais/i);

  await bulle(vue, 'bleu').click();
  await expect(carte(vue).getByRole('button')).toHaveCount(144);
  await expect(carte(vue).getByRole('group', { name: 'Énergie basse · désagréable', exact: true })).toBeFocused();
  await page.clock.runFor(150);
  expect(await releves(page)()).toEqual([]);
  await expect(carteDuBas(vue)).toHaveCount(0);

  await toucherMot(vue, 'Vide');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '21:00', vers: null, emotion: 'roue:tristesse:vide', energie: 'energie:basse', humeur: null }]);
  await expect(mot(vue, 'Vide')).toHaveAttribute('aria-pressed', 'true');
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Vide');
  await expect(carteDuBas(vue).locator('.definition-carte-du-bas')).toHaveText(DEFINITIONS['roue:tristesse:vide']);
  // La flèche : l'écran 3, le mot en rappel ; « Terminer » ferme, le relevé est noté ; « Annuler » le retire.
  await continuer(vue).click();
  await expect(vue.getByRole('heading', { name: 'Vide', level: 1 })).toBeFocused();
  await expect(page).toHaveURL(/#\/moment$/);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
});

test('un autre mot remplace le mot et son énergie ; retoucher le mot choisi l\'efface, énergie comprise, et le relevé part ; un mot de plus en recrée un', async ({ page }) => {
  const vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Furieux');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:furieux', energie: 'energie:haute' }]);
  const [{ id }] = await releves(page)();
  // Préoccupé, rang 8 : énergie moyenne. Le même relevé.
  await toucherMot(vue, 'Préoccupé');
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:peur:preoccupe', energie: 'energie:moyenne' }]);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Préoccupé');
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText(['Préoccupé']);
  // Retouché : plus de mot ni d'énergie, il ne reste rien, le relevé est supprimé ; la carte du bas s'en va.
  await toucherMot(vue, 'Préoccupé');
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(carteDuBas(vue)).toHaveCount(0);
  // Un nouveau mot : un nouveau relevé.
  await toucherMot(vue, 'Irrité');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute' }]);
  expect((await releves(page)())[0].id).not.toBe(id);
});

test('revenir aux couleurs puis ✕ gardent le relevé, et la carte le montre encore ; fermer sans rien n\'écrit rien ni ne dit rien', async ({ page }) => {
  let vue = await ouvrir(page);
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await page.clock.runFor(200);
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  expect(await releves(page)()).toEqual([]);

  // Une couleur, puis ← et ✕ : rien.
  vue = await ouvrir(page);
  await bulle(vue, 'jaune').click();
  await retour(vue).click();
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await releves(page)()).toEqual([]);

  vue = await ouvrir(page);
  await noter(vue, 'jaune', 'Curieux');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:joie:curieux', energie: 'energie:haute' }]);
  // ← : l'écran 1, le focus sur le titre ; le relevé reste.
  await retour(vue).click();
  await expect(carte(vue)).toHaveCount(0);
  await expect(vue.getByRole('heading', { level: 1 })).toBeFocused();
  // Une autre couleur : la carte s'ouvre sur sa zone, le mot toujours choisi, avec sa carte du bas.
  await bulle(vue, 'vert').click();
  await expect(carte(vue).getByRole('group', { name: 'Énergie basse · agréable', exact: true })).toBeFocused();
  await expect(mot(vue, 'Curieux')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Curieux');
  await retour(vue).click();
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:joie:curieux', energie: 'energie:haute' }]);
});

test('la flèche, puis « Terminer » touché deux fois pendant l\'écriture : l\'écran attend la fin de l\'écriture, le relevé porte le dernier mot, « Émotion du moment notée » une seule fois', async ({ page }) => {
  const vue = await ouvrir(page);
  await noter(vue, 'vert', 'Calme');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:serenite:calme' }]);
  await page.evaluate(() => {
    // L'écriture du second mot est retenue ; chaque message « Émotion du moment notée » a son identifiant : on les compte.
    const humeurs = window.__carnet.repo.humeurs;
    const modifierVraiment = humeurs.modifier;
    const retenue = new Promise((ok) => { window.__ouvrirEcriture = ok; });
    humeurs.modifier = async (...args) => { await retenue; return modifierVraiment(...args); };
    window.__messages = new Set();
    window.__carnet.etatApp.abonner((e) => { if (e.toast && e.toast.texte === 'Émotion du moment notée') window.__messages.add(e.toast.id); });
  });
  await toucherMot(vue, 'Serein');
  await continuer(vue).click();
  await terminer(vue).click();
  await terminer(vue).click();
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/moment$/);
  await page.evaluate(() => window.__ouvrirEcriture());
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  await page.clock.runFor(1600);
  expect(await page.evaluate(() => window.__messages.size)).toBe(1);
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:serenite:serein', energie: 'energie:basse' }]);
});

test('plein écran, fond noir en clair comme en sombre, des bulles à l\'écran 3 : ni barre d\'onglets ni en-tête de Carnet ; la carte défile dans son cadre, la page jamais de côté ; aucune violation de CSP', async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.sourceFile || ''}`));
  });
  await page.reload();
  await appPrete(page);
  const etat = () => page.evaluate(() => {
    const ecran = document.querySelector('.moment-plein');
    const r = ecran.getBoundingClientRect();
    return { fond: getComputedStyle(ecran).backgroundColor, onglets: document.querySelectorAll('nav.onglets').length,
      entete: document.querySelectorAll('.parcours, .parcours-tete').length, couvre: [r.top, r.left, r.width, r.height],
      deCote: document.documentElement.scrollWidth > innerWidth || scrollX !== 0 };
  });
  const attendu = { fond: 'rgb(0, 0, 0)', onglets: 0, entete: 0, couvre: [0, 0, 390, 844], deCote: false };
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    expect(await etat(), `${schema}, écran 1`).toEqual(attendu);
    await bulle(vue, 'vert').click();
    await expect(carte(vue)).toBeVisible();
    expect(await etat(), `${schema}, carte`).toEqual(attendu);
    await toucherMot(vue, 'Calme');
    await expect(carteDuBas(vue)).toBeVisible();
    expect(await etat(), `${schema}, un mot`).toEqual(attendu);
    // Le cadre de la carte défile dans les deux sens ; la page reste en place.
    const cadre = await page.locator('.carte-defile').evaluate(async (c) => {
      const avant = [c.scrollLeft, c.scrollTop];
      c.scrollBy({ left: 260, top: 300 });
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      return { bouge: c.scrollLeft !== avant[0] && c.scrollTop !== avant[1], glisse: [c.scrollWidth > c.clientWidth, c.scrollHeight > c.clientHeight] };
    });
    expect(cadre).toEqual({ bouge: true, glisse: [true, true] });
    expect(await etat(), `${schema}, carte glissée`).toEqual(attendu);
    await continuer(vue).click();
    await expect(faisais(vue)).toBeVisible();
    expect(await etat(), `${schema}, écran 3`).toEqual(attendu);
    await terminer(vue).click();
    await expect(page.locator('nav.onglets')).toBeVisible();
  }
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
});

test('l\'écran 1 aux mesures de How We Feel (visuel §1) : ✕ en verre de 48 × 44, le titre, quatre bulles de 145 en grille 2 × 2 sur leurs halos, « Maintenant ▾ » dessous', async ({ page }) => {
  await simulerZonesSures(page);
  const vue = await ouvrir(page);
  await page.evaluate(() => document.fonts.ready);
  const m = await vue.evaluate((v) => {
    const boite = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map((x) => Math.round(x * 10) / 10); };
    const titre = v.querySelector('h1');
    return {
      fermer: boite(v.querySelector('.verre')), fondFermer: getComputedStyle(v.querySelector('.verre')).backgroundColor,
      titre: boite(titre), police: [getComputedStyle(titre).fontWeight, getComputedStyle(titre).color],
      faces: [...v.querySelectorAll('.bulle-zone .face')].map(boite),
      halos: [...v.querySelectorAll('.bulle-zone')].map((b) => [...b.querySelectorAll('.halo')].map((h) => [getComputedStyle(h).opacity, getComputedStyle(h).backgroundColor])),
      faceFond: [...v.querySelectorAll('.bulle-zone .face')].map((f) => getComputedStyle(f).backgroundColor),
      puce: boite(v.querySelector('.puce-quand')),
    };
  });
  expect(m.fermer).toEqual([16, 47.3, 48, 44]);
  expect(m.fondFermer).toBe('rgb(27, 27, 27)');
  expect(m.titre[1]).toBe(121);
  expect(m.police).toEqual(['700', 'rgb(255, 255, 255)']);
  // Les faces : 145 de diamètre, à leurs places mesurées (à 2 pt près), sur une grille carrée.
  const attendues = [[39.1, 306.3], [205.5, 306.1], [39.1, 472.8], [205.5, 473.1]];
  m.faces.forEach(([x, y, l, h], i) => {
    expect([l, h]).toEqual([145, 145]);
    expect(Math.abs(x - attendues[i][0]), `face ${i} : x`).toBeLessThanOrEqual(2);
    expect(Math.abs(y - attendues[i][1]), `face ${i} : y`).toBeLessThanOrEqual(2);
  });
  // Trois halos par bulle, à 80 %, de la couleur médiane de leur bulle, qui est aussi le fond de la face (sous le dégradé).
  expect(m.faceFond).toEqual(['rgb(254, 76, 64)', 'rgb(255, 208, 76)', 'rgb(120, 159, 255)', 'rgb(76, 227, 155)']);
  m.halos.forEach((hs, i) => expect(hs).toEqual(Array(3).fill(['0.8', m.faceFond[i]])));
  // « Maintenant ▾ » sous les bulles.
  expect(m.puce[1]).toBeGreaterThan(m.faces[3][1] + 145);
  await expect(vue.locator('.puce-quand')).toHaveText('Maintenant');
});

test('la carte s\'ouvre sur le milieu de la zone touchée, ses 144 mots, et le focus sur cette zone ; elle défile dans les deux sens', async ({ page }) => {
  const vue = await ouvrir(page);
  for (const zone of Object.keys(NOMS_BULLES)) {
    await bulle(vue, zone).click();
    await expect(carte(vue).getByRole('button')).toHaveCount(144);
    const vu = await page.evaluate(() => {
      const c = document.querySelector('.carte-defile');
      let proche = null;
      for (const b of c.querySelectorAll('.bulle-mot')) {
        const r = b.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - innerWidth / 2, r.top + r.height / 2 - innerHeight / 2);
        if (!proche || d < proche.d) proche = { d, zone: b.closest('[data-zone]').dataset.zone };
      }
      // Les bords de l'écran sont couverts de bulles : aucun coin n'est noir sur plus d'une demi-bulle.
      const coins = [[24, 120], [innerWidth - 24, 120], [24, innerHeight - 24], [innerWidth - 24, innerHeight - 24]];
      const pleins = coins.filter(([x, y]) => [...c.querySelectorAll('.bulle-mot')].some((b) => {
        const r = b.getBoundingClientRect();
        return Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom)) < 30;
      })).length;
      return { zone: proche.zone, focus: document.activeElement.dataset.zone, glisse: [c.scrollWidth > c.clientWidth, c.scrollHeight > c.clientHeight], pleins };
    });
    expect(vu, zone).toEqual({ zone, focus: zone, glisse: [true, true], pleins: 4 });
    await retour(vue).click();
  }
});

// Relecture de la tâche 4 : le balayage de VoiceOver et le clavier suivent l'ordre du DOM. ← est en haut à gauche de
// l'écran 2 : il vient avant les 144 mots, comme ✕ avant le titre à l'écran 1, et reste au-dessus des bulles. La loupe
// (v9, 6/8), en haut à droite, le suit.
test('l\'ordre de lecture suit l\'écran : ✕ d\'abord à l\'écran 1 ; à l\'écran 2, ← avant les mots, la flèche après, et ← au-dessus des bulles qui passent dessous', async ({ page }) => {
  const vue = await ouvrir(page);
  const boutons = () => vue.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent));
  // v9 (6/8) : la loupe, en haut à droite, vient juste après ✕ (et ←).
  expect((await boutons()).slice(0, 2)).toEqual(['Fermer', 'Chercher un mot']);
  await bulle(vue, 'rouge').click();
  await expect(carte(vue).getByRole('button')).toHaveCount(144);
  let noms = await boutons();
  expect([noms[0], noms[1], noms.length]).toEqual(['Revenir au choix de la couleur', 'Chercher un mot', 146]);
  await toucherMot(vue, 'Anxieux');
  await expect(continuer(vue)).toBeVisible();
  noms = await boutons();
  expect([noms[0], noms[1], noms.at(-1), noms.length]).toEqual(['Revenir au choix de la couleur', 'Chercher un mot', 'Continuer', 147]);
  // La carte glissée pour qu'une bulle passe sous ← : c'est ← qu'on touche, et l'écran 1 revient, le mot gardé.
  await finGarde(carte(vue));
  const dessous = await page.evaluate(() => {
    const v = document.querySelector('.ecran-carte .verre').getBoundingClientRect();
    const [x, y] = [v.left + v.width / 2, v.top + v.height / 2];
    let proche = null;
    for (const b of document.querySelectorAll('.bulle-mot:not(.choisi)')) {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (!proche || d < proche.d) proche = { d, dx: r.left + r.width / 2 - x, dy: r.top + r.height / 2 - y };
    }
    document.querySelector('.carte-defile').scrollBy(proche.dx, proche.dy);
    const pile = document.elementsFromPoint(x, y);
    return { premier: Boolean(pile[0].closest('.verre')), bulle: pile.some((e) => e.closest('.bulle-mot')), x, y };
  });
  expect([dessous.premier, dessous.bulle]).toEqual([true, true]);
  await page.touchscreen.tap(dessous.x, dessous.y);
  await expect(carte(vue)).toHaveCount(0);
  await expect(bulle(vue, 'rouge')).toBeVisible();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:peur:anxieux' }]);
});

test('le mot choisi : la double capsule de 156 au milieu de l\'écran, ses voisines à 120 puis 108, les autres à 96 ; en police système grasse (v10), corps = diamètre / 8', async ({ page }) => {
  for (const mouvement of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion: mouvement });
    const vue = await ouvrir(page);
    await noter(vue, 'vert', 'Calme');
    const mesure = () => page.evaluate(() => {
      const bulle = (n) => [...document.querySelectorAll('.bulle-mot')].find((b) => b.textContent === n);
      const boite = (n) => { const r = bulle(n).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height].map((x) => Math.round(x)); };
      return { calme: boite('Calme'), voisines: ['Réjoui', 'Bien', 'Ennui', 'À l\'aise'].map((n) => boite(n)[2]),
        diagonales: ['Mal à l\'aise', 'Pensif', 'Gai'].map((n) => boite(n)[2]), loin: ['Tendu', 'Serein', 'Enragé'].map((n) => boite(n)[2]) };
    });
    await expect.poll(async () => {
      const m = await mesure();
      return Math.abs(m.calme[0] - 195) <= 1 && Math.abs(m.calme[1] - 422) <= 1;
    }, { message: mouvement }).toBe(true);
    await finMouvements(page);
    expect(await mesure(), mouvement).toMatchObject({ calme: [expect.any(Number), expect.any(Number), 156, 156], voisines: [120, 120, 120, 120], diagonales: [108, 108, 108], loin: [96, 96, 96] });
    // Deux capsules de 78 de rayon 39 (24 × 1,625) ; le libellé noir, 12 px en police système grasse, 18 une fois choisi.
    const forme = await page.evaluate(() => {
      const choisi = document.querySelector('.bulle-mot.choisi');
      const autre = [...document.querySelectorAll('.bulle-mot')].find((b) => b.textContent === 'Tendu');
      const etiquette = (b) => { const e = b.querySelector('.etiquette-mot'); const s = getComputedStyle(e); return [Math.round(parseFloat(s.fontSize) * 10) / 10, s.fontWeight, s.color, /^-apple-system/.test(s.fontFamily)]; };
      return { demis: [...choisi.querySelectorAll('.demi')].map((d) => [Math.round(d.getBoundingClientRect().width), getComputedStyle(d).borderTopLeftRadius]),
        choisi: etiquette(choisi), autre: etiquette(autre),
        hauteur: Math.round(choisi.querySelector('.etiquette-mot').getBoundingClientRect().height / autre.querySelector('.etiquette-mot').getBoundingClientRect().height * 10) / 10 };
    });
    expect(forme.demis).toEqual([[79, '24px'], [79, '24px']]);
    expect(forme.autre).toEqual([12, '700', 'rgb(0, 0, 0)', true]);
    expect(forme.choisi).toEqual(forme.autre);
    expect(forme.hauteur).toBe(1.5);
    await finir(vue);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('AA : le texte noir de chaque bulle sur sa couleur rendue (les quatre de l\'écran 1, dégradé compris, et les 144 de la carte) ; le mot et la définition de la carte du bas ; l\'écran 3', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const faces = await vue.locator('.bulle-zone .face').evaluateAll((fs) => fs.map((f) => {
      const s = getComputedStyle(f);
      return { texte: getComputedStyle(f.querySelector('.etiquette-bulle')).color, fonds: [s.backgroundColor, ...(s.backgroundImage.match(/rgba?\([^)]+\)/g) || [])] };
    }));
    expect(faces).toHaveLength(4);
    for (const f of faces) {
      expect(f.fonds, schema).toHaveLength(4);
      for (const fond of f.fonds) expect(contraste(f.texte, fond), `${schema} ${fond}`).toBeGreaterThanOrEqual(4.5);
    }
    await bulle(vue, 'rouge').click();
    const mots = await carte(vue).getByRole('button').evaluateAll((bs) => bs.map((b) => ({
      nom: b.textContent, texte: getComputedStyle(b.querySelector('.etiquette-mot')).color,
      fond: getComputedStyle(b.querySelector('.demi.gauche')).backgroundColor, autre: getComputedStyle(b.querySelector('.demi.droite')).backgroundColor,
    })));
    expect(mots).toHaveLength(144);
    expect(new Set(mots.map((m) => m.fond)).size, 'une couleur par case').toBe(144);
    for (const m of mots) {
      expect(m.autre, m.nom).toBe(m.fond);
      expect(contraste(m.texte, m.fond), `${schema} ${m.nom}`).toBeGreaterThanOrEqual(4.5);
    }
    // Les cases les plus profondes de chaque zone, et une claire : le mot, éclairci si besoin, et la définition, blanche.
    for (const n of ['Enragé', 'Sans valeur', 'Extasié', 'Serein', 'Calme']) {
      await toucherMot(vue, n);
      await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText(n);
      const [fond, motCouleur, def] = await carteDuBas(vue).evaluate((e) => [e, e.querySelector('.mot-carte-du-bas'), e.querySelector('.definition-carte-du-bas')]
        .map((x) => getComputedStyle(x)[x === e ? 'backgroundColor' : 'color']));
      expect(fond).toBe('rgb(44, 44, 46)');
      expect(contraste(motCouleur, fond), `${schema} ${n}`).toBeGreaterThanOrEqual(4.5);
      expect(def).toBe('rgb(255, 255, 255)');
    }
    // L'écran 3 : le mot en rappel (Calme, une case claire), le titre, une activité choisie (à la couleur de la case du
    // mot, relecture finale), une autre non, « Terminer » ; chacun sur son fond rendu, le noir de l'écran pour les textes
    // posés dessus.
    await continuer(vue).click();
    await activite(vue, 'Repos').click();
    await expect(activite(vue, 'Repos')).toHaveAttribute('aria-pressed', 'true');
    // La couleur de la case de Calme, une fois la transition finie.
    await expect(activite(vue, 'Repos')).toHaveCSS('background-color', rgbCase('Calme'));
    await finMouvements(page);
    const textes = await page.evaluate(() => {
      const de = (sel, fond) => { const e = document.querySelector(sel); return [getComputedStyle(e).color, fond ? getComputedStyle(fond(e)).backgroundColor : 'rgb(0, 0, 0)']; };
      const soi = (e) => e;
      const pastille = (n) => [...document.querySelectorAll('.choix-faisais .pastille')].find((b) => b.textContent.includes(n));
      return {
        mot: de('.mot-rappel'), titre: de('.titre-faisais'),
        choisie: [getComputedStyle(pastille('Repos')).color, getComputedStyle(pastille('Repos')).backgroundColor],
        autre: [getComputedStyle(pastille('Travail')).color, getComputedStyle(pastille('Travail')).backgroundColor],
        terminer: de('.terminer-releve', soi),
      };
    });
    for (const [nom, [texte, fond]] of Object.entries(textes)) expect(contraste(texte, fond), `${schema} écran 3, ${nom}`).toBeGreaterThanOrEqual(4.5);
    await terminer(vue).click();
  }
});

// Ce qui sort de sa place en très grand texte : la page qui défile de côté ; une ligne d'un libellé hors du disque de sa
// bulle (le mot choisi, plus large que son libellé, à part) ; le titre hors de l'écran ; la carte du bas hors de l'écran,
// ou sa définition coupée ; à l'écran 3, un texte ou un bouton hors de l'écran, une ligne hors de sa pastille, le corps
// qui défile de côté, « Terminer » hors de l'écran.
const debordements = (page) => page.evaluate(() => {
  const fautes = [];
  if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px`);
  const plage = document.createRange();
  const lignes = (e) => {
    const res = [];
    const textes = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = textes.nextNode(); n; n = textes.nextNode()) { plage.selectNodeContents(n); res.push(...plage.getClientRects()); }
    return res;
  };
  const horsDuDisque = (e, disque) => {
    const r = disque.getBoundingClientRect();
    const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
    return lignes(e).some((q) => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].some(([x, y]) => Math.hypot(x - cx, y - cy) > rayon + 0.5));
  };
  for (const e of document.querySelectorAll('.etiquette-bulle')) if (horsDuDisque(e, e.closest('.face'))) fautes.push(`${e.textContent} : hors de sa bulle`);
  for (const e of document.querySelectorAll('.bulle-mot:not(.choisi) .etiquette-mot')) if (horsDuDisque(e, e.closest('.bulle-mot'))) fautes.push(`${e.textContent} : hors de sa bulle`);
  for (const e of document.querySelectorAll('.titre-bulles')) for (const q of lignes(e)) if (q.left < 0 || q.right > innerWidth) fautes.push('titre hors de l\'écran');
  const carte = document.querySelector('.carte-du-bas');
  if (carte) {
    const r = carte.getBoundingClientRect();
    if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) fautes.push('carte du bas hors de l\'écran');
    for (const p of carte.querySelectorAll('p')) {
      if (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1) fautes.push(`${p.className} : coupé`);
      for (const q of lignes(p)) if (q.bottom > r.bottom || q.right > carte.querySelector('.continuer').getBoundingClientRect().left) fautes.push(`${p.className} : hors de la carte`);
    }
  }
  const ecran3 = document.querySelector('.ecran-faisais');
  if (ecran3) {
    const corps = ecran3.querySelector('.corps-faisais');
    if (corps.scrollWidth > corps.clientWidth + 0.5) fautes.push('écran 3 : défile de côté');
    for (const e of ecran3.querySelectorAll('h1, h2, p, button')) {
      const r = e.getBoundingClientRect();
      if (r.left < -0.5 || r.right > innerWidth + 0.5) fautes.push(`${e.textContent.trim().slice(0, 24)} : hors de l'écran`);
      for (const q of lignes(e)) if (q.left < r.left - 0.5 || q.right > r.right + 0.5) fautes.push(`${e.textContent.trim().slice(0, 24)} : hors de sa boîte`);
    }
    const fin = ecran3.querySelector('.terminer-releve').getBoundingClientRect();
    if (fin.top < 0 || fin.bottom > innerHeight) fautes.push('Terminer hors de l\'écran');
  }
  return [...new Set(fautes)];
});

test('point de vigilance 2 : en très grand texte (17, 19, 21, 23), chaque libellé reste dans sa bulle, rien ne déborde de côté, la carte du bas grandit au lieu de couper la définition ; l\'écran 3 tient en largeur', async ({ page }) => {
  test.setTimeout(90000);
  for (const taille of [17, 19, 21, 23]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const vue = await ouvrir(page);
    await page.evaluate(() => document.fonts.ready);
    expect(await debordements(page), `écran 1, ${taille} px`).toEqual([]);
    await bulle(vue, 'bleu').click();
    await expect(carte(vue).getByRole('button')).toHaveCount(144);
    await page.evaluate(() => document.fonts.ready);
    expect(await debordements(page), `carte, ${taille} px`).toEqual([]);
    // Le mot le plus long de sa zone, à la définition longue, puis un mot long à la définition courte. À 23 px, la
    // première ne tient plus dans la capsule de 100 (relecture finale : 17 sur 18,3 au texte par défaut, le mot et trois
    // lignes y tiennent) : la carte du bas grandit au lieu de la couper.
    const hauteurs = [];
    for (const n of ['Désillusionné', 'Reconnaissant']) {
      await toucherMot(vue, n);
      await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText(n);
      await finMouvements(page);
      expect(await debordements(page), `${n}, ${taille} px`).toEqual([]);
      hauteurs.push(await carteDuBas(vue).evaluate((e) => e.getBoundingClientRect().height));
    }
    if (taille === 23) expect(Math.max(...hauteurs), 'la carte du bas a grandi').toBeGreaterThan(100);
    await continuer(vue).click();
    await activite(vue, 'Courses / démarches').click();
    await expect(activite(vue, 'Courses / démarches')).toHaveAttribute('aria-pressed', 'true');
    await finMouvements(page);
    expect(await debordements(page), `écran 3, ${taille} px`).toEqual([]);
    await terminer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('point de vigilance 3 : un mot touché, puis l\'app passée en arrière-plan et rechargée, sans la flèche : le relevé est là, mot et énergie ; #/moment rouvre un relevé neuf', async ({ page }) => {
  let vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Irrité');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute' }]);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
  });
  await page.reload();
  await appPrete(page);
  expect(await releves(page)()).toMatchObject([{ heure: '21:00', vers: null, emotion: 'roue:colere:irrite', energie: 'energie:haute' }]);
  // Rouvert : l'écran 1, « Maintenant », rien de choisi ; un mot crée un second relevé, le premier ne bouge pas.
  vue = await ouvrir(page);
  await expect(vue.locator('.puce-quand')).toHaveText('Maintenant');
  await bulle(vue, 'rouge').click();
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(carteDuBas(vue)).toHaveCount(0);
  await toucherMot(vue, 'Choqué');
  await expect.poll(async () => (await releves(page)()).length).toBe(2);
  expect((await releves(page)()).map((h) => h.emotion).sort()).toEqual(['roue:colere:irrite', 'roue:surprise:choque']);
});

// Deux touchers à 120 ms d'écart (sur l'iPhone, ce sont deux clics), sur l'horloge de la page arrêtée avant le premier
// (v8, 9/9 : sous la charge de npm test, l'horloge qui courait laissait expirer la garde). L'appelant la relance.
const toucherDeuxFois = async (page, [x1, y1], [x2, y2]) => {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  await page.touchscreen.tap(x1, y1);
  await page.clock.runFor(120);
  await page.touchscreen.tap(x2, y2);
};
// Le centre du mot le plus proche du milieu de l'écran, sur la carte.
const motAuMilieu = (page) => page.evaluate(() => {
  let proche = null;
  for (const b of document.querySelectorAll('.bulle-mot')) {
    const r = b.getBoundingClientRect();
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2);
    if (!proche || d < proche.d) proche = { d, nom: b.textContent, x, y };
  }
  return proche;
});

test('point de vigilance 5 : deux touchers rapides, sur une bulle puis au même endroit, ou sur un mot qui vient de paraître, ne choisissent aucun mot (avec ou sans « Réduire les animations »)', async ({ page }) => {
  test.setTimeout(120000);
  for (const mouvement of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion: mouvement });
    for (const zone of Object.keys(NOMS_BULLES)) {
      const quoi = `${zone}, ${mouvement}`;
      const vue = await ouvrir(page);
      // 1. Deux touchers au même point, le centre de la bulle.
      const b = await bulle(vue, zone).boundingBox();
      const centre = [b.x + b.width / 2, b.y + b.height / 2];
      await toucherDeuxFois(page, centre, centre);
      await expect(carte(vue), quoi).toBeVisible();
      await page.clock.runFor(400);
      await page.clock.resume();
      await expect(carte(vue).getByRole('button', { pressed: true }), quoi).toHaveCount(0);
      expect(await releves(page)(), quoi).toEqual([]);
      // 2. La bulle, puis 120 ms plus tard le mot du milieu de la carte qui vient de paraître sous le doigt : rien.
      const cible = await motAuMilieu(page);
      await finGarde(carte(vue));
      await retour(vue).click();
      await finGarde(bulles(vue));
      await toucherDeuxFois(page, centre, [cible.x, cible.y]);
      await expect(carte(vue), quoi).toBeVisible();
      await page.clock.runFor(400);
      await page.clock.resume();
      await expect(carte(vue).getByRole('button', { pressed: true }), quoi).toHaveCount(0);
      expect(await releves(page)(), quoi).toEqual([]);
      // La garde passée, le même toucher choisit ce mot : c'est bien la garde qui a joué. Retouché, il s'efface.
      await finGarde(carte(vue));
      await page.touchscreen.tap(cible.x, cible.y);
      await expect(mot(vue, cible.nom), quoi).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await releves(page)()).length, { message: quoi }).toBe(1);
      await toucherMot(vue, cible.nom);
      await expect.poll(async () => (await releves(page)()).length, { message: quoi }).toBe(0);
      await retour(vue).click();
      await fermer(vue).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

// Relecture de la tâche 4 : la garde vaut aussi après un mot choisi. La carte bouge alors sous le doigt (elle glisse
// jusqu'au mot, ses voisines grandissent ; d'un coup avec « Réduire les animations ») : un second toucher rapide au même
// endroit, pour vérifier que le premier a été pris (l'iPhone ne vibre pas), tomberait sur un autre mot, qui remplacerait
// le premier. Anxieux (col 3, rang 10) est près du milieu de la zone rouge, pas au milieu : choisi, il y vient.
test('deux touchers rapides au même endroit sur un mot loin du milieu : le premier mot reste choisi, le relevé porte ce mot et son énergie (avec ou sans « Réduire les animations »)', async ({ page }) => {
  test.setTimeout(60000);
  // Ouvert sur le rouge, un mot loin du milieu, entier à l'écran ; une fois au milieu, le point touché tombe sur une
  // voisine. Apeuré, quand la lentille n'est pas posée à l'ouverture ; sinon (v10), elle le met au bord : Non respecté.
  for (const [mouvement, LOIN] of [['no-preference', 'Non respecté'], ['reduce', 'Apeuré']]) {
    const idLoin = MOTS_CARTE.find((x) => x.libelle === LOIN).id;
    await page.emulateMedia({ reducedMotion: mouvement });
    const vue = await ouvrir(page);
    await bulle(vue, 'rouge').click();
    await finGarde(carte(vue));
    const b = await mot(vue, LOIN).boundingBox();
    const point = [b.x + b.width / 2, b.y + b.height / 2];
    expect(Math.hypot(point[0] - 195, point[1] - 422), mouvement).toBeGreaterThan(40);
    await toucherDeuxFois(page, point, point);
    await page.clock.runFor(400);
    await page.clock.resume();
    await expect(carte(vue).getByRole('button', { pressed: true }), mouvement).toHaveText([LOIN]);
    await expect.poll(releves(page), { message: mouvement }).toMatchObject([{ emotion: idLoin, energie: energieDe(idLoin) }]);
    await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText(LOIN);
    // La carte posée (le mot au milieu), un autre mot est sous le doigt ; la garde passée, le même toucher le prend :
    // c'est bien la garde qui a joué. Retouché, ce mot s'efface, et le relevé avec.
    await expect.poll(async () => {
      const c = await mot(vue, LOIN).boundingBox();
      return Math.abs(c.x + c.width / 2 - 195) <= 1 && Math.abs(c.y + c.height / 2 - 422) <= 1;
    }, { message: mouvement }).toBe(true);
    await finMouvements(page);
    const sous = await page.evaluate(([x, y]) => document.elementFromPoint(x, y).closest('.bulle-mot').textContent, point);
    expect(sous, mouvement).not.toBe(LOIN);
    await finGarde(carte(vue));
    await page.touchscreen.tap(...point);
    await expect(mot(vue, sous), mouvement).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await releves(page)()).map((h) => h.emotion), { message: mouvement }).not.toEqual([idLoin]);
    await toucherMot(vue, sous);
    await expect.poll(async () => (await releves(page)()).length, { message: mouvement }).toBe(0);
    await retour(vue).click();
    await fermer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('mouvement (visuel §4) : les halos tournent, la carte glisse jusqu\'au mot, l\'écran 3 paraît en fondu ; avec « Réduire les animations », tout est figé, les halos à leurs décalages mesurés', async ({ page }) => {
  let vue = await ouvrir(page);
  const halos = () => vue.locator('.bulle-zone .halo').evaluateAll((hs) => hs.map((h) => h.getAnimations().map((a) => a.animationName)));
  expect(await halos()).toEqual(Array(12).fill(['orbite']));
  await bulle(vue, 'vert').click();
  expect(parseFloat(await carte(vue).locator('.bulle-mot').first().evaluate((b) => getComputedStyle(b).transitionDuration))).toBeGreaterThan(0);
  await toucherMot(vue, 'Serein');
  await expect(carteDuBas(vue)).toBeVisible();
  // L'écran 3 paraît en fondu.
  await continuer(vue).click();
  const fondu = () => vue.locator('.ecran-faisais').evaluate((e) => [getComputedStyle(e).animationName, parseFloat(getComputedStyle(e).animationDuration) > 0]);
  expect(await fondu()).toEqual(['apparition-carte', true]);
  await terminer(vue).click();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  vue = await ouvrir(page);
  expect(await halos()).toEqual(Array(12).fill([]));
  // Le premier halo de la bulle rouge, figé à son décalage mesuré (−13 ; −13,1).
  expect(await vue.locator('.bulle-rouge .halo').first().evaluate((h) => getComputedStyle(h).transform)).toBe('matrix(1, 0, 0, 1, -13, -13.1)');
  await bulle(vue, 'vert').click();
  await expect(carte(vue)).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await toucherMot(vue, 'Serein');
  // Aussitôt : au milieu de l'écran, à sa taille finale, sans transition ni animation ; la carte du bas, sans glisser.
  const fige = await page.evaluate(() => {
    const b = document.querySelector('.bulle-mot.choisi');
    const r = b.getBoundingClientRect();
    return { centre: [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)], largeur: Math.round(r.width),
      animations: document.getAnimations().length, transition: getComputedStyle(b).transitionDuration, carte: Boolean(document.querySelector('.carte-du-bas')) };
  });
  expect(fige).toEqual({ centre: [195, 422], largeur: 156, animations: 0, transition: '0s', carte: true });
  // L'écran 3, d'un coup.
  await continuer(vue).click();
  await expect(faisais(vue)).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect((await fondu())[0]).toBe('none');
  await terminer(vue).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('un mot à soi est sur la carte, hors du carré du côté de sa zone, à la couleur du bord ; le toucher l\'écrit, avec l\'énergie de sa zone et sa définition ; mis de côté, il n\'y est pas', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('motsPerso', {
    'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'vert', famille: null, definition: 'Un peu ailleurs, sans attache.', archive: false, createdAt: '2026-10-01T08:00:00.000Z' },
    'roue:perso:u-0a1b2c3e': { libelle: 'Bouillonnant', zone: 'rouge', famille: 'colere', definition: null, archive: true, createdAt: '2026-10-02T08:00:00.000Z' },
  }));
  const vue = await ouvrir(page);
  await bulle(vue, 'vert').click();
  await expect(carte(vue).getByRole('button')).toHaveCount(145);
  await expect(mot(vue, 'Bouillonnant')).toHaveCount(0);
  const place = await page.evaluate(() => {
    const tous = [...document.querySelectorAll('.bulle-mot')];
    const de = (n) => tous.find((b) => b.textContent === n);
    const x = (b) => b.getBoundingClientRect().left;
    const verts = [...document.querySelectorAll('[data-zone="vert"] .bulle-mot')];
    const couleur = (b) => getComputedStyle(b.querySelector('.demi')).backgroundColor;
    return { dansLeVert: verts.includes(de('Flottant')), aDroite: x(de('Flottant')) > Math.max(...verts.filter((b) => b !== de('Flottant')).map(x)),
      couleur: couleur(de('Flottant')) === couleur(de('Serein')) };
  });
  expect(place).toEqual({ dansLeVert: true, aDroite: true, couleur: true });
  await toucherMot(vue, 'Flottant');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:perso:u-0a1b2c3d', energie: 'energie:basse' }]);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Flottant');
  await expect(carteDuBas(vue).locator('.definition-carte-du-bas')).toHaveText('Un peu ailleurs, sans attache.');
});

// ---------- v9 (5/8) · L'écran 3, « Ce que je faisais » ; un relevé rouvert (spec §4.3 et §13.1) ----------

const ACTIVITES = ['Travail', 'Trajet', 'Courses / démarches', 'Chez moi', 'Avec du monde', 'Repos'];
// La ligne d'un relevé dans Ma journée (un lien vers son écran 3), par son heure ou son texte.
const ligneReleve = (page, texte) => page.locator('.liste-evenements a.releve').filter({ hasText: texte });
// Des relevés inventés, versés dans la base ; renvoie leurs identifiants, dans l'ordre.
const creer = (page, liste) => page.evaluate(async (l) => {
  const ids = [];
  for (const h of l) ids.push((await window.__carnet.repo.humeurs.creer(h)).id);
  return ids;
}, liste);
const lire = (page, id) => page.evaluate((i) => window.__carnet.repo.humeurs.lire(i), id);
const rappel = (vue, nom) => vue.getByRole('heading', { name: nom, level: 1, exact: true });
const details = (vue) => vue.locator('.detail-rappel');
// Ce qu'un relevé neuf, venant d'être noté, n'a pas : « Changer le mot », « Supprimer ce relevé », « Maintenant ▾ ».
const PROPRES_AU_ROUVERT = (vue) => [changerMot(vue), supprimerReleve(vue), vue.locator('.puce-quand'), details(vue)];

test('parcours complet : couleur, mot, flèche, puis « Ce que je faisais » écrit au toucher, et Terminer ; ✕ fait de même ; un relevé neuf à chaque ouverture', async ({ page }) => {
  let vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Irrité');
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: 'energie:haute', faisais: null }]);
  const couleur = await carteDuBas(vue).locator('.mot-carte-du-bas').evaluate((e) => getComputedStyle(e).color);
  await continuer(vue).click();
  // L'écran 3 : le mot en rappel, à la couleur qu'il a dans la carte du bas, le focus sur lui ; les activités, aucune
  // choisie ; rien de ce qui est propre à un relevé rouvert.
  await expect(rappel(vue, 'Irrité')).toBeFocused();
  expect(await rappel(vue, 'Irrité').evaluate((e) => getComputedStyle(e).color)).toBe(couleur);
  await expect(vue.getByRole('heading', { name: 'Ce que je faisais', level: 2 })).toBeVisible();
  await expect(faisais(vue).getByRole('button')).toHaveText(ACTIVITES);
  await expect(faisais(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  for (const x of PROPRES_AU_ROUVERT(vue)) await expect(x).toHaveCount(0);
  await expect(page).toHaveURL(/#\/moment$/);

  // Chaque activité est écrite au toucher, dans le même relevé ; retouchée, elle s'en va.
  await activite(vue, 'Travail').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', faisais: ['activiteMoment:travail'] }]);
  await activite(vue, 'Trajet').click();
  await expect.poll(releves(page)).toMatchObject([{ faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] }]);
  await activite(vue, 'Travail').click();
  await expect.poll(releves(page)).toMatchObject([{ faisais: ['activiteMoment:trajet'] }]);
  // Une activité choisie a sa coche, et la couleur de la case du mot (relecture finale : celle du mot en rappel).
  await expect(activite(vue, 'Trajet')).toHaveAttribute('aria-pressed', 'true');
  await expect(activite(vue, 'Trajet').locator('.coche svg')).toBeVisible();
  await expect(activite(vue, 'Trajet')).toHaveCSS('background-color', rgbCase('Irrité'));
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  expect(await releves(page)()).toMatchObject([{ date: '2026-10-15', heure: '21:00', vers: null, emotion: 'roue:colere:irrite', energie: 'energie:haute', faisais: ['activiteMoment:trajet'] }]);
  await expect(ligneReleve(page, 'Irrité')).toHaveCount(1);

  // ✕ à l'écran 3 : la même fermeture. La nouvelle ouverture repart de rien : « Maintenant », aucune activité.
  vue = await ouvrir(page);
  await expect(vue.locator('.puce-quand')).toHaveText('Maintenant');
  await noter(vue, 'vert', 'Calme');
  await continuer(vue).click();
  await expect(faisais(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  await activite(vue, 'Repos').click();
  await expect.poll(async () => (await releves(page)()).find((h) => h.emotion === 'roue:serenite:calme')).toMatchObject({ faisais: ['activiteMoment:repos'] });
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  // « Annuler » retire ce relevé, activité comprise ; le premier reste.
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', faisais: ['activiteMoment:trajet'] }]);
});

// Point de vigilance 5, sous la flèche : l'écran 3 paraît, et « Terminer » est là où était la flèche.
test('deux touchers rapides sur la flèche : le second, qui tombe sur « Terminer », est ignoré (la garde), l\'écran 3 reste (avec ou sans « Réduire les animations »)', async ({ page }) => {
  test.setTimeout(60000);
  for (const mouvement of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion: mouvement });
    const vue = await ouvrir(page);
    await noter(vue, 'bleu', 'Vide');
    await finGarde(continuer(vue));
    await finMouvements(page);
    const b = await continuer(vue).boundingBox();
    const point = [b.x + b.width / 2, b.y + b.height / 2];
    await toucherDeuxFois(page, point, point);
    await page.clock.runFor(400);
    await page.clock.resume();
    await expect(faisais(vue), mouvement).toBeVisible();
    await expect(page).toHaveURL(/#\/moment$/);
    await expect(page.getByText(NOTEE)).toHaveCount(0);
    // C'est bien « Terminer » qui est sous ce point : la garde passée, le même toucher ferme l'écran.
    expect(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y).closest('.terminer-releve')), point), mouvement).toBe(true);
    await finGarde(terminer(vue));
    await page.touchscreen.tap(...point);
    await expect(page).toHaveURL(/#\/aujourdhui$/);
    await expect(page.getByText(NOTEE)).toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('un relevé rouvert depuis Ma journée s\'ouvre sur l\'écran 3 : son mot, son heure, ses activités ; « Changer le mot » ouvre la carte, ← et la flèche y ramènent ; ✕ revient à Ma journée, et Annuler le remet tel qu\'il était', async ({ page }) => {
  const [id] = await creer(page, [{ date: '2026-10-15', heure: '09:10', emotion: 'roue:joie:curieux', energie: 'energie:haute', faisais: ['activiteMoment:travail'] }]);
  const avant = await lire(page, id);
  await page.reload();
  await appPrete(page);
  // La ligne a son point de zone et son chevron ; elle mène à l'écran 3.
  await expect(ligneReleve(page, 'Curieux').locator('.point-evenement')).toHaveClass(/zone-jaune/);
  await expect(ligneReleve(page, 'Curieux').locator('svg')).toHaveCount(1);
  await ligneReleve(page, 'Curieux').click();
  await expect(page).toHaveURL(new RegExp(`#/moment/${id}$`));
  const vue = vueMoment(page);
  await expect(rappel(vue, 'Curieux')).toBeFocused();
  await expect(details(vue)).toHaveText(['Aujourd\'hui · 09:10']);
  await expect(faisais(vue).getByRole('button', { pressed: true })).toHaveText(['Travail']);
  await expect(changerMot(vue)).toBeVisible();
  await expect(supprimerReleve(vue)).toBeVisible();
  // Ni les bulles, ni « Maintenant ▾ » : son heure ne change pas. Ni barre d'onglets.
  await expect(bulles(vue)).toHaveCount(0);
  await expect(vue.locator('.puce-quand')).toHaveCount(0);
  await expect(page.locator('nav.onglets')).toHaveCount(0);
  // Une activité de plus, écrite au toucher dans ce relevé.
  await activite(vue, 'Avec du monde').click();
  await expect.poll(releves(page)).toMatchObject([{ id, faisais: ['activiteMoment:travail', 'activiteMoment:monde'] }]);

  // « Changer le mot » : la carte, le mot choisi au milieu de l'écran, avec sa carte du bas ; ← ramène à l'écran 3.
  await changerMot(vue).click();
  await expect(mot(vue, 'Curieux')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Curieux');
  await expect.poll(async () => {
    const c = await mot(vue, 'Curieux').boundingBox();
    return Math.abs(c.x + c.width / 2 - 195) <= 1 && Math.abs(c.y + c.height / 2 - 422) <= 1;
  }).toBe(true);
  await vue.getByRole('button', { name: 'Revenir au relevé', exact: true }).click();
  await expect(rappel(vue, 'Curieux')).toBeFocused();
  // Un autre mot : écrit tout de suite, avec l'énergie de sa case, à la même heure ; la flèche ramène à l'écran 3.
  await changerMot(vue).click();
  await toucherMot(vue, 'Préoccupé');
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-15', heure: '09:10', vers: null, emotion: 'roue:peur:preoccupe', energie: 'energie:moyenne',
    faisais: ['activiteMoment:travail', 'activiteMoment:monde'] }]);
  await continuer(vue).click();
  await expect(rappel(vue, 'Préoccupé')).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`#/moment/${id}$`));

  // ✕ : retour à Ma journée, avec « Émotion du moment notée » ; Annuler le remet tel qu'à l'ouverture.
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  await expect(ligneReleve(page, 'Préoccupé')).toHaveCount(1);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(releves(page)).toEqual([avant]);
  await expect(ligneReleve(page, 'Curieux')).toHaveCount(1);
});

// Relecture de la tâche 5 : le message « Émotion du moment notée · Annuler » de la fermeture d'avant restait 5 s, en
// haut, par-dessus l'écran ouvert aussitôt après. Sur le relevé rouvert, il cachait le mot, et son « Annuler » retirait
// de la base le relevé qui était à l'écran : les activités touchées ensuite n'étaient plus écrites nulle part.
test('le message de la fermeture d\'avant se ferme à l\'ouverture : rouvert aussitôt depuis Ma journée, le relevé a son mot visible et garde ce qu\'on y touche ; l\'écran 1 de même', async ({ page }) => {
  let vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Irrité');
  await finir(vue);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.locator('.toast')).toContainText(NOTEE);
  // Aussitôt, sa ligne : l'écran 3, sans message par-dessus le mot.
  await ligneReleve(page, 'Irrité').click();
  vue = vueMoment(page);
  await expect(rappel(vue, 'Irrité')).toBeVisible();
  // Sans attendre : le message s'en irait de lui-même au bout de ses 5 s.
  expect(await page.locator('.toast').count()).toBe(0);
  await activite(vue, 'Travail').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', faisais: ['activiteMoment:travail'] }]);
  // Fermé, le message revient, pour ce relevé ; l'écran 1 ouvert aussitôt l'efface aussi, son titre est libre.
  await terminer(vue).click();
  await expect(page.locator('.toast')).toContainText(NOTEE);
  await page.getByRole('link', { name: 'Émotion du moment', exact: true }).click();
  await expect(vue.getByRole('heading', { name: 'Touche la couleur la plus proche de ce moment', level: 1 })).toBeVisible();
  expect(await page.locator('.toast').count()).toBe(0);
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await releves(page)()).toMatchObject([{ emotion: 'roue:colere:irrite', faisais: ['activiteMoment:travail'] }]);
});

test('un relevé se rouvre depuis n\'importe quel jour, Historique compris, et y ramène', async ({ page }) => {
  await creer(page, [
    { date: '2026-10-12', heure: '18:00', emotion: 'roue:serenite:calme', energie: 'energie:moyenne' },
    // 01:20 le 15 : le jour logique du 14, « Hier ».
    { date: '2026-10-15', heure: '01:20', vers: true, emotion: 'roue:tristesse:vide', energie: 'energie:basse' },
  ]);
  const vue = vueMoment(page);
  await aller(page, '#/jour/2026-10-12');
  await ligneReleve(page, 'Calme').click();
  await expect(details(vue)).toHaveText(['Lundi 12 octobre · 18:00']);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-12$/);
  await expect(page.getByText(NOTEE)).toBeVisible();

  await aller(page, '#/jour/2026-10-14');
  await ligneReleve(page, 'Vide').click();
  await expect(details(vue)).toHaveText(['Hier · vers 1 h']);
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);

  // Depuis l'Historique : son jour, puis le relevé ; on revient au jour de l'Historique.
  await aller(page, '#/historique');
  await page.getByRole('link', { name: /lundi 12 oct\./ }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-12$/);
  await ligneReleve(page, 'Calme').click();
  await expect(rappel(vue, 'Calme')).toBeVisible();
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-12$/);
});

test('point de vigilance 1 : un ancien relevé (énergie seule de la v8, famille seule de la v7, note de la v6) se rouvre sur « Aucun mot », sans erreur ; un mot choisi remplace son énergie et lui donne sa zone', async ({ page }) => {
  const ids = await creer(page, [
    { date: '2026-10-15', heure: '08:00', energie: 'energie:basse' },
    { date: '2026-10-15', heure: '10:00', emotion: 'roue:colere', energie: 'energie:moyenne' },
    { date: '2026-10-15', heure: '12:00', vers: true, humeur: 6, energie: 'energie:basse', faisais: ['activiteMoment:repos'] },
  ]);
  await page.reload();
  await appPrete(page);
  const vue = vueMoment(page);
  const cas = [
    ['08:00', ['Aujourd\'hui · 08:00', 'énergie basse'], []],
    ['10:00', ['Aujourd\'hui · 10:00', 'Colère · énergie moyenne'], []],
    ['vers 12 h', ['Aujourd\'hui · vers 12 h', 'humeur 6 · énergie basse'], ['Repos']],
  ];
  for (const [i, [heure, textes, choisies]] of cas.entries()) {
    await expect(ligneReleve(page, heure).locator('.point-evenement')).toHaveClass(/point-creux/);
    await ligneReleve(page, heure).click();
    await expect(page).toHaveURL(new RegExp(`#/moment/${ids[i]}$`));
    await expect(rappel(vue, 'Aucun mot')).toBeFocused();
    await expect(details(vue)).toHaveText(textes);
    await expect(faisais(vue).getByRole('button', { pressed: true })).toHaveText(choisies);
    await expect(changerMot(vue)).toBeVisible();
    await expect(vue).not.toContainText(/NaN|undefined|null|roue:/);
    await fermer(vue).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);
  }

  // La famille seule (v7) : « Changer le mot » ouvre la carte sans mot choisi ; Furieux remplace la famille et l'énergie.
  await ligneReleve(page, '10:00').click();
  await changerMot(vue).click();
  await expect(carte(vue).getByRole('button')).toHaveCount(144);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(carteDuBas(vue)).toHaveCount(0);
  await toucherMot(vue, 'Furieux');
  await expect.poll(() => lire(page, ids[1])).toMatchObject({ date: '2026-10-15', heure: '10:00', emotion: 'roue:colere:furieux', energie: 'energie:haute' });
  await continuer(vue).click();
  await expect(rappel(vue, 'Furieux')).toBeFocused();
  await expect(details(vue)).toHaveText(['Aujourd\'hui · 10:00']);
  await terminer(vue).click();
  await expect(ligneReleve(page, 'Furieux').locator('.point-evenement')).toHaveClass(/zone-rouge/);

  // La note de la v6 : Calme remplace l'énergie, la note et l'heure « vers » restent ; effacé, la note garde le relevé.
  await ligneReleve(page, 'vers 12 h').click();
  await changerMot(vue).click();
  await toucherMot(vue, 'Calme');
  await expect.poll(() => lire(page, ids[2])).toMatchObject({ heure: '12:00', vers: true, humeur: 6, emotion: 'roue:serenite:calme', energie: 'energie:moyenne', faisais: ['activiteMoment:repos'] });
  await finGarde(carte(vue));
  await toucherMot(vue, 'Calme');
  await expect.poll(() => lire(page, ids[2])).toMatchObject({ heure: '12:00', vers: true, humeur: 6, emotion: null, energie: null, faisais: ['activiteMoment:repos'] });
  await vue.getByRole('button', { name: 'Revenir au relevé', exact: true }).click();
  await expect(rappel(vue, 'Aucun mot')).toBeFocused();
  await expect(details(vue)).toHaveText(['Aujourd\'hui · vers 12 h', 'humeur 6']);
  await terminer(vue).click();
  await expect(ligneReleve(page, 'vers 12 h')).toHaveText(/humeur 6/);
});

test('« Supprimer ce relevé » : une confirmation ; confirmé, retour à Ma journée et « Relevé supprimé », dont Annuler remet le relevé tel quel', async ({ page }) => {
  const [id] = await creer(page, [{ date: '2026-10-15', heure: '18:10', emotion: 'roue:peur:anxieux', energie: 'energie:haute', faisais: ['activiteMoment:trajet'] }]);
  const avant = await lire(page, id);
  await page.reload();
  await appPrete(page);
  await ligneReleve(page, 'Anxieux').click();
  const vue = vueMoment(page);
  const boite = page.getByRole('alertdialog', { name: 'Supprimer ce relevé ?' });
  // Annuler dans la boîte : rien ne change.
  await supprimerReleve(vue).click();
  await expect(boite).toBeVisible();
  await expect(boite.getByRole('button', { name: 'Annuler' })).toBeFocused();
  await boite.getByRole('button', { name: 'Annuler' }).click();
  await expect(boite).toHaveCount(0);
  expect(await releves(page)()).toEqual([avant]);
  // Confirmé : l'écran se ferme sur Ma journée, sans la ligne ; « Annuler » du message la remet.
  await supprimerReleve(vue).click();
  await boite.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(SUPPRIME)).toBeVisible();
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  await expect(ligneReleve(page, 'Anxieux')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(releves(page)).toEqual([avant]);
  await expect(ligneReleve(page, 'Anxieux')).toHaveCount(1);
});

test('un relevé rouvert vidé de tout (mot effacé, plus d\'activité) part ; une activité le fait revenir, sous son id et à son heure ; fermé vide, « Relevé supprimé » et Annuler le remet', async ({ page }) => {
  const [id] = await creer(page, [{ date: '2026-10-15', heure: '07:45', emotion: 'roue:serenite:calme', energie: 'energie:moyenne' }]);
  const avant = await lire(page, id);
  await page.reload();
  await appPrete(page);
  await ligneReleve(page, 'Calme').click();
  const vue = vueMoment(page);
  await changerMot(vue).click();
  await toucherMot(vue, 'Calme');
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  await expect(carteDuBas(vue)).toHaveCount(0);
  await vue.getByRole('button', { name: 'Revenir au relevé', exact: true }).click();
  await expect(rappel(vue, 'Aucun mot')).toBeFocused();
  // Une activité : le relevé revient, même id, même jour et même heure.
  await activite(vue, 'Chez moi').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-15', heure: '07:45', vers: null, emotion: null, energie: null, faisais: ['activiteMoment:maison'] }]);
  // Retirée, il repart ; fermé ainsi, « Relevé supprimé », et Annuler le remet tel qu'à l'ouverture.
  await activite(vue, 'Chez moi').click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  await terminer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(SUPPRIME)).toBeVisible();
  await expect(page.getByText(NOTEE)).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(releves(page)).toEqual([avant]);
});

test('un id inconnu (#/moment/ID) renvoie sur Aujourd\'hui, comme #/moment/ seul', async ({ page }) => {
  await aller(page, '#/moment/hu_0000000000000000');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(vueMoment(page)).toHaveCount(0);
  await expect(page.locator('nav.onglets')).toBeVisible();
  await aller(page, '#/moment/');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(vueMoment(page)).toHaveCount(0);
});

// ---------- Relecture finale de la v9 ----------

// La carte du bas (visuel §2.8, dont les valeurs font foi) : le mot et sa définition au même corps, 17 pt, sur un pas de
// 18,3, sans écart entre eux. Le mot et trois lignes tiennent dans la capsule de 100 pt : au texte par défaut, une seule
// définition des 144, au plus, la fait grandir (mesurées sur une copie cachée de la carte du bas).
test('relecture finale : la carte du bas, le mot et sa définition à 17 sur 18,3 ; trois lignes tiennent dans les 100 pt', async ({ page }) => {
  const vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Enragé');
  const bas = carteDuBas(vue);
  await expect(bas.locator('.mot-carte-du-bas')).toHaveText('Enragé');
  const m = await bas.evaluate((e) => {
    const corps = (x) => { const s = getComputedStyle(x); return [s.fontSize, Math.round(parseFloat(s.lineHeight) * 10) / 10, s.fontWeight, s.marginTop]; };
    return { mot: corps(e.querySelector('.mot-carte-du-bas')), def: corps(e.querySelector('.definition-carte-du-bas')), h: e.getBoundingClientRect().height };
  });
  expect(m.mot).toEqual(['17px', 18.3, '400', '0px']);
  expect(m.def).toEqual(m.mot);
  // Enragé : le mot et trois lignes, dans la capsule de 100.
  expect(m.h).toBeCloseTo(100, 0);
  const textes = MOTS_CARTE.map((x) => [x.libelle, DEFINITIONS[x.id]]);
  const grandes = await bas.evaluate((e, liste) => {
    const copie = e.cloneNode(true);
    copie.style.visibility = 'hidden';
    copie.style.animation = 'none';
    e.parentNode.append(copie);
    const trop = [];
    for (const [libelle, def] of liste) {
      copie.querySelector('.mot-carte-du-bas').textContent = libelle;
      copie.querySelector('.definition-carte-du-bas').textContent = def;
      if (copie.getBoundingClientRect().height > 100.5) trop.push(libelle);
    }
    copie.remove();
    return trop;
  }, textes);
  expect(grandes.length, grandes.join(', ')).toBeLessThanOrEqual(1);
});

// Au clavier (Option+Tab dans Safari), le contour de la bulle qui a le focus passe au-delà de ses halos (16 pt) et
// au-dessus des bulles voisines (z-index), blanc sur le noir.
test('relecture finale : au clavier, le contour d\'une bulle de l\'écran 1 passe au-delà des halos, au-dessus des voisines', async ({ page }) => {
  const vue = await ouvrir(page);
  await finGarde(bulles(vue));
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Alt+Tab');
    if (await bulle(vue, 'jaune').evaluate((b) => b === document.activeElement)) break;
  }
  await expect(bulle(vue, 'jaune')).toBeFocused();
  const f = await bulle(vue, 'jaune').evaluate((b) => {
    const s = getComputedStyle(b);
    return [b.matches(':focus-visible'), s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset, s.zIndex];
  });
  expect(f).toEqual([true, 'solid', '2px', 'rgb(255, 255, 255)', '16px', '1']);
  // Les halos tournent sur une orbite de 12 pt (le décalage de leur centre, lu sur leur transform) et débordent la face de
  // 0,4 : le contour, à 16, est au-delà.
  const ecart = await bulle(vue, 'jaune').evaluate((b) => Math.max(...[...b.querySelectorAll('.halo')].map((h) => {
    const m = new DOMMatrix(getComputedStyle(h).transform);
    return Math.hypot(m.e, m.f) + 0.4;
  })));
  expect(ecart).toBeGreaterThan(10);
  expect(ecart).toBeLessThan(16);
});

// Ouverte depuis la bulle rouge ou jaune, la carte vient au milieu de la zone, et ne monte jamais au point de mettre les
// mots du rang 12, les plus intenses, sous le voile et sous ← et la loupe : leur centre reste sous la zone sûre + 84 pt.
// v10 : la lentille, déjà posée à l'ouverture, les écarte vers le haut ; la carte descend d'autant, et pas plus.
test('relecture finale : ouverte sur le rouge ou le jaune, les mots du rang 12 restent sous le voile et les boutons', async ({ page }) => {
  for (const zones of [false, true]) {
    if (zones) { await simulerZonesSures(page); await page.reload(); await appPrete(page); }
    const haut = zones ? 47 : 0;
    for (const zone of ['rouge', 'jaune']) {
      const vue = await ouvrir(page);
      await bulle(vue, zone).click();
      await expect(carte(vue).getByRole('button')).toHaveCount(144);
      const rang12 = MOTS_CARTE.filter((x) => x.zone === zone && x.rang === 12).map((x) => x.libelle);
      const centres = await carte(vue).getByRole('button').evaluateAll((bs, noms) => bs.filter((b) => noms.includes(b.textContent))
        .map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, r.top + r.height / 2, r.left + r.width / 2]; }), rang12);
      const visibles = centres.filter(([, , x]) => x > 0 && x < 390);
      expect(visibles.length, `${zone}, zones sûres ${haut}`).toBeGreaterThan(0);
      for (const [nom, y] of centres) expect(y, `${zone} ${nom}, zones sûres ${haut}`).toBeGreaterThanOrEqual(haut + 84);
      // Avec les zones sûres de l'iPhone, le milieu de l'écran tombe au milieu de la zone (colonne 3,5 ou 9,5, rang 9,5),
      // à la descente près : celle qui garde le plus haut des mots du rang 12 juste sous le voile, 23 pt. Le centre de la
      // lentille, le rang 10, garde sa place régulière : elle dit où est le milieu de l'écran sur la carte.
      if (zones) {
        const colonne = zone === 'rouge' ? 3 : 9;
        const centreLentille = MOTS_CARTE.find((x) => x.col === colonne && x.rang === 10).libelle;
        const c = await mot(vue, centreLentille).boundingBox();
        expect(c.width, zone).toBe(156);
        expect(Math.abs(c.x + c.width / 2 + 53 - 195), zone).toBeLessThan(1.5);
        const y10 = c.y + c.height / 2;
        const descente = y10 + 53 - 422;
        expect(descente, zone).toBeGreaterThanOrEqual(0);
        expect(descente, zone).toBeLessThanOrEqual(23);
        expect(Math.abs(Math.min(...centres.map(([, y]) => y)) - (haut + 84)), zone).toBeLessThan(1.5);
      }
      await aller(page, '#/aujourdhui');
    }
  }
});

// À l'écran 3, le mot en rappel et une activité choisie ont la même couleur : celle de la case du mot (Vide, l'azur de
// sa case, et non le pervenche de la zone bleue), éclaircie pour le mot ; le texte de l'activité reste lisible.
test('relecture finale : à l\'écran 3, une activité choisie a la couleur de la case du mot, comme le mot en rappel', async ({ page }) => {
  const vue = await ouvrir(page);
  await noter(vue, 'bleu', 'Vide');
  await continuer(vue).click();
  await activite(vue, 'Travail').click();
  await expect(activite(vue, 'Travail')).toHaveCSS('background-color', rgbCase('Vide'));
  await expect(vue.getByRole('heading', { name: 'Vide', level: 1 })).toHaveCSS('color', rgb(couleurLisible(caseDe('Vide'))));
  expect(rgbCase('Vide')).not.toBe('rgb(120, 159, 255)');
  const [texte, fond] = await activite(vue, 'Travail').evaluate((b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]);
  expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
});

// L'écran de l'émotion laissé ouvert après un mot (l'iPhone verrouillé le soir, rouvert le matin) : après plus de 30 min
// d'absence, l'app revient sur Aujourd'hui, comme ailleurs. Le mot du matin fait un second relevé, daté du matin ; celui
// du soir garde son mot et son heure.
test('relecture finale : l\'écran de l\'émotion laissé ouvert la nuit se ferme au retour ; le mot du matin fait un second relevé', async ({ page }) => {
  const visibilite = (v) => page.evaluate((etat) => {
    Object.defineProperty(document, 'visibilityState', { value: etat, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, v);
  await page.clock.setSystemTime(new Date(2026, 9, 15, 22, 30));
  let vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Irrité');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '22:30', emotion: 'roue:colere:irrite' }]);
  await visibilite('hidden');
  await page.clock.fastForward('09:30:00');
  await visibilite('visible');
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(vueMoment(page)).toHaveCount(0);
  vue = await ouvrir(page);
  await noter(vue, 'rouge', 'Choqué');
  await expect.poll(async () => (await releves(page)()).length).toBe(2);
  const tous = (await releves(page)()).sort((a, b) => a.date.localeCompare(b.date));
  expect(tous).toMatchObject([
    { date: '2026-10-15', heure: '22:30', emotion: 'roue:colere:irrite' },
    { date: '2026-10-16', heure: '08:00', emotion: 'roue:surprise:choque' },
  ]);
  // Moins de 30 min : l'écran reste ouvert, sur le même relevé.
  await visibilite('hidden');
  await page.clock.fastForward('10:00');
  await visibilite('visible');
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(mot(vue, 'Choqué')).toHaveAttribute('aria-pressed', 'true');
});

// Un premier essai d'écriture qui a écrit mais dont la réponse s'est perdue : le nouvel essai réécrit la même clé (l'id
// est tiré une seule fois, avant les essais), sans second relevé ; le mot suivant change ce relevé-là.
test('relecture finale : une création qui écrit puis échoue une fois laisse un seul relevé, que le mot suivant modifie', async ({ page }) => {
  await page.evaluate(() => {
    const h = window.__carnet.repo.humeurs;
    const creer = h.creer.bind(h);
    let premier = true;
    h.creer = async (...args) => {
      const r = await creer(...args);
      if (premier) { premier = false; throw new Error('réponse perdue'); }
      return r;
    };
  });
  const vue = await ouvrir(page);
  await noter(vue, 'bleu', 'Vide');
  await page.clock.runFor(1600);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse:vide' }]);
  const [{ id }] = await releves(page)();
  await toucherMot(vue, 'Épuisé');
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:aucune:epuise' }]);
  expect(await releves(page)()).toHaveLength(1);
});
