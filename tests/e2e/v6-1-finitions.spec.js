import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6.1 · finitions (P1, A3) : des défauts sans question de goût, vérifiés sur les styles calculés. Les
// interrupteurs de Réglages vont à droite ; « Tout effacer » n'est plus centré (la règle du bouton ✕ ne vise
// plus que les boutons) ; les titres de section et les textes d'aide sont sur le bord des cartes ; « 5 minutes »
// ne se coupe pas et « · Mouvement » ne commence plus une ligne ; la colonne des heures a une largeur fixe. Données
// inventées.
// Horloge : jeudi 15 octobre 2026, 21:00 (écran de 390 × 844, celui du projet).
const repo = (page, f, arg) => page.evaluate(f, arg);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Chaque ligne d'interrupteur : le libellé prend la place, l'interrupteur touche la marge droite de la ligne.
const lignesInterrupteur = (page) => page.locator('.ligne-interrupteur').evaluateAll((els) => els.map((l) => {
  const s = getComputedStyle(l);
  const libelle = l.querySelector('.ligne-libelle');
  const bouton = l.querySelector('[role="switch"]').getBoundingClientRect();
  const ligne = l.getBoundingClientRect();
  return {
    croissance: getComputedStyle(libelle).flexGrow,
    ecartDroit: Math.round(ligne.right - parseFloat(s.paddingRight) - bouton.right),
    droite: Math.round(bouton.right),
  };
}));

test('interrupteurs alignés à droite : Réglages › Moment difficile et › Me ressourcer (v7 : plus de section Analyse)', async ({ page }) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await expect(page.locator('.ligne-interrupteur')).toHaveCount(0);
  for (const [route, nombre] of [['#/reglages/moment-difficile', 7], ['#/reglages/ressourcer', 1]]) {
    await aller(page, route);
    await expect(page.locator('.ligne-interrupteur')).toHaveCount(nombre);
    const lignes = await lignesInterrupteur(page);
    for (const l of lignes) {
      expect(l.croissance, route).toBe('1');
      expect(Math.abs(l.ecartDroit), route).toBeLessThanOrEqual(1);
    }
    // Tous sur la même verticale, quelle que soit la longueur du libellé.
    expect(new Set(lignes.map((l) => l.droite)).size, route).toBe(1);
  }
});

test('« Tout effacer » n\'est pas centré ; le bouton ✕ garde sa forme', async ({ page }) => {
  await aller(page, '#/reglages/effacer');
  await expect(page.getByRole('heading', { name: 'Tout effacer', level: 1 })).toBeVisible();
  const ecran = await page.locator('main.effacer').evaluate((m) => {
    const s = getComputedStyle(m);
    const gauche = (sel) => Math.round(m.querySelector(sel).getBoundingClientRect().left);
    return {
      display: s.display, justifyItems: s.justifyItems, alignItems: s.alignItems, minWidth: s.minWidth,
      marge: Math.round(m.getBoundingClientRect().left + parseFloat(s.paddingLeft)),
      titre: gauche('h1'), texte: gauche('.texte-import'), bouton: gauche('.actions-col .btn'),
      chevron: Math.round(m.querySelector('.retour svg').getBoundingClientRect().width),
    };
  });
  expect(ecran.display).toBe('flex');
  expect(ecran.justifyItems).not.toBe('center');
  expect(ecran.alignItems).not.toBe('center');
  expect(ecran.minWidth).not.toBe('44px');
  // Titre, texte et boutons partent de la marge, comme sur les autres écrans.
  expect(ecran.titre).toBe(ecran.marge);
  expect(ecran.texte).toBe(ecran.marge);
  expect(ecran.bouton).toBe(ecran.marge);
  // Le chevron de « Retour » garde sa taille (la règle de l'icône du ✕ ne le réduit plus).
  expect(ecran.chevron).toBe(22);

  // Un vrai bouton ✕ (relevé de l'humeur du moment) : 44 pt, icône centrée de 18.
  await repo(page, () => window.__carnet.repo.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: null }));
  await aller(page, '#/moment');
  const croix = page.getByRole('button', { name: 'Supprimer le relevé de 10:20' });
  await expect(croix).toBeVisible();
  const forme = await croix.evaluate((b) => {
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return { display: s.display, justifyItems: s.justifyItems, largeur: Math.round(r.width), hauteur: Math.round(r.height),
      icone: Math.round(b.querySelector('svg').getBoundingClientRect().width) };
  });
  expect(forme).toEqual({ display: 'grid', justifyItems: 'center', largeur: 44, hauteur: 44, icone: 18 });
});

// Bord gauche du texte d'un titre et de la carte qui le suit (ou d'un élément voisin donné).
const bordTitreEtCarte = (titre, carte) => titre.evaluate((t, sel) => {
  const suivante = sel ? t.parentElement.querySelector(sel) : t.nextElementSibling;
  const texte = document.createRange();
  texte.selectNodeContents(t);
  return { padding: getComputedStyle(t).paddingLeft, titre: Math.round(texte.getClientRects()[0].left), carte: Math.round(suivante.getBoundingClientRect().left) };
}, carte);

test('titres de section et textes d\'aide sur le bord des cartes : Réglages, Soins, Listes, Historique, Diagnostic', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.rdv.creer({ date: '2026-10-20', heure: '10:30', professionnel: 'professionnel:psychiatre' });
    await r.journal.patch('2026-10-14', { humeur: 6 });
  });
  const verifier = async (titre, carte) => {
    await expect(titre).toBeVisible();
    const b = await bordTitreEtCarte(titre, carte);
    expect(b.padding).toBe('0px');
    expect(b.titre).toBe(b.carte);
  };
  await aller(page, '#/reglages');
  await verifier(page.getByRole('heading', { name: 'Sauvegarde', level: 2 }));
  await verifier(page.getByRole('heading', { name: 'Zone sensible', level: 2 }));
  await aller(page, '#/soins');
  await verifier(page.locator('.soins .libelle-section', { hasText: 'À venir' }));
  await aller(page, '#/reglages/listes');
  await verifier(page.getByRole('heading', { name: 'Le soir', level: 2 }));
  await aller(page, '#/historique');
  await verifier(page.locator('.titre-semaine').first());
  await aller(page, '#/diagnostic');
  await verifier(page.getByRole('heading', { name: 'Mes données', level: 2 }), '.btn');

  // Les textes d'aide sous les cartes, sur le même bord que les titres et les cartes : Réglages (Sauvegarde),
  // › Moment difficile, › Me ressourcer, et les Listes (liste qui se renomme seulement, éléments archivés).
  await repo(page, () => window.__carnet.repo.listes.archiver('lieu:bureau'));
  for (const [route, nombre] of [['#/reglages', 2], ['#/reglages/moment-difficile', 1], ['#/reglages/ressourcer', 1], ['#/reglages/listes/sommeil', 1], ['#/reglages/listes/lieu', 1]]) {
    await aller(page, route);
    await expect(page.locator('main .aide-carte').nth(nombre - 1)).toBeVisible();
    const bords = await page.locator('main').evaluate((m) => {
      const texte = (e) => { const r = document.createRange(); r.selectNodeContents(e); return Math.round(r.getClientRects()[0].left); };
      return { carte: Math.round(m.querySelector('.carte').getBoundingClientRect().left),
        aides: [...m.querySelectorAll('.aide-carte')].map((a) => ({ marge: getComputedStyle(a).marginLeft, texte: texte(a) })) };
    });
    for (const a of bords.aides) {
      expect(a.marge, route).toBe('0px');
      expect(a.texte, route).toBe(bords.carte);
    }
  }
  await aller(page, '#/reglages');
  const sauvegarde = await bordTitreEtCarte(page.getByRole('heading', { name: 'Sauvegarde', level: 2 }), '.aide-carte');
  expect(sauvegarde.titre).toBe(sauvegarde.carte);
});

// Les rectangles d'un morceau du texte d'un élément : un seul rectangle, le morceau tient sur une ligne.
const morceau = (loc, texte) => loc.evaluate((e, t) => {
  const noeud = [...e.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.data.includes(t)) || e.firstChild;
  const debut = noeud.data.indexOf(t);
  const r = document.createRange();
  r.setStart(noeud, debut);
  r.setEnd(noeud, debut + t.length);
  return { rects: [...r.getClientRects()].map((x) => ({ gauche: Math.round(x.left), haut: Math.round(x.top) })), gaucheElement: Math.round(e.getBoundingClientRect().left) };
}, texte);

test('A3 : « 5 minutes » ne se coupe pas, « · Mouvement » ne commence pas une ligne', async ({ page }) => {
  await aller(page, '#/moment-difficile');
  const phase = page.locator('.phase-respiration');
  await expect(phase).toHaveText('Cohérence cardiaque · 5 minutes');
  expect(await phase.textContent()).toContain('5 minutes');
  expect((await morceau(phase, '5 minutes')).rects).toHaveLength(1);

  // Quatre jours avec un contact et une marche : la section « Avec qui, comment c'était · Mouvement » s'affiche.
  await repo(page, async () => {
    for (const d of ['2026-10-10', '2026-10-12', '2026-10-13', '2026-10-14']) {
      await window.__carnet.repo.journal.patch(d, { contactHumain: true, contacts: [{ avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }],
        sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }] });
    }
  });
  await aller(page, '#/analyse');
  const titre = page.getByRole('heading', { name: 'Avec qui, comment c\'était · Mouvement', level: 2 });
  await expect(titre).toBeVisible({ timeout: 15000 });
  const style = await titre.evaluate((e) => { const s = getComputedStyle(e); return `${s.textWrap || ''} ${s.textWrapStyle || ''}`; });
  expect(style).toContain('balance');
  // Deux lignes, et le « · » n'est pas en tête de la seconde.
  const point = await morceau(titre, '·');
  const hauteur = await titre.evaluate((e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
  expect(Math.round(hauteur)).toBe(2);
  expect(point.rects[0].gauche).toBeGreaterThan(point.gaucheElement + 20);
});

test('colonne des heures de largeur fixe : Ma journée (relevés, « vers », épisode, symptôme sans heure) et relevés du moment', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.episodes.creer({ date: '2026-10-15', heure: '12:30', emotion: 'emotion:colere', intensite: 5 });
    await r.humeurs.creer({ date: '2026-10-15', heure: '23:00', vers: true, humeur: 5, energie: null });
    await r.symptomes.creer({ date: '2026-10-15', symptome: 'symptome:ruminations', intensite: 4 });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
  await expect(page.locator('.liste-evenements > li')).toHaveCount(4);
  const colonnes = await page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => {
    const h = li.querySelector('.heure');
    return { texte: h.textContent, chiffres: getComputedStyle(h).fontVariantNumeric, largeur: Math.round(h.getBoundingClientRect().width),
      resume: Math.round(li.querySelector('.resume').getBoundingClientRect().left) };
  }));
  expect(colonnes.map((c) => c.texte)).toEqual(['10:20', '12:30', 'vers 23 h', '']);
  for (const c of colonnes) expect(c.chiffres).toBe('tabular-nums');
  expect(new Set(colonnes.map((c) => c.largeur)).size).toBe(1);
  expect(new Set(colonnes.map((c) => c.resume)).size).toBe(1);

  // Les relevés du jour dans l'humeur du moment : la même colonne, le texte part du même bord.
  await aller(page, '#/moment');
  const heures = page.locator('.moments-du-jour .heure-moment');
  await expect(heures).toHaveText(['10:20', 'vers 23 h']);
  const releves = await heures.evaluateAll((els) => els.map((h) => {
    const r = document.createRange();
    r.setStartAfter(h);
    r.setEnd(h.parentElement, h.parentElement.childNodes.length);
    return { chiffres: getComputedStyle(h).fontVariantNumeric, largeur: Math.round(h.getBoundingClientRect().width), texte: Math.round(r.getClientRects()[0].left) };
  }));
  for (const c of releves) expect(c.chiffres).toBe('tabular-nums');
  expect(new Set(releves.map((c) => c.largeur)).size).toBe(1);
  expect(new Set(releves.map((c) => c.texte)).size).toBe(1);
});
