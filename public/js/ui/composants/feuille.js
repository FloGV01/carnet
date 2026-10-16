// Feuille posée en bas, par-dessus l'écran en cours, sans navigation : on ne perd pas sa place (Mon plan, une
// fiche liée en consultation, « En parler au rendez-vous »). Même schéma que Confirmation : focus sur le titre,
// Échap, Fermer et un toucher hors de la feuille la ferment, et le focus revient à l'origine
// (retourFocus : Safari ne donne pas le focus à un bouton touché).
import { html, useEffect, useRef } from '../lib.js';
import { Icones } from '../icones.js';

export function Feuille({ titre, idTitre, surFermer, retourFocus, children }) {
  const tete = useRef(null);
  useEffect(() => {
    const precedent = document.activeElement;
    if (tete.current) tete.current.focus();
    const touche = (e) => { if (e.key === 'Escape') surFermer(); };
    document.addEventListener('keydown', touche);
    return () => {
      document.removeEventListener('keydown', touche);
      const cible = (retourFocus && retourFocus.current) || precedent;
      if (cible && cible.focus) cible.focus();
    };
  }, []);
  return html`<div class="voile voile-feuille" onClick=${(e) => { if (e.target === e.currentTarget) surFermer(); }}>
    <section class="feuille" role="dialog" aria-modal="true" aria-labelledby=${idTitre}>
      <div class="feuille-tete">
        <h2 class="titre-carte" id=${idTitre} tabindex="-1" ref=${tete}>${titre}</h2>
        <button type="button" class="fermer btn-lien" onClick=${surFermer}>${Icones.fermer({ trait: 2 })}Fermer</button>
      </div>
      ${children}
    </section>
  </div>`;
}
