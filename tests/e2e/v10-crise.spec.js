import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, simulerZonesSures } from '../aides/saisie.js';
import { espionnerAudio, audio, notes } from '../aides/audio.js';
import { installerParole, parole, installerVerrou, verrou, cacher, seances, environ } from '../aides/lecteur.js';
import { contraste } from '../aides/couleurs.js';

// v10 (5/9) · Moment difficile par état (spec §5 et §14.5) : quatre boutons en tête, un toucher démarre un exercice court dans
// le lecteur en mode crise (#/crise/:id), sans choix de durée, sans son au départ, sans compte à rebours, sans « Noter mon
// émotion » ; le signal et la voix suivent Réglages › Moment difficile. Le détail du mode crise est dans v10-lecteur.spec.js.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

const PLAN = {
  premiersSignes: 'la voix qui monte',
  quandCaMonte: 'je sors marcher\nje bois de l\'eau',
  siSurcharge: 'je coupe le bruit',
  pourRecuperer: 'je m\'allonge',
  prevenir: 'une personne de confiance',
  siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }],
};
const COURTS = ['Panique', 'Colère', 'Trop-plein', 'Réveil la nuit'];
const PANIQUE = 'Pose les pieds bien à plat et appuie. Tu peux bouger, ou passer une étape, quand tu veux.';
const CONSIGNE_NUIT = /^Reste là où tu es, allongé\./;
const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const courts = (zone) => zone.getByRole('group', { name: 'Un exercice court' });
const court = (zone, nom) => courts(zone).getByRole('button', { name: nom, exact: true });
const consigne = (v) => v.locator('.lecteur-consigne');
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, x) => page.evaluate(([c, v]) => window.__carnet.repo.meta.ecrire(c, v), [cle, x]);
const clesCarnet = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:')).sort());
const adresse = (page) => page.evaluate(() => location.hash);
const texte = (t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s')}$`);
const reglageVoix = (page) => page.getByRole('switch', { name: 'Lire les consignes à voix haute', exact: true });
// L'horloge factice tourne aussi en temps réel : pour un temps serré, elle s'arrête, et n'avance plus que par runFor.
const figer = async (page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
// Passe par Réglages pour que l'écran soit monté de nouveau (et relise le plan).
const ouvrir = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  const v = vue(page, 'Moment difficile');
  await expect(v.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeVisible();
  return v;
};

// ---------- L'écran ----------

for (const theme of ['light', 'dark']) {
  test(`les quatre boutons (${theme === 'light' ? 'clair' : 'sombre'}) : de même taille, en 2 × 2, en tête de l'écran, à l'écran sans défiler au-dessus de la respiration ; à la couleur du parcours, AA ; rien n'est écrit`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await simulerZonesSures(page);
    await ecrireMeta(page, 'monPlan', PLAN);
    const v = await ouvrir(page);
    await expect(courts(v).getByRole('button')).toHaveCount(4);
    expect(await courts(v).getByRole('button').allTextContents()).toEqual(COURTS);
    for (const nom of COURTS) await expect(court(v, nom)).toBeInViewport({ ratio: 1 });
    const m = await v.evaluate((d) => {
      const boite = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, largeur: r.width, hauteur: r.height, bas: r.bottom, droite: r.right }; };
      const corps = d.querySelector('.parcours-corps');
      const [etape] = corps.children;
      const boutons = [...d.querySelectorAll('.exercice-court')];
      const s = getComputedStyle(boutons[0]);
      return {
        premier: etape.firstElementChild.className,
        boutons: boutons.map(boite),
        respiration: boite(d.querySelector('.carte-respiration')),
        pied: boite(d.querySelector('.parcours-pied')),
        tete: boite(d.querySelector('.parcours-tete')),
        fond: s.backgroundColor, couleur: s.color, graisse: s.fontWeight,
        defilement: corps.scrollTop,
      };
    });
    expect(m.premier).toBe('exercices-courts');
    expect(m.defilement).toBe(0);
    const [a, b, c, d] = m.boutons;
    // Deux lignes de deux, à la même largeur et à la même hauteur, de bord à bord du corps.
    expect([a.y, c.y]).toEqual([b.y, d.y]);
    expect(c.y).toBeGreaterThan(a.y);
    expect([a.x, b.x]).toEqual([c.x, d.x]);
    for (const x of m.boutons) {
      expect(x.hauteur).toBeGreaterThanOrEqual(60);
      expect([x.largeur, x.hauteur]).toEqual([a.largeur, a.hauteur]);
      expect(x.y).toBeGreaterThanOrEqual(m.tete.bas);
      expect(x.bas).toBeLessThanOrEqual(m.pied.y);
    }
    expect(d.droite).toBeLessThanOrEqual(390);
    expect(d.bas).toBeLessThanOrEqual(m.respiration.y);
    expect(m.graisse).toBe('600');
    expect(contraste(m.fond, m.couleur), theme).toBeGreaterThanOrEqual(4.5);
    expect(await clesCarnet(page)).toEqual([]);
    await expect(v).not.toContainText('il reste');
  });
}

test('le reste de l\'écran ne change pas : la respiration, « Une chose à la fois » et Mon plan en dessous, le pied « Noter un épisode » à sa place ; le corps défile jusqu\'au bas du plan', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  const v = await ouvrir(page);
  await expect(v.locator('.respiration')).toBeVisible();
  await expect(bouton(v, 'Une chose à la fois')).toBeVisible();
  const lien = v.getByRole('link', { name: 'Noter un épisode' });
  await expect(lien).toBeInViewport({ ratio: 1 });
  const piedAvant = await v.locator('.parcours-pied').boundingBox();
  const corps = v.locator('.parcours-corps');
  await corps.evaluate((c) => { c.scrollTop = c.scrollHeight; });
  await expect(v.getByText('Si la chaleur monte, alors je respire')).toBeInViewport({ ratio: 1 });
  expect(await corps.evaluate((c) => c.scrollTop)).toBeGreaterThan(0);
  expect(await v.locator('.parcours-pied').boundingBox()).toEqual(piedAvant);
  await expect(lien).toBeInViewport({ ratio: 1 });
  const plan = await v.getByRole('region', { name: 'Mon plan' }).boundingBox();
  expect(plan.y + plan.height).toBeLessThanOrEqual(piedAvant.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  // « Modifier » de Mon plan s'atteint en défilant, et mène à Mon plan.
  await v.getByRole('link', { name: 'Modifier mon plan', exact: true }).click();
  await expect.poll(() => adresse(page)).toBe('#/mon-plan');
});

test('très grand texte : les quatre boutons tiennent, de même taille, sans débordement ; en 2 × 2 tant que les mots tiennent entiers, puis l\'un sous l\'autre ; aucun mot coupé, sauf « Trop-plein » à son trait d\'union', async ({ page }) => {
  await ecrireMeta(page, 'monPlan', PLAN);
  const v = await ouvrir(page);
  for (const [taille, colonnes] of [[17, 2], [21, 2], [23, 2], [28, 2], [33, 2], [38, 2], [40, 1], [47, 1], [53, 1]]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const m = await v.evaluate((d) => {
      const largeur = document.documentElement.clientWidth;
      const corps = d.querySelector('.parcours-corps');
      const boutons = [...d.querySelectorAll('.exercice-court')].map((b) => {
        const r = b.getBoundingClientRect();
        const noeud = b.firstChild;
        // Les morceaux d'un seul tenant : chacun sur une ligne, et dans le bouton.
        const morceaux = [...noeud.textContent.matchAll(/[^\s-]+-?/g)].map((x) => {
          const plage = document.createRange();
          plage.setStart(noeud, x.index);
          plage.setEnd(noeud, x.index + x[0].length);
          const t = plage.getBoundingClientRect();
          return { mot: x[0], lignes: plage.getClientRects().length, dedans: t.left >= r.left && t.right <= r.right && t.top >= r.top && t.bottom <= r.bottom };
        });
        return { x: r.x, droite: r.right, largeur: r.width, hauteur: r.height, deborde: b.scrollWidth > b.clientWidth, morceaux };
      });
      return { largeur, page: document.documentElement.scrollWidth, corps: corps.scrollWidth - corps.clientWidth, boutons };
    });
    const quoi = `${taille} px`;
    expect(m.page, quoi).toBeLessThanOrEqual(m.largeur);
    expect(m.corps, quoi).toBe(0);
    for (const b of m.boutons) {
      expect(b.x, quoi).toBeGreaterThanOrEqual(0);
      expect(b.droite, quoi).toBeLessThanOrEqual(m.largeur);
      expect(b.deborde, quoi).toBe(false);
      expect(b.hauteur, quoi).toBeGreaterThanOrEqual(60);
      expect([b.largeur, b.hauteur], quoi).toEqual([m.boutons[0].largeur, m.boutons[0].hauteur]);
      for (const x of b.morceaux) expect(x, quoi).toEqual({ mot: x.mot, lignes: 1, dedans: true });
    }
    expect(new Set(m.boutons.map((b) => b.x)).size, quoi).toBe(colonnes);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('très grand texte : « Commencer », puis « Recommencer » une fois la respiration finie, restent dans la carte, sans débordement ; leur texte ne se borne qu\'à 44 px, le texte normal ne change pas', async ({ page }) => {
  await ecrireMeta(page, 'respiration', { duree: 2, rythme: '5-5', son: false, voix: false });
  const v = await ouvrir(page);
  const mesurer = async (nom) => {
    for (const [taille, texteBouton] of [[17, 18], [28, 29.65], [40, 42.36], [47, 44], [53, 44]]) {
      await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
      const m = await v.evaluate((d) => {
        const corps = d.querySelector('.parcours-corps');
        const carte = d.querySelector('.carte-respiration').getBoundingClientRect();
        const b = d.querySelector('.respiration .btn');
        const r = b.getBoundingClientRect();
        const plage = document.createRange();
        plage.selectNodeContents(b.lastChild);
        const mot = plage.getBoundingClientRect();
        return {
          gauche: r.left - carte.left, droite: carte.right - r.right, motGauche: mot.left - r.left, motDroite: r.right - mot.right,
          lignes: plage.getClientRects().length, texte: parseFloat(getComputedStyle(b).fontSize), corps: corps.scrollWidth - corps.clientWidth,
        };
      });
      const quoi = `${nom}, ${taille} px`;
      expect(m.gauche, quoi).toBeGreaterThanOrEqual(0);
      expect(m.droite, quoi).toBeGreaterThanOrEqual(0);
      expect(m.motGauche, quoi).toBeGreaterThanOrEqual(0);
      expect(m.motDroite, quoi).toBeGreaterThanOrEqual(0);
      expect(m.lignes, quoi).toBe(1);
      expect(m.corps, quoi).toBe(0);
      expect(m.texte, quoi).toBeCloseTo(texteBouton, 1);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  };
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await mesurer('Commencer');
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(121000);
  await expect(bouton(v, 'Recommencer')).toBeVisible();
  await mesurer('Recommencer');
});

// ---------- Un toucher démarre ----------

test('un toucher sur « Panique » : le lecteur démarre aussitôt, sans « Commencer », sans son ; à la fin, retour sur Moment difficile sans message, séance d\'origine moment-difficile menée au bout ; rien d\'autre n\'est écrit', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  await ecrireMeta(page, 'monPlan', PLAN);
  const v = await ouvrir(page);
  const meta = await lireMeta(page, 'respiration');
  await court(v, 'Panique').click();
  const l = vue(page, 'Panique');
  await expect(consigne(l)).toHaveText(texte(PANIQUE));
  await expect.poll(() => adresse(page)).toBe('#/crise/panique');
  await expect(bouton(l, 'Pause')).toBeVisible();
  await expect(bouton(l, 'Commencer')).toHaveCount(0);
  // Pas de choix de durée, ni anneau, ni compte à rebours, ni épingle ; le plein écran, sans onglets.
  await expect(l.getByRole('group', { name: 'Durée' })).toHaveCount(0);
  await expect(l.locator('.anneau-temps, .anneau-plein, .epingle')).toHaveCount(0);
  await expect(l).not.toContainText('il reste');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await figer(page);
  await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1, rendus: 0 });
  // Jusqu'au bout : aucun son, aucune voix.
  await page.clock.runFor(120500);
  await expect(consigne(l)).toHaveText('Fin de l\'exercice.');
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'panique', origine: 'moment-difficile', fin: true, date: '2026-10-15' });
  environ(s.dureeS, 120);
  await expect.poll(() => verrou(page)).toMatchObject({ rendus: 1 });
  expect(await audio(page)).toMatchObject({ notes: [], oscillateurs: [], souffles: [] });
  expect((await parole(page)).dits).toEqual([]);
  // La fermeture après 6 s : Moment difficile, tel qu'on l'a laissé, et aucun message.
  await page.clock.runFor(6100);
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
  await expect(court(vue(page, 'Moment difficile'), 'Panique')).toBeVisible();
  await expect(page.getByText('Noter mon émotion')).toHaveCount(0);
  await expect(page.getByText('Fin de l\'exercice.')).toHaveCount(0);
  // Le bouton touché n'est pas une donnée : ni « Reprendre », ni réglage. Et « Fermer » de Moment difficile ramène à Aujourd'hui.
  expect(await clesCarnet(page)).toEqual([]);
  expect(await lireMeta(page, 'respiration')).toEqual(meta);
  await vue(page, 'Moment difficile').getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/aujourdhui');
});

for (const [nom, id, attendue] of [
  ['Colère', 'colere', /^Éloigne-toi si tu peux\./],
  ['Trop-plein', 'trop-plein', /./],
  ['Réveil la nuit', 'reveil-nuit', CONSIGNE_NUIT],
]) {
  test(`un toucher sur « ${nom} » : le bon exercice démarre aussitôt ; « Fermer » revient à Moment difficile, sans séance avant 60 s`, async ({ page }) => {
    await espionnerAudio(page);
    const v = await ouvrir(page);
    await court(v, nom).click();
    const l = vue(page, nom);
    await expect(consigne(l)).toHaveText(attendue);
    await expect.poll(() => adresse(page)).toBe(`#/crise/${id}`);
    await expect(bouton(l, 'Pause')).toBeVisible();
    await expect(bouton(l, 'Commencer')).toHaveCount(0);
    await expect(l).not.toContainText('il reste');
    if (id === 'reveil-nuit') expect(await l.evaluate((d) => getComputedStyle(d).backgroundColor)).toBe('rgb(0, 0, 0)');
    await l.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
    await expect(court(vue(page, 'Moment difficile'), nom)).toBeVisible();
    expect(await seances(page)).toEqual([]);
    expect((await audio(page)).notes).toEqual([]);
  });
}

test('deux touchers de suite sur un même bouton : un seul lecteur, une seule lecture', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const v = await ouvrir(page);
  await court(v, 'Colère').evaluate((b) => { b.click(); b.click(); });
  const l = vue(page, 'Colère');
  await expect(consigne(l)).toHaveText(/^Éloigne-toi/);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1 });
  await l.getByRole('button', { name: 'Terminer' }).click();
  await page.clock.runFor(6100);
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
  expect(await seances(page)).toEqual([]);
});

test('page cachée pendant un exercice lancé de Moment difficile : pause, verrou rendu ; il ne reprend qu\'au toucher, et le retour reste Moment difficile', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const v = await ouvrir(page);
  await court(v, 'Panique').click();
  const l = vue(page, 'Panique');
  await expect(bouton(l, 'Pause')).toBeVisible();
  await expect.poll(() => verrou(page)).toMatchObject({ demandes: 1, rendus: 0 });
  await cacher(page);
  await expect(bouton(l, 'Reprendre')).toBeVisible();
  await expect.poll(() => verrou(page)).toMatchObject({ rendus: 1 });
  await bouton(l, 'Reprendre').click();
  await expect(bouton(l, 'Pause')).toBeVisible();
  await l.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
});

// ---------- L'adresse ----------

test('#/crise/:id : un identifiant inconnu, ou un exercice qui n\'est pas l\'un des quatre, ramène à Moment difficile ; ouverte sans toucher, l\'adresse attend « Commencer », rien ne joue seul ; à l\'onglet Aujourd\'hui', async ({ page }) => {
  await espionnerAudio(page);
  for (const id of ['inconnu', 'soupir', 'ancrage-54321']) {
    await aller(page, '#/reglages');
    await aller(page, `#/crise/${id}`);
    await expect.poll(() => adresse(page), id).toBe('#/moment-difficile');
    await expect(court(vue(page, 'Moment difficile'), 'Panique')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
  }
  await aller(page, '#/crise/colere');
  const l = vue(page, 'Colère');
  await expect(bouton(l, 'Commencer')).toBeVisible();
  await page.clock.runFor(3000);
  await expect(consigne(l)).toHaveCount(0);
  expect(await audio(page)).toMatchObject({ contextes: 0, notes: [] });
  expect(await seances(page)).toEqual([]);
  await l.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
  // Au démarrage, l'app revient toujours sur Aujourd'hui, comme pour les autres écrans.
  await aller(page, '#/crise/panique');
  await expect(bouton(vue(page, 'Panique'), 'Commencer')).toBeVisible();
  await page.reload();
  await appPrete(page);
  await expect.poll(() => adresse(page)).toBe('#/aujourdhui');
});

// ---------- Le signal et la voix ----------

test('la respiration en cours, signal allumé : toucher « Panique » garde le son éveillé, en session « ambient », pour les repères de l\'exercice ; la respiration est notée, et son verrou passe au lecteur', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true, voix: false });
  const v = await ouvrir(page);
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(70000);
  await expect(v.locator('.phase-respiration')).toHaveText(/^(Inspire|Expire)$/);
  const avant = await notes(page);
  expect(avant).toBeGreaterThan(0);
  await court(v, 'Panique').click();
  const l = vue(page, 'Panique');
  await expect(consigne(l)).toHaveText(texte(PANIQUE));
  await figer(page);
  // Passé le temps de veille que la respiration a demandé en se démontant : le contexte n'a pas dormi.
  await page.clock.runFor(1500);
  const a = await audio(page);
  expect(a).toMatchObject({ contextes: 1, suspensions: 0, session: 'ambient', etat: 'running' });
  expect(a.notes).toHaveLength(avant);
  await page.clock.runFor(11000);
  await expect.poll(() => notes(page)).toBe(avant + 1);
  await expect.poll(async () => (await seances(page)).filter((s) => s.exercice === 'coherence').length).toBe(1);
  await expect.poll(() => verrou(page)).toMatchObject({ demandes: 2, rendus: 1 });
  await l.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
});

test('« Fermer » touché avant que les réglages soient lus, signal allumé : rien ne démarre, et le son se rendort quand même', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  await ecrireMeta(page, 'respiration', { duree: 5, rythme: '5-5', son: true, voix: true });
  const v = await ouvrir(page);
  // Une lecture de la méta `respiration` qui traîne.
  await page.evaluate(() => {
    const { meta } = window.__carnet.repo;
    const { lire } = meta;
    window.__attentes = [];
    meta.lire = (cle) => (cle === 'respiration' ? new Promise((ok) => { window.__attentes.push(() => ok(lire.call(meta, cle))); }) : lire.call(meta, cle));
  });
  await court(v, 'Panique').click();
  const l = vue(page, 'Panique');
  await expect(l.getByRole('button', { name: 'Fermer' })).toBeVisible();
  await expect(consigne(l)).toHaveCount(0);
  await l.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');
  await page.evaluate(() => window.__attentes.forEach((liberer) => liberer()));
  await page.clock.runFor(1500);
  await expect.poll(async () => (await audio(page)).session).toBe('auto');
  expect(await audio(page)).toMatchObject({ suspensions: 1, notes: [] });
  expect(await verrou(page)).toMatchObject({ demandes: 0 });
  expect(await seances(page)).toEqual([]);
  expect((await parole(page)).dits).toEqual([]);
});

test('Réglages › Moment difficile : « Lire les consignes à voix haute », éteint au départ, sous « Signal sonore » ; rien n\'est écrit sans toucher ; le texte dit que le signal vaut aussi pour les exercices courts, et la voix pour eux seuls', async ({ page }) => {
  await aller(page, '#/reglages/moment-difficile');
  const voix = reglageVoix(page);
  await expect(voix).toHaveAttribute('aria-checked', 'false');
  const signal = page.getByRole('switch', { name: 'Signal sonore', exact: true });
  const ordre = await page.locator('.reglages-moment-difficile [role="switch"]').evaluateAll((l) => l.map((x) => x.getAttribute('aria-label')).slice(0, 2));
  expect(ordre).toEqual(['Signal sonore', 'Lire les consignes à voix haute']);
  await expect(page.locator('.reglages-moment-difficile')).toContainText('Le signal vaut aussi pour les exercices courts de Moment difficile, et la voix pour eux seuls.');
  await expect(page.locator('.reglages-moment-difficile')).toContainText('« Réveil la nuit » reste sans signal');
  expect(await lireMeta(page, 'respiration')).toBeNull();
  await voix.click();
  await expect(voix).toHaveAttribute('aria-checked', 'true');
  // Chaque réglage garde les autres.
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 5, rythme: '5-5', son: false, voix: true });
  await signal.click();
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 5, rythme: '5-5', son: true, voix: true });
  await page.getByRole('button', { name: 'Durée : 2 min', exact: true }).click();
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 2, rythme: '5-5', son: true, voix: true });
  await voix.click();
  await expect.poll(() => lireMeta(page, 'respiration')).toEqual({ duree: 2, rythme: '5-5', son: true, voix: false });
  expect(await clesCarnet(page)).toEqual([]);
});

for (const [titre, voix] of [['sans voix française', [{ lang: 'en-US', name: 'Anglaise', localService: true }]], ['sans synthèse vocale', null]]) {
  test(`Réglages › Moment difficile, ${titre} : pas d'interrupteur de la voix, le texte ne parle que du signal`, async ({ page }) => {
    await installerParole(page, voix);
    await page.reload();
    await appPrete(page);
    await aller(page, '#/reglages/moment-difficile');
    await expect(page.getByRole('switch', { name: 'Signal sonore', exact: true })).toBeVisible();
    await expect(reglageVoix(page)).toHaveCount(0);
    await expect(page.locator('.reglages-moment-difficile')).toContainText('Le signal vaut aussi pour les exercices courts de Moment difficile, sauf « Réveil la nuit ».');
    await expect(page.locator('.reglages-moment-difficile')).not.toContainText('la voix');
  });
}

test('la voix réglée dans Réglages : la synthèse lit la première consigne dès le toucher, puis la suivante ; le signal éteint, aucune note, la voix en session « ambient »', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await aller(page, '#/reglages/moment-difficile');
  await reglageVoix(page).click();
  await expect.poll(() => lireMeta(page, 'respiration')).toMatchObject({ voix: true, son: false });
  const v = await ouvrir(page);
  await court(v, 'Panique').click();
  const l = vue(page, 'Panique');
  await expect(consigne(l)).toHaveText(texte(PANIQUE));
  await expect.poll(async () => (await parole(page)).dits).toEqual([PANIQUE]);
  // Le toucher a amorcé la voix, une parole muette (Safari ne parle qu'après un geste).
  expect((await parole(page)).amorces).toBeGreaterThanOrEqual(1);
  expect((await parole(page)).voix).toBe('fr-FR');
  await figer(page);
  await page.clock.runFor(12500);
  await expect.poll(async () => (await parole(page)).dits).toHaveLength(2);
  expect((await parole(page)).dits[1]).toMatch(/^Trois soupirs/);
  expect(await audio(page)).toMatchObject({ notes: [], session: 'ambient' });
});

// Ce que dit le texte de Réglages : la voix ne vaut que pour les exercices courts. La cohérence cardiaque de cet écran n'a pas de voix.
test('la voix réglée dans Réglages : la cohérence cardiaque de Moment difficile reste sans voix, d\'un bout à l\'autre', async ({ page }) => {
  await espionnerAudio(page);
  await ecrireMeta(page, 'respiration', { duree: 2, rythme: '5-5', son: false, voix: true });
  const v = await ouvrir(page);
  await bouton(v, 'Commencer').click();
  await expect(v.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(121000);
  await expect(bouton(v, 'Recommencer')).toBeVisible();
  expect(await parole(page)).toMatchObject({ dits: [], amorces: 0 });
});

test('le signal réglé dans Réglages : un repère à chaque changement d\'étape d\'un exercice lancé de Moment difficile, quel que soit le son du lecteur de Bien-être ; « Réveil la nuit » reste muet, sa voix éteinte', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await page.evaluate(() => localStorage.setItem('carnet:lecteur:son', JSON.stringify('aucun')));
  await aller(page, '#/reglages/moment-difficile');
  await page.getByRole('switch', { name: 'Signal sonore', exact: true }).click();
  await expect.poll(() => lireMeta(page, 'respiration')).toMatchObject({ son: true, voix: false });
  let v = await ouvrir(page);
  // Le contexte audio naît dans le toucher, pas après : l'iPhone ne le laisserait pas démarrer autrement.
  expect(await court(v, 'Panique').evaluate((x) => { x.click(); return window.__audio.contextes; })).toBe(1);
  const l = vue(page, 'Panique');
  await expect(consigne(l)).toHaveText(texte(PANIQUE));
  await bouton(l, 'Suivant').click();
  await expect.poll(() => notes(page)).toBe(1);
  await l.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/moment-difficile');

  v = vue(page, 'Moment difficile');
  await court(v, 'Réveil la nuit').click();
  const n = vue(page, 'Réveil la nuit');
  await expect(consigne(n)).toHaveText(CONSIGNE_NUIT);
  await bouton(n, 'Suivant').click();
  await page.clock.runFor(2000);
  expect(await notes(page)).toBe(1);
  expect((await parole(page)).dits).toEqual([]);
});
