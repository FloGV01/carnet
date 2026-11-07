import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, glisser } from '../aides/saisie.js';
import { espionnerAudio } from '../aides/audio.js';
import { installerParole } from '../aides/lecteur.js';
import { vueMoment, bulle, carte, faisais, terminer } from '../aides/emotion.js';

// v11 (9/11) · Le geste de retour (spec §11). Sur un écran à « Retour », le doigt qui glisse vers la droite, partout sur
// l'écran, fait comme ce bouton, au lâcher ; vers la gauche, rien. Mêmes seuils que pour changer de jour (60 px, ou un geste
// rapide, nettement plus horizontal que vertical). L'onglet des jours garde son geste (la veille, le lendemain), la page d'un
// jour ouverte depuis l'Historique aussi ; Analyse, Bien-être, Soins et Réglages : rien. Un geste parti d'un champ de texte,
// de la roue, d'une zone qui défile de côté, d'une feuille ou d'une confirmation est ignoré. Les écrans ouverts par-dessus
// l'app : là où l'on relit (un épisode, un symptôme ou un relevé rouvert, le récapitulatif de l'Après coup), le geste fait
// comme « Fermer » ; ailleurs (une saisie, Moment difficile, le lecteur, les minuteurs, les sons, les écrans de l'émotion,
// En consultation), rien. Sur le vrai iPhone, le geste ne vit que si la page garde le geste horizontal (touch-action, point
// de vigilance 2). Données inventées, sans prénom. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    await r.episodes.creer({ date: '2026-10-15', heure: '18:40', emotion: 'emotion:colere', intensite: 6, declencheur: 'declencheur:conflit' }, { id: 'ep-rouvert' });
    await r.episodes.creer({ date: '2026-10-12', heure: '14:30', emotion: 'emotion:colere', intensite: 5, declencheur: 'declencheur:injustice',
      apresCoup: { types: ['typeExplosion:colere'], repereA: 4, siJe: 'je sens la chaleur monter', alorsJe: 'je sors', jour: '2026-10-13' } }, { id: 'ep-ac' });
    await r.symptomes.creer({ date: '2026-10-15', symptome: 'symptome:ruminations', intensite: 4 }, { id: 'sy-rouvert' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '09:10', emotion: 'roue:joie:curieux', energie: 'energie:haute', faisais: ['activiteMoment:travail'] }, { id: 'hu-rouvert' });
    await r.rdv.creer({ date: '2026-10-20', heure: '10:30', professionnel: 'professionnel:psychiatre', questions: [{ texte: 'La colère du soir', abordee: false }] }, { id: 'rdv-oct' });
  });
  await page.reload();
  await appPrete(page);
});

const adresse = (page) => page.evaluate(() => location.hash);
const vue = (page, nom) => page.getByRole('dialog', { name: nom, exact: true });
const titre = (page, nom) => page.getByRole('heading', { name: nom, level: 1, exact: true });
const toast = (page, texte) => page.getByRole('status').filter({ hasText: texte });
// Ouvre un écran par son adresse, depuis `depuis` (l'écran d'où l'on vient décide où ramène « Retour » ou « Fermer »).
const ouvrir = async (page, hash, depuis = '#/aujourdhui') => {
  if (depuis) {
    await aller(page, depuis);
    await expect.poll(() => adresse(page)).toBe(depuis);
  }
  await aller(page, hash);
  await expect.poll(() => adresse(page)).toBe(hash);
};
// Le geste a été ignoré : l'adresse n'a pas changé, même le temps laissé à une fermeture qui attendrait une écriture.
const resteSur = async (page, hash) => {
  await page.clock.runFor(300);
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  expect(await adresse(page)).toBe(hash);
};
// Les deux sens, rien : le doigt vers la droite puis vers la gauche, 120 px chacun.
const deuxSensRien = async (page, selecteur, hash) => {
  await glisser(page, selecteur, 120, 8);
  await resteSur(page, hash);
  await glisser(page, selecteur, -120, 8);
  await resteSur(page, hash);
};

// ---------- Les écrans à « Retour » ----------

const POUSSES = [
  ['#/historique', 'Historique', '#/analyse'],
  ['#/comprendre/energie', 'Comprendre', '#/analyse'],
  ['#/reglages/journee', 'Le soir', '#/reglages'],
  ['#/bien-etre/calmer', 'Me calmer vite', '#/bien-etre'],
];

test('le doigt vers la droite fait comme « Retour » : Historique et Comprendre vers l\'Analyse, Le soir vers Réglages, une entrée vers Bien-être', async ({ page }) => {
  for (const [hash, nom, attendu] of POUSSES) {
    await ouvrir(page, hash);
    await expect(titre(page, nom)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retour', exact: true })).toBeVisible();
    // Le doigt part du titre, de la ligne « Retour » ou du bas de l'écran : partout, le même retour.
    await glisser(page, 'h1.titre-ecran', 120, 8);
    await expect.poll(() => adresse(page), hash).toBe(attendu);
  }
  // Depuis le bas de la page, sous le contenu, ou depuis la rangée du bouton « Retour » : pareil.
  await ouvrir(page, '#/historique');
  await expect(titre(page, 'Historique')).toBeVisible();
  await glisser(page, 'main.ecran', 140, -10);
  await expect.poll(() => adresse(page)).toBe('#/analyse');
  await ouvrir(page, '#/reglages/journee');
  await expect(titre(page, 'Le soir')).toBeVisible();
  await glisser(page, '.barre-retour', 100);
  await expect.poll(() => adresse(page)).toBe('#/reglages');
});

test('vers la gauche, un geste lent de 59 px ou un geste trop vertical : rien ; un geste rapide de 40 px : retour', async ({ page }) => {
  await ouvrir(page, '#/historique');
  await expect(titre(page, 'Historique')).toBeVisible();
  await glisser(page, 'h1.titre-ecran', -120, 8);
  await resteSur(page, '#/historique');
  await glisser(page, 'h1.titre-ecran', -40, 0, 0);
  await resteSur(page, '#/historique');
  await glisser(page, 'h1.titre-ecran', 59, 0, 1000);
  await resteSur(page, '#/historique');
  await glisser(page, 'h1.titre-ecran', 90, 60); // |dx| = 1,5 × |dy|
  await resteSur(page, '#/historique');
  await glisser(page, 'h1.titre-ecran', 30, -200);
  await resteSur(page, '#/historique');
  // Un pointeur de souris ne glisse pas : seul le doigt compte.
  await page.locator('h1.titre-ecran').evaluate((el) => {
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 60, clientY: 120, bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 260, clientY: 120, bubbles: true }));
  });
  await resteSur(page, '#/historique');
  // Rapide : 40 px levés aussitôt suffisent.
  await glisser(page, 'h1.titre-ecran', 40, 0, 0);
  await expect.poll(() => adresse(page)).toBe('#/analyse');
});

test('Analyse, Bien-être, Soins et Réglages : le geste ne fait rien, dans les deux sens', async ({ page }) => {
  for (const [hash, nom] of [['#/analyse', 'Analyse'], ['#/bien-etre', 'Bien-être'], ['#/soins', 'Soins'], ['#/reglages', 'Réglages']]) {
    await ouvrir(page, hash, '#/historique');
    await expect(titre(page, nom)).toBeVisible();
    await deuxSensRien(page, 'h1.titre-onglet', hash);
    await deuxSensRien(page, 'main.ecran', hash);
  }
});

test('l\'onglet des jours garde son geste : vers la droite la veille, vers la gauche le lendemain ; un jour ouvert depuis l\'Historique va à la veille, pas à l\'Historique', async ({ page }) => {
  await ouvrir(page, '#/aujourdhui', null);
  await glisser(page, '.carte-champ .tete-rubrique', 120, 8);
  await expect.poll(() => adresse(page)).toBe('#/jour/2026-10-14');
  await glisser(page, '.carte-champ .tete-rubrique', -120, 8);
  await expect.poll(() => adresse(page)).toBe('#/aujourdhui');

  await ouvrir(page, '#/historique/jour/2026-10-10', '#/historique');
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toBeVisible();
  await glisser(page, '.carte-champ .tete-rubrique', 120, 8);
  await expect.poll(() => adresse(page)).toBe('#/historique/jour/2026-10-09');
  await resteSur(page, '#/historique/jour/2026-10-09');
  await glisser(page, '.carte-champ .tete-rubrique', -120, 8);
  await expect.poll(() => adresse(page)).toBe('#/historique/jour/2026-10-10');
  // Son bouton « Retour », lui, ramène à l'Historique.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/historique');
});

test('ignoré quand il part d\'un champ de texte, de son bouton « Dicter », de la roue ou d\'une zone qui défile de côté', async ({ page }) => {
  await ouvrir(page, '#/mon-plan', '#/reglages');
  await expect(titre(page, 'Mon plan')).toBeVisible();
  await glisser(page, 'main.ecran textarea', 150);
  await resteSur(page, '#/mon-plan');
  await glisser(page, 'main.ecran .dicter', 150);
  await resteSur(page, '#/mon-plan');
  // La roue (ui/composants/roue-choix.js, nommée par departIgnore) et une zone qui défile de côté, posées pour le test au bas
  // de la page : aucune n'existe encore sur un écran à « Retour ».
  await page.evaluate(() => {
    const main = document.querySelector('main.ecran');
    const roue = document.createElement('div');
    roue.className = 'roue-choix';
    const valeur = document.createElement('button');
    valeur.textContent = '7 h';
    roue.append(valeur);
    const bande = document.createElement('div');
    bande.className = 'essai-defile';
    bande.style.overflowX = 'auto';
    bande.style.height = '60px';
    const large = document.createElement('div');
    large.style.width = '1200px';
    large.style.height = '50px';
    bande.append(large);
    main.append(roue, bande);
  });
  await glisser(page, '.roue-choix button', 150);
  await resteSur(page, '#/mon-plan');
  await glisser(page, '.essai-defile > div', 150);
  await resteSur(page, '#/mon-plan');
  // Le même geste, parti du titre : retour à Réglages.
  await glisser(page, 'h1.titre-ecran', 150);
  await expect.poll(() => adresse(page)).toBe('#/reglages');
});

// ---------- Là où l'on relit ----------

test('un épisode rouvert : le geste fait comme « Fermer », même destination, même message ; pas depuis un champ, une feuille ou une confirmation', async ({ page }) => {
  const fiche = vue(page, 'Épisode');
  // « Fermer » d'abord : la destination et le message à retrouver.
  await ouvrir(page, '#/episode/ep-rouvert', '#/historique');
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/historique');
  await expect(toast(page, 'Épisode enregistré')).toBeVisible();

  await ouvrir(page, '#/episode/ep-rouvert', '#/historique');
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(fiche).toHaveClass(/\brelecture\b/);
  // Depuis un champ de texte : rien.
  await glisser(page, '#episodes-ceQueJeRetiens', 150);
  await resteSur(page, '#/episode/ep-rouvert');
  // Une feuille ouverte (« Mon plan ») : rien, et elle reste ouverte.
  await fiche.getByRole('button', { name: 'Mon plan' }).click();
  const plan = vue(page, 'Mon plan');
  await expect(plan).toBeVisible();
  await glisser(page, '.feuille', 150);
  await resteSur(page, '#/episode/ep-rouvert');
  await expect(plan).toBeVisible();
  await plan.getByRole('button', { name: 'Fermer' }).click();
  await expect(plan).toHaveCount(0);
  // Une confirmation ouverte (« Supprimer cet épisode ») : rien, et elle reste ouverte.
  await fiche.getByRole('button', { name: 'Supprimer cet épisode' }).click();
  const boite = page.getByRole('alertdialog');
  await expect(boite).toBeVisible();
  await glisser(page, '[role="alertdialog"]', 150);
  await resteSur(page, '#/episode/ep-rouvert');
  await expect(boite).toBeVisible();
  await boite.getByRole('button', { name: 'Annuler' }).click();
  await expect(boite).toHaveCount(0);
  // Vers la gauche : rien.
  await glisser(page, '.parcours-corps .titre-question', -150);
  await resteSur(page, '#/episode/ep-rouvert');
  // Vers la droite, depuis le récapitulatif ou depuis le pied : comme « Fermer ».
  await glisser(page, '.parcours-corps .titre-question', 150, 10);
  await expect.poll(() => adresse(page)).toBe('#/historique');
  await expect(toast(page, 'Épisode enregistré')).toBeVisible();
  await expect(toast(page, 'Épisode enregistré').getByRole('button', { name: 'Annuler' })).toBeVisible();
  await ouvrir(page, '#/episode/ep-rouvert', '#/historique');
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await glisser(page, '.parcours-pied', 150);
  await expect.poll(() => adresse(page)).toBe('#/historique');
  expect(await page.evaluate(() => window.__carnet.repo.episodes.lire('ep-rouvert'))).toMatchObject({ emotion: 'emotion:colere', intensite: 6 });
});

test('un symptôme rouvert, le récapitulatif de l\'Après coup et un relevé rouvert : le geste fait comme « Fermer »', async ({ page }) => {
  await ouvrir(page, '#/symptome/sy-rouvert', '#/soins');
  const symptome = vue(page, 'Symptôme');
  await expect(symptome.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await glisser(page, '.parcours-corps .titre-question', 150);
  await expect.poll(() => adresse(page)).toBe('#/soins');
  await expect(toast(page, 'Symptôme enregistré')).toBeVisible();

  // L'Après coup rouvert s'ouvre sur son récapitulatif ; « Fermer » ramène à l'écran d'avant.
  await ouvrir(page, '#/apres-coup/ep-ac', '#/historique');
  const apresCoup = vue(page, 'Après coup');
  await expect(apresCoup.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await glisser(page, '.parcours-corps .titre-question', -150);
  await resteSur(page, '#/apres-coup/ep-ac');
  await glisser(page, '.parcours-corps .titre-question', 150);
  await expect.poll(() => adresse(page)).toBe('#/historique');

  // Le relevé rouvert (l'écran 3) : comme ✕, avec son message ; la garde passée (aria-disabled), comme un toucher.
  await ouvrir(page, '#/moment/hu-rouvert');
  const releve = vueMoment(page);
  await expect(faisais(releve)).toBeVisible();
  await expect(releve.locator('.mot-rappel')).toHaveText('Curieux');
  await expect(terminer(releve)).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.moment-plein')).toHaveClass(/\brelecture\b/);
  await glisser(page, '.corps-faisais .titre-faisais', -150);
  await resteSur(page, '#/moment/hu-rouvert');
  await glisser(page, '.corps-faisais .titre-faisais', 150);
  await expect.poll(() => adresse(page)).toBe('#/aujourdhui');
  await expect(toast(page, 'Émotion du moment notée')).toBeVisible();
});

// ---------- Ailleurs, aucun geste ----------

test('une saisie : un épisode neuf, une étape rouverte, une étape de l\'Après coup, le récapitulatif d\'une fiche neuve ; rien', async ({ page }) => {
  await ouvrir(page, '#/episode/nouveau');
  const fiche = vue(page, 'Épisode');
  await expect(fiche.locator('.titre-question')).toBeVisible();
  await expect(fiche).not.toHaveClass(/\brelecture\b/);
  await deuxSensRien(page, '.parcours-corps .titre-question', '#/episode/nouveau');
  await deuxSensRien(page, '.parcours-pied', '#/episode/nouveau');

  // Une étape ouverte depuis le récapitulatif d'un épisode rouvert : rien ; revenue au récapitulatif, le geste revient.
  await ouvrir(page, '#/episode/ep-rouvert', '#/historique');
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche.locator('.ligne-recap').first().click();
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toHaveCount(0);
  await expect(fiche).not.toHaveClass(/\brelecture\b/);
  await deuxSensRien(page, '.parcours-corps .titre-question', '#/episode/ep-rouvert');
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toHaveCount(0);

  // Une étape de l'Après coup (un épisode sans Après coup s'ouvre sur la première).
  await ouvrir(page, '#/apres-coup/ep-rouvert', '#/historique');
  const apresCoup = vue(page, 'Après coup');
  await expect(apresCoup.getByRole('heading', { name: 'C\'était plutôt…' })).toBeVisible();
  await deuxSensRien(page, '.parcours-corps .titre-question', '#/apres-coup/ep-rouvert');

  // Le récapitulatif d'un symptôme neuf, mené jusque-là : il finit une saisie, rien.
  await ouvrir(page, '#/symptome/nouveau', '#/historique');
  const symptome = vue(page, 'Symptôme');
  await expect(symptome.locator('.titre-question')).toBeVisible();
  for (let i = 0; i < 8 && await symptome.getByRole('heading', { name: 'Récapitulatif' }).count() === 0; i++) {
    await symptome.getByRole('button', { name: /^Passer/ }).click();
  }
  await expect(symptome.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await expect(symptome).not.toHaveClass(/\brelecture\b/);
  await deuxSensRien(page, '.parcours-corps .titre-question', '#/symptome/nouveau');
});

test('Moment difficile, un exercice court, un exercice en cours, le minuteur, les sons et En consultation : rien', async ({ page }) => {
  await espionnerAudio(page);
  await ouvrir(page, '#/moment-difficile');
  await expect(vue(page, 'Moment difficile')).toBeVisible();
  await deuxSensRien(page, '.parcours-corps', '#/moment-difficile');

  await ouvrir(page, '#/crise/panique', '#/moment-difficile');
  await expect(vue(page, 'Panique')).toBeVisible();
  await deuxSensRien(page, '.parcours-corps', '#/crise/panique');

  await ouvrir(page, '#/exercice/soupir', '#/bien-etre/calmer');
  const soupir = vue(page, 'Le soupir');
  await soupir.getByRole('button', { name: 'Commencer', exact: true }).click();
  await expect(soupir.getByRole('button', { name: 'Commencer', exact: true })).toHaveCount(0);
  await deuxSensRien(page, '.parcours-corps', '#/exercice/soupir');

  for (const [hash, nom] of [['#/minuteur', 'Minuteur silencieux'], ['#/sons', 'Sons de fond']]) {
    await ouvrir(page, hash, '#/bien-etre');
    await expect(vue(page, nom)).toBeVisible();
    await deuxSensRien(page, '.parcours-corps', hash);
  }

  await ouvrir(page, '#/consultation/rdv-oct', '#/soins');
  await expect(vue(page, 'En consultation')).toBeVisible();
  await deuxSensRien(page, '.parcours-corps', '#/consultation/rdv-oct');
});

test('les écrans de l\'émotion : l\'écran 1, la carte, et la carte d\'un relevé rouvert (« Changer le mot ») ; rien', async ({ page }) => {
  await ouvrir(page, '#/moment');
  const moment = vueMoment(page);
  await expect(bulle(moment, 'vert')).toBeVisible();
  await expect(page.locator('.moment-plein')).not.toHaveClass(/\brelecture\b/);
  await deuxSensRien(page, '.titre-bulles', '#/moment');
  await bulle(moment, 'vert').click();
  await expect(carte(moment)).toBeVisible();
  await deuxSensRien(page, '.ecran-carte', '#/moment');
  await expect(carte(moment)).toBeVisible();

  await ouvrir(page, '#/moment/hu-rouvert');
  const releve = vueMoment(page);
  await expect(faisais(releve)).toBeVisible();
  await releve.getByRole('button', { name: 'Changer le mot', exact: true }).click();
  await expect(carte(releve)).toBeVisible();
  await expect(page.locator('.moment-plein')).not.toHaveClass(/\brelecture\b/);
  await deuxSensRien(page, '.ecran-carte', '#/moment/hu-rouvert');
  await expect(carte(releve)).toBeVisible();
});

// ---------- Point de vigilance 2 ----------

// Dans WebKit, une zone qui défile repart de touch-action: auto : sans pan-y pinch-zoom sur elle, iOS prend le geste horizontal
// pour lui (pointercancel), alors que les événements simulés passent. La valeur calculée le prouve, écran par écran.
test('vigilance 2 · le geste horizontal reste à la page : touch-action « pan-y pinch-zoom » sur les écrans à « Retour » et là où l\'on relit, corps qui défilent compris', async ({ page }) => {
  const touchAction = (selecteur) => page.locator(selecteur).first().evaluate((e) => getComputedStyle(e).touchAction);
  for (const [hash, nom] of POUSSES.concat([['#/mon-plan', 'Mon plan']])) {
    await ouvrir(page, hash);
    await expect(titre(page, nom)).toBeVisible();
    expect(await page.locator('main.ecran:has(> .entete-pousse)').count(), hash).toBe(1);
    expect(await touchAction('main.ecran'), hash).toBe('pan-y pinch-zoom');
  }
  // Un onglet n'en a pas besoin : le défilement d'iOS reste entier.
  await ouvrir(page, '#/reglages');
  await expect(titre(page, 'Réglages')).toBeVisible();
  expect(await touchAction('main.ecran')).toBe('auto');

  await ouvrir(page, '#/episode/ep-rouvert', '#/historique');
  await expect(vue(page, 'Épisode').getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  expect(await touchAction('.parcours.relecture')).toBe('pan-y pinch-zoom');
  expect(await touchAction('.parcours.relecture .parcours-corps')).toBe('pan-y pinch-zoom');
  await ouvrir(page, '#/apres-coup/ep-ac', '#/historique');
  await expect(vue(page, 'Après coup').getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  expect(await touchAction('.parcours.relecture .parcours-corps')).toBe('pan-y pinch-zoom');
  // Une saisie n'est pas .relecture : son corps défile comme avant.
  await ouvrir(page, '#/episode/nouveau');
  await expect(vue(page, 'Épisode').locator('.titre-question')).toBeVisible();
  expect(await touchAction('.parcours')).toBe('auto');
  expect(await touchAction('.parcours-corps')).toBe('auto');

  await ouvrir(page, '#/moment/hu-rouvert');
  await expect(faisais(vueMoment(page))).toBeVisible();
  expect(await touchAction('.moment-plein.relecture')).toBe('pan-y pinch-zoom');
  expect(await touchAction('.moment-plein.relecture .corps-faisais')).toBe('pan-y pinch-zoom');
});
