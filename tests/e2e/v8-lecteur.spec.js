import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { noter, continuer } from '../aides/emotion.js';
import { espionnerAudio, audio, notes } from '../aides/audio.js';
import {
  installerParole, parole, installerVerrou, verrou, cacher, montrer, seances, environ, bols, frequencesBols, souffles, horloge,
} from '../aides/lecteur.js';

// v8 · Le lecteur de Bien-être (spec §5, §12.1 et §12.3) : un faux contexte Web Audio (aides/audio.js) et une synthèse
// vocale factice. La lecture, les étapes qui avancent seules, un bol à chaque changement, le souffle sur une étape rythmée
// et rien pendant « Retiens », jamais deux inspirations de suite d'une étape rythmée à l'autre (même après une pause) ;
// « Reprendre » à la place de « Pause » ; la fin (« Fin de l'exercice. » seul), puis la fermeture et le message ; « Son :
// Aucun » et « Repères » ; le mode silencieux ; la cohérence cardiaque lancée d'un toucher ; le point de vigilance 4 (une
// respiration de crise reste muette par défaut ; une lecture interrompue coupe voix et sons et rend le verrou d'écran,
// une seule séance).
// Ces exercices s'ouvrent depuis l'écran Programme (v8, tâche 4) : le lecteur y revient. La durée au choix, le noting, le
// soupir, l'épingle, l'exercice de nuit et le mode crise : tests/e2e/v10-lecteur.spec.js.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const ouvrir = async (page, titre) => {
  await aller(page, '#/bien-etre/programme');
  await page.locator('main.programme').getByRole('link', { name: new RegExp(`^${titre}`) }).click();
  const v = vue(page, titre);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  return v;
};
const consigne = (v) => v.locator('.lecteur-consigne');
const reste = (v) => v.locator('.lecteur-reste');
const motSouffle = (v) => v.locator('.mot-souffle');
const disque = (v) => v.locator('.disque-souffle');
// La part de l'anneau remplie, de 0 à 1.
const anneau = (v) => v.locator('.anneau-plein').evaluate((c) => 1 - Number(c.getAttribute('stroke-dashoffset')) / Number(c.getAttribute('stroke-dasharray')));
// L'écran de fin : « Fin de l'exercice. » seul, ni anneau ni temps (rien ne dit ce qui a été fait ou non).
const finSeule = async (v) => {
  await expect(consigne(v)).toHaveText('Fin de l\'exercice.');
  await expect(v.locator('.lecteur-anneau')).toHaveCount(0);
  await expect(v.locator('.anneau-plein, .anneau-temps')).toHaveCount(0);
  await expect(reste(v)).toHaveCount(0);
};

// Respiration carrée : 15, 10, 9, 9, 9, 9, 48 (rythmée), 48 (rythmée), 15 s ; 2:52 en tout (3 min annoncées). Les deux
// étapes rythmées font trois cycles de 16 s chacune : 61 à 109 s, puis 109 à 157 s.
const CARREE = [
  'Installe-toi, le dos droit sans être raide. Les épaules restent basses.', 'Vide doucement l\'air de tes poumons.',
  'Inspire par le nez en comptant jusqu\'à quatre.', 'Retiens l\'air en comptant jusqu\'à quatre.',
  'Expire par la bouche en comptant jusqu\'à quatre.', 'Garde les poumons vides en comptant jusqu\'à quatre.',
  'Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu\'à deux.',
  'Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre.', 'Laisse ta respiration redevenir libre.',
];
const PAUSE = [
  'Arrête ce que tu fais. Pose ce que tu as dans les mains.', 'Sens tes pieds sur le sol.', 'Inspire lentement par le nez.',
  'Expire plus longuement, par la bouche.', 'Encore une fois : inspire, puis expire.', 'Reprends quand tu veux.',
];
// Les textes passent par pourAffichage (espaces insécables) : on les compare espaces normalisés.
const texte = (t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s')}$`);

test('avant de commencer : le titre, « 3 min · assis », la description, le bouton lecture au centre, les réglages ; aucun son', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrir(page, 'Respiration carrée');
  await expect(v.getByRole('heading', { name: 'Respiration carrée', level: 1 })).toBeVisible();
  await expect(v.locator('.lecteur-duree')).toHaveText(/^3\smin\s·\sassis$/);
  await expect(v.locator('.lecteur-description')).toHaveText(texte('Inspirer, retenir, expirer, retenir : quatre temps chacun.'));
  // Le bouton lecture, au centre de l'anneau, à la couleur de Bien-être, de 84.
  const lecture = bouton(v, 'Commencer');
  const [b, a] = await Promise.all([lecture.boundingBox(), v.locator('.lecteur-anneau').boundingBox()]);
  expect(Math.abs((b.x + b.width / 2) - (a.x + a.width / 2))).toBeLessThan(1);
  expect(Math.abs((b.y + b.height / 2) - (a.y + a.height / 2))).toBeLessThan(1);
  expect(Math.round(b.width)).toBe(84);
  expect(Math.abs((a.x + a.width / 2) - 195)).toBeLessThan(1);
  // Les réglages du lecteur : la voix éteinte, « Repères + souffle », le mode silencieux respecté.
  const reglages = v.getByRole('list', { name: 'Réglages du lecteur' });
  await expect(reglages.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'false');
  await expect(reglages.getByRole('combobox', { name: 'Son', exact: true })).toHaveValue('souffle');
  expect(await reglages.getByRole('combobox', { name: 'Son', exact: true }).evaluate((s) => [...s.options].map((o) => o.textContent)))
    .toEqual(['Aucun', 'Repères', 'Repères + souffle']);
  await expect(reglages.getByRole('switch', { name: 'Jouer même en mode silencieux' })).toHaveAttribute('aria-checked', 'false');
  // La zone de toucher des interrupteurs fait 44 de haut au moins : 7 px au-dessus et au-dessous, c'est encore lui.
  for (const nom of ['Lecture à voix haute', 'Jouer même en mode silencieux']) {
    const b = await reglages.getByRole('switch', { name: nom }).boundingBox();
    const touche = (y) => page.evaluate(([x, yy, n]) => document.elementFromPoint(x, yy)?.closest('[role=switch]')?.getAttribute('aria-label') === n, [b.x + b.width / 2, y, nom]);
    expect([await touche(b.y - 7), await touche(b.y + b.height + 6)], nom).toEqual([true, true]);
  }
  // Rien ne joue ni ne naît avant le toucher.
  await page.clock.runFor(3000);
  expect(await audio(page)).toMatchObject({ contextes: 0, oscillateurs: [], souffles: [], session: 'auto' });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:lecteur')))).toEqual([]);
});

test('lecture : bol de début, les étapes avancent seules voix éteinte, un bol à chaque changement, l\'anneau du temps total et « il reste »', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page, { session: true });
  const BOLS = await frequencesBols(page);
  const v = await ouvrir(page, 'Respiration carrée');
  await bouton(v, 'Commencer').click();
  // Le contexte naît dans le toucher, en session « ambiante » ; le bol de début sonne.
  await expect.poll(() => bols(page)).toHaveLength(1);
  expect((await bols(page))[0].f).toBe(BOLS.debut);
  expect(await audio(page)).toMatchObject({ contextes: 1, etat: 'running', session: 'ambient' });
  await expect(consigne(v)).toHaveText(texte(CARREE[0]));
  await expect(reste(v)).toHaveText(/^il reste (2:52|2:51)$/);
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(bouton(v, 'Précédent')).toBeDisabled();
  await expect(v.getByRole('button', { name: 'Terminer', exact: true })).toBeVisible();
  // Aucun repère « 3 sur 9 », et pas de disque sur une étape sans rythme.
  await expect(v).not.toContainText(/\d+\s*(sur|\/)\s*\d+/);
  await expect(disque(v)).toHaveCount(0);
  await expect(motSouffle(v)).toHaveCount(0);

  // Voix éteinte, l'étape passe seule à la suivante à la fin de sa durée, avec un bol d'étape.
  await page.clock.runFor(15300);
  await expect(consigne(v)).toHaveText(texte(CARREE[1]));
  await expect.poll(async () => (await bols(page)).map((x) => x.f)).toEqual([BOLS.debut, BOLS.etape]);
  await page.clock.runFor(10000);
  await expect(consigne(v)).toHaveText(texte(CARREE[2]));
  // Le temps de tout l'exercice : 25,3 s faites sur 172.
  await expect(reste(v)).toHaveText('il reste 2:27');
  expect(await anneau(v)).toBeCloseTo(25.3 / 172, 1);

  // L'étape rythmée (à 61 s) : le disque et « Inspire », « Retiens », « Expire », « Retiens », quatre temps de 4 s.
  await page.clock.runFor(36000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  expect((await bols(page)).map((x) => x.f)).toEqual([BOLS.debut, ...Array(6).fill(BOLS.etape)]);
  await expect(motSouffle(v)).toHaveText('Inspire');
  await expect(disque(v)).toHaveClass(/phase-inspire/);
  await expect(disque(v)).toHaveClass(/duree-souffle-4/);
  await page.clock.runFor(4000);
  await expect(motSouffle(v)).toHaveText('Retiens');
  await expect(disque(v)).toHaveClass(/phase-retiens-plein/);
  await page.clock.runFor(4000);
  await expect(motSouffle(v)).toHaveText('Expire');
  await expect(disque(v)).toHaveClass(/phase-expire/);
  await page.clock.runFor(4000);
  await expect(motSouffle(v)).toHaveText('Retiens');
  await expect(disque(v)).toHaveClass(/phase-retiens-vide/);
  // Au passage à l'étape suivante (109 s), rythmée aussi : l'expiration (101 à 105 s), « Retiens » poumons vides (105 à
  // 109 s), puis « Inspire » ; jamais deux inspirations de suite.
  await page.clock.runFor(29000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  await expect(motSouffle(v)).toHaveText('Expire');
  await page.clock.runFor(4000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  await expect(motSouffle(v)).toHaveText('Retiens');
  await expect(disque(v)).toHaveClass(/phase-retiens-vide/);
  await page.clock.runFor(3000);
  await expect(consigne(v)).toHaveText(texte(CARREE[7]));
  await expect(motSouffle(v)).toHaveText('Inspire');
  await expect(disque(v)).toHaveClass(/phase-inspire/);
  // La fin de l'étape (157 s) : la dernière, sans rythme.
  await page.clock.runFor(48000);
  await expect(consigne(v)).toHaveText(texte(CARREE[8]));
  await expect(disque(v)).toHaveCount(0);

  // Le souffle des deux étapes : une inspiration ou une expiration toutes les 8 s, sans rupture au passage d'une étape à
  // l'autre (une inspiration, une expiration, et ainsi de suite), de 4 s chacune, calées sur l'horloge audio ; rien
  // pendant « Retiens », et aucun bol dans une étape (seulement à son début).
  const tous = await souffles(page);
  const debut = tous[1].t - 8;
  expect(tous.map((s) => Math.round(s.t - debut))).toEqual(Array.from({ length: 12 }, (_, i) => 8 * i));
  expect(tous[0].t - debut).toBeGreaterThanOrEqual(0);
  expect(tous[0].t - debut).toBeLessThan(0.3);
  for (const [i, s] of tous.slice(1).entries()) {
    expect(Math.abs(s.t - debut - 8 * (i + 1))).toBeLessThan(0.05);
    expect(s.fin - s.t).toBeGreaterThan(3.9);
    expect(s.fin - s.t).toBeLessThan(4.1);
  }
  const bolsDans = (de, a) => bols(page).then((l) => l.filter((b) => b.t > debut + de && b.t < debut + a));
  expect(await bolsDans(0.5, 47.5)).toEqual([]);
  expect(await bolsDans(47.5, 48.5)).toHaveLength(1);
  expect(await bolsDans(48.5, 95.5)).toEqual([]);
});

test('une pause au milieu d\'une étape rythmée : reprise d\'une inspiration, puis l\'étape suivante au même rythme continue le cycle, sans deux inspirations de suite', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page);
  const v = await ouvrir(page, 'Respiration carrée');
  await bouton(v, 'Commencer').click();
  // 70 s : 9 s dans la première étape rythmée (61 s), pendant une expiration.
  await page.clock.runFor(70000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  await expect(motSouffle(v)).toHaveText('Expire');
  await bouton(v, 'Pause').click();
  const avant = (await souffles(page)).length;
  await bouton(v, 'Reprendre').click();
  // La reprise repart d'une inspiration. Il reste 39 s à l'étape : deux cycles et 7 s ; elle finit pendant « Retiens »
  // poumons pleins, et l'étape suivante garde le cycle : « Retiens », puis « Expire », puis « Retiens », puis « Inspire ».
  await expect(motSouffle(v)).toHaveText('Inspire');
  await page.clock.runFor(37000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  const vus = [];
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(1000);
    vus.push([await consigne(v).textContent(), await motSouffle(v).textContent(), await disque(v).getAttribute('class')]);
  }
  const suivante = vus.filter(([c]) => texte(CARREE[7]).test(c));
  expect(suivante.length).toBeGreaterThanOrEqual(10);
  // Le disque ne repart pas au début de l'étape : il était poumons pleins, il le reste, puis il rétrécit.
  expect(suivante[0][1]).toBe('Retiens');
  expect(suivante[0][2]).toMatch(/phase-retiens-plein/);
  const mots = suivante.map(([, m]) => m).filter((m, i, l) => i === 0 || m !== l[i - 1]);
  expect(mots).toEqual(['Retiens', 'Expire', 'Retiens', 'Inspire']);
  // Le souffle sonore aussi : depuis la reprise, une inspiration ou une expiration toutes les 8 s, d'une étape à l'autre.
  const apres = (await souffles(page)).slice(avant);
  const zero = apres[1].t - 8;
  expect(apres.map((s) => Math.round(s.t - zero))).toEqual([0, 8, 16, 24, 32, 40, 48]);
  for (const [i, s] of apres.slice(1).entries()) expect(Math.abs(s.t - zero - 8 * (i + 1))).toBeLessThan(0.05);
});

test('en pause, « Reprendre » est à la place exacte de « Pause » (étape simple ou rythmée, texte par défaut ou grand) : un second toucher au même endroit reprend', async ({ page }) => {
  test.setTimeout(60000);
  for (const taille of [null, 23]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
    for (const [titre, avance, rythmee] of [['Pause d\'une minute', 2000, false], ['Respiration carrée', 61500, true]]) {
      const cas = `${titre}, ${taille || 17} px`;
      const v = await ouvrir(page, titre);
      await bouton(v, 'Commencer').click();
      await page.clock.runFor(avance);
      await expect(disque(v)).toHaveCount(rythmee ? 1 : 0);
      const p = await bouton(v, 'Pause').boundingBox();
      const [x, y] = [p.x + p.width / 2, p.y + p.height / 2];
      await page.touchscreen.tap(x, y);
      await expect(bouton(v, 'Reprendre')).toBeVisible();
      await expect(reste(v)).toHaveText(/^En pause · il reste/);
      const r = await bouton(v, 'Reprendre').boundingBox();
      for (const k of ['x', 'y', 'width', 'height']) expect(Math.abs(r[k] - p[k]), `${cas} : ${k}`).toBeLessThanOrEqual(1);
      // Les réglages sont sous l'écran de lecture, sous le pli : on les atteint en défilant.
      const pied = await v.locator('.parcours-pied').boundingBox();
      const reglages = v.getByRole('list', { name: 'Réglages du lecteur' });
      expect((await reglages.boundingBox()).y, cas).toBeGreaterThanOrEqual(pied.y);
      // Un second toucher au même endroit reprend la lecture.
      await page.touchscreen.tap(x, y);
      await expect(bouton(v, 'Pause')).toBeVisible();
      await expect(reste(v)).toHaveText(/^il reste/);
      expect(Math.abs((await bouton(v, 'Pause').boundingBox()).y - p.y), cas).toBeLessThanOrEqual(1);
      // En pause encore, les réglages se règlent en défilant, puis « Reprendre ».
      await bouton(v, 'Pause').click();
      const son = reglages.getByRole('combobox', { name: 'Son', exact: true });
      await son.scrollIntoViewIfNeeded();
      const b = await son.boundingBox();
      expect(b.y + b.height, cas).toBeLessThanOrEqual(pied.y);
      await bouton(v, 'Reprendre').click();
      await expect(bouton(v, 'Pause')).toBeVisible();
      await bouton(v, 'Fermer').click();
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('Précédent et Suivant sautent une étape (bol, voix) ; Suivant ne va pas plus loin que la dernière ; Terminer finit', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await espionnerAudio(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrir(page, 'Pause d\'une minute');
  await expect(v.getByRole('switch', { name: 'Lecture à voix haute' })).toHaveAttribute('aria-checked', 'true');
  expect((await parole(page)).amorces).toBe(0);
  await bouton(v, 'Commencer').click();
  // Le bol de début, puis la voix, le temps qu'il sonne. La voix parle hors du toucher : une parole muette, dans le
  // toucher, l'a débloquée (Safari).
  await expect.poll(() => bols(page)).toHaveLength(1);
  expect((await parole(page)).dits).toEqual([]);
  expect((await parole(page)).amorces).toBe(1);
  await page.clock.runFor(1600);
  expect(await parole(page)).toMatchObject({ dits: [PAUSE[0]], voix: 'fr-FR' });
  await bouton(v, 'Suivant').click();
  await expect(consigne(v)).toHaveText(PAUSE[1]);
  await expect.poll(async () => (await bols(page)).map((x) => x.f)).toEqual([BOLS.debut, BOLS.etape]);
  await page.clock.runFor(900);
  expect((await parole(page)).dits).toEqual(PAUSE.slice(0, 2));
  await bouton(v, 'Précédent').click();
  await expect(consigne(v)).toHaveText(PAUSE[0]);
  await page.clock.runFor(900);
  expect((await parole(page)).dits.at(-1)).toBe(PAUSE[0]);
  for (let i = 1; i <= 5; i++) await bouton(v, 'Suivant').click();
  await expect(consigne(v)).toHaveText(texte(PAUSE[5]));
  await expect(bouton(v, 'Suivant')).toBeDisabled();
  await v.getByRole('button', { name: 'Terminer', exact: true }).click();
  // Terminée avant le bout : « Fin de l'exercice. » seul, aucun anneau à moitié rempli.
  await finSeule(v);
  // Parcourir les textes ne fait pas une séance.
  await page.clock.runFor(2000);
  expect(await seances(page)).toEqual([]);
});

test('la fin : trois bols, « Fin de l\'exercice. » dit après eux, une séance, le verrou rendu ; fermeture 6 s plus tard et « Noter mon émotion » 6 s', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrir(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  await page.clock.runFor(60300);
  // Menée au bout, la fin est la même que terminée avant : « Fin de l'exercice. » seul.
  await finSeule(v);
  await expect(bouton(v, 'Pause')).toHaveCount(0);
  await expect(v.getByRole('button', { name: 'Terminer', exact: true })).toHaveCount(0);
  // Trois bols de fin, à 1,2 s d'écart.
  const fin = (await bols(page)).slice(-3);
  expect(fin.map((x) => x.f)).toEqual(BOLS.fin);
  expect(fin[1].t - fin[0].t).toBeCloseTo(1.2, 2);
  expect(fin[2].t - fin[1].t).toBeCloseTo(1.2, 2);
  expect((await parole(page)).dits).toEqual(PAUSE);
  await page.clock.runFor(3000);
  expect((await parole(page)).dits).toEqual([...PAUSE, 'Fin de l\'exercice.']);
  await expect.poll(() => seances(page)).toHaveLength(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'pause-une-minute', origine: 'bien-etre', date: '2026-10-15', heure: '20:30', fin: true, programme: 'pause-une-minute' });
  environ(s.dureeS, 60);
  expect(await verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  // Rien ne s'ouvre seul ; le lecteur se ferme 6 s après la fin, et revient au Programme, d'où il a été ouvert.
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/#\/bien-etre\/programme\/pause-une-minute$/);
  await page.clock.runFor(1200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  const message = page.getByRole('status');
  await expect(message).toContainText('Fin de l\'exercice.');
  await expect(message.getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  // Le message reste 6 s, puis s'efface. Aucune félicitation.
  await page.clock.runFor(5000);
  await expect(message).toBeVisible();
  await expect(message).not.toContainText(/bravo|félicit|bien joué|super/i);
  await page.clock.runFor(1500);
  await expect(message).toHaveCount(0);
  expect(await seances(page)).toHaveLength(1);
  // Le son dort une fois le lecteur fermé, et la session audio est rendue.
  expect(await audio(page)).toMatchObject({ etat: 'suspended', session: 'auto', fermes: 0 });
});

test('« Terminer » touché en pause : le toucher relance le son endormi, les trois bols sonnent, puis tout se rendort', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const BOLS = await frequencesBols(page);
  const v = await ouvrir(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => bols(page)).toHaveLength(1);
  await bouton(v, 'Pause').click();
  // En pause, le contexte s'endort et la session audio est rendue.
  await page.clock.runFor(1500);
  expect(await audio(page)).toMatchObject({ etat: 'suspended', session: 'auto' });
  await v.getByRole('button', { name: 'Terminer', exact: true }).click();
  await finSeule(v);
  await expect.poll(async () => (await bols(page)).map((x) => x.f)).toEqual([BOLS.debut, ...BOLS.fin]);
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient' });
  // Le lecteur se ferme, et le son se rendort.
  await page.clock.runFor(7500);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  expect(await audio(page)).toMatchObject({ etat: 'suspended', session: 'auto', fermes: 0 });
});

test('la cohérence cardiaque : lancée d\'un toucher sur sa ligne, au rythme réglé (4-6, 2 min), puis la fin et « Noter mon émotion »', async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('respiration', { duree: 2, rythme: '4-6', son: false }));
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  await aller(page, '#/bien-etre/calmer');
  const lancer = page.locator('main.entree-bien-etre').getByRole('button', { name: 'Commencer Cohérence cardiaque' });
  expect((await lancer.boundingBox()).width).toBeGreaterThanOrEqual(44);
  expect((await audio(page)).contextes).toBe(0);
  await lancer.click();
  // Un seul toucher : le lecteur s'ouvre et démarre, le contexte né dans le toucher.
  await expect(page).toHaveURL(/#\/bien-etre\/coherence$/);
  const v = vue(page, 'Cohérence cardiaque');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(bouton(v, 'Commencer')).toHaveCount(0);
  await expect(motSouffle(v)).toHaveText('Inspire');
  await expect(consigne(v)).toHaveText(texte('Respire au rythme des mots, sans forcer.'));
  await expect(reste(v)).toHaveText(/^il reste (2:00|1:59)$/);
  // Une seule étape : ni Précédent ni Suivant.
  await expect(bouton(v, 'Précédent')).toHaveCount(0);
  await expect(bouton(v, 'Suivant')).toHaveCount(0);
  await expect.poll(() => bols(page)).toHaveLength(1);
  expect((await bols(page))[0].f).toBe(BOLS.debut);
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient' });
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // La voix, débloquée dans le toucher de la ligne, dit la consigne après le bol.
  expect(await parole(page)).toMatchObject({ dits: [], amorces: 1 });
  await page.clock.runFor(4300);
  expect((await parole(page)).dits).toEqual(['Respire au rythme des mots, sans forcer.']);
  await expect(motSouffle(v)).toHaveText('Expire');
  await expect(disque(v)).toHaveClass(/duree-souffle-6/);
  await page.clock.runFor(116000);
  await expect(consigne(v)).toHaveText('Fin de l\'exercice.');
  // Le souffle : inspirer 4 s, expirer 6 s, douze fois ; aucun « Retiens ».
  const tous = await souffles(page);
  expect(tous).toHaveLength(24);
  const debut = tous[1].t - 4;
  expect(tous.map((s) => Math.round(s.t - debut))).toEqual(Array.from({ length: 12 }, (_, i) => [10 * i, 10 * i + 4]).flat());
  for (const [i, s] of tous.entries()) if (i > 0) expect(s.fin - s.t).toBeCloseTo(i % 2 ? 6 : 4, 1);
  await expect.poll(() => seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ exercice: 'coherence', origine: 'bien-etre', dureeS: 120, fin: true });
  // Lancée de sa ligne, et non depuis le Programme : elle n'y compte pas.
  expect((await seances(page))[0].programme).toBeNull();
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/calmer$/);
  await page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' }).click();
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(vue(page, 'Émotion du moment')).toBeVisible();
  // Le réglage de Moment difficile n'a pas bougé.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('respiration'))).toEqual({ duree: 2, rythme: '4-6', son: false });

  // Ouverte autrement que par ce bouton (l'adresse seule) : elle attend « Commencer », avec sa durée et son rythme en puces.
  await aller(page, '#/bien-etre/coherence');
  await expect(bouton(vue(page, 'Cohérence cardiaque'), 'Commencer')).toBeVisible();
  await expect(vue(page, 'Cohérence cardiaque').getByRole('combobox', { name: 'Durée', exact: true })).toHaveValue('2');
  await expect(vue(page, 'Cohérence cardiaque').getByRole('combobox', { name: 'Rythme', exact: true })).toHaveValue('4-6');
  await expect(vue(page, 'Cohérence cardiaque').locator('.lecteur-duree')).toHaveText(/^2\smin\s·\sassis$/);
  await expect(vue(page, 'Cohérence cardiaque').locator('.lecteur-description')).toHaveText(texte('Inspirer sur « Inspire », expirer sur « Expire ».'));
  const avant = await audio(page);
  await page.clock.runFor(3000);
  expect((await audio(page)).souffles).toHaveLength(avant.souffles.length);
  expect(await seances(page)).toHaveLength(1);
});

test('« Son : Aucun » : ni contexte, ni bol, ni souffle ; « Repères » : les bols sans le souffle ; le réglage est gardé', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page);
  let v = await ouvrir(page, 'Respiration carrée');
  await v.getByRole('combobox', { name: 'Son', exact: true }).selectOption('aucun');
  expect(await page.evaluate(() => localStorage.getItem('carnet:lecteur:son'))).toBe('"aucun"');
  await bouton(v, 'Commencer').click();
  // Jusque dans l'étape rythmée, puis la fin : le disque et les mots, mais aucun son.
  await page.clock.runFor(70000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  await expect(disque(v)).toHaveCount(1);
  await v.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(consigne(v)).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(1000);
  expect(await audio(page)).toMatchObject({ contextes: 0, oscillateurs: [], souffles: [] });
  await bouton(v, 'Fermer').click();

  // Rouvert : « Aucun » est gardé ; « Repères » donne les bols, pas le souffle.
  v = await ouvrir(page, 'Respiration carrée');
  await expect(v.getByRole('combobox', { name: 'Son', exact: true })).toHaveValue('aucun');
  await v.getByRole('combobox', { name: 'Son', exact: true }).selectOption('reperes');
  expect(await page.evaluate(() => localStorage.getItem('carnet:lecteur:son'))).toBe('"reperes"');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(70000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  expect((await bols(page)).length).toBe(7);
  expect((await audio(page)).souffles).toEqual([]);
  await bouton(v, 'Fermer').click();

  // De retour sur « Repères + souffle », le réglage par défaut n'est plus écrit.
  v = await ouvrir(page, 'Respiration carrée');
  await v.getByRole('combobox', { name: 'Son', exact: true }).selectOption('souffle');
  expect(await page.evaluate(() => localStorage.getItem('carnet:lecteur:son'))).toBeNull();
});

test('« Jouer même en mode silencieux » : session « playback » pendant la lecture, rendue ensuite ; éteint, « ambient »', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  let v = await ouvrir(page, 'Pause d\'une minute');
  const silencieux = v.getByRole('switch', { name: 'Jouer même en mode silencieux' });
  await silencieux.click();
  await expect(silencieux).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('carnet:lecteur:silencieux'))).toBe('true');
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await audio(page)).session).toBe('playback');
  await expect.poll(() => bols(page)).toHaveLength(1);
  // Pause : la session reste celle du lecteur un instant, puis est rendue ; « Reprendre » la redemande.
  await bouton(v, 'Pause').click();
  await page.clock.runFor(1500);
  expect(await audio(page)).toMatchObject({ session: 'auto', etat: 'suspended' });
  await bouton(v, 'Reprendre').click();
  await expect.poll(async () => (await audio(page)).session).toBe('playback');
  await bouton(v, 'Fermer').click();
  await page.clock.runFor(1500);
  expect((await audio(page)).session).toBe('auto');

  // Éteint : « ambient ».
  v = await ouvrir(page, 'Pause d\'une minute');
  await expect(v.getByRole('switch', { name: 'Jouer même en mode silencieux' })).toHaveAttribute('aria-checked', 'true');
  await v.getByRole('switch', { name: 'Jouer même en mode silencieux' }).click();
  expect(await page.evaluate(() => localStorage.getItem('carnet:lecteur:silencieux'))).toBeNull();
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await audio(page)).session).toBe('ambient');
});

test('point de vigilance 4 : après le lecteur (« Repères + souffle », mode silencieux forcé), Moment difficile et « Respirer » restent muets par défaut', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:lecteur:silencieux', 'true'));
  await espionnerAudio(page, { session: true });
  const v = await ouvrir(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => bols(page)).toHaveLength(1);
  await page.clock.runFor(3000);
  await bouton(v, 'Fermer').click();
  const apresLecteur = await audio(page);
  expect(apresLecteur.contextes).toBe(1);

  // Moment difficile : sa respiration, au réglage de Réglages › Moment difficile (éteint au départ) : aucune note.
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(30000);
  await expect(md.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  await md.getByRole('button', { name: 'Arrêter' }).click();
  // « Respirer », dans la carte « Pour récupérer, je… » (v9 : en tête de l'écran 3 de l'émotion, après la flèche).
  await page.evaluate(async () => {
    const m = window.__carnet.repo.meta;
    await m.ecrire('monPlan', { quandCaMonte: 'je sors marcher', pourRecuperer: 'je m\'allonge', siAlors: [] });
    await m.ecrire('ressourcer', { energieBasse: true });
  });
  await aller(page, '#/moment');
  const emo = vue(page, 'Émotion du moment');
  await noter(emo, 'bleu', 'Vide');
  await continuer(emo).click();
  const carte = emo.getByRole('region', { name: 'Pour récupérer, je…' });
  await carte.getByRole('button', { name: 'Respirer', exact: true }).click();
  // Le toucher prépare le contexte en session « ambiante » (jamais celle du lecteur), puis la respiration le rendort.
  await expect.poll(async () => (await audio(page)).session).toBe('ambient');
  await page.clock.runFor(20000);
  await expect(carte.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  const fin = await audio(page);
  expect(fin.notes).toHaveLength(apresLecteur.notes.length);
  expect(fin.oscillateurs).toHaveLength(apresLecteur.oscillateurs.length);
  expect(fin.souffles).toHaveLength(apresLecteur.souffles.length);
  expect(await notes(page)).toBe(apresLecteur.notes.length);
  // Le réglage des écrans de crise n'a jamais été écrit : éteint par défaut.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('respiration'))).toBeNull();
});

test('point de vigilance 4 : lecture interrompue (arrière-plan, puis sortie) : voix et sons coupés, verrou rendu, une seule séance, aucun message', async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await espionnerAudio(page);
  await installerVerrou(page);
  const v = await ouvrir(page, 'Respiration carrée');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // 70 s : dans l'étape rythmée, le souffle programmé.
  await page.clock.runFor(70000);
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  expect((await souffles(page)).length).toBeGreaterThanOrEqual(2);
  expect(await seances(page)).toEqual([]);

  // L'écran se verrouille : pause, voix et souffle coupés (même celui programmé), verrou rendu, séance notée.
  const avant = await parole(page);
  await cacher(page);
  await expect(v.getByText(/^En pause · il reste/)).toBeVisible();
  await expect(bouton(v, 'Reprendre')).toBeVisible();
  await expect(disque(v)).toHaveClass(/en-pause/);
  expect((await parole(page)).annulations).toBeGreaterThan(avant.annulations);
  const coupe = await horloge(page);
  for (const s of await souffles(page)) expect(s.fin).toBeLessThanOrEqual(coupe + 0.25);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'respiration-carree', origine: 'bien-etre', programme: 'respiration-carree' });
  // Interrompue : pas menée au bout.
  expect(notee.fin).toBeNull();
  environ(notee.dureeS, 70);
  // En pause, rien n'avance et rien ne sonne ni ne parle ; les réglages sont là.
  const [nS, nB, nD] = [(await souffles(page)).length, (await bols(page)).length, (await parole(page)).dits.length];
  await expect(v.getByRole('list', { name: 'Réglages du lecteur' })).toBeVisible();
  await page.clock.runFor(60000);
  await montrer(page);
  await page.clock.runFor(2000);
  await expect(bouton(v, 'Reprendre')).toBeVisible();
  await expect(consigne(v)).toHaveText(texte(CARREE[6]));
  expect([(await souffles(page)).length, (await bols(page)).length, (await parole(page)).dits.length]).toEqual([nS, nB, nD]);

  // Reprendre : l'étape relue, le souffle repart d'une inspiration, l'écran redemandé.
  await bouton(v, 'Reprendre').click();
  await expect(motSouffle(v)).toHaveText('Inspire');
  expect((await parole(page)).dits.at(-1)).toBe(CARREE[6]);
  await expect.poll(async () => (await souffles(page)).length).toBe(nS + 1);
  expect((await souffles(page)).at(-1).t - await horloge(page)).toBeLessThan(0.3);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 1 });
  await page.clock.runFor(3000);

  // « Fermer » pendant la lecture : tout se coupe, une seule séance à sa durée active, aucun message.
  const annulees = (await parole(page)).annulations;
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  const sortie = await horloge(page);
  for (const s of await souffles(page)) expect(s.fin).toBeLessThanOrEqual(sortie + 0.25);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 2 });
  expect((await parole(page)).annulations).toBeGreaterThan(annulees);
  await expect.poll(async () => (await seances(page))[0].dureeS).toBeGreaterThanOrEqual(notee.dureeS + 3);
  expect(await seances(page)).toHaveLength(1);
  environ((await seances(page))[0].dureeS, 73);
  expect((await seances(page))[0].fin).toBeNull();
  await expect(page.getByRole('button', { name: 'Noter mon émotion' })).toHaveCount(0);
  const [fS, fB] = [(await souffles(page)).length, (await bols(page)).length];
  await page.clock.runFor(10000);
  expect([(await souffles(page)).length, (await bols(page)).length]).toEqual([fS, fB]);
});

test('le disque : il respire sur la durée de chaque temps ; avec « Réduire les animations », il ne bouge pas et se cercle poumons pleins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let v = await ouvrir(page, 'Respiration carrée');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(61500);
  await expect(disque(v)).toHaveClass(/phase-inspire/);
  expect(await disque(v).evaluate((d) => { const c = getComputedStyle(d); return [c.animationName, c.animationDuration]; })).toEqual(['souffle-inspire', '4s']);
  await page.clock.runFor(8000);
  await expect(disque(v)).toHaveClass(/phase-expire/);
  expect(await disque(v).evaluate((d) => getComputedStyle(d).animationName)).toBe('souffle-expire');
  await bouton(v, 'Fermer').click();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  v = await ouvrir(page, 'Respiration carrée');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(61500);
  const etat = () => disque(v).evaluate((d) => { const c = getComputedStyle(d); return { animation: c.animationName, forme: c.transform, cercle: c.boxShadow !== 'none' }; });
  await expect(disque(v)).toHaveClass(/phase-inspire/);
  // Les mots, eux, disent la phase : les textes de la cohérence cardiaque s'appuient sur eux, pas sur le disque.
  await expect(motSouffle(v)).toHaveText('Inspire');
  const plein = await etat();
  expect(plein).toMatchObject({ animation: 'none', cercle: true });
  await page.clock.runFor(4000);
  await expect(disque(v)).toHaveClass(/phase-retiens-plein/);
  expect(await etat()).toEqual(plein);
  await page.clock.runFor(4000);
  await expect(disque(v)).toHaveClass(/phase-expire/);
  await expect(motSouffle(v)).toHaveText('Expire');
  expect(await etat()).toEqual({ ...plein, cercle: false });
});
