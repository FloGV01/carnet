// Fixture Playwright : toute requête vers une autre origine, toute violation de CSP
// et toute erreur en console font échouer le test.
// v11 (7/11) : option `hotesPermis`, pour le seul fichier de la connexion à Spotify (tests/e2e/v11-spotify.spec.js), avec
// `test.use({ hotesPermis: [...] })`. Les requêtes vers ces hôtes sont admises, et les erreurs de console nées d'une adresse
// de ces hôtes aussi (un 403 simulé en écrit une). Ces requêtes doivent toutes être interceptées par le test (page.route) :
// la garde en pose une, en dernier recours, qui coupe toute requête vers une autre origine sans réponse simulée. Partout
// ailleurs, la liste est vide et rien ne change.
import { test as base, expect } from '@playwright/test';

const permis = (url, hotes) => {
  try { return hotes.includes(new URL(url).hostname); } catch { return false; }
};

export const test = base.extend({
  hotesPermis: [[], { option: true }],
  page: async ({ page, hotesPermis }, use) => {
    const fautes = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !permis(m.location().url, hotesPermis)) fautes.push(`console : ${m.text()}`);
    });
    page.on('pageerror', (e) => fautes.push(`exception : ${e.message}`));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (['blob:', 'data:'].includes(u.protocol)) return;
      if (u.hostname !== '127.0.0.1' && !hotesPermis.includes(u.hostname)) fautes.push(`requête externe : ${r.url()}`);
    });
    // Posée avant celles du test, elle ne sert que si aucune ne répond : aucune requête ne part jamais pour de bon.
    if (hotesPermis.length) await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
    await use(page);
    expect(fautes, 'gardes').toEqual([]);
  },
});
export { expect };
