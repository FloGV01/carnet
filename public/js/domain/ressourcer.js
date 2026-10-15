// « Me ressourcer » (v6) : la règle qui montre « Pour récupérer, je… » quand l'utilisateur note lui-même
// une énergie basse. Elle est éteinte au départ (méta `ressourcer`, réglée dans Réglages › Me ressourcer).
// Pur : rien n'est calculé sur plusieurs jours, rien n'est compté, et l'affichage ne laisse aucune trace.
import { normaliserPlan, RUBRIQUES_PLAN } from './mon-plan.js';

// Identifiant publié de la liste Énergie : il ne change plus.
export const ENERGIE_BASSE = 'energie:basse';

// Le titre de la rubrique, tel qu'il est dans Mon plan.
export const TITRE_RECUPERER = RUBRIQUES_PLAN.find(([cle]) => cle === 'pourRecuperer')[1];

// Lecture d'un réglage : seul `true` allume ; un champ absent ou d'un autre type reste éteint.
export function normaliserRessourcer(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  return { energieBasse: b.energieBasse === true };
}

// Vraie seulement si l'interrupteur est allumé, si le relevé est noté maintenant (jamais « vers »), si son
// énergie est « basse » et si « Pour récupérer, je… » est écrit. `releve` : { vers, energie }.
export function regleRessourcer({ reglage, releve, plan } = {}) {
  return Boolean(reglage && reglage.energieBasse === true
    && releve && releve.vers !== true && releve.energie === ENERGIE_BASSE
    && normaliserPlan(plan).pourRecuperer);
}
