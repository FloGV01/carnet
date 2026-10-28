// Lectures de toute la base, gardées tant qu'elle n'a pas changé (v8, Q26) : l'Analyse, Comprendre, la Vue soignants et
// l'Historique lisent tous les stores, et le coût, avec les années, est dans ces lectures plus que dans les calculs.
// Avant de tout relire, un écran ne lit que la méta `derniereEcriture`, que chaque écriture met à l'heure (imports,
// « Revenir » et « Tout effacer » compris). Si elle n'a pas bougé, ni le jour, ni rien d'écrit dans cette session
// (`versionDonnees`, qui compte aussi deux écritures dans la même milliseconde), la lecture d'avant resert, avec ce qui
// en a été calculé. Rien n'est gardé ailleurs qu'en mémoire.
import { repo } from '../donnees.js';
import { etatApp } from '../store.js';

const memoire = new Map();

// La clé de l'état de la base, à cet instant.
async function cleBase() {
  const ecriture = await repo.meta.lire('derniereEcriture');
  return `${ecriture}|${etatApp.lire().versionDonnees || 0}|${repo.aujourdhui()}`;
}

// La valeur gardée sous `nom` si la base n'a pas changé depuis, sinon `calculer()`, gardée pour la fois suivante. La clé
// est lue avant le calcul : une écriture pendant le calcul le fera refaire la fois suivante, jamais l'inverse. La promesse
// est gardée dès le départ du calcul : deux appels en même temps (la Vue soignants ouverte à froid lit la base pour
// l'Analyse et pour elle-même) attendent la même lecture, au lieu de lire la base deux fois. Un calcul qui échoue n'est
// pas gardé : l'appel suivant le refait.
export async function lireSiChange(nom, calculer) {
  const cle = await cleBase();
  const gardee = memoire.get(nom);
  if (gardee && gardee.cle === cle) return gardee.valeur;
  const valeur = Promise.resolve().then(calculer);
  memoire.set(nom, { cle, valeur });
  valeur.catch(() => { if (memoire.get(nom)?.valeur === valeur) memoire.delete(nom); });
  return valeur;
}

// Toute la base (sans les sons des mémos), lue une fois pour les quatre écrans. Les tableaux rendus ne se modifient pas.
export const lireBase = () => lireSiChange('base', async () => {
  const [journal, episodes, symptomes, traitements, humeurs, seances, rdvs, items, avecMemo, explosionsDepuis, traitementActuel, perso] = await Promise.all([
    repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.traitements.tous(), repo.humeurs.tous(), repo.seances.tous(),
    repo.rdv.tous(), repo.listes.items(), repo.audios.parents(), repo.meta.lire('explosionsDepuis'), repo.meta.lire('traitementActuel'),
    repo.meta.lire('motsPerso'),
  ]);
  // perso (v9) : la méta `motsPerso`, les mots à soi, pour le libellé et la zone d'un relevé qui en cite un.
  return { journal, episodes, symptomes, traitements, humeurs, seances, rdvs, items, avecMemo, explosionsDepuis, traitementActuel, perso };
});

// Un import, « Revenir » ou « Tout effacer » : tout est relu (même quand l'heure ne bouge pas, horloge des tests figée).
export function oublierLectures() { memoire.clear(); }
