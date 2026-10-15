// v6 · Repères de traitement (spec §3). Chaque fiche Traitement dont le changement est rempli marque sa date
// sur la frise « Mes jours » : un trait par colonne, numéroté dans l'ordre chronologique des repères visibles
// (①, ②…) ; deux changements dans la même colonne (jour, semaine ou mois) n'ont qu'un trait, « ①–② ».
// Légende : « ① 12/10 · changement : … », le texte coupé à 80 caractères. Des repères seulement : aucune
// comparaison avant / après. Pur.
import { formaterDateNumerique } from '../domain/dates.js';

const LONGUEUR = 80;

// ① à ⑳, puis ㉑ à ㊿ ; au-delà, le nombre entre parenthèses.
export function numeroCercle(n) {
  if (n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
  if (n >= 21 && n <= 35) return String.fromCodePoint(0x3251 + n - 21);
  if (n >= 36 && n <= 50) return String.fromCodePoint(0x32b1 + n - 36);
  return `(${n})`;
}

const texteChangement = (t) => (t && typeof t.changement === 'string' ? t.changement.replace(/\s+/g, ' ').trim() : '');
const couper = (t) => (t.length > LONGUEUR ? `${t.slice(0, LONGUEUR - 1)}…` : t);

// colonnes : celles de la frise ({ cle, du, au }, dans l'ordre). lignes (le PDF) : les ids des fiches qui ont
// une ligne dans la section Traitement de la page ; seules celles-là sont numérotées et tracées.
// Rend { traits: [{ i, cle, numeros, etiquette }], legende: [{ id, date, numero, symbole, texte }] }.
export function reperesTraitement(traitements, colonnes, { lignes = null } = {}) {
  const garder = lignes ? new Set(lignes) : null;
  const colonneDe = (date) => colonnes.findIndex((c) => date >= c.du && date <= c.au);
  const fiches = (traitements || [])
    .filter((t) => t && typeof t.date === 'string' && texteChangement(t) && (!garder || garder.has(t.id)) && colonneDe(t.date) >= 0)
    .sort((a, b) => `${a.date}${a.createdAt || ''}`.localeCompare(`${b.date}${b.createdAt || ''}`));
  const traits = [];
  const legende = fiches.map((t, k) => {
    const numero = k + 1;
    const i = colonneDe(t.date);
    const dernier = traits[traits.length - 1];
    if (dernier && dernier.i === i) dernier.numeros.push(numero);
    else traits.push({ i, cle: colonnes[i].cle, numeros: [numero] });
    const symbole = numeroCercle(numero);
    return { id: t.id, date: t.date, numero, symbole, texte: `${symbole} ${formaterDateNumerique(t.date).slice(0, 5)} · changement : ${couper(texteChangement(t))}` };
  });
  // Les numéros d'une colonne se suivent : le premier et le dernier suffisent.
  for (const t of traits) {
    const [premier, dernier] = [t.numeros[0], t.numeros[t.numeros.length - 1]];
    t.etiquette = premier === dernier ? numeroCercle(premier) : `${numeroCercle(premier)}–${numeroCercle(dernier)}`;
  }
  return { traits, legende };
}
