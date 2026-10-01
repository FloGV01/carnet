import { html } from '../lib.js';
import { formaterJour } from '../../domain/dates.js';

const TEXTES_INDICATEUR = { ok: 'Enregistré', echec: "Enregistrement impossible pour l'instant, nouvel essai en cours." };

// En-tête : ‹ jour › ; le titre ouvre le sélecteur de date d'iOS (bornes vérifiées en JS).
export function EnteteJour({ date, aujourdhui, surAller, indicateur }) {
  const estAujourdhui = date === aujourdhui;
  const titre = estAujourdhui ? `Aujourd'hui · ${formaterJour(date)}` : formaterJour(date);
  const surDate = (e) => {
    const v = e.target.value;
    if (v && v <= aujourdhui) surAller(v);
    else e.target.value = date;
  };
  return html`<header class="entete-jour">
    <button type="button" class="nav-jour" aria-label="Jour précédent" onClick=${() => surAller('precedent')}>‹</button>
    <div class="titre-jour">
      <h1>${titre}</h1>
      <input type="date" class="choix-date" aria-label="Choisir une date" value=${date} max=${aujourdhui} onChange=${surDate} />
    </div>
    <button type="button" class="nav-jour" aria-label="Jour suivant" disabled=${estAujourdhui} onClick=${() => surAller('suivant')}>›</button>
    <p class="indicateur" role="status" aria-live="polite">${indicateur !== 'repos' ? TEXTES_INDICATEUR[indicateur] : ''}</p>
  </header>`;
}
