// Aides des tests de Bien-être (v7) et du lecteur (v8) : une synthèse vocale factice, un verrou d'écran factice, la page
// cachée puis montrée, les séances en base, les bols et les souffles joués par le faux contexte audio (aides/audio.js).
import { expect } from './gardes.js';

// Une synthèse vocale factice : `voix` est la liste de getVoices() ; null retire la synthèse vocale. `dits` garde les
// textes dits (sans la parole muette qui amorce la voix dans un toucher).
export const installerParole = (page, voix = [{ lang: 'fr-FR', name: 'Voix factice', localService: true }]) => page.addInitScript((liste) => {
  const p = { dits: [], annulations: 0, amorces: 0 };
  window.__parole = p;
  if (liste === null) {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    return;
  }
  class Enonce { constructor(texte) { this.text = texte; } }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Enonce });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => liste,
      speak: (u) => { if (u.text === '') { p.amorces += 1; return; } p.dits.push(u.text); p.voix = u.voice && u.voice.lang; },
      cancel: () => { p.annulations += 1; },
      addEventListener() {}, removeEventListener() {},
    },
  });
}, voix);
export const parole = (page) => page.evaluate(() => ({ ...window.__parole }));

// Un verrou d'écran factice : les demandes et les rendus.
export const installerVerrou = (page) => page.evaluate(() => {
  const j = { demandes: 0, rendus: 0 };
  window.__verrou = j;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => { j.demandes += 1; return { release: async () => { j.rendus += 1; } }; } },
  });
});
export const verrou = (page) => page.evaluate(() => ({ ...window.__verrou }));

// La page cachée (écran verrouillé, autre app), puis de nouveau visible.
export const cacher = (page) => page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
});
export const montrer = (page) => page.evaluate(() => {
  delete document.visibilityState;
  document.dispatchEvent(new Event('visibilitychange'));
});

export const seances = (page) => page.evaluate(() => window.__carnet.repo.seances.tous());
// Une durée en secondes : le temps de l'horloge factice, plus les quelques secondes réelles des touchers (l'horloge tourne).
export const environ = (dureeS, attendu) => { expect(dureeS).toBeGreaterThanOrEqual(attendu); expect(dureeS).toBeLessThan(attendu + 8); };

// Les bols joués : les oscillateurs partis au même instant font un bol ; sa fréquence est la plus basse. Dans l'ordre.
export const bols = (page) => page.evaluate(() => {
  const groupes = new Map();
  for (const o of window.__audio.oscillateurs) {
    if (o.f < 20) continue; // une houle lente, pas une note
    const cle = o.t.toFixed(3);
    groupes.set(cle, Math.min(groupes.get(cle) ?? Infinity, o.f));
  }
  return [...groupes].map(([t, f]) => ({ t: Number(t), f })).sort((a, b) => a.t - b.t);
});
// Les fréquences de base des bols (ui/composants/sons.js).
export const frequencesBols = (page) => page.evaluate(() => import('/js/ui/composants/sons.js').then((m) => JSON.parse(JSON.stringify(m.BOLS))));
// Les souffles joués : { t, fin } (en secondes, horloge audio).
export const souffles = (page) => page.evaluate(() => window.__audio.souffles.map((s) => ({ ...s })));
// L'horloge audio de la page, maintenant.
export const horloge = (page) => page.evaluate(() => performance.now() / 1000);
