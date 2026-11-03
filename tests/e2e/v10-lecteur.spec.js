import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { espionnerAudio, audio, notes } from '../aides/audio.js';
import { installerParole, parole, installerVerrou, verrou, cacher, montrer, seances, environ, frequencesBols, souffles } from '../aides/lecteur.js';
import { contraste } from '../aides/couleurs.js';

// v10 (4/9) · Le lecteur (spec §5.3, §6, §7.3 et §14) : la durée au choix, le noting, le soupir, l'épingle, l'exercice de
// nuit, et le mode crise, par son adresse #/crise/:id (ses boutons : v10-crise.spec.js).
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const consigne = (v) => v.locator('.lecteur-consigne');
const reste = (v) => v.locator('.lecteur-reste');
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, x) => page.evaluate(([c, v]) => window.__carnet.repo.meta.ecrire(c, v), [cle, x]);
const clesCarnet = (page, debut = 'carnet:') => page.evaluate((d) => Object.keys(localStorage).filter((k) => k.startsWith(d)).sort(), debut);
const lireCle = (page, cle) => page.evaluate((c) => localStorage.getItem(c), cle);
const anneau = (v) => v.locator('.anneau-plein').evaluate((c) => 1 - Number(c.getAttribute('stroke-dashoffset')) / Number(c.getAttribute('stroke-dasharray')));
const texte = (t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s')}$`);
// L'horloge factice tourne aussi en temps réel : pour un temps serré, elle s'arrête, et n'avance plus que par runFor.
const figer = async (page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const ouvrir = async (page, id, titre) => {
  await aller(page, `#/exercice/${id}`);
  const v = vue(page, titre);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  return v;
};
// Rien ne dépasse de côté : ni la page, ni le corps du lecteur, ni aucun de ses boutons.
const rienNeDeborde = async (page) => {
  const fautes = await page.evaluate(() => {
    const largeur = document.documentElement.clientWidth;
    const f = [];
    if (document.documentElement.scrollWidth > largeur) f.push(`page : ${document.documentElement.scrollWidth}`);
    for (const c of document.querySelectorAll('.parcours-corps')) if (c.scrollWidth > c.clientWidth) f.push(`corps : ${c.scrollWidth} > ${c.clientWidth}`);
    // Un interrupteur porte sa zone de toucher plus large que lui (composants) : pas un débordement.
    for (const b of document.querySelectorAll('.parcours button:not([role=switch])')) {
      const r = b.getBoundingClientRect();
      if (r.width && (r.left < 0 || r.right > largeur)) f.push(`bouton ${b.textContent} : ${r.left} à ${r.right}`);
      if (b.scrollWidth > b.clientWidth + 1) f.push(`bouton ${b.textContent} : texte de ${b.scrollWidth} dans ${b.clientWidth}`);
    }
    return f;
  });
  expect(fautes).toEqual([]);
};

// Le lecteur en mode crise. `toucher` : lancé d'un toucher (lancerLecture), avec un retour qui n'est pas celui de l'adresse,
// pour vérifier qu'il est suivi ; sinon, ouvert par son adresse.
const monterCrise = async (page, id, { toucher = true } = {}) => {
  if (!toucher) { await aller(page, `#/crise/${id}`); return; }
  await page.evaluate((ident) => import('/js/ui/composants/lecteur.js').then((m) => m.lancerLecture(`#/crise/${ident}`, { retour: '#/reglages', mode: 'crise' })), id);
};

// Panique : 12, 27 (soupir), 20, 18, 12, 20 (expiration longue), 11 s : deux minutes.
const PANIQUE = 'Pose les pieds bien à plat et appuie. Tu peux bouger, ou passer une étape, quand tu veux.';

// ---------- L'adresse d'un exercice seul ----------

test('#/exercice/:id : le lecteur attend « Commencer », à l\'onglet Bien-être sans onglets ; « Fermer » revient à Bien-être ; un exercice inconnu ramène à Bien-être', async ({ page }) => {
  await espionnerAudio(page);
  const v = await ouvrir(page, 'ancrage-court', 'Ancrage court');
  await expect(v.getByRole('heading', { name: 'Ancrage court', level: 1 })).toBeVisible();
  await expect(v.locator('.lecteur-duree')).toHaveText(/^2\smin\s·\slà où tu es$/);
  // Une durée fixe : pas de choix.
  await expect(v.getByRole('group', { name: 'Durée' })).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.clock.runFor(3000);
  expect(await audio(page)).toMatchObject({ contextes: 0, oscillateurs: [] });
  await expect(consigne(v)).toHaveCount(0);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');

  await aller(page, '#/exercice/inconnu');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
  await expect(page.locator('main.bien-etre')).toBeVisible();
  // Une séance mise au bout d'un exercice seul ne date rien dans le Programme, et n'en dit rien.
  const w = await ouvrir(page, 'ancrage-54321', 'Ancrage 5-4-3-2-1');
  await bouton(w, 'Commencer').click();
  await figer(page);
  await page.clock.runFor(180000);
  await expect(consigne(w)).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'ancrage-54321', origine: 'bien-etre', fin: true });
  expect(s.programme ?? null).toBe(null);
});

test('un exercice lancé d\'un toucher (lancerLecture) démarre aussitôt, à la durée retenue, et revient à l\'écran demandé', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('carnet:duree:soupir', '1'));
  await aller(page, '#/reglages');
  await page.evaluate(() => import('/js/ui/composants/lecteur.js').then((m) => m.lancerLecture('#/exercice/soupir', { retour: '#/reglages/moment-difficile' })));
  const v = vue(page, 'Le soupir');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(bouton(v, 'Commencer')).toHaveCount(0);
  await expect(reste(v)).toHaveText(/^il reste (1:0\d|0:5\d)$/);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/reglages/moment-difficile');
});

// ---------- La durée au choix ----------

test('durée : 1 · 3 · 5 min sur l\'écran « avant » ; la valeur est gardée par exercice, écrite seulement quand elle change ; l\'anneau et « il reste » la suivent', async ({ page }) => {
  await espionnerAudio(page);
  let v = await ouvrir(page, 'expiration-longue', 'Expiration longue');
  const duree = (d) => v.getByRole('group', { name: 'Durée' }).getByRole('button', { name: `Durée : ${d} min` });
  // Au départ : 3 min, la durée de l'exercice ; rien n'est écrit tant que rien ne change.
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(v.getByRole('group', { name: 'Durée' }).getByRole('button')).toHaveCount(3);
  await expect(v.locator('.lecteur-duree')).toHaveText(/^3\smin\s·\slà où tu es$/);
  expect(await clesCarnet(page, 'carnet:duree')).toEqual([]);
  // Toucher la valeur déjà choisie n'écrit rien non plus.
  await duree(3).click();
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  expect(await clesCarnet(page, 'carnet:duree')).toEqual([]);
  // 5, puis 3 : écrits l'un après l'autre.
  await duree(5).click();
  await expect(duree(5)).toHaveAttribute('aria-pressed', 'true');
  await expect(v.locator('.lecteur-duree')).toHaveText(/^5\smin\s·\slà où tu es$/);
  expect(await lireCle(page, 'carnet:duree:expiration-longue')).toBe('5');
  await duree(3).click();
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  expect(await lireCle(page, 'carnet:duree:expiration-longue')).toBe('3');
  // L'anneau et « il reste » valent 3:00 : 90 s plus loin, la moitié.
  await bouton(v, 'Commencer').click();
  await expect(reste(v)).toHaveText(/^il reste (3:00|2:5\d)$/);
  await page.clock.runFor(90000);
  await expect(reste(v)).toHaveText(/^il reste 1:[23]\d$/);
  expect(await anneau(v)).toBeCloseTo(0.5, 1);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
  // Rouvert : 3 min encore. Choisi à 5, rouvert : 5.
  v = await ouvrir(page, 'expiration-longue', 'Expiration longue');
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  await duree(5).click();
  await bouton(v, 'Commencer').click();
  await expect(reste(v)).toHaveText(/^il reste (5:00|4:5\d)$/);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
  v = await ouvrir(page, 'expiration-longue', 'Expiration longue');
  await expect(duree(5)).toHaveAttribute('aria-pressed', 'true');
  // Par exercice : le noting reste à 3 min, et une clé abîmée ne compte pas.
  await page.evaluate(() => localStorage.setItem('carnet:duree:noting', '7'));
  v = await ouvrir(page, 'noting', 'Noter ce qui passe');
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => localStorage.setItem('carnet:duree:soupir', '"abc'));
  v = await ouvrir(page, 'soupir', 'Le soupir');
  await expect(duree(3)).toHaveAttribute('aria-pressed', 'true');
  // 1 min du soupir : des cycles entiers de 9 s, à un cycle près (27 + 36 = 63 s).
  await duree(1).click();
  await bouton(v, 'Commencer').click();
  await figer(page);
  await page.clock.runFor(100);
  const dit = await reste(v).textContent();
  const total = Number(await page.evaluate(() => import('/js/domain/exercices.js').then((m) => m.dureeExerciceS(m.exerciceAvecDuree(m.exerciceDe('soupir'), 1)))));
  expect(total).toBe(63);
  expect(dit).toMatch(/^il reste (1:0\d|0:5\d)$/);
});

// ---------- Le noting ----------

test('noting : quatre étiquettes de 60 pt au moins, en 2 × 2, sur l\'étape qui se répète ; un toucher fait briller 600 ms et n\'écrit rien ; le temps avance seul', async ({ page }) => {
  const v = await ouvrir(page, 'noting', 'Noter ce qui passe');
  const groupe = v.getByRole('group', { name: 'Ce qui passe' });
  await bouton(v, 'Commencer').click();
  // Sur les étapes d'avant, pas d'étiquettes (7 + 9 s).
  await expect(groupe).toHaveCount(0);
  await page.clock.runFor(16300);
  await expect(consigne(v)).toHaveText(texte('Touche l\'étiquette de ce qui passe, puis reviens au souffle. Rien n\'est gardé.'));
  await figer(page);
  const ETIQUETTES = ['Pensée', 'Corps', 'Son', 'Émotion'];
  await expect(groupe.getByRole('button')).toHaveText(ETIQUETTES);
  const boites = await Promise.all(ETIQUETTES.map((x) => bouton(groupe, x).boundingBox()));
  for (const b of boites) { expect(b.height).toBeGreaterThanOrEqual(60); expect(b.width).toBeGreaterThanOrEqual(60); }
  // 2 × 2 : Pensée et Corps côte à côte, Son et Émotion dessous.
  expect(Math.abs(boites[0].y - boites[1].y)).toBeLessThan(1);
  expect(Math.abs(boites[2].y - boites[3].y)).toBeLessThan(1);
  expect(Math.abs(boites[0].x - boites[2].x)).toBeLessThan(1);
  expect(boites[2].y).toBeGreaterThanOrEqual(boites[0].y + boites[0].height);
  // Rien n'est écrit : ni en base, ni dans l'appareil, et la dernière écriture ne bouge pas.
  const avant = await lireMeta(page, 'derniereEcriture');
  const lecture = () => page.evaluate(async () => {
    const r = window.__carnet.repo;
    return { seances: await r.seances.tous(), humeurs: await r.humeurs.tous(), local: Object.keys(localStorage).sort() };
  });
  const base = await lecture();
  const passe = await reste(v).textContent();
  await bouton(groupe, 'Corps').click();
  await expect(bouton(groupe, 'Corps')).toHaveClass(/brille/);
  await expect(bouton(groupe, 'Son')).not.toHaveClass(/brille/);
  await page.clock.runFor(500);
  await expect(bouton(groupe, 'Corps')).toHaveClass(/brille/);
  await page.clock.runFor(200);
  await expect(bouton(groupe, 'Corps')).not.toHaveClass(/brille/);
  // Deux touchers de suite : la dernière brille, et son temps repart.
  await bouton(groupe, 'Son').click();
  await page.clock.runFor(400);
  await bouton(groupe, 'Émotion').click();
  await expect(bouton(groupe, 'Son')).not.toHaveClass(/brille/);
  await page.clock.runFor(400);
  await expect(bouton(groupe, 'Émotion')).toHaveClass(/brille/);
  await page.clock.runFor(300);
  await expect(bouton(groupe, 'Émotion')).not.toHaveClass(/brille/);
  expect(await lecture()).toEqual(base);
  expect(await lireMeta(page, 'derniereEcriture')).toBe(avant);
  // Le temps avance seul, toucher ou pas ; l'étape finit, les étiquettes partent.
  await expect(reste(v)).not.toHaveText(passe);
  await page.clock.runFor(150000);
  await expect(consigne(v)).toHaveText(texte('Laisse les étiquettes. Sens encore une fois l\'air qui entre et qui sort.'));
  await expect(groupe).toHaveCount(0);
});

test('noting, mouvement réduit : seul le fond change, sans animation ; en mouvement normal, un halo', async ({ page }) => {
  const v = await ouvrir(page, 'noting', 'Noter ce qui passe');
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(16300);
  const corps = bouton(v, 'Corps');
  await expect(corps).toBeVisible();
  await figer(page);
  const style = () => corps.evaluate((b) => { const s = getComputedStyle(b); return { fond: s.backgroundColor, animation: s.animationName }; });
  const repos = await style();
  await corps.click();
  expect((await style()).animation).toBe('etiquette-brille');
  await page.clock.runFor(700);
  await expect(corps).not.toHaveClass(/brille/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await corps.click();
  await expect(corps).toHaveClass(/brille/);
  const brille = await style();
  expect(brille.animation).toBe('none');
  expect(brille.fond).not.toBe(repos.fond);
  await page.clock.runFor(700);
  await expect(corps).not.toHaveClass(/brille/);
});

test('très grand texte (point de vigilance 5) : les étiquettes, la durée et l\'épingle tiennent, sans rien faire déborder de côté ; chaque étiquette reste entière, sur une ligne, en 2 × 2 puis l\'une sous l\'autre', async ({ page }) => {
  test.setTimeout(60000);
  // Jusqu'à 53 px (AX5) : à 47 px, la moitié de la largeur ne garde plus « Émotion » entier.
  for (const taille of [17, 19, 21, 23, 28, 33, 40, 47, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const v = await ouvrir(page, 'noting', 'Noter ce qui passe');
    await rienNeDeborde(page);
    await bouton(v, 'Commencer').click();
    await page.clock.runFor(16300);
    const groupe = v.getByRole('group', { name: 'Ce qui passe' });
    await expect(groupe.getByRole('button')).toHaveCount(4);
    await rienNeDeborde(page);
    const boites = await Promise.all(['Pensée', 'Corps', 'Son', 'Émotion'].map((x) => bouton(groupe, x).boundingBox()));
    for (const b of boites) expect(b.height, `${taille} px`).toBeGreaterThanOrEqual(60);
    // Deux colonnes tant que le mot y tient, puis une seule.
    expect(new Set(boites.map((b) => Math.round(b.x))).size, `colonnes à ${taille} px`).toBe(taille <= 40 ? 2 : 1);
    // Le mot entier sur une ligne.
    const lignes = await groupe.getByRole('button').evaluateAll((l) => l.map((b) => { const r = document.createRange(); r.selectNodeContents(b); return r.getClientRects().length; }));
    expect(lignes, `${taille} px`).toEqual([1, 1, 1, 1]);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte, le mot de phase : « Inspire », « Encore un peu » et « Expire » gardent une ligne, et l\'anneau ne bouge pas d\'une phase à l\'autre (17 à 53 px) ; en Bien-être comme en crise', async ({ page }) => {
  test.setTimeout(120000);
  // Les trois phases, relevées tic par tic, l'horloge arrêtée : le nombre de lignes du mot et la place de l'anneau.
  const phases = async (v) => {
    const mot = v.locator('.mot-souffle');
    const vues = new Map();
    await figer(page);
    for (let t = 0; t <= 12000 && vues.size < 3; t += 200) {
      if (await mot.count()) {
        vues.set(await mot.textContent(), await mot.evaluate((m) => {
          const r = document.createRange();
          r.selectNodeContents(m);
          return { lignes: r.getClientRects().length, haut: m.parentElement.querySelector('.lecteur-anneau').getBoundingClientRect().top };
        }));
      }
      await page.clock.runFor(200);
    }
    await page.clock.resume();
    return vues;
  };
  const controler = (vues, contexte) => {
    expect([...vues.keys()].sort(), contexte).toEqual(['Encore un peu', 'Expire', 'Inspire']);
    const hauts = [...vues.values()].map((x) => x.haut);
    for (const { lignes, haut } of vues.values()) {
      expect(lignes, contexte).toBe(1);
      expect(Math.abs(haut - hauts[0]), contexte).toBeLessThan(0.5);
    }
  };
  for (const taille of [17, 23, 33, 40, 47, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    let v = await ouvrir(page, 'soupir', 'Le soupir');
    await bouton(v, 'Commencer').click();
    await bouton(v, 'Suivant').click();
    await bouton(v, 'Suivant').click();
    await expect(v.locator('.mot-souffle')).toBeVisible();
    controler(await phases(v), `le soupir, ${taille} px`);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
    await monterCrise(page, 'panique');
    v = vue(page, 'Panique');
    await bouton(v, 'Suivant').click();
    await expect(v.locator('.mot-souffle')).toBeVisible();
    controler(await phases(v), `Panique, ${taille} px`);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/reglages');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte, les menus de réglage : chacun reste dans sa carte, chevron compris, et se touche encore (lecteur, concentration, cohérence, Moment difficile)', async ({ page }) => {
  test.setTimeout(60000);
  // Chaque menu et son chevron, à l'intérieur de ce qui les porte, et une cible de 44.
  const menusDedans = async (attendus) => {
    const mesures = await page.evaluate(() => [...document.querySelectorAll('.puce-reglage')].map((p) => {
      const cadre = p.closest('.carte, .parcours-corps').getBoundingClientRect();
      const m = p.querySelector('select').getBoundingClientRect();
      const c = p.querySelector('svg').getBoundingClientRect();
      return { nom: p.textContent.slice(0, 12), gauche: cadre.left, droite: cadre.right, m: [m.left, m.right, m.height], c: [c.left, c.right] };
    }));
    expect(mesures).toHaveLength(attendus);
    for (const x of mesures) {
      expect(x.m[0], x.nom).toBeGreaterThanOrEqual(x.gauche);
      expect(x.m[1], x.nom).toBeLessThanOrEqual(x.droite);
      expect(x.c[1], x.nom).toBeLessThanOrEqual(x.m[1]);
      expect(x.c[0], x.nom).toBeGreaterThanOrEqual(x.m[0]);
      expect(x.m[2], x.nom).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  };
  for (const taille of [17, 23, 33, 40, 45, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const v = await ouvrir(page, 'noting', 'Noter ce qui passe');
    await menusDedans(1);
    const son = v.getByRole('list', { name: 'Réglages du lecteur' }).getByRole('combobox', { name: 'Son', exact: true });
    await son.scrollIntoViewIfNeeded();
    await son.selectOption('reperes');
    await expect(son).toHaveValue('reperes');
    await son.selectOption('souffle');
    await aller(page, '#/concentration');
    await expect(bouton(vue(page, 'Minuteur de concentration'), 'Commencer')).toBeVisible();
    await menusDedans(1);
    await aller(page, '#/bien-etre/coherence');
    await expect(bouton(vue(page, 'Cohérence cardiaque'), 'Commencer')).toBeVisible();
    await menusDedans(3);
    await aller(page, '#/moment-difficile');
    await expect(vue(page, 'Moment difficile').getByRole('combobox', { name: 'Rythme', exact: true })).toBeVisible();
    await menusDedans(2);
    await aller(page, '#/bien-etre');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte, le pied du lecteur : « Précédent » et « Suivant » à parts égales, puis l\'un sous l\'autre ; les mots entiers dans leur bouton, le chevron de « Suivant » entier ; en Bien-être comme en crise', async ({ page }) => {
  const pied = async (v) => {
    await rienNeDeborde(page);
    const [p, s] = [await bouton(v, 'Précédent').boundingBox(), await bouton(v, 'Suivant').boundingBox()];
    expect(s.x + s.width).toBeLessThanOrEqual(390);
    const chevron = await bouton(v, 'Suivant').locator('svg').boundingBox();
    expect(chevron.width).toBe(20);
    expect(chevron.x + chevron.width).toBeLessThanOrEqual(s.x + s.width);
    // Le mot lui-même, sur une ligne, dans le bouton.
    const mot = await bouton(v, 'Précédent').evaluate((b) => {
      const r = document.createRange();
      r.selectNodeContents([...b.childNodes].find((n) => n.nodeType === Node.TEXT_NODE));
      const t = r.getBoundingClientRect();
      return { gauche: t.left, droite: t.right, lignes: r.getClientRects().length };
    });
    expect(mot.lignes).toBe(1);
    expect(mot.gauche).toBeGreaterThanOrEqual(p.x);
    expect(mot.droite).toBeLessThanOrEqual(p.x + p.width);
    if (Math.abs(p.y - s.y) >= 1) return 'l\'un sous l\'autre';
    expect(Math.abs(p.width - s.width)).toBeLessThan(1);
    return 'côte à côte';
  };
  for (const [taille, attendu] of [[17, 'côte à côte'], [23, 'côte à côte'], [28, 'côte à côte'], [33, 'côte à côte'], [40, 'l\'un sous l\'autre']]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const v = await ouvrir(page, 'ancrage-court', 'Ancrage court');
    await bouton(v, 'Commencer').click();
    await expect(bouton(v, 'Suivant')).toBeVisible();
    expect(await pied(v), `Bien-être, ${taille} px`).toBe(attendu);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/bien-etre');
    await monterCrise(page, 'panique');
    const c = vue(page, 'Panique');
    await expect(bouton(c, 'Pause')).toBeVisible();
    expect(await pied(c), `crise, ${taille} px`).toBe(attendu);
    // En pause aussi : les réglages sous l'écran de lecture.
    await bouton(c, 'Pause').click();
    await expect(c.getByRole('list', { name: 'Réglages du lecteur' })).toBeVisible();
    expect(await pied(c), `crise en pause, ${taille} px`).toBe(attendu);
    await c.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/reglages');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

// ---------- Le soupir ----------

test('soupir : le mot, le disque et le souffle sonore suivent la seconde inspiration ; le cycle de 9 s finit poumons vides', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrir(page, 'soupir', 'Le soupir');
  const mot = v.locator('.mot-souffle');
  const disque = v.locator('.disque-souffle');
  await bouton(v, 'Commencer').click();
  await figer(page);
  // Les deux étapes d'accueil (8 + 8 s), sans disque ; puis l'étape rythmée.
  await expect(disque).toHaveCount(0);
  // Par petits pas jusqu'au mot : le temps qu'il a fallu (les phases se lisent au tic, toutes les 200 ms).
  const jusquau = async (attendu) => {
    for (let t = 0; t <= 20000; t += 100) {
      if (await mot.count() && (await mot.textContent()) === attendu) return t;
      await page.clock.runFor(100);
    }
    throw new Error(`pas de « ${attendu} »`);
  };
  await jusquau('Inspire');
  await expect(consigne(v)).toHaveText(texte('Inspire, encore un peu, puis expire longuement. Sans forcer.'));
  await jusquau('Expire');
  await jusquau('Inspire');
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await expect(disque).toHaveClass(/phase-inspire( |$)/);
    await expect(disque).toHaveClass(/avant-encore/);
    await expect(disque).toHaveClass(/duree-souffle-2/);
    expect(Math.abs(await jusquau('Encore un peu') - 2000)).toBeLessThanOrEqual(300);
    await expect(disque).toHaveClass(/phase-inspire-encore/);
    await expect(disque).toHaveClass(/duree-souffle-1/);
    await expect(disque).not.toHaveClass(/avant-encore/);
    expect(Math.abs(await jusquau('Expire') - 1000)).toBeLessThanOrEqual(300);
    await expect(disque).toHaveClass(/phase-expire/);
    await expect(disque).toHaveClass(/duree-souffle-6/);
    expect(Math.abs(await jusquau('Inspire') - 6000)).toBeLessThanOrEqual(300);
  }
  // Trois souffles par cycle (2, 1 puis 6 s), à la suite, jamais de silence entre l'inspiration et la petite en plus.
  const s = await souffles(page);
  const duree = (x) => Math.round(x.fin - x.t);
  expect(s.slice(0, 9).map(duree)).toEqual([2, 1, 6, 2, 1, 6, 2, 1, 6]);
  for (let i = 1; i < 6; i += 1) expect(Math.abs(s[i].t - (s[i - 1].t + duree(s[i - 1])))).toBeLessThan(0.4);
  // L'animation du disque : du petit au plein en deux temps.
  const taille = (nom) => page.evaluate((n) => {
    for (const f of document.styleSheets) for (const r of f.cssRules) if (r.type === CSSRule.KEYFRAMES_RULE && r.name === n) return [...r.cssRules].map((k) => k.style.transform);
    return null;
  }, nom);
  expect(await taille('souffle-avant-encore')).toEqual(['scale(0.55)', 'scale(0.85)']);
  expect(await taille('souffle-encore')).toEqual(['scale(0.85)', 'scale(1)']);
  // « Réduire les animations » : le disque ne bouge pas, et se cercle poumons pleins, petite inspiration comprise.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const style = () => disque.evaluate((d) => { const c = getComputedStyle(d); return { animation: c.animationName, cercle: c.boxShadow !== 'none', transform: c.transform }; });
  const FIXE = 'matrix(0.8, 0, 0, 0.8, 0, 0)';
  expect(await style()).toEqual({ animation: 'none', cercle: true, transform: FIXE });
  await jusquau('Encore un peu');
  expect(await style()).toEqual({ animation: 'none', cercle: true, transform: FIXE });
  await jusquau('Expire');
  expect(await style()).toEqual({ animation: 'none', cercle: false, transform: FIXE });
});

// ---------- Le mode crise ----------

test('mode crise : lancé d\'un toucher, il démarre aussitôt ; ni anneau, ni « il reste », ni épingle ; sans signal, aucun son ; la séance d\'origine moment-difficile, sans message à la fin, et retour demandé', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  // Les réglages du lecteur de Bien-être ne jouent pas ici : ni son fort, ni voix.
  await page.evaluate(() => { localStorage.setItem('carnet:exercice:voix', 'true'); localStorage.setItem('carnet:lecteur:silencieux', 'true'); });
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'panique');
  const v = vue(page, 'Panique');
  await expect(consigne(v)).toHaveText(texte(PANIQUE));
  await expect(bouton(v, 'Pause')).toBeVisible();
  await expect(bouton(v, 'Commencer')).toHaveCount(0);
  await expect(v.locator('.epingle')).toHaveCount(0);
  await expect(v.locator('.anneau-temps, .anneau-plein, .anneau-piste')).toHaveCount(0);
  await expect(v).not.toContainText('il reste');
  await figer(page);
  await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1, rendus: 0 });
  // Le toucher a préparé le son, sans bruit ; le réglage ne le demande pas : il s'endort, et la session est rendue.
  expect((await audio(page)).contextes).toBe(1);
  await page.clock.runFor(1500);
  await expect.poll(async () => (await audio(page)).session).toBe('auto');
  // Le soupir de l'étape 2 : le disque et les mots, et rien à l'oreille.
  await page.clock.runFor(11000);
  await expect(consigne(v)).toHaveText(texte('Trois soupirs : inspire, une petite inspiration en plus, une longue expiration.'));
  await expect(v.locator('.mot-souffle')).toHaveCount(1);
  await expect(v.locator('.disque-souffle')).toHaveCount(1);
  await expect(v.locator('.anneau-temps, .anneau-plein')).toHaveCount(0);
  await expect(v).not.toContainText('il reste');
  // Jusqu'au bout.
  await page.clock.runFor(107500);
  await expect(consigne(v)).toHaveText('Fin de l\'exercice.');
  await expect(v).not.toContainText('il reste');
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'panique', origine: 'moment-difficile', fin: true });
  environ(s.dureeS, 120);
  await expect.poll(() => verrou(page)).toMatchObject({ rendus: 1 });
  // Aucun son de tout l'exercice : ni note, ni bol, ni souffle, ni voix.
  expect(await audio(page)).toMatchObject({ notes: [], oscillateurs: [], souffles: [] });
  expect((await parole(page)).dits).toEqual([]);
  // La fermeture après 6 s : le retour demandé, et aucun message « Noter mon émotion ».
  await page.clock.runFor(6100);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/reglages');
  await expect(page.getByText('Noter mon émotion')).toHaveCount(0);
  await expect(page.getByText('Fin de l\'exercice.')).toHaveCount(0);
  await expect(vue(page, 'Panique')).toHaveCount(0);
  // Rien d'écrit dans l'appareil non plus.
  expect(await clesCarnet(page)).toEqual(['carnet:exercice:voix', 'carnet:lecteur:silencieux']);
});

test('mode crise, signal sonore allumé : une note discrète à chaque changement d\'étape, rien au début ni à la fin, ni bol ni souffle ; session « ambient » même si le lecteur de Bien-être joue en silencieux', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page, { session: true });
  await page.evaluate(() => localStorage.setItem('carnet:lecteur:silencieux', 'true'));
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true, voix: false });
  const BOLS = await frequencesBols(page);
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'panique');
  const v = vue(page, 'Panique');
  await expect(consigne(v)).toHaveText(texte(PANIQUE));
  await figer(page);
  await page.clock.runFor(300);
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient', notes: [] });
  await page.clock.runFor(12000);
  await expect.poll(() => notes(page)).toBe(1);
  // Le souffle de cette étape rythmée ne sonne pas.
  await page.clock.runFor(27000);
  await expect.poll(() => notes(page)).toBe(2);
  expect((await audio(page)).session).toBe('ambient');
  // Passer une étape d'un toucher donne le même repère.
  await bouton(v, 'Suivant').click();
  await expect.poll(() => notes(page)).toBe(3);
  await page.clock.runFor(61500);
  await expect(consigne(v)).toHaveText('Fin de l\'exercice.');
  const a = await audio(page);
  // Sept étapes : six changements, aucune note de plus à la fin.
  expect(a.notes).toHaveLength(6);
  const liste = [BOLS.debut, BOLS.etape, ...BOLS.fin];
  for (const f of a.notes) expect(liste).not.toContain(f);
  expect(a.souffles).toEqual([]);
});

test('mode crise, en pause : le signal et la voix se changent pour cette fois, sans être retenus ; la voix réglée lit la première consigne', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: false, voix: true });
  const meta = await lireMeta(page, 'respiration');
  const reperes = await clesCarnet(page);
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'trop-plein');
  const v = vue(page, 'Trop-plein');
  // La voix est amorcée dans le toucher, et la consigne lue dès le début.
  await expect.poll(async () => (await parole(page)).dits).toHaveLength(1);
  expect((await parole(page)).amorces).toBeGreaterThanOrEqual(1);
  await expect(consigne(v)).toHaveText(/Regarde un seul point/);
  // Pendant la lecture, pas de réglages à l'écran.
  await expect(v.getByRole('list', { name: 'Réglages du lecteur' })).toHaveCount(0);
  await bouton(v, 'Pause').click();
  await expect(reste(v)).toHaveText('En pause');
  const reglages = v.getByRole('list', { name: 'Réglages du lecteur' });
  const signal = reglages.getByRole('switch', { name: 'Signal sonore' });
  const voix = reglages.getByRole('switch', { name: 'Lire les consignes à voix haute' });
  await expect(signal).toHaveAttribute('aria-checked', 'false');
  await expect(voix).toHaveAttribute('aria-checked', 'true');
  await expect(reglages.getByRole('combobox')).toHaveCount(0);
  await signal.click();
  await voix.click();
  await expect(signal).toHaveAttribute('aria-checked', 'true');
  await expect(voix).toHaveAttribute('aria-checked', 'false');
  await bouton(v, 'Reprendre').click();
  // La suite suit le nouveau choix : un repère, plus de voix.
  await page.clock.runFor(100);
  const ditsAvant = (await parole(page)).dits.length;
  await bouton(v, 'Suivant').click();
  await expect.poll(() => notes(page)).toBe(1);
  expect((await parole(page)).dits).toHaveLength(ditsAvant);
  // Rien n'est retenu : la méta et l'appareil n'ont pas bougé.
  expect(await lireMeta(page, 'respiration')).toEqual(meta);
  expect(await clesCarnet(page)).toEqual(reperes);
  // Rouvert : les réglages de la méta, de nouveau.
  await v.getByRole('button', { name: 'Fermer' }).click();
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'trop-plein');
  const w = vue(page, 'Trop-plein');
  await bouton(w, 'Pause').click();
  await expect(w.getByRole('switch', { name: 'Signal sonore' })).toHaveAttribute('aria-checked', 'false');
  await expect(w.getByRole('switch', { name: 'Lire les consignes à voix haute' })).toHaveAttribute('aria-checked', 'true');
});

// La voix lit en session « ambient » (spec §5.3), le signal éteint comme allumé : la musique continue, le mode silencieux est respecté.
const sessionVaut = (page) => page.evaluate(() => navigator.audioSession.type);
const dits = async (page) => (await parole(page)).dits;
for (const [id, titre, premiereS, reglage] of [
  ['panique', 'Panique', 12, { son: false, voix: true }],
  // « Réveil la nuit » : le signal n'y sonne jamais, la voix est le seul son possible.
  ['reveil-nuit', 'Réveil la nuit', 10, { son: true, voix: true }],
]) {
  test(`mode crise, ${titre} : sans signal, la voix garde la session « ambient » pendant toute la lecture et après une reprise, sans aucune note ; elle est rendue en quittant`, async ({ page }) => {
    await espionnerAudio(page, { session: true });
    await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', ...reglage });
    await aller(page, '#/aujourdhui');
    await monterCrise(page, id);
    const v = vue(page, titre);
    await expect.poll(() => dits(page)).toHaveLength(1);
    await figer(page);
    expect(await sessionVaut(page)).toBe('ambient');
    // Plus que la veille d'une seconde : le son ne s'est pas rendormi sous la voix.
    await page.clock.runFor(1500);
    expect(await sessionVaut(page)).toBe('ambient');
    expect((await audio(page)).etat).toBe('running');
    // La consigne suivante est dite dans la même session.
    await page.clock.runFor(premiereS * 1000);
    await expect.poll(() => dits(page)).toHaveLength(2);
    expect(await sessionVaut(page)).toBe('ambient');
    // En pause, le son dort et la session est rendue, comme dans tout le lecteur.
    await bouton(v, 'Pause').click();
    await page.clock.runFor(1500);
    expect(await sessionVaut(page)).toBe('auto');
    // À la reprise, la voix retrouve sa session, et la garde.
    await bouton(v, 'Reprendre').click();
    expect(await sessionVaut(page)).toBe('ambient');
    await expect.poll(() => dits(page)).toHaveLength(3);
    await page.clock.runFor(1500);
    expect(await sessionVaut(page)).toBe('ambient');
    expect((await audio(page)).etat).toBe('running');
    expect(await audio(page)).toMatchObject({ notes: [], oscillateurs: [], souffles: [] });
    // Quitté : plus de session.
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/reglages');
    await page.clock.runFor(1500);
    expect(await sessionVaut(page)).toBe('auto');
  });
}

test('mode crise, la voix hors d\'un lancement d\'un toucher : « Commencer » la prépare en « ambient », comme « Terminer » touché en pause, qui dit la fin', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: false, voix: true });
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'colere', { toucher: false });
  const v = vue(page, 'Colère');
  await bouton(v, 'Commencer').click();
  await expect.poll(() => dits(page)).toHaveLength(1);
  await figer(page);
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient' });
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('ambient');
  await bouton(v, 'Pause').click();
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('auto');
  await v.getByRole('button', { name: 'Terminer' }).click();
  await expect.poll(async () => (await dits(page)).at(-1)).toBe('Fin de l\'exercice.');
  expect(await sessionVaut(page)).toBe('ambient');
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('ambient');
  expect(await audio(page)).toMatchObject({ notes: [], oscillateurs: [], souffles: [] });
});

test('mode crise, sans signal ni voix, la voix allumée en pause : le son s\'était rendormi, la reprise le prépare en « ambient » ; éteinte de nouveau, rien n\'est préparé', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: false, voix: false });
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'trop-plein');
  const v = vue(page, 'Trop-plein');
  await expect(bouton(v, 'Pause')).toBeVisible();
  await figer(page);
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('auto');
  await bouton(v, 'Pause').click();
  const voix = v.getByRole('switch', { name: 'Lire les consignes à voix haute' });
  await voix.click();
  await expect(voix).toHaveAttribute('aria-checked', 'true');
  await bouton(v, 'Reprendre').click();
  await expect.poll(() => dits(page)).toHaveLength(1);
  expect(await sessionVaut(page)).toBe('ambient');
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('ambient');
  await bouton(v, 'Pause').click();
  await voix.click();
  await expect(voix).toHaveAttribute('aria-checked', 'false');
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('auto');
  await bouton(v, 'Reprendre').click();
  await expect(bouton(v, 'Pause')).toBeVisible();
  await page.clock.runFor(1500);
  expect(await sessionVaut(page)).toBe('auto');
  expect(await dits(page)).toHaveLength(1);
});

test('mode crise, ouvert sans toucher (une adresse) : rien ne joue seul, il attend « Commencer » ; sans épingle, sans durée, sans anneau ; une méta abîmée vaut les réglages par défaut', async ({ page }) => {
  await espionnerAudio(page);
  await ecrireMeta(page, 'respiration', 'abîmée');
  await aller(page, '#/aujourdhui');
  await monterCrise(page, 'colere', { toucher: false });
  const v = vue(page, 'Colère');
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect(v.locator('.epingle')).toHaveCount(0);
  await expect(v.getByRole('group', { name: 'Durée' })).toHaveCount(0);
  await expect(v.locator('.anneau-temps')).toHaveCount(0);
  await expect(v.getByRole('switch', { name: 'Signal sonore' })).toHaveAttribute('aria-checked', 'false');
  await page.clock.runFor(3000);
  expect(await audio(page)).toMatchObject({ contextes: 0, notes: [] });
  await expect(consigne(v)).toHaveCount(0);
  await bouton(v, 'Commencer').click();
  await expect(consigne(v)).toHaveText(/Éloigne-toi/);
  // Sans signal, le toucher ne crée pas de contexte audio.
  expect(await audio(page)).toMatchObject({ contextes: 0 });
  // « Terminer » tôt : pas de séance, pas de message, le retour de l'adresse.
  await v.getByRole('button', { name: 'Terminer' }).click();
  await page.clock.runFor(6100);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/moment-difficile');
  expect(await seances(page)).toEqual([]);
});

// ---------- L'exercice de nuit ----------

for (const theme of ['light', 'dark']) {
  test(`« Réveil la nuit » (${theme === 'light' ? 'clair' : 'sombre'}) : fond noir partout, texte gris peu lumineux ; en crise, muet même signal allumé, seule la voix parle ; dans Bien-être, les réglages du lecteur`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await espionnerAudio(page, { session: true });
    await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true, voix: true });
    const noir = async (v) => {
      const s = await v.evaluate((p) => {
        const c = getComputedStyle(p);
        const fond = (sel) => { const e = p.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
        return { fond: c.backgroundColor, texte: c.color, pied: fond('.parcours-pied') };
      });
      expect(s.fond).toBe('rgb(0, 0, 0)');
      if (s.pied) expect(s.pied).toBe('rgb(0, 0, 0)');
      return s;
    };
    await aller(page, '#/aujourdhui');
    await monterCrise(page, 'reveil-nuit');
    const v = vue(page, 'Réveil la nuit');
    await expect(consigne(v)).toHaveText(/Reste là où tu es/);
    const { texte: gris } = await noir(v);
    const couleur = await consigne(v).evaluate((c) => getComputedStyle(c).color);
    expect(couleur).toBe(gris);
    // Gris, et lisible : ni blanc qui éclaire, ni sous 4,5:1.
    expect(contraste(couleur, 'rgb(0, 0, 0)')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(couleur, 'rgb(0, 0, 0)')).toBeLessThan(9);
    // Les textes à l'écran, en pause comme en lecture, restent lisibles sur leur fond.
    await expect.poll(async () => (await parole(page)).dits).toHaveLength(1);
    await page.clock.runFor(10300);
    await expect(consigne(v)).toHaveText(/Inspire sur quatre temps/);
    await expect.poll(async () => (await parole(page)).dits).toHaveLength(2);
    await page.clock.runFor(50000);
    await expect(consigne(v)).toHaveText(/Sens tes pieds/);
    expect(await audio(page)).toMatchObject({ notes: [], oscillateurs: [], souffles: [] });
    await bouton(v, 'Pause').click();
    // En pause : la voix se règle, pas le signal, qui n'existe pas ici.
    const reglages = v.getByRole('list', { name: 'Réglages du lecteur' });
    await expect(reglages.getByRole('switch', { name: 'Signal sonore' })).toHaveCount(0);
    await expect(reglages.getByRole('switch', { name: 'Lire les consignes à voix haute' })).toHaveAttribute('aria-checked', 'true');
    const faibles = await v.evaluate((p) => {
      const lin = (x) => { const y = x / 255; return y <= 0.04045 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4; };
      const L = (t) => { const [r, g, b] = t.match(/[\d.]+/g).slice(0, 3).map(Number).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const fondDe = (e) => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (!/^rgba\(.*, 0\)$|transparent/.test(c)) return c; } return 'rgb(0, 0, 0)'; };
      const f = [];
      for (const e of p.querySelectorAll('p, span, button, label, h1')) {
        if (!e.textContent.trim() || e.closest('[disabled]') || !e.getClientRects().length || e.closest('.visuellement-cache')) continue;
        const [a, b] = [L(getComputedStyle(e).color), L(fondDe(e))].sort((x, y) => y - x);
        if ((a + 0.05) / (b + 0.05) < 4.5) f.push(e.textContent.trim().slice(0, 30));
      }
      return f;
    });
    expect(faibles).toEqual([]);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.parcours.ecran-noir')).toHaveCount(0);

    // Dans Bien-être : le même fond noir, l'anneau et le temps, et les sons du lecteur.
    const w = await ouvrir(page, 'reveil-nuit', 'Réveil la nuit');
    await noir(w);
    await expect(w.locator('.epingle')).toBeVisible();
    await expect(w.getByRole('list', { name: 'Réglages du lecteur' }).getByRole('combobox', { name: 'Son', exact: true })).toHaveValue('souffle');
    const lus = (await audio(page)).oscillateurs.length;
    await bouton(w, 'Commencer').click();
    await expect(reste(w)).toHaveText(/il reste/);
    await expect(w.locator('.anneau-temps')).toHaveCount(1);
    await noir(w);
    await expect.poll(async () => (await audio(page)).oscillateurs.length).toBeGreaterThan(lus);
  });
}

// ---------- Page cachée (point de vigilance 3) ----------

for (const mode of ['crise', 'bien-etre']) {
  test(`page cachée pendant un exercice (${mode}) : pause, voix et sons coupés, verrou d'écran rendu ; rien ne repart seul ; « Reprendre » reprend`, async ({ page }) => {
    await espionnerAudio(page, { session: true });
    await installerVerrou(page);
    let v;
    if (mode === 'crise') {
      await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true, voix: true });
      await aller(page, '#/aujourdhui');
      await monterCrise(page, 'panique');
      v = vue(page, 'Panique');
    } else {
      v = await ouvrir(page, 'soupir', 'Le soupir');
      await bouton(v, 'Commencer').click();
    }
    await expect(bouton(v, 'Pause')).toBeVisible();
    await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1, rendus: 0 });
    await page.clock.runFor(1000);
    const place = await consigne(v).textContent();
    const coupures = (await parole(page)).annulations;
    await cacher(page);
    await expect(bouton(v, 'Reprendre')).toBeVisible();
    // La voix allumée (en crise, ici) est coupée.
    if (mode === 'crise') expect((await parole(page)).annulations).toBeGreaterThan(coupures);
    await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1, rendus: 1 });
    await page.clock.runFor(60000);
    // Le temps ne passe pas : même étape, aucune note de plus, aucune séance de 60 s de plus.
    await expect(consigne(v)).toHaveText(place);
    const sons = (await audio(page)).notes.length;
    await montrer(page);
    await page.clock.runFor(30000);
    await expect(bouton(v, 'Reprendre')).toBeVisible();
    await expect(consigne(v)).toHaveText(place);
    expect((await audio(page)).notes.length).toBe(sons);
    expect(await seances(page)).toEqual([]);
    await bouton(v, 'Reprendre').click();
    await expect(bouton(v, 'Pause')).toBeVisible();
    await expect.poll(() => verrou(page)).toMatchObject({ demandes: 2, rendus: 1 });
    // Une lecture quittée rend le verrou.
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => verrou(page)).toMatchObject({ demandes: 2, rendus: 2 });
  });
}

// ---------- L'épingle ----------

test('épingle : sur l\'écran « avant », ajoute puis retire l\'exercice de la méta, dans l\'ordre, sans changer derniereEcriture ; rien dans l\'appareil ; une cible de 44', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', { signes: 'x' });
  const marque = await lireMeta(page, 'derniereEcriture');
  await page.clock.runFor(60000);
  let v = await ouvrir(page, 'savourer', 'Savourer');
  const epingle = (titre) => vue(page, titre).getByRole('button', { name: `Épingler ${titre}`, exact: true });
  await expect(epingle('Savourer')).toHaveAttribute('aria-pressed', 'false');
  const b = await epingle('Savourer').boundingBox();
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  // Un dessin au trait, sans texte.
  await expect(epingle('Savourer')).toHaveText('');
  expect(await epingle('Savourer').locator('svg path').count()).toBe(1);
  expect(await lireMeta(page, 'favorisBienEtre')).toBe(null);
  await epingle('Savourer').click();
  await expect(epingle('Savourer')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['savourer']);
  // Un second exercice, épinglé après : à la fin.
  v = await ouvrir(page, 'scan-court', 'Scan court');
  await expect(epingle('Scan court')).toHaveAttribute('aria-pressed', 'false');
  await epingle('Scan court').click();
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['savourer', 'scan-court']);
  // Rouvert : encore épinglé ; retiré : il part, l'autre reste.
  v = await ouvrir(page, 'savourer', 'Savourer');
  await expect(epingle('Savourer')).toHaveAttribute('aria-pressed', 'true');
  await epingle('Savourer').click();
  await expect(epingle('Savourer')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['scan-court']);
  // Deux touchers rapprochés ne s'écrasent pas.
  await epingle('Savourer').click();
  await epingle('Savourer').click();
  await expect(epingle('Savourer')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['scan-court']);
  // Une épingle n'est pas une saisie.
  expect(await lireMeta(page, 'derniereEcriture')).toBe(marque);
  expect(await clesCarnet(page)).toEqual([]);
  await expect(v.locator('.lecteur-duree')).toBeVisible();
});

test('épingle : aussi sur la cohérence cardiaque et sur une séance du Programme ; une méta abîmée ou inconnue est ignorée sans erreur', async ({ page }) => {
  await ecrireMeta(page, 'favorisBienEtre', ['retiré-depuis', 'soupir', 'soupir', 3, null, { a: 1 }]);
  const v = await ouvrir(page, 'soupir', 'Le soupir');
  await expect(v.getByRole('button', { name: 'Épingler Le soupir' })).toHaveAttribute('aria-pressed', 'true');
  await aller(page, '#/bien-etre/coherence');
  const c = vue(page, 'Cohérence cardiaque');
  await expect(bouton(c, 'Commencer')).toBeVisible();
  await c.getByRole('button', { name: 'Épingler Cohérence cardiaque' }).click();
  await expect(c.getByRole('button', { name: 'Épingler Cohérence cardiaque' })).toHaveAttribute('aria-pressed', 'true');
  // L'écriture normalise : l'inconnu et les doublons disparaissent.
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['soupir', 'coherence']);
  await aller(page, '#/bien-etre/programme/respiration-carree');
  const p = vue(page, 'Respiration carrée');
  await expect(bouton(p, 'Commencer')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Épingler Respiration carrée' })).toHaveAttribute('aria-pressed', 'false');
  // Valeurs qui ne sont pas une liste : rien d'épinglé, rien de cassé.
  await ecrireMeta(page, 'favorisBienEtre', 'abîmée');
  const w = await ouvrir(page, 'soupir', 'Le soupir');
  await expect(w.getByRole('button', { name: 'Épingler Le soupir' })).toHaveAttribute('aria-pressed', 'false');
});
