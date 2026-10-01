// Fiche enregistrée au fil des touchers (RDV, traitement) : créée au premier changement
// avec un id tiré une fois, puis mise à jour. Écritures en file : jamais de doublon.
import { useEffect, useRef, useState } from './lib.js';
import { repo } from '../donnees.js';
import { useIndicateur, ecrireAvecEssais } from './hooks.js';
import { nouvelId } from '../domain/ids.js';
import { versHash } from '../routeur.js';
import { afficherToast } from './composants/toast.js';

const PREFIXES = { episodes: 'ep', symptomes: 'sy', traitements: 'tr', rdv: 'rdv' };

export function useFiche({ store, route, idRoute, initiale, retour }) {
  const [fiche, setFiche] = useState(null);
  const [indicateur, signaler] = useIndicateur();
  const idRef = useRef(null);
  const file = useRef(Promise.resolve());
  const ficheRef = useRef(null);
  ficheRef.current = fiche;

  useEffect(() => {
    let actif = true;
    (async () => {
      if (idRoute && idRoute !== 'nouveau') {
        const lue = await repo[store].lire(idRoute);
        if (!actif) return;
        if (!lue) { location.hash = retour; return; }
        idRef.current = lue.id;
        setFiche(lue);
      } else {
        setFiche(initiale());
      }
    })();
    return () => { actif = false; };
  }, [idRoute]);

  const ecrire = (changements) => {
    setFiche((f) => ({ ...f, ...changements }));
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        const id = nouvelId(PREFIXES[store]);
        const cree = await ecrireAvecEssais(() => repo[store].creer({ ...ficheRef.current, ...changements }, { id }), signaler);
        if (cree) { idRef.current = cree.id; history.replaceState(null, '', versHash(route, { id: cree.id })); }
        return;
      }
      const res = await ecrireAvecEssais(() => repo[store].modifier(idRef.current, changements), signaler);
      if (res === null) { idRef.current = null; history.replaceState(null, '', versHash(route, { id: 'nouveau' })); }
    }).catch(() => {});
    return file.current;
  };

  const assurer = async () => { if (!idRef.current) await ecrire({}); await file.current; return idRef.current; };

  const supprimer = async (nom) => {
    await file.current;
    const id = idRef.current;
    location.hash = retour;
    if (!id) return;
    const sauve = await repo[store].supprimer(id);
    afficherToast(`${nom} supprimé`, { libelle: 'Annuler', faire: () => repo[store].restaurer(sauve) });
  };

  return { fiche, id: idRef.current, ecrire, assurer, supprimer, indicateur, attendre: () => file.current };
}
