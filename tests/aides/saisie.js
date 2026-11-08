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

// Un glissement au doigt (v7, B4 ; tests/e2e/v7-aujourdhui.spec.js jusqu'à la v10) : posé au centre de l'élément visé,
// déplacé de (dx, dy), levé après `duree` ms d'horloge (0 : levé aussitôt, sans attendre).
export async function glisser(page, selecteur, dx, dy = 0, duree = 300) {
  const depart = await page.locator(selecteur).first().evaluate((el, d) => {
    const r = el.getBoundingClientRect();
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    if (!d.duree) el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + d.dx, clientY: y + d.dy, bubbles: true }));
    return [x, y];
  }, { dx, dy, duree });
  if (!duree) return;
  await page.clock.runFor(duree);
  await page.locator(selecteur).first().evaluate((el, [x, y, ddx, ddy]) => {
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + ddx, clientY: y + ddy, bubbles: true }));
  }, [...depart, dx, dy]);
}

// La roue (v11, ui/composants/roue-choix.js) au doigt : le doigt posé au milieu de la bande (touchstart), puis, pour chaque
// libellé tour à tour, le doigt qui va de côté (touchmove, à l'opposé du défilement) et la bande amenée sur lui
// (scrollLeft, en attendant son `scroll`), puis le doigt levé (touchend). Seul un `scroll` reçu après que le doigt a bougé
// de côté compte pour un glissement (relecture finale). `roue` : le groupe (un locator). La fin du glissement vient 150 ms
// après le dernier `scroll` ou le touchend, à l'horloge de l'app. Les points de contact passent par document.createTouch
// (WebKit, où le constructeur Touch est refusé), sinon par Touch.
export async function glisserRoue(roue, ...libelles) {
  await roue.evaluate(async (g, noms) => {
    const bande = g.querySelector('.roue-defile') || g;
    const r = bande.getBoundingClientRect();
    const y = r.top + r.height / 2;
    let x = r.left + r.width / 2;
    const doigt = (type, enContact) => {
      const t = typeof document.createTouch === 'function'
        ? document.createTouch(window, bande, 1, x + scrollX, y + scrollY, x, y)
        : new Touch({ identifier: 1, target: bande, clientX: x, clientY: y });
      const liste = (l) => (typeof document.createTouchList === 'function' ? document.createTouchList(...l) : l);
      bande.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: liste(enContact ? [t] : []), changedTouches: liste([t]) }));
    };
    doigt('touchstart', true);
    for (const nom of noms) {
      const b = [...bande.querySelectorAll('button')].find((v) => v.textContent.trim() === nom);
      if (!b) throw new Error(`roue : « ${nom} » introuvable`);
      const q = b.getBoundingClientRect();
      const cible = bande.scrollLeft + (q.left + q.width / 2) - (r.left + r.width / 2);
      if (Math.abs(cible - bande.scrollLeft) < 0.5) continue;
      x -= cible - bande.scrollLeft;
      doigt('touchmove', true);
      await new Promise((ok) => { bande.addEventListener('scroll', ok, { once: true }); bande.scrollLeft = cible; });
    }
    doigt('touchend', false);
  }, libelles);
}
