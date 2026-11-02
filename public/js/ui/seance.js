// Séances de Bien-être (v7, spec §6.3), côté écran : le verrou d'écran d'un exercice, et le suivi d'une séance (une
// respiration, un exercice, une séance du Programme), notée une seule fois. Une séance passe la règle de
// domain/seances.js (menée au bout, ou arrêtée après 60 s) : la première note qui la passe la crée, les suivantes de la
// même séance mettent sa durée à jour (une séance notée quand l'app passe en arrière-plan, puis reprise et finie, reste
// une seule séance).
import { useRef } from './lib.js';
import { repo } from '../donnees.js';
import { doitEnregistrer, dureeSeance, nouvelleSeance } from '../domain/seances.js';

// L'écran reste allumé pendant un exercice si l'iPhone le permet (Wake Lock), sinon tant pis.
export async function garderEcran() {
  try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { return null; }
}

// Le verrou d'écran d'un écran entier (v10, les deux minuteurs). `prendre()` le demande (de nouveau au retour d'une page cachée,
// où l'iPhone le reprend), `rendre()` le rend ; un verrou obtenu après `rendre()` est rendu tout de suite.
export function useVerrouEcran() {
  const ref = useRef(null);
  if (!ref.current) {
    let verrou = null;
    let voulu = false;
    const lacher = (v) => { if (v) v.release().catch(() => {}); };
    ref.current = {
      prendre() {
        voulu = true;
        garderEcran().then((v) => {
          if (!voulu) { lacher(v); return; }
          lacher(verrou);
          verrou = v;
        });
      },
      rendre() {
        voulu = false;
        lacher(verrou);
        verrou = null;
      },
    };
  }
  return ref.current;
}

// exercice : `coherence`, l'identifiant d'un exercice ou `minuteur` (v10) ; origine : `bien-etre`, `moment-difficile` ou
// `ressourcer`. Sans origine, rien n'est noté. programme (v8) : l'identifiant de la séance du Programme d'où elle a été lancée, et rien
// ailleurs. `commencer()` ouvre une séance (son début fait sa date et son heure), `noter({ dureeS, terminee })` la note
// si la règle le permet ; menée au bout (`terminee`), elle porte `fin: true` (v8), qui ne s'efface plus. Les écritures se
// suivent ; un échec n'interrompt rien. `notee()` (v8, Q29) : la séance en cours a passé la règle (elle est, ou va être,
// enregistrée) ; le lecteur ne propose « Noter mon émotion » qu'après une telle séance.
function suivi(exercice, origine, programme) {
  let courante = null;
  let file = Promise.resolve();
  return {
    commencer() { courante = { debut: repo.maintenant(), id: null, notee: false }; },
    notee: () => Boolean(courante && courante.notee),
    noter({ dureeS, terminee = false }) {
      const s = courante;
      if (!origine || !s || !doitEnregistrer({ dureeS, terminee })) return file;
      s.notee = true;
      const fin = terminee === true ? { fin: true } : {};
      file = file.then(async () => {
        if (s.id) { await repo.seances.modifier(s.id, { dureeS: dureeSeance(dureeS), ...fin }); return; }
        const fiche = { ...nouvelleSeance({ exercice, origine, debut: s.debut, dureeS }), ...fin, ...(programme ? { programme } : {}) };
        s.id = (await repo.seances.creer(fiche)).id;
      }).catch(() => {});
      return file;
    },
  };
}

export function useSeance(exercice, origine, { programme = null } = {}) {
  const ref = useRef(null);
  if (!ref.current) ref.current = suivi(exercice, origine, programme);
  return ref.current;
}
