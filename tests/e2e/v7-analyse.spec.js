import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { addDays } from '../../public/js/domain/dates.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v7 (5/9) · L'Analyse sans note de 1 à 10 (spec §5) : la porte « Historique › » avec les trois portes de Comprendre, Ma
// semaine en tuiles dont « Tes émotions », Mes jours avec la rangée Émotions (et « Humeur (notes) » seulement avec des
// notes), Ta journée par familles, les mots les plus notés ; les analyses calculées sur la note sont retirées. Points de
// vigilance 1 (sauvegarde v6.1 importée) et 5 (un jour qui mêle une note et une émotion). Données inventées.
// Horloge : dimanche 18 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-18';
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const mesJours = (page) => page.locator('figure', { has: page.getByText('Mes jours', { exact: true }) });
const graphe = (page) => mesJours(page).locator('svg[role="img"]');
const periode = (page, nom) => page.getByRole('group', { name: 'Période' }).getByRole('button', { name: nom });
const etiquettes = (page) => graphe(page).locator('text.g-etiquette');
// Les phrases des analyses retirées, et ce qui en restait à l'écran.
const RETIREES = /Tendances|journées à 7 ou plus|à 4 ou moins|Sommeil et humeur|Sur tout ton historique|Pour info|Signal|humeur moyenne|Pas d'écart net|observations sur tes données/;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 18, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Quatorze jours : deux à trois émotions du moment par jour (une famille seule de temps en temps), l'énergie, et le soir.
async function quatorzeJours(page) {
  const jours = Array.from({ length: 14 }, (_, i) => addDays(AUJ, i - 13));
  await repo(page, async (liste) => {
    const r = window.__carnet.repo;
    const emotions = ['roue:colere:irrite', 'roue:serenite:calme', 'roue:joie', 'roue:peur:preoccupe', 'roue:colere:irrite', 'roue:tristesse:vide'];
    let k = 0;
    for (const date of liste) {
      for (const heure of ['09:30', '14:10', '19:45'].slice(0, 2 + (k % 2))) {
        await r.humeurs.creer({ date, heure, emotion: emotions[k % emotions.length], energie: k % 3 ? 'energie:moyenne' : 'energie:basse' });
        k += 1;
      }
      if (date < liste[liste.length - 1]) await r.journal.patch(date, { lieu: 'lieu:bureau', sommeilRessenti: k % 4 ? 'sommeil:bien' : 'sommeil:mal' });
    }
    await r.episodes.creer({ date: liste[10], heure: '17:00', emotion: 'emotion:colere', reaction: 'reaction:explosion' });
  }, jours);
}

test('l\'Analyse avec des émotions : portes, Ma semaine « Tes émotions », Mes jours, Ta journée, les mots les plus notés, sans NaN ni phrase retirée', async ({ page }) => {
  await quatorzeJours(page);
  await aller(page, '#/analyse');
  await expect(page.getByRole('heading', { name: 'Analyse', level: 1 })).toBeVisible();

  // Ma semaine : « Tes émotions », une barre par famille notée, dans l'ordre de la roue, avec son nombre de relevés.
  const semaine = page.getByRole('region', { name: 'Ma semaine' });
  await expect(semaine.locator('.carte-entete')).toContainText('12 – 18 oct.');
  const familles = semaine.locator('.barres-familles li');
  await expect(familles.locator('.nom-famille')).toHaveText(['Colère', 'Tristesse', 'Joie', 'Peur', 'Sérénité']);
  await expect(familles.locator('.compte-famille')).toHaveText(['4', '2', '3', '3', '2']);
  await expect(semaine.locator('.tuile-titre')).toHaveText(['Tes émotions', 'nuits Mal', 'explosions', 'épisodes']);
  // Les barres prennent la couleur de leur famille (roue et graphiques d'émotions seulement).
  const couleurs = await familles.evaluateAll((lis) => lis.map((li) => [getComputedStyle(li.querySelector('rect')).fill, getComputedStyle(li).getPropertyValue('--c').trim()]));
  for (const [fond, c] of couleurs) expect(fond).not.toBe('');
  expect(new Set(couleurs.map(([fond]) => fond)).size).toBe(5);

  // Mes jours sur 7 jours : L M M J V S D en tête, une étiquette par rangée, un point par relevé à la couleur de sa famille.
  await periode(page, '7 j').click();
  await expect(graphe(page)).toHaveAttribute('aria-label', /^Mes jours, une colonne par jour : émotions, nuits, explosions, épisodes, énergie basse\./);
  await expect(graphe(page).locator('text.g-tete')).toHaveText(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  await expect(etiquettes(page)).toHaveText(['Émotions', 'Nuits', 'Explosions', 'Épisodes', 'Énergie', 'basse']);
  await expect(graphe(page).locator('circle.g-emo')).toHaveCount(14);
  await expect(graphe(page).locator('circle.g-emo.emo-colere')).toHaveCount(4);
  await expect(mesJours(page).locator('.legende-frise')).toContainText('Colère');
  // Un jour touché : ses émotions, dans l'ordre des heures, avec le mot ou la famille seule.
  await graphe(page).locator('rect.g-zone').last().click();
  await expect(mesJours(page).locator('.detail-colonne')).toContainText(/^dimanche 18 oct\. · émotions : joie, préoccupé/);

  // Ta journée heure par heure : les familles par créneau, puis l'énergie.
  const journee = page.getByRole('figure').filter({ hasText: 'Ta journée heure par heure' });
  await expect(journee.locator('text.g-etiquette')).toHaveText(['Émotions', 'Énergie']);
  await journee.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(journee.getByRole('row', { name: /^8 h – 10 h/ })).toContainText('émotions : ');

  // Les plus fréquents, sur 7 jours : « Émotion du moment », le mot le plus noté (une famille seule n'est pas un mot).
  const frequents = page.locator('section', { has: page.getByRole('heading', { name: 'Les plus fréquents' }) });
  await expect(frequents.locator('.ligne-classement').first()).toHaveText(/^Émotion du moment\s*Irrité\u00a0· 4 relevés sur 11$/);
  await expect(frequents).toContainText('Émotion (épisodes)');
  // v8 (Q29) : « · » tient au mot qui le précède (espace insécable) : il ne commence jamais une ligne.
  for (const t of await frequents.locator('.ligne-classement > span:last-child').allTextContents()) expect(t, t).not.toMatch(/(^|[^\u00a0])·/);

  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  await expect(page.locator('main')).not.toContainText(RETIREES);
  const aria = await page.locator('main [aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join(' '));
  expect(aria).not.toMatch(/NaN|undefined/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('la rangée « Humeur (notes) » n\'apparaît qu\'avec des notes de 1 à 10 sur la période', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-16', heure: '10:00', emotion: 'roue:surprise:perplexe', energie: null });
    // Une ancienne note, il y a 40 jours : hors des 7 et des 30 jours, dans les 3 mois.
    await r.humeurs.creer({ date: '2026-09-08', heure: '10:00', humeur: 6, energie: null });
  });
  await aller(page, '#/analyse');
  const legende = mesJours(page).locator('.legende-frise');
  await periode(page, '7 j').click();
  await expect(etiquettes(page)).toHaveText(['Émotions', 'Nuits', 'Explosions', 'Épisodes']);
  await expect(legende).not.toContainText(/note|moyenne|peu de valeurs/);
  await periode(page, '30 j').click();
  await expect(etiquettes(page)).not.toContainText(['Humeur']);
  await expect(legende).not.toContainText(/note|moyenne|peu de valeurs/);
  await periode(page, '3 mois').click();
  await expect(etiquettes(page)).toHaveText(['Émotions', 'Humeur', '(notes)', 'Nuits', 'Explosions', 'Épisodes']);
  await expect(graphe(page)).toHaveAttribute('aria-label', /émotions, humeur \(notes de 1 à 10\), nuits/);
  await expect(graphe(page).locator('g.teinte-humeur circle')).toHaveCount(1);
  // Par semaine, le point est une moyenne ; une seule note dans la semaine : un anneau, « peu de valeurs ». La légende le dit.
  await expect(graphe(page).locator('g.teinte-humeur circle.g-anneau')).toHaveCount(1);
  await expect(legende.locator(':scope > span')).toContainText(['moyenne des notes', 'peu de valeurs']);
  await expect(legende.locator(':scope > span', { hasText: 'moyenne des notes' }).locator('circle.g-point')).toHaveCount(1);
  await expect(legende.locator(':scope > span', { hasText: 'peu de valeurs' }).locator('circle.g-anneau')).toHaveCount(1);
  await expect(legende).not.toContainText('note du jour');
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);
});

test('la porte « Historique › » en haut de l\'Analyse ouvre l\'Historique ; la ligne d\'un jour donne ses émotions', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const [heure, emotion] of [['09:00', 'roue:colere:irrite'], ['12:00', 'roue:serenite:calme'], ['18:00', 'roue:joie']]) {
      await r.humeurs.creer({ date: '2026-10-17', heure, emotion, energie: null });
    }
  });
  await aller(page, '#/analyse');
  const porte = page.getByRole('navigation', { name: 'Historique et Comprendre' }).getByRole('link', { name: 'Historique', exact: true });
  const [p, comprendre] = await Promise.all([porte.boundingBox(), page.getByRole('group', { name: 'Comprendre', exact: true }).boundingBox()]);
  expect(p.y + p.height).toBeLessThanOrEqual(comprendre.y);
  expect(p.height).toBeGreaterThanOrEqual(44);
  await porte.click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect(page.getByRole('heading', { name: 'Historique', level: 1 })).toBeVisible();
  // Un jour qui n'a que des émotions a sa ligne : deux mots au plus, puis « … », et les points de ses trois familles.
  const ligne = page.getByRole('link', { name: /samedi 17 oct\./ });
  await expect(ligne.locator('.mots-jour')).toHaveText('irrité, calme…');
  await expect(ligne.locator('.familles-jour i')).toHaveCount(3);
});

test('point de vigilance 1 : une sauvegarde v6.1 (format 4) importée garde ses notes, et l\'Analyse les montre en « Humeur (notes) »', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 1, 21, 0));
  await page.reload();
  await aller(page, '#/reglages');
  const temoin = readFileSync(new URL('../fixtures/temoins/format-4.json', import.meta.url));
  await page.locator('input[type=file]').setInputFiles({ name: 'carnet-sauvegarde-2026-10-19-2130.json', mimeType: 'application/json', buffer: temoin });
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  // Les notes sont gardées, sans émotion.
  const releves = await page.evaluate(() => window.__carnet.repo.humeurs.tous());
  expect(releves.map((h) => [h.humeur, h.emotion])).toEqual([[6, null], [4, null], [5, null]]);

  await aller(page, '#/analyse');
  await expect(graphe(page)).toHaveAttribute('aria-label', /émotions, humeur \(notes de 1 à 10\), nuits/, { timeout: 15000 });
  await expect(etiquettes(page)).toContainText(['Émotions', 'Humeur', '(notes)']);
  await expect(graphe(page).locator('circle.g-emo')).toHaveCount(0);
  await expect(graphe(page).locator('g.teinte-humeur circle').first()).toBeVisible();
  await mesJours(page).getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(mesJours(page).getByRole('cell', { name: /humeur 6/ }).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/NaN|undefined/);
  await expect(page.locator('main')).not.toContainText(RETIREES);
});

test('point de vigilance 5 : un jour qui mêle une ancienne note et une émotion montre les deux rangées dans Mes jours', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '08:30', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '19:10', emotion: 'roue:colere:irrite', energie: 'energie:basse' });
  });
  await aller(page, '#/analyse');
  await periode(page, '7 j').click();
  await expect(etiquettes(page)).toHaveText(['Émotions', 'Humeur', '(notes)', 'Nuits', 'Explosions', 'Épisodes', 'Énergie', 'basse']);
  await expect(graphe(page).locator('circle.g-emo.emo-colere')).toHaveCount(1);
  await expect(graphe(page).locator('g.teinte-humeur circle')).toHaveCount(1);
  // Par jour, le point est la note du jour : la légende le dit, sans moyenne ni anneau.
  const legende = mesJours(page).locator('.legende-frise');
  await expect(legende.locator(':scope > span', { hasText: 'note du jour' }).locator('circle.g-point')).toHaveCount(1);
  await expect(legende).not.toContainText(/moyenne|peu de valeurs/);
  // La même colonne, le jeudi : le point de l'émotion et celui de la note.
  const [emo, note] = await Promise.all([graphe(page).locator('circle.g-emo').getAttribute('cx'), graphe(page).locator('g.teinte-humeur circle').getAttribute('cx')]);
  expect(emo).toBe(note);
  await mesJours(page).getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(mesJours(page).getByRole('row', { name: /jeudi 15 oct\./ })).toContainText('émotions : irrité · humeur 6 · énergie basse');
});

test('Comprendre (v7) : « Autour de tes explosions » et « Après une nuit », par familles, sans pourcentage', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const [date, heure] of [['2026-10-10', '18:00'], ['2026-10-12', '20:30'], ['2026-10-14', '17:15']]) {
      await r.episodes.creer({ date, heure, emotion: 'emotion:colere', reaction: 'reaction:explosion' });
      const [h, m] = heure.split(':').map(Number);
      const decale = (d) => `${String(h + d).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      await r.humeurs.creer({ date, heure: decale(-1), emotion: 'roue:colere:hostile', energie: null });
      await r.humeurs.creer({ date, heure: decale(2), emotion: 'roue:tristesse', energie: null });
      await r.journal.patch(date, { sommeilRessenti: 'sommeil:mal' });
    }
    // Juillet et août : un soir et une ancienne note de 1 à 10, sans émotion (comme les mois d'avant la v7).
    for (const date of ['2026-07-20', '2026-08-14']) {
      await r.journal.patch(date, { sommeilRessenti: 'sommeil:bien' });
      await r.humeurs.creer({ date, heure: '10:00', humeur: 6, emotion: null, energie: 'energie:moyenne' });
    }
  });
  await aller(page, '#/comprendre/explosions');
  const autour = page.locator('figure.graphe', { has: page.getByText('Autour de tes explosions', { exact: true }) });
  await expect(autour.getByRole('img', { name: /^Autour de tes explosions, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(autour.locator('text.g-nom')).toHaveText(['3 heures avant', '3 heures après']);
  await autour.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(autour.getByRole('row', { name: /3 heures avant/ })).toContainText('colère 3');
  await expect(autour.getByRole('row', { name: /3 heures après/ })).toContainText('tristesse 3');

  await aller(page, '#/comprendre/rythmes');
  const nuit = page.locator('figure.graphe', { has: page.getByText('Après une nuit', { exact: true }) });
  await expect(nuit.locator('text.g-nom')).toHaveText(['Mal', 'Moyen', 'Bien']);
  await expect(nuit.locator('rect.g-emo')).toHaveCount(2);
  // « Selon le mois », période Tout (depuis juillet) : les mois qui n'ont que des notes n'ont pas de ligne vide, comme
  // dans le tableau.
  const mois = page.locator('figure.graphe', { has: page.getByText('Selon le mois', { exact: true }) });
  await expect(mois.getByRole('img', { name: /^Selon le mois, sur tout ce que tu as noté : / })).toBeVisible();
  await expect(mois.locator('text.g-nom')).toHaveText(['Octobre 2026']);
  await mois.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(mois.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
});

// Le fond calculé d'un élément : celui du premier ancêtre opaque (approximation du plan v6.2, tâche 7).
const textesEtFonds = (loc) => loc.evaluateAll((els) => els.map((e) => {
  let f = e;
  let fond = 'rgb(0, 0, 0)';
  while (f) {
    const c = getComputedStyle(f).backgroundColor;
    if (c && c !== 'transparent' && !/rgba\(.*, 0\)$/.test(c)) { fond = c; break; }
    f = f.parentElement;
  }
  const s = getComputedStyle(e);
  return { texte: e.textContent.trim(), couleur: e instanceof SVGElement ? s.fill : s.color, fond };
}));

test('AA des textes de l\'Analyse (2b), en clair et en sombre : portes, tuiles, étiquettes de rangées, légendes', async ({ page }) => {
  await quatorzeJours(page);
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-17', { pointsPositifs: 'une marche au parc' }));
  for (const [schema, t] of [['light', clair], ['dark', sombre]]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/analyse');
    await expect(page.getByRole('region', { name: 'Ma semaine' })).toBeVisible();
    // « Tes points positifs » : le carré prend la couleur de sa rubrique hors de la liste groupée d'Aujourd'hui aussi
    // (rendu 2b-analyse), et l'icône s'y lit (3:1 au moins).
    const carre = await page.getByRole('region', { name: 'Ma semaine' }).locator('.repli-icone')
      .evaluate((e) => ({ fond: getComputedStyle(e).backgroundColor, icone: getComputedStyle(e).color }));
    expect(carre.fond, `${schema} : carré des points positifs`).toBe(rgb(t['c-positifs']));
    expect(contraste(carre.icone, carre.fond), `${schema} : icône des points positifs`).toBeGreaterThanOrEqual(3);
    const selecteurs = ['.porte-titre', '.tuile-titre', '.tuile-valeur', '.nom-famille', '.compte-famille', '.carte-entete .note-carte-interne',
      'text.g-etiquette', 'text.g-tete', '.legende-graphe > span', '.titre-section', '.graphe-titre'];
    for (const sel of selecteurs) {
      const mesures = await textesEtFonds(page.locator(`main ${sel}`));
      expect(mesures.length, `${schema} ${sel}`).toBeGreaterThan(0);
      for (const m of mesures) expect(contraste(m.couleur, m.fond), `${schema} ${sel} « ${m.texte} »`).toBeGreaterThanOrEqual(4.5);
    }
    // « Tous les chiffres » : des tuiles sans cadre, comme celles de Ma semaine (2b), au fond --surface sur celui de
    // l'écran ; leurs textes restent AA.
    // (L'écran reste le même d'un thème à l'autre : le repli peut être déjà ouvert.)
    const tous = page.getByRole('button', { name: /^Tous les chiffres/ });
    if (await tous.getAttribute('aria-expanded') !== 'true') await tous.click();
    const tuiles = page.locator('main .tuiles .tuile');
    await expect(tuiles.first()).toBeVisible();
    const styles = await tuiles.evaluateAll((els) => els.map((e) => {
      const s = getComputedStyle(e);
      return { bord: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].join(' '), fond: s.backgroundColor };
    }));
    for (const s of styles) expect(s, `${schema} : tuile de Tous les chiffres`).toEqual({ bord: '0px 0px 0px 0px', fond: rgb(t.surface) });
    for (const sel of ['.tuile-titre', '.tuile-valeur', '.tuile-detail']) {
      for (const m of await textesEtFonds(page.locator(`main .tuiles ${sel}`))) {
        expect(contraste(m.couleur, m.fond), `${schema} Tous les chiffres ${sel} « ${m.texte} »`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});
