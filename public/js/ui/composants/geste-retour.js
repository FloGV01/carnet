import { useEffect, useRef } from '../lib.js';
import { ecouterGlissement, departIgnore } from '../glissement.js';

// Le geste de retour (v11, spec §11) : sur un écran qui a un bouton « Retour » (Entete), ou sur un écran ouvert par-dessus
// l'app où l'on relit (CadreParcours `relecture`, le relevé rouvert de moment.js), le doigt qui glisse vers la droite, partout
// sur l'écran, fait la même chose que ce bouton, au lâcher, sans animation qui suive le doigt. Le doigt vers la gauche ne fait
// rien. Mêmes seuils et mêmes écouteurs passifs que pour changer de jour (ui/glissement.js) : le défilement vertical n'est
// jamais gêné. Un geste parti d'un champ de texte, d'une feuille, d'une boîte de dialogue, d'un parcours de saisie ou d'une
// zone qui défile de côté est ignoré (departIgnore).
// `surRetour` : ce que fait le bouton ; null, aucun écouteur (un onglet, une saisie, un exercice). Le rappel vit dans une
// référence : celui du dernier rendu sert, sans reposer les écouteurs.
export function useGesteRetour(surRetour) {
  const rappel = useRef(surRetour);
  rappel.current = surRetour;
  const actif = Boolean(surRetour);
  useEffect(() => {
    if (!actif) return undefined;
    return ecouterGlissement({
      accepter: (e) => !departIgnore(e.target),
      surSens: (sens) => { if (sens === 'precedent' && rappel.current) rappel.current(); },
    });
  }, [actif]);
}
