import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { canaux, jetons } from '../aides/couleurs.js';

// v7 (6/9) · Les exports et les lectures d'un jour avec les émotions du moment (spec §5) : l'Export PSY (« émotions : … »
// et les comptes par famille), la Vue soignants et son PDF (barres empilées par famille), l'Après coup (« Ce jour-là »)
// et « En consultation ». Point de vigilance 5 : un jour qui mêle une ancienne note de 1 à 10 et une émotion garde les
// deux. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const repo = (page, f, arg) => page.evaluate(f, arg);
const RETIREES = /REPÈRES|journées à 7|à 4 ou moins|Sommeil et humeur|Tendances|Signal|ressembl|positi|négati/i;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Le 14 : le soir au bureau, une ancienne note (09:00, 6), puis deux émotions ; le 12 : une famille seule. La bascule à
// 4 h, dans les deux sens, avec des émotions notées nulle part ailleurs ce jour-là : le 15 à 1 h, c'est encore le 14
// (craintif) ; le 14 à 3 h, c'est encore le 13 (amusé). La semaine d'avant : une émotion le 6.
async function journeeMelee(page) {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-14', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-14', heure: '09:00', humeur: 6, energie: null });
    await r.humeurs.creer({ date: '2026-10-14', heure: '12:00', emotion: 'roue:colere:irrite', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-14', heure: '16:00', emotion: 'roue:serenite:calme', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '01:00', emotion: 'roue:peur:craintif', energie: null });
    await r.humeurs.creer({ date: '2026-10-14', heure: '03:00', emotion: 'roue:joie:amuse', energie: null });
    await r.humeurs.creer({ date: '2026-10-12', heure: '18:00', emotion: 'roue:tristesse', energie: null });
    await r.humeurs.creer({ date: '2026-10-06', heure: '10:00', emotion: 'roue:joie:amuse', energie: null });
  });
}

test('Export PSY : les émotions de chaque jour, l\'ancienne note gardée (vigilance 5), les comptes par famille, rien de retiré', async ({ page }) => {
  await journeeMelee(page);
  await aller(page, '#/export-psy');
  const apercu = page.getByLabel('Aperçu du texte');
  await expect(apercu).toContainText('PSY : fais-moi le récap');
  const texte = await apercu.textContent();
  expect(texte).toContain('lun 12/10 · émotions : tristesse\n  humeur du moment : 18:00 tristesse\n'
    + 'mar 13/10 · émotions : amusé\n  humeur du moment : 03:00 amusé\n'
    + 'mer 14/10 · Bureau · humeur 6 · émotions : irrité, calme, craintif\n'
    + '  humeur du moment : 09:00 6 · 12:00 irrité (énergie basse) · 16:00 calme · 01:00 craintif\n');
  expect(texte).toContain('cette semaine : humeur moyenne 6 (de 6 à 6) · jours au bureau 1 · émotions : colère 1 · tristesse 1 · joie 1 · peur 1 · sérénité 1\n');
  expect(texte).toContain('semaine d\'avant : émotions : joie 1\n');
  expect(texte).not.toMatch(RETIREES);
});

test('Après coup : « Ce jour-là » donne l\'ancienne note et les émotions du jour (bascule à 4 h), avec les points de leurs familles', async ({ page }) => {
  await journeeMelee(page);
  const id = await repo(page, async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-14', heure: '20:00', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 6 })).id);
  await aller(page, `#/apres-coup/${id}`);
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await vue.getByRole('button', { name: 'Passer' }).click();
  await expect(vue.getByRole('heading', { name: 'Ce jour-là, ce qui me fragilisait déjà…' })).toBeVisible();
  const phrase = vue.locator('.phrase-resume');
  // Le 15 à 1 h (craintif) en est, le 14 à 3 h (amusé) n'en est pas.
  await expect(phrase).toHaveText('Ce jour-là : Bureau · humeur 6 · irrité, calme, craintif');
  const points = phrase.locator('.familles-jour');
  await expect(points).toHaveAttribute('aria-hidden', 'true');
  expect(await points.locator('i').evaluateAll((els) => els.map((e) => e.className))).toEqual(['emo-colere', 'emo-serenite', 'emo-peur']);
  // Un jour sans émotion ne parle pas d'émotions.
  const autre = await repo(page, async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-08', heure: '20:00', emotion: 'emotion:colere' })).id);
  await aller(page, `#/apres-coup/${autre}`);
  await vue.getByRole('button', { name: 'Passer' }).click();
  await expect(vue.getByRole('heading', { name: 'Ce jour-là, ce qui me fragilisait déjà…' })).toBeVisible();
  await expect(vue.locator('.phrase-resume')).toHaveCount(0);
});

test('En consultation : les émotions des 30 jours par famille ; « Humeur (notes) » seulement avec d\'anciennes notes', async ({ page }) => {
  await journeeMelee(page);
  const rdv = await repo(page, async () => (await window.__carnet.repo.rdv.creer({ date: '2026-10-20', professionnel: 'professionnel:psychiatre' })).id);
  await aller(page, `#/consultation/${rdv}`);
  const chiffres = page.locator('.chiffres-consultation');
  await expect(chiffres).toBeVisible();
  await expect(chiffres.locator('.libelle-chiffre')).toHaveText(['Humeur (notes)', 'Nuits Mal', 'Explosions', 'Épisodes']);
  const familles = chiffres.locator('.barres-familles li');
  await expect(familles.locator('.nom-famille')).toHaveText(['Colère', 'Tristesse', 'Joie', 'Peur', 'Sérénité']);
  await expect(familles.locator('.compte-famille')).toHaveText(['1', '1', '2', '1', '1']);
  await expect(chiffres).not.toContainText(/Humeur moyenne|%/);
  // Sans ancienne note : trois chiffres, sur toute la largeur.
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const h of await r.humeurs.tous()) if (h.humeur != null) await r.humeurs.supprimer(h.id);
  });
  await aller(page, '#/soins');
  await aller(page, `#/consultation/${rdv}`);
  await expect(chiffres.locator('.libelle-chiffre')).toHaveText(['Nuits Mal', 'Explosions', 'Épisodes']);
  const largeurs = await chiffres.locator('.cellule-chiffre').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  const grille = await chiffres.locator('.grille-chiffres').evaluate((e) => e.getBoundingClientRect().width);
  expect(largeurs.reduce((a, b) => a + b, 0)).toBeGreaterThan(grille - 3 * 8 - 2);
});

test('Vue soignants : la page porte les couleurs des familles, et le PDF d\'une page part', async ({ page }) => {
  test.setTimeout(90000);
  await installerPartageFactice(page);
  await page.reload();
  await journeeMelee(page);
  await aller(page, '#/soignants');
  const bouton = page.getByRole('button', { name: 'Partager en PDF' });
  await expect(bouton).toBeEnabled({ timeout: 20000 });
  // Chaque famille notée sur la frise se retrouve à sa couleur sur la page dessinée (barres et légende).
  const presentes = await page.locator('canvas.apercu-page').evaluate((c, couleurs) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const vues = new Set();
    for (let i = 0; i < d.length; i += 4) {
      for (const [nom, [r, g, b]] of Object.entries(couleurs)) if (Math.abs(d[i] - r) < 3 && Math.abs(d[i + 1] - g) < 3 && Math.abs(d[i + 2] - b) < 3) vues.add(nom);
    }
    return [...vues].sort();
  }, Object.fromEntries(['colere', 'tristesse', 'joie', 'serenite', 'peur', 'surprise'].map((f) => [f, canaux(clair[`c-emo-${f}`])])));
  expect(presentes).toEqual(['colere', 'joie', 'peur', 'serenite', 'tristesse']);
  await bouton.click();
  await expect.poll(async () => (await fichiersPartages(page)).length, { timeout: 30000 }).toBe(1);
  const [f] = await fichiersPartages(page);
  expect(f.type).toBe('application/pdf');
  const octets = Buffer.from(f.octets).toString('latin1');
  expect(octets.startsWith('%PDF-1.4')).toBe(true);
  expect(octets).toContain('/Count 1');
  expect(octets).toContain('/Width 1654 /Height 2339');
  expect(octets.trimEnd().endsWith('%%EOF')).toBe(true);
});
