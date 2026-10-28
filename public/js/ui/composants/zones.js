import { html } from '../lib.js';
import { minusculeInitiale } from '../../domain/phrase.js';

// Les points de zone d'un jour (v9, spec §13.4 ; les points de famille jusqu'à la v8) : un rond par zone présente, à sa
// couleur (.zone-*), dans l'ordre rouge, jaune, bleu, vert (domain/releves.js, zonesDuJour). Avec `annoncer`, VoiceOver
// les lit (« Émotions : énergie haute · désagréable, … ») ; sans, ils sont masqués, les mots voisins le disent déjà.
export function PointsZones({ zones, annoncer = false }) {
  if (!zones || zones.length === 0) return null;
  const points = zones.map((z) => html`<i key=${z.cle} class=${`zone-${z.cle}`}></i>`);
  return annoncer
    ? html`<span class="zones-jour" role="img" aria-label=${`Émotions : ${zones.map((z) => minusculeInitiale(z.libelle)).join(', ')}`}>${points}</span>`
    : html`<span class="zones-jour" aria-hidden="true">${points}</span>`;
}
