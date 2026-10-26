// Mesures de l'écran pour le Diagnostic (v8, Q27) : les zones sûres de l'iPhone, la hauteur utile, et la marge du soir,
// entre la dernière carte du soir et la bande du bas (positive : le soir tient sans défiler). Des chiffres techniques
// seulement, rien sur l'usage : la marge est prise à chaque affichage du soir sur Aujourd'hui, gardée en mémoire le temps
// de la session, jamais enregistrée.

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
// (rubrique, paire Contact et Sport, ou détail ouvert) au haut de la bande du bas. null sans soir affiché.
export function mesurerMargeSoir(main = document.querySelector('main.aujourdhui')) {
  const bande = main && main.querySelector(':scope > .actions-flottantes');
  const cartes = main ? main.querySelectorAll(':scope > .carte-champ, :scope > .deux-colonnes') : [];
  if (!bande || !cartes.length) return null;
  const derniere = cartes[cartes.length - 1].getBoundingClientRect();
  return Math.round((bande.getBoundingClientRect().top - (derniere.bottom + window.scrollY)) * 10) / 10;
}

export function noterMargeSoir(main) {
  const m = mesurerMargeSoir(main);
  if (m != null) margeSoir = m;
}
export const lireMargeSoir = () => margeSoir;
