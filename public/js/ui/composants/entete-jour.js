import { html } from '../lib.js';
import { Icones } from '../icones.js';
import { formaterJourComplet } from '../../domain/dates.js';

const majusculeInitiale = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// En-tête 2b : « Dimanche 18 octobre ⌄ » (« Aujourd'hui, » en plus pour VoiceOver, sans être affiché), qui ouvre le sélecteur de date d'iOS (bornes vérifiées en JS), puis ‹ › à
// droite (› atténué sur aujourd'hui). Dessous : les familles d'émotions du jour en points de couleur (v7, au lieu de
// l'humeur moyenne), le résumé de la journée et « Enregistré » ; un échec d'écriture prend la place des points et du
// résumé, sans décaler les champs. Au-dessus, pour un jour ouvert depuis l'Historique (v6.1) : « ‹ Retour ».
export function EnteteJour({ date, aujourdhui, surAller, indicateur, resume, familles = [], surRetour }) {
  const estAujourdhui = date === aujourdhui;
  const surDate = (e) => {
    const v = e.target.value;
    if (v && v <= aujourdhui) surAller(v);
    else e.target.value = date;
  };
  const echec = indicateur === 'echec';
  // Le chevron suit le dernier mot du titre, sans s'en séparer quand le titre passe à la ligne (grand texte).
  const mots = majusculeInitiale(formaterJourComplet(date)).split(' ');
  const dernier = mots.pop();
  return html`<header class="entete-jour">
    ${surRetour && html`<div class="barre-retour">
      <button type="button" class="retour" onClick=${surRetour}>${Icones.retour({ trait: 2 })}Retour</button>
    </div>`}
    <div class="ligne-jour">
      <div class="titre-jour">
        <h1>${estAujourdhui && html`<span class="visuellement-cache">Aujourd'hui, </span>`}${mots.join(' ')} <span class="fin-titre">${dernier}${Icones.chevronBas({ trait: 2 })}</span></h1>
        <input type="date" class="choix-date" aria-label="Choisir une date" value=${date} max=${aujourdhui} onChange=${surDate} />
      </div>
      <button type="button" class="nav-jour" aria-label="Jour précédent" onClick=${() => surAller('precedent')}>${Icones.retour({ trait: 2 })}</button>
      <button type="button" class="nav-jour" aria-label="Jour suivant" disabled=${estAujourdhui} onClick=${() => surAller('suivant')}>${Icones.chevron({ trait: 2 })}</button>
    </div>
    <p class=${echec ? 'sous-jour echec' : 'sous-jour'}>
      ${!echec && familles.length > 0 && html`<span class="familles-jour" role="img" aria-label=${`Émotions : ${familles.map((f) => f.libelle).join(', ')}`}>
        ${familles.map((f) => html`<i key=${f.cle} class=${`emo-${f.cle}`}></i>`)}</span>`}
      ${!echec && html`<span class="resume-jour">${resume || ''}</span>`}
      <span class="indicateur" role="status" aria-live="polite">${indicateur === 'ok' ? 'Enregistré' : echec ? "Enregistrement impossible pour l'instant, nouvel essai en cours." : ''}</span>
    </p>
  </header>`;
}
