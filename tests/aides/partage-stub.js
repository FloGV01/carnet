// Remplace navigator.share / canShare : capture les fichiers partagés (vrai chemin de l'app).
export async function installerPartageFactice(page, { accepter = true } = {}) {
  await page.addInitScript((ok) => {
    window.__partages = [];
    navigator.canShare = (d) => Boolean(ok && d && d.files && d.files.length);
    navigator.share = async (d) => {
      const lus = [];
      for (const f of d.files || []) lus.push({ nom: f.name, type: f.type, octets: Array.from(new Uint8Array(await f.arrayBuffer())) });
      window.__partages.push(lus);
    };
  }, accepter);
}
export const fichiersPartages = (page) => page.evaluate(() => window.__partages.flat());
