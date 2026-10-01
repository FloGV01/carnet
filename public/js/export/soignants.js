// Modèle de la vue soignants (une page A4, voix neutre). Exclut : situations, notes, points
// positifs, « ce qui a aidé », détail jour par jour, signal, mémos. Pur.
import { addDays, diffDays, formaterDateNumerique, formaterJourCourt } from '../domain/dates.js';
import { indicateurs, premiereDate } from '../analyse/fenetres.js';
import { nombre, duree, moyenneReveils, phraseConstat, phrasesSommeil, PAS_ASSEZ } from '../analyse/textes.js';
import { trierRdv } from '../domain/soins.js';
import { LISTES_CLASSEES } from '../analyse/classements.js';

const NOMS = { declencheur: 'Déclencheurs', dessous: 'En dessous', emotion: 'Émotions', reaction: 'Réactions', symptome: 'Symptômes', effetSecondaire: 'Effets secondaires' };
const couper = (t, n) => (t && t.length > n ? `${t.slice(0, n - 1)}…` : t);

function lignesIndicateurs(colonnes, lib) {
  const v = (f, fn) => fn(f);
  const sur = (n, unite = 'j') => (n ? ` (sur ${n} ${unite})` : '');
  const defs = [
    ['Humeur moyenne (min-max)', (f) => (f.humeur.n ? `${nombre(f.humeur.moyenne)} (${f.humeur.min}-${f.humeur.max}, sur ${f.humeur.n} j)` : '·')],
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

export function modeleSoignants(data, { aujourdhui, carte, analyse, professionnel, prenom, rdvs = [], traitements = [] }) {
  const lib = (id) => (carte && carte.get(id)) || id;
  const premier = premiereDate(data, aujourdhui);
  const { aVenir, passes } = trierRdv(rdvs.filter((r) => !professionnel || r.professionnel === professionnel), aujourdhui);
  const dernierRdv = passes[0] || null;
  const prochain = aVenir[0] || null;
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

  const reperes = [];
  for (const c of analyse.bonnesJournees.constats) reperes.push(phraseConstat(c, carte, 'neutre'));
  const s = analyse.sommeil;
  if (s.meme.statut === 'ok' || s.lendemain.statut === 'ok') { const ph = phrasesSommeil(s, carte).join(' '); reperes.push(`Sommeil et humeur : ${ph.charAt(0).toLowerCase()}${ph.slice(1)}`); }
  if (!reperes.length) reperes.push(PAS_ASSEZ);

  const debut90 = addDays(aujourdhui, -89);
  const lignesTraitement = traitements.filter((t) => t.date >= debut90 && t.date <= aujourdhui)
    .sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`)).slice(0, 4)
    .map((t) => [formaterJourCourt(t.date), couper(t.changement, 80), t.effetRessenti && lib(t.effetRessenti),
      (t.effetsSecondaires || []).map(lib).join(', ')].filter(Boolean).join(' · '));

  return {
    entete: `Suivi quotidien${prenom ? ` · ${prenom}` : ''} · édité le ${formaterDateNumerique(aujourdhui)}${premier ? ` · données depuis le ${formaterDateNumerique(premier)}` : ''}`,
    sousTitre: 'Données saisies par moi dans une application personnelle. Observations chiffrées, sans interprétation.',
    colonnes: colonnes.map((c) => c.titre),
    indicateurs: lignesIndicateurs(colonnes, lib),
    semaines: analyse.semaines,
    libellesSommeil: [lib('sommeil:mal'), lib('sommeil:moyen'), lib('sommeil:bien')],
    classements,
    reperes,
    traitement: lignesTraitement,
    rdv: {
      professionnel: professionnel ? lib(professionnel) : null,
      prochain: prochain ? `${prochain.date ? formaterDateNumerique(prochain.date) : 'date à fixer'}${prochain.heure ? ` à ${prochain.heure}` : ''}` : null,
      questions: prochain ? (prochain.questions || []).filter((q) => !q.abordee).slice(0, 6).map((q) => couper(q.texte, 200)) : [],
      prochaineEtape: dernierRdv && dernierRdv.prochaineEtape ? couper(dernierRdv.prochaineEtape, 200) : null,
    },
  };
}
