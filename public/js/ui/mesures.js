// Mesures de l'écran pour le Diagnostic (v8, Q27) : les zones sûres de l'iPhone, la hauteur utile, et la marge du soir,
// entre la dernière carte du soir et la bande du bas (positive : le soir tient sans défiler), et celle de « J'ai fini pour
// ce soir ». Des chiffres techniques seulement, rien sur l'usage : les marges sont prises à chaque affichage du soir
// d'aujourd'hui, détails fermés (aujourdhui.js), gardées en mémoire le temps de la session, jamais enregistrées.

let margeSoir = null;

// Les zones sûres en px, lues sur une sonde invisible qui reprend les variables de tokens.css (--zone-*) : ce que l'app
// utilise vraiment, simulation des tests comprise.
export function zonesSures() {
  const sonde = document.createElement('div');
  sonde.className = 'sonde-zones';
  sonde.setAttribute('aria-hidden', 'true');
  document.body.append(sonde);
  const s = getComputedStyle(sonde);
  const px = (v) => Math.round((parseFloat(v) || 0) * 10) / 10;
  const zones = { haut: px(s.paddingTop), bas: px(s.paddingBottom), gauche: px(s.paddingLeft), droite: px(s.paddingRight) };
  sonde.remove();
  return zones;
}

// La hauteur utile : la hauteur de la fenêtre, moins les zones sûres du haut et du bas.
export function hauteurUtile(zones = zonesSures()) {
  return { fenetre: window.innerHeight, largeur: window.innerWidth, utile: Math.round((window.innerHeight - zones.haut - zones.bas) * 10) / 10 };
}

// La marge du soir sur la page affichée (page en haut, quel que soit le défilement) : du bas de la dernière carte du soir
// (rubrique, ou paire Contact et Sport) au haut de la bande du bas. null sans soir affiché.
export function mesurerMargeSoir(main = document.querySelector('main.aujourdhui')) {
  const bande = main && main.querySelector(':scope > .actions-flottantes');
  const cartes = main ? main.querySelectorAll(':scope > .carte-champ, :scope > .deux-colonnes') : [];
  if (!bande || !cartes.length) return null;
  const derniere = cartes[cartes.length - 1].getBoundingClientRect();
  return Math.round((bande.getBoundingClientRect().top - (derniere.bottom + window.scrollY)) * 10) / 10;
}

// La marge de « J'ai fini pour ce soir » (relecture v8), mesurée de même : du bas du bouton au haut de la bande. null sans
// le bouton (soir encore vide).
export function mesurerMargeFini(main = document.querySelector('main.aujourdhui')) {
  const bande = main && main.querySelector(':scope > .actions-flottantes');
  const fini = main && main.querySelector('.fini-bouton');
  if (!bande || !fini) return null;
  return Math.round((bande.getBoundingClientRect().top - (fini.getBoundingClientRect().bottom + window.scrollY)) * 10) / 10;
}

// Seul le soir d'aujourd'hui, ouvert depuis l'onglet, détails fermés, est mesuré (aujourdhui.js) : la page d'un autre
// jour a « Revenir à aujourd'hui » en plus, un détail ouvert (« Durée › », « Détail › ») allonge le soir, et le soir
// replié n'a plus de carte (rien n'est noté).
export function noterMargeSoir(main) {
  const soir = mesurerMargeSoir(main);
  if (soir != null) margeSoir = { soir, fini: mesurerMargeFini(main) };
}
export const lireMargeSoir = () => (margeSoir ? margeSoir.soir : null);
export const lireMargeFini = () => (margeSoir ? margeSoir.fini : null);
