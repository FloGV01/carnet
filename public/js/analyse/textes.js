// Toutes les phrases de l'analyse, en trois voix : « tu » (app), « je » (export PSY),
// « neutre » (vue soignants). Factuelles, jamais causales, jamais évaluatives.
import { extremesFiables } from './sommeil.js';

export const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
export const REGLES = {
  bonnesJournees: 'La règle : au moins 5 journées à 7 ou plus et 5 journées à 4 ou moins, et assez de « oui » et de « non » pour chaque facteur.',
  sommeil: 'La règle : au moins 14 jours où la nuit et l\'humeur sont notées, avec au moins 4 jours pour deux qualités de nuit différentes.',
  classement: 'La règle : au moins 3 éléments notés, et 2 fois le même en tête.',
  explosions: 'La règle : au moins 3 explosions sur la période (épisodes dont la réaction est « Explosion »). Une liste montre ce qui y est noté au moins 2 fois.',
  moments: 'La règle : un créneau de 2 h apparaît avec des humeurs du moment notées au moins 3 jours différents.',
};
export const PIED_EXPLOSIONS = 'Ce sont tes notes, rassemblées : pas des causes.';

const POSSESSIF = { tu: 'tes', je: 'mes', neutre: 'les' };

// Moyenne affichée avec sa décimale, même ronde (« 6,0 ») : tuiles, Ma semaine, consultation.
export function uneDecimale(x) {
  if (x == null || Number.isNaN(x)) return '·';
  return x.toFixed(1).replace('.', ',');
}
export function nombre(x, decimales = 1) {
  if (x == null || Number.isNaN(x)) return '·';
  return x.toFixed(decimales).replace('.', ',').replace(/,0$/, '');
}
// Une valeur 5 vaut « 5 ou plus » : la moyenne n'est alors qu'une borne basse.
export const moyenneReveils = (r) => (r && r.n ? `${r.plafonne ? 'au moins ' : ''}${nombre(r.moyenne)}` : '·');

export function duree(min) {
  if (min == null) return '·';
  const m = Math.round(min);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

// [libellé par défaut, tournure] : la tournure ne sert que tant que l'élément n'est pas renommé.
const FACTEURS_LIEU = {
  'lieu:bureau': ['Bureau', 'une journée au bureau'], 'lieu:teletravail': ['Télétravail', 'une journée en télétravail'],
  'lieu:conge_repos': ['Congé / repos', 'une journée de congé ou de repos'], 'lieu:arret': ['Arrêt', "une journée d'arrêt"],
  'lieu:clinique': ['Clinique', 'une journée à la clinique'], 'lieu:autre': ['Autre', 'un autre lieu'],
};

export function texteFacteur(f, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  if (f.variable === 'lieu') {
    const [defaut, tournure] = FACTEURS_LIEU[f.valeur] || [];
    const actuel = carte && carte.get(f.valeur);
    return tournure && (actuel == null || actuel === defaut) ? tournure : `le lieu « ${lib(f.valeur)} »`;
  }
  if (f.variable === 'sommeil') return `une nuit notée « ${lib(f.valeur)} »`;
  if (f.variable === 'contact') return 'un contact humain';
  if (f.variable === 'sport') return 'du sport ou du mouvement';
  if (f.variable === 'reveil') return 'au moins un réveil nocturne';
  return f.cle;
}

export function phraseConstat(f, carte, voix = 'tu') {
  const sens = f.d >= 0 ? 'Plus présent' : 'Moins présent';
  return `${sens} dans ${POSSESSIF[voix]} journées à 7 ou plus : ${texteFacteur(f, carte)} (${f.a} sur ${f.n1}, contre ${f.b} sur ${f.n2} journées à 4 ou moins).`;
}

export function piedObservations(voix = 'tu') {
  return voix === 'neutre' ? 'Ce sont des observations sur les données, pas des causes.' : `Ce sont des observations sur ${voix === 'je' ? 'mes' : 'tes'} données, pas des causes.`;
}

// Phrase sommeil de « Ma semaine » : seulement quand le moteur a un constat (jour même, sinon
// lendemain) ; sinon rien, ni « pas d'écart net » ni « pas encore assez ».
export function phraseSommeilSemaine(res, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  const sens = (e) => (e.haut[1].moyenne > e.bas[1].moyenne ? 'plus basse' : 'plus haute');
  const m = res.meme; const l = res.lendemain;
  const meme = m.statut === 'ok' && m.constat && extremesFiables(m.moyennes);
  if (meme) return `Une nuit notée ${lib(meme.bas[0])} va avec une humeur ${sens(meme)} le jour même (${nombre(meme.bas[1].moyenne)} contre ${nombre(meme.haut[1].moyenne)} après une nuit ${lib(meme.haut[0])}).`;
  const lend = l.statut === 'ok' && l.constat && extremesFiables(l.moyennes);
  if (lend) return `Le lendemain, une nuit notée ${lib(lend.bas[0])} va avec une humeur ${sens(lend)} (${nombre(lend.bas[1].moyenne)} contre ${nombre(lend.haut[1].moyenne)}).`;
  return null;
}

// Phrases sommeil et humeur (aucune ne dit « provoque »).
export function phrasesSommeil(res, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  const phrases = [];
  const m = res.meme; const l = res.lendemain;
  if (m.statut !== 'ok' && l.statut !== 'ok') return [PAS_ASSEZ];
  const sens = (e) => (e.haut[1].moyenne > e.bas[1].moyenne ? 'plus basse' : 'plus haute');
  const memeAffiche = m.statut === 'ok' && m.constat && extremesFiables(m.moyennes);
  if (m.statut === 'ok') {
    if (memeAffiche) {
      const e = memeAffiche;
      phrases.push(`Une nuit notée ${lib(e.bas[0])} va avec une humeur ${sens(e)} le jour même (${nombre(e.bas[1].moyenne)} contre ${nombre(e.haut[1].moyenne)} après une nuit ${lib(e.haut[0])}).`);
    } else phrases.push('Le jour même, pas d\'écart net.');
  }
  const lendAffiche = l.statut === 'ok' && l.constat && extremesFiables(l.moyennes);
  if (l.statut === 'ok') {
    if (lendAffiche) {
      const e = lendAffiche;
      phrases.push(`Le lendemain, une nuit notée ${lib(e.bas[0])} va${memeAffiche ? ' encore' : ''} avec une humeur ${sens(e)} (${nombre(e.bas[1].moyenne)} contre ${nombre(e.haut[1].moyenne)}).`);
    } else phrases.push('Le lendemain, pas d\'écart net.');
  }
  if (res.suite && (memeAffiche || lendAffiche)) phrases.push(`Les nuits notées ${lib('sommeil:mal')} arrivent souvent à la suite, donc le jour même et le lendemain se recouvrent en partie.`);
  return phrases;
}

const NOMS_SOURCE = { declencheur: 'épisodes', dessous: 'épisodes', emotion: 'épisodes', reaction: 'épisodes', symptome: 'symptômes', effetSecondaire: 'mentions' };

export function phraseClassement(liste, c, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  if (c.statut === 'aucun') return liste === 'effetSecondaire' ? 'Aucun effet noté sur la période' : 'Rien de noté sur la période';
  const hors = c.hors.map((h) => `hors « ${lib(h.id)} » : ${h.n}`).join(', ');
  if (liste === 'effetSecondaire' && c.classables === 0) return `Aucun effet noté sur la période${hors ? ` (${hors})` : ''}`;
  if (c.statut === 'insuffisant') return PAS_ASSEZ;
  const tete = c.top.length > 1 ? `à égalité : ${c.top.map(lib).join(' et ')}` : lib(c.top[0]);
  return `${tete} · ${c.nTop} ${NOMS_SOURCE[liste]} sur ${c.total}${hors ? ` (${hors})` : ''}`;
}
