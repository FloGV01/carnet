import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { espionnerAudio, audio } from '../aides/audio.js';
import { installerParole, installerVerrou, verrou, cacher, montrer, seances, environ } from '../aides/lecteur.js';

// v8 · Le Programme (spec §6, §12.2 et §12.4) : son entrée de Bien-être (v10), l'écran Programme (une carte par étape, ses séances,
// « Faite le 12/10 » sur une séance lancée depuis le
// Programme et menée au bout, rien sur les autres), le point de vigilance 4 (une séance interrompue ne date rien, une seule
// séance, le verrou rendu), aucun chiffre ni pourcentage, et la cohérence cardiaque lancée ailleurs, qui ne marque rien.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const entreeProgramme = (page) => page.locator('main.bien-etre').getByRole('link', { name: 'Programme' });
const ecranProgramme = (page) => page.locator('main.programme');
// La rangée d'une séance de l'écran Programme : le lien, nommé par son titre.
const rangee = (page, titre) => ecranProgramme(page).getByRole('link', { name: new RegExp(`^${titre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) });
// Une séance lancée depuis le Programme et menée au bout, versée en base.
const faite = (page, programme, date, heure = '10:00') => page.evaluate(([p, d, h]) => window.__carnet.repo.seances.creer({
  date: d, heure: h, exercice: p, origine: 'bien-etre', dureeS: 200, fin: true, programme: p,
}), [programme, date, heure]);
const ETAPES = [
  'Respirer', 'Autour de toi', 'Les cinq zones', 'Tendre et relâcher', 'Zone par zone', 'Marcher, respirer en rythme',
  'Un lieu, un souvenir', 'Le corps entier, ce qui compte',
];
const TITRES = [
  'Respiration abdominale', 'Pause d\'une minute', 'Les sons', 'Ancrage 5-4-3-2-1', 'Les cinq zones', 'Respiration carrée',
  'Relaxation dynamique des épaules', 'Mouvements lents', 'Tension et détente', 'Faire le point avec mon corps', 'Marche lente',
  'Cohérence cardiaque', 'Lieu ressource', 'Un bon moment passé', 'Un moment à venir', 'Scan corporel', 'Ce qui compte pour moi',
];
// Le texte d'un écran sans ce qui y est permis : les durées (« 5 min »), « Faite le 12/10 », « 5-4-3-2-1 ».
const sansPermis = (t) => t.replace(/\d+\s*min\b/g, '').replace(/Faite le \d{2}\/\d{2}(\/\d{4})?/g, '').replace(/5-4-3-2-1/g, '');

test('l\'écran Programme : la présentation, une carte par étape (son titre seul), 17 séances avec « 5 min · assis » ; tout s\'ouvre d\'un toucher ; rien sur ce qui n\'est pas fait', async ({ page }) => {
  await aller(page, '#/bien-etre');
  // L'entrée Programme ouvre l'écran Programme ; « Retour » ramène à Bien-être.
  await entreeProgramme(page).click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  const ecran = ecranProgramme(page);
  await expect(ecran.getByRole('heading', { name: 'Programme', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Bien-être' })).toHaveAttribute('aria-current', 'page');
  await expect(ecran.locator('.presentation-programme')).toContainText('Inspiré de la sophrologie et de la pleine conscience');
  await expect(ecran.locator('.presentation-programme')).toContainText(/une étape par semaine, une ou deux séances, si tu veux/);
  await expect(ecran.locator('.ligne-fixe')).toHaveText('Tu peux t\'arrêter à tout moment.');
  // Une carte par étape, avec son titre seul, sans numéro.
  await expect(ecran.locator('.etape-programme')).toHaveCount(8);
  await expect(ecran.getByRole('heading', { level: 2 })).toHaveText(ETAPES);
  await expect(ecran.getByRole('region', { name: 'Un lieu, un souvenir' }).getByRole('link')).toHaveCount(3);
  // Les 17 séances, dans l'ordre, chacune avec sa durée et sa posture ; aucune « Faite le », aucune case, aucun grisé.
  await expect(ecran.locator('.exercice-titre')).toHaveText(TITRES);
  await expect(ecran.getByRole('link')).toHaveCount(17);
  await expect(rangee(page, 'Les sons').locator('.exercice-description')).toHaveText(/^5\smin\s·\sassis$/);
  await expect(rangee(page, 'Cohérence cardiaque').locator('.exercice-description')).toHaveText(/^5\smin\s·\sassis$/);
  await expect(ecran.locator('.seance-faite')).toHaveCount(0);
  await expect(ecran).not.toContainText(/Faite|faite|à faire|manqué|en retard|verrouill/);
  // Toutes les rangées se ressemblent (même opacité, même couleur de titre) et font 44 au moins.
  const styles = await ecran.locator('.ligne-seance').evaluateAll((l) => l.map((a) => {
    const c = getComputedStyle(a); return `${c.opacity} ${getComputedStyle(a.querySelector('.exercice-titre')).color}`;
  }));
  expect(new Set(styles).size).toBe(1);
  for (const r of await ecran.locator('.ligne-seance').all()) expect((await r.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Rien n'est verrouillé : la dernière séance s'ouvre d'un toucher, dans le lecteur, qui attend « Commencer ».
  await rangee(page, 'Ce qui compte pour moi').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme\/ce-qui-compte$/);
  const v = vue(page, 'Ce qui compte pour moi');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(v.locator('.lecteur-duree')).toHaveText(/^6\smin\s·\sassis$/);
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/bien-etre$/);
  // Une séance inconnue ramène au Programme.
  await aller(page, '#/bien-etre/programme/premiers-pas');
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
});

test('une séance lancée depuis le Programme : le son né dans « Commencer », menée au bout, elle porte `fin` et `programme`, et « Faite le » sur son écran, la date la plus récente ; rien sur l\'accueil', async ({ page }) => {
  await faite(page, 'respiration-abdominale', '2026-10-12');
  await page.reload();
  await appPrete(page);
  await espionnerAudio(page);
  await installerVerrou(page);
  await aller(page, '#/bien-etre');
  await entreeProgramme(page).click();
  await rangee(page, 'Pause d\'une minute').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme\/pause-une-minute$/);
  const v = vue(page, 'Pause d\'une minute');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  expect((await audio(page)).contextes).toBe(0);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Pause')).toBeVisible();
  expect((await audio(page)).contextes).toBe(1);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  // Menée au bout : une séance, avec `fin` et `programme` ; le lecteur revient au Programme.
  await page.clock.runFor(60300);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).filter((s) => s.exercice === 'pause-une-minute')).toHaveLength(1);
  const s = (await seances(page)).find((x) => x.exercice === 'pause-une-minute');
  expect(s).toMatchObject({ date: '2026-10-15', heure: '20:30', origine: 'bien-etre', fin: true, programme: 'pause-une-minute' });
  environ(s.dureeS, 60);
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  // L'écran Programme : la coche et « Faite le », la date la plus récente ; rien ailleurs.
  await expect(rangee(page, 'Pause d\'une minute').locator('.seance-faite')).toHaveText('Faite le 15/10');
  await expect(rangee(page, 'Pause d\'une minute').locator('.seance-faite svg')).toHaveCount(1);
  await expect(rangee(page, 'Respiration abdominale').locator('.seance-faite')).toHaveText('Faite le 12/10');
  await expect(ecranProgramme(page).locator('.seance-faite')).toHaveCount(2);
  // L'accueil de Bien-être n'en dit rien (v10) : ni la séance qui vient, ni date, ni durée.
  await aller(page, '#/bien-etre');
  await expect(page.locator('main.bien-etre .entrees')).toBeVisible();
  await expect(page.locator('main.bien-etre')).not.toContainText(/Les sons|Faite|\d/);
});

test('une séance menée au bout depuis l\'écran Programme : 2 touchers, puis le retour au Programme, où elle porte « Faite le 15/10 »', async ({ page }) => {
  await faite(page, 'les-sons', '2025-11-03');
  await aller(page, '#/bien-etre/programme');
  // Une séance faite une autre année porte l'année.
  await expect(rangee(page, 'Les sons').locator('.seance-faite')).toHaveText('Faite le 03/11/2025');
  await rangee(page, 'Pause d\'une minute').click();
  const v = vue(page, 'Pause d\'une minute');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(60300);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).find((s) => s.exercice === 'pause-une-minute')).toMatchObject({ fin: true, programme: 'pause-une-minute' });
  // Rien ne s'ouvre seul ; le lecteur se ferme et revient au Programme.
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(rangee(page, 'Pause d\'une minute').locator('.seance-faite')).toHaveText('Faite le 15/10');
  await expect(page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  // Refaite, la séance garde une seule date, la plus récente.
  await faite(page, 'pause-une-minute', '2026-10-13');
  await page.reload();
  await appPrete(page);
  await aller(page, '#/bien-etre/programme');
  await expect(rangee(page, 'Pause d\'une minute').locator('.seance-faite')).toHaveText('Faite le 15/10');
});

test('point de vigilance 4 : une séance du Programme interrompue (arrière-plan, puis sortie) ne date rien ; une seule séance, voix coupée, verrou rendu', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:exercice:voix', 'true'));
  await installerVerrou(page);
  await aller(page, '#/bien-etre/programme');
  await rangee(page, 'Tension et détente').click();
  const v = vue(page, 'Tension et détente');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 0 });
  await page.clock.runFor(70000);
  // L'écran se verrouille : pause, verrou rendu ; la séance est notée (plus de 60 s), sans `fin`.
  await cacher(page);
  await expect(v.getByText(/^En pause/)).toBeVisible();
  await expect.poll(() => verrou(page)).toEqual({ demandes: 1, rendus: 1 });
  await expect.poll(() => seances(page)).toHaveLength(1);
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'tension-detente', origine: 'bien-etre', programme: 'tension-detente' });
  expect(notee.fin).toBeNull();
  await montrer(page);
  await bouton(v, 'Reprendre').click();
  await page.clock.runFor(10000);
  // La sortie en route : une seule séance, toujours sans `fin`, aucun message, et rien dans le Programme.
  const annulations = await page.evaluate(() => window.__parole.annulations);
  await bouton(v, 'Fermer').click();
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect.poll(() => verrou(page)).toEqual({ demandes: 2, rendus: 2 });
  expect(await page.evaluate(() => window.__parole.annulations)).toBeGreaterThan(annulations);
  await expect.poll(async () => (await seances(page))[0].dureeS).toBeGreaterThanOrEqual(notee.dureeS + 10);
  expect(await seances(page)).toHaveLength(1);
  expect((await seances(page))[0].fin).toBeNull();
  await expect(page.getByRole('button', { name: 'Noter mon émotion' })).toHaveCount(0);
  await expect(ecranProgramme(page).locator('.seance-faite')).toHaveCount(0);
  await expect(ecranProgramme(page)).not.toContainText('Faite');
  // « Terminer » avant la fin : rien non plus.
  await rangee(page, 'Pause d\'une minute').click();
  await bouton(vue(page, 'Pause d\'une minute'), 'Commencer').click();
  await page.clock.runFor(20000);
  await bouton(vue(page, 'Pause d\'une minute'), 'Terminer').click();
  await page.clock.runFor(7000);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(ecranProgramme(page).locator('.seance-faite')).toHaveCount(0);
});

test('une séance notée en arrière-plan (après 60 s), reprise puis menée au bout : une seule séance, qui prend `fin` et date la séance', async ({ page }) => {
  await aller(page, '#/bien-etre/programme');
  await rangee(page, 'Ancrage 5-4-3-2-1').click();
  const v = vue(page, 'Ancrage 5-4-3-2-1');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(70000);
  await cacher(page);
  await expect.poll(() => seances(page)).toHaveLength(1);
  const notee = (await seances(page))[0];
  expect(notee).toMatchObject({ exercice: 'ancrage-54321', programme: 'ancrage-54321', fin: null });
  await montrer(page);
  await bouton(v, 'Reprendre').click();
  await page.clock.runFor(110500);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page))[0].fin).toBe(true);
  expect(await seances(page)).toHaveLength(1);
  expect((await seances(page))[0]).toMatchObject({ id: notee.id, programme: 'ancrage-54321' });
  environ((await seances(page))[0].dureeS, 180);
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(rangee(page, 'Ancrage 5-4-3-2-1').locator('.seance-faite')).toHaveText('Faite le 15/10');
});

test('aucun chiffre ni pourcentage, sauf les durées et « Faite le » ; ni total, ni série, ni progression', async ({ page }) => {
  for (const [p, d] of [['respiration-abdominale', '2026-10-01'], ['pause-une-minute', '2026-10-02'], ['les-sons', '2026-10-05'], ['epaules', '2026-10-12'], ['coherence', '2026-10-14']]) {
    await faite(page, p, d);
  }
  await page.reload();
  await appPrete(page);
  for (const taille of [null, 23]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
    await aller(page, '#/bien-etre/programme');
    const ecran = ecranProgramme(page);
    await expect(ecran.locator('.seance-faite')).toHaveCount(5);
    const texte = await ecran.innerText();
    expect(sansPermis(texte)).not.toMatch(/\d|%/);
    expect(texte).not.toMatch(/\bsur\s+(dix-sept|huit)\b|séances faites|terminé|semaine \d|étape \d|il y a|depuis|série|bravo|félicit/i);
    // Ni barre, ni anneau, ni case.
    await expect(ecran.locator('progress, meter, [role=progressbar], svg circle, input[type=checkbox]')).toHaveCount(0);
    // Rien ne déborde de côté.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // L'accueil de Bien-être (v10) : aucun chiffre du tout.
    await aller(page, '#/bien-etre');
    await expect(entreeProgramme(page)).toBeVisible();
    expect(await page.locator('main.bien-etre').innerText()).not.toMatch(/\d|%/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('une cohérence cardiaque lancée depuis « Me calmer vite » ou Moment difficile ne marque rien ; dans le Programme, elle dure 5 min', async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('respiration', { duree: 2, rythme: '4-6', son: false }));
  // Sa ligne dans « Me calmer vite » : menée au bout (2 min).
  await aller(page, '#/bien-etre/calmer');
  await page.getByRole('button', { name: 'Commencer Cohérence cardiaque' }).click();
  await expect(bouton(vue(page, 'Cohérence cardiaque'), 'Pause')).toBeVisible();
  await page.clock.runFor(120400);
  await expect(vue(page, 'Cohérence cardiaque').locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/calmer$/);
  // Moment difficile : menée au bout (2 min).
  await aller(page, '#/moment-difficile');
  const md = vue(page, 'Moment difficile');
  await md.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(121000);
  await expect.poll(async () => (await seances(page)).length).toBe(2);
  const toutes = await seances(page);
  expect(toutes.map((s) => s.origine).sort()).toEqual(['bien-etre', 'moment-difficile']);
  for (const s of toutes) {
    expect(s).toMatchObject({ exercice: 'coherence', fin: true });
    expect(s.programme).toBeNull();
  }
  // Rien dans le Programme.
  await aller(page, '#/bien-etre/programme');
  await expect(rangee(page, 'Cohérence cardiaque')).toBeVisible();
  await expect(ecranProgramme(page).locator('.seance-faite')).toHaveCount(0);

  // Dans le Programme, la cohérence dure 5 min, au rythme réglé, quel que soit le réglage de durée ; menée au bout,
  // elle y porte « Faite le ».
  await aller(page, '#/bien-etre/programme');
  await rangee(page, 'Cohérence cardiaque').click();
  const v = vue(page, 'Cohérence cardiaque');
  await expect(v.locator('.lecteur-duree')).toHaveText(/^5\smin\s·\sassis$/);
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste (5:00|4:59)$/);
  await page.clock.runFor(4300);
  await expect(v.locator('.mot-souffle')).toHaveText('Expire');
  await expect(v.locator('.disque-souffle')).toHaveClass(/duree-souffle-6/);
  await page.clock.runFor(296000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).filter((s) => s.programme === 'coherence')).toHaveLength(1);
  expect((await seances(page)).find((s) => s.programme === 'coherence')).toMatchObject({ fin: true, dureeS: 300, origine: 'bien-etre' });
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(rangee(page, 'Cohérence cardiaque').locator('.seance-faite')).toHaveText('Faite le 15/10');
  // Le réglage de Moment difficile n'a pas bougé.
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('respiration'))).toEqual({ duree: 2, rythme: '4-6', son: false });
});

test('la cohérence cardiaque du Programme arrêtée en route (« Terminer » à 2:31 sur 5:00) : une séance sans `fin`, aucune « Faite le »', async ({ page }) => {
  // Une séance d'une seule étape est sur sa dernière étape dès le début : passé la moitié du temps, « Terminer » reste un
  // arrêt en route (spec §6 et §12.2), comme dans Moment difficile.
  await aller(page, '#/bien-etre/programme');
  await rangee(page, 'Cohérence cardiaque').click();
  const v = vue(page, 'Cohérence cardiaque');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(151000);
  await expect(v.locator('.lecteur-reste')).toHaveText(/^il reste 2:(28|29|30)$/);
  await bouton(v, 'Terminer').click();
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  // Plus de 60 s : la séance est gardée pour Mes jours, avec son `programme`, mais sans `fin`.
  await expect.poll(() => seances(page)).toHaveLength(1);
  const s = (await seances(page))[0];
  expect(s).toMatchObject({ exercice: 'coherence', origine: 'bien-etre', programme: 'coherence' });
  expect(s.fin).toBeNull();
  environ(s.dureeS, 151);
  await page.clock.runFor(6200);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(ecranProgramme(page).locator('.seance-faite')).toHaveCount(0);
  await expect(ecranProgramme(page)).not.toContainText('Faite');
  expect(await seances(page)).toHaveLength(1);
});
