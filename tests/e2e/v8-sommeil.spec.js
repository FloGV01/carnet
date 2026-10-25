import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, entreeDuJour } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v8 (5/9) · Le sommeil en heures et en qualité (spec §7 bis), les détails dans leur carte (Q5) : la carte Sommeil et son lien
// « Durée › » (la rangée Durée ne tient pas avec le soir sans défiler : docs/decisions.md), « Nuit en détail » masqué par
// défaut et réaffichable, « Détail › » du Sport et du Contact, le point de vigilance 3 (le soir sans défiler à 390 × 797, en
// clair et en sombre, entre 0 h et 4 h, avec le bandeau), les lectures (résumé du jour, Analyse). Données inventées.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844, sauf mention).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const THEMES = [['light', clair], ['dark', sombre]];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const lienDuree = (page) => page.getByRole('button', { name: /^Durée de la nuit/ });
const lienDetail = (page, nom) => page.getByRole('button', { name: `${nom} en détail`, exact: true });
const carteDe = (page, nom) => page.locator('.carte-champ', { has: groupe(page, nom) });
const boite = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, l: r.width, h: r.height, bas: r.bottom, droite: r.right }; });
const taillePolice = (page, px) => page.evaluate((t) => { for (const e of [document.documentElement, document.body]) e.style.fontSize = t ? `${t}px` : ''; }, px);

// La cible qu'on touche vraiment (relecture de la tâche 5) : la boîte d'un lien mesurait 44, mais le titre passé dessous
// (« mouvement ») et les choix de la carte (« Bien ») en prenaient une part. Chaque point de sa boîte (44 × 44 au moins,
// autour de son texte) doit tomber dans le lien (elementFromPoint), et aucun autre bouton ni champ ne la chevauche.
const cibleReelle = (lien) => lien.evaluate((b) => {
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  const texte = b.querySelector('.lien-rubrique-texte').getBoundingClientRect();
  let ailleurs = 0;
  for (let y = Math.ceil(r.top) + 0.5; y < r.bottom; y += 1) for (let x = Math.ceil(r.left) + 0.5; x < r.right; x += 1) if (!b.contains(document.elementFromPoint(x, y))) ailleurs += 1;
  const chevauches = [...document.querySelectorAll('main button, main input, main textarea')].filter((e) => !b.contains(e) && !e.contains(b)).filter((e) => {
    const o = e.getBoundingClientRect();
    return o.width > 0 && o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top;
  }).map((e) => e.getAttribute('aria-label') || e.textContent.trim());
  return { l: r.width, h: r.height, autourDuTexte: r.left <= texte.left && r.right >= texte.right && r.top <= texte.top && r.bottom >= texte.bottom, ailleurs, chevauches };
});
const cibleEntiere = async (lien, quoi) => {
  const c = await cibleReelle(lien);
  expect(c.l, `${quoi} : largeur de la cible`).toBeGreaterThanOrEqual(44);
  expect(c.h, `${quoi} : hauteur de la cible`).toBeGreaterThanOrEqual(44);
  expect([c.autourDuTexte, c.ailleurs, c.chevauches], `${quoi} : toute la cible répond, sans rien recouvrir`).toEqual([true, 0, []]);
};
// Les points d'un choix qui tomberaient dans un lien : aucun (le choix garde toute sa surface).
const pointsPrisParUnLien = (loc) => loc.evaluate((e) => {
  e.scrollIntoView({ block: 'center' });
  const r = e.getBoundingClientRect();
  let n = 0;
  for (let y = Math.ceil(r.top) + 0.5; y < r.bottom; y += 1) for (let x = Math.ceil(r.left) + 0.5; x < r.right; x += 1) if (document.elementFromPoint(x, y)?.closest('.lien-rubrique')) n += 1;
  return n;
});

// La marge de chaque élément au-dessus de la bande du bas (positive : il est au-dessus), et le défilement de la page.
const margesSurLaBande = (page, selecteurs) => page.evaluate((liste) => {
  const bande = document.querySelector('.actions-flottantes').getBoundingClientRect().top;
  return { scrollY: window.scrollY, large: document.documentElement.scrollWidth > window.innerWidth, marges: liste.map((x) => [x, bande - document.querySelector(x).getBoundingClientRect().bottom]) };
}, selecteurs);
const toutAuDessus = (m, quoi) => {
  expect(m.scrollY, quoi).toBe(0);
  expect(m.large, `${quoi} : pas de défilement de côté`).toBe(false);
  for (const [x, marge] of m.marges) expect(marge, `${quoi} · ${x}`).toBeGreaterThanOrEqual(0);
};
const soir = async (page) => {
  await toucher(page, 'Lieu', 'Bureau');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Contact humain', 'Oui');
  await toucher(page, 'Sport / mouvement', 'Non');
  await toucher(page, 'Traitement pris', 'Oui');
  await expect.poll(async () => (await entreeDuJour(page))?.traitementPris).toBe('traitementPris:oui');
};

// ---------- Point de vigilance 3 ----------

test('vigilance 3 · le soir, avec la carte Sommeil et son lien « Durée › », tient sans défiler à 390 × 797, en clair et en sombre, à 21 h, entre 0 h et 4 h et avec le bandeau', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  const cas = [
    ['21 h', async () => {}],
    ['01:30', async () => { await page.clock.setSystemTime(new Date(2026, 9, 16, 1, 30)); await page.reload(); }],
    ['bandeau', async () => { await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true })); await expect(page.locator('.bandeau')).toBeVisible(); }],
  ];
  for (const [schema] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    for (const [nom, preparer] of cas) {
      const quoi = `${schema} · ${nom}`;
      await page.clock.setSystemTime(new Date(2026, 9, 15, 21, 0));
      await viderBase(page);
      await preparer();
      if (nom === '01:30') await expect(page.getByText('Encore jeudi jusqu\'à 4 h.', { exact: true })).toBeVisible();
      await soir(page);
      // La Durée est fermée au départ : la carte Sommeil n'a que la qualité, et le lien ne lui prend aucune hauteur.
      await expect(lienDuree(page), quoi).toHaveAttribute('aria-expanded', 'false');
      await expect(groupe(page, 'Durée de la nuit')).toHaveCount(0);
      const [sommeil, traitement] = await Promise.all([boite(carteDe(page, 'Sommeil')), boite(carteDe(page, 'Traitement pris'))]);
      expect(Math.abs(sommeil.h - traitement.h), `${quoi} : Sommeil aussi haute que Traitement pris`).toBeLessThanOrEqual(0.5);
      toutAuDessus(await margesSurLaBande(page, ['.carte-champ:has(#points-positifs)']), quoi);
    }
  }
});

// ---------- La Durée ----------

test('« Durée › » ouvre la durée sous Mal · Moyen · Bien : un toucher enregistre, un second efface ; le lien dit la durée notée', async ({ page }) => {
  const lien = lienDuree(page);
  await expect(lien).toHaveText('Durée');
  await expect(lien).toHaveAccessibleName('Durée de la nuit');
  await lien.click();
  await expect(lien).toHaveAttribute('aria-expanded', 'true');
  await expect(lien).toHaveAttribute('aria-controls', 'detail-duree');
  const duree = groupe(page, 'Durée de la nuit');
  expect(await duree.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim())))
    .toEqual(['4 h ou moins', '5 h', '6 h', '7 h', '8 h', '9 h', '10 h ou plus']);
  // Dans la carte Sommeil, sous la qualité : 4 puis 3 choix, chaque rangée sur toute la largeur, des cibles de 44.
  const g = await page.locator('#detail-duree').evaluate((zone) => {
    const carte = zone.closest('.carte-champ').getBoundingClientRect();
    const qualite = zone.closest('.carte-champ').querySelector('.segmente').getBoundingClientRect();
    const bs = [...zone.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
    return { carte: [carte.left, carte.right], sousQualite: bs.every((b) => b.top >= qualite.bottom), rangees: [...new Set(bs.map((b) => Math.round(b.top)))].length,
      premiers: bs.slice(0, 4).every((b) => Math.abs(b.top - bs[0].top) < 1), gauche: [bs[0].left, bs[4].left], droite: [bs[3].right, bs[6].right], tailles: bs.map((b) => [b.width, b.height]) };
  });
  expect(g.sousQualite).toBe(true);
  expect(g.rangees).toBe(2);
  expect(g.premiers).toBe(true);
  expect(Math.abs(g.gauche[0] - g.gauche[1])).toBeLessThanOrEqual(0.5);
  expect(Math.abs(g.droite[0] - g.droite[1])).toBeLessThanOrEqual(0.5);
  expect(g.droite[0]).toBeLessThanOrEqual(g.carte[1]);
  for (const [l, h] of g.tailles) { expect(l).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); }

  // Un toucher enregistre (la nuit qui précède le jour), le lien et le résumé du jour le disent ; un second efface.
  await duree.getByRole('button', { name: '6 h', exact: true }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil).toBe(6);
  await expect(duree.getByRole('button', { name: '6 h', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(lien).toHaveText('6 h');
  await expect(lien).toHaveAccessibleName('Durée de la nuit : 6 h');
  await expect(page.locator('.resume-jour')).toHaveText('nuit 6 h');
  await toucher(page, 'Sommeil', 'Mal');
  await expect(page.locator('.resume-jour')).toHaveText('nuit mal · 6 h');
  // La rangée reste ouverte après un choix : une erreur se corrige tout de suite.
  await duree.getByRole('button', { name: '6 h', exact: true }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil ?? null).toBeNull();
  await expect(lien).toHaveText('Durée');
  await duree.getByRole('button', { name: '4 h ou moins' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil).toBe(4);
  await expect(lien).toHaveText('4 h ou moins');
  await lien.click();
  await expect(lien).toHaveAttribute('aria-expanded', 'false');
  await expect(duree).toHaveCount(0);
  await expect(lien).not.toHaveAttribute('aria-controls');
});

test('la Durée est fermée à chaque ouverture et à chaque changement de jour, même notée ; elle ne s\'ouvre jamais seule', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-15', { sommeilRessenti: 'sommeil:bien', heuresSommeil: 9 }));
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-14', { heuresSommeil: 10 }));
  await page.reload();
  await expect(lienDuree(page)).toHaveText('9 h');
  await expect(lienDuree(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupe(page, 'Durée de la nuit')).toHaveCount(0);
  await lienDuree(page).click();
  await expect(groupe(page, 'Durée de la nuit').getByRole('button', { name: '9 h', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // La veille : fermée, avec sa propre durée.
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect(lienDuree(page)).toHaveText('10 h ou plus');
  await expect(lienDuree(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupe(page, 'Durée de la nuit')).toHaveCount(0);
  // Retour à aujourd'hui, puis une nouvelle ouverture de l'app : fermée.
  await page.getByRole('link', { name: 'Revenir à aujourd\'hui' }).click();
  await expect(lienDuree(page)).toHaveAttribute('aria-expanded', 'false');
  await lienDuree(page).click();
  await page.reload();
  await expect(lienDuree(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(groupe(page, 'Durée de la nuit')).toHaveCount(0);
});

// La mise en page de la carte Sommeil, Durée ouverte : chaque choix, la carte et sa tête, en coordonnées de la page.
const planSommeil = (page) => page.locator('#detail-duree').evaluate((zone) => {
  const carte = zone.closest('.carte-champ');
  const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + window.scrollY, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
  return { carte: r(carte), tete: r(carte.querySelector('.tete-rubrique')), choix: [...zone.querySelectorAll('button')].map(r) };
});

test('Durée : un choix ne change pas la mise en page (choix, tête, carte), « 4 h ou moins » puis « 10 h ou plus », en clair et en sombre, à 390 et 375, au texte par défaut et en grand texte', async ({ page }) => {
  const lien = lienDuree(page);
  const duree = groupe(page, 'Durée de la nuit');
  await lien.click();
  // « ou moins » et « ou plus » : en petit, en gris secondaire et en 400, à la couleur du choix une fois choisi ; la coche
  // devant le nombre seul, qui passe en 600.
  const precision = (nom) => duree.getByRole('button', { name: nom, exact: true }).evaluate((b) => {
    const [petit, nombre, coche] = [b.querySelector('small'), b.querySelector('.libelle-choix'), b.querySelector('.coche')];
    const [c, n] = [coche.getBoundingClientRect(), nombre.getBoundingClientRect()];
    return { couleur: getComputedStyle(petit).color, graisse: getComputedStyle(petit).fontWeight, nombre: getComputedStyle(nombre).fontWeight,
      coche: c.width > 0 ? Math.abs((c.top + c.bottom) / 2 - (n.top + n.bottom) / 2) < 3 && c.right <= n.left : null };
  });
  for (const [schema, largeur, px] of [['light', 390, null], ['dark', 390, null], ['light', 375, null], ['dark', 375, null], ['light', 390, 21], ['light', 390, 23], ['light', 375, 21], ['light', 375, 23]]) {
    await page.emulateMedia({ colorScheme: schema });
    await page.setViewportSize({ width: largeur, height: 844 });
    await taillePolice(page, px);
    const quoi = `${schema} · ${largeur} · ${px ? `${px} px` : 'texte par défaut'}`;
    const t = schema === 'light' ? clair : sombre;
    await expect(lien).toHaveText('Durée');
    const avant = await planSommeil(page);
    for (const nom of ['4 h ou moins', '10 h ou plus']) {
      // (la couleur d'un choix suit une transition : on attend sa fin)
      if (!px) await expect.poll(() => precision(nom), `${quoi} · ${nom}`).toEqual({ couleur: rgb(t['text-2']), graisse: '400', nombre: '400', coche: null });
      await duree.getByRole('button', { name: nom, exact: true }).click();
      await expect(lien).toHaveText(nom);
      expect(await planSommeil(page), `${quoi} · ${nom} choisi`).toEqual(avant);
      if (!px) await expect.poll(() => precision(nom), `${quoi} · ${nom} choisi`).toEqual({ couleur: rgb(t['c-sommeil-on']), graisse: '400', nombre: '600', coche: true });
    }
    await duree.getByRole('button', { name: '10 h ou plus', exact: true }).click();
    await expect(lien).toHaveText('Durée');
    expect(await planSommeil(page), `${quoi} · effacé`).toEqual(avant);
  }
});

test('Durée en grand texte (21 à 28 px, 390 et 375), ouverte et notée : rien ne déborde, chaque choix d\'une rangée a la même largeur, les colonnes s\'alignent ; en très grand texte, deux colonnes égales ; les liens gardent toute leur cible', async ({ page }) => {
  await toucher(page, 'Sommeil', 'Moyen');
  await lienDuree(page).click();
  // Le choix le plus large pour sa place, fait : sa coche compte.
  await groupe(page, 'Durée de la nuit').getByRole('button', { name: '4 h ou moins' }).click();
  await expect(lienDuree(page)).toHaveText('4 h ou moins');
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const px of [21, 23, 24, 26, 28]) {
      await taillePolice(page, px);
      const quoi = `${largeur} · ${px} px`;
      const g = await page.locator('#detail-duree').evaluate((zone) => {
        const carte = zone.closest('.carte-champ').getBoundingClientRect();
        const debords = [];
        const rangees = [];
        for (const b of zone.querySelectorAll('button')) {
          const r = b.getBoundingClientRect();
          const nom = b.getAttribute('aria-label');
          if (b.scrollWidth > b.clientWidth || b.scrollHeight > b.clientHeight) debords.push(nom);
          if (r.left < carte.left - 0.5 || r.right > carte.right + 0.5) debords.push(`${nom} hors de la carte`);
          for (const k of b.querySelectorAll('.coche, .libelle-choix, small')) {
            const q = k.getBoundingClientRect();
            if (q.width > 0 && (q.left < r.left || q.right > r.right || q.top < r.top || q.bottom > r.bottom)) debords.push(`${nom} : ${k.textContent || 'coche'} hors du choix`);
          }
          const rangee = rangees.find((x) => Math.abs(x.haut - r.top) < 1);
          if (rangee) rangee.choix.push([r.left, r.right]); else rangees.push({ haut: r.top, choix: [[r.left, r.right]] });
        }
        return { debords, rangees: rangees.map((x) => x.choix) };
      });
      expect(g.debords, quoi).toEqual([]);
      const proches = (valeurs, q) => { for (const v of valeurs) expect(Math.abs(v - valeurs[0]), q).toBeLessThanOrEqual(0.5); };
      const tailles = g.rangees.map((x) => x.length);
      if (px === 21) expect(tailles, `${quoi} : 4 puis 3`).toEqual([4, 3]);
      if (px === 28) expect(tailles, `${quoi} : deux colonnes`).toEqual([2, 2, 2, 1]);
      expect([[4, 3], [2, 2, 2, 1]], quoi).toContainEqual(tailles);
      for (const rangee of g.rangees) proches(rangee.map(([l, d]) => d - l), `${quoi} : même largeur dans une rangée`);
      proches(g.rangees.map((x) => x[0][0]), `${quoi} : bords gauches alignés`);
      proches(g.rangees.filter((x) => x.length === tailles[0]).map((x) => x.at(-1)[1]), `${quoi} : bords droits alignés`);
      if (tailles.length === 4) {
        proches(g.rangees.flat().map(([l, d]) => d - l), `${quoi} : deux colonnes égales`);
        proches(g.rangees.map((x) => x[0][1]), `${quoi} : première colonne alignée`);
      }
      for (const lien of [lienDuree(page), lienDetail(page, 'Contact'), lienDetail(page, 'Sport')]) await cibleEntiere(lien, `${quoi} · ${await lien.getAttribute('aria-label')}`);
    }
  }
});

// ---------- Les liens des cartes : 2b, AA, cibles ----------

test('« Durée › » et « Détail › » : sur la première ligne du titre, en couleur action 13/600, AA, des cibles de 44 qu\'on touche en entier, sans hauteur pour la carte ni surface prise aux choix', async ({ page }) => {
  await soir(page);
  await toucher(page, 'Sommeil', 'Bien');
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    for (const [lien, carte, titre] of [[lienDuree(page), 'Sommeil', 'Sommeil'], [lienDetail(page, 'Contact'), 'Contact humain', 'Contact humain'], [lienDetail(page, 'Sport'), 'Sport / mouvement', 'Sport / mouvement']]) {
      const quoi = `${schema} · ${titre}`;
      const m = await lien.evaluate((b) => {
        const c = b.closest('.carte-champ');
        const s = getComputedStyle(b);
        const texte = b.querySelector('.lien-rubrique-texte').getBoundingClientRect();
        const plage = document.createRange();
        plage.selectNodeContents(c.querySelector('.titre-rubrique'));
        const ligne1 = [...plage.getClientRects()].filter((x) => x.width > 0)[0];
        return {
          couleur: s.color, fond: getComputedStyle(c).backgroundColor, taille: Math.round(Number.parseFloat(s.fontSize)), graisse: s.fontWeight,
          dansLaTete: Boolean(b.closest('.tete-rubrique')), premiereLigne: Math.abs((texte.top + texte.bottom) / 2 - (ligne1.top + ligne1.bottom) / 2) < 3,
          aDroite: texte.right <= c.getBoundingClientRect().right - 8 && texte.left > ligne1.right, debord: b.scrollWidth > b.clientWidth,
        };
      });
      expect(m.couleur, quoi).toBe(rgb(t.action));
      expect(contraste(m.couleur, m.fond), quoi).toBeGreaterThanOrEqual(4.5);
      expect([m.taille, m.graisse], quoi).toEqual([13, '600']);
      expect([m.dansLaTete, m.premiereLigne, m.aDroite, m.debord], quoi).toEqual([true, true, true, false]);
      await cibleEntiere(lien, quoi);
      await expect(carteDe(page, carte).locator('.titre-rubrique')).toHaveText(titre);
    }
  }
  // « Sommeil : Bien » (choisi), Mal et Moyen, et les Oui / Non de Contact et Sport gardent toute leur surface.
  const choixSousLesLiens = () => [...['Mal', 'Moyen', 'Bien'].map((n) => groupe(page, 'Sommeil').getByRole('button', { name: n })),
    ...['Contact humain', 'Sport / mouvement'].flatMap((g) => ['Oui', 'Non'].map((n) => groupe(page, g).getByRole('button', { name: n })))];
  for (const choix of choixSousLesLiens()) expect(await pointsPrisParUnLien(choix), await choix.getAttribute('aria-label') || await choix.textContent()).toBe(0);
  // La Durée ouverte (le lien garde alors la largeur de « 4 h ou moins ») : pareil, et la rangée des durées aussi.
  await lienDuree(page).click();
  await cibleEntiere(lienDuree(page), 'Durée ouverte');
  for (const choix of [...choixSousLesLiens(), ...await groupe(page, 'Durée de la nuit').getByRole('button').all()]) expect(await pointsPrisParUnLien(choix)).toBe(0);
  await lienDuree(page).click();
  // Contact et Sport restent côte à côte, de même hauteur, aussi hautes qu'en v7 (titre sur deux lignes).
  const [contact, sport] = await Promise.all([boite(carteDe(page, 'Contact humain')), boite(carteDe(page, 'Sport / mouvement'))]);
  expect(Math.abs(contact.y - sport.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(contact.h - sport.h)).toBeLessThanOrEqual(0.5);
  expect(sport.x).toBeGreaterThan(contact.x + contact.l);
});

// ---------- Sport et Contact en détail (Q5) ----------

test('« Détail › » du Sport et du Contact : fermé au départ, il ouvre le détail en pleine largeur sous la paire ; leurs replis ont quitté la liste', async ({ page }) => {
  await expect(page.locator('.replis .repli-titre')).toHaveText(['Ce qui a pesé · ce qui a rechargé', 'Notes libres']);
  for (const nom of ['Sport', 'Contact']) await expect(lienDetail(page, nom)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.carte-detail')).toHaveCount(0);

  await lienDetail(page, 'Sport').click();
  await expect(lienDetail(page, 'Sport')).toHaveAttribute('aria-expanded', 'true');
  const detailSport = page.locator('#detail-sport');
  await expect(detailSport).toBeVisible();
  await expect(detailSport.locator('.titre-rubrique')).toHaveText('Sport en détail');
  const [paire, sport] = await Promise.all([boite(page.locator('.deux-colonnes')), boite(detailSport)]);
  expect(Math.abs(sport.x - paire.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(sport.l - paire.l)).toBeLessThanOrEqual(0.5);
  expect(sport.y).toBeGreaterThanOrEqual(paire.bas);
  // Le détail s'utilise comme le repli : une activité posée dit « Oui ».
  await toucher(page, 'Activité 1 : type', 'Marche');
  await expect.poll(() => entreeDuJour(page)).toMatchObject({ sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: null }] });
  await expect(groupe(page, 'Sport / mouvement').getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');

  // Les deux ouverts : Contact puis Sport, dans l'ordre de la paire, le Traitement après.
  await lienDetail(page, 'Contact').click();
  await expect(page.locator('.carte-detail')).toHaveCount(2);
  expect(await page.locator('.carte-detail').evaluateAll((els) => els.map((e) => e.id))).toEqual(['detail-contact', 'detail-sport']);
  const [contact, traitement] = await Promise.all([boite(page.locator('#detail-contact')), boite(carteDe(page, 'Traitement pris'))]);
  expect(contact.y).toBeGreaterThanOrEqual(paire.bas);
  expect(traitement.y).toBeGreaterThanOrEqual((await boite(detailSport)).bas);
  await groupe(page, 'Contact 1 : avec qui').getByRole('button', { name: 'Famille' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.contacts).toEqual([{ avec: ['contactAvec:famille'], effet: null }]);

  // Ils se referment par leur lien, et ne se rouvrent pas seuls (même avec un détail noté).
  await lienDetail(page, 'Sport').click();
  await expect(detailSport).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.carte-detail')).toHaveCount(0);
  for (const nom of ['Sport', 'Contact']) await expect(lienDetail(page, nom)).toHaveAttribute('aria-expanded', 'false');
});

test('Sport et Contact séparés : chaque détail s\'ouvre sous sa propre carte', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.meta.ecrire('journee', {
    ordre: ['lieu', 'sommeil', 'contact', 'traitement', 'sport', 'humeur', 'explosions', 'positifs'], masques: ['explosions', 'humeur', 'nuit'],
  }));
  await page.reload();
  await expect(page.locator('.deux-colonnes')).toHaveCount(0);
  await lienDetail(page, 'Sport').click();
  const [sport, detail, positifs] = await Promise.all([boite(carteDe(page, 'Sport / mouvement')), boite(page.locator('#detail-sport')),
    boite(page.locator('.carte-champ:has(#points-positifs)'))]);
  expect(detail.y).toBeGreaterThanOrEqual(sport.bas);
  expect(positifs.y).toBeGreaterThanOrEqual(detail.bas);
  expect(Math.abs(detail.l - sport.l)).toBeLessThanOrEqual(0.5);
  await lienDetail(page, 'Contact').click();
  const [contact, detailContact, traitement] = await Promise.all([boite(carteDe(page, 'Contact humain')), boite(page.locator('#detail-contact')), boite(carteDe(page, 'Traitement pris'))]);
  expect(detailContact.y).toBeGreaterThanOrEqual(contact.bas);
  expect(traitement.y).toBeGreaterThanOrEqual(detailContact.bas);
});

// ---------- « Nuit en détail » ----------

test('« Nuit en détail » est masqué par défaut ; une nuit déjà notée s\'affiche toujours ; Réglages › Le soir le réaffiche', async ({ page }) => {
  const nuit = page.getByRole('button', { name: /^Nuit en détail/ });
  await expect(nuit).toHaveCount(0);
  // Une nuit de la v7 : le repli reste, avec son résumé et ses heures.
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-13', { sommeilRessenti: 'sommeil:mal', heureCoucher: '23:20', heureLever: '07:10', reveilsNocturnes: 1 }));
  await aller(page, '#/jour/2026-10-13');
  await expect(nuit).toBeVisible();
  await expect(nuit.locator('.repli-resume')).toHaveText('23:20 → 07:10 · 1 réveil');
  await nuit.click();
  await expect(page.locator('#coucher')).toHaveValue('23:20');
  await expect(lienDuree(page)).toHaveText('Durée');

  // Réglages › Le soir : la ligne « Nuit en détail », éteinte au départ ; allumée, le repli revient sur le soir.
  await aller(page, '#/reglages/journee');
  const ligne = page.locator('.ligne-champ-reglage', { hasText: 'Nuit en détail' });
  await expect(ligne).toContainText('coucher, lever, réveils');
  const interrupteur = page.getByRole('switch', { name: 'Afficher Nuit en détail' });
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: /^(Monter|Descendre) Nuit en détail/ })).toHaveCount(0);
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur']);
  await aller(page, '#/aujourdhui');
  await expect(nuit).toBeVisible();
  await expect(page.locator('.replis .repli-titre')).toHaveText(['Nuit en détail', 'Ce qui a pesé · ce qui a rechargé', 'Notes libres']);
  // Le repli garde son état ouvert d'un jour à l'autre, comme en v7.
  await expect(nuit).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#coucher').fill('23:40');
  await expect.poll(async () => (await entreeDuJour(page))?.heureCoucher).toBe('23:40');
  // Masqué de nouveau, il reste là un jour qui a un coucher.
  await aller(page, '#/reglages/journee');
  await interrupteur.click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.meta.lire('journee'))).masques).toEqual(['explosions', 'humeur', 'nuit']);
  await aller(page, '#/aujourdhui');
  await expect(nuit).toBeVisible();
});

// ---------- Lectures ----------

test('Analyse › Tous les chiffres : la durée de nuit vient des heures notées ; Coucher, Lever et Réveils seulement pour une période qui en a', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    for (const [date, heures] of [['2026-10-13', 6], ['2026-10-14', 8], ['2026-10-15', 7]]) await r.journal.patch(date, { sommeilRessenti: 'sommeil:moyen', heuresSommeil: heures });
  });
  await aller(page, '#/analyse');
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: '7 j' }).click();
  await page.getByRole('button', { name: /^Tous les chiffres/ }).click();
  const titres = page.locator('main .tuiles .tuile-titre');
  await expect(titres.filter({ hasText: 'Durée de nuit' })).toHaveCount(1);
  await expect(page.locator('main .tuiles .tuile', { hasText: 'Durée de nuit' }).locator('.tuile-valeur')).toHaveText('7 h 00');
  for (const nom of ['Coucher', 'Lever', 'Réveils']) await expect(titres.filter({ hasText: new RegExp(`^${nom}$`) }), nom).toHaveCount(0);
  // Des nuits anciennes sur la période : leurs tuiles reviennent.
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-12', { heureCoucher: '23:00', heureLever: '07:00', reveilsNocturnes: 2 }));
  await page.reload();
  await aller(page, '#/analyse');
  await page.getByRole('group', { name: 'Période' }).getByRole('button', { name: '7 j' }).click();
  const tous = page.getByRole('button', { name: /^Tous les chiffres/ });
  if (await tous.getAttribute('aria-expanded') !== 'true') await tous.click();
  for (const nom of ['Coucher', 'Lever', 'Réveils']) await expect(titres.filter({ hasText: new RegExp(`^${nom}$`) }), nom).toHaveCount(1);
  await expect(page.locator('main .tuiles .tuile', { hasText: 'Durée de nuit' }).locator('.tuile-valeur')).toHaveText('7 h 30');
});
