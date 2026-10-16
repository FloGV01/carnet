import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller } from '../aides/saisie.js';

// v6 · Ergonomie (spec §8) : zones de texte qui grandissent de leur taille au repos à 7 lignes, bande du bas
// pleine et collée aux onglets, cibles de 44 pt, libellés courts du récapitulatif de l'Après coup, sélections
// adoucies en mode sombre (contraste AA). Données inventées.
const repo = (page, f, arg) => page.evaluate(f, arg);
const creerEpisode = (page, e) => repo(page, async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const COLERE = { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Contraste WCAG entre deux couleurs calculées (« rgb(r, g, b) »).
function luminance(couleur) {
  const [r, g, b] = couleur.match(/[\d.]+/g).slice(0, 3).map((c) => {
    const v = Number(c) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Les couleurs finales : un choix qu'on vient de toucher passe par un fondu (var(--duree)), lu à mi-chemin sur
// une machine chargée. On attend la fin des transitions de l'élément et de ce qu'il contient.
const styleDe = (loc) => loc.evaluate(async (e) => {
  await Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const s = getComputedStyle(e);
  return { fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight };
});
// Couleur vue d'un texte posé à l'opacité `a` sur un fond plein : le mélange des deux, canal par canal.
const melange = (texte, fond, a) => {
  const [t, f] = [texte, fond].map((c) => c.match(/[\d.]+/g).slice(0, 3).map(Number));
  return `rgb(${t.map((v, i) => Math.round(a * v + (1 - a) * f[i])).join(', ')})`;
};
// Un choix sélectionné et sa précision (<small>), pour chaque teinte et sans teinte, construits dans la page.
const TEINTES = ['lieu', 'sommeil', 'humeur', 'contact', 'sport', 'expl', 'trt', 'pos', 'ep', 'sy', 'jour', null];
const choixParTeinte = (page) => page.evaluate((teintes) => teintes.map((t) => {
  const groupe = document.createElement('div');
  groupe.className = t ? `pastilles teinte-${t}` : 'pastilles';
  const choix = document.createElement('button');
  choix.className = 'pastille';
  choix.setAttribute('aria-pressed', 'true');
  const petit = document.createElement('small');
  petit.textContent = 'bruit, monde';
  choix.append('Choix', petit);
  groupe.append(choix);
  document.body.append(groupe);
  const [sc, sp] = [getComputedStyle(choix), getComputedStyle(petit)];
  const r = { teinte: t, fond: sc.backgroundColor, texte: sc.color, graisse: sc.fontWeight, petit: sp.color, opacite: Number(sp.opacity) };
  groupe.remove();
  return r;
}), TEINTES);

// Hauteur d'une zone en lignes (cadre retiré) et défilement intérieur.
const lignesDe = (zone) => zone.evaluate((z) => {
  const s = getComputedStyle(z);
  const cadre = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((t, p) => t + parseFloat(s[p]), 0);
  return { lignes: Math.round((z.getBoundingClientRect().height - cadre) / parseFloat(s.lineHeight)), defile: z.scrollHeight > z.clientHeight + 1 };
});
const texteSur = (n) => Array.from({ length: n }, (_, i) => `ligne ${i + 1}`).join('\n');

test('le soir tient sans défilement à 390 × 797, en clair et en sombre ; la bande du bas est pleine et collée aux onglets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(groupe(page, 'Lieu')).toHaveCount(1);
    // De Lieu aux points positifs, tout est à l'écran d'un coup, au-dessus de la bande.
    expect((await groupe(page, 'Lieu').boundingBox()).y).toBeGreaterThanOrEqual(0);
    const positifs = await page.locator('#points-positifs').boundingBox();
    const bande = page.locator('.actions-flottantes');
    const cadre = await bande.boundingBox();
    const onglets = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox();
    expect(positifs.y + positifs.height).toBeLessThanOrEqual(cadre.y);
    // Collée : aucun jour entre la bande et la barre d'onglets.
    expect(Math.abs(cadre.y + cadre.height - onglets.y)).toBeLessThanOrEqual(0.5);
    // Fond plein, celui de la page : le texte ne passe plus entre les boutons, ni à la vue ni au toucher.
    const fond = await bande.evaluate((b) => {
      const s = getComputedStyle(b);
      const premier = b.firstElementChild.getBoundingClientRect();
      const entre = document.elementFromPoint(premier.right + 2, premier.top + premier.height / 2);
      return { couleur: s.backgroundColor, image: s.backgroundImage, page: getComputedStyle(document.documentElement).backgroundColor, entre: Boolean(entre && entre.closest('.actions-flottantes')) };
    });
    expect(fond.image).toBe('none');
    expect(fond.couleur).toBe(fond.page);
    expect(fond.couleur).toMatch(/^rgb\(/);
    expect(fond.entre).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // La page défile jusqu'au dernier repli : « Notes libres » passe au-dessus de la bande.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const notes = await page.getByRole('button', { name: /^Notes libres/ }).boundingBox();
    expect(notes.y + notes.height).toBeLessThanOrEqual((await bande.boundingBox()).y);
  }
});

test('une zone de texte grandit de 2 à 7 lignes, puis défile ; vide, elle garde sa taille ; sans field-sizing, rows suit le texte', async ({ page }) => {
  const zone = page.locator('#points-positifs');
  await expect(zone).toHaveAttribute('placeholder', /Même petit/);
  expect(await lignesDe(zone)).toEqual({ lignes: 2, defile: false });
  await zone.fill(texteSur(4));
  expect(await lignesDe(zone)).toEqual({ lignes: 4, defile: false });
  await zone.fill(texteSur(12));
  expect(await lignesDe(zone)).toEqual({ lignes: 7, defile: true });
  await zone.fill('');
  expect(await lignesDe(zone)).toEqual({ lignes: 2, defile: false });

  // Repli (iOS sans field-sizing) : l'attribut rows est ajusté à la saisie, jamais un style en ligne de l'app.
  await zone.evaluate((z) => z.style.setProperty('field-sizing', 'fixed'));
  await zone.fill(texteSur(3));
  await expect(zone).toHaveAttribute('rows', '3');
  expect(await lignesDe(zone)).toEqual({ lignes: 3, defile: false });
  await zone.fill(texteSur(12));
  await expect(zone).toHaveAttribute('rows', '7');
  expect(await lignesDe(zone)).toEqual({ lignes: 7, defile: true });
  await zone.fill('');
  await expect(zone).toHaveAttribute('rows', '2');
});

// Chaque zone de l'écran : field-sizing, et une hauteur bornée par sa taille au repos et 7 lignes. Les bornes
// sont lues sur une zone non vide (vide, elle garde sa taille au repos) ; la valeur posée ici n'est pas une saisie.
const zonesDe = (page) => page.locator('textarea.champ-texte').evaluateAll((zs) => zs.map((z) => {
  const avant = z.value;
  z.value = avant || 'x';
  const s = getComputedStyle(z);
  const ligne = parseFloat(s.lineHeight);
  const cadre = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((t, p) => t + parseFloat(s[p]), 0);
  const zone = { id: z.id, auto: s.fieldSizing, min: Math.round((parseFloat(s.minHeight) - cadre) / ligne), max: Math.round((parseFloat(s.maxHeight) - cadre) / ligne) };
  z.value = avant;
  return zone;
}));

test('toutes les zones de texte grandissent jusqu\'à 7 lignes : soir, épisode, Après coup, rendez-vous, traitement, Mon plan, notes en vrac', async ({ page }) => {
  await page.getByRole('button', { name: /^Notes libres/ }).click();
  expect(await zonesDe(page)).toEqual([
    { id: 'points-positifs', auto: 'content', min: 2, max: 7 },
    { id: 'notes', auto: 'content', min: 3, max: 7 },
  ]);
  const id = await creerEpisode(page, COLERE);
  await aller(page, `#/episode/${id}`);
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  expect(await zonesDe(page)).toEqual([
    { id: 'episodes-situation', auto: 'content', min: 2, max: 7 },
    { id: 'episodes-ceQuiAAide', auto: 'content', min: 2, max: 7 },
  ]);
  await aller(page, `#/apres-coup/${id}`);
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await vue.getByRole('button', { name: 'Passer' }).click();
  await vue.getByRole('button', { name: 'Passer' }).click();
  await expect(vue.getByRole('heading', { name: 'Le déclencheur' })).toBeVisible();
  expect(await zonesDe(page)).toEqual([{ id: 'ac-situation', auto: 'content', min: 2, max: 7 }]);
  await aller(page, '#/rdv/nouveau');
  await expect(page.locator('#rdv-compte-rendu')).toBeVisible();
  expect(await zonesDe(page)).toEqual([
    { id: 'rdv-compte-rendu', auto: 'content', min: 3, max: 7 },
    { id: 'rdv-prochaine-etape', auto: 'content', min: 2, max: 7 },
  ]);
  await aller(page, '#/traitement/nouveau');
  await expect(page.locator('#tr-notes')).toBeVisible();
  expect(await zonesDe(page)).toEqual([
    { id: 'tr-changement', auto: 'content', min: 2, max: 7 },
    { id: 'tr-notes', auto: 'content', min: 2, max: 7 },
  ]);
  await aller(page, '#/mon-plan');
  await expect(page.locator('textarea.champ-texte').first()).toBeVisible();
  for (const z of await zonesDe(page)) expect(z).toMatchObject({ auto: 'content', min: 2, max: 7 });
  // Une note de la liste aussi : deux lignes au repos, sept au plus, puis elle défile.
  await repo(page, () => window.__carnet.repo.notes.creer({ date: '2026-10-15', heure: '20:00', texte: 'Une idée' }));
  await aller(page, '#/soins');
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Notes' }).click();
  const note = page.getByRole('list', { name: 'Notes' }).getByRole('textbox');
  await expect(note).toHaveValue('Une idée');
  expect(await lignesDe(note)).toEqual({ lignes: 2, defile: false });
  await note.fill(texteSur(10));
  expect(await lignesDe(note)).toEqual({ lignes: 7, defile: true });
});

test('mode sombre : un choix sélectionné, « + Épisode » et « Terminer » gardent un fond plein moins lumineux, un texte clair en 600, contraste AA', async ({ page }) => {
  // Contraste AA (≥ 4,5) en clair comme en sombre ; en sombre, fond sombre (luminance < 0,2) et texte clair (> 0,6).
  const verifier = (s, sombre) => {
    expect(s.graisse).toBe('600');
    expect(contraste(s.fond, s.texte)).toBeGreaterThanOrEqual(4.5);
    if (sombre) {
      expect(luminance(s.fond)).toBeLessThan(0.2);
      expect(luminance(s.texte)).toBeGreaterThan(0.6);
    }
  };
  const id = await creerEpisode(page, { ...COLERE, declencheur: 'declencheur:surcharge_sensorielle' });
  for (const schema of ['dark', 'light']) {
    const sombre = schema === 'dark';
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await page.reload();
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    const bureau = groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' });
    const moyen = groupe(page, 'Sommeil').getByRole('button', { name: 'Sommeil : Moyen' });
    await expect(bureau).toHaveAttribute('aria-pressed', 'true');
    await expect(moyen).toHaveAttribute('aria-pressed', 'true');
    verifier(await styleDe(bureau), sombre);
    verifier(await styleDe(moyen), sombre);
    // Deux rubriques, deux teintes : la couleur reste un repère.
    expect((await styleDe(bureau)).fond).not.toBe((await styleDe(moyen)).fond);
    verifier(await styleDe(page.locator('.actions-flottantes .fab')), sombre);
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');

    await aller(page, `#/episode/${id}`);
    const fiche = page.getByRole('dialog', { name: 'Épisode' });
    verifier(await styleDe(fiche.getByRole('button', { name: 'Terminer' })), sombre);
    // Un choix sélectionné dans une étape, avec sa précision en petit : « Surcharge sensorielle (bruit, monde) ».
    await fiche.getByRole('button', { name: /^Déclencheur/ }).click();
    const surcharge = fiche.getByRole('group', { name: 'Déclencheur' }).getByRole('button', { name: /^Surcharge sensorielle/ });
    await expect(surcharge).toHaveAttribute('aria-pressed', 'true');
    const style = await styleDe(surcharge);
    verifier(style, sombre);
    const petit = await surcharge.locator('small').evaluate((e) => ({ couleur: getComputedStyle(e).color, opacite: Number(getComputedStyle(e).opacity) }));
    expect(contraste(melange(petit.couleur, style.fond, petit.opacite), style.fond)).toBeGreaterThanOrEqual(4.5);
    await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(page).toHaveURL(/#\/aujourdhui$/);

    // Toutes les teintes : le choix et sa précision gardent le contraste AA.
    for (const c of await choixParTeinte(page)) {
      verifier(c, sombre);
      expect(contraste(melange(c.petit, c.fond, c.opacite), c.fond), `${c.teinte} (petit)`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

// Une cible : 44 pt au moins dans les deux sens.
async function cible(loc) {
  const b = await loc.boundingBox();
  expect(b.height, await loc.textContent()).toBeGreaterThanOrEqual(44);
  expect(b.width, await loc.textContent()).toBeGreaterThanOrEqual(44);
}

test('cibles de 44 pt : Mon plan et Après coup, effets du contact et ressenti, Jours · Épisodes · Symptômes, périodes, ligne de date', async ({ page }) => {
  await page.getByRole('button', { name: /^Contact en détail/ }).click();
  for (const b of await groupe(page, 'Contact 1 : comment c\'était').getByRole('button').all()) await cible(b);

  const id = await creerEpisode(page, COLERE);
  await aller(page, `#/episode/${id}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await cible(fiche.locator('.ligne-plan').getByRole('button', { name: 'Mon plan' }));
  await cible(fiche.locator('.ligne-plan').getByRole('link', { name: 'Après coup' }));
  // La ligne de date se touche sur toute sa largeur.
  const date = fiche.locator('.ligne-date > button');
  await cible(date);
  const largeurs = await fiche.locator('.ligne-date').evaluate((l) => {
    const s = getComputedStyle(l);
    return { ligne: l.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), bouton: l.querySelector('button').getBoundingClientRect().width };
  });
  expect(Math.abs(largeurs.bouton - largeurs.ligne)).toBeLessThanOrEqual(1);
  await fiche.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  await aller(page, '#/traitement/nouveau');
  for (const b of await groupe(page, 'Effet ressenti').getByRole('button').all()) await cible(b);
  await aller(page, '#/historique');
  for (const b of await groupe(page, 'Afficher').getByRole('button').all()) await cible(b);
  await aller(page, '#/analyse');
  for (const b of await groupe(page, 'Période').getByRole('button').all()) await cible(b);
  await aller(page, '#/comprendre');
  for (const b of await groupe(page, 'Période').getByRole('button').all()) await cible(b);
});

test('récapitulatif de l\'Après coup : des libellés courts à la première personne ; la question complète reste sur son étape', async ({ page }) => {
  const id = await creerEpisode(page, {
    ...COLERE,
    apresCoup: {
      types: ['typeExplosion:colere', 'typeExplosion:surcharge'], fragilites: ['fragilite:fatigue'], signes: ['signe:chaleur'], signesTexte: 'les mains',
      repereA: 6, pieges: ['piegePensee:expres'], pensees: 'pas juste', tropDe: ['sourceSurcharge:bruit'], besoins: ['besoin:calme'],
      surLeMoment: ['consequenceCourt:soulagement'], plusTard: ['consequenceLong:regret'], autreFacon: 'il était pressé',
      siJe: 'je serre les poings', alorsJe: 'je sors', tensionApres: 3, jour: '2026-10-15',
    },
  });
  await aller(page, `#/apres-coup/${id}`);
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(vue.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const lignes = vue.locator('.recap .ligne-recap');
  await expect(lignes.locator('.recap-nom')).toHaveText([
    'C\'était plutôt', 'Ce qui me fragilisait', 'Le déclencheur', 'Mes signes', 'Ça montait à', 'Ce que je me suis dit', 'Mes pièges',
    'Ce qui était trop', 'Ce dont j\'avais besoin', 'Sur le moment', 'Plus tard', 'Une autre façon de voir', 'La prochaine fois', 'Tension après',
  ]);
  await expect(lignes.locator('.recap-val')).toHaveText([
    'Colère, Surcharge', 'Fatigue', 'Conflit', 'Chaleur · les mains', '6/10', 'pas juste', 'Il le fait exprès',
    'Bruit', 'Calme', 'Soulagement', 'Regret', 'il était pressé', 'si je serre les poings, alors je sors', '3/10',
  ]);
  // Un toucher ouvre l'étape, avec sa question complète.
  await lignes.filter({ hasText: 'Mes pièges' }).click();
  await expect(vue.getByRole('heading', { name: 'Ce que je me suis dit' })).toBeVisible();
  await expect(vue.getByRole('heading', { name: 'Ça ressemble à…' })).toBeVisible();
  await vue.getByRole('button', { name: 'Suivant' }).click();
  await lignes.filter({ hasText: 'Ça montait à' }).click();
  await expect(vue.getByRole('heading', { name: 'Quand j\'ai remarqué que ça montait, j\'en étais à…' })).toBeVisible();
});
