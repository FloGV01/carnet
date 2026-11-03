import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { espionnerAudio, audio, notes } from '../aides/audio.js';
import { installerVerrou, verrou, cacher, montrer, seances, environ, bols, frequencesBols, horloge } from '../aides/lecteur.js';

// v10 (6/9) · Les sons de fond et les deux minuteurs (spec §9 et §14) : des écrans pleins de l'onglet Bien-être. Le contexte audio
// naît dans le toucher « Commencer » ; session « playback » pour les sons, « ambient » pour les minuteurs ; la minuterie et son
// fondu sont programmés d'avance sur l'horloge audio ; quitter l'écran des sons ne laisse aucun son orphelin ; page cachée, le
// son continue, le minuteur silencieux se met en pause, le minuteur de concentration continue son temps.
// Horloge : jeudi 15 octobre 2026, 20:30 (390 × 844). Données inventées.

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const vue = (page, titre) => page.getByRole('dialog', { name: titre });
const bouton = (zone, nom) => zone.getByRole('button', { name: nom, exact: true });
const adresse = (page) => page.evaluate(() => location.hash);
const clesCarnet = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('carnet:')).sort());
const lireCle = (page, cle) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), cle);
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
// L'horloge factice tourne aussi en temps réel : pour un temps serré, elle s'arrête, et n'avance plus que par runFor.
const figer = async (page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
// De longs temps, sans passer par chaque tic un à un (runFor : plusieurs secondes réelles par minute factice) : le saut, puis les
// dernières secondes tic par tic.
const avancer = async (page, ms, finTicTicMs = 3000) => {
  if (ms > finTicTicMs) await page.clock.fastForward(ms - finTicTicMs);
  await page.clock.runFor(Math.min(ms, finTicTicMs));
};
const ouvrir = async (page, hash, titre) => {
  await aller(page, hash);
  const v = vue(page, titre);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  return v;
};
const ouvrirSons = (page) => ouvrir(page, '#/sons', 'Sons de fond');
const ouvrirMinuteur = (page) => ouvrir(page, '#/minuteur', 'Minuteur silencieux');
const ouvrirConcentration = (page) => ouvrir(page, '#/concentration', 'Minuteur de concentration');
// « Commencer » touché, et ce qu'on lit aussitôt, dans le même geste : iOS ne laisse naître le son que là.
const toucherCommencer = (page) => page.evaluate(() => {
  document.querySelector('.parcours button[aria-label="Commencer"]').click();
  return { contextes: window.__audio.contextes, session: navigator.audioSession.type };
});
const choix = (v, groupe, nom) => v.getByRole('group', { name: groupe }).getByRole('button', { name: `${groupe} : ${nom}` });
// Ce qui tourne encore, ou tournera, à cet instant : sources de bruit et oscillateurs d'un son de fond.
const fond = (page) => page.evaluate(() => ({ sources: window.__audio.sources.map((s) => ({ ...s })), lents: window.__audio.oscillateurs.filter((o) => o.f < 20).map((o) => ({ ...o })) }));
// Le gain d'une enveloppe : celui qui descend à 0 en rampe.
const fondus = (page) => page.evaluate(() => window.__audio.gains.filter((j) => j.some((x) => x.quoi === 'rampe' && x.v === 0)).map((j) => j.map((x) => ({ ...x }))));
const toutArrete = async (page, avantS) => {
  const { sources, lents } = await fond(page);
  expect(sources.length).toBeGreaterThanOrEqual(2);
  for (const x of [...sources, ...lents]) {
    expect(x.fin).not.toBeNull();
    expect(x.fin).toBeLessThanOrEqual(avantS);
  }
};
// La durée des tampons qui jouent dit quel son joue : chaque recette a la sienne (composants/sons-de-fond.js). `deja` : les sources
// d'avant, qu'on saute.
const DUREES_TAMPONS = Object.freeze([['Bruit brun', 13], ['Bruit rose', 11], ['Vagues', 17], ['Pluie douce', 15]]);
const tampons = async (page, deja = 0) => (await fond(page)).sources.slice(deja).map((s) => s.dureeS);
// Les valeurs posées sur les gains, à l'instant où elles ont été programmées.
const valeursDeGain = (page) => page.evaluate(() => window.__audio.gains.flat().filter((x) => x.quoi === 'valeur').map((x) => x.v));
const aLeGain = (valeurs, g) => valeurs.filter((x) => Math.abs(x - g) < 1e-6).length;
// Les notes d'un bol, dans l'ordre : six oscillateurs partis au même instant (composants/sons.js). `fin` : leur arrêt, ramené si le
// bol a été coupé. Un bol reprogrammé au même instant ne se distingue d'un autre que par elles.
const NOTES_PAR_BOL = 6;
const FIN_BOL_S = 4.25;
const notesDeBols = (page) => page.evaluate(() => window.__audio.oscillateurs.filter((o) => o.f >= 20).map((o) => ({ ...o })));
const finLaPlusTardive = (liste) => Math.max(...liste.map((o) => o.fin));
// Rien ne dépasse de côté : ni la page, ni le corps de l'écran, ni aucun de ses boutons.
const rienNeDeborde = async (page) => {
  const fautes = await page.evaluate(() => {
    const largeur = document.documentElement.clientWidth;
    const f = [];
    if (document.documentElement.scrollWidth > largeur) f.push(`page : ${document.documentElement.scrollWidth}`);
    for (const c of document.querySelectorAll('.parcours-corps')) if (c.scrollWidth > c.clientWidth) f.push(`corps : ${c.scrollWidth} > ${c.clientWidth}`);
    for (const b of document.querySelectorAll('.parcours button:not([role=switch]), .parcours input, .parcours select')) {
      const r = b.getBoundingClientRect();
      if (r.width && (r.left < 0 || r.right > largeur)) f.push(`${b.tagName} ${b.textContent} : ${r.left} à ${r.right}`);
      if (b.tagName === 'BUTTON' && b.scrollWidth > b.clientWidth + 1) f.push(`bouton ${b.textContent} : texte de ${b.scrollWidth} dans ${b.clientWidth}`);
    }
    return f;
  });
  expect(fautes).toEqual([]);
};

// ---------- Sons de fond ----------

test('sons : avant de commencer, le choix du son, la minuterie, le volume, la ligne sur le mode silencieux ; aucun son, aucun contexte, aucune clé écrite', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrirSons(page);
  await expect(v.getByRole('heading', { name: 'Sons de fond', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  expect(await v.getByRole('group', { name: 'Son', exact: true }).getByRole('button').allTextContents()).toEqual(['Bruit brun', 'Bruit rose', 'Vagues', 'Pluie douce']);
  expect(await v.getByRole('group', { name: 'Minuterie' }).getByRole('button').allTextContents()).toEqual(['15 min', '30 min', '60 min']);
  await expect(choix(v, 'Son', 'Bruit brun')).toHaveAttribute('aria-pressed', 'true');
  await expect(choix(v, 'Minuterie', '30 min')).toHaveAttribute('aria-pressed', 'true');
  await expect(v.getByRole('slider', { name: 'Volume' })).toHaveValue('0.5');
  await expect(v.getByText('Le son joue aussi en mode silencieux et met ta musique en pause.')).toBeVisible();
  await expect(bouton(v, 'Arrêter')).toHaveCount(0);
  expect((await v.getByRole('slider', { name: 'Volume' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Rien ne joue ni ne naît avant le toucher ; toucher la valeur déjà choisie n'écrit rien.
  await choix(v, 'Son', 'Bruit brun').click();
  await choix(v, 'Minuterie', '30 min').click();
  await page.clock.runFor(3000);
  expect(await audio(page)).toMatchObject({ contextes: 0, oscillateurs: [], sources: [], session: 'auto' });
  expect(await clesCarnet(page)).toEqual([]);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
});

test('sons : « Commencer » crée le contexte dans le toucher, en session « playback » ; des tampons bouclés de 10 s au moins, sans élément audio ni bol ; puis « Arrêter » éteint tout, et le contexte s\'endort', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const v = await ouvrirSons(page);
  expect(await toucherCommencer(page)).toEqual({ contextes: 1, session: 'playback' });
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 1, etat: 'running', session: 'playback', suspensions: 0 });
  const { sources, lents } = await fond(page);
  // Une source par oreille, à des vitesses qui les décalent.
  expect(sources).toHaveLength(2);
  for (const s of sources) {
    expect(s.boucle).toBe(true);
    expect(s.dureeS).toBeGreaterThanOrEqual(10);
  }
  expect(new Set(sources.map((s) => s.vitesse)).size).toBe(2);
  expect(lents.length).toBeGreaterThanOrEqual(1);
  expect(await notes(page)).toBe(0);
  expect(await bols(page)).toEqual([]);
  await expect(page.locator('audio')).toHaveCount(0);
  // L'écran dit le son et la minuterie, garde le volume, et n'est pas gardé allumé (spec §14.2).
  await expect(v.locator('.lecteur-consigne')).toHaveText('Bruit brun');
  await expect(v.locator('.lecteur-description')).toHaveText(/^Minuterie\s:\s30\smin, puis le son s'éteint en fondu\.$/);
  await expect(v.getByRole('slider', { name: 'Volume' })).toBeVisible();
  await expect(v.getByRole('group', { name: 'Minuterie' })).toHaveCount(0);
  expect((await verrou(page)).demandes).toBe(0);
  await figer(page);
  await bouton(v, 'Arrêter').click();
  await expect(bouton(v, 'Commencer')).toBeVisible();
  const t = await horloge(page);
  await toutArrete(page, t + 1.6);
  // Le fondu court, puis le contexte dort (jamais fermé), et la session audio est rendue à iOS.
  const [enveloppe] = await fondus(page);
  const dernier = enveloppe.at(-1);
  expect(dernier).toMatchObject({ quoi: 'rampe', v: 0 });
  expect(dernier.t - t).toBeGreaterThan(1.4);
  expect(dernier.t - t).toBeLessThan(1.6);
  await page.clock.runFor(1500);
  expect((await audio(page)).suspensions).toBe(0);
  await page.clock.runFor(500);
  expect(await audio(page)).toMatchObject({ suspensions: 1, fermes: 0, session: 'auto', contextes: 1 });
  // Le même contexte repart au toucher suivant.
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'playback', etat: 'running' });
  // Arrêté puis relancé aussitôt : la mise en veille qui attendait est annulée, le nouveau son n'est pas coupé.
  await bouton(v, 'Arrêter').click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await page.clock.runFor(5000);
  expect(await audio(page)).toMatchObject({ suspensions: 1, session: 'playback', etat: 'running' });
});

test('sons : le son choisi est celui qui joue, pour chacun des quatre, et le volume réglé avant « Commencer » est celui du départ, retenu d\'une ouverture à l\'autre', async ({ page }) => {
  await espionnerAudio(page);
  let v = await ouvrirSons(page);
  for (const [nom, dureeS] of DUREES_TAMPONS) {
    await choix(v, 'Son', nom).click();
    await expect(choix(v, 'Son', nom)).toHaveAttribute('aria-pressed', 'true');
    const deja = (await fond(page)).sources.length;
    await bouton(v, 'Commencer').click();
    await expect(bouton(v, 'Arrêter')).toBeVisible();
    await expect(v.locator('.lecteur-consigne')).toHaveText(nom);
    expect(await tampons(page, deja), nom).toEqual([dureeS, dureeS]);
    await bouton(v, 'Arrêter').click();
    await expect(bouton(v, 'Commencer')).toBeVisible();
  }
  // Au volume de départ, 0,5 : un gain de 0,25, le carré du curseur. À 0,3 : 0,09, et rien d'autre de neuf.
  let valeurs = await valeursDeGain(page);
  expect(aLeGain(valeurs, 0.25)).toBe(DUREES_TAMPONS.length);
  expect(aLeGain(valeurs, 0.09)).toBe(0);
  await v.getByRole('slider', { name: 'Volume' }).fill('0.3');
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  valeurs = await valeursDeGain(page);
  expect(aLeGain(valeurs, 0.09)).toBe(1);
  expect(aLeGain(valeurs, 0.25)).toBe(DUREES_TAMPONS.length);
  // Rouvert : le curseur dit 0,3, et le son repart à ce volume.
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  v = await ouvrirSons(page);
  await expect(v.getByRole('slider', { name: 'Volume' })).toHaveValue('0.3');
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(aLeGain(await valeursDeGain(page), 0.09)).toBe(2);
});

for (const [libelle, minutes] of [['15 min', 15], ['60 min', 60]]) {
  test(`sons : minuterie de ${libelle} : dès le départ, la rampe de gain vers 0 est programmée de ${minutes} min − 30 s à ${minutes} min, et les sources s'arrêtent à sa fin`, async ({ page }) => {
    await espionnerAudio(page, { session: true });
    const v = await ouvrirSons(page);
    await choix(v, 'Minuterie', libelle).click();
    await figer(page);
    const t0 = await horloge(page);
    await bouton(v, 'Commencer').click();
    await expect(bouton(v, 'Arrêter')).toBeVisible();
    const enveloppes = await fondus(page);
    expect(enveloppes).toHaveLength(1);
    const j = enveloppes[0];
    const rampe = j.at(-1);
    const palier = j.at(-2);
    const finS = minutes * 60;
    expect(palier).toMatchObject({ quoi: 'valeur', v: 1 });
    expect(rampe).toMatchObject({ quoi: 'rampe', v: 0 });
    expect(palier.t - t0).toBeCloseTo(finS - 30, 1);
    expect(rampe.t - t0).toBeCloseTo(finS, 1);
    // Une montée d'abord : le son ne surgit pas.
    expect(j[0]).toMatchObject({ quoi: 'valeur', v: 0 });
    expect(j[1]).toMatchObject({ quoi: 'rampe', v: 1 });
    expect(j[1].t - j[0].t).toBeGreaterThan(1);
    await toutArrete(page, t0 + finS + 0.5);
    // Le volume a son propre gain : le toucher ne dérange pas le fondu.
    await v.getByRole('slider', { name: 'Volume' }).fill('0.8');
    expect((await fondus(page))[0]).toHaveLength(j.length);
    const cibles = await page.evaluate(() => window.__audio.gains.flat().filter((x) => x.quoi === 'cible').map((x) => x.v));
    expect(cibles.at(-1)).toBeCloseTo(0.64, 2);
    // La minuterie finie, l'écran revient à son début, et le contexte s'endort. Rien n'est écrit en base.
    await avancer(page, finS * 1000 + 1000);
    await expect(bouton(v, 'Commencer')).toBeVisible();
    await page.clock.runFor(2000);
    expect(await audio(page)).toMatchObject({ suspensions: 1, session: 'auto' });
    expect(await seances(page)).toEqual([]);
  });
}

test('sons (point de vigilance 3) : page cachée, le son continue, sans pause ni mise en veille ; de retour, le contexte interrompu est relancé', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrirSons(page);
  await figer(page);
  const t0 = await horloge(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  // Le temps que l'écran pose ses écouteurs (l'horloge est arrêtée).
  await page.clock.runFor(1000);
  const avant = await fond(page);
  await cacher(page);
  await avancer(page, 10 * 60000);
  // Rien n'a changé : les fins sont celles de la minuterie, l'horloge audio tourne, le contexte ne dort pas.
  expect(await fond(page)).toEqual(avant);
  for (const s of avant.sources) expect(s.fin - t0).toBeCloseTo(30 * 60 + 0.1, 1);
  expect(await audio(page)).toMatchObject({ suspensions: 0, etat: 'running', session: 'playback' });
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  // Écran verrouillé, iOS a interrompu le contexte : au retour, il est relancé, et l'écran n'a pas bougé.
  await page.evaluate(() => { window.__audioCtl.interrompre(); });
  const reprises = (await audio(page)).reprises;
  await montrer(page);
  await expect.poll(async () => (await audio(page)).reprises).toBe(reprises + 1);
  await page.evaluate(() => { window.__audioCtl.liberer(); });
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(await adresse(page)).toBe('#/sons');
});

test('sons : au retour après la fin de la minuterie (le JavaScript était suspendu), l\'écran revient à son début, et un contexte interrompu ne rejoue rien', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrirSons(page);
  await choix(v, 'Minuterie', '15 min').click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await cacher(page);
  // Seule l'horloge murale a avancé : aucune minuterie de la page n'a tourné. Plus de 30 min : l'écran plein reste ouvert.
  await page.clock.setSystemTime(new Date(2026, 9, 15, 21, 30));
  await montrer(page);
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await toutArrete(page, await horloge(page) + 1.6);
  expect(await adresse(page)).toBe('#/sons');
});

test('sons (point de vigilance 3) : quitter l\'écran par « Fermer » ou par le retour ne laisse aucun son orphelin : sources et houle arrêtées, en fondu court, puis le contexte dort', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await aller(page, '#/bien-etre');
  await expect(page.locator('main.bien-etre')).toBeVisible();
  // Par « Fermer ».
  let v = await ouvrirSons(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await figer(page);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await expect(page.locator('main.bien-etre')).toBeVisible();
  let t = await horloge(page);
  await toutArrete(page, t + 1.6);
  await page.clock.runFor(2000);
  expect(await audio(page)).toMatchObject({ suspensions: 1, session: 'auto' });
  // Par le retour : le même, sans rien toucher à l'écran.
  v = await ouvrirSons(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  const deja = (await fond(page)).sources.length;
  await page.goBack();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  t = await horloge(page);
  const { sources, lents } = await fond(page);
  expect(sources.length).toBe(deja);
  for (const x of [...sources, ...lents]) {
    expect(x.fin).not.toBeNull();
    expect(x.fin).toBeLessThanOrEqual(t + 1.6);
  }
  await page.clock.runFor(2000);
  expect(await audio(page)).toMatchObject({ suspensions: 2, session: 'auto' });
});

test('sons : les écrans de crise restent muets après un son de fond : le son s\'est arrêté en quittant, et aucun bol ni son ne joue', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  const v = await ouvrirSons(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await aller(page, '#/moment-difficile');
  await page.getByRole('group', { name: 'Un exercice court' }).getByRole('button', { name: 'Panique', exact: true }).click();
  const crise = vue(page, 'Panique');
  await expect(bouton(crise, 'Pause')).toBeVisible();
  await page.clock.runFor(5000);
  await toutArrete(page, await horloge(page));
  expect(await notes(page)).toBe(0);
  // Sans signal ni voix, le contexte préparé dans le toucher se rendort : la session « playback » du son n'est pas restée.
  expect((await audio(page)).session).toBe('auto');
});

test('sons : les réglages restent sur l\'appareil, écrits seulement quand ils changent ; une clé abîmée ne compte pas', async ({ page }) => {
  await espionnerAudio(page);
  let v = await ouvrirSons(page);
  await choix(v, 'Son', 'Vagues').click();
  await expect(choix(v, 'Son', 'Vagues')).toHaveAttribute('aria-pressed', 'true');
  expect(await lireCle(page, 'carnet:sons')).toEqual({ son: 'vagues', minuterie: 30, volume: 0.5 });
  await choix(v, 'Minuterie', '60 min').click();
  await v.getByRole('slider', { name: 'Volume' }).fill('0.3');
  await expect.poll(() => lireCle(page, 'carnet:sons')).toEqual({ son: 'vagues', minuterie: 60, volume: 0.3 });
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  v = await ouvrirSons(page);
  await expect(choix(v, 'Son', 'Vagues')).toHaveAttribute('aria-pressed', 'true');
  await expect(choix(v, 'Minuterie', '60 min')).toHaveAttribute('aria-pressed', 'true');
  await expect(v.getByRole('slider', { name: 'Volume' })).toHaveValue('0.3');
  // Le volume bougé pendant le son s'écrit aussi.
  await bouton(v, 'Commencer').click();
  await v.getByRole('slider', { name: 'Volume' }).fill('0.9');
  await expect.poll(() => lireCle(page, 'carnet:sons')).toEqual({ son: 'vagues', minuterie: 60, volume: 0.9 });
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  // Une clé abîmée, ou d'une autre version : les valeurs par défaut, et rien n'est réécrit.
  for (const abimee of ['{"son":"orage","minuterie":7,"volume":3}', 'pas du json', '"brun"']) {
    await page.evaluate((x) => localStorage.setItem('carnet:sons', x), abimee);
    v = await ouvrirSons(page);
    await expect(choix(v, 'Son', 'Bruit brun')).toHaveAttribute('aria-pressed', 'true');
    await expect(choix(v, 'Minuterie', '30 min')).toHaveAttribute('aria-pressed', 'true');
    await expect(v.getByRole('slider', { name: 'Volume' })).toHaveValue('0.5');
    expect(await page.evaluate(() => localStorage.getItem('carnet:sons'))).toBe(abimee);
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  }
});

test('les quatre sons sonnent pour de bon dans le moteur audio de WebKit (rendu hors ligne) : deux oreilles différentes, sans valeur folle ni écrêtage, à des forces voisines', async ({ page }) => {
  const mesures = await page.evaluate(async () => {
    const m = await import('/js/ui/composants/sons-de-fond.js');
    const taux = 22050;
    const res = {};
    for (const son of m.SONS_DE_FOND) {
      const c = new OfflineAudioContext(2, taux * 30, taux);
      m.poserFond(c, son, { volume: 1 });
      const rendu = await c.startRendering();
      const [g, d] = [rendu.getChannelData(0), rendu.getChannelData(1)];
      let [gg, dd, gd, crete, fous] = [0, 0, 0, 0, 0];
      for (let i = 0; i < g.length; i += 1) {
        if (!Number.isFinite(g[i]) || !Number.isFinite(d[i])) fous += 1;
        gg += g[i] * g[i]; dd += d[i] * d[i]; gd += g[i] * d[i];
        crete = Math.max(crete, Math.abs(g[i]), Math.abs(d[i]));
      }
      res[son] = { force: Math.sqrt((gg + dd) / (2 * g.length)), crete, fous, lien: Math.abs(gd) / Math.sqrt(gg * dd) };
    }
    return res;
  });
  const forces = Object.values(mesures).map((x) => x.force);
  for (const [son, x] of Object.entries(mesures)) {
    expect(x.fous, son).toBe(0);
    expect(x.crete, son).toBeLessThanOrEqual(1);
    expect(x.force, son).toBeGreaterThan(0.05);
    expect(x.lien, son).toBeLessThan(0.3);
  }
  expect(Math.max(...forces) / Math.min(...forces)).toBeLessThan(3);
});

test('la minuterie et le volume dans le moteur audio de WebKit : le son monte, tient, descend sur les 30 dernières secondes, puis le silence exact ; le volume est son carré', async ({ page }) => {
  const m = await page.evaluate(async () => {
    const f = await import('/js/ui/composants/sons-de-fond.js');
    const taux = 8000;
    const rendre = async (options) => {
      const c = new OfflineAudioContext(2, taux * 50, taux);
      f.poserFond(c, 'rose', options);
      return (await c.startRendering()).getChannelData(0);
    };
    const force = (d, de, a) => { let k = 0; for (let i = de * taux; i < a * taux; i += 1) k += d[i] * d[i]; return Math.sqrt(k / ((a - de) * taux)); };
    const fort = await rendre({ minuterieS: 40, volume: 1 });
    const doux = await rendre({ minuterieS: 40, volume: 0.5 });
    return {
      debut: force(fort, 0, 0.2), plein: force(fort, 2, 9), milieu: force(fort, 24.5, 25.5), fin: force(fort, 39.5, 39.9), apres: force(fort, 40.2, 50),
      doux: force(doux, 2, 9),
    };
  });
  expect(m.debut).toBeLessThan(m.plein / 3);
  expect(m.milieu).toBeGreaterThan(m.plein * 0.35);
  expect(m.milieu).toBeLessThan(m.plein * 0.75);
  expect(m.fin).toBeLessThan(m.plein * 0.05);
  expect(m.apres).toBe(0);
  expect(m.doux / m.plein).toBeGreaterThan(0.2);
  expect(m.doux / m.plein).toBeLessThan(0.3);
});

test('un bol ou un souffle programmé, puis coupé juste avant son départ, ne sort jamais plus fort que joué seul, dans le moteur audio de WebKit (rendu hors ligne)', async ({ page }) => {
  const mesures = await page.evaluate(async () => {
    const { sons } = await import('/js/ui/composants/sons.js');
    const { preparerSon } = await import('/js/ui/composants/signal-sonore.js');
    const taux = 22050;
    const DANS_S = 0.4;
    // Le départ : `dansS`, plus la petite avance de composants/sons.js.
    const DEPART_S = DANS_S + 0.02;
    // Le vrai moteur, que l'app voit comme un contexte qui tourne, à l'heure demandée : tout est programmé avant le rendu, qui le
    // joue comme en direct. `closed` à la fin, pour que preparerSon en prenne un neuf la fois suivante.
    const crete = async (jouer, coupureS = null) => {
      const vrai = new OfflineAudioContext(1, taux * 6, taux);
      const vu = { t: 0, etat: 'running' };
      const c = new Proxy(vrai, {
        get(cible, cle) {
          if (cle === 'currentTime') return vu.t;
          if (cle === 'state') return vu.etat;
          if (cle === 'resume') return async () => {};
          const x = Reflect.get(cible, cle, cible);
          return typeof x === 'function' ? x.bind(cible) : x;
        },
      });
      window.AudioContext = function Contexte() { return c; };
      preparerSon();
      jouer();
      if (coupureS != null) { vu.t = coupureS; sons.couper(); }
      vu.etat = 'closed';
      return (await vrai.startRendering()).getChannelData(0).reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    };
    const SONS = {
      'bol d\'intervalle': () => sons.bolIntervalle({ dansS: DANS_S }),
      'bol de minuteur': () => sons.bolMinuteur({ dansS: DANS_S }),
      'souffle, inspiration': () => sons.souffle({ phase: 'inspire', dureeS: 4, dansS: DANS_S }),
      'souffle, expiration': () => sons.souffle({ phase: 'expire', dureeS: 4, dansS: DANS_S }),
    };
    const res = {};
    for (const [nom, jouer] of Object.entries(SONS)) {
      res[nom] = { seul: await crete(jouer), coupes: {} };
      // Avant le départ de 200, 100, 50, 20 et 10 ms ; et 50 ms après.
      for (const avant of [200, 100, 50, 20, 10, -50]) res[nom].coupes[avant] = await crete(jouer, DEPART_S - avant / 1000);
    }
    return res;
  });
  for (const [nom, { seul, coupes }] of Object.entries(mesures)) {
    expect(seul, nom).toBeGreaterThan(0.05);
    for (const [avant, c] of Object.entries(coupes)) expect(c, `${nom}, coupé ${avant} ms avant son départ`).toBeLessThanOrEqual(seul);
  }
});

// ---------- Minuteur silencieux ----------

const PHRASE_MINUTEUR = 'Un bol au début, un bol à la fin. Le temps restant ne s\'affiche pas.';

test('minuteur : avant de commencer, 5 · 10 · 20 min, le son de chaque minute éteint, aucun son ; le contexte naît dans le toucher, en session « ambient », et le bol sonne', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await expect(v.getByRole('heading', { name: 'Minuteur silencieux', level: 1 })).toBeVisible();
  expect(await v.getByRole('group', { name: 'Durée' }).getByRole('button').allTextContents()).toEqual(['5 min', '10 min', '20 min']);
  await expect(choix(v, 'Durée', '5 min')).toHaveAttribute('aria-pressed', 'true');
  await expect(v.getByRole('switch', { name: 'Un son chaque minute' })).toHaveAttribute('aria-checked', 'false');
  await expect(v.locator('.lecteur-description')).toHaveText(PHRASE_MINUTEUR);
  await page.clock.runFor(2000);
  expect(await audio(page)).toMatchObject({ contextes: 0, oscillateurs: [], session: 'auto' });
  expect(await clesCarnet(page)).toEqual([]);
  expect(await toucherCommencer(page)).toEqual({ contextes: 1, session: 'ambient' });
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await expect.poll(() => bols(page)).toHaveLength(1);
  expect((await bols(page))[0].f).toBe(BOLS.debut);
  expect(await audio(page)).toMatchObject({ contextes: 1, etat: 'running', session: 'ambient', sources: [] });
  await expect.poll(async () => (await verrou(page)).demandes).toBe(1);
});

test('minuteur : aucun temps restant à l\'écran, seulement « Arrêter » ; mené au bout, le bol, « Fin de l\'exercice. », une séance `minuteur`, le verrou rendu, puis le retour et le message', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await figer(page);
  await expect.poll(() => bols(page)).toHaveLength(1);
  await avancer(page, 150000);
  // Ni chiffre, ni « il reste », ni anneau, ni pause.
  const lu = await page.locator('.parcours').innerText();
  expect(lu).not.toMatch(/\d/);
  expect(lu).not.toMatch(/il reste/i);
  await expect(v.locator('.anneau-temps')).toHaveCount(0);
  await expect(v.getByRole('timer')).toHaveCount(0);
  expect(await v.locator('.parcours-corps button, .parcours-pied button').allTextContents()).toEqual(['Arrêter']);
  expect(await seances(page)).toEqual([]);
  await avancer(page, 150000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  // Le bol de fin, à l'instant exact, et le même qu'au début.
  const liste = await bols(page);
  expect(liste.map((b) => b.f)).toEqual([BOLS.debut, BOLS.debut]);
  expect(liste[1].t - liste[0].t).toBeCloseTo(300, 0);
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  const [s] = await seances(page);
  expect(s).toMatchObject({ exercice: 'minuteur', origine: 'bien-etre', fin: true });
  environ(s.dureeS, 300);
  expect(s.programme ?? null).toBe(null);
  await expect.poll(async () => (await verrou(page)).rendus).toBe(1);
  await page.clock.runFor(6000);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await expect(page.getByRole('status')).toContainText('Fin de l\'exercice.');
  await expect(page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  await page.clock.runFor(5000);
  expect(await audio(page)).toMatchObject({ fermes: 0, suspensions: 1 });
});

test('minuteur : « Un son chaque minute » : un bol d\'intervalle à chaque minute, à l\'instant exact, ni au début ni à la fin ; il est retenu', async ({ page }) => {
  await espionnerAudio(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await v.getByRole('switch', { name: 'Un son chaque minute' }).click();
  await expect(v.getByRole('switch', { name: 'Un son chaque minute' })).toHaveAttribute('aria-checked', 'true');
  expect(await lireCle(page, 'carnet:minuteur')).toEqual({ duree: 5, intervalle: true });
  // La phrase de départ reste vraie, le son allumé.
  await expect(v.locator('.lecteur-description')).toHaveText(PHRASE_MINUTEUR);
  await figer(page);
  await bouton(v, 'Commencer').click();
  await expect.poll(() => bols(page)).toHaveLength(1);
  await page.clock.runFor(305000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  const liste = await bols(page);
  expect(liste.map((b) => b.f)).toEqual([BOLS.debut, ...Array(4).fill(BOLS.intervalle), BOLS.debut]);
  for (const [i, b] of liste.slice(1).entries()) expect(Math.abs(b.t - liste[0].t - 60 * (i + 1))).toBeLessThan(0.05);
  // Rouvert : encore allumé. Une durée choisie est retenue avec lui.
  await page.clock.runFor(7000);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  const w = await ouvrirMinuteur(page);
  await expect(w.getByRole('switch', { name: 'Un son chaque minute' })).toHaveAttribute('aria-checked', 'true');
  await choix(w, 'Durée', '20 min').click();
  await expect(w.locator('.lecteur-duree')).toHaveText(/^20\smin\s·\slà où tu es$/);
  expect(await lireCle(page, 'carnet:minuteur')).toEqual({ duree: 20, intervalle: true });
  // Une clé abîmée : les valeurs par défaut.
  await w.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await page.evaluate(() => localStorage.setItem('carnet:minuteur', '{"duree":7,"intervalle":"oui"}'));
  const x = await ouvrirMinuteur(page);
  await expect(choix(x, 'Durée', '5 min')).toHaveAttribute('aria-pressed', 'true');
  await expect(x.getByRole('switch', { name: 'Un son chaque minute' })).toHaveAttribute('aria-checked', 'false');
});

test('minuteur : une page figée sans être cachée (aucun tic pendant 2 min 30) : au réveil, les minutes passées ne sonnent pas en rafale, et la suivante arrive à son heure', async ({ page }) => {
  await espionnerAudio(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await v.getByRole('switch', { name: 'Un son chaque minute' }).click();
  await figer(page);
  await bouton(v, 'Commencer').click();
  await expect.poll(() => bols(page)).toHaveLength(1);
  await page.clock.runFor(1000);
  await page.clock.fastForward(150000);
  await page.clock.runFor(2000);
  expect((await bols(page)).map((b) => b.f)).toEqual([BOLS.debut]);
  await page.clock.runFor(28000);
  const liste = await bols(page);
  expect(liste.map((b) => b.f)).toEqual([BOLS.debut, BOLS.intervalle]);
  expect(Math.abs(liste[1].t - liste[0].t - 180)).toBeLessThan(0.1);
});

test('minuteur (point de vigilance 3) : page cachée, pause : le temps s\'arrête, les sons à venir sont annulés, le verrou est rendu, la séance notée ; « Reprendre » finit le temps qui reste, une seule séance', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await v.getByRole('switch', { name: 'Un son chaque minute' }).click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await expect.poll(async () => (await verrou(page)).demandes).toBe(1);
  await figer(page);
  await page.clock.runFor(120500);
  const avant = (await bols(page)).length;
  expect(avant).toBe(3);
  await cacher(page);
  await expect(v.locator('.lecteur-consigne')).toHaveText('En pause');
  await expect.poll(async () => (await verrou(page)).rendus).toBe(1);
  // La séance est notée dès la pause : l'app peut ne jamais revenir.
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  environ((await seances(page))[0].dureeS, 120);
  expect((await seances(page))[0].fin ?? null).toBe(null);
  // Dix minutes en pause : ni bol, ni fin, et le contexte s'endort.
  await avancer(page, 600000);
  expect((await bols(page)).length).toBe(avant);
  await montrer(page);
  await expect(v.locator('.lecteur-consigne')).toHaveText('En pause');
  expect((await audio(page)).suspensions).toBeGreaterThanOrEqual(1);
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  // « Reprendre » : le contexte et le verrou repartent, la minute suivante arrive quand elle doit (temps actif).
  await bouton(v, 'Reprendre').click();
  await expect(bouton(v, 'Reprendre')).toHaveCount(0);
  await expect.poll(async () => (await verrou(page)).demandes).toBe(2);
  await expect.poll(async () => (await audio(page)).etat).toBe('running');
  await page.clock.runFor(180000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  const liste = await bols(page);
  // Le début, les minutes 1 et 2 avant la pause, 3 et 4 après, la fin.
  expect(liste.map((b) => b.f)).toEqual([BOLS.debut, BOLS.intervalle, BOLS.intervalle, BOLS.intervalle, BOLS.intervalle, BOLS.debut]);
  await expect.poll(async () => (await seances(page))[0].fin).toBe(true);
  expect(await seances(page)).toHaveLength(1);
  environ((await seances(page))[0].dureeS, 300);
});

test('minuteur : « Arrêter » avant 60 s : pas de séance, pas de message ; après 60 s : une séance sans `fin`, un bol ; « Fermer » en route note aussi, et annule ce qui reste à venir', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  let v = await ouvrirMinuteur(page);
  await bouton(v, 'Commencer').click();
  await figer(page);
  await page.clock.runFor(30000);
  await bouton(v, 'Arrêter').click();
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(6000);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(await seances(page)).toEqual([]);
  // Après 60 s, en pause ou non, le même écran, et la séance est là.
  v = await ouvrirMinuteur(page);
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(90000);
  const avant = (await bols(page)).length;
  await cacher(page);
  await montrer(page);
  await bouton(v, 'Arrêter').click();
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await expect.poll(() => bols(page).then((l) => l.length)).toBe(avant + 1);
  expect((await bols(page)).at(-1).f).toBe(BOLS.debut);
  await expect.poll(async () => (await seances(page)).length).toBe(1);
  expect((await seances(page))[0].fin ?? null).toBe(null);
  environ((await seances(page))[0].dureeS, 90);
  await page.clock.runFor(6000);
  await expect(page.getByRole('status').getByRole('button', { name: 'Noter mon émotion' })).toBeVisible();
  // « Fermer » en route : la séance notée, le verrou rendu, plus aucun bol ensuite.
  v = await ouvrirMinuteur(page);
  await bouton(v, 'Commencer').click();
  await page.clock.runFor(70000);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await expect.poll(async () => (await seances(page)).length).toBe(2);
  const apres = (await bols(page)).length;
  await avancer(page, 400000);
  expect((await bols(page)).length).toBe(apres);
  const { demandes, rendus } = await verrou(page);
  expect(rendus).toBe(demandes);
});

test('minuteur : page cachée à moins de 450 ms de la fin, puis « Reprendre » : le bol de fin programmé s\'annule, et le bol de fin sonne quand même, au bout du temps actif', async ({ page }) => {
  await espionnerAudio(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirMinuteur(page);
  await figer(page);
  await bouton(v, 'Commencer').click();
  await expect.poll(() => bols(page)).toHaveLength(1);
  // À 100 ms de la fin : le bol de fin est programmé.
  await avancer(page, 300000 - 100);
  await expect.poll(() => bols(page)).toHaveLength(2);
  const t = await horloge(page);
  expect(finLaPlusTardive((await notesDeBols(page)).slice(NOTES_PAR_BOL))).toBeGreaterThan(t + 4);
  await cacher(page);
  await expect(v.locator('.lecteur-consigne')).toHaveText('En pause');
  expect(finLaPlusTardive((await notesDeBols(page)).slice(NOTES_PAR_BOL))).toBeLessThanOrEqual(t + 0.2);
  // Une minute en pause, puis « Reprendre » : il restait 100 ms.
  await page.clock.runFor(60000);
  await montrer(page);
  await bouton(v, 'Reprendre').click();
  await expect(bouton(v, 'Reprendre')).toHaveCount(0);
  await page.clock.runFor(1000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  const liste = await bols(page);
  expect(liste.map((b) => b.f)).toEqual([BOLS.debut, BOLS.debut, BOLS.debut]);
  expect(liste[2].t - liste[1].t).toBeCloseTo(60, 1);
  // Celui-ci sonne tout entier.
  const dernier = (await notesDeBols(page)).slice(2 * NOTES_PAR_BOL);
  expect(dernier).toHaveLength(NOTES_PAR_BOL);
  expect(finLaPlusTardive(dernier) - liste[2].t).toBeCloseTo(FIN_BOL_S, 2);
});

// ---------- Minuteur de concentration ----------

test('concentration : avant de commencer, 15 · 25 · 45 min, « Aucun » ; le contexte naît dans le toucher, en session « ambient », sans son ; le temps restant s\'affiche ; à l\'écran, le bol et « Le temps est passé. », rien en base', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await installerVerrou(page);
  const BOLS = await frequencesBols(page);
  const v = await ouvrirConcentration(page);
  await expect(v.getByRole('heading', { name: 'Minuteur de concentration', level: 1 })).toBeVisible();
  expect(await v.getByRole('group', { name: 'Durée' }).getByRole('button').allTextContents()).toEqual(['15 min', '25 min', '45 min']);
  await expect(choix(v, 'Durée', '25 min')).toHaveAttribute('aria-pressed', 'true');
  const son = v.getByRole('combobox', { name: 'Son de fond' });
  await expect(son).toHaveValue('aucun');
  expect(await son.evaluate((s) => [...s.options].map((o) => o.textContent))).toEqual(['Aucun', 'Bruit brun', 'Bruit rose', 'Vagues', 'Pluie douce']);
  expect(await audio(page)).toMatchObject({ contextes: 0 });
  await choix(v, 'Durée', '15 min').click();
  await figer(page);
  expect(await toucherCommencer(page)).toEqual({ contextes: 1, session: 'ambient' });
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient', sources: [], oscillateurs: [] });
  await expect.poll(async () => (await verrou(page)).demandes).toBe(1);
  await expect(v.getByRole('timer')).toHaveText(/^(15:00|14:5\d)$/);
  await avancer(page, 300000);
  await expect(v.getByRole('timer')).toHaveText(/^(10:0[01]|9:5\d)$/);
  expect(await bols(page)).toEqual([]);
  await avancer(page, 601000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  await expect(v.getByRole('timer')).toHaveCount(0);
  expect(await page.locator('.parcours').innerText()).not.toMatch(/\d/);
  // Le bol de fin, une seule fois.
  expect((await bols(page)).map((b) => b.f)).toEqual([BOLS.debut]);
  await expect.poll(async () => (await verrou(page)).rendus).toBe(1);
  // Pas de séance, pas de message, et l'écran reste jusqu'à « Fermer ».
  await page.clock.runFor(5000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  expect(await seances(page)).toEqual([]);
  await expect(page.getByRole('status')).toHaveCount(0);
  expect((await audio(page)).suspensions).toBe(1);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  // Retenu.
  expect(await lireCle(page, 'carnet:concentration')).toEqual({ duree: 15, son: 'aucun' });
});

test('concentration : un son de fond choisi joue en session « ambient », au volume de l\'écran des sons, et s\'éteint avec la fin ; « Arrêter » et « Fermer » l\'arrêtent', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await page.evaluate(() => localStorage.setItem('carnet:sons', JSON.stringify({ son: 'rose', minuterie: 15, volume: 0.6 })));
  let v = await ouvrirConcentration(page);
  await v.getByRole('combobox', { name: 'Son de fond' }).selectOption('pluie');
  await expect.poll(() => lireCle(page, 'carnet:concentration')).toEqual({ duree: 25, son: 'pluie' });
  await figer(page);
  const t0 = await horloge(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'ambient' });
  await expect(v.getByText('Pluie douce')).toBeVisible();
  // Celui de cet écran, pas celui de l'écran des sons.
  expect(await tampons(page)).toEqual([15, 15]);
  const [j] = await fondus(page);
  expect(j.at(-1).t - t0).toBeCloseTo(25 * 60, 0);
  await toutArrete(page, t0 + 25 * 60 + 1);
  // Le volume est celui de l'écran des sons : 0,6, soit un gain de 0,36.
  expect(aLeGain(await valeursDeGain(page), 0.36)).toBe(1);
  // « Arrêter » : l'écran de départ, et tout est éteint.
  await bouton(v, 'Arrêter').click();
  await expect(bouton(v, 'Commencer')).toBeVisible();
  let t = await horloge(page);
  await toutArrete(page, t + 1.6);
  // Le contexte dort une fois le fondu fini, pas avant : un fondu tronqué rejouerait son reste à la reprise suivante.
  await page.clock.runFor(1500);
  expect((await audio(page)).suspensions).toBe(0);
  await page.clock.runFor(500);
  expect((await audio(page)).suspensions).toBe(1);
  // Relancé puis « Fermer ».
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  t = await horloge(page);
  await toutArrete(page, t + 1.6);
  await page.clock.runFor(1500);
  expect((await audio(page)).suspensions).toBe(1);
  await page.clock.runFor(500);
  expect((await audio(page)).suspensions).toBe(2);
  // Et mené au bout : le son s'éteint avec la fin.
  v = await ouvrirConcentration(page);
  await choix(v, 'Durée', '15 min').click();
  await bouton(v, 'Commencer').click();
  await avancer(page, 901000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  t = await horloge(page);
  await toutArrete(page, t + 1);
});

test('concentration : page cachée, le temps continue, sans pause ; horloge passée au-delà de la fin : « Le temps est passé. » au retour, sans bol, sans séance', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const v = await ouvrirConcentration(page);
  await choix(v, 'Durée', '15 min').click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await expect.poll(async () => (await verrou(page)).demandes).toBe(1);
  await figer(page);
  // Cinq minutes cachée : le temps a continué, et le verrou est repris au retour.
  await cacher(page);
  await avancer(page, 300000);
  await montrer(page);
  await expect(v.getByRole('timer')).toHaveText(/^(10:\d\d|9:5\d)$/);
  await expect.poll(async () => (await verrou(page)).demandes).toBe(2);
  // Cachée de nouveau, jusqu'après la fin.
  await cacher(page);
  await avancer(page, 700000);
  await montrer(page);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  await expect(v.getByRole('timer')).toHaveCount(0);
  expect(await bols(page)).toEqual([]);
  expect(await seances(page)).toEqual([]);
  const { demandes, rendus } = await verrou(page);
  expect(rendus).toBeGreaterThanOrEqual(demandes - 1);
});

test('concentration : le retour après la fin, quand le JavaScript était suspendu : pas de bol, que les minuteries repartent avant l\'événement ou après', async ({ page }) => {
  await espionnerAudio(page);
  let v = await ouvrirConcentration(page);
  await choix(v, 'Durée', '15 min').click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  // Seule l'horloge murale avance ; puis l'événement de retour d'abord.
  await cacher(page);
  await page.clock.setSystemTime(new Date(2026, 9, 15, 21, 0));
  await montrer(page);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  expect(await bols(page)).toEqual([]);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  // Les minuteries d'abord, la page déjà visible.
  v = await ouvrirConcentration(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await page.clock.setSystemTime(new Date(2026, 9, 15, 22, 0));
  await page.clock.runFor(1000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  expect(await bols(page)).toEqual([]);
});

test('concentration : l\'écran gardé allumé est rendu à « Arrêter » et en quittant par « Fermer »', async ({ page }) => {
  await espionnerAudio(page);
  await installerVerrou(page);
  const v = await ouvrirConcentration(page);
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await verrou(page)).demandes).toBe(1);
  await bouton(v, 'Arrêter').click();
  await expect(bouton(v, 'Commencer')).toBeVisible();
  await expect.poll(async () => (await verrou(page)).rendus).toBe(1);
  await bouton(v, 'Commencer').click();
  await expect.poll(async () => (await verrou(page)).demandes).toBe(2);
  await v.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  await expect.poll(async () => (await verrou(page)).rendus).toBe(2);
});

// À 100 ms de la fin d'un quart d'heure, le bol est programmé : rend ses notes et l'heure.
const concentrationPresDeLaFin = async (page) => {
  const v = await ouvrirConcentration(page);
  await choix(v, 'Durée', '15 min').click();
  await figer(page);
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await avancer(page, 900000 - 100);
  const notesDuBol = await notesDeBols(page);
  expect(notesDuBol).toHaveLength(NOTES_PAR_BOL);
  const t = await horloge(page);
  expect(finLaPlusTardive(notesDuBol)).toBeGreaterThan(t + 4);
  return { v, t, notesDuBol };
};

for (const [cas, passer] of [
  ['les minuteries ont continué', (page) => page.clock.runFor(5000)],
  ['le JavaScript était suspendu', async (page) => page.clock.setSystemTime(await page.evaluate(() => Date.now() + 5000))],
]) {
  test(`concentration : page cachée dans les 450 dernières ms, le bol programmé s'annule ; au retour après la fin (${cas}), aucun bol n'est rejoué`, async ({ page }) => {
    await espionnerAudio(page);
    const { v, t } = await concentrationPresDeLaFin(page);
    await cacher(page);
    expect(finLaPlusTardive(await notesDeBols(page))).toBeLessThanOrEqual(t + 0.2);
    await passer(page);
    await montrer(page);
    await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
    await page.clock.runFor(1000);
    expect(await notesDeBols(page)).toHaveLength(NOTES_PAR_BOL);
    expect(await seances(page)).toEqual([]);
  });
}

test('concentration : page cachée puis revenue dans les 450 dernières ms : le contexte est relancé, et le bol annulé revient à la fin, une seule fois', async ({ page }) => {
  await espionnerAudio(page);
  const { v, notesDuBol } = await concentrationPresDeLaFin(page);
  const { reprises } = await audio(page);
  await cacher(page);
  await montrer(page);
  await expect.poll(async () => (await audio(page)).reprises).toBe(reprises + 1);
  await page.clock.runFor(1000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  const liste = await notesDeBols(page);
  expect(liste).toHaveLength(2 * NOTES_PAR_BOL);
  // À son instant exact, ou au tic d'après s'il tombe après la fin : jamais plus de 200 ms de retard.
  const second = liste.slice(NOTES_PAR_BOL);
  expect(second[0].t).toBeGreaterThanOrEqual(notesDuBol[0].t - 1e-3);
  expect(second[0].t - notesDuBol[0].t).toBeLessThan(0.2);
  expect(finLaPlusTardive(second) - second[0].t).toBeCloseTo(FIN_BOL_S, 2);
});

// ---------- Les trois écrans ----------

test('aucune clé `carnet:` n\'est écrite sans changement de réglage, même en lançant et en arrêtant les trois écrans ; rien en base pour les sons et la concentration', async ({ page }) => {
  await espionnerAudio(page);
  let v = await ouvrirSons(page);
  await bouton(v, 'Commencer').click();
  await bouton(v, 'Arrêter').click();
  await expect(bouton(v, 'Commencer')).toBeVisible();
  v = await ouvrirMinuteur(page);
  await choix(v, 'Durée', '5 min').click();
  await bouton(v, 'Commencer').click();
  await bouton(v, 'Arrêter').click();
  await page.clock.runFor(6000);
  await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  v = await ouvrirConcentration(page);
  await choix(v, 'Durée', '25 min').click();
  await bouton(v, 'Commencer').click();
  await bouton(v, 'Arrêter').click();
  await expect(bouton(v, 'Commencer')).toBeVisible();
  expect(await clesCarnet(page)).toEqual([]);
  expect(await seances(page)).toEqual([]);
});

test('l\'épingle de chaque écran de départ ajoute puis retire son élément des favoris, dans l\'ordre', async ({ page }) => {
  for (const [hash, titre] of [['#/sons', 'Sons de fond'], ['#/minuteur', 'Minuteur silencieux'], ['#/concentration', 'Minuteur de concentration']]) {
    const v = await ouvrir(page, hash, titre);
    const epingle = v.getByRole('button', { name: `Épingler ${titre}` });
    await expect(epingle).toHaveAttribute('aria-pressed', 'false');
    await epingle.click();
    await expect(epingle).toHaveAttribute('aria-pressed', 'true');
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => adresse(page)).toBe('#/bien-etre');
  }
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['sons-de-fond', 'minuteur', 'concentration']);
  const v = await ouvrirMinuteur(page);
  const epingle = v.getByRole('button', { name: 'Épingler Minuteur silencieux' });
  await expect(epingle).toHaveAttribute('aria-pressed', 'true');
  await epingle.click();
  await expect(epingle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lireMeta(page, 'favorisBienEtre')).toEqual(['sons-de-fond', 'concentration']);
  // Ces écrans sont à l'onglet Bien-être, sans onglets ni retour sur Aujourd'hui après 30 min.
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('ouverts depuis une entrée, les trois écrans attendent « Commencer », et « Fermer » revient à cette entrée, avant, pendant et après ; sinon, à Bien-être', async ({ page }) => {
  await espionnerAudio(page);
  // Le bouton lecture de sa ligne, dans l'entrée où il est.
  const ENTREE = { '#/sons': '#/bien-etre/dormir', '#/minuteur': '#/bien-etre/calmer', '#/concentration': '#/bien-etre/concentrer' };
  const depuisEntree = async (hash, titre) => {
    await aller(page, ENTREE[hash]);
    await page.getByRole('button', { name: `Commencer ${titre}`, exact: true }).click();
    const v = vue(page, titre);
    await expect(bouton(v, 'Commencer')).toBeVisible();
    return v;
  };
  const fermerVers = async (v, cible) => {
    await v.getByRole('button', { name: 'Fermer' }).click();
    await expect.poll(() => adresse(page)).toBe(cible);
  };
  for (const [hash, titre] of [['#/sons', 'Sons de fond'], ['#/minuteur', 'Minuteur silencieux'], ['#/concentration', 'Minuteur de concentration']]) {
    // Ouvert puis refermé : rien ne démarre seul, et le son ne naît que dans « Commencer ».
    const { contextes, reprises } = await audio(page);
    let v = await depuisEntree(hash, titre);
    await expect(bouton(v, 'Arrêter')).toHaveCount(0);
    await fermerVers(v, ENTREE[hash]);
    expect(await audio(page)).toMatchObject({ contextes, reprises });
    v = await depuisEntree(hash, titre);
    await bouton(v, 'Commencer').click();
    await expect(bouton(v, 'Arrêter')).toBeVisible();
    await fermerVers(v, ENTREE[hash]);
    // Ouvert autrement, après ce détour : Bien-être, comme avant.
    v = await ouvrir(page, hash, titre);
    await fermerVers(v, '#/bien-etre');
  }
  // Après la fin : la concentration attend « Fermer », le minuteur se ferme seul.
  let v = await depuisEntree('#/concentration', 'Minuteur de concentration');
  await choix(v, 'Durée', '15 min').click();
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await avancer(page, 901000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Le temps est passé.');
  await fermerVers(v, ENTREE['#/concentration']);
  v = await depuisEntree('#/minuteur', 'Minuteur silencieux');
  await bouton(v, 'Commencer').click();
  await expect(bouton(v, 'Arrêter')).toBeVisible();
  await avancer(page, 301000);
  await expect(v.locator('.lecteur-consigne')).toHaveText('Fin de l\'exercice.');
  await page.clock.runFor(6000);
  await expect.poll(() => adresse(page)).toBe(ENTREE['#/minuteur']);
});

test('très grand texte : rien ne déborde de côté sur les trois écrans, avant et pendant', async ({ page }) => {
  test.setTimeout(60000);
  await espionnerAudio(page);
  for (const taille of [17, 23, 28, 33, 40, 53]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    for (const [hash, titre] of [['#/sons', 'Sons de fond'], ['#/minuteur', 'Minuteur silencieux'], ['#/concentration', 'Minuteur de concentration']]) {
      const v = await ouvrir(page, hash, titre);
      await rienNeDeborde(page);
      await bouton(v, 'Commencer').click();
      await expect(bouton(v, 'Arrêter')).toBeVisible();
      await rienNeDeborde(page);
      await v.getByRole('button', { name: 'Fermer' }).click();
      await expect.poll(() => adresse(page)).toBe('#/bien-etre');
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

// ---------- Le Diagnostic ----------

test('Diagnostic : « Son de fond, écran verrouillé » lance 2 min de bruit rose en « playback » et dit quoi vérifier ; le même bouton l\'arrête ; quitter l\'écran aussi', async ({ page }) => {
  await espionnerAudio(page, { session: true });
  await aller(page, '#/diagnostic');
  const lancer = page.getByRole('button', { name: 'Son de fond, écran verrouillé' });
  await expect(lancer).toBeVisible();
  await expect(page.getByText(/verrouille l'iPhone, le son doit continuer/)).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 0 });
  await figer(page);
  const t0 = await horloge(page);
  await lancer.click();
  const arreter = page.getByRole('button', { name: 'Arrêter le son de fond' });
  await expect(arreter).toBeVisible();
  expect(await audio(page)).toMatchObject({ contextes: 1, session: 'playback' });
  // Du bruit rose : la durée de son tampon le dit.
  expect(await tampons(page)).toEqual([11, 11]);
  const [j] = await fondus(page);
  expect(j.at(-2).t - t0).toBeCloseTo(90, 0);
  expect(j.at(-1).t - t0).toBeCloseTo(120, 0);
  await toutArrete(page, t0 + 121);
  await expect(page.locator('.diag pre')).toContainText('Son de fond : lancé (120 s, session playback)');
  await arreter.click();
  await expect(lancer).toBeVisible();
  await toutArrete(page, await horloge(page) + 1.6);
  // Le contexte dort une fois le fondu fini, pas avant.
  await page.clock.runFor(1500);
  expect((await audio(page)).suspensions).toBe(0);
  await page.clock.runFor(500);
  expect(await audio(page)).toMatchObject({ suspensions: 1, session: 'auto' });
  // Laissé à lui-même : les 2 min passées, le bouton revient.
  await lancer.click();
  await expect(arreter).toBeVisible();
  await avancer(page, 121000);
  await expect(lancer).toBeVisible();
  // Quitter l'écran pendant l'essai arrête le son.
  await lancer.click();
  await expect(arreter).toBeVisible();
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await toutArrete(page, await horloge(page) + 1.6);
  await page.clock.runFor(1500);
  expect((await audio(page)).suspensions).toBe(1);
  await page.clock.runFor(500);
  expect((await audio(page)).suspensions).toBe(2);
});
