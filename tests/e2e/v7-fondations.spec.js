import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons, FAMILLES_ROUE } from '../aides/couleurs.js';

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

// Un choix fait, construit dans la page pour chaque teinte (et sans teinte), avec sa coche et une précision.
const choixParTeinte = (page) => page.evaluate((classes) => classes.map((classe) => {
  const g = document.createElement('div');
  g.className = classe ? `pastilles ${classe}` : 'pastilles';
  const b = document.createElement('button');
  b.className = 'pastille';
  b.setAttribute('aria-pressed', 'true');
  const coche = document.createElement('span');
  coche.className = 'coche';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke-width', '3');
  coche.append(svg);
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
    coche: getComputedStyle(coche).display !== 'none' && svg.getBoundingClientRect().width >= 15 && svg.getBoundingClientRect().width <= 16, trait: '3' };
  g.remove();
  return r;
}), [...Object.keys(TEINTES), null]);

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
