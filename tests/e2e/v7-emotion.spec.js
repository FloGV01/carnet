import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, jetons } from '../aides/couleurs.js';
import { vueMoment, tuile, tuiles, carte, mot, retourEnergie } from '../aides/emotion.js';

// v7 (3/9) · Émotion du moment (spec v7 §4.2), mis à jour en v8 (2/9) : la roue en familles laisse place à la carte
// (tests/e2e/v8-emotion.spec.js). Restent : chaque toucher enregistre, chaque état est écrit tel quel ; le panneau des
// réponses collé en bas, près du pouce (2b) ; les relevés du jour ; le fondu de 200 ms au plus ; le focus.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const releves = (page) => () => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const ouvrir = async (page) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await expect(tuile(vue, 'Haute')).toBeVisible();
  return vue;
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('relevé noté par étapes : la tuile, le mot, retouche du mot, retouche de la tuile ; chaque état est écrit tel quel', async ({ page }) => {
  const vue = await ouvrir(page);
  // « Ce que je faisais » ouvert : l'écran ne se ferme pas seul, on voit chaque état.
  await vue.getByRole('button', { name: /^Ce que je faisais/ }).click();
  await tuile(vue, 'Basse').click();
  await expect.poll(releves(page)).toMatchObject([{ emotion: null, energie: 'energie:basse' }]);
  const id = (await releves(page)())[0].id;
  await mot(vue, 'Sans valeur', 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:peur:sans-valeur', energie: 'energie:basse' }]);
  await expect(mot(vue, 'Sans valeur', 'Peur')).toHaveAttribute('aria-pressed', 'true');
  // Un autre mot le remplace.
  await mot(vue, 'Incapable', 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: 'roue:peur:incapable' }]);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(1);
  // Retoucher le mot choisi l'efface ; la carte reste.
  await mot(vue, 'Incapable', 'Peur').click();
  await expect.poll(releves(page)).toMatchObject([{ id, emotion: null, energie: 'energie:basse' }]);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(0);
  // « ‹ Énergie » n'écrit rien : la tuile y est choisie. La retoucher efface l'énergie ; il ne reste rien, le relevé
  // est supprimé.
  await retourEnergie(vue).click();
  await expect(tuile(vue, 'Basse')).toHaveAttribute('aria-pressed', 'true');
  await expect(tuiles(vue).getByRole('button', { pressed: true })).toHaveCount(1);
  await page.waitForTimeout(150);
  expect(await releves(page)()).toMatchObject([{ id, energie: 'energie:basse' }]);
  await tuile(vue, 'Basse').click();
  await expect(tuile(vue, 'Basse')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await releves(page)()).length).toBe(0);
  // L'écran reste sur les tuiles.
  await expect(tuiles(vue)).toBeVisible();
  await expect(page).toHaveURL(/#\/moment$/);
});

test('réponses près du pouce (2b) : panneau collé en bas, en --surface, rayon 24 ; les tuiles comme la carte tiennent sans que le panneau défile', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '12:00', vers: true, emotion: 'roue:tristesse:vide', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '17:45', emotion: 'roue:colere:irrite', energie: 'energie:moyenne' });
  });
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const panneau = vue.getByRole('region', { name: 'Réponses' });
    const mesure = () => panneau.evaluate((p) => {
      const s = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      // Les boutons hors de la carte (qui glisse) : dans le panneau et dans l'écran.
      const boutons = [...p.querySelectorAll('button')].filter((b) => !b.closest('.carte-cadre')).map((b) => b.getBoundingClientRect());
      return { bas: r.bottom, haut: r.top, fond: s.backgroundColor, rayon: s.borderTopLeftRadius, defile: p.scrollHeight > p.clientHeight + 1,
        horsVue: boutons.filter((b) => b.top < r.top || b.bottom > innerHeight).length };
    });
    expect(await mesure()).toMatchObject({ bas: 844, fond: rgb(t.surface), rayon: '24px', defile: false, horsVue: 0 });
    // Les six tuiles sont dans le panneau, en bas : 44 pt au moins.
    for (const b of await tuiles(vue).getByRole('button').evaluateAll((bs) => bs.map((x) => x.getBoundingClientRect().height))) expect(b).toBeGreaterThanOrEqual(44);
    // La carte aussi, avec les relevés du jour au-dessus ; le titre reste visible.
    await tuile(vue, 'Moyenne').click();
    await expect(carte(vue)).toBeVisible();
    expect(await mesure()).toMatchObject({ bas: 844, defile: false, horsVue: 0 });
    await expect(vue.getByRole('heading', { name: 'Émotion du moment', level: 1 })).toBeInViewport();
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    // Le relevé créé ici part, pour repartir du même état.
    await page.evaluate(async () => {
      const r = window.__carnet.repo;
      for (const h of await r.humeurs.tous()) if (h.heure === '21:00') await r.humeurs.supprimer(h.id);
    });
  }
});

test('les relevés du jour : « Irrité · énergie moyenne » au point de sa famille ; un ancien relevé chiffré garde « humeur 6 », point creux ; même colonne', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '17:45', emotion: 'roue:colere:irrite', energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '12:00', vers: true, emotion: 'roue:serenite', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '14:10', humeur: null, energie: 'energie:basse' });
  });
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    const vue = await ouvrir(page);
    const liste = vue.getByRole('region', { name: 'Relevés d\'aujourd\'hui' });
    // Dans l'ordre des heures, les deux formats côte à côte ; une famille seule (v7) s'affiche comme avant.
    await expect(liste.getByRole('listitem')).toHaveText([
      /^10:20\s*humeur 6 · énergie moyenne$/, /^vers 12 h\s*Sérénité$/, /^14:10\s*énergie basse$/, /^17:45\s*Irrité · énergie moyenne$/,
    ]);
    const lignes = await liste.getByRole('listitem').evaluateAll((els) => els.map((li) => {
      const p = li.querySelector('.point-releve-moment');
      const s = getComputedStyle(p);
      return { fond: s.backgroundColor, bord: s.borderTopWidth, heure: Math.round(li.querySelector('.heure-moment').getBoundingClientRect().width),
        texte: Math.round(li.querySelector('.texte-releve').getBoundingClientRect().left) };
    }));
    expect(lignes[1].fond).toBe(rgb(t['c-emo-serenite']));
    expect(lignes[3].fond).toBe(rgb(t['c-emo-colere']));
    // Sans émotion (ancienne note, énergie seule) : un rond creux, neutre.
    for (const i of [0, 2]) {
      expect(lignes[i].fond).toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(lignes[i].bord)).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(lignes.map((l) => l.heure)).size).toBe(1);
    expect(new Set(lignes.map((l) => l.texte)).size).toBe(1);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  // L'ancien relevé n'est pas touché : sa note reste, sans émotion.
  expect((await releves(page)()).find((h) => h.heure === '10:20')).toMatchObject({ humeur: 6, emotion: null, energie: 'energie:moyenne' });
});

test('la carte paraît en fondu de 200 ms au plus ; avec « Réduire les animations », rien ne bouge', async ({ page }) => {
  // Le mouvement prévu par les styles (fondu de la carte, transitions des bulles et des tuiles) et celui en cours.
  const mouvement = (vue) => vue.locator('.panneau-reponses').evaluate((p) => ({
    styles: [...p.querySelectorAll('.carte-cadre, .bulle-carte, .tuile-emotion')].map((e) => {
      const s = getComputedStyle(e);
      return { cadre: e.classList.contains('carte-cadre'), nom: s.animationName, duree: parseFloat(s.animationDuration) * 1000,
        fondu: Math.max(...s.transitionDuration.split(',').map((d) => parseFloat(d) * 1000)) };
    }),
    enCours: p.getAnimations({ subtree: true }).length,
  }));
  let vue = await ouvrir(page);
  const tuilesAvant = await mouvement(vue);
  for (const s of tuilesAvant.styles) expect(s.fondu).toBeLessThanOrEqual(200);
  await tuile(vue, 'Haute', 'agréable').click();
  await expect(carte(vue)).toBeVisible();
  const avec = await mouvement(vue);
  expect(avec.styles.filter((s) => s.cadre).map((s) => [s.nom, s.duree])).toEqual([['apparition-carte', 200]]);
  for (const s of avec.styles) expect(Math.max(s.duree, s.fondu)).toBeLessThanOrEqual(200);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
  vue = await ouvrir(page);
  const verifierImmobile = async (quoi) => {
    const m = await mouvement(vue);
    expect(m.enCours, quoi).toBe(0);
    for (const s of m.styles) expect([s.nom, s.fondu], quoi).toEqual(['none', 0]);
  };
  await verifierImmobile('tuiles');
  await vue.getByRole('button', { name: /^Ce que je faisais/ }).click();
  await tuile(vue, 'Moyenne').click();
  await expect(carte(vue)).toBeVisible();
  await verifierImmobile('carte');
  await mot(vue, 'Préoccupé', 'Peur').click();
  await verifierImmobile('mot choisi');
  await retourEnergie(vue).click();
  await verifierImmobile('retour aux tuiles');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('accessibilité : après une tuile, le focus va à la zone touchée de la carte (v8) ; après « ‹ Énergie », au titre « Énergie » ; après « Toute la carte », au titre « Émotion »', async ({ page }) => {
  const vue = await ouvrir(page);
  await tuile(vue, 'Moyenne', 'agréable').click();
  await expect(carte(vue).getByRole('group', { name: 'Moyenne · plutôt agréable', exact: true })).toBeFocused();
  await retourEnergie(vue).click();
  await expect(vue.getByRole('heading', { name: 'Énergie', level: 2 })).toBeFocused();
  await vue.getByRole('button', { name: 'Toute la carte', exact: true }).click();
  await expect(vue.getByRole('heading', { name: 'Émotion', level: 2 })).toBeFocused();
});
