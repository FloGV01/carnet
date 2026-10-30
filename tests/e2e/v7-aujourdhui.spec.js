import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, entreeDuJour, simulerZonesSures } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v7 (4/9) · Aujourd'hui 2b : en-tête « Jeudi 15 octobre », rubriques du soir en cartes, replis en liste groupée,
// Ma journée et le résumé avec les émotions (spec §5), bande du bas avec « Émotion » (P5), changer de jour en glissant
// (B4). Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844, sauf mention).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const THEMES = [['light', clair], ['dark', sombre]];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const boite = (page, selecteur) => page.locator(selecteur).first().boundingBox();
// Le titre du jour tel qu'il est affiché, sans « Aujourd'hui, » (réservé à VoiceOver).
const titreVu = (page) => page.locator('h1').evaluate((h) => [...h.childNodes]
  .filter((n) => !n.classList || !n.classList.contains('visuellement-cache')).map((n) => n.textContent).join('').trim());

// ---------- Le soir en cartes, sans défilement ----------

// Une carte de rubrique : son fond, son rayon, son carré (taille, couleur, icône) et son titre.
const carteDe = (page, nom) => page.locator('.carte-champ', { has: groupe(page, nom) }).evaluate((c) => {
  const s = getComputedStyle(c);
  const carre = c.querySelector('.carre-rubrique');
  const titre = c.querySelector('.titre-rubrique');
  const r = carre.getBoundingClientRect();
  return {
    fond: s.backgroundColor, rayon: s.borderTopLeftRadius, carre: [Math.round(r.width), Math.round(r.height)], rayonCarre: getComputedStyle(carre).borderTopLeftRadius,
    fondCarre: getComputedStyle(carre).backgroundColor, icone: getComputedStyle(carre.querySelector('svg')).color,
    titre: titre.textContent, couleurTitre: getComputedStyle(titre).color, graisse: getComputedStyle(titre).fontWeight,
  };
});

// v8 (8/9, Q27) : avec les zones sûres de l'iPhone (390 × 844, 47 px en haut et 34 en bas, spec §12.7), au lieu de 390 × 797
// sans elles : 34 px de moins pour le soir.
test('le soir tient sans défilement avec les zones sûres de l\'iPhone, en clair et en sombre : six rubriques en cartes 2b, au-dessus de la bande', async ({ page }) => {
  await simulerZonesSures(page);
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    await toucher(page, 'Sport / mouvement', 'Non');
    await toucher(page, 'Traitement pris', 'Oui');
    await expect.poll(async () => (await entreeDuJour(page))?.traitementPris).toBe('traitementPris:oui');
    expect(await page.evaluate(() => window.scrollY), schema).toBe(0);
    // De l'en-tête à la carte des points positifs, tout est à l'écran, au-dessus de la bande, sans débord de côté.
    const [titre, positifs, bande, onglets] = await Promise.all([boite(page, 'h1'), boite(page, '.carte-champ:has(#points-positifs)'),
      boite(page, '.actions-flottantes'), page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox()]);
    expect(titre.y).toBeGreaterThanOrEqual(47);
    expect(positifs.y + positifs.height, schema).toBeLessThanOrEqual(bande.y);
    expect(Math.abs(bande.y + bande.height - onglets.y)).toBeLessThanOrEqual(0.5);
    expect(Math.round(bande.height)).toBe(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Chaque rubrique : une carte --surface de rayon 14, un carré de 28 (rayon 7) à sa couleur, l'icône en -on, le titre en 600.
    for (const [nom, couleur, libelle] of [['Lieu', 'lieu', 'Lieu'], ['Sommeil', 'sommeil', 'Sommeil'], ['Contact humain', 'contact', 'Contact humain'],
      ['Sport / mouvement', 'sport', 'Sport / mouvement'], ['Traitement pris', 'traitement', 'Traitement pris']]) {
      const c = await carteDe(page, nom);
      const quoi = `${schema} · ${nom}`;
      expect(c.fond, quoi).toBe(rgb(t.surface));
      expect(c.rayon, quoi).toBe('14px');
      expect(c.carre, quoi).toEqual([28, 28]);
      expect(c.rayonCarre, quoi).toBe('7px');
      expect(c.fondCarre, quoi).toBe(rgb(t[`c-${couleur}`]));
      expect(c.icone, quoi).toBe(rgb(t[`c-${couleur}-on`]));
      expect(c.titre, quoi).toBe(libelle);
      expect(c.graisse, quoi).toBe('600');
      expect(contraste(c.couleurTitre, c.fond), quoi).toBeGreaterThanOrEqual(4.5);
    }
    // Les choix d'une carte font 44 de haut (la cible ; 48 dans le lot, mais « J'ai fini » et la ligne Après coup doivent
    // tenir au-dessus de la bande à 390 × 844), ceux de Lieu en grille de 3.
    const lieu = await groupe(page, 'Lieu').evaluate((g) => ({ colonnes: getComputedStyle(g).gridTemplateColumns.split(' ').length, h: [...g.children].map((b) => b.getBoundingClientRect().height) }));
    expect(lieu.colonnes).toBe(3);
    for (const h of lieu.h) expect(h).toBe(44);
    // Contact et Sport côte à côte, de même hauteur, leurs Oui / Non sur une même ligne.
    const [contact, sport] = await Promise.all(['Contact humain', 'Sport / mouvement'].map((n) => groupe(page, n).boundingBox()));
    expect(Math.abs(contact.y - sport.y)).toBeLessThanOrEqual(0.5);
    expect(sport.x).toBeGreaterThan(contact.x + contact.width);
  }
});

test('« J\'ai fini pour ce soir » : en couleur action, sans fond, avec son icône', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await toucher(page, 'Lieu', 'Bureau');
    const fini = page.getByRole('button', { name: 'J\'ai fini pour ce soir' });
    await expect(fini).toBeVisible();
    const s = await fini.evaluate((b) => ({ couleur: getComputedStyle(b).color, fond: getComputedStyle(b).backgroundColor, graisse: getComputedStyle(b).fontWeight, icone: Boolean(b.querySelector('svg')) }));
    expect(s.couleur, schema).toBe(rgb(t.action));
    expect(s.fond, schema).toBe('rgba(0, 0, 0, 0)');
    expect(s.graisse).toBe('600');
    expect(s.icone).toBe(true);
    const memo = await page.getByRole('button', { name: 'Mémo vocal' }).evaluate((b) => getComputedStyle(b).backgroundColor);
    expect(memo, `${schema} · Mémo vocal neutre`).toBe(rgb(t.surface));
  }
});

// ---------- Sans défiler : Après coup (P2), « J'ai fini » (P3), après minuit, bandeau de mise à jour ----------
// v8 (relecture de la tâche 8) : avec les zones sûres de l'iPhone (390 × 844, 47 px en haut et 34 en bas, spec §12.7), et
// non plus aux tailles de la v7 (844 et 797 sans zones), qui laissaient 34 px de plus que l'iPhone et restaient vertes
// sans rien protéger. Le soir tient (28,3 px de marge) ; « J'ai fini pour ce soir » (−19,7 px), la ligne Après coup
// (−69,7 px) et, avec le bandeau, le soir (−28,4 px) passent sous la bande. Ces attentes sont marquées test.fail() :
// la mise en page est une décision ouverte de l'utilisateur (docs/decisions.md, v8, « Fiabilité (tâche 8) », à trancher
// sur l'iPhone, où le Diagnostic donne les vraies marges). Un test.fail() qui passe fait échouer la suite : une fois la
// mise en page corrigée, on retire la marque.

// La marge de chaque élément au-dessus de la bande du bas (positive : il est au-dessus), et le défilement de la page.
const margesSurLaBande = (page, selecteurs) => page.evaluate((liste) => {
  const bande = document.querySelector('.actions-flottantes').getBoundingClientRect().top;
  return { scrollY: window.scrollY, marges: liste.map((x) => [x, bande - document.querySelector(x).getBoundingClientRect().bottom]) };
}, selecteurs);
const toutAuDessus = (m, quoi) => {
  expect(m.scrollY, quoi).toBe(0);
  for (const [x, marge] of m.marges) expect(marge, `${quoi} · ${x}`).toBeGreaterThanOrEqual(0);
};
const bandeau = async (page) => {
  await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true }));
  await expect(page.locator('.bandeau')).toBeVisible();
};

test('P2 · avec un épisode récent, la ligne Après coup se voit sans défiler, sous « J\'ai fini pour ce soir », en clair et en sombre, avec les zones sûres de l\'iPhone', async ({ page }) => {
  test.fail(true, 'décision ouverte (docs/decisions.md, v8, tâche 8) : la ligne Après coup est 69,7 px sous la bande');
  await simulerZonesSures(page);
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await repo(page, () => window.__carnet.repo.episodes.creer({ date: '2026-10-14', heure: '18:42', emotion: 'emotion:colere', intensite: 5 }));
    await page.reload();
    await toucher(page, 'Lieu', 'Bureau');
    await expect(page.getByRole('link', { name: /Après coup \(TCC\) · tes épisodes récents/ })).toBeVisible();
    toutAuDessus(await margesSurLaBande(page, ['.carte-champ:has(#points-positifs)', '.ligne-apres-coup-jour']), schema);
  }
});

test('P3 · « J\'ai fini pour ce soir » se voit sans défiler, au-dessus de la bande, à 21 h et entre 0 h et 4 h, en clair et en sombre, avec les zones sûres de l\'iPhone', async ({ page }) => {
  test.fail(true, 'décision ouverte (docs/decisions.md, v8, tâche 8) : « J\'ai fini pour ce soir » est 19,7 px sous la bande');
  await simulerZonesSures(page);
  for (const [schema] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    for (const heure of [new Date(2026, 9, 15, 21, 0), new Date(2026, 9, 16, 1, 30)]) {
      await page.clock.setSystemTime(heure);
      await viderBase(page);
      await toucher(page, 'Lieu', 'Bureau');
      await expect(page.getByRole('button', { name: 'J\'ai fini pour ce soir' })).toBeVisible();
      toutAuDessus(await margesSurLaBande(page, ['.fini-bouton']), `${schema} · ${heure.getHours()} h`);
    }
  }
});

test('après minuit, « Encore jeudi jusqu\'à 4 h. » est sur la ligne du résumé, sans hauteur : le soir tient sans défiler avec les zones sûres de l\'iPhone', async ({ page }) => {
  await simulerZonesSures(page);
  // À 21 h, la première carte est à cette hauteur ; à 01:30, elle n'a pas bougé.
  const hautPremiereCarte = () => page.locator('.carte-champ').first().evaluate((c) => c.getBoundingClientRect().top);
  await toucher(page, 'Lieu', 'Bureau');
  const aVingtEtUneHeures = await hautPremiereCarte();
  await page.clock.setSystemTime(new Date(2026, 9, 16, 1, 30));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Aujourd\'hui, Jeudi 15 octobre');
  const veille = page.locator('.sous-jour').getByText('Encore jeudi jusqu\'à 4 h.', { exact: true });
  await expect(veille).toBeVisible();
  await expect(page.locator('.resume-jour')).toHaveText('Bureau');
  const [v, r] = await Promise.all([veille.boundingBox(), boite(page, '.resume-jour')]);
  expect(Math.abs(v.y - r.y), 'sur la ligne du résumé').toBeLessThanOrEqual(1);
  expect(v.x + v.width).toBeLessThanOrEqual(r.x);
  expect(await hautPremiereCarte()).toBe(aVingtEtUneHeures);
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await expect(veille).toBeVisible();
    toutAuDessus(await margesSurLaBande(page, ['.carte-champ:has(#points-positifs)']), schema);
  }
});

test('bandeau « Nouvelle version prête » : son texte, puis ses deux boutons côte à côte, avec les zones sûres de l\'iPhone', async ({ page }) => {
  await simulerZonesSures(page);
  await toucher(page, 'Lieu', 'Bureau');
  await bandeau(page);
  const b = await page.locator('.bandeau').evaluate((x) => {
    const [texte, sauvegarder, recharger] = [...x.children].map((k) => k.getBoundingClientRect());
    // Sa hauteur sous l'encoche : la zone sûre du haut lui revient (Q27, tests/e2e/v8-fiabilite.spec.js).
    return { hauteur: x.getBoundingClientRect().height - parseFloat(getComputedStyle(x).paddingTop), texte, sauvegarder, recharger };
  });
  expect(b.texte.top).toBeGreaterThanOrEqual(47);
  expect(b.hauteur).toBeLessThanOrEqual(68);
  expect(b.sauvegarder.top).toBeGreaterThanOrEqual(b.texte.bottom - 0.5);
  expect(Math.abs(b.sauvegarder.top - b.recharger.top), 'côte à côte').toBeLessThanOrEqual(0.5);
  expect(Math.min(b.sauvegarder.height, b.recharger.height)).toBeGreaterThanOrEqual(44);
});

test('bandeau « Nouvelle version prête » : « J\'ai fini pour ce soir » se voit encore sans défiler, avec les zones sûres de l\'iPhone', async ({ page }) => {
  test.fail(true, 'décision ouverte (docs/decisions.md, v8, tâche 8) : avec le bandeau, « J\'ai fini pour ce soir » est 74,4 px sous la bande');
  await simulerZonesSures(page);
  await toucher(page, 'Lieu', 'Bureau');
  await bandeau(page);
  await expect(page.getByRole('button', { name: 'J\'ai fini pour ce soir' })).toBeVisible();
  toutAuDessus(await margesSurLaBande(page, ['.fini-bouton']), 'bandeau');
});

// ---------- Grand texte ----------

test('grand texte (17 à 28 px, 390 et 375) : rien ne sort des cartes, choix faits compris ; les titres des demi-cartes ont un interligne à leur taille, puis Contact et Sport passent l\'un sous l\'autre', async ({ page }) => {
  // Les choix les plus larges, faits : leur coche compte.
  await toucher(page, 'Lieu', 'Congé / repos');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Contact humain', 'Non');
  await toucher(page, 'Sport / mouvement', 'Oui');
  await toucher(page, 'Traitement pris', 'Partiel');
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const px of [17, 21, 24, 28]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; document.body.style.fontSize = `${t}px`; }, px);
      const quoi = `${largeur} · ${px} px`;
      const m = await page.evaluate(() => {
        const debords = [];
        const interlignes = [];
        for (const c of document.querySelectorAll('.carte-champ')) {
          const carte = c.getBoundingClientRect();
          if (c.scrollWidth > c.clientWidth) debords.push(`carte ${c.className}`);
          for (const k of c.querySelectorAll('button, .titre-rubrique')) {
            if (k.scrollWidth > k.clientWidth) debords.push(k.textContent.trim());
            if (k.getBoundingClientRect().right > carte.right + 0.5) debords.push(`${k.textContent.trim()} hors de sa carte`);
          }
          // Les lignes d'un titre : chacune au moins 1,1 fois la taille du texte sous la précédente.
          const titre = c.querySelector('.titre-rubrique');
          const plage = document.createRange();
          plage.selectNodeContents(titre);
          const hauts = [...new Set([...plage.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top * 10) / 10))].sort((a, b) => a - b);
          for (let i = 1; i < hauts.length; i++) interlignes.push([titre.textContent, (hauts[i] - hauts[i - 1]) / Number.parseFloat(getComputedStyle(titre).fontSize)]);
        }
        const [contact, sport] = [...document.querySelectorAll('.deux-colonnes > .carte-champ')].map((c) => c.getBoundingClientRect());
        return { debords, interlignes, cote: Math.abs(contact.top - sport.top) < 1, pageLarge: document.documentElement.scrollWidth > window.innerWidth };
      });
      expect(m.debords, quoi).toEqual([]);
      for (const [titre, pas] of m.interlignes) expect(pas, `${quoi} · ${titre}`).toBeGreaterThanOrEqual(1.1);
      expect(m.pageLarge, quoi).toBe(false);
      if (px === 17) expect(m.cote, `${quoi} : Contact et Sport côte à côte`).toBe(true);
      if (px >= 24) expect(m.cote, `${quoi} : Contact et Sport l'un sous l'autre`).toBe(false);
    }
  }
  // À 21 px sur 390, ils sont encore côte à côte, « Sport / mouvement » sur deux lignes.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '21px'; document.body.style.fontSize = '21px'; });
  const [contact, sport] = await Promise.all(['Contact humain', 'Sport / mouvement'].map((n) => groupe(page, n).boundingBox()));
  expect(Math.abs(contact.y - sport.y)).toBeLessThanOrEqual(0.5);
});

// ---------- En-tête ----------

test('en-tête 2b : « Jeudi 15 octobre » en 23/600 avec un chevron bas, ‹ en couleur action, › atténué sur aujourd\'hui', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    // Affiché : « Jeudi 15 octobre » ; lu par VoiceOver : « Aujourd'hui, Jeudi 15 octobre ».
    const titre = page.getByRole('heading', { level: 1 });
    await expect(titre).toHaveAccessibleName('Aujourd\'hui, Jeudi 15 octobre');
    expect(await titreVu(page)).toBe('Jeudi 15 octobre');
    const s = await page.locator('.entete-jour').evaluate((e) => {
      const h1 = e.querySelector('h1');
      const chevron = e.querySelector('h1 svg').getBoundingClientRect();
      const date = e.querySelector('input[type="date"]').getBoundingClientRect();
      const [precedent, suivant] = [...e.querySelectorAll('.nav-jour')];
      const r = h1.getBoundingClientRect();
      return {
        taille: Math.round(Number.parseFloat(getComputedStyle(h1).fontSize)), graisse: getComputedStyle(h1).fontWeight, chevron: [Math.round(chevron.width), chevron.right <= r.right && chevron.top >= r.top && chevron.bottom <= r.bottom],
        couleurChevron: getComputedStyle(e.querySelector('h1 svg')).color,
        dateCouvre: date.left <= r.left && date.right >= r.right && date.top <= r.top && date.bottom >= r.bottom,
        precedent: [getComputedStyle(precedent).color, precedent.getBoundingClientRect().width, precedent.getBoundingClientRect().left > r.right],
        suivant: [getComputedStyle(suivant).opacity, suivant.disabled, suivant.getBoundingClientRect().height],
      };
    });
    expect(s.taille).toBe(23);
    expect(s.graisse).toBe('600');
    expect(s.chevron).toEqual([16, true]);
    expect(s.couleurChevron, schema).toBe(rgb(t['text-2']));
    expect(s.dateCouvre, 'le titre ouvre le sélecteur de date').toBe(true);
    expect(s.precedent, schema).toEqual([rgb(t.action), 44, true]);
    expect(s.suivant).toEqual(['0.4', true, 44]);
  }
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Mercredi 14 octobre');
  expect(await page.getByRole('button', { name: 'Jour suivant' }).evaluate((b) => [b.disabled, getComputedStyle(b).opacity])).toEqual([false, '1']);
});

// ---------- Ma journée et le résumé (point de vigilance 5) ----------

// v9 (tâche 3) : les points prennent la couleur de la zone du mot ; une famille seule de la v7 n'a pas de zone, point creux.
test('point de vigilance 5 · Ma journée mêle un ancien relevé chiffré et des relevés à émotion, dans l\'ordre des heures ; le résumé montre les zones du jour', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-15', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '18:30', emotion: 'roue:serenite', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.episodes.creer({ date: '2026-10-15', heure: '12:30', emotion: 'emotion:colere', intensite: 5 });
    await r.humeurs.creer({ date: '2026-10-15', heure: '09:05', emotion: 'roue:colere:irrite', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '14:00', vers: true, emotion: 'roue:colere:furieux', energie: null });
    // Le lendemain, avant 4 h : encore le 15 (jour logique).
    await r.humeurs.creer({ date: '2026-10-16', heure: '01:10', emotion: 'roue:peur:craintif', energie: null });
  });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
    const lignes = await page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => {
      const point = li.querySelector('.point-evenement');
      const s = getComputedStyle(point);
      return {
        heure: li.querySelector('.heure').textContent, texte: li.querySelector('.resume').textContent, lien: Boolean(li.querySelector('a')),
        point: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? `creux ${s.borderTopColor}` : s.backgroundColor,
      };
    }));
    // Le point d'un relevé à zone : la couleur des bulles (-fill, relecture finale de la v9), son liseré à l'accent.
    expect(lignes, schema).toEqual([
      { heure: '09:05', texte: 'Irrité · énergie basse', lien: true, point: rgb(t['c-zone-rouge-fill']) },
      { heure: '10:20', texte: 'humeur 6 · énergie moyenne', lien: true, point: `creux ${rgb(t['text-2'])}` },
      { heure: '12:30', texte: 'Colère · 5', lien: true, point: rgb(t['c-episode']) },
      { heure: 'vers 14 h', texte: 'Furieux', lien: true, point: rgb(t['c-zone-rouge-fill']) },
      { heure: '18:30', texte: 'Sérénité', lien: true, point: `creux ${rgb(t['text-2'])}` },
      { heure: '01:10', texte: 'Craintif', lien: true, point: rgb(t['c-zone-rouge-fill']) },
    ]);
    // Colonne d'heures de 70 au texte par défaut (elle suit le corps en grand texte), textes alignés ; AA du texte et de
    // l'heure sur la carte.
    const colonnes = await page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => {
      const h = li.querySelector('.heure');
      const fond = getComputedStyle(li.closest('.liste-evenements')).backgroundColor;
      return { largeur: h.getBoundingClientRect().width, texte: Math.round(li.querySelector('.resume').getBoundingClientRect().left),
        aa: [getComputedStyle(h).color, getComputedStyle(li.querySelector('.resume')).color, fond] };
    }));
    for (const c of colonnes) {
      expect(c.largeur).toBe(70);
      expect(contraste(c.aa[0], c.aa[2])).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.aa[1], c.aa[2])).toBeGreaterThanOrEqual(4.5);
    }
    expect(new Set(colonnes.map((c) => c.texte)).size).toBe(1);

    // Le résumé : les zones du jour en points de couleur (v9 ; une seule ici, la famille seule n'en a pas), puis le
    // texte ; l'ancienne note y reste (« humeur 6 »).
    const zones = page.getByRole('img', { name: 'Émotions : énergie haute · désagréable' });
    await expect(zones).toBeVisible();
    expect(await zones.locator('i').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor)), schema)
      .toEqual([rgb(t['c-zone-rouge-fill'])]);
    await expect(page.locator('.resume-jour')).toHaveText('Bureau · humeur 6');
    const [points, resume] = await Promise.all([boite(page, '.zones-jour'), boite(page, '.resume-jour')]);
    expect(points.x + points.width).toBeLessThanOrEqual(resume.x);
  }
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|null|roue:/);

  // Un jour qui n'a que des émotions : plus de note dans le résumé, seulement les points.
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-13', { lieu: 'lieu:teletravail' });
    await r.humeurs.creer({ date: '2026-10-13', heure: '11:00', emotion: 'roue:joie:curieux', energie: 'energie:haute' });
  });
  await aller(page, '#/jour/2026-10-13');
  await expect(page.getByRole('img', { name: 'Émotions : énergie haute · agréable' })).toBeVisible();
  await expect(page.locator('.resume-jour')).toHaveText('Télétravail');
  await expect(page.locator('.liste-evenements > li')).toHaveText(['11:00Curieux · énergie haute']);
  // Un jour sans relevé : ni points, ni texte de trop.
  await aller(page, '#/jour/2026-10-12');
  await expect.poll(() => titreVu(page)).toBe('Lundi 12 octobre');
  await expect(page.locator('.zones-jour')).toHaveCount(0);
});

test('Ma journée : un relevé a un repère rond, un épisode ou un symptôme un petit carré (Symptôme et Sérénité, Épisode et Peur ont des couleurs voisines)', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.humeurs.creer({ date: '2026-10-15', heure: '09:00', emotion: 'roue:serenite:calme', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:00', emotion: 'roue:peur:craintif', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '11:00', humeur: 6, energie: null });
    await r.episodes.creer({ date: '2026-10-15', heure: '12:00', emotion: 'emotion:colere', intensite: 5 });
    await r.symptomes.creer({ date: '2026-10-15', symptome: 'symptome:ruminations', intensite: 4 });
  });
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.locator('.liste-evenements > li')).toHaveCount(5);
    const reperes = await page.locator('.liste-evenements .point-evenement').evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { texte: e.closest('li').querySelector('.resume').textContent, releve: Boolean(e.closest('.releve')), rayon: Number.parseFloat(getComputedStyle(e).borderTopLeftRadius), cote: [r.width, r.height] };
    }));
    expect(reperes.map((x) => [x.texte, x.releve]), schema).toEqual([['Calme', true], ['Craintif', true], ['humeur 6', true], ['Colère · 5', false], ['Ruminations · 4', false]]);
    for (const x of reperes) {
      expect(x.cote, `${schema} · ${x.texte}`).toEqual([10, 10]);
      if (x.releve) expect(x.rayon, `${schema} · ${x.texte} : rond`).toBeGreaterThanOrEqual(5);
      else expect(x.rayon, `${schema} · ${x.texte} : carré`).toBeLessThanOrEqual(2.5);
    }
  }
});

// ---------- Replis en liste groupée ----------

// v8 : « Sport en détail » et « Contact en détail » sont passés dans leur carte (Q5) ; « Nuit en détail », masqué par défaut,
// reste là pour une nuit déjà notée.
test('replis en liste groupée 2b : une carte, des rangées de 58 au moins, un carré à la couleur de la rubrique, le résumé sous le libellé', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-15', {
    heureCoucher: '23:20', heureLever: '07:10', reveilsNocturnes: 1, sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }],
    pese: ['pese:bruit', 'pese:lumiere', 'pese:monde', 'pese:changement', 'pese:attente'], recharge: ['recharge:seul', 'recharge:calme'],
  }));
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.locator('.replis .repli-titre')).toHaveText(['Nuit en détail', 'Ce qui a pesé · ce qui a rechargé', 'Notes libres']);
    const m = await page.locator('.replis').evaluate((g) => {
      const carte = g.getBoundingClientRect();
      return {
        fond: getComputedStyle(g).backgroundColor, rayon: getComputedStyle(g).borderTopLeftRadius,
        rangees: [...g.querySelectorAll(':scope > .repli')].map((r, i) => {
          const tete = r.querySelector('.repli-tete');
          const carre = r.querySelector('.repli-icone');
          const titre = r.querySelector('.repli-titre').getBoundingClientRect();
          const resume = r.querySelector('.repli-resume');
          const filet = i > 0 ? getComputedStyle(r, '::before') : null;
          return {
            hauteur: tete.getBoundingClientRect().height, carre: getComputedStyle(carre).backgroundColor, icone: getComputedStyle(carre).color,
            taille: Math.round(carre.getBoundingClientRect().width), gauche: Math.round(carre.getBoundingClientRect().left - carte.left),
            graisse: getComputedStyle(r.querySelector('.repli-titre')).fontWeight,
            resume: resume && { dessous: resume.getBoundingClientRect().top >= titre.bottom - 1, gauche: Math.abs(resume.getBoundingClientRect().left - titre.left) < 1,
              taille: Math.round(Number.parseFloat(getComputedStyle(resume).fontSize)), ellipse: getComputedStyle(resume).textOverflow, couleur: getComputedStyle(resume).color },
            filet: filet && Number.parseFloat(getComputedStyle(r).paddingLeft) + Number.parseFloat(filet.marginLeft),
            chevron: Boolean(tete.querySelector(':scope > .repli-fleche')),
          };
        }),
      };
    });
    const quoi = (i) => `${schema} · rangée ${i + 1}`;
    expect(m.fond).toBe(rgb(t.surface));
    expect(m.rayon).toBe('14px');
    const couleurs = ['sommeil', 'energie'];
    m.rangees.forEach((r, i) => {
      expect(r.hauteur, quoi(i)).toBeGreaterThanOrEqual(58);
      expect(r.taille, quoi(i)).toBe(28);
      expect(r.gauche, quoi(i)).toBe(12);
      expect(r.graisse, quoi(i)).toBe('500');
      expect(r.chevron, quoi(i)).toBe(true);
      if (i > 0) expect(r.filet, `${quoi(i)} : filet décalé de 52`).toBe(52);
      if (couleurs[i]) {
        expect(r.carre, quoi(i)).toBe(rgb(t[`c-${couleurs[i]}`]));
        expect(r.icone, quoi(i)).toBe(rgb(t[`c-${couleurs[i]}-on`]));
      } else expect(r.carre, `${quoi(i)} : Notes libres, neutre`).toBe(rgb(t['surface-2']));
    });
    // Résumés : sous le libellé, en 14 px --text-2, une ligne coupée par une ellipse ; AA sur la carte.
    for (const i of [0, 1]) {
      const r = m.rangees[i].resume;
      expect(r, quoi(i)).toMatchObject({ dessous: true, gauche: true, taille: 14, ellipse: 'ellipsis', couleur: rgb(t['text-2']) });
      expect(contraste(r.couleur, m.fond)).toBeGreaterThanOrEqual(4.5);
    }
  }
  // Un repli s'ouvre dans la carte, et se referme.
  const nuit = page.getByRole('button', { name: /^Nuit en détail/ });
  await nuit.click();
  await expect(page.locator('.replis #coucher')).toHaveValue('23:20');
  await nuit.click();
  await expect(page.locator('#coucher')).toHaveCount(0);
});

// ---------- Bande du bas (P5) ----------

test('bande du bas : « Émotion » est le plus large et ouvre Émotion du moment ; « Moment difficile » sur deux lignes ; « + Épisode » en couleur action', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    const bande = page.locator('.actions-flottantes');
    await expect(bande.getByRole('link')).toHaveCount(3);
    const m = await bande.evaluate((b) => [...b.children].map((a) => {
      const r = a.getBoundingClientRect();
      const carre = a.querySelector('.carre-action');
      const libelle = a.querySelector('.libelle-action');
      return {
        nom: a.getAttribute('aria-label') || a.textContent.trim(), largeur: r.width, hauteur: r.height, fond: getComputedStyle(a).backgroundColor, texte: getComputedStyle(a).color,
        carre: carre && [Math.round(carre.getBoundingClientRect().width), getComputedStyle(carre).backgroundColor, getComputedStyle(carre).color],
        lignes: libelle && Math.round(libelle.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(libelle).lineHeight)),
        taille: libelle && Math.round(Number.parseFloat(getComputedStyle(libelle).fontSize)), graisse: libelle && getComputedStyle(libelle).fontWeight,
      };
    }));
    const [difficile, emotion, episode] = m;
    expect(m.map((x) => x.nom)).toEqual(['Moment difficile', 'Émotion du moment', 'Épisode']);
    for (const x of m) expect(x.hauteur).toBe(48);
    expect(emotion.largeur).toBeGreaterThan(difficile.largeur);
    expect(emotion.largeur).toBeGreaterThan(episode.largeur);
    expect(difficile.largeur).toBeGreaterThanOrEqual(112);
    expect(difficile.largeur).toBeLessThanOrEqual(114);
    expect(difficile.lignes, 'Moment difficile sur deux lignes').toBe(2);
    expect([difficile.taille, difficile.graisse]).toEqual([13, '600']);
    for (const [x, couleur] of [[difficile, 'difficile'], [emotion, 'humeur']]) {
      expect(x.fond, `${schema} · ${x.nom}`).toBe(rgb(t.surface));
      expect(x.carre, `${schema} · ${x.nom}`).toEqual([28, rgb(t[`c-${couleur}`]), rgb(t[`c-${couleur}-on`])]);
      expect(contraste(x.texte, x.fond)).toBeGreaterThanOrEqual(4.5);
    }
    expect([episode.fond, episode.texte], schema).toEqual([rgb(t.action), rgb(t['action-on'])]);
  }
  await page.getByRole('link', { name: 'Émotion du moment' }).click();
  await expect(page.getByRole('dialog', { name: 'Émotion du moment' })).toBeVisible();
  // Sur un jour passé, pas de bouton Émotion : les deux autres se partagent la bande.
  await aller(page, '#/jour/2026-10-12');
  await expect.poll(() => titreVu(page)).toBe('Lundi 12 octobre');
  await expect(page.getByRole('link', { name: 'Émotion du moment' })).toHaveCount(0);
  await expect(page.locator('.actions-flottantes > *')).toHaveCount(2);
});

// ---------- Changer de jour en glissant (B4) ----------

// Un glissement au doigt : posé au centre de l'élément visé, déplacé de (dx, dy), levé après `duree` ms d'horloge.
async function glisser(page, selecteur, dx, dy = 0, duree = 300) {
  const depart = await page.locator(selecteur).first().evaluate((el, d) => {
    const r = el.getBoundingClientRect();
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    if (!d.duree) el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + d.dx, clientY: y + d.dy, bubbles: true }));
    return [x, y];
  }, { dx, dy, duree });
  if (!duree) return;
  await page.clock.runFor(duree);
  await page.locator(selecteur).first().evaluate((el, [x, y, ddx, ddy]) => {
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + ddx, clientY: y + ddy, bubbles: true }));
  }, [...depart, dx, dy]);
}


test('glisser change de jour : vers la droite la veille, vers la gauche le lendemain, jamais au-delà d\'aujourd\'hui', async ({ page }) => {
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  await glisser(page, '.carte-champ .tete-rubrique', 120, 8);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect.poll(() => titreVu(page)).toBe('Mercredi 14 octobre');
  await glisser(page, '.carte-champ .tete-rubrique', 100);
  await expect(page).toHaveURL(/#\/jour\/2026-10-13$/);
  await glisser(page, '.carte-champ .tete-rubrique', -100);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await glisser(page, '.liste-evenements, .evenements-jour', -100, -10);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  // Jamais au-delà d'aujourd'hui.
  await glisser(page, '.carte-champ .tete-rubrique', -150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  // Un geste rapide de 40 px suffit ; un geste lent de 40 px, non.
  await glisser(page, '.carte-champ .tete-rubrique', 40, 0, 400);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await glisser(page, '.carte-champ .tete-rubrique', 40, 0, 0);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  // ‹ et › ne changent pas.
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('glisser est ignoré dans un champ, une boîte de dialogue, ou quand le geste n\'est pas horizontal ; le défilement vertical reste celui d\'iOS', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  // Dans la zone de texte des points positifs, ou sur le titre (le sélecteur de date) : rien.
  await glisser(page, '#points-positifs', 150);
  await glisser(page, '.carte-champ .dicter', 150);
  await glisser(page, '.choix-date', 150);
  // Un geste plus vertical qu'horizontal : rien.
  await glisser(page, '.carte-champ .tete-rubrique', 80, 60);
  await glisser(page, '.carte-champ .tete-rubrique', 10, -250);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // Une boîte de dialogue ouverte (« Effacer cette journée ») : rien.
  await page.getByRole('button', { name: 'Effacer cette journée' }).click();
  const dialogue = page.getByRole('alertdialog');
  await expect(dialogue).toBeVisible();
  await glisser(page, '[role="alertdialog"]', 150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  // Un élément qui défile de côté garde son geste (ici, une bande posée pour le test au bas de la page).
  await page.evaluate(() => {
    const bande = document.createElement('div');
    bande.className = 'essai-defile';
    bande.style.overflowX = 'auto';
    bande.style.height = '60px';
    const large = document.createElement('div');
    large.style.width = '1200px';
    large.style.height = '50px';
    bande.append(large);
    document.querySelector('main.aujourdhui').append(bande);
  });
  await glisser(page, '.essai-defile > div', 150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await page.evaluate(() => document.querySelector('.essai-defile').remove());
  // Un pointeur de souris ne glisse pas (seul le doigt compte).
  await page.locator('.carte-champ .tete-rubrique').first().evaluate((el) => {
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 100, clientY: 300, bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 260, clientY: 300, bubbles: true }));
  });
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // Le geste horizontal est gardé par la page (touch-action), le vertical laissé à iOS : la page défile comme avant.
  expect(await page.locator('main.aujourdhui').evaluate((m) => getComputedStyle(m).touchAction)).toBe('pan-y pinch-zoom');
  // Rien n'est empêché : un geste reçu par la page n'est jamais annulé, la page défile.
  expect(await page.locator('.carte-champ .tete-rubrique').first().evaluate((el) => {
    const evt = (type, y) => new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: y, bubbles: true, cancelable: true });
    return [el.dispatchEvent(evt('pointerdown', 500)), el.dispatchEvent(evt('pointerup', 200))];
  })).toEqual([true, true]);
  await page.evaluate(() => { window.scrollTo(0, 0); window.scrollBy(0, 400); });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('glisser sur un jour ouvert depuis l\'Historique reste dans l\'Historique ; le nouveau jour entre de son côté, sauf avec « Réduire les animations »', async ({ page }) => {
  await aller(page, '#/historique/jour/2026-10-10');
  await expect.poll(() => titreVu(page)).toBe('Samedi 10 octobre');
  // Les entrées de page jouées, notées à leur départ (l'horloge de l'app est factice, pas celle des animations).
  await page.evaluate(() => {
    window.__entrees = [];
    document.addEventListener('animationstart', (e) => {
      if (!e.animationName.startsWith('entree-')) return;
      window.__entrees.push({ nom: e.animationName, duree: Number.parseFloat(getComputedStyle(e.target).animationDuration) * 1000,
        page: e.target.parentElement.matches('main.aujourdhui'), bande: Boolean(e.target.closest('.actions-flottantes')) });
    });
  });
  const entrees = () => page.evaluate(() => window.__entrees);
  await glisser(page, '.carte-champ .tete-rubrique', 120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-09$/);
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toBeVisible();
  await expect.poll(async () => (await entrees()).length).toBeGreaterThan(0);
  for (const e of await entrees()) expect(e).toEqual({ nom: 'entree-veille', duree: 200, page: true, bande: false });
  await page.evaluate(() => { window.__entrees = []; });
  await glisser(page, '.carte-champ .tete-rubrique', -120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-10$/);
  await expect.poll(async () => (await entrees()).map((e) => e.nom)).toContain('entree-lendemain');

  // « Réduire les animations » : le jour change, sans mouvement.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.__entrees = []; });
  await glisser(page, '.carte-champ .tete-rubrique', 120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-09$/);
  await expect.poll(() => titreVu(page)).toBe('Vendredi 9 octobre');
  await expect(page.locator('main.aujourdhui > .carte-champ').first()).toBeVisible();
  expect(await page.locator('main.aujourdhui > .carte-champ').first().evaluate((c) => getComputedStyle(c).animationName)).toBe('none');
  expect(await entrees()).toEqual([]);
});
