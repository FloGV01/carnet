// Modèle de la vue soignants (une page A4, voix neutre). Exclut : situations, notes, points
// positifs, « ce qui a aidé », détail jour par jour, signal, mémos, Bien-être. Pur.
// v7 : les émotions du moment (roue), en nombre de relevés par famille, dans l'ordre de la roue ; les anciennes notes de
// 1 à 10 gardent leur ligne « Humeur (notes) » tant qu'une colonne en a, et leur rangée sur la frise quand sa période en a.
// v8 (Q15) : « Nuit par nuit », les nuits notées des 4 dernières semaines (2 si la page ne tient pas, page-a4.js).
import { addDays, diffDays, lundiDe, formaterDateNumerique, formaterJourCourt } from '../domain/dates.js';
import { indicateurs, premiereDate } from '../analyse/fenetres.js';
import { nombre, duree, moyenneReveils, texteNuit } from '../analyse/textes.js';
import { mesNuits, periodeMesNuits } from '../analyse/comprendre.js';
import { trierRdv, rdvReference } from '../domain/soins.js';
import { LISTES_CLASSEES } from '../analyse/classements.js';
import { normaliserTraitement, resumeLigne } from '../domain/traitement-actuel.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { frise } from '../analyse/frise.js';
import { avecHumeurDuJour } from '../analyse/humeur-jour.js';
import { reperesTraitement } from '../analyse/reperes.js';
import { relevesAEmotion, parFamille, texteFamilles } from '../analyse/emotions.js';
import { FAMILLES, estEmotion } from '../domain/roue.js';

const NOMS = { declencheur: 'Déclencheurs', dessous: 'En dessous', emotion: 'Émotions (épisodes)', reaction: 'Réactions', symptome: 'Symptômes', effetSecondaire: 'Effets secondaires' };
const couper = (t, n) => (t && t.length > n ? `${t.slice(0, n - 1)}…` : t);
// La qualité d'une nuit, de 1 (Mal, le plus clair) à 3 (Bien, le plus foncé) : la rampe du sommeil de la frise.
const PAS_QUALITE = { 'sommeil:mal': 1, 'sommeil:moyen': 2, 'sommeil:bien': 3 };
// Les fenêtres de « Nuit par nuit », dans l'ordre où la page les essaie.
export const SEMAINES_NUITS = [4, 2];

// « Émotions par famille » : une valeur par colonne, sur plusieurs lignes si besoin (multiligne, page-a4.js). « Humeur
// (notes) » : seulement si une colonne a d'anciennes notes ; une colonne sans note dit « · ».
export const NOM_EMOTIONS = 'Émotions par famille (relevés)';
export const NOM_NOTES = 'Humeur (notes), moyenne (min-max)';
function lignesIndicateurs(colonnes, lib) {
  const v = (f, fn) => fn(f);
  const sur = (n, unite = 'j') => (n ? ` (sur ${n} ${unite})` : '');
  const avecNotes = colonnes.some((c) => c.f.humeur.n > 0);
  // Durée de nuit (v8) : la médiane des heures notées le soir, ou du coucher et du lever des nuits anciennes. Coucher et
  // lever médians ne se disent que pour une période qui en a (une colonne qui n'en a pas ne donne que sa durée) ; la ligne
  // reste unique.
  const aHoraires = (f) => Boolean(f.nuits.coucher || f.nuits.lever);
  const dureeSeule = (f) => (f.nuits.duree ? duree(f.nuits.duree) : '·');
  const ligneNuits = colonnes.some((c) => aHoraires(c.f))
    ? ['Coucher · lever · durée (médianes)', (f) => (aHoraires(f) ? `${f.nuits.coucher || '·'} · ${f.nuits.lever || '·'} · ${duree(f.nuits.duree)}` : dureeSeule(f))]
    : ['Durée de nuit (médiane)', dureeSeule];
  const emotions = { nom: NOM_EMOTIONS, valeurs: colonnes.map((c) => texteFamilles(c.emotions) || '·'), multiligne: true };
  const defs = [
    ...(avecNotes ? [[NOM_NOTES, (f) => (f.humeur.n ? `${nombre(f.humeur.moyenne)} (${nombre(f.humeur.minReleve)}-${nombre(f.humeur.maxReleve)}, sur ${f.humeur.n} j)` : '·')]] : []),
    ['Explosions (jours avec)', (f) => (f.explosions.n ? `${f.explosions.total} (${f.explosions.jours})` : '·')],
    [`Nuits ${lib('sommeil:mal')}`, (f) => (f.nuits.n ? `${f.nuits.mal}${sur(f.nuits.n, 'nuits')}` : '·')],
    ['Réveils nocturnes (moyenne)', (f) => (f.nuits.reveils.n ? `${moyenneReveils(f.nuits.reveils)}${sur(f.nuits.reveils.n)}` : '·')],
    ligneNuits,
    ['Contact humain', (f) => (f.contact.n ? `${f.contact.oui} j${sur(f.contact.n)}` : '·')],
    ['Bureau · télétravail', (f) => (f.lieux.n ? `${f.lieux.bureau} · ${f.lieux.teletravail}${sur(f.lieux.n)}` : '·')],
    ['Sport / mouvement', (f) => (f.sport.n ? `${f.sport.oui} j${sur(f.sport.n)}` : '·')],
    ['Traitement pris (oui · partiel · non)', (f) => (f.traitement.n ? `${f.traitement.oui} · ${f.traitement.partiel} · ${f.traitement.non}` : '·')],
    ['Épisodes (intensité moyenne)', (f) => `${f.episodes.nombre}${f.episodes.nIntensite ? ` (${nombre(f.episodes.intensite)})` : ''}`],
    ['Symptômes', (f) => String(f.symptomes.nombre)],
  ];
  return [emotions, ...defs.map(([nom, fn]) => ({ nom, valeurs: colonnes.map((c) => v(c.f, fn)) }))];
}

export function modeleSoignants(data, { aujourdhui, carte, analyse, professionnel, prenom, rdvs = [], traitements = [], traitementActuel = null, zeroDepuis = null }) {
  const lib = (id) => (carte && carte.get(id)) || id;
  // Nuit par nuit (v8, Q15) : les nuits notées de chaque fenêtre, si l'une au moins a sa durée (sinon, pas de section).
  // Chaque nuit porte son jour (« lun 12/10 », celui qui suit la nuit), ses heures, sa qualité (1 à 3) et son texte.
  const nuitsSur = (semaines) => {
    const liste = mesNuits(data.journal, periodeMesNuits(aujourdhui, semaines));
    if (!liste.some((n) => n.heures != null)) return null;
    return { semaines, nuits: liste.map((n) => ({ jour: formaterJourCourt(n.date), heures: n.heures, qualite: PAS_QUALITE[n.qualite] || null, texte: texteNuit(n, lib) })) };
  };
  const nuits = SEMAINES_NUITS.map(nuitsSur).filter(Boolean);
  // Humeur du jour (v6, analyse/humeur-jour.js) : moyenne des relevés de chaque journée, sinon
  // l'humeur du soir. Un jour qui n'a que des relevés compte, mais jamais pour « 0 explosion ».
  const journal = avecHumeurDuJour(data.journal, data.humeurs || []);
  // Les relevés à émotion (v7) : rattachés à leur jour logique ; un jour qui n'a qu'eux date aussi le début des données.
  const releves = relevesAEmotion(data.humeurs || []).filter((r) => r.date <= aujourdhui);
  const emotionsEntre = (du, au) => parFamille(releves.filter((r) => r.date >= du && r.date <= au));
  const premier = premiereDate({ ...data, journal: [...journal, ...releves.map((r) => ({ date: r.date }))] }, aujourdhui);
  data = { ...data, journal: journalAvecExplosions(journal, data.episodes || [], { zeroDepuis, jourNote: saisieDuSoir(data.journal) }) };
  // Le dernier rendez-vous : la même référence que « La dernière fois » (domain/soins.js), comptée depuis aujourd'hui.
  const dernierRdv = rdvReference(rdvs, { professionnel, avant: aujourdhui });
  const prochain = trierRdv(rdvs.filter((r) => !professionnel || r.professionnel === professionnel), aujourdhui).aVenir[0] || null;
  const colonne = (titre, du) => ({ titre, f: indicateurs(data, du, aujourdhui), emotions: emotionsEntre(du, aujourdhui) });
  const colonnes = [colonne('7 j', addDays(aujourdhui, -6)), colonne('30 j', addDays(aujourdhui, -29))];
  if (dernierRdv && dernierRdv.date && diffDays(dernierRdv.date, aujourdhui) <= 180) {
    colonnes.push(colonne(`Depuis le RDV du ${formaterDateNumerique(dernierRdv.date).slice(0, 5)}`, dernierRdv.date));
  }
  colonnes.push(colonne('Depuis le début', premier || aujourdhui));

  const classements = LISTES_CLASSEES.map(({ liste }) => {
    const c = analyse.classements['30'][liste];
    return { titre: NOMS[liste], elements: c.statut === 'aucun' ? [] : c.tries.slice(0, 3).map(([id, n]) => `${lib(id)} (${n})`) };
  });

  // v7 : plus de section « Repères » : les phrases calculées sur la note de 1 à 10 sont retirées de l'Analyse.

  // Évolution (v5) : la frise « Mes jours », par semaine sur 12 semaines, ou par mois sur 12 mois
  // quand l'historique dépasse 26 semaines. Jamais le détail jour par jour, aucune phrase.
  const parMois = premier && diffDays(premier, aujourdhui) + 1 > 26 * 7;
  let duFrise = addDays(lundiDe(aujourdhui), -77);
  if (parMois) {
    let [a, m] = aujourdhui.split('-').map(Number);
    m -= 11;
    while (m < 1) { m += 12; a -= 1; }
    duFrise = `${a}-${String(m).padStart(2, '0')}-01`;
  }
  // Les relevés n'y entrent que par leur émotion (v7) : l'énergie basse (v6) est à l'écran seulement, elle ne touche ni
  // les colonnes ni aDonnee.
  const emotionsSeules = (data.humeurs || []).filter((h) => h && estEmotion(h.emotion)).map(({ date, heure, emotion, vers }) => ({ date, heure, emotion, vers }));
  const f = frise({ journal: data.journal, episodes: data.episodes, humeurs: emotionsSeules }, duFrise, aujourdhui);
  // Les familles notées sur la frise, dans l'ordre de la roue : la légende de ses barres empilées.
  const famillesFrise = FAMILLES.filter((x) => f.colonnes.some((c) => c.familles && c.familles[x.cle] > 0)).map((x) => ({ cle: x.cle, libelle: x.libelle }));

  const actuel = normaliserTraitement(traitementActuel).lignes.slice(0, 4).map((l) => couper(`${l.nom || '·'} : ${resumeLigne(l) || '·'}`, 70));
  // Les changements datés des 90 derniers jours : 4 lignes au plus, 3 sous un traitement actuel.
  const debut90 = addDays(aujourdhui, -89);
  const fichesTraitement = traitements.filter((t) => t.date >= debut90 && t.date <= aujourdhui)
    .sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`)).slice(0, actuel.length ? 3 : 4);
  // Repères (v6, analyse/reperes.js) : seuls les changements qui ont une ligne ci-dessous sont numérotés et
  // tracés sur la frise, et leur ligne reprend le numéro. Aucun trait sans légende.
  const reperesFrise = reperesTraitement(traitements, f.colonnes, { lignes: fichesTraitement.map((t) => t.id) });
  const symbole = new Map(reperesFrise.legende.map((r) => [r.id, r.symbole]));
  const lignesTraitement = fichesTraitement.map((t) => {
    const ligne = [formaterJourCourt(t.date), couper(t.changement, 80), t.effetRessenti && lib(t.effetRessenti),
      (t.effetsSecondaires || []).map(lib).join(', ')].filter(Boolean).join(' · ');
    return symbole.has(t.id) ? `${symbole.get(t.id)} ${ligne}` : ligne;
  });
  return {
    entete: `Suivi quotidien${prenom ? ` · ${prenom}` : ''} · édité le ${formaterDateNumerique(aujourdhui)}${premier ? ` · données depuis le ${formaterDateNumerique(premier)}` : ''}`,
    sousTitre: 'Données saisies par moi dans une application personnelle. Observations chiffrées, sans interprétation.',
    noteLecture: `Émotions : relevés notés, par famille de la roue.${colonnes.some((c) => c.f.humeur.n > 0) ? ' Humeur (notes) : anciennes notes de 1 à 10, moyenne de chaque journée.' : ''}`,
    colonnes: colonnes.map((c) => c.titre),
    indicateurs: lignesIndicateurs(colonnes, lib),
    titreEvolution: parMois ? 'Évolution sur 12 mois' : 'Évolution sur 12 semaines',
    // Sans la clé energieBasse (toujours nulle ici) : l'énergie basse reste à l'écran. Par semaine ou par mois, chaque
    // colonne porte ses familles (familles, nEmotions) ; avecHumeur dit si la période a d'anciennes notes.
    frise: { pas: f.pas, colonnes: f.colonnes.map(({ entree, energieBasse, emotions, ...c }) => c), avecHumeur: f.avecHumeur, familles: famillesFrise, reperes: reperesFrise.traits },
    libellesSommeil: [lib('sommeil:mal'), lib('sommeil:moyen'), lib('sommeil:bien')],
    nuits,
    classements,
    traitement: lignesTraitement,
    traitementActuel: actuel,
    rdv: {
      professionnel: professionnel ? lib(professionnel) : null,
      prochain: prochain ? `${prochain.date ? formaterDateNumerique(prochain.date) : 'date à fixer'}${prochain.heure ? ` à ${prochain.heure}` : ''}` : null,
      questions: prochain ? (prochain.questions || []).filter((q) => !q.abordee).slice(0, 6).map((q) => couper(q.texte, 200)) : [],
      prochaineEtape: dernierRdv && dernierRdv.prochaineEtape ? couper(dernierRdv.prochaineEtape, 200) : null,
    },
  };
}
