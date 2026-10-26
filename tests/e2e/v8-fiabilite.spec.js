import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, viderBase, aller, entreeDuJour, simulerZonesSures } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { addDays } from '../../public/js/domain/dates.js';

// v8 (8/9) · Fiabilité (spec §8 et §12.7) : Q27, le soir avec les zones sûres de l'iPhone (47 px en haut, 34 en bas, en
// 390 × 844) et le Diagnostic qui les affiche ; Q29, les finitions ; Q31, l'entrée d'un jour qui attend ses données ;
// Q26, 5 ans de données inventées et des écrans qui ne relisent la base que si elle a changé. Données inventées.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const AUJ = '2026-10-15';
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const THEMES = [['light', clair], ['dark', sombre]];
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
// Une couleur d'opacité a posée sur un fond : la couleur vue.
const vue = (couleur, fond, a) => `rgb(${canaux(couleur).map((c, i) => Math.round(c * a + canaux(fond)[i] * (1 - a))).join(', ')})`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// ---------- Q27 : les zones sûres de l'iPhone, et le Diagnostic ----------

// Les boîtes du soir, page en haut : l'en-tête, la dernière carte, la bande du bas, les onglets.
const geometrieSoir = (page) => page.evaluate(() => {
  const r = (s) => document.querySelector(s).getBoundingClientRect();
  const bande = r('.actions-flottantes');
  return {
    scrollY: window.scrollY, large: document.documentElement.scrollWidth > window.innerWidth, entete: r('.entete-jour').top,
    marge: bande.top - r('.carte-champ:has(#points-positifs)').bottom, bande: [bande.top, bande.bottom], onglets: [r('.onglets').top, r('.onglets').bottom],
    bandeau: document.querySelector('.bandeau') ? [r('.bandeau').bottom, r('.bandeau > span').top] : null,
  };
});
// Ce que le Diagnostic affiche, ligne par ligne : { Fenêtre: '390 × 844', … }.
async function diagnostic(page) {
  await aller(page, '#/diagnostic');
  const dl = page.locator('main.diag dl').first();
  await expect(dl.locator('dt', { hasText: 'Marge du soir' })).toBeVisible();
  return dl.evaluate((l) => Object.fromEntries([...l.querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent])));
}
const enPx = (n) => `${String(Math.round(n * 10) / 10).replace('-', '−').replace('.', ',')} px`;

test('Q27 · avec les zones sûres de l\'iPhone (47 en haut, 34 en bas, 390 × 844), le soir tient sans défiler, en clair et en sombre, à 21 h et entre 0 h et 4 h ; le Diagnostic donne la même marge', async ({ page }) => {
  await simulerZonesSures(page);
  for (const [schema] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    for (const heure of [new Date(2026, 9, 15, 21, 0), new Date(2026, 9, 16, 1, 30)]) {
      const quoi = `${schema} · ${heure.getHours()} h`;
      await page.clock.setSystemTime(heure);
      await viderBase(page);
      await toucher(page, 'Lieu', 'Bureau');
      await toucher(page, 'Sommeil', 'Moyen');
      await toucher(page, 'Contact humain', 'Oui');
      await toucher(page, 'Sport / mouvement', 'Non');
      await toucher(page, 'Traitement pris', 'Oui');
      await expect.poll(async () => (await entreeDuJour(page))?.traitementPris, quoi).toBe('traitementPris:oui');
      const g = await geometrieSoir(page);
      expect(g.scrollY, quoi).toBe(0);
      expect(g.large, quoi).toBe(false);
      // L'en-tête sous l'encoche, la bande du bas collée aux onglets, les onglets au-dessus de la barre d'accueil.
      expect(g.entete, quoi).toBeGreaterThanOrEqual(47);
      expect(Math.abs(g.bande[1] - g.onglets[0]), quoi).toBeLessThanOrEqual(0.5);
      expect(g.onglets[1] - g.onglets[0], quoi).toBe(50 + 34);
      expect(g.marge, `${quoi} : la dernière carte au-dessus de la bande`).toBeGreaterThanOrEqual(0);
      const d = await diagnostic(page);
      expect(d, quoi).toMatchObject({ Fenêtre: '390 × 844', 'Zones sûres': 'haut 47 · bas 34 · gauche 0 · droite 0', 'Hauteur utile': '763 px', 'Marge du soir': enPx(g.marge) });
      await expect(page.locator('main.diag pre')).toContainText(`zones sûres haut 47 · bas 34 · gauche 0 · droite 0 · hauteur utile 763 px · marge du soir ${enPx(g.marge)}`);
    }
  }
});

test('Q27 · le bandeau « Nouvelle version prête » prend la zone sûre du haut, et le soir ne la compte pas une seconde fois ; le Diagnostic dit la marge, même négative', async ({ page }) => {
  await simulerZonesSures(page);
  await toucher(page, 'Lieu', 'Bureau');
  const sans = await geometrieSoir(page);
  await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true }));
  await expect(page.locator('.bandeau')).toBeVisible();
  const g = await geometrieSoir(page);
  // Le texte du bandeau sous l'encoche ; l'en-tête du jour juste sous le bandeau (la zone sûre n'est pas comptée deux fois).
  expect(g.bandeau[1]).toBeGreaterThanOrEqual(47);
  expect(g.entete - g.bandeau[0]).toBeGreaterThanOrEqual(0);
  expect(g.entete - g.bandeau[0]).toBeLessThanOrEqual(1);
  // Le soir descend de la hauteur du bandeau moins la zone du haut, l'espace entre les cartes resserré (6 → 4).
  expect(g.marge).toBeGreaterThan(sans.marge - (g.bandeau[0] - 47));
  const d = await diagnostic(page);
  expect(d['Marge du soir']).toBe(`${enPx(g.marge)}${g.marge < 0 ? ' (le soir défile)' : ''}`);
});

test('Q27 · sans simulation (WebKit sans iPhone), le Diagnostic dit des zones sûres nulles et toute la fenêtre comme hauteur utile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  await toucher(page, 'Lieu', 'Bureau');
  const g = await geometrieSoir(page);
  const d = await diagnostic(page);
  expect(d).toMatchObject({ Fenêtre: '390 × 797', 'Zones sûres': 'haut 0 · bas 0 · gauche 0 · droite 0', 'Hauteur utile': '797 px', 'Marge du soir': enPx(g.marge) });
});

// ---------- Q29 : les finitions ----------

test('Q29 · en sombre, l\'énergie basse se distingue de la moyenne (Ta journée) ; en clair, rien ne change', async ({ page }) => {
  // Cinq jours de relevés à 10 h (basse), 14 h (moyenne) et 18 h (haute) : Ta journée a ses trois pas d'énergie.
  await page.evaluate(async (jours) => {
    const r = window.__carnet.repo;
    for (const date of jours) {
      for (const [heure, energie] of [['10:00', 'energie:basse'], ['14:00', 'energie:moyenne'], ['18:00', 'energie:haute']]) {
        await r.humeurs.creer({ date, heure, emotion: 'roue:serenite:calme', energie });
      }
    }
  }, Array.from({ length: 5 }, (_, i) => addDays(AUJ, -i)));
  await aller(page, '#/analyse');
  const journee = page.getByRole('figure').filter({ hasText: 'Ta journée heure par heure' });
  await expect(journee.locator('.pas-rampe rect.g-energie-1')).toHaveCount(1);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const pas = await journee.evaluate((f) => [1, 2, 3].map((n) => {
      const s = getComputedStyle(f.querySelector(`.pas-rampe rect.g-energie-${n}`));
      return { fill: s.fill, opacite: Number(s.opacity) };
    }));
    for (const p of pas) expect(p.fill, schema).toBe(rgb(t['c-energie']));
    const [basse, moyenne, haute] = pas.map((p) => vue(t['c-energie'], t.surface, p.opacite));
    if (schema === 'light') expect(pas.map((p) => p.opacite)).toEqual([0.3, 0.6, 1]);
    else {
      expect(contraste(basse, moyenne), 'basse et moyenne distinctes').toBeGreaterThanOrEqual(2.4);
      expect(contraste(moyenne, haute)).toBeGreaterThanOrEqual(2);
      expect(contraste(basse, t.surface), 'basse visible sur la carte').toBeGreaterThanOrEqual(1.4);
    }
  }
});

test('Q29 · le repère Bien-être de Mes jours est un contour, distinct de « nuit bien » (une barre pleine), en clair et en sombre', async ({ page }) => {
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-14', { sommeilRessenti: 'sommeil:bien' });
    await r.seances.creer({ date: '2026-10-14', heure: '09:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
  });
  await aller(page, '#/analyse');
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: /7 j/ }).click();
  const mesJours = page.locator('figure', { hasText: 'Mes jours' });
  await expect(mesJours.locator('rect.g-bien-etre')).toHaveCount(1);
  await expect(mesJours.locator('svg[role="img"] rect.g-sommeil-3')).toHaveCount(1);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const [bienEtre, nuit] = await Promise.all(['rect.g-bien-etre', 'svg[role="img"] rect.g-sommeil-3'].map((x) => mesJours.locator(x).first()
      .evaluate((e) => { const s = getComputedStyle(e); return { fill: s.fill, stroke: s.stroke, trait: parseFloat(s.strokeWidth) }; })));
    expect(bienEtre.fill, schema).toBe('none');
    expect(bienEtre.stroke, schema).toBe(rgb(t['c-difficile']));
    expect(bienEtre.trait, schema).toBeGreaterThanOrEqual(1.5);
    expect(nuit.fill, schema).toBe(rgb(t['chart-sommeil-3']));
  }
  // En sombre, les deux bleus sont les mêmes à l'œil (1:1) : seule la forme les distingue.
  expect(contraste(sombre['c-difficile'], sombre['chart-sommeil-3'])).toBeLessThan(1.2);
});

test('Q29 · dans un parcours, les étapes à venir se voient, en clair comme en sombre', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  const parcours = page.getByRole('dialog', { name: 'Épisode' });
  await expect(parcours.locator('.reperes i')).toHaveCount(5);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    const [fond, aVenir, enCours] = await parcours.evaluate((p) => [getComputedStyle(p).backgroundColor,
      getComputedStyle(p.querySelector('.reperes i:last-child')).backgroundColor, getComputedStyle(p.querySelector('.reperes i.en-cours')).backgroundColor]);
    expect(fond, schema).toBe(rgb(t.bg));
    expect(aVenir, schema).toBe(rgb(t.line));
    expect(contraste(aVenir, fond), `${schema} : à venir sur le fond`).toBeGreaterThanOrEqual(1.4);
    expect(aVenir, schema).not.toBe(enCours);
  }
});

test('Q29 · le message « Épisode enregistré » passe sous une feuille ouverte (Mon plan, dans l\'épisode), puis revient', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('monPlan', { quandCaMonte: 'je sors marcher' }));
  const id = await page.evaluate(async () => (await window.__carnet.repo.episodes.creer({ date: '2026-10-15', heure: '18:42', emotion: 'emotion:colere', intensite: 7 })).id);
  await aller(page, `#/episode/${id}`);
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await page.evaluate(() => window.__carnet.etatApp.maj({ toast: { id: 991, texte: 'Épisode enregistré', action: null, dureeMs: 60000 } }));
  const toast = page.getByRole('status').filter({ hasText: 'Épisode enregistré' });
  await expect(toast).toBeVisible();
  // Ce qu'on touche au milieu du message : le message lui-même, tant qu'aucune feuille n'est ouverte…
  const auMilieu = () => toast.evaluate((t) => { const r = t.getBoundingClientRect(); return t.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); });
  expect(await auMilieu()).toBe(true);
  await fiche.locator('.ligne-plan').getByRole('button', { name: 'Mon plan' }).click();
  const feuille = page.getByRole('dialog', { name: 'Mon plan' });
  await expect(feuille).toContainText('je sors marcher');
  // … puis le voile de la feuille : le message est dessous, il ne couvre ni la feuille ni son voile.
  expect(await auMilieu()).toBe(false);
  expect(await feuille.evaluate((f) => {
    const t = document.querySelector('.toast').getBoundingClientRect();
    const sous = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
    return Boolean(sous && sous.closest('.voile'));
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(feuille).toHaveCount(0);
  expect(await auMilieu()).toBe(true);
});

test('Q29 · le lecteur : « Terminer » touché tôt (moins de 60 s, sans aller au bout) ne laisse pas de « Noter mon émotion »', async ({ page }) => {
  await aller(page, '#/bien-etre/programme');
  await page.locator('main.programme').getByRole('link', { name: /^Pause d'une minute/ }).click();
  const lecteur = page.getByRole('dialog', { name: 'Pause d\'une minute' });
  await lecteur.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.clock.runFor(20000);
  await lecteur.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(lecteur.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  // Le lecteur se ferme seul 6 s plus tard : aucun message, aucune séance.
  await page.clock.runFor(6500);
  await expect(page).toHaveURL(/#\/bien-etre\/programme$/);
  await expect(page.getByRole('status').filter({ hasText: 'Fin de l\'exercice.' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Noter mon émotion' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__carnet.repo.seances.tous())).toEqual([]);
});

// ---------- Q31 : l'entrée d'un jour qui attend ses données ----------

// Un glissement au doigt, posé au centre de l'élément visé, levé 300 ms (d'horloge) plus tard.
async function glisser(page, selecteur, dx) {
  const depart = await page.locator(selecteur).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    return [x, y];
  });
  await page.clock.runFor(300);
  await page.locator(selecteur).first().evaluate((el, [x, y, d]) => {
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + d, clientY: y, bubbles: true }));
  }, [...depart, dx]);
}

test('Q31 · un jour dont les données arrivent après 600 ms entre quand même de son côté, ses cartes comprises ; l\'entrée finit avec son animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    window.__entrees = [];
    document.addEventListener('animationstart', (e) => {
      if (e.animationName.startsWith('entree-')) window.__entrees.push({ nom: e.animationName, carte: e.target.classList.contains('carte-champ') });
    });
    // La lecture d'un jour tarde (une base lente) : ses cartes arrivent bien après les 400 ms de l'ancienne minuterie.
    const r = window.__carnet.repo;
    const lire = r.journal.lire;
    r.journal.lire = (date) => new Promise((ok) => { setTimeout(ok, 600); }).then(() => lire(date));
  });
  await glisser(page, '.carte-champ .tete-rubrique', 120);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect(page.locator('main.aujourdhui')).toHaveClass(/entree-veille/);
  await page.clock.runFor(700);
  await expect(page.locator('main.aujourdhui > .carte-champ').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__entrees.filter((e) => e.carte).length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => [...new Set(window.__entrees.map((e) => e.nom))])).toEqual(['entree-veille']);
  // Les animations jouées, la page n'a plus de classe d'entrée : rien ne rejoue l'entrée.
  await expect(page.locator('main.aujourdhui')).not.toHaveClass(/entree-/);
});

// ---------- Q26 : 5 ans de données inventées ----------

// Cinq ans écrits d'un coup dans la base (une transaction), chaque fiche passée par la validation de l'app : un soir par
// jour, trois émotions du moment, un épisode tous les trois jours, un symptôme tous les cinq, une séance tous les deux.
async function cinqAns(page) {
  return page.evaluate(async () => {
    const { normaliser } = await import('/js/domain/champs.js');
    const { addDays } = await import('/js/domain/dates.js');
    const familles = ['colere', 'degout', 'tristesse', 'joie', 'surprise', 'peur', 'serenite'];
    const fiches = { journal: [], humeurs: [], episodes: [], symptomes: [], seances: [] };
    const valide = (store, brut) => {
      const { valeur, erreurs } = normaliser(store, brut, { origine: 'app' });
      if (erreurs.length) throw new Error(`${store} : ${erreurs.join(', ')}`);
      fiches[store].push({ ...valeur, createdAt: '2026-10-15T19:00:00.000Z', updatedAt: '2026-10-15T19:00:00.000Z' });
    };
    const jours = 5 * 365 + 1;
    for (let i = 0; i < jours; i++) {
      const date = addDays('2021-10-15', i);
      valide('journal', { date, lieu: i % 2 ? 'lieu:bureau' : 'lieu:teletravail', sommeilRessenti: ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'][i % 3],
        heuresSommeil: 4 + (i % 7), contactHumain: i % 2 === 0, sportMouvement: i % 3 === 0, traitementPris: 'traitementPris:oui',
        notes: i % 3 ? null : 'une note du soir inventée pour la mesure', pointsPositifs: i % 4 ? null : 'un point positif inventé' });
      for (let k = 0; k < 3; k++) {
        valide('humeurs', { id: `hu-perf-${i}-${k}`, date, heure: `${10 + 4 * k}:00`, emotion: `roue:${familles[(i + k) % 7]}`,
          energie: ['energie:basse', 'energie:moyenne', 'energie:haute'][k] });
      }
      if (i % 3 === 0) valide('episodes', { id: `ep-perf-${i}`, date, heure: '15:00', emotion: 'emotion:colere', intensite: 6, reaction: i % 2 ? 'reaction:explosion' : null });
      if (i % 5 === 0) valide('symptomes', { id: `sy-perf-${i}`, date, symptome: 'symptome:crise_angoisse', intensite: 4 });
      if (i % 2 === 0) valide('seances', { id: `se-perf-${i}`, date, heure: '21:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
    }
    const db = await new Promise((ok, ko) => { const r = indexedDB.open('carnet'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
    await new Promise((ok, ko) => {
      const t = db.transaction([...Object.keys(fiches), 'meta'], 'readwrite');
      for (const [store, liste] of Object.entries(fiches)) for (const f of liste) t.objectStore(store).put(f);
      t.objectStore('meta').put({ cle: 'derniereEcriture', valeur: new Date().toISOString() });
      t.oncomplete = ok;
      t.onerror = () => ko(t.error);
    });
    db.close();
    return Object.fromEntries(Object.entries(fiches).map(([s, l]) => [s, l.length]));
  });
}

// Les lectures de la base, comptées : chaque appel à `tous()` d'un store (l'objet repo de l'app, partagé avec ses écrans).
const compterLectures = (page) => page.evaluate(() => {
  window.__lectures = 0;
  const r = window.__carnet.repo;
  for (const store of ['journal', 'humeurs', 'episodes', 'symptomes', 'seances']) {
    const tous = r[store].tous;
    r[store].tous = (...a) => { window.__lectures += 1; return tous(...a); };
  }
});
const lectures = (page) => page.evaluate(() => { const n = window.__lectures; window.__lectures = 0; return n; });

const ECRANS = [
  ['Analyse', '#/analyse', (page) => page.locator('.tuile').first()],
  ['Comprendre', '#/comprendre/energie', (page) => page.locator('main.comprendre figure.graphe').first()],
  ['Vue soignants', '#/soignants', (page) => page.getByRole('button', { name: 'Partager en PDF' })],
  ['Historique', '#/historique', (page) => page.locator('.ligne-hist').first()],
];

test('Q26 · 5 ans de données inventées : l\'Analyse, Comprendre, la Vue soignants et l\'Historique s\'ouvrent sous leur budget ; rouverts, ils ne relisent pas la base tant qu\'elle n\'a pas changé', async ({ page }) => {
  test.setTimeout(120000);
  const n = await cinqAns(page);
  expect(n.journal).toBe(1826);
  expect(n.humeurs).toBe(1826 * 3);
  await page.reload();
  await compterLectures(page);
  // Première ouverture : chaque écran lit la base (une seule fois pour les quatre, la lecture étant partagée), sous son
  // budget, généreux pour une machine chargée : mesuré sur Mac, 0,25 s pour l'Analyse, Comprendre et la Vue soignants, 2 s
  // pour l'Historique (qui rend toutes ses semaines d'un coup : la piste Q25, non retenue).
  for (const [nom, hash, pret] of ECRANS) {
    await aller(page, '#/aujourdhui');
    await expect(page.locator('main.aujourdhui .carte-champ').first()).toBeVisible();
    const t0 = Date.now();
    await aller(page, hash);
    await expect(pret(page), nom).toBeVisible({ timeout: 20000 });
    const ms = Date.now() - t0;
    console.log(`  ${nom}, 5 ans : ${ms} ms`);
    expect(ms, nom).toBeLessThan(8000);
  }
  expect(await lectures(page), 'la base lue une fois, pour les quatre écrans').toBe(5);
  // Rouverts sans écriture : aucune lecture.
  for (const [nom, hash, pret] of ECRANS) {
    await aller(page, '#/aujourdhui');
    await expect(page.locator('main.aujourdhui .carte-champ').first()).toBeVisible();
    await aller(page, hash);
    await expect(pret(page), nom).toBeVisible();
    expect(await lectures(page), `${nom} rouvert`).toBe(0);
  }
  // Une écriture (un choix du soir) : l'écran suivant relit la base, une fois.
  await aller(page, '#/aujourdhui');
  await toucher(page, 'Lieu', 'Bureau');
  await expect.poll(async () => (await entreeDuJour(page))?.lieu).toBe('lieu:bureau');
  await aller(page, '#/historique');
  await expect(page.locator('.ligne-hist').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__lectures)).toBe(5);
});
