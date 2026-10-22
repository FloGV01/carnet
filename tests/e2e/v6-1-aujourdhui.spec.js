import { test, expect } from '../aides/gardes.js';
import { toucher, viderBase, aller } from '../aides/saisie.js';
import { installerMicroFactice } from '../aides/micro-stub.js';

// v6.1 · Aujourd'hui (P2, P3, P4, P7) : « J'ai fini pour ce soir » sur la ligne de « Mémo vocal », la ligne
// Après coup juste dessous, « Ma journée » qui range relevés et épisodes par heure, et le repli « Ce qui a
// pesé · ce qui a rechargé » qui se cale en haut de l'écran. Données inventées. Horloge : jeudi 15 octobre
// 2026, 21:00 (écran de 390 × 844, celui du projet).
const repo = (page, f, arg) => page.evaluate(f, arg);
const COLERE = { emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 5 };
const TITRE_PESE = /^Ce qui a pesé · ce qui a rechargé/;

test.beforeEach(async ({ page }) => {
  await installerMicroFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const boite = (page, selecteur) => page.locator(selecteur).first().boundingBox();

test('ordre : les champs, « Mémo vocal » et « J\'ai fini » sur une ligne, Après coup, les replis, Ma journée, le pied', async ({ page }) => {
  await repo(page, (e) => window.__carnet.repo.episodes.creer({ date: '2026-10-14', heure: '18:42', ...e }), COLERE);
  await page.reload();
  await toucher(page, 'Lieu', 'Bureau');
  await expect(page.getByRole('button', { name: 'J\'ai fini pour ce soir' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Après coup \(TCC\) · tes épisodes récents/ })).toBeVisible();
  const ordre = await page.evaluate(() => {
    const reperes = [['#points-positifs', 'positifs'], ['.btn-memo', 'memo'], ['.fini-bouton', 'fini'], ['.ligne-apres-coup-jour', 'apres-coup'],
      ['.replis', 'replis'], ['.evenements-jour > h2', 'ma-journee'], ['.ajout-symptome', 'symptome'], ['.pied-jour', 'pied']];
    return [...document.querySelectorAll(reperes.map(([s]) => s).join(', '))].map((e) => reperes.find(([s]) => e.matches(s))[1]);
  });
  expect(ordre).toEqual(['positifs', 'memo', 'fini', 'apres-coup', 'replis', 'ma-journee', 'symptome', 'pied']);
  await expect(page.locator('.evenements-jour > h2')).toHaveText('Ma journée');

  // À l'écran : « J'ai fini » à droite de « Mémo vocal », à la même hauteur ; Après coup juste dessous, avant les replis.
  const [memo, fini, apres, replis] = await Promise.all(['.btn-memo', '.fini-bouton', '.ligne-apres-coup-jour', '.replis'].map((s) => boite(page, s)));
  expect(Math.abs((memo.y + memo.height / 2) - (fini.y + fini.height / 2))).toBeLessThanOrEqual(1);
  expect(fini.x).toBeGreaterThan(memo.x + memo.width);
  expect(fini.height).toBeGreaterThanOrEqual(44);
  expect(apres.y).toBeGreaterThanOrEqual(fini.y + fini.height);
  expect(apres.y - (fini.y + fini.height)).toBeLessThan(12);
  expect(replis.y).toBeGreaterThanOrEqual(apres.y + apres.height);
  await expect(page.locator('.evenements-jour').getByRole('link', { name: /Après coup/ })).toHaveCount(0);

  // La soirée repliée : la ligne Après coup reste, sous la carte, et Ma journée aussi.
  await page.getByRole('button', { name: 'J\'ai fini pour ce soir' }).click();
  const soiree = await boite(page, '.fini-soir');
  const apresRepli = await boite(page, '.ligne-apres-coup-jour');
  expect(apresRepli.y).toBeGreaterThanOrEqual(soiree.y + soiree.height);
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
});

test('« J\'ai fini pour ce soir » : absent avant un premier choix, puis visible sans défiler à 390 × 844, en clair et en sombre', async ({ page }) => {
  const fini = page.getByRole('button', { name: 'J\'ai fini pour ce soir' });
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await expect(page.getByRole('button', { name: 'Mémo vocal' })).toBeVisible();
    await expect(fini).toHaveCount(0);
    await toucher(page, 'Lieu', 'Bureau');
    await expect(fini).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const bouton = await fini.boundingBox();
    const bande = await boite(page, '.actions-flottantes');
    expect(bouton.y + bouton.height).toBeLessThanOrEqual(bande.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  // Avec un mémo du soir, sa puce passe au-dessus : « J'ai fini » reste sur la ligne du bouton.
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.audios.creer({ parentStore: 'journal', parentId: r.aujourdhui(), dureeMs: 1500, mime: 'audio/wav', data: new ArrayBuffer(64) });
  });
  await page.reload();
  await expect(page.getByText(/Mémo vocal · 0:0/)).toBeVisible();
  const [memo, bouton, puce] = await Promise.all(['.btn-memo', '.fini-bouton', '.puce-memo'].map((s) => boite(page, s)));
  expect(Math.abs((memo.y + memo.height / 2) - (bouton.y + bouton.height / 2))).toBeLessThanOrEqual(1);
  expect(memo.y).toBeGreaterThanOrEqual(puce.y + puce.height);
  await expect(fini).toBeInViewport({ ratio: 1 });
});

test('sans micro ni mémo, « J\'ai fini pour ce soir » reste là, à droite', async ({ page }) => {
  await page.addInitScript(() => { window.MediaRecorder = undefined; });
  await page.reload();
  await toucher(page, 'Lieu', 'Bureau');
  const fini = page.getByRole('button', { name: 'J\'ai fini pour ce soir' });
  await expect(fini).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Mémo vocal' })).toHaveCount(0);
  // Son bord droit est celui des cartes (2b), comme celui de la carte des points positifs.
  const [bouton, positifs] = await Promise.all([fini.boundingBox(), page.locator('.carte-champ', { has: page.locator('#points-positifs') }).boundingBox()]);
  expect(Math.abs((bouton.x + bouton.width) - (positifs.x + positifs.width))).toBeLessThanOrEqual(1);
});

// Une ligne de « Ma journée » : sa colonne d'heure, son texte, et si elle mène quelque part.
const lignes = (page) => page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => ({
  heure: li.querySelector('.heure').textContent, texte: li.querySelector('.resume').textContent,
  lien: Boolean(li.querySelector('a')), chevron: li.querySelectorAll(':scope > * > svg').length > 0,
})));

test('Ma journée : relevés (dont un « vers ») et épisodes rangés par heure, symptômes à la fin ; un relevé n\'a ni lien ni chevron', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.episodes.creer({ date: '2026-10-15', heure: '20:00', emotion: 'emotion:tristesse' });
    await r.symptomes.creer({ date: '2026-10-15', symptome: 'symptome:ruminations', intensite: 4 });
    await r.humeurs.creer({ date: '2026-10-15', heure: '18:05', humeur: null, energie: 'energie:basse' });
    await r.episodes.creer({ date: '2026-10-15', heure: '12:30', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 5 });
    await r.humeurs.creer({ date: '2026-10-15', heure: '14:00', vers: true, humeur: 5, energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    // 02:30 le 15 : encore le 14 (jour logique), absent d'aujourd'hui.
    await r.humeurs.creer({ date: '2026-10-15', heure: '02:30', humeur: 3, energie: null });
    await r.episodes.creer({ date: '2026-10-14', heure: '23:10', emotion: 'emotion:anxiete', intensite: 6 });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect.poll(() => lignes(page)).toEqual([
    { heure: '10:20', texte: 'humeur 6 · énergie moyenne', lien: false, chevron: false },
    { heure: '12:30', texte: 'Colère · 5 · Conflit', lien: true, chevron: true },
    { heure: 'vers 14 h', texte: 'humeur 5', lien: false, chevron: false },
    { heure: '18:05', texte: 'énergie basse', lien: false, chevron: false },
    { heure: '20:00', texte: 'Tristesse', lien: true, chevron: true },
    { heure: '', texte: 'Ruminations · 4', lien: true, chevron: true },
  ]);
  // « + Symptôme » reste sous la liste ; le même point pour tous les relevés, quelle que soit l'humeur.
  const [liste, symptome] = await Promise.all([boite(page, '.liste-evenements'), boite(page, '.ajout-symptome')]);
  expect(symptome.y).toBeGreaterThanOrEqual(liste.y + liste.height);
  const points = await page.locator('.ligne-evenement.releve .point-evenement').evaluateAll((els) => els.map((e) => {
    const s = getComputedStyle(e);
    return `${e.className}|${s.backgroundColor}|${s.borderTopColor}|${s.borderTopWidth}|${s.width}`;
  }));
  expect(points).toHaveLength(3);
  expect(new Set(points).size).toBe(1);
  await expect(page.locator('.evenements-jour')).not.toContainText(/aucun|NaN|undefined|null/i);

  // Mêmes règles sur la page d'un jour passé : le relevé de 02:30 le 15 vient après l'épisode de 23:10 le 14.
  await aller(page, '#/jour/2026-10-14');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect.poll(() => lignes(page)).toEqual([
    { heure: '23:10', texte: 'Anxiété · 6', lien: true, chevron: true },
    { heure: '02:30', texte: 'humeur 3', lien: false, chevron: false },
  ]);
  // Un jour sans rien : la section, vide, sans un mot de plus.
  await aller(page, '#/jour/2026-10-12');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect(page.locator('.liste-evenements > li')).toHaveCount(0);
  await expect(page.locator('.evenements-jour')).toHaveText(/^\s*Ma journée\s*Symptôme\s*$/);
});

test('Ma journée d\'un jour passé : un épisode sans heure vient après les relevés, avant les symptômes ; un relevé sans humeur ni énergie dit ce que je faisais, un relevé vide n\'a pas de ligne', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.symptomes.creer({ date: '2026-10-12', symptome: 'symptome:ruminations', intensite: 4 });
    await r.humeurs.creer({ date: '2026-10-12', heure: '19:00', humeur: 4, energie: null });
    // Noté depuis la page du jour passé : sans heure (parcours-fiche.js).
    await r.episodes.creer({ date: '2026-10-12', heure: null, declencheur: 'declencheur:conflit' });
    await r.humeurs.creer({ date: '2026-10-12', heure: '10:20', humeur: 6, energie: null });
    await r.humeurs.creer({ date: '2026-10-12', heure: '15:40', faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] });
    await r.humeurs.creer({ date: '2026-10-12', heure: '17:00' });
  });
  await aller(page, '#/jour/2026-10-12');
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect.poll(() => lignes(page)).toEqual([
    { heure: '10:20', texte: 'humeur 6', lien: false, chevron: false },
    { heure: '15:40', texte: 'ce que je faisais : travail, trajet', lien: false, chevron: false },
    { heure: '19:00', texte: 'humeur 4', lien: false, chevron: false },
    { heure: '', texte: 'Conflit', lien: true, chevron: true },
    { heure: '', texte: 'Ruminations · 4', lien: true, chevron: true },
  ]);
  await expect(page.locator('.evenements-jour')).not.toContainText(/17:00|NaN|undefined|null/);
});

test('« Effacer cette journée » : la confirmation dit que les émotions du moment (relevés) restent, et elles restent dans Ma journée', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-15', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: null });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Effacer cette journée' }).click();
  const boite = page.getByRole('alertdialog', { name: 'Effacer la journée du jeudi 15 oct. ?' });
  await expect(boite.getByText('Les épisodes, symptômes et émotions du moment de ce jour sont conservés.', { exact: true })).toBeVisible();
  await boite.getByRole('button', { name: 'Effacer', exact: true }).click();
  await expect(page.getByText('Journée effacée')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Lieu', exact: true }).getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lignes(page)).toEqual([{ heure: '10:20', texte: 'humeur 6', lien: false, chevron: false }]);
  expect(await repo(page, () => window.__carnet.repo.humeurs.tous())).toHaveLength(1);
});

// Enregistre chaque calage de la page (window.scrollTo avec ses options), posé avant le chargement de l'app. Les
// retours en haut d'un changement d'écran (scrollTo(0, 0)) ne comptent pas.
const espionnerCalage = (page) => page.addInitScript(() => {
  window.__calages = [];
  const origine = window.scrollTo;
  window.scrollTo = function caler(...args) {
    if (args[0] && typeof args[0] === 'object') window.__calages.push({ behavior: args[0].behavior });
    return origine.apply(this, args);
  };
});
const calages = (page) => page.evaluate(() => window.__calages);
const hautDuRepli = (page) => page.locator('.repli', { has: page.getByRole('button', { name: TITRE_PESE }) })
  .evaluate((e) => Math.round(e.getBoundingClientRect().top));

test('« Ce qui a pesé · ce qui a rechargé » : à l\'ouverture, la page se cale pour le montrer en entier en haut de l\'écran ; deux colonnes régulières', async ({ page }) => {
  await espionnerCalage(page);
  await page.reload();
  const titre = page.getByRole('button', { name: TITRE_PESE });
  const repli = page.locator('.repli', { has: titre });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await titre.click();
  await expect.poll(() => calages(page)).toEqual([{ behavior: 'smooth' }]);
  // En haut de l'écran (à sa marge près), et entier au-dessus de la bande du bas.
  await expect.poll(() => hautDuRepli(page)).toBe(8);
  const bas = await repli.evaluate((e) => e.getBoundingClientRect().bottom);
  expect(bas).toBeLessThanOrEqual((await boite(page, '.actions-flottantes')).y);
  await expect(page.getByRole('group', { name: 'Ce qui a rechargé', exact: true }).getByRole('button', { name: 'Sieste / repos' })).toBeInViewport({ ratio: 1 });

  // Deux grilles régulières sur deux colonnes, comme les étapes d'un épisode ; cibles de 44 pt au moins.
  for (const nom of ['Ce qui a pesé', 'Ce qui a rechargé']) {
    const grille = page.getByRole('group', { name: nom, exact: true });
    const mesure = await grille.evaluate((g) => ({
      affichage: getComputedStyle(g).display, colonnes: getComputedStyle(g).gridTemplateColumns.split(' '),
      largeurs: [...g.children].map((b) => Math.round(b.getBoundingClientRect().width)),
      hauteurs: [...g.children].map((b) => b.getBoundingClientRect().height),
    }));
    expect(mesure.affichage).toBe('grid');
    expect(mesure.colonnes).toHaveLength(2);
    expect(mesure.colonnes[0]).toBe(mesure.colonnes[1]);
    expect(new Set(mesure.largeurs).size).toBe(1);
    for (const h of mesure.hauteurs) expect(h).toBeGreaterThanOrEqual(44);
  }
  // Un toucher enregistre, comme avant.
  await page.getByRole('group', { name: 'Ce qui a pesé', exact: true }).getByRole('button', { name: 'Bruit' }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.journal.lire(window.__carnet.repo.aujourdhui())))?.pese).toEqual(['pese:bruit']);

  // À la fermeture, rien ne bouge ; au chargement, un repli resté ouvert ne fait rien défiler.
  await titre.click();
  await expect(titre).toHaveAttribute('aria-expanded', 'false');
  expect(await calages(page)).toHaveLength(1);
  await titre.click();
  await expect(titre).toHaveAttribute('aria-expanded', 'true');
  await page.reload();
  await expect(page.getByRole('group', { name: 'Ce qui a pesé', exact: true })).toBeVisible();
  expect(await calages(page)).toEqual([]);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('« Réduire les animations » : le calage est un saut', async ({ page }) => {
  await espionnerCalage(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: TITRE_PESE }).click();
  await expect.poll(() => calages(page)).toEqual([{ behavior: 'auto' }]);
  expect(await hautDuRepli(page)).toBe(8);
});

test('avec le bandeau « Nouvelle version prête » collé en haut, le repli se cale dessous, son titre et « Ce qui a pesé » visibles', async ({ page }) => {
  await espionnerCalage(page);
  await page.reload();
  await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true }));
  const bandeau = page.locator('.bandeau');
  await expect(bandeau).toBeVisible();
  const hauteur = await bandeau.evaluate((b) => b.getBoundingClientRect().height);
  expect(hauteur).toBeGreaterThan(44);
  const titre = page.getByRole('button', { name: TITRE_PESE });
  await titre.click();
  await expect.poll(() => calages(page)).toEqual([{ behavior: 'smooth' }]);
  // Le bandeau reste en haut ; le repli vient 8 px sous son bord (au pixel près), et rien de lui n'est caché dessous.
  await expect.poll(async () => Math.abs((await hautDuRepli(page)) - (hauteur + 8))).toBeLessThanOrEqual(1);
  const mesure = await page.evaluate(() => {
    const bas = document.querySelector('.bandeau').getBoundingClientRect();
    const etiquette = [...document.querySelectorAll('.repli .etiquette')].find((e) => e.textContent === 'Ce qui a pesé').getBoundingClientRect();
    const premiere = document.querySelector('[aria-label="Ce qui a pesé"] .pastille').getBoundingClientRect();
    return { bandeauHaut: Math.round(bas.top), bandeauBas: bas.bottom, etiquette: etiquette.top, pastille: premiere.top };
  });
  expect(mesure.bandeauHaut).toBe(0);
  expect((await titre.boundingBox()).y).toBeGreaterThanOrEqual(mesure.bandeauBas);
  expect(mesure.etiquette).toBeGreaterThanOrEqual(mesure.bandeauBas);
  expect(mesure.pastille).toBeGreaterThanOrEqual(mesure.bandeauBas);
});
