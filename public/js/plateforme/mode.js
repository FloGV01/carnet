// Mode d'affichage : app installée (plein écran) ou simple onglet Safari.
const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]']);

export function estModeApp(win = globalThis) {
  const mm = win.matchMedia && win.matchMedia('(display-mode: standalone)');
  return Boolean((mm && mm.matches) || (win.navigator && win.navigator.standalone === true));
}

export function estLocal(loc = globalThis.location) {
  return HOTES_LOCAUX.has(loc.hostname);
}

// Hors app installée, la saisie est bloquée : le stockage de Safari n'est pas celui
// de l'app, et des données saisies dans Safari seraient perdues pour l'app.
export function doitAfficherGuide(win = globalThis) {
  const local = estLocal(win.location);
  if (local && new URLSearchParams(win.location.search).has('forcer-guide')) return true;
  if (local) return false;
  return !estModeApp(win);
}

export function estSiteTest(loc = globalThis.location) {
  return loc.hostname.startsWith('dev--');
}

export function libelleMode(win = globalThis) {
  if (estModeApp(win)) return 'app installée';
  return estLocal(win.location) ? 'navigateur (local)' : 'navigateur';
}
