// Lecture minimale des blocs [[headers]] de netlify.toml (format écrit à la main, stable).
import { readFileSync } from 'node:fs';

export function lireEnTetes(cheminToml) {
  const blocs = [];
  let courant = null;
  let dansValeurs = false;
  for (const brute of readFileSync(cheminToml, 'utf8').split('\n')) {
    const ligne = brute.trim();
    if (!ligne || ligne.startsWith('#')) continue;
    if (ligne === '[[headers]]') { courant = { motif: null, valeurs: {} }; blocs.push(courant); dansValeurs = false; continue; }
    if (ligne.startsWith('[')) { dansValeurs = ligne === '[headers.values]' && courant !== null; if (!dansValeurs && ligne !== '[headers.values]') courant = null; continue; }
    const m = ligne.match(/^([A-Za-z-]+)\s*=\s*"(.*)"$/);
    if (!m || !courant) continue;
    if (m[1] === 'for') courant.motif = m[2];
    else if (dansValeurs) courant.valeurs[m[1]] = m[2];
  }
  return blocs;
}

export function enTetesPour(blocs, chemin) {
  const res = {};
  for (const { motif, valeurs } of blocs) {
    const ok = motif === '/*' || motif === chemin || (motif.endsWith('/*') && chemin.startsWith(motif.slice(0, -1)));
    if (ok) Object.assign(res, valeurs);
  }
  return res;
}
