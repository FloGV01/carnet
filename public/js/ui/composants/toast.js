import { html, useEffect } from '../lib.js';
import { etatApp } from '../../store.js';

let compteur = 0;
export function afficherToast(texte, action = null, dureeMs = 5000) {
  const id = ++compteur;
  etatApp.maj({ toast: { id, texte, action, dureeMs } });
  return id;
}
export function fermerToast(id) {
  const t = etatApp.lire().toast;
  if (t && (id == null || t.id === id)) etatApp.maj({ toast: null });
}

export function Toast({ toast }) {
  useEffect(() => {
    if (!toast) return undefined;
    const m = setTimeout(() => fermerToast(toast.id), toast.dureeMs);
    return () => clearTimeout(m);
  }, [toast && toast.id]);
  if (!toast) return null;
  return html`<div class="toast" role="status" aria-live="polite">
    <span class="toast-texte">${toast.texte}</span>
    ${toast.action && html`<span aria-hidden="true">·</span>
      <button type="button" onClick=${() => { fermerToast(toast.id); toast.action.faire(); }}>${toast.action.libelle}</button>`}
  </div>`;
}
