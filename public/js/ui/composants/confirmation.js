import { html, useEffect, useRef } from '../lib.js';

// Boîte de confirmation (alertdialog). Les deux boutons sont en accent : le rouge est réservé
// à « Effacer définitivement ». Focus initial sur Annuler ; Échap vaut Annuler.
export function Confirmation({ titre, texte, action, surAnnuler, surConfirmer }) {
  const annuler = useRef(null);
  useEffect(() => {
    const precedent = document.activeElement;
    if (annuler.current) annuler.current.focus();
    const touche = (e) => { if (e.key === 'Escape') surAnnuler(); };
    document.addEventListener('keydown', touche);
    return () => { document.removeEventListener('keydown', touche); if (precedent && precedent.focus) precedent.focus(); };
  }, []);
  return html`<div class="voile">
    <div class="boite-confirmation" role="alertdialog" aria-modal="true" aria-label=${titre}>
      <div class="boite-corps">
        <p class="boite-titre">${titre}</p>
        ${texte && html`<p class="boite-texte">${texte}</p>`}
      </div>
      <div class="boite-pied">
        <button type="button" ref=${annuler} onClick=${surAnnuler}>Annuler</button>
        <button type="button" class="boite-action" onClick=${surConfirmer}>${action}</button>
      </div>
    </div>
  </div>`;
}
