import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase, aller } from '../aides/saisie.js';

// v4 : humeur du moment, détails du soir, Mon plan, Après coup, Ma journée, Analyse.
const repo = (page, f, arg) => page.evaluate(f, arg);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 5, 18, 42) });
  await page.goto('/');
  await viderBase(page);
});

test('humeur du moment : deux touchers, relevé à l\'heure réelle, liste du jour, suppression puis Annuler', async ({ page }) => {
  await page.getByRole('link', { name: 'Humeur du moment' }).click();
  const vue = page.getByRole('dialog', { name: 'Humeur du moment' });
  await vue.getByRole('button', { name: 'Humeur 6' }).click();
  await vue.getByRole('group', { name: 'Énergie' }).getByRole('button', { name: 'Moyenne' }).click();
  await expect(page.getByText('Humeur du moment notée')).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  const releves = () => repo(page, () => window.__carnet.repo.humeurs.tous());
  await expect.poll(releves).toMatchObject([{ date: '2026-10-05', heure: '18:42', humeur: 6, energie: 'energie:moyenne' }]);
  // Une nouvelle ouverture crée un nouveau relevé ; la liste du jour montre les précédents.
  await page.getByRole('link', { name: 'Humeur du moment' }).click();
  await expect(vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' })).toContainText('18:42 humeur 6 · énergie moyenne');
  await vue.getByRole('button', { name: 'Supprimer le relevé de 18:42' }).click();
  await expect.poll(async () => (await releves()).length).toBe(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await releves()).length).toBe(1);
});

test('sport et contact en détail : plusieurs activités, avec qui, comment c\'était ; Oui posé si vide', async ({ page }) => {
  await page.getByRole('button', { name: /Sport en détail/ }).click();
  await toucher(page, 'Activité 1 : type', 'Marche');
  await toucher(page, 'Activité 1 : durée', '30 à 60 min');
  await page.getByRole('button', { name: 'Une autre activité' }).click();
  await toucher(page, 'Activité 2 : type', 'Vélo');
  await page.getByRole('button', { name: /Contact en détail/ }).click();
  await groupe(page, 'Avec qui').getByRole('button', { name: 'Famille' }).click();
  await toucher(page, 'Comment c\'était', 'Coûteux');
  await expect.poll(() => entreeDuJour(page)).toMatchObject({
    sportMouvement: true, contactHumain: true, contactAvec: ['contactAvec:famille'], contactEffet: 'contactEffet:couteux',
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

test('après coup : seulement pour une explosion, étapes passables, « Je ne sais pas » exclusif, ajout à Mon plan, retour', async ({ page }) => {
  const id = await repo(page, async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-03', heure: '20:00', emotion: 'emotion:colere', reaction: 'reaction:retrait_isolement' })).id);
  await page.evaluate((i) => { location.hash = `#/episode/${i}`; }, id);
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Après coup/ })).toHaveCount(0);
  await repo(page, (i) => window.__carnet.repo.episodes.modifier(i, { reaction: 'reaction:explosion' }), id);
  await page.reload();
  await aller(page, `#/episode/${id}`);
  await page.getByRole('link', { name: /Après coup/ }).click();
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
  await expect(episode.getByRole('link', { name: /Après coup/ })).toContainText('si je serre les poings');
  await episode.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('Réglages › Ma journée : afficher le compteur, changer l\'ordre ; Aujourd\'hui suit', async ({ page }) => {
  await page.evaluate(() => { location.hash = '#/reglages/journee'; });
  await page.getByRole('switch', { name: 'Afficher Explosions (compteur du soir)' }).click();
  await page.getByRole('button', { name: 'Monter Humeur' }).click();
  await expect(page.getByRole('button', { name: 'Monter Humeur' })).toBeFocused();
  await page.getByRole('button', { name: 'Monter Humeur' }).click();
  await expect(page.getByRole('button', { name: 'Monter Humeur' })).toHaveAttribute('aria-disabled', 'true');
  await expect.poll(async () => { const j = await repo(page, () => window.__carnet.repo.meta.lire('journee')); return [j.masques, j.ordre.slice(0, 3)]; })
    .toEqual([[], ['humeur', 'lieu', 'sommeil']]);
  await page.evaluate(() => { location.hash = '#/aujourdhui'; });
  await expect(groupe(page, 'Explosions')).toHaveCount(1);
  const groupes = await page.locator('.ecran.aujourdhui [role="group"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(groupes.slice(0, 2)).toEqual(['Humeur', 'Lieu']);
});

test('Analyse : avant tes explosions et profil de ta journée, avec tes notes seulement', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const [d, f] of [['2026-10-01', ['fragilite:fatigue']], ['2026-10-02', ['fragilite:fatigue', 'fragilite:faim']], ['2026-10-03', null]]) {
      await r.episodes.creer({ date: d, heure: '19:00', reaction: 'reaction:explosion', declencheur: 'declencheur:conflit', apresCoup: f ? { fragilites: f, jour: d } : null });
      for (const [heure, humeur] of [['10:00', 5], ['16:00', 7]]) await r.humeurs.creer({ date: d, heure, humeur, energie: 'energie:basse' });
    }
  });
  await page.getByRole('link', { name: 'Analyse' }).click();
  const avant = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Avant tes explosions' }) });
  await expect(avant).toContainText('Conflit (3 sur 3)');
  await expect(avant).toContainText('Fatigue (2 sur 2)');
  await expect(avant).not.toContainText('Faim');
  await expect(avant).toContainText('Ce sont tes notes, rassemblées : pas des causes.');
  const profil = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Profil de ta journée' }) });
  await expect(profil).toContainText('10 h – 12 h');
  await expect(profil).toContainText('humeur 5,0 · énergie : basse 3');
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|%/);
});
