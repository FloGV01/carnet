import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, entreeDuJour, simulerZonesSures } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v8 (5/9) · Le sommeil en heures et en qualité (spec §7 bis), les détails dans leur carte (Q5) : la carte Sommeil,
// « Nuit en détail » masqué par défaut et réaffichable, « Détail › » du Sport et du Contact, le point de vigilance 3 (le
// soir avec les zones sûres de l'iPhone, en clair et en sombre, entre 0 h et 4 h, avec le bandeau), les lectures (résumé
// du jour, Analyse). v11 (2/11) : la durée se note sur la roue de la carte Sommeil, toujours visible (spec §5 ; le détail de
// la roue dans v11-roue.spec.js), à la place du lien « Durée › » et de sa rangée ; le soir ne tient plus sans défiler (spec
// §13) : tout ce qu'il faut toucher passe au-dessus de la bande, la page défilée. Données inventées.
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

const duree = (page) => groupe(page, 'Durée de la nuit');
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

// v11 (spec §13) : la page défilée jusqu'en bas, la marge de chaque élément au-dessus de la bande du bas (positive : il est
// au-dessus), et le défilement de côté.
const margesAFondDePage = (page, selecteurs) => page.evaluate((liste) => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const bande = document.querySelector('.actions-flottantes').getBoundingClientRect().top;
  return { large: document.documentElement.scrollWidth > window.innerWidth, marges: liste.map((x) => [x, bande - document.querySelector(x).getBoundingClientRect().bottom]) };
}, selecteurs);
const atteignable = (m, quoi) => {
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

// v8 (8/9, Q27) : avec les zones sûres de l'iPhone (390 × 844, 47 px en haut et 34 en bas, spec §12.7), à 21 h et entre 0 h
// et 4 h, puis avec le bandeau (relecture : il restait à 390 × 797 sans zones sûres, 34 px de plus que l'iPhone). v11 : la
// roue de la carte Sommeil (environ 54 px de plus, spec §13) fait défiler le soir ; la dernière carte passe au-dessus de
// la bande, la page défilée.
const vigilance3 = async (page, quoi) => {
  await soir(page);
  await expect(duree(page), quoi).toBeVisible();
  await expect(duree(page).locator('[aria-pressed="true"]'), quoi).toHaveCount(0);
  const [sommeil, traitement] = await Promise.all([boite(carteDe(page, 'Sommeil')), boite(carteDe(page, 'Traitement pris'))]);
  expect(sommeil.h - traitement.h, `${quoi} : la roue ajoute 60 px au plus à la carte Sommeil`).toBeLessThanOrEqual(60);
  atteignable(await margesAFondDePage(page, ['.carte-champ:has(#points-positifs)', '.carte-champ:has(#gratitudes)', '.fini-bouton']), quoi);
};

test('vigilance 3 · le soir, avec la roue de la carte Sommeil, se défile jusqu\'à sa dernière carte au-dessus de la bande avec les zones sûres de l\'iPhone, en clair et en sombre, à 21 h et entre 0 h et 4 h', async ({ page }) => {
  await simulerZonesSures(page);
  for (const [nom, heure] of [['21 h', new Date(2026, 9, 15, 21, 0)], ['01:30', new Date(2026, 9, 16, 1, 30)]]) {
    for (const [schema] of THEMES) {
      await page.emulateMedia({ colorScheme: schema });
      await page.clock.setSystemTime(heure);
      await viderBase(page);
      if (nom === '01:30') await expect(page.getByText('Encore jeudi jusqu\'à 4 h.', { exact: true })).toBeVisible();
      await vigilance3(page, `${schema} · ${nom}`);
    }
  }
});

// Avec le bandeau, le soir passait 28,4 px sous la bande (v8, test.fail(), décision ouverte) : v11, le soir défile (spec §13),
// et sa dernière carte passe au-dessus de la bande, bandeau compris.
test('vigilance 3 · avec le bandeau « Nouvelle version prête », le soir se défile encore jusqu\'à sa dernière carte au-dessus de la bande, avec les zones sûres de l\'iPhone, en clair et en sombre', async ({ page }) => {
  await simulerZonesSures(page);
  for (const [schema] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true }));
    await expect(page.locator('.bandeau')).toBeVisible();
    await vigilance3(page, `${schema} · bandeau`);
  }
});

// ---------- La Durée ----------
// v11 (2/11) : la roue de la carte Sommeil, toujours visible (spec §5), remplace « Durée › » et sa rangée de 7 pastilles.

test('la Durée, sur la roue sous Mal · Moyen · Bien : un toucher enregistre la nuit qui précède le jour, le résumé du jour la dit ; un second toucher l\'efface', async ({ page }) => {
  const d = duree(page);
  await expect(d.getByRole('button')).toHaveCount(13);
  // Dans la carte Sommeil, sous la qualité, de toute sa largeur, une cible de 44 de haut.
  const g = await d.evaluate((r) => {
    const carte = r.closest('.carte-champ');
    const [q, b] = [carte.querySelector('.segmente').getBoundingClientRect(), r.getBoundingClientRect()];
    return { sommeil: carte.classList.contains('teinte-sommeil'), sous: b.top >= q.bottom, bords: [Math.abs(b.left - q.left), Math.abs(b.right - q.right)], h: b.height };
  });
  expect(g.sommeil).toBe(true);
  expect(g.sous).toBe(true);
  for (const e of g.bords) expect(e).toBeLessThanOrEqual(0.5);
  expect(g.h).toBeGreaterThanOrEqual(44);

  await d.getByRole('button', { name: '6 h', exact: true }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil).toBe(6);
  await expect(d.getByRole('button', { name: '6 h', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-jour')).toHaveText('nuit 6 h');
  await toucher(page, 'Sommeil', 'Mal');
  await expect(page.locator('.resume-jour')).toHaveText('nuit mal · 6 h');
  // Une erreur se corrige tout de suite : un second toucher efface, un autre note.
  await d.getByRole('button', { name: '6 h', exact: true }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil ?? null).toBeNull();
  await expect(page.locator('.resume-jour')).toHaveText('nuit mal');
  await d.getByRole('button', { name: '4 h ou moins' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heuresSommeil).toBe(4);
  await expect(page.locator('.resume-jour')).toHaveText('nuit mal · 4 h ou moins');
  await expect(d.locator('[aria-pressed="true"]')).toHaveText(['4 h ou moins']);
});

test('la roue montre la nuit notée de chaque jour, jamais celle d\'un autre, à chaque ouverture et à chaque changement de jour', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-15', { sommeilRessenti: 'sommeil:bien', heuresSommeil: 9 }));
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-14', { heuresSommeil: 10 }));
  await page.reload();
  const notee = () => duree(page).locator('[aria-pressed="true"]');
  await expect(notee()).toHaveText(['9 h']);
  // La veille : sa propre nuit ; l'avant-veille, rien.
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect(notee()).toHaveText(['10 h ou plus']);
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-13$/);
  await expect(duree(page)).toBeVisible();
  await expect(notee()).toHaveCount(0);
  // Retour à aujourd'hui, puis une nouvelle ouverture de l'app.
  await page.getByRole('link', { name: 'Revenir à aujourd\'hui' }).click();
  await expect(notee()).toHaveText(['9 h']);
  await page.reload();
  await expect(notee()).toHaveText(['9 h']);
});

// La mise en page de la carte Sommeil : la carte, sa tête, la roue, et la largeur et la hauteur de chaque valeur (leur place
// suit le défilement de la bande), en coordonnées de la page.
const planSommeil = (page) => duree(page).evaluate((roue) => {
  const carte = roue.closest('.carte-champ');
  const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + window.scrollY, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
  return { carte: r(carte), tete: r(carte.querySelector('.tete-rubrique')), roue: r(roue),
    valeurs: [...roue.querySelectorAll('.roue-valeur')].map((b) => r(b).slice(2)) };
});

test('Durée : un choix ne change pas la mise en page (valeurs, roue, tête, carte), « 4 h ou moins » puis « 10 h ou plus », en clair et en sombre, à 390 et 375, au texte par défaut et en grand texte', async ({ page }) => {
  const d = duree(page);
  // Notée : en 700, à la couleur du texte de la rubrique ; non notée : en 400, à la couleur du texte.
  const style = (nom) => d.getByRole('button', { name: nom, exact: true }).evaluate((b) => [getComputedStyle(b).fontWeight, getComputedStyle(b).color]);
  for (const [schema, largeur, px] of [['light', 390, null], ['dark', 390, null], ['light', 375, null], ['dark', 375, null], ['light', 390, 21], ['light', 390, 23], ['light', 375, 21], ['light', 375, 23]]) {
    await page.emulateMedia({ colorScheme: schema });
    await page.setViewportSize({ width: largeur, height: 844 });
    await taillePolice(page, px);
    const quoi = `${schema} · ${largeur} · ${px ? `${px} px` : 'texte par défaut'}`;
    const t = schema === 'light' ? clair : sombre;
    await expect(d.locator('[aria-pressed="true"]')).toHaveCount(0);
    const avant = await planSommeil(page);
    // Toutes les valeurs de la même largeur, la plus longue en 700 comprise.
    for (const [l] of avant.valeurs) expect(Math.abs(l - avant.valeurs[0][0]), quoi).toBeLessThanOrEqual(0.5);
    for (const nom of ['4 h ou moins', '10 h ou plus']) {
      expect(await style(nom), `${quoi} · ${nom}`).toEqual(['400', rgb(t.text)]);
      await d.getByRole('button', { name: nom, exact: true }).click();
      await expect(d.getByRole('button', { name: nom, exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect(await planSommeil(page), `${quoi} · ${nom} choisi`).toEqual(avant);
      expect(await style(nom), `${quoi} · ${nom} choisi`).toEqual(['700', rgb(t['c-sommeil-text'])]);
    }
    await d.getByRole('button', { name: '10 h ou plus', exact: true }).click();
    await expect(d.locator('[aria-pressed="true"]')).toHaveCount(0);
    expect(await planSommeil(page), `${quoi} · effacé`).toEqual(avant);
  }
});

test('Durée en grand texte (21 à 28 px, 390 et 375), notée : rien ne déborde, la roue reste dans sa carte, ses valeurs gardent une même largeur et leur texte entier ; les liens gardent toute leur cible', async ({ page }) => {
  await toucher(page, 'Sommeil', 'Moyen');
  // La valeur la plus longue, notée : en 700.
  await duree(page).getByRole('button', { name: '4 h ou moins' }).click();
  await expect(duree(page).locator('[aria-pressed="true"]')).toHaveText(['4 h ou moins']);
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const px of [21, 23, 24, 26, 28]) {
      await taillePolice(page, px);
      const quoi = `${largeur} · ${px} px`;
      const g = await duree(page).evaluate((roue) => {
        const carte = roue.closest('.carte-champ').getBoundingClientRect();
        const r = roue.getBoundingClientRect();
        const debords = [];
        if (r.left < carte.left - 0.5 || r.right > carte.right + 0.5) debords.push('roue hors de la carte');
        const largeurs = [];
        for (const b of roue.querySelectorAll('.roue-valeur')) {
          if (b.scrollWidth > b.clientWidth || b.scrollHeight > b.clientHeight) debords.push(`${b.textContent} coupé`);
          largeurs.push(b.getBoundingClientRect().width);
        }
        return { debords, largeurs, bande: r.width };
      });
      expect(g.debords, quoi).toEqual([]);
      for (const l of g.largeurs) {
        expect(Math.abs(l - g.largeurs[0]), `${quoi} : même largeur`).toBeLessThanOrEqual(0.5);
        expect(l, `${quoi} : pas plus large que la bande`).toBeLessThanOrEqual(g.bande + 0.5);
      }
      for (const lien of [lienDetail(page, 'Contact'), lienDetail(page, 'Sport')]) await cibleEntiere(lien, `${quoi} · ${await lien.getAttribute('aria-label')}`);
    }
  }
});

// ---------- Les liens des cartes : 2b, AA, cibles ----------

// v11 : le contrôle reste sur Contact et Sport ; le Sommeil n'a plus de lien, sa roue garde sa surface comme les choix.
test('« Détail › » : sur la première ligne du titre, en couleur action 13/600, AA, des cibles de 44 qu\'on touche en entier, sans hauteur pour la carte ni surface prise aux choix', async ({ page }) => {
  await soir(page);
  await toucher(page, 'Sommeil', 'Bien');
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    for (const [lien, carte, titre] of [[lienDetail(page, 'Contact'), 'Contact humain', 'Contact humain'], [lienDetail(page, 'Sport'), 'Sport / mouvement', 'Sport / mouvement']]) {
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
  // « Sommeil : Bien » (choisi), Mal et Moyen, les valeurs de la roue, et les Oui / Non de Contact et Sport gardent toute
  // leur surface ; la carte Sommeil n'a aucun lien. v11 (3/11) : les valeurs des roues de Contact et de Sport, sous leurs
  // Oui / Non, aussi.
  await expect(carteDe(page, 'Sommeil').locator('.lien-rubrique')).toHaveCount(0);
  const choixSousLesLiens = [...['Mal', 'Moyen', 'Bien'].map((n) => groupe(page, 'Sommeil').getByRole('button', { name: n })),
    ...await duree(page).getByRole('button').all(),
    ...['Contact humain', 'Sport / mouvement'].flatMap((g) => ['Oui', 'Non'].map((n) => groupe(page, g).getByRole('button', { name: n }))),
    ...await groupe(page, 'Comment c\'était').getByRole('button').all(), ...await groupe(page, 'Durée du sport').getByRole('button').all()];
  for (const choix of choixSousLesLiens) expect(await pointsPrisParUnLien(choix), await choix.getAttribute('aria-label') || await choix.textContent()).toBe(0);
  // Contact et Sport restent côte à côte et de même hauteur (titre sur deux lignes ; v11 : leurs roues, de même hauteur,
  // sous Oui / Non).
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
  await expect(duree(page)).toBeVisible();
  await expect(duree(page).locator('[aria-pressed="true"]')).toHaveCount(0);

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
