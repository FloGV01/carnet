import { html } from '../lib.js';
import { Icones } from '../icones.js';
import { formaterJour } from '../../domain/dates.js';

// En-tête : ‹ jour › ; le titre ouvre le sélecteur de date d'iOS (bornes vérifiées en JS).
// Dessous : le résumé de la journée et « Enregistré » ; un échec d'écriture prend la place du
// résumé, sans décaler les champs. Au-dessus, pour un jour ouvert depuis l'Historique (v6.1) : « ‹ Retour ».
export function EnteteJour({ date, aujourdhui, surAller, indicateur, resume, surRetour }) {
  const estAujourdhui = date === aujourdhui;
  const titre = estAujourdhui ? `Aujourd'hui · ${formaterJour(date)}` : formaterJour(date);
  const surDate = (e) => {
    const v = e.target.value;
    if (v && v <= aujourdhui) surAller(v);
    else e.target.value = date;
  };
  return html`<header class="entete-jour">
    ${surRetour && html`<div class="barre-retour">
      <button type="button" class="retour" onClick=${surRetour}>${Icones.retour({ trait: 2 })}Retour</button>
    </div>`}
    <div class="ligne-jour">
      <button type="button" class="nav-jour" aria-label="Jour précédent" onClick=${() => surAller('precedent')}>${Icones.retour({ trait: 2 })}</button>
      <div class="titre-jour">
        <div class="titre-jour-date">
          <h1>${titre}</h1>
          <input type="date" class="choix-date" aria-label="Choisir une date" value=${date} max=${aujourdhui} onChange=${surDate} />
        </div>
        <p class=${indicateur === 'echec' ? 'sous-jour echec' : 'sous-jour'}>
          ${indicateur !== 'echec' && html`<span class="resume-jour">${resume || ''}</span>`}
          <span class="indicateur" role="status" aria-live="polite">${indicateur === 'ok' ? 'Enregistré' : indicateur === 'echec' ? "Enregistrement impossible pour l'instant, nouvel essai en cours." : ''}</span>
        </p>
      </div>
      <button type="button" class="nav-jour" aria-label="Jour suivant" disabled=${estAujourdhui} onClick=${() => surAller('suivant')}>${Icones.chevron({ trait: 2 })}</button>
    </div>
  </header>`;
}
