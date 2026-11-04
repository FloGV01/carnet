import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v7 (8/9) · Parcours 2b (plan v6.2, tâches 3 et 5) : épisode, symptôme et Après coup avec les réponses près du pouce,
// le repère d'étape en points (jamais une barre) et les couleurs de leur parcours ; Moment difficile en trois cartes,
// la respiration en tête. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const creerEpisode = (page, e) => page.evaluate(async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, v) => page.evaluate(([c, x]) => window.__carnet.repo.meta.ecrire(c, x), [cle, v]);
const PLAN = {
  premiersSignes: 'la voix qui monte',
  quandCaMonte: 'je sors marcher\nje bois de l\'eau',
  siSurcharge: '', pourRecuperer: '', prevenir: '', siAlors: [],
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Les boîtes de la question, de son aide, de la grille et du pied, à l'étape affichée.
const boites = (vue) => vue.evaluate((v) => {
  const b = (e) => e && e.getBoundingClientRect();
  const etape = v.querySelector('.etape');
  const groupe = etape.querySelector('[role="group"]');
  const boutons = [...groupe.querySelectorAll('button')].map(b);
  return {
    question: b(etape.querySelector('.titre-question')),
    aide: b(etape.querySelector('.sous-question')),
    grille: b(groupe),
    pied: b(v.querySelector('.parcours-pied')),
    hauteurs: boutons.map((x) => Math.round(x.height)),
    rangees: new Set(boutons.map((x) => Math.round(x.top))).size,
    defile: v.querySelector('.parcours-corps').scrollHeight > v.querySelector('.parcours-corps').clientHeight,
  };
});
// Réponses courtes : la grille en bas de l'écran, juste au-dessus du pied, la question (et son aide) juste au-dessus.
function presDuPouce(b, quoi) {
  expect(b.pied.top - b.grille.bottom, `${quoi} : le bas de la grille près du pied`).toBeLessThanOrEqual(24);
  expect(b.pied.top - b.grille.bottom, `${quoi} : sans passer dessous`).toBeGreaterThanOrEqual(0);
  const dessus = b.aide || b.question;
  expect(b.grille.top - dessus.bottom, `${quoi} : la question juste au-dessus de la grille`).toBeLessThanOrEqual(20);
  expect(b.grille.top - dessus.bottom, quoi).toBeGreaterThanOrEqual(0);
  expect(b.question.top, `${quoi} : la question descend`).toBeGreaterThan(420);
  expect(b.defile, `${quoi} : tient sans défiler`).toBe(false);
}

test('épisode : Intensité, En dessous et Réaction près du pouce (Intensité en 2 × 5 boutons de 64) ; Déclencheur et Émotion depuis le haut', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  // Listes longues : la question en haut, sous la ligne de date.
  await expect(fiche.getByRole('heading', { name: 'Ça a démarré avec…' })).toBeVisible();
  expect((await boites(fiche)).question.top).toBeLessThan(160);
  await fiche.getByRole('button', { name: 'Conflit', exact: true }).click();
  await expect(fiche.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  // Le rappel des réponses, dans une carte au-dessus de la question.
  const phrase = fiche.locator('.phrase-resume');
  await expect(phrase).toHaveText('Ça a démarré avec Conflit.');
  expect((await boites(fiche)).question.top).toBeLessThan(260);
  await fiche.getByRole('button', { name: 'Colère', exact: true }).click();

  await expect(fiche.getByRole('heading', { name: 'Intensité', exact: true })).toBeVisible();
  await expect(fiche.getByText('1 = à peine, 10 = maximum')).toBeVisible();
  const intensite = await boites(fiche);
  presDuPouce(intensite, 'Intensité');
  expect(intensite.hauteurs).toEqual(Array(10).fill(64));
  expect(intensite.rangees).toBe(2);
  // Le rappel reste en haut, sous la ligne de date.
  expect((await phrase.boundingBox()).y).toBeLessThan(160);
  expect(await fiche.getByRole('button', { name: 'Intensité 7' }).evaluate((b) => Math.round(parseFloat(getComputedStyle(b).fontSize)))).toBe(21);
  await fiche.getByRole('button', { name: 'Intensité 7' }).click();

  await expect(fiche.getByRole('heading', { name: 'Et en dessous, il y avait peut-être…' })).toBeVisible();
  presDuPouce(await boites(fiche), 'En dessous');
  await fiche.getByRole('button', { name: 'Injustice', exact: true }).click();
  await expect(fiche.getByRole('heading', { name: 'Ta réaction' })).toBeVisible();
  presDuPouce(await boites(fiche), 'Réaction');
  // « ‹ Retour » et « Passer › » dans la barre du bas, en couleur action et en 600.
  for (const nom of ['Retour', 'Passer']) {
    const s = await fiche.locator('.parcours-pied').getByRole('button', { name: nom }).evaluate((b) => [getComputedStyle(b).fontWeight, Boolean(b.querySelector('svg'))]);
    expect(s, nom).toEqual(['600', true]);
  }
});

test('symptôme et Après coup : réponses courtes près du pouce, listes longues depuis le haut', async ({ page }) => {
  await page.getByRole('link', { name: 'Symptôme', exact: true }).click();
  const symptome = page.getByRole('dialog', { name: 'Symptôme' });
  await expect(symptome.getByRole('heading', { name: 'Quel symptôme ?' })).toBeVisible();
  expect((await boites(symptome)).question.top).toBeLessThan(160);
  await symptome.getByRole('button', { name: 'Ruminations', exact: true }).click();
  await expect(symptome.getByRole('heading', { name: 'Intensité', exact: true })).toBeVisible();
  const intensite = await boites(symptome);
  presDuPouce(intensite, 'Symptôme · Intensité');
  expect(intensite.hauteurs).toEqual(Array(10).fill(64));
  await symptome.getByRole('button', { name: 'Intensité 4' }).click();
  await expect(symptome.getByRole('heading', { name: 'Combien de temps ?' })).toBeVisible();
  presDuPouce(await boites(symptome), 'Durée');
  await symptome.getByRole('button', { name: 'Fermer', exact: true }).click();

  const id = await creerEpisode(page, { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 });
  await aller(page, `#/apres-coup/${id}`);
  const ac = page.getByRole('dialog', { name: 'Après coup' });
  await expect(ac.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  presDuPouce(await boites(ac), 'Après coup · C\'était plutôt');
  await ac.getByRole('button', { name: 'Passer' }).click();
  await expect(ac.getByRole('heading', { name: 'Ce jour-là, ce qui me fragilisait déjà…' })).toBeVisible();
  expect((await boites(ac)).question.top).toBeLessThan(200);
  // Le déclencheur, repris de l'épisode, est déjà rempli : « Suivant » au lieu de « Passer ».
  for (const nom of ['Passer', 'Suivant', 'Passer']) await ac.getByRole('button', { name: nom, exact: true }).click();
  await expect(ac.getByRole('heading', { name: 'Quand j\'ai remarqué que ça montait, j\'en étais à…' })).toBeVisible();
  const repere = await boites(ac);
  presDuPouce(repere, 'Après coup · Ça montait à');
  expect(repere.hauteurs).toEqual(Array(10).fill(64));
});

// Les points du repère d'étape : taille, forme, fond et anneau.
const points = (vue) => vue.locator('.reperes').evaluate((r) => [...r.children].map((i) => {
  const s = getComputedStyle(i);
  return { classe: i.className, taille: `${i.getBoundingClientRect().width}×${i.getBoundingClientRect().height}`, rond: s.borderTopLeftRadius === '50%',
    fond: s.backgroundColor, contour: s.borderTopColor, anneau: s.boxShadow };
}));

// v8 (8/9, Q29) : les étapes à venir passent de --surface-2 (invisible sur le fond clair) à un contour en --text-2, sans
// fond (README 2b : « contour (2a) »), à 3:1 au moins sur le fond (relecture : --line restait sous 3:1).
test('repère d\'étape en points, jamais une barre : faites et en cours à la couleur du parcours, l\'étape en cours cerclée de -tint-2, à venir en contour', async ({ page }) => {
  const id = await creerEpisode(page, { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 });
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await appPrete(page);
    for (const [route, nom, couleur, n] of [['#/episode/nouveau', 'Épisode', 'episode', 5], ['#/symptome/nouveau', 'Symptôme', 'symptome', 3]]) {
      await aller(page, '#/aujourdhui');
      await aller(page, route);
      const vue = page.getByRole('dialog', { name: nom });
      await expect(vue.getByRole('img', { name: `Étape 1 sur ${n}` })).toBeVisible();
      await vue.getByRole('button', { name: 'Passer' }).click();
      await expect(vue.getByRole('img', { name: `Étape 2 sur ${n}` })).toBeVisible();
      await expect(vue.locator('progress, [role="progressbar"], meter')).toHaveCount(0);
      const p = await points(vue);
      const quoi = `${schema} · ${nom}`;
      expect(p.map((x) => x.classe), quoi).toEqual(['fait', 'en-cours', ...Array(n - 2).fill('')]);
      for (const x of p) {
        expect(x.taille, quoi).toBe('9×9');
        expect(x.rond, quoi).toBe(true);
      }
      expect(p[0].fond, `${quoi} : faite`).toBe(rgb(t[`c-${couleur}`]));
      expect(p[0].anneau, `${quoi} : faite, sans anneau`).toBe('none');
      expect(p[1].fond, `${quoi} : en cours`).toBe(rgb(t[`c-${couleur}`]));
      expect(p[1].anneau, `${quoi} : en cours, anneau de 3 px`).toBe(`${rgb(t[`c-${couleur}-tint-2`])} 0px 0px 0px 3px`);
      expect(p[2].fond, `${quoi} : à venir, sans fond`).toBe('rgba(0, 0, 0, 0)');
      expect(p[2].contour, `${quoi} : à venir, en contour`).toBe(rgb(t['text-2']));
      expect(p[0].contour, `${quoi} : faite, pleine`).toBe(p[0].fond);
      // En-tête : « Fermer » (600, action), puis le nom derrière un petit carré à la couleur du parcours, sans « · ».
      const tete = await vue.locator('.parcours-tete').evaluate((h) => {
        const f = h.querySelector('.fermer');
        const carre = h.querySelector('.nom .point-teinte');
        return { fermer: [getComputedStyle(f).fontWeight, getComputedStyle(f).color], nom: h.querySelector('.nom').textContent,
          carre: carre && [getComputedStyle(carre).backgroundColor, getComputedStyle(carre).borderTopLeftRadius, carre.getBoundingClientRect().width] };
      });
      expect(tete, quoi).toEqual({ fermer: ['600', rgb(t.action)], nom, carre: [rgb(t[`c-${couleur}`]), '3px', 11] });
      await vue.getByRole('button', { name: 'Fermer', exact: true }).click();
    }
    // Rouvert : le récapitulatif, toutes les étapes faites, aucune en cours.
    await aller(page, `#/episode/${id}`);
    const fiche = page.getByRole('dialog', { name: 'Épisode' });
    await expect(fiche.getByRole('img', { name: 'Récapitulatif' })).toBeVisible();
    expect((await points(fiche)).map((x) => x.classe)).toEqual(Array(5).fill('fait'));
    await fiche.getByRole('button', { name: 'Terminer' }).click();
  }
});

// L'en-tête d'un parcours à étapes : sa hauteur, le nom (lignes), le repère (à côté du nom ou passé dessous), ce qui
// sort de l'écran, et le toast (sous l'en-tête, sans le couvrir).
const tete = (vue) => vue.locator('.parcours-tete').evaluate((h) => {
  const r = (e) => e.getBoundingClientRect();
  const nom = h.querySelector('.nom');
  const texte = document.createRange();
  texte.selectNodeContents([...nom.childNodes].find((n) => n.nodeType === Node.TEXT_NODE));
  const reperes = h.querySelector('.reperes');
  const toast = document.querySelector('.toast');
  return {
    hauteur: Math.round(r(h).height),
    lignesNom: new Set([...texte.getClientRects()].map((x) => Math.round(x.top))).size,
    repere: r(reperes).top >= r(nom).bottom - 1 ? 'dessous' : r(reperes).left >= r(nom).right ? 'à côté' : 'chevauche le nom',
    dehors: [...h.querySelectorAll('*')].filter((e) => r(e).left < -0.5 || r(e).right > innerWidth + 0.5).length,
    toastSous: toast && r(toast).top >= r(h).bottom,
  };
});

test('en-tête en grand texte : l\'Après coup à 8 étapes tient sur une ligne de 48 à 21 et 23 px ; plus grand, le repère passe sous le nom, jamais coupé ; le toast se pose sous l\'en-tête', async ({ page }) => {
  const id = await creerEpisode(page, { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 });
  const id11 = await creerEpisode(page, { date: '2026-10-14', heure: '19:30', emotion: 'emotion:colere', intensite: 6,
    apresCoup: { types: ['typeExplosion:colere', 'typeExplosion:surcharge'] } });
  const ac = page.getByRole('dialog', { name: 'Après coup' });
  const verifier = async (cas, toast) => {
    for (const [px, attendu] of cas) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, px);
      const t = await tete(ac);
      const quoi = `${await ac.locator('.reperes').getAttribute('aria-label')} · ${px ?? 17} px`;
      expect({ ...t, hauteur: attendu.hauteur ? t.hauteur : undefined }, quoi).toEqual({ ...attendu, lignesNom: 1, dehors: 0, toastSous: toast });
      if (!attendu.hauteur) expect(t.hauteur, `${quoi} : le repère dans une rangée à lui`).toBeGreaterThan(48);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  };
  // 11 étapes (Colère et Surcharge cochées) : sur une ligne jusqu'à 21 px, puis le repère dessous.
  await aller(page, `#/apres-coup/${id11}`);
  await expect(ac.getByRole('img', { name: 'Récapitulatif' })).toBeVisible();
  await expect(ac.locator('.reperes i')).toHaveCount(11);
  await verifier([[null, { hauteur: 48, repere: 'à côté' }], [21, { hauteur: 48, repere: 'à côté' }], [23, { repere: 'dessous' }]], null);
  await ac.getByRole('button', { name: 'Fermer', exact: true }).click();

  // 8 étapes, juste après un épisode noté : son toast est encore là, posé en haut. L'horloge s'arrête pour qu'il reste.
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'Conflit', exact: true }).click();
  await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
  await aller(page, `#/apres-coup/${id}`);
  await expect(ac.getByRole('img', { name: 'Étape 1 sur 8' })).toBeVisible();
  await expect(page.locator('.toast.en-haut')).toHaveText(/Épisode enregistré/);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
  await verifier([[null, { hauteur: 48, repere: 'à côté' }], [21, { hauteur: 48, repere: 'à côté' }], [23, { hauteur: 48, repere: 'à côté' }],
    [28, { repere: 'dessous' }], [33, { repere: 'dessous' }]], true);
});

// Style d'un choix fait (après son petit rebond) : fond, texte, graisse, coche.
const styleChoix = (loc) => loc.evaluate(async (e) => {
  await Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const s = getComputedStyle(e);
  const coche = e.querySelector(':scope > .coche');
  return [s.backgroundColor, s.color, s.fontWeight, Boolean(coche) && getComputedStyle(coche).display !== 'none'];
});

test('couleurs de parcours sur les choix et dans le rappel : épisode et Après coup en magenta, symptôme en menthe ; AA en clair et en sombre', async ({ page }) => {
  const id = await creerEpisode(page, { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', intensite: 7 });
  const idSymptome = await page.evaluate(async () => (await window.__carnet.repo.symptomes.creer({ date: '2026-10-14', symptome: 'symptome:ruminations', intensite: 4 })).id);
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    const choisi = (c, graisse = '600') => [rgb(t[`c-${c}-fill`]), rgb(t[`c-${c}-on`]), graisse, true];
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await appPrete(page);
    // Épisode : un choix de liste, puis un chiffre ; le rappel des réponses dans une carte, ses termes en -text, 600.
    await aller(page, `#/episode/${id}`);
    const fiche = page.getByRole('dialog', { name: 'Épisode' });
    await fiche.getByRole('button', { name: /^Intensité/ }).click();
    const sept = fiche.getByRole('button', { name: 'Intensité 7' });
    await expect(sept).toHaveAttribute('aria-pressed', 'true');
    expect(await styleChoix(sept), `${schema} · Intensité 7`).toEqual(choisi('episode', '700'));
    const rappel = await fiche.locator('.phrase-resume').evaluate((p) => {
      const v = p.querySelector('.valeur');
      const s = getComputedStyle(p);
      return { fond: s.backgroundColor, rayon: s.borderTopLeftRadius, texte: s.color, terme: [getComputedStyle(v).color, getComputedStyle(v).fontWeight], mots: p.textContent };
    });
    expect(rappel.mots).toBe('Ça a démarré avec Conflit, ça ressemblait à colère, intensité 7.');
    expect([rappel.fond, rappel.rayon, rappel.terme], schema).toEqual([rgb(t.surface), '14px', [rgb(t['c-episode-text']), '600']]);
    expect(contraste(rappel.terme[0], rappel.fond), `${schema} · terme`).toBeGreaterThanOrEqual(4.5);
    expect(contraste(rappel.texte, rappel.fond), `${schema} · rappel`).toBeGreaterThanOrEqual(4.5);
    await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();

    // Après coup : la couleur de l'épisode.
    await aller(page, `#/apres-coup/${id}`);
    const ac = page.getByRole('dialog', { name: 'Après coup' });
    const colere = ac.getByRole('group', { name: 'C\'était plutôt…' }).getByRole('button', { name: 'Colère' });
    await colere.click();
    await expect(colere).toHaveAttribute('aria-pressed', 'true');
    expect(await styleChoix(colere), `${schema} · Après coup`).toEqual(choisi('episode'));
    await colere.click();
    await ac.getByRole('button', { name: 'Fermer', exact: true }).click();

    // Symptôme : la sienne.
    await aller(page, `#/symptome/${idSymptome}`);
    const sy = page.getByRole('dialog', { name: 'Symptôme' });
    await sy.getByRole('button', { name: /^Symptôme/ }).click();
    const ruminations = sy.getByRole('button', { name: 'Ruminations', exact: true });
    await expect(ruminations).toHaveAttribute('aria-pressed', 'true');
    expect(await styleChoix(ruminations), `${schema} · Ruminations`).toEqual(choisi('symptome'));
    for (const [a, b] of [['c-episode-fill', 'c-episode-on'], ['c-symptome-fill', 'c-symptome-on']]) expect(contraste(rgb(t[a]), rgb(t[b]))).toBeGreaterThanOrEqual(4.5);
    await sy.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(sy).toHaveCount(0);
  }
});

test('nouvel épisode : la date à gauche et « Mon plan » à droite, sur une ligne ; rouvert, « Mon plan · Après coup · En parler » dessous', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  const date = fiche.locator('.ligne-date > .btn-lien');
  const plan = fiche.locator('.ligne-plan').getByRole('button', { name: 'Mon plan' });
  await expect(date).toHaveText('Aujourd\'hui · 21:00');
  const [d, p] = await Promise.all([date.boundingBox(), plan.boundingBox()]);
  expect(Math.abs((d.y + d.height / 2) - (p.y + p.height / 2))).toBeLessThanOrEqual(1);
  expect(p.x).toBeGreaterThanOrEqual(d.x + d.width);
  expect(Math.round(p.x + p.width)).toBe(390 - 14);
  expect(await plan.evaluate((b) => [getComputedStyle(b).fontWeight, b.querySelector('svg').getBoundingClientRect().width])).toEqual(['600', 16]);
  // La date s'ouvre dessous, sur toute la largeur.
  await date.click();
  const champ = fiche.getByLabel('Date', { exact: true });
  await expect(champ).toBeVisible();
  expect((await champ.boundingBox()).y).toBeGreaterThan(d.y + d.height - 1);
  await fiche.getByRole('button', { name: 'Conflit', exact: true }).click();
  await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  const [ep] = await page.evaluate(() => window.__carnet.repo.episodes.tous());
  await aller(page, `#/episode/${ep.id}`);
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const [d2, p2] = await Promise.all([date.boundingBox(), plan.boundingBox()]);
  expect(p2.y).toBeGreaterThanOrEqual(d2.y + d2.height - 1);
  expect(Math.round(p2.x)).toBe(14);
  await expect(fiche.locator('.ligne-plan')).toHaveText(/^Mon plan\s*·\s*Après coup\s*·\s*En parler$/);
});

test('dans un parcours, le toast se pose en haut, sous « Fermer », loin des réponses ; sur Aujourd\'hui, il reste en bas', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode', exact: true }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'Conflit', exact: true }).click();
  await expect(fiche.getByRole('heading', { name: 'Ça ressemblait plutôt à…' })).toBeVisible();
  // Chaque changement de la page est guetté : le toast du parcours qui se ferme ne doit jamais paraître en haut.
  await page.evaluate(() => {
    window.__toastEnHaut = false;
    new MutationObserver(() => { if (document.querySelector('.toast.en-haut')) window.__toastEnHaut = true; })
      .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
  await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
  // Fermé : le toast paraît sur Aujourd'hui, en bas, au-dessus de la bande, sans être passé par le haut.
  const toast = page.getByRole('status').filter({ hasText: 'Épisode enregistré' });
  await expect(toast).toBeVisible();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await page.evaluate(() => window.__toastEnHaut)).toBe(false);
  expect((await toast.boundingBox()).y).toBeGreaterThan(600);
  // Un symptôme ouvert tout de suite : le toast monte sous « Fermer », la grille près du pouce reste libre.
  await page.getByRole('link', { name: 'Symptôme', exact: true }).click();
  const sy = page.getByRole('dialog', { name: 'Symptôme' });
  await sy.getByRole('button', { name: 'Ruminations', exact: true }).click();
  await expect(sy.getByRole('heading', { name: 'Intensité', exact: true })).toBeVisible();
  await expect(toast).toBeVisible();
  const [t, grille, fermer] = await Promise.all([toast.boundingBox(), sy.getByRole('group', { name: 'Intensité' }).boundingBox(),
    sy.getByRole('button', { name: 'Fermer', exact: true }).boundingBox()]);
  expect(t.y).toBeGreaterThanOrEqual(fermer.y + fermer.height - 1);
  expect(t.y + t.height).toBeLessThan(grille.y);
  // « Annuler » marche toujours.
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.episodes.tous())).toHaveLength(0);
});

const vueDifficile = (page) => page.getByRole('dialog', { name: 'Moment difficile' });
const ouvrirDifficile = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  const vue = vueDifficile(page);
  await expect(vue.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeVisible();
  return vue;
};
const puce = (vue, nom) => vue.getByRole('combobox', { name: nom, exact: true });

test('Moment difficile 2b : les exercices courts en tête (v10), la respiration dans une carte (cercle bleu brume, « Commencer » en -fill / -on, AA), « Une chose à la fois › », Mon plan ; le corps défile, le pied reste', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await appPrete(page);
    const vue = await ouvrirDifficile(page);
    // « Une chose à la fois » n'apparaît qu'une fois le plan et ses réglages lus : on l'attend avant de lire l'ordre
    // (sans cela, le test lisait parfois l'écran avant, et ne trouvait que deux cartes).
    await expect(vue.locator('.une-chose-acces')).toBeVisible();
    await expect(vue.getByRole('link', { name: 'Modifier mon plan' })).toBeVisible();
    // L'ordre de la v6.1, sous les quatre exercices courts (v10).
    const ordre = await vue.evaluate((v) => [...v.querySelectorAll('.parcours-corps .exercices-courts, .parcours-corps .carte')].map((c) => (c.classList.contains('exercices-courts') ? 'courts'
      : c.querySelector('.respiration') ? 'respiration' : c.classList.contains('une-chose-acces') ? 'une-chose' : c.classList.contains('plan-moment') ? 'plan' : '?')));
    expect(ordre, schema).toEqual(['courts', 'respiration', 'une-chose', 'plan']);
    const s = await vue.evaluate((v) => {
      const st = (e) => getComputedStyle(e);
      const cercle = v.querySelector('.cercle-respiration');
      const disque = cercle.querySelector('span');
      const commencer = [...v.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Commencer');
      const cartes = [...v.querySelectorAll('.parcours-corps .carte')];
      return {
        cartes: cartes.map((c) => [st(c).backgroundColor, st(c).borderTopLeftRadius]),
        cercle: { taille: cercle.getBoundingClientRect().width, fond: st(cercle).backgroundColor, bord: st(cercle).borderTopWidth, couleurBord: st(cercle).borderTopColor, disque: st(disque).backgroundColor },
        commencer: { fond: st(commencer).backgroundColor, texte: st(commencer).color, graisse: st(commencer).fontWeight, hauteur: commencer.getBoundingClientRect().height },
        pied: v.querySelector('.parcours-pied').getBoundingClientRect().top,
        hautCorps: v.querySelector('.parcours-corps').getBoundingClientRect().top,
        nom: [v.querySelector('.parcours-tete .nom').textContent, st(v.querySelector('.point-teinte')).backgroundColor],
      };
    });
    for (const c of s.cartes) expect(c, schema).toEqual([rgb(t.surface), '14px']);
    expect(s.cercle.taille).toBeGreaterThanOrEqual(140);
    expect(s.cercle.taille).toBeLessThanOrEqual(164);
    expect(s.cercle, schema).toMatchObject({ fond: rgb(t['c-difficile-tint-2']), bord: '2px', couleurBord: rgb(t['c-difficile']), disque: rgb(t['c-difficile-tint']) });
    expect([s.commencer.fond, s.commencer.texte, s.commencer.graisse], schema).toEqual([rgb(t['c-difficile-fill']), rgb(t['c-difficile-on']), '600']);
    expect(s.commencer.hauteur).toBeGreaterThanOrEqual(52);
    expect(s.commencer.hauteur).toBeLessThanOrEqual(56);
    expect(contraste(s.commencer.fond, s.commencer.texte), `${schema} · Commencer`).toBeGreaterThanOrEqual(4.5);
    expect(s.nom, schema).toEqual(['Moment difficile', rgb(t['c-difficile'])]);
    // v10 : à l'ouverture, les exercices courts et « Commencer » sont à l'écran, au-dessus de « Noter un épisode », qui reste à
    // sa place ; la suite vient en défilant, et le bas de Mon plan s'arrête au-dessus du pied, rien n'est caché.
    await expect(vue.getByRole('button', { name: 'Commencer' })).toBeInViewport({ ratio: 1 });
    expect((await vue.getByRole('button', { name: 'Commencer' }).boundingBox()).y + s.commencer.hauteur).toBeLessThanOrEqual(s.pied);
    await expect(vue.getByRole('link', { name: 'Noter un épisode' })).toBeInViewport({ ratio: 1 });
    const fin = await vue.locator('.parcours-corps').evaluate((c) => {
      c.scrollTop = c.scrollHeight;
      const plan = c.querySelector('.plan-moment').getBoundingClientRect();
      return { defile: c.scrollHeight > c.clientHeight, basPlan: plan.bottom, hautPlan: plan.top };
    });
    expect(fin.defile, schema).toBe(true);
    expect(fin.basPlan, schema).toBeLessThanOrEqual(s.pied);
    expect(fin.hautPlan, schema).toBeGreaterThanOrEqual(s.hautCorps);
    await expect(vue.getByRole('link', { name: 'Noter un épisode' })).toBeInViewport({ ratio: 1 });
    // « Cohérence cardiaque », puis les puces « 5 minutes ▾ » et « 5 s · 5 s ▾ ».
    await expect(vue.locator('.phase-respiration')).toHaveText('Cohérence cardiaque');
    for (const [nom, texte] of [['Durée', '5 minutes'], ['Rythme', '5 s · 5 s']]) {
      const p = await puce(vue, nom).evaluate((x) => ({ texte: x.selectedOptions[0].textContent.replace(/ /g, ' '), hauteur: x.getBoundingClientRect().height,
        fond: getComputedStyle(x).backgroundColor, couleur: getComputedStyle(x).color, chevron: Boolean(x.parentElement.querySelector('svg')) }));
      expect(p, `${schema} · ${nom}`).toEqual({ texte, hauteur: 44, fond: rgb(t['surface-2']), couleur: rgb(t.text), chevron: true });
      expect(contraste(p.couleur, p.fond)).toBeGreaterThanOrEqual(4.5);
    }
    // « Une chose à la fois › » et « Modifier » (couleur action, 600), le carré de Mon plan à la couleur du parcours.
    const acces = vue.getByRole('button', { name: 'Une chose à la fois', exact: true });
    expect(await acces.evaluate((b) => [getComputedStyle(b).fontWeight, Boolean(b.querySelector('svg')), b.getBoundingClientRect().height >= 44])).toEqual(['600', true, true]);
    const modifier = vue.getByRole('link', { name: 'Modifier mon plan', exact: true });
    expect(await modifier.evaluate((a) => [a.textContent, getComputedStyle(a).fontWeight, getComputedStyle(a).color])).toEqual(['Modifier', '600', rgb(t.action)]);
    expect(await vue.locator('.carre-plan').evaluate((c) => [getComputedStyle(c).backgroundColor, c.getBoundingClientRect().width])).toEqual([rgb(t['c-difficile']), 28]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  }
});

test('Moment difficile : les puces règlent la durée et le rythme d\'un toucher (le signal est gardé) ; pendant la respiration, elles restent en place, inactives', async ({ page }) => {
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true });
  const vue = await ouvrirDifficile(page);
  await puce(vue, 'Durée').selectOption('2');
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 2, rythme: '5-5', son: true, voix: false });
  await puce(vue, 'Rythme').selectOption('4-6');
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 2, rythme: '4-6', son: true, voix: false });
  await expect(puce(vue, 'Rythme')).toHaveValue('4-6');
  expect(await puce(vue, 'Rythme').evaluate((x) => x.selectedOptions[0].textContent)).toBe('4 s · 6 s');
  // Réglages › Moment difficile montre le même réglage.
  await aller(page, '#/reglages/moment-difficile');
  await expect(page.getByRole('button', { name: 'Durée : 2 min', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Rythme : 4-6', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // Pendant la respiration : rien ne saute, les puces sont inactives ; la respiration suit le réglage (2 min).
  await ecrireMeta(page, 'respiration', { duree: 2, rythme: '5-5', son: false });
  const v = await ouvrirDifficile(page);
  // Les puces arrivent une fois les réglages lus, ce qui agrandit la carte : on mesure après, sinon l'écart vient de là.
  await expect(puce(v, 'Durée')).toBeEnabled();
  const avant = await v.locator('.respiration').boundingBox();
  await v.getByRole('button', { name: 'Commencer' }).click();
  await expect(v.locator('.phase-respiration')).toHaveText('Inspire');
  await expect(puce(v, 'Durée')).toBeDisabled();
  await expect(puce(v, 'Rythme')).toBeDisabled();
  expect(Math.abs((await v.locator('.respiration').boundingBox()).height - avant.height)).toBeLessThanOrEqual(1);
  await page.clock.runFor(122 * 1000);
  await expect(v.locator('.phase-respiration')).toHaveText('2 minutes de respiration.');
  await expect(puce(v, 'Durée')).toBeEnabled();
  await expect(v.getByRole('button', { name: 'Recommencer' })).toBeVisible();
  // La séance est notée, avec son origine (tâche 7).
  await expect.poll(async () => (await page.evaluate(() => window.__carnet.repo.seances.tous())).map((x) => [x.origine, x.dureeS])).toEqual([['moment-difficile', 120]]);
});

test('Moment difficile : une puce réglée une fois la respiration finie ne change pas ce qui vient d\'être fait (« 2 minutes de respiration. » reste, la séance aussi) ; « Recommencer » suit le nouveau réglage', async ({ page }) => {
  await ecrireMeta(page, 'respiration', { duree: 2, rythme: '5-5', son: false });
  const vue = await ouvrirDifficile(page);
  const phase = vue.locator('.phase-respiration');
  const seances = () => page.evaluate(async () => (await window.__carnet.repo.seances.tous()).map((x) => x.dureeS).sort((a, b) => a - b));
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(phase).toHaveText('Inspire');
  await page.clock.runFor(122 * 1000);
  await expect(phase).toHaveText('2 minutes de respiration.');
  await expect.poll(seances).toEqual([120]);
  // 10 minutes sur la puce : le réglage change, le texte de fin dit toujours la séance faite.
  await puce(vue, 'Durée').selectOption('10');
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 10, rythme: '5-5', son: false, voix: false });
  await expect(puce(vue, 'Durée')).toHaveValue('10');
  await expect(phase).toHaveText('2 minutes de respiration.');
  await expect(vue.getByText('10 minutes de respiration.')).toHaveCount(0);
  expect(await seances()).toEqual([120]);
  // Le rythme aussi, sans rien changer au texte.
  await puce(vue, 'Rythme').selectOption('4-6');
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 10, rythme: '4-6', son: false, voix: false });
  await expect(phase).toHaveText('2 minutes de respiration.');
  // « Recommencer » : 10 minutes, cette fois. Passé 2 minutes, la respiration continue ; arrêtée, c'est une autre séance.
  await vue.getByRole('button', { name: 'Recommencer' }).click();
  await expect(phase).toHaveText('Inspire');
  await page.clock.runFor(122 * 1000);
  await expect(phase).toHaveText(/^(Inspire|Expire)$/);
  await vue.getByRole('button', { name: 'Arrêter' }).click();
  await expect(phase).toHaveText('Cohérence cardiaque');
  await expect.poll(seances).toEqual([120, 122]);
});

test('Moment difficile, « Réduire les animations » : le cercle reste figé (le disque change seulement de teinte) ; Une chose à la fois et sans plan, au même style', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ecrireMeta(page, 'monPlan', PLAN);
  const vue = await ouvrirDifficile(page);
  const etat = () => vue.locator('.cercle-respiration').evaluate((c) => {
    const d = c.querySelector('span');
    return { taille: c.getBoundingClientRect().width, disque: d.getBoundingClientRect().width, animation: getComputedStyle(d).animationName, fond: getComputedStyle(d).backgroundColor };
  });
  const repos = await etat();
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.cercle-respiration')).toHaveClass(/phase-inspire/);
  const inspire = await etat();
  expect(inspire.animation).toBe('none');
  expect([inspire.taille, inspire.disque]).toEqual([repos.taille, repos.disque]);
  expect(inspire.fond).not.toBe(repos.fond);
  await page.clock.runFor(5400);
  await expect(vue.locator('.cercle-respiration')).toHaveClass(/phase-expire/);
  const expire = await etat();
  expect([expire.taille, expire.disque, expire.fond]).toEqual([repos.taille, repos.disque, repos.fond]);
  await vue.getByRole('button', { name: 'Arrêter' }).click();

  // « Une chose à la fois » : même en-tête (carré du parcours), sans repère.
  await vue.getByRole('button', { name: 'Une chose à la fois', exact: true }).click();
  const cartes = page.getByRole('dialog', { name: 'Une chose à la fois' });
  await expect(cartes.locator('.une-chose-texte')).toHaveText('je sors marcher');
  await expect(cartes.locator('.reperes')).toHaveCount(0);
  await expect(cartes.locator('.parcours-tete .point-teinte')).toHaveCount(1);
  await cartes.getByRole('button', { name: 'Fermer', exact: true }).click();

  // Sans plan : « Écrire mon plan » dans la carte de Mon plan, et pas de « Une chose à la fois ».
  await ecrireMeta(page, 'monPlan', null);
  const sans = await ouvrirDifficile(page);
  await expect(sans.getByRole('region', { name: 'Mon plan' }).getByRole('link', { name: 'Écrire mon plan' })).toBeVisible();
  await expect(sans.getByRole('button', { name: 'Une chose à la fois', exact: true })).toHaveCount(0);
  await expect(sans.getByRole('link', { name: 'Modifier mon plan' })).toHaveCount(0);
});
