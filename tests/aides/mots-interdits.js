// Liste unique des formulations interdites (plan §6.7). Comparaison sans accents ni casse.
export const MOTS_INTERDITS = [
  'bravo', 'felicit*', 'bien joue', 'super', 'genial', 'parfait', 'continue comme ca',
  'serie', 'series', 'streak', 'record', 'score', 'scores', 'badge', 'badges', 'niveau', 'defi', 'defis',
  "jours d'affilee", 'barre de progression', 'jours remplis', 'jours notes', 'x/7',
  'alerte', 'attention', 'danger', 'risque', 'rechute', 'decrochage', 'crise imminente', 'inquietant', 'anormal',
  'obligatoire', 'requis', 'tu devrais', 'il faut', 'pense a', "n'oublie pas", "tu n'as pas",
  'oubli*', 'manque', 'manques', 'manquee', 'manquees', 'rattrap*', 'en retard', 'incomplet*',
  'bonne journee', 'mauvaise journee', 'journees difficiles', 'emotions positives', 'emotions negatives',
  'que ressens-tu', 'comment te sens-tu', 'pourquoi as-tu reagi',
  // v4 (Après coup, Analyse) : jamais de conseil rétrospectif.
  'aurait fallu', 'tu aurais pu', 'tu aurais du',
];

export function normaliser(texte) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'");
}

function versRegex(motif) {
  const prefixe = motif.endsWith('*');
  const corps = (prefixe ? motif.slice(0, -1) : motif).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`(^|[^a-z0-9_])${corps}${prefixe ? '' : '(?![a-z0-9_])'}`, 'i');
}
export const REGEX_INTERDITS = MOTS_INTERDITS.map((m) => [m, versRegex(m)]);

// Il y a N jours (compteur de jours écoulés)
export const REGEX_IL_Y_A = /il y a \$?\{?[\w.]*\}? ?jours?/i;

export function trouverInterdits(texte) {
  const n = normaliser(texte);
  const res = REGEX_INTERDITS.filter(([, re]) => re.test(n)).map(([m]) => m);
  if (REGEX_IL_Y_A.test(n)) res.push('il y a N jours');
  if (/\p{Extended_Pictographic}/u.test(texte.replace(/[✕✓▸▾‹›↑↓→·…©®™]/g, ''))) res.push('emoji');
  return res;
}
