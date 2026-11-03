import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { noter, continuer } from '../aides/emotion.js';
import { installerParole, parole, installerVerrou, verrou, cacher, montrer, seances, environ } from '../aides/lecteur.js';

// v7 · Bien-être (spec §6) : l'onglet (v10 : les quatre entrées, la ligne fixe ; le reste dans v10-bien-etre.spec.js), un exercice une
// consigne par écran, la lecture à voix haute (synthèse vocale factice, voix française du système), le verrou d'écran
// (factice), les séances (menées au bout ou arrêtées après 60 s, une seule, avec leur origine), le repère de Mes jours,
// et aucun compteur.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

// Le lecteur (v8) remplace l'écran d'un exercice : les tests du lecteur lui-même sont dans v8-lecteur.spec.js ; ici, ce
// qui reste de la v7 (l'onglet, les séances et leur règle, la voix, l'interruption, Mes jours, Comprendre). Les exercices
// s'ouvrent depuis l'écran Programme (v8, tâche 4 ; v8-programme.spec.js), et y reviennent.
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
  await aller(page, '#/bien-etre/programme');
  await page.locator('main.programme').getByRole('link', { name: new RegExp(`^${titre}`) }).click();
  const v = vue(page, titre);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  return v;
};
const texteEtape = (v) => v.locator('.lecteur-consigne');
// Les textes passent par pourAffichage (espaces insécables) : on les compare espaces normalisés.
const texte = (t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s')}$`);

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

  // Un exercice (v8 : ouvert depuis le Programme) est plein écran, sans onglets ; il revient au Programme, qui allume
  // Bien-être.
  await ouvrirExercice(page, 'Scan corporel');
  await expect(nav(page)).toHaveCount(0);
  await bouton(page, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(nav(page).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
  // Une séance inconnue ramène au Programme.
  await aller(page, '#/bien-etre/programme/inconnu');
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
});

test('l\'écran Bien-être (v10) : sans rien, ni « Reprendre » ni « Favoris » ; les quatre entrées dans l\'ordre, la ligne fixe en bas ; plus de cohérence cardiaque ni de séance qui vient ; aucun compteur', async ({ page }) => {
  await aller(page, '#/bien-etre');
  const ecran = page.locator('main.bien-etre');
  const entrees = ecran.getByRole('list', { name: 'Entrées' }).getByRole('link');
  await expect(entrees).toHaveText(['Me calmer vite', 'Dormir ou me rendormir', 'Me concentrer', 'Programme']);
  // Ni carte ni région : ni « Reprendre », ni « Favoris », ni cohérence cardiaque, ni séance du Programme à lancer.
  await expect(ecran.getByRole('region')).toHaveCount(0);
  await expect(ecran.getByRole('heading', { level: 2 })).toHaveCount(0);
  await expect(ecran.getByRole('button')).toHaveCount(0);
  await expect(ecran.getByRole('combobox')).toHaveCount(0);
  await expect(ecran.getByRole('list', { name: 'Exercices' })).toHaveCount(0);
  await expect(ecran.locator('.ligne-exercice')).toHaveCount(0);
  await expect(ecran.getByRole('heading', { name: 'Bien-être', level: 1 })).toBeVisible();
  await expect(ecran.locator(':scope > *').last()).toHaveText('Tu peux t\'arrêter à tout moment.');
  // Dans l'ordre, chacune sous la précédente, avec une cible de 44 au moins, puis la ligne fixe.
  const places = () => entrees.evaluateAll((l) => l.map((a) => { const r = a.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  const avantPlaces = await places();
  for (const [i, [, y, , h]] of avantPlaces.entries()) {
    expect(h).toBeGreaterThanOrEqual(44);
    if (i) expect(y).toBeGreaterThanOrEqual(avantPlaces[i - 1][1] + avantPlaces[i - 1][3]);
  }
  expect((await ecran.locator('.ligne-fixe').boundingBox()).y).toBeGreaterThanOrEqual(avantPlaces[3][1] + avantPlaces[3][3]);
  // Rien ne compte les séances : l'écran est le même, aux mêmes places, avant et après six séances de toutes origines.
  const avant = await ecran.innerText();
  await page.evaluate(async () => {
    const rp = window.__carnet.repo;
    for (const [date, origine] of [['2026-10-15', 'bien-etre'], ['2026-10-15', 'bien-etre'], ['2026-10-14', 'moment-difficile'], ['2026-10-13', 'ressourcer'], ['2026-10-12', 'bien-etre'], ['2026-10-11', 'bien-etre']]) {
      await rp.seances.creer({ date, heure: '10:00', exercice: 'coherence', dureeS: 300, origine, fin: true, programme: origine === 'bien-etre' ? 'coherence' : null });
    }
  });
  await page.reload();
  await appPrete(page);
  await aller(page, '#/bien-etre');
  await expect(entrees).toHaveCount(4);
  expect(await ecran.innerText()).toBe(avant);
  expect(await places()).toEqual(avantPlaces);
  // Ni « séance », ni « déjà », ni « fois », ni chiffre.
  expect(avant).not.toMatch(/séance|aujourd'hui|déjà|fois|série|\d|%/i);
  // Rien d'écrit dans l'appareil pour une simple ouverture.
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:')))).toEqual([]);
});

test('un exercice complet, voix éteinte (v8) : une consigne par écran, les étapes avancent seules ; verrou d\'écran ; une séance', async ({ page }) => {
  await installerVerrou(page);
  const v = await ouvrirExercice(page, 'Pause d\'une minute');
  // Avant de commencer : la description et la durée ; la voix est éteinte au départ ; rien n'est dit ni verrouillé.
  await expect(v.getByText('Un arrêt bref, là où tu es.')).toBeVisible();
  await expect(v.locator('.lecteur-duree')).toHaveText(/^1\smin\s·\slà où tu es$/);
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'false');
  expect(await verrou(page)).toEqual({ demandes: 0, rendus: 0 });

  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[0]);
  await expect(bouton(v, 'Précédent')).toBeDisabled();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // Voix éteinte, l'étape passe seule à la suivante à la fin de sa durée (v8).
  await page.clock.runFor(10300);
  await expect(texteEtape(v)).toHaveText(PAUSE[1]);
  // Aucun repère de position.
  await expect(v).not.toContainText(/\d+\s*(sur|\/)\s*\d+/);
  await page.clock.runFor(30000);
  await expect(texteEtape(v)).toHaveText(texte(PAUSE[4]));
  await page.clock.runFor(15000);
  await expect(texteEtape(v)).toHaveText(PAUSE[5]);
  await expect(bouton(v, 'Suivant')).toBeDisabled();
  // La dernière étape écoulée finit l'exercice.
  await page.clock.runFor(5000);
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ date: '2026-10-15', heure: '20:30', exercice: 'pause-une-minute', origine: 'bien-etre' });
  environ(s.dureeS, 60);
  expect((await parole(page)).dits).toEqual([]);
  // Le lecteur se ferme seul et revient au Programme ; le message « Noter mon émotion » y mène.
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' }).click();
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(vue(page, 'Émotion du moment')).toBeVisible();
  expect(await seances(page)).toHaveLength(1);
});

test('voix allumée : réglage gardé, chaque étape lue avec la voix française, après son bol', async ({ page }) => {
  await installerVerrou(page);
  let v = await ouvrirExercice(page, 'Pause d\'une minute');
  const interrupteur = v.getByRole('switch', { name: 'Lecture à voix haute' });
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('carnet:exercice:voix'))).toBe('true');
  expect((await parole(page)).dits).toEqual([]);

  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[0]);
  // Le bol de début sonne d'abord ; la consigne est dite 1,5 s plus tard.
  await page.clock.runFor(1600);
  expect(await parole(page)).toMatchObject({ dits: [PAUSE[0]], voix: 'fr-FR' });
  await page.clock.runFor(8700);
  await expect(texteEtape(v)).toHaveText(PAUSE[1]);
  await page.clock.runFor(30300);
  await expect(texteEtape(v)).toHaveText(texte(PAUSE[4]));
  await page.clock.runFor(1000);
  expect((await parole(page)).dits).toEqual(PAUSE.slice(0, 5));
  // « Suivant » reste possible.
  await bouton(v, 'Suivant').click();
  await expect(texteEtape(v)).toHaveText(PAUSE[5]);
  // La dernière étape écoulée finit l'exercice, qui le dit après ses bols.
  await page.clock.runFor(5300);
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(3000);
  expect((await parole(page)).dits).toEqual([...PAUSE, 'Fin de l\'exercice.']);
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre' });
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });

  // Le réglage est gardé : rouvert, l'exercice a la voix allumée ; l'éteindre en pause coupe la voix et l'oublie.
  await bouton(v, 'Fermer').click();
  v = await ouvrirExercice(page, 'Ancrage 5-4-3-2-1');
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'true');
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await parole(page)).dits.at(-1)).toBe('Garde les yeux ouverts. Regarde autour de toi.');
  await bouton(v, 'Pause').click();
  const annulees = (await parole(page)).annulations;
  const dits = (await parole(page)).dits.length;
  await v.getByRole('switch', { name: 'Lecture à voix haute' }).click();
  expect(await page.evaluate(() => localStorage.getItem('carnet:exercice:voix'))).toBeNull();
  await bouton(v, 'Reprendre').click();
  // Éteinte : l'étape passe quand même, en silence.
  await page.clock.runFor(10300);
  await expect(texteEtape(v)).toHaveText('Nomme cinq choses que tu vois.');
  expect((await parole(page)).dits).toHaveLength(dits);
  expect((await parole(page)).annulations).toBeGreaterThanOrEqual(annulees);
  // Rallumée en pause, puis la reprise : l'étape est lue.
  await bouton(v, 'Pause').click();
  await v.getByRole('switch', { name: 'Lecture à voix haute' }).click();
  await bouton(v, 'Reprendre').click();
  await expect.poll(async () => (await parole(page)).dits.at(-1)).toBe('Nomme cinq choses que tu vois.');
});

test('sans voix française, ni synthèse vocale, la lecture à voix haute n\'apparaît pas', async ({ page }) => {
  await installerParole(page, [{ lang: 'en-US', name: 'Anglaise', localService: true }, { lang: 'fr-FR', name: 'En ligne', localService: false }]);
  await page.reload();
  await appPrete(page);
  let v = await ouvrirExercice(page, 'Scan corporel');
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveCount(0);
  await bouton(v, 'Commencer').click();
  await expect(texteEtape(v)).toHaveText(/^Installe-toi allongé ou assis/);
  await bouton(v, 'Pause').click();
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveCount(0);
  await bouton(v, 'Fermer').click();

  await installerParole(page, null);
  await page.reload();
  await appPrete(page);
  v = await ouvrirExercice(page, 'Scan corporel');
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveCount(0);
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
  // 70 s : l'étape 1 (30 s) et l'étape 2 (40 s) sont passées.
  await page.clock.runFor(70000);
  await expect(texteEtape(v)).toHaveText(/^Va vers tes pieds/);
  expect(await seances(page)).toEqual([]);

  // L'écran se verrouille : pause, voix coupée, verrou rendu ; la séance est notée dès maintenant.
  const avant = await parole(page);
  await cacher(page);
  await expect(v.getByText(/^En pause/)).toBeVisible();
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
  await expect(v.getByText(/^En pause/)).toBeVisible();
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
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
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
  await expect(v2.getByText(/^En pause/)).toBeVisible();
  await expect.poll(async () => (await seances(page)).filter((s) => s.exercice === 'lieu-ressource')).toHaveLength(1);
  environ((await seances(page)).find((s) => s.exercice === 'lieu-ressource').dureeS, 65);
  await bouton(v2, 'Fermer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 3, rendus: 3 });
  expect(await seances(page)).toHaveLength(2);
});

test('aucune séance pour un arrêt avant 60 s : « Fermer », « Terminer » avant la fin, la page cachée, la cohérence arrêtée', async ({ page }) => {
  let v = await ouvrirExercice(page, 'Tension et détente');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(45000);
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);

  v = await ouvrirExercice(page, 'Tension et détente');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(30000);
  await cacher(page);
  await expect(v.getByText(/^En pause/)).toBeVisible();
  await montrer(page);
  await bouton(v, 'Reprendre').click();
  await page.clock.runFor(20000);
  // 50 s d'exercice actif, la pause exclue : « Terminer » avant la dernière étape ne garde rien.
  await bouton(v, 'Terminer').click();
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);

  // La cohérence cardiaque de Bien-être, arrêtée à 30 s : rien.
  await aller(page, '#/bien-etre/calmer');
  await page.getByRole('button', { name: 'Commencer Cohérence cardiaque' }).click();
  v = vue(page, 'Cohérence cardiaque');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await page.clock.runFor(30000);
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/calmer$/);
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
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);

  // « Terminer » en pause, sur la dernière étape, après 3 s : rien non plus.
  await bouton(v, 'Fermer').click();
  v = await ouvrirExercice(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  for (let i = 1; i <= 5; i++) await bouton(v, 'Suivant').click();
  await page.clock.runFor(3000);
  await cacher(page);
  await expect(v.getByText(/^En pause/)).toBeVisible();
  await montrer(page);
  await bouton(v, 'Terminer').click();
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);

  // La dernière étape après 30 s d'exercice actif (la moitié d'une minute) : menée au bout à sa fin, avant les 60 s.
  await bouton(v, 'Fermer').click();
  v = await ouvrirExercice(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(25000);
  await expect(texteEtape(v)).toHaveText(PAUSE[2]);
  for (let i = 1; i <= 3; i++) await bouton(v, 'Suivant').click();
  await page.clock.runFor(6000);
  await expect(texteEtape(v)).toHaveText('Fin de l\'exercice.');
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre' });
  environ((await seances(page))[0].dureeS, 30);
});

test('respiration de Moment difficile, page cachée : le temps caché ne compte pas, la séance est notée dès que la page se cache, une seule', async ({ page }) => {
  // L'horloge factice fait tourner plusieurs minutes de minuteries.
  test.setTimeout(90000);
  await installerVerrou(page);
  // 70 s, puis la page cachée. La séance est notée tout de suite (l'app peut ne pas revenir) ; le temps caché n'y entre
  // pas ; au retour, la respiration continue, et « Arrêter » met à jour la même séance.
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  await page.clock.runFor(70000);
  expect(await seances(page)).toEqual([]);
  await cacher(page);
  await expect.poll(() => seances(page)).toHaveLength(1);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'coherence', origine: 'moment-difficile', date: '2026-10-15' });
  environ(notee.dureeS, 70);
  await page.clock.runFor(4 * 60000);
  await montrer(page);
  await page.clock.runFor(20000);
  await expect(md.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 1 });
  expect(await seances(page)).toEqual([notee]);
  await md.getByRole('button', { name: 'Arrêter' }).click();
  await expect.poll(async () => (await seances(page))[0].dureeS).toBeGreaterThanOrEqual(notee.dureeS + 15);
  expect(await seances(page)).toHaveLength(1);
  environ((await seances(page))[0].dureeS, 90);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 2 });

  // La page quittée (pagehide) après 65 s : la séance est notée, une seule, même après le retour et « Arrêter ».
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(65000);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async () => (await seances(page)).length).toBe(2);
  const seconde = (await seances(page)).find((x) => x.id !== notee.id);
  environ(seconde.dureeS, 65);
  await page.clock.runFor(60000);
  await montrer(page);
  await expect(md.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  await md.getByRole('button', { name: 'Arrêter' }).click();
  await page.clock.runFor(2000);
  expect(await seances(page)).toHaveLength(2);
});

test('respiration : un tic de la minuterie entre « Arrêter » et le nettoyage ne relance pas le cercle ; une seule séance, le verrou rendu', async ({ page }) => {
  // Relecture finale : Preact nettoie l'effet de la respiration après l'affichage. Un tic de 200 ms tombé entre le rendu
  // d'« Arrêter » et ce nettoyage relançait le cercle : le toucher était perdu, la séance n'était pas notée et le verrou
  // d'écran restait pris. Le tic est appelé ici à la main, dans cette fenêtre (v8 : dans Moment difficile, la
  // respiration de Bien-être passant au lecteur).
  await installerVerrou(page);
  await aller(page, '#/moment-difficile');
  const respiration = vue(page, 'Moment difficile').getByRole('region', { name: 'Cohérence cardiaque' });
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
    const zone = document.querySelector('.moment-difficile .respiration');
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
  expect(await page.evaluate(() => window.__minuterie.effacee)).toBe(true);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'coherence', origine: 'moment-difficile' });
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
// « Pour récupérer, je… » (la règle « Me ressourcer » allumée) : un mot d'énergie basse noté maintenant, puis la flèche ;
// v9 (5/8) : la carte est en tête de l'écran 3 de l'émotion.
const versPourRecuperer = async (page) => {
  await page.evaluate(async () => {
    const m = window.__carnet.repo.meta;
    await m.ecrire('monPlan', { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge', siAlors: [] });
    await m.ecrire('ressourcer', { energieBasse: true });
  });
  await aller(page, '#/moment');
  const emo = vue(page, 'Émotion du moment');
  await noter(emo, 'bleu', 'Vide');
  await continuer(emo).click();
  return { emo, carte: emo.getByRole('region', { name: 'Pour récupérer, je…' }) };
};

test('Bien-être et Moment difficile : la durée et le rythme sur leurs puces, réglés au même endroit ; « Pour récupérer, je… » : la durée sous « Cohérence cardiaque », sans « · », en grand texte aussi', async ({ page }) => {
  // Bien-être (v10) : avant de commencer la cohérence cardiaque, la durée et le rythme sur leurs puces, comme Moment difficile ;
  // un choix se règle au même endroit (méta respiration).
  await aller(page, '#/bien-etre/coherence');
  const carteBe = vue(page, 'Cohérence cardiaque');
  await expect(carteBe.getByRole('heading', { name: 'Cohérence cardiaque', level: 1 })).toBeVisible();
  await expect(carteBe.getByRole('combobox', { name: 'Durée', exact: true })).toHaveValue('5');
  await expect(carteBe.getByRole('combobox', { name: 'Rythme', exact: true })).toHaveValue('5-5');
  await carteBe.getByRole('combobox', { name: 'Durée', exact: true }).selectOption('2');
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.meta.lire('respiration').then((r) => r && r.duree))).toBe(2);
  await carteBe.getByRole('combobox', { name: 'Durée', exact: true }).selectOption('5');
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.meta.lire('respiration').then((r) => r && r.duree))).toBe(5);
  await bouton(carteBe, 'Fermer').click();

  // « Pour récupérer, je… » : une fois la respiration arrêtée.
  const { emo, carte } = await versPourRecuperer(page);
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

test('la respiration crée une séance avec son origine : Bien-être (au bout, dans le lecteur), Moment difficile, « Pour récupérer, je… »', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('respiration', { duree: 2, rythme: '5-5', son: false }));
  // Bien-être : menée au bout (2 min), dans le lecteur.
  await aller(page, '#/bien-etre/calmer');
  await page.getByRole('button', { name: 'Commencer Cohérence cardiaque' }).click();
  const lecteur = vue(page, 'Cohérence cardiaque');
  await expect(bouton(lecteur, 'Pause')).toBeVisible();
  await page.clock.runFor(120400);
  await expect(lecteur.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'coherence', origine: 'bien-etre', dureeS: 120, date: '2026-10-15', heure: '20:30' });
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/calmer$/);

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
  await expect(page.getByRole('button', { name: 'Noter mon émotion' })).toHaveCount(0);
  await expect(md.getByRole('link', { name: 'Noter mon émotion' })).toHaveCount(0);
  // Quitter l'écran pendant une respiration de plus de 60 s la note aussi, une fois.
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(75000);
  await bouton(md, 'Fermer').click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(async () => (await seances(page)).filter((s) => s.origine === 'moment-difficile')).toHaveLength(2);
  environ((await seances(page)).filter((s) => s.origine === 'moment-difficile' && s.id !== md1.id)[0].dureeS, 75);

  // « Pour récupérer, je… » : la respiration lancée par « Respirer », quittée après 90 s.
  const { emo, carte } = await versPourRecuperer(page);
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
  const tailles = await mesJours.locator('.g-bien-etre').evaluateAll((rs) => rs.map((x) => { const b = x.getBBox(); return `${b.width}×${b.height}`; }));
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
  await expect(carte.locator('.encadre-regle')).toHaveText(/séance lancée depuis Bien-être ou « Pour ce moment : »/);

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
  await expect(carte.getByRole('img', { name: /^Autour du Bien-être, sur tout ce que tu as noté.* séance lancée depuis Bien-être ou « Pour ce moment : »/ })).toBeVisible();
  await carte.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(carte.locator('table tbody tr')).toHaveText([/3 heures avant\s*peur 3\s*3/, /3 heures après\s*sérénité 3\s*3/]);
  await expect(carte).not.toContainText(/colère/i);
});
