import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, glisser } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

// v12 (6/9) · Mes refuges, sans connexion (spec v12 §6.1 et §6.2 ; v11 : spec §8.1, §8.2, §8.4 et §8.5). Mes refuges devient une
// simple liste, ouverte depuis Bien-être et depuis Réglages › Mon plan : « Modifier » en haut à droite, la carte de la playlist
// suivie puis les autres playlists qui ont un lien, « Un toucher ouvre Spotify. », ses morceaux, « La suite est dans
// Spotify. » au-delà du plafond, et « Mes titres » en lecture seule ; sans playlist, une phrase, « Choisir dans mon compte » et
// « Coller un lien ». La saisie de la v11 (ses titres, jusqu'à trois playlists, chacune un nom et un lien) passe dans ses
// réglages (#/refuges/reglages), dont le retour, geste compris, mène à Mes refuges ; tout s'y écrit seul et part dans la
// sauvegarde avec Mon plan. Une carte et un morceau posent le lien direct vers l'app (spotify:playlist:<ID>,
// spotify:track:<ID>, music://…), fabriqué à l'affichage : les données gardent le lien noté. Aucun lien n'est suivi (les tests
// lisent `href`, et la garde refuse toute requête vers un autre hôte). Les playlists s'écoutent aussi dans Moment difficile,
// sous « Une chose à la fois », et les titres sont avec le reste de Mon plan. v12 (7/9, spec v12 §6.6) : les morceaux gardés
// y viennent après Mon plan, sous le nom de leur playlist, sans requête ni « Mettre à jour la liste ». Le Diagnostic essaie
// deux formes du premier morceau gardé (spec v12 §6.2) ; le rapport ne note que celle touchée. Les morceaux vont dans la
// sauvegarde, jamais dans l'Export PSY ni dans la vue soignants (spec v12 §6.5).
// Point de vigilance 4 : une méta abîmée ou écrite à la main n'affiche que du texte et des liens des trois schémas permis ; en
// très grand texte, un titre de morceau de 70 signes sans espace ne fait rien déborder de côté.
// Le dépôt est public : données inventées, sans prénom, identifiants factices de 22 signes.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Un identifiant factice de 22 signes, lisible : « pl1 » donne « pl10000000000000000000 ».
const id = (debut) => debut.padEnd(22, '0');
const PL = id('pl1');
const LIEN_PL = `https://open.spotify.com/playlist/${PL}`;
const DIRECT_PL = `spotify:playlist:${PL}`;
const MUSIQUE = 'https://music.apple.com/fr/playlist/calme/pl.u-abc';
const DIRECT_MUSIQUE = 'music://music.apple.com/fr/playlist/calme/pl.u-abc';
const TITRES_MORCEAUX = ['Pluie lente', 'Le matin calme', 'Rivière douce', 'Sous les pins', 'Marée basse', 'Brume du lac'];
// Des morceaux inventés, dans la forme que l'app écrit ; un sur trois sans artiste.
const morceau = (n) => ({ id: id(`mo${n}`), titre: `${TITRES_MORCEAUX[(n - 1) % TITRES_MORCEAUX.length]} ${n}`, artiste: n % 3 ? 'Les Vagues Douces' : null });
const morceaux = (k) => Array.from({ length: k }, (_, i) => morceau(i + 1));

const SORTIE = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';
const PLAN = { quandCaMonte: 'je sors marcher', siSurcharge: 'je coupe le bruit' };
const PLEINS = {
  titres: 'La maison bleue du lac\nPluie lente',
  playlists: [
    { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify' },
    { nom: 'Pour dormir', lien: null, source: null },
    { nom: null, lien: MUSIQUE, source: null },
  ],
};
const ecran = (page) => page.locator('main.refuges');
const reglages = (page) => page.locator('main.refuges-reglages');
const titres = (page) => page.getByLabel('Mes titres', { exact: true });
const nom = (page, n) => page.getByLabel(`Nom de la playlist ${n}`, { exact: true });
const lien = (page, n) => page.getByLabel(`Lien de la playlist ${n}`, { exact: true });
const lignes = (zone) => zone.locator('a.lien-refuge');
const listeMorceaux = (zone) => zone.locator('ul.liste-morceaux');
const hrefs = (loc) => loc.evaluateAll((l) => l.map((a) => a.getAttribute('href')));
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, v) => page.evaluate(([c, x]) => window.__carnet.repo.meta.ecrire(c, x), [cle, v]);
const adresse = (page) => page.evaluate(() => location.hash);
const brouillons = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:brouillon:refuges')));
const retour = (page) => page.getByRole('button', { name: 'Retour', exact: true }).click();
const modifier = (page) => ecran(page).getByRole('link', { name: 'Modifier', exact: true });
const onglet = (page, nomOnglet) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: nomOnglet });
// Ouvre Mes refuges par son entrée de Bien-être, comme au doigt, et attend sa lecture de la base (la liste, ou l'état vide).
const ouvrirRefuges = async (page) => {
  await aller(page, '#/bien-etre');
  await page.getByRole('list', { name: 'Entrées' }).getByRole('link', { name: 'Mes refuges' }).click();
  await expect(page.getByRole('heading', { name: 'Mes refuges', level: 1 })).toBeVisible();
  await expect(ecran(page).locator('.lignes-playlists, .refuges-vide')).toHaveCount(1);
};
// Puis ses réglages, par « Modifier ».
const ouvrirReglages = async (page) => {
  await ouvrirRefuges(page);
  await modifier(page).click();
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
// Les morceaux à l'écran : la liste nommée, une rangée par morceau, son lien spotify:track:<ID>, son titre puis son artiste.
const verifierMorceaux = async (zone, nomListe, attendus) => {
  const liste = zone.getByRole('list', { name: `Morceaux de ${nomListe}`, exact: true });
  await expect(liste.getByRole('link')).toHaveCount(attendus.length);
  expect(await hrefs(liste.getByRole('link'))).toEqual(attendus.map((m) => `spotify:track:${m.id}`));
  expect(await liste.locator('.titre-morceau').allTextContents()).toEqual(attendus.map((m) => m.titre));
  expect(await liste.locator('a').evaluateAll((l) => l.map((a) => (a.querySelector('.artiste-morceau') || {}).textContent || null)))
    .toEqual(attendus.map((m) => m.artiste));
  expect(await liste.locator('a').evaluateAll((l) => l.map((a) => [a.getAttribute('rel'), a.getAttribute('target')])))
    .toEqual(attendus.map(() => ['noreferrer', null]));
  return liste;
};
// Les blocs de Mes refuges, de haut en bas.
const ordreRefuges = (page) => ecran(page).evaluate((m) => [...m.children].map((e) => e.className || e.tagName.toLowerCase()));

// ---------- Les réglages : la saisie de la v11 ----------

test('les réglages : écrire ses titres et trois playlists ; tout s\'enregistre seul, « ?si= » retiré, un lien javascript: jamais gardé ni rendu ; pas de quatrième ligne ; une note sous un lien qui ne s\'ouvrira pas dans une app ; retrouvé après rechargement', async ({ page }) => {
  await ouvrirReglages(page);
  await expect(onglet(page, 'Bien-être')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Réglages de Mes refuges', level: 1 })).toBeVisible();
  // Vide : une seule ligne de playlist, et rien n'est écrit pour une ouverture.
  await expect(reglages(page).locator('.saisie-playlist')).toHaveCount(1);
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
  // Le lien s'écrit à la sortie de son champ (relecture finale).
  await lien(page, 1).fill(`${LIEN_PL}?si=xyz123`);
  await lien(page, 1).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists[0]).toEqual({ nom: 'Pour souffler', lien: LIEN_PL, source: null });
  await lien(page, 2).fill('https://exemple.test/ma-liste');
  await nom(page, 2).fill('Ailleurs');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists[1]).toEqual({ nom: 'Ailleurs', lien: 'https://exemple.test/ma-liste', source: null });
  // Un lien https qui ne deviendra pas un lien direct vers une app : une note discrète, sous lui seul.
  const notes = reglages(page).locator('.saisie-playlist .note-import');
  await expect(notes).toHaveText(['Ce lien peut ne rien ouvrir depuis Emozio.']);
  await expect(reglages(page).locator('.saisie-playlist').nth(1).locator('.note-import')).toHaveCount(1);
  await nom(page, 3).fill('Piège');
  await lien(page, 3).fill('javascript:alert(1)');
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(3);
  await lien(page, 3).blur();
  await expect.poll(() => brouillons(page)).toEqual([]);
  // Le lien refusé n'est pas gardé, sans message ; la ligne garde son nom.
  const notees = {
    titres: 'La maison bleue du lac\nPluie lente',
    playlists: [
      { nom: 'Pour souffler', lien: LIEN_PL, source: null },
      { nom: 'Ailleurs', lien: 'https://exemple.test/ma-liste', source: null },
      { nom: 'Piège', lien: null, source: null },
    ],
  };
  expect(await lireMeta(page, 'refuges')).toEqual(notees);
  await expect(reglages(page).getByRole('status')).toHaveCount(0);
  // Trois lignes, pas de quatrième.
  await expect(reglages(page).locator('.saisie-playlist')).toHaveCount(3);
  await expect(nom(page, 4)).toHaveCount(0);
  await expect(page.locator('a[href^="javascript"], a[href^="JavaScript"]')).toHaveCount(0);
  // Une ligne collée la rend suivie : « Mettre à jour la liste » et « Changer de playlist », jamais touchés ici.
  await expect(reglages(page).getByRole('button', { name: 'Mettre à jour la liste', exact: true })).toBeVisible();
  await expect(reglages(page).getByRole('button', { name: 'Changer de playlist', exact: true })).toBeVisible();
  await expect(reglages(page).getByRole('button', { name: 'Choisir dans mon compte', exact: true })).toHaveCount(0);

  // Mes refuges : les deux playlists qui ont un lien, en lien direct quand il y en a un ; « Spotify » ne va qu'à ce qui vient de
  // lui : rien ici n'a été choisi dans un compte.
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/refuges');
  await verifierLignes(ecran(page), [{ href: DIRECT_PL, nom: 'Pour souffler' }, { href: 'https://exemple.test/ma-liste', nom: 'Ailleurs' }]);
  await expect(lignes(ecran(page)).filter({ hasText: 'Spotify' })).toHaveCount(0);
  expect(await lireMeta(page, 'refuges'), 'le lien noté ne change pas').toEqual(notees);

  await page.reload();
  await appPrete(page);
  await ouvrirReglages(page);
  await expect(titres(page)).toHaveValue('La maison bleue du lac\nPluie lente');
  await expect(nom(page, 1)).toHaveValue('Pour souffler');
  await expect(lien(page, 1)).toHaveValue(LIEN_PL);
  await expect(nom(page, 2)).toHaveValue('Ailleurs');
  await expect(lien(page, 2)).toHaveValue('https://exemple.test/ma-liste');
  await expect(nom(page, 3)).toHaveValue('Piège');
  await expect(lien(page, 3)).toHaveValue('');
  await expect(nom(page, 4)).toHaveCount(0);
  // Chaque champ garde une cible de 44 ; aucune dictée sur le nom et le lien.
  for (const c of await reglages(page).locator('textarea').all()) {
    const b = await c.boundingBox();
    expect(b.height, await c.getAttribute('id')).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
  await expect(reglages(page).locator('.saisie-playlist').getByRole('button')).toHaveCount(0);
});

test('les réglages : une ligne vidée de son nom et de son lien disparaît ; les autres gardent leurs valeurs et s\'écrivent sur leur playlist ; la dernière vidée garde le clavier', async ({ page }) => {
  await ecrireMeta(page, 'refuges', { playlists: [
    { nom: 'Une', lien: 'spotify:playlist:a' }, { nom: 'Deux', lien: 'spotify:playlist:b' }, { nom: 'Trois', lien: 'spotify:playlist:c' },
  ] });
  await ouvrirReglages(page);
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
  // Écrire sur la ligne remontée change sa playlist, et pas une autre.
  await nom(page, 2).fill('Trois bis');
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists[1]).toEqual({ nom: 'Trois bis', lien: 'spotify:playlist:c', source: null });
  expect((await lireMeta(page, 'refuges')).playlists[0]).toEqual({ nom: 'Une', lien: 'spotify:playlist:a', source: null });
  // La dernière vidée devient la ligne vide sur place : le champ garde le focus, et y écrire ajoute une playlist au bout. Le
  // lien s'écrit à la sortie de son champ (relecture finale) : il est vidé d'abord, puis le nom, qui s'écrit pendant la frappe.
  await lien(page, 2).fill('');
  await lien(page, 2).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists[1]).toEqual({ nom: 'Trois bis', lien: null, source: null });
  await nom(page, 2).fill('');
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists.map((p) => p.nom)).toEqual(['Une']);
  await expect(nom(page, 2)).toBeFocused();
  await expect(nom(page, 3)).toHaveCount(0);
  await lien(page, 2).fill('https://open.spotify.com/playlist/n');
  await lien(page, 2).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists).toEqual([
    { nom: 'Une', lien: 'spotify:playlist:a', source: null }, { nom: null, lien: 'https://open.spotify.com/playlist/n', source: null }]);
  // Tout vidé : la méta vaut null, et l'aperçu d'un import n'aurait rien à annoncer ; Mes refuges revient à son état vide.
  await lien(page, 2).fill('');
  await nom(page, 1).fill('');
  await lien(page, 1).fill('');
  await lien(page, 1).blur();
  await expect.poll(() => lireMeta(page, 'refuges')).toBeNull();
  await expect(nom(page, 2)).toHaveCount(0);
  await retour(page);
  await expect(ecran(page).locator('.refuges-vide')).toBeVisible();
  await expect(lignes(ecran(page))).toHaveCount(0);
});

test('les réglages : un brouillon resté sur l\'appareil revient dans son champ et s\'enregistre', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('carnet:brouillon:refuges:titres', JSON.stringify('Un titre resté'));
    localStorage.setItem('carnet:brouillon:refuges:nom-0', JSON.stringify('Pour la route'));
  });
  await ouvrirReglages(page);
  await expect(titres(page)).toHaveValue('Un titre resté');
  await expect(nom(page, 1)).toHaveValue('Pour la route');
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: 'Un titre resté', playlists: [{ nom: 'Pour la route', lien: null, source: null }] });
  await expect.poll(() => brouillons(page)).toEqual([]);
});

// Relecture finale : le lien s'écrivait 500 ms après la frappe. Une valeur de passage (le champ vidé puis le même lien recollé,
// une faute effacée puis retapée) était écrite, et la playlist suivie perdait ses morceaux et sa source, que le même lien ne
// rendait pas : seul « Mettre à jour la liste », par le réseau, pouvait les rendre. Le lien ne s'écrit plus qu'à la sortie de
// son champ (spec v12 §6.5 : « le même lien recollé, les garde »), comme un sens de mot dans Réglages › Émotions.
test('les réglages : le lien de la playlist suivie, vidé puis recollé une seconde plus tard, ou une faute effacée puis retapée, garde ses morceaux et sa source ; le lien ne s\'écrit qu\'à la sortie du champ ; une autre playlist les retire', async ({ page }) => {
  const suivie = { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify', morceaux: morceaux(12) };
  await ecrireMeta(page, 'refuges', { titres: null, playlists: [suivie] });
  const notee = await lireMeta(page, 'refuges');
  await ouvrirReglages(page);
  await expect(lien(page, 1)).toHaveValue(LIEN_PL);
  // Vidé, une seconde passe (le nom se serait déjà écrit) : rien n'est écrit ; puis le même lien collé, et la sortie du champ.
  await lien(page, 1).fill('');
  await page.clock.runFor(1000);
  expect(await lireMeta(page, 'refuges'), 'le lien vidé, pendant la frappe').toEqual(notee);
  await lien(page, 1).fill(LIEN_PL);
  await lien(page, 1).blur();
  await expect.poll(() => brouillons(page)).toEqual([]);
  expect(await lireMeta(page, 'refuges'), 'le même lien recollé').toEqual(notee);
  // Une faute : le dernier signe effacé, une seconde, puis retapé, et la sortie du champ.
  await lien(page, 1).press('End');
  await lien(page, 1).press('Backspace');
  await page.clock.runFor(1000);
  expect(await lireMeta(page, 'refuges'), 'la faute, pendant la frappe').toEqual(notee);
  await lien(page, 1).press('0');
  await expect(lien(page, 1)).toHaveValue(LIEN_PL);
  await lien(page, 1).blur();
  await expect.poll(() => brouillons(page)).toEqual([]);
  expect(await lireMeta(page, 'refuges'), 'la faute corrigée').toEqual(notee);
  // Mes refuges montre toujours ses morceaux, et « Spotify » sous son nom.
  await retour(page);
  await verifierMorceaux(ecran(page), 'Pour souffler', morceaux(12));
  await expect(lignes(ecran(page)).first()).toContainText('Spotify');
  // Une autre playlist, écrite à la sortie du champ : ses morceaux et sa source partent, ils étaient ceux de l'ancienne.
  await modifier(page).click();
  await expect(titres(page)).toBeVisible();
  const autre = `https://open.spotify.com/playlist/${id('pl2')}`;
  await lien(page, 1).fill(autre);
  await page.clock.runFor(1000);
  expect(await lireMeta(page, 'refuges'), 'une autre playlist, pendant la frappe').toEqual(notee);
  await lien(page, 1).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual([{ nom: 'Pour souffler', lien: autre, source: null }]);
  await retour(page);
  await expect(listeMorceaux(ecran(page))).toHaveCount(0);
});

// Relecture finale : « Mes playlists » et « Mes titres » étaient posés en étiquette de champ (17 px, en noir, en casse normale),
// alors que « Mes titres », sur Mes refuges, et les groupes des autres réglages ont le titre de section (13 px, en capitales
// grises). Le champ des titres garde son nom accessible.
test('les réglages : « Mes playlists » et « Mes titres » sont des titres de section, du style de « Mes titres » sur Mes refuges, en clair et en sombre ; le champ des titres garde son nom, « Mes titres »', async ({ page }) => {
  await ecrireMeta(page, 'refuges', PLEINS);
  const style = (loc) => loc.evaluate((e) => {
    const s = getComputedStyle(e);
    return [s.fontSize, s.fontWeight, s.textTransform, s.letterSpacing, s.color];
  });
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await ouvrirRefuges(page);
    const modele = await style(ecran(page).getByRole('heading', { name: 'Mes titres', level: 2, exact: true }));
    expect(modele[2], schema).toBe('uppercase');
    await modifier(page).click();
    await expect(titres(page)).toBeVisible();
    for (const nomSection of ['Mes playlists', 'Mes titres']) {
      const h = reglages(page).getByRole('heading', { name: nomSection, level: 2, exact: true });
      await expect(h).toHaveClass(/(^| )libelle-section( |$)/);
      expect(await style(h), `${schema} · ${nomSection}`).toEqual(modele);
    }
    await expect(reglages(page).getByRole('region', { name: 'Mes playlists', exact: true })).toBeVisible();
    await expect(titres(page)).toHaveAccessibleName('Mes titres');
    await expect(titres(page)).toHaveValue(PLEINS.titres);
    await expect(reglages(page).locator('label.etiquette').filter({ hasText: /^Mes / })).toHaveCount(0);
    await retour(page);
  }
});

// ---------- Mes refuges : la liste ----------

test('Mes refuges : la carte de la playlist suivie en tête, en lien direct ; « Un toucher ouvre Spotify. » ; ses morceaux, chacun spotify:track:<ID> ; « Mes titres » en lecture seule ; aucun champ', async ({ page }) => {
  // La playlist suivie (celle qui a des morceaux) est la troisième notée : sa carte vient d'abord, les autres suivent.
  const refuges = {
    titres: 'La maison bleue du lac\nPluie lente',
    playlists: [
      { nom: null, lien: MUSIQUE, source: null },
      { nom: 'Pour dormir', lien: null, source: null },
      { nom: 'Détente', lien: `${LIEN_PL}?si=1`, source: 'spotify', morceaux: morceaux(12) },
    ],
  };
  await ecrireMeta(page, 'refuges', refuges);
  await ouvrirRefuges(page);
  await verifierLignes(ecran(page), [{ href: DIRECT_PL, nom: 'Détente Spotify' }, { href: DIRECT_MUSIQUE, nom: 'Playlist 1' }]);
  await expect(lignes(ecran(page)).nth(0).locator('.ligne-sous')).toHaveText('Spotify');
  await expect(lignes(ecran(page)).nth(1).locator('.ligne-sous')).toHaveCount(0);
  const liste = await verifierMorceaux(ecran(page), 'Détente', morceaux(12));
  // Chaque rangée : une cible de 44 au moins, ni icône ni image ; l'artiste en discret, sous le titre.
  for (const a of await liste.getByRole('link').all()) expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(liste.locator('svg, img')).toHaveCount(0);
  await expect(liste.getByRole('link').first()).toHaveAccessibleName(`${morceau(1).titre} Les Vagues Douces`);
  await expect(liste.getByRole('link').nth(2)).toHaveAccessibleName(morceau(3).titre);
  const [t, ar] = await liste.locator('a').first().evaluate((a) => [a.querySelector('.titre-morceau'), a.querySelector('.artiste-morceau')]
    .map((e) => { const r = e.getBoundingClientRect(); return { haut: r.top, couleur: getComputedStyle(e).color }; }));
  expect(ar.haut).toBeGreaterThan(t.haut);
  expect(ar.couleur).not.toBe(t.couleur);
  // L'ordre, sans « La suite est dans Spotify. » : la playlist tient sous le plafond.
  expect(await ordreRefuges(page)).toEqual(['entete-pousse', 'lignes-playlists', 'discret note-refuges', 'liste carte carte-groupe liste-morceaux', 'titres-refuges']);
  await expect(ecran(page).locator('.note-refuges')).toHaveText(['Un toucher ouvre Spotify.']);
  await expect(ecran(page)).not.toContainText('La suite est dans Spotify.');
  // « Mes titres », en lecture seule : son titre, ses lignes, aucun champ ni bouton.
  const mesTitres = ecran(page).getByRole('region', { name: 'Mes titres' });
  await expect(mesTitres.locator('p')).toHaveText('La maison bleue du lac\nPluie lente');
  await expect(ecran(page).locator('textarea, input')).toHaveCount(0);
  await expect(ecran(page).getByRole('button')).toHaveText(['Retour']);
  // Les données ne changent pas : le lien noté reste le lien web.
  expect((await lireMeta(page, 'refuges')).playlists[2].lien).toBe(`${LIEN_PL}?si=1`);

  // Au-delà du plafond : « La suite est dans Spotify. », sans aucun nombre ; des titres absents, rien de plus.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Détente', lien: LIEN_PL, source: null, morceaux: morceaux(3), suite: true }] });
  await ouvrirRefuges(page);
  await verifierMorceaux(ecran(page), 'Détente', morceaux(3));
  expect(await ordreRefuges(page)).toEqual(['entete-pousse', 'lignes-playlists', 'discret note-refuges', 'liste carte carte-groupe liste-morceaux', 'discret note-refuges']);
  await expect(ecran(page).locator('.note-refuges')).toHaveText(['Un toucher ouvre Spotify.', 'La suite est dans Spotify.']);
  await expect(ecran(page).locator('.note-refuges').last()).not.toHaveText(/\d/);
  // Sans morceaux (pas encore lus) : la carte et sa ligne, sans liste ; une playlist de Musique seule n'ouvre pas Spotify.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Détente', lien: LIEN_PL, source: null }] });
  await ouvrirRefuges(page);
  expect(await ordreRefuges(page)).toEqual(['entete-pousse', 'lignes-playlists', 'discret note-refuges']);
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour marcher', lien: MUSIQUE, source: null }] });
  await ouvrirRefuges(page);
  expect(await ordreRefuges(page)).toEqual(['entete-pousse', 'lignes-playlists']);
  await verifierLignes(ecran(page), [{ href: DIRECT_MUSIQUE, nom: 'Pour marcher' }]);
  // « Retour » ramène à Bien-être.
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
});

test('Mes refuges vide : une phrase, « Choisir dans mon compte » (jamais touché ici) et « Coller un lien » vers les réglages ; des titres seuls restent visibles', async ({ page }) => {
  for (const meta of [null, { titres: 'Pluie lente', playlists: [{ nom: 'Sans lien' }] }]) {
    await ecrireMeta(page, 'refuges', meta);
    await ouvrirRefuges(page);
    const vide = ecran(page).locator('.refuges-vide');
    await expect(vide.locator('p')).toHaveText(['Choisis ta playlist dans ton compte Spotify, ou colle son lien.']);
    await expect(vide.getByRole('button')).toHaveText(['Choisir dans mon compte']);
    await expect(vide.getByRole('link')).toHaveText(['Coller un lien']);
    await expect(lignes(ecran(page))).toHaveCount(0);
    await expect(listeMorceaux(ecran(page))).toHaveCount(0);
    await expect(ecran(page)).not.toContainText('Un toucher ouvre Spotify.');
    await expect(ecran(page).getByRole('region', { name: 'Mes titres' })).toHaveCount(meta ? 1 : 0);
    for (const c of await vide.locator('button, a').all()) expect((await c.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await expect(ecran(page).getByRole('region', { name: 'Mes titres' }).locator('p')).toHaveText('Pluie lente');
  // « Coller un lien » : les réglages, où le nom déjà noté attend son lien ; le retour ramène à Mes refuges.
  await ecran(page).getByRole('link', { name: 'Coller un lien', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/refuges/reglages');
  await expect(nom(page, 1)).toHaveValue('Sans lien');
  await lien(page, 1).fill(LIEN_PL);
  await lien(page, 1).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists[0].lien).toBe(LIEN_PL);
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/refuges');
  await verifierLignes(ecran(page), [{ href: DIRECT_PL, nom: 'Sans lien' }]);
  await expect(ecran(page).locator('.refuges-vide')).toHaveCount(0);
});

test('« Modifier » : un lien de 44 à droite de « Retour », vers les réglages ; leur « Retour » et leur geste ramènent à Mes refuges, dont le « Retour » ramène toujours à l\'écran d\'où il a été ouvert', async ({ page }) => {
  await ecrireMeta(page, 'refuges', PLEINS);
  await ouvrirRefuges(page);
  const m = modifier(page);
  await expect(m).toHaveAttribute('href', '#/refuges/reglages');
  const [bm, br] = [await m.boundingBox(), await page.getByRole('button', { name: 'Retour', exact: true }).boundingBox()];
  expect(bm.height).toBeGreaterThanOrEqual(44);
  expect(bm.width).toBeGreaterThanOrEqual(44);
  expect(bm.x).toBeGreaterThan(br.x + br.width);
  expect(Math.abs((bm.y + bm.height / 2) - (br.y + br.height / 2))).toBeLessThanOrEqual(1);
  // Deux allers-retours par le bouton, puis un par le geste.
  for (let i = 0; i < 2; i++) {
    await modifier(page).click();
    await expect.poll(() => adresse(page)).toBe('#/refuges/reglages');
    await expect(onglet(page, 'Bien-être')).toHaveAttribute('aria-current', 'page');
    await expect(titres(page)).toBeVisible();
    await retour(page);
    await expect.poll(() => adresse(page)).toBe('#/refuges');
    await expect(lignes(ecran(page))).toHaveCount(2);
  }
  await modifier(page).click();
  await expect(titres(page)).toBeVisible();
  await glisser(page, 'h1.titre-ecran', 120, 8);
  await expect.poll(() => adresse(page)).toBe('#/refuges');
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  // Ouverts sans passer par Mes refuges (une adresse posée à la main), les réglages ramènent aussi à Mes refuges.
  await aller(page, '#/aujourdhui');
  await aller(page, '#/refuges/reglages');
  await expect(titres(page)).toBeVisible();
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/refuges');
});

// Point de vigilance 4.
test('point de vigilance 4 : une méta abîmée ou écrite à la main ; aucune erreur, aucun `href` hors des trois schémas, un nom ou un titre en HTML affiché en texte, aucune image', async ({ page }) => {
  const PIEGE = '<img src=x onerror="window.__piege=1">';
  const abimees = [
    { titres: ['pas un texte'], playlists: [null, 'texte', 12,
      { nom: PIEGE, lien: 'spotify:playlist:p', morceaux: [morceau(1)] },
      { nom: 'Ailleurs', lien: 'https://open.spotify.com.autre.test/p', source: 'spotify' },
      { nom: 'Bonne', lien: `${LIEN_PL}?si=1`, source: 'spotify',
        morceaux: [{ id: id('mo1'), titre: PIEGE, artiste: PIEGE }, { id: '../../x', titre: 'Chemin' }, { id: id('mo2') }, null, 'texte', { ...morceau(3), jeton: 'x' }] },
      { nom: 'Quatrième', lien: 'https://open.spotify.com/playlist/q' }] },
    { titres: PIEGE, playlists: [{ nom: 'Script', lien: 'javascript:window.__piege=1' }, { nom: 'Données', lien: 'data:text/html,<b>x</b>' },
      { nom: 'Sans chiffre', lien: 'http://open.spotify.com/playlist/x' }, { nom: 'Fichier', lien: 'file:///etc/passwd' }] },
    'du texte', 42, [], { playlists: { 0: { nom: 'Objet' } } },
  ];
  for (const meta of abimees) {
    await ecrireMeta(page, 'refuges', meta);
    const v = await ouvrirMoment(page);
    for (const h of await hrefs(v.locator('a[href]'))) expect(h, JSON.stringify(meta)).toMatch(/^(https:|spotify:|music:|#\/)/);
    await expect(v.locator('img')).toHaveCount(0);
    for (const ouvrir of [ouvrirRefuges, ouvrirReglages]) {
      await ouvrir(page);
      for (const h of await hrefs(page.locator('main a[href]'))) expect(h).toMatch(/^(https:|spotify:|music:|#\/)/);
      await expect(page.locator('img')).toHaveCount(0);
    }
  }
  expect(await page.evaluate(() => window.__piege)).toBeUndefined();
  // Le premier : trois lignes gardées, dans l'ordre, la suivie (« Bonne ») en tête ; le nom et le titre piégés sont du texte ;
  // les morceaux abîmés sont écartés, et ceux d'une ligne qui n'est pas une playlist Spotify ne s'affichent pas.
  await ecrireMeta(page, 'refuges', abimees[0]);
  await ouvrirRefuges(page);
  await verifierLignes(ecran(page), [{ href: DIRECT_PL, nom: 'Bonne Spotify' }, { href: 'spotify:playlist:p', nom: PIEGE }]);
  await expect(lignes(ecran(page)).nth(1).locator('.ligne-libelle')).toHaveText(PIEGE);
  await verifierMorceaux(ecran(page), 'Bonne', [{ id: id('mo1'), titre: PIEGE, artiste: PIEGE }, morceau(3)]);
  await expect(listeMorceaux(ecran(page))).toHaveCount(1);
  await ouvrirReglages(page);
  await expect(nom(page, 1)).toHaveValue(PIEGE);
  await expect(nom(page, 2)).toHaveValue('Ailleurs');
  await expect(lien(page, 2)).toHaveValue('');
  await expect(nom(page, 3)).toHaveValue('Bonne');
  await expect(nom(page, 4)).toHaveCount(0);
  const v = await ouvrirMoment(page);
  await verifierLignes(v, [{ href: DIRECT_PL, nom: 'Bonne Spotify' }, { href: 'spotify:playlist:p', nom: PIEGE }]);
  // v12 (7/9) : les mêmes morceaux après Mon plan, sous le nom de la suivie ; le titre piégé y est du texte.
  await expect(v.getByRole('region', { name: 'Bonne', exact: true }).getByRole('heading', { level: 2 })).toHaveText('Bonne');
  await verifierMorceaux(v, 'Bonne', [{ id: id('mo1'), titre: PIEGE, artiste: PIEGE }, morceau(3)]);
  await expect(listeMorceaux(v)).toHaveCount(1);
  // Le second : le titre piégé, dans Mon plan de Moment difficile, en texte ; aucune ligne d'écoute.
  await ecrireMeta(page, 'refuges', abimees[1]);
  const w = await ouvrirMoment(page);
  await expect(w.getByRole('region', { name: 'Mon plan' })).toContainText(PIEGE);
  await expect(lignes(w)).toHaveCount(0);
  await expect(w.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__piege)).toBeUndefined();
});

// Point de vigilance 4 (v12) : un titre et un artiste de 70 signes sans espace, une playlist au nom aussi long, en texte par
// défaut puis en très grand texte (33 à 53) : tout passe à la ligne, rien ne sort de sa rangée ni de l'écran de côté. v12
// (7/9) : de même dans Moment difficile, où le nom de la playlist titre ses morceaux.
test('point de vigilance 4 : un titre de morceau de 70 signes sans espace, en texte par défaut et en très grand texte, passe à la ligne ; rien ne déborde de côté, dans Mes refuges ni dans Moment difficile', async ({ page }) => {
  test.setTimeout(90000);
  const long = 'x7'.repeat(35);
  expect(long).toHaveLength(70);
  const refuges = { titres: `${long}\nPluie lente`, playlists: [{ nom: long, lien: LIEN_PL, source: 'spotify', morceaux: [{ id: id('mo9'), titre: long, artiste: long }, ...morceaux(3)], suite: true }] };
  await ecrireMeta(page, 'refuges', refuges);
  const fautes = {};
  for (const taille of [null, 33, 40, 47, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
    await ouvrirRefuges(page);
    await expect(listeMorceaux(ecran(page)).getByRole('link')).toHaveCount(4);
    const mesure = await page.evaluate(() => {
      const dehors = [];
      for (const e of document.querySelectorAll('main.refuges *')) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && (r.left < -0.5 || r.right > window.innerWidth + 0.5)) dehors.push(`${e.tagName.toLowerCase()}.${e.className}`);
        const rangee = e.closest('.ligne-morceau, .lien-refuge');
        if (rangee && rangee !== e && r.width > 0) {
          const b = rangee.getBoundingClientRect();
          if (r.left < b.left - 0.5 || r.right > b.right + 0.5) dehors.push(`hors de sa rangée : ${e.tagName.toLowerCase()}.${e.className}`);
        }
      }
      return { page: document.documentElement.scrollWidth, dehors };
    });
    if (mesure.page !== 390 || mesure.dehors.length) fautes[taille || 'défaut'] = mesure;
    // Moment difficile : ses morceaux, leur titre et leur note restent dans l'écran, et chaque texte dans sa rangée.
    const v = await ouvrirMoment(page);
    await expect(listeMorceaux(v).getByRole('link')).toHaveCount(4);
    const moment = await v.evaluate((d) => {
      const dehors = [];
      const section = d.querySelector('.morceaux-moment');
      for (const e of [section, ...section.querySelectorAll('*')]) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && (r.left < -0.5 || r.right > window.innerWidth + 0.5)) dehors.push(`${e.tagName.toLowerCase()}.${e.className}`);
        const rangee = e.closest('.ligne-morceau');
        if (rangee && rangee !== e && r.width > 0) {
          const b = rangee.getBoundingClientRect();
          if (r.left < b.left - 0.5 || r.right > b.right + 0.5) dehors.push(`hors de sa rangée : ${e.tagName.toLowerCase()}.${e.className}`);
        }
      }
      return { titre: section.querySelector('h2').textContent.length, dehors };
    });
    if (moment.titre !== 70 || moment.dehors.length) fautes[`Moment difficile, ${taille || 'défaut'}`] = moment;
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(fautes).toEqual({});
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
  // v12 : le lien direct vers l'app, fabriqué à l'affichage.
  await verifierLignes(v, [
    { href: DIRECT_PL, nom: 'Pour souffler Spotify' },
    { href: DIRECT_MUSIQUE, nom: 'Playlist 3' },
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

// v12 (7/9, spec v12 §6.6) : les morceaux gardés de la playlist suivie, la même liste que dans Mes refuges, viennent après Mon
// plan, sous le nom de leur playlist : plus haut, ils repousseraient Mon plan de plusieurs écrans. La carte de la playlist
// reste à sa place, en lien direct. Rien n'est lu que la base : aucune requête, et rien pour relire la liste chez Spotify.
test('Moment difficile : les morceaux de la playlist suivie après Mon plan, sous son nom, chacun spotify:track:<ID>, « La suite est dans Spotify. » au-delà du plafond ; la carte à sa place, en lien direct ; aucune requête, rien pour mettre à jour la liste', async ({ page }) => {
  const demandes = [];
  page.on('request', (r) => demandes.push(r.url()));
  await ecrireMeta(page, 'monPlan', PLAN);
  await ecrireMeta(page, 'refuges', { titres: 'Pluie lente', playlists: [
    { nom: null, lien: MUSIQUE, source: null },
    { nom: 'Détente', lien: `${LIEN_PL}?si=1`, source: 'spotify', morceaux: morceaux(12), suite: true },
  ] });
  let v = await ouvrirMoment(page);
  const ordre = () => v.evaluate((d) => [...d.querySelector('.etape').children].map((e) => e.className));
  await expect.poll(ordre).toEqual(['exercices-courts', 'carte carte-respiration', 'carte ligne-carte une-chose-acces', 'lignes-playlists',
    'carte plan-moment', 'morceaux-moment']);
  // La carte de la suivie en tête, puis l'autre, chacune en lien direct ; les titres dans Mon plan.
  await verifierLignes(v, [{ href: DIRECT_PL, nom: 'Détente Spotify' }, { href: DIRECT_MUSIQUE, nom: 'Playlist 1' }]);
  await expect(v.getByRole('region', { name: 'Mon plan' }).locator('.rubrique-plan').last().locator('p')).toHaveText('Pluie lente');
  // Les morceaux : une section au nom de la playlist, la liste de Mes refuges, puis la suite, sans aucun nombre.
  const section = v.getByRole('region', { name: 'Détente', exact: true });
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Détente');
  const liste = await verifierMorceaux(section, 'Détente', morceaux(12));
  for (const a of await liste.getByRole('link').all()) expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(liste.locator('svg, img')).toHaveCount(0);
  await expect(section.locator('p')).toHaveText(['La suite est dans Spotify.']);
  // Sous Mon plan, à l'écran comme dans l'ordre.
  const [plan, morceauxEnTete] = await Promise.all([v.locator('.plan-moment').boundingBox(), section.boundingBox()]);
  expect(morceauxEnTete.y).toBeGreaterThanOrEqual(plan.y + plan.height);
  // Rien pour relire la liste chez Spotify, ni pour choisir une playlist ; aucune requête hors de l'app.
  await expect(v.getByRole('button', { name: /Mettre à jour|Changer de playlist|Choisir dans mon compte/ })).toHaveCount(0);
  await expect(v).not.toContainText('Mettre à jour la liste');
  await expect(v).not.toContainText('Un toucher ouvre Spotify.');
  // Les données ne changent pas : le lien noté reste le lien web.
  expect((await lireMeta(page, 'refuges')).playlists[1].lien).toBe(`${LIEN_PL}?si=1`);

  // Sans nom, la suivie s'appelle par sa place ; sous le plafond, pas de suite.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour dormir' }, { nom: null, lien: LIEN_PL, source: null, morceaux: morceaux(3) }] });
  v = await ouvrirMoment(page);
  const sansNom = v.getByRole('region', { name: 'Playlist 2', exact: true });
  await verifierMorceaux(sansNom, 'Playlist 2', morceaux(3));
  await expect(sansNom.locator('p')).toHaveCount(0);
  // Une playlist pas encore lue : sa carte seule, sans section.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Détente', lien: LIEN_PL, source: null }] });
  v = await ouvrirMoment(page);
  await expect.poll(ordre).toEqual(['exercices-courts', 'carte carte-respiration', 'carte ligne-carte une-chose-acces', 'lignes-playlists', 'carte plan-moment']);
  await expect(listeMorceaux(v)).toHaveCount(0);
  expect(demandes.filter((u) => !/^(blob|data):/.test(u) && new URL(u).hostname !== '127.0.0.1')).toEqual([]);
});

// Relecture finale : un titre sans espace (un lien collé dans « Mes titres », 70 signes) ne passait pas à la ligne : il
// sortait de la carte Mon plan, coupé à son bord, et le corps de Moment difficile défilait de côté (721 px pour 390). Il
// passe à la ligne, comme le reste du plan (une rubrique et un « Si… alors… » aussi longs).
test('Moment difficile : un texte sans espace de 70 signes dans « Mes titres » et dans le plan passe à la ligne ; rien ne sort de la carte Mon plan, rien ne défile de côté', async ({ page }) => {
  const long = `https://open.spotify.com/track/${'x7'.repeat(20).slice(0, 39)}`;
  expect(long).toHaveLength(70);
  await ecrireMeta(page, 'monPlan', { quandCaMonte: long, siAlors: [{ si: long, alors: long }] });
  await ecrireMeta(page, 'refuges', { titres: `${long}\nPluie lente`, playlists: [] });
  const v = await ouvrirMoment(page);
  const plan = v.getByRole('region', { name: 'Mon plan' });
  await expect(plan.locator('.rubrique-plan').last().locator('p')).toHaveText(`${long}\nPluie lente`);
  await expect(plan).toContainText(long);
  const mesure = await v.evaluate((d) => {
    const corps = d.querySelector('.parcours-corps');
    const carte = d.querySelector('.plan-moment').getBoundingClientRect();
    const dehors = [...d.querySelectorAll('.plan-moment *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < carte.left - 0.5 || r.right > carte.right + 0.5); })
      .map((e) => e.tagName.toLowerCase());
    return { corps: corps.scrollWidth - corps.clientWidth, page: document.documentElement.scrollWidth, dehors };
  });
  expect(mesure).toEqual({ corps: 0, page: 390, dehors: [] });
});

// Contre-relecture : la même liste dans l'éditeur de Mon plan (#/mon-plan, antérieur à la v11). Un « si » sans espace de
// 70 signes élargissait la ligne à 602 px pour 362 ; la carte, qui coupe ce qui dépasse, rejetait « Retirer » hors de
// l'écran, hors d'atteinte du doigt. Il passe à la ligne, et le bouton reste dans la carte.
test('Mon plan, l\'éditeur : un « si » sans espace de 70 signes passe à la ligne ; rien ne sort de la carte, et « Retirer » s\'atteint au doigt et retire la ligne', async ({ page }) => {
  const long = `https://open.spotify.com/track/${'x7'.repeat(20).slice(0, 39)}`;
  expect(long).toHaveLength(70);
  await ecrireMeta(page, 'monPlan', { quandCaMonte: 'je sors marcher', siAlors: [{ si: long, alors: 'je sors' }] });
  await aller(page, '#/mon-plan');
  const liste = page.locator('main.mon-plan ul.carte-groupe');
  await expect(liste).toContainText(`Si ${long}, alors je sors`);
  const mesure = await liste.evaluate((ul) => {
    const carte = ul.getBoundingClientRect();
    const dehors = [...ul.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < carte.left - 0.5 || r.right > carte.right + 0.5); })
      .map((e) => e.tagName.toLowerCase());
    const b = ul.querySelector('button.effacer');
    const r = b.getBoundingClientRect();
    return { deborde: ul.scrollWidth - ul.clientWidth, page: document.documentElement.scrollWidth, dehors,
      atteint: b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
  });
  expect(mesure).toEqual({ deborde: 0, page: 390, dehors: [], atteint: true });
  await page.getByRole('button', { name: `Retirer « si ${long} »`, exact: true }).tap();
  await expect.poll(async () => (await lireMeta(page, 'monPlan')).siAlors).toEqual([]);
  await expect(liste).toHaveCount(0);
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

test('Réglages › Mon plan › Mes refuges › Retour › Retour ramène à Réglages ; de même en passant par ses réglages, et depuis Moment difficile', async ({ page }) => {
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
  // v12 : par ses réglages (« Modifier », puis « Retour ») : Mes refuges ramène toujours à Mon plan.
  await page.locator('main.mon-plan').getByRole('link', { name: 'Mes refuges', exact: true }).click();
  await modifier(page).click();
  await expect.poll(() => adresse(page)).toBe('#/refuges/reglages');
  await retour(page);
  await expect.poll(() => adresse(page)).toBe('#/refuges');
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

test('la sauvegarde : Mes refuges part et revient avec Mon plan, ses morceaux compris ; l\'aperçu de l\'import nomme « les refuges »', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  // v12 : des morceaux déjà lus sur la première ligne ; un nom changé dans les réglages les garde.
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Avant', lien: LIEN_PL, source: null, morceaux: morceaux(3), suite: true }] });
  await ouvrirReglages(page);
  await titres(page).fill('Pluie lente');
  await nom(page, 1).fill('Pour souffler');
  await lien(page, 1).fill(`${LIEN_PL}?si=1`);
  await lien(page, 1).blur();
  const attendus = { titres: 'Pluie lente', playlists: [{ nom: 'Pour souffler', lien: LIEN_PL, source: null, morceaux: morceaux(3), suite: true }] };
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
  await verifierLignes(ecran(page), [{ href: DIRECT_PL, nom: 'Pour souffler' }]);
  await verifierMorceaux(ecran(page), 'Pour souffler', morceaux(3));
  await expect(ecran(page).locator('.note-refuges').last()).toHaveText('La suite est dans Spotify.');
  await modifier(page).click();
  await expect(titres(page)).toHaveValue('Pluie lente');
  await expect(lien(page, 1)).toHaveValue(LIEN_PL);
  // Un lien changé vers une autre playlist perd les morceaux de l'ancienne.
  await lien(page, 1).fill(`https://open.spotify.com/playlist/${id('pl2')}`);
  await lien(page, 1).blur();
  await expect.poll(async () => (await lireMeta(page, 'refuges')).playlists).toEqual([{ nom: 'Pour souffler', lien: `https://open.spotify.com/playlist/${id('pl2')}`, source: null }]);
  // Des refuges vidés (null) n'annoncent rien à perdre.
  await ecrireMeta(page, 'refuges', null);
  await ecrireMeta(page, 'monPlan', PLAN);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles(fichier);
  await expect(page.getByRole('button', { name: 'Importer', exact: true })).toBeVisible();
  await expect(page.getByText(/refuges/)).toHaveCount(0);
});

// v12 (7/9, spec v12 §6.2) : « Ouvrir un morceau », les deux formes du premier morceau gardé, le morceau seul et le morceau
// dans sa playlist. Aucune n'est suivie : le test lit `href`. Pour les toucher, il retire d'abord leur `href` : ce ne sont plus
// des liens spotify:, et le toucher n'atteint que ce qui note la forme dans le rapport, qui n'en garde que le nom.
test('Diagnostic, « Ouvrir un morceau » : les deux formes du premier morceau gardé, jamais suivies ; le rapport ne note que la forme touchée, sans titre ni identifiant ; sans morceau, une phrase sans lien', async ({ page }) => {
  const section = () => page.locator('main.diag section', { has: page.getByRole('heading', { name: 'Ouvrir un morceau', exact: true }) });
  const rapport = () => page.locator('main.diag pre').textContent();
  // Sans refuges, puis avec des playlists sans morceaux : une phrase, aucun lien.
  for (const refuges of [null, { playlists: [{ nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify' }, { nom: 'Pour marcher', lien: MUSIQUE }] }]) {
    await ecrireMeta(page, 'refuges', refuges);
    await aller(page, '#/reglages');
    await aller(page, '#/diagnostic');
    await expect(section().locator('p')).toHaveText(['Aucun morceau noté dans Mes refuges.']);
    await expect(section().locator('a')).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { name: 'Ouvrir une playlist' })).toHaveCount(0);
  // La suivie est la deuxième ligne : son premier morceau.
  const gardes = morceaux(3);
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour marcher', lien: MUSIQUE }, { nom: 'Détente', lien: `${LIEN_PL}?si=1`, source: 'spotify', morceaux: gardes }] });
  await aller(page, '#/reglages');
  await aller(page, '#/diagnostic');
  const liens = section().getByRole('link');
  await expect(liens).toHaveText(['Morceau seul', 'Morceau dans sa playlist']);
  expect(await hrefs(liens)).toEqual([`spotify:track:${gardes[0].id}`, `spotify:track:${gardes[0].id}?context=spotify%3Aplaylist%3A${PL}`]);
  expect(await liens.evaluateAll((l) => l.map((a) => [a.getAttribute('target'), a.getAttribute('rel')]))).toEqual([[null, 'noreferrer'], [null, 'noreferrer']]);
  for (const a of await liens.all()) expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(section()).toContainText('Le premier morceau de Mes refuges. À noter : où ça s\'ouvre, si la lecture démarre, ce qui joue ensuite, où on revient.');
  await expect(section()).not.toContainText('Aucun morceau');
  // Relecture de la tâche 7 : la note passe par pourAffichage, comme celle du son de fond. toContainText ramène l'espace
  // insécable à une espace simple : on lit le texte affiché. En grand texte (23 px, celui de v7-controle), puis 33 et 53 px,
  // aucune ligne des deux notes ne commence par une ponctuation haute ; avant, à 23 px, une ligne commençait par « : où ça ».
  expect(await section().locator('p.discret').textContent()).toContain('À noter : où ça s\'ouvre');
  const debutsFautifs = {};
  for (const taille of [23, 33, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
    const notes = await page.locator('main.diag p.discret').evaluateAll((l) => l.map((p) => {
      const lignes = [];
      const plage = document.createRange();
      const marche = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let haut = null;
      for (let n = marche.nextNode(); n; n = marche.nextNode()) {
        for (let i = 0; i < n.length; i += 1) {
          // Une espace sécable : là où la ligne peut changer. Elle compte dans le texte de la ligne, pas dans sa mesure.
          if (/[^\S ]/.test(n.data[i])) { if (lignes.length) lignes[lignes.length - 1] += ' '; continue; }
          plage.setStart(n, i);
          plage.setEnd(n, i + 1);
          const q = plage.getClientRects()[0];
          if (!q || q.width === 0) continue;
          if (haut === null || q.top > haut + 2) { lignes.push(''); haut = q.top; }
          lignes[lignes.length - 1] += n.data[i];
        }
      }
      return lignes.map((x) => x.trim());
    }));
    expect(notes, `${taille} px : les deux notes, le son de fond et le morceau`).toHaveLength(2);
    for (const lignes of notes) expect(lignes.length, `${taille} px : ${lignes[0]}`).toBeGreaterThan(2);
    const fautes = notes.flatMap((lignes) => lignes.filter((x, k) => k > 0 && /^[:;?!»·]/.test(x)));
    if (fautes.length) debutsFautifs[`${taille} px`] = fautes;
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(debutsFautifs).toEqual({});
  // Les deux touchers : le rapport nomme chaque forme, et rien d'autre, ni titre, ni artiste, ni identifiant, ni lien.
  const formes = section().locator('a.btn');
  for (const i of [0, 1]) {
    await formes.nth(i).evaluate((a) => a.removeAttribute('href'));
    await formes.nth(i).click();
  }
  await expect.poll(rapport).toContain('Ouvrir un morceau : Morceau seul\nOuvrir un morceau : Morceau dans sa playlist');
  const texte = await rapport();
  for (const x of [gardes[0].titre, gardes[0].artiste, gardes[0].id, PL, 'Détente', 'Pour marcher']) expect(texte).not.toContain(x);
  expect(texte).not.toMatch(/spotify|https:|music:/i);
  expect(await adresse(page)).toBe('#/diagnostic');
});

// v12 (7/9, spec v12 §6.5) : les morceaux partent dans la sauvegarde, jamais dans l'Export PSY ni dans la vue soignants, qui ne
// lisent pas la méta. Leur texte et la page dessinée des soignants sont les mêmes avec et sans eux ; ce que la page écrit est
// relevé au dessin (fillText), puisque le PDF n'en garde que l'image.
test('un export qui contient des morceaux : ils sont dans la sauvegarde, jamais dans l\'Export PSY ni dans la vue soignants', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    window.__dessines = [];
    const ecrire = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function fillText(texte, ...reste) {
      window.__dessines.push(String(texte));
      return ecrire.call(this, texte, ...reste);
    };
  });
  await page.reload();
  await appPrete(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-14', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-14', heure: '12:00', emotion: 'roue:colere:irrite', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-13', heure: '16:00', emotion: 'roue:serenite:calme', energie: null });
  });
  const liste = [{ id: id('va1'), titre: 'Valse des Saules', artiste: 'Orchestre du Lac' }, { id: id('br2'), titre: 'Brise sur la dune', artiste: null }];
  const refuges = { titres: null, playlists: [{ nom: 'Escale du soir', lien: LIEN_PL, source: 'spotify', morceaux: liste, suite: true }] };
  const traces = ['Valse des Saules', 'Orchestre du Lac', 'Brise sur la dune', 'Escale du soir', id('va1'), id('br2'), PL];
  await ecrireMeta(page, 'refuges', refuges);
  // La sauvegarde les emporte.
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  const [f] = await fichiersPartages(page);
  expect(JSON.parse(Buffer.from(f.octets).toString('utf8')).data.meta.find((m) => m.cle === 'refuges').valeur).toEqual(refuges);
  // L'Export PSY et la page des soignants, avec les morceaux, puis sans.
  const lire = async () => {
    await aller(page, '#/reglages');
    await aller(page, '#/export-psy');
    const apercu = page.getByLabel('Aperçu du texte');
    await expect(apercu).toContainText('irrité');
    const psy = await apercu.textContent();
    await aller(page, '#/reglages');
    await page.evaluate(() => { window.__dessines = []; });
    await aller(page, '#/soignants');
    await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 20000 });
    const dessines = await page.evaluate(() => window.__dessines.slice());
    const ecran = await page.locator('main').textContent();
    return { psy, dessines, ecran };
  };
  const avec = await lire();
  expect(avec.dessines.length).toBeGreaterThan(5);
  for (const x of traces) {
    expect(avec.psy, x).not.toContain(x);
    expect(avec.dessines.join('\n'), x).not.toContain(x);
    expect(avec.ecran, x).not.toContain(x);
  }
  expect(`${avec.psy}\n${avec.dessines.join('\n')}`).not.toMatch(/spotify|morceau/i);
  await ecrireMeta(page, 'refuges', null);
  expect(await lire()).toEqual(avec);
});
