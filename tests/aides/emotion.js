// Aides de l'écran « Émotion du moment » en carte (v8, spec §4) : les six tuiles (l'énergie et un côté), la carte des
// bulles, un mot. Un bouton du groupe en garde (350 ms après un changement de vue) est aria-disabled : Playwright
// attend la fin de la garde avant de toucher.
export const vueMoment = (page) => page.getByRole('dialog', { name: 'Émotion du moment' });
export const tuiles = (vue) => vue.getByRole('group', { name: 'Énergie', exact: true });
// tuile(vue, 'Haute', 'désagréable') : « Énergie haute, plutôt désagréable ».
export const tuile = (vue, energie, cote = 'désagréable') => tuiles(vue)
  .getByRole('button', { name: `Énergie ${energie.toLowerCase()}, plutôt ${cote}`, exact: true });
export const carte = (vue) => vue.getByRole('group', { name: 'Émotion', exact: true });
// mot(vue, 'Irrité', 'Colère') : la bulle « Irrité, famille Colère ».
export const mot = (vue, libelle, famille) => carte(vue).getByRole('button', { name: `${libelle}, famille ${famille}`, exact: true });
export const retourEnergie = (vue) => vue.getByRole('button', { name: 'Énergie', exact: true });
export const touteLaCarte = (vue) => vue.getByRole('button', { name: 'Toute la carte', exact: true });
export const definition = (vue) => vue.locator('.definition-carte');
export const NOTEE = 'Émotion du moment notée';
