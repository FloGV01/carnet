// Comprendre (v6, spec §2) : les graphiques de l'écran, rendus en SVG à partir des résultats purs de
// analyse/comprendre.js et analyse/emotions.js, au statut « ok » ; sous un seuil, PasAssez dit « Pas encore assez de
// données ». Chacun a une seule teinte, celle de sa rubrique (v7 : un graphique d'émotions prend les couleurs de ses
// familles, et rien d'autre) ; une phrase d'accessibilité fixe, qui dit ce qui est montré et sur quelle période, sans
// valeur ; « Voir en tableau », qui donne les valeurs ; et le pied « Ce sont tes notes, rassemblées : pas des
// causes. ». Jamais de pourcentage. Une valeur absente (n = 0) ne dessine rien et n'a pas de ligne dans le tableau.
import { html, useState } from '../lib.js';
import { Cadre, LegendeFamilles, LegendeEnergie, famillesPresentes, texteFamilles } from './graphes.js';
import { Pourquoi } from '../composants/pourquoi.js';
import { DIM_ALIGNE, DIM_BARRES, DIM_COLONNES, DIM_NUITS, geometrieActivites, geometrieAligne, geometrieBarres, geometrieColonnes, geometrieNuits } from './geometrie.js';
import { PIED_EXPLOSIONS, REGLES_COMPRENDRE } from '../../analyse/textes.js';
import { nombreDeReleves } from '../../analyse/emotions.js';
import { FAMILLES } from '../../domain/roue.js';
import { formaterJour, JOURS, JOURS_COURTS, MOIS, MOIS_COURTS } from '../../domain/dates.js';
import { versHash } from '../../routeur.js';

// Le même pied que « Tes moments » dans l'Analyse.
const PIED = PIED_EXPLOSIONS;
const PEU = '(peu de valeurs)';

// ---------- Textes ----------

// « 6 sur 10 » ; sous 3 valeurs, « 2 sur 2 · (peu de valeurs) » ; sans valeur, rien.
export const libelleCompte = (m) => (m && m.n > 0 ? `${m.oui} sur ${m.n}${m.peu ? ` · ${PEU}` : ''}` : null);
export const libelleAutres = (a) => (a && a.n > 0 ? `les autres jours : ${libelleCompte(a)}` : null);

// Le nom d'une mesure des colonnes (« Émotions · Nuits Mal · Explosions · Énergie basse »).
export function nomMesure(mesure, lib) {
  if (mesure === 'nuitMal') return `Nuits ${lib('sommeil:mal')}`;
  if (mesure === 'energieBasse') return `Énergie ${lib('energie:basse').toLowerCase()}`;
  return mesure === 'explosion' ? 'Explosions' : 'Émotions';
}

const SUR = { '3mois': 'sur les trois derniers mois', tout: 'sur tout ce que tu as noté' };
const AUTRES = ', et un trait pointillé pour les autres jours';
const MONTRE_MESURE = {
  emotions: () => 'une barre des émotions du moment notées, découpée par famille, longue comme le nombre de relevés',
  nuitMal: (lib) => `la part des nuits notées ${lib('sommeil:mal')}`,
  explosion: () => 'la part des jours avec une explosion',
  energieBasse: (lib) => `la part des jours avec une énergie ${lib('energie:basse').toLowerCase()}`,
};
const LEGENDE_MESURE = {
  nuitMal: (lib) => `nuit notée ${lib('sommeil:mal')}`,
  explosion: () => 'jour avec explosion',
  energieBasse: (lib) => `énergie ${lib('energie:basse').toLowerCase()}`,
};
// La teinte d'un graphique en colonnes suit sa mesure (v7 : l'énergie en orange) ; les émotions, leurs familles.
const RUBRIQUE_MESURE = { emotions: null, nuitMal: 'sommeil', explosion: 'expl', energieBasse: 'energie' };

// Chaque graphique : son titre, sa rubrique, ce qu'il montre (pour la phrase d'accessibilité). Graphique aligné :
// aussi ce que comptent ses barres, pour la légende.
const G = {
  explosionsAvant: { titre: 'Avant mes explosions', rubrique: 'expl', reperes: 'Explosions',
    montre: () => `pour chaque élément, une barre par jour, de trois jours avant une explosion au jour même${AUTRES}` },
  explosionsApres: { titre: 'Après mes explosions', rubrique: 'expl', reperes: 'Explosions',
    montre: () => `pour chaque élément, une barre par jour, du lendemain d'une explosion à trois jours après${AUTRES}` },
  energieAvant: { titre: 'Avant mes jours à énergie basse', rubrique: 'energie', reperes: 'Jours à énergie basse',
    montre: () => `pour chaque élément, une barre par jour, de trois jours avant un jour à énergie basse au jour même${AUTRES}` },
  retoursBureau: { titre: "Autour d'un retour au bureau", rubrique: 'lieu', reperes: 'Retours au bureau',
    montre: () => `pour chaque élément, une barre par jour, de la veille d'un retour au bureau à deux jours après${AUTRES}` },
  semaine: { titre: 'Selon le jour de la semaine', montre: (lib, m) => `${MONTRE_MESURE[m](lib)}, pour chaque jour de la semaine` },
  lieu: { titre: 'Selon le lieu', montre: (lib, m) => `${MONTRE_MESURE[m](lib)}, pour chaque lieu` },
  mois: { titre: 'Selon le mois', montre: (lib, m) => `${MONTRE_MESURE[m](lib)}, pour chaque mois` },
  nuits: { titre: 'Tes nuits selon le jour', rubrique: 'sommeil',
    montre: () => 'pour chaque soir de la semaine, un trait du coucher au lever, en heures médianes, de vingt heures en haut à midi en bas' },
  activites: { titre: 'Selon ce que tu faisais', rubrique: 'energie',
    montre: () => "pour chaque activité, une barre découpée en relevés d'énergie basse, moyenne et haute" },
  peseRecharge: { titre: 'Ce qui a pesé, ce qui a rechargé', rubrique: 'energie',
    montre: () => 'deux groupes de barres, une par élément, longue comme le nombre de jours où il est noté' },
  // v7 · émotions du moment
  apresNuit: { titre: 'Après une nuit',
    montre: () => 'pour chaque qualité de nuit, une barre des émotions du moment notées ce jour-là, découpée par famille, longue comme le nombre de relevés' },
  autourExplosions: { titre: 'Autour de tes explosions',
    montre: () => 'une barre des émotions du moment notées dans les heures avant une explosion, une autre dans les heures après, découpées par famille' },
  autourBienEtre: { titre: 'Autour du Bien-être',
    montre: () => 'une barre des émotions du moment notées dans les heures avant une séance lancée depuis Bien-être, une autre dans les heures après, découpées par famille' },
};
export const GRAPHES = Object.keys(G);

// La phrase d'accessibilité : fixe, sans valeur, sans classement ni comparaison. `periode` est la clé du
// sélecteur (« 3mois » ou « tout », PERIODES) : toute autre valeur est une erreur, jamais « Tout » en silence.
export function phraseAria(graphe, periode, lib, mesure = 'emotions') {
  if (typeof periode !== 'string' || !Object.hasOwn(SUR, periode)) throw new Error(`Période inconnue : ${periode}`);
  return `${G[graphe].titre}, ${SUR[periode]} : ${G[graphe].montre(lib, mesure)}. Les valeurs sont dans « Voir en tableau ».`;
}

// Sous un seuil (spec §2.1) : la carte du graphique, son titre, « Pas encore assez de données pour le dire. »
// et « Pourquoi ? », qui donne la règle fixe, sans aucun décompte. La teinte des colonnes suit leur mesure ; les
// colonnes d'émotions ont la règle des émotions (v7).
const regleDe = (graphe, mesure) => {
  if (mesure !== 'emotions' || !['semaine', 'lieu', 'mois'].includes(graphe)) return REGLES_COMPRENDRE[graphe];
  return graphe === 'lieu' ? REGLES_COMPRENDRE.emotionsLieu : REGLES_COMPRENDRE.emotions;
};
export const PasAssez = ({ graphe, mesure = 'emotions' }) => {
  const rubrique = Object.hasOwn(G[graphe], 'rubrique') ? G[graphe].rubrique : RUBRIQUE_MESURE[mesure];
  return html`<figure class=${rubrique ? `graphe teinte-${rubrique}` : 'graphe'}>
    <figcaption><span class="graphe-titre">${rubrique && html`<span class="point-rubrique" aria-hidden="true"></span>`}${G[graphe].titre}</span></figcaption>
    <${Pourquoi} regle=${regleDe(graphe, mesure)} />
  </figure>`;
};

// ---------- Le graphique aligné (spec §2.2) ----------

const DECALAGES = { '-3': '3 jours avant', '-2': '2 jours avant', '-1': 'La veille', 0: 'Le jour même', 1: 'Le lendemain', 2: '2 jours après', 3: '3 jours après' };
const nomDecalage = (graphe, d) => (graphe === 'retoursBureau' && d === 0 ? 'Le jour du retour' : DECALAGES[d]);

const FACTEURS = {
  nuitMal: (lib) => `Nuit notée ${lib('sommeil:mal')}`,
  energieBasse: (lib) => `Énergie ${lib('energie:basse').toLowerCase()}`,
  contactCouteux: (lib) => `Contact ${lib('contactEffet:couteux').toLowerCase()}`,
  bureau: () => 'Journée au bureau',
  explosion: () => 'Explosion',
};
function nomBloc(b, lib) {
  if (b.liste) return `${b.liste === 'pese' ? 'A pesé' : 'A rechargé'} : ${lib(b.cle)}`;
  return FACTEURS[b.cle] ? FACTEURS[b.cle](lib) : lib(b.cle);
}

// Une date qui ouvre son jour ; l'année n'est dite que si ce n'est pas celle d'aujourd'hui.
function LienJour({ date, aujourdhui }) {
  const annee = !aujourdhui || date.slice(0, 4) !== aujourdhui.slice(0, 4);
  return html`<a class="lien" href=${date === aujourdhui ? '#/aujourdhui' : versHash('jour', { date })}>${formaterJour(date, { annee })}</a>`;
}

// Le détail d'une barre touchée, sous son bloc : son compte, puis les jours repères où le facteur vaut oui
// (les 6 de « 6 sur 10 »), chacun ouvre son jour.
const DetailBarre = ({ titre, barre, aujourdhui }) => html`<div class="detail-colonne" role="status">
  <p><strong>${titre}</strong> · ${libelleCompte(barre)}</p>
  ${barre.dates.length > 0 && html`<ul class="dates-barre">${barre.dates.map((date) => html`<li><${LienJour} date=${date} aujourdhui=${aujourdhui} /></li>`)}</ul>`}
</div>`;

// graphe : explosionsAvant, explosionsApres, energieAvant ou retoursBureau. Un SVG par bloc, sous une même
// phrase d'accessibilité ; le détail d'une barre touchée s'affiche sous son bloc.
export function GrapheAligne({ graphe, resultat, periode, carte, aujourdhui }) {
  const [choix, setChoix] = useState(null); // { cle, decalage } : la barre touchée
  const lib = (id) => carte.get(id) || id;
  const conf = G[graphe];
  const { blocs } = resultat;
  const g = geometrieAligne(blocs);
  const d = DIM_ALIGNE;
  const tableau = html`<table class="tableau-lignes tableau-comprendre"><thead><tr><th scope="col">Jour</th><th scope="col">Compte</th></tr></thead>
    ${blocs.map((b) => html`<tbody><tr><th scope="rowgroup" colspan="2">${nomBloc(b, lib)}</th></tr>
      ${b.barres.filter((x) => x.n > 0).map((x) => html`<tr><td>${nomDecalage(graphe, x.decalage)}</td><td>${libelleCompte(x)}</td></tr>`)}
      ${b.autres.n > 0 && html`<tr><td>Les autres jours</td><td>${libelleCompte(b.autres)}</td></tr>`}</tbody>`)}</table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect class="g-barre" x="1" y="3" width="10" height="6" /></svg>${conf.reperes.toLowerCase()}</span>
    <span><svg viewBox="0 0 12 12" aria-hidden="true"><line class="g-repere" x1="6" x2="6" y1="0" y2="12" /></svg>les autres jours</span>
  </p>`;
  const blocSvg = (b, bloc) => {
    const zone = choix && choix.cle === bloc.cle ? b.zones.find((z) => z.decalage === choix.decalage) : null;
    const barre = zone && bloc.barres.find((x) => x.decalage === zone.decalage);
    return html`<svg viewBox=${`0 0 ${d.largeur} ${b.hauteur}`} aria-hidden="true">
      ${zone && html`<rect class="g-choix" x=${zone.x} y=${zone.y} width=${zone.l} height=${zone.h} rx="3" />`}
      <text class="g-titre-bloc" x="0" y=${b.titreY}>${nomBloc(bloc, lib)}</text>
      ${b.lignes.map((l, k) => html`
        <text class="g-axe g-graduation" x="0" y=${l.y}>${nomDecalage(graphe, l.decalage)}</text>
        ${l.barre && html`<rect class="g-piste" x=${l.piste.x} y=${l.piste.y} width=${l.piste.l} height=${l.piste.h} rx="2" />
          ${l.barre.l > 0 && html`<rect class=${l.barre.peu ? 'g-barre g-peu' : 'g-barre'} x=${l.barre.x} y=${l.barre.y} width=${l.barre.l} height=${l.barre.h} rx="2" />`}
          <text class="g-axe g-graduation" x=${d.compteX} y=${l.y}>${libelleCompte(bloc.barres[k])}</text>`}`)}
      ${b.repere && html`
        <line class="g-repere-fond" x1=${b.repere.x} x2=${b.repere.x} y1=${b.repere.y1} y2=${b.repere.y2} />
        <line class="g-repere" x1=${b.repere.x} x2=${b.repere.x} y1=${b.repere.y1} y2=${b.repere.y2} />
        <line class="g-repere" x1=${b.repere.legende.x} x2=${b.repere.legende.x} y1=${b.repere.legende.y1} y2=${b.repere.legende.y2} />
        <text class="g-axe" x=${b.repere.legende.texteX} y=${b.repere.legendeY}>${libelleAutres(bloc.autres)}</text>`}
      ${b.zones.map((z) => html`<rect class="g-zone" x=${z.x} y=${z.y} width=${z.l} height=${z.h}
        onClick=${() => setChoix(zone === z ? null : { cle: bloc.cle, decalage: z.decalage })} />`)}
    </svg>
    ${barre && html`<${DetailBarre} titre=${`${nomBloc(bloc, lib)}, ${nomDecalage(graphe, barre.decalage).toLowerCase()}`} barre=${barre} aujourdhui=${aujourdhui} />`}`;
  };
  const corps = html`<div class="graphe-blocs" role="group" aria-label=${phraseAria(graphe, periode, lib)}>
    ${legende}
    ${g.map((b, i) => blocSvg(b, blocs[i]))}
  </div>`;
  return html`<${Cadre} titre=${conf.titre} rubrique=${conf.rubrique} tableau=${tableau} corps=${corps} pied=${PIED} />`;
}

// ---------- Les colonnes (spec §2.5, graphiques 1, 2 et 5) ----------

const NOM_PAS = { semaine: 'Jour', lieu: 'Lieu', mois: 'Mois' };
const numeroMois = (cle) => Number(cle.slice(5, 7)) - 1;
// Le nom d'une colonne : court sur l'axe (« lun », « Bureau », « oct. »), entier dans le tableau.
const nomCourt = (pas, cle, lib) => (pas === 'semaine' ? JOURS_COURTS[cle] : pas === 'lieu' ? lib(cle) : MOIS_COURTS[numeroMois(cle)]);
const nomLong = (pas, cle, lib) => (pas === 'semaine' ? JOURS[cle] : pas === 'lieu' ? lib(cle) : `${MOIS[numeroMois(cle)]} ${cle.slice(0, 4)}`);
// Le compte d'une barre, sur deux lignes : « 3 », puis « lundis ».
const enDeuxLignes = (libelle) => [libelle.slice(0, libelle.indexOf(' ')), libelle.slice(libelle.indexOf(' ') + 1)];

// pas : semaine, lieu ou mois ; mesure : nuitMal, explosion ou energieBasse (les émotions : GrapheFamilles). Le nombre
// de jours connus n'est que dans le tableau : à l'écran, une barre ne dit que son compte.
export function GrapheColonnes({ pas, mesure, resultat, periode, carte }) {
  const lib = (id) => carte.get(id) || id;
  const { colonnes } = resultat;
  const g = geometrieColonnes({ pas, colonnes });
  const d = DIM_COLONNES;
  const libelles = new Map(colonnes.map((c) => [c.cle, c.libelle]));
  const valeur = (c) => `${c.libelle}${c.fragile ? ` ${PEU}` : ''}`;
  const tableau = html`<table class="tableau-lignes tableau-comprendre"><thead><tr><th scope="col">${NOM_PAS[pas]}</th><th scope="col">${nomMesure(mesure, lib)}</th><th scope="col">Jours connus</th></tr></thead>
    <tbody>${colonnes.filter((c) => c.n > 0).map((c) => html`<tr><td>${nomLong(pas, c.cle, lib)}</td><td>${valeur(c)}</td><td>${c.n}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect class="g-barre" x="3" y="1" width="6" height="10" /></svg>${LEGENDE_MESURE[mesure](lib)}</span>
    ${g.barres.some((b) => b.creuse) && html`<span><svg viewBox="0 0 12 12" aria-hidden="true"><rect class="g-barre-creuse" x="3" y="1" width="6" height="10" /></svg>peu de valeurs</span>`}
  </p>`;
  return html`<${Cadre} titre=${G[pas].titre} rubrique=${RUBRIQUE_MESURE[mesure]} tableau=${tableau} legende=${legende}
    dim=${{ largeur: d.largeur, hauteur: g.hauteur }} aria=${phraseAria(pas, periode, lib, mesure)} pied=${PIED}>
    <line class="g-filet" x1=${g.base.x1} x2=${g.base.x2} y1=${g.base.y} y2=${g.base.y} />
    ${g.barres.map((b) => html`<rect class=${b.creuse ? 'g-barre-creuse' : 'g-barre'} x=${b.x} y=${b.y} width=${b.l} height=${b.h} rx="2" />`)}
    ${g.comptes.map((c) => {
      const [nb, mot] = enDeuxLignes(libelles.get(c.cle));
      return html`<text class="g-axe g-compte" x=${c.x} y=${c.y1} text-anchor="middle">${nb}</text><text class="g-axe" x=${c.x} y=${c.y2} text-anchor="middle">${mot}</text>`;
    })}
    ${g.etiquettes.map((e) => html`<text class="g-axe" x=${e.x} y=${e.y} text-anchor="middle">${nomCourt(pas, e.cle, lib)}</text>`)}
  </${Cadre}>`;
}

// ---------- Les émotions du moment, par famille (v7, spec §5) ----------

const releves = (n) => `${n} relevé${n > 1 ? 's' : ''}`;
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Une barre par ligne, découpée par famille dans l'ordre de la roue, longue comme le nombre de relevés, sur une échelle
// commune ; son nom et son compte au-dessus. Une ligne sans relevé garde son nom, sans barre ni compte. Aucune famille
// n'est additionnée à une autre en score, aucun pourcentage. lignes : [{ cle, nom, compte (par famille), detail? }] ;
// entete : le titre de la première colonne du tableau.
export function GrapheFamilles({ graphe, entete = '', lignes, periode, carte, mesure = 'emotions' }) {
  const lib = (id) => carte.get(id) || id;
  const g = geometrieBarres([{
    cle: graphe, titre: false,
    lignes: lignes.map((l) => ({ cle: l.cle, n: nombreDeReleves(l.compte), parts: FAMILLES.map((f) => ({ n: l.compte[f.cle] || 0, classe: `emo emo-${f.cle}` })) })),
  }]);
  const d = DIM_BARRES;
  const compte = (l) => { const n = nombreDeReleves(l.compte); return n ? [releves(n), l.detail].filter(Boolean).join(' · ') : ''; };
  const familles = famillesPresentes(Object.fromEntries(FAMILLES.map((f) => [f.cle, lignes.reduce((s, l) => s + (l.compte[f.cle] || 0), 0)])));
  const tableau = html`<table class="tableau-lignes tableau-comprendre tableau-familles"><thead><tr><th scope="col">${entete}</th><th scope="col">Familles</th><th scope="col">Relevés</th></tr></thead>
    <tbody>${lignes.filter((l) => nombreDeReleves(l.compte) > 0).map((l) => html`<tr><td>${l.nom}</td><td>${texteFamilles(l.compte)}</td><td>${nombreDeReleves(l.compte)}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise"><${LegendeFamilles} familles=${familles} /></p>`;
  return html`<${Cadre} titre=${G[graphe].titre} tableau=${tableau} legende=${legende}
    dim=${{ largeur: d.largeur, hauteur: g.hauteur }} aria=${phraseAria(graphe, periode, lib, mesure)} pied=${PIED}>
    ${g.groupes[0].lignes.map((l, i) => html`<${LigneBarre} l=${l} nom=${majuscule(lignes[i].nom)} compte=${compte(lignes[i])} d=${d} />`)}
  </${Cadre}>`;
}

// ---------- Tes nuits selon le jour (spec §2.5, graphique 4) ----------

export function GrapheNuits({ resultat, periode }) {
  const { colonnes } = resultat;
  const g = geometrieNuits(colonnes);
  const d = DIM_NUITS;
  const nuits = (c) => `${c.n}${c.fragile ? ` ${PEU}` : ''}`;
  const tableau = html`<table class="tableau-lignes tableau-comprendre"><thead><tr><th scope="col">Soir</th><th scope="col">Coucher</th><th scope="col">Lever</th><th scope="col">Nuits</th></tr></thead>
    <tbody>${colonnes.filter((c) => c.n > 0).map((c) => html`<tr><td>${JOURS[c.cle]}</td><td>${c.heureCoucher}</td><td>${c.heureLever}</td><td>${nuits(c)}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise">
    <span><svg viewBox="0 0 12 12" aria-hidden="true"><line class="g-nuit" x1="6" x2="6" y1="3" y2="9" /></svg>du coucher au lever, heures médianes</span>
    ${g.traits.some((t) => !t.plein) && html`<span><svg viewBox="0 0 12 12" aria-hidden="true"><line class="g-nuit g-pointille" x1="6" x2="6" y1="2" y2="11" /></svg>une ou deux nuits</span>`}
    ${g.marques.length > 0 && html`<span><svg viewBox="0 0 12 12" aria-hidden="true"><polygon class="g-marque" points="2,9 10,9 6,3" /></svg>au-delà de l'axe : l'heure est dans le tableau</span>`}
  </p>`;
  return html`<${Cadre} titre=${G.nuits.titre} rubrique=${G.nuits.rubrique} droite="soir du coucher" tableau=${tableau} legende=${legende}
    dim=${d} aria=${phraseAria('nuits', periode)} pied=${PIED}>
    ${g.graduations.map((t) => html`<text class="g-axe g-graduation" x="0" y=${t.y}>${t.texte}</text>`)}
    ${g.filets.map((f) => html`<line class="g-filet" x1=${f.x1} x2=${f.x2} y1=${f.y} y2=${f.y} />`)}
    ${g.traits.map((t) => html`<line class=${t.plein ? 'g-nuit' : 'g-nuit g-pointille'} x1=${t.x} x2=${t.x} y1=${t.y1} y2=${t.y2} />`)}
    ${g.marques.map((m) => html`<polygon class="g-marque" points=${`${m.x - 4},${m.yBase} ${m.x + 4},${m.yBase} ${m.x},${m.yPointe}`} />`)}
    ${g.etiquettes.map((e) => html`<text class="g-axe" x=${e.x} y=${e.y} text-anchor="middle">${JOURS_COURTS[e.cle]}</text>`)}
  </${Cadre}>`;
}

// ---------- Barres empilées (spec §2.4) ----------

// Une ligne : le nom et le compte au-dessus, puis la barre.
const LigneBarre = ({ l, nom, compte, d }) => html`
  <text class="g-nom" x="0" y=${l.texteY}>${nom}</text>
  <text class="g-axe" x=${d.largeur} y=${l.texteY} text-anchor="end">${compte}</text>
  ${l.segments.map((s) => html`<rect class=${`g-${s.classe}`} x=${s.x} y=${s.y} width=${s.l} height=${s.h} />`)}`;

// Selon ce que tu faisais : une barre par activité, en relevés d'énergie basse, moyenne et haute.
export function GrapheActivites({ resultat, periode, carte }) {
  const lib = (id) => carte.get(id) || id;
  const { activites } = resultat;
  const g = geometrieActivites(activites);
  const d = DIM_BARRES;
  const tableau = html`<table class="tableau-lignes tableau-comprendre"><thead><tr><th scope="col">Activité</th>
    ${['energie:basse', 'energie:moyenne', 'energie:haute'].map((id) => html`<th scope="col">${lib(id)}</th>`)}<th scope="col">Relevés</th></tr></thead>
    <tbody>${activites.map((a) => html`<tr><td>${lib(a.id)}</td><td>${a.basse}</td><td>${a.moyenne}</td><td>${a.haute}</td><td>${a.n}</td></tr>`)}</tbody></table>`;
  const legende = html`<p class="legende-graphe legende-frise"><${LegendeEnergie} lib=${lib} unite="(en relevés)" /></p>`;
  return html`<${Cadre} titre=${G.activites.titre} rubrique=${G.activites.rubrique} tableau=${tableau} legende=${legende}
    dim=${{ largeur: d.largeur, hauteur: g.hauteur }} aria=${phraseAria('activites', periode, lib)} pied=${PIED}>
    ${g.groupes[0].lignes.map((l, i) => html`<${LigneBarre} l=${l} nom=${lib(activites[i].id)} compte=${activites[i].libelle} d=${d} />`)}
  </${Cadre}>`;
}

// Ce qui a pesé, ce qui a rechargé : deux groupes, dans l'ordre des listes, sur une même échelle. Un groupe
// vide garde son titre, sans rien dessous (ni « 0 », ni « aucun »).
const GROUPES = [['pese', 'Ce qui a pesé'], ['recharge', 'Ce qui a rechargé']];

export function GraphePeseRecharge({ resultat, periode, carte }) {
  const lib = (id) => carte.get(id) || id;
  const g = geometrieBarres(GROUPES.map(([cle]) => ({
    cle, titre: true, lignes: resultat[cle].map((e) => ({ cle: e.id, n: e.n, parts: [{ n: e.n, classe: 'barre' }] })),
  })));
  const d = DIM_BARRES;
  const tableau = html`<table class="tableau-lignes tableau-comprendre"><thead><tr><th scope="col">Élément</th><th scope="col">Jours</th></tr></thead>
    ${GROUPES.map(([cle, titre]) => html`<tbody><tr><th scope="rowgroup" colspan="2">${titre}</th></tr>
      ${resultat[cle].map((e) => html`<tr><td>${lib(e.id)}</td><td>${e.libelle}</td></tr>`)}</tbody>`)}</table>`;
  return html`<${Cadre} titre=${G.peseRecharge.titre} rubrique=${G.peseRecharge.rubrique} tableau=${tableau}
    dim=${{ largeur: d.largeur, hauteur: g.hauteur }} aria=${phraseAria('peseRecharge', periode, lib)} pied=${PIED}>
    ${g.groupes.map((gr, i) => html`<text class="g-titre-bloc" x="0" y=${gr.titreY}>${GROUPES[i][1]}</text>
      ${gr.lignes.map((l, k) => html`<${LigneBarre} l=${l} nom=${lib(resultat[gr.cle][k].id)} compte=${resultat[gr.cle][k].libelle} d=${d} />`)}`)}
  </${Cadre}>`;
}

// Les colonnes de Comprendre (jour de la semaine, lieu, mois) à la mesure « Émotions » : une ligne par colonne, avec le
// nombre de jours qui ont un relevé.
const nJours = (n) => `${n} jour${n > 1 ? 's' : ''}`;
export function GrapheFamillesColonnes({ pas, resultat, periode, carte }) {
  const lib = (id) => carte.get(id) || id;
  const lignes = resultat.colonnes.map((c) => ({ cle: String(c.cle), nom: nomLong(pas, c.cle, lib), compte: c.familles, detail: c.jours ? nJours(c.jours) : null }));
  return html`<${GrapheFamilles} graphe=${pas} entete=${NOM_PAS[pas]} lignes=${lignes} periode=${periode} carte=${carte} />`;
}
