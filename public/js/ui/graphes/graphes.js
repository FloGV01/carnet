// Graphiques de l'écran Analyse (v5), rendus en SVG. Couleurs par classes (aucun style dans le
// SVG ni en ligne) : chaque rangée porte la teinte de sa rubrique ; les émotions du moment, la couleur de
// leur famille (.emo-*, roue et graphiques d'émotions seulement). Toucher une colonne affiche
// son détail sous le graphique ; « Voir en tableau » reste la voie accessible. Seuls les jours
// (semaines, mois) avec une donnée se touchent ou ont une ligne : rien ne signale un jour vide.
import { html, useState } from '../lib.js';
import { geometrieMesJours, geometrieJournee } from './geometrie.js';
import { nombre, uneDecimale } from '../../analyse/textes.js';
import { formaterJour, formaterDateNumerique, MOIS } from '../../domain/dates.js';
import { FAMILLES, familleDe, libelleEmotion } from '../../domain/roue.js';
import { minusculeInitiale } from '../../domain/phrase.js';
import { versHash } from '../../routeur.js';
import { resumeContacts } from '../../domain/contacts.js';

// Le cadre commun : titre, graphique (ou son tableau), légende, détail touché, « Voir en tableau », pied.
// `corps` remplace le SVG unique (dim, aria, children) quand un graphique se dessine en plusieurs morceaux.
// Sans `rubrique` (v7 : Mes jours, Ta journée, les graphiques d'émotions), le titre n'a pas de point de couleur : les
// rangées et les familles portent les leurs.
export function Cadre({ titre, rubrique = null, droite, resume, tableau, legende, detail, dim, aria, pied, corps, children }) {
  const [voirTableau, setVoirTableau] = useState(false);
  return html`<figure class=${rubrique ? `graphe teinte-${rubrique}` : 'graphe'}>
    <figcaption>
      <span class="graphe-tete"><span class="graphe-titre">${rubrique && html`<span class="point-rubrique" aria-hidden="true"></span>`}${titre}</span>
        ${droite && html`<span class="graphe-droite">${droite}</span>`}</span>
      ${resume && html`<span class="graphe-resume">${resume}</span>`}
    </figcaption>
    ${voirTableau ? tableau : html`${corps || html`<svg viewBox=${`0 0 ${dim.largeur} ${dim.hauteur}`} role="img" aria-label=${aria}>${children}</svg>`}${legende}${detail}`}
    <button type="button" class="btn-lien bascule-graphe" onClick=${() => setVoirTableau(!voirTableau)}>${voirTableau ? 'Voir le graphe' : 'Voir en tableau'}</button>
    ${pied && html`<p class="pied-section">${pied}</p>`}
  </figure>`;
}

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const nomMois = (cle) => `${MOIS[Number(cle.slice(5, 7)) - 1]} ${cle.slice(0, 4)}`;

// Libellé d'une colonne : « mar 30 sept. », « semaine du 29/09 », « septembre 2026 ».
function nomColonne(pas, c) {
  if (pas === 'jour') return formaterJour(c.cle);
  if (pas === 'semaine') return `semaine du ${formaterDateNumerique(c.cle).slice(0, 5)}`;
  return nomMois(c.cle);
}

// Les familles de la roue présentes dans un compte (ou une liste de familles), dans leur ordre : la légende des couleurs.
export function famillesPresentes(familles) {
  const vues = new Set(Array.isArray(familles) ? familles : Object.keys(familles || {}).filter((f) => familles[f] > 0));
  return FAMILLES.filter((f) => vues.has(f.cle));
}
export const LegendeFamilles = ({ familles }) => familles.map((f) => html`<span class=${`emo-${f.cle}`}><svg viewBox="0 0 12 12" aria-hidden="true"><circle class="g-emo" cx="6" cy="6" r="4" /></svg>${f.libelle}</span>`);
// La rampe du sommeil et celle de l'énergie, une case par niveau : « du clair au foncé » serait faux en sombre, où la
// rampe va du foncé au clair (v7).
export const LegendeRampe = ({ classes, libelles, teinte = null, prefixe = '', suffixe = '' }) => html`<span class=${teinte ? `rampe teinte-${teinte}` : 'rampe'}>${prefixe}
  ${classes.map((c, i) => html`<span class="pas-rampe"><svg viewBox="0 0 12 12" aria-hidden="true"><rect class=${`g-${c}`} x="1" y="1" width="10" height="10" /></svg>${libelles[i]}</span>`)}${suffixe}</span>`;
export const LegendeNuits = ({ lib }) => html`<${LegendeRampe} classes=${['sommeil-1', 'sommeil-2', 'sommeil-3']} prefixe="nuit"
  libelles=${['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'].map((id) => lib(id).toLowerCase())} />`;
export const LegendeEnergie = ({ lib, unite }) => html`<${LegendeRampe} classes=${['energie-1', 'energie-2', 'energie-3']} teinte="energie" prefixe="énergie"
  libelles=${['energie:basse', 'energie:moyenne', 'energie:haute'].map((id) => lib(id).toLowerCase())} suffixe=${unite} />`;

// « colère 3 · sérénité 2 » : un compte par famille, dans l'ordre de la roue, sans les familles à zéro.
export const texteFamilles = (compte) => FAMILLES.filter((f) => compte && compte[f.cle] > 0).map((f) => `${minusculeInitiale(f.libelle)} ${compte[f.cle]}`).join(' · ');
// « irrité, calme » : les émotions notées un jour (le mot, ou la famille seule), dans l'ordre des heures.
export const texteEmotions = (ids) => (ids || []).map((id) => minusculeInitiale(libelleEmotion(id) || id)).join(', ');

// Détail d'une colonne touchée : seulement ce qui est noté. Les anciennes notes de 1 à 10 restent dites (« humeur 6 »).
export function detailColonne(pas, c, lib) {
  const m = [];
  if (pas === 'jour' && (c.emotions || []).length) m.push(`émotions : ${texteEmotions(c.emotions)}`);
  if (pas !== 'jour' && c.nEmotions > 0) m.push(`émotions : ${texteFamilles(c.familles)}`);
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
    if (c.energieBasse > 0) m.push(`${pluriel(c.energieBasse, 'jour', 'jours')} d'énergie basse`);
  }
  return m;
}

const SANS_REPERE = { traits: [], legende: [] };
const UNITE = { jour: 'une colonne par jour', semaine: 'une colonne par semaine', mois: 'une colonne par mois' };

// Les étiquettes des rangées, au début de chaque rangée (2b).
const Etiquettes = ({ g }) => g.libelles.map((r) => r.lignes.map((l) => html`<text class="g-etiquette" x="0" y=${l.y}>${l.texte}</text>`));

// reperes (v6, analyse/reperes.js) : les changements de traitement de la période, en traits numérotés.
// v7 (2b) : une étiquette au début de chaque rangée ; la rangée Émotions en tête (un point par relevé, à la couleur de
// sa famille), la rangée « Humeur (notes) » seulement si la période a des anciennes notes de 1 à 10.
export function MesJours({ frise: f, reperes = SANS_REPERE, carte, aujourdhui }) {
  const [choix, setChoix] = useState(null);
  const lib = (id) => carte.get(id) || id;
  const g = geometrieMesJours(f, { reperes: reperes.traits });
  const d = g.dim;
  const familles = famillesPresentes(f.pas === 'jour' ? f.colonnes.flatMap((c) => (c.emotions || []).map(familleDe)) : f.colonnes.flatMap((c) => Object.keys(c.familles || {}).filter((k) => c.familles[k] > 0)));
  const col = choix != null ? f.colonnes.find((c) => c.cle === choix) : null;
  const zone = choix != null ? g.zones.find((z) => z.cle === choix) : null;
  const avec = f.colonnes.filter((c) => c.aDonnee);
  const rangees = g.rangees.map((r) => r.libelle.join(' ').replace(' (notes)', ' (notes de 1 à 10)').toLowerCase()).join(', ');
  // Sous le graphique comme sous le tableau : « ① 12/10 · changement : … ».
  const legendeReperes = reperes.legende.length > 0 && html`<ul class="legende-reperes" aria-label="Changements de traitement">
    ${reperes.legende.map((r) => html`<li>${r.texte}</li>`)}</ul>`;
  const tableau = html`<table class="tableau-lignes"><thead><tr><th scope="col">${{ jour: 'Jour', semaine: 'Semaine', mois: 'Mois' }[f.pas]}</th><th scope="col">Détail</th></tr></thead>
    <tbody>${avec.map((c) => html`<tr><td>${nomColonne(f.pas, c)}</td><td>${detailColonne(f.pas, c, lib).join(' · ')}</td></tr>`)}</tbody></table>${legendeReperes}`;
  const legende = html`<p class="legende-graphe legende-frise">
    <${LegendeFamilles} familles=${familles} />
    ${g.notes.traits.length > 0 && html`<span><svg viewBox="0 0 12 12" aria-hidden="true" class="teinte-humeur"><line class="g-trait" x1="6" x2="6" y1="1" y2="11" /></svg>note du plus bas au plus haut</span>`}
    <${LegendeNuits} lib=${lib} />
  </p>${legendeReperes}`;
  const detail = col && html`<p class="detail-colonne" role="status"><strong>${nomColonne(f.pas, col)}</strong> · ${detailColonne(f.pas, col, lib).join(' · ')}
    ${f.pas === 'jour' && html` · <a class="lien" href=${col.cle === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: col.cle })}>Voir ce jour</a>`}</p>`;
  return html`<${Cadre} titre="Mes jours" tableau=${tableau} legende=${legende} detail=${detail} dim=${d}
    aria=${`Mes jours, ${UNITE[f.pas]} : ${rangees}. Touche une colonne pour son détail, ou « Voir en tableau ».`}>
    ${zone && html`<rect class="g-choix" x=${zone.x} y="0" width=${zone.l} height=${d.hauteur} rx="3" />`}
    ${g.etiquettes.map((e) => html`<text class="g-axe g-tete" x=${e.x} y=${e.y} text-anchor="middle">${e.texte}</text>`)}
    <line class="g-filet" x1=${g.filet.x1} x2=${g.filet.x2} y1=${g.filet.y} y2=${g.filet.y} />
    <${Etiquettes} g=${g} />
    ${g.reperes.map((r) => html`<line class="g-changement" x1=${r.x} x2=${r.x} y1=${r.y1} y2=${r.y2} />
      <text class="g-changement-num" x=${r.texteX} y=${r.texteY} text-anchor="middle">${r.etiquette}</text>`)}
    ${g.points.map((p) => html`<circle class=${`g-emo emo-${p.famille}`} cx=${p.x} cy=${p.y} r=${p.r} />`)}
    ${g.barres.map((b) => html`<rect class=${`g-emo emo-${b.famille}`} x=${b.x} y=${b.y} width=${b.l} height=${b.h} />`)}
    <g class="teinte-humeur">
      ${g.notes.traits.map((t) => html`<line class="g-trait" x1=${t.x} x2=${t.x} y1=${t.y1} y2=${t.y2} />`)}
      ${g.notes.points.map((p) => html`<circle class=${p.plein ? 'g-point' : 'g-anneau'} cx=${p.x} cy=${p.y} r=${g.largeurColonne < 12 ? 2.5 : 3.5} />`)}
    </g>
    ${g.nuits.map((n) => html`<rect class=${`g-${n.classe}`} x=${n.x} y=${n.y} width=${n.l} height=${n.h} rx="1.5" />`)}
    <g class="teinte-expl">${g.encoches.map((e) => html`<rect class="g-barre" x=${e.x} y=${e.y} width=${e.l} height=${e.h} rx="1.5" />`)}</g>
    <g class="teinte-ep">${g.autres.map((a) => html`<circle class="g-plein" cx=${a.x} cy=${a.y} r=${g.largeurColonne < 12 ? 2.5 : 3.5} />`)}</g>
    <g class="teinte-energie">${g.energieBasse.map((e) => html`<rect class="g-barre" x=${e.x} y=${e.y} width=${e.l} height=${e.h} rx="1.5" />`)}</g>
    ${g.zones.map((z) => html`<rect class="g-zone" x=${z.x} y="0" width=${z.l} height=${d.hauteur} onClick=${() => setChoix(choix === z.cle ? null : z.cle)} />`)}
  </${Cadre}>`;
}

const ENERGIES = [['energie:basse', 'basse'], ['energie:moyenne', 'moyenne'], ['energie:haute', 'haute']];

// Ta journée heure par heure (v7) : les familles des émotions du moment par créneau de 2 h (`parHeure`, emotions.js ;
// null sous le seuil), et l'énergie en jours (`profil`, moments.js).
export function TaJournee({ parHeure, profil, carte }) {
  const [choix, setChoix] = useState(null);
  const lib = (id) => (carte.get(id) || id).toLowerCase();
  const creneaux = profil.statut === 'ok' ? profil.creneaux : [];
  const g = geometrieJournee({ parHeure, creneaux });
  const d = g.dim;
  const parDebut = new Map(creneaux.map((c) => [c.debut, c]));
  const familles = famillesPresentes(Object.fromEntries(FAMILLES.map((f) => [f.cle, g.parCreneau.reduce((s, c) => s + (c.compte[f.cle] || 0), 0)])));
  const texte = (debut) => {
    const c = parDebut.get(debut);
    const e = g.parCreneau.find((x) => x.debut === debut);
    return [e && e.total > 0 && `émotions : ${texteFamilles(e.compte)}`,
      c && ENERGIES.some(([id]) => c.energie[id]) && `énergie : ${ENERGIES.filter(([id]) => c.energie[id]).map(([id]) => `${lib(id)} ${pluriel(c.energie[id], 'jour', 'jours')}`).join(', ')}`].filter(Boolean).join(' · ');
  };
  const nomCreneau = (debut) => `${debut} h – ${(debut + 2) % 24} h`;
  const lignes = g.zones.map((z) => z.debut);
  const zone = choix != null ? g.zones.find((z) => z.debut === choix) : null;
  const tableau = html`<table class="tableau-lignes"><thead><tr><th scope="col">Créneau</th><th scope="col">Détail</th></tr></thead>
    <tbody>${lignes.map((debut) => html`<tr><td>${nomCreneau(debut)}</td><td>${texte(debut)}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <${LegendeFamilles} familles=${familles} />
    ${g.energies.length > 0 && html`<${LegendeEnergie} lib=${lib} unite="(en jours)" />`}
  </p>`;
  const detail = choix != null && html`<p class="detail-colonne" role="status"><strong>${nomCreneau(choix)}</strong> · ${texte(choix)}</p>`;
  const quoi = [parHeure && 'les émotions du moment, par famille', creneaux.length > 0 && "l'énergie, en jours"].filter(Boolean).join(', puis ');
  return html`<${Cadre} titre="Ta journée heure par heure" tableau=${tableau} legende=${legende} detail=${detail} dim=${d}
    aria=${`Ta journée heure par heure, par créneau de 2 heures : ${quoi}. Touche un créneau pour son détail, ou « Voir en tableau ».`}>
    ${zone && html`<rect class="g-choix" x=${zone.x} y="0" width=${zone.l} height=${g.axeY - 6} rx="3" />`}
    <${Etiquettes} g=${g} />
    ${g.barres.map((b) => html`<rect class=${`g-emo emo-${b.famille}`} x=${b.x} y=${b.y} width=${b.l} height=${b.h} />`)}
    <g class="teinte-energie">${g.energies.map((e) => html`<rect class=${`g-${e.classe}`} x=${e.x} y=${e.y} width=${e.l} height=${e.h} />`)}</g>
    ${g.etiquettes.map((e) => html`<text class="g-axe" x=${e.x} y=${g.axeY + 6} text-anchor="middle">${e.texte}</text>`)}
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
