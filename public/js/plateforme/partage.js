// Partage de fichiers par la feuille de partage d'iOS. Le fichier doit être préparé
// AVANT le toucher : navigator.share doit être appelé dans le geste, sans await avant.
export function peutPartager(fichier, nav = globalThis.navigator) {
  try { return Boolean(nav.canShare && nav.canShare({ files: [fichier] })); } catch { return false; }
}

export function partager(fichier, { titre } = {}, nav = globalThis.navigator) {
  if (!peutPartager(fichier, nav)) return Promise.resolve('impossible');
  let promesse;
  try {
    promesse = nav.share(titre ? { files: [fichier], title: titre } : { files: [fichier] });
  } catch (e) {
    return Promise.resolve(e && e.name === 'AbortError' ? 'annule' : 'echec');
  }
  return promesse.then(() => 'partage', (e) => (e && e.name === 'AbortError' ? 'annule' : 'echec'));
}

// Replis successifs pour un fichier texte (JSON) : type d'origine, puis text/plain.
export function variantesTexte(nom, contenu, type) {
  const variantes = [new File([contenu], nom, { type })];
  if (type !== 'text/plain') variantes.push(new File([contenu], nom.replace(/\.[a-z]+$/, '.txt'), { type: 'text/plain' }));
  return variantes;
}

export function premierPartageable(variantes, nav = globalThis.navigator) {
  return variantes.find((f) => peutPartager(f, nav)) || null;
}
