// Séances de Bien-être (v7, spec §6.3), côté écran : le verrou d'écran d'un exercice, et le suivi d'une séance (une
// respiration, un exercice), notée une seule fois. Une séance passe la règle de domain/seances.js (menée au bout, ou
// arrêtée après 60 s) : la première note qui la passe la crée, les suivantes de la même séance mettent sa durée à jour
// (une séance notée quand l'app passe en arrière-plan, puis reprise et finie, reste une seule séance).
import { useRef } from './lib.js';
import { repo } from '../donnees.js';
import { doitEnregistrer, dureeSeance, nouvelleSeance } from '../domain/seances.js';

// L'écran reste allumé pendant un exercice si l'iPhone le permet (Wake Lock), sinon tant pis.
export async function garderEcran() {
  try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { return null; }
}

// exercice : `coherence` ou l'identifiant d'un exercice ; origine : `bien-etre`, `moment-difficile` ou `ressourcer`. Sans
// origine, rien n'est noté. `commencer()` ouvre une séance (son début fait sa date et son heure), `noter({ dureeS, terminee })`
// la note si la règle le permet. Les écritures se suivent ; un échec n'interrompt rien.
function suivi(exercice, origine) {
  let courante = null;
  let file = Promise.resolve();
  return {
    commencer() { courante = { debut: repo.maintenant(), id: null }; },
    noter({ dureeS, terminee = false }) {
      const s = courante;
      if (!origine || !s || !doitEnregistrer({ dureeS, terminee })) return file;
      file = file.then(async () => {
        if (s.id) { await repo.seances.modifier(s.id, { dureeS: dureeSeance(dureeS) }); return; }
        s.id = (await repo.seances.creer(nouvelleSeance({ exercice, origine, debut: s.debut, dureeS }))).id;
      }).catch(() => {});
      return file;
    },
  };
}

export function useSeance(exercice, origine) {
  const ref = useRef(null);
  if (!ref.current) ref.current = suivi(exercice, origine);
  return ref.current;
}
