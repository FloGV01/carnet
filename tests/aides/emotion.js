// Aides de l'écran « Émotion du moment » (v9, spec §4) : l'écran 1 et ses quatre bulles, la carte des mots, la carte du
// bas. Un bouton en garde (350 ms après un changement de vue) est aria-disabled, ou dans un groupe aria-disabled :
// Playwright attend la fin de la garde avant de toucher.
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
// Une couleur puis un mot : le relevé est écrit au mot.
export async function noter(vue, zone, libelle) {
  await bulle(vue, zone).click();
  await mot(vue, libelle).click();
}
export const NOTEE = 'Émotion du moment notée';
