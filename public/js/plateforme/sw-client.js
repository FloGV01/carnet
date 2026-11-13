// Enregistrement du service worker et mises à jour : à la demande dans l'app installée (bandeau « Nouvelle version prête »),
// seules sur le guide d'installation de Safari (v12, voir doitAppliquerSeule).
// Sur localhost, le service worker est coupé (sauf avec ?sw) pour ne pas gêner le développement.
import { estLocal } from './mode.js';

const INTERVALLE_VERIF_MS = 15 * 60 * 1000;
let enregistrement = null;
let derniereVerif = 0;
let rechargementDemande = false;

// v12 (spec v12 §7) : dans Safari, une page servie par une ancienne version du service worker garde l'ancien titre et
// l'ancienne icône, que « Sur l'écran d'accueil » reprend. Hors de l'app installée, Emozio n'affiche que le guide
// d'installation ou la page du code de Spotify, sans bandeau : sur le guide, une version qui attend s'applique seule. Jamais
// en mode app (le bandeau reste), jamais sur la page du code (il est déjà retiré de l'adresse, un rechargement le perdrait),
// jamais sur un écran de saisie (en local, hors mode app, l'app s'affiche sans guide : le bandeau y reste).
export function doitAppliquerSeule({ modeApp, guide, pageCode }) {
  return !modeApp && Boolean(guide) && !pageCode;
}

// `appliquerSeule` (doitAppliquerSeule) : la version qui attend est appliquée une fois, sans bandeau, et la page recharge une
// fois quand elle prend la main. Jamais en boucle : la page ne recharge que sur la prise de main d'une version qu'elle a
// demandée, et une seule fois ; la page rechargée n'a plus de version en attente.
export async function initialiserSw({ surMajDisponible, appliquerSeule = false, win = globalThis } = {}) {
  const nav = win.navigator;
  if (!nav.serviceWorker) return null;
  const local = estLocal(win.location);
  const avecSw = new URLSearchParams(win.location.search).has('sw');
  if (local && !avecSw) {
    for (const r of await nav.serviceWorker.getRegistrations()) await r.unregister();
    return null;
  }
  const reg = await nav.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
  enregistrement = reg;
  let appliquee = false;
  const signaler = () => {
    if (!reg.waiting || !nav.serviceWorker.controller) return;
    if (!appliquerSeule) { if (surMajDisponible) surMajDisponible(); return; }
    if (appliquee) return;
    appliquee = true;
    appliquerMaj();
  };
  signaler();
  reg.addEventListener('updatefound', () => {
    const nouveau = reg.installing;
    if (!nouveau) return;
    nouveau.addEventListener('statechange', () => { if (nouveau.state === 'installed') signaler(); });
  });
  let recharge = false;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    if (!rechargementDemande || recharge) return;
    recharge = true;
    win.location.reload();
  });
  verifierMaj(true);
  win.document.addEventListener('visibilitychange', () => {
    if (win.document.visibilityState === 'visible') verifierMaj(false);
  });
  return reg;
}

export async function verifierMaj(forcer = false) {
  if (!enregistrement) return false;
  const maintenant = Date.now();
  if (!forcer && maintenant - derniereVerif < INTERVALLE_VERIF_MS) return false;
  derniereVerif = maintenant;
  try { await enregistrement.update(); return true; } catch { return false; }
}

export function appliquerMaj() {
  if (!enregistrement || !enregistrement.waiting) return false;
  rechargementDemande = true;
  enregistrement.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function versionSw(nav = globalThis.navigator) {
  const ctrl = nav.serviceWorker && nav.serviceWorker.controller;
  if (!ctrl) return Promise.resolve(null);
  return new Promise((resoudre) => {
    const canal = new MessageChannel();
    const minuteur = setTimeout(() => resoudre(null), 1500);
    canal.port1.onmessage = (e) => { clearTimeout(minuteur); resoudre(e.data && e.data.version); };
    ctrl.postMessage({ type: 'VERSION' }, [canal.port2]);
  });
}
