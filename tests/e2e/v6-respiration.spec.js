import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';

// v6 · Respiration réglable (spec §6) : durée, rythme et signal sonore dans Réglages › Moment difficile,
// et le cercle qui change de teinte quand l'iPhone demande « Réduire les animations ».
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
});

const ecrire = (page, valeur) => page.evaluate((v) => window.__carnet.repo.meta.ecrire('respiration', v), valeur);
const lire = (page) => page.evaluate(() => window.__carnet.repo.meta.lire('respiration'));
// Passe par Réglages pour que l'écran soit monté de nouveau (et relise les réglages) même s'il était déjà ouvert.
const ouvrir = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  return page.getByRole('dialog', { name: 'Moment difficile' });
};
const bouton = (page, nom) => page.getByRole('button', { name: nom, exact: true });

// Faux contexte Web Audio : il compte les contextes ouverts, les notes jouées (avec leur fréquence) et les fermetures.
const espionnerAudio = (page) => page.evaluate(() => {
  const j = { contextes: 0, notes: [], fermes: 0 };
  window.__audio = j;
  class FauxContexte {
    constructor() { j.contextes += 1; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, connect() {}, stop() {}, start() { j.notes.push(o.frequency.value); } };
      return o;
    }
    resume() { return Promise.resolve(); }
    close() { j.fermes += 1; return Promise.resolve(); }
  }
  window.AudioContext = FauxContexte;
  window.webkitAudioContext = FauxContexte;
});
const audio = (page) => page.evaluate(() => window.__audio);

test('Réglages › Moment difficile : 5 min, 5-5, signal éteint, et la phrase sur le mode silencieux', async ({ page }) => {
  await aller(page, '#/reglages');
  await page.getByRole('link', { name: 'Moment difficile' }).click();
  await expect(page).toHaveURL(/#\/reglages\/moment-difficile$/);
  await expect(page.getByRole('heading', { name: 'Moment difficile', level: 1 })).toBeVisible();
  await expect(bouton(page, 'Durée : 5 min')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Durée : 2 min')).toHaveAttribute('aria-pressed', 'false');
  await expect(bouton(page, 'Rythme : 5-5')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('switch', { name: 'Signal sonore' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('quand l\'iPhone est en silencieux', { exact: false })).toBeVisible();
  // Les défauts s'appliquent à la lecture : rien n'est écrit tant que rien n'est changé.
  expect(await lire(page)).toBeNull();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/reglages$/);
});

test('la durée réglée change le texte d\'avant et celui de fin : 2 min, puis 10 min', async ({ page }) => {
  const vue0 = await ouvrir(page);
  await expect(vue0.locator('.phase-respiration')).toHaveText('Cohérence cardiaque · 5 minutes');

  await aller(page, '#/reglages/moment-difficile');
  await bouton(page, 'Durée : 2 min').click();
  await expect(bouton(page, 'Durée : 2 min')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lire(page)).toEqual({ duree: 2, rythme: '5-5', son: false });
  const vue = await ouvrir(page);
  await expect(vue.locator('.phase-respiration')).toHaveText('Cohérence cardiaque · 2 minutes');
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(116 * 1000);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(6000);
  await expect(vue.locator('.phase-respiration')).toHaveText('2 minutes de respiration.');
  await expect(vue.getByRole('button', { name: 'Recommencer' })).toBeVisible();

  await ecrire(page, { duree: 10, rythme: '5-5', son: false });
  const vue10 = await ouvrir(page);
  await expect(vue10.locator('.phase-respiration')).toHaveText('Cohérence cardiaque · 10 minutes');
  await vue10.getByRole('button', { name: 'Commencer' }).click();
  // Dix minutes pas à pas coûteraient une demi-minute : un saut suffit, la phase se relit sur l'horloge.
  await page.clock.fastForward(596 * 1000);
  await expect(vue10.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.fastForward(6000);
  await expect(vue10.locator('.phase-respiration')).toHaveText('10 minutes de respiration.');
});

test('le rythme réglé : 4-6 inspire 4 s et expire 6 s, le pic du cercle est à 40 %', async ({ page }) => {
  // En 5-5, le pic de l'animation est à mi-cycle.
  let vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  const animation = (v) => v.locator('.cercle-respiration span').evaluate((s) => {
    const a = s.getAnimations()[0];
    return { duree: a.effect.getTiming().duration, pics: a.effect.getKeyframes().map((k) => k.offset) };
  });
  expect(await animation(vue)).toEqual({ duree: 10000, pics: [0, 0.5, 1] });

  await aller(page, '#/reglages/moment-difficile');
  await bouton(page, 'Rythme : 4-6').click();
  await expect(bouton(page, 'Rythme : 4-6')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lire(page)).toEqual({ duree: 5, rythme: '4-6', son: false });

  vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  expect(await animation(vue)).toEqual({ duree: 10000, pics: [0, 0.4, 1] });
  await page.clock.runFor(3000);
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await page.clock.runFor(1800);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(4200);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(1600);
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
});

test('« Réduire les animations » : le cercle ne bouge pas et change de teinte d\'un coup à chaque phase', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const vue = await ouvrir(page);
  const cercle = vue.locator('.cercle-respiration');
  const disque = cercle.locator('span');
  const etat = () => disque.evaluate((s) => {
    const c = getComputedStyle(s);
    return { fond: c.backgroundColor, animation: c.animationName, forme: c.transform };
  });
  await expect(cercle).not.toHaveClass(/phase-/);

  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await expect(cercle).toHaveClass(/phase-inspire/);
  const pleine = await etat();
  expect(pleine.animation).toBe('none');

  await page.clock.runFor(5400);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await expect(cercle).toHaveClass(/phase-expire/);
  await expect(cercle).not.toHaveClass(/phase-inspire/);
  const claire = await etat();
  expect(claire.fond).not.toBe(pleine.fond);
  expect(claire.animation).toBe('none');
  expect(claire.forme).toBe(pleine.forme);

  await page.clock.runFor(5000);
  await expect(cercle).toHaveClass(/phase-inspire/);
  expect(await etat()).toEqual(pleine);

  await vue.getByRole('button', { name: 'Arrêter' }).click();
  await expect(cercle).not.toHaveClass(/phase-/);
});

test('sans « Réduire les animations » : le cercle respire, et sa teinte ne change pas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const vue = await ouvrir(page);
  const disque = vue.locator('.cercle-respiration span');
  const fond = () => disque.evaluate((s) => getComputedStyle(s).backgroundColor);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.cercle-respiration')).toHaveClass(/phase-inspire/);
  expect(await disque.evaluate((s) => getComputedStyle(s).animationName)).toBe('respirer');
  const avant = await fond();
  await page.clock.runFor(5400);
  await expect(vue.locator('.cercle-respiration')).toHaveClass(/phase-expire/);
  expect(await fond()).toBe(avant);
});

test('le signal sonore est éteint par défaut : aucun contexte audio, même après un exercice entier', async ({ page }) => {
  await espionnerAudio(page);
  const vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(5400);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(5 * 60 * 1000);
  await expect(vue.locator('.phase-respiration')).toHaveText('5 minutes de respiration.');
  expect(await audio(page)).toEqual({ contextes: 0, notes: [], fermes: 0 });
});

test('signal sonore activé : un contexte créé au toucher, une note par phase, fermé à l\'arrêt', async ({ page }) => {
  await aller(page, '#/reglages/moment-difficile');
  const interrupteur = page.getByRole('switch', { name: 'Signal sonore' });
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => lire(page)).toEqual({ duree: 5, rythme: '5-5', son: true });

  await espionnerAudio(page);
  const vue = await ouvrir(page);
  // Rien ne s'ouvre avant le toucher : iOS n'accepte un contexte audio que dans un geste.
  expect((await audio(page)).contextes).toBe(0);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  expect(await audio(page)).toMatchObject({ contextes: 1, fermes: 0 });
  expect((await audio(page)).notes).toHaveLength(1);
  await page.clock.runFor(5400);
  await expect(vue.locator('.phase-respiration')).toHaveText('Expire');
  await page.clock.runFor(5000);
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  const { notes, contextes } = await audio(page);
  expect(contextes).toBe(1);
  expect(notes).toHaveLength(3);
  expect(notes[0]).not.toBe(notes[1]);
  expect(notes[2]).toBe(notes[0]);

  await vue.getByRole('button', { name: 'Arrêter' }).click();
  await page.clock.runFor(2000);
  expect((await audio(page)).fermes).toBe(1);
  expect((await audio(page)).notes).toHaveLength(3);
  await expect(vue.locator('.phase-respiration')).toHaveText('Cohérence cardiaque · 5 minutes');
});

test('signal sonore activé : une note à la fin aussi, puis le contexte est fermé', async ({ page }) => {
  await ecrire(page, { duree: 2, rythme: '4-6', son: true });
  await espionnerAudio(page);
  const vue = await ouvrir(page);
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await page.clock.runFor(122 * 1000);
  await expect(vue.locator('.phase-respiration')).toHaveText('2 minutes de respiration.');
  // Un début d'inspiration et un début d'expiration par cycle de 10 s (12 cycles), plus la note de fin.
  const { notes, fermes } = await audio(page);
  expect(notes).toHaveLength(12 * 2 + 1);
  expect(fermes).toBe(1);
});

test('l\'écran reste allumé pendant l\'exercice, puis le verrou est rendu', async ({ page }) => {
  await page.evaluate(() => {
    const j = { demandes: 0, rendus: 0 };
    window.__verrou = j;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => { j.demandes += 1; return { release: async () => { j.rendus += 1; } }; } },
    });
  });
  const vue = await ouvrir(page);
  expect(await page.evaluate(() => window.__verrou)).toEqual({ demandes: 0, rendus: 0 });
  await vue.getByRole('button', { name: 'Commencer' }).click();
  await expect(vue.locator('.phase-respiration')).toHaveText('Inspire');
  await expect.poll(() => page.evaluate(() => window.__verrou)).toEqual({ demandes: 1, rendus: 0 });
  await vue.getByRole('button', { name: 'Arrêter' }).click();
  await expect.poll(() => page.evaluate(() => window.__verrou)).toEqual({ demandes: 1, rendus: 1 });
});

test('démarrer tout de suite (Me ressourcer) : la respiration part sans toucher, avec les réglages', async ({ page }) => {
  await ecrire(page, { duree: 2, rythme: '4-6', son: false });
  await page.evaluate(async () => {
    const { html, render } = await import('/js/ui/lib.js');
    const { Respiration } = await import('/js/ui/composants/respiration.js');
    const hote = document.createElement('div');
    hote.id = 'essai-respiration';
    document.body.append(hote);
    render(html`<${Respiration} demarrerTout=${true} />`, hote);
  });
  const hote = page.locator('#essai-respiration');
  await expect(hote.locator('.phase-respiration')).toHaveText('Inspire');
  await expect(hote.getByRole('button', { name: 'Arrêter' })).toBeVisible();
  await page.clock.runFor(4400);
  await expect(hote.locator('.phase-respiration')).toHaveText('Expire');
});
