// Résolution des identifiants de liste en libellés.
export const SANS_LIBELLE = 'Élément sans libellé';

export function carteLibelles(items) {
  const m = new Map();
  for (const it of items) m.set(it.id, it.libelle);
  return m;
}
export function libelle(carte, id) {
  if (id == null) return null;
  return carte.get(id) ?? SANS_LIBELLE;
}
// Partie entre parenthèses affichée à part : « Surcharge sensorielle » + « bruit, monde ».
export function decouperLibelle(texte) {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(texte || '');
  return m ? { principal: m[1], precision: m[2] } : { principal: texte, precision: null };
}
