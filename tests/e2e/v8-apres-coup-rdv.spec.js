import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { canaux, jetons } from '../aides/couleurs.js';

// v8 (7/9) · Après coup quand la honte reste (Q20) et sujets d'un rendez-vous (Q22), spec §7 :
// - « Une autre façon de voir » vient aussi après Honte ou Regret touché dans « Plus tard », quel que soit le type ;
// - dans la fiche d'un rendez-vous, sous le champ des questions, les sujets de la liste `sujetRdv` : un toucher pose
//   « Parler de : sommeil », un second la retire ; la question se modifie ensuite sur place. La liste se règle dans
//   Réglages › Listes. Données inventées. Horloge : jeudi 15 octobre 2026, 21:00.
const repo = (page, f, arg) => page.evaluate(f, arg);
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const lireEp = (page, id) => repo(page, (i) => window.__carnet.repo.episodes.lire(i), id);
const lireRdv = (page, id) => repo(page, (i) => window.__carnet.repo.rdv.lire(i), id);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

// ---------- Q20 · Après coup ----------

const creerEpisode = (page, apresCoup) => repo(page, async (ac) => (await window.__carnet.repo.episodes.creer({
  date: '2026-10-14', heure: '18:00', emotion: 'emotion:colere', declencheur: 'declencheur:conflit', ...(ac ? { apresCoup: ac } : {}),
})).id, apresCoup);
const vueAC = (page) => page.getByRole('dialog', { name: 'Après coup' });
const titre = (page) => vueAC(page).locator('.titre-question').first();
const repere = (page) => vueAC(page).locator('.reperes');
// Avance d'étape en étape (Passer ou Suivant) jusqu'à la question donnée ; renvoie les titres vus en route.
async function allerA(page, question) {
  const vus = [];
  for (let i = 0; i < 14; i += 1) {
    const t = await titre(page).textContent();
    vus.push(t);
    if (t === question) return vus;
    await vueAC(page).getByRole('button', { name: /^(Passer|Suivant)$/ }).click();
    await expect(titre(page)).not.toHaveText(t);
  }
  throw new Error(`étape introuvable : ${question} (vu : ${vus.join(' / ')})`);
}
async function titresJusquAuRecap(page) {
  const vus = [];
  while (await vueAC(page).getByRole('heading', { name: 'Récapitulatif' }).count() === 0) {
    const t = await titre(page).textContent();
    vus.push(t);
    await vueAC(page).getByRole('button', { name: /^(Passer|Suivant)$/ }).click();
    await expect(vueAC(page).locator('.titre-question').first()).not.toHaveText(t);
  }
  return vus;
}

for (const [type, consequence] of [['Surcharge', 'Honte'], ['Figé', 'Regret'], [null, 'Honte']]) {
  test(`Q20 · ${type || 'sans type'} : « Une autre façon de voir » n'apparaît qu'avec ${consequence} touché dans « Plus tard », juste après, et s'enregistre`, async ({ page }) => {
    const id = await creerEpisode(page, null);
    await aller(page, `#/apres-coup/${id}`);
    await expect(vueAC(page).getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
    if (type) await vueAC(page).getByRole('button', { name: type, exact: true }).click();
    const nb = type ? 9 : 8;
    await allerA(page, 'Ce que ça a donné');
    await expect(repere(page)).toHaveAttribute('aria-label', new RegExp(` sur ${nb}$`));
    const plusTard = vueAC(page).getByRole('group', { name: 'Plus tard' });
    await plusTard.getByRole('button', { name: consequence }).click();
    await expect(repere(page)).toHaveAttribute('aria-label', new RegExp(` sur ${nb + 1}$`));
    // L'étape en cours ne bouge pas ; la suivante est la nouvelle.
    await expect(titre(page)).toHaveText('Ce que ça a donné');
    await vueAC(page).getByRole('button', { name: 'Suivant' }).click();
    await expect(vueAC(page).getByRole('heading', { name: 'Une autre façon de voir' })).toBeVisible();
    await expect(vueAC(page).getByText('Si un ami me racontait ça, je lui dirais…')).toBeVisible();
    // Écrire ne fait pas sauter l'écran (l'étape « Ce que je me suis dit » ne s'ajoute pas avant).
    await vueAC(page).locator('#ac-autreFacon').fill('Je n\'avais presque pas dormi.');
    await expect.poll(async () => (await lireEp(page, id)).apresCoup?.autreFacon).toBe('Je n\'avais presque pas dormi.');
    await expect(titre(page)).toHaveText('Une autre façon de voir');
    await expect(repere(page)).toHaveAttribute('aria-label', `Étape ${nb - 1} sur ${nb + 1}`);
    expect((await lireEp(page, id)).apresCoup.plusTard).toEqual([`consequenceLong:${consequence === 'Honte' ? 'honte' : 'regret'}`]);
    const suite = await titresJusquAuRecap(page);
    expect(suite).toEqual(['Une autre façon de voir', 'Pour la prochaine fois', 'Maintenant, en y repensant, c\'est à…']);
    await expect(vueAC(page).locator('.recap .recap-nom')).toContainText(['Plus tard', 'Une autre façon de voir', 'La prochaine fois']);
  });
}

test('Q20 · sans Honte ni Regret, pas d\'étape ; décochée sans réponse, l\'étape repart ; avec une réponse, elle reste', async ({ page }) => {
  const id = await creerEpisode(page, { types: ['typeExplosion:surcharge'], jour: '2026-10-15' });
  await aller(page, `#/apres-coup/${id}`);
  await expect(vueAC(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(vueAC(page).locator('.recap .recap-nom')).not.toContainText(['Une autre façon de voir']);
  // Conflit, Fatigue, « Rien de spécial », « J'ai pu réparer » : rien de plus.
  await vueAC(page).locator('.ligne-recap').filter({ hasText: 'Plus tard' }).click();
  const plusTard = vueAC(page).getByRole('group', { name: 'Plus tard' });
  for (const nom of ['Conflit', 'Fatigue', 'J\'ai pu réparer']) await plusTard.getByRole('button', { name: nom }).click();
  await expect(repere(page)).toHaveAttribute('aria-label', 'Étape 7 sur 9');
  await plusTard.getByRole('button', { name: 'Honte' }).click();
  await expect(repere(page)).toHaveAttribute('aria-label', 'Étape 7 sur 10');
  await plusTard.getByRole('button', { name: 'Honte' }).click();
  await expect(repere(page)).toHaveAttribute('aria-label', 'Étape 7 sur 9');
  await expect.poll(async () => (await lireEp(page, id)).apresCoup.plusTard).toEqual(['consequenceLong:conflit', 'consequenceLong:fatigue', 'consequenceLong:reparer']);
  // Regret, une réponse, puis Regret décoché : la réponse reste affichée, rien n'est caché ni effacé.
  await plusTard.getByRole('button', { name: 'Regret' }).click();
  await vueAC(page).getByRole('button', { name: 'Suivant' }).click();
  await expect(vueAC(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await vueAC(page).locator('.ligne-recap').filter({ hasText: 'Une autre façon de voir' }).click();
  await vueAC(page).locator('#ac-autreFacon').fill('Il était pressé, pas fâché.');
  await vueAC(page).getByRole('button', { name: 'Suivant' }).click();
  await expect.poll(async () => (await lireEp(page, id)).apresCoup.autreFacon).toBe('Il était pressé, pas fâché.');
  await vueAC(page).locator('.ligne-recap').filter({ hasText: 'Plus tard' }).click();
  await plusTard.getByRole('button', { name: 'Regret' }).click();
  await expect(repere(page)).toHaveAttribute('aria-label', 'Étape 7 sur 10');
  await vueAC(page).getByRole('button', { name: 'Suivant' }).click();
  const ligne = vueAC(page).locator('.ligne-recap').filter({ hasText: 'Une autre façon de voir' });
  await expect(ligne.locator('.recap-val')).toHaveText('Il était pressé, pas fâché.');
  // « Ce que je me suis dit » (la Colère) ne vient pas pour autant.
  await expect(vueAC(page).locator('.recap .recap-nom')).not.toContainText(['Ce que je me suis dit']);
});

test('Q20 · la Colère garde son étape, sans Honte ni Regret, et une seule fois avec', async ({ page }) => {
  const id = await creerEpisode(page, { types: ['typeExplosion:colere'], plusTard: ['consequenceLong:honte', 'consequenceLong:regret'], jour: '2026-10-15' });
  await aller(page, `#/apres-coup/${id}`);
  await expect(vueAC(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  const noms = await vueAC(page).locator('.recap .recap-nom').allTextContents();
  expect(noms.filter((n) => n === 'Une autre façon de voir')).toHaveLength(1);
  expect(noms).toContain('Ce que je me suis dit');
  await repo(page, (i) => window.__carnet.repo.episodes.modifier(i, { apresCoup: { types: ['typeExplosion:colere'], jour: '2026-10-15' } }), id);
  await aller(page, '#/aujourdhui');
  await aller(page, `#/apres-coup/${id}`);
  await expect(vueAC(page).getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(vueAC(page).locator('.recap .recap-nom')).toContainText(['Ce que je me suis dit', 'Une autre façon de voir']);
});

// ---------- Q22 · Sujets d'un rendez-vous ----------

const SUJETS = ['Sommeil', 'Traitement', 'Explosions', 'Fatigue', 'Travail', 'Émotions', 'Autre chose'];
const sujets = (page) => page.getByRole('group', { name: 'Parler de' });
const creerRdv = (page, questions) => repo(page, async (q) => (await window.__carnet.repo.rdv.creer({
  date: '2026-10-20', heure: '10:30', professionnel: 'professionnel:psychiatre', ...(q ? { questions: q } : {}),
})).id, questions);

test('Q22 · un toucher pose « Parler de : sommeil » sous le champ des questions, un second la retire ; cibles de 44', async ({ page }) => {
  const id = await creerRdv(page, [{ texte: 'Les réveils vers 3 h', abordee: false }]);
  await aller(page, `#/rdv/${id}`);
  await expect(sujets(page).getByRole('button')).toHaveText(SUJETS);
  await expect(page.locator('.sujets-rdv .libelle-sujets')).toHaveText('Parler de…');
  // Sous « Une question pour ce rendez-vous… ».
  const champ = await page.getByLabel('Une question pour ce rendez-vous').boundingBox();
  const rangee = await sujets(page).boundingBox();
  expect(rangee.y).toBeGreaterThan(champ.y + champ.height);
  for (const b of await sujets(page).getByRole('button').all()) {
    const r = await b.boundingBox();
    expect(r.height).toBeGreaterThanOrEqual(44);
    expect(r.x + r.width).toBeLessThanOrEqual(390);
  }

  await sujets(page).getByRole('button', { name: 'Sommeil' }).click();
  await expect(sujets(page).getByRole('button', { name: 'Sommeil' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await lireRdv(page, id)).questions).toEqual([
    { texte: 'Les réveils vers 3 h', abordee: false }, { texte: 'Parler de : sommeil', abordee: false }]);
  await expect(page.getByRole('button', { name: 'Modifier la question Parler de : sommeil' })).toBeVisible();
  await sujets(page).getByRole('button', { name: 'Autre chose' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions.map((q) => q.texte)).toEqual(['Les réveils vers 3 h', 'Parler de : sommeil', 'Parler de : autre chose']);
  // Un second toucher retire la question, et elle seule.
  await sujets(page).getByRole('button', { name: 'Sommeil' }).click();
  await expect(sujets(page).getByRole('button', { name: 'Sommeil' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await lireRdv(page, id)).questions.map((q) => q.texte)).toEqual(['Les réveils vers 3 h', 'Parler de : autre chose']);
  await sujets(page).getByRole('button', { name: 'Autre chose' }).click();
  await page.getByRole('button', { name: 'Retirer la question Les réveils vers 3 h' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions ?? null).toBeNull();
  await expect(sujets(page).getByRole('button', { name: 'Sommeil' })).toHaveAttribute('aria-pressed', 'false');
});

test('Q22 · cochée « abordée », la question reste au toucher de son sujet (le toucher le dit) ; grise dans la fiche ; le ✕ la retire', async ({ page }) => {
  const questions = [{ texte: 'Les réveils vers 3 h', abordee: false }, { texte: 'Parler de : sommeil', abordee: true }];
  const id = await creerRdv(page, questions);
  const sommeil = sujets(page).getByRole('button', { name: 'Sommeil' });
  const texte = (nom) => page.getByRole('button', { name: `Modifier la question ${nom}`, exact: true }).locator('.texte-question');
  // Abordée, le texte passe au gris secondaire (--text-2), en clair et en sombre ; l'autre garde --text.
  for (const [schema, t] of [['light', clair], ['dark', sombre]]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/soins');
    await aller(page, `#/rdv/${id}`);
    await expect(sommeil).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => texte('Parler de : sommeil').evaluate((e) => getComputedStyle(e).color), schema).toBe(rgb(t['text-2']));
    await expect.poll(() => texte('Les réveils vers 3 h').evaluate((e) => getComputedStyle(e).color), schema).toBe(rgb(t.text));
  }
  await page.emulateMedia({ colorScheme: 'light' });

  // Le toucher ne retire rien, ni la coche : il dit pourquoi.
  await sommeil.click();
  await expect(page.locator('.toast-texte')).toHaveText('Question déjà abordée : elle reste');
  expect((await lireRdv(page, id)).questions).toEqual(questions);
  await expect(sommeil).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Parler de : sommeil', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Décochée, un toucher la retire, comme avant ; reposée puis cochée, elle reste de nouveau.
  await page.getByRole('button', { name: 'Parler de : sommeil', exact: true }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions[1].abordee).toBe(false);
  await sommeil.click();
  await expect.poll(async () => (await lireRdv(page, id)).questions.map((q) => q.texte)).toEqual(['Les réveils vers 3 h']);
  await expect(sommeil).toHaveAttribute('aria-pressed', 'false');
  await sommeil.click();
  await page.getByRole('button', { name: 'Parler de : sommeil', exact: true }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions).toEqual(questions);
  await sommeil.click();
  await expect(page.locator('.toast-texte')).toHaveText('Question déjà abordée : elle reste');
  expect((await lireRdv(page, id)).questions).toEqual(questions);
  // Le ✕ de la question la retire, abordée ou non.
  await page.getByRole('button', { name: 'Retirer la question Parler de : sommeil' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions).toEqual([questions[0]]);
  await expect(sommeil).toHaveAttribute('aria-pressed', 'false');
});

test('Q22 · la question se modifie ensuite sur place (Retour, sortie du champ, Échap) ; la case seule coche ; un doublon est refusé', async ({ page }) => {
  const id = await creerRdv(page, [{ texte: 'Effets du matin', abordee: false }]);
  await aller(page, `#/rdv/${id}`);
  await sujets(page).getByRole('button', { name: 'Sommeil' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions?.length).toBe(2);
  // Un toucher sur le texte l'ouvre, curseur à la fin ; Retour enregistre.
  await page.getByRole('button', { name: 'Modifier la question Parler de : sommeil' }).click();
  const zone = page.getByRole('textbox', { name: 'Question : Parler de : sommeil' });
  await expect(zone).toBeFocused();
  await expect(zone).toHaveValue('Parler de : sommeil');
  expect(await zone.evaluate((z) => [z.selectionStart, z.selectionEnd])).toEqual([19, 19]);
  await page.keyboard.type(', les réveils vers 3 h');
  await page.keyboard.press('Enter');
  await expect(zone).toHaveCount(0);
  await expect.poll(async () => (await lireRdv(page, id)).questions[1]).toEqual({ texte: 'Parler de : sommeil, les réveils vers 3 h', abordee: false });
  await expect(page.getByRole('button', { name: 'Modifier la question Parler de : sommeil, les réveils vers 3 h' })).toBeFocused();
  // Le cadre du focus se pose dans la rangée sans déplacer le texte.
  const gauche = (nom) => page.getByRole('button', { name: nom, exact: true }).locator('.texte-question').evaluate((e) => Math.round(e.getBoundingClientRect().left));
  expect(await gauche('Modifier la question Parler de : sommeil, les réveils vers 3 h')).toBe(await gauche('Modifier la question Effets du matin'));
  // Modifiée, elle est à l'utilisateur : le sujet n'est plus choisi, et un toucher en pose une nouvelle.
  await expect(sujets(page).getByRole('button', { name: 'Sommeil' })).toHaveAttribute('aria-pressed', 'false');
  await sujets(page).getByRole('button', { name: 'Sommeil' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions.map((q) => q.texte)).toEqual(['Effets du matin', 'Parler de : sommeil, les réveils vers 3 h', 'Parler de : sommeil']);

  // La case seule coche (cible de 44) ; le texte, gris, se modifie toujours ; la case reste cochée.
  const caseQ = page.getByRole('button', { name: 'Effets du matin', exact: true });
  const b = await caseQ.boundingBox();
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  await caseQ.click();
  await expect(caseQ).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await lireRdv(page, id)).questions[0].abordee).toBe(true);
  // La sortie du champ enregistre aussi.
  await page.getByRole('button', { name: 'Modifier la question Effets du matin' }).click();
  await page.getByRole('textbox', { name: 'Question : Effets du matin' }).fill('Effets du matin, la bouche sèche');
  await page.locator('#rdv-compte-rendu').click();
  await expect.poll(async () => (await lireRdv(page, id)).questions[0]).toEqual({ texte: 'Effets du matin, la bouche sèche', abordee: true });
  await expect(page.getByRole('button', { name: 'Effets du matin, la bouche sèche', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Échap annule ; vidée, la question reste (✕ la retire) ; le texte d'une autre question est refusé.
  await page.getByRole('button', { name: 'Modifier la question Parler de : sommeil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Question : Parler de : sommeil' }).fill('Autre texte');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Modifier la question Parler de : sommeil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Question : Parler de : sommeil' }).fill('   ');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Modifier la question Parler de : sommeil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Question : Parler de : sommeil' }).fill('Effets du matin, la bouche sèche ');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Déjà dans ce rendez-vous')).toBeVisible();
  expect((await lireRdv(page, id)).questions.map((q) => q.texte)).toEqual(['Effets du matin, la bouche sèche', 'Parler de : sommeil, les réveils vers 3 h', 'Parler de : sommeil']);
  await expect(sujets(page).getByRole('button', { name: 'Sommeil' })).toHaveAttribute('aria-pressed', 'true');

  // Ailleurs, rien ne change : la carte du prochain rendez-vous et « En consultation » cochent toujours d'un toucher sur le texte.
  await aller(page, '#/soins');
  const prochain = page.getByRole('region', { name: 'Prochain rendez-vous' });
  await expect(prochain.getByRole('button', { name: 'Parler de : sommeil', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(prochain.getByRole('button', { name: /^Modifier la question/ })).toHaveCount(0);
  await expect(prochain.getByRole('group', { name: 'Parler de' })).toHaveCount(0);
});

test('Q22 · un rendez-vous nouveau se crée au premier toucher sur un sujet', async ({ page }) => {
  await aller(page, '#/rdv/nouveau');
  await sujets(page).getByRole('button', { name: 'Émotions' }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.rdv.tous())).map((r) => r.questions)).toEqual([[{ texte: 'Parler de : émotions', abordee: false }]]);
  await expect(page).toHaveURL(/#\/rdv\/rdv_/);
  await expect(sujets(page).getByRole('button', { name: 'Émotions' })).toHaveAttribute('aria-pressed', 'true');
});

test('Q22 · la liste modifiée dans Réglages › Listes (Soins) se retrouve dans la fiche : renommée, ajoutée, archivée, ordre', async ({ page }) => {
  const id = await creerRdv(page, null);
  await aller(page, '#/reglages/listes');
  await page.getByRole('list', { name: 'Soins', exact: true }).getByRole('link', { name: 'Sujets d\'un rendez-vous' }).click();
  await expect(page).toHaveURL(/#\/reglages\/listes\/sujetRdv$/);
  await page.getByRole('button', { name: 'Renommer Sommeil' }).click();
  const champ = page.getByLabel('Nouveau libellé pour Sommeil');
  await champ.fill('Mes nuits');
  await champ.press('Enter');
  await expect(page.getByRole('button', { name: 'Renommer Mes nuits' })).toBeVisible();
  await page.getByLabel('Nouvel élément').fill('TDAH');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Renommer TDAH' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Travail' }).getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByRole('heading', { name: 'Archivés' })).toBeVisible();
  await page.getByRole('button', { name: 'Monter Traitement' }).click();
  await expect.poll(async () => (await repo(page, () => window.__carnet.repo.listes.items('sujetRdv'))).filter((x) => !x.archive).map((x) => x.libelle))
    .toEqual(['Traitement', 'Mes nuits', 'Explosions', 'Fatigue', 'Émotions', 'Autre chose', 'TDAH']);

  await aller(page, `#/rdv/${id}`);
  await expect(sujets(page).getByRole('button')).toHaveText(['Traitement', 'Mes nuits', 'Explosions', 'Fatigue', 'Émotions', 'Autre chose', 'TDAH']);
  await sujets(page).getByRole('button', { name: 'Mes nuits' }).click();
  await sujets(page).getByRole('button', { name: 'TDAH' }).click();
  await expect.poll(async () => (await lireRdv(page, id)).questions?.map((q) => q.texte)).toEqual(['Parler de : mes nuits', 'Parler de : TDAH']);

  // Un sujet archivé dont la question est posée reste visible, choisi, en dernier ; un toucher la retire, et il part.
  const autre = await creerRdv(page, [{ texte: 'Parler de : travail', abordee: false }]);
  await aller(page, `#/rdv/${autre}`);
  await expect(sujets(page).getByRole('button')).toHaveText(['Traitement', 'Mes nuits', 'Explosions', 'Fatigue', 'Émotions', 'Autre chose', 'TDAH', 'Travail']);
  await expect(sujets(page).getByRole('button', { name: 'Travail' })).toHaveAttribute('aria-pressed', 'true');
  await sujets(page).getByRole('button', { name: 'Travail' }).click();
  await expect.poll(async () => (await lireRdv(page, autre)).questions ?? null).toBeNull();
  await expect(sujets(page).getByRole('button', { name: 'Travail' })).toHaveCount(0);
});
