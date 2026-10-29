// Aides de l'écran « Émotion du moment » (v9, spec §4) : l'écran 1 et ses quatre bulles, la carte des mots, la carte du
// bas, l'écran 3 (« Ce que je faisais », « Terminer »). Un bouton en garde (350 ms après un changement de vue) est
// aria-disabled, ou dans un groupe aria-disabled : Playwright attend la fin de la garde avant de toucher.
export const vueMoment = (page) => page.getByRole('dialog', { name: 'Émotion du moment' });
// Le nom de chaque bulle de l'écran 1.
export const NOMS_BULLES = {
  rouge: 'Énergie haute, désagréable', jaune: 'Énergie haute, agréable', bleu: 'Énergie basse, désagréable', vert: 'Énergie basse, agréable',
};
export const bulles = (vue) => vue.getByRole('group', { name: 'Touche la couleur la plus proche de ce moment', exact: true });
// bulle(vue, 'bleu') : « Énergie basse, désagréable ».
export const bulle = (vue, zone) => bulles(vue).getByRole('button', { name: NOMS_BULLES[zone], exact: true });
export const carte = (vue) => vue.getByRole('group', { name: 'Émotion', exact: true });
// mot(vue, 'Irrité') : la bulle du mot sur la carte.
export const mot = (vue, libelle) => carte(vue).getByRole('button', { name: libelle, exact: true });
export const retour = (vue) => vue.getByRole('button', { name: 'Revenir au choix de la couleur', exact: true });
export const fermer = (vue) => vue.getByRole('button', { name: 'Fermer', exact: true });
export const continuer = (vue) => vue.getByRole('button', { name: 'Continuer', exact: true });
export const carteDuBas = (vue) => vue.locator('.carte-du-bas');
// L'écran 3 : ses activités, « Terminer », et, pour un relevé rouvert, « Changer le mot » et « Supprimer ce relevé ».
export const faisais = (vue) => vue.getByRole('group', { name: 'Ce que je faisais', exact: true });
export const activite = (vue, libelle) => faisais(vue).getByRole('button', { name: libelle, exact: true });
export const terminer = (vue) => vue.getByRole('button', { name: 'Terminer', exact: true });
export const changerMot = (vue) => vue.getByRole('button', { name: 'Changer le mot', exact: true });
export const supprimerReleve = (vue) => vue.getByRole('button', { name: 'Supprimer ce relevé', exact: true });
// Une couleur puis un mot : le relevé est écrit au mot.
export async function noter(vue, zone, libelle) {
  await bulle(vue, zone).click();
  await mot(vue, libelle).click();
}
// La flèche, puis « Terminer » à l'écran 3 : l'écran se ferme.
export async function finir(vue) {
  await continuer(vue).click();
  await terminer(vue).click();
}
// La loupe (v9, 6/8) : son bouton, son champ, un mot trouvé (par son nom, au début de son nom accessible), et « Ajouter
// mon mot « … » ». Le mot à soi : son écran, son nom, ses couleurs, ses familles.
export const loupe = (vue) => vue.getByRole('button', { name: 'Chercher un mot', exact: true });
export const champLoupe = (vue) => vue.getByRole('searchbox', { name: 'Chercher un mot', exact: true });
export const trouves = (vue) => vue.getByRole('list', { name: 'Mots trouvés', exact: true });
export const trouve = (vue, libelle) => trouves(vue).getByRole('button', { name: new RegExp(`^${libelle}( |$)`) });
export const ajouterMot = (vue) => vue.getByRole('button', { name: /^Ajouter mon mot « / });
export const nomMot = (portee) => portee.getByRole('textbox', { name: 'Nom', exact: true });
export const couleurMot = (portee, zone) => portee.getByRole('group', { name: 'Couleur', exact: true }).getByRole('button', { name: NOMS_BULLES[zone], exact: true });
export const familleMot = (portee, libelle) => portee.getByRole('group', { name: 'Famille', exact: true }).getByRole('button', { name: libelle, exact: true });
export const definitionMot = (portee) => portee.getByRole('textbox', { name: /^Définition/ });
export const NOTEE = 'Émotion du moment notée';
export const SUPPRIME = 'Relevé supprimé';
