// Normalisation et validation des enregistrements. Pur, partagé par l'UI, le repository
// et les imports. null est la seule façon de dire « non renseigné ».
import { estDateValide, estHeureValide } from './dates.js';
import { listeDe } from './listes-def.js';
import { estEmotion } from './roue.js';

const T = {
  date: { type: 'date' }, heure: { type: 'heure' }, texte: { type: 'texte' }, bool: { type: 'bool' },
  // true ou null : false veut dire « pas noté », donc null.
  vrai: { type: 'vrai' },
  int: (min, max) => ({ type: 'int', min, max }), ref: (liste) => ({ type: 'ref', liste }),
  refs: (liste) => ({ type: 'refs', liste }), questions: { type: 'questions' },
  // Objet de sous-champs (vide → null) et lignes d'objets (lignes vides retirées, aucune → null).
  // contexte : sous-champs remplis par l'app (le jour d'écriture), qui seuls ne gardent pas l'objet.
  objet: (champs, contexte = []) => ({ type: 'objet', champs, contexte }), lignes: (champs) => ({ type: 'lignes', champs }),
  // v7 : un identifiant de la roue des émotions (domain/roue.js), et une valeur prise dans une liste fixe.
  roue: { type: 'roue' }, choix: (valeurs) => ({ type: 'choix', valeurs }),
};

// Retour à froid sur un épisode (v4). Aucun champ obligatoire. Les clés sont FIGÉES une fois
// publiées (stockées et exportées) : on n'en renomme jamais une. jour : jour logique de la
// dernière écriture, posé par l'app, pour que l'export PSY reprenne un après coup tardif.
export const APRES_COUP = {
  jour: T.date,
  types: T.refs('typeExplosion'), fragilites: T.refs('fragilite'), signes: T.refs('signe'), signesTexte: T.texte,
  repereA: T.int(1, 10), pensees: T.texte, pieges: T.refs('piegePensee'), tropDe: T.refs('sourceSurcharge'),
  besoins: T.refs('besoin'), surLeMoment: T.refs('consequenceCourt'), plusTard: T.refs('consequenceLong'),
  autreFacon: T.texte, siJe: T.texte, alorsJe: T.texte, tensionApres: T.int(1, 10),
};
export const ACTIVITE = { type: T.ref('typeSport'), duree: T.ref('dureeSport') };
// Un contact de la journée (v5) : avec qui (plusieurs choix), comment c'était.
export const CONTACT = { avec: T.refs('contactAvec'), effet: T.ref('contactEffet') };

// D'où une séance a été lancée (v7) : l'onglet Bien-être, Moment difficile ou la carte « Pour récupérer, je… ».
export const ORIGINES_SEANCE = Object.freeze(['bien-etre', 'moment-difficile', 'ressourcer']);

// cles : champs techniques. saisis : champs que l'utilisateur renseigne.
export const SCHEMAS = {
  journal: {
    cles: { date: T.date },
    saisis: {
      lieu: T.ref('lieu'), sommeilRessenti: T.ref('sommeil'), humeur: T.int(1, 10), contactHumain: T.bool,
      sportMouvement: T.bool, explosions: T.int(0, 5), traitementPris: T.ref('traitementPris'), pointsPositifs: T.texte,
      heureCoucher: T.heure, heureLever: T.heure, reveilsNocturnes: T.int(0, 5), notes: T.texte,
      activites: T.lignes(ACTIVITE), contacts: T.lignes(CONTACT), pese: T.refs('pese'), recharge: T.refs('recharge'),
    },
  },
  episodes: {
    cles: { id: { type: 'id' }, date: T.date },
    saisis: {
      heure: T.heure, situation: T.texte, emotion: T.ref('emotion'), intensite: T.int(1, 10),
      declencheur: T.ref('declencheur'), dessous: T.ref('dessous'), reaction: T.ref('reaction'), ceQuiAAide: T.texte,
      apresCoup: T.objet(APRES_COUP, ['jour']),
    },
  },
  symptomes: {
    cles: { id: { type: 'id' }, date: T.date },
    saisis: { symptome: T.ref('symptome'), intensite: T.int(1, 10), duree: T.ref('duree'), contexte: T.texte, note: T.texte },
  },
  traitements: {
    cles: { id: { type: 'id' }, date: T.date },
    saisis: { changement: T.texte, effetsSecondaires: T.refs('effetSecondaire'), effetRessenti: T.ref('effetRessenti'), notes: T.texte },
  },
  // Humeur du moment (v4) : date calendaire réelle et heure, rattachées au jour par jourEvenement.
  // vers (v6) : relevé noté après coup, pour une heure passée. faisais : ce que je faisais.
  // emotion (v7) : une famille ou un mot de la roue, à la place de la note ; humeur reste pour les
  // anciens relevés et vaut null dans les nouveaux. Vide quand emotion, humeur, energie et faisais le
  // sont tous (spec v7 §4.3) : « vers » seul ne garde pas un relevé, des activités le gardent.
  humeurs: {
    cles: { id: { type: 'id' }, date: T.date, heure: T.heure },
    saisis: { emotion: T.roue, humeur: T.int(1, 10), energie: T.ref('energie'), vers: T.vrai, faisais: T.refs('activiteMoment') },
  },
  // Note du moment (v6) : comme l'humeur du moment, date calendaire réelle et heure.
  notes: {
    cles: { id: { type: 'id' }, date: T.date, heure: T.heure },
    saisis: { texte: T.texte },
  },
  rdv: {
    cles: { id: { type: 'id' } },
    saisis: {
      date: T.date, heure: T.heure, professionnel: T.ref('professionnel'), questions: T.questions,
      compteRendu: T.texte, prochaineEtape: T.texte,
    },
  },
  // Séance de Bien-être (v7) : une respiration ou un exercice mené au bout, ou arrêté après 60 s au moins.
  // Date calendaire réelle et heure, rattachées au jour par jourEvenement, comme l'humeur du moment.
  // exercice : `coherence` ou l'identifiant d'un exercice, posé par l'app, donc obligatoire (spec v7 §6.3) :
  // une séance sans exercice est refusée. origine : l'écran d'où elle a été lancée.
  seances: {
    cles: { id: { type: 'id' }, date: T.date, heure: T.heure, exercice: T.texte },
    saisis: { dureeS: T.int(0, 86400), origine: T.choix(ORIGINES_SEANCE) },
  },
};
export const STORES_SAISIE = Object.keys(SCHEMAS);
export const CHAMPS_TECHNIQUES = ['createdAt', 'updatedAt'];

// Maxima appliqués aux seuls imports de fichiers étrangers, jamais aux saisies ni aux sauvegardes de Carnet.
const SANS_PLAFOND = new Set(['app', 'sauvegarde']);
const MAX_IMPORT = { texte: 20000, heureBrute: 20 };

export class ErreurValidation extends Error {
  constructor(erreurs) { super(`Données invalides : ${erreurs.join(' ; ')}`); this.code = 'VALIDATION'; this.erreurs = erreurs; }
}

function vide(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}

// Magasins qu'un lien de question de rendez-vous peut viser (v6).
const STORES_LIEN = new Set(['episodes', 'symptomes', 'traitements']);

// Lien d'une question vers un élément : { store, id }, reconstruit. null si le lien n'est pas valide.
// L'existence de la cible n'est pas vérifiée.
function lienValide(l) {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return null;
  if (!STORES_LIEN.has(l.store) || typeof l.id !== 'string' || l.id.trim() === '') return null;
  return { store: l.store, id: l.id };
}

function normaliserChamp(nom, def, v, origine, erreurs, avertissements) {
  if (vide(v)) return null;
  switch (def.type) {
    case 'date':
      if (!estDateValide(v)) { erreurs.push(`${nom} : date invalide`); return null; }
      return v;
    case 'heure':
      if (estHeureValide(v)) return v;
      if (origine === 'import-numbers' && typeof v === 'string' && v.length <= MAX_IMPORT.heureBrute) return v.trim();
      erreurs.push(`${nom} : heure invalide`); return null;
    case 'texte': {
      if (typeof v !== 'string') { erreurs.push(`${nom} : texte attendu`); return null; }
      const t = v.normalize('NFC').trim();
      if (!SANS_PLAFOND.has(origine) && t.length > MAX_IMPORT.texte) { erreurs.push(`${nom} : texte trop long`); return null; }
      return t;
    }
    case 'bool':
      if (v === true || v === false) return v;
      erreurs.push(`${nom} : oui ou non attendu`); return null;
    case 'vrai':
      if (v === true) return true;
      if (v === false) return null;
      erreurs.push(`${nom} : vrai ou vide attendu`); return null;
    case 'int':
      if (!Number.isInteger(v) || v < def.min || v > def.max) { erreurs.push(`${nom} : entier de ${def.min} à ${def.max} attendu`); return null; }
      return v;
    case 'ref':
      if (typeof v !== 'string' || listeDe(v) !== def.liste) { erreurs.push(`${nom} : référence invalide`); return null; }
      return v;
    case 'roue':
      if (!estEmotion(v)) { erreurs.push(`${nom} : émotion inconnue`); return null; }
      return v;
    case 'choix':
      if (!def.valeurs.includes(v)) { erreurs.push(`${nom} : valeur inconnue`); return null; }
      return v;
    case 'refs': {
      if (!Array.isArray(v)) { erreurs.push(`${nom} : liste attendue`); return null; }
      const uniques = [...new Set(v)];
      if (uniques.some((x) => typeof x !== 'string' || listeDe(x) !== def.liste)) { erreurs.push(`${nom} : référence invalide`); return null; }
      return uniques;
    }
    case 'questions': {
      if (!Array.isArray(v)) { erreurs.push(`${nom} : liste attendue`); return null; }
      const res = [];
      for (const [i, q] of v.entries()) {
        if (!q || typeof q.texte !== 'string') { erreurs.push(`${nom} : question invalide`); return null; }
        const texte = q.texte.normalize('NFC').trim();
        if (!texte) continue;
        const question = { texte, abordee: q.abordee === true };
        // Un lien invalide est retiré sans rejeter la question.
        if (q.lien !== undefined && q.lien !== null) {
          const lien = lienValide(q.lien);
          if (lien) question.lien = lien;
          else avertissements.push(`${nom}[${i}].lien : lien invalide retiré`);
        }
        res.push(question);
      }
      return res.length ? res : null;
    }
    case 'objet': {
      if (typeof v !== 'object' || Array.isArray(v)) { erreurs.push(`${nom} : objet attendu`); return null; }
      const res = {};
      for (const [k, d] of Object.entries(def.champs)) res[k] = normaliserChamp(`${nom}.${k}`, d, v[k], origine, erreurs, avertissements);
      const contexte = def.contexte || [];
      return Object.entries(res).some(([k, x]) => x !== null && !contexte.includes(k)) ? res : null;
    }
    case 'lignes': {
      if (!Array.isArray(v)) { erreurs.push(`${nom} : liste attendue`); return null; }
      const res = [];
      v.forEach((ligne, i) => {
        if (!ligne || typeof ligne !== 'object') { erreurs.push(`${nom}[${i}] : ligne invalide`); return; }
        const l = {};
        for (const [k, d] of Object.entries(def.champs)) l[k] = normaliserChamp(`${nom}[${i}].${k}`, d, ligne[k], origine, erreurs, avertissements);
        if (Object.values(l).some((x) => x !== null)) res.push(l);
      });
      return res.length ? res : null;
    }
    default:
      return v;
  }
}

// Références de liste portées par un champ, y compris dans les objets et les lignes.
export function refsDuChamp(def, v) {
  if (v === null || v === undefined) return [];
  if (def.type === 'ref') return [v];
  if (def.type === 'refs') return Array.isArray(v) ? v : [];
  if (def.type === 'objet') return Object.entries(def.champs).flatMap(([k, d]) => refsDuChamp(d, v[k]));
  if (def.type === 'lignes') return (Array.isArray(v) ? v : []).flatMap((l) => Object.entries(def.champs).flatMap(([k, d]) => refsDuChamp(d, l && l[k])));
  return [];
}

// Rend { valeur, erreurs, avertissements }. Tous les champs du schéma sont présents dans valeur.
export function normaliser(store, brut, { origine = 'app' } = {}) {
  const schema = SCHEMAS[store];
  if (!schema) throw new Error(`Store inconnu : ${store}`);
  const erreurs = [];
  const avertissements = [];
  const valeur = {};
  const src = brut || {};
  for (const [nom, def] of Object.entries(schema.cles)) {
    if (def.type === 'id') {
      if (typeof src[nom] !== 'string' || !src[nom]) erreurs.push(`${nom} : identifiant manquant`);
      valeur[nom] = src[nom] ?? null;
    } else {
      const avant = erreurs.length;
      valeur[nom] = normaliserChamp(nom, def, src[nom], origine, erreurs, avertissements);
      if (valeur[nom] === null && erreurs.length === avant) erreurs.push(`${nom} : absente`);
    }
  }
  for (const [nom, def] of Object.entries(schema.saisis)) valeur[nom] = normaliserChamp(nom, def, src[nom], origine, erreurs, avertissements);
  for (const nom of CHAMPS_TECHNIQUES) if (typeof src[nom] === 'string') valeur[nom] = src[nom];
  const connus = new Set([...Object.keys(schema.cles), ...Object.keys(schema.saisis), ...CHAMPS_TECHNIQUES]);
  for (const nom of Object.keys(src)) if (!connus.has(nom)) avertissements.push(`${nom} : champ inconnu ignoré`);
  // Sous-champs inconnus d'un objet ou d'une ligne : signalés, comme au premier niveau.
  for (const [nom, def] of Object.entries(schema.saisis)) {
    const v = src[nom];
    const verifier = (o, chemin) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (!(k in def.champs)) avertissements.push(`${chemin}.${k} : champ inconnu ignoré`); };
    if (def.type === 'objet' && v && !Array.isArray(v)) verifier(v, nom);
    if (def.type === 'lignes' && Array.isArray(v)) v.forEach((l, i) => verifier(l, `${nom}[${i}]`));
  }
  return { valeur, erreurs: [...new Set(erreurs)], avertissements };
}

export function valider(store, brut, options) {
  const res = normaliser(store, brut, options);
  if (res.erreurs.length) throw new ErreurValidation(res.erreurs);
  return res.valeur;
}

// Champs de contexte préremplis par l'app : seuls, ils ne suffisent pas à garder une fiche.
// v7 : « Ce que je faisais » n'en est plus un (spec §4.3), seul « vers » le reste pour les relevés.
const CONTEXTE = { episodes: ['heure'], humeurs: ['vers'] };

export function estVide(store, valeur) {
  const contexte = CONTEXTE[store] || [];
  return Object.keys(SCHEMAS[store].saisis).every((k) => contexte.includes(k) || valeur[k] === null || valeur[k] === undefined);
}

export function referencesDe(store, valeur) {
  return Object.entries(SCHEMAS[store].saisis).flatMap(([nom, def]) => refsDuChamp(def, valeur[nom]));
}

// « Aucun » est exclusif : le choisir retire les autres, choisir un autre retire « Aucun ».
export function basculerMultiple(actuels, id, exclusifs) {
  const liste = Array.isArray(actuels) ? actuels : [];
  if (liste.includes(id)) { const r = liste.filter((x) => x !== id); return r.length ? r : null; }
  if (exclusifs.has(id)) return [id];
  return [...liste.filter((x) => !exclusifs.has(x)), id];
}
