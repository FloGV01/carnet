// Les favoris de Bien-être (v10, spec §7.3 et §14.4) : la méta `favorisBienEtre`, une liste d'identifiants dans l'ordre où
// ils ont été épinglés. Elle vient aussi d'une sauvegarde d'une autre version : à la lecture, un identifiant inconnu, un
// doublon ou une valeur abîmée sont ignorés, sans erreur ni ligne vide. Aucun nombre n'en est tiré. Pur.
import { ELEMENTS_BIEN_ETRE } from './entrees-bien-etre.js';

export function normaliserFavoris(valeur) {
  if (!Array.isArray(valeur)) return [];
  return [...new Set(valeur.filter((id) => ELEMENTS_BIEN_ETRE.includes(id)))];
}

// Une épingle touchée : l'élément s'ajoute à la fin, ou se retire. Un identifiant inconnu ne s'ajoute pas.
export function basculerFavori(favoris, id) {
  const liste = normaliserFavoris(favoris);
  if (liste.includes(id)) return liste.filter((x) => x !== id);
  return ELEMENTS_BIEN_ETRE.includes(id) ? [...liste, id] : liste;
}
