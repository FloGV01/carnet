import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v9 (3/8) · Couleurs de zone partout (spec §4.6 et §13.4) : un relevé prend la couleur de la zone de son mot ; l'en-tête
// d'Aujourd'hui, l'Historique et Après coup montrent un point par zone présente, sans doublon, dans l'ordre rouge, jaune,
// bleu, vert ; « Mes jours » en mode jour colore ses points par zone, avec la légende des 4 zones, et garde ses barres par
// famille par semaine. Point de vigilance 1 : un ancien relevé sans zone (famille seule de la v7, note de 1 à 10, énergie
// seule) s'affiche sans erreur, au point creux. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const THEMES = [['light', clair], ['dark', sombre]];
const ZONE_HAUTE = 'Émotions : énergie haute · désagréable, énergie haute · agréable, énergie basse · agréable';
// Un mot à soi (méta motsPerso), vert.
const PERSO = 'roue:perso:u-0a1b2c3d';
const MOT = { libelle: 'Flottant', zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-10-01T08:00:00.000Z' };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Le 15 : des relevés de trois zones (rouge deux fois, jaune, vert), une famille seule de la v7, une ancienne note, une
// énergie seule. Le 14 : rien qu'une famille seule. Un épisode le 15, pour Après coup.
async function journee(page) {
  return repo(page, async ([perso, mot]) => {
    const r = window.__carnet.repo;
    await r.meta.ecrire('motsPerso', { [perso]: mot });
    await r.journal.patch('2026-10-15', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '08:10', emotion: 'roue:serenite:calme', energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '09:30', emotion: 'roue:colere:furieux', energie: 'energie:haute' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '11:00', emotion: 'roue:serenite', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '12:00', emotion: 'roue:joie:fier', energie: 'energie:haute' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '13:00', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '15:00', emotion: 'roue:peur:accable', energie: 'energie:haute' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '17:00', emotion: perso, energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-14', heure: '18:00', emotion: 'roue:colere', energie: null });
    return (await r.episodes.creer({ date: '2026-10-15', heure: '19:00', emotion: 'emotion:colere', intensite: 5 })).id;
  }, [PERSO, MOT]);
}

test('Aujourd\'hui : un point par zone présente dans l\'en-tête, sans doublon, dans l\'ordre rouge, jaune, vert ; chaque relevé au point de sa zone, creux sans zone', async ({ page }) => {
  await journee(page);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    // L'en-tête : trois zones (le rouge noté deux fois n'a qu'un point), à leur couleur, lues par VoiceOver.
    const zones = page.getByRole('img', { name: ZONE_HAUTE });
    await expect(zones).toBeVisible();
    const points = await zones.locator('i').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    expect(points, schema).toEqual([rgb(t['c-zone-rouge']), rgb(t['c-zone-jaune']), rgb(t['c-zone-vert'])]);
    // Un point se voit sur le fond de l'écran (3:1 au moins).
    const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    for (const p of points) expect(contraste(p, fond), `${schema} ${p}`).toBeGreaterThanOrEqual(3);

    // Ma journée : le point de la zone du mot ; creux pour la note, la famille seule et l'énergie seule.
    await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
    const lignes = await page.locator('.liste-evenements > li .releve').evaluateAll((els) => els.map((li) => {
      const s = getComputedStyle(li.querySelector('.point-evenement'));
      return [li.querySelector('.resume').textContent, s.backgroundColor === 'rgba(0, 0, 0, 0)' ? `creux ${s.borderTopColor}` : s.backgroundColor];
    }));
    const creux = `creux ${rgb(t['text-2'])}`;
    expect(lignes, schema).toEqual([
      ['Calme · énergie moyenne', rgb(t['c-zone-vert'])],
      ['Furieux · énergie haute', rgb(t['c-zone-rouge'])],
      ['humeur 6', creux],
      ['Sérénité', creux],
      ['Fier · énergie haute', rgb(t['c-zone-jaune'])],
      ['énergie basse', creux],
      // Accablé, bleu en v8, est rouge en v9.
      ['Accablé · énergie haute', rgb(t['c-zone-rouge'])],
      // Le mot à soi : son nom et sa zone, lus dans la méta.
      ['Flottant · énergie basse', rgb(t['c-zone-vert'])],
    ]);
  }
  // Un jour qui n'a qu'une famille seule (v7) : ni point dans l'en-tête, ni erreur ; sa ligne au point creux.
  await aller(page, '#/jour/2026-10-14');
  await expect(page.locator('.liste-evenements > li')).toHaveText(['18:00Colère']);
  await expect(page.locator('.liste-evenements .point-evenement')).toHaveClass(/point-creux/);
  await expect(page.locator('.zones-jour')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|null|roue:/);
});

test('Historique et Après coup : les points des zones du jour, dans le même ordre, masqués à VoiceOver ; une famille seule n\'en a pas', async ({ page }) => {
  const episode = await journee(page);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/historique');
    const ligne = page.getByRole('link', { name: /jeudi 15 oct\./ });
    await expect(ligne.locator('.mots-jour')).toHaveText('calme, furieux…');
    const points = ligne.locator('.zones-jour');
    await expect(points).toHaveAttribute('aria-hidden', 'true');
    expect(await points.locator('i').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor)), schema)
      .toEqual([rgb(t['c-zone-rouge']), rgb(t['c-zone-jaune']), rgb(t['c-zone-vert'])]);
    // Le 14 n'a qu'une famille seule : son mot, sans point.
    const veille = page.getByRole('link', { name: /mercredi 14 oct\./ });
    await expect(veille.locator('.mots-jour')).toHaveText('colère');
    await expect(veille.locator('.zones-jour')).toHaveCount(0);
  }
  await aller(page, `#/apres-coup/${episode}`);
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await vue.getByRole('button', { name: 'Passer' }).click();
  const phrase = vue.locator('.phrase-resume');
  await expect(phrase).toContainText('calme, furieux, sérénité, fier, accablé, flottant');
  await expect(phrase.locator('.zones-jour')).toHaveAttribute('aria-hidden', 'true');
  expect(await phrase.locator('.zones-jour i').evaluateAll((els) => els.map((e) => e.className))).toEqual(['zone-rouge', 'zone-jaune', 'zone-vert']);
  await expect(vue).not.toContainText(/NaN|undefined|roue:/);
});

test('Mes jours en mode jour : un point par relevé à la couleur de sa zone, creux sans zone, la légende des 4 zones ; par semaine, les barres et la légende restent par famille', async ({ page }) => {
  await journee(page);
  const mesJours = page.locator('figure', { has: page.getByText('Mes jours', { exact: true }) });
  const graphe = mesJours.locator('svg[role="img"]');
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/analyse');
    await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: '7 j' }).click();
    // Le 15 : Calme, Furieux, Sérénité (creux), Fier, Accablé ; le mot à soi n'entre pas encore dans l'Analyse
    // (tâche 7). Le 14 : Colère (creux).
    const points = await graphe.locator('circle.g-emo, circle.g-creux').evaluateAll((els) => els.map((c) => {
      const s = getComputedStyle(c);
      return c.classList.contains('g-creux') ? `creux ${s.stroke}` : s.fill;
    }));
    expect(points.sort(), schema).toEqual([
      rgb(t['c-zone-vert']), rgb(t['c-zone-rouge']), `creux ${rgb(t['text-2'])}`, rgb(t['c-zone-jaune']), rgb(t['c-zone-rouge']), `creux ${rgb(t['text-2'])}`,
    ].sort());
    await expect(graphe.locator('[class*="emo-"]')).toHaveCount(0);
    const legende = mesJours.locator('.legende-frise');
    await expect(legende.locator(':scope > span')).toContainText([
      'Énergie haute · désagréable', 'Énergie haute · agréable', 'Énergie basse · désagréable', 'Énergie basse · agréable', 'sans zone',
    ]);
    expect(await legende.locator(':scope > span[class^="zone-"] circle').evaluateAll((els) => els.map((c) => getComputedStyle(c).fill)), schema)
      .toEqual(['rouge', 'jaune', 'bleu', 'vert'].map((z) => rgb(t[`c-zone-${z}`])));
    await expect(legende).not.toContainText('Colère');
    // Par semaine : des barres par famille (Colère, Joie, Peur, Sérénité), aucune couleur de zone, la légende des familles.
    await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: '3 mois' }).click();
    await expect(graphe.locator('circle.g-emo, circle.g-creux')).toHaveCount(0);
    await expect(graphe.locator('rect.g-emo')).not.toHaveCount(0);
    await expect(graphe.locator('[class*="zone-"]')).toHaveCount(0);
    await expect(legende).toContainText('Colère');
    await expect(legende).not.toContainText('Énergie haute');
  }
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
});
