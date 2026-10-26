// Outils statistiques purs : la moyenne et la médiane, seules utilisées depuis le retrait des phrases calculées (v7).
// Le reste (tests de permutation, Spearman, Fisher, Wilson…) a été retiré en v8 (Q32) : git le garde.

export const moyenne = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export function mediane(xs) {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}
