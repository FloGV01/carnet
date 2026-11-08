// Sauvegardes témoins aux formats 1 à 7 (tests/fixtures/temoins/), écrites par le code même des
// versions publiées. Chaque tag est extrait avec git worktree dans un dossier temporaire hors du
// dépôt, retiré à la fin même en cas d'erreur. Sa base (fake-indexeddb) est remplie de données
// inventées par son creerRepository, puis exportée par son construireSauvegarde.
// Sortie identique à chaque passage : horloge, tirages et fuseau fixes. Un témoin incomplet est
// refusé et rien n'est écrit. Avec --verifier : compare aux fichiers présents, sans rien écrire.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { concatener, lireZip } from '../public/js/db/zip.js';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = join(racine, 'tests', 'fixtures', 'temoins');
const VERSIONS = [
  { tag: 'v3.0.0', format: 1, json: 'format-1.json', exporteLe: '2026-10-01T19:30:00.000Z' },
  { tag: 'v4.0.0', format: 2, json: 'format-2.json', exporteLe: '2026-10-05T19:30:00.000Z' },
  { tag: 'v5.0.0', format: 3, json: 'format-3.json', exporteLe: '2026-10-06T19:30:00.000Z', zip: 'format-3-memo.zip', zipLe: '2026-10-06T19:45:00.000Z' },
  { tag: 'v6.1.0', format: 4, json: 'format-4.json', exporteLe: '2026-10-19T19:30:00.000Z' },
  { tag: 'v7.0.0', format: 5, json: 'format-5.json', exporteLe: '2026-10-23T19:30:00.000Z' },
  { tag: 'v8.0.0', format: 6, json: 'format-6.json', exporteLe: '2026-10-26T19:30:00.000Z' },
  { tag: 'v10.0.0', format: 7, json: 'format-7.json', exporteLe: '2026-11-04T19:30:00.000Z' },
];
const dec = new TextDecoder();

// ---------- contrôle ----------

const estZip = (o) => o.length > 4 && o[0] === 0x50 && o[1] === 0x4b && o[2] === 0x03 && o[3] === 0x04;
const plein = (v) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);

// Chemins des champs jamais remplis (sous-champs des objets et des lignes compris si profond).
function jamaisRemplis(enregistrements, profond) {
  const rempli = new Map();
  const voir = (o, prefixe) => {
    for (const [k, v] of Object.entries(o)) {
      const chemin = `${prefixe}${k}`;
      rempli.set(chemin, rempli.get(chemin) || plein(v));
      if (!profond || !plein(v) || typeof v !== 'object') continue;
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x === 'object') voir(x, `${chemin}[].`); } else voir(v, `${chemin}.`);
    }
  };
  for (const e of enregistrements) voir(e, '');
  return [...rempli].filter(([, ok]) => !ok).map(([chemin]) => chemin);
}

// Références de liste portées par les fiches (« liste:slug », à toute profondeur).
function references(data, noms) {
  const refs = new Set();
  const voir = (v) => {
    if (typeof v === 'string') { const m = /^([A-Za-z]+):[\w-]+$/.exec(v); if (m && noms.has(m[1])) refs.add(v); } else if (v && typeof v === 'object') Object.values(v).forEach(voir);
  };
  for (const s of ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'seances']) (data[s] || []).forEach(voir);
  return refs;
}

const sansSaisie = (j) => Object.entries(j).every(([k, v]) => ['date', 'createdAt', 'updatedAt'].includes(k) || v === null);

// Rend la sauvegarde lue ; lève une erreur qui liste tout ce qui manque au témoin.
export function controlerTemoin(octets) {
  const zip = estZip(octets);
  const entrees = zip ? lireZip(octets) : [];
  const s = JSON.parse(dec.decode(zip ? entrees.find((e) => e.nom === 'sauvegarde.json').donnees : octets));
  const d = s.data || {};
  const f = s.formatVersion;
  const manques = [];
  const exiger = (ok, quoi) => { if (!ok) manques.push(quoi); };

  // Chaque store, et chaque champ non nul au moins une fois.
  const stores = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'listes', 'meta', ...(f >= 2 ? ['humeurs'] : []), ...(f >= 4 ? ['notes'] : []),
    ...(f >= 5 ? ['seances'] : []), ...(zip ? ['audios'] : [])];
  for (const st of stores) {
    exiger((d[st] || []).length > 0, `${st} : aucun enregistrement`);
    for (const chemin of jamaisRemplis(d[st] || [], !['listes', 'meta'].includes(st))) manques.push(`${st}.${chemin} : jamais rempli`);
  }

  const listes = d.listes || [];
  const ids = new Set(listes.map((i) => i.id));
  const refs = references(d, new Set(listes.map((i) => i.liste)));
  const utilise = (i) => refs.has(i.id);
  exiger(listes.some((i) => i.liste === 'lieu' && i.alias.length > 0 && utilise(i)), 'un lieu renommé (alias gardé), utilisé');
  exiger(listes.some((i) => i.liste === 'lieu' && i.archive && utilise(i)), 'un lieu archivé encore utilisé');
  exiger(listes.some((i) => i.origine === 'utilisateur' && utilise(i)), 'un élément créé par l\'utilisateur, utilisé');
  exiger([...refs].some((r) => !ids.has(r)), 'un id inconnu');
  exiger((d.episodes || []).some((e) => e.heure === '02:30'), 'un épisode à 02:30');
  if (f >= 2) exiger((d.humeurs || []).some((h) => h.heure === '01:30'), 'une humeur à 01:30');
  exiger((d.rdv || []).some((r) => r.date === null), 'un rendez-vous sans date');
  // Formats 2 et 3 : le champ Humeur du soir n'est pas encore masqué (la mise à niveau 3 → 4 le masque).
  // Format 4 : la v6 l'a déjà masqué.
  // Format 6 : la v8 a aussi masqué « Nuit en détail » (migration 6 de la base).
  if (f >= 2) {
    const journee = (d.meta || []).find((m) => m.cle === 'journee');
    const masques = journee && Array.isArray(journee.valeur.masques) ? journee.valeur.masques : null;
    if (f <= 3) exiger(masques && !masques.includes('humeur'), 'meta.journee sans « humeur » dans ses masques');
    else exiger(masques && masques.includes('humeur'), 'meta.journee avec « humeur » dans ses masques');
    if (f >= 6) exiger(masques && masques.includes('nuit'), 'meta.journee avec « nuit » dans ses masques');
  }
  if (f >= 4) {
    exiger((d.notes || []).some((n) => n.heure === '01:30'), 'une note à 01:30');
    exiger((d.humeurs || []).some((h) => h.vers === true && Array.isArray(h.faisais) && h.faisais.length > 0), 'une humeur « vers » avec ce que je faisais');
    exiger((d.rdv || []).some((r) => (r.questions || []).some((q) => q.lien && (d.episodes || []).some((e) => e.id === q.lien.id))), 'une question liée à un épisode');
    exiger(['respiration', 'uneChoseALaFois', 'ressourcer'].every((cle) => (d.meta || []).some((m) => m.cle === cle)), 'les réglages de la v6 (respiration, une chose à la fois, me ressourcer)');
  }
  // Format 5 (v7) : émotions de la roue à côté des anciennes notes de 1 à 10, et séances de Bien-être. Une
  // nuit y garde son coucher et son lever, sans nombre d'heures (point de vigilance 1 de la v8).
  if (f >= 5) {
    const emotion = (h, n) => typeof h.emotion === 'string' && h.emotion.split(':').length === n;
    exiger((d.humeurs || []).some((h) => emotion(h, 3)), 'un relevé avec un mot de la roue');
    exiger((d.humeurs || []).some((h) => emotion(h, 2)), 'un relevé avec une famille seule');
    exiger((d.humeurs || []).some((h) => h.emotion === null && Number.isInteger(h.humeur)), 'un ancien relevé noté de 1 à 10, sans émotion');
    exiger((d.seances || []).some((x) => x.heure === '01:30'), 'une séance à 01:30');
    exiger(['bien-etre', 'moment-difficile', 'ressourcer'].every((o) => (d.seances || []).some((x) => x.origine === o)), 'une séance de chaque origine');
    exiger((d.seances || []).some((x) => x.exercice !== 'coherence'), 'une séance d\'un exercice');
    exiger((d.journal || []).some((j) => j.heureCoucher && j.heureLever), 'une nuit avec coucher et lever');
  }
  // Format 6 (v8) : une séance « Faite » du Programme, des définitions corrigées, les sujets d'un rendez-vous, et deux
  // relevés que la v9 lit autrement (point de vigilance 1 de la v9) : une énergie seule, sans mot, et Accablé, qui passe
  // du bleu au rouge.
  if (f >= 6) {
    exiger((d.seances || []).some((x) => x.fin === true && typeof x.programme === 'string'), 'une séance « Faite » du Programme');
    exiger((d.meta || []).some((m) => m.cle === 'definitionsRoue' && m.valeur && Object.keys(m.valeur).length > 0), 'des définitions des émotions corrigées');
    exiger(listes.some((i) => i.liste === 'sujetRdv'), 'les sujets d\'un rendez-vous');
    exiger((d.humeurs || []).some((h) => h.emotion === null && h.humeur === null && typeof h.energie === 'string'), 'un relevé à énergie seule');
    exiger((d.humeurs || []).some((h) => h.emotion === 'roue:peur:accable'), 'un relevé Accablé');
  }
  // Format 7 (v9 et v10) : un mot à soi et un relevé qui le cite, un mot sans famille, une séance du minuteur, des
  // exercices épinglés et la voix des consignes.
  if (f >= 7) {
    const meta = (cle) => ((d.meta || []).find((m) => m.cle === cle) || {}).valeur;
    const perso = meta('motsPerso');
    const mots = perso && typeof perso === 'object' ? Object.keys(perso).filter((id) => id.startsWith('roue:perso:u-')) : [];
    exiger(mots.length > 0, 'un mot à soi (méta motsPerso)');
    exiger((d.humeurs || []).some((h) => mots.includes(h.emotion)), 'un relevé qui cite un mot à soi');
    exiger((d.humeurs || []).some((h) => typeof h.emotion === 'string' && h.emotion.startsWith('roue:aucune:')), 'un relevé avec un mot sans famille');
    exiger((d.seances || []).some((x) => x.exercice === 'minuteur'), 'une séance du minuteur');
    exiger(Array.isArray(meta('favorisBienEtre')) && meta('favorisBienEtre').length > 0, 'des exercices épinglés (favorisBienEtre)');
    exiger((meta('respiration') || {}).voix === true, 'la voix des consignes (respiration.voix)');
  }
  if (zip) {
    const noms = new Set(entrees.map((e) => e.nom));
    const audios = d.audios || [];
    exiger(audios.every((a) => noms.has(a.fichier)), 'chaque mémo présent dans le zip');
    exiger(audios.some((a) => a.parentStore === 'journal' && (d.journal || []).some((j) => j.date === a.parentId && sansSaisie(j))), 'un mémo sur un jour sans autre saisie');
    exiger(audios.some((a) => a.parentStore === 'episodes'), 'un mémo sur un épisode');
  }
  if (manques.length) throw new Error(`témoin au format ${f} incomplet :\n- ${manques.join('\n- ')}`);
  return s;
}

// ---------- production ----------

// Tirages reproductibles (xorshift) à la place de crypto : mêmes ids à chaque passage.
function aleaFixe(graine) {
  let x = graine >>> 0;
  return {
    getRandomValues(tab) {
      for (let i = 0; i < tab.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; tab[i] = x & 0xff; }
      return tab;
    },
  };
}

// Un mot à soi (v9), d'identifiant fixe : la carte le tire au hasard (domain/mots-perso.js).
const MOT_A_SOI = 'roue:perso:u-5e1f0a2b';

// Données 100 % inventées, saisies comme dans l'app. format : ce que la version sait enregistrer.
async function remplir(repo, horloge, format) {
  const a = (iso) => { horloge.t = new Date(iso); };
  const v4 = format >= 2;
  // Ce que la v6 ajoute (format 4) : notes, « vers », ce que je faisais, pesé et rechargé, question liée.
  const v6 = format >= 4;
  // Ce que la v7 ajoute (format 5) : émotions de la roue (un mot, une famille seule) et séances de Bien-être.
  const v7 = format >= 5;
  // Ce que la v8 ajoute (format 6) : durée de la nuit, séance « Faite » du Programme, définitions corrigées, relevé à
  // énergie seule et « Nuit en détail » masqué.
  const v8 = format >= 6;
  // Ce que les v9 et v10 ajoutent (format 7) : un mot à soi et un relevé qui le cite, un mot sans famille, une séance du
  // minuteur, des exercices épinglés et la voix des consignes.
  const v10 = format >= 7;

  // Listes : un lieu renommé (l'ancien libellé reste en alias), un lieu créé par l'utilisateur,
  // un symptôme créé puis disparu de la base (son id devient inconnu).
  a('2026-09-20T18:00:00.000Z');
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  const lieuPerso = await repo.listes.creer('lieu', 'Médiathèque');
  const disparu = await repo.listes.creer('symptome', 'Tête lourde');

  // Rendez-vous, dont un sans date.
  a('2026-09-24T09:00:00.000Z');
  await repo.rdv.creer({
    date: '2026-09-25', heure: '10:30', professionnel: 'professionnel:psychiatre',
    questions: [{ texte: 'Sommeil', abordee: true }, { texte: 'Fatigue en fin de journée' }],
    compteRendu: 'Point sur le sommeil', prochaineEtape: 'Revoir dans un mois',
  });
  await repo.rdv.creer({ professionnel: 'professionnel:psychologue', questions: [{ texte: 'Organisation de la semaine' }] });

  a('2026-09-25T08:00:00.000Z');
  await repo.traitements.creer({
    date: '2026-09-25', changement: 'Dose du soir ajustée', effetsSecondaires: ['effetSecondaire:somnolence', 'effetSecondaire:bouche_seche'],
    effetRessenti: 'effetRessenti:stable', notes: 'À revoir au prochain rendez-vous',
  });

  // Épisodes : un complet (avec Après coup dès la v4), un à 02:30 qui compte pour la veille.
  a('2026-09-26T17:00:00.000Z');
  const episode = await repo.episodes.creer({
    date: '2026-09-26', heure: '18:40', situation: 'Réunion déplacée au dernier moment', emotion: 'emotion:frustration', intensite: 6,
    declencheur: 'declencheur:imprevu_changement', dessous: 'dessous:fatigue_debordement', reaction: 'reaction:retrait_isolement',
    ceQuiAAide: 'Sortir marcher dix minutes',
  });
  if (v6) {
    a('2026-09-26T17:30:00.000Z');
    await repo.rdv.creer({
      date: '2026-10-02', heure: '09:00', professionnel: 'professionnel:psychiatre',
      questions: [{ texte: 'Parler de la réunion déplacée', lien: { store: 'episodes', id: episode.id } }],
    });
  }
  a('2026-09-26T19:40:00.000Z');
  await repo.journal.patch('2026-09-26', {
    lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:moyen', humeur: 5, contactHumain: true, sportMouvement: false, explosions: 1,
    traitementPris: 'traitementPris:oui', pointsPositifs: 'Repas au calme', heureCoucher: '23:30', heureLever: '07:10',
    reveilsNocturnes: 2, notes: 'Journée chargée, soirée plus calme',
    ...(format === 2 ? { contactAvec: ['contactAvec:collegues', 'contactAvec:amis'], contactEffet: 'contactEffet:couteux' } : {}),
    ...(format >= 3 ? { contacts: [{ avec: ['contactAvec:collegues'], effet: 'contactEffet:couteux' }, { avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }] } : {}),
  });

  if (v4) {
    a('2026-09-27T10:05:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-27', heure: '12:00', humeur: 6, energie: 'energie:moyenne' });
  }
  a('2026-09-27T15:00:00.000Z');
  await repo.symptomes.creer({
    date: '2026-09-27', symptome: 'symptome:ruminations', intensite: 5, duree: 'duree:quelques_heures',
    contexte: 'Après une journée chargée', note: 'Passé après la douche',
  });
  if (v4) {
    a('2026-09-27T18:00:00.000Z');
    await repo.episodes.modifier(episode.id, {
      apresCoup: {
        jour: '2026-09-27', types: ['typeExplosion:surcharge'], fragilites: ['fragilite:mauvaise_nuit'], signes: ['signe:machoire'],
        signesTexte: 'Épaules serrées', repereA: 6, pensees: 'Encore un changement', pieges: ['piegePensee:tout_ou_rien'],
        tropDe: ['sourceSurcharge:bruit'], besoins: ['besoin:pause'], surLeMoment: ['consequenceCourt:tension_tombee'],
        plusTard: ['consequenceLong:fatigue'], autreFacon: 'Demander une pause plus tôt', siJe: 'je sens la mâchoire serrée',
        alorsJe: 'je sors cinq minutes', tensionApres: 3,
      },
    });
  }
  a('2026-09-27T19:30:00.000Z');
  await repo.journal.patch('2026-09-27', {
    lieu: lieuPerso.id, humeur: 7, contactHumain: true, sportMouvement: true, pointsPositifs: 'Marche de 20 min',
    ...(v4 ? { activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_15_a_30' }] } : {}),
    ...(format === 2 ? { contactEffet: 'contactEffet:neutre' } : {}),
    ...(format >= 3 ? { contacts: [{ avec: null, effet: 'contactEffet:neutre' }] } : {}),
  });
  if (v4) {
    a('2026-09-27T23:30:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-28', heure: '01:30', humeur: 4, energie: 'energie:basse' });
  }
  a('2026-09-28T00:35:00.000Z');
  await repo.episodes.creer({ date: '2026-09-28', heure: '02:30', situation: 'Réveil en pleine nuit', emotion: 'emotion:anxiete', intensite: 5 });

  if (v6) {
    a('2026-09-28T16:00:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-28', heure: '15:00', vers: true, humeur: 5, energie: 'energie:basse', faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] });
  }

  // Un lieu archivé encore utilisé.
  a('2026-09-28T19:45:00.000Z');
  await repo.journal.patch('2026-09-28', {
    lieu: 'lieu:clinique', humeur: 4, sommeilRessenti: 'sommeil:mal', traitementPris: 'traitementPris:partiel',
    ...(v6 ? { pese: ['pese:bruit', 'pese:trajets'], recharge: ['recharge:musique'] } : {}),
  });
  if (v6) {
    a('2026-09-28T23:40:00.000Z');
    await repo.notes.creer({ date: '2026-09-29', heure: '01:30', texte: 'Idée pour le week-end : ranger les papiers' });
  }
  a('2026-09-29T10:00:00.000Z');
  await repo.symptomes.creer({ date: '2026-09-29', symptome: disparu.id, intensite: 3, duree: 'duree:moins_une_heure' });
  await repo.tx(['listes'], 'readwrite', (t) => { t.objectStore('listes').delete(disparu.id); });
  // v7 : un relevé avec un mot de la roue, un avec une famille seule, et des séances des trois origines.
  if (v7) {
    a('2026-09-29T12:05:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '14:00', emotion: 'roue:colere:irrite', energie: 'energie:haute', faisais: ['activiteMoment:travail'] });
    a('2026-09-29T15:35:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '17:30', emotion: 'roue:serenite', energie: 'energie:moyenne' });
    a('2026-09-29T16:10:00.000Z');
    await repo.seances.creer({ date: '2026-09-29', heure: '18:00', exercice: 'respiration-carree', dureeS: 260, origine: 'bien-etre' });
    a('2026-09-29T17:20:00.000Z');
    await repo.seances.creer({ date: '2026-09-29', heure: '19:15', exercice: 'coherence', dureeS: 90, origine: 'ressourcer' });
  }
  // v8 : un relevé à énergie seule, Accablé (bleu en v8, rouge en v9) et une séance « Faite » du Programme.
  if (v8) {
    a('2026-09-29T08:35:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '10:30', energie: 'energie:basse' });
    a('2026-09-29T09:40:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '11:30', emotion: 'roue:peur:accable', energie: 'energie:basse', faisais: ['activiteMoment:travail'] });
    a('2026-09-29T18:10:00.000Z');
    await repo.seances.creer({ date: '2026-09-29', heure: '20:00', exercice: 'respiration-abdominale', dureeS: 300, origine: 'bien-etre', fin: true, programme: 'respiration-abdominale' });
  }
  // v9 et v10 : le mot à soi est écrit avant le relevé qui le cite (le repository le vérifie, comme la carte).
  if (v10) {
    a('2026-09-29T18:20:00.000Z');
    await repo.meta.ecrire('motsPerso', {
      [MOT_A_SOI]: { libelle: 'Tiraillé', zone: 'bleu', famille: 'tristesse', definition: 'Partagé entre deux envies.', archive: false, createdAt: '2026-09-29T18:20:00.000Z' },
    });
    a('2026-09-29T18:25:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '20:20', emotion: MOT_A_SOI, energie: 'energie:basse' });
    a('2026-09-29T18:40:00.000Z');
    await repo.seances.creer({ date: '2026-09-29', heure: '20:30', exercice: 'minuteur', dureeS: 600, origine: 'bien-etre' });
    a('2026-09-29T19:00:00.000Z');
    await repo.humeurs.creer({ date: '2026-09-29', heure: '20:55', emotion: 'roue:aucune:fatigue', energie: 'energie:basse', faisais: ['activiteMoment:travail'] });
  }
  a('2026-09-29T19:50:00.000Z');
  await repo.journal.patch('2026-09-29', { lieu: 'lieu:teletravail', humeur: 6, sommeilRessenti: 'sommeil:bien', ...(v8 ? { heuresSommeil: 7 } : {}) });
  await repo.listes.archiver('lieu:clinique');

  // Méta de l'utilisateur.
  a('2026-09-29T20:00:00.000Z');
  await repo.meta.ecrire('reglages', v4 ? { signal: true, tendances: false } : { signal: false });
  await repo.meta.ecrire('signalMasque', false);
  if (v4) {
    await repo.meta.ecrire('explosionsDepuis', '2026-09-24');
    await repo.meta.ecrire('journee', {
      ordre: ['lieu', 'sommeil', 'humeur', 'contact', 'sport', 'explosions', 'traitement', 'positifs'],
      masques: v8 ? ['explosions', 'traitement', 'humeur', 'nuit'] : v6 ? ['explosions', 'traitement', 'humeur'] : ['explosions', 'traitement'],
      heuresMoment: [12, 18],
    });
    await repo.meta.ecrire('monPlan', {
      premiersSignes: 'Mâchoire serrée', quandCaMonte: 'Je sors marcher', siSurcharge: 'Je mets le casque',
      pourRecuperer: 'Une sieste courte', prevenir: 'Le médecin traitant',
      siAlors: [{ si: 'je sens la mâchoire serrée', alors: 'je sors cinq minutes' }],
    });
    await repo.meta.ecrire('traitementActuel', {
      depuis: '2026-09-25', lignes: [{ id: 'l1', nom: 'Traitement A', doses: { matin: '1', midi: null, apresMidi: null, soir: '1', coucher: null } }],
    });
  }
  if (v6) {
    await repo.meta.ecrire('respiration', { duree: 2, rythme: '4-6', son: true, ...(v10 ? { voix: true } : {}) });
    await repo.meta.ecrire('uneChoseALaFois', { rubriques: ['quandCaMonte', 'pourRecuperer'], siAlors: true });
    await repo.meta.ecrire('ressourcer', { energieBasse: true });
  }
  if (v8) await repo.meta.ecrire('definitionsRoue', { 'roue:joie:curieux': 'Envie d\'en savoir plus sur ce qui arrive.' });
  if (v10) await repo.meta.ecrire('favorisBienEtre', ['soupir', 'minuteur']);
  // v7 : une séance après minuit, qui compte pour la veille.
  if (v7) {
    a('2026-09-29T23:35:00.000Z');
    await repo.seances.creer({ date: '2026-09-30', heure: '01:30', exercice: 'coherence', dureeS: 300, origine: 'moment-difficile' });
  }
  return { episode };
}

// Deux mémos : l'un sur un jour sans autre saisie (la fiche est créée vide), l'autre sur un épisode.
async function ajouterMemos(repo, horloge, episodeId) {
  const son = (n) => Uint8Array.from({ length: 64 }, (_, i) => (i * 7 + n) & 0xff).buffer;
  horloge.t = new Date('2026-09-30T19:00:00.000Z');
  await repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 4200, mime: 'audio/mp4', data: son(1) });
  horloge.t = new Date('2026-09-30T19:05:00.000Z');
  await repo.audios.creer({ parentStore: 'episodes', parentId: episodeId, dureeMs: 2500, mime: 'audio/mp4', data: son(2) });
}

async function exporterAvec(sauvegarde, repo, exporteLe, versionApp) {
  const fichiers = sauvegarde.construireSauvegarde(await sauvegarde.lireTout(repo), { maintenant: new Date(exporteLe), versionApp });
  if (fichiers.length !== 1) throw new Error(`un seul fichier attendu, ${fichiers.length} produits`);
  return concatener(fichiers[0].morceaux);
}

async function produireVersion(v, dossier) {
  const charger = (chemin) => import(pathToFileURL(join(dossier, 'public', 'js', chemin)).href);
  const [{ creerRepository }, sauvegarde, { VERSION_APP }] = await Promise.all([
    charger('db/repository.js'), charger('db/sauvegarde.js'), charger('version.js'),
  ]);
  if (sauvegarde.FORMAT_VERSION !== v.format) throw new Error(`${v.tag} : format ${sauvegarde.FORMAT_VERSION}, ${v.format} attendu`);
  const horloge = { t: new Date('2026-09-20T18:00:00.000Z') };
  const repo = creerRepository({ fabrique: new IDBFactory(), cles: IDBKeyRange, now: () => horloge.t, alea: aleaFixe(v.format) });
  try {
    const { episode } = await remplir(repo, horloge, v.format);
    const sorties = [{ nom: v.json, octets: await exporterAvec(sauvegarde, repo, v.exporteLe, VERSION_APP) }];
    if (v.zip) {
      await ajouterMemos(repo, horloge, episode.id);
      sorties.push({ nom: v.zip, octets: await exporterAvec(sauvegarde, repo, v.zipLe, VERSION_APP) });
    }
    return sorties;
  } finally {
    await repo.fermer();
  }
}

const git = (...args) => execFileSync('git', args, { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'] });

async function produire() {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'carnet-temoins-')));
  const extraits = [];
  try {
    const sorties = [];
    for (const v of VERSIONS) {
      const dossier = join(tmp, v.tag);
      extraits.push(dossier);
      git('worktree', 'add', '--detach', dossier, v.tag);
      sorties.push(...await produireVersion(v, dossier));
    }
    return sorties;
  } finally {
    for (const dossier of extraits) {
      try { git('worktree', 'remove', '--force', dossier); } catch { /* jamais créé : prune le retire */ }
    }
    rmSync(tmp, { recursive: true, force: true });
    try { git('worktree', 'prune'); } catch { /* l'erreur d'origine prime */ }
  }
}

const estPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (estPrincipal) {
  // L'heure des entrées du zip suit le fuseau local : on le fixe pour une sortie identique partout.
  process.env.TZ = 'Europe/Paris';
  const verifier = process.argv.includes('--verifier');
  try {
    const sorties = await produire();
    for (const f of sorties) {
      try { controlerTemoin(f.octets); } catch (e) { throw new Error(`${f.nom} : ${e.message}`); }
    }
    if (verifier) {
      const differents = sorties.filter((f) => {
        const chemin = join(DOSSIER, f.nom);
        return !existsSync(chemin) || !Buffer.from(f.octets).equals(readFileSync(chemin));
      });
      if (differents.length) throw new Error(`témoins différents : ${differents.map((f) => f.nom).join(', ')}`);
      console.log(`temoins : à jour (${sorties.length} fichiers)`);
    } else {
      mkdirSync(DOSSIER, { recursive: true });
      for (const f of sorties) writeFileSync(join(DOSSIER, f.nom), f.octets);
      console.log(`temoins : ${sorties.map((f) => `${f.nom} (${f.octets.length} octets)`).join(', ')}`);
    }
  } catch (e) {
    console.error(`temoins : ${e.message}`);
    process.exitCode = 1;
  }
}
