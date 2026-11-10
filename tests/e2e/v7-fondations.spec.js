import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons, FAMILLES_ROUE } from '../aides/couleurs.js';

// v7 (1/9) · Fondations 2b : la sélection commune (fond -fill, texte -on, 600, coche, AA) sur tous les choix, en
// clair et en sombre, avec la couleur de la famille d'émotions, et la couleur action sans teinte ; la barre d'onglets
// neutre. v12 (3/9) : les rubriques et les parcours n'ont plus de couleur, un choix fait est un aplat d'accent (l'action),
// et un choix non fait est transparent, avec son contour. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00
// (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const creerEpisode = (page, e) => page.evaluate(async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const COLERE = { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:surcharge_sensorielle', intensite: 7 };

// Classe de teinte → couleur des jetons : les 7 familles de la roue. Sans teinte : couleur action, l'accent (v12). Une
// ancienne classe de rubrique, que le code pose encore ici ou là, ne colore plus rien.
const TEINTES = {
  'teinte-sommeil': null, 'teinte-humeur': null,
  ...Object.fromEntries(FAMILLES_ROUE.map((f) => [`emo-${f}`, `emo-${f}`])),
};
const attendu = (t, couleur) => (couleur
  ? { fond: rgb(t[`c-${couleur}-fill`]), texte: rgb(t[`c-${couleur}-on`]) }
  : { fond: rgb(t.action), texte: rgb(t['action-on']) });
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const contourDe = (t) => `${rgb(t.contour)} 0px 0px 0px 1px inset`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Style final d'un choix (après le fondu de 150 ms) et de sa coche, de 15 ou 16 px (arrondie : à une place hors du pixel
// entier, WebKit la mesure à 16,000008).
const styleDe = (loc) => loc.evaluate(async (e) => {
  await Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const s = getComputedStyle(e);
  const coche = e.querySelector(':scope > .coche');
  const svg = coche && coche.querySelector('svg');
  const petit = e.querySelector('small');
  return {
    fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight, contour: s.boxShadow,
    coche: Boolean(coche && getComputedStyle(coche).display !== 'none' && Math.round(svg.getBoundingClientRect().width) >= 15 && Math.round(svg.getBoundingClientRect().width) <= 16),
    trait: svg ? svg.getAttribute('stroke-width') : null,
    petit: petit ? getComputedStyle(petit).color : null,
  };
});
function verifierChoisi(s, { fond, texte }, quoi, graisse = '600') {
  expect(s.fond, `${quoi} : fond`).toBe(fond);
  expect(s.texte, `${quoi} : texte`).toBe(texte);
  expect(s.graisse, `${quoi} : graisse`).toBe(graisse);
  expect(s.coche, `${quoi} : coche`).toBe(true);
  expect(s.trait, `${quoi} : coche au trait de 3`).toBe('3');
  expect(contraste(s.fond, s.texte), `${quoi} : AA`).toBeGreaterThanOrEqual(4.5);
  if (s.petit) expect(contraste(s.petit, s.fond), `${quoi} : précision`).toBeGreaterThanOrEqual(4.5);
}
// Non choisi (v12) : transparent sur le fond qui est dessous (`dessous`), avec son contour, en 400, sans coche. Sur les
// écrans de l'émotion, un fond plein (`fond`), sans contour.
function verifierNonChoisi(s, quoi, { t, dessous, fond = TRANSPARENT }) {
  expect(s.fond, `${quoi} : fond`).toBe(fond);
  if (fond === TRANSPARENT) expect(s.contour, `${quoi} : contour`).toBe(contourDe(t));
  expect(s.graisse, `${quoi} : graisse`).toBe('400');
  expect(s.coche, `${quoi} : sans coche`).toBe(false);
  expect(contraste(fond === TRANSPARENT ? dessous : fond, s.texte), `${quoi} : AA`).toBeGreaterThanOrEqual(4.5);
}

// Un choix fait, construit dans la page pour chaque teinte (et sans teinte), avec une précision ; sa coche est celle
// de l'app (coche.js), prise sur un vrai bouton de l'écran : son trait est lu, pas supposé.
const choixParTeinte = async (page) => {
  await expect(page.locator('[role="group"] button > .coche').first()).toBeAttached();
  return page.evaluate((classes) => classes.map((classe) => {
    const g = document.createElement('div');
    g.className = classe ? `pastilles ${classe}` : 'pastilles';
    const b = document.createElement('button');
    b.className = 'pastille';
    b.setAttribute('aria-pressed', 'true');
    const coche = document.querySelector('[role="group"] button > .coche').cloneNode(true);
    const svg = coche.querySelector('svg');
    const texte = document.createElement('span');
    texte.className = 'texte-pastille';
    const petit = document.createElement('small');
    petit.textContent = 'précision';
    texte.append('Choix', petit);
    b.append(coche, texte);
    g.append(b);
    document.querySelector('.ecran').append(g);
    const [s, sp] = [getComputedStyle(b), getComputedStyle(petit)];
    const r = { classe, fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight, petit: sp.color,
      coche: getComputedStyle(coche).display !== 'none' && Math.round(svg.getBoundingClientRect().width) >= 15 && Math.round(svg.getBoundingClientRect().width) <= 16,
      trait: svg.getAttribute('stroke-width') };
    g.remove();
    return r;
  }), [...Object.keys(TEINTES), null]);
};

test('sélection commune, en clair et en sombre : l\'accent (une famille : -fill, -on), 600 (700 pour un chiffre), coche, AA ; non choisi : transparent, contour, sans coche, en 400', async ({ page }) => {
  const id = await creerEpisode(page, COLERE);
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await page.reload();
    await appPrete(page);
    // Une grille (Lieu), un segmenté (Sommeil), un Oui / Non (Contact humain) : l'accent (v12 : plus de couleur de rubrique).
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    const bureau = groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' });
    const moyen = groupe(page, 'Sommeil').getByRole('button', { name: 'Sommeil : Moyen' });
    const oui = groupe(page, 'Contact humain').getByRole('button', { name: 'Contact humain : Oui' });
    await expect(bureau).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(bureau), attendu(t, null), `${schema} Bureau`);
    verifierChoisi(await styleDe(moyen), attendu(t, null), `${schema} Moyen`);
    verifierChoisi(await styleDe(oui), attendu(t, null), `${schema} Oui`);
    // Non choisi, dans la carte de sa rubrique : transparent, son contour en box-shadow, sans bordure (v12).
    const teletravail = groupe(page, 'Lieu').getByRole('button', { name: 'Télétravail' });
    verifierNonChoisi(await styleDe(teletravail), `${schema} Télétravail`, { t, dessous: rgb(t.surface) });
    expect(await teletravail.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('0px');
    // 44 de haut au moins : la cible (sur Aujourd'hui, les choix des cartes font 44 ; jusqu'à la v10, le soir tenait ainsi
    // sans défiler).
    expect((await teletravail.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    await expect(bureau).toHaveAttribute('aria-pressed', 'false');
    verifierNonChoisi(await styleDe(bureau), `${schema} Bureau effacé`, { t, dessous: rgb(t.surface) });

    // Période de l'Analyse, sur le fond de l'écran : couleur action, avec la coche.
    await aller(page, '#/analyse');
    const periode = groupe(page, 'Période');
    await periode.getByRole('button', { name: 'Période : 7 j' }).click();
    verifierChoisi(await styleDe(periode.getByRole('button', { name: 'Période : 7 j' })), attendu(t, null), `${schema} 7 j`);
    verifierNonChoisi(await styleDe(periode.getByRole('button', { name: 'Période : Tout' })), `${schema} Tout`, { t, dessous: rgb(t.bg) });

    // Dans un parcours : l'accent (v12 : plus de couleur de l'épisode) ; une précision en petit reste lisible ; un chiffre
    // choisi est en 700.
    await aller(page, `#/episode/${id}`);
    const fiche = page.getByRole('dialog', { name: 'Épisode' });
    await fiche.getByRole('button', { name: /^Déclencheur/ }).click();
    const surcharge = fiche.getByRole('group', { name: 'Déclencheur' }).getByRole('button', { name: /^Surcharge sensorielle/ });
    await expect(surcharge).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(surcharge), attendu(t, null), `${schema} Surcharge sensorielle`);
    await fiche.getByRole('button', { name: 'Passer' }).click();
    await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
    await fiche.getByRole('button', { name: /^Intensité/ }).click();
    const sept = fiche.getByRole('button', { name: 'Intensité 7' });
    await expect(sept).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(sept), attendu(t, null), `${schema} Intensité 7`, '700');
    await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(fiche).toHaveCount(0);

    // Les 7 familles de la roue, deux anciennes classes de rubrique et l'absence de teinte.
    for (const c of await choixParTeinte(page)) verifierChoisi(c, attendu(t, c.classe ? TEINTES[c.classe] : null), `${schema} ${c.classe || 'sans teinte'}`);
  }
});

test('v12 : un choix non fait et un champ sont transparents, avec leur contour, dans une carte comme sur le fond de l\'écran', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await page.reload();
    await appPrete(page);
    const fonds = await page.evaluate(() => {
      const carte = document.createElement('div');
      carte.className = 'carte';
      carte.innerHTML = '<div class="pastilles"><button class="pastille" aria-pressed="false">Choix</button></div><input class="champ-ligne">';
      document.querySelector('.ecran').append(carte);
      const style = (e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).boxShadow];
      const r = { carte: getComputedStyle(carte).backgroundColor, bordure: getComputedStyle(carte).borderTopWidth,
        rayon: getComputedStyle(carte).borderTopLeftRadius, choix: style(carte.querySelector('.pastille')),
        champ: style(carte.querySelector('input')) };
      carte.remove();
      return r;
    });
    const transparent = ['rgba(0, 0, 0, 0)', `${rgb(t.contour)} 0px 0px 0px 1px inset`];
    expect(fonds).toEqual({ carte: rgb(t.surface), bordure: '0px', rayon: '16px', choix: transparent, champ: transparent });
    // Aujourd'hui (tâche 4) : la zone des points positifs est dans sa carte, « Mémo vocal » sur le fond de l'écran.
    const style = (loc) => loc.evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).boxShadow]);
    expect(await style(page.locator('#points-positifs'))).toEqual(transparent);
    expect(await style(page.getByRole('button', { name: 'Mémo vocal' }))).toEqual(transparent);
    // Le fond de la page, sans texture.
    expect(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundImage]))
      .toEqual([rgb(t.bg), 'none']);
  }
});

// v12 (4/9, spec §5.4) : la barre d'onglets façon iOS. Fond --barre, filet de 0,5 en haut (sur Aujourd'hui, la bande du bas
// le porte au-dessus d'elle) ; icônes de 25 au trait, libellés de 10 en 500, en --text-2 ; l'onglet actif en --accent-texte,
// avec son icône pleine et son libellé en 600, sans pilule.
test('barre d\'onglets façon iOS, en clair et en sombre : fond --barre, icônes de 25 ; l\'onglet actif en --accent-texte, icône pleine et libellé en 600, sans pilule', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    for (const [hash, actif] of [['#/aujourdhui', 'Aujourd\'hui'], ['#/analyse', 'Analyse'], ['#/bien-etre', 'Bien-être'], ['#/soins', 'Soins'], ['#/reglages', 'Réglages']]) {
      await aller(page, hash);
      const nav = page.getByRole('navigation', { name: 'Navigation principale' });
      await expect(nav.getByRole('link', { name: actif, exact: true })).toHaveAttribute('aria-current', 'page');
      const r = await nav.evaluate((n) => {
        const s = getComputedStyle(n);
        return {
          fond: s.backgroundColor, filet: s.boxShadow, bord: s.borderTopWidth, hauteur: Math.round(n.getBoundingClientRect().height),
          onglets: [...n.querySelectorAll('a')].map((a) => {
            const enveloppe = a.querySelector('.onglet-icone');
            const svg = a.querySelector('svg');
            const b = svg.getBoundingClientRect();
            const libelle = a.querySelector('.onglet-libelle');
            return {
              nom: a.textContent.trim(), actif: a.getAttribute('aria-current') === 'page', classe: a.className, couleur: getComputedStyle(a).color,
              graisse: getComputedStyle(libelle).fontWeight, taille: getComputedStyle(libelle).fontSize, icone: `${b.width}×${b.height}`,
              pleine: [...svg.querySelectorAll('path')].some((p) => p.getAttribute('fill') === 'currentColor'),
              pilule: getComputedStyle(enveloppe).backgroundColor,
            };
          }),
        };
      });
      const quoi = `${schema} · ${hash}`;
      expect(r.fond, quoi).toBe(rgb(t.barre));
      expect(r.bord, quoi).toBe('0px');
      expect(r.filet, quoi).toBe(hash === '#/aujourdhui' ? 'none' : `${rgb(t.line)} 0px 0.5px 0px 0px inset`);
      expect(r.hauteur).toBe(50);
      expect(r.onglets.map((o) => o.nom)).toEqual(['Aujourd\'hui', 'Analyse', 'Bien-être', 'Soins', 'Réglages']);
      for (const o of r.onglets) {
        expect(o.classe, `${o.nom} : aucune teinte`).toBe('onglet');
        expect([o.icone, o.taille, o.pilule], `${quoi} · ${o.nom}`).toEqual(['25×25', '10px', 'rgba(0, 0, 0, 0)']);
        if (o.actif) expect([o.couleur, o.graisse, o.pleine], `${quoi} · ${o.nom}`).toEqual([rgb(t['accent-texte']), '600', true]);
        else expect([o.couleur, o.graisse, o.pleine], `${quoi} · ${o.nom}`).toEqual([rgb(t['text-2']), '500', false]);
        expect(contraste(o.couleur, rgb(t.barre)), `${quoi} · ${o.nom}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

// ---------- Relecture de la tâche 1 : la coche ne change pas la largeur d'un choix ----------

// Boîtes des boutons d'un groupe, par rapport au groupe : [libellé, gauche, droite, haut]. (Le résumé des filtres de
// l'Historique, qui apparaît au-dessus d'eux, peut déplacer le groupe entier : ce sont les voisins qui comptent.)
const boites = (groupeLoc) => groupeLoc.evaluate(async (g) => {
  await Promise.all(g.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const o = g.getBoundingClientRect();
  return [...g.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent.trim(), r.left - o.left, r.right - o.left, r.top - o.top]; });
});
// Avant et après un toucher, chaque bouton du groupe reste où il était, au pixel près.
function memesPlaces(avant, apres, quoi) {
  expect(apres.map((b) => b[0]), quoi).toEqual(avant.map((b) => b[0]));
  avant.forEach(([nom, ...p], i) => p.forEach((x, k) => expect(Math.abs(apres[i][k + 1] - x), `${quoi} : ${nom}`).toBeLessThanOrEqual(1)));
}

test('un toucher ne déplace pas les voisins : Sommeil, Traitement pris, « C\'était vers… », Rappels, filtres de l\'Historique', async ({ page }) => {
  // Aujourd'hui : les segments à largeur naturelle, à droite de leur libellé. Choisir, puis effacer.
  for (const [nom, choix] of [['Sommeil', 'Moyen'], ['Sommeil', 'Mal'], ['Traitement pris', 'Oui'], ['Traitement pris', 'Partiel']]) {
    const g = groupe(page, nom);
    const avant = await boites(g);
    await toucher(page, nom, choix);
    await expect(g.getByRole('button', { name: `${nom} : ${choix}` })).toHaveAttribute('aria-pressed', 'true');
    memesPlaces(avant, await boites(g), `${nom} › ${choix}`);
    await toucher(page, nom, choix);
    await expect(g.getByRole('button', { name: `${nom} : ${choix}` })).toHaveAttribute('aria-pressed', 'false');
    memesPlaces(avant, await boites(g), `${nom} › ${choix} effacé`);
  }
  // « Traitement pris » : son titre tient sur une ligne, en tête de sa carte (2b, tâche 4).
  expect(await page.locator('.carte-champ', { has: groupe(page, 'Traitement pris') }).locator('.titre-rubrique').evaluate((r) => r.getBoundingClientRect().height)).toBeLessThanOrEqual(24);

  // « C'était vers… » : choisir 14 h retire la coche de « Maintenant » ; ni la 1re rangée ni la 2e ne glissent.
  await aller(page, '#/moment');
  const vue = page.getByRole('dialog', { name: 'Émotion du moment' });
  await vue.locator('.ligne-date > .btn-lien').click();
  const vers = vue.getByRole('group', { name: 'C\'était vers…' });
  await expect(vers.getByRole('button', { name: 'Maintenant', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const avantVers = await boites(vers);
  expect(new Set(avantVers.map((b) => Math.round(b[3]))).size, 'deux rangées au moins').toBeGreaterThan(1);
  for (const h of ['14 h', '6 h', 'Maintenant']) {
    await vers.getByRole('button', { name: h, exact: true }).click();
    await expect(vers.getByRole('button', { name: h, exact: true })).toHaveAttribute('aria-pressed', 'true');
    memesPlaces(avantVers, await boites(vers), `vers ${h}`);
  }
  await vue.getByRole('button', { name: 'Fermer', exact: true }).click();

  // Rappels : plusieurs heures choisies l'une après l'autre.
  await aller(page, '#/reglages/rappel');
  const heures = groupe(page, 'Heures des rappels');
  const avantHeures = await boites(heures);
  for (const h of ['8 h', '9 h', '8 h']) {
    await heures.getByRole('button', { name: h, exact: true }).click();
    memesPlaces(avantHeures, await boites(heures), `Rappels ${h}`);
  }

  // Filtres de l'Historique : une période (pastilles) et une bascule (« Avec »).
  await aller(page, '#/historique');
  await page.getByRole('button', { name: 'Filtrer' }).click();
  for (const [nom, choix] of [['Période', '7 j'], ['Avec', 'Avec explosions'], ['Avec', 'Avec notes']]) {
    const g = groupe(page, nom);
    const avant = await boites(g);
    await g.getByRole('button', { name: choix, exact: true }).click();
    await expect(g.getByRole('button', { name: choix, exact: true })).toHaveAttribute('aria-pressed', 'true');
    memesPlaces(avant, await boites(g), `${nom} › ${choix}`);
  }
});

test('boutons à coche faits à la main, en clair et en sombre : « C\'était vers… » (à l\'encre), Rappels et filtres de l\'Historique (coche, 600, AA)', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    // « C'était vers… » ; « Maintenant » est choisi tant qu'aucune heure ne l'est. v9 : sur l'écran noir de l'émotion, dans
    // les deux thèmes, un choix non fait avait le --surface du thème sombre ; v11 (8/11) : l'écran suit le thème, et un
    // choix non fait a le --surface du thème (blanc en clair, le même qu'avant en sombre), sans contour. v12 : un choix fait
    // y est à l'encre, le plein des ronds (--moment-plein), jamais en accent ni en couleur Humeur.
    await aller(page, '#/moment');
    const vue = page.getByRole('dialog', { name: 'Émotion du moment' });
    const bouton = vue.locator('.ligne-date > .btn-lien');
    if (await bouton.getAttribute('aria-expanded') !== 'true') await bouton.click();
    const vers = vue.getByRole('group', { name: 'C\'était vers…' });
    const encre = { fond: rgb(t['moment-plein']), texte: rgb(t['moment-plein-on']) };
    verifierChoisi(await styleDe(vers.getByRole('button', { name: 'Maintenant', exact: true })), encre, `${schema} vers Maintenant`);
    await vers.getByRole('button', { name: '12 h', exact: true }).click();
    verifierChoisi(await styleDe(vers.getByRole('button', { name: '12 h', exact: true })), encre, `${schema} vers 12 h`);
    const maintenant = await styleDe(vers.getByRole('button', { name: 'Maintenant', exact: true }));
    verifierNonChoisi(maintenant, `${schema} vers Maintenant non choisi`, { t, fond: rgb(t.surface) });
    expect(maintenant.contour, `${schema} vers Maintenant non choisi : sans contour`).toMatch(/^rgba\(0, 0, 0, 0\) /);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();

    // Rappels : sans teinte, couleur action.
    await aller(page, '#/reglages/rappel');
    const heures = groupe(page, 'Heures des rappels');
    const dix = heures.getByRole('button', { name: '10 h', exact: true });
    await dix.click();
    await expect(dix).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(dix), attendu(t, null), `${schema} Rappels 10 h`);
    verifierNonChoisi(await styleDe(heures.getByRole('button', { name: '11 h', exact: true })), `${schema} Rappels 11 h`, { t, dessous: rgb(t.bg) });
    await dix.click();
    await expect(dix).toHaveAttribute('aria-pressed', 'false');

    // Filtres de l'Historique (dans leur carte : non choisi transparent, avec son contour) : sans teinte, couleur action.
    await aller(page, '#/historique');
    const filtrer = page.getByRole('button', { name: 'Filtrer' });
    if (await filtrer.getAttribute('aria-expanded') !== 'true') await filtrer.click();
    const avec = groupe(page, 'Avec').getByRole('button', { name: 'Avec notes', exact: true });
    await avec.click();
    await expect(avec).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(avec), attendu(t, null), `${schema} Avec notes`);
    verifierNonChoisi(await styleDe(groupe(page, 'Avec').getByRole('button', { name: 'Avec explosions', exact: true })), `${schema} Avec explosions`, { t, dessous: rgb(t.surface) });
    await avec.click();
    await expect(avec).toHaveAttribute('aria-pressed', 'false');
  }
});

// Chaque bouton de choix visible : sa coche et son libellé restent dans sa boîte (marges comprises), dans l'écran.
const debordements = (page) => page.evaluate(() => {
  const fautes = [];
  for (const b of document.querySelectorAll('[role="group"] button[aria-pressed]')) {
    const r = b.getBoundingClientRect();
    if (!r.width) continue;
    const s = getComputedStyle(b);
    const [g, d] = [r.left + parseFloat(s.paddingLeft) - 0.5, r.right - parseFloat(s.paddingRight) + 0.5];
    const nom = `${b.closest('[role="group"]').getAttribute('aria-label')} › ${b.textContent.trim()}${b.getAttribute('aria-pressed') === 'true' ? ' (choisi)' : ''}`;
    for (const e of b.querySelectorAll('.coche svg, .libelle-choix')) {
      const q = e.getBoundingClientRect();
      if (q.width && (q.left < g || q.right > d)) fautes.push(nom);
    }
    if (r.left < -0.5 || r.right > innerWidth + 0.5) fautes.push(`${nom} : hors de l'écran`);
  }
  return [...new Set(fautes)];
});

test('en grand texte (19, 21, 23), aucun choix ne déborde de sa boîte : Soins, Historique, Comprendre ; ses voisins ne bougent pas', async ({ page }) => {
  // [écran, groupe, ses choix] : chaque choix est fait tour à tour.
  const CAS = [
    ['#/soins', 'Soins', ['Rendez-vous', 'Notes', 'Traitement']],
    ['#/historique', 'Afficher', ['Jours', 'Épisodes', 'Symptômes']],
    ['#/comprendre/explosions', 'Comprendre', ['Explosions', 'Énergie', 'Rythmes']],
    ['#/comprendre/explosions', 'Avant ou après', ['Avant', 'Après']],
    ['#/comprendre/rythmes', 'Période', ['3 mois', 'Tout']],
    ['#/comprendre/rythmes', 'Mesure', ['Émotions', 'Nuits Mal', 'Explosions', 'Énergie basse']],
  ];
  for (const [hash, nom, choix] of CAS) {
    await aller(page, hash);
    const g = groupe(page, nom);
    await expect(g).toBeVisible();
    for (const taille of [17, 19, 21, 23]) {
      await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
      let avant = null;
      for (const c of choix) {
        const b = g.getByRole('button', { name: `${nom} : ${c}` });
        await b.click();
        await expect(b).toHaveAttribute('aria-pressed', 'true');
        // Comprendre change d'écran à chaque onglet : on attend le nouveau.
        await expect(g).toBeVisible();
        expect(await debordements(page), `${hash}, texte de ${taille} px, ${c} choisi`).toEqual([]);
        const ici = await boites(g);
        if (avant) memesPlaces(avant, ici, `${hash}, texte de ${taille} px, ${c} choisi`);
        avant = ici;
      }
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
});
