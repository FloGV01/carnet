// Écran Analyse (v5) : en haut, la ligne « Comprendre › » (v6) ; Ma semaine, Tendances, puis, selon la
// période : Mes jours, ta journée heure par heure, contacts et mouvement, tes moments ; ensuite les constats
// sur tout l'historique.
// Avec peu de données, l'écran le dit au lieu d'affirmer. Le calcul est mis en cache
// jusqu'à la prochaine écriture.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Repli } from '../composants/repli.js';
import { Pourquoi } from '../composants/pourquoi.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useEtatApp } from '../hooks.js';
import { analyze } from '../../analyse/index.js';
import { SEUILS } from '../../analyse/seuils.js';
import { nombre, uneDecimale, ligneHumeurSemaine, duree, moyenneReveils, phraseConstat, phrasesSommeil, phraseSommeilSemaine, phraseClassement, piedObservations, REGLES, PIED_EXPLOSIONS, PIED_TENDANCES, POURQUOI_TENDANCE, SANS_ECART, phraseTendance } from '../../analyse/textes.js';
import { carteLibelles } from '../../domain/libelles.js';
import { JOURS, jourSemaine } from '../../domain/dates.js';
import { MesJours, TaJournee, Barres } from '../graphes/graphes.js';
import { geometrieHaltere } from '../graphes/geometrie.js';
import { dernierOnglet } from './comprendre.js';
import { versHash } from '../../routeur.js';

const FENETRES = [{ valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }, { valeur: '90', libelle: '3 mois' }, { valeur: 'tout', libelle: 'Tout' }];
const NOMS_CLASSEMENT = { declencheur: 'Déclencheur', dessous: 'En dessous', emotion: 'Émotion', reaction: 'Réaction', symptome: 'Symptôme', effetSecondaire: 'Effet secondaire' };

let cache = null;

export async function calculerAnalyse() {
  const [journal, episodes, symptomes, traitements, humeurs, items, ecriture, affiches, reglages, masque, zeroDepuis] = await Promise.all([
    repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.traitements.tous(), repo.humeurs.tous(), repo.listes.items(),
    repo.meta.lire('derniereEcriture'), repo.meta.lire('constatsAffiches'), repo.meta.lire('reglages'), repo.meta.lire('signalMasque'),
    repo.meta.lire('explosionsDepuis'),
  ]);
  const aujourdhui = repo.aujourdhui();
  const cle = `${ecriture}|${aujourdhui}|${JSON.stringify(reglages)}|${masque}|${zeroDepuis}`;
  if (cache && cache.cle === cle) return cache.valeur;
  await new Promise((ok) => setTimeout(ok, 0));
  const resultat = analyze({ journal, episodes, symptomes, traitements, humeurs }, { aujourdhui, items, constatsAffiches: affiches || [], reglages: reglages || {}, zeroDepuis });
  // « Masquer » ne vaut que tant que la ressemblance dure : elle repartie, le masque tombe.
  let signalMasque = Boolean(masque);
  if (signalMasque && !resultat.signal.ressemble) { await repo.meta.ecrire('signalMasque', false); signalMasque = false; }
  const valeur = { resultat, items, carte: carteLibelles(items), signalMasque, zeroDepuis };
  if (JSON.stringify(resultat.constatsAffiches) !== JSON.stringify(affiches || [])) await repo.meta.ecrire('constatsAffiches', resultat.constatsAffiches);
  cache = { cle: `${(await repo.meta.lire('derniereEcriture'))}|${aujourdhui}|${JSON.stringify(reglages)}|${signalMasque}|${zeroDepuis}`, valeur };
  return valeur;
}

// Détail du signal : proportions ramenées « sur 4 », écart d'humeur signé, moyennes par jour.
const DETAIL_SIGNAL = {
  ecartHumeur: { libelle: "Humeur, écart à d'habitude", format: (v) => (v > 0 ? `+${nombre(v)}` : nombre(v)) },
  nuitsMal: { libelle: (lib) => `Nuits ${lib('sommeil:mal')}`, format: (v) => `${nombre(v * 4)} sur 4` },
  reveils: { libelle: 'Réveils par nuit', format: (v) => nombre(v) },
  explosions: { libelle: 'Explosions par jour', format: (v) => nombre(v) },
  contact: { libelle: 'Contact humain', format: (v) => `${nombre(v * 4)} sur 4` },
  mouvement: { libelle: 'Mouvement', format: (v) => `${nombre(v * 4)} sur 4` },
  episodes: { libelle: 'Épisodes par jour', format: (v) => nombre(v) },
  symptomes: { libelle: 'Symptômes par jour', format: (v) => nombre(v) },
};

function CartePourInfo({ signal, carte }) {
  const [detail, setDetail] = useState(false);
  const lib = (id) => carte.get(id) || id;
  return html`<section class="pour-info" aria-label="Pour info">
    <div class="pour-info-tete"><span class="libelle-section">Pour info</span>
      <button type="button" class="btn-lien masquer" onClick=${() => repo.meta.ecrire('signalMasque', true)}>Masquer</button></div>
    <p>${signal.phrase}</p>
    <button type="button" class="btn-lien action voir-detail" aria-expanded=${detail ? 'true' : 'false'} onClick=${() => setDetail(!detail)}>${detail ? 'Masquer le détail' : 'Voir le détail'}</button>
    ${detail && html`<table class="detail-signal"><thead><tr><th scope="col"><span class="visuellement-cache">Caractéristique</span></th><th scope="col">Ces 4 jours</th><th scope="col">Avant ces périodes</th><th scope="col">D'habitude</th></tr></thead>
      <tbody>${signal.detail.map((d) => {
        const def = DETAIL_SIGNAL[d.cle] || { libelle: d.libelle, format: (v) => nombre(v) };
        const f = (v) => (v == null ? '·' : def.format(v));
        return html`<tr><th scope="row">${typeof def.libelle === 'function' ? def.libelle(lib) : def.libelle}</th><td class="fort">${f(d.cesJours)}</td><td>${f(d.avant)}</td><td>${f(d.habitude)}</td></tr>`;
      })}</tbody></table>`}
  </section>`;
}

// Ma semaine (v5) : trois lignes sur les 7 derniers jours, quelle que soit la période choisie.
// Jamais de comparaison avec la semaine d'avant ; « Nuits Mal » seules (Mal + Moyen + Bien
// donnerait le nombre de nuits notées). Les points positifs restent dans un repli fermé.
function MaSemaine({ f, frise7, positifs, sommeil, carte, sansPhrase }) {
  const lib = (id) => carte.get(id) || id;
  const phrase = !sansPhrase && phraseSommeilSemaine(sommeil, carte);
  const joursExpl = frise7.colonnes.filter((c) => c.explosions > 0).map((c) => JOURS[jourSemaine(c.cle)]);
  const lignes = [];
  if (f.humeur.n) lignes.push(ligneHumeurSemaine(f.humeur));
  if (f.nuits.n) lignes.push(`Nuits ${lib('sommeil:mal')} : ${f.nuits.mal}`);
  const expl = f.explosions.n ? `Explosions : ${f.explosions.total}${joursExpl.length && joursExpl.length <= 2 ? ` (${joursExpl.join(', ')})` : ''}` : null;
  const eps = f.episodes.nombre ? `Épisodes : ${f.episodes.nombre}` : null;
  if (expl || eps) lignes.push([expl, eps].filter(Boolean).join(' · '));
  if (!lignes.length && !positifs.length) return null;
  return html`<section class="carte ma-semaine" aria-label="Ma semaine">
    <div class="carte-entete"><h2 class="titre-carte">Ma semaine</h2><span class="note-carte-interne">7 derniers jours</span></div>
    ${lignes.length > 0 && html`<ul class="lignes-semaine">${lignes.map((l) => html`<li>${l}</li>`)}</ul>`}
    ${positifs.length > 0 && html`<${Repli} cle="positifs-semaine" titre="Tes points positifs" memoriser=${false}>
      <ul class="lignes-semaine">${positifs.map((p) => html`<li>« ${p.texte} » <span class="note-carte-interne">${JOURS[jourSemaine(p.date)]}</span></li>`)}</ul>
    </${Repli}>`}
    ${phrase && html`<p class="phrase-semaine">${phrase}</p>`}
  </section>`;
}

// Tendances (v5) : une phrase quand l'écart est net, sinon une ligne neutre. Repliée quand la
// carte « Pour info » est visible (pas plus de deux phrases d'observation en tête d'écran).
function Tendances({ t, replie }) {
  if (t.statut === 'desactive' || t.statut === 'muet') return null;
  const contenu = t.statut === 'insuffisant'
    ? html`<${Pourquoi} regle=${REGLES.tendances} />`
    : t.constat
      ? html`<div class="constat"><p>${phraseTendance(t.constat, 'tu')}</p><${HaltereMoyennes} c=${t.constat} />
          <p class="pied-section">Creux : les 8 semaines d'avant · plein : les 4 dernières. ${PIED_TENDANCES}</p>
          <${Pourquoi} texte="" regle=${POURQUOI_TENDANCE} /></div>`
      : html`<p class="texte-secondaire">${SANS_ECART}</p>`;
  return html`<section class="section-analyse">
    ${replie ? html`<${Repli} cle="tendances" titre="Tendances" memoriser=${false}>${contenu}</${Repli}>`
      : html`<h2 class="titre-section">Tendances</h2>${contenu}`}
  </section>`;
}

function HaltereMoyennes({ c }) {
  const g = geometrieHaltere((c.moyB - 1) / 9, (c.moyR - 1) / 9);
  return html`<svg class="haltere" viewBox="0 0 306 34" role="img" aria-label=${`${nombre(c.moyR)} sur les 4 dernières semaines, contre ${nombre(c.moyB)} sur les 8 d'avant, sur une échelle de 1 à 10`}>
    <line class="h-rail" x1="8" x2="298" y1="12" y2="12" />
    <line class="h-ligne" x1=${Math.min(g.x1, g.x2)} x2=${Math.max(g.x1, g.x2)} y1="12" y2="12" />
    <circle class="h-creux" cx=${g.x1} cy="12" r="6" /><circle class="h-plein" cx=${g.x2} cy="12" r="6" />
    <text class="h-texte" x="8" y="32">1</text><text class="h-texte" x="298" y="32" text-anchor="end">10</text>
  </svg>`;
}

// Tes moments, étape par étape (v5) : par groupe (Explosions, Colère, Surcharge, Figé), ce que
// tu as noté, dans l'ordre de l'Après coup. « 3 sur 5 » : sur les épisodes où l'étape est remplie.
const LISTES_MOMENTS = [
  ['fragilites', 'Ce qui fragilisait déjà'], ['declencheurs', 'Ça a démarré avec'], ['dessous', 'En dessous'],
  ['tropDe', 'Ce qui était trop'], ['signes', 'Premiers signes'], ['besoins', 'Ce dont tu avais besoin'],
];
const NOMS_GROUPES = { explosions: 'Explosions' };
function TesMoments({ m, carte }) {
  const lib = (id) => carte.get(id) || id;
  const groupes = m.groupes.filter((g) => g.statut === 'ok');
  const [choix, setChoix] = useState(null);
  if (!groupes.length) return html`<${Pourquoi} regle=${REGLES.explosions} />`;
  const g = groupes.find((x) => x.cle === choix) || groupes[0];
  const lignes = LISTES_MOMENTS.filter(([cle]) => g[cle] && g[cle].elements.length > 0);
  return html`${groupes.length > 1 && html`<${Segmente} etiquette="Groupe" options=${groupes.map((x) => ({ valeur: x.cle, libelle: NOMS_GROUPES[x.cle] || lib(x.cle) }))}
      valeur=${g.cle} surChoix=${(v) => v && setChoix(v)} classe="large" sansVide=${true} />`}
    ${lignes.length > 0
      ? html`<ul class="liste carte carte-groupe classements">${lignes.map(([cle, nom]) => html`<li class="ligne-classement">
        <span class="nom-classement">${nom}</span><span>${g[cle].elements.map((x) => `${lib(x.id)} (${x.n} sur ${g[cle].n})`).join(' · ')}</span></li>`)}</ul>`
      : html`<p class="texte-secondaire">Rien n'est encore noté au moins 2 fois.</p>`}
    ${g.repere != null && html`<p class="phrase">Tu as remarqué que ça montait vers ${nombre(g.repere)} sur 10 (valeur du milieu).</p>`}
    ${g.siAlors.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Tes « si… alors… »</h3>
      <ul>${g.siAlors.map((x) => html`<li>Si ${x.si || '…'}, alors ${x.alors || '…'}</li>`)}</ul></div>`}
    ${g.aide.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Ce qui a aidé, d'autres fois</h3>
      <ul>${g.aide.map((a) => html`<li>« ${a.texte} » <span class="note-carte-interne">${a.date}</span></li>`)}</ul></div>`}
    <a class="lien" href="#/mon-plan">Voir Mon plan</a>
    <p class="pied-section">${PIED_EXPLOSIONS}</p>`;
}

// Avec qui, comment c'était · Mouvement (v5) : comptes en jours, ordre fixe des listes.
function DetailsBarres({ f, items, carte }) {
  const lib = (id) => carte.get(id) || id;
  const ordre = (liste) => items.filter((i) => i.liste === liste).sort((a, b) => a.ordre - b.ordre).map((i) => i.id);
  const ligne = (p, id, nom) => p.par[id] && { nom, par: p.par[id], total: p.jours[id] };
  const contacts = [...ordre('contactAvec').map((id) => ligne(f.contactDetail.paires, id, lib(id))),
    ligne(f.contactDetail.paires, 'plusieurs', 'À plusieurs'), ligne(f.contactDetail.paires, 'sans', 'Sans précision')].filter(Boolean);
  const sport = [...ordre('typeSport').map((id) => ligne(f.sportDetail.paires, id, lib(id))), ligne(f.sportDetail.paires, 'sans', 'Sans précision')].filter(Boolean);
  const effets = [
    { id: 'contactEffet:ressourcant', classe: 'rampe-3' }, { id: 'contactEffet:neutre', classe: 'rampe-2' },
    { id: 'contactEffet:couteux', classe: 'rampe-1' }, { id: 'aucun', classe: 'rampe-0', nom: 'non précisé' },
  ].map((p) => ({ ...p, nom: p.nom || lib(p.id).toLowerCase() }));
  const durees = [...ordre('dureeSport').map((id, i) => ({ id, classe: `rampe-${Math.min(4, i + 1)}`, nom: lib(id).toLowerCase() })), { id: 'aucun', classe: 'rampe-0', nom: 'durée non précisée' }];
  if (!contacts.length && !sport.length) return null;
  return html`<section class="section-analyse">
    <h2 class="titre-section">Avec qui, comment c'était · Mouvement</h2>
    ${contacts.length > 0 && html`<${Barres} titre="Avec qui, comment c'était" rubrique="contact" lignes=${contacts} precisions=${effets} lib=${lib} pied="En jours, selon tes réponses à « Comment c'était »." />`}
    ${sport.length > 0 && html`<${Barres} titre="Mouvement" rubrique="sport" lignes=${sport} precisions=${durees} lib=${lib} pied="En jours, par durée notée." />`}
  </section>`;
}

const Tuile = ({ titre, valeur, detail, fragile, rubrique }) => html`<div class=${`tuile teinte-${rubrique}`}>
  <span class="tuile-titre"><span class="point-rubrique petit" aria-hidden="true"></span>${titre}</span>
  <span class=${valeur === '·' ? 'tuile-valeur vide-chiffre' : 'tuile-valeur'}>${valeur}</span>
  ${(detail || fragile) && html`<span class="tuile-detail">${detail || ''}${detail && fragile ? ' ' : ''}${fragile ? '(peu de valeurs)' : ''}</span>`}
</div>`;

function Haltere({ c }) {
  const g = geometrieHaltere(c.a / c.n1, c.b / c.n2);
  return html`<svg class="haltere" viewBox="0 0 306 34" role="img" aria-label=${`${c.a} sur ${c.n1}, contre ${c.b} sur ${c.n2}`}>
    <line class="h-rail" x1="8" x2="298" y1="12" y2="12" />
    <line class="h-ligne" x1=${g.x1} x2=${g.x2} y1="12" y2="12" />
    <circle class="h-plein" cx=${g.x1} cy="12" r="6" /><circle class="h-creux" cx=${g.x2} cy="12" r="6" />
    <text class="h-texte" x="8" y="32">${c.a} sur ${c.n1} · ${c.b} sur ${c.n2}</text>
  </svg>`;
}

const jours = (n) => `${n} jour${n > 1 ? 's' : ''}`;

function Tuiles({ f, carte }) {
  const lib = (id) => carte.get(id) || id;
  const h = f.humeur;
  const r = f.nuits.reveils;
  return html`<div class="tuiles">
    <${Tuile} rubrique="humeur" titre="Humeur moyenne" valeur=${h.n ? uneDecimale(h.moyenne) : '·'} detail=${h.n ? `de ${nombre(h.minReleve)} à ${nombre(h.maxReleve)}` : ''} fragile=${h.n > 0 && h.fragile} />
    <${Tuile} rubrique="humeur" titre="Journées à 7 ou plus" valeur=${h.n ? String(h.haut) : '·'} />
    <${Tuile} rubrique="humeur" titre="Journées à 4 ou moins" valeur=${h.n ? String(h.bas) : '·'} />
    <${Tuile} rubrique="expl" titre="Explosions" valeur=${f.explosions.n ? String(f.explosions.total) : '·'} detail=${f.explosions.jours ? `${jours(f.explosions.jours)} avec` : ''} />
    <${Tuile} rubrique="sommeil" titre=${`Nuits ${lib('sommeil:mal')}`} valeur=${f.nuits.n ? String(f.nuits.mal) : '·'}
      detail=${f.nuits.n ? `${lib('sommeil:moyen')} ${f.nuits.moyen} · ${lib('sommeil:bien')} ${f.nuits.bien}` : ''} />
    <${Tuile} rubrique="sommeil" titre="Réveils" valeur=${r.n ? moyenneReveils(r) : '·'} detail=${r.n ? 'moyenne' : ''} fragile=${r.n > 0 && r.fragile} />
    <${Tuile} rubrique="sommeil" titre="Coucher" valeur=${f.nuits.coucher || '·'} detail=${f.nuits.coucher ? 'médian' : ''} />
    <${Tuile} rubrique="sommeil" titre="Lever" valeur=${f.nuits.lever || '·'} detail=${f.nuits.lever ? 'médian' : ''} />
    <${Tuile} rubrique="sommeil" titre="Durée de nuit" valeur=${f.nuits.duree ? duree(f.nuits.duree) : '·'} detail=${f.nuits.duree ? 'médiane' : ''} />
    <${Tuile} rubrique="contact" titre="Contact humain" valeur=${f.contact.n ? jours(f.contact.oui) : '·'} detail=${detailJours(f.contactDetail.avec, lib)} />
    ${f.contactDetail.effet.jours > 0 && html`<${Tuile} rubrique="contact" titre="Comment c'était" valeur=${jours(f.contactDetail.effet.jours)} detail=${detailJours(f.contactDetail.effet, lib)} />`}
    <${Tuile} rubrique="lieu" titre=${lib('lieu:bureau')} valeur=${f.lieux.n ? jours(f.lieux.bureau) : '·'} detail=${f.lieux.n ? `${lib('lieu:teletravail').toLowerCase()} ${f.lieux.teletravail}` : ''} />
    <${Tuile} rubrique="sport" titre="Sport / mouvement" valeur=${f.sport.n ? jours(f.sport.oui) : '·'} detail=${detailJours(f.sportDetail.types, lib)} />
    <${Tuile} rubrique="trt" titre="Traitement pris" valeur=${f.traitement.n ? `${f.traitement.oui} · ${f.traitement.partiel} · ${f.traitement.non}` : '·'}
      detail=${f.traitement.n ? `${lib('traitementPris:oui')} · ${lib('traitementPris:partiel')} · ${lib('traitementPris:non')}` : ''} />
    <${Tuile} rubrique="ep" titre="Épisodes" valeur=${String(f.episodes.nombre)} detail=${f.episodes.nIntensite ? `intensité moyenne ${nombre(f.episodes.intensite)}` : ''} fragile=${f.episodes.nIntensite > 0 && f.episodes.fragile} />
    <${Tuile} rubrique="sy" titre="Symptômes" valeur=${String(f.symptomes.nombre)} />
  </div>`;
}

// Détails du soir (v4) : « Marche 4 j · Vélo 2 j » (en jours, les 3 premiers).
const detailJours = (d, lib) => d.par.slice(0, 3).map((x) => `${lib(x.id)} ${x.n} j`).join(' · ');

function Chiffres({ f }) {
  const lignes = [
    ['Humeur', f.humeur.n], ['Explosions', f.explosions.n], ['Nuits', f.nuits.n], ['Réveils', f.nuits.reveils.n],
    ['Coucher', f.nuits.nCoucher], ['Lever', f.nuits.nLever], ['Contact humain', f.contact.n], ['Lieu', f.lieux.n],
    ['Sport / mouvement', f.sport.n], ['Traitement pris', f.traitement.n], ['Intensité des épisodes', f.episodes.nIntensite],
  ];
  return html`<table class="tableau-lignes chiffres-base"><thead><tr><th scope="col">Indicateur</th><th scope="col">Valeurs prises en compte</th></tr></thead>
    <tbody>${lignes.map(([n, v]) => html`<tr><td>${n}</td><td>${v}</td></tr>`)}</tbody></table>`;
}

// Sommeil et humeur : humeur moyenne du jour même selon la nuit, en points sur une échelle de 1 à 10.
function PointsSommeil({ moyennes, carte }) {
  const lignes = ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'].map((id) => ({ id, m: moyennes[id] }));
  return html`<div class="points-sommeil" role="img" aria-label=${lignes.map((l) => `${carte.get(l.id) || l.id} : ${l.m && l.m.n >= SEUILS.sommeil.minParModalite ? nombre(l.m.moyenne) : 'pas assez de valeurs'}`).join(', ')}>
    ${lignes.map((l) => {
      const ok = l.m && l.m.n >= SEUILS.sommeil.minParModalite;
      return html`<div class="rangee-sommeil" aria-hidden="true">
        <span class="nom-sommeil">${carte.get(l.id) || l.id}</span>
        <svg class="piste-sommeil" viewBox="0 0 300 24"><line class="rail-sommeil" x1="9" x2="291" y1="12" y2="12" />
          ${ok && html`<circle class="point-sommeil" cx=${(9 + ((l.m.moyenne - 1) / 9) * 282).toFixed(1)} cy="12" r="9" />`}</svg>
        <span class="valeur-sommeil">${ok ? nombre(l.m.moyenne) : '·'}</span></div>`;
    })}
    <div class="echelle-sommeil" aria-hidden="true"><span>1</span><span>10</span></div>
  </div>`;
}

// v6 : l'écran Comprendre, rouvert sur son dernier onglet.
const LigneComprendre = () => html`<ul class="liste carte carte-groupe">
  <li><a class="ligne-carte" href=${versHash('comprendre', { onglet: dernierOnglet() })}><span class="ligne-libelle">Comprendre</span>${Icones.chevron({ trait: 2 })}</a></li>
</ul>`;

export function Analyse() {
  const version = useEtatApp((e) => e.versionDonnees || 0);
  const [fenetre, setFenetre] = useState('30');
  const [etat, setEtat] = useState(null);
  useEffect(() => { let actif = true; calculerAnalyse().then((v) => { if (actif) setEtat(v); }); return () => { actif = false; }; }, [version]);

  if (!etat) return html`<main class="ecran analyse"><${Entete} titre="Analyse" /><${LigneComprendre} /><p class="texte-secondaire centre">Calcul…</p></main>`;
  const { resultat: r, carte, items, signalMasque } = etat;
  const f = r.fenetres[fenetre];
  const cl = r.classements[fenetre];
  const pourInfo = r.signal && r.signal.ressemble && !signalMasque;

  return html`<main class="ecran analyse">
    <${Entete} titre="Analyse" />
    <${LigneComprendre} />
    ${pourInfo && html`<${CartePourInfo} signal=${r.signal} carte=${carte} />`}
    <${MaSemaine} f=${r.fenetres['7']} frise7=${r.frise['7']} positifs=${r.semaine.positifs} sommeil=${r.sommeil} carte=${carte} sansPhrase=${pourInfo} />
    <${Tendances} t=${r.tendances} replie=${pourInfo} />

    <div class="selecteur-periode"><${Segmente} etiquette="Période" options=${FENETRES} valeur=${fenetre} surChoix=${(v) => v && setFenetre(v)} classe="large" sansVide=${true} /></div>
    <${MesJours} key=${`frise-${fenetre}`} frise=${r.frise[fenetre]} carte=${carte} aujourdhui=${r.aujourdhui} />
    ${r.moments[fenetre].statut === 'ok'
      ? html`<${TaJournee} key=${`journee-${fenetre}`} profil=${r.moments[fenetre]} carte=${carte} />`
      : r.moments.tout.statut === 'ok' && html`<section class="section-analyse"><h2 class="titre-section">Ta journée heure par heure</h2><${Pourquoi} regle=${REGLES.moments} /></section>`}
    <${DetailsBarres} f=${f} items=${items} carte=${carte} />

    <section class="section-analyse">
      <h2 class="titre-section">Tes moments, étape par étape</h2>
      <${TesMoments} key=${`moments-${fenetre}`} m=${r.tesMoments[fenetre]} carte=${carte} />
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Ce que tes journées à 7 ou plus ont en commun</h2>
      <p class="note-carte-interne">Sur tout ton historique.</p>
      ${r.bonnesJournees.constats.length
        ? html`${r.bonnesJournees.constats.map((c) => html`<div class="constat"><p>${phraseConstat(c, carte, 'tu')}</p><${Haltere} c=${c} /></div>`)}
            <p class="pied-section">Plein : journées à 7 ou plus · creux : journées à 4 ou moins. ${piedObservations('tu')}</p>`
        : r.bonnesJournees.statut === 'insuffisant'
          ? html`<${Pourquoi} regle=${REGLES.bonnesJournees} />`
          : html`<p class="texte-secondaire">Pas d'écart net pour l'instant.</p><p class="pied-section">${piedObservations('tu')}</p>`}
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Sommeil et humeur</h2>
      <p class="note-carte-interne">Sur tout ton historique.</p>
      ${r.sommeil.meme.statut !== 'ok' && r.sommeil.lendemain.statut !== 'ok'
        ? html`<${Pourquoi} regle=${REGLES.sommeil} />`
        : html`${r.sommeil.meme.statut === 'ok' && html`<${PointsSommeil} moyennes=${r.sommeil.meme.moyennes} carte=${carte} />`}
            ${phrasesSommeil(r.sommeil, carte).map((p) => html`<p class="phrase">${p}</p>`)}`}
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Les plus fréquents</h2>
      <ul class="liste carte carte-groupe classements">${Object.entries(NOMS_CLASSEMENT).map(([liste, nom]) => html`<li class="ligne-classement">
        <span class="nom-classement">${nom}</span><span>${phraseClassement(liste, cl[liste], carte)}</span></li>`)}</ul>
    </section>

    <${Repli} cle="tous-chiffres" titre="Tous les chiffres" memoriser=${false}>
      <${Tuiles} f=${f} carte=${carte} />
      <${Chiffres} f=${f} />
    </${Repli}>

    <ul class="liste carte carte-groupe">
      <li><a class="ligne-carte" href="#/export-psy"><span class="ligne-libelle">Export PSY</span>${Icones.chevron({ trait: 2 })}</a></li>
      <li><a class="ligne-carte" href="#/soignants"><span class="ligne-libelle">Vue soignants</span>${Icones.chevron({ trait: 2 })}</a></li>
    </ul>
  </main>`;
}
