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
// montré en tableau. Mesuré au montage, quand la fenêtre change, quand la page redevient visible, quand la taille du texte
// change écran ouvert (Centre de contrôle, sans `resize`) et quand le contenu change (la base lue après le premier rendu) ;
// la classe part avec l'écran.
// Contre-relecture : un ResizeObserver posé sur body faisait naître par intermittence « ResizeObserver loop completed with
// undelivered notifications » (une erreur de page, que la garde des e2e compte) : la hauteur de body suit le chargement des
// données, et elle changeait encore après son rappel, dans la même image. Seul un témoin est donc observé (`temoin`, dans
// l'Entete : 1em de large, hors flux, caché), dont la taille ne suit que celle du texte ; le contenu, lui, par un
// MutationObserver, qui n'a pas cette boucle. La mesure attend l'image suivante, une fois par image au plus.
export function useDebordeDeCote(actif, temoin) {
  useEffect(() => {
    const app = actif ? document.querySelector('.app') : null;
    if (!app) return undefined;
    const doc = document.documentElement;
    let image = null;
    const mesurer = () => {
      image = null;
      app.classList.toggle('deborde-de-cote', doc.scrollWidth > doc.clientWidth + 1);
    };
    const demander = () => { if (image === null) image = requestAnimationFrame(mesurer); };
    const surVisible = () => { if (document.visibilityState === 'visible') demander(); };
    const cible = temoin && temoin.current;
    const taille = cible && typeof ResizeObserver === 'function' ? new ResizeObserver(demander) : null;
    if (taille) taille.observe(cible);
    const contenu = typeof MutationObserver === 'function' ? new MutationObserver(demander) : null;
    if (contenu) contenu.observe(app, { childList: true, subtree: true, characterData: true, attributes: true });
    mesurer();
    window.addEventListener('resize', demander);
    document.addEventListener('visibilitychange', surVisible);
    return () => {
      if (taille) taille.disconnect();
      if (contenu) contenu.disconnect();
      cancelAnimationFrame(image);
      window.removeEventListener('resize', demander);
      document.removeEventListener('visibilitychange', surVisible);
      app.classList.remove('deborde-de-cote');
    };
  }, [actif]);
}
