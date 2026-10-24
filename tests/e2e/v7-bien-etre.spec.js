import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { tuile, mot } from '../aides/emotion.js';

// v7 · Bien-être (spec §6) : l'onglet (respiration en tête, les exercices, la ligne fixe), un exercice une consigne par
// écran, la lecture à voix haute (synthèse vocale factice, voix française du système), le verrou d'écran (factice), les
// séances (menées au bout ou arrêtées après 60 s, une seule, avec leur origine), le repère de Mes jours, et aucun compteur.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

// Une synthèse vocale factice : `voix` est la liste de getVoices() ; null retire la synthèse vocale.
const installerParole = (page, voix = [{ lang: 'fr-FR', name: 'Voix factice', localService: true }]) => page.addInitScript((liste) => {
  const p = { dits: [], annulations: 0 };
  window.__parole = p;
  if (liste === null) {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    return;
  }
  class Enonce { constructor(texte) { this.text = texte; } }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Enonce });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => liste,
      speak: (u) => { p.dits.push(u.text); p.voix = u.voice && u.voice.lang; },
      cancel: () => { p.annulations += 1; },
      addEventListener() {}, removeEventListener() {},
    },
  });
}, voix);
const parole = (page) => page.evaluate(() => ({ ...window.__parole }));
// Un verrou d'écran factice : les demandes et les rendus.
const installerVerrou = (page) => page.evaluate(() => {
  const j = { demandes: 0, rendus: 0 };
  window.__verrou = j;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => { j.demandes += 1; return { release: async () => { j.rendus += 1; } }; } },
  });
});
const verrou = (page) => page.evaluate(() => ({ ...window.__verrou }));
// La page cachée (écran verrouillé, autre app), puis de nouveau visible.
const cacher = (page) => page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
});
const montrer = (page) => page.evaluate(() => {
  delete document.visibilityState;
  document.dispatchEvent(new Event('visibilitychange'));
});
const seances = (page) => page.evaluate(() => window.__carnet.repo.seances.tous());
// Une durée en secondes : le temps de l'horloge factice, plus les quelques secondes réelles des touchers (l'horloge tourne).
const environ = (dureeS, attendu) => { expect(dureeS).toBeGreaterThanOrEqual(attendu); expect(dureeS).toBeLessThan(attendu + 8); };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const nav = (page) => page.getByRole('navigation', { name: 'Navigation principale' });
const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const ouvrirExercice = async (page, titre) => {
  await aller(page, '#/bien-etre');
  await page.getByRole('list', { name: 'Exercices' }).getByRole('link', { name: new RegExp(`^${titre}`) }).click();
  const v = vue(page, titre);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  return v;
};
const texteEtape = (v) => v.locator('.exercice-texte');
const minuteur = (v) => v.getByRole('timer', { name: 'Temps de l\'étape' });

const PAUSE = [
  'Arrête ce que tu fais. Pose ce que tu as dans les mains.', 'Sens tes pieds sur le sol.', 'Inspire lentement par le nez.',
  'Expire plus longuement, par la bouche.', 'Encore une fois : inspire, puis expire.', 'Reprends quand tu veux.',
];

test('onglets : Aujourd\'hui · Analyse · Bien-être · Soins · Réglages ; l\'Historique s\'ouvre par la porte de l\'Analyse, onglet Analyse allumé', async ({ page }) => {
  await expect(nav(page).getByRole('link')).toHaveText(['Aujourd\'hui', 'Analyse', 'Bien-être', 'Soins', 'Réglages']);
  await nav(page).getByRole('link', { name: 'Bien-être' }).click();
  await expect(page).toHaveURL(/#\/bien-etre$/);
  await expect(page.getByRole('heading', { name: 'Bien-être', level: 1 })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
  // La feuille : une icône au trait, comme les autres.
  await expect(nav(page).getByRole('link', { name: 'Bien-être' }).locator('svg path')).toHaveCount(1);

  await nav(page).getByRole('link', { name: 'Analyse' }).click();
  await page.getByRole('navigation', { name: 'Historique et Comprendre' }).getByRole('link', { name: 'Historique', exact: true }).click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect(page.getByRole('heading', { name: 'Historique', level: 1 })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Analyse' })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('link', { name: 'Historique' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/analyse$/);

  // Un exercice est plein écran, sans onglets ; il allume Bien-être quand on en sort.
  await ouvrirExercice(page, 'Scan corporel');
  await expect(nav(page)).toHaveCount(0);
  await bouton(page, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre$/);
  await expect(nav(page).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
  // Un exercice inconnu ramène à Bien-être.
  await aller(page, '#/bien-etre/exercice/inconnu');
  await expect(page).toHaveURL(/#\/bien-etre$/);
});

test('l\'écran Bien-être : la respiration en tête, les 8 exercices (titre, durée, description), la ligne fixe en bas ; aucun compteur', async ({ page }) => {
  await aller(page, '#/bien-etre');
  const ecran = page.locator('main.bien-etre');
  const respiration = ecran.getByRole('region', { name: 'Cohérence cardiaque' });
  await expect(respiration.getByRole('button', { name: 'Commencer' })).toBeVisible();
  const liste = ecran.getByRole('list', { name: 'Exercices' });
  await expect(liste.getByRole('link')).toHaveCount(8);
  await expect(liste.locator('.exercice-titre')).toHaveText([
    'Respiration abdominale', 'Respiration carrée', 'Relaxation dynamique des épaules', 'Tension et détente', 'Scan corporel',
    'Lieu ressource', 'Ancrage 5-4-3-2-1', 'Pause d\'une minute',
  ]);
  await expect(liste.locator('.exercice-description').first()).toHaveText('3 min · Respirer avec le ventre, une main posée dessus.');
  await expect(liste.locator('.exercice-description').nth(4)).toHaveText(/^10\smin · /);
  await expect(liste.getByRole('link').first()).toHaveAttribute('href', '#/bien-etre/exercice/respiration-abdominale');
  // Dans l'ordre : la respiration, la liste, la ligne fixe, qui est la dernière chose de l'écran.
  const [r, l, f] = await Promise.all([respiration.boundingBox(), liste.boundingBox(), ecran.locator('.ligne-fixe').boundingBox()]);
  expect(r.y + r.height).toBeLessThanOrEqual(l.y);
  expect(l.y + l.height).toBeLessThanOrEqual(f.y);
  await expect(ecran.locator(':scope > *').last()).toHaveText('Tu peux t\'arrêter à tout moment.');
  // Les cibles font 44 au moins.
  for (const b of await liste.getByRole('link').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Rien ne compte les séances : l'écran est le même avant et après six séances de toutes origines.
  const avant = await ecran.innerText();
  await page.evaluate(async () => {
    const rp = window.__carnet.repo;
    for (const [date, origine] of [['2026-10-15', 'bien-etre'], ['2026-10-15', 'bien-etre'], ['2026-10-14', 'moment-difficile'], ['2026-10-13', 'ressourcer'], ['2026-10-12', 'bien-etre'], ['2026-10-11', 'bien-etre']]) {
      await rp.seances.creer({ date, heure: '10:00', exercice: 'coherence', dureeS: 300, origine });
    }
  });
  await page.reload();
  await appPrete(page);
  await aller(page, '#/bien-etre');
  await expect(ecran.getByRole('list', { name: 'Exercices' }).getByRole('link')).toHaveCount(8);
  expect(await ecran.innerText()).toBe(avant);
  expect(avant).not.toMatch(/séance|aujourd'hui|déjà|fois|série|\d+\s*\/\s*\d+/i);
});

test('un exercice complet, voix éteinte : une consigne par écran, Précédent, Suivant, Terminer ; verrou d\'écran ; une séance ; « Noter mon émotion »', async ({ page }) => {
  await installerVerrou(page);
  const v = await ouvrirExercice(page, 'Pause d\'une minute');
  // Avant de commencer : la description et la durée ; la voix est éteinte au départ ; rien n'est dit ni verrouillé.
  await expect(v.getByText('Un arrêt bref, là où tu es.')).toBeVisible();
  await expect(v.getByText('Environ 1 minute.')).toBeVisible();
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'false');
  expect(await verrou(page)).toEqual({ demandes: 0, rendus: 0 });

  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[0]);
  await expect(minuteur(v)).toHaveText('0:10');
  await expect(bouton(v, 'Précédent')).toBeDisabled();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // Le minuteur ne fait qu'indiquer le temps : voix éteinte, l'étape reste.
  await page.clock.runFor(3000);
  await expect(minuteur(v)).toHaveText('0:07');
  await page.clock.runFor(15000);
  await expect(minuteur(v)).toHaveText('0:00');
  await expect(texteEtape(v)).toHaveText(PAUSE[0]);
  // Aucun repère de position.
  await expect(v).not.toContainText(/\d+\s*(sur|\/)\s*\d+/);

  for (let i = 1; i <= 4; i++) {
    await bouton(v, 'Suivant').click();
    await expect(texteEtape(v)).toHaveText(PAUSE[i]);
  }
  await expect(minuteur(v)).toHaveText('0:15');
  await bouton(v, 'Précédent').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[3]);
  await expect(minuteur(v)).toHaveText('0:10', { timeout: 2000 });
  await bouton(v, 'Suivant').click();
  await bouton(v, 'Suivant').click();
  // La dernière : « Terminer » à la place de « Suivant », une seule fois.
  await expect(texteEtape(v)).toHaveText(PAUSE[5]);
  await expect(bouton(v, 'Suivant')).toHaveCount(0);
  await expect(bouton(v, 'Terminer')).toHaveCount(1);
  // Menée au bout : la dernière étape, après la moitié de la durée de l'exercice (30 s) au moins.
  await page.clock.runFor(14000);
  await bouton(v, 'Terminer').click();

  await expect(v.getByText('Fin de l\'exercice.')).toBeVisible();
  const lien = v.getByRole('link', { name: 'Noter mon émotion' });
  await expect(lien).toHaveAttribute('href', '#/moment');
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ date: '2026-10-15', heure: '20:30', exercice: 'pause-une-minute', origine: 'bien-etre' });
  environ(s.dureeS, 32);
  expect((await parole(page)).dits).toEqual([]);
  // Rien ne s'ouvre tout seul.
  await page.clock.runFor(5000);
  await expect(page).toHaveURL(/#\/bien-etre\/exercice\/pause-une-minute$/);
  await lien.click();
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(vue(page, 'Émotion du moment')).toBeVisible();
  expect(await seances(page)).toHaveLength(1);
});

test('voix allumée : réglage gardé, chaque étape lue avec la voix française, les étapes avancent seules à la fin de leur durée', async ({ page }) => {
  await installerVerrou(page);
  let v = await ouvrirExercice(page, 'Pause d\'une minute');
  const interrupteur = v.getByRole('switch', { name: 'Lecture à voix haute' });
  // Sa zone de toucher fait 44 de haut au moins : 7 px au-dessus et au-dessous de l'interrupteur, c'est encore lui.
  const b = await interrupteur.boundingBox();
  const touche = (y) => page.evaluate(([x, yy]) => Boolean(document.elementFromPoint(x, yy)?.closest('[role=switch]')), [b.x + b.width / 2, y]);
  expect([await touche(b.y - 7), await touche(b.y + b.height + 6)]).toEqual([true, true]);
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('carnet:exercice:voix'))).toBe('true');
  expect((await parole(page)).dits).toEqual([]);

  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[0]);
  expect(await parole(page)).toMatchObject({ dits: [PAUSE[0]], voix: 'fr-FR' });
  await page.clock.runFor(10300);
  await expect(texteEtape(v)).toHaveText(PAUSE[1]);
  await page.clock.runFor(30300);
  await expect(texteEtape(v)).toHaveText(PAUSE[4]);
  expect((await parole(page)).dits).toEqual(PAUSE.slice(0, 5));
  // « Suivant » reste possible.
  await bouton(v, 'Suivant').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[5]);
  // La dernière étape écoulée finit l'exercice, qui le dit.
  await page.clock.runFor(5300);
  await expect(v.getByText('Fin de l\'exercice.')).toBeVisible();
  expect((await parole(page)).dits).toEqual([...PAUSE, 'Fin de l\'exercice.']);
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre' });
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });

  // Le réglage est gardé : rouvert, l'exercice a la voix allumée ; l'éteindre coupe la voix et l'oublie.
  await bouton(v, 'Fermer').click();
  v = await ouvrirExercice(page, 'Ancrage 5-4-3-2-1');
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'true');
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await parole(page)).dits.at(-1)).toBe('Garde les yeux ouverts. Regarde autour de toi.');
  const annulees = (await parole(page)).annulations;
  await v.getByRole('switch', { name: 'Lecture à voix haute' }).click();
  expect((await parole(page)).annulations).toBeGreaterThan(annulees);
  expect(await page.evaluate(() => localStorage.getItem('carnet:exercice:voix'))).toBeNull();
  // Éteinte : l'étape ne passe plus seule.
  await page.clock.runFor(15000);
  await expect(texteEtape(v)).toHaveText('Garde les yeux ouverts. Regarde autour de toi.');
  // Rallumée pendant une étape : elle est lue, et son temps repart.
  await v.getByRole('switch', { name: 'Lecture à voix haute' }).click();
  await expect.poll(async () => (await parole(page)).dits.at(-1)).toBe('Garde les yeux ouverts. Regarde autour de toi.');
  await expect(minuteur(v)).toHaveText('0:10');
  await page.clock.runFor(10300);
  await expect(texteEtape(v)).toHaveText('Nomme cinq choses que tu vois.');
});

test('sans voix française, ni synthèse vocale, la lecture à voix haute n\'apparaît pas', async ({ page }) => {
  await installerParole(page, [{ lang: 'en-US', name: 'Anglaise', localService: true }, { lang: 'fr-FR', name: 'En ligne', localService: false }]);
  await page.reload();
  await appPrete(page);
  let v = await ouvrirExercice(page, 'Scan corporel');
  await expect(v.getByRole('switch')).toHaveCount(0);
  await expect(v.getByText(/Voix allumée/)).toHaveCount(0);
  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(/^Installe-toi allongé ou assis/);
  await expect(v.getByRole('switch')).toHaveCount(0);
  await bouton(v, 'Fermer').click();

  await installerParole(page, null);
  await page.reload();
  await appPrete(page);
  v = await ouvrirExercice(page, 'Scan corporel');
  await expect(v.getByRole('switch')).toHaveCount(0);
  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(/^Installe-toi allongé ou assis/);
  await bouton(v, 'Suivant').click();
  await expect(texteEtape(v)).toHaveText(/^Remarque les points d'appui/);
});

test('point de vigilance 4 : exercice interrompu après 60 s (arrière-plan, puis sortie) : pause, voix coupée, verrou rendu, une seule séance', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await installerVerrou(page);
  const v = await ouvrirExercice(page, 'Scan corporel');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // 70 s : la voix allumée a passé l'étape 1 (30 s) et l'étape 2 (40 s).
  await page.clock.runFor(70000);
  await expect(texteEtape(v)).toHaveText(/^Va vers tes pieds/);
  expect(await seances(page)).toEqual([]);

  // L'écran se verrouille : pause, voix coupée, verrou rendu ; la séance est notée dès maintenant.
  const avant = await parole(page);
  await cacher(page);
  await expect(v.getByText('En pause')).toBeVisible();
  await expect(bouton(v, 'Reprendre')).toBeVisible();
  expect((await parole(page)).annulations).toBeGreaterThan(avant.annulations);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'scan-corporel', origine: 'bien-etre', date: '2026-10-15', heure: '20:30' });
  environ(notee.dureeS, 70);
  // En pause, le temps ne compte pas, rien n'avance et rien n'est dit.
  const dits = (await parole(page)).dits.length;
  await page.clock.runFor(120000);
  await montrer(page);
  await page.clock.runFor(2000);
  await expect(v.getByText('En pause')).toBeVisible();
  await expect(texteEtape(v)).toHaveText(/^Va vers tes pieds/);
  expect((await parole(page)).dits).toHaveLength(dits);
  expect(await verrou(page)).toEqual({ demandes: 1, rendus: 1 });

  // Reprendre : l'étape est relue, l'écran redemandé.
  await bouton(v, 'Reprendre').click();
  await expect.poll(async () => (await parole(page)).dits.at(-1)).toMatch(/^Va vers tes pieds/);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 1 });
  await page.clock.runFor(20000);
  // La sortie : voix coupée, verrou rendu, et toujours une seule séance, à sa durée active (70 + 20 s).
  const annulees = (await parole(page)).annulations;
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre$/);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 2 });
  expect((await parole(page)).annulations).toBeGreaterThan(annulees);
  await expect.poll(async () => (await seances(page))[0].dureeS).toBeGreaterThanOrEqual(notee.dureeS + 20);
  expect(await seances(page)).toHaveLength(1);
  environ((await seances(page))[0].dureeS, 90);

  // La page quittée (pagehide) pendant un autre exercice de plus de 60 s : pause et une séance.
  const v2 = await ouvrirExercice(page, 'Lieu ressource');
  await bouton(v2, 'Commencer').click();
  await page.clock.runFor(65000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(v2.getByText('En pause')).toBeVisible();
  await expect.poll(async () => (await seances(page)).filter((s) => s.exercice === 'lieu-ressource')).toHaveLength(1);
  environ((await seances(page)).find((s) => s.exercice === 'lieu-ressource').dureeS, 65);
  await bouton(v2, 'Fermer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 3, rendus: 3 });
  expect(await seances(page)).toHaveLength(2);
});

test('aucune séance pour un arrêt avant 60 s : « Fermer », « Terminer » avant la fin, la page cachée, la respiration arrêtée', async ({ page }) => {
  let v = await ouvrirExercice(page, 'Tension et détente');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(45000);
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre$/);

  v = await ouvrirExercice(page, 'Tension et détente');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(30000);
  await cacher(page);
  await expect(v.getByText('En pause')).toBeVisible();
  await montrer(page);
  await bouton(v, 'Reprendre').click();
  await page.clock.runFor(20000);
  // 50 s d'exercice actif, la pause exclue : « Terminer » avant la dernière étape ne garde rien.
  await bouton(v, 'Terminer').click();
  await expect(v.getByText('Fin de l\'exercice.')).toBeVisible();
  await bouton(v, 'Revenir à Bien-être').click();
  await expect(page).toHaveURL(/#\/bien-etre$/);

  // La respiration de Bien-être, arrêtée à 30 s : rien, et pas de lien.
  const respiration = page.getByRole('region', { name: 'Cohérence cardiaque' });
  await respiration.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(30000);
  await respiration.getByRole('button', { name: 'Arrêter' }).click();
  await expect(respiration.getByRole('button', { name: 'Commencer' })).toBeVisible();
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toHaveCount(0);
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);
});

test('parcourir les textes jusqu\'à « Terminer » ne crée pas de séance : la dernière étape compte après la moitié de la durée', async ({ page }) => {
  // « Suivant » cinq fois, puis « Terminer » : la dernière étape atteinte en quelques secondes.
  let v = await ouvrirExercice(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  for (let i = 1; i <= 5; i++) await bouton(v, 'Suivant').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[5]);
  await bouton(v, 'Terminer').click();
  await expect(v.getByText('Fin de l\'exercice.')).toBeVisible();
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);

  // « Terminer » en pause, sur la dernière étape, après 10 s : rien non plus.
  await bouton(v, 'Revenir à Bien-être').click();
  v = await ouvrirExercice(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  for (let i = 1; i <= 5; i++) await bouton(v, 'Suivant').click();
  await page.clock.runFor(10000);
  await cacher(page);
  await expect(v.getByText('En pause')).toBeVisible();
  await montrer(page);
  await bouton(v, 'Terminer').click();
  await expect(v.getByText('Fin de l\'exercice.')).toBeVisible();
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);

  // La dernière étape après 31 s d'exercice actif (plus de la moitié d'une minute) : menée au bout, avant les 60 s.
  await bouton(v, 'Revenir à Bien-être').click();
  v = await ouvrirExercice(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(25000);
  for (let i = 1; i <= 5; i++) await bouton(v, 'Suivant').click();
  await page.clock.runFor(6000);
  await bouton(v, 'Terminer').click();
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre' });
  environ((await seances(page))[0].dureeS, 31);
});

test('respiration, page cachée : le temps caché ne compte pas, la séance est notée dès que la page se cache, une seule', async ({ page }) => {
  // L'horloge factice fait tourner plusieurs minutes de minuteries.
  test.setTimeout(90000);
  await installerVerrou(page);
  // Bien-être, 5 min : 30 s, puis la page cachée 5 min (iPhone verrouillé), plus que le temps qui restait. Au retour, la
  // respiration reprend ; elle n'est ni finie ni notée.
  await aller(page, '#/bien-etre');
  const respiration = page.getByRole('region', { name: 'Cohérence cardiaque' });
  const phase = respiration.locator('.phase-respiration');
  await respiration.getByRole('button', { name: 'Commencer' }).click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  await page.clock.runFor(30000);
  await cacher(page);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await page.clock.runFor(5 * 60000);
  await expect(phase).toHaveText(/^(Inspire|Expire)$/);
  await montrer(page);
  await page.clock.runFor(1000);
  await expect(phase).toHaveText(/^(Inspire|Expire)$/);
  await expect(respiration.getByRole('button', { name: 'Arrêter' })).toBeVisible();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 1 });
  expect(await seances(page)).toEqual([]);
  await respiration.getByRole('button', { name: 'Arrêter' }).click();
  await expect(respiration.getByRole('button', { name: 'Commencer' })).toBeVisible();
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toHaveCount(0);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 2 });
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);

  // Moment difficile : 70 s, puis la page cachée. La séance est notée tout de suite (l'app peut ne pas revenir) ; le temps
  // caché n'y entre pas ; au retour, la respiration continue, et « Arrêter » met à jour la même séance.
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(70000);
  expect(await seances(page)).toEqual([]);
  await cacher(page);
  await expect.poll(() => seances(page)).toHaveLength(1);
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'coherence', origine: 'moment-difficile', date: '2026-10-15' });
  environ(notee.dureeS, 70);
  await page.clock.runFor(4 * 60000);
  await montrer(page);
  await page.clock.runFor(20000);
  await expect(md.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  expect(await seances(page)).toEqual([notee]);
  await md.getByRole('button', { name: 'Arrêter' }).click();
  await expect.poll(async () => (await seances(page))[0].dureeS).toBeGreaterThanOrEqual(notee.dureeS + 15);
  expect(await seances(page)).toHaveLength(1);
  environ((await seances(page))[0].dureeS, 90);

  // La page quittée (pagehide) après 65 s : la séance est notée, une seule, même après le retour et « Arrêter ».
  await aller(page, '#/bien-etre');
  await respiration.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(65000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async () => (await seances(page)).filter((x) => x.origine === 'bien-etre')).toHaveLength(1);
  environ((await seances(page)).find((x) => x.origine === 'bien-etre').dureeS, 65);
  await page.clock.runFor(60000);
  await montrer(page);
  await expect(phase).toHaveText(/^(Inspire|Expire)$/);
  await respiration.getByRole('button', { name: 'Arrêter' }).click();
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toBeVisible();
  await page.clock.runFor(2000);
  expect((await seances(page)).filter((x) => x.origine === 'bien-etre')).toHaveLength(1);
  expect(await seances(page)).toHaveLength(2);
});

test('respiration : un tic de la minuterie entre « Arrêter » et le nettoyage ne relance pas le cercle ; une seule séance, le verrou rendu', async ({ page }) => {
  // Relecture finale : Preact nettoie l'effet de la respiration après l'affichage. Un tic de 200 ms tombé entre le rendu
  // d'« Arrêter » et ce nettoyage relançait le cercle : le toucher était perdu, la séance n'était pas notée et le verrou
  // d'écran restait pris. Le tic est appelé ici à la main, dans cette fenêtre.
  await installerVerrou(page);
  await aller(page, '#/bien-etre');
  const respiration = page.getByRole('region', { name: 'Cohérence cardiaque' });
  await expect(respiration.getByRole('button', { name: 'Commencer' })).toBeEnabled();
  // La minuterie de 200 ms de la respiration : son rappel, et si elle a été effacée.
  await page.evaluate(() => {
    const m = { rappel: null, id: null, effacee: false };
    window.__minuterie = m;
    const poser = window.setInterval;
    const effacer = window.clearInterval;
    window.setInterval = function setInterval(rappel, ms, ...reste) {
      const id = poser.call(this, rappel, ms, ...reste);
      if (ms === 200) Object.assign(m, { rappel, id, effacee: false });
      return id;
    };
    window.clearInterval = function clearInterval(id) { if (id === m.id) m.effacee = true; return effacer.call(this, id); };
  });
  await respiration.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(65000);
  await expect(respiration.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  const course = await page.evaluate(async () => {
    const m = window.__minuterie;
    const zone = document.querySelector('main.bien-etre .respiration');
    [...zone.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Arrêter').click();
    // Le rendu de Preact suit le toucher d'une micro-tâche ; le nettoyage de l'effet attend l'affichage.
    for (let i = 0; i < 20 && zone.querySelector('.cercle-respiration.en-cours'); i += 1) await Promise.resolve();
    const rendu = !zone.querySelector('.cercle-respiration.en-cours');
    const effaceeAvant = m.effacee;
    m.rappel();
    return { rendu, effaceeAvant };
  });
  expect(course).toEqual({ rendu: true, effaceeAvant: false });
  await page.clock.runFor(1200);
  await expect(respiration.locator('.cercle-respiration.en-cours')).toHaveCount(0);
  await expect(respiration.getByRole('button', { name: 'Arrêter' })).toHaveCount(0);
  await expect(respiration.getByRole('button', { name: 'Commencer' })).toBeVisible();
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toBeVisible();
  expect(await page.evaluate(() => window.__minuterie.effacee)).toBe(true);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'coherence', origine: 'bien-etre' });
  environ((await seances(page))[0].dureeS, 65);
  await page.clock.runFor(2000);
  expect(await seances(page)).toHaveLength(1);
});

// Les rectangles de la ligne de « Cohérence cardiaque » et de la durée, dans le texte de la phase.
const lignesPhase = (phase) => phase.evaluate((p) => {
  const lignes = (n) => { const r = document.createRange(); r.selectNodeContents(n); return [...r.getClientRects()]; };
  const duree = p.querySelector('.duree-respiration');
  return { nom: Math.max(...lignes(p.firstChild).map((x) => x.bottom)), duree: duree.getBoundingClientRect().top, lignesDuree: lignes(duree).length };
});

test('Bien-être et Moment difficile : la même carte 2b, la durée et le rythme sur leurs puces ; « Pour récupérer, je… » : la durée sous « Cohérence cardiaque », sans « · », en grand texte aussi', async ({ page }) => {
  // Bien-être (tâche 9, finitions) : « Cohérence cardiaque » seul, la durée et le rythme sur leurs puces, comme Moment
  // difficile ; un choix se règle au même endroit (méta respiration).
  await aller(page, '#/bien-etre');
  const carteBe = page.locator('main.bien-etre .carte-respiration');
  await expect(carteBe.locator('.phase-respiration')).toHaveText('Cohérence cardiaque');
  await expect(carteBe.getByRole('combobox', { name: 'Durée', exact: true })).toHaveValue('5');
  await expect(carteBe.getByRole('combobox', { name: 'Rythme', exact: true })).toHaveValue('5-5');
  await carteBe.getByRole('combobox', { name: 'Durée', exact: true }).selectOption('2');
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.meta.lire('respiration').then((r) => r && r.duree))).toBe(2);
  await carteBe.getByRole('combobox', { name: 'Durée', exact: true }).selectOption('5');
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.meta.lire('respiration').then((r) => r && r.duree))).toBe(5);

  // « Pour récupérer, je… » : pareil, une fois la respiration arrêtée.
  await page.evaluate(async () => {
    const m = window.__carnet.repo.meta;
    await m.ecrire('monPlan', { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge', siAlors: [] });
    await m.ecrire('ressourcer', { energieBasse: true });
  });
  await aller(page, '#/moment');
  const emo = vue(page, 'Émotion du moment');
  await tuile(emo, 'Basse').click();
  await mot(emo, 'Vide', 'Tristesse').click();
  const carte = emo.getByRole('region', { name: 'Pour récupérer, je…' });
  await carte.getByRole('button', { name: 'Respirer', exact: true }).click();
  await carte.getByRole('button', { name: 'Arrêter' }).click();
  const phaseCarte = carte.locator('.phase-respiration');
  await expect(phaseCarte).toHaveText('Cohérence cardiaque 5 minutes');
  await expect(phaseCarte.locator('.duree-respiration')).toHaveText('5 minutes');
  for (const taille of [null, 28]) {
    if (taille) await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
    const l = await lignesPhase(phaseCarte);
    expect(l.duree).toBeGreaterThanOrEqual(l.nom - 1);
    expect(l.lignesDuree).toBe(1);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });

  // Moment difficile (2b, tâche 8) : « Cohérence cardiaque » seul, la durée sur sa puce.
  await bouton(emo, 'Fermer').click();
  await aller(page, '#/moment-difficile');
  await expect(vue(page, 'Moment difficile').locator('.phase-respiration')).toHaveText('Cohérence cardiaque');
  await expect(vue(page, 'Moment difficile').getByRole('combobox', { name: 'Durée', exact: true })).toHaveValue('5');
});

test('la respiration crée une séance avec son origine : Bien-être (au bout, puis « Noter mon émotion »), Moment difficile, « Pour récupérer, je… »', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('respiration', { duree: 2, rythme: '5-5', son: false }));
  // Bien-être : menée au bout (2 min).
  await aller(page, '#/bien-etre');
  const respiration = page.getByRole('region', { name: 'Cohérence cardiaque' });
  await respiration.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(122000);
  await expect(respiration.locator('.phase-respiration')).toHaveText('2 minutes de respiration.');
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toHaveAttribute('href', '#/moment');
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'coherence', origine: 'bien-etre', dureeS: 120, date: '2026-10-15', heure: '20:30' });
  // « Recommencer » efface le lien jusqu'à la séance suivante.
  await respiration.getByRole('button', { name: 'Recommencer' }).click();
  await expect(respiration.getByRole('link', { name: 'Noter mon émotion' })).toHaveCount(0);
  await respiration.getByRole('button', { name: 'Arrêter' }).click();

  // Moment difficile : arrêtée après 61 s.
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(61000);
  await md.getByRole('button', { name: 'Arrêter' }).click();
  // tous() rend les séances dans l'ordre de leurs identifiants, tirés au hasard : on compare des listes triées.
  await expect.poll(async () => (await seances(page)).map((s) => s.origine).sort()).toEqual(['bien-etre', 'moment-difficile']);
  const md1 = (await seances(page)).find((s) => s.origine === 'moment-difficile');
  expect(md1.exercice).toBe('coherence');
  environ(md1.dureeS, 61);
  // Pas de « Noter mon émotion » dans Moment difficile.
  await expect(md.getByRole('link', { name: 'Noter mon émotion' })).toHaveCount(0);
  // Quitter l'écran pendant une respiration de plus de 60 s la note aussi, une fois.
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(75000);
  await bouton(md, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(async () => (await seances(page)).filter((s) => s.origine === 'moment-difficile')).toHaveLength(2);
  environ((await seances(page)).filter((s) => s.origine === 'moment-difficile' && s.id !== md1.id)[0].dureeS, 75);

  // « Pour récupérer, je… » : la respiration lancée par « Respirer », quittée après 90 s.
  await page.evaluate(async () => {
    const m = window.__carnet.repo.meta;
    await m.ecrire('monPlan', { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge', siAlors: [] });
    await m.ecrire('ressourcer', { energieBasse: true });
  });
  await aller(page, '#/moment');
  const emo = vue(page, 'Émotion du moment');
  await tuile(emo, 'Basse').click();
  await mot(emo, 'Vide', 'Tristesse').click();
  const carte = emo.getByRole('region', { name: 'Pour récupérer, je…' });
  await carte.getByRole('button', { name: 'Respirer', exact: true }).click();
  await expect(carte.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(90000);
  await bouton(emo, 'Fermer').click();
  await expect.poll(async () => (await seances(page)).filter((s) => s.origine === 'ressourcer')).toHaveLength(1);
  const rs = (await seances(page)).find((s) => s.origine === 'ressourcer');
  expect(rs.exercice).toBe('coherence');
  environ(rs.dureeS, 90);
  expect(await seances(page)).toHaveLength(4);
});

test('Mes jours : une rangée « Bien-être » sur une période qui a une séance, un repère par jour, sans nombre', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.seances.creer({ date: '2026-10-13', heure: '09:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
    await r.seances.creer({ date: '2026-10-13', heure: '18:00', exercice: 'scan-corporel', dureeS: 600, origine: 'bien-etre' });
    // 01:30 le 15 : rattachée au 14 (bascule à 4 h), même lancée depuis Moment difficile.
    await r.seances.creer({ date: '2026-10-15', heure: '01:30', exercice: 'coherence', dureeS: 120, origine: 'moment-difficile' });
    // Un relevé, pour que la période ait d'autres données.
    await r.humeurs.creer({ date: '2026-10-12', heure: '10:00', emotion: 'roue:serenite:calme', energie: null });
    await r.seances.creer({ date: '2026-08-01', heure: '10:00', exercice: 'epaules', dureeS: 300, origine: 'ressourcer' });
  });
  await aller(page, '#/analyse');
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /7 j/ }).click();
  const mesJours = page.locator('figure', { hasText: 'Mes jours' });
  await expect(mesJours.locator('svg text.g-etiquette', { hasText: 'Bien-être' })).toHaveCount(1);
  await expect(mesJours.locator('.g-bien-etre')).toHaveCount(2);
  // Le même repère pour le jour de deux séances et pour celui d'une seule.
  const tailles = await mesJours.locator('.g-bien-etre').evaluateAll((rs) => rs.map((x) => `${x.getAttribute('width')}×${x.getAttribute('height')}`));
  expect(new Set(tailles).size).toBe(1);
  // Le détail d'un jour le dit, sans nombre.
  await mesJours.getByRole('button', { name: 'Voir en tableau' }).click();
  const lignes = mesJours.locator('table tbody tr');
  await expect(lignes.filter({ hasText: '13 oct.' })).toHaveText(/Bien-être/);
  await expect(lignes.filter({ hasText: '14 oct.' })).toHaveText(/Bien-être/);
  await expect(mesJours.locator('table')).not.toContainText(/séance|\d+ (fois|séances?)/);
  await mesJours.getByRole('button', { name: 'Voir le graphe' }).click();

  // Par semaine (Tout : depuis le 1er août), le repère est là pour chaque semaine qui a une séance.
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /Tout/ }).click();
  await expect(mesJours.locator('svg text.g-etiquette', { hasText: 'Bien-être' })).toHaveCount(1);
  await expect(mesJours.locator('.g-bien-etre')).toHaveCount(2);

  // Une période sans séance n'a pas la rangée.
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    for (const s of await r.seances.tous()) await r.seances.supprimer(s.id);
  });
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /30 j/ }).click();
  await expect(mesJours.locator('svg text.g-etiquette', { hasText: 'Émotions' })).toHaveCount(1);
  await expect(mesJours.locator('svg text.g-etiquette', { hasText: 'Bien-être' })).toHaveCount(0);
  await expect(mesJours.locator('.g-bien-etre')).toHaveCount(0);
});

test('Comprendre › Énergie : « Autour du Bien-être », sous son seuil puis en barres, sans les respirations de crise', async ({ page }) => {
  await aller(page, '#/comprendre/energie');
  const carte = page.locator('figure', { hasText: 'Autour du Bien-être' });
  await expect(carte.getByText('Pas encore assez de données pour le dire.')).toBeVisible();
  await carte.getByRole('button', { name: 'Pourquoi ?' }).click();
  await expect(carte.locator('.encadre-regle')).toHaveText(/séance lancée depuis Bien-être/);

  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    for (const d of ['2026-10-12', '2026-10-13', '2026-10-14']) {
      await r.seances.creer({ date: d, heure: '12:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
      await r.humeurs.creer({ date: d, heure: '10:30', emotion: 'roue:peur:preoccupe', energie: null });
      await r.humeurs.creer({ date: d, heure: '13:00', emotion: 'roue:serenite:calme', energie: null });
    }
    // Une respiration de crise, entourée d'émotions : elle n'entre pas dans la vue.
    await r.seances.creer({ date: '2026-10-10', heure: '12:00', exercice: 'coherence', dureeS: 300, origine: 'moment-difficile' });
    await r.humeurs.creer({ date: '2026-10-10', heure: '11:00', emotion: 'roue:colere', energie: null });
  });
  await aller(page, '#/analyse');
  await aller(page, '#/comprendre/energie');
  await expect(carte.getByRole('img', { name: /^Autour du Bien-être, sur tout ce que tu as noté/ })).toBeVisible();
  await carte.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(carte.locator('table tbody tr')).toHaveText([/3 heures avant\s*peur 3\s*3/, /3 heures après\s*sérénité 3\s*3/]);
  await expect(carte).not.toContainText(/colère/i);
});
