// Aides minimales autour d'IndexedDB. Règle : dans une transaction, on n'attend QUE des
// requêtes IndexedDB, sinon WebKit ferme la transaction d'office.
export function req(requete) {
  return new Promise((ok, ko) => {
    requete.onsuccess = () => ok(requete.result);
    requete.onerror = () => ko(requete.error);
  });
}

export function fin(tx) {
  return new Promise((ok, ko) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
    tx.onabort = () => ko(tx.error || new DOMException('Transaction annulée', 'AbortError'));
  });
}

export async function dansTx(db, stores, mode, travail) {
  const tx = db.transaction(stores, mode);
  const termine = fin(tx);
  let resultat;
  try {
    resultat = await travail(tx);
  } catch (e) {
    try { tx.abort(); } catch { /* déjà terminée */ }
    await termine.catch(() => {});
    throw e;
  }
  await termine;
  return resultat;
}
