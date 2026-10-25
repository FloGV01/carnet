import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { contraste } from '../aides/couleurs.js';
import { addDays } from '../../public/js/domain/dates.js';

// v8 (6/9) · Comprendre (spec §7 et §7 bis) : « Mes nuits » (Q15) dans Rythmes, nuit par nuit sur les 4 dernières
// semaines ; l'énergie haute et l'hyperfocus avant les jours à énergie basse (Q17) ; « Émotions selon ce que je faisais »
// (Q18), en nombres de relevés par famille. Graphiques seulement : aucune phrase calculée, aucun pourcentage.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-15';
const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
const repo = (page, f, arg) => page.evaluate(f, arg);
const groupe = (page, nom) => page.getByRole('group', { name: nom, exact: true });
const bouton = (page, nom, libelle) => groupe(page, nom).getByRole('button', { name: `${nom} : ${libelle}`, exact: true });
const carte = (page, titre) => page.locator('figure.graphe', { has: page.getByText(titre, { exact: true }) });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Des nuits des 5 dernières semaines : heures et qualité, la qualité seule, les heures seules, une nuit d'avant la v8 (coucher
// et lever), une nuit non notée, et une nuit d'avant la fenêtre des 4 semaines.
const NUITS = [
  [addDays(AUJ, -30), { sommeilRessenti: 'sommeil:bien', heuresSommeil: 9 }], // avant les 4 semaines
  [addDays(AUJ, -27), { sommeilRessenti: 'sommeil:mal', heuresSommeil: 5 }], // le premier jour de la fenêtre
  [addDays(AUJ, -20), { sommeilRessenti: 'sommeil:moyen', heureCoucher: '23:30', heureLever: '07:10' }],
  [addDays(AUJ, -12), { sommeilRessenti: 'sommeil:bien' }],
  [addDays(AUJ, -9), { lieu: 'lieu:bureau' }], // un soir sans rien sur la nuit
  [addDays(AUJ, -5), { heuresSommeil: 4 }],
  [addDays(AUJ, -1), { sommeilRessenti: 'sommeil:bien', heuresSommeil: 10 }],
  [AUJ, { sommeilRessenti: 'sommeil:mal', heuresSommeil: 6 }],
];
const verserNuits = (page, nuits = NUITS) => repo(page, async (liste) => {
  for (const [date, champs] of liste) await window.__carnet.repo.journal.patch(date, champs);
}, nuits);

test('Mes nuits : une ligne par nuit notée des 4 dernières semaines, au-dessus de « Tes nuits selon le jour », quelle que soit la période', async ({ page }) => {
  await verserNuits(page);
  await aller(page, '#/comprendre/rythmes');
  const nuits = carte(page, 'Mes nuits');
  const svg = nuits.getByRole('img', { name: /^Mes nuits, sur les quatre dernières semaines : une ligne par nuit notée/ });
  await expect(svg).toBeVisible();
  await expect(nuits.locator('.graphe-droite')).toHaveText('4 dernières semaines');
  // Au-dessus de « Tes nuits selon le jour ».
  const [haut, bas] = await Promise.all([nuits.boundingBox(), carte(page, 'Tes nuits selon le jour').boundingBox()]);
  expect(haut.y + haut.height).toBeLessThanOrEqual(bas.y);

  // Six nuits notées : ni celle d'avant la fenêtre, ni le soir sans nuit. Le jour à gauche, le texte de la nuit à droite.
  const textes = await svg.locator('text').allTextContents();
  const jours = textes.filter((t) => /^\S+ \d{2}\/\d{2}$/.test(t));
  expect(jours).toEqual(['ven 18/09', 'ven 25/09', 'sam 03/10', 'sam 10/10', 'mer 14/10', 'jeu 15/10']);
  for (const t of ['Mal · 5 h', 'Moyen · 7 h 40', 'Bien', '4 h ou moins', 'Bien · 10 h ou plus', 'Mal · 6 h', '0 h', '4 h', '8 h', '12 h']) expect(textes).toContain(t);
  expect(textes).not.toContain('Bien · 9 h');
  // Une barre par nuit qui a sa durée : à la teinte de sa qualité, creuse sans qualité ; la qualité seule n'en a pas.
  await expect(svg.locator('rect')).toHaveCount(5);
  await expect(svg.locator('rect.g-sommeil-1')).toHaveCount(2);
  await expect(svg.locator('rect.g-sommeil-2')).toHaveCount(1);
  await expect(svg.locator('rect.g-sommeil-3')).toHaveCount(1);
  await expect(svg.locator('rect.g-barre-creuse')).toHaveCount(1);
  await expect(nuits.locator('.legende-graphe')).toContainText('qualité non notée');
  // 10 h est plus longue que 6 h, elle-même plus longue que 4 h.
  const largeur = async (texte) => {
    const i = textes.indexOf(texte);
    const lignes = await svg.locator('rect').evaluateAll((rs) => rs.map((r) => ({ y: Number(r.getAttribute('y')), l: Number(r.getAttribute('width')) })));
    const y = Number(await svg.locator('text').nth(i).getAttribute('y'));
    return lignes.find((r) => Math.abs(r.y + 4 - y) < 1).l;
  };
  const [dix, six, quatre] = [await largeur('Bien · 10 h ou plus'), await largeur('Mal · 6 h'), await largeur('4 h ou moins')];
  expect(dix).toBeGreaterThan(six);
  expect(six).toBeGreaterThan(quatre);

  // « Voir en tableau » : une ligne par nuit notée, la qualité et la durée.
  await nuits.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(nuits.getByRole('columnheader')).toHaveText(['Jour', 'Qualité', 'Durée']);
  await expect(nuits.locator('tbody tr')).toHaveText([
    /vendredi 18 sept\.\s*Mal\s*5 h/, /vendredi 25 sept\.\s*Moyen\s*7 h 40/, /samedi 3 oct\.\s*Bien/, /samedi 10 oct\.\s*4 h ou moins/,
    /mercredi 14 oct\.\s*Bien\s*10 h ou plus/, /jeudi 15 oct\.\s*Mal\s*6 h/,
  ]);
  await nuits.getByRole('button', { name: 'Voir le graphe' }).click();

  // La période ne change rien à Mes nuits.
  await bouton(page, 'Période', '3 mois').click();
  await expect(nuits.getByRole('img', { name: /^Mes nuits, sur les quatre dernières semaines : / })).toBeVisible();
  await expect(nuits.locator('svg[role="img"] rect')).toHaveCount(5);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Mes nuits sous son seuil : sans nuit qui a sa durée, « Pas encore assez » et sa règle ; une nuit avec ses heures suffit', async ({ page }) => {
  await verserNuits(page, [[addDays(AUJ, -3), { sommeilRessenti: 'sommeil:mal' }], [addDays(AUJ, -40), { heuresSommeil: 7 }]]);
  await aller(page, '#/comprendre/rythmes');
  const nuits = carte(page, 'Mes nuits');
  await expect(nuits).toContainText(PAS_ASSEZ);
  await nuits.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(nuits.locator('.encadre-regle')).toHaveText('La règle : au moins une nuit notée avec sa durée sur les 4 dernières semaines.');
  await expect(nuits.getByRole('button', { name: 'Voir en tableau' })).toHaveCount(0);

  await verserNuits(page, [[addDays(AUJ, -2), { heuresSommeil: 7 }]]);
  await aller(page, '#/analyse');
  await aller(page, '#/comprendre/rythmes');
  await expect(nuits.getByRole('img', { name: /^Mes nuits, / })).toBeVisible();
  await expect(nuits.locator('svg[role="img"] rect')).toHaveCount(1);
  expect(await nuits.locator('svg[role="img"] text').allTextContents()).toEqual(expect.arrayContaining(['lun 12/10', 'Mal', 'mar 13/10', '7 h']));
});

test('Mes nuits, en clair et en sombre : chaque texte a au moins 4,5:1 sur la carte, le contour de la barre « Mal » 2:1 ; rien ne sort de l\'écran', async ({ page }) => {
  await verserNuits(page);
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/comprendre/rythmes');
    const nuits = carte(page, 'Mes nuits');
    await nuits.scrollIntoViewIfNeeded();
    const fond = await nuits.evaluate((e) => getComputedStyle(e).backgroundColor);
    const couleurs = await nuits.locator('svg text').evaluateAll((ts) => ts.map((t) => [t.textContent, getComputedStyle(t).fill]));
    for (const [texte, couleur] of couleurs) expect(contraste(couleur, fond), `${schema} : « ${texte} »`).toBeGreaterThanOrEqual(4.5);
    // Le pas « Mal » de la rampe est trop clair sur la carte (1,5:1 en clair, 1,8:1 en sombre) : ses deux barres et sa case
    // de légende ont un contour d'au moins 2:1 (skill dataviz), les autres pas.
    const contours = await nuits.locator('rect.g-sommeil-1').evaluateAll((rs) => rs.map((r) => { const s = getComputedStyle(r); return [s.stroke, parseFloat(s.strokeWidth)]; }));
    expect(contours, schema).toHaveLength(3);
    for (const [trait, epaisseur] of contours) {
      expect(trait, schema).not.toBe('none');
      expect(epaisseur, schema).toBeGreaterThanOrEqual(1);
      expect(contraste(trait, fond), `${schema} : contour de la barre « Mal »`).toBeGreaterThanOrEqual(2);
    }
    expect(await nuits.locator('rect.g-sommeil-2, rect.g-sommeil-3').evaluateAll((rs) => rs.map((r) => getComputedStyle(r).stroke)), schema).toEqual(['none', 'none', 'none', 'none']);
    const debord = await nuits.evaluate((f) => {
      const c = f.getBoundingClientRect();
      return [...f.querySelectorAll('svg text, svg rect')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < c.left - 0.5 || r.right > c.right + 0.5; }).map((e) => e.textContent);
    });
    expect(debord, schema).toEqual([]);
  }
});

test('Q17 · Avant mes jours à énergie basse : « Énergie haute notée » et « Hyperfocus », lus à leur décalage', async ({ page }) => {
  // Jours bas : 03, 08, 13 oct. ; énergie haute l'avant-veille ; hyperfocus (le symptôme) la veille ; un soir noté chaque jour.
  await repo(page, async () => {
    const r = window.__carnet.repo;
    const ajout = (d, n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    for (let i = 0; i < 15; i += 1) await r.journal.patch(ajout('2026-10-01', i), { lieu: 'lieu:teletravail' });
    for (const d of ['2026-10-03', '2026-10-08', '2026-10-13']) {
      await r.humeurs.creer({ date: d, heure: '15:00', energie: 'energie:basse' });
      await r.humeurs.creer({ date: ajout(d, -2), heure: '15:00', energie: 'energie:haute' });
      await r.humeurs.creer({ date: ajout(d, -1), heure: '15:00', energie: 'energie:moyenne' });
      await r.symptomes.creer({ date: ajout(d, -1), symptome: 'symptome:hyperfocus', intensite: 6 });
    }
  });
  await aller(page, '#/comprendre/energie');
  const avant = carte(page, 'Avant mes jours à énergie basse');
  await expect(avant.getByRole('group', { name: /^Avant mes jours à énergie basse, sur tout ce que tu as noté : / })).toBeVisible();
  const titres = await avant.locator('text.g-titre-bloc').allTextContents();
  expect(titres.slice(0, 6)).toEqual(['Nuit notée Mal', 'Contact coûteux', 'Journée au bureau', 'Explosion', 'Énergie haute notée', 'Hyperfocus']);
  await avant.getByRole('button', { name: 'Voir en tableau' }).click();
  const groupeDe = (nom) => avant.locator('tbody', { has: page.getByRole('rowheader', { name: nom, exact: true }) });
  await expect(groupeDe('Énergie haute notée').getByRole('row', { name: /^2 jours avant/ })).toContainText('3 sur 3');
  await expect(groupeDe('Hyperfocus').getByRole('row', { name: /^La veille/ })).toContainText('3 sur 3');
  await expect(groupeDe('Hyperfocus').getByRole('row', { name: /^Le jour même/ })).toContainText('0 sur 3');
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
});

test('Q18 · Émotions selon ce que je faisais : sous 5 relevés, sa règle ; puis une barre par activité, par famille, en nombres', async ({ page }) => {
  const verser = (liste) => repo(page, async (x) => {
    for (const h of x) await window.__carnet.repo.humeurs.creer({ energie: null, ...h });
  }, liste);
  await verser([
    { date: '2026-10-12', heure: '09:00', emotion: 'roue:colere:irrite', faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] },
    { date: '2026-10-12', heure: '12:00', emotion: 'roue:serenite:calme', faisais: ['activiteMoment:repos'] },
    { date: '2026-10-13', heure: '10:00', emotion: 'roue:peur:preoccupe', faisais: ['activiteMoment:travail'] },
    { date: '2026-10-13', heure: '18:00', emotion: 'roue:joie:curieux' }, // sans activité : n'entre pas
  ]);
  await aller(page, '#/comprendre/energie');
  const q18 = carte(page, 'Émotions selon ce que je faisais');
  await expect(q18).toContainText(PAS_ASSEZ);
  await q18.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(q18.locator('.encadre-regle')).toHaveText('La règle : au moins 5 émotions du moment notées sur la période, avec « Ce que je faisais ».');

  await verser([
    { date: '2026-10-14', heure: '09:00', emotion: 'roue:colere:irrite', faisais: ['activiteMoment:travail'] },
    { date: '2026-10-15', heure: '01:30', emotion: 'roue:serenite:calme', faisais: ['activiteMoment:monde'], vers: true },
  ]);
  await aller(page, '#/analyse');
  await aller(page, '#/comprendre/energie');
  await expect(q18.getByRole('img', { name: /^Émotions selon ce que je faisais, sur tout ce que tu as noté : pour chaque activité/ })).toBeVisible();
  // Dans l'ordre de la liste ; un relevé de deux activités compte pour chacune.
  await expect(q18.locator('text.g-nom')).toHaveText(['Travail', 'Trajet', 'Avec du monde', 'Repos']);
  expect(await q18.locator('svg text.g-axe').allTextContents()).toEqual(['3 relevés', '1 relevé', '1 relevé', '1 relevé']);
  await expect(q18.locator('rect.g-emo')).toHaveCount(5);
  await expect(q18.locator('.legende-graphe')).toHaveText(/Colère\s*Peur\s*Sérénité/);
  await q18.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(q18.getByRole('columnheader')).toHaveText(['Activité', 'Familles', 'Relevés']);
  await expect(q18.locator('tbody tr')).toHaveText([/Travail\s*colère 2 · peur 1\s*3/, /Trajet\s*colère 1\s*1/, /Avec du monde\s*sérénité 1\s*1/, /Repos\s*sérénité 1\s*1/]);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
