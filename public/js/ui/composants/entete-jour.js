import { html } from '../lib.js';
import { Icones } from '../icones.js';
import { formaterJourComplet } from '../../domain/dates.js';
import { PointsZones } from './zones.js';

const majusculeInitiale = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// En-tête façon App Store (v12, spec §5.4) : un sur-titre en petites capitales grises, « JEUDI 15 OCTOBRE ⌄ », au-dessus
// d'un grand titre, « Aujourd'hui » ; un autre jour, le grand titre dit le jour et le quantième (« Mercredi 14 ») et le
// sur-titre le mois (« OCTOBRE »). Le titre ouvre le sélecteur de date d'iOS (bornes vérifiées en JS) ; ‹ › sont à droite
// du grand titre, dans des ronds neutres (› grisé sur aujourd'hui). Le nom accessible ne change pas (« Aujourd'hui, Jeudi
// 15 octobre », « Mercredi 14 octobre ») : dans le h1, le DOM met le grand titre avant le sur-titre (ecrans.css les
// inverse à l'écran), et la virgule d'aujourd'hui, lue mais sans taille, reste collée au grand titre. Dessous, sur une
// seule ligne : « Encore jeudi jusqu'à 4 h. » avant 4 h (`veille`), les zones des émotions du jour en points de couleur
// (v9), le résumé de la journée et « Enregistré ». Un échec d'écriture prend la place de la ligne, sans décaler les
// champs. Au-dessus, pour un jour ouvert depuis l'Historique (v6.1) : « ‹ Retour ».
export function EnteteJour({ date, aujourdhui, surAller, indicateur, resume, zones = [], surRetour, veille = null }) {
  const estAujourdhui = date === aujourdhui;
  const surDate = (e) => {
    const v = e.target.value;
    if (v && v <= aujourdhui) surAller(v);
    else e.target.value = date;
  };
  const echec = indicateur === 'echec';
  const mots = majusculeInitiale(formaterJourComplet(date)).split(' ');
  // Aujourd'hui : le grand titre, et la date entière en sur-titre ; un autre jour : « Mercredi 14 », puis le mois.
  const sur = estAujourdhui ? mots : mots.slice(-1);
  const grand = estAujourdhui ? "Aujourd'hui" : mots.slice(0, -1).join(' ');
  // Le chevron suit le dernier mot du sur-titre, sans s'en séparer quand il passe à la ligne (grand texte).
  const dernier = sur[sur.length - 1];
  return html`<header class="entete-jour">
    ${surRetour && html`<div class="barre-retour">
      <button type="button" class="retour" onClick=${surRetour}>${Icones.retour({ trait: 2 })}Retour</button>
    </div>`}
    <div class="ligne-jour">
      <div class="titre-jour">
        <h1><span class="grand-titre">${grand}${estAujourdhui && html`<span class="virgule-lue">, </span>`}</span><span class="sur-titre">${sur.slice(0, -1).map((m) => `${m} `)}<span class="fin-titre">${dernier}${Icones.chevronBas({ trait: 2.6 })}</span></span></h1>
        <input type="date" class="choix-date" aria-label="Choisir une date" value=${date} max=${aujourdhui} onChange=${surDate} />
      </div>
      <button type="button" class="nav-jour" aria-label="Jour précédent" onClick=${() => surAller('precedent')}>${Icones.retour({ trait: 2.2 })}</button>
      <button type="button" class="nav-jour" aria-label="Jour suivant" disabled=${estAujourdhui} onClick=${() => surAller('suivant')}>${Icones.chevron({ trait: 2.2 })}</button>
    </div>
    <p class=${echec ? 'sous-jour echec' : 'sous-jour'}>
      ${!echec && veille && html`<span class="veille-jour">${veille}</span>`}
      ${!echec && html`<${PointsZones} zones=${zones} annoncer=${true} />`}
      ${!echec && html`<span class="resume-jour">${resume || ''}</span>`}
      <span class="indicateur" role="status" aria-live="polite">${indicateur === 'ok' ? 'Enregistré' : echec ? "Enregistrement impossible pour l'instant, nouvel essai en cours." : ''}</span>
    </p>
  </header>`;
}
