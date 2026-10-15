import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Notes en vrac (spec §7.1) : un champ toujours prêt dans Soins › Notes, Retour ajoute la note, un toucher
// la modifie sur place, effacer le texte puis quitter la supprime (avec Annuler). Jamais dans le PDF, l'export
// PSY ni l'Analyse. Textes inventés pour le test (jamais de donnée réelle).
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const notes = (page) => page.evaluate(() => window.__carnet.repo.notes.tous());
const creerNote = (page, note) => page.evaluate((n) => window.__carnet.repo.notes.creer(n), note);
const ouvrirNotes = async (page) => {
  await page.getByRole('link', { name: 'Soins' }).click();
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Notes' }).click();
  await expect(champ(page)).toBeVisible();
};
const champ = (page) => page.getByRole('textbox', { name: 'Une idée, en vrac' });
const lignes = (page) => page.getByRole('list', { name: 'Notes' }).getByRole('listitem');
const texteDe = (ligne) => ligne.getByRole('textbox');
const annuler = (page) => page.getByRole('button', { name: 'Annuler' });

test('Soins a trois onglets, Notes ouvre un champ prêt, « Aucune note pour l\'instant. » sans note', async ({ page }) => {
  await page.getByRole('link', { name: 'Soins' }).click();
  const onglets = page.getByRole('group', { name: 'Soins' });
  await expect(onglets.getByRole('button')).toHaveText(['Rendez-vous', 'Notes', 'Traitement']);
  await onglets.getByRole('button', { name: 'Notes' }).click();
  await expect(champ(page)).toHaveAttribute('placeholder', 'Une idée, en vrac…');
  await expect(page.getByRole('button', { name: 'Dicter' })).toBeVisible();
  await expect(page.getByText('Aucune note pour l\'instant.')).toBeVisible();
  await expect(lignes(page)).toHaveCount(0);
});

test('Retour ajoute la note, vide le champ et le garde prêt ; Retour sur un champ vide ou d\'espaces ne fait rien', async ({ page }) => {
  await ouvrirNotes(page);
  await champ(page).press('Enter');
  await champ(page).fill('   ');
  await champ(page).press('Enter');
  await page.waitForTimeout(300);
  expect(await notes(page)).toEqual([]);
  await expect(page.getByText('Aucune note pour l\'instant.')).toBeVisible();

  await champ(page).fill('  Parler du sommeil  ');
  await champ(page).press('Enter');
  await expect(champ(page)).toHaveValue('');
  await expect(champ(page)).toBeFocused();
  await expect(lignes(page)).toHaveCount(1);
  await expect(page.getByText('Aucune note pour l\'instant.')).toHaveCount(0);
  await expect(lignes(page).first()).toContainText('15/10');
  await expect(texteDe(lignes(page).first())).toHaveValue('Parler du sommeil');
  const [n] = await notes(page);
  expect(n).toMatchObject({ date: '2026-10-15', texte: 'Parler du sommeil' });
  expect(n.heure).toMatch(/^20:\d\d$/);

  await champ(page).fill('Les réveils de 4 h');
  await champ(page).press('Enter');
  await expect(lignes(page)).toHaveCount(2);
  // La plus récente en haut.
  await expect(texteDe(lignes(page).nth(0))).toHaveValue('Les réveils de 4 h');
  await expect(texteDe(lignes(page).nth(1))).toHaveValue('Parler du sommeil');
});

test('le texte tapé et non ajouté est gardé quand on change d\'onglet', async ({ page }) => {
  await ouvrirNotes(page);
  await champ(page).fill('Une idée pas encore ajoutée');
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Traitement' }).click();
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Notes' }).click();
  await expect(champ(page)).toHaveValue('Une idée pas encore ajoutée');
  expect(await notes(page)).toEqual([]);
  await champ(page).press('Enter');
  await expect(lignes(page)).toHaveCount(1);
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Traitement' }).click();
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Notes' }).click();
  await expect(champ(page)).toHaveValue('');
});

test('la liste montre le jour logique (une note de 01:30 est de la veille), du plus récent au plus ancien, texte entier', async ({ page }) => {
  const longue = 'Une idée qui court sur plusieurs lignes, pour vérifier que le texte entier se lit sans défiler dans la note. '.repeat(4).trim();
  await creerNote(page, { date: '2026-10-12', heure: '09:05', texte: 'Lundi matin' });
  await creerNote(page, { date: '2026-10-13', heure: '01:30', texte: 'Écrite la nuit' });
  await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: longue });
  await page.reload();
  await ouvrirNotes(page);
  await expect(lignes(page)).toHaveCount(3);
  await expect(lignes(page).nth(0)).toContainText('14/10');
  await expect(lignes(page).nth(1)).toContainText('12/10');
  await expect(texteDe(lignes(page).nth(1))).toHaveValue('Écrite la nuit');
  await expect(lignes(page).nth(2)).toContainText('12/10');
  await expect(texteDe(lignes(page).nth(2))).toHaveValue('Lundi matin');
  // Texte entier : la zone s'agrandit, aucun défilement intérieur.
  const t = texteDe(lignes(page).nth(0));
  await expect(t).toHaveValue(longue);
  const { defile, haut } = await t.evaluate((z) => ({ defile: z.scrollHeight > z.clientHeight + 1, haut: z.clientHeight }));
  expect(defile).toBe(false);
  expect(haut).toBeGreaterThan(60);
});

test('un toucher modifie la note sur place, enregistrée peu après la frappe, sans bouton', async ({ page }) => {
  const n = await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: 'Idée de départ' });
  await page.reload();
  await ouvrirNotes(page);
  const t = texteDe(lignes(page).first());
  await t.click();
  await t.pressSequentially(' puis la suite');
  await expect.poll(async () => (await notes(page))[0].texte).toBe('Idée de départ puis la suite');
  const apres = (await notes(page))[0];
  expect([apres.id, apres.date, apres.heure]).toEqual([n.id, '2026-10-14', '18:40']);
  await expect(page.getByRole('button', { name: /enregistrer/i })).toHaveCount(0);
  await page.reload();
  await ouvrirNotes(page);
  await expect(texteDe(lignes(page).first())).toHaveValue('Idée de départ puis la suite');
});

test('texte effacé pendant la frappe : la note reste ; quittée vide, elle est supprimée, et Annuler la rend', async ({ page }) => {
  await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: 'Idée à garder' });
  await page.reload();
  await ouvrirNotes(page);
  const t = texteDe(lignes(page).first());
  await t.click();
  await t.fill('');
  // Bien plus que les 500 ms de l'enregistrement : rien n'est supprimé tant qu'on est dans le champ.
  await page.waitForTimeout(900);
  expect(await notes(page)).toHaveLength(1);
  await expect(lignes(page)).toHaveCount(1);
  await expect(page.getByText('Note supprimée')).toHaveCount(0);
  // Retaper du texte l'enregistre à nouveau.
  await t.fill('Idée gardée');
  await expect.poll(async () => (await notes(page))[0].texte).toBe('Idée gardée');
  await t.fill('   ');
  await page.waitForTimeout(700);
  expect(await notes(page)).toHaveLength(1);

  // Sortie du champ : supprimée.
  await page.getByRole('heading', { name: 'Soins' }).click();
  await expect(page.getByText('Note supprimée')).toBeVisible();
  await expect.poll(async () => (await notes(page)).length).toBe(0);
  await expect(page.getByText('Aucune note pour l\'instant.')).toBeVisible();
  await annuler(page).click();
  await expect(lignes(page)).toHaveCount(1);
  await expect(texteDe(lignes(page).first())).toHaveValue('Idée gardée');
  expect(await notes(page)).toMatchObject([{ date: '2026-10-14', heure: '18:40', texte: 'Idée gardée' }]);
});

test('texte effacé puis changement d\'écran : la note vide est supprimée aussi, avec Annuler', async ({ page }) => {
  await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: 'Idée à garder' });
  await page.reload();
  await ouvrirNotes(page);
  const t = texteDe(lignes(page).first());
  await t.click();
  await t.fill('');
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await expect(page.getByText('Note supprimée')).toBeVisible();
  expect(await notes(page)).toEqual([]);
  await annuler(page).click();
  await expect.poll(async () => (await notes(page)).map((x) => x.texte)).toEqual(['Idée à garder']);
});

test('✕ supprime la note, Annuler la rend', async ({ page }) => {
  await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: 'Première' });
  await creerNote(page, { date: '2026-10-14', heure: '19:10', texte: 'Seconde' });
  await page.reload();
  await ouvrirNotes(page);
  await expect(lignes(page)).toHaveCount(2);
  await lignes(page).nth(0).getByRole('button', { name: 'Supprimer la note du 14/10' }).click();
  await expect(page.getByText('Note supprimée')).toBeVisible();
  await expect(lignes(page)).toHaveCount(1);
  await expect(texteDe(lignes(page).first())).toHaveValue('Première');
  expect((await notes(page)).map((x) => x.texte)).toEqual(['Première']);
  await annuler(page).click();
  await expect(lignes(page)).toHaveCount(2);
  await expect(texteDe(lignes(page).first())).toHaveValue('Seconde');
  // Le store rend ses notes dans l'ordre des identifiants : on les remet dans l'ordre d'écriture.
  const gardees = (await notes(page)).sort((a, b) => a.heure.localeCompare(b.heure));
  expect(gardees).toMatchObject([{ date: '2026-10-14', heure: '18:40', texte: 'Première' }, { date: '2026-10-14', heure: '19:10', texte: 'Seconde' }]);
});

test('Soins rouvre le dernier onglet utilisé', async ({ page }) => {
  await ouvrirNotes(page);
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(champ(page)).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(champ(page)).toBeVisible();
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Rendez-vous' }).click();
  await page.getByRole('link', { name: "Aujourd'hui" }).click();
  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(page.getByText("Aucun rendez-vous noté pour l'instant.")).toBeVisible();
});

test('En consultation : un repli « Mes notes » les affiche, la plus récente d\'abord', async ({ page }) => {
  const r = await page.evaluate(() => window.__carnet.repo.rdv.creer({ date: '2026-10-16', heure: '10:30', professionnel: 'professionnel:psychiatre' }));
  await creerNote(page, { date: '2026-10-13', heure: '01:30', texte: 'Écrite la nuit' });
  await creerNote(page, { date: '2026-10-14', heure: '18:40', texte: 'Poser la question du matin' });
  await aller(page, `#/consultation/${r.id}`);
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  const repli = vue.getByRole('button', { name: 'Mes notes' });
  await expect(repli).toHaveAttribute('aria-expanded', 'false');
  await expect(vue.getByText('Poser la question du matin')).toHaveCount(0);
  await repli.click();
  await expect(repli).toHaveAttribute('aria-expanded', 'true');
  const liste = vue.getByRole('list', { name: 'Notes' }).getByRole('listitem');
  await expect(liste).toHaveCount(2);
  await expect(liste.nth(0)).toHaveText(/14\/10\s*Poser la question du matin/);
  await expect(liste.nth(1)).toHaveText(/12\/10\s*Écrite la nuit/);
});

test('En consultation sans note : le repli le dit', async ({ page }) => {
  const r = await page.evaluate(() => window.__carnet.repo.rdv.creer({ date: '2026-10-16', professionnel: 'professionnel:psychiatre' }));
  await aller(page, `#/consultation/${r.id}`);
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  await vue.getByRole('button', { name: 'Mes notes' }).click();
  await expect(vue.getByText('Aucune note pour l\'instant.')).toBeVisible();
});

test('les notes ne sortent ni dans l\'export PSY, ni dans la page du PDF, ni dans l\'Analyse', async ({ page }) => {
  const MOT = 'cetteideeresteici';
  // Les textes dessinés sur la page A4 (le PDF est une image de ce canvas).
  await page.addInitScript(() => {
    window.__dessines = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (texte, ...reste) { window.__dessines.push(String(texte)); return fillText.call(this, texte, ...reste); };
  });
  await page.evaluate(async (mot) => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-14', { humeur: 6, explosions: 0, lieu: 'lieu:bureau' });
    await r.notes.creer({ date: '2026-10-14', heure: '20:00', texte: `${mot} un` });
    await r.notes.creer({ date: '2026-10-14', heure: '20:10', texte: `${mot} deux` });
  }, MOT);
  await page.reload();

  await aller(page, '#/export-psy');
  const apercu = page.getByLabel('Aperçu du texte');
  await expect(apercu).toContainText('SUIVI APP');
  await expect(apercu).toContainText('mer 14/10');
  expect(await apercu.textContent()).not.toContain(MOT);

  await aller(page, '#/soignants');
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
  const dessines = await page.evaluate(() => window.__dessines);
  expect(dessines.length).toBeGreaterThan(10);
  expect(dessines.join('\n')).not.toContain(MOT);

  await aller(page, '#/analyse');
  await expect(page.getByRole('heading', { name: 'Analyse' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.locator('body').innerText()).not.toContain(MOT);
});
