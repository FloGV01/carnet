// Enregistrement du service worker et mises à jour à la demande.
// Sur localhost, le service worker est coupé (sauf avec ?sw) pour ne pas gêner le développement.
import { estLocal } from './mode.js';

const INTERVALLE_VERIF_MS = 15 * 60 * 1000;
let enregistrement = null;
let derniereVerif = 0;
let rechargementDemande = false;

export async function initialiserSw({ surMajDisponible, win = globalThis } = {}) {
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
  const signaler = () => { if (reg.waiting && nav.serviceWorker.controller) surMajDisponible && surMajDisponible(); };
  signaler();
  reg.addEventListener('updatefound', () => {
    const nouveau = reg.installing;
    if (!nouveau) return;
    nouveau.addEventListener('statechange', () => { if (nouveau.state === 'installed') signaler(); });
  });
  nav.serviceWorker.addEventListener('controllerchange', () => {
    if (rechargementDemande) win.location.reload();
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
