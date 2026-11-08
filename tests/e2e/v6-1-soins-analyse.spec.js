import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { generer } from '../fixtures/generateur.js';
import { addDays } from '../../public/js/domain/dates.js';

// v6.1 · Soins et Analyse (P12, P13) : « Pour mes soignants : Export PSY · Vue soignants » en haut de Soins, quel
// que soit le segment, et le prénom de la page sur l'écran Vue soignants ; dans l'Analyse, Comprendre en trois
// portes (v7 : sous la porte « Historique › »), le sélecteur de période collé sur ses seules sections.
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (écran de 390 × 844, celui du projet).
const AUJ = '2026-10-15';
const PRENOM = 'Essai';
const nav = (page, nom) => page.getByRole('navigation').getByRole('link', { name: nom, exact: true });
const segment = (page, nom) => page.getByRole('group', { name: 'Soins', exact: true }).getByRole('button', { name: `Soins : ${nom}` });
const ligneSoignants = (page) => page.locator('.pour-soignants');
const portes = (page) => page.getByRole('group', { name: 'Comprendre', exact: true });
const porte = (page, nom) => portes(page).getByRole('link', { name: nom, exact: true });
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const image = (page) => page.locator('canvas.apercu-page').evaluate((c) => c.toDataURL('image/png'));

// Une cible : 44 pt au moins dans les deux sens.
async function cible(loc) {
  const b = await loc.boundingBox();
  expect(b.height).toBeGreaterThanOrEqual(44);
  expect(b.width).toBeGreaterThanOrEqual(44);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('Soins : « Pour mes soignants » sous le titre et au-dessus des segments, dans les trois segments ; deux liens de 44 pt', async ({ page }) => {
  await nav(page, 'Soins').click();
  for (const nom of ['Rendez-vous', 'Notes', 'Traitement']) {
    await segment(page, nom).click();
    await expect(segment(page, nom)).toHaveAttribute('aria-pressed', 'true');
    await expect(ligneSoignants(page)).toHaveText(/^Pour mes soignants :\s*Export PSY\s*·\s*Vue soignants$/);
    const [titre, ligne, segments] = await Promise.all([
      page.getByRole('heading', { name: 'Soins', level: 1 }), ligneSoignants(page), page.getByRole('group', { name: 'Soins', exact: true }),
    ].map((l) => l.boundingBox()));
    expect(titre.y + titre.height).toBeLessThanOrEqual(ligne.y);
    expect(ligne.y + ligne.height).toBeLessThanOrEqual(segments.y);
    await expect(ligneSoignants(page).getByRole('link', { name: 'Export PSY' })).toHaveAttribute('href', '#/export-psy');
    await expect(ligneSoignants(page).getByRole('link', { name: 'Vue soignants' })).toHaveAttribute('href', '#/soignants');
    for (const lien of await ligneSoignants(page).getByRole('link').all()) await cible(lien);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// La ligne « Pour mes soignants » : ses deux liens (boîte et texte, mesuré par une Range), son « · », sa première partie.
const mesurerLigneSoignants = (page) => ligneSoignants(page).evaluate((p) => {
  const boite = p.getBoundingClientRect();
  const liens = [...p.querySelectorAll('a')].map((a) => {
    const r = document.createRange();
    r.selectNodeContents(a);
    const t = r.getBoundingClientRect();
    const b = a.getBoundingClientRect();
    return { texte: a.textContent, haut: Math.round(b.top), gauche: b.left, droite: b.right, hauteur: b.height, largeur: b.width,
      texteDedans: t.left >= b.left - 0.5 && t.right <= b.right + 0.5 && t.top >= b.top - 0.5 && t.bottom <= b.bottom + 0.5 };
  });
  const point = p.querySelector('.liens-soignants > span[aria-hidden="true"]').getBoundingClientRect();
  const intro = p.firstElementChild.getBoundingClientRect();
  return { gauche: boite.left, droite: boite.right, bas: boite.bottom, debordement: p.scrollWidth - p.clientWidth, liens,
    point: { gauche: point.left, haut: Math.round(point.top) }, intro: { haut: Math.round(intro.top), droite: intro.right } };
});

test('Soins : à 320 et 375 de large, et en grand texte, « Pour mes soignants » passe sur deux lignes sans rien couper ; liens de 44 pt', async ({ page }) => {
  await nav(page, 'Soins').click();
  await expect(ligneSoignants(page)).toBeVisible();
  // Tailles du texte d'iOS (html suit -apple-system-body) : par défaut, xLarge, xxLarge, xxxLarge, puis la première
  // des grandes tailles d'accessibilité. Posées par le CSSOM, que la CSP laisse passer.
  for (const largeur of [390, 375, 320]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const taille of [17, 19, 21, 23, 28]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
      const cas = `${largeur} de large, texte de ${taille} px`;
      const m = await mesurerLigneSoignants(page);
      expect(m.debordement, cas).toBe(0);
      expect(m.liens.map((l) => l.texte)).toEqual(['Export PSY', 'Vue soignants']);
      for (const l of m.liens) {
        expect(l.gauche, `${l.texte}, ${cas}`).toBeGreaterThanOrEqual(m.gauche - 0.5);
        expect(l.droite, `${l.texte}, ${cas}`).toBeLessThanOrEqual(m.droite + 0.5);
        expect(l.texteDedans, `${l.texte}, ${cas}`).toBe(true);
        expect(l.hauteur, `${l.texte}, ${cas}`).toBeGreaterThanOrEqual(44);
        expect(l.largeur, `${l.texte}, ${cas}`).toBeGreaterThanOrEqual(44);
      }
      // Le « · » ne commence jamais une ligne ; la ligne reste au-dessus des segments.
      expect(m.point.gauche, cas).toBeGreaterThan(m.gauche + 20);
      const segments = await page.getByRole('group', { name: 'Soins', exact: true }).boundingBox();
      expect(m.bas, cas).toBeLessThanOrEqual(segments.y);
      expect(m.droite, cas).toBeLessThanOrEqual(largeur);
      // La page entière, au texte par défaut (en très grand texte à 320, ce sont les segments qui débordent).
      if (taille === 17) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), cas).toBe(true);
      // Au texte par défaut : sur une ligne à 390 ; à 375 et 320, la coupure se fait après « Pour mes soignants : »,
      // les deux liens et leur « · » ensemble dessous.
      if (taille === 17) {
        if (largeur === 390) {
          expect(m.liens[0].haut, cas).toBe(m.liens[1].haut);
          expect(m.liens[0].gauche, cas).toBeGreaterThan(m.intro.droite);
        } else {
          expect(m.liens[0].haut, cas).toBe(m.liens[1].haut);
          expect(m.liens[0].haut, cas).toBeGreaterThan(m.intro.haut);
          expect(Math.round(m.liens[0].gauche), cas).toBe(Math.round(m.gauche));
        }
      }
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.setViewportSize({ width: 390, height: 844 });
});

test('Export PSY depuis Soins : deux touchers, l\'onglet Soins reste allumé, « Retour » ramène à Soins sur le même segment', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-10-14', { humeur: 6, explosions: 0 }));
  await nav(page, 'Soins').click();
  await segment(page, 'Notes').click();
  await page.getByRole('link', { name: 'Export PSY' }).click();
  await expect(page).toHaveURL(/#\/export-psy$/);
  await expect(page.getByRole('heading', { name: 'Export PSY', level: 1 })).toBeVisible();
  await expect(nav(page, 'Soins')).toHaveAttribute('aria-current', 'page');
  await expect(nav(page, 'Analyse')).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('Aperçu du texte')).toContainText('mer 14/10 · humeur du soir 6 · explosions 0');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/soins$/);
  await expect(segment(page, 'Notes')).toHaveAttribute('aria-pressed', 'true');
});

test('Vue soignants depuis Soins : onglet Soins, le prénom réglé sur l\'écran (même clé, enregistré à la sortie du champ, aperçu redessiné), plus dans Réglages', async ({ page }) => {
  test.setTimeout(60000);
  await nav(page, 'Soins').click();
  await page.getByRole('link', { name: 'Vue soignants' }).click();
  await expect(page).toHaveURL(/#\/soignants$/);
  await expect(page.getByRole('heading', { name: 'Vue soignants', level: 1 })).toBeVisible();
  await expect(nav(page, 'Soins')).toHaveAttribute('aria-current', 'page');
  const partager = page.getByRole('button', { name: 'Partager en PDF' });
  await expect(partager).toBeEnabled({ timeout: 15000 });

  // « Prénom sur la page » n'a pas l'icône de « Pour qui » (une personne) : celle d'une page.
  const icone = (texte) => page.locator('.libelle-champ', { hasText: texte }).locator('svg path').getAttribute('d');
  expect(await icone('Prénom sur la page')).not.toBe(await icone('Pour qui'));

  // Vide au départ ; à la sortie du champ (Entrée), la clé prenomSoignants est écrite et l'aperçu se redessine.
  const champ = page.getByLabel('Prénom sur la page');
  await expect(champ).toHaveValue('');
  await cible(champ);
  const avant = await image(page);
  await champ.fill(PRENOM);
  expect(await lireMeta(page, 'prenomSoignants')).toBeNull();
  await champ.press('Enter');
  await expect(champ).not.toBeFocused();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(PRENOM);
  await expect.poll(() => image(page), { timeout: 15000 }).not.toBe(avant);
  await expect(partager).toBeEnabled({ timeout: 15000 });

  // « Retour » ramène à Soins ; rouvert, l'écran relit le prénom gardé.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/soins$/);
  await page.getByRole('link', { name: 'Vue soignants' }).click();
  await expect(page.getByLabel('Prénom sur la page')).toHaveValue(PRENOM);

  // Vidé : plus de prénom (null, comme avant dans Réglages).
  await page.getByLabel('Prénom sur la page').fill('  ');
  await page.getByLabel('Prénom sur la page').blur();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBeNull();

  // Réglages n'a plus de champ de prénom (ni, v7, de section Analyse).
  await aller(page, '#/reglages');
  await expect(page.getByRole('region', { name: 'Analyse' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /Prénom/ })).toHaveCount(0);
});

// Le PDF d'avant ne part jamais avec un prénom qu'on vient de taper : la sortie du champ le retire aussitôt, avant
// que le toucher sur le bouton n'arrive. Sur iPhone, toucher un bouton ne fait pas toujours sortir du champ : le
// clic arrive alors le champ encore actif (dispatchEvent ci-dessous), le prénom est appliqué et rien ne part.
test('Vue soignants : prénom tapé puis « Partager en PDF » touché aussitôt, le PDF d\'avant (sans ce prénom) n\'est pas repartagé', async ({ page }) => {
  test.setTimeout(60000);
  await installerPartageFactice(page);
  await page.reload();
  await aller(page, '#/soignants');
  const partager = page.getByRole('button', { name: 'Partager en PDF' });
  const nombre = () => page.evaluate(() => window.__partages.length);
  await expect(partager).toBeEnabled({ timeout: 15000 });
  await partager.tap();
  await expect.poll(nombre, { timeout: 15000 }).toBe(1);

  // Tapé, puis le bouton touché directement : le prénom est enregistré, aucun partage, le PDF se refait.
  const champ = page.getByLabel('Prénom sur la page');
  await champ.fill(PRENOM);
  await partager.tap();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(PRENOM);
  await expect(partager).toBeEnabled({ timeout: 15000 });
  expect(await nombre()).toBe(1);

  // Le champ encore actif au moment du clic : même chose.
  await champ.fill(`${PRENOM}-bis`);
  await partager.dispatchEvent('click');
  await expect(champ).toBeFocused();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(`${PRENOM}-bis`);
  await expect(partager).toBeEnabled({ timeout: 15000 });
  expect(await nombre()).toBe(1);

  // Une fois la page prête, un nouveau toucher partage le PDF refait, qui n'est plus celui d'avant.
  await partager.tap();
  await expect.poll(nombre, { timeout: 15000 }).toBe(2);
  const [avant, apres] = await fichiersPartages(page);
  expect(Buffer.from(apres.octets).equals(Buffer.from(avant.octets))).toBe(false);
});

test('Vue soignants : « Imprimer » n\'imprime pas l\'aperçu d\'avant un prénom qu\'on vient de taper', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => { window.__impressions = 0; window.print = () => { window.__impressions += 1; }; });
  await page.reload();
  await aller(page, '#/soignants');
  const imprimer = page.getByRole('button', { name: 'Imprimer', exact: true });
  const impressions = () => page.evaluate(() => window.__impressions);
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
  await expect(imprimer).toBeEnabled();

  // Tapé, puis « Imprimer » touché directement : le prénom est enregistré, rien ne s'imprime avant l'aperçu refait.
  const champ = page.getByLabel('Prénom sur la page');
  await champ.fill(PRENOM);
  await imprimer.tap();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(PRENOM);
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
  expect(await impressions()).toBe(0);

  // Le champ encore actif au moment du clic : même chose.
  await champ.fill(`${PRENOM}-bis`);
  await imprimer.dispatchEvent('click');
  await expect(champ).toBeFocused();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(`${PRENOM}-bis`);
  await expect(page.getByRole('button', { name: 'Partager en PDF' })).toBeEnabled({ timeout: 15000 });
  expect(await impressions()).toBe(0);

  // L'aperçu refait : un toucher imprime.
  await imprimer.tap();
  await expect.poll(impressions).toBe(1);
});

// 120 jours inventés qui finissent aujourd'hui, avec un contact et une activité un jour sur trois : toutes les
// sections de l'Analyse ont de quoi s'afficher.
async function charger120(page) {
  const journal = generer({ jours: 120, seed: 7, scenario: 'bureau', debut: addDays(AUJ, -119) }).map((j, i) => (i % 3 ? j : {
    ...j, contactHumain: true, contacts: [{ avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }],
    sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }],
  }));
  await page.evaluate(async (j) => {
    const r = window.__carnet.repo;
    for (const { date, ...x } of j) await r.journal.patch(date, x);
  }, journal);
}

test('Analyse : « Historique › » et trois portes vers Comprendre, plus d\'Export PSY ni de Vue soignants ; la semaine, puis la période (v7)', async ({ page }) => {
  test.setTimeout(60000);
  await charger120(page);
  await nav(page, 'Analyse').click();
  await expect(page.getByRole('heading', { name: 'Les plus fréquents' })).toBeVisible({ timeout: 15000 });

  // Les portes, en tête, de 44 pt au moins : l'Historique, puis Comprendre.
  const historique = page.getByRole('navigation', { name: 'Historique, épisodes et Comprendre' }).getByRole('link', { name: 'Historique', exact: true });
  await expect(historique).toHaveAttribute('href', '#/historique');
  await cible(historique);
  await expect(portes(page).getByRole('link')).toHaveText(['Explosions', 'Énergie', 'Rythmes']);
  for (const [nom, onglet] of [['Explosions', 'explosions'], ['Énergie', 'energie'], ['Rythmes', 'rythmes']]) {
    await expect(porte(page, nom)).toHaveAttribute('href', `#/comprendre/${onglet}`);
    await cible(porte(page, nom));
  }
  await expect(page.getByRole('link', { name: 'Export PSY' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Vue soignants' })).toHaveCount(0);

  // L'ordre : Ma semaine, la période, puis les sections qu'elle règle. Les analyses retirées (v7) n'y sont plus.
  const titres = await page.locator('main').locator('h2, h3, .repli-titre, .selecteur-periode').evaluateAll((els) => els.map((e) => (e.classList.contains('selecteur-periode') ? '[période]' : e.textContent.trim())));
  const reperes = ['Ma semaine', '[période]', 'Avec qui, comment c\'était · Mouvement', 'Tes moments, étape par étape', 'Les plus fréquents', 'Tous les chiffres'];
  expect(titres.filter((t) => reperes.includes(t))).toEqual(reperes);
  for (const retire of ['Tendances', 'Sur tout ton historique', 'Ce que tes journées à 7 ou plus ont en commun', 'Sommeil et humeur']) {
    await expect(page.getByRole('heading', { name: retire })).toHaveCount(0);
  }

  // Le sélecteur colle sur les sections qu'il règle.
  const selecteur = page.locator('.selecteur-periode');
  await page.getByRole('heading', { name: 'Les plus fréquents' }).evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await expect.poll(async () => Math.round((await selecteur.boundingBox()).y)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
});

test('Analyse : chaque onglet de Comprendre en deux touchers depuis Aujourd\'hui ; « Retour » ramène à l\'Analyse', async ({ page }) => {
  for (const [nom, onglet] of [['Explosions', 'explosions'], ['Énergie', 'energie'], ['Rythmes', 'rythmes']]) {
    await nav(page, 'Aujourd\'hui').click();
    await nav(page, 'Analyse').click();
    await porte(page, nom).click();
    await expect(page).toHaveURL(new RegExp(`#/comprendre/${onglet}$`));
    await expect(page.getByRole('group', { name: 'Comprendre', exact: true }).getByRole('button', { name: `Comprendre : ${nom}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(nav(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/analyse$/);
});

// Chaque porte : son texte, mesuré par une Range, dans la boîte de son contenu (bordure et rembourrage ôtés).
const mesurerPortes = (page) => page.locator('.portes .porte').evaluateAll((els) => els.map((p) => {
  const r = document.createRange();
  r.selectNodeContents(p);
  const t = r.getBoundingClientRect();
  const b = p.getBoundingClientRect();
  const s = getComputedStyle(p);
  const gauche = b.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
  const droite = b.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
  return { texte: p.textContent, dedans: t.left >= gauche - 0.5 && t.right <= droite + 0.5, haut: Math.round(b.top), largeur: Math.round(b.width), hauteur: b.height };
}));

test('Analyse : en grand texte, les portes passent à la ligne et le texte de chacune reste dans sa boîte', async ({ page }) => {
  await nav(page, 'Analyse').click();
  await expect(portes(page).getByRole('link')).toHaveText(['Explosions', 'Énergie', 'Rythmes']);
  // Tailles du texte d'iOS (html suit -apple-system-body) : par défaut, xLarge, xxLarge, xxxLarge, puis la première
  // des grandes tailles d'accessibilité. Posées par le CSSOM, que la CSP laisse passer.
  for (const largeur of [390, 375, 320]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    for (const taille of [17, 19, 21, 23, 28]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
      const portes = await mesurerPortes(page);
      expect(portes).toHaveLength(3);
      for (const p of portes) {
        expect(p.dedans, `« ${p.texte} » à ${largeur} de large, texte de ${taille} px`).toBe(true);
        expect(p.hauteur).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      // Au texte par défaut, à 375 comme à 390 de large : les trois sur une ligne, de même largeur.
      if (taille === 17 && largeur >= 375) {
        expect(new Set(portes.map((p) => p.haut)).size, `une ligne à ${largeur} de large`).toBe(1);
        expect(new Set(portes.map((p) => p.largeur)).size).toBe(1);
      }
    }
  }
});
