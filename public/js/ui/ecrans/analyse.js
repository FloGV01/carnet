// Écran Analyse : Ma semaine, tuiles par fenêtre, graphiques sur 12 semaines, constats et classements.
// Avec peu de données, l'écran le dit au lieu d'affirmer. Le calcul est mis en cache
// jusqu'à la prochaine écriture.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Repli } from '../composants/repli.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useEtatApp } from '../hooks.js';
import { analyze } from '../../analyse/index.js';
import { semainesAvecDonnees } from '../../analyse/semaines.js';
import { SEUILS } from '../../analyse/seuils.js';
import { nombre, uneDecimale, duree, moyenneReveils, phraseConstat, phrasesSommeil, phraseSommeilSemaine, phraseClassement, piedObservations, PAS_ASSEZ, REGLES, PIED_EXPLOSIONS } from '../../analyse/textes.js';
import { carteLibelles } from '../../domain/libelles.js';
import { formaterDateNumerique } from '../../domain/dates.js';
import { GrapheHumeur, GrapheExplosions, GrapheSommeil } from '../graphes/graphes.js';
import { geometrieHaltere } from '../graphes/geometrie.js';

const FENETRES = [{ valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }, { valeur: 'tout', libelle: 'Depuis le début' }];
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

// Ma semaine : les 7 derniers jours, quelle que soit la période choisie plus bas.
function MaSemaine({ f, sommeil, carte }) {
  const phrase = phraseSommeilSemaine(sommeil, carte);
  const cellules = [
    { libelle: 'Humeur moyenne', valeur: f.humeur.n ? uneDecimale(f.humeur.moyenne) : null, teinte: 'humeur', fragile: f.humeur.n > 0 && f.humeur.fragile },
    { libelle: `Nuits ${carte.get('sommeil:mal') || 'Mal'}`, valeur: f.nuits.n ? String(f.nuits.mal) : null, teinte: 'sommeil' },
    { libelle: 'Explosions', valeur: f.explosions.n ? String(f.explosions.total) : null, teinte: 'expl' },
    { libelle: 'Épisodes', valeur: String(f.episodes.nombre), teinte: 'ep' },
  ];
  return html`<section class="carte ma-semaine" aria-label="Ma semaine">
    <div class="carte-entete"><h2 class="titre-carte">Ma semaine</h2><span class="note-carte-interne">7 derniers jours</span></div>
    <div class="grille-chiffres">${cellules.map((c) => html`<div class="cellule-chiffre">
      <span class=${c.valeur == null ? 'valeur-chiffre vide-chiffre' : `valeur-chiffre teinte-${c.teinte}`}>${c.valeur ?? '·'}</span>
      <span class="libelle-chiffre">${c.libelle}${c.fragile ? ' (peu de valeurs)' : ''}</span></div>`)}</div>
    ${phrase && html`<p class="phrase-semaine">${phrase}</p>`}
  </section>`;
}

const Tuile = ({ titre, valeur, detail, fragile, rubrique }) => html`<div class=${`tuile teinte-${rubrique}`}>
  <span class="tuile-titre"><span class="point-rubrique petit" aria-hidden="true"></span>${titre}</span>
  <span class=${valeur === '·' ? 'tuile-valeur vide-chiffre' : 'tuile-valeur'}>${valeur}</span>
  ${(detail || fragile) && html`<span class="tuile-detail">${detail || ''}${detail && fragile ? ' ' : ''}${fragile ? '(peu de valeurs)' : ''}</span>`}
</div>`;

function Pourquoi({ regle, texte = PAS_ASSEZ }) {
  const [ouvert, setOuvert] = useState(false);
  return html`<p class="texte-secondaire">${texte} <button type="button" class="btn-lien pourquoi" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${() => setOuvert(!ouvert)}>Pourquoi ?</button></p>
    ${ouvert && html`<p class="encadre-regle">${regle}</p>`}`;
}

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
    <${Tuile} rubrique="humeur" titre="Humeur moyenne" valeur=${h.n ? uneDecimale(h.moyenne) : '·'} detail=${h.n ? `de ${h.min} à ${h.max}` : ''} fragile=${h.n > 0 && h.fragile} />
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

// « Avant tes explosions » (v4) : comptes « 3 sur 4 », où 4 est le nombre d'explosions dont
// l'étape a été notée. Les mots de l'utilisateur, jamais une cause ni un conseil.
const LISTES_EXPLOSIONS = [
  ['declencheurs', 'Ça a démarré avec'], ['dessous', 'En dessous'], ['types', 'C\'était plutôt'],
  ['fragilites', 'Ce qui fragilisait déjà'], ['signes', 'Premiers signes'],
];
function AvantExplosions({ a, carte }) {
  const lib = (id) => carte.get(id) || id;
  if (a.statut !== 'ok') return html`<${Pourquoi} regle=${REGLES.explosions} />`;
  const lignes = LISTES_EXPLOSIONS.filter(([cle]) => a[cle].elements.length > 0);
  const vide = lignes.length === 0 && a.repere == null && a.siAlors.length === 0 && a.aide.length === 0;
  return html`${vide
    ? html`<p class="texte-secondaire">Rien n'est encore noté au moins 2 fois autour de tes explosions.</p>`
    : html`<p class="texte-secondaire">Avant tes explosions, ce qui revient le plus :</p>
      ${lignes.length > 0 && html`<ul class="liste carte carte-groupe classements">${lignes.map(([cle, nom]) => html`<li class="ligne-classement">
        <span class="nom-classement">${nom}</span>
        <span>${a[cle].elements.map((x) => `${lib(x.id)} (${x.n} sur ${a[cle].n})`).join(' · ')}</span></li>`)}</ul>`}
      ${a.repere != null && html`<p class="phrase">Tu as remarqué que ça montait vers ${nombre(a.repere)} sur 10 (valeur du milieu).</p>`}
      ${a.siAlors.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Tes « si… alors… »</h3>
        <ul>${a.siAlors.map((x) => html`<li>Si ${x.si || '…'}, alors ${x.alors || '…'}</li>`)}</ul></div>`}
      ${a.aide.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Ce qui a aidé, d'autres fois</h3>
        <ul>${a.aide.map((t) => html`<li>« ${t} »</li>`)}</ul></div>`}`}
    <p class="pied-section">${PIED_EXPLOSIONS}</p>`;
}

// Profil de ta journée (v4) : un créneau par ligne, de 4 h à 4 h.
function ProfilJournee({ p, carte }) {
  if (p.statut !== 'ok') return html`<${Pourquoi} regle=${REGLES.moments} />`;
  const lib = (id) => (carte.get(id) || id).toLowerCase();
  return html`<ul class="liste carte carte-groupe profil-journee">${p.creneaux.map((c) => {
    const energies = Object.entries(c.energie).filter(([, n]) => n > 0).map(([id, n]) => `${lib(id)} ${n}`).join(', ');
    return html`<li class="ligne-classement">
      <span class="nom-classement">${c.debut} h – ${c.fin} h</span>
      <span>humeur ${uneDecimale(c.moyenne)}${energies ? ` · énergie : ${energies}` : ''}</span></li>`;
  })}</ul>
  <p class="pied-section">Moyenne de chaque jour, puis moyenne de ces jours.</p>`;
}

function Chiffres({ f }) {
  const lignes = [
    ['Humeur', f.humeur.n], ['Explosions', f.explosions.n], ['Nuits', f.nuits.n], ['Réveils', f.nuits.reveils.n],
    ['Coucher', f.nuits.nCoucher], ['Lever', f.nuits.nLever], ['Contact humain', f.contact.n], ['Lieu', f.lieux.n],
    ['Sport / mouvement', f.sport.n], ['Traitement pris', f.traitement.n], ['Intensité des épisodes', f.episodes.nIntensite],
  ];
  return html`<${Repli} cle="chiffres" titre="Voir les chiffres">
    <table class="tableau-lignes chiffres-base"><thead><tr><th scope="col">Indicateur</th><th scope="col">Valeurs prises en compte</th></tr></thead>
    <tbody>${lignes.map(([n, v]) => html`<tr><td>${n}</td><td>${v}</td></tr>`)}</tbody></table>
  </${Repli}>`;
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

export function Analyse() {
  const version = useEtatApp((e) => e.versionDonnees || 0);
  const [fenetre, setFenetre] = useState('30');
  const [etat, setEtat] = useState(null);
  useEffect(() => { let actif = true; calculerAnalyse().then((v) => { if (actif) setEtat(v); }); return () => { actif = false; }; }, [version]);

  if (!etat) return html`<main class="ecran analyse"><${Entete} titre="Analyse" /><p class="texte-secondaire centre">Calcul…</p></main>`;
  const { resultat: r, carte, signalMasque } = etat;
  const f = r.fenetres[fenetre];
  const cl = r.classements[fenetre];
  const assezSemaines = semainesAvecDonnees(r.semaines) >= SEUILS.semaine.minSemainesGraphe;
  const semainesTableau = [...r.semaines].reverse().filter((s) => s.nHumeur || s.explosions != null || s.sommeil);

  return html`<main class="ecran analyse">
    <${Entete} titre="Analyse" />
    ${r.signal && r.signal.ressemble && !signalMasque && html`<${CartePourInfo} signal=${r.signal} carte=${carte} />`}
    <${MaSemaine} f=${r.fenetres['7']} sommeil=${r.sommeil} carte=${carte} />
    <${Segmente} etiquette="Période" options=${FENETRES} valeur=${fenetre} surChoix=${(v) => v && setFenetre(v)} classe="large" sansVide=${true} />
    <${Tuiles} f=${f} carte=${carte} />

    ${assezSemaines
      ? html`<${GrapheHumeur} semaines=${r.semaines} /><${GrapheExplosions} semaines=${r.semaines} /><${GrapheSommeil} semaines=${r.semaines} carte=${carte} />`
      : html`<${Pourquoi} texte="Les graphes apparaissent après 2 semaines de données." regle="La règle : au moins 2 semaines avec des données." />`}

    <section class="section-analyse">
      <h2 class="titre-section">Ce que tes journées à 7 ou plus ont en commun</h2>
      ${r.bonnesJournees.constats.length
        ? html`${r.bonnesJournees.constats.map((c) => html`<div class="constat"><p>${phraseConstat(c, carte, 'tu')}</p><${Haltere} c=${c} /></div>`)}
            <p class="pied-section">Plein : journées à 7 ou plus · creux : journées à 4 ou moins. ${piedObservations('tu')}</p>`
        : r.bonnesJournees.statut === 'insuffisant'
          ? html`<${Pourquoi} regle=${REGLES.bonnesJournees} />`
          : html`<p class="texte-secondaire">Pas d'écart net pour l'instant.</p><p class="pied-section">${piedObservations('tu')}</p>`}
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Avant tes explosions</h2>
      <${AvantExplosions} a=${r.avantExplosions[fenetre]} carte=${carte} />
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Profil de ta journée</h2>
      <${ProfilJournee} p=${r.moments[fenetre]} carte=${carte} />
    </section>

    <section class="section-analyse">
      <h2 class="titre-section">Sommeil et humeur</h2>
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

    ${assezSemaines && html`<section class="section-analyse">
      <h2 class="titre-section">Évolution</h2>
      <div class="defile-x"><table class="tableau-evolution">
        <thead><tr><th scope="col">Semaine</th><th scope="col">Humeur</th><th scope="col">Explosions</th><th scope="col">${`Nuits ${carte.get('sommeil:mal')}`}</th><th scope="col">Émotion n°1</th><th scope="col">Déclencheur n°1</th><th scope="col">Symptôme n°1</th><th scope="col">Effet secondaire n°1</th></tr></thead>
        <tbody>${semainesTableau.map((s) => html`<tr>
          <td>${formaterDateNumerique(s.lundi).slice(0, 5)}</td>
          <td>${s.humeur == null ? '·' : html`<span class="humeur-evolution">${s.fragile && html`<svg viewBox="0 0 10 10" role="img" aria-label="moyenne fragile"><circle class="anneau-fragile" cx="5" cy="5" r="4" /></svg>`}${nombre(s.humeur)}</span>`}</td>
          <td>${s.explosions ?? '·'}</td><td>${s.sommeil ? s.sommeil.mal : '·'}</td>
          <td>${s.emotion ? carte.get(s.emotion) : '·'}</td><td>${s.declencheur ? carte.get(s.declencheur) : '·'}</td>
          <td>${s.symptome ? carte.get(s.symptome) : '·'}</td><td>${s.effetSecondaire ? carte.get(s.effetSecondaire) : '·'}</td>
        </tr>`)}</tbody></table></div>
    </section>`}

    <${Chiffres} f=${f} />

    <ul class="liste carte carte-groupe">
      <li><a class="ligne-carte" href="#/export-psy"><span class="ligne-libelle">Export PSY</span>${Icones.chevron({ trait: 2 })}</a></li>
      <li><a class="ligne-carte" href="#/soignants"><span class="ligne-libelle">Vue soignants</span>${Icones.chevron({ trait: 2 })}</a></li>
    </ul>
  </main>`;
}
