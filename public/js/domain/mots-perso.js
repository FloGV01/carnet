// Mots à soi (v9, spec §4.5) : les mots que l'utilisateur ajoute à la carte des émotions. Pur : la méta `motsPerso`
// entre, une nouvelle valeur sort, l'objet reçu n'est jamais modifié ; l'horodatage est passé en paramètre.
// Forme de la méta : { [id]: { libelle, zone, famille: string|null, definition: string|null, archive: boolean, createdAt } }.
// L'identifiant (`roue:perso:u-<8 hexa>`, comme un élément de liste créé par l'utilisateur, domain/ids.js) ne porte ni
// le libellé ni la zone : un mot se renomme, change de zone ou de famille sans que ses relevés soient réécrits. Ils
// affichent son nom et la couleur de sa zone d'aujourd'hui ; leur énergie, enregistrée au toucher, reste celle d'alors.
// Un mot déjà utilisé dans un relevé n'est jamais effacé : il est mis de côté. Il quitte alors la carte et la recherche,
// et ses relevés le lisent toujours (roue.js connaît aussi les mots mis de côté).
import { FAMILLES, motPerso, motsDeLaRoue, estIdPerso } from './roue.js';
import { ZONES } from './carte-roue.js';
import { normLabel } from './vocabulaire.js';
import { nouvelIdListe } from './ids.js';

// Le libellé d'un mot cité par un relevé importé alors que la sauvegarde ne le connaît pas (point de vigilance 4).
export const MOT_SANS_LIBELLE = 'Mot sans libellé';

const MESSAGES = {
  LIBELLE_VIDE: 'Ce mot n\'a pas de nom.',
  LIBELLE_EXISTANT: 'Ce mot est déjà sur la carte.',
  ZONE_INCONNUE: 'Cette couleur n\'existe pas sur la carte.',
  FAMILLE_INCONNUE: 'Cette famille n\'existe pas.',
  ID_INVALIDE: 'Identifiant de mot invalide.',
  ID_EXISTANT: 'Ce mot existe déjà.',
  INTROUVABLE: 'Ce mot est introuvable.',
  MOT_UTILISE: 'Ce mot sert dans un relevé : il peut seulement être mis de côté.',
};
// code : la clé de MESSAGES, comme les DataError du repository (« LIBELLE_EXISTANT » pour les listes).
export class ErreurMot extends Error {
  constructor(code) { super(MESSAGES[code] || code); this.name = 'ErreurMot'; this.code = code; }
}

const estObjet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const CLES_FAMILLES = new Set(FAMILLES.map((f) => f.cle));

// La méta telle qu'elle se lit : un objet, sinon {} (méta absente ou illisible).
export const persoDe = (valeur) => (estObjet(valeur) ? valeur : {});

// Un nouvel identifiant de mot à soi, tiré une seule fois par l'écran qui le crée.
export const nouvelIdMot = (alea) => nouvelIdListe('roue:perso', alea);

const horodatage = (maintenant) => (maintenant instanceof Date ? maintenant.toISOString() : String(maintenant ?? ''));

function libellePropre(libelle) {
  const propre = String(libelle ?? '').normalize('NFC').trim();
  if (!propre) throw new ErreurMot('LIBELLE_VIDE');
  return propre;
}
function zoneValide(zone) {
  if (!ZONES.includes(zone)) throw new ErreurMot('ZONE_INCONNUE');
  return zone;
}
// null pour « Aucune », comme Fatigué et Épuisé.
function familleValide(famille) {
  if (famille === null || famille === undefined || famille === '') return null;
  if (!CLES_FAMILLES.has(famille)) throw new ErreurMot('FAMILLE_INCONNUE');
  return famille;
}
// Facultative : vide ou absente, null.
function definitionPropre(definition) {
  const t = typeof definition === 'string' ? definition.normalize('NFC').trim() : '';
  return t || null;
}

// Un libellé est pris s'il est celui d'un mot de la carte (les 144) ou d'un autre mot à soi qui n'est pas mis de côté.
// Comparaison sans accents ni casse, comme pour les listes.
function exigerLibre(perso, libelle, sauf) {
  const cible = normLabel(libelle);
  const pris = motsDeLaRoue().some((m) => normLabel(m.libelle) === cible)
    || motsActifs(perso).some((m) => m.id !== sauf && normLabel(m.libelle) === cible);
  if (pris) throw new ErreurMot('LIBELLE_EXISTANT');
}

function exigerMot(perso, id) {
  const mot = motPerso(id, perso);
  if (!mot) throw new ErreurMot('INTROUVABLE');
  return mot;
}

// Les mots à soi qui ne sont pas mis de côté, dans l'ordre de création : [{ id, libelle, zone, famille, definition,
// createdAt }]. Une entrée illisible (sans libellé, pas un objet, id mal formé) est laissée de côté.
export function motsActifs(perso) {
  const p = persoDe(perso);
  return Object.keys(p)
    .map((id) => [id, motPerso(id, p)])
    .filter(([, mot]) => mot && !mot.archive)
    .sort(([a, x], [b, y]) => String(x.createdAt || '').localeCompare(String(y.createdAt || '')) || a.localeCompare(b))
    .map(([id, mot]) => ({
      id, libelle: mot.libelle.trim(), zone: ZONES.includes(mot.zone) ? mot.zone : null,
      famille: CLES_FAMILLES.has(mot.famille) ? mot.famille : null, definition: definitionPropre(mot.definition),
      createdAt: mot.createdAt ?? null,
    }));
}

// Crée un mot : le nom et la zone suffisent (spec §4.5), la famille et la définition sont facultatives. Rend
// { perso, id }. L'id est tiré par l'appelant (nouvelIdMot), une seule fois.
export function creerMot(perso, { libelle, zone, famille = null, definition = null } = {}, { id, maintenant } = {}) {
  const p = persoDe(perso);
  if (!estIdPerso(id)) throw new ErreurMot('ID_INVALIDE');
  if (Object.hasOwn(p, id)) throw new ErreurMot('ID_EXISTANT');
  const propre = libellePropre(libelle);
  const mot = { libelle: propre, zone: zoneValide(zone), famille: familleValide(famille), definition: definitionPropre(definition), archive: false, createdAt: horodatage(maintenant) };
  exigerLibre(p, propre, id);
  return { perso: { ...p, [id]: mot }, id };
}

// Change le nom, la zone, la famille ou la définition (seuls les champs donnés). Les relevés ne sont pas réécrits.
export function modifierMot(perso, id, champs = {}) {
  const p = persoDe(perso);
  const mot = { ...exigerMot(p, id) };
  if (Object.hasOwn(champs, 'libelle')) {
    mot.libelle = libellePropre(champs.libelle);
    exigerLibre(p, mot.libelle, id);
  }
  if (Object.hasOwn(champs, 'zone')) mot.zone = zoneValide(champs.zone);
  if (Object.hasOwn(champs, 'famille')) mot.famille = familleValide(champs.famille);
  if (Object.hasOwn(champs, 'definition')) mot.definition = definitionPropre(champs.definition);
  return { ...p, [id]: mot };
}

// Le mot quitte la carte et la recherche ; ses relevés le lisent toujours.
export function mettreDeCote(perso, id) {
  const p = persoDe(perso);
  return { ...p, [id]: { ...exigerMot(p, id), archive: true } };
}

// Efface un mot qui ne sert dans aucun relevé (estUtilise : l'appelant l'a vérifié). Un mot utilisé se met de côté.
export function effacerMot(perso, id, estUtilise) {
  const p = persoDe(perso);
  exigerMot(p, id);
  if (estUtilise) throw new ErreurMot('MOT_UTILISE');
  const reste = { ...p };
  delete reste[id];
  return reste;
}

// Import (point de vigilance 4) : un relevé cite un mot à soi que la sauvegarde ne connaît pas, ou plus lisible. Le mot
// est recréé mis de côté, « Mot sans libellé », sans zone ni famille, daté du fichier : le relevé n'est pas perdu. Rend
// perso tel quel pour tout autre id (mot de la roue, mot à soi connu, id inconnu d'une autre forme).
export function recreerSiAbsent(perso, id, horodatageFichier) {
  if (!estIdPerso(id) || motPerso(id, perso)) return perso;
  const mot = { libelle: MOT_SANS_LIBELLE, zone: null, famille: null, definition: null, archive: true, createdAt: horodatage(horodatageFichier) };
  return { ...persoDe(perso), [id]: mot };
}
