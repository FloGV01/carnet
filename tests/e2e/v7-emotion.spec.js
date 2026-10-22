import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { FAMILLES } from '../../public/js/domain/roue.js';

// v7 (3/9) · Émotion du moment (spec v7 §4.2) : la roue en bulles à la place de la note de 1 à 10. Une famille,
// puis un mot si on le trouve, puis l'énergie : trois touchers. Chaque toucher enregistre ; le panneau des réponses
// est collé en bas, près du pouce (2b). Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const effacerReleves = (page) => page.evaluate(async () => {
  const r = window.__carnet.repo;
  for (const h of await r.humeurs.tous()) await r.humeurs.supprimer(h.id);
});
const vueMoment = (page) => page.getByRole('dialog', { name: 'Émotion du moment' });
const familles = (vue) => vue.getByRole('group', { name: 'Émotion' });
const famille = (vue, nom) => familles(vue).getByRole('button', { name: nom, exact: true });
const mots = (vue, nom) => vue.getByRole('group', { name: `Mots de la famille ${nom}` });
const mot = (vue, libelle, nom) => mots(vue, nom).getByRole('button', { name: `${libelle}, famille ${nom}`, exact: true });
const energie = (vue, nom) => vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: `Énergie : ${nom}` });
const retourFamilles = (vue) => vue.getByRole('button', { name: 'Familles', exact: true });
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(famille(vue, 'Colère')).toBeVisible();
  return vue;
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('Colère › Irrité › énergie moyenne : trois touchers, le relevé est noté et l\'écran se ferme ; plus de note de 1 à 10', async ({ page }) => {
  const vue = await ouvrir(page);
  await expect(vue.getByRole('heading', { name: 'Émotion du moment', level: 1 })).toBeVisible();
  // Les 7 familles, dans l'ordre de la roue ; aucune grille de 1 à 10.
  await expect(familles(vue).getByRole('button')).toHaveText(['Colère', 'Dégoût', 'Tristesse', 'Joie', 'Surprise', 'Peur', 'Sérénité']);
  await expect(vue.getByRole('button', { name: /^Humeur \d/ })).toHaveCount(0);
  await expect(vue.getByText('1 = au plus bas')).toHaveCount(0);

  await famille(vue, 'Colère').click();
  // Toucher 1 enregistre déjà la famille, et montre ses mots, avec « ‹ Familles ».
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '21:00', emotion: 'roue:colere', humeur: null, energie: null }]);
  await expect(mots(vue, 'Colère').getByRole('button')).toHaveCount(16);
  await expect(retourFamilles(vue)).toBeVisible();
  await mot(vue, 'Irrité', 'Colère').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:colere:irrite', energie: null }]);
  await expect(page).toHaveURL(/#\/moment$/);
  await energie(vue, 'Moyenne').click();
  await expect(page.getByText('Émotion du moment notée')).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  const [r] = await releves(page)();
  expect(r).toMatchObject({ emotion: 'roue:colere:irrite', humeur: null, energie: 'energie:moyenne', vers: null });
  expect(await releves(page)()).toHaveLength(1);

  // « Annuler » retire le relevé.
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
});

test('relevé noté par étapes (point de vigilance 3) : famille, mot, retouche du mot, retouche de la famille ; chaque état est écrit tel quel', async ({ page }) => {
  const vue = await ouvrir(page);
  await famille(vue, 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:peur' }]);
  const id = (await releves(page)())[0].id;
  await mot(vue, 'Sans valeur', 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:peur:sans-valeur' }]);
  await expect(mot(vue, 'Sans valeur', 'Peur')).toHaveAttribute('aria-pressed', 'true');
  // Retoucher le mot choisi : il redevient la famille ; la vue des mots reste.
  await mot(vue, 'Sans valeur', 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:peur' }]);
  await expect(mot(vue, 'Sans valeur', 'Peur')).toHaveAttribute('aria-pressed', 'false');
  // « ‹ Familles » n'écrit rien : la famille y est choisie.
  await retourFamilles(vue).click();
  await expect(famille(vue, 'Peur')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(150);
  expect(await releves(page)()).toMatchObject([{ id, emotion: 'roue:peur' }]);
  // Retoucher la famille choisie : plus d'émotion. Il ne reste rien, le relevé est supprimé.
  await famille(vue, 'Peur').click();
  await expect(famille(vue, 'Peur')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  await expect(page).toHaveURL(/#\/moment$/);

  // Avec l'énergie : un relevé qui n'a plus d'émotion reste, avec son énergie.
  await energie(vue, 'Haute').click();
  await famille(vue, 'Joie').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:joie', energie: 'energie:haute' }]);
  // La famille touchée montre ses mots : l'écran les attend, même l'énergie choisie.
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/#\/moment$/);
  await retourFamilles(vue).click();
  await famille(vue, 'Joie').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: null, energie: 'energie:haute' }]);
  // Une famille d'abord, puis l'énergie : la famille seule suffit, l'écran se ferme.
  await famille(vue, 'Surprise').click();
  await energie(vue, 'Basse').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:surprise', energie: 'energie:basse' }]);
});

test('un mot choisi dans la vue des familles : sa famille est cochée, le mot à droite du titre ; une autre famille le remplace', async ({ page }) => {
  const vue = await ouvrir(page);
  await famille(vue, 'Sérénité').click();
  await mot(vue, 'En sécurité', 'Sérénité').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:serenite:en-securite' }]);
  await retourFamilles(vue).click();
  // La bulle ne garde que le nom de sa famille ; elle s'annonce « Sérénité, En sécurité ».
  const serenite = familles(vue).getByRole('button', { name: 'Sérénité, En sécurité', exact: true });
  await expect(serenite).toHaveAttribute('aria-pressed', 'true');
  await expect(serenite).toHaveText('Sérénité');
  await expect(vue.locator('.mot-choisi')).toHaveText('En sécurité');
  await expect(vue.getByText('une famille, puis un mot')).toHaveCount(0);
  // Une autre famille : la famille seule, à la place du mot ; l'aide revient.
  await famille(vue, 'Tristesse').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: 'roue:tristesse' }]);
  await retourFamilles(vue).click();
  await expect(familles(vue).getByRole('button', { pressed: true })).toHaveText(['Tristesse']);
  await expect(vue.locator('.mot-choisi')).toHaveCount(0);
  await expect(vue.getByText('une famille, puis un mot')).toBeVisible();
});

// Le mot choisi, à droite du titre « Émotion » : sur une ligne, entier, dans le panneau, sans toucher le titre. Les
// 79 mots passent tour à tour dans l'élément de l'écran (son texte seul change, ses styles sont ceux de l'app).
const placesDuMot = (vue, libelles) => vue.locator('.mot-choisi').evaluate((el, ls) => {
  const texte = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  const avant = texte.data;
  const titre = el.closest('.tete-reponse').querySelector('.titre-reponse');
  const p = el.closest('.panneau-reponses');
  const [rp, sp] = [p.getBoundingClientRect(), getComputedStyle(p)];
  const droite = rp.right - parseFloat(sp.paddingRight);
  const fautes = [];
  for (const l of ls) {
    texte.data = l;
    const rg = document.createRange();
    rg.selectNodeContents(texte);
    const r = rg.getBoundingClientRect();
    const t = titre.getBoundingClientRect();
    if (rg.getClientRects().length !== 1) fautes.push(`${l} : sur plusieurs lignes`);
    if (r.left < t.right + 4) fautes.push(`${l} : touche le titre`);
    if (r.right > droite + 0.5 || el.scrollWidth > el.clientWidth + 0.5) fautes.push(`${l} : coupé ou hors du panneau`);
  }
  texte.data = avant;
  return fautes;
}, libelles);

test('le mot choisi s\'affiche en entier à droite du titre « Émotion », les 79 mots, à 17, 21 et 23 px ; à la couleur de sa famille, AA en clair et en sombre', async ({ page }) => {
  // Le texte d'une famille (-text) sur le panneau (--surface), pour les 7 familles.
  for (const [schema, t] of [['clair', clair], ['sombre', sombre]]) {
    for (const f of FAMILLES) expect(contraste(t[`c-emo-${f.cle}-text`], t.surface), `${schema} ${f.libelle}`).toBeGreaterThanOrEqual(4.5);
  }
  const tous = FAMILLES.flatMap((f) => f.mots.map((m) => m.libelle));
  expect(tous).toHaveLength(79);
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    // Les deux mots les plus longs, choisis pour de bon : Peur › Non respecté, puis Surprise › Désillusionné en 23 px.
    await famille(vue, 'Peur').click();
    await mot(vue, 'Non respecté', 'Peur').click();
    await retourFamilles(vue).click();
    const choisi = vue.locator('.mot-choisi');
    await expect(choisi).toHaveText('Non respecté');
    const [couleur, fond] = await choisi.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.closest('.panneau-reponses')).backgroundColor]);
    expect(couleur).toBe(rgb(t['c-emo-peur-text']));
    expect(contraste(couleur, fond)).toBeGreaterThanOrEqual(4.5);
    for (const taille of [17, 21, 23]) {
      await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
      expect(await placesDuMot(vue, tous), `${schema}, texte de ${taille} px`).toEqual([]);
    }
    await familles(vue).getByRole('button', { name: 'Peur, Non respecté', exact: true }).click();
    await expect(choisi).toHaveCount(0);
    await famille(vue, 'Surprise').click();
    await mot(vue, 'Désillusionné', 'Surprise').click();
    await retourFamilles(vue).click();
    await expect(choisi).toHaveText('Désillusionné');
    expect(await placesDuMot(vue, ['Désillusionné']), `${schema}, Désillusionné en 23 px`).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    await effacerReleves(page);
  }
});

// Deux touchers à 120 ms au même point, le centre d'une bulle : sur l'iPhone, width=device-width supprime le délai du
// double toucher, ce sont deux clics. La vue change entre les deux : le second tombe sur une bulle qui vient de paraître.
const doubleToucher = async (page, bouton) => {
  const b = await bouton.boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(x, y);
  return [x, y];
};
const finAnimations = (vue) => vue.locator('.panneau-reponses').evaluate((p) => Promise.all(p.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));

test('double toucher rapide sur une famille : le mot apparu dessous n\'est pas choisi (sans puis avec l\'énergie, avec ou sans « Réduire les animations »)', async ({ page }) => {
  test.setTimeout(60000);
  for (const mouvement of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion: mouvement });
    for (const avecEnergie of [false, true]) {
      const quoi = (f) => `${f.libelle}, ${avecEnergie ? 'énergie choisie' : 'sans énergie'}, ${mouvement}`;
      const vue = await ouvrir(page);
      if (avecEnergie) await energie(vue, 'Haute').click();
      for (const f of FAMILLES) {
        await finAnimations(vue);
        const point = await doubleToucher(page, famille(vue, f.libelle));
        await expect(mots(vue, f.libelle).getByRole('button')).toHaveCount(f.mots.length);
        // Au-delà de la fermeture automatique (250 ms) : l'écran est resté, la famille seule est notée, aucun mot coché.
        await page.waitForTimeout(400);
        expect(await releves(page)(), quoi(f)).toMatchObject([{ emotion: f.id, energie: avecEnergie ? 'energie:haute' : null }]);
        await expect(mots(vue, f.libelle).getByRole('button', { pressed: true }), quoi(f)).toHaveCount(0);
        await expect(page, quoi(f)).toHaveURL(/#\/moment$/);
        if (f === FAMILLES[0] && !avecEnergie) {
          // La garde passée, un toucher au même point choisit le mot qui s'y trouve.
          await page.touchscreen.tap(...point);
          await expect(mots(vue, f.libelle).getByRole('button', { pressed: true })).toHaveCount(1);
          await expect.poll(async () => (await releves(page)())[0].emotion).toMatch(new RegExp(`^${f.id}:`));
        }
        // Retour aux familles ; retoucher la famille choisie (« Colère, Hostile » si un mot l'est) efface l'émotion.
        await retourFamilles(vue).click();
        const choisie = familles(vue).getByRole('button', { name: new RegExp(`^${f.libelle}`) });
        await choisie.click();
        await expect(choisie).toHaveAttribute('aria-pressed', 'false');
        await expect.poll(async () => (await releves(page)()).map((h) => h.emotion)).toEqual(avecEnergie ? [null] : []);
      }
      await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
      await effacerReleves(page);
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

// Style d'une bulle : fond, texte, graisse, coche (15–16 px, trait 3), taille.
const stylesBulles = (groupeLoc) => groupeLoc.evaluate(async (g) => {
  await Promise.all(g.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  return [...g.querySelectorAll('button')].map((b) => {
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const coche = b.querySelector(':scope > .coche');
    const svg = coche && coche.querySelector('svg');
    return {
      nom: b.getAttribute('aria-label') || b.textContent.trim(), choisi: b.getAttribute('aria-pressed') === 'true',
      fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight, rayon: s.borderTopLeftRadius,
      largeur: r.width, hauteur: r.height, gauche: r.left, droite: r.right,
      coche: Boolean(coche && getComputedStyle(coche).display !== 'none' && svg.getBoundingClientRect().width >= 15 && svg.getBoundingClientRect().width <= 16),
      trait: svg ? svg.getAttribute('stroke-width') : null,
    };
  });
});
function verifierBulle(b, t, cle, quoi) {
  const c = (role) => rgb(t[`c-emo-${cle}${role}`]);
  if (b.choisi) {
    expect([b.fond, b.texte, b.graisse, b.coche, b.trait], `${quoi} : choisi`).toEqual([c('-fill'), c('-on'), '600', true, '3']);
  } else {
    expect([b.fond, b.texte, b.graisse, b.coche], `${quoi} : non choisi`).toEqual([c('-tint-2'), c('-text'), '500', false]);
  }
  expect(contraste(b.fond, b.texte), `${quoi} : AA`).toBeGreaterThanOrEqual(4.5);
  expect(b.largeur, `${quoi} : largeur`).toBeGreaterThanOrEqual(44);
  expect(b.hauteur, `${quoi} : hauteur`).toBeGreaterThanOrEqual(44);
  expect(b.gauche, `${quoi} : dans l'écran`).toBeGreaterThanOrEqual(0);
  expect(b.droite, `${quoi} : dans l'écran`).toBeLessThanOrEqual(390);
}

test('bulles, en clair et en sombre : couleur de la famille, AA, 44 pt au moins ; le choix fait a -fill, -on, 600 et la coche ; les voisines ne bougent pas', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await page.reload();
    await appPrete(page);
    const vue = await ouvrir(page);
    const rondes = await stylesBulles(familles(vue));
    expect(rondes.map((b) => b.nom)).toEqual(FAMILLES.map((f) => f.libelle));
    rondes.forEach((b, i) => {
      verifierBulle(b, t, FAMILLES[i].cle, `${schema} ${b.nom}`);
      expect(b.rayon, `${b.nom} : ronde`).toBe('50%');
      expect(Math.round(b.largeur)).toBe(Math.round(b.hauteur));
    });

    for (const f of FAMILLES) {
      await famille(vue, f.libelle).click();
      const groupe = mots(vue, f.libelle);
      await expect(groupe.getByRole('button')).toHaveCount(f.mots.length);
      // Chaque bulle s'annonce « Irrité, famille Colère ».
      const avant = await stylesBulles(groupe);
      expect(avant.map((b) => b.nom)).toEqual(f.mots.map((m) => `${m.libelle}, famille ${f.libelle}`));
      for (const b of avant) verifierBulle(b, t, f.cle, `${schema} ${b.nom}`);
      // Choisir un mot : coche, -fill, -on, 600 ; aucune bulle ne bouge.
      const choisi = f.mots[Math.min(5, f.mots.length - 1)];
      await mot(vue, choisi.libelle, f.libelle).click();
      await expect(mot(vue, choisi.libelle, f.libelle)).toHaveAttribute('aria-pressed', 'true');
      const apres = await stylesBulles(groupe);
      for (const b of apres) verifierBulle(b, t, f.cle, `${schema} ${b.nom}`);
      expect(apres.filter((b) => b.choisi).map((b) => b.nom)).toEqual([`${choisi.libelle}, famille ${f.libelle}`]);
      apres.forEach((b, i) => expect(Math.abs(b.gauche - avant[i].gauche) + Math.abs(b.droite - avant[i].droite), `${b.nom} ne bouge pas`).toBeLessThanOrEqual(1));
      // De retour aux familles : la famille est cochée, en -fill et -on.
      await retourFamilles(vue).click();
      const [cochee] = (await stylesBulles(familles(vue))).filter((b) => b.choisi);
      verifierBulle(cochee, t, f.cle, `${schema} ${f.libelle} choisie`);
      expect(cochee.nom).toBe(`${f.libelle}, ${choisi.libelle}`);
    }
    // Le titre de la vue des mots, à la couleur de la famille, reste lisible.
    await famille(vue, 'Tristesse').click();
    const titre = vue.locator('.titre-famille');
    const [couleur, fond] = await titre.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.closest('.panneau-reponses')).backgroundColor]);
    expect(couleur).toBe(rgb(t['c-emo-tristesse-text']));
    expect(contraste(couleur, fond)).toBeGreaterThanOrEqual(4.5);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
});

test('réponses près du pouce (2b) : panneau collé en bas, en --surface, rayon 24 ; tout tient sans défiler, la roue comme les 16 mots de Colère', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '12:00', vers: true, emotion: 'roue:tristesse:vide', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '17:45', emotion: 'roue:colere:irrite', energie: 'energie:moyenne' });
  });
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const panneau = vue.getByRole('region', { name: 'Réponses' });
    const mesure = () => panneau.evaluate((p) => {
      const s = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      const boutons = [...p.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
      return { bas: r.bottom, haut: r.top, fond: s.backgroundColor, rayon: s.borderTopLeftRadius, defile: p.scrollHeight > p.clientHeight + 1,
        horsVue: boutons.filter((b) => b.top < r.top || b.bottom > innerHeight).length };
    });
    const m = await mesure();
    expect(m).toMatchObject({ bas: 844, fond: rgb(t.surface), rayon: '24px', defile: false, horsVue: 0 });
    // L'énergie est dans le panneau, en bas : ses boutons de 52.
    const basse = energie(vue, 'Basse');
    expect((await basse.boundingBox()).height).toBeGreaterThanOrEqual(52);
    expect(await panneau.getByRole('group', { name: 'Énergie' }).count()).toBe(1);
    // Les 16 mots de Colère tiennent aussi, avec les relevés du jour au-dessus.
    await famille(vue, 'Colère').click();
    await expect(mots(vue, 'Colère').getByRole('button')).toHaveCount(16);
    expect(await mesure()).toMatchObject({ bas: 844, defile: false, horsVue: 0 });
    await expect(vue.getByRole('heading', { name: 'Émotion du moment', level: 1 })).toBeInViewport();
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    // Le relevé de Colère créé ici part, pour repartir du même état.
    await page.evaluate(async () => {
      const r = window.__carnet.repo;
      for (const h of await r.humeurs.tous()) if (h.heure === '21:00') await r.humeurs.supprimer(h.id);
    });
  }
});

test('les relevés du jour : « Irrité · énergie moyenne » au point de sa famille ; un ancien relevé chiffré garde « humeur 6 », point creux ; même colonne', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '17:45', emotion: 'roue:colere:irrite', energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '12:00', vers: true, emotion: 'roue:serenite', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '14:10', humeur: null, energie: 'energie:basse' });
  });
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const liste = vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' });
    // Dans l'ordre des heures, les deux formats côte à côte.
    await expect(liste.getByRole('listitem')).toHaveText([
      /^10:20\s*humeur 6 · énergie moyenne$/, /^vers 12 h\s*Sérénité$/, /^14:10\s*énergie basse$/, /^17:45\s*Irrité · énergie moyenne$/,
    ]);
    const lignes = await liste.getByRole('listitem').evaluateAll((els) => els.map((li) => {
      const p = li.querySelector('.point-releve-moment');
      const s = getComputedStyle(p);
      return { fond: s.backgroundColor, bord: s.borderTopWidth, heure: Math.round(li.querySelector('.heure-moment').getBoundingClientRect().width),
        texte: Math.round(li.querySelector('.texte-releve').getBoundingClientRect().left) };
    }));
    expect(lignes[1].fond).toBe(rgb(t['c-emo-serenite']));
    expect(lignes[3].fond).toBe(rgb(t['c-emo-colere']));
    // Sans émotion (ancienne note, énergie seule) : un rond creux, neutre.
    for (const i of [0, 2]) {
      expect(lignes[i].fond).toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(lignes[i].bord)).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(lignes.map((l) => l.heure)).size).toBe(1);
    expect(new Set(lignes.map((l) => l.texte)).size).toBe(1);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  // L'ancien relevé n'est pas touché : sa note reste, sans émotion.
  expect((await releves(page)()).find((h) => h.heure === '10:20')).toMatchObject({ humeur: 6, emotion: null, energie: 'energie:moyenne' });
});

test('une vue paraît en fondu de 200 ms au plus ; avec « Réduire les animations », rien ne bouge', async ({ page }) => {
  // Le mouvement prévu par les styles (animation de la grappe, fondu des bulles) et celui en cours.
  const mouvement = (vue) => vue.locator('.panneau-reponses').evaluate((p) => ({
    styles: [...p.querySelectorAll('.bulles, .bulle')].map((e) => {
      const s = getComputedStyle(e);
      return { grappe: e.classList.contains('bulles'), nom: s.animationName, duree: parseFloat(s.animationDuration) * 1000,
        fondu: parseFloat(s.transitionDuration) * 1000 };
    }),
    enCours: p.getAnimations({ subtree: true }).length,
  }));
  let vue = await ouvrir(page);
  await famille(vue, 'Joie').click();
  await expect(mots(vue, 'Joie').getByRole('button')).toHaveCount(16);
  const avec = await mouvement(vue);
  expect(avec.styles.filter((s) => s.grappe).map((s) => [s.nom, s.duree])).toEqual([['apparition-bulles', 200]]);
  for (const s of avec.styles) expect(Math.max(s.duree, s.fondu)).toBeLessThanOrEqual(200);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  vue = await ouvrir(page);
  const verifierImmobile = async (quoi) => {
    const m = await mouvement(vue);
    expect(m.enCours, quoi).toBe(0);
    for (const s of m.styles) expect([s.nom, s.fondu], quoi).toEqual(['none', 0]);
  };
  await verifierImmobile('familles');
  await famille(vue, 'Surprise').click();
  await expect(mots(vue, 'Surprise').getByRole('button')).toHaveCount(8);
  await verifierImmobile('mots');
  await mot(vue, 'Perplexe', 'Surprise').click();
  await verifierImmobile('mot choisi');
  await retourFamilles(vue).click();
  await verifierImmobile('retour aux familles');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('accessibilité : après une famille, le focus va au titre de ses mots ; après « ‹ Familles », au titre « Émotion »', async ({ page }) => {
  const vue = await ouvrir(page);
  await famille(vue, 'Dégoût').click();
  await expect(vue.getByRole('heading', { name: 'Dégoût', level: 2 })).toBeFocused();
  await retourFamilles(vue).click();
  await expect(vue.getByRole('heading', { name: 'Émotion', level: 2 })).toBeFocused();
});
