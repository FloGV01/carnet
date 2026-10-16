// « Me ressourcer » (v6) : « Pour récupérer, je… » tel que l'utilisateur l'a écrit dans Mon plan, avec
// « Respirer ». Partagé par l'écran Me ressourcer et par la carte de l'Humeur du moment (la règle). Rien
// n'y est calculé, compté ni gardé.
import { html, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserRessourcer, TITRE_RECUPERER } from '../../domain/ressourcer.js';
import { Icones } from '../icones.js';
import { Respiration } from './respiration.js';
import { preparerSon } from './signal-sonore.js';

// Une lecture qui échoue donne le réglage par défaut, éteint : la règle ne joue pas.
export const lireRessourcer = () => repo.meta.lire('ressourcer').catch(() => null).then(normaliserRessourcer);

// Un toucher affiche la respiration à la place du bouton et la démarre aussitôt. Le contexte audio ne naît
// que dans un geste : on le prépare ici, en premier et de façon synchrone, sans regarder le réglage du signal
// (la respiration le rendort s'il est éteint).
function Respirer() {
  const [affichee, setAffichee] = useState(false);
  if (affichee) return html`<${Respiration} demarrerTout=${true} />`;
  return html`<button type="button" class="btn btn-plein" onClick=${() => { preparerSon(); setAffichee(true); }}>${Icones.respiration()}Respirer</button>`;
}

// `grand` : l'écran Me ressourcer (texte en grand). Sinon, la carte de l'Humeur du moment.
export function PourRecuperer({ texte, grand = false }) {
  return html`<section class=${`ressourcer-liste${grand ? ' grand' : ' carte'}`} aria-labelledby="titre-ressourcer">
    <h2 class="ressourcer-rubrique" id="titre-ressourcer">${TITRE_RECUPERER}</h2>
    <p class="ressourcer-texte">${texte}</p>
    <${Respirer} />
  </section>`;
}
