// Normalisation et validation des enregistrements. Pur, partagé par l'UI, le repository
// et les imports. null est la seule façon de dire « non renseigné ».
import { estDateValide, estHeureValide } from './dates.js';
import { listeDe } from './listes-def.js';

const T = {
  date: { type: 'date' }, heure: { type: 'heure' }, texte: { type: 'texte' }, bool: { type: 'bool' },
  int: (min, max) => ({ type: 'int', min, max }), ref: (liste) => ({ type: 'ref', liste }),
  refs: (liste) => ({ type: 'refs', liste }), questions: { type: 'questions' },
};

// cles : champs techniques. saisis : champs que l'utilisateur renseigne.
export const SCHEMAS = {
  journal: {
    cles: { date: T.date },
    saisis: {
      lieu: T.ref('lieu'), sommeilRessenti: T.ref('sommeil'), humeur: T.int(1, 10), contactHumain: T.bool,
      sportMouvement: T.bool, explosions: T.int(0, 5), traitementPris: T.ref('traitementPris'), pointsPositifs: T.texte,
      heureCoucher: T.heure, heureLever: T.heure, reveilsNocturnes: T.int(0, 5), notes: T.texte,
    },
  },
  episodes: {
    cles: { id: { type: 'id' }, date: T.date },
    saisis: {
      heure: T.heure, situation: T.texte, emotion: T.ref('emotion'), intensite: T.int(1, 10),
      declencheur: T.ref('declencheur'), dessous: T.ref('dessous'), reaction: T.ref('reaction'), ceQuiAAide: T.texte,
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
  rdv: {
    cles: { id: { type: 'id' } },
    saisis: {
      date: T.date, heure: T.heure, professionnel: T.ref('professionnel'), questions: T.questions,
      compteRendu: T.texte, prochaineEtape: T.texte,
    },
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

function normaliserChamp(nom, def, v, origine, erreurs) {
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
    case 'int':
      if (!Number.isInteger(v) || v < def.min || v > def.max) { erreurs.push(`${nom} : entier de ${def.min} à ${def.max} attendu`); return null; }
      return v;
    case 'ref':
      if (typeof v !== 'string' || listeDe(v) !== def.liste) { erreurs.push(`${nom} : référence invalide`); return null; }
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
      for (const q of v) {
        if (!q || typeof q.texte !== 'string') { erreurs.push(`${nom} : question invalide`); return null; }
        const texte = q.texte.normalize('NFC').trim();
        if (texte) res.push({ texte, abordee: q.abordee === true });
      }
      return res.length ? res : null;
    }
    default:
      return v;
  }
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
      valeur[nom] = normaliserChamp(nom, def, src[nom], origine, erreurs);
      if (valeur[nom] === null && erreurs.length === avant) erreurs.push(`${nom} : absente`);
    }
  }
  for (const [nom, def] of Object.entries(schema.saisis)) valeur[nom] = normaliserChamp(nom, def, src[nom], origine, erreurs);
  for (const nom of CHAMPS_TECHNIQUES) if (typeof src[nom] === 'string') valeur[nom] = src[nom];
  const connus = new Set([...Object.keys(schema.cles), ...Object.keys(schema.saisis), ...CHAMPS_TECHNIQUES]);
  for (const nom of Object.keys(src)) if (!connus.has(nom)) avertissements.push(`${nom} : champ inconnu ignoré`);
  return { valeur, erreurs: [...new Set(erreurs)], avertissements };
}

export function valider(store, brut, options) {
  const res = normaliser(store, brut, options);
  if (res.erreurs.length) throw new ErreurValidation(res.erreurs);
  return res.valeur;
}

// Champs de contexte préremplis par l'app : seuls, ils ne suffisent pas à garder une fiche.
const CONTEXTE = { episodes: ['heure'] };

export function estVide(store, valeur) {
  const contexte = CONTEXTE[store] || [];
  return Object.keys(SCHEMAS[store].saisis).every((k) => contexte.includes(k) || valeur[k] === null || valeur[k] === undefined);
}

export function referencesDe(store, valeur) {
  const refs = [];
  for (const [nom, def] of Object.entries(SCHEMAS[store].saisis)) {
    if (def.type === 'ref' && valeur[nom]) refs.push(valeur[nom]);
    if (def.type === 'refs' && Array.isArray(valeur[nom])) refs.push(...valeur[nom]);
  }
  return refs;
}

// « Aucun » est exclusif : le choisir retire les autres, choisir un autre retire « Aucun ».
export function basculerMultiple(actuels, id, exclusifs) {
  const liste = Array.isArray(actuels) ? actuels : [];
  if (liste.includes(id)) { const r = liste.filter((x) => x !== id); return r.length ? r : null; }
  if (exclusifs.has(id)) return [id];
  return [...liste.filter((x) => !exclusifs.has(x)), id];
}
