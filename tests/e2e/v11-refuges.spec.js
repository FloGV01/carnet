import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

// v11 (6/11) · Mes refuges, sans connexion (spec §8.1, §8.2, §8.4 et §8.5) : un écran « Mes refuges », ouvert depuis Bien-être (une
// cinquième entrée) et depuis Réglages › Mon plan, avec ses titres et jusqu'à trois playlists, chacune un nom et un lien ; tout
// s'écrit seul et part dans la sauvegarde avec Mon plan. Les playlists qui ont un lien s'écoutent d'un toucher, dans Mes refuges
// et dans Moment difficile, sous « Une chose à la fois » : un lien qui sort de Carnet, jamais suivi ici (les tests lisent `href`,
// et la garde refuse toute requête vers un autre hôte). Les titres sont avec le reste de Mon plan dans Moment difficile. Le
// Diagnostic essaie trois formes du lien. Point de vigilance 4 : une méta abîmée ou écrite à la main n'affiche que du texte et
// des liens des trois schémas permis. Données inventées, sans prénom.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const SORTIE = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';
const PLAN = { quandCaMonte: 'je sors marcher', siSurcharge: 'je coupe le bruit' };
const PLEINS = {
  titres: 'La maison bleue du lac\nPluie lente',
  playlists: [
    { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: 'spotify' },
    { nom: 'Pour dormir', lien: null, source: null },
    { nom: null, lien: 'https://music.apple.com/fr/playlist/calme/pl.u-abc', source: null },
  ],
};
const ecran = (page) => page.locator('main.refuges');
const titres = (page) => page.getByLabel('Mes titres', { exact: true });
const nom = (page, n) => page.getByLabel(`Nom de la playlist ${n}`, { exact: true });
const lien = (page, n) => page.getByLabel(`Lien de la playlist ${n}`, { exact: true });
const lignes = (zone) => zone.locator('a.lien-refuge');
const hrefs = (loc) => loc.evaluateAll((l) => l.map((a) => a.getAttribute('href')));
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, v) => page.evaluate(([c, x]) => window.__carnet.repo.meta.ecrire(c, x), [cle, v]);
const adresse = (page) => page.evaluate(() => location.hash);
const brouillons = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:brouillon:refuges')));
const retour = (page) => page.getByRole('button', { name: 'Retour', exact: true }).click();
const onglet = (page, nomOnglet) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: nomOnglet });
// Ouvre Mes refuges par son entrée de Bien-être, comme au doigt.
const ouvrirRefuges = async (page) => {
  await aller(page, '#/bien-etre');
  await page.getByRole('list', { name: 'Entrées' }).getByRole('link', { name: 'Mes refuges' }).click();
  await expect(titres(page)).toBeVisible();
};
// Passe par Réglages pour que Moment difficile soit monté de nouveau (et relise la base). Le titre « Mon plan » est là dès
// le premier rendu : on attend que la carte soit remplie (son contenu ou « Écrire mon plan »), c'est-à-dire le plan et les
// refuges lus, pour qu'aucun contrôle, une absence surtout, ne passe avant eux. « Une chose à la fois » vient d'une troisième
// lecture : l'ordre des blocs se relit donc avec `expect.poll`.
const ouvrirMoment = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  const v = page.getByRole('dialog', { name: 'Moment difficile' });
  await expect(v.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeVisible();
  await expect(v.locator('.plan-moment').locator('.contenu-plan, a.action')).toHaveCount(1);
  return v;
};
// Chaque ligne d'écoute : son lien, son nom lu, sa sortie au trait, sans `target`.
const verifierLignes = async (zone, attendues) => {
  await expect(lignes(zone)).toHaveCount(attendues.length);
  expect(await hrefs(lignes(zone))).toEqual(attendues.map((x) => x.href));
  for (const [i, x] of attendues.entries()) {
    const l = lignes(zone).nth(i);
    await expect(l).toHaveAccessibleName(x.nom);
    await expect(l).toHaveAttribute('rel', 'noreferrer');
    expect(await l.getAttribute('target')).toBeNull();
    await expect(l.locator(`svg path[d="${SORTIE}"]`)).toHaveCount(1);
    await expect(l).not.toContainText('↗');
    const b = await l.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
};

// ---------- L'écran ----------

test('écrire ses titres et trois playlists : tout s\'enregistre seul, « ?si= » retiré, un lien javascript: jamais gardé ni rendu ; pas de quatrième ligne ; retrouvé après rechargement', async ({ page }) => {
  await ouvrirRefuges(page);
  await expect(onglet(page, 'Bien-être')).toHaveAttribute('aria-current', 'page');
  // Vide : une seule ligne de playlist, sans ligne d'écoute, et rien n'est écrit pour une ouverture.
  await expect(ecran(page).locator('.saisie-playlist')).toHaveCount(1);
  await expect(lignes(ecran(page))).toHaveCount(0);
  await expect(titres(page)).toHaveAttribute('placeholder', 'Un titre par ligne.');
  for (const champ of [titres(page), nom(page, 1), lien(page, 1)]) await expect(champ).toHaveValue('');
  expect(await lireMeta(page, 'refuges')).toBeNull();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:')))).toEqual([]);

  await titres(page).fill('La maison bleue du lac\nPluie lente');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.titres).toBe('La maison bleue du lac\nPluie lente');
  await nom(page, 1).fill('Pour souffler');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(1);
  // La ligne notée a sa suivante, vide.
  await expect(nom(page, 2)).toHaveValue('');
  await lien(page, 1).fill('https://open.spotify.com/playlist/abc?si=xyz123');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists[0]).toEqual({ nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: null });
  // La ligne d'écoute arrive en tête des playlists, sans le paramètre de partage.
  await verifierLignes(ecran(page), [{ href: 'https://open.spotify.com/playlist/abc', nom: 'Pour souffler' }]);
  await lien(page, 2).fill('spotify:playlist:d');
  await nom(page, 2).fill('Pour dormir');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists[1]).toEqual({ nom: 'Pour dormir', lien: 'spotify:playlist:d', source: null });
  await nom(page, 3).fill('Piège');
  await lien(page, 3).fill('javascript:alert(1)');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(3);
  await lien(page, 3).blur();
  await expect.poll(() => brouillons(page)).toEqual([]);
  // Le lien refusé n'est pas gardé, sans message ; la ligne garde son nom.
  expect(await lireMeta(page, 'refuges')).toEqual({
    titres: 'La maison bleue du lac\nPluie lente',
    playlists: [
      { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: null },
      { nom: 'Pour dormir', lien: 'spotify:playlist:d', source: null },
      { nom: 'Piège', lien: null, source: null },
    ],
  });
  await expect(ecran(page).getByRole('status')).toHaveCount(0);
  // Trois lignes, pas de quatrième.
  await expect(ecran(page).locator('.saisie-playlist')).toHaveCount(3);
  await expect(nom(page, 4)).toHaveCount(0);
  await verifierLignes(ecran(page), [{ href: 'https://open.spotify.com/playlist/abc', nom: 'Pour souffler' }, { href: 'spotify:playlist:d', nom: 'Pour dormir' }]);
  await expect(page.locator('a[href^="javascript"], a[href^="JavaScript"]')).toHaveCount(0);
  // « Spotify » ne va qu'à ce qui vient de lui : rien ici n'a été choisi dans un compte.
  await expect(lignes(ecran(page)).filter({ hasText: 'Spotify' })).toHaveCount(0);

  await page.reload();
  await appPrete(page);
  await ouvrirRefuges(page);
  await expect(titres(page)).toHaveValue('La maison bleue du lac\nPluie lente');
  await expect(nom(page, 1)).toHaveValue('Pour souffler');
  await expect(lien(page, 1)).toHaveValue('https://open.spotify.com/playlist/abc');
  await expect(nom(page, 2)).toHaveValue('Pour dormir');
  await expect(lien(page, 2)).toHaveValue('spotify:playlist:d');
  await expect(nom(page, 3)).toHaveValue('Piège');
  await expect(lien(page, 3)).toHaveValue('');
  await expect(nom(page, 4)).toHaveCount(0);
  // Chaque champ et chaque ligne d'écoute garde une cible de 44 ; aucune dictée sur le nom et le lien.
  for (const c of await ecran(page).locator('textarea, a').all()) {
    const b = await c.boundingBox();
    expect(b.height, await c.getAttribute('id')).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
  await expect(ecran(page).locator('.saisie-playlist').getByRole('button')).toHaveCount(0);
});

test('une ligne vidée de son nom et de son lien disparaît ; les autres gardent leurs valeurs et s\'écrivent sur leur playlist ; la dernière vidée garde le clavier', async ({ page }) => {
  await ecrireMeta(page, 'refuges', { playlists: [
    { nom: 'Une', lien: 'spotify:playlist:a' }, { nom: 'Deux', lien: 'spotify:playlist:b' }, { nom: 'Trois', lien: 'spotify:playlist:c' },
  ] });
  await ouvrirRefuges(page);
  await expect(nom(page, 3)).toHaveValue('Trois');
  await expect(nom(page, 4)).toHaveCount(0);
  // Au milieu : la deuxième part, la troisième remonte avec ses valeurs, une ligne vide revient au bout.
  await nom(page, 2).fill('');
  await lien(page, 2).fill('');
  await lien(page, 2).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists.map((p) => p.nom)).toEqual(['Une', 'Trois']);
  await expect(nom(page, 2)).toHaveValue('Trois');
  await expect(lien(page, 2)).toHaveValue('spotify:playlist:c');
  await expect(nom(page, 3)).toHaveValue('');
  await expect(lien(page, 3)).toHaveValue('');
  await expect(nom(page, 4)).toHaveCount(0);
  await verifierLignes(ecran(page), [{ href: 'spotify:playlist:a', nom: 'Une' }, { href: 'spotify:playlist:c', nom: 'Trois' }]);
  // Écrire sur la ligne remontée change sa playlist, et pas une autre.
  await nom(page, 2).fill('Trois bis');
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists[1]).toEqual({ nom: 'Trois bis', lien: 'spotify:playlist:c', source: null });
  expect((await lireMeta(page, 'refuges')).playlists[0]).toEqual({ nom: 'Une', lien: 'spotify:playlist:a', source: null });
  // La dernière vidée devient la ligne vide sur place : le champ garde le focus, et y écrire ajoute une playlist au bout.
  await nom(page, 2).fill('');
  await lien(page, 2).fill('');
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists.map((p) => p.nom)).toEqual(['Une']);
  await expect(lien(page, 2)).toBeFocused();
  await expect(nom(page, 3)).toHaveCount(0);
  await lien(page, 2).fill('https://open.spotify.com/playlist/n');
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists).toEqual([
    { nom: 'Une', lien: 'spotify:playlist:a', source: null }, { nom: null, lien: 'https://open.spotify.com/playlist/n', source: null }]);
  await verifierLignes(ecran(page), [{ href: 'spotify:playlist:a', nom: 'Une' }, { href: 'https://open.spotify.com/playlist/n', nom: 'Playlist 2' }]);
  // Tout vidé : la méta vaut null, et l'aperçu d'un import n'aurait rien à annoncer.
  await lien(page, 2).fill('');
  await nom(page, 1).fill('');
  await lien(page, 1).fill('');
  await lien(page, 1).blur();
  await expect.poll(() => lireMeta(page, 'refuges')).toBeNull();
  await expect(nom(page, 2)).toHaveCount(0);
  await expect(lignes(ecran(page))).toHaveCount(0);
});

test('un brouillon resté sur l\'appareil revient dans son champ et s\'enregistre', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('carnet:brouillon:refuges:titres', JSON.stringify('Un titre resté'));
    localStorage.setItem('carnet:brouillon:refuges:nom-0', JSON.stringify('Pour la route'));
  });
  await ouvrirRefuges(page);
  await expect(titres(page)).toHaveValue('Un titre resté');
  await expect(nom(page, 1)).toHaveValue('Pour la route');
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: 'Un titre resté', playlists: [{ nom: 'Pour la route', lien: null, source: null }] });
  await expect.poll(() => brouillons(page)).toEqual([]);
});

test('ouvert depuis Bien-être : une ligne par playlist qui a un lien, son `href` exact, sa sortie, « Spotify » si elle vient de lui ; sans lien, aucune ligne', async ({ page }) => {
  await ecrireMeta(page, 'refuges', PLEINS);
  await ouvrirRefuges(page);
  await verifierLignes(ecran(page), [
    { href: 'https://open.spotify.com/playlist/abc', nom: 'Pour souffler Spotify' },
    { href: 'https://music.apple.com/fr/playlist/calme/pl.u-abc', nom: 'Playlist 3' },
  ]);
  await expect(lignes(ecran(page)).nth(0).locator('.ligne-sous')).toHaveText('Spotify');
  await expect(lignes(ecran(page)).nth(1).locator('.ligne-sous')).toHaveCount(0);
  // Les lignes d'écoute sont en tête des playlists, avant les champs.
  const ordre = await ecran(page).locator('.playlists-refuges').evaluate((s) => [...s.children].map((e) => e.className));
  expect(ordre).toEqual(['etiquette', 'lignes-playlists', 'carte saisie-playlist', 'carte saisie-playlist', 'carte saisie-playlist']);
  // Sans lien, aucune ligne, et aucune trace d'elles.
  await ecrireMeta(page, 'refuges', { titres: 'Une chanson', playlists: [{ nom: 'Sans lien' }] });
  await ouvrirRefuges(page);
  await expect(nom(page, 1)).toHaveValue('Sans lien');
  await expect(ecran(page).locator('.lignes-playlists')).toHaveCount(0);
  // « Retour » ramène à Bien-être.
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
});

// Point de vigilance 4.
test('point de vigilance 4 : une méta abîmée ou écrite à la main ; aucune erreur, aucun `href` hors des trois schémas, un nom en HTML affiché en texte, aucune image', async ({ page }) => {
  const PIEGE = '<img src=x onerror="window.__piege=1">';
  const abimees = [
    { titres: ['pas un texte'], playlists: [null, 'texte', 12,
      { nom: PIEGE, lien: 'spotify:playlist:p' },
      { nom: 'Ailleurs', lien: 'https://open.spotify.com.autre.test/p', source: 'spotify' },
      { nom: 'Bonne', lien: 'https://open.spotify.com/playlist/b?si=1', source: 'spotify' },
      { nom: 'Quatrième', lien: 'https://open.spotify.com/playlist/q' }] },
    { titres: PIEGE, playlists: [{ nom: 'Script', lien: 'javascript:window.__piege=1' }, { nom: 'Données', lien: 'data:text/html,<b>x</b>' },
      { nom: 'Sans chiffre', lien: 'http://open.spotify.com/playlist/x' }, { nom: 'Fichier', lien: 'file:///etc/passwd' }] },
    'du texte', 42, [], { playlists: { 0: { nom: 'Objet' } } },
  ];
  for (const meta of abimees) {
    await ecrireMeta(page, 'refuges', meta);
    await ouvrirRefuges(page);
    const v = await ouvrirMoment(page);
    for (const zone of [v]) {
      for (const h of await hrefs(zone.locator('a[href]'))) expect(h, JSON.stringify(meta)).toMatch(/^(https:|spotify:|music:|#\/)/);
      await expect(zone.locator('img')).toHaveCount(0);
    }
    await ouvrirRefuges(page);
    for (const h of await hrefs(ecran(page).locator('a[href]'))) expect(h).toMatch(/^(https:|spotify:|music:)/);
    await expect(page.locator('img')).toHaveCount(0);
  }
  expect(await page.evaluate(() => window.__piege)).toBeUndefined();
  // Le premier : trois lignes gardées, dans l'ordre ; le nom piégé est du texte, dans son champ et sur sa ligne d'écoute.
  await ecrireMeta(page, 'refuges', abimees[0]);
  await ouvrirRefuges(page);
  await expect(nom(page, 1)).toHaveValue(PIEGE);
  await expect(nom(page, 2)).toHaveValue('Ailleurs');
  await expect(lien(page, 2)).toHaveValue('');
  await expect(nom(page, 3)).toHaveValue('Bonne');
  await expect(nom(page, 4)).toHaveCount(0);
  await verifierLignes(ecran(page), [{ href: 'spotify:playlist:p', nom: PIEGE }, { href: 'https://open.spotify.com/playlist/b', nom: 'Bonne Spotify' }]);
  await expect(lignes(ecran(page)).first().locator('.ligne-libelle')).toHaveText(PIEGE);
  const v = await ouvrirMoment(page);
  await verifierLignes(v, [{ href: 'spotify:playlist:p', nom: PIEGE }, { href: 'https://open.spotify.com/playlist/b', nom: 'Bonne Spotify' }]);
  // Le second : le titre piégé, dans Mon plan de Moment difficile, en texte ; aucune ligne d'écoute.
  await ecrireMeta(page, 'refuges', abimees[1]);
  const w = await ouvrirMoment(page);
  await expect(w.getByRole('region', { name: 'Mon plan' })).toContainText(PIEGE);
  await expect(lignes(w)).toHaveCount(0);
  await expect(w.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__piege)).toBeUndefined();
});

// ---------- Moment difficile ----------

test('Moment difficile : les quatre boutons en tête et à l\'écran ; une ligne par playlist sous « Une chose à la fois », avant Mon plan ; les titres dans Mon plan ; aucune requête, aucun lien suivi', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  await ecrireMeta(page, 'refuges', PLEINS);
  const v = await ouvrirMoment(page);
  for (const nomBouton of ['Panique', 'Colère', 'Trop-plein', 'Réveil la nuit']) {
    await expect(v.getByRole('group', { name: 'Un exercice court' }).getByRole('button', { name: nomBouton, exact: true })).toBeInViewport({ ratio: 1 });
  }
  await expect.poll(() => v.evaluate((d) => {
    const corps = d.querySelector('.parcours-corps');
    return { defilement: corps.scrollTop, ordre: [...corps.querySelector('.etape').children].map((e) => e.classList[0] === 'carte' ? e.classList[1] : e.classList[0]) };
  })).toEqual({ defilement: 0, ordre: ['exercices-courts', 'carte-respiration', 'ligne-carte', 'lignes-playlists', 'plan-moment'] });
  await verifierLignes(v, [
    { href: 'https://open.spotify.com/playlist/abc', nom: 'Pour souffler Spotify' },
    { href: 'https://music.apple.com/fr/playlist/calme/pl.u-abc', nom: 'Playlist 3' },
  ]);
  await expect(v).not.toContainText('↗');
  // Les titres : une rubrique « Mes titres », la dernière de Mon plan, une ligne chacun.
  const plan = v.getByRole('region', { name: 'Mon plan' });
  const rubriques = plan.locator('.rubrique-plan h3');
  await expect(rubriques).toHaveText(['Quand ça monte, je…', 'Si c\'est trop, je…', 'Mes titres']);
  await expect(plan.locator('.rubrique-plan').last().locator('p')).toHaveText('La maison bleue du lac\nPluie lente');
  await expect(plan.getByRole('link', { name: 'Modifier mon plan', exact: true })).toBeVisible();
  // La feuille Mon plan d'un épisode ne change pas : sans les titres.
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await aller(page, '#/episode/nouveau');
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'Conflit' }).click();
  await fiche.getByRole('button', { name: 'Mon plan' }).click();
  const feuille = page.getByRole('dialog', { name: 'Mon plan' });
  await expect(feuille).toContainText('je sors marcher');
  await expect(feuille).not.toContainText('Mes titres');
  await expect(feuille).not.toContainText('Pluie lente');
  await expect(feuille.getByRole('link')).toHaveCount(0);
});

test('Moment difficile : sans refuges, aucune trace ; des titres seuls gardent « Modifier » ; des playlists seules, « Écrire mon plan »', async ({ page }) => {
  // Mon plan seul : l'écran d'avant la v11.
  await ecrireMeta(page, 'monPlan', PLAN);
  let v = await ouvrirMoment(page);
  const ordre = () => v.evaluate((d) => [...d.querySelector('.etape').children].map((e) => e.className));
  await expect.poll(ordre).toEqual(['exercices-courts', 'carte carte-respiration', 'carte ligne-carte une-chose-acces', 'carte plan-moment']);
  await expect(v).not.toContainText('Mes titres');
  await expect(v.locator('.rubrique-plan h3')).toHaveText(['Quand ça monte, je…', 'Si c\'est trop, je…']);
  // Des refuges vides, ou une playlist sans lien : rien non plus.
  for (const refuges of [null, { titres: '  ', playlists: [] }, { playlists: [{ nom: 'Sans lien' }] }]) {
    await ecrireMeta(page, 'refuges', refuges);
    v = await ouvrirMoment(page);
    await expect.poll(ordre).toEqual(['exercices-courts', 'carte carte-respiration', 'carte ligne-carte une-chose-acces', 'carte plan-moment']);
    await expect(v).not.toContainText('Mes titres');
  }
  // Sans plan ni refuges : « Écrire mon plan », comme aujourd'hui.
  await ecrireMeta(page, 'monPlan', null);
  await ecrireMeta(page, 'refuges', null);
  v = await ouvrirMoment(page);
  await expect(v.getByRole('link', { name: 'Écrire mon plan' })).toBeVisible();
  await expect(v.getByRole('link', { name: 'Modifier mon plan' })).toHaveCount(0);
  // Des titres seuls : le plan les montre, avec « Modifier ».
  await ecrireMeta(page, 'refuges', { titres: 'Pluie lente' });
  v = await ouvrirMoment(page);
  await expect(v.getByRole('link', { name: 'Modifier mon plan', exact: true })).toBeVisible();
  await expect(v.getByRole('link', { name: 'Écrire mon plan' })).toHaveCount(0);
  await expect(v.locator('.rubrique-plan h3')).toHaveText(['Mes titres']);
  await expect(v.locator('.rubrique-plan p')).toHaveText('Pluie lente');
  // Des playlists seules : leurs lignes, et « Écrire mon plan ».
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour souffler', lien: 'spotify:playlist:abc' }] });
  v = await ouvrirMoment(page);
  await verifierLignes(v, [{ href: 'spotify:playlist:abc', nom: 'Pour souffler' }]);
  await expect(v.getByRole('link', { name: 'Écrire mon plan' })).toBeVisible();
  await expect(v.locator('.rubrique-plan')).toHaveCount(0);
});

// ---------- Mon plan, la sauvegarde, le Diagnostic ----------

test('Réglages › Mon plan › Mes refuges › Retour › Retour ramène à Réglages ; de même depuis Moment difficile', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Mon plan', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/mon-plan');
  // La ligne « Mes refuges », après les si… alors… : la dernière de l'écran.
  const ligne = page.locator('main.mon-plan').getByRole('link', { name: 'Mes refuges', exact: true });
  await expect(ligne).toHaveAttribute('href', '#/refuges');
  expect(await page.locator('main.mon-plan').evaluate((m) => m.lastElementChild.querySelector('a')?.getAttribute('href'))).toBe('#/refuges');
  expect((await ligne.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await ligne.click();
  await expect.poll(() => adresse(page)).toBe('#/refuges');
  await expect(onglet(page, 'Bien-être')).toHaveAttribute('aria-current', 'page');
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/mon-plan');
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/reglages');
  // Deux allers-retours de suite, puis depuis Moment difficile.
  await ecrireMeta(page, 'monPlan', PLAN);
  const v = await ouvrirMoment(page);
  await v.getByRole('link', { name: 'Modifier mon plan', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/mon-plan');
  for (let i = 0; i < 2; i++) {
    await page.locator('main.mon-plan').getByRole('link', { name: 'Mes refuges', exact: true }).click();
    await expect.poll(() => adresse(page)).toBe('#/refuges');
    await retour(page);
    await expect.poll(() => adresse(page)).toBe('#/mon-plan');
  }
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
});

test('la sauvegarde : Mes refuges part et revient avec Mon plan ; l\'aperçu de l\'import nomme « les refuges »', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  await ouvrirRefuges(page);
  await titres(page).fill('Pluie lente');
  await nom(page, 1).fill('Pour souffler');
  await lien(page, 1).fill('https://open.spotify.com/playlist/abc?si=1');
  await lien(page, 1).blur();
  const attendus = { titres: 'Pluie lente', playlists: [{ nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: null }] };
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual(attendus);
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  const [f] = await fichiersPartages(page);
  const contenu = JSON.parse(Buffer.from(f.octets).toString('utf8'));
  expect(contenu.data.meta.find((m) => m.cle === 'refuges')).toEqual({ cle: 'refuges', valeur: attendus });
  expect(contenu.data.meta.find((m) => m.cle === 'monPlan').valeur).toMatchObject(PLAN);
  expect(JSON.stringify(contenu)).not.toContain('carnet:brouillon');
  // Ici, d'autres refuges : l'aperçu les nomme ; avec Mon plan changé aussi, les deux.
  const fichier = { name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) };
  await ecrireMeta(page, 'refuges', { titres: 'Autre chose', playlists: [] });
  await page.locator('input[type=file]').setInputFiles(fichier);
  await expect(page.getByText('Les refuges seront remplacés par ce que contient le fichier.')).toBeVisible();
  // Le même fichier choisi de nouveau, depuis l'aperçu : il est relu contre la base d'à présent.
  await ecrireMeta(page, 'monPlan', { prevenir: 'la voisine' });
  await page.locator('input[type=file]').setInputFiles(fichier);
  await expect(page.getByText('Mon plan et les refuges seront remplacés par ce que contient le fichier.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await lireMeta(page, 'refuges')).toEqual(attendus);
  await ouvrirRefuges(page);
  await expect(titres(page)).toHaveValue('Pluie lente');
  await expect(lien(page, 1)).toHaveValue('https://open.spotify.com/playlist/abc');
  await verifierLignes(ecran(page), [{ href: 'https://open.spotify.com/playlist/abc', nom: 'Pour souffler' }]);
  // Des refuges vidés (null) n'annoncent rien à perdre.
  await ecrireMeta(page, 'refuges', null);
  await ecrireMeta(page, 'monPlan', PLAN);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles(fichier);
  await expect(page.getByRole('button', { name: 'Importer', exact: true })).toBeVisible();
  await expect(page.getByText(/refuges/)).toHaveCount(0);
});

test('Diagnostic, « Ouvrir une playlist » : les trois formes du lien de la première playlist qui en a un, jamais suivies ; le rapport sans lien ; sans playlist, une phrase', async ({ page }) => {
  const section = () => page.locator('section', { has: page.getByRole('heading', { name: 'Ouvrir une playlist' }) });
  await aller(page, '#/diagnostic');
  await expect(section()).toContainText('Note d\'abord une playlist dans Mes refuges.');
  await expect(section().getByRole('link')).toHaveCount(0);
  // Une playlist sans lien d'abord : c'est la suivante qui sert.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Sans lien' }, { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc?si=1' }] });
  await aller(page, '#/reglages');
  await aller(page, '#/diagnostic');
  const liens = section().getByRole('link');
  await expect(liens).toHaveText(['Lien web', 'Lien web, nouvelle fenêtre', 'Lien direct vers l\'app']);
  expect(await hrefs(liens)).toEqual(['https://open.spotify.com/playlist/abc', 'https://open.spotify.com/playlist/abc', 'spotify:playlist:abc']);
  expect(await liens.evaluateAll((l) => l.map((a) => [a.getAttribute('target'), a.getAttribute('rel')]))).toEqual([
    [null, 'noreferrer'], ['_blank', 'noopener noreferrer'], [null, 'noreferrer']]);
  await expect(section()).toContainText('À noter : où ça s\'ouvre, où on revient.');
  await expect(section()).not.toContainText('Note d\'abord');
  const rapport = await page.locator('main.diag pre').textContent();
  expect(rapport).not.toMatch(/spotify|playlist|https:/i);
});
