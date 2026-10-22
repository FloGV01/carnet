import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Rendez-vous (spec §7.2, §7.3) : « La dernière fois » et « Reprendre », un rendez-vous passé rouvert, un
// « Date à fixer » ; « En parler au rendez-vous » depuis une fiche, « Voir » en consultation, le PDF. Données
// inventées. Horloge : jeudi 15 octobre 2026, 20:00.
const PSY = 'professionnel:psychiatre';
const NEURO = 'professionnel:neuropsychologue';
const LIEE = { texte: 'Les réveils de 4 h', abordee: false, lien: { store: 'episodes', id: 'ep-ancien' } };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 0) });
  await page.goto('/');
  await viderBase(page);
});

const lireRdv = (page, id) => page.evaluate((i) => window.__carnet.repo.rdv.lire(i), id);
const tousRdv = (page) => page.evaluate(() => window.__carnet.repo.rdv.tous());
const creerRdv = (page, liste) => page.evaluate(async (l) => {
  for (const { id, ...r } of l) await window.__carnet.repo.rdv.creer(r, { id });
}, liste);
const SUIVI = [
  { id: 'rdv-aout', date: '2026-08-01', professionnel: PSY, compteRendu: 'Premier échange.' },
  { id: 'rdv-sept', date: '2026-09-10', heure: '09:00', professionnel: PSY, compteRendu: 'On garde la dose.\nPoint dans un mois.', prochaineEtape: 'Noter les réveils',
    questions: [{ texte: 'Parler du sommeil', abordee: true }, LIEE] },
  { id: 'rdv-neuro', date: '2026-09-20', professionnel: NEURO, compteRendu: 'Bilan rendu.' },
  { id: 'rdv-oct', date: '2026-10-20', heure: '10:30', professionnel: PSY },
];

test('« La dernière fois » sur la carte du prochain rendez-vous : repli fermé, textes tels qu\'écrits, « Reprendre » puis « Reprise »', async ({ page }) => {
  await creerRdv(page, SUIVI);
  await page.getByRole('link', { name: 'Soins' }).click();
  const carte = page.getByRole('region', { name: 'Prochain rendez-vous' });
  const repli = carte.getByRole('button', { name: 'La dernière fois · 10/09' });
  await expect(repli).toHaveAttribute('aria-expanded', 'false');
  await expect(carte.getByText('Noter les réveils')).toHaveCount(0);
  await repli.click();
  await expect(carte.locator('.texte-lecture').first()).toHaveText('On garde la dose.\nPoint dans un mois.');
  await expect(carte.getByText('Noter les réveils')).toBeVisible();
  // Seules les questions non abordées ; jamais de compteur ni de « oubliées ».
  await expect(carte.getByText('Parler du sommeil')).toHaveCount(0);
  await expect(carte.locator('.repli')).not.toContainText(/oubli|en retard|\d+ questions?/i);
  const reprendre = carte.getByRole('button', { name: 'Reprendre : Les réveils de 4 h' });
  await reprendre.click();
  await expect.poll(async () => (await lireRdv(page, 'rdv-oct')).questions).toEqual([LIEE]);
  const reprise = carte.getByRole('button', { name: 'Reprise : Les réveils de 4 h' });
  await expect(reprise).toBeDisabled();
  await expect(reprise).toHaveText('Reprise');
  await expect(carte.getByRole('button', { name: 'Les réveils de 4 h', exact: true })).toHaveAttribute('aria-pressed', 'false');
  // Le rendez-vous d'origine ne change pas.
  expect((await lireRdv(page, 'rdv-sept')).questions).toEqual([{ texte: 'Parler du sommeil', abordee: true }, LIEE]);

  // En haut d'« En consultation » : le même repli, la question déjà reprise.
  await carte.getByRole('link', { name: 'En consultation' }).click();
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  await vue.getByRole('button', { name: 'La dernière fois · 10/09' }).click();
  await expect(vue.getByRole('button', { name: 'Reprise : Les réveils de 4 h' })).toBeDisabled();
  const ordre = await vue.locator('.consultation > *').evaluateAll((els) => els.map((e) => e.className));
  expect(ordre.slice(0, 3)).toEqual(['identite', 'repli', 'carte chiffres-consultation']);
});

test('« La dernière fois » : un rendez-vous passé rouvert cite celui d\'avant, un « Date à fixer » compte depuis aujourd\'hui', async ({ page }) => {
  await creerRdv(page, [...SUIVI, { id: 'rdv-fixer', professionnel: PSY }, { id: 'rdv-sans', date: '2026-10-22' }]);
  const repli = (vue) => vue.getByRole('button', { name: /^La dernière fois/ });
  const vue = page.getByRole('dialog', { name: 'En consultation' });

  // Rouvert depuis « Passés » : jamais lui-même (10/09), mais celui du 01/08.
  await page.getByRole('link', { name: 'Soins' }).click();
  await page.getByRole('link', { name: /Psychiatre\s*jeu\. 10 sept\./ }).click();
  await page.getByRole('link', { name: 'En consultation' }).click();
  await expect(repli(vue)).toHaveText(/La dernière fois · 01\/08/);
  await repli(vue).click();
  await expect(vue.locator('.repli .texte-lecture')).toHaveText('Premier échange.');

  await aller(page, '#/consultation/rdv-fixer');
  await expect(vue.getByText('Date à fixer')).toBeVisible();
  await expect(repli(vue)).toHaveText(/La dernière fois · 10\/09/);

  // Rien sans soignant, ni sans rendez-vous d'avant avec ce soignant.
  for (const id of ['rdv-sans', 'rdv-neuro']) {
    await aller(page, `#/consultation/${id}`);
    await expect(vue.locator('.chiffres-consultation')).toBeVisible();
    await expect(repli(vue)).toHaveCount(0);
  }
});

test('« La dernière fois » ne cite jamais un rendez-vous à venir : celui du 15/11 compte depuis aujourd\'hui, pas depuis le 20/10', async ({ page }) => {
  const preparee = { texte: 'Une question préparée pour le 20/10', abordee: false };
  await creerRdv(page, [...SUIVI.slice(0, 3), { ...SUIVI[3], questions: [preparee] }, { id: 'rdv-nov', date: '2026-11-15', professionnel: PSY }]);
  await aller(page, '#/consultation/rdv-nov');
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  const repli = vue.getByRole('button', { name: /^La dernière fois/ });
  await expect(repli).toHaveText(/La dernière fois · 10\/09/);
  await repli.click();
  await expect(vue.getByText('Noter les réveils')).toBeVisible();
  await expect(vue.getByText(preparee.texte)).toHaveCount(0);
  await expect(vue.getByRole('button', { name: /^Reprendre/ })).toHaveText('Reprendre');
  await expect(vue.getByRole('button', { name: 'Reprendre : Les réveils de 4 h' })).toBeVisible();
});

test('« En parler au rendez-vous » depuis un épisode : question déjà écrite, rendez-vous choisi, « Voir » en consultation, le PDF', async ({ page }) => {
  await creerRdv(page, [SUIVI[3], { id: 'rdv-fixer', professionnel: NEURO }]);
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-10-03', heure: '18:00', emotion: 'emotion:colere', intensite: 8,
    declencheur: 'declencheur:conflit', reaction: 'reaction:explosion', situation: 'Une dispute inventée', ceQuiAAide: 'Marcher dehors' }, { id: 'ep-1' }));
  await aller(page, '#/episode/ep-1');
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'En parler au rendez-vous' }).click();
  const feuille = page.getByRole('dialog', { name: 'En parler au rendez-vous' });
  const question = feuille.getByRole('textbox', { name: 'Question' });
  await expect(question).toHaveValue('Épisode du sam 3/10, 18 h · Colère 8/10 · Explosion');
  // Les rendez-vous à venir, datés ou « Date à fixer ».
  const rdvs = feuille.getByRole('list', { name: 'Rendez-vous à venir' }).getByRole('button');
  await expect(rdvs).toHaveText([/Psychiatre\s*mar\. 20 oct\. · 10:30/, /Neuropsychologue\s*Date à fixer/]);
  const texte = 'Épisode du sam 3/10, 18 h · Colère 8/10 · Explosion, la colère qui monte vite';
  await question.fill(texte);
  await rdvs.first().click();
  await expect(feuille).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Question ajoutée au rendez-vous' })).toBeVisible();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const attendue = { texte, abordee: false, lien: { store: 'episodes', id: 'ep-1' } };
  await expect.poll(async () => (await lireRdv(page, 'rdv-oct')).questions).toEqual([attendue]);
  // Une seconde fois, le même texte : rien ne s'ajoute.
  await fiche.getByRole('button', { name: 'En parler au rendez-vous' }).click();
  // La feuille prend le focus sur son titre à l'ouverture : on attend qu'elle l'ait fait, sinon le texte tapé
  // tout de suite peut se perdre (le focus quitte le champ pendant la frappe) et la question pré-écrite part.
  await expect(feuille.getByRole('heading', { name: 'En parler au rendez-vous' })).toBeFocused();
  await feuille.getByRole('textbox', { name: 'Question' }).fill(texte);
  await feuille.getByRole('button', { name: /Psychiatre/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Déjà dans ce rendez-vous' })).toBeVisible();
  expect((await lireRdv(page, 'rdv-oct')).questions).toEqual([attendue]);

  // En consultation : « Voir » ouvre la fiche en lecture seule, par-dessus, sans navigation.
  await aller(page, '#/consultation/rdv-oct');
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  const voir = vue.getByRole('button', { name: `Voir ${texte}` });
  await expect(voir).toHaveText('Voir');
  await voir.click();
  const lecture = page.getByRole('dialog', { name: 'Épisode' });
  await expect(lecture.getByRole('heading', { name: 'Épisode' })).toBeFocused();
  await expect(lecture).toContainText('samedi 3 oct. · 18:00');
  await expect(lecture.locator('.ligne-lecture')).toHaveText([/Déclencheur\s*Conflit/, /Émotion\s*Colère/, /Intensité\s*8/, /En dessous\s*·/,
    /Réaction\s*Explosion/, /Situation\s*Une dispute inventée/, /Ce qui a aidé\s*Marcher dehors/]);
  await expect(lecture.getByRole('textbox')).toHaveCount(0);
  await expect(lecture.getByRole('button')).toHaveText(['Fermer']);
  await expect(page).toHaveURL(/#\/consultation\/rdv-oct$/);
  await lecture.getByRole('button', { name: 'Fermer' }).click();
  await expect(lecture).toHaveCount(0);
  await expect(vue).toBeVisible();
  await expect(voir).toBeFocused();

  // Le PDF ne montre que le texte de la question.
  await page.evaluate(() => {
    window.__textes = [];
    const dessiner = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function fillText(t, ...reste) { window.__textes.push(String(t)); return dessiner.call(this, t, ...reste); };
  });
  await aller(page, '#/soignants');
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
  const dessines = (await page.evaluate(() => window.__textes)).join('\n');
  expect(dessines).toContain('Questions :');
  expect(dessines).toContain('la colère qui monte vite');
  expect(dessines).not.toMatch(/ep-1|episodes|Une dispute inventée/);

  // L'épisode supprimé : « Voir » disparaît, la question reste.
  await aller(page, '#/consultation/rdv-oct');
  await expect(voir).toBeVisible();
  await page.evaluate(() => window.__carnet.repo.episodes.supprimer('ep-1'));
  await expect(voir).toHaveCount(0);
  await expect(vue.getByRole('button', { name: texte, exact: true })).toBeVisible();
});

test('« En parler au rendez-vous » depuis une fiche Traitement : changement coupé, jamais les notes, « Nouveau rendez-vous » crée un « Date à fixer »', async ({ page }) => {
  const changement = 'Dose du soir augmentée, à prendre au coucher pendant trois semaines, puis point';
  await page.evaluate((c) => window.__carnet.repo.traitements.creer({ date: '2026-10-12', changement: c, effetRessenti: 'effetRessenti:moins_bien',
    effetsSecondaires: ['effetSecondaire:somnolence'], notes: 'Une note inventée' }, { id: 'tr-1' }), changement);
  await aller(page, '#/traitement/tr-1');
  await page.getByRole('button', { name: 'En parler au rendez-vous' }).click();
  const feuille = page.getByRole('dialog', { name: 'En parler au rendez-vous' });
  const valeur = await feuille.getByRole('textbox', { name: 'Question' }).inputValue();
  expect(valeur).toBe(`Traitement du 12/10 · ${changement.slice(0, 59)}… · Moins bien · Somnolence`);
  expect(valeur).not.toContain('Une note inventée');
  // Aucun rendez-vous à venir : le choix du soignant est ouvert d'emblée.
  await expect(feuille.getByRole('list', { name: 'Rendez-vous à venir' })).toHaveCount(0);
  await expect(feuille.getByRole('button', { name: 'Nouveau rendez-vous' })).toHaveAttribute('aria-expanded', 'true');
  await feuille.getByRole('group', { name: 'Soignant' }).getByRole('button', { name: 'Neuropsychologue' }).click();
  await expect(feuille).toHaveCount(0);
  await expect.poll(() => tousRdv(page)).toEqual([expect.objectContaining({
    professionnel: NEURO, questions: [{ texte: valeur, abordee: false, lien: { store: 'traitements', id: 'tr-1' } }] })]);
  expect((await tousRdv(page))[0].date ?? null).toBeNull();
  await page.getByRole('link', { name: 'Soins' }).click();
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: 'Rendez-vous' }).click();
  await expect(page.getByRole('link', { name: /Neuropsychologue\s*Date à fixer/ })).toBeVisible();
});

test('« En parler au rendez-vous » sur un symptôme et sur l\'Après coup ; Annuler retire la question', async ({ page }) => {
  await creerRdv(page, [SUIVI[3]]);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.symptomes.creer({ date: '2026-10-12', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures', contexte: 'Un contexte inventé' }, { id: 'sy-1' });
    await r.episodes.creer({ date: '2026-10-04', heure: '01:30', emotion: 'emotion:honte', apresCoup: { types: ['typeExplosion:colere'], siJe: 'je serre les poings' } }, { id: 'ep-2' });
  });
  await aller(page, '#/symptome/sy-1');
  await page.getByRole('dialog', { name: 'Symptôme' }).getByRole('button', { name: 'En parler au rendez-vous' }).click();
  const feuille = page.getByRole('dialog', { name: 'En parler au rendez-vous' });
  await expect(feuille.getByRole('textbox', { name: 'Question' })).toHaveValue('Symptôme du lun 12/10 · Ruminations 6/10 · Quelques heures');
  await feuille.getByRole('button', { name: /Psychiatre/ }).click();
  await expect.poll(async () => (await lireRdv(page, 'rdv-oct')).questions?.length).toBe(1);
  await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lireRdv(page, 'rdv-oct')).questions ?? null).toBeNull();

  await aller(page, '#/apres-coup/ep-2');
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(vue.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await vue.getByRole('button', { name: 'En parler au rendez-vous' }).click();
  // Un épisode à 01:30 compte pour la veille (jour logique).
  await expect(feuille.getByRole('textbox', { name: 'Question' })).toHaveValue('Épisode du sam 3/10, 1 h 30 · Honte');
  await feuille.getByRole('button', { name: 'Fermer' }).click();
  await expect(feuille).toHaveCount(0);
  await expect(vue).toBeVisible();
});

// Pour chaque « : », « ; », « ? » ou « ! » d'un texte affiché : le haut de sa ligne et celui du caractère qui précède
// l'espace (le dernier du mot d'avant). Une ponctuation qui commence une ligne a un haut plus bas que ce caractère.
const lignesPonctuation = (loc) => loc.evaluate((el) => {
  const noeud = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  const haut = (i) => { const r = document.createRange(); r.setStart(noeud, i); r.setEnd(noeud, i + 1); return r.getBoundingClientRect().top; };
  const res = [];
  for (let i = 2; i < noeud.data.length; i += 1) if (/[:;?!]/.test(noeud.data[i])) res.push({ signe: noeud.data[i], ponctuation: haut(i), avant: haut(i - 2) });
  return { res, lignes: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) };
});

test('relecture v7 : une question écrite avec une espace avant « : » ou « ? » ne coupe pas la ligne avant le signe ; le texte enregistré ne change pas', async ({ page }) => {
  const texte = 'Le sommeil du week-end est plus décalé : est-ce gênant ? Et le réveil de 4 h : on en parle ?';
  await creerRdv(page, [{ ...SUIVI[3], questions: [{ texte, abordee: false }] }]);
  await page.evaluate(() => window.__carnet.repo.notes.creer({ date: '2026-10-14', heure: '18:40', texte: 'À dire au rendez-vous : le sommeil du week-end est décalé ; est-ce gênant ?' }));
  await page.getByRole('link', { name: 'Soins' }).click();
  const question = page.getByRole('region', { name: 'Prochain rendez-vous' }).locator('.texte-question');
  await expect(question).toHaveText(texte);
  for (const taille of [null, 19, 23, 28]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
    const { res, lignes } = await lignesPonctuation(question);
    expect(lignes, `${taille || 'texte par défaut'} : la question tient sur plusieurs lignes`).toBeGreaterThan(1);
    expect(res).toHaveLength(4);
    for (const r of res) expect(r.ponctuation, `${taille || 'texte par défaut'} : « ${r.signe} »`).toBeCloseTo(r.avant, 0);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect((await lireRdv(page, 'rdv-oct')).questions).toEqual([{ texte, abordee: false }]);

  // En consultation, la même question et « Mes notes ».
  await aller(page, '#/consultation/rdv-oct');
  const vue = page.getByRole('dialog', { name: 'En consultation' });
  await vue.getByRole('button', { name: 'Mes notes' }).click();
  const note = vue.getByRole('list', { name: 'Notes' }).locator('.note-texte');
  await expect(note).toHaveText('À dire au rendez-vous : le sommeil du week-end est décalé ; est-ce gênant ?');
  for (const loc of [vue.locator('.texte-question'), note]) {
    for (const taille of [null, 23]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
      for (const r of (await lignesPonctuation(loc)).res) expect(r.ponctuation, `consultation ${taille || ''} : « ${r.signe} »`).toBeCloseTo(r.avant, 0);
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect((await page.evaluate(() => window.__carnet.repo.notes.tous()))[0].texte).toBe('À dire au rendez-vous : le sommeil du week-end est décalé ; est-ce gênant ?');
});
