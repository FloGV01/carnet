import { html } from '../lib.js';
import { Icones } from '../icones.js';
import { formaterJour } from '../../domain/dates.js';

// En-tête : ‹ jour › ; le titre ouvre le sélecteur de date d'iOS (bornes vérifiées en JS).
// Dessous : le résumé de la journée et « Enregistré » ; l'échec d'écriture a sa propre ligne.
export function EnteteJour({ date, aujourdhui, surAller, indicateur, resume }) {
  const estAujourdhui = date === aujourdhui;
  const titre = estAujourdhui ? `Aujourd'hui · ${formaterJour(date)}` : formaterJour(date);
  const surDate = (e) => {
    const v = e.target.value;
    if (v && v <= aujourdhui) surAller(v);
    else e.target.value = date;
  };
  return html`<header class="entete-jour">
    <div class="ligne-jour">
      <button type="button" class="nav-jour" aria-label="Jour précédent" onClick=${() => surAller('precedent')}>${Icones.retour({ trait: 2 })}</button>
      <div class="titre-jour">
        <div class="titre-jour-date">
          <h1>${titre}</h1>
          <input type="date" class="choix-date" aria-label="Choisir une date" value=${date} max=${aujourdhui} onChange=${surDate} />
        </div>
        <p class="sous-jour">
          <span class="resume-jour">${resume || ''}</span>
          <span class="indicateur" role="status" aria-live="polite">${indicateur === 'ok' ? 'Enregistré' : ''}</span>
        </p>
      </div>
      <button type="button" class="nav-jour" aria-label="Jour suivant" disabled=${estAujourdhui} onClick=${() => surAller('suivant')}>${Icones.chevron({ trait: 2 })}</button>
    </div>
    ${indicateur === 'echec' && html`<p class="echec-ecriture" role="status">Enregistrement impossible pour l'instant, nouvel essai en cours.</p>`}
  </header>`;
}
