// Écran Analyse : tuiles par fenêtre, graphiques sur 12 semaines, constats et classements.
// Avec peu de données, l'écran le dit au lieu d'affirmer. Le calcul est mis en cache
// jusqu'à la prochaine écriture.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { repo } from '../../donnees.js';
import { useEtatApp } from '../hooks.js';
import { analyze } from '../../analyse/index.js';
import { semainesAvecDonnees } from '../../analyse/semaines.js';
import { SEUILS } from '../../analyse/seuils.js';
import { nombre, duree, moyenneReveils, phraseConstat, phrasesSommeil, phraseClassement, piedObservations, PAS_ASSEZ, REGLES } from '../../analyse/textes.js';
import { carteLibelles } from '../../domain/libelles.js';
import { formaterSemaine } from '../../domain/dates.js';
import { GrapheHumeur, GrapheExplosions, GrapheSommeil } from '../graphes/graphes.js';
import { geometrieHaltere } from '../graphes/geometrie.js';

const FENETRES = [{ valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }, { valeur: 'tout', libelle: 'Depuis le début' }];
const NOMS_CLASSEMENT = { declencheur: 'Déclencheur', dessous: 'En dessous', emotion: 'Émotion', reaction: 'Réaction', symptome: 'Symptôme', effetSecondaire: 'Effet secondaire' };

let cache = null;

export async function calculerAnalyse() {
  const [journal, episodes, symptomes, traitements, items, ecriture, affiches, reglages, masque] = await Promise.all([
    repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.traitements.tous(), repo.listes.items(),
    repo.meta.lire('derniereEcriture'), repo.meta.lire('constatsAffiches'), repo.meta.lire('reglages'), repo.meta.lire('signalMasque'),
  ]);
  const aujourdhui = repo.aujourdhui();
  const cle = `${ecriture}|${aujourdhui}|${JSON.stringify(reglages)}|${masque}`;
  if (cache && cache.cle === cle) return cache.valeur;
  await new Promise((ok) => setTimeout(ok, 0));
  const resultat = analyze({ journal, episodes, symptomes, traitements }, { aujourdhui, items, constatsAffiches: affiches || [], reglages: reglages || {} });
  // « Masquer » ne vaut que tant que la ressemblance dure : elle repartie, le masque tombe.
  let signalMasque = Boolean(masque);
  if (signalMasque && !resultat.signal.ressemble) { await repo.meta.ecrire('signalMasque', false); signalMasque = false; }
  const valeur = { resultat, items, carte: carteLibelles(items), signalMasque };
  if (JSON.stringify(resultat.constatsAffiches) !== JSON.stringify(affiches || [])) await repo.meta.ecrire('constatsAffiches', resultat.constatsAffiches);
  cache = { cle: `${(await repo.meta.lire('derniereEcriture'))}|${aujourdhui}|${JSON.stringify(reglages)}|${signalMasque}`, valeur };
  return valeur;
}

function CartePourInfo({ signal }) {
  const [detail, setDetail] = useState(false);
  return html`<section class="carte pour-info" aria-label="Pour info">
    <p class="etiquette">Pour info</p>
    <p>${signal.phrase}</p>
    <div class="ligne">
      <button type="button" class="btn-lien" onClick=${() => setDetail(!detail)}>${detail ? 'Masquer le détail' : 'Voir le détail'}</button>
      <button type="button" class="btn-lien" onClick=${() => repo.meta.ecrire('signalMasque', true)}>Masquer</button>
    </div>
    ${detail && html`<table class="tableau-simple"><thead><tr><th></th><th>Ces 4 jours</th><th>Avant ces périodes</th><th>D'habitude</th></tr></thead>
      <tbody>${signal.detail.map((d) => html`<tr><td>${d.libelle}</td><td>${nombre(d.cesJours)}</td><td>${nombre(d.avant)}</td><td>${nombre(d.habitude)}</td></tr>`)}</tbody></table>`}
  </section>`;
}

const Tuile = ({ titre, valeur, detail, fragile }) => html`<div class="tuile">
  <span class="tuile-titre">${titre}</span>
  <span class="tuile-valeur">${valeur}</span>
  ${(detail || fragile) && html`<span class="tuile-detail discret">${detail || ''}${fragile ? ' (peu de valeurs)' : ''}</span>`}
</div>`;

function Pourquoi({ regle }) {
  const [ouvert, setOuvert] = useState(false);
  return html`<p class="discret">${PAS_ASSEZ} <button type="button" class="btn-lien" onClick=${() => setOuvert(!ouvert)}>Pourquoi ?</button></p>
    ${ouvert && html`<p class="discret regle">${regle}</p>`}`;
}

function Haltere({ c }) {
  const g = geometrieHaltere(c.a / c.n1, c.b / c.n2);
  return html`<svg class="haltere" viewBox="0 0 300 26" role="img" aria-label=${`${c.a} sur ${c.n1}, contre ${c.b} sur ${c.n2}`}>
    <line class="g-filet" x1="10" x2="290" y1="13" y2="13" />
    <line class="g-ligne" x1=${g.x1} x2=${g.x2} y1="13" y2="13" />
    <circle class="g-point" cx=${g.x1} cy="13" r="5" /><circle class="g-anneau" cx=${g.x2} cy="13" r="5" />
  </svg><p class="discret etiquette-haltere">● ${c.a} sur ${c.n1} · ○ ${c.b} sur ${c.n2}</p>`;
}

function Tuiles({ f, carte }) {
  const lib = (id) => carte.get(id) || id;
  const h = f.humeur;
  return html`<div class="tuiles">
    <${Tuile} titre="Humeur moyenne" valeur=${nombre(h.moyenne)} detail=${h.n ? `de ${h.min} à ${h.max}` : ''} fragile=${h.n > 0 && h.fragile} />
    <${Tuile} titre="Journées à 7 ou plus" valeur=${h.n ? h.haut : '·'} />
    <${Tuile} titre="Journées à 4 ou moins" valeur=${h.n ? h.bas : '·'} />
    <${Tuile} titre="Explosions" valeur=${f.explosions.n ? f.explosions.total : '·'} detail=${f.explosions.jours ? `${f.explosions.jours} jour${f.explosions.jours > 1 ? 's' : ''} avec` : ''} />
    <${Tuile} titre=${`Nuits ${lib('sommeil:mal')}`} valeur=${f.nuits.n ? f.nuits.mal : '·'}
      detail=${f.nuits.n ? `${lib('sommeil:bien')} ${f.nuits.bien} · ${lib('sommeil:moyen')} ${f.nuits.moyen}` : ''} />
    <${Tuile} titre="Réveils" valeur=${moyenneReveils(f.nuits.reveils)} fragile=${f.nuits.reveils.n > 0 && f.nuits.reveils.fragile} />
    <${Tuile} titre="Coucher · lever" valeur=${f.nuits.coucher ? `${f.nuits.coucher} · ${f.nuits.lever || '·'}` : '·'} detail=${f.nuits.duree ? duree(f.nuits.duree) : ''} />
    <${Tuile} titre="Contact humain" valeur=${f.contact.n ? `${f.contact.oui} j` : '·'} />
    <${Tuile} titre="Bureau" valeur=${f.lieux.n ? `${f.lieux.bureau} j` : '·'} detail=${f.lieux.n ? `télétravail ${f.lieux.teletravail} j` : ''} />
    <${Tuile} titre="Sport / mouvement" valeur=${f.sport.n ? `${f.sport.oui} j` : '·'} />
    <${Tuile} titre="Traitement pris" valeur=${f.traitement.n ? `${f.traitement.oui}` : '·'} detail=${f.traitement.n ? `partiel ${f.traitement.partiel} · non ${f.traitement.non}` : ''} />
    <${Tuile} titre="Épisodes" valeur=${f.episodes.nombre} detail=${f.episodes.nIntensite ? `intensité ${nombre(f.episodes.intensite)}` : ''} fragile=${f.episodes.nIntensite > 0 && f.episodes.fragile} />
    <${Tuile} titre="Symptômes" valeur=${f.symptomes.nombre} />
  </div>`;
}

function Chiffres({ f }) {
  const lignes = [
    ['Humeur', f.humeur.n], ['Explosions', f.explosions.n], ['Nuits', f.nuits.n], ['Réveils', f.nuits.reveils.n],
    ['Coucher', f.nuits.nCoucher], ['Lever', f.nuits.nLever], ['Contact humain', f.contact.n], ['Lieu', f.lieux.n],
    ['Sport / mouvement', f.sport.n], ['Traitement pris', f.traitement.n], ['Intensité des épisodes', f.episodes.nIntensite],
  ];
  return html`<details class="section"><summary>Voir les chiffres</summary>
    <table class="tableau-simple"><thead><tr><th>Indicateur</th><th>Valeurs prises en compte</th></tr></thead>
    <tbody>${lignes.map(([n, v]) => html`<tr><td>${n}</td><td>${v}</td></tr>`)}</tbody></table></details>`;
}

export function Analyse() {
  const version = useEtatApp((e) => e.versionDonnees || 0);
  const [fenetre, setFenetre] = useState('30');
  const [etat, setEtat] = useState(null);
  useEffect(() => { let actif = true; calculerAnalyse().then((v) => { if (actif) setEtat(v); }); return () => { actif = false; }; }, [version]);

  if (!etat) return html`<main class="ecran"><${Entete} titre="Analyse" /><p class="discret">Calcul…</p></main>`;
  const { resultat: r, carte, signalMasque } = etat;
  const f = r.fenetres[fenetre];
  const cl = r.classements[fenetre];
  const assezSemaines = semainesAvecDonnees(r.semaines) >= SEUILS.semaine.minSemainesGraphe;

  return html`<main class="ecran analyse">
    <${Entete} titre="Analyse" />
    ${r.signal && r.signal.ressemble && !signalMasque && html`<${CartePourInfo} signal=${r.signal} />`}
    <${Segmente} etiquette="Période" options=${FENETRES} valeur=${fenetre} surChoix=${(v) => v && setFenetre(v)} />
    <${Tuiles} f=${f} carte=${carte} />
    <${Chiffres} f=${f} />

    <section class="section">
      <h2>12 dernières semaines</h2>
      ${assezSemaines
        ? html`<${GrapheHumeur} semaines=${r.semaines} /><${GrapheExplosions} semaines=${r.semaines} /><${GrapheSommeil} semaines=${r.semaines} carte=${carte} />`
        : html`<p class="discret">${PAS_ASSEZ}</p>`}
    </section>

    <section class="section">
      <h2>Ce que tes journées à 7 ou plus ont en commun</h2>
      <div class="carte">
        ${r.bonnesJournees.constats.length
          ? html`${r.bonnesJournees.constats.map((c) => html`<div class="constat"><p>${phraseConstat(c, carte, 'tu')}</p><${Haltere} c=${c} /></div>`)}
              <p class="discret pied-section">${piedObservations('tu')}</p>`
          : r.bonnesJournees.statut === 'insuffisant'
            ? html`<${Pourquoi} regle=${REGLES.bonnesJournees} />`
            : html`<p class="discret">Pas d'écart net pour l'instant.</p><p class="discret pied-section">${piedObservations('tu')}</p>`}
      </div>
    </section>

    <section class="section">
      <h2>Sommeil et humeur</h2>
      <div class="carte">
        ${r.sommeil.meme.statut !== 'ok' && r.sommeil.lendemain.statut !== 'ok'
          ? html`<${Pourquoi} regle=${REGLES.sommeil} />`
          : phrasesSommeil(r.sommeil, carte).map((p) => html`<p class="phrase">${p}</p>`)}
      </div>
    </section>

    <section class="section">
      <h2>Ce qui revient le plus</h2>
      <ul class="liste carte">${Object.entries(NOMS_CLASSEMENT).map(([liste, nom]) => html`<li class="ligne-classement">
        <span class="discret">${nom}</span><span>${phraseClassement(liste, cl[liste], carte)}</span></li>`)}</ul>
    </section>

    ${assezSemaines && html`<section class="section">
      <h2>Évolution</h2>
      <div class="defile-x"><table class="tableau-evolution">
        <thead><tr><th>Semaine</th><th>Humeur</th><th>Explosions</th><th>${`Nuits ${carte.get('sommeil:mal')}`}</th><th>Émotion</th><th>Déclencheur</th><th>Symptôme</th><th>Effet secondaire</th></tr></thead>
        <tbody>${[...r.semaines].reverse().filter((s) => s.nHumeur || s.explosions != null || s.sommeil).map((s) => html`<tr>
          <td>${formaterSemaine(s.lundi).replace('Semaine du ', '')}</td>
          <td>${s.humeur == null ? '·' : `${nombre(s.humeur)}${s.fragile ? ' ○' : ''}`}</td>
          <td>${s.explosions ?? '·'}</td><td>${s.sommeil ? s.sommeil.mal : '·'}</td>
          <td>${s.emotion ? carte.get(s.emotion) : '·'}</td><td>${s.declencheur ? carte.get(s.declencheur) : '·'}</td>
          <td>${s.symptome ? carte.get(s.symptome) : '·'}</td><td>${s.effetSecondaire ? carte.get(s.effetSecondaire) : '·'}</td>
        </tr>`)}</tbody></table></div>
    </section>`}

    <ul class="liste carte section">
      <li><a class="ligne lien-ligne" href="#/export-psy"><span>Export PSY</span><span aria-hidden="true">›</span></a></li>
      <li><a class="ligne lien-ligne" href="#/soignants"><span>Vue soignants</span><span aria-hidden="true">›</span></a></li>
    </ul>
  </main>`;
}
