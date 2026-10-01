// Aides de parcours : toucher un choix d'un groupe, lire l'entrée du jour en base.
export const groupe = (page, nom) => page.getByRole('group', { name: nom, exact: true });
export async function toucher(page, groupeNom, libelle) {
  await groupe(page, groupeNom).getByRole('button', { name: new RegExp(`(^|\\s|: )${libelle}$`) }).first().click();
}
export const entreeDuJour = (page, date) => page.evaluate((d) => window.__carnet.repo.journal.lire(d || window.__carnet.repo.aujourdhui()), date);
export async function viderBase(page) {
  await page.evaluate(async () => {
    await window.__carnet.repo.fermer();
    await new Promise((ok) => { const r = indexedDB.deleteDatabase('carnet'); r.onsuccess = ok; r.onerror = ok; r.onblocked = ok; });
    localStorage.clear();
  });
  await page.reload();
  await appPrete(page);
}

// L'app ramène toujours sur Aujourd'hui à son démarrage : on attend qu'elle soit prête
// avant tout changement d'écran, sinon le démarrage annule la navigation.
export async function appPrete(page) {
  await page.waitForFunction(() => Boolean(window.__carnet) && Boolean(document.querySelector('.app')));
}
export async function aller(page, hash) {
  await appPrete(page);
  await page.evaluate((h) => { location.hash = h; }, hash);
}
