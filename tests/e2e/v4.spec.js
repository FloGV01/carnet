import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';
import { noter, finir } from '../aides/emotion.js';

// v4 : humeur du moment (émotion du moment en v7), détails du soir, Mon plan, Après coup, Ma journée, Analyse.
const repo = (page, f, arg) => page.evaluate(f, arg);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 5, 18, 42) });
  await page.goto('/');
  await viderBase(page);
});

test('émotion du moment (v9) : une couleur et un mot, relevé à l\'heure réelle, la flèche et Terminer ; une nouvelle ouverture, un nouveau relevé ; Annuler', async ({ page }) => {
  await page.getByRole('link', { name: 'Émotion du moment' }).click();
  const vue = page.getByRole('dialog', { name: 'Émotion du moment' });
  await noter(vue, 'vert', 'Calme');
  await finir(vue);
  await expect(page.getByText('Émotion du moment notée')).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  const releves = () => repo(page, () => window.__carnet.repo.humeurs.tous());
  await expect.poll(releves).toMatchObject([{ date: '2026-10-05', heure: '18:42', emotion: 'roue:serenite:calme', humeur: null, energie: 'energie:moyenne' }]);
  // Une nouvelle ouverture crée un nouveau relevé ; « Annuler » ne retire que lui.
  await page.getByRole('link', { name: 'Émotion du moment' }).click();
  await noter(vue, 'jaune', 'Curieux');
  await finir(vue);
  await expect.poll(async () => (await releves()).length).toBe(2);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(releves).toMatchObject([{ emotion: 'roue:serenite:calme' }]);
});

test('sport et contact en détail : plusieurs activités, avec qui, comment c\'était ; Oui posé si vide', async ({ page }) => {
  await page.getByRole('button', { name: /Sport en détail/ }).click();
  await toucher(page, 'Activité 1 : type', 'Marche');
  await toucher(page, 'Activité 1 : durée', '30 à 60 min');
  await page.getByRole('button', { name: 'Une autre activité' }).click();
  await toucher(page, 'Activité 2 : type', 'Vélo');
  await page.getByRole('button', { name: /Contact en détail/ }).click();
  await groupe(page, 'Contact 1 : avec qui').getByRole('button', { name: 'Famille' }).click();
  await toucher(page, 'Contact 1 : comment c\'était', 'Coûteux');
  // v5 : plusieurs contacts dans la journée.
  await page.getByRole('button', { name: 'Un autre contact' }).click();
  await groupe(page, 'Contact 2 : avec qui').getByRole('button', { name: 'Amis' }).click();
  await toucher(page, 'Contact 2 : comment c\'était', 'Ressourçant');
  await expect.poll(() => entreeDuJour(page)).toMatchObject({
    sportMouvement: true, contactHumain: true,
    contacts: [{ avec: ['contactAvec:famille'], effet: 'contactEffet:couteux' }, { avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }],
    activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }, { type: 'typeSport:velo', duree: null }],
  });
  await expect(groupe(page, 'Sport / mouvement').getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
  // « Non » ne supprime pas le détail.
  await toucher(page, 'Sport / mouvement', 'Non');
  await expect.poll(async () => (await entreeDuJour(page)).activites.length).toBe(2);
});

test('Mon plan dans l\'épisode : feuille en lecture seule, fermée sur la même étape', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors marcher' }));
  await page.getByRole('link', { name: 'Épisode' }).click();
  const parcours = page.getByRole('dialog', { name: 'Épisode' });
  await parcours.getByRole('button', { name: 'Conflit' }).click();
  await expect(page.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  await parcours.getByRole('button', { name: 'Mon plan' }).click();
  const feuille = page.getByRole('dialog', { name: 'Mon plan' });
  await expect(feuille).toContainText('je sors marcher');
  await expect(feuille.getByRole('link')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(feuille).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  await expect(parcours.getByRole('button', { name: 'Mon plan' })).toBeFocused();
});

test('après coup (v5 : tout épisode) : étapes passables, « Je ne sais pas » exclusif, ajout à Mon plan, retour', async ({ page }) => {
  const id = await repo(page, async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-03', heure: '20:00', emotion: 'emotion:colere', reaction: 'reaction:retrait_isolement' })).id);
  await page.evaluate((i) => { location.hash = `#/episode/${i}`; }, id);
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await page.getByRole('link', { name: /Après coup · TCC/ }).click();
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await expect(vue.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  await vue.getByRole('button', { name: 'Colère' }).click();
  await vue.getByRole('button', { name: 'Je ne sais pas' }).click();
  await expect(vue.getByRole('button', { name: 'Colère' })).toHaveAttribute('aria-pressed', 'false');
  await vue.getByRole('button', { name: 'Colère' }).click();
  const titres = [];
  while (await vue.getByRole('heading', { name: 'Récapitulatif' }).count() === 0) {
    const t = await vue.locator('.titre-question').first().textContent();
    titres.push(t);
    if (t === 'Pour la prochaine fois') {
      await vue.locator('#ac-siJe').fill('je serre les poings');
      await vue.locator('#ac-alorsJe').fill('je sors cinq minutes');
      await expect.poll(async () => (await repo(page, (i) => window.__carnet.repo.episodes.lire(i), id)).apresCoup.alorsJe).toBe('je sors cinq minutes');
      await vue.getByRole('button', { name: 'Ajouter à Mon plan' }).click();
      await expect(page.getByText('Ajouté à Mon plan')).toBeVisible();
    }
    await vue.getByRole('button', { name: /^(Passer|Suivant)$/ }).click();
  }
  expect(titres).toContain('Ce que je me suis dit');
  expect(titres).not.toContain('Ce qui était trop');
  const ep = await repo(page, (i) => window.__carnet.repo.episodes.lire(i), id);
  expect(ep.apresCoup).toMatchObject({ types: ['typeExplosion:colere'], siJe: 'je serre les poings', jour: '2026-10-05' });
  expect((await repo(page, () => window.__carnet.repo.meta.lire('monPlan'))).siAlors).toEqual([{ si: 'je serre les poings', alors: 'je sors cinq minutes' }]);
  await vue.getByRole('button', { name: 'Terminer' }).click();
  const episode = page.getByRole('dialog', { name: 'Épisode' });
  await expect(episode.getByRole('link', { name: /Après coup · TCC/ })).toContainText('si je serre les poings');
  await episode.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('Réglages › Le soir : afficher le compteur et l\'humeur du soir, changer l\'ordre ; Aujourd\'hui suit', async ({ page }) => {
  await page.evaluate(() => { location.hash = '#/reglages/journee'; });
  await page.getByRole('switch', { name: 'Afficher Explosions (compteur du soir)' }).click();
  // v6 : l'Humeur du soir est masquée par défaut, elle se réaffiche ici (« Nuit en détail », masqué depuis la v8, le reste).
  await page.getByRole('switch', { name: 'Afficher Humeur' }).click();
  await page.getByRole('button', { name: 'Monter Humeur' }).click();
  await expect(page.getByRole('button', { name: 'Monter Humeur' })).toBeFocused();
  await page.getByRole('button', { name: 'Monter Humeur' }).click();
  await expect(page.getByRole('button', { name: 'Monter Humeur' })).toHaveAttribute('aria-disabled', 'true');
  await expect.poll(async () => { const j = await repo(page, () => window.__carnet.repo.meta.lire('journee')); return [j.masques, j.ordre.slice(0, 3)]; })
    .toEqual([['nuit'], ['humeur', 'lieu', 'sommeil']]);
  await page.evaluate(() => { location.hash = '#/aujourdhui'; });
  await expect(groupe(page, 'Explosions')).toHaveCount(1);
  const groupes = await page.locator('.ecran.aujourdhui [role="group"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(groupes.slice(0, 2)).toEqual(['Humeur', 'Lieu']);
});

test('Analyse (v5) : tes moments étape par étape et ta journée heure par heure (v7 : les familles d\'émotions), avec tes notes seulement', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const [d, f] of [['2026-10-01', ['fragilite:fatigue']], ['2026-10-02', ['fragilite:fatigue', 'fragilite:faim']], ['2026-10-03', null]]) {
      await r.episodes.creer({ date: d, heure: '19:00', reaction: 'reaction:explosion', declencheur: 'declencheur:conflit', apresCoup: f ? { fragilites: f, jour: d } : null });
      for (const [heure, emotion] of [['10:00', 'roue:colere:irrite'], ['16:00', 'roue:serenite']]) await r.humeurs.creer({ date: d, heure, emotion, energie: 'energie:basse' });
    }
  });
  await page.getByRole('link', { name: 'Analyse' }).click();
  const avant = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Tes moments, étape par étape' }) });
  await expect(avant).toContainText('Conflit (3 sur 3)');
  await expect(avant).toContainText('Fatigue (2 sur 2)');
  await expect(avant).not.toContainText('Faim');
  await expect(avant).toContainText('Ce sont tes notes, rassemblées : pas des causes.');
  const journee = page.getByRole('figure').filter({ hasText: 'Ta journée heure par heure' });
  await journee.getByRole('button', { name: 'Voir en tableau' }).click();
  await expect(journee.getByRole('row', { name: /10 h – 12 h/ })).toContainText('émotions : colère 3 · énergie : basse 3 jours');
  await expect(journee.getByRole('row', { name: /16 h – 18 h/ })).toContainText('émotions : sérénité 3 · énergie : basse 3 jours');
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
});

test('après coup ouvert depuis l\'Historique : Terminer ramène à l\'Historique', async ({ page }) => {
  const id = await repo(page, async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-03', heure: '20:00', emotion: 'emotion:colere', reaction: 'reaction:explosion' })).id);
  await aller(page, '#/historique');
  await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();
  await page.evaluate((i) => { location.hash = `#/episode/${i}`; }, id);
  await page.getByRole('link', { name: /Après coup · TCC/ }).click();
  const vue = page.getByRole('dialog', { name: 'Après coup' });
  await vue.getByRole('button', { name: 'Colère' }).click();
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  const episode = page.getByRole('dialog', { name: 'Épisode' });
  await expect(episode.getByRole('link', { name: /Après coup · TCC/ })).toContainText('Colère');
  await episode.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/historique$/);
});
