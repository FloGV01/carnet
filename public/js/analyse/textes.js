// Toutes les phrases de l'analyse, en trois voix : « tu » (app), « je » (export PSY),
// « neutre » (vue soignants). Factuelles, jamais causales, jamais évaluatives.
export const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
export const REGLES = {
  bonnesJournees: 'La règle : au moins 5 journées à 7 ou plus et 5 journées à 4 ou moins, et assez de « oui » et de « non » pour chaque facteur.',
  sommeil: 'La règle : au moins 14 jours où la nuit et l\'humeur sont notées, avec au moins 4 jours pour deux qualités de nuit différentes.',
  classement: 'La règle : au moins 3 éléments notés, et 2 fois le même en tête.',
};

const POSSESSIF = { tu: 'tes', je: 'mes', neutre: 'les' };

export function nombre(x, decimales = 1) {
  if (x == null || Number.isNaN(x)) return '·';
  return x.toFixed(decimales).replace('.', ',').replace(/,0$/, '');
}
export function duree(min) {
  if (min == null) return '·';
  return `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;
}

const FACTEURS_LIEU = {
  'lieu:bureau': 'une journée au bureau', 'lieu:teletravail': 'une journée en télétravail',
  'lieu:conge_repos': 'une journée de congé ou de repos', 'lieu:arret': "une journée d'arrêt",
  'lieu:clinique': 'une journée à la clinique', 'lieu:autre': 'un autre lieu',
};

export function texteFacteur(f, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  if (f.variable === 'lieu') return FACTEURS_LIEU[f.valeur] || `le lieu « ${lib(f.valeur)} »`;
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

function extremes(moyennes) {
  const mal = moyennes['sommeil:mal']; const bien = moyennes['sommeil:bien']; const moy = moyennes['sommeil:moyen'];
  const bas = mal ? ['sommeil:mal', mal] : ['sommeil:moyen', moy];
  const haut = bien ? ['sommeil:bien', bien] : ['sommeil:moyen', moy];
  return { bas, haut };
}

// Phrases sommeil et humeur (aucune ne dit « provoque »).
export function phrasesSommeil(res, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  const phrases = [];
  const m = res.meme; const l = res.lendemain;
  if (m.statut !== 'ok' && l.statut !== 'ok') return [PAS_ASSEZ];
  if (m.statut === 'ok') {
    if (m.constat) {
      const { bas, haut } = extremes(m.moyennes);
      const sens = m.rho >= 0 ? 'plus basse' : 'plus haute';
      phrases.push(`Une nuit notée ${lib(bas[0])} va avec une humeur ${sens} le jour même (${nombre(bas[1].moyenne)} contre ${nombre(haut[1].moyenne)} après une nuit ${lib(haut[0])}).`);
    } else phrases.push('Le jour même, pas d\'écart net.');
  }
  if (l.statut === 'ok') {
    if (l.constat) {
      const { bas, haut } = extremes(l.moyennes);
      const sens = l.rho >= 0 ? 'plus basse' : 'plus haute';
      phrases.push(`Le lendemain, une nuit notée ${lib(bas[0])} va encore avec une humeur ${sens} (${nombre(bas[1].moyenne)} contre ${nombre(haut[1].moyenne)}).`);
    } else phrases.push('Le lendemain, pas d\'écart net.');
  }
  if (res.suite && (m.constat || l.constat)) phrases.push('Les nuits notées Mal arrivent souvent à la suite, donc le jour même et le lendemain se recouvrent en partie.');
  return phrases;
}

const NOMS_SOURCE = { declencheur: 'épisodes', dessous: 'épisodes', emotion: 'épisodes', reaction: 'épisodes', symptome: 'symptômes', effetSecondaire: 'mentions' };

export function phraseClassement(liste, c, carte) {
  const lib = (id) => (carte && carte.get(id)) || id;
  if (c.statut === 'aucun') return liste === 'effetSecondaire' ? 'Aucun effet noté sur la période' : 'Rien de noté sur la période';
  if (c.statut === 'insuffisant') return PAS_ASSEZ;
  const tete = c.top.length > 1 ? `à égalité : ${c.top.map(lib).join(' et ')}` : lib(c.top[0]);
  const hors = c.hors.map((h) => `hors « ${lib(h.id)} » : ${h.n}`).join(', ');
  return `${tete} · ${c.nTop} ${NOMS_SOURCE[liste]} sur ${c.total}${hors ? ` (${hors})` : ''}`;
}
