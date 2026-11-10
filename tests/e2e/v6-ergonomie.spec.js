import { test, expect } from '../aides/gardes.js';
import { groupe, viderBase, aller } from '../aides/saisie.js';

// v6 · Ergonomie (spec §8) : zones de texte qui grandissent de leur taille au repos à 7 lignes, bande du bas
// pleine et collée aux onglets, cibles de 44 pt, libellés courts du récapitulatif de l'Après coup. Données inventées.
// La sélection (adoucie en sombre en v6) suit la sélection commune 2b depuis la v7 : voir v7-fondations.spec.js.
const repo = (page, f, arg) => page.evaluate(f, arg);
const creerEpisode = (page, e) => repo(page, async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const COLERE = { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Hauteur d'une zone en lignes (cadre retiré) et défilement intérieur.
const lignesDe = (zone) => zone.evaluate((z) => {
  const s = getComputedStyle(z);
  const cadre = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((t, p) => t + parseFloat(s[p]), 0);
  return { lignes: Math.round((z.getBoundingClientRect().height - cadre) / parseFloat(s.lineHeight)), defile: z.scrollHeight > z.clientHeight + 1 };
});
const texteSur = (n) => Array.from({ length: n }, (_, i) => `ligne ${i + 1}`).join('\n');

// v11 (2/11, spec §13) : le soir ne tient plus sans défiler ; tout ce qu'il faut toucher passe au-dessus de la bande, la
// page défilée.
test('le soir à 390 × 797, en clair et en sombre : la bande du bas est pleine et collée aux onglets ; la page défile jusqu\'au dernier repli, chaque carte au-dessus de la bande', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(groupe(page, 'Lieu')).toHaveCount(1);
    // Lieu en haut, à l'écran.
    expect((await groupe(page, 'Lieu').boundingBox()).y).toBeGreaterThanOrEqual(0);
    const bande = page.locator('.actions-flottantes');
    const cadre = await bande.boundingBox();
    const onglets = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox();
    // Collée : aucun jour entre la bande et la barre d'onglets.
    expect(Math.abs(cadre.y + cadre.height - onglets.y)).toBeLessThanOrEqual(0.5);
    // Fond plein, celui des onglets (v12, spec §5.4 : une seule matière en bas, --barre ; celui de la page jusqu'à la v11) : le
    // texte ne passe plus entre les boutons, ni à la vue ni au toucher.
    const fond = await bande.evaluate((b) => {
      const s = getComputedStyle(b);
      const premier = b.firstElementChild.getBoundingClientRect();
      const entre = document.elementFromPoint(premier.right + 2, premier.top + premier.height / 2);
      return { couleur: s.backgroundColor, image: s.backgroundImage, onglets: getComputedStyle(document.querySelector('nav.onglets')).backgroundColor, entre: Boolean(entre && entre.closest('.actions-flottantes')) };
    });
    expect(fond.image).toBe('none');
    expect(fond.couleur).toBe(fond.onglets);
    expect(fond.couleur).toMatch(/^rgb\(/);
    expect(fond.entre).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // La page défile jusqu'au dernier repli : les points positifs et « Notes libres » passent au-dessus de la bande.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const [positifs, notes] = await Promise.all([page.locator('#points-positifs').boundingBox(), page.getByRole('button', { name: /^Notes libres/ }).boundingBox()]);
    expect(positifs.y + positifs.height).toBeLessThanOrEqual((await bande.boundingBox()).y);
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
    { id: 'gratitudes', auto: 'content', min: 2, max: 7 },
    { id: 'notes', auto: 'content', min: 3, max: 7 },
  ]);
  const id = await creerEpisode(page, COLERE);
  await aller(page, `#/episode/${id}`);
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  expect(await zonesDe(page)).toEqual([
    { id: 'episodes-situation', auto: 'content', min: 2, max: 7 },
    { id: 'episodes-ceQuiAAide', auto: 'content', min: 2, max: 7 },
    { id: 'episodes-ceQueJeRetiens', auto: 'content', min: 2, max: 7 },
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
