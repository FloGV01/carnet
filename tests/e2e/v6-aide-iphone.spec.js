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

test('la page dit que c\'est l\'iPhone qui sonne, pas Carnet, et ne propose aucun bouton d\'action', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  await expect(page.getByRole('heading', { name: 'Aide iPhone', level: 1 })).toBeVisible();
  await expect(page.getByText('c\'est le minuteur de l\'iPhone qui sonne', { exact: false })).toBeVisible();
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
test('v11 : « Changer d\'icône sans rien perdre », les cinq étapes de la spec, rien à supprimer avant la dernière', async ({ page }) => {
  await aller(page, '#/reglages/aide-iphone');
  const icone = page.locator('section', { has: page.getByRole('heading', { name: 'Changer d\'icône sans rien perdre', level: 2 }) });
  const etapes = icone.locator('ol.etapes > li');
  await expect(etapes).toHaveText([
    'Redémarrer l\'iPhone : l\'icône a peut-être changé. Si oui, c\'est fini.',
    'Dans l\'ancien Carnet : Réglages › Exporter, enregistrer dans Fichiers.',
    'Dans Safari : ouvrir l\'adresse de Carnet, Partager › Sur l\'écran d\'accueil. Vérifier l\'aperçu : s\'il montre la nouvelle icône, Ajouter. Sinon, annuler, fermer l\'onglet, rouvrir l\'adresse et recommencer.',
    'Ouvrir le nouveau Carnet, qui doit être vide : Réglages › Importer. Vérifier quelques jours dans l\'Historique.',
    'Ranger l\'ancien dans un dossier, et ne plus y écrire. Le supprimer plus tard, ou jamais.',
  ]);
  const textes = await etapes.allTextContents();
  const supprimer = /suppr|effac/i;
  textes.slice(0, -1).forEach((t, i) => expect(t, `étape ${i + 1}`).not.toMatch(supprimer));
  // Ce que la copie ne garde pas, en note.
  await expect(icone.locator('.note-import')).toHaveText('La copie ne garde pas les brouillons en cours, les réglages du lecteur ni les replis ouverts. Le micro sera sans doute à réautoriser.');
});
