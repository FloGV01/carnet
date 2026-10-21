// Modèle de la vue soignants (une page A4, voix neutre). Exclut : situations, notes, points
// positifs, « ce qui a aidé », détail jour par jour, signal, mémos. Pur.
import { addDays, diffDays, lundiDe, formaterDateNumerique, formaterJourCourt } from '../domain/dates.js';
import { indicateurs, premiereDate } from '../analyse/fenetres.js';
import { nombre, duree, moyenneReveils } from '../analyse/textes.js';
import { trierRdv, rdvReference } from '../domain/soins.js';
import { LISTES_CLASSEES } from '../analyse/classements.js';
import { normaliserTraitement, resumeLigne } from '../domain/traitement-actuel.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { frise } from '../analyse/frise.js';
import { avecHumeurDuJour } from '../analyse/humeur-jour.js';
import { reperesTraitement } from '../analyse/reperes.js';

const NOMS = { declencheur: 'Déclencheurs', dessous: 'En dessous', emotion: 'Émotions', reaction: 'Réactions', symptome: 'Symptômes', effetSecondaire: 'Effets secondaires' };
const couper = (t, n) => (t && t.length > n ? `${t.slice(0, n - 1)}…` : t);

function lignesIndicateurs(colonnes, lib) {
  const v = (f, fn) => fn(f);
  const sur = (n, unite = 'j') => (n ? ` (sur ${n} ${unite})` : '');
  const defs = [
    ['Humeur moyenne (min-max)', (f) => (f.humeur.n ? `${nombre(f.humeur.moyenne)} (${nombre(f.humeur.minReleve)}-${nombre(f.humeur.maxReleve)}, sur ${f.humeur.n} j)` : '·')],
    ['Journées à 7 ou plus / à 4 ou moins', (f) => (f.humeur.n ? `${f.humeur.haut} / ${f.humeur.bas}` : '·')],
    ['Explosions (jours avec)', (f) => (f.explosions.n ? `${f.explosions.total} (${f.explosions.jours})` : '·')],
    [`Nuits ${lib('sommeil:mal')}`, (f) => (f.nuits.n ? `${f.nuits.mal}${sur(f.nuits.n, 'nuits')}` : '·')],
    ['Réveils nocturnes (moyenne)', (f) => (f.nuits.reveils.n ? `${moyenneReveils(f.nuits.reveils)}${sur(f.nuits.reveils.n)}` : '·')],
    ['Coucher · lever · durée (médianes)', (f) => (f.nuits.coucher || f.nuits.lever ? `${f.nuits.coucher || '·'} · ${f.nuits.lever || '·'} · ${duree(f.nuits.duree)}` : '·')],
    ['Contact humain', (f) => (f.contact.n ? `${f.contact.oui} j${sur(f.contact.n)}` : '·')],
    ['Bureau · télétravail', (f) => (f.lieux.n ? `${f.lieux.bureau} · ${f.lieux.teletravail}${sur(f.lieux.n)}` : '·')],
    ['Sport / mouvement', (f) => (f.sport.n ? `${f.sport.oui} j${sur(f.sport.n)}` : '·')],
    ['Traitement pris (oui · partiel · non)', (f) => (f.traitement.n ? `${f.traitement.oui} · ${f.traitement.partiel} · ${f.traitement.non}` : '·')],
    ['Épisodes (intensité moyenne)', (f) => `${f.episodes.nombre}${f.episodes.nIntensite ? ` (${nombre(f.episodes.intensite)})` : ''}`],
    ['Symptômes', (f) => String(f.symptomes.nombre)],
  ];
  return defs.map(([nom, fn]) => ({ nom, valeurs: colonnes.map((c) => v(c.f, fn)) }));
}

export function modeleSoignants(data, { aujourdhui, carte, analyse, professionnel, prenom, rdvs = [], traitements = [], traitementActuel = null, zeroDepuis = null }) {
  const lib = (id) => (carte && carte.get(id)) || id;
  // Humeur du jour (v6, analyse/humeur-jour.js) : moyenne des relevés de chaque journée, sinon
  // l'humeur du soir. Un jour qui n'a que des relevés compte, mais jamais pour « 0 explosion ».
  const journal = avecHumeurDuJour(data.journal, data.humeurs || []);
  const premier = premiereDate({ ...data, journal }, aujourdhui);
  data = { ...data, journal: journalAvecExplosions(journal, data.episodes || [], { zeroDepuis, jourNote: saisieDuSoir(data.journal) }) };
  // Le dernier rendez-vous : la même référence que « La dernière fois » (domain/soins.js), comptée depuis aujourd'hui.
  const dernierRdv = rdvReference(rdvs, { professionnel, avant: aujourdhui });
  const prochain = trierRdv(rdvs.filter((r) => !professionnel || r.professionnel === professionnel), aujourdhui).aVenir[0] || null;
  const colonnes = [
    { titre: '7 j', f: indicateurs(data, addDays(aujourdhui, -6), aujourdhui) },
    { titre: '30 j', f: indicateurs(data, addDays(aujourdhui, -29), aujourdhui) },
  ];
  if (dernierRdv && dernierRdv.date && diffDays(dernierRdv.date, aujourdhui) <= 180) {
    colonnes.push({ titre: `Depuis le RDV du ${formaterDateNumerique(dernierRdv.date).slice(0, 5)}`, f: indicateurs(data, dernierRdv.date, aujourdhui) });
  }
  colonnes.push({ titre: 'Depuis le début', f: indicateurs(data, premier || aujourdhui, aujourdhui) });

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
  // Sans les relevés : l'énergie basse (v6) est à l'écran seulement, elle ne touche ni les colonnes ni aDonnee.
  const f = frise({ journal: data.journal, episodes: data.episodes }, duFrise, aujourdhui);

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
    noteHumeur: 'Humeur : moyenne des relevés de chaque journée.',
    colonnes: colonnes.map((c) => c.titre),
    indicateurs: lignesIndicateurs(colonnes, lib),
    titreEvolution: parMois ? 'Évolution sur 12 mois' : 'Évolution sur 12 semaines',
    // Sans la clé energieBasse (toujours nulle ici) : l'énergie basse reste à l'écran.
    // Sans les clés des émotions (v7, à l'écran pour l'instant ; la frise ne reçoit pas les relevés ici).
    frise: { pas: f.pas, colonnes: f.colonnes.map(({ entree, energieBasse, emotions, familles, nEmotions, ...c }) => c), reperes: reperesFrise.traits },
    libellesSommeil: [lib('sommeil:mal'), lib('sommeil:moyen'), lib('sommeil:bien')],
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
