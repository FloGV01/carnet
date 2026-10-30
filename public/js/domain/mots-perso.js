// Mots à soi (v9, spec §4.5) : les mots que l'utilisateur ajoute à la carte des émotions. Pur : la méta `motsPerso`
// entre, une nouvelle valeur sort, l'objet reçu n'est jamais modifié ; l'horodatage est passé en paramètre.
// Forme de la méta : { [id]: { libelle, zone, famille: string|null, definition: string|null, archive: boolean, createdAt } }.
// L'identifiant (`roue:perso:u-<8 hexa>`, comme un élément de liste créé par l'utilisateur, domain/ids.js) ne porte ni
// le libellé ni la zone : un mot se renomme, change de zone ou de famille sans que ses relevés soient réécrits. Ils
// affichent son nom et la couleur de sa zone d'aujourd'hui ; leur énergie, enregistrée au toucher, reste celle d'alors.
// Un mot déjà utilisé dans un relevé n'est jamais effacé : il est mis de côté. Il quitte alors la carte et la recherche,
// et ses relevés le lisent toujours (roue.js connaît aussi les mots mis de côté). Il revient par « Remettre sur la
// carte ».
// La loupe de l'émotion du moment (chercher, v9, spec §4.4) cherche ici, parmi les mots de la carte.
import { FAMILLES, motPerso, estIdPerso } from './roue.js';
import { ZONES, motsDeLaCarte } from './carte-roue.js';
import { definition as definitionAffichee } from './definitions-roue.js';
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

// Un libellé est pris s'il est celui d'un autre mot de la carte : un des 144, ou un mot à soi qui y est (motsActifs).
// Comparaison sans accents ni casse, comme pour les listes.
function exigerLibre(perso, libelle, sauf) {
  const cible = normLabel(libelle);
  const pris = motsDeLaCarte(perso).some((m) => m.id !== sauf && normLabel(m.libelle) === cible);
  if (pris) throw new ErreurMot('LIBELLE_EXISTANT');
}

function exigerMot(perso, id) {
  const mot = motPerso(id, perso);
  if (!mot) throw new ErreurMot('INTROUVABLE');
  return mot;
}

// Les mots à soi de la carte, dans l'ordre de création : [{ id, libelle, zone, famille, definition, createdAt }]. Ce
// sont ceux de motsDeLaCarte, la seule règle : la loupe ne trouve que des mots qui ont leur case et leur énergie. Sont
// laissés de côté les mots mis de côté, ceux sans zone de la carte (un mot recréé à l'import n'en a pas : pour revenir,
// il lui en faut une) et les entrées illisibles (sans libellé, pas un objet, id mal formé).
export function motsActifs(perso) {
  const p = persoDe(perso);
  return motsDeLaCarte(p).filter((m) => m.perso).map(({ id, libelle, zone }) => {
    const mot = motPerso(id, p);
    return {
      id, libelle, zone, famille: CLES_FAMILLES.has(mot.famille) ? mot.famille : null,
      definition: definitionPropre(mot.definition), createdAt: mot.createdAt ?? null,
    };
  });
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

// Un mot mis de côté revient sur la carte et dans la recherche. Il lui faut une zone de la carte (un mot recréé à
// l'import n'en a pas : elle se choisit d'abord), et un nom qu'aucun mot de la carte n'a pris entre-temps.
export function remettreSurLaCarte(perso, id) {
  const p = persoDe(perso);
  const mot = exigerMot(p, id);
  zoneValide(mot.zone);
  exigerLibre(p, mot.libelle.trim(), id);
  return { ...p, [id]: { ...mot, archive: false } };
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

// Import (relecture finale) : la méta `motsPerso` d'un fichier, telle que l'app l'aurait écrite. Un fichier qui ne vient
// pas de Carnet peut tout y mettre ; creerMot, modifierMot et remettreSurLaCarte l'empêchent dans l'app. Sont gardées
// les entrées dont l'id est celui d'un mot à soi et le libellé un texte non vide (NFC, sans espaces autour, coupé à
// LIBELLE_MAX comme au clavier) ; une zone hors de la carte, une famille inconnue ou une définition qui n'est pas un
// texte deviennent null ; seul `true` met de côté. Enfin, un mot de la carte dont le nom est déjà pris (par un des 144,
// ou par un mot à soi de la carte créé avant lui, sans accents ni casse) est mis de côté : une seule bulle par nom.
// Les autres champs restent tels quels. Une entrée écartée n'emporte aucun relevé : recreerSiAbsent, ensuite, recrée
// le mot qu'un relevé cite encore.
export function normaliserPerso(perso) {
  const propres = Object.entries(persoDe(perso)).flatMap(([id, mot]) => {
    if (!estIdPerso(id) || !estObjet(mot) || typeof mot.libelle !== 'string') return [];
    const libelle = mot.libelle.normalize('NFC').trim().slice(0, LIBELLE_MAX).trim();
    if (!libelle) return [];
    return [[id, {
      ...mot, libelle, zone: ZONES.includes(mot.zone) ? mot.zone : null, famille: CLES_FAMILLES.has(mot.famille) ? mot.famille : null,
      definition: typeof mot.definition === 'string' ? definitionPropre(mot.definition) : null, archive: mot.archive === true,
    }]];
  });
  const sortie = Object.fromEntries(propres);
  // Les noms pris : d'abord les 144, puis les mots à soi de la carte, dans l'ordre de création (celui de motsDeLaCarte).
  const pris = new Set(motsDeLaCarte(null).map((m) => normLabel(m.libelle)));
  const actifs = propres.filter(([, mot]) => !mot.archive && mot.zone)
    .sort(([a, x], [b, y]) => String(x.createdAt || '').localeCompare(String(y.createdAt || '')) || a.localeCompare(b));
  for (const [id, mot] of actifs) {
    const nom = normLabel(mot.libelle);
    if (pris.has(nom)) sortie[id] = { ...mot, archive: true };
    else pris.add(nom);
  }
  return sortie;
}

// Import (point de vigilance 4) : un relevé cite un mot à soi que la sauvegarde ne connaît pas, ou plus lisible. Le mot
// est recréé mis de côté, « Mot sans libellé », sans zone ni famille, daté du fichier : le relevé n'est pas perdu. Rend
// perso tel quel pour tout autre id (mot de la roue, mot à soi connu, id inconnu d'une autre forme).
export function recreerSiAbsent(perso, id, horodatageFichier) {
  if (!estIdPerso(id) || motPerso(id, perso)) return perso;
  const mot = { libelle: MOT_SANS_LIBELLE, zone: null, famille: null, definition: null, archive: true, createdAt: horodatage(horodatageFichier) };
  return { ...persoDe(perso), [id]: mot };
}

// ---------- la loupe (v9, spec §4.4) ----------

// Le début d'une définition, dans la liste des résultats : coupé à un espace, avec « … », au-delà de EXTRAIT_MAX signes
// (les textes de Carnet tiennent en entier ; une longue définition d'un mot à soi est coupée).
export const EXTRAIT_MAX = 90;
function debut(texte) {
  if (!texte || texte.length <= EXTRAIT_MAX) return texte || null;
  const coupe = texte.slice(0, EXTRAIT_MAX);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > EXTRAIT_MAX / 2 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.]+$/, '')}…`;
}

// Les mots de la carte (les 144 et les mots à soi qui y sont : motsDeLaCarte, la seule règle) dont le nom ou la
// définition contient le texte cherché, sans accents ni casse (normLabel, comme les libellés des listes). Rend
// [{ id, libelle, zone, extrait }] : d'abord les mots dont le nom, ou un de ses mots, commence par le texte ; puis ceux
// dont le nom le contient ; puis ceux qui le contiennent dans leur définition ; chaque groupe dans l'ordre alphabétique.
// La définition est celle que la carte du bas affiche (la correction de l'utilisateur, sinon celle du mot à soi, sinon
// le texte de Carnet) ; `extrait` en est le début, null sans définition. Un texte vide ne trouve rien.
export function chercher(perso, texte, corrections) {
  const cible = normLabel(texte);
  if (!cible) return [];
  const p = persoDe(perso);
  const trouves = [];
  for (const m of motsDeLaCarte(p)) {
    const nom = normLabel(m.libelle);
    const def = definitionAffichee(m.id, corrections, p);
    let rang = null;
    if (nom.startsWith(cible) || nom.split(/[ '-]/).some((w) => w.startsWith(cible))) rang = 0;
    else if (nom.includes(cible)) rang = 1;
    else if (def && normLabel(def).includes(cible)) rang = 2;
    if (rang !== null) trouves.push({ rang, nom, resultat: { id: m.id, libelle: m.libelle, zone: m.zone, extrait: debut(def) } });
  }
  return trouves
    .sort((a, b) => a.rang - b.rang || a.nom.localeCompare(b.nom, 'fr') || a.resultat.id.localeCompare(b.resultat.id))
    .map((t) => t.resultat);
}

// Le nom qu'on pourrait ajouter depuis la loupe (« Ajouter mon mot « … » ») : le texte cherché, sans les espaces en
// trop, la première lettre en capitale comme les mots de la carte ; null s'il est vide ou si un mot de la carte porte
// déjà ce nom (sans accents ni casse : creerMot le refuserait).
export const LIBELLE_MAX = 40;
export function nomPropose(perso, texte) {
  const propre = String(texte ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, LIBELLE_MAX).trim();
  if (!propre) return null;
  const cible = normLabel(propre);
  if (motsDeLaCarte(persoDe(perso)).some((m) => normLabel(m.libelle) === cible)) return null;
  return propre.charAt(0).toLocaleUpperCase('fr') + propre.slice(1);
}
