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

// Les zones sûres de l'iPhone dans l'app installée (v8, Q27, spec §12.7) : 47 px en haut (encoche) et 34 en bas (barre
// d'accueil), les valeurs standard en 390 × 844. WebKit sans iPhone les met à 0 : on les pose sur les variables de
// tokens.css (--zone-*), par lesquelles passe toute l'app, à chaque chargement de la page (rechargements compris).
export async function simulerZonesSures(page, { haut = 47, bas = 34 } = {}) {
  const poser = (z) => {
    const appliquer = () => {
      document.documentElement.style.setProperty('--zone-haut', `${z.haut}px`);
      document.documentElement.style.setProperty('--zone-bas', `${z.bas}px`);
    };
    if (document.documentElement) { appliquer(); return; }
    new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); appliquer(); } }).observe(document, { childList: true });
  };
  await page.addInitScript(poser, { haut, bas });
  await page.evaluate(poser, { haut, bas });
}
