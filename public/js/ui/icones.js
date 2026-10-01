// Icônes au trait, une seule famille (trait 1,75, extrémités arrondies).
import { html } from './lib.js';

const svg = (contenu, etiquette) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden=${etiquette ? null : 'true'} role=${etiquette ? 'img' : null}
  aria-label=${etiquette || null}>${contenu}</svg>`;

export const Icones = {
  aujourdhui: () => svg(html`<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8.5h8M8 12.5h8M8 16.5h5"/>`),
  analyse: () => svg(html`<path d="M4 20V4"/><path d="M4 20h16"/><path d="M7.5 15l3.5-4 3 2.5 4.5-6"/>`),
  historique: () => svg(html`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  soins: () => svg(html`<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M12 13v4M10 15h4"/>`),
  reglages: () => svg(html`<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>`),
  micro: () => svg(html`<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3"/>`),
  stop: () => svg(html`<rect x="7" y="7" width="10" height="10" rx="1.5"/>`),
  lecture: () => svg(html`<path d="M8 5.5v13l10-6.5z"/>`),
  pause: () => svg(html`<path d="M9 5.5v13M15 5.5v13"/>`),
  fermer: () => svg(html`<path d="M6 6l12 12M18 6L6 18"/>`),
  chevron: () => svg(html`<path d="M9 5l7 7-7 7"/>`),
  retour: () => svg(html`<path d="M15 5l-7 7 7 7"/>`),
  plus: () => svg(html`<path d="M12 5v14M5 12h14"/>`),
  loupe: () => svg(html`<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l4.5 4.5"/>`),
  onde: () => svg(html`<path d="M4 12h1.5M8 8v8M11.5 5v14M15 9v6M18.5 11v2"/>`),
};
