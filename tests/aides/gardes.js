// Fixture Playwright : toute requête vers une autre origine, toute violation de CSP
// et toute erreur en console font échouer le test.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const fautes = [];
    page.on('console', (m) => { if (m.type() === 'error') fautes.push(`console : ${m.text()}`); });
    page.on('pageerror', (e) => fautes.push(`exception : ${e.message}`));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (['blob:', 'data:'].includes(u.protocol)) return;
      if (u.hostname !== '127.0.0.1') fautes.push(`requête externe : ${r.url()}`);
    });
    await use(page);
    expect(fautes, 'gardes').toEqual([]);
  },
});
export { expect };
