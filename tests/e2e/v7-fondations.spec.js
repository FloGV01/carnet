import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons, FAMILLES_ROUE } from '../aides/couleurs.js';
import { FAMILLES } from '../../public/js/domain/roue.js';

// v7 (1/9) · Fondations 2b : la sélection commune (fond -fill, texte -on, 600, coche, AA) sur tous les choix, en
// clair et en sombre, avec la couleur de la rubrique, du parcours ou de la famille d'émotions, et la couleur action
// sans teinte ; la barre d'onglets neutre. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const creerEpisode = (page, e) => page.evaluate(async (x) => (await window.__carnet.repo.episodes.creer(x)).id, e);
const COLERE = { date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:surcharge_sensorielle', intensite: 7 };

// Classe de teinte → couleur des jetons. Sans teinte : couleur action.
const TEINTES = {
  'teinte-lieu': 'lieu', 'teinte-sommeil': 'sommeil', 'teinte-contact': 'contact', 'teinte-sport': 'sport', 'teinte-trt': 'traitement',
  'teinte-pos': 'positifs', 'teinte-humeur': 'humeur', 'teinte-ep': 'episode', 'teinte-sy': 'symptome', 'teinte-difficile': 'difficile',
  'teinte-jour': 'difficile', 'teinte-energie': 'energie', 'teinte-expl': 'explosions',
  ...Object.fromEntries(FAMILLES_ROUE.map((f) => [`emo-${f}`, `emo-${f}`])),
};
const attendu = (t, couleur) => (couleur
  ? { fond: rgb(t[`c-${couleur}-fill`]), texte: rgb(t[`c-${couleur}-on`]) }
  : { fond: rgb(t.action), texte: rgb(t['action-on']) });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// Style final d'un choix (après le fondu de 150 ms) et de sa coche.
const styleDe = (loc) => loc.evaluate(async (e) => {
  await Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const s = getComputedStyle(e);
  const coche = e.querySelector(':scope > .coche');
  const svg = coche && coche.querySelector('svg');
  const petit = e.querySelector('small');
  return {
    fond: s.backgroundColor, texte: s.color, graisse: s.fontWeight,
    coche: Boolean(coche && getComputedStyle(coche).display !== 'none' && svg.getBoundingClientRect().width >= 15 && svg.getBoundingClientRect().width <= 16),
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
function verifierNonChoisi(s, fond, quoi) {
  expect(s.fond, `${quoi} : fond`).toBe(fond);
  expect(s.graisse, `${quoi} : graisse`).toBe('400');
  expect(s.coche, `${quoi} : sans coche`).toBe(false);
  expect(contraste(s.fond, s.texte), `${quoi} : AA`).toBeGreaterThanOrEqual(4.5);
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
      coche: getComputedStyle(coche).display !== 'none' && svg.getBoundingClientRect().width >= 15 && svg.getBoundingClientRect().width <= 16,
      trait: svg.getAttribute('stroke-width') };
    g.remove();
    return r;
  }), [...Object.keys(TEINTES), null]);
};

test('sélection commune 2b, en clair et en sombre : -fill, -on, 600 (700 pour un chiffre), coche, AA ; non choisi : sans coche, en 400', async ({ page }) => {
  const id = await creerEpisode(page, COLERE);
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/aujourdhui');
    await page.reload();
    await appPrete(page);
    // Une grille (Lieu), un segmenté (Sommeil), un Oui / Non (Contact humain) : la couleur de leur rubrique.
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    const bureau = groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' });
    const moyen = groupe(page, 'Sommeil').getByRole('button', { name: 'Sommeil : Moyen' });
    const oui = groupe(page, 'Contact humain').getByRole('button', { name: 'Contact humain : Oui' });
    await expect(bureau).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(bureau), attendu(t, 'lieu'), `${schema} Bureau`);
    verifierChoisi(await styleDe(moyen), attendu(t, 'sommeil'), `${schema} Moyen`);
    verifierChoisi(await styleDe(oui), attendu(t, 'contact'), `${schema} Oui`);
    // Non choisi, sur le fond de l'écran : --surface, sans bordure.
    const teletravail = groupe(page, 'Lieu').getByRole('button', { name: 'Télétravail' });
    verifierNonChoisi(await styleDe(teletravail), rgb(t.surface), `${schema} Télétravail`);
    expect(await teletravail.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('0px');
    expect((await teletravail.boundingBox()).height).toBeGreaterThanOrEqual(48);
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    await expect(bureau).toHaveAttribute('aria-pressed', 'false');
    verifierNonChoisi(await styleDe(bureau), rgb(t.surface), `${schema} Bureau effacé`);

    // Période de l'Analyse : couleur action, avec la coche.
    await aller(page, '#/analyse');
    const periode = groupe(page, 'Période');
    await periode.getByRole('button', { name: 'Période : 7 j' }).click();
    verifierChoisi(await styleDe(periode.getByRole('button', { name: 'Période : 7 j' })), attendu(t, null), `${schema} 7 j`);
    verifierNonChoisi(await styleDe(periode.getByRole('button', { name: 'Période : Tout' })), rgb(t.surface), `${schema} Tout`);

    // Dans un parcours : la couleur de l'épisode ; une précision en petit reste lisible ; un chiffre choisi est en 700.
    await aller(page, `#/episode/${id}`);
    const fiche = page.getByRole('dialog', { name: 'Épisode' });
    await fiche.getByRole('button', { name: /^Déclencheur/ }).click();
    const surcharge = fiche.getByRole('group', { name: 'Déclencheur' }).getByRole('button', { name: /^Surcharge sensorielle/ });
    await expect(surcharge).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(surcharge), attendu(t, 'episode'), `${schema} Surcharge sensorielle`);
    await fiche.getByRole('button', { name: 'Passer' }).click();
    await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
    await fiche.getByRole('button', { name: /^Intensité/ }).click();
    const sept = fiche.getByRole('button', { name: 'Intensité 7' });
    await expect(sept).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(sept), attendu(t, 'episode'), `${schema} Intensité 7`, '700');
    await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(fiche).toHaveCount(0);

    // Toutes les teintes, les 7 familles de la roue et l'absence de teinte.
    for (const c of await choixParTeinte(page)) verifierChoisi(c, attendu(t, c.classe ? TEINTES[c.classe] : null), `${schema} ${c.classe || 'sans teinte'}`);
  }
});

test('dans une carte, un choix non fait et un champ sont en --surface-2 ; sur le fond de l\'écran, en --surface', async ({ page }) => {
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
      const r = { carte: getComputedStyle(carte).backgroundColor, bordure: getComputedStyle(carte).borderTopWidth,
        rayon: getComputedStyle(carte).borderTopLeftRadius, choix: getComputedStyle(carte.querySelector('.pastille')).backgroundColor,
        champ: getComputedStyle(carte.querySelector('input')).backgroundColor };
      carte.remove();
      return r;
    });
    expect(fonds).toEqual({ carte: rgb(t.surface), bordure: '0px', rayon: '14px', choix: rgb(t['surface-2']), champ: rgb(t['surface-2']) });
    expect(await page.locator('#points-positifs').evaluate((z) => getComputedStyle(z).backgroundColor)).toBe(rgb(t.surface));
    // Le fond de la page, sans texture.
    expect(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundImage]))
      .toEqual([rgb(t.bg), 'none']);
  }
});

test('barre d\'onglets 2b, en clair et en sombre : neutre, icônes de 22, pilule de 56 × 30 en --surface-2 et libellé en 700 pour l\'onglet actif', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    for (const [hash, actif] of [['#/aujourdhui', 'Aujourd\'hui'], ['#/analyse', 'Analyse'], ['#/soins', 'Soins']]) {
      await aller(page, hash);
      const nav = page.getByRole('navigation', { name: 'Navigation principale' });
      await expect(nav.getByRole('link', { name: actif, exact: true })).toHaveAttribute('aria-current', 'page');
      const r = await nav.evaluate((n) => {
        const s = getComputedStyle(n);
        return {
          fond: s.backgroundColor, filet: `${s.borderTopWidth} ${s.borderTopColor}`, hauteur: Math.round(n.getBoundingClientRect().height),
          onglets: [...n.querySelectorAll('a')].map((a) => {
            const pilule = a.querySelector('.onglet-icone');
            const svg = a.querySelector('svg').getBoundingClientRect();
            const p = getComputedStyle(pilule);
            return {
              nom: a.textContent.trim(), actif: a.getAttribute('aria-current') === 'page', classe: a.className, couleur: getComputedStyle(a).color,
              graisse: getComputedStyle(a.querySelector('.onglet-libelle')).fontWeight, icone: `${svg.width}×${svg.height}`,
              pilule: `${pilule.getBoundingClientRect().width}×${pilule.getBoundingClientRect().height} ${p.borderTopLeftRadius} ${p.backgroundColor}`,
            };
          }),
        };
      });
      expect(r.fond).toBe(rgb(t.bg));
      expect(r.filet).toBe(`1px ${rgb(t.line)}`);
      expect(r.hauteur).toBe(50);
      expect(r.onglets.map((o) => o.nom)).toEqual(['Aujourd\'hui', 'Analyse', 'Historique', 'Soins', 'Réglages']);
      for (const o of r.onglets) {
        expect(o.classe, `${o.nom} : aucune teinte`).toBe('onglet');
        expect(o.icone).toBe('22×22');
        if (o.actif) {
          expect(o).toMatchObject({ couleur: rgb(t.text), graisse: '700', pilule: `56×30 10px ${rgb(t['surface-2'])}` });
        } else {
          expect(o).toMatchObject({ couleur: rgb(t['text-2']), graisse: '400', pilule: '56×30 10px rgba(0, 0, 0, 0)' });
        }
        expect(contraste(o.couleur, rgb(t.bg)), o.nom).toBeGreaterThanOrEqual(4.5);
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
  // « Traitement pris » tient sur une ligne, à côté de ses segments (390 de large).
  expect(await page.locator('.ligne-champ', { has: groupe(page, 'Traitement pris') }).locator('.rubrique').evaluate((r) => r.getClientRects().length && r.getBoundingClientRect().height)).toBeLessThanOrEqual(24);

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

test('boutons à coche faits à la main, en clair et en sombre : « C\'était vers… », Rappels et filtres de l\'Historique (coche, 600, AA)', async ({ page }) => {
  for (const schema of ['light', 'dark']) {
    const t = schema === 'dark' ? sombre : clair;
    await page.emulateMedia({ colorScheme: schema });
    // « C'était vers… », en couleur Humeur ; « Maintenant » est choisi tant qu'aucune heure ne l'est.
    await aller(page, '#/moment');
    const vue = page.getByRole('dialog', { name: 'Émotion du moment' });
    const bouton = vue.locator('.ligne-date > .btn-lien');
    if (await bouton.getAttribute('aria-expanded') !== 'true') await bouton.click();
    const vers = vue.getByRole('group', { name: 'C\'était vers…' });
    verifierChoisi(await styleDe(vers.getByRole('button', { name: 'Maintenant', exact: true })), attendu(t, 'humeur'), `${schema} vers Maintenant`);
    await vers.getByRole('button', { name: '12 h', exact: true }).click();
    verifierChoisi(await styleDe(vers.getByRole('button', { name: '12 h', exact: true })), attendu(t, 'humeur'), `${schema} vers 12 h`);
    verifierNonChoisi(await styleDe(vers.getByRole('button', { name: 'Maintenant', exact: true })), rgb(t.surface), `${schema} vers Maintenant non choisi`);
    await vue.getByRole('button', { name: 'Fermer', exact: true }).click();

    // Rappels : sans teinte, couleur action.
    await aller(page, '#/reglages/rappel');
    const heures = groupe(page, 'Heures des rappels');
    const dix = heures.getByRole('button', { name: '10 h', exact: true });
    await dix.click();
    await expect(dix).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(dix), attendu(t, null), `${schema} Rappels 10 h`);
    verifierNonChoisi(await styleDe(heures.getByRole('button', { name: '11 h', exact: true })), rgb(t.surface), `${schema} Rappels 11 h`);
    await dix.click();
    await expect(dix).toHaveAttribute('aria-pressed', 'false');

    // Filtres de l'Historique (dans leur carte : non choisi en --surface-2) : sans teinte, couleur action.
    await aller(page, '#/historique');
    const filtrer = page.getByRole('button', { name: 'Filtrer' });
    if (await filtrer.getAttribute('aria-expanded') !== 'true') await filtrer.click();
    const avec = groupe(page, 'Avec').getByRole('button', { name: 'Avec notes', exact: true });
    await avec.click();
    await expect(avec).toHaveAttribute('aria-pressed', 'true');
    verifierChoisi(await styleDe(avec), attendu(t, null), `${schema} Avec notes`);
    verifierNonChoisi(await styleDe(groupe(page, 'Avec').getByRole('button', { name: 'Avec explosions', exact: true })), rgb(t['surface-2']), `${schema} Avec explosions`);
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
    ['#/comprendre/rythmes', 'Mesure', ['Humeur', 'Nuits Mal', 'Explosions', 'Énergie basse']],
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

// Émotion du moment (v7, tâche 3) : la grappe des familles, mesurée une fois ses animations finies. Les rangées
// (bulles par hauteur), la taille du nom et celle de --t-sous, et le texte du nom (Range) dans le cercle, coins compris.
const grappe = (page) => page.locator('.bulles-familles').evaluate(async (g) => {
  await Promise.all(g.closest('.panneau-reponses').getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  const sonde = document.createElement('span');
  sonde.style.fontSize = 'var(--t-sous)';
  document.body.append(sonde);
  const tSous = parseFloat(getComputedStyle(sonde).fontSize);
  sonde.remove();
  const bulles = [...g.querySelectorAll('.bulle-famille')].map((b) => {
    const r = b.getBoundingClientRect();
    const nom = b.querySelector('.bulle-nom');
    const rg = document.createRange();
    rg.selectNodeContents(nom);
    const t = rg.getBoundingClientRect();
    const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
    return {
      nom: nom.textContent, choisi: b.getAttribute('aria-pressed') === 'true', haut: Math.round(r.top), centre: cx,
      largeur: r.width, hauteur: r.height, gauche: r.left, droite: r.right, lignes: rg.getClientRects().length,
      police: parseFloat(getComputedStyle(nom).fontSize),
      dedans: [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]].every(([x, y]) => Math.hypot(x - cx, y - cy) <= rayon),
    };
  });
  return { tSous, bulles };
});
// Rien ne dépasse des 390 px : ni la page, ni le panneau (de côté), ni un bouton du panneau. Mesuré une fois le fondu
// d'une vue fini (il part d'une échelle de 0,97).
const largeurs = (page) => page.locator('.panneau-reponses').evaluate(async (p) => {
  await Promise.all(p.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
  return { page: document.documentElement.scrollWidth, panneau: p.scrollWidth - p.clientWidth,
    boutons: [...p.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).length };
});

test('en grand texte (19, 21, 23), Émotion du moment : grappe 4-3 puis 2-3-2, nom des familles à --t-sous au moins et dans sa bulle ; rien ne déborde des 390 px, familles comme mots', async ({ page }) => {
  test.setTimeout(60000);
  await aller(page, '#/moment');
  const vue = page.getByRole('dialog', { name: 'Émotion du moment' });
  const familles = groupe(page, 'Émotion');
  await expect(familles).toBeVisible();
  const verifierGrappe = async (taille, quoi) => {
    const { tSous, bulles } = await grappe(page);
    // 4-3 au texte par défaut ; dès 19 px, 4 bulles ne tiennent plus avec un nom à --t-sous : 2-3-2.
    const rangees = [...new Set(bulles.map((b) => b.haut))].map((h) => bulles.filter((b) => b.haut === h).length);
    expect(rangees, quoi).toEqual(taille === 17 ? [4, 3] : [2, 3, 2]);
    expect(bulles.map((b) => b.nom), quoi).toEqual(FAMILLES.map((f) => f.libelle));
    for (const b of bulles) {
      const ici = `${quoi}, ${b.nom}${b.choisi ? ' (choisie)' : ''}`;
      expect(b.police, `${ici} : nom à --t-sous (${tSous} px) au moins`).toBeGreaterThanOrEqual(tSous - 0.01);
      expect([b.dedans, b.lignes], `${ici} : nom dans le cercle, sur une ligne`).toEqual([true, 1]);
      expect(Math.abs(b.largeur - b.hauteur), `${ici} : ronde`).toBeLessThanOrEqual(0.5);
      expect(b.largeur, `${ici} : 44 pt au moins`).toBeGreaterThanOrEqual(44);
      expect([b.gauche >= 0, b.droite <= 390], `${ici} : dans l'écran`).toEqual([true, true]);
    }
    // Chaque rangée est centrée dans l'écran (la grappe est symétrique).
    for (const h of new Set(bulles.map((b) => b.haut))) {
      const r = bulles.filter((b) => b.haut === h);
      expect(Math.abs((r[0].gauche + r[r.length - 1].droite) / 2 - 195), `${quoi} : rangée centrée`).toBeLessThanOrEqual(1);
    }
    expect(await largeurs(page), quoi).toEqual({ page: 390, panneau: 0, boutons: 0 });
    expect(await debordements(page), quoi).toEqual([]);
  };
  for (const taille of [17, 19, 21, 23]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    await verifierGrappe(taille, `texte de ${taille} px`);
    // Chaque famille tour à tour : la vue de ses mots, puis la grappe où elle est choisie (coche au-dessus du nom).
    for (const f of FAMILLES) {
      await familles.getByRole('button', { name: f.libelle, exact: true }).click();
      const mots = groupe(page, `Mots de la famille ${f.libelle}`);
      await expect(mots.getByRole('button')).toHaveCount(f.mots.length);
      const quoi = `texte de ${taille} px, mots de ${f.libelle}`;
      expect(await largeurs(page), quoi).toEqual({ page: 390, panneau: 0, boutons: 0 });
      expect(await debordements(page), quoi).toEqual([]);
      const hauteurs = await mots.getByRole('button').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
      for (const h of hauteurs) expect(h, quoi).toBeGreaterThanOrEqual(44);
      await vue.getByRole('button', { name: 'Familles', exact: true }).click();
      await expect(familles.getByRole('button', { name: f.libelle, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await verifierGrappe(taille, `texte de ${taille} px, ${f.libelle} choisie`);
    }
    // La dernière famille retouchée : plus d'émotion, pour repartir de rien à la taille suivante.
    await familles.getByRole('button', { name: FAMILLES.at(-1).libelle, exact: true }).click();
    await expect(familles.getByRole('button', { pressed: true })).toHaveCount(0);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});
