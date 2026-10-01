// Demande à iOS de protéger le stockage de l'app contre l'effacement automatique.
export async function demanderPersistance(nav = globalThis.navigator) {
  try {
    if (!nav.storage || !nav.storage.persist) return null;
    if (await nav.storage.persisted()) return true;
    return await nav.storage.persist();
  } catch { return null; }
}

export async function etatStockage(nav = globalThis.navigator) {
  const res = { persiste: null, utilise: null, quota: null };
  try {
    if (nav.storage && nav.storage.persisted) res.persiste = await nav.storage.persisted();
    if (nav.storage && nav.storage.estimate) {
      const e = await nav.storage.estimate();
      res.utilise = e.usage ?? null;
      res.quota = e.quota ?? null;
    }
  } catch { /* indisponible */ }
  return res;
}

export function formaterOctets(n) {
  if (n == null) return '·';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} ko`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} Go`;
}
