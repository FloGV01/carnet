// Graphiques de l'écran Analyse (v5), rendus en SVG. Couleurs par classes (aucun style dans le
// SVG ni en ligne) : chaque rangée porte la teinte de sa rubrique. Toucher une colonne affiche
// son détail sous le graphique ; « Voir en tableau » reste la voie accessible. Seuls les jours
// (semaines, mois) avec une donnée se touchent ou ont une ligne : rien ne signale un jour vide.
import { html, useState } from '../lib.js';
import { DIM_FRISE, DIM_FRISE_ENERGIE, DIM_JOURNEE, geometrieFrise, geometrieJournee } from './geometrie.js';
import { nombre, uneDecimale } from '../../analyse/textes.js';
import { formaterJour, formaterDateNumerique, MOIS } from '../../domain/dates.js';
import { versHash } from '../../routeur.js';
import { resumeContacts } from '../../domain/contacts.js';

// Le cadre commun : titre, graphique (ou son tableau), légende, détail touché, « Voir en tableau », pied.
// `corps` remplace le SVG unique (dim, aria, children) quand un graphique se dessine en plusieurs morceaux.
export function Cadre({ titre, rubrique, droite, resume, tableau, legende, detail, dim, aria, pied, corps, children }) {
  const [voirTableau, setVoirTableau] = useState(false);
  return html`<figure class=${`graphe teinte-${rubrique}`}>
    <figcaption>
      <span class="graphe-tete"><span class="graphe-titre"><span class="point-rubrique" aria-hidden="true"></span>${titre}</span>
        ${droite && html`<span class="graphe-droite">${droite}</span>`}</span>
      ${resume && html`<span class="graphe-resume">${resume}</span>`}
    </figcaption>
    ${voirTableau ? tableau : html`${corps || html`<svg viewBox=${`0 0 ${dim.largeur} ${dim.hauteur}`} role="img" aria-label=${aria}>${children}</svg>`}${legende}${detail}`}
    <button type="button" class="btn-lien bascule-graphe" onClick=${() => setVoirTableau(!voirTableau)}>${voirTableau ? 'Voir le graphe' : 'Voir en tableau'}</button>
    ${pied && html`<p class="pied-section">${pied}</p>`}
  </figure>`;
}

export const Axe = ({ graduations, filets, dim }) => html`
  ${graduations.map((t) => html`<text class="g-axe g-graduation" x="0" y=${t.y}>${t.v}</text>`)}
  ${filets.map((f) => html`<line class="g-filet" x1=${dim.gauche} x2=${dim.largeur} y1=${f.y} y2=${f.y} />`)}`;

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const nomMois = (cle) => `${MOIS[Number(cle.slice(5, 7)) - 1]} ${cle.slice(0, 4)}`;

// Libellé d'une colonne : « mar 30 sept. », « semaine du 29/09 », « septembre 2026 ».
function nomColonne(pas, c) {
  if (pas === 'jour') return formaterJour(c.cle);
  if (pas === 'semaine') return `semaine du ${formaterDateNumerique(c.cle).slice(0, 5)}`;
  return nomMois(c.cle);
}

// Détail d'une colonne touchée : seulement ce qui est noté.
export function detailColonne(pas, c, lib) {
  const m = [];
  if (c.humeur != null) {
    m.push(pas === 'jour' ? `humeur ${nombre(c.humeur)}${c.humeurMin != null && c.humeurMax > c.humeurMin ? ` (de ${c.humeurMin} à ${c.humeurMax})` : ''}`
      : `humeur ${uneDecimale(c.humeur)} en moyenne${c.fragile ? ' (peu de valeurs)' : ''}`);
  }
  if (pas === 'jour') {
    const e = c.entree || {};
    if (c.nuit) m.push(`nuit ${lib(c.nuit).toLowerCase()}`);
    if (e.reveilsNocturnes != null) m.push(e.reveilsNocturnes === 5 ? '5 réveils ou plus' : pluriel(e.reveilsNocturnes, 'réveil', 'réveils'));
    if (c.explosions > 0) m.push(pluriel(c.explosions, 'explosion', 'explosions'));
    if (c.autres > 0) m.push(pluriel(c.autres, 'autre épisode', 'autres épisodes'));
    if (c.energieBasse === true) m.push('énergie basse');
    if (e.lieu) m.push(lib(e.lieu));
    const contacts = resumeContacts(e.contacts, lib);
    if (contacts) m.push(contacts);
    const sport = (e.activites || []).map((a) => [a.type && lib(a.type), a.duree && lib(a.duree)].filter(Boolean).join(', ')).filter(Boolean).join(' · ');
    if (sport) m.push(sport);
  } else {
    if (c.nuits) m.push(`nuits : ${['mal', 'moyen', 'bien'].filter((k) => c.nuits[k]).map((k) => `${lib(`sommeil:${k}`)} ${c.nuits[k]}`).join(' · ')}`);
    if (c.explosions > 0) m.push(pluriel(c.explosions, 'explosion', 'explosions'));
    if (c.autres > 0) m.push(pluriel(c.autres, 'autre épisode', 'autres épisodes'));
    if (c.energieBasse > 0) m.push(`${c.energieBasse} ${c.energieBasse > 1 ? 'jours' : 'jour'} d'énergie basse`);
  }
  return m;
}

export function MesJours({ frise: f, carte, aujourdhui }) {
  const [choix, setChoix] = useState(null);
  const lib = (id) => carte.get(id) || id;
  // La rangée « énergie basse » n'existe que si un relevé d'énergie est noté sur la période.
  const d = f.avecEnergie ? DIM_FRISE_ENERGIE : DIM_FRISE;
  const g = geometrieFrise(f, d);
  const humeurs = f.colonnes.map((c) => c.humeur).filter((h) => h != null);
  const unite = { jour: 'Humeur', semaine: 'Moyenne par semaine', mois: 'Moyenne par mois' }[f.pas];
  const resume = humeurs.length ? `${unite} entre ${nombre(Math.min(...humeurs))} et ${nombre(Math.max(...humeurs))}.` : '';
  const col = choix != null ? f.colonnes.find((c) => c.cle === choix) : null;
  const zone = choix != null ? g.zones.find((z) => z.cle === choix) : null;
  const avec = f.colonnes.filter((c) => c.aDonnee);
  const tableau = html`<table class="tableau-lignes"><thead><tr><th scope="col">${{ jour: 'Jour', semaine: 'Semaine', mois: 'Mois' }[f.pas]}</th><th scope="col">Détail</th></tr></thead>
    <tbody>${avec.map((c) => html`<tr><td>${nomColonne(f.pas, c)}</td><td>${detailColonne(f.pas, c, lib).join(' · ')}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><circle class="g-point" cx="6" cy="6" r="3.5" /></svg>${f.pas === 'jour' ? 'humeur' : 'moyenne'}</span>
    ${g.traits.length > 0 && html`<span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><line class="g-trait" x1="6" x2="6" y1="1" y2="11" /></svg>du plus bas au plus haut</span>`}
    ${f.pas === 'jour' && html`<span><svg viewBox="0 0 16 12" aria-hidden="true" class="teinte-humeur"><line class="g-moyenne" x1="1" x2="15" y1="6" y2="6" /></svg>moyenne des 7 jours</span>`}
    <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect class="g-sommeil-1" x="1" y="1" width="10" height="10" /></svg>nuit ${lib('sommeil:mal').toLowerCase()}, ${lib('sommeil:moyen').toLowerCase()}, ${lib('sommeil:bien').toLowerCase()}, du clair au foncé</span>
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-expl"><rect class="g-barre" x="3" y="1" width="6" height="10" /></svg>explosion</span>
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-ep"><circle class="g-autre" cx="6" cy="6" r="3" /></svg>autre épisode</span>
    ${f.avecEnergie && html`<span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><rect class="g-barre" x="3" y="1" width="6" height="10" /></svg>${f.pas === 'jour' ? 'énergie basse' : 'jours d\'énergie basse'}</span>`}
  </p>`;
  const detail = col && html`<p class="detail-colonne" role="status"><strong>${nomColonne(f.pas, col)}</strong> · ${detailColonne(f.pas, col, lib).join(' · ')}
    ${f.pas === 'jour' && html` · <a class="lien" href=${col.cle === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: col.cle })}>Voir ce jour</a>`}</p>`;
  return html`<${Cadre} titre="Mes jours" rubrique="humeur" resume=${resume} tableau=${tableau} legende=${legende} detail=${detail} dim=${d}
    aria=${`Mes jours. ${resume} Touche une colonne pour son détail, ou « Voir en tableau ».`}>
    <${Axe} graduations=${g.graduations} filets=${g.filets} dim=${d} />
    ${zone && html`<rect class="g-choix" x=${zone.x} y="0" width=${zone.l} height=${d.axeY - 10} rx="3" />`}
    <g class="teinte-humeur">
      ${g.moyenne.map((s) => html`<line class=${f.pas === 'jour' ? 'g-moyenne' : 'g-ligne'} x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} />`)}
      ${g.traits.map((t) => html`<line class="g-trait" x1=${t.x} x2=${t.x} y1=${t.y1} y2=${t.y2} />`)}
      ${g.points.map((p) => html`<circle class=${p.plein ? 'g-point' : 'g-anneau'} cx=${p.x} cy=${p.y} r=${f.pas === 'jour' && g.largeurColonne < 12 ? 2.5 : 4} />`)}
    </g>
    ${g.nuits.map((n) => html`<rect class=${`g-${n.classe}`} x=${n.x} y=${n.y} width=${n.l} height=${n.h} rx="1.5" />`)}
    <g class="teinte-expl">${g.encoches.map((e) => html`<rect class="g-barre" x=${e.x} y=${e.y} width=${e.l} height=${e.h} rx="1.5" />`)}</g>
    <g class="teinte-ep">${g.autres.map((a) => html`<circle class="g-autre" cx=${a.x} cy=${a.y} r="2.5" />`)}</g>
    <g class="teinte-humeur">${g.energieBasse.map((e) => html`<rect class="g-barre" x=${e.x} y=${e.y} width=${e.l} height=${e.h} rx="1.5" />`)}</g>
    ${g.etiquettes.map((e) => html`<text class="g-axe" x=${e.x} y=${d.axeY} text-anchor="middle">${e.texte}</text>`)}
    ${g.zones.map((z) => html`<rect class="g-zone" x=${z.x} y="0" width=${z.l} height=${d.hauteur} onClick=${() => setChoix(choix === z.cle ? null : z.cle)} />`)}
  </${Cadre}>`;
}

const ENERGIES = [['energie:basse', 'basse'], ['energie:moyenne', 'moyenne'], ['energie:haute', 'haute']];

export function TaJournee({ profil, carte }) {
  const [choix, setChoix] = useState(null);
  const lib = (id) => (carte.get(id) || id).toLowerCase();
  const g = geometrieJournee(profil.creneaux);
  const d = DIM_JOURNEE;
  const moyennes = profil.creneaux.map((c) => c.moyenne).filter((m) => m != null);
  const resume = moyennes.length ? `Humeur du moment entre ${nombre(Math.min(...moyennes))} et ${nombre(Math.max(...moyennes))} selon le créneau.` : '';
  const texte = (c) => [c.moyenne != null && `humeur du moment ${uneDecimale(c.moyenne)}${c.fragile ? ' (peu de jours)' : ''}`,
    ENERGIES.some(([id]) => c.energie[id]) && `énergie : ${ENERGIES.filter(([id]) => c.energie[id]).map(([id]) => `${lib(id)} ${pluriel(c.energie[id], 'jour', 'jours')}`).join(', ')}`].filter(Boolean).join(' · ');
  const creneau = (c) => `${c.debut} h – ${c.fin} h`;
  const col = choix != null ? profil.creneaux.find((c) => c.debut === choix) : null;
  const zone = choix != null ? g.zones.find((z) => z.debut === choix) : null;
  const tableau = html`<table class="tableau-lignes"><thead><tr><th scope="col">Créneau</th><th scope="col">Détail</th></tr></thead>
    <tbody>${profil.creneaux.map((c) => html`<tr><td>${creneau(c)}</td><td>${texte(c)}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><circle class="g-point" cx="6" cy="6" r="3.5" /></svg>humeur du moment</span>
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><circle class="g-anneau" cx="6" cy="6" r="3.5" /></svg>moins de 5 jours</span>
    <span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><rect class="g-energie-1" x="1" y="1" width="10" height="10" /></svg>énergie ${lib('energie:basse')}, ${lib('energie:moyenne')}, ${lib('energie:haute')}, du clair au foncé, en jours</span>
  </p>`;
  const detail = col && html`<p class="detail-colonne" role="status"><strong>${creneau(col)}</strong> · ${texte(col)}</p>`;
  return html`<${Cadre} titre="Ta journée heure par heure" rubrique="humeur" resume=${resume} tableau=${tableau} legende=${legende} detail=${detail} dim=${d}
    aria=${`Ta journée heure par heure. ${resume}`}>
    <${Axe} graduations=${g.graduations} filets=${g.filets} dim=${d} />
    ${zone && html`<rect class="g-choix" x=${zone.x} y="0" width=${zone.l} height=${d.axeY - 10} rx="3" />`}
    <g class="teinte-humeur">
      ${g.points.map((p) => html`<circle class=${p.plein ? 'g-point' : 'g-anneau'} cx=${p.x} cy=${p.y} r="4" />`)}
      ${g.energies.map((e) => html`<rect class=${`g-${e.classe}`} x=${e.x} y=${e.y} width=${e.l} height=${e.h} />`)}
    </g>
    ${g.etiquettes.map((e) => html`<text class="g-axe" x=${e.x} y=${d.axeY} text-anchor="middle">${e.texte}</text>`)}
    ${g.zones.map((z) => html`<rect class="g-zone" x=${z.x} y="0" width=${z.l} height=${d.hauteur} onClick=${() => setChoix(choix === z.debut ? null : z.debut)} />`)}
  </${Cadre}>`;
}

// Barres en jours : une ligne par élément (ordre fixe de la liste), un segment par précision,
// d'une seule teinte en rampe, et les comptes écrits en toutes lettres. Aucun total, aucun tri.
export function Barres({ titre, rubrique, lignes, precisions, lib, pied }) {
  const max = Math.max(1, ...lignes.map((l) => l.total));
  const L = 200;
  return html`<figure class=${`graphe barres teinte-${rubrique}`}>
    <figcaption><span class="graphe-tete"><span class="graphe-titre"><span class="point-rubrique" aria-hidden="true"></span>${titre}</span></span></figcaption>
    <ul class="liste-barres">${lignes.map((l) => {
      // Longueur : les jours distincts ; segments : la part de chaque précision dans cette longueur.
      let x = 0;
      const somme = precisions.reduce((n, p) => n + (l.par[p.id] || 0), 0) || 1;
      const longueur = (l.total / max) * L;
      const segments = precisions.filter((p) => l.par[p.id]).map((p) => { const w = (l.par[p.id] / somme) * longueur; const s = { x, w, classe: p.classe }; x += w; return s; });
      return html`<li class="ligne-barre">
        <span class="barre-nom">${l.nom}</span>
        <svg class="barre-svg" viewBox=${`0 0 ${L} 10`} preserveAspectRatio="none" aria-hidden="true">${segments.map((s) => html`<rect class=${`g-${s.classe}`} x=${s.x.toFixed(1)} y="0" width=${Math.max(1, s.w - 1).toFixed(1)} height="10" />`)}</svg>
        <span class="barre-detail">${precisions.filter((p) => l.par[p.id]).map((p) => `${p.nom} : ${l.par[p.id]}`).join(' · ')}</span>
      </li>`;
    })}</ul>
    ${pied && html`<p class="legende-graphe">${pied}</p>`}
  </figure>`;
}
