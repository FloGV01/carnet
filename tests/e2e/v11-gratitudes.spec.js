import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, entreeDuJour } from '../aides/saisie.js';
import { canaux, jetons } from '../aides/couleurs.js';

// v11 (4/11) · Mes gratitudes (spec §6) : une carte juste sous « Mes points positifs », toujours visible, de même forme (une
// zone de texte, la dictée, l'enregistrement seul au fil de la frappe). Rien ne passe d'un jour à l'autre ; ni nombre, ni
// « Dit », ni partage. Elle se règle dans Réglages › Le soir (affichée par défaut ; pour une app déjà installée, elle arrive
// juste après les points positifs, où qu'ils soient), elle est citée sous « J'ai fini pour ce soir », visible et trouvée
// dans l'Historique, et relue dans un repli fermé « Tes gratitudes » de l'Analyse. Données inventées, sans prénom.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-15';
const VEILLE = '2026-10-14';
const CONSIGNE = 'Ce pour quoi je suis reconnaissant. À qui je dis merci.';
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const THEMES = [['light', clair], ['dark', sombre]];
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const noter = (page, jours) => repo(page, async (j) => { for (const [d, o] of j) await window.__carnet.repo.journal.patch(d, o); }, jours);
const lireJournee = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('journee'));
const ecrireJournee = (page, v) => page.evaluate((x) => window.__carnet.repo.meta.ecrire('journee', x), v);
const zone = (page) => page.locator('#gratitudes');
const carte = (page, id) => page.locator('.carte-champ', { has: page.locator(`#${id}`) });
// Les cartes du soir, dans l'ordre du document : l'id de leur zone de texte, ou leur titre.
const cartes = (page) => page.locator('main .carte-champ').evaluateAll((els) => els.map((e) => (e.querySelector('textarea') || {}).id || e.querySelector('.titre-rubrique, h2, h3')?.textContent.trim()));

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('la carte « Mes gratitudes » est juste sous les points positifs, de même forme : son titre, la consigne, deux lignes, la dictée ; ni nombre, ni « Dit », ni partage', async ({ page }) => {
  await expect(zone(page)).toBeVisible();
  const [pos, gr] = [carte(page, 'points-positifs'), carte(page, 'gratitudes')];
  // Juste dessous : la carte suivante dans le document, au même écart que les points positifs sous la carte d'avant.
  expect(await pos.evaluate((e) => e.nextElementSibling && e.nextElementSibling.querySelector('#gratitudes') !== null)).toBe(true);
  const [bp, bg, avant] = await Promise.all([pos.boundingBox(), gr.boundingBox(), pos.evaluate((e) => {
    const r = e.previousElementSibling.getBoundingClientRect();
    return { bas: r.bottom };
  })]);
  expect(Math.abs(bg.x - bp.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(bg.width - bp.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs((bg.y - (bp.y + bp.height)) - (bp.y - avant.bas))).toBeLessThanOrEqual(1);
  // De même forme : même hauteur au repos, la même carte (sans teinte depuis la v12), une zone de deux lignes avec sa consigne
  // et la dictée.
  expect(Math.abs(bg.height - bp.height)).toBeLessThanOrEqual(1);
  expect(await gr.getAttribute('class')).toBe(await pos.getAttribute('class'));
  await expect(gr).toHaveClass('champ-jour carte-champ');
  await expect(gr).toContainText('Mes gratitudes');
  await expect(zone(page)).toHaveAttribute('placeholder', CONSIGNE);
  await expect(zone(page)).toHaveAttribute('aria-label', 'Mes gratitudes');
  await expect(zone(page)).toHaveAttribute('rows', '2');
  await expect(zone(page)).toHaveValue('');
  await expect(gr.getByRole('button')).toHaveCount(1);
  await expect(gr.getByRole('button', { name: 'Dicter' })).toBeVisible();
  // Rien d'autre que son titre : ni nombre, ni « Dit », ni partage.
  expect((await gr.textContent()).trim()).toBe('Mes gratitudes');
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    // v12 (4/9) : plus de carré, l'icône de la rubrique en --text-2, la même que celle des points positifs.
    const [icone, iconePos] = await Promise.all([gr, pos].map((c) => c.locator('.tete-rubrique > svg').evaluate((e) => [getComputedStyle(e).color, e.innerHTML])));
    expect(icone[0], `${schema} : icône de la carte, neutre (v12)`).toBe(rgb(t['text-2']));
    expect(icone).toEqual(iconePos);
    await expect(gr.locator('.carre-rubrique')).toHaveCount(0);
  }
  // Rien n'est noté sans frappe.
  expect(await entreeDuJour(page)).toBeFalsy();
});

test('écrire s\'enregistre seul et se retrouve après rechargement ; rien ne passe à la veille ni au lendemain', async ({ page }) => {
  await zone(page).fill('Le café partagé avec la voisine.\nMerci au collègue.');
  await expect.poll(async () => (await entreeDuJour(page))?.gratitudes).toBe('Le café partagé avec la voisine.\nMerci au collègue.');
  expect((await entreeDuJour(page)).pointsPositifs).toBeNull();
  await page.reload();
  await expect(zone(page)).toHaveValue('Le café partagé avec la voisine.\nMerci au collègue.');
  // La veille, ouverte sans quitter l'écran : la zone est vide, et y écrire ne touche pas à aujourd'hui.
  await aller(page, `#/jour/${VEILLE}`);
  await expect(page.getByRole('link', { name: 'Revenir à aujourd\'hui' })).toBeVisible();
  await expect(zone(page)).toHaveValue('');
  await zone(page).fill('merci au facteur');
  await expect.poll(async () => (await entreeDuJour(page, VEILLE))?.gratitudes).toBe('merci au facteur');
  // Le lendemain de la veille, aujourd'hui : son propre texte.
  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('link', { name: 'Revenir à aujourd\'hui' })).toHaveCount(0);
  await expect(zone(page)).toHaveValue('Le café partagé avec la voisine.\nMerci au collègue.');
  expect((await entreeDuJour(page, AUJ)).gratitudes).toBe('Le café partagé avec la voisine.\nMerci au collègue.');
  // Le jour suivant : rien de la veille.
  await page.clock.setSystemTime(new Date(2026, 9, 16, 21, 0));
  await page.reload();
  await expect(page.getByRole('heading', { name: /vendredi 16 octobre/i })).toBeVisible();
  await expect(zone(page)).toHaveValue('');
  expect(await entreeDuJour(page, '2026-10-16')).toBeFalsy();
  // Plus aucun brouillon : tout est enregistré.
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith(':gratitudes')))).toEqual([]);
});

test('Réglages › Le soir : « Mes gratitudes » juste après « Mes points positifs », affichée, à l\'icône des points positifs ; elle se masque et se déplace', async ({ page }) => {
  await aller(page, '#/reglages/journee');
  await expect(page.getByRole('switch', { name: 'Afficher Mes gratitudes' })).toBeVisible();
  const libelles = await page.locator('.ma-journee .ligne-champ-reglage .ligne-libelle').allTextContents();
  expect(libelles.slice(7, 9)).toEqual(['Mes points positifs', 'Mes gratitudes']);
  await expect(page.getByRole('switch', { name: 'Afficher Mes gratitudes' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch')).toHaveCount(11);
  const ligne = (nom) => page.locator('.ma-journee .ligne-champ-reglage', { hasText: nom });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const [gr, pos] = await Promise.all(['Mes gratitudes', 'Mes points positifs'].map((n) => ligne(n).locator('.icone-ligne')
      .evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e.querySelector('svg')).color, e.querySelector('path').getAttribute('d')])));
    // L'icône seule, sans carré, en --text-2 (v12 : la rangée nomme une rubrique, elle n'ouvre rien), celle des points positifs.
    expect(gr.slice(0, 2), `${schema} : icône de Mes gratitudes`).toEqual(['rgba(0, 0, 0, 0)', rgb(t['text-2'])]);
    expect(gr).toEqual(pos);
  }
  // Montée d'un cran : avant les points positifs, ici et sur Aujourd'hui.
  await page.getByRole('button', { name: 'Monter Mes gratitudes' }).click();
  await expect.poll(async () => (await lireJournee(page)).ordre.slice(-2)).toEqual(['gratitudes', 'positifs']);
  await expect(page.locator('[data-fleche="gratitudes:-1"]')).toBeFocused();
  await aller(page, '#/aujourdhui');
  await expect(zone(page)).toBeVisible();
  expect((await cartes(page)).slice(-2)).toEqual(['gratitudes', 'points-positifs']);
  // Masquée : plus de carte, sauf un jour où elle porte un texte.
  await aller(page, '#/reglages/journee');
  await page.getByRole('switch', { name: 'Afficher Mes gratitudes' }).click();
  await expect.poll(async () => (await lireJournee(page)).masques).toContain('gratitudes');
  await aller(page, '#/aujourdhui');
  await expect(page.locator('#points-positifs')).toBeVisible();
  await expect(zone(page)).toHaveCount(0);
  await noter(page, [[AUJ, { gratitudes: 'merci au collègue' }]]);
  await page.reload();
  await expect(zone(page)).toHaveValue('merci au collègue');
});

test('une app déjà installée (ordre de la v10, réglé ou non) reçoit les gratitudes juste après les points positifs, pas à la fin', async ({ page }) => {
  const v10 = ['lieu', 'sommeil', 'humeur', 'contact', 'sport', 'explosions', 'traitement', 'positifs'];
  await ecrireJournee(page, { ordre: v10, masques: ['explosions', 'humeur', 'nuit'], heuresMoment: [] });
  await page.reload();
  await expect(zone(page)).toBeVisible();
  expect((await cartes(page)).slice(-2)).toEqual(['points-positifs', 'gratitudes']);
  // Les points positifs montés en tête : les gratitudes les suivent, en 2ᵉ.
  await ecrireJournee(page, { ordre: ['positifs', 'lieu', 'sommeil', 'humeur', 'contact', 'sport', 'explosions', 'traitement'], masques: ['explosions', 'humeur', 'nuit'], heuresMoment: [] });
  await page.reload();
  await expect(zone(page)).toBeVisible();
  expect((await cartes(page)).slice(0, 2)).toEqual(['points-positifs', 'gratitudes']);
  await aller(page, '#/reglages/journee');
  await expect(page.getByRole('switch', { name: 'Afficher Mes gratitudes' })).toHaveAttribute('aria-checked', 'true');
  expect((await page.locator('.ma-journee .ligne-champ-reglage .ligne-libelle').allTextContents()).slice(0, 2)).toEqual(['Mes points positifs', 'Mes gratitudes']);
  // Lire n'écrit rien : la méta garde son ordre jusqu'au premier réglage.
  expect((await lireJournee(page)).ordre).not.toContain('gratitudes');
});

test('« J\'ai fini pour ce soir » cite les points positifs, puis les gratitudes', async ({ page }) => {
  await page.locator('#points-positifs').fill('une marche au parc');
  await zone(page).fill('merci à la voisine pour le colis');
  await expect.poll(async () => (await entreeDuJour(page))?.gratitudes).toBe('merci à la voisine pour le colis');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('une marche au parc');
  await page.getByRole('button', { name: 'J\'ai fini pour ce soir' }).click();
  const soiree = page.getByRole('region', { name: 'Ta soirée' });
  await expect(soiree.locator('.fini-positifs')).toHaveText(['« une marche au parc »', '« merci à la voisine pour le colis »']);
  // Des gratitudes seules : une seule citation.
  await page.getByRole('button', { name: 'Rouvrir la saisie' }).click();
  await page.locator('#points-positifs').fill('');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBeNull();
  await page.getByRole('button', { name: 'J\'ai fini pour ce soir' }).click();
  await expect(soiree.locator('.fini-positifs')).toHaveText(['« merci à la voisine pour le colis »']);
});

test('Historique : la journée montre ses gratitudes après ses points positifs, et la recherche les trouve', async ({ page }) => {
  await noter(page, [
    [AUJ, { lieu: 'lieu:bureau', pointsPositifs: 'une marche au parc', gratitudes: 'merci au collègue' }],
    [VEILLE, { gratitudes: 'Merci à la voisine pour le colis gardé toute la journée' }],
  ]);
  await aller(page, '#/historique');
  await page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: /Jours/ }).click();
  const ligne = (jour) => page.locator('.ligne-hist', { hasText: jour });
  await expect(ligne('jeudi 15 oct.').locator('.hist-note')).toHaveText('« une marche au parc » · « merci au collègue »');
  // Une journée qui n'a que des gratitudes est dans l'Historique, son texte coupé au mot.
  await expect(ligne('mercredi 14 oct.').locator('.hist-note')).toHaveText('« Merci à la voisine pour le colis… »');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByLabel('Rechercher dans les textes').fill('VOISINE');
  await expect(page.locator('.ligne-hist')).toHaveCount(1);
  await expect(ligne('mercredi 14 oct.').locator('mark')).toHaveText('voisine');
  await page.getByLabel('Rechercher dans les textes').fill('collegue');
  await expect(page.locator('.ligne-hist')).toHaveCount(1);
  await expect(ligne('jeudi 15 oct.').locator('mark')).toHaveText('collègue');
});

test('Analyse : un repli fermé « Tes gratitudes », sous « Tes points positifs », les 2 plus récentes de la semaine avec leur jour, ni chiffre ni « Dit »', async ({ page }) => {
  // Une semaine qui n'a que des gratitudes : Ma semaine ne se tait pas.
  await noter(page, [
    ['2026-10-08', { gratitudes: 'merci au facteur, la semaine d\'avant' }],
    ['2026-10-10', { gratitudes: 'merci au voisin du dessous' }],
    ['2026-10-12', { gratitudes: 'merci à la voisine pour le colis' }],
    [VEILLE, { gratitudes: 'merci au collègue pour le café' }],
  ]);
  await aller(page, '#/analyse');
  const semaine = page.getByRole('region', { name: 'Ma semaine' });
  await expect(semaine).toBeVisible();
  const bouton = semaine.getByRole('button', { name: /^Tes gratitudes/ });
  await expect(bouton).toHaveAttribute('aria-expanded', 'false');
  await expect(semaine.getByRole('button', { name: /^Tes points positifs/ })).toHaveCount(0);
  await expect(semaine).not.toContainText('merci');
  await bouton.click();
  await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  const lignes = semaine.locator('.lignes-semaine li');
  await expect(lignes).toHaveText(['« merci au collègue pour le café » mercredi', '« merci à la voisine pour le colis » lundi']);
  const contenu = await semaine.locator('.repli', { has: page.getByRole('button', { name: /^Tes gratitudes/ }) }).textContent();
  expect(contenu).not.toMatch(/\d/);
  expect(contenu).not.toMatch(/\bDit\b/);
  // Avec des points positifs : leur repli d'abord, celui des gratitudes dessous ; fermés tous les deux à la réouverture.
  await noter(page, [[VEILLE, { pointsPositifs: 'une marche au parc' }]]);
  await aller(page, '#/aujourdhui');
  await aller(page, '#/analyse');
  await expect(semaine).toBeVisible();
  expect(await semaine.locator('.repli button[aria-expanded]').evaluateAll((bs) => bs.map((b) => [b.textContent.trim(), b.getAttribute('aria-expanded')])))
    .toEqual([['Tes points positifs', 'false'], ['Tes gratitudes', 'false']]);
});

// Relecture finale : un texte sans espace (un lien collé, 70 signes) ne passait pas à la ligne. Avec une telle gratitude,
// « J'ai fini » faisait 587 px de large, et l'Analyse, « Tes gratitudes » ouvert, 620 : la page défilait de côté. Les
// gratitudes et les points positifs cités passent à la ligne, comme les notes.
const SANS_ESPACE = `https://open.spotify.com/track/${'x7'.repeat(20).slice(0, 39)}`;
const largeurs = (page, selecteur) => page.evaluate((s) => ({
  page: document.documentElement.scrollWidth, ecran: innerWidth,
  dehors: [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).length,
}), selecteur);

test('une gratitude et des points positifs sans espace (70 signes) passent à la ligne : « J\'ai fini » et l\'Analyse, ses deux replis ouverts, ne défilent pas de côté', async ({ page }) => {
  expect(SANS_ESPACE).toHaveLength(70);
  expect(SANS_ESPACE).not.toMatch(/\s/);
  await noter(page, [[AUJ, { lieu: 'lieu:bureau', pointsPositifs: SANS_ESPACE, gratitudes: SANS_ESPACE }], [VEILLE, { pointsPositifs: SANS_ESPACE, gratitudes: SANS_ESPACE }]]);
  await page.reload();
  await page.getByRole('button', { name: 'J\'ai fini pour ce soir' }).click();
  const soiree = page.getByRole('region', { name: 'Ta soirée' });
  await expect(soiree.locator('.fini-positifs')).toHaveText([`« ${SANS_ESPACE} »`, `« ${SANS_ESPACE} »`]);
  expect(await largeurs(page, '.fini-positifs')).toEqual({ page: 390, ecran: 390, dehors: 0 });
  await aller(page, '#/analyse');
  const semaine = page.getByRole('region', { name: 'Ma semaine' });
  for (const nom of ['Tes points positifs', 'Tes gratitudes']) {
    const bouton = semaine.getByRole('button', { name: new RegExp(`^${nom}`) });
    await bouton.click();
    await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(semaine.locator('.lignes-semaine li')).toHaveCount(4);
  expect(await largeurs(page, '.lignes-semaine li')).toEqual({ page: 390, ecran: 390, dehors: 0 });
});

// Effacer puis « Annuler » perdait les textes du soir : les zones, nées avec l'ancienne entrée le temps de la relecture, se
// vidaient à l'arrivée de la nouvelle, puis enregistraient ce vide en partant, juste après la restauration (v11, corrigé).
test('effacer la journée vide aussi ses gratitudes, et « Annuler » les fait revenir, avec les points positifs et les notes', async ({ page }) => {
  const TEXTES = { pointsPositifs: 'une marche au parc', gratitudes: 'merci au collègue', notes: 'une note inventée' };
  await noter(page, [[AUJ, TEXTES]]);
  await page.reload();
  await page.getByRole('button', { name: /^Notes libres/ }).click();
  const valeurs = () => page.evaluate(() => ['#points-positifs', '#gratitudes', '#notes'].map((s) => document.querySelector(s).value));
  await expect.poll(valeurs).toEqual(Object.values(TEXTES));
  await page.getByRole('button', { name: 'Effacer cette journée' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Effacer', exact: true }).click();
  await expect(page.getByText('Journée effacée')).toBeVisible();
  // Aussitôt vides, sans repasser par l'ancien texte.
  expect(await valeurs()).toEqual(['', '', '']);
  await expect.poll(() => entreeDuJour(page)).toBeFalsy();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(valeurs).toEqual(Object.values(TEXTES));
  await page.clock.runFor(2000);
  const lue = await entreeDuJour(page);
  expect([lue.pointsPositifs, lue.gratitudes, lue.notes]).toEqual(Object.values(TEXTES));
  await page.reload();
  await expect(zone(page)).toHaveValue('merci au collègue');
  await expect(page.locator('#points-positifs')).toHaveValue('une marche au parc');
});
