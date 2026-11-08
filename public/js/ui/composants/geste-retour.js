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

// Le défilement de côté d'une page plus large que l'écran (relecture finale de la v11). En très grand texte, des écrans à
// « Retour » hérités débordent déjà de côté (Rendez-vous, Traitement, Soins › Traitement, la Vue soignants, Rappels) :
// `pan-y pinch-zoom` sur .app ôtait au doigt ce défilement, et ce qui dépasse à droite ne s'atteignait plus. Une telle page
// le rend à iOS (.deborde-de-cote, ecrans.css) : le geste de retour peut alors être pris par iOS, comme depuis un graphe
// montré en tableau. Mesuré au montage, quand la fenêtre change, quand la page redevient visible et quand le contenu change
// de taille (la taille du texte changée, ou la base lue après le premier rendu) ; la classe part avec l'écran.
export function useDebordeDeCote(actif) {
  useEffect(() => {
    const app = actif ? document.querySelector('.app') : null;
    if (!app) return undefined;
    const doc = document.documentElement;
    const mesurer = () => { app.classList.toggle('deborde-de-cote', doc.scrollWidth > doc.clientWidth + 1); };
    const surVisible = () => { if (document.visibilityState === 'visible') mesurer(); };
    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(mesurer) : null;
    if (observateur) observateur.observe(document.body);
    mesurer();
    window.addEventListener('resize', mesurer);
    document.addEventListener('visibilitychange', surVisible);
    return () => {
      if (observateur) observateur.disconnect();
      window.removeEventListener('resize', mesurer);
      document.removeEventListener('visibilitychange', surVisible);
      app.classList.remove('deborde-de-cote');
    };
  }, [actif]);
}
