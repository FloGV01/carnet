import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';

// v6 : saisie du soir. « Ce qui a pesé · ce qui a rechargé » : un repli sous « Nuit en détail ».
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

test('ce qui a pesé, ce qui a rechargé : replié après « Nuit en détail », un toucher enregistre, un second efface', async ({ page }) => {
  await expect(page.locator('.replis .repli-titre')).toHaveText(['Nuit en détail', TITRE, 'Sport en détail', 'Contact en détail', 'Notes libres']);
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

test('masqué dans Réglages › Ma journée, le repli reste affiché un jour où il porte des valeurs', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-13', { lieu: 'lieu:bureau', pese: ['pese:bruit'] }));
  await aller(page, '#/reglages/journee');
  const interrupteur = page.getByRole('switch', { name: `Afficher ${TITRE}` });
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  // Sans place dans l'ordre des champs : pas de flèches.
  await expect(page.getByRole('button', { name: /^(Monter|Descendre) Ce qui a pesé/ })).toHaveCount(0);
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur', 'peseRecharge']);
  expect((await repo(page, () => window.__carnet.repo.meta.lire('journee'))).ordre).not.toContain('peseRecharge');

  await aller(page, '#/aujourdhui');
  await expect(page.getByRole('button', { name: /Nuit en détail/ })).toBeVisible();
  await expect(repli(page)).toHaveCount(0);
  await aller(page, '#/jour/2026-10-13');
  await expect(repli(page).locator('.repli-resume')).toHaveText('pesé : bruit');
  // Il s'ouvre et se corrige comme d'habitude.
  await repli(page).click();
  await expect(groupe(page, 'Ce qui a pesé').getByRole('button', { name: 'Bruit' })).toHaveAttribute('aria-pressed', 'true');

  await aller(page, '#/reglages/journee');
  await page.getByRole('switch', { name: `Afficher ${TITRE}` }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur']);
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
    const tete = document.querySelector('.repli.resume-sous .repli-tete');
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

// ---------- v6 : humeur du moment, « C'était vers… » et « Ce que je faisais » ----------

const releves = (page) => () => repo(page, () => window.__carnet.repo.humeurs.tous());
const vueMoment = (page) => page.getByRole('dialog', { name: 'Humeur du moment' });
const HEURES = ['Maintenant', '6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h'];
const heure = (vue, h) => vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button', { name: h, exact: true });

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
  await expect(vue.getByRole('group', { name: 'C\'était vers…' })).toHaveCount(0);
  await page.waitForTimeout(150);
  expect(await releves(page)()).toEqual([]);

  await vue.getByRole('button', { name: 'Humeur 5' }).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '14:00', vers: true, humeur: 5, energie: null }]);
  await vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: 'Basse' }).click();
  await expect(page.getByText('Humeur du moment notée')).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '14:00', vers: true, humeur: 5, energie: 'energie:basse' }]);

  // La liste du jour l'écrit « vers 14 h » ; la suppression le dit aussi.
  await aller(page, '#/moment');
  const liste = vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' });
  await expect(liste).toContainText('vers 14 h humeur 5 · énergie basse');
  await expect(liste.getByRole('button', { name: 'Supprimer le relevé vers 14 h' })).toBeVisible();
});

test('C\'était vers… : le relevé déjà créé change d\'heure, revient à « maintenant », et se vide en disparaissant', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await vue.getByRole('button', { name: 'Humeur 7' }).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '21:00', vers: null, humeur: 7 }]);
  const id = (await releves(page)())[0].id;

  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await heure(vue, '16 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '16:00', vers: true, humeur: 7 }]);
  await vue.getByRole('button', { name: 'C\'était vers 16 h' }).click();
  await heure(vue, '8 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, heure: '08:00', vers: true }]);
  await expect(vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' })).toContainText('vers 8 h humeur 7');

  // « Maintenant » remet l'heure réelle ; vers redevient null, jamais false.
  await vue.getByRole('button', { name: 'C\'était vers 8 h' }).click();
  await heure(vue, 'Maintenant').click();
  await expect.poll(releves(page)).toMatchObject([{ id, date: '2026-10-14', heure: '21:00', vers: null, humeur: 7 }]);
  await expect(vue.getByRole('button', { name: 'Maintenant' })).toBeVisible();

  // Retirer la seule valeur d'un relevé « vers » le supprime.
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await heure(vue, '12 h').click();
  await expect.poll(releves(page)).toMatchObject([{ id, heure: '12:00', vers: true }]);
  await vue.getByRole('button', { name: 'Humeur 7' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  // L'heure choisie reste à l'écran : une nouvelle valeur recrée un relevé « vers 12 h ».
  await expect(vue.getByRole('button', { name: 'C\'était vers 12 h' })).toBeVisible();
  await vue.getByRole('button', { name: 'Humeur 3' }).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '12:00', vers: true, humeur: 3 }]);
});

test('C\'était vers… après minuit : « vers 22 h » et « vers 0 h » restent au jour logique d\'hier', async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 15, 1, 30));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await vue.getByRole('button', { name: 'Maintenant' }).click();
  await expect(vue.getByRole('group', { name: 'C\'était vers…' }).getByRole('button')).toHaveText([...HEURES, '22 h', '0 h']);
  await heure(vue, '22 h').click();
  await vue.getByRole('button', { name: 'Humeur 4' }).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-14', heure: '22:00', vers: true, humeur: 4 }]);
  await vue.getByRole('button', { name: 'C\'était vers 22 h' }).click();
  await heure(vue, '0 h').click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '00:00', vers: true, humeur: 4 }]);
  // Il est au jour logique du 14 : la liste d'« aujourd'hui » le montre.
  await expect(vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' })).toContainText('vers 0 h humeur 4');
});

test('C\'était vers… avant 6 h : « Maintenant » seul, sans flèche, qui ne se touche pas', async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 15, 5, 30));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(vue.locator('.ligne-date')).toHaveText('Maintenant');
  await expect(vue.getByRole('button', { name: 'Maintenant' })).toHaveCount(0);
  await expect(vue.locator('.ligne-date svg')).toHaveCount(0);
  await vue.getByRole('button', { name: 'Humeur 6' }).click();
  await expect.poll(releves(page)).toMatchObject([{ date: '2026-10-15', heure: '05:30', vers: null, humeur: 6 }]);
});

test('Ce que je faisais : ouvert, l\'écran ne se ferme plus seul ; ✕ le ferme avec le message ; il rouvre comme laissé', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  const repliFaisais = vue.getByRole('button', { name: /^Ce que je faisais/ });
  const activites = vue.getByRole('group', { name: 'Ce que je faisais' });
  await expect(repliFaisais).toHaveAttribute('aria-expanded', 'false');
  await repliFaisais.click();
  await expect(repliFaisais).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => localStorage.getItem('carnet:moment:faisais'))).toBe('true');
  await expect(activites.getByRole('button')).toHaveText(['Travail', 'Trajet', 'Courses / démarches', 'Chez moi', 'Avec du monde', 'Repos']);

  // Des activités seules ne gardent pas de relevé ; elles partent avec la première valeur.
  await activites.getByRole('button', { name: 'Travail' }).click();
  await page.waitForTimeout(150);
  expect(await releves(page)()).toEqual([]);
  await vue.getByRole('button', { name: 'Humeur 6' }).click();
  await expect.poll(releves(page)).toMatchObject([{ humeur: 6, energie: null, faisais: ['activiteMoment:travail'] }]);
  await vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: 'Moyenne' }).click();
  await activites.getByRole('button', { name: 'Trajet' }).click();
  await expect.poll(releves(page)).toMatchObject([{ humeur: 6, energie: 'energie:moyenne', faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] }]);

  // Humeur et énergie sont choisies, bien au-delà des 250 ms de la fermeture : l'écran reste là.
  await page.waitForTimeout(700);
  await expect(page).toHaveURL(/#\/moment$/);
  await expect(vue).toBeVisible();
  await expect(page.getByText('Humeur du moment notée')).toHaveCount(0);

  await vue.getByRole('button', { name: 'Fermer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByText('Humeur du moment notée')).toBeVisible();

  // Le repli rouvre comme on l'a laissé ; refermé, la fermeture automatique revient.
  await aller(page, '#/moment');
  await expect(repliFaisais).toHaveAttribute('aria-expanded', 'true');
  await repliFaisais.click();
  expect(await page.evaluate(() => localStorage.getItem('carnet:moment:faisais'))).toBe('false');
  await expect(repliFaisais.locator('.repli-resume')).toHaveCount(0);
  await vue.getByRole('button', { name: 'Humeur 8' }).click();
  await vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: 'Haute' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('Ce que je faisais : replié, le repli résume ce qui est noté ; retirer la valeur d\'un relevé qui n\'a plus que des activités le supprime', async ({ page }) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  const repliFaisais = vue.getByRole('button', { name: /^Ce que je faisais/ });
  await repliFaisais.click();
  await vue.getByRole('button', { name: 'Humeur 6' }).click();
  await vue.getByRole('group', { name: 'Ce que je faisais' }).getByRole('button', { name: 'Courses / démarches' }).click();
  await vue.getByRole('group', { name: 'Ce que je faisais' }).getByRole('button', { name: 'Repos' }).click();
  await expect.poll(releves(page)).toMatchObject([{ humeur: 6, faisais: ['activiteMoment:courses', 'activiteMoment:repos'] }]);
  await repliFaisais.click();
  await expect(repliFaisais.locator('.repli-resume')).toHaveText('courses / démarches, repos');
  // Le seul chiffre retiré : il ne reste que des activités, le relevé est supprimé.
  await vue.getByRole('button', { name: 'Humeur 6' }).click();
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
});
