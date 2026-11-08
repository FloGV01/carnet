import { html, useEffect, useRef } from '../lib.js';

// Boîte de confirmation (alertdialog). Les deux boutons sont en accent : le rouge est réservé
// à « Effacer définitivement ». Focus initial sur Annuler ; Échap vaut Annuler.
// Le texte décrit la boîte (aria-describedby) : le focus va droit sur Annuler, et VoiceOver lit ainsi ce qui sera
// supprimé ou remplacé, pas seulement le titre. Un id fixe suffit : une seule boîte est ouverte à la fois.
// En très grand texte, le voile défile jusqu'aux boutons (.voile-boite, relecture finale de la v11). Le focus initial ne le
// fait pas défiler (contre-relecture : la taille déjà réglée dans iOS, la boîte s'ouvrait en bas, son titre hors de l'écran) :
// on lit la question d'abord, et VoiceOver, sur Annuler, lit toujours le texte.
export function Confirmation({ titre, texte, action, surAnnuler, surConfirmer }) {
  const annuler = useRef(null);
  useEffect(() => {
    const precedent = document.activeElement;
    if (annuler.current) annuler.current.focus({ preventScroll: true });
    const touche = (e) => { if (e.key === 'Escape') surAnnuler(); };
    document.addEventListener('keydown', touche);
    return () => { document.removeEventListener('keydown', touche); if (precedent && precedent.focus) precedent.focus(); };
  }, []);
  return html`<div class="voile voile-boite">
    <div class="boite-confirmation" role="alertdialog" aria-modal="true" aria-label=${titre} aria-describedby=${texte ? 'boite-texte' : null}>
      <div class="boite-corps">
        <p class="boite-titre">${titre}</p>
        ${texte && html`<p class="boite-texte" id="boite-texte">${texte}</p>`}
      </div>
      <div class="boite-pied">
        <button type="button" ref=${annuler} onClick=${surAnnuler}>Annuler</button>
        <button type="button" class="boite-action" onClick=${surConfirmer}>${action}</button>
      </div>
    </div>
  </div>`;
}
