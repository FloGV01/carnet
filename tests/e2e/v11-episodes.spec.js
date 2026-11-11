import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, jetons } from '../aides/couleurs.js';

// v11 (5/11) · Revenir sur ses épisodes (spec §7). Une porte « Épisodes » en haut de l'Analyse, à côté d'« Historique », ouvre
// l'Historique forcé sur le segment « Épisodes » : aucune liste nouvelle, un épisode ancien en 3 touchers depuis l'onglet, ses
// filtres et sa position gardés au retour. « Ce que j'en retiens » s'écrit sur l'épisode rouvert, sous la carte Après coup,
// même ancien et même sans Après coup ; vide, il ne dit rien ; il n'entre ni dans l'Après coup, ni dans la feuille « Voir ».
// Rien ne change sur Aujourd'hui, et aucune ligne de la liste ne parle d'Après coup. Données inventées, sans prénom.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const THEMES = [['light', clair], ['dark', sombre]];
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const CLE_SEGMENT = 'carnet:historique:segment';
const RETENU = 'Partir avant que ça monte.\nLe dire au collègue dès le matin.';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    const jour = (n) => { const d = new Date(2026, 8, 1 + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    // Du 1er septembre au 14 octobre : un jour sur trois au bureau.
    for (let n = 0; n < 44; n++) await r.journal.patch(jour(n), { lieu: n % 3 === 0 ? 'lieu:bureau' : 'lieu:teletravail', sommeilRessenti: 'sommeil:moyen' });
    // Un épisode par jour du 1er septembre au 10 octobre : deux colères pour une frustration.
    for (let n = 0; n < 40; n++) {
      await r.episodes.creer({ date: jour(n), heure: '14:30', emotion: n % 3 === 2 ? 'emotion:frustration' : 'emotion:colere', intensite: 1 + (n % 9), declencheur: 'declencheur:injustice' });
    }
    // Un épisode ancien sans Après coup, un ancien dont l'Après coup date de juin, et un de la veille avec Après coup et ce
    // qu'on en retient.
    await r.episodes.creer({ date: '2026-06-02', heure: '18:00', emotion: 'emotion:colere', intensite: 6, declencheur: 'declencheur:conflit', reaction: 'reaction:retrait_isolement' }, { id: 'ep-ancien' });
    await r.episodes.creer({ date: '2026-06-09', heure: '19:15', emotion: 'emotion:colere', intensite: 5, declencheur: 'declencheur:conflit',
      apresCoup: { types: ['typeExplosion:colere'], repereA: 4, jour: '2026-06-10' } }, { id: 'ep-ac' });
    await r.episodes.creer({ date: '2026-10-14', heure: '18:40', emotion: 'emotion:colere', intensite: 7, declencheur: 'declencheur:surcharge_sensorielle', reaction: 'reaction:explosion',
      apresCoup: { types: ['typeExplosion:colere'], siJe: 'je sens la chaleur monter', alorsJe: 'je sors', jour: '2026-10-14' }, ceQueJeRetiens: 'Partir avant que ça monte.' }, { id: 'ep-veille' });
  });
  await page.reload();
  await appPrete(page);
});

const onglet = (page, nom) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: nom, exact: true });
const portes = (page) => page.getByRole('navigation', { name: 'Historique, épisodes et Comprendre' });
const porteHistorique = (page) => portes(page).getByRole('link', { name: 'Historique', exact: true });
const porteEpisodes = (page) => portes(page).getByRole('link', { name: 'Épisodes', exact: true });
const segment = (page, nom) => page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: new RegExp(nom) });
const retour = (page) => page.getByRole('button', { name: 'Retour', exact: true });
const fiche = (page) => page.getByRole('dialog', { name: 'Épisode' });
const champ = (page) => fiche(page).locator('#episodes-ceQueJeRetiens');
const lire = (page, id) => page.evaluate((i) => window.__carnet.repo.episodes.lire(i), id);
const positionY = (page) => page.evaluate(() => window.scrollY);
const segmentRetenu = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE_SEGMENT);
// Amène une ligne au milieu de l'écran et laisse passer deux images, le temps que la position soit notée.
const defilerJusqua = async (page, lien) => {
  await lien.evaluate((a) => a.scrollIntoView({ block: 'center' }));
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  const y = await positionY(page);
  expect(y).toBeGreaterThan(400);
  return y;
};
const filtrer = async (page, groupe, valeur) => {
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: groupe }).getByRole('button', { name: valeur, exact: true }).click();
  await expect(page.locator('.resume-filtres')).toHaveText(valeur);
};

test('en haut de l\'Analyse, « Épisodes › » à côté d\'« Historique › », de même hauteur, au carré des épisodes ; en grand texte, l\'un sous l\'autre', async ({ page }) => {
  await onglet(page, 'Analyse').click();
  await expect(porteEpisodes(page)).toBeVisible();
  await expect(porteEpisodes(page)).toHaveAttribute('href', '#/historique');
  await expect(porteHistorique(page)).toHaveAttribute('href', '#/historique');
  await expect(portes(page).getByRole('link')).toHaveText(['Historique', 'Épisodes', 'Explosions', 'Énergie', 'Rythmes']);
  // Côte à côte, au bord des portes de Comprendre, au-dessus d'elles ; des cibles de 44 pt au moins.
  const comprendre = page.getByRole('group', { name: 'Comprendre', exact: true });
  const [h, e, c] = await Promise.all([porteHistorique(page).boundingBox(), porteEpisodes(page).boundingBox(), comprendre.boundingBox()]);
  expect(Math.abs(h.y - e.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(h.height - e.height)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(h.width - e.width)).toBeLessThanOrEqual(1);
  expect(e.x).toBeGreaterThanOrEqual(h.x + h.width);
  expect(Math.abs(h.x - c.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs((e.x + e.width) - (c.x + c.width))).toBeLessThanOrEqual(0.5);
  expect(e.y + e.height).toBeLessThanOrEqual(c.y);
  expect(e.height).toBeGreaterThanOrEqual(44);
  // L'icône de la porte, sans carré, à l'accent comme celle de l'Historique (v12 : une porte ouvre quelque chose, et les
  // épisodes n'ont plus de couleur).
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const [iconeEp, iconeHist] = await Promise.all([porteEpisodes(page), porteHistorique(page)].map((p) => p.locator('.icone-porte')
      .evaluate((x) => [getComputedStyle(x).backgroundColor, getComputedStyle(x.querySelector('svg')).color])));
    expect(iconeEp, `${schema} : icône d'Épisodes`).toEqual(['rgba(0, 0, 0, 0)', rgb(t['accent-texte'])]);
    expect(iconeHist, `${schema} : icône d'Historique`).toEqual(iconeEp);
  }
  // En grand texte : « Épisodes » passe sous « Historique », sur toute la largeur ; la page ne défile pas de côté.
  for (const taille of [23, 33, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const [hg, eg, cg] = await Promise.all([porteHistorique(page).boundingBox(), porteEpisodes(page).boundingBox(), comprendre.boundingBox()]);
    expect(eg.y, `${taille} px : sous Historique`).toBeGreaterThanOrEqual(hg.y + hg.height);
    expect(Math.abs(eg.width - cg.width), `${taille} px : toute la largeur`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(hg.width - cg.width)).toBeLessThanOrEqual(0.5);
    for (const p of [porteHistorique(page), porteEpisodes(page)]) {
      expect(await p.evaluate((a) => a.scrollWidth <= a.clientWidth + 0.5 && [...a.children].every((x) => x.getBoundingClientRect().right <= a.getBoundingClientRect().right + 0.5))).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 0.5), `${taille} px : page`).toBe(true);
  }
});

test('segment retenu « Jours » : la porte ouvre l\'Historique sur « Épisodes », pressé, sans les filtres ni la position des jours ; « Retour » ramène à l\'Analyse', async ({ page }) => {
  await onglet(page, 'Analyse').click();
  await porteHistorique(page).click();
  // « Jours » retenu sur l'appareil : choisi après un passage par « Symptômes ».
  await segment(page, 'Symptômes').click();
  await segment(page, 'Jours').click();
  await expect(segment(page, 'Jours')).toHaveAttribute('aria-pressed', 'true');
  await filtrer(page, 'Lieu', 'Bureau');
  await defilerJusqua(page, page.getByRole('link', { name: /jeudi 10 sept\./ }));
  // Par l'onglet Analyse : la liste des jours garde sa position en mémoire (« Retour », en haut, la ferait d'abord remonter).
  await onglet(page, 'Analyse').click();
  await expect(page).toHaveURL(/#\/analyse$/);
  expect(await segmentRetenu(page)).toBe('jours');

  await porteEpisodes(page).click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect(page.getByRole('heading', { name: 'Historique', level: 1 })).toBeVisible();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await expect(segment(page, 'Jours')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('link', { name: /mardi 8 sept\. · 14:30/ })).toHaveCount(1);
  await expect(page.locator('.resume-filtres')).toHaveCount(0);
  expect(await positionY(page)).toBe(0);
  expect(await segmentRetenu(page)).toBe('episodes');
  // L'onglet Analyse reste allumé, et « Retour » y ramène.
  await expect(onglet(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  await retour(page).click();
  await expect(page).toHaveURL(/#\/analyse$/);
  await expect(porteEpisodes(page)).toBeVisible();
  // La porte « Historique » rouvre ensuite le dernier segment, désormais « Épisodes ».
  await porteHistorique(page).click();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
});

test('déjà sur « Épisodes » : filtres et position gardés au retour d\'un épisode, puis par la porte', async ({ page }) => {
  await onglet(page, 'Analyse').click();
  await porteEpisodes(page).click();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await filtrer(page, 'Émotion', 'Colère');
  await expect(page.getByText(/^Frustration · /)).toHaveCount(0);
  const lien = page.getByRole('link', { name: /mardi 8 sept\. · 14:30/ });
  const y = await defilerJusqua(page, lien);
  await lien.click();
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche(page).getByRole('button', { name: 'Terminer' }).click();

  await expect(page).toHaveURL(/#\/historique$/);
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-filtres')).toHaveText('Colère');
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
  await expect(lien).toBeInViewport();

  // Par l'onglet Analyse, puis la porte.
  await onglet(page, 'Analyse').click();
  await expect(page).toHaveURL(/#\/analyse$/);
  await porteEpisodes(page).click();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-filtres')).toHaveText('Colère');
  await expect(page.getByText(/^Frustration · /)).toHaveCount(0);
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
});

test('première ouverture après un redémarrage, sans passer par l\'Historique : 3 touchers depuis l\'onglet Analyse jusqu\'à un épisode ancien, sans erreur', async ({ page }) => {
  // Le dernier segment retenu sur l'appareil : Symptômes. La mémoire de la session est vide (redémarrage).
  await page.evaluate((c) => localStorage.setItem(c, JSON.stringify('symptomes')), CLE_SEGMENT);
  await page.reload();
  await appPrete(page);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // 1. L'onglet Analyse. 2. La porte « Épisodes ». 3. L'épisode du 2 juin, en bas de la liste.
  await onglet(page, 'Analyse').click();
  await porteEpisodes(page).click();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: /mardi 2 juin · 18:00/ }).click();
  await expect(page).toHaveURL(/#\/episode\/ep-ancien$/);
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(champ(page)).toBeAttached();
  // Fermer ramène à la liste, puis « Retour » à l'Analyse.
  await fiche(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await retour(page).click();
  await expect(page).toHaveURL(/#\/analyse$/);
});

test('Aujourd\'hui garde sa ligne « Après coup » ; aucune ligne de la liste ne parle d\'Après coup ni de ce qu\'on en retient', async ({ page }) => {
  const ligne = page.getByRole('link', { name: /Après coup \(TCC\) · tes épisodes récents/ });
  await expect(ligne).toHaveText(/^\s*Après coup \(TCC\) · tes épisodes récents\s*$/);
  await expect(ligne).toHaveAttribute('href', '#/apres-coup');

  await onglet(page, 'Analyse').click();
  await porteEpisodes(page).click();
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  const lignes = page.locator('.ligne-hist');
  await expect(lignes).toHaveCount(43);
  // La veille : son Après coup et ce qu'on en retient ne s'y lisent pas ; la ligne dit le choix et la réaction, comme avant.
  await expect(page.getByRole('link', { name: /mercredi 14 oct\. · 18:40/ }).locator('.hist-resume, .hist-note')).toHaveText(['Colère · 7 · Surcharge sensorielle (bruit, monde)', 'Explosion']);
  for (const t of await lignes.allTextContents()) expect(t).not.toMatch(/Après coup|TCC|retiens|Partir avant|chaleur|fait|travaillé/i);
  // Ni nombre d'Après coup, ni filtre « sans Après coup ».
  await page.getByRole('button', { name: 'Filtrer' }).click();
  expect(await page.locator('main.historique').textContent()).not.toMatch(/Après coup|TCC/);
});

test('« Ce que j\'en retiens » : sur un épisode ancien sans Après coup, sous la carte Après coup ; vide, rien d\'écrit à côté ; écrit, il s\'enregistre seul et se retrouve', async ({ page }) => {
  await aller(page, '#/episode/ep-ancien');
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const zone = champ(page);
  const bloc = fiche(page).locator('.champ-recap', { has: page.locator('#episodes-ceQueJeRetiens') });
  // Juste après la carte Après coup, avant « En parler au rendez-vous ».
  const ordre = await fiche(page).locator('.etape-recap > *').evaluateAll((els) => els.map((x) => (x.querySelector('textarea') || {}).id || x.className));
  const carte = ordre.findIndex((x) => /bouton-apres-coup/.test(x));
  expect(ordre[carte + 1]).toBe('episodes-ceQueJeRetiens');
  expect(ordre.slice(0, 4)).toEqual(['titre-question', 'liste recap', 'episodes-situation', 'episodes-ceQuiAAide']);
  expect(ordre[carte + 2]).toMatch(/en-parler/);
  // Vide : son nom seul, ni consigne, ni « facultatif », ni invitation ; deux lignes et la dictée.
  await expect(fiche(page).getByRole('textbox', { name: 'Ce que j\'en retiens', exact: true })).toBeVisible();
  await expect(zone).toHaveValue('');
  await expect(zone).toHaveAttribute('placeholder', '');
  await expect(zone).toHaveAttribute('rows', '2');
  expect((await bloc.textContent()).trim()).toBe('Ce que j\'en retiens');
  await expect(bloc.getByRole('button')).toHaveCount(1);
  await expect(bloc.getByRole('button', { name: 'Dicter' })).toBeVisible();
  await expect(bloc.locator('.facultatif, .aide-dicter')).toHaveCount(0);
  // La carte Après coup ne change pas : vide, elle dit comment y venir.
  await expect(fiche(page).getByRole('link', { name: /Après coup · TCC/ })).toContainText('Retour à froid');

  await zone.fill(RETENU);
  await expect.poll(async () => (await lire(page, 'ep-ancien')).ceQueJeRetiens).toBe(RETENU);
  const lu = await lire(page, 'ep-ancien');
  expect(lu.apresCoup ?? null).toBeNull();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:brouillon:')))).toEqual([]);
  await page.reload();
  await appPrete(page);
  await aller(page, '#/episode/ep-ancien');
  await expect(champ(page)).toHaveValue(RETENU);
  await expect(fiche(page).getByRole('link', { name: /Après coup · TCC/ })).toContainText('Retour à froid');

  // Sur un ancien épisode dont l'Après coup date de juin : l'écrire ne touche pas à l'Après coup, ni à son jour.
  const avant = await lire(page, 'ep-ac');
  await aller(page, '#/episode/ep-ac');
  await expect(fiche(page).getByRole('link', { name: /Après coup · TCC/ })).toContainText('Colère · remarqué à 4/10');
  await champ(page).fill('Le dire plus tôt.');
  await expect.poll(async () => (await lire(page, 'ep-ac')).ceQueJeRetiens).toBe('Le dire plus tôt.');
  expect((await lire(page, 'ep-ac')).apresCoup).toEqual(avant.apresCoup);
  // Vidé, il redevient vide, et rien d'autre ne bouge.
  await champ(page).fill('');
  await expect.poll(async () => (await lire(page, 'ep-ac')).ceQueJeRetiens).toBeNull();
  expect((await lire(page, 'ep-ac')).apresCoup).toEqual(avant.apresCoup);

  // Un symptôme rouvert n'a pas ce champ.
  const sy = await page.evaluate(async () => (await window.__carnet.repo.symptomes.creer({ date: '2026-10-12', symptome: 'symptome:ruminations', intensite: 5 })).id);
  await aller(page, `#/symptome/${sy}`);
  await expect(page.getByRole('dialog', { name: 'Symptôme' }).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(page.locator('textarea[id$="ceQueJeRetiens"]')).toHaveCount(0);
  await expect(page.getByText('Ce que j\'en retiens')).toHaveCount(0);
});

test('aller à l\'Après coup, y écrire, revenir : le texte reste, et l\'Après coup aussi ; « Annuler » du toast remet l\'épisode d\'avant', async ({ page }) => {
  const avant = await lire(page, 'ep-ancien');
  await aller(page, '#/episode/ep-ancien');
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  // Écrit, puis l'Après coup ouvert aussitôt, sans attendre l'enregistrement.
  await champ(page).fill(RETENU);
  await fiche(page).getByRole('link', { name: /Après coup · TCC/ }).click();
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(vue.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  await vue.getByRole('button', { name: 'Colère' }).click();
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/episode\/ep-ancien$/);
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(champ(page)).toHaveValue(RETENU);
  await expect(fiche(page).getByRole('link', { name: /Après coup · TCC/ })).toContainText('Colère');
  await expect.poll(async () => (await lire(page, 'ep-ancien')).ceQueJeRetiens).toBe(RETENU);
  const ecrit = await lire(page, 'ep-ancien');
  expect(ecrit.apresCoup.types).toEqual(['typeExplosion:colere']);
  // « Ce que j'en retiens » n'est pas dans l'Après coup.
  expect(ecrit.apresCoup).not.toHaveProperty('ceQueJeRetiens');

  // Terminer, puis « Annuler » : l'épisode revient tel qu'il était avant d'être rouvert, Après coup compris.
  await fiche(page).getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await page.getByRole('status').filter({ hasText: 'Épisode enregistré' }).getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lire(page, 'ep-ancien')).ceQueJeRetiens).toBeNull();
  expect(await lire(page, 'ep-ancien')).toEqual(avant);
  await aller(page, '#/episode/ep-ancien');
  await expect(fiche(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(champ(page)).toHaveValue('');
  await expect(fiche(page).getByRole('link', { name: /Après coup · TCC/ })).toContainText('Retour à froid');
});

test('la feuille « Voir » d\'En consultation ne montre pas « Ce que j\'en retiens »', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.rdv.creer({ date: '2026-10-20', heure: '10:30', professionnel: 'professionnel:psychiatre',
    questions: [{ texte: 'La colère de la veille', abordee: false, lien: { store: 'episodes', id: 'ep-veille' } }] }, { id: 'rdv-oct' }));
  await aller(page, '#/consultation/rdv-oct');
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  await vue.getByRole('button', { name: 'Voir La colère de la veille' }).click();
  const lecture = page.getByRole('dialog', { name: 'Épisode' });
  await expect(lecture.locator('.ligne-lecture')).toHaveText([/Déclencheur\s*Surcharge sensorielle/, /Émotion\s*Colère/, /Intensité\s*7/, /En dessous\s*·/,
    /Réaction\s*Explosion/, /Après coup · TCC\s*Colère · si je sens la chaleur monter, alors je sors/]);
  await expect(lecture).not.toContainText('retiens');
  await expect(lecture).not.toContainText('Partir avant');
});
