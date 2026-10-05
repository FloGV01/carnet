// Rendu SVG des trois graphiques. Couleurs par classes (aucun style dans le SVG) : la carte
// porte la teinte de sa rubrique. Un toucher sur une semaine affiche sa valeur ; la vue
// « tableau » reste la voie accessible.
import { html, useState } from '../lib.js';
import { DIM, geometrieHumeur, geometrieExplosions, geometrieSommeil, etiquettesSemaines, colonneSemaine } from './geometrie.js';
import { nombre } from '../../analyse/textes.js';

const LARGEUR_BULLE = 96;
const jourMois = (lundi) => `${Number(lundi.slice(8))}/${lundi.slice(5, 7)}`;

const Axe = ({ semaines }) => etiquettesSemaines(semaines).filter((e) => e.visible)
  .map((e) => html`<text class="g-axe" x=${e.x} y=${DIM.hauteur - 2} text-anchor="middle">${e.texte}</text>`);

// Bulle d'une semaine touchée : au-dessus du point ou de la barre, en dessous si elle sortirait.
function Bulle({ x, y, texte }) {
  const bx = Math.min(Math.max(0, x - LARGEUR_BULLE / 2), DIM.largeur - LARGEUR_BULLE);
  const by = y - 28 < 0 ? y + 8 : y - 28;
  return html`<g class="g-bulle" aria-hidden="true">
    <rect x=${bx} y=${by} width=${LARGEUR_BULLE} height="21" rx="6" />
    <text x=${bx + LARGEUR_BULLE / 2} y=${by + 14.5} text-anchor="middle">${texte}</text>
  </g>`;
}

function Zones({ semaines, avecDonnee, surToucher }) {
  return semaines.map((s, i) => {
    if (!avecDonnee(s)) return null;
    const c = colonneSemaine(i, semaines.length);
    return html`<rect class="g-zone" x=${c.x} y="0" width=${c.l} height=${DIM.hauteur} onClick=${() => surToucher(s.lundi)} />`;
  });
}

function Cadre({ titre, rubrique, droite, resume, tableau, legende, children }) {
  const [voirTableau, setVoirTableau] = useState(false);
  return html`<figure class=${`graphe teinte-${rubrique}`}>
    <figcaption>
      <span class="graphe-tete"><span class="graphe-titre"><span class="point-rubrique" aria-hidden="true"></span>${titre}</span>
        ${droite && html`<span class="graphe-droite">${droite}</span>`}</span>
      <span class="graphe-resume">${resume}</span>
    </figcaption>
    ${voirTableau ? tableau : html`<svg viewBox=${`0 0 ${DIM.largeur} ${DIM.hauteur}`} role="img" aria-label=${`${titre}. ${resume}`}>${children}</svg>${legende}`}
    <button type="button" class="btn-lien bascule-graphe" onClick=${() => setVoirTableau(!voirTableau)}>${voirTableau ? 'Voir le graphe' : 'Voir en tableau'}</button>
  </figure>`;
}

const tableauSimple = (semaines, colonne, valeur, aDonnee) => html`<table class="tableau-lignes"><thead><tr><th scope="col">Semaine</th><th scope="col">${colonne}</th></tr></thead>
  <tbody>${semaines.filter(aDonnee).map((s) => html`<tr><td>Semaine du ${jourMois(s.lundi)}</td><td>${valeur(s)}</td></tr>`)}</tbody></table>`;

export function GrapheHumeur({ semaines }) {
  const [choix, setChoix] = useState(null);
  const g = geometrieHumeur(semaines);
  const valeurs = semaines.filter((s) => s.humeur != null).map((s) => s.humeur);
  const resume = valeurs.length ? `Moyenne par semaine entre ${nombre(Math.min(...valeurs))} et ${nombre(Math.max(...valeurs))}.` : '';
  const point = choix && g.points.find((p) => p.lundi === choix);
  const fragile = g.points.some((p) => !p.plein);
  return html`<${Cadre} titre="Humeur" rubrique="humeur" droite=${`${semaines.length} semaines`} resume=${resume}
    tableau=${tableauSimple(semaines, 'Humeur moyenne', (s) => `${nombre(s.humeur)}${s.fragile ? ' (peu de valeurs)' : ''}`, (s) => s.humeur != null)}
    legende=${fragile && html`<p class="legende-graphe"><svg viewBox="0 0 12 12" aria-hidden="true"><circle class="g-anneau" cx="6" cy="6" r="4" /></svg>moyenne fragile (peu de valeurs)</p>`}>
    ${g.graduations.map((t) => html`<text class="g-axe g-graduation" x="0" y=${t.y}>${t.v}</text>`)}
    ${g.filets.map((f) => html`<line class="g-filet" x1=${DIM.gauche} x2=${DIM.largeur} y1=${f.y} y2=${f.y} />`)}
    ${g.segments.map((s) => html`<line class="g-ligne" x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} />`)}
    ${g.points.map((p) => html`<circle class=${p.plein ? 'g-point' : 'g-anneau'} cx=${p.x} cy=${p.y} r="4.5" />`)}
    <${Axe} semaines=${semaines} />
    <${Zones} semaines=${semaines} avecDonnee=${(s) => s.humeur != null} surToucher=${(l) => setChoix(choix === l ? null : l)} />
    ${point && html`<${Bulle} x=${point.x} y=${point.y} texte=${`${jourMois(point.lundi)} · ${nombre(point.valeur)}`} />`}
  </${Cadre}>`;
}

export function GrapheExplosions({ semaines }) {
  const [choix, setChoix] = useState(null);
  const g = geometrieExplosions(semaines);
  const avec = semaines.filter((s) => s.explosions != null);
  const total = avec.reduce((n, s) => n + s.explosions, 0);
  const plus = avec.length ? Math.max(...avec.map((s) => s.explosions)) : 0;
  const resume = `${total} explosion${total > 1 ? 's' : ''} sur ${semaines.length} semaines, ${plus} au plus en une semaine.`;
  const barre = choix && g.barres.find((b, i) => avec[i] && avec[i].lundi === choix);
  return html`<${Cadre} titre="Explosions" rubrique="expl" resume=${resume}
    tableau=${tableauSimple(semaines, 'Explosions', (s) => s.explosions, (s) => s.explosions != null)}>
    ${g.barres.map((b) => html`<rect class="g-barre" x=${b.x} y=${b.y} width=${b.l} height=${b.h} rx="2" />`)}
    <${Axe} semaines=${semaines} />
    <${Zones} semaines=${semaines} avecDonnee=${(s) => s.explosions != null} surToucher=${(l) => setChoix(choix === l ? null : l)} />
    ${barre && html`<${Bulle} x=${barre.x + barre.l / 2} y=${barre.y} texte=${`${jourMois(choix)} · ${barre.valeur}`} />`}
  </${Cadre}>`;
}

export function GrapheSommeil({ semaines, carte }) {
  const g = geometrieSommeil(semaines);
  const lib = (id) => carte.get(id) || id;
  const tot = { mal: 0, moyen: 0, bien: 0 };
  for (const s of semaines) if (s.sommeil) for (const k of Object.keys(tot)) tot[k] += s.sommeil[k];
  const resume = `Nuits notées : ${tot.mal} ${lib('sommeil:mal')}, ${tot.moyen} ${lib('sommeil:moyen')}, ${tot.bien} ${lib('sommeil:bien')}.`;
  return html`<${Cadre} titre="Sommeil" rubrique="sommeil" resume=${resume}
    tableau=${tableauSimple(semaines, `${lib('sommeil:mal')} · ${lib('sommeil:moyen')} · ${lib('sommeil:bien')}`,
      (s) => `${lib('sommeil:mal')} ${s.sommeil.mal} · ${lib('sommeil:moyen')} ${s.sommeil.moyen} · ${lib('sommeil:bien')} ${s.sommeil.bien}`, (s) => Boolean(s.sommeil))}
    legende=${html`<p class="legende-graphe legende-sommeil">${[['mal', 1], ['moyen', 2], ['bien', 3]].map(([k, n]) => html`<span><span class=${`pastille-legende g-sommeil-${n}`}></span>${lib(`sommeil:${k}`)}</span>`)}</p>`}>
    ${g.piles.map((p) => p.morceaux.map((m) => html`<rect class=${`g-${m.classe}`} x=${p.x} y=${m.y} width=${p.l} height=${m.h} />`))}
    <${Axe} semaines=${semaines} />
  </${Cadre}>`;
}
