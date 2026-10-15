// Vérification des données (écran Diagnostic). Pur : ni DOM, ni horloge, rien n'est écrit.
// Ne rend que des nombres, jamais un libellé ni un texte de l'utilisateur.
import { normaliser, SCHEMAS } from './champs.js';

// Clé qui désigne la fiche à laquelle un mémo est attaché, selon sa table (le journal par date).
const CLE_PARENT = { journal: 'date', episodes: 'id', symptomes: 'id', traitements: 'id', rdv: 'id' };

const tableau = (v) => (Array.isArray(v) ? v : []);

// Une fiche est illisible si la normalisation d'une sauvegarde la refuse, comme à l'import.
function illisible(store, brut) {
  try { return normaliser(store, brut, { origine: 'sauvegarde' }).erreurs.length > 0; } catch { return true; }
}

// instantane : une liste par table, telle que la rend lireTout (db/sauvegarde.js).
// Rend { parTable: { [table]: nombre de lignes }, memosSansFiche, fichesIllisibles }.
export function verifierDonnees(instantane) {
  const donnees = instantane && typeof instantane === 'object' ? instantane : {};
  const parTable = {};
  for (const [store, lignes] of Object.entries(donnees)) if (Array.isArray(lignes)) parTable[store] = lignes.length;

  let fichesIllisibles = 0;
  for (const store of Object.keys(SCHEMAS)) {
    for (const brut of tableau(donnees[store])) if (illisible(store, brut)) fichesIllisibles += 1;
  }

  // Une fiche illisible reste la fiche de son mémo : seule son absence rend le mémo orphelin.
  const fiches = {};
  for (const [store, cle] of Object.entries(CLE_PARENT)) {
    fiches[store] = new Set(tableau(donnees[store]).map((x) => x && x[cle]).filter((v) => typeof v === 'string'));
  }
  let memosSansFiche = 0;
  for (const a of tableau(donnees.audios)) {
    const parents = a && Object.hasOwn(fiches, a.parentStore) ? fiches[a.parentStore] : null;
    if (!parents || typeof a.parentId !== 'string' || !parents.has(a.parentId)) memosSansFiche += 1;
  }

  return { parTable, memosSansFiche, fichesIllisibles };
}
