import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { addDays } from '../../public/js/domain/dates.js';
import { ZONES, zoneDe } from '../../public/js/domain/carte-roue.js';

// v9 (7/8) · L'Analyse, carte « Tes zones » (spec §8 et §13.2) : juste après « Tes émotions » (Ma semaine), en tête de ce
// que règle la période. Les quatre bulles de l'émotion en petit, chacune avec son nombre de relevés de la période ; dessous,
// la barre par semaine sur les 12 dernières semaines (4 couleurs empilées, phrase-résumé, « Voir en tableau »). Seuls
// comptent les relevés dont le mot a une zone ; sous 5 relevés, « Pas encore assez de données pour le dire. ». Ni
// pourcentage, ni NaN, ni undefined. Données inventées. Horloge : dimanche 18 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-18';
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const THEMES = [['light', clair], ['dark', sombre]];
const repo = (page, f, arg) => page.evaluate(f, arg);
const periode = (page, nom) => page.getByRole('group', { name: 'Période' }).getByRole('button', { name: nom });
const carteZones = (page) => page.getByRole('region', { name: 'Tes zones' });
const bulles = (page) => carteZones(page).getByRole('list', { name: 'Relevés par zone, sur la période' });
const parSemaine = (page) => carteZones(page).locator('figure.g-zones-semaines');
const sansInsecable = (t) => t.replace(/ /g, ' ');

// Un mot à soi (méta motsPerso), vert et sans famille : il compte dans sa zone.
const PERSO = 'roue:perso:u-0a1b2c3d';
const MOT = { libelle: 'Flottant', zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-04-01T08:00:00.000Z' };
const META = { [PERSO]: MOT };
// Rouge, jaune, bleu, vert, Fatigué (bleu, sans famille), une famille seule de la v7 (sans zone), rouge, le mot à soi.
const MOTS = ['roue:colere:irrite', 'roue:joie:fier', 'roue:tristesse:triste', 'roue:serenite:calme', 'roue:aucune:fatigue', 'roue:colere', 'roue:peur:anxieux', PERSO];
const HEURES = ['09:30', '14:10', '19:45'];
// 180 jours jusqu'à aujourd'hui : 1 à 3 relevés par jour.
const RELEVES = Array.from({ length: 180 }, (_, i) => {
  const date = addDays(AUJ, -i);
  return Array.from({ length: (i % 3) + 1 }, (__, k) => ({ date, heure: HEURES[k], emotion: MOTS[(i + k * 3) % MOTS.length] }));
}).flat();
// Les comptes attendus, recalculés ici : par zone, depuis `du`.
const attendu = (du, releves = RELEVES) => {
  const n = Object.fromEntries(ZONES.map((z) => [z, 0]));
  for (const r of releves) { const z = zoneDe(r.emotion, META); if (z && r.date >= du && r.date <= AUJ) n[z] += 1; }
  return n;
};
const releves = (n) => `${n} relevé${n > 1 ? 's' : ''}`;
const LIGNES = { rouge: 'Énergie haute Désagréable', jaune: 'Énergie haute Agréable', bleu: 'Énergie basse Désagréable', vert: 'Énergie basse Agréable' };
const texteBulles = (n) => ZONES.map((z) => `${LIGNES[z]} ${releves(n[z])}`);

async function charger(page, liste, { note = false } = {}) {
  await repo(page, async ([l, perso, meta, avecNote]) => {
    const r = window.__carnet.repo;
    await r.meta.ecrire('motsPerso', { [perso]: meta });
    for (const x of l) await r.humeurs.creer({ ...x, energie: 'energie:moyenne' });
    // Une ancienne note de 1 à 10 et une énergie seule : jamais dans une zone.
    if (avecNote) {
      await r.humeurs.creer({ date: '2026-10-17', heure: '11:00', humeur: 6, energie: null });
      await r.humeurs.creer({ date: '2026-10-17', heure: '12:00', energie: 'energie:basse' });
    }
  }, [liste, PERSO, MOT, note]);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 18, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('avec 180 jours inventés : Tes zones après le sélecteur, 4 bulles et leurs relevés selon la période, la barre par semaine sur 12 semaines', async ({ page }) => {
  await charger(page, RELEVES, { note: true });
  await aller(page, '#/analyse');
  await expect(carteZones(page)).toBeVisible({ timeout: 15000 });

  // À sa place : juste après « Tes émotions » (Ma semaine), puis le sélecteur de période qui la règle, et avant Mes jours.
  expect(await page.evaluate(() => {
    const carte = document.querySelector('section.tes-zones');
    return [carte.previousElementSibling.className, carte.nextElementSibling.querySelector('.graphe-titre').textContent,
      Boolean(document.querySelector('section.ma-semaine .tuile-emotions')) && document.querySelector('section.ma-semaine').compareDocumentPosition(carte) === Node.DOCUMENT_POSITION_FOLLOWING];
  })).toEqual(['selecteur-periode', 'Mes jours', true]);

  // Les quatre bulles, dans l'ordre des zones : leur nom, puis le nombre de relevés de la période (30 j par défaut).
  const items = bulles(page).getByRole('listitem');
  await expect(items).toHaveCount(4);
  await expect(items).toHaveText(texteBulles(attendu(addDays(AUJ, -29))), { useInnerText: true });
  await periode(page, '7 j').click();
  await expect(items).toHaveText(texteBulles(attendu(addDays(AUJ, -6))), { useInnerText: true });
  await periode(page, 'Tout').click();
  await expect(items).toHaveText(texteBulles(attendu('0000-01-01')), { useInnerText: true });
  // Ni Fatigué ni le mot à soi ne sont perdus : la famille seule et la note, seules, ne comptent pas.
  const tout = attendu('0000-01-01');
  expect(ZONES.reduce((s, z) => s + tout[z], 0)).toBe(RELEVES.filter((r) => r.emotion !== 'roue:colere').length);

  // La barre par semaine : toujours les 12 dernières semaines, quelle que soit la période.
  const lundis = Array.from({ length: 12 }, (_, i) => addDays('2026-10-12', -7 * (11 - i)));
  const douze = attendu(lundis[0]);
  const figure = parSemaine(page);
  await expect(figure.locator('.graphe-titre')).toHaveText('Par semaine');
  await expect(figure.locator('.graphe-droite')).toHaveText('12 dernières semaines');
  expect(sansInsecable(await figure.locator('.graphe-resume').textContent()))
    .toBe(`Relevés de ces 12 semaines : rouge ${douze.rouge} · jaune ${douze.jaune} · bleu ${douze.bleu} · vert ${douze.vert}.`);
  await expect(figure.getByRole('img')).toHaveAttribute('aria-label', /^Tes zones par semaine, sur les 12 dernières semaines : une barre par semaine, découpée par zone, longue comme le nombre de relevés\./);
  await expect(figure.locator('rect.g-zone')).toHaveCount(12);
  for (const z of ZONES) await expect(figure.locator(`rect.g-emo.zone-${z}`)).toHaveCount(12);
  await expect(figure.locator('text.g-axe')).toHaveText(['3/08', '17/08', '31/08', '14/09', '28/09', '12/10']);
  await expect(figure.locator('.legende-frise')).toHaveText(/Énergie haute · désagréable\s*Énergie haute · agréable\s*Énergie basse · désagréable\s*Énergie basse · agréable/);
  await expect(figure.locator('.pied-section')).toHaveText('Seuls comptent les relevés qui ont un mot : une famille seule ou une ancienne note de 1 à 10 n\'a pas de zone.');

  // Une semaine touchée : ses comptes, dans l'ordre des zones, sans zéro.
  await figure.locator('rect.g-zone').last().click();
  const semaine = attendu('2026-10-12');
  const detail = await figure.locator('.detail-colonne').textContent();
  expect(sansInsecable(detail)).toBe(`semaine du 12/10 · ${ZONES.filter((z) => semaine[z]).map((z) => `${z} ${semaine[z]}`).join(' · ')}`);
  // v8 (Q29) : « · » tient à ce qui le précède, le premier aussi (espace insécable) : il ne commence jamais une ligne.
  expect(detail).toContain('12/10\u00a0·');
  expect(detail).not.toMatch(/(^|[^\u00a0])·/);
  // « Voir en tableau » : une ligne par semaine, son nombre de relevés.
  await figure.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(figure.getByRole('row')).toHaveCount(13);
  await expect(figure.getByRole('row').last()).toHaveText(/^semaine du 12\/10.*\d+$/);
  await expect(figure.getByRole('columnheader')).toHaveText(['Semaine', 'Zones', 'Relevés']);

  await expect(carteZones(page)).not.toContainText(/%|NaN|undefined|null|Infinity/);
  await expect(page.locator('main')).not.toContainText(/%|NaN|undefined/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Tes zones en clair et en sombre : bulles aux couleurs de l\'écran 1, texte noir AA, barres aux jetons de zone', async ({ page }) => {
  await charger(page, RELEVES.filter((r) => r.date >= addDays(AUJ, -40)));
  await aller(page, '#/analyse');
  await expect(carteZones(page)).toBeVisible({ timeout: 15000 });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    // Chaque bulle : un disque de sa couleur médiane (visuel §1.6), le texte noir à 4,5:1 au moins sur ses trois arrêts.
    const faces = await bulles(page).locator('.face').evaluateAll((els) => els.map((e) => {
      const s = getComputedStyle(e);
      const b = getComputedStyle(e.closest('li'));
      const r = e.getBoundingClientRect();
      return { fond: s.backgroundColor, texte: s.color, haut: b.getPropertyValue('--haut').trim(), bas: b.getPropertyValue('--bas').trim(), rond: s.borderRadius, l: r.width, h: r.height };
    }));
    expect(faces.map((f) => f.fond), schema).toEqual(['#fe4c40', '#ffd04c', '#789fff', '#4ce39b'].map(rgb));
    for (const f of faces) {
      for (const c of [f.fond, f.haut, f.bas]) expect(contraste(f.texte, c), `${schema} ${c}`).toBeGreaterThanOrEqual(4.5);
      expect(f.l, schema).toBeGreaterThanOrEqual(100);
      expect(Math.abs(f.l - f.h)).toBeLessThan(0.5);
      expect(f.rond).toBe('50%');
    }
    // Les barres : la couleur de leur zone (jetons de tokens.css), sur la carte ; la légende aussi.
    const figure = parSemaine(page);
    for (const z of ZONES) {
      const fill = await figure.locator(`rect.g-emo.zone-${z}`).first().evaluate((e) => getComputedStyle(e).fill);
      expect(fill, `${schema} ${z}`).toBe(rgb(t[`c-zone-${z}`]));
    }
    const fond = await carteZones(page).evaluate((e) => getComputedStyle(e).backgroundColor);
    for (const z of ZONES) expect(contraste(rgb(t[`c-zone-${z}`]), fond), `${schema} ${z}`).toBeGreaterThanOrEqual(3);
  }
});

test('sous le seuil : « Pas encore assez de données pour le dire. », et « Pourquoi ? » dit que seuls les relevés avec un mot comptent ; rien sans zone', async ({ page }) => {
  // Trois relevés avec un mot cette semaine, et des familles seules (v7) : sous les 5 relevés, sur la période comme sur
  // les 12 semaines.
  await charger(page, [
    { date: '2026-10-17', heure: '09:00', emotion: 'roue:colere:irrite' }, { date: '2026-10-16', heure: '09:00', emotion: 'roue:aucune:fatigue' },
    { date: '2026-10-15', heure: '09:00', emotion: PERSO },
    ...['2026-10-14', '2026-10-13', '2026-10-12'].map((date) => ({ date, heure: '09:00', emotion: 'roue:colere' })),
  ]);
  await aller(page, '#/analyse');
  const carte = carteZones(page);
  await expect(carte).toBeVisible({ timeout: 15000 });
  await expect(carte).toContainText('Pas encore assez de données pour le dire.');
  await expect(carte.getByRole('list')).toHaveCount(0);
  await expect(carte.locator('figure')).toHaveCount(0);
  await carte.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(carte.locator('.encadre-regle')).toHaveText('La règle : au moins 5 émotions du moment notées avec un mot sur la période. Seuls comptent les relevés qui ont un mot : une famille seule ou une ancienne note de 1 à 10 n\'a pas de zone.');
  await expect(carte).not.toContainText(/\d+ relevés?|%|NaN|undefined/);
});

test('sous le seuil sur la période, assez sur les 12 semaines : la règle, puis la barre par semaine', async ({ page }) => {
  // Six relevés il y a 5 semaines : rien sur 7 j ni sur 30 j, assez sur les 12 semaines ; sur 3 mois, les bulles.
  await charger(page, Array.from({ length: 6 }, (_, i) => ({ date: addDays('2026-09-10', i), heure: '10:00', emotion: MOTS[i % 4] })));
  await aller(page, '#/analyse');
  const carte = carteZones(page);
  await expect(carte).toBeVisible({ timeout: 15000 });
  await expect(carte.locator('p.texte-secondaire')).toHaveText(/^Pas encore assez de données pour le dire\./);
  await expect(parSemaine(page).getByRole('img')).toBeVisible();
  await expect(parSemaine(page).locator('rect.g-zone')).toHaveCount(2);
  await periode(page, '3 mois').click();
  await expect(bulles(page).getByRole('listitem')).toHaveText(texteBulles({ rouge: 2, jaune: 2, bleu: 1, vert: 1 }), { useInnerText: true });
  await expect(carte.getByText('Pas encore assez de données pour le dire.')).toHaveCount(0);
});

test('assez sur la période, sous le seuil sur les 12 semaines : les bulles, puis « Par semaine » et sa règle ; une seule règle sous les deux seuils', async ({ page }) => {
  // Six relevés en mai (Fatigué, le mot à soi, Anxieux) : « Tout » a ses bulles ; les 12 dernières semaines n'ont rien.
  await charger(page, Array.from({ length: 6 }, (_, i) => ({ date: addDays('2026-05-04', i), heure: '10:00', emotion: [MOTS[4], PERSO, MOTS[6]][i % 3] })));
  await aller(page, '#/analyse');
  const carte = carteZones(page);
  await expect(carte).toBeVisible({ timeout: 15000 });
  // Sur 30 jours : rien sur la période, rien sur les 12 semaines, une seule règle.
  await expect(carte.getByText('Pas encore assez de données pour le dire.')).toHaveCount(1);
  await expect(carte.locator('figure')).toHaveCount(0);
  await periode(page, 'Tout').click();
  await expect(bulles(page).getByRole('listitem')).toHaveText(texteBulles({ rouge: 2, jaune: 0, bleu: 2, vert: 2 }), { useInnerText: true });
  const figure = parSemaine(page);
  await expect(figure.locator('.graphe-titre')).toHaveText('Par semaine');
  await expect(figure.getByRole('img')).toHaveCount(0);
  await figure.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(figure.locator('.encadre-regle')).toHaveText(/^La règle : au moins 5 émotions du moment notées avec un mot sur les 12 dernières semaines\. Seuls comptent/);
});

test('aucun relevé avec une zone (familles seules de la v7, notes de 1 à 10) : pas de carte « Tes zones »', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const date of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-13']) {
      await r.humeurs.creer({ date, heure: '10:00', emotion: 'roue:joie', energie: null });
      await r.humeurs.creer({ date, heure: '11:00', humeur: 6, energie: null });
    }
  });
  await aller(page, '#/analyse');
  await expect(page.getByRole('region', { name: 'Ma semaine' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('img', { name: /^Mes jours/ })).toBeVisible();
  await expect(carteZones(page)).toHaveCount(0);
});
