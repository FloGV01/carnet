// Export vers le projet Claude « PSY » : texte brut des 7 derniers jours, voix « je ». v7 : les émotions du moment de
// chaque jour, et leurs comptes par famille dans les COMPTEURS ; les anciennes notes de 1 à 10 restent dites.
// Exclus : traitement pris, fiches de traitement, rendez-vous, mémos, tout décompte de jours.
// Les jours sans saisie ne sont ni listés ni mentionnés. Pur.
// v9 : `perso`, la méta `motsPerso`, fait connaître les mots à soi (leur nom dans les lignes du jour, leur famille dans les
// COMPTEURS) ; sans elle, un relevé de mot à soi ne dit que son heure et son énergie.
import { addDays, formaterJourCourt, formaterDateNumerique, formaterVers, jourEvenement } from '../domain/dates.js';
import { SEUILS } from '../analyse/seuils.js';
import { indicateurs } from '../analyse/fenetres.js';
import { nombre } from '../analyse/textes.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { avecHumeurDuJour } from '../analyse/humeur-jour.js';
import { relevesAEmotion, parFamille, texteFamilles } from '../analyse/emotions.js';
import { resumeContacts } from '../domain/contacts.js';
import { libelleEmotion } from '../domain/roue.js';
import { resumeEmotions } from '../domain/releves.js';
import { texteHeuresSommeil } from '../domain/champs.js';

const MAX = SEUILS.export.maxTexteLibre;
const couper = (t) => {
  const propre = String(t).replace(/\s*\n+\s*/g, ' / ').trim();
  return propre.length > MAX ? `${propre.slice(0, MAX - 1)}…` : propre;
};
const ouiNon = (v) => (v ? 'oui' : 'non');
const minuscule = (t) => (t && t.length > 1 && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t);
const listeLib = (ids, lib) => (ids || []).map((id) => minuscule(lib(id))).join(', ');

// « Marche 30 à 60 min, Vélo » ; « famille, collègues : coûteux ; amis ».
function detailSport(j, lib) {
  return (j.activites || []).map((a) => [a.type && lib(a.type), a.duree && lib(a.duree)].filter(Boolean).join(' ')).filter(Boolean).join(', ');
}
function detailContact(j, lib) {
  return resumeContacts(j.contacts, lib, { minuscule, pourExport: true });
}

// Humeur du jour (v6) : « humeur 5,6 (de 3 à 8) » sur les relevés du jour, « humeur du soir 6 » pour
// un jour sans relevé.
function phraseHumeur(j) {
  if (j.humeurSource === 'soir') return `humeur du soir ${nombre(j.humeur)}`;
  return `humeur ${nombre(j.humeur)}${j.humeurMin !== j.humeurMax ? ` (de ${j.humeurMin} à ${j.humeurMax})` : ''}`;
}

// Un relevé du moment : « 18:42 irrité (énergie moyenne) » (v7, l'émotion de la roue, en minuscules ; une famille seule,
// « colère ») ; un ancien relevé garde sa note, « 18:42 7 (énergie moyenne) » ; noté après coup, « vers 14 h calme
// (énergie basse ; travail, trajet) » : l'énergie, puis ce que je faisais, entre parenthèses.
function releveMoment(h, lib, perso) {
  const details = [h.energie && `énergie ${minuscule(lib(h.energie))}`, h.faisais && h.faisais.length > 0 && listeLib(h.faisais, lib)].filter(Boolean).join(' ; ');
  const emotion = libelleEmotion(h.emotion, perso);
  return [h.vers ? formaterVers(h.heure) : h.heure, emotion && minuscule(emotion), h.humeur != null && `${h.humeur}`, details && `(${details})`].filter(Boolean).join(' ');
}

function ligneJour(j, lib, moments = [], perso = null) {
  const m = [formaterJourCourt(j.date)];
  if (j.lieu) m.push(lib(j.lieu));
  // v8 : la nuit en qualité et en heures, « nuit Mal · 6 h » ; les réveils ne restent que pour une nuit ancienne qui en a.
  const heures = texteHeuresSommeil(j.heuresSommeil);
  if (j.sommeilRessenti || heures || j.reveilsNocturnes != null) {
    let nuit = `nuit ${[j.sommeilRessenti && lib(j.sommeilRessenti), heures].filter(Boolean).join(' · ') || '·'}`;
    if (j.reveilsNocturnes != null) nuit += ` (${j.reveilsNocturnes === 5 ? '5 réveils ou plus' : `${j.reveilsNocturnes} réveil${j.reveilsNocturnes > 1 ? 's' : ''}`})`;
    m.push(nuit);
  }
  const h = [j.heureCoucher && `coucher ${j.heureCoucher}`, j.heureLever && `lever ${j.heureLever}`].filter(Boolean).join(' ');
  if (h) m.push(h);
  if (j.humeur != null) m.push(phraseHumeur(j));
  // v7 : les émotions notées ce jour-là (le mot, ou la famille seule), chacune une fois, dans l'ordre des heures. Un jour
  // qui mêle d'anciennes notes et des émotions garde les deux (« humeur 6 · émotions : calme »).
  const emotions = resumeEmotions(moments, Infinity, perso).mots;
  if (emotions.length) m.push(`émotions : ${emotions.join(', ')}`);
  const contact = detailContact(j, lib);
  if (j.contactHumain != null || contact) m.push(`contact${j.contactHumain != null ? ` ${ouiNon(j.contactHumain)}` : ''}${contact ? ` (${contact})` : ''}`);
  const sport = detailSport(j, lib);
  if (j.sportMouvement != null || sport) m.push(`sport${j.sportMouvement != null ? ` ${ouiNon(j.sportMouvement)}` : ''}${sport ? ` (${sport})` : ''}`);
  if (j.explosions != null) m.push(`explosions ${j.explosions}`);
  // Ce qui a pesé, ce qui a rechargé (v6) : chacun seulement s'il est noté.
  if (j.pese && j.pese.length) m.push(`a pesé : ${listeLib(j.pese, lib)}`);
  if (j.recharge && j.recharge.length) m.push(`a rechargé : ${listeLib(j.recharge, lib)}`);
  const lignes = [m.join(' · ')];
  if (moments.length) {
    lignes.push(`  humeur du moment : ${moments.map((h) => releveMoment(h, lib, perso)).join(' · ')}`);
  }
  if (j.pointsPositifs) lignes.push(`  + ${couper(j.pointsPositifs)}`);
  if (j.notes) lignes.push(`  note : ${couper(j.notes)}`);
  return lignes;
}

function ligneEpisode(e, lib) {
  const m = [`${formaterJourCourt(e.date)}${e.heure ? ` ${e.heure}` : ''}`];
  const emo = [e.emotion && lib(e.emotion), e.intensite != null && `${e.intensite}/10`].filter(Boolean).join(' ');
  if (emo) m.push(emo);
  if (e.declencheur) m.push(`déclencheur : ${lib(e.declencheur)}`);
  if (e.dessous) m.push(`dessous : ${lib(e.dessous)}`);
  if (e.reaction) m.push(`réaction : ${lib(e.reaction)}`);
  const lignes = [m.join(' · ')];
  if (e.situation) lignes.push(`  situation : ${couper(e.situation)}`);
  if (e.ceQuiAAide) lignes.push(`  a aidé : ${couper(e.ceQuiAAide)}`);
  if (e.apresCoup) lignes.push(...lignesApresCoup(e.apresCoup, lib));
  return lignes;
}

// Retour à froid (v4), transmis en entier, sur quelques lignes courtes.
function lignesApresCoup(a, lib) {
  const l = [];
  const ligne = (morceaux) => { const t = morceaux.filter(Boolean).join(' · '); if (t) l.push(`    ${t}`); };
  ligne([a.types && `c'était plutôt : ${listeLib(a.types, lib)}`, a.fragilites && `ce qui me fragilisait déjà : ${listeLib(a.fragilites, lib)}`]);
  ligne([a.signes && `premiers signes : ${listeLib(a.signes, lib)}`, a.signesTexte && `« ${couper(a.signesTexte)} »`, a.repereA != null && `remarqué à ${a.repereA}/10`]);
  ligne([a.pensees && `ce que je me suis dit : « ${couper(a.pensees)} »`, a.pieges && `ça ressemble à : ${listeLib(a.pieges, lib)}`]);
  ligne([a.tropDe && `ce qui était trop : ${listeLib(a.tropDe, lib)}`, a.besoins && `ce dont j'avais besoin : ${listeLib(a.besoins, lib)}`]);
  ligne([a.surLeMoment && `sur le moment : ${listeLib(a.surLeMoment, lib)}`, a.plusTard && `plus tard : ${listeLib(a.plusTard, lib)}`]);
  ligne([a.autreFacon && `une autre façon de voir : « ${couper(a.autreFacon)} »`]);
  ligne([(a.siJe || a.alorsJe) && `pour la prochaine fois : si ${a.siJe ? couper(a.siJe) : '…'}, alors ${a.alorsJe ? couper(a.alorsJe) : '…'}`]);
  ligne([a.tensionApres != null && `en y repensant : ${a.tensionApres}/10`]);
  return l.length ? ['  après coup :', ...l] : [];
}

function ligneSymptome(s, lib) {
  const m = [formaterJourCourt(s.date)];
  const nom = [s.symptome && lib(s.symptome), s.intensite != null && `${s.intensite}/10`].filter(Boolean).join(' ');
  if (nom) m.push(nom);
  if (s.duree) m.push(`durée : ${lib(s.duree)}`);
  if (s.contexte) m.push(`contexte : ${couper(s.contexte)}`);
  const lignes = [m.join(' · ')];
  if (s.note) lignes.push(`  note : ${couper(s.note)}`);
  return lignes;
}

// emotions : le nombre de relevés de chaque famille sur la semaine (v7), en dernier : tout ce qui suit « émotions : » est
// une famille, dans l'ordre de la roue, sans les familles à zéro. « humeur moyenne » ne reste que pour une semaine qui a
// d'anciennes notes de 1 à 10.
function compteurs(f, complet, lib, emotions) {
  const m = [];
  if (f.humeur.n) m.push(`humeur moyenne ${nombre(f.humeur.moyenne)}${complet ? ` (de ${nombre(f.humeur.minReleve)} à ${nombre(f.humeur.maxReleve)})` : ''}`);
  if (f.explosions.n) m.push(`explosions ${f.explosions.total}`);
  if (f.lieux.n) m.push(`jours au bureau ${f.lieux.bureau}`);
  if (complet) {
    if (f.contact.n) m.push(`contact humain ${f.contact.oui} jour${f.contact.oui > 1 ? 's' : ''}`);
    if (f.sport.n) m.push(`sport ${f.sport.oui} jour${f.sport.oui > 1 ? 's' : ''}`);
    if (f.nuits.n) m.push(`nuits ${lib('sommeil:mal')} ${f.nuits.mal}`);
  }
  const familles = texteFamilles(emotions);
  if (familles) m.push(`émotions : ${familles}`);
  return m.join(' · ');
}

export function exportPsy({ journal, episodes, symptomes, humeurs = [], perso = null }, { aujourdhui, carte, zeroDepuis = null }) {
  const lib = (id) => carte.get(id) || id;
  const du = addDays(aujourdhui, -6);
  const dans = (d) => d >= du && d <= aujourdhui;
  // Jours listés : ceux du journal, et ceux qui n'ont que des humeurs du moment (ligne de date,
  // puis les relevés). Humeur du jour (v6, analyse/humeur-jour.js) partout, lignes et COMPTEURS.
  // Explosions (v4) : sur une ligne de jour, la règle d'affichage (le compteur s'il est noté, sinon
  // les épisodes « Explosion », jamais un 0 non saisi) ; dans les COMPTEURS, la règle de l'analyse
  // (0 pour un jour noté le soir depuis la v4, jamais pour un jour qui n'a que des relevés).
  const duJour = avecHumeurDuJour(journal, humeurs);
  const journalExpl = journalAvecExplosions(duJour, episodes, { zeroDepuis, jourNote: saisieDuSoir(journal) });
  const journalAffiche = journalAvecExplosions(duJour, episodes, { zeroSiNote: false, ajouterJours: false });
  const datesListees = new Set(journalAffiche.map((j) => j.date));
  const momentsDu = new Map();
  for (const h of humeurs) {
    const j = jourEvenement(h.date, h.heure);
    if (!dans(j)) continue;
    if (!momentsDu.has(j)) momentsDu.set(j, []);
    momentsDu.get(j).push(h);
  }
  for (const liste of momentsDu.values()) liste.sort((a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`));
  const jours = [
    ...journalAffiche.filter((j) => dans(j.date)),
    ...[...momentsDu.keys()].filter((d) => !datesListees.has(d)).map((date) => ({ date })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const parHeure = (a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`);
  const eps = episodes.filter((e) => dans(jourEvenement(e.date, e.heure))).sort(parHeure);
  // Après coup écrit cette semaine sur un épisode plus ancien : il part aussi, à part.
  const anciens = episodes.filter((e) => e.apresCoup && e.apresCoup.jour && dans(e.apresCoup.jour) && jourEvenement(e.date, e.heure) < du).sort(parHeure);
  const sys = symptomes.filter((s) => dans(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  const blocs = [`SUIVI APP · 7 jours du ${formaterJourCourt(du)} au ${formaterJourCourt(aujourdhui)}/${aujourdhui.slice(0, 4)}`];
  if (jours.length) blocs.push(['JOURS', ...jours.flatMap((j) => ligneJour(j, lib, momentsDu.get(j.date) || [], perso))].join('\n'));
  if (eps.length) blocs.push([`ÉPISODES (${eps.length})`, ...eps.flatMap((e) => ligneEpisode(e, lib))].join('\n'));
  if (anciens.length) blocs.push(['APRÈS COUP (épisodes plus anciens)', ...anciens.flatMap((e) => [ligneEpisode(e, lib)[0], ...lignesApresCoup(e.apresCoup, lib)])].join('\n'));
  if (sys.length) blocs.push([`SYMPTÔMES (${sys.length})`, ...sys.flatMap((s) => ligneSymptome(s, lib))].join('\n'));
  const data = { journal: journalExpl, episodes, symptomes };
  const releves = relevesAEmotion(humeurs, perso);
  const emotionsEntre = (a, b) => parFamille(releves.filter((r) => r.date >= a && r.date <= b));
  const cette = compteurs(indicateurs(data, du, aujourdhui), true, lib, emotionsEntre(du, aujourdhui));
  const avant = compteurs(indicateurs(data, addDays(du, -7), addDays(du, -1)), false, lib, emotionsEntre(addDays(du, -7), addDays(du, -1)));
  const lignesCompteurs = [cette && `cette semaine : ${cette}`, avant && `semaine d'avant : ${avant}`].filter(Boolean);
  if (lignesCompteurs.length) blocs.push(['COMPTEURS', ...lignesCompteurs].join('\n'));
  // v7 : plus de « REPÈRES DE L'APP » : les phrases calculées sur la note de 1 à 10 sont retirées de l'Analyse.
  blocs.push('PSY : fais-moi le récap de la semaine, format habituel.');
  return blocs.join('\n\n');
}

export const titreExport = (aujourdhui) => `7 jours jusqu'au ${formaterDateNumerique(aujourdhui)}`;
