// Rendu SVG des trois graphiques. Couleurs par classes (aucun style dans le SVG).
import { html, useState } from '../lib.js';
import { DIM, geometrieHumeur, geometrieExplosions, geometrieSommeil, etiquettesSemaines } from './geometrie.js';
import { nombre } from '../../analyse/textes.js';
import { formaterSemaine } from '../../domain/dates.js';

const Axe = ({ semaines }) => etiquettesSemaines(semaines).filter((e) => e.visible).map((e) => html`<text class="g-axe" x=${e.x} y=${DIM.hauteur - 6} text-anchor="middle">${e.texte}</text>`);

function Cadre({ titre, resume, tableau, children }) {
  const [voirTableau, setVoirTableau] = useState(false);
  return html`<figure class="graphe">
    <figcaption><strong>${titre}</strong><span class="discret">${resume}</span></figcaption>
    ${voirTableau ? tableau : html`<svg viewBox=${`0 0 ${DIM.largeur} ${DIM.hauteur}`} role="img" aria-label=${`${titre}. ${resume}`}>${children}</svg>`}
    <button type="button" class="btn-lien" onClick=${() => setVoirTableau(!voirTableau)}>${voirTableau ? 'Voir le graphique' : 'Voir en tableau'}</button>
  </figure>`;
}

const tableauSimple = (semaines, colonne, valeur) => html`<table class="tableau-simple"><thead><tr><th>Semaine</th><th>${colonne}</th></tr></thead>
  <tbody>${semaines.map((s) => html`<tr><td>${formaterSemaine(s.lundi).replace('Semaine du ', '')}</td><td>${valeur(s)}</td></tr>`)}</tbody></table>`;

export function GrapheHumeur({ semaines }) {
  const g = geometrieHumeur(semaines);
  const valeurs = semaines.filter((s) => s.humeur != null).map((s) => s.humeur);
  const resume = valeurs.length ? `Moyenne par semaine, de ${nombre(Math.min(...valeurs))} à ${nombre(Math.max(...valeurs))}.` : '';
  return html`<${Cadre} titre="Humeur" resume=${resume}
    tableau=${tableauSimple(semaines, 'Humeur moyenne', (s) => (s.humeur == null ? '·' : `${nombre(s.humeur)}${s.fragile ? ' (peu de valeurs)' : ''}`))}>
    ${g.graduations.map((t) => html`<text class="g-axe" x="4" y=${t.y + 3}>${t.v}</text>`)}
    ${g.filets.map((f) => html`<line class="g-filet" x1=${DIM.gauche} x2=${DIM.largeur - DIM.droite} y1=${f.y} y2=${f.y} />`)}
    ${g.segments.map((s) => html`<line class="g-ligne" x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} />`)}
    ${g.points.map((p) => html`<circle class=${p.plein ? 'g-point' : 'g-anneau'} cx=${p.x} cy=${p.y} r="3.5" />`)}
    <${Axe} semaines=${semaines} />
  </${Cadre}>
  ${g.points.some((p) => !p.plein) && html`<p class="discret legende">○ moyenne fragile (peu de valeurs)</p>`}`;
}

export function GrapheExplosions({ semaines }) {
  const g = geometrieExplosions(semaines);
  const total = semaines.reduce((s, x) => s + (x.explosions || 0), 0);
  return html`<${Cadre} titre="Explosions" resume=${`${total} sur ${semaines.length} semaines.`}
    tableau=${tableauSimple(semaines, 'Explosions', (s) => (s.explosions == null ? '·' : s.explosions))}>
    <line class="g-filet" x1=${DIM.gauche} x2=${DIM.largeur - DIM.droite} y1=${g.base} y2=${g.base} />
    ${g.barres.map((b) => html`<rect class="g-barre" x=${b.x} y=${b.y} width=${b.l} height=${b.h} rx="2" />`)}
    <${Axe} semaines=${semaines} />
  </${Cadre}>`;
}

export function GrapheSommeil({ semaines, carte }) {
  const g = geometrieSommeil(semaines);
  const lib = (id) => carte.get(id) || id;
  return html`<${Cadre} titre="Sommeil" resume=${`Nuits par semaine : ${lib('sommeil:mal')}, ${lib('sommeil:moyen')}, ${lib('sommeil:bien')}.`}
    tableau=${tableauSimple(semaines, `${lib('sommeil:mal')} · ${lib('sommeil:moyen')} · ${lib('sommeil:bien')}`, (s) => (s.sommeil ? `${s.sommeil.mal} · ${s.sommeil.moyen} · ${s.sommeil.bien}` : '·'))}>
    <line class="g-filet" x1=${DIM.gauche} x2=${DIM.largeur - DIM.droite} y1=${g.base} y2=${g.base} />
    ${g.piles.map((p) => p.morceaux.map((m) => html`<rect class=${`g-${m.classe}`} x=${p.x} y=${m.y} width=${p.l} height=${m.h} />`))}
    <${Axe} semaines=${semaines} />
  </${Cadre}>
  <p class="discret legende"><span class="pastille-legende g-sommeil-1"></span>${lib('sommeil:mal')} <span class="pastille-legende g-sommeil-2"></span>${lib('sommeil:moyen')} <span class="pastille-legende g-sommeil-3"></span>${lib('sommeil:bien')}</p>`;
}
