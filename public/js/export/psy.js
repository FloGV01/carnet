// Export vers le projet Claude « PSY » : texte brut des 7 derniers jours, voix « je ».
// Exclus : traitement pris, fiches de traitement, rendez-vous, mémos, tout décompte de jours.
// Les jours sans saisie ne sont ni listés ni mentionnés. Pur.
import { addDays, formaterJourCourt, formaterDateNumerique, jourEvenement } from '../domain/dates.js';
import { SEUILS } from '../analyse/seuils.js';
import { indicateurs } from '../analyse/fenetres.js';
import { nombre, phraseConstat, phrasesSommeil, PAS_ASSEZ } from '../analyse/textes.js';
import { journalAvecExplosions } from '../domain/explosions.js';

const MAX = SEUILS.export.maxTexteLibre;
const couper = (t) => {
  const propre = String(t).replace(/\s*\n+\s*/g, ' / ').trim();
  return propre.length > MAX ? `${propre.slice(0, MAX - 1)}…` : propre;
};
const ouiNon = (v) => (v ? 'oui' : 'non');
const minuscule = (t) => (t && t.length > 1 && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t);
const listeLib = (ids, lib) => (ids || []).map((id) => minuscule(lib(id))).join(', ');

// « Marche 30 à 60 min, Vélo » ; « Famille, Collègues · coûteux ».
function detailSport(j, lib) {
  return (j.activites || []).map((a) => [a.type && lib(a.type), a.duree && lib(a.duree)].filter(Boolean).join(' ')).filter(Boolean).join(', ');
}
function detailContact(j, lib) {
  return [listeLib(j.contactAvec, lib), j.contactEffet && minuscule(lib(j.contactEffet))].filter(Boolean).join(' · ');
}

function ligneJour(j, lib, moments = []) {
  const m = [formaterJourCourt(j.date)];
  if (j.lieu) m.push(lib(j.lieu));
  if (j.sommeilRessenti || j.reveilsNocturnes != null) {
    let nuit = `nuit ${j.sommeilRessenti ? lib(j.sommeilRessenti) : '·'}`;
    if (j.reveilsNocturnes != null) nuit += ` (${j.reveilsNocturnes === 5 ? '5 réveils ou plus' : `${j.reveilsNocturnes} réveil${j.reveilsNocturnes > 1 ? 's' : ''}`})`;
    m.push(nuit);
  }
  const h = [j.heureCoucher && `coucher ${j.heureCoucher}`, j.heureLever && `lever ${j.heureLever}`].filter(Boolean).join(' ');
  if (h) m.push(h);
  if (j.humeur != null) m.push(`humeur ${j.humeur}`);
  const contact = detailContact(j, lib);
  if (j.contactHumain != null || contact) m.push(`contact${j.contactHumain != null ? ` ${ouiNon(j.contactHumain)}` : ''}${contact ? ` (${contact})` : ''}`);
  const sport = detailSport(j, lib);
  if (j.sportMouvement != null || sport) m.push(`sport${j.sportMouvement != null ? ` ${ouiNon(j.sportMouvement)}` : ''}${sport ? ` (${sport})` : ''}`);
  if (j.explosions != null) m.push(`explosions ${j.explosions}`);
  const lignes = [m.join(' · ')];
  if (moments.length) {
    lignes.push(`  humeur du moment : ${moments.map((h) => [h.heure, h.humeur != null && `${h.humeur}`, h.energie && `(énergie ${minuscule(lib(h.energie))})`].filter(Boolean).join(' ')).join(' · ')}`);
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

function compteurs(f, complet, lib) {
  const m = [];
  if (f.humeur.n) m.push(`humeur moyenne ${nombre(f.humeur.moyenne)}${complet ? ` (de ${f.humeur.min} à ${f.humeur.max})` : ''}`);
  if (f.explosions.n) m.push(`explosions ${f.explosions.total}`);
  if (f.lieux.n) m.push(`jours au bureau ${f.lieux.bureau}`);
  if (complet) {
    if (f.contact.n) m.push(`contact humain ${f.contact.oui} jour${f.contact.oui > 1 ? 's' : ''}`);
    if (f.sport.n) m.push(`sport ${f.sport.oui} jour${f.sport.oui > 1 ? 's' : ''}`);
    if (f.nuits.n) m.push(`nuits ${lib('sommeil:mal')} ${f.nuits.mal}`);
  }
  return m.join(' · ');
}

// Repères issus de l'analyse (tout l'historique), en voix « je ».
export function reperesPsy(analyse, carte) {
  if (!analyse) return [];
  const lignes = [];
  const bj = analyse.bonnesJournees;
  if (bj.constats.length) for (const c of bj.constats) lignes.push(phraseConstat(c, carte, 'je'));
  else if (bj.statut === 'insuffisant') lignes.push('Bonnes journées : pas encore assez de données.');
  const s = analyse.sommeil;
  if (s.meme.statut === 'ok' || s.lendemain.statut === 'ok') {
    const ph = phrasesSommeil(s, carte).join(' ');
    lignes.push(`Sommeil et humeur : ${ph.charAt(0).toLowerCase()}${ph.slice(1)}`);
  } else lignes.push(`Sommeil et humeur : ${PAS_ASSEZ.charAt(0).toLowerCase()}${PAS_ASSEZ.slice(1)}`);
  return lignes;
}

export function exportPsy({ journal, episodes, symptomes, humeurs = [] }, { aujourdhui, carte, reperes = [], signal = null, zeroDepuis = null }) {
  const lib = (id) => carte.get(id) || id;
  const du = addDays(aujourdhui, -6);
  const dans = (d) => d >= du && d <= aujourdhui;
  // Jours listés : ceux du journal, et ceux qui n'ont que des humeurs du moment (ligne de date
  // seule, puis les relevés). Les explosions suivent la règle v4 (épisodes « Explosion »).
  const notes = new Set(journal.map((j) => j.date));
  const journalExpl = journalAvecExplosions(journal, episodes, { zeroDepuis });
  const momentsDu = new Map();
  for (const h of humeurs) {
    const j = jourEvenement(h.date, h.heure);
    if (!dans(j)) continue;
    if (!momentsDu.has(j)) momentsDu.set(j, []);
    momentsDu.get(j).push(h);
  }
  for (const liste of momentsDu.values()) liste.sort((a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`));
  const jours = [
    ...journalExpl.filter((j) => dans(j.date) && notes.has(j.date)),
    ...[...momentsDu.keys()].filter((d) => !notes.has(d)).map((date) => ({ date })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const parHeure = (a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`);
  const eps = episodes.filter((e) => dans(jourEvenement(e.date, e.heure))).sort(parHeure);
  // Après coup écrit cette semaine sur un épisode plus ancien : il part aussi, à part.
  const anciens = episodes.filter((e) => e.apresCoup && e.apresCoup.jour && dans(e.apresCoup.jour) && jourEvenement(e.date, e.heure) < du).sort(parHeure);
  const sys = symptomes.filter((s) => dans(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  const blocs = [`SUIVI APP · 7 jours du ${formaterJourCourt(du)} au ${formaterJourCourt(aujourdhui)}/${aujourdhui.slice(0, 4)}`];
  if (jours.length) blocs.push(['JOURS', ...jours.flatMap((j) => ligneJour(j, lib, momentsDu.get(j.date) || []))].join('\n'));
  if (eps.length) blocs.push([`ÉPISODES (${eps.length})`, ...eps.flatMap((e) => ligneEpisode(e, lib))].join('\n'));
  if (anciens.length) blocs.push(['APRÈS COUP (épisodes plus anciens)', ...anciens.flatMap((e) => [ligneEpisode(e, lib)[0], ...lignesApresCoup(e.apresCoup, lib)])].join('\n'));
  if (sys.length) blocs.push([`SYMPTÔMES (${sys.length})`, ...sys.flatMap((s) => ligneSymptome(s, lib))].join('\n'));
  const data = { journal: journalExpl, episodes, symptomes };
  const cette = compteurs(indicateurs(data, du, aujourdhui), true, lib);
  const avant = compteurs(indicateurs(data, addDays(du, -7), addDays(du, -1)), false, lib);
  const lignesCompteurs = [cette && `cette semaine : ${cette}`, avant && `semaine d'avant : ${avant}`].filter(Boolean);
  if (lignesCompteurs.length) blocs.push(['COMPTEURS', ...lignesCompteurs].join('\n'));
  const rep = [...reperes];
  if (signal) rep.push(`Signal : ${signal}`);
  if (rep.length) blocs.push(['REPÈRES DE L\'APP (tout l\'historique)', ...rep.map((r) => `- ${r}`)].join('\n'));
  blocs.push('PSY : fais-moi le récap de la semaine, format habituel.');
  return blocs.join('\n\n');
}

export const titreExport = (aujourdhui) => `7 jours jusqu'au ${formaterDateNumerique(aujourdhui)}`;
