import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Page d'aide iPhone (spec §6) : texte fixe, ouvert depuis Réglages, avec ses six rubriques ; v11 (10/11) : une
// septième, « Changer d'icône sans rien perdre » (spec v11 §10). Rien n'est lu, écrit ni compté : on ne vérifie que la
// navigation et la présence du texte.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const RUBRIQUES = ['Sons d\'arrière-plan', 'Concentration « Moment difficile »', 'Réduire le point blanc', 'Parole en direct', 'Toucher le dos', 'Raccourci « Sieste »',
  'Changer d\'icône sans rien perdre'];

test('Réglages › Aide iPhone : la page s\'ouvre avec ses sept rubriques, Retour revient dans Réglages', async ({ page }) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Aide iPhone', exact: true }).click();
  await expect(page).toHaveURL(/#\/reglages\/aide-iphone$/);
  await expect(page.getByRole('heading', { name: 'Aide iPhone', level: 1 })).toBeVisible();
  for (const nom of RUBRIQUES) await expect(page.getByRole('heading', { name: nom, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(RUBRIQUES);
  // L'onglet Réglages reste l'onglet actif.
  await expect(page.getByRole('link', { name: 'Réglages', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
});

test('la page dit que c\'est l\'iPhone qui sonne, pas Emozio, et ne propose aucun bouton d\'action', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  await expect(page.getByRole('heading', { name: 'Aide iPhone', level: 1 })).toBeVisible();
  await expect(page.getByText('c\'est le minuteur de l\'iPhone qui sonne', { exact: false })).toBeVisible();
  await expect(page.getByText('c\'est le minuteur de l\'iPhone qui sonne. Emozio n\'envoie rien.', { exact: false })).toBeVisible();
  // Texte fixe : aucun bouton dans la page, hors « Retour ».
  await expect(page.locator('main').getByRole('button')).toHaveCount(1);
  await expect(page.locator('main').getByRole('button', { name: 'Retour' })).toBeVisible();
});

// La Sieste ne coupe rien d'elle-même : la page le dit au lieu de suggérer une fin propre.
test('Sieste : la page dit que la Concentration et les sons restent allumés, et que le triple clic peut ouvrir une liste', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  const sieste = page.locator('section', { has: page.getByRole('heading', { name: 'Raccourci « Sieste »', level: 2 }) });
  await expect(sieste.getByText('un réglage donne la fin', { exact: false })).toBeVisible();
  await expect(sieste.getByText('reste allumée jusqu\'à ce que tu l\'éteignes', { exact: false })).toBeVisible();
  // La note s'accorde avec l'étape du réglage de la fin : « par défaut », jamais un absolu.
  await expect(sieste.getByText('Par défaut, le minuteur ne coupe ni la Concentration ni les sons', { exact: false })).toBeVisible();
  await expect(sieste.getByText('c\'est le minuteur de l\'iPhone qui sonne', { exact: false })).toBeVisible();
  const pointBlanc = page.locator('section', { has: page.getByRole('heading', { name: 'Réduire le point blanc', level: 2 }) });
  await expect(pointBlanc.getByText('plusieurs raccourcis sont cochés', { exact: false })).toBeVisible();
});

// v11 (10/11) : le passage à la nouvelle icône, en pas-à-pas fixe (spec §10, appel du concepteur). Supprimer l'ancienne icône
// efface ses données : aucune étape ne dit de supprimer quoi que ce soit avant la dernière, une fois la copie vérifiée.
// Les étapes suivent le nom Emozio (accord de l'utilisateur du 07/11) : le nom sous l'icône se vérifie avec elle.
// v12 (8/9, spec v12 §7) : l'étape Safari commence par la phrase de la spec v12, mot pour mot ; le bandeau n'existe pas dans
// Safari, l'aide n'en parle pas.
test('v11 : « Changer d\'icône sans rien perdre », les cinq étapes de la spec, rien à supprimer avant la dernière', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  const icone = page.locator('section', { has: page.getByRole('heading', { name: 'Changer d\'icône sans rien perdre', level: 2 }) });
  const etapes = icone.locator('ol.etapes > li');
  await expect(etapes).toHaveText([
    'Redémarrer l\'iPhone : l\'icône a peut-être changé. Si oui, et si son nom est « Emozio », c\'est fini.',
    'Dans l\'ancienne app : Réglages › Exporter, enregistrer dans Fichiers.',
    'Dans Safari, ferme l\'onglet d\'Emozio s\'il est ouvert, puis rouvre l\'adresse : la page se met à jour. Ensuite, Partager › Sur l\'écran d\'accueil. Le nom, « Emozio », reste modifiable dans l\'aperçu. Si l\'aperçu montre la nouvelle icône, Ajouter. Sinon, annuler et recommencer.',
    'Ouvrir la nouvelle app, Emozio, qui doit être vide : Réglages › Importer. Vérifier quelques jours dans l\'Historique.',
    'Ranger l\'ancienne app dans un dossier, et ne plus y écrire. La supprimer plus tard, ou jamais.',
  ]);
  const textes = await etapes.allTextContents();
  const supprimer = /suppr|effac/i;
  textes.slice(0, -1).forEach((t, i) => expect(t, `étape ${i + 1}`).not.toMatch(supprimer));
  // v12 : l'étape Safari commence par la phrase de la spec, et la page ne parle nulle part du bandeau. Le texte affiché a
  // ses espaces insécables (pourAffichage, relecture de la tâche 8) : on le compare en espaces simples.
  expect(textes[2].replace(/\u00a0/g, ' ').startsWith('Dans Safari, ferme l\'onglet d\'Emozio s\'il est ouvert, puis rouvre l\'adresse : la page se met à jour.')).toBe(true);
  await expect(page.locator('main')).not.toContainText(/bandeau|Nouvelle version|Recharger/i);
  // Ce que la copie ne garde pas, en note.
  await expect(icone.locator('.note-import')).toHaveText('La copie ne garde pas les brouillons en cours, les réglages du lecteur ni les replis ouverts. Le micro sera sans doute à réautoriser.');
  // Cette rubrique passe par l'app (Exporter, Importer) : l'introduction ne dit « Emozio ne lance rien et ne lit rien »
  // que des réglages de l'iPhone.
  await expect(page.locator('main > p.note-import')).toHaveText('Ce que l\'iPhone fait lui-même, et comment changer d\'icône sans rien perdre. Pour les réglages, tout se règle dans l\'iPhone : Emozio ne lance rien et ne lit rien de tout cela. Le nom des menus peut varier un peu selon la version d\'iOS.');
});

// v12 (relecture de la tâche 8) : les textes de la page passent par pourAffichage, comme ceux du rappel. Avant, l'étape
// Safari, affichée telle quelle, commençait une ligne par « : la page se met à jour » à 53 px, et par « », reste
// modifiable » à 47 px. Les lignes de chaque texte de la page : celles qui commencent par une ponctuation haute ou un « » »,
// celles qui finissent par un « « » seul, le texte qui sort de son bloc ou de l'écran, et les mots coupés en fin de ligne
// (deux lettres de suite sur deux lignes, sans espace entre elles).
const lignesDeLaPage = (page) => page.evaluate(() => {
  const main = document.querySelector('main');
  const bord = main.getBoundingClientRect().right - parseFloat(getComputedStyle(main).paddingRight);
  const res = { fautes: [], hors: [], coupes: [], safari: [], largeur: document.documentElement.scrollWidth };
  const plage = document.createRange();
  const marche = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    const droite = Math.min(n.parentElement.getBoundingClientRect().right, bord);
    const lignes = [];
    let haut = null;
    let prec = -2;
    let sorti = false;
    for (let i = 0; i < n.length; i += 1) {
      // Une espace sécable : là où la ligne peut changer. Elle compte dans le texte de la ligne, pas dans sa mesure.
      if (/[^\S\u00a0]/.test(n.data[i])) { if (lignes.length) lignes[lignes.length - 1] += ' '; continue; }
      plage.setStart(n, i);
      plage.setEnd(n, i + 1);
      const q = plage.getClientRects()[0];
      if (!q || q.width === 0) continue;
      if (!sorti && q.right > droite + 0.5) { res.hors.push(n.data.slice(Math.max(0, i - 12), i + 2)); sorti = true; }
      if (haut === null || q.top > haut + 2) {
        if (haut !== null && prec === i - 1 && /\p{L}/u.test(n.data[prec]) && /\p{L}/u.test(n.data[i])) {
          const debut = n.data.slice(0, i).match(/\p{L}*$/u)[0];
          res.coupes.push(debut + n.data.slice(i).match(/^\p{L}*/u)[0]);
        }
        lignes.push('');
        haut = q.top;
      }
      lignes[lignes.length - 1] += n.data[i];
      prec = i;
    }
    const propres = lignes.map((l) => l.replace(/\u00a0/g, ' ').trim());
    propres.forEach((l, k) => {
      if (k > 0 && /^[:;?!»·]/.test(l)) res.fautes.push(`début de ligne : ${l.slice(0, 24)}`);
      if (k < propres.length - 1 && /«$/.test(l)) res.fautes.push(`fin de ligne : ${l.slice(-24)}`);
    });
    if (n.data.startsWith('Dans Safari')) res.safari = propres;
  }
  // Les numéros des étapes : le repère « 3. » se pose à gauche du texte de l'étape, son espace comprise. Il ne doit pas
  // sortir de l'écran à gauche (relecture de la tâche 8 : à 53 px, avec 22 px de retrait, « 2. » et « 3. » étaient coupés
  // au bord). Il est mesuré par un texte de même police posé dans l'étape, puis retiré.
  res.numeros = [];
  const mesure = document.createElement('span');
  mesure.style.whiteSpace = 'pre';
  for (const ol of main.querySelectorAll('ol.etapes')) {
    const debut = ol.getBoundingClientRect().left + parseFloat(getComputedStyle(ol).paddingLeft);
    [...ol.children].forEach((li, k) => {
      mesure.textContent = `${k + 1}. `;
      li.append(mesure);
      const largeur = mesure.getBoundingClientRect().width;
      mesure.remove();
      if (debut - largeur < 0) res.numeros.push(`${k + 1}. : ${Math.round(debut - largeur)} px`);
    });
  }
  return res;
});

test('v12 : les textes passent par pourAffichage ; du texte par défaut à 53 px, aucune ligne ne commence par « : » ni « » », aucune ne finit par « « », rien ne sort de côté', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  await expect(page.getByRole('heading', { name: 'Aide iPhone', level: 1 })).toBeVisible();
  // Dans la page : aucune espace simple avant « : », « ; », « ? », « ! » ou « » », ni après « « », titres et notes compris.
  const texte = await page.locator('main').evaluate((m) => m.textContent);
  expect(texte).not.toMatch(/ [:;?!»]|« /);
  for (const x of ['rouvre l\'adresse\u00a0: la page se met à jour', 'Le nom, «\u00a0Emozio\u00a0», reste modifiable', 'Concentration «\u00a0Moment difficile\u00a0»',
    'tout se règle dans l\'iPhone\u00a0: Emozio', 'micro sera sans doute à réautoriser.']) expect(texte).toContain(x);
  const fautes = {};
  for (const taille of [null, 23, 33, 40, 47, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
    const ou = taille ? `${taille} px` : 'défaut';
    const r = await lignesDeLaPage(page);
    // L'étape Safari, là où la relecture l'a vue fautive : ses lignes ne commencent ni par « : » ni par « » ».
    expect(r.safari.length, `${ou} : les lignes de l'étape Safari`).toBeGreaterThan(taille ? 4 : 2);
    expect(r.safari.filter((l, k) => k > 0 && /^[:»]/.test(l)), `${ou} : étape Safari`).toEqual([]);
    if (taille === 53) expect(r.safari.some((l) => l.includes('« Emozio »')), '53 px : « Emozio » entier, avec ses guillemets').toBe(true);
    // « « Concentration ». », d'un tenant, ne tient plus sur une ligne dès 43 px : la césure le coupe, en très grand texte
    // seulement, plutôt que la page déborde de côté. Jusqu'à 40 px, aucun mot n'est coupé ; « Emozio » ne l'est jamais.
    const coupes = taille && taille > 40 ? r.coupes.filter((m) => m === 'Emozio') : r.coupes;
    const f = [...r.fautes, ...r.hors.map((x) => `hors de son bloc : ${x}`), ...coupes.map((m) => `mot coupé : ${m}`),
      ...r.numeros.map((x) => `numéro hors de l'écran : ${x}`)];
    if (r.largeur > 390) f.push(`page : ${r.largeur} px de large`);
    if (f.length) fautes[ou] = f;
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(fautes).toEqual({});
});
