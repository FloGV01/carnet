// Sauvegarde et restauration. Export : une photographie cohérente (une seule transaction),
// en .json s'il n'y a aucun mémo, sinon en .zip (sauvegarde.json + audios/<id>.m4a),
// découpé en parties au-delà de 150 Mo. Import : remplacement uniquement, jamais de fusion,
// précédé d'une copie de secours et appliqué en une seule transaction.
import { req } from './idb.js';
import { DB_VERSION, MAX_SNAPSHOTS } from './migrations.js';
import { DataError } from './erreurs.js';
import { creerZip, lireZip } from './zip.js';
import { normaliser, SCHEMAS, refsDuChamp } from '../domain/champs.js';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, seedItems } from '../domain/vocabulaire.js';
import { estListe, listeDe } from '../domain/listes-def.js';
import { SANS_LIBELLE } from '../domain/libelles.js';
import { versContacts } from '../domain/contacts.js';

export const FORMAT = 'carnet-sauvegarde';
export const FORMAT_VERSION = 4;
export const SEUIL_PARTIE_OCTETS = 150 * 1024 * 1024;
const STORES_DONNEES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'notes', 'listes', 'meta', 'audios'];
// Clés techniques : jamais exportées, jamais remplacées par un import ni par « Revenir ».
const META_NON_EXPORTEES = new Set(['schema', 'installation', 'derniereEcriture', 'derniereSauvegarde']);
// Gardée telle quelle si le fichier (ou la copie) ne l'a pas : date de la mise à jour v4,
// à partir de laquelle un compteur d'explosions vide vaut 0 (domain/explosions.js).
const META_GARDEES_SI_ABSENTES = new Set(['explosionsDepuis']);
// Les autres clés (Mon plan, Ma journée, traitement actuel, réglages…) sont celles de l'utilisateur :
// le fichier les remplace toutes, et une clé absente du fichier est retirée.
const estMetaUtilisateur = (cle) => !META_NON_EXPORTEES.has(cle) && !META_GARDEES_SI_ABSENTES.has(cle);

// Aperçu : clés de l'utilisateur présentes ici que l'import retirerait ou changerait.
export function metaRemplacee(actuelles, duFichier) {
  const fichier = new Map((duFichier || []).filter((m) => m && typeof m.cle === 'string').map((m) => [m.cle, JSON.stringify(m.valeur)]));
  return (actuelles || []).filter((m) => estMetaUtilisateur(m.cle) && m.valeur != null && fichier.get(m.cle) !== JSON.stringify(m.valeur)).map((m) => m.cle);
}

// Dans la même transaction : la méta de l'utilisateur devient exactement celle de `source`.
function remplacerMeta(store, actuelles, source) {
  const gardees = new Set((source || []).map((m) => m.cle));
  for (const m of actuelles || []) if (estMetaUtilisateur(m.cle) && !gardees.has(m.cle)) store.delete(m.cle);
  for (const m of source || []) if (m && typeof m.cle === 'string' && !META_NON_EXPORTEES.has(m.cle)) store.put(m);
}
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');
const pad = (n) => String(n).padStart(2, '0');

function extension(mime) {
  if (/mp4|aac|m4a/.test(mime || '')) return 'm4a';
  if (/webm/.test(mime || '')) return 'webm';
  if (/wav/.test(mime || '')) return 'wav';
  return 'bin';
}

export function nomFichier(date, { partie, total, zip }) {
  const base = `carnet-sauvegarde-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${base}${total > 1 ? `-partie-${partie}-sur-${total}` : ''}.${zip ? 'zip' : 'json'}`;
}

// Lecture de tout, dans une seule transaction.
export async function lireTout(repo) {
  return repo.tx(STORES_DONNEES, 'readonly', async (t) => {
    const res = {};
    for (const s of STORES_DONNEES) res[s] = await req(t.objectStore(s).getAll());
    return res;
  });
}

// Pur : construit le contenu des fichiers à partir des données lues.
export function construireSauvegarde(donnees, { maintenant, versionApp, seuil = SEUIL_PARTIE_OCTETS }) {
  const audios = [...(donnees.audios || [])].sort((a, b) => `${a.date}${a.createdAt}`.localeCompare(`${b.date}${b.createdAt}`));
  const metaAudios = audios.map(({ data, ...m }) => ({ ...m, fichier: `audios/${m.id}.${extension(m.mime)}` }));
  const data = {
    journal: donnees.journal || [], episodes: donnees.episodes || [], symptomes: donnees.symptomes || [],
    traitements: donnees.traitements || [], rdv: donnees.rdv || [], humeurs: donnees.humeurs || [], notes: donnees.notes || [],
    listes: donnees.listes || [],
    meta: (donnees.meta || []).filter((m) => !META_NON_EXPORTEES.has(m.cle)),
    audios: metaAudios,
  };
  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]));
  const entete = { format: FORMAT, formatVersion: FORMAT_VERSION, schemaVersion: DB_VERSION, exportedAt: maintenant.toISOString(), app: { version: versionApp }, counts };

  if (audios.length === 0) {
    const texte = JSON.stringify({ ...entete, data }, null, 1);
    return [{ nom: nomFichier(maintenant, { total: 1 }), type: 'application/json', morceaux: [enc.encode(texte)], taille: enc.encode(texte).length }];
  }
  // Répartition des audios par ordre de date, chaque partie sous le seuil.
  const tranches = [[]];
  let taille = 0;
  for (const a of audios) {
    const n = a.data.byteLength;
    if (taille > 0 && taille + n > seuil) { tranches.push([]); taille = 0; }
    tranches[tranches.length - 1].push(a);
    taille += n;
  }
  return tranches.map((tranche, i) => {
    const json = JSON.stringify({ ...entete, partie: { numero: i + 1, total: tranches.length }, data }, null, 1);
    const entrees = [{ nom: 'sauvegarde.json', donnees: enc.encode(json) },
      ...tranche.map((a) => ({ nom: `audios/${a.id}.${extension(a.mime)}`, donnees: new Uint8Array(a.data) }))];
    const zip = creerZip(entrees, { date: maintenant });
    return { nom: nomFichier(maintenant, { partie: i + 1, total: tranches.length, zip: true }), type: 'application/zip', morceaux: zip.morceaux, taille: zip.taille };
  });
}

export async function exporter(repo, { versionApp }) {
  const donnees = await lireTout(repo);
  return construireSauvegarde(donnees, { maintenant: repo.maintenant(), versionApp });
}

// ---------- import ----------

const MESSAGES = {
  ILLISIBLE: 'Ce fichier est illisible.',
  FORMAT: 'Ce fichier ne ressemble pas à une sauvegarde de Carnet.',
  FUTUR: 'Ce fichier vient d\'une version plus récente de Carnet.',
  TRONQUE: 'Ce fichier semble tronqué ou abîmé.',
};

function lireJson(octets) {
  try { return JSON.parse(dec.decode(octets)); } catch { throw new DataError('BACKUP_FORMAT', MESSAGES.ILLISIBLE); }
}
const estZip = (o) => o.length > 4 && o[0] === 0x50 && o[1] === 0x4b && o[2] === 0x03 && o[3] === 0x04;

// Éléments d'un ensemble de listes par défaut absents de `items` : jamais d'écrasement.
function absentes(seed, items, horodatage) {
  const ids = new Set((Array.isArray(items) ? items : []).map((i) => i && i.id));
  return seedItems(seed, horodatage).filter((i) => !ids.has(i.id));
}
// Listes par défaut ajoutées depuis la première version (v4 puis v6) et absentes d'un ensemble.
export function listesManquantes(items, horodatage) {
  return [...absentes(SEED_V2_AJOUTS, items, horodatage), ...absentes(SEED_V4_AJOUTS, items, horodatage)];
}

// Ajoute à une sauvegarde les listes par défaut d'une version qu'elle n'a pas. Les comptes annoncés
// restent vérifiés : on ajoute seulement ce qu'on vient d'ajouter. Des listes illisibles (pas un
// tableau) restent telles quelles : le contrôle des comptes les refuse.
function ajouterListes(seed, data, counts, horodatage) {
  if (!Array.isArray(data.listes)) return;
  const ajouts = absentes(seed, data.listes, horodatage);
  data.listes = [...data.listes, ...ajouts];
  if (Number.isInteger(counts.listes)) counts.listes += ajouts.length;
}

// Méta de Ma journée : le champ Humeur du soir rejoint les champs masqués, s'ils sont réglés.
function masquerHumeur(m) {
  const masques = m && m.cle === 'journee' && m.valeur && m.valeur.masques;
  if (!Array.isArray(masques) || masques.includes('humeur')) return m;
  return { ...m, valeur: { ...m.valeur, masques: [...masques, 'humeur'] } };
}

// Mises à niveau successives d'une sauvegarde ancienne (v1 -> v2 -> …). Pures.
export const MISES_A_NIVEAU = {
  // v1 -> v2 : humeurs du moment (aucune) et nouvelles listes par défaut.
  1(s) {
    const data = { ...(s.data || {}), humeurs: [] };
    const counts = { ...(s.counts || {}), humeurs: 0 };
    ajouterListes(SEED_V2_AJOUTS, data, counts, s.exportedAt);
    return { ...s, formatVersion: 2, counts, data };
  },
  // v2 -> v3 : plusieurs contacts par jour ; le détail v4 du jour devient une ligne, tel quel.
  2(s) {
    const data = { ...(s.data || {}) };
    if (Array.isArray(data.journal)) data.journal = data.journal.map(versContacts);
    return { ...s, formatVersion: 3, data };
  },
  // v3 -> v4 : notes (aucune), nouvelles listes par défaut, et le champ Humeur du soir rejoint les
  // champs masqués déjà réglés, comme le fait la migration 4 de la base.
  3(s) {
    const data = { ...(s.data || {}), notes: [] };
    const counts = { ...(s.counts || {}), notes: 0 };
    ajouterListes(SEED_V4_AJOUTS, data, counts, s.exportedAt);
    if (Array.isArray(data.meta)) data.meta = data.meta.map(masquerHumeur);
    return { ...s, formatVersion: 4, counts, data };
  },
};
export function mettreANiveauSauvegarde(s) {
  let courant = s;
  for (let v = courant.formatVersion; v < FORMAT_VERSION; v++) courant = MISES_A_NIVEAU[v](courant);
  return courant;
}

// fichiers : [{ nom, octets: Uint8Array }]. Rend l'analyse complète, sans rien écrire.
export function analyserFichiers(fichiers) {
  let principal = null;
  const audiosDispo = new Map();
  for (const f of fichiers) {
    let json;
    if (estZip(f.octets)) {
      let entrees;
      try { entrees = lireZip(f.octets); } catch { throw new DataError('BACKUP_INCOMPLET', MESSAGES.TRONQUE); }
      const js = entrees.find((e) => e.nom === 'sauvegarde.json');
      if (!js) throw new DataError('BACKUP_FORMAT', MESSAGES.FORMAT);
      json = lireJson(js.donnees);
      for (const e of entrees) if (e.nom.startsWith('audios/')) audiosDispo.set(e.nom, e.donnees);
    } else {
      json = lireJson(f.octets);
    }
    if (!json || json.format !== FORMAT) throw new DataError('BACKUP_FORMAT', MESSAGES.FORMAT);
    if (!Number.isInteger(json.formatVersion) || json.formatVersion > FORMAT_VERSION) throw new DataError('BACKUP_VERSION_FUTURE', MESSAGES.FUTUR);
    if (!principal || (json.exportedAt || '') > (principal.exportedAt || '')) principal = json;
  }
  if (!principal) throw new DataError('BACKUP_FORMAT', MESSAGES.FORMAT);
  const s = mettreANiveauSauvegarde(principal);
  const data = s.data || {};
  for (const [k, n] of Object.entries(s.counts || {})) {
    if (!Array.isArray(data[k]) || data[k].length !== n) throw new DataError('BACKUP_INCOMPLET', MESSAGES.TRONQUE);
  }

  const erreurs = [];
  const valides = {};
  const listes = (data.listes || []).filter((it) => it && typeof it.id === 'string' && estListe(it.liste) && typeof it.libelle === 'string');
  const idsListes = new Set(listes.map((i) => i.id));
  const ajoutsListes = [];
  for (const store of Object.keys(SCHEMAS)) {
    valides[store] = [];
    (data[store] || []).forEach((brut, i) => {
      const { valeur, erreurs: errs } = normaliser(store, brut, { origine: 'sauvegarde' });
      if (errs.length) { erreurs.push(`${store} n° ${i + 1} : ${errs.join(', ')}`); return; }
      for (const [champ, def] of Object.entries(SCHEMAS[store].saisis)) {
        for (const id of refsDuChamp(def, valeur[champ])) {
          if (id && !idsListes.has(id)) {
            idsListes.add(id);
            ajoutsListes.push({ id, liste: listeDe(id), libelle: `${SANS_LIBELLE} (${id})`, ordre: 9990, archive: true, alias: [],
              exclusif: false, horsClassement: false, agreable: false, origine: 'import', createdAt: s.exportedAt, updatedAt: s.exportedAt });
          }
        }
      }
      valides[store].push({ ...valeur, createdAt: brut.createdAt || s.exportedAt, updatedAt: brut.updatedAt || s.exportedAt });
    });
  }
  const audios = [];
  let manquants = 0;
  const PARENTS = new Set(['journal', 'episodes', 'symptomes', 'traitements', 'rdv']);
  for (const a of data.audios || []) {
    if (!a || typeof a.id !== 'string' || !PARENTS.has(a.parentStore) || typeof a.parentId !== 'string') { erreurs.push('mémo vocal illisible'); continue; }
    const octets = audiosDispo.get(a.fichier);
    if (!octets) { manquants += 1; continue; }
    const { fichier, ...meta } = a;
    audios.push({ ...meta, data: octets.slice().buffer });
  }
  const dates = valides.journal.map((j) => j.date).concat(valides.episodes.map((e) => e.date)).sort();
  return {
    sauvegarde: s,
    valides: { ...valides, listes: [...listes, ...ajoutsListes], meta: (data.meta || []).filter((m) => m && typeof m.cle === 'string' && !META_NON_EXPORTEES.has(m.cle)), audios },
    erreurs,
    manquants,
    resume: {
      journees: valides.journal.length, episodes: valides.episodes.length, symptomes: valides.symptomes.length,
      traitements: valides.traitements.length, rdv: valides.rdv.length, humeurs: valides.humeurs.length, notes: valides.notes.length,
      memos: audios.length,
      du: dates[0] || null, au: dates[dates.length - 1] || null, exportedAt: s.exportedAt,
    },
  };
}

// Ce que l'import effacerait : éléments présents ici et absents du fichier.
export function chiffrerPerte(actuel, analyse) {
  const cle = { journal: 'date', episodes: 'id', symptomes: 'id', traitements: 'id', rdv: 'id', humeurs: 'id', notes: 'id', audios: 'id' };
  const res = {};
  for (const [store, k] of Object.entries(cle)) {
    const dansFichier = new Set((analyse.valides[store] || []).map((x) => x[k]));
    res[store] = (actuel[store] || []).filter((x) => !dansFichier.has(x[k])).length;
  }
  return res;
}

async function prendreCopie(t, type, horodatage, donnees) {
  const snaps = t.objectStore('snapshots');
  const existants = (await req(snaps.getAll())).filter((s) => s.type === type).sort((a, b) => a.date.localeCompare(b.date));
  while (existants.length >= MAX_SNAPSHOTS) snaps.delete(existants.shift().id);
  const { audios, ...sansAudios } = donnees;
  snaps.put({ id: `${type}-${horodatage}`, type, date: horodatage, schemaVersion: DB_VERSION, data: sansAudios });
}

const STORES_REMPLACES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'notes', 'listes', 'audios'];

// Remplacement complet, en une seule transaction (copie de secours comprise).
export async function remplacer(repo, analyse, { panne } = {}) {
  const h = repo.maintenant().toISOString();
  const actuel = await lireTout(repo);
  const v = analyse.valides;
  await repo.tx([...STORES_DONNEES, 'snapshots'], 'readwrite', async (t) => {
    await prendreCopie(t, 'avant-import', h, actuel);
    for (const s of STORES_REMPLACES) t.objectStore(s).clear();
    const meta = t.objectStore('meta');
    remplacerMeta(meta, actuel.meta, v.meta);
    for (const s of STORES_REMPLACES) {
      for (const x of v[s] || []) t.objectStore(s).put(x);
      if (panne === s) throw new Error('panne simulée');
    }
    meta.put({ cle: 'derniereEcriture', valeur: h });
  });
  return { ok: true };
}

export async function copieAvantImport(repo) {
  return repo.tx(['snapshots'], 'readonly', async (t) => {
    const s = (await req(t.objectStore('snapshots').getAll())).filter((x) => x.type === 'avant-import').sort((a, b) => b.date.localeCompare(a.date));
    return s[0] || null;
  });
}

// Revient à la dernière copie « avant-import » ; l'état actuel est lui-même copié avant.
export async function revenirAvantImport(repo) {
  const copie = await copieAvantImport(repo);
  if (!copie) throw new DataError('INTROUVABLE', 'Aucune copie à restaurer.');
  const h = repo.maintenant().toISOString();
  const actuel = await lireTout(repo);
  await repo.tx([...STORES_DONNEES, 'snapshots'], 'readwrite', async (t) => {
    await prendreCopie(t, 'avant-retour', h, actuel);
    for (const s of ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'listes', 'humeurs', 'notes']) {
      // Une copie prise avant la v4 n'a pas d'humeurs du moment, une copie prise avant la v6 n'a
      // pas de notes : on les laisse telles quelles.
      if ((s === 'humeurs' || s === 'notes') && !Array.isArray(copie.data[s])) continue;
      t.objectStore(s).clear();
      // Une copie prise avant la v5 a encore un seul détail de contact par jour.
      for (const x of copie.data[s] || []) t.objectStore(s).put(s === 'journal' ? versContacts(x) : x);
    }
    for (const it of listesManquantes(copie.data.listes, h)) t.objectStore('listes').put(it);
    // Une copie de la v3 et d'avant n'a pas forcément de méta : on ne touche alors à rien. Dans
    // une copie prise avant la v6 (base en version 3 ou moins), le champ Humeur du soir rejoint
    // les champs masqués, comme le fait la migration 4.
    if (Array.isArray(copie.data.meta)) {
      const meta = (copie.schemaVersion ?? 0) < 4 ? copie.data.meta.map(masquerHumeur) : copie.data.meta;
      remplacerMeta(t.objectStore('meta'), actuel.meta, meta);
    }
    // Les mémos dont la fiche n'existe plus après le retour sont retirés.
    const parents = {
      journal: new Set((copie.data.journal || []).map((x) => x.date)),
      episodes: new Set((copie.data.episodes || []).map((x) => x.id)),
      symptomes: new Set((copie.data.symptomes || []).map((x) => x.id)),
      traitements: new Set((copie.data.traitements || []).map((x) => x.id)),
      rdv: new Set((copie.data.rdv || []).map((x) => x.id)),
    };
    for (const a of actuel.audios) if (!parents[a.parentStore] || !parents[a.parentStore].has(a.parentId)) t.objectStore('audios').delete(a.id);
    t.objectStore('snapshots').delete(copie.id);
    t.objectStore('meta').put({ cle: 'derniereEcriture', valeur: h });
  });
}

// Tout effacer : données et copies de secours ; les listes par défaut sont recréées. La date
// d'installation et celle de la v4 (explosionsDepuis, domain/explosions.js) sont gardées.
export async function toutEffacer(repo) {
  const h = repo.maintenant().toISOString();
  const aujourdhui = repo.aujourdhui();
  await repo.tx([...STORES_DONNEES, 'snapshots'], 'readwrite', async (t) => {
    const installation = await req(t.objectStore('meta').get('installation'));
    const depuis = await req(t.objectStore('meta').get('explosionsDepuis'));
    for (const s of [...STORES_DONNEES, 'snapshots']) t.objectStore(s).clear();
    for (const it of [...seedItems(SEED_V1, h), ...seedItems(SEED_V2_AJOUTS, h), ...seedItems(SEED_V4_AJOUTS, h)]) t.objectStore('listes').put(it);
    const meta = t.objectStore('meta');
    meta.put({ cle: 'schema', valeur: DB_VERSION });
    meta.put(installation || { cle: 'installation', valeur: h });
    meta.put(depuis || { cle: 'explosionsDepuis', valeur: aujourdhui });
    meta.put({ cle: 'derniereEcriture', valeur: h });
  });
}

export function resumerTaille(donnees) {
  const audios = (donnees.audios || []).reduce((n, a) => n + (a.taille || (a.data && a.data.byteLength) || 0), 0);
  return { audios, nbAudios: (donnees.audios || []).length };
}
