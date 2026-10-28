import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';
import { vueMoment, bulle, mot, noter, retour, fermer, continuer, NOTEE } from '../aides/emotion.js';

// v6 : saisie du soir. « Ce qui a pesé · ce qui a rechargé » : un repli sous « Nuit en détail » (masqué par défaut depuis la
// v8, comme « Sport en détail » et « Contact en détail », passés dans leur carte).
const repo = (page, f, arg) => page.evaluate(f, arg);
const TITRE = 'Ce qui a pesé · ce qui a rechargé';
// Une journée sans plus aucune valeur n'a plus d'entrée : le champ vaut alors null.
const champDuJour = (page, champ) => async () => (await entreeDuJour(page))?.[champ] ?? null;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 14, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const repli = (page) => page.getByRole('button', { name: new RegExp(`^${TITRE}`) });

test('ce qui a pesé, ce qui a rechargé : replié en tête de la liste (v8), un toucher enregistre, un second efface', async ({ page }) => {
  await expect(page.locator('.replis .repli-titre')).toHaveText([TITRE, 'Notes libres']);
  await expect(repli(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupe(page, 'Ce qui a pesé')).toHaveCount(0);

  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button')).toHaveCount(10);
  await expect(groupe(page, 'Ce qui a rechargé').getByRole('button')).toHaveCount(8);
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await entreeDuJour(page))?.pese).toEqual(['pese:bruit']);
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(champDuJour(page, 'pese')).toBeNull();
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(async () => (await entreeDuJour(page))?.recharge).toEqual(['recharge:calme']);
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(champDuJour(page, 'recharge')).toBeNull();
});

test('replié, le repli résume ce qui est noté ; sans rien de noté, il ne dit rien', async ({ page }) => {
  await expect(repli(page).locator('.repli-resume')).toHaveCount(0);
  await repli(page).click();
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await toucher(page, 'Ce qui a pesé', 'Trajets');
  await toucher(page, 'Ce qui a rechargé', 'Calme');
  await expect.poll(async () => (await entreeDuJour(page))?.pese).toEqual(['pese:bruit', 'pese:trajets']);
  await expect.poll(async () => (await entreeDuJour(page))?.recharge).toEqual(['recharge:calme']);
  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé')).toHaveCount(0);
  await expect(repli(page).locator('.repli-resume')).toHaveText('pesé : bruit, trajets · rechargé : calme');
  // Une seule des deux listes : l'autre n'est pas mentionnée.
  await repli(page).click();
  await toucher(page, 'Ce qui a pesé', 'Bruit');
  await toucher(page, 'Ce qui a pesé', 'Trajets');
  await repli(page).click();
  await expect(repli(page).locator('.repli-resume')).toHaveText('rechargé : calme');
  // Il se relit tel quel après un rechargement.
  await page.reload();
  await expect(repli(page).locator('.repli-resume')).toHaveText('rechargé : calme');
});

test('masqué dans Réglages › Le soir, le repli reste affiché un jour où il porte des valeurs', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-13', { lieu: 'lieu:bureau', pese: ['pese:bruit'] }));
  await aller(page, '#/reglages/journee');
  const interrupteur = page.getByRole('switch', { name: `Afficher ${TITRE}` });
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  // Sans place dans l'ordre des champs : pas de flèches.
  await expect(page.getByRole('button', { name: /^(Monter|Descendre) Ce qui a pesé/ })).toHaveCount(0);
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur', 'nuit', 'peseRecharge']);
  expect((await repo(page, () => window.__carnet.repo.meta.lire('journee'))).ordre).not.toContain('peseRecharge');

  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('button', { name: /^Notes libres/ })).toBeVisible();
  await expect(repli(page)).toHaveCount(0);
  await aller(page, '#/jour/2026-10-13');
  await expect(repli(page).locator('.repli-resume')).toHaveText('pesé : bruit');
  // Il s'ouvre et se corrige comme d'habitude.
  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'true');

  await aller(page, '#/reglages/journee');
  await page.getByRole('switch', { name: `Afficher ${TITRE}` }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur', 'nuit']);
  await aller(page, '#/aujourdhui');
  await expect(repli(page)).toHaveCount(1);
});

test('un long résumé replié reste dans la page : coupé par une ellipse, sans défilement de côté', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 797 });
  await repo(page, () => window.__carnet.repo.journal.patch(window.__carnet.repo.aujourdhui(), {
    pese: ['pese:bruit', 'pese:lumiere', 'pese:monde', 'pese:changement', 'pese:attente'],
    recharge: ['recharge:seul', 'recharge:calme', 'recharge:interet'],
  }));
  await page.reload();
  const resume = repli(page).locator('.repli-resume');
  await expect(resume).toContainText('pesé : bruit, lumière, monde, changement, attente · rechargé : être seul, calme');
  const mesures = await page.evaluate(() => {
    const tete = [...document.querySelectorAll('.repli.resume-sous .repli-tete')].find((t) => t.textContent.includes('pesé'));
    const r = tete.querySelector('.repli-resume');
    return {
      droiteResume: r.getBoundingClientRect().right, droiteTete: tete.getBoundingClientRect().right,
      coupe: r.scrollWidth > r.clientWidth, ellipse: getComputedStyle(r).textOverflow,
      debordePage: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(mesures.droiteResume).toBeLessThanOrEqual(mesures.droiteTete);
  expect(mesures.coupe).toBe(true);
  expect(mesures.ellipse).toBe('ellipsis');
  expect(mesures.debordePage).toBe(false);
});

// ---------- v6 : humeur du moment (émotion du moment en v7, en carte en v8, plein écran en v9), « C'était vers… » ----------
// v9 (4/8) : « Maintenant ▾ » est sous les quatre bulles de l'écran 1 ; le relevé est créé au mot, sur la carte. Une
// couleur n'écrit rien. La flèche ferme l'écran avec le message.

const releves = (page) => () => repo(page, () => window.__carnet.repo.humeurs.tous());
const HEURES = ['Maintenant', '6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h'];
const heure = (vue, h) => vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: h, exact: true });
// Le bouton qui ouvre et ferme la liste : « Maintenant » ou « C'était vers 14 h » (la liste a aussi son « Maintenant »).
const boutonQuand = (vue) => vue.locator('.ligne-date > .btn-lien');
// La ligne d'un relevé dans « Ma journée », sur Aujourd'hui.
const ligneDuJour = (page, texte) => page.locator('.liste-evenements > li').filter({ hasText: texte });

test('C\'était vers… : l\'heure choisie avant toute valeur n\'écrit rien, elle est posée à la création', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  const quand = vue.getByRole('button', { name: 'Maintenant' });
  await expect(quand).toHaveAttribute('aria-expanded', 'false');
  await expect(vue.getByRole('group', { name: 'C\'était vers…' })).toHaveCount(0);
  await quand.click();
  // Il est 21:00 : les heures paires de 6 h à 20 h, déjà atteintes.
  await expect(vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button')).toHaveText(HEURES);
  await heure(vue, '14 h').click();
  await expect(vue.getByRole('button', { name: 'C\'était vers 14 h' })).toBeVisible();
  // v6.1 : la liste reste ouverte, l'heure choisie allumée.
  await expect(heure(vue, '14 h')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(150);
  expect(await releves(page)()).toEqual([]);

  // Une couleur n'écrit rien ; le mot crée le relevé, à l'heure choisie.
  await bulle(vue, 'bleu').click();
  await page.clock.runFor(150);
  expect(await releves(page)()).toEqual([]);
  await mot(vue, 'Vide').click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '14:00', vers: true, emotion: 'roue:tristesse:vide', humeur: null, energie: 'energie:basse' }]);
  await continuer(vue).click();
  await expect(page.getByText(NOTEE)).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // « Ma journée » l'écrit « vers 14 h ».
  await expect(ligneDuJour(page, 'Vide')).toContainText('vers 14 h');
});

test('C\'était vers… : le relevé déjà créé change d\'heure et revient à « maintenant » ; le mot effacé, une heure « vers » le garde (v9, spec §13.5), « Maintenant » ensuite le supprime', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await noter(vue, 'jaune', 'Curieux');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '21:00', vers: null, emotion: 'roue:joie:curieux', energie: 'energie:haute' }]);
  const id = (await releves(page)())[0].id;

  // De retour aux couleurs, « Maintenant ▾ » change l'heure du relevé.
  await retour(vue).click();
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await heure(vue, '16 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '16:00', vers: true, energie: 'energie:haute' }]);
  // La liste reste ouverte : les heures se choisissent l'une après l'autre.
  await heure(vue, '8 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, heure: '08:00', vers: true }]);

  // « Maintenant » remet l'heure réelle ; vers redevient null, jamais false.
  await heure(vue, 'Maintenant').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '21:00', vers: null, energie: 'energie:haute' }]);
  await expect(boutonQuand(vue)).toHaveText('Maintenant');

  // v9 (spec §13.5) : effacer le mot d'un relevé « vers » (et son énergie avec lui) le garde, à son heure : il reste
  // l'heure « vers ». Un nouveau mot y revient. (De la v6 à la v8, « vers » seul ne gardait pas le relevé.)
  await heure(vue, '12 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, heure: '12:00', vers: true }]);
  await bulle(vue, 'jaune').click();
  await mot(vue, 'Curieux').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '12:00', vers: true, emotion: null, energie: null, humeur: null, faisais: null }]);
  await retour(vue).click();
  await expect(vue.getByRole('button', { name: 'C\'était vers 12 h' })).toBeVisible();
  await noter(vue, 'rouge', 'Préoccupé');
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '12:00', vers: true, emotion: 'roue:peur:preoccupe', energie: 'energie:moyenne' }]);
  // Effacé de nouveau, puis « Maintenant » : il ne reste rien, le relevé part. L'heure ne se garde plus qu'à l'écran.
  await mot(vue, 'Préoccupé').click();
  await expect.poll(releves(page)).toMatchObject([{ id, heure: '12:00', vers: true, emotion: null, energie: null }]);
  await retour(vue).click();
  await heure(vue, 'Maintenant').click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  // « Vers 12 h », un mot effacé, et fermer : le relevé est noté, « Aucun mot » dans Ma journée, à son heure.
  await heure(vue, '12 h').click();
  await noter(vue, 'vert', 'Calme');
  await expect.poll(releves(page)).toMatchObject([{ heure: '12:00', vers: true, emotion: 'roue:serenite:calme' }]);
  await mot(vue, 'Calme').click();
  await expect.poll(releves(page)).toMatchObject([{ heure: '12:00', vers: true, emotion: null, energie: null }]);
  await retour(vue).click();
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText(NOTEE)).toBeVisible();
  await expect(ligneDuJour(page, 'Aucun mot')).toHaveCount(1);
  await expect(ligneDuJour(page, 'Aucun mot')).toContainText('vers 12 h');
});

test('C\'était vers… après minuit : « vers 22 h » et « vers 0 h » restent au jour logique d\'hier', async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 15, 1, 30));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await expect(vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button')).toHaveText([...HEURES, '22 h', '0 h']);
  await heure(vue, '22 h').click();
  await noter(vue, 'rouge', 'Préoccupé');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '22:00', vers: true, energie: 'energie:moyenne' }]);
  await retour(vue).click();
  await heure(vue, '0 h').click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '00:00', vers: true, energie: 'energie:moyenne' }]);
  // Il est au jour logique du 14 : « Ma journée » d'aujourd'hui le montre.
  await fermer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(ligneDuJour(page, 'Préoccupé')).toContainText('vers 0 h');
});

test('C\'était vers… ouverte avant 4 h, touchée après : l\'heure d\'hier n\'est pas posée sur le nouveau jour, la liste se rafraîchit', async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 15, 3, 30));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  const liste = vue.getByRole('group', { name: 'C\'était vers…' });
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  // 03:30 est encore le jour logique du 14 : 22 h, 0 h et 2 h sont proposées.
  await expect(liste.getByRole('button')).toHaveText([...HEURES, '22 h', '0 h', '2 h']);
  // La liste reste ouverte pendant que le jour logique change.
  await page.clock.setSystemTime(new Date(2026, 9, 15, 6, 30));
  await heure(vue, '22 h').click();
  await expect(vue.getByRole('button', { name: /^C'était vers/ })).toHaveCount(0);
  // Le 22 h d'hier n'est plus proposé : la liste, restée ouverte, est celle de 6 h 30.
  await expect(boutonQuand(vue)).toHaveAttribute('aria-expanded', 'true');
  await expect(liste.getByRole('button')).toHaveText(['Maintenant', '6 h']);
  await heure(vue, 'Maintenant').click();
  await noter(vue, 'vert', 'Calme');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: expect.stringMatching(/^06:\d\d$/), vers: null, energie: 'energie:moyenne' }]);
});

test('C\'était vers… avant 6 h : « Maintenant » seul, sans flèche, qui ne se touche pas', async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 15, 5, 30));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(vue.locator('.ligne-date')).toHaveText('Maintenant');
  await expect(vue.getByRole('button', { name: 'Maintenant' })).toHaveCount(0);
  await expect(vue.locator('.ligne-date svg')).toHaveCount(0);
  await noter(vue, 'rouge', 'Préoccupé');
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '05:30', vers: null, energie: 'energie:moyenne' }]);
});

test('C\'était vers… (v8) : repliée à chaque ouverture de l\'écran ; ouverte, un choix la laisse ouverte ; le mot écrit le relevé à cette heure', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  const liste = vue.getByRole('group', { name: 'C\'était vers…' });
  await expect(boutonQuand(vue)).toHaveAttribute('aria-expanded', 'false');
  await boutonQuand(vue).click();
  await expect(boutonQuand(vue)).toHaveAttribute('aria-expanded', 'true');

  // Choisir une heure ne la ferme pas.
  await heure(vue, '10 h').click();
  await expect(boutonQuand(vue)).toHaveText('C\'était vers 10 h');
  await expect(boutonQuand(vue)).toHaveAttribute('aria-expanded', 'true');
  await expect(liste.getByRole('button')).toHaveText(HEURES);
  await noter(vue, 'vert', 'Calme');
  await expect.poll(releves(page)).toMatchObject([{ heure: '10:00', vers: true, emotion: 'roue:serenite:calme', energie: 'energie:moyenne' }]);
  await continuer(vue).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  // Laissée ouverte, elle rouvre repliée, l'écran repartant de « Maintenant » ; rien n'est retenu sur l'iPhone.
  await aller(page, '#/moment');
  await expect(boutonQuand(vue)).toHaveText('Maintenant');
  await expect(boutonQuand(vue)).toHaveAttribute('aria-expanded', 'false');
  await expect(liste).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.getItem('carnet:moment:vers'), localStorage.getItem('carnet:moment:faisais')])).toEqual([null, null]);
  // Son bouton l'ouvre et la ferme.
  await boutonQuand(vue).click();
  await expect(liste.getByRole('button')).toHaveText(HEURES);
  await boutonQuand(vue).click();
  await expect(liste).toHaveCount(0);
});

// TRANSITOIRE (v9, 4/8) : « Ce que je faisais » quitte l'écran de l'émotion ; il revient en plein écran après la flèche, à
// l'écran 3 (tâche 5 du plan v9), qui reprend ces deux tests. Leur version de la v8 : git show febc289:tests/e2e/v6-saisie.spec.js.
test.fixme('Ce que je faisais (v8) : ouvert pendant la saisie, l\'écran ne se ferme plus seul, même refermé ; ✕ le ferme avec le message ; replié à chaque ouverture', () => {});
test.fixme('Ce que je faisais : replié, le repli résume ce qui est noté ; un relevé qui n\'a plus que des activités reste, sans elles il part', () => {});
