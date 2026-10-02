// Historique : jours, épisodes et symptômes, groupés par semaine. Les jours non saisis
// n'existent pas ici : ni ligne vide, ni décompte.
import { html, useState, useRef } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Pastilles } from '../composants/pastilles.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useDonnees } from '../hooks.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { formaterSemaine, formaterJour, jourEvenement, addDays } from '../../domain/dates.js';
import { grouperParSemaine, filtrerJours, filtrerEpisodes, filtrerSymptomes, debutTexte, chercher } from '../../domain/historique.js';
import { phraseResume } from '../../domain/phrase.js';
import { versHash } from '../../routeur.js';
import { options } from './aujourdhui.js';

const SEGMENTS = [{ valeur: 'jours', libelle: 'Jours' }, { valeur: 'episodes', libelle: 'Épisodes' }, { valeur: 'symptomes', libelle: 'Symptômes' }];
const PERIODES = [{ valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }];
const HUMEURS = [{ valeur: 'bas', libelle: '1-4' }, { valeur: 'moyen', libelle: '5-6' }, { valeur: 'haut', libelle: '7-10' }];
const AVANT_EXTRAIT = 18;
const APRES_EXTRAIT = 28;

function Extrait({ ex }) {
  if (!ex) return null;
  return html`<span class="hist-note extrait">${ex.avant}<mark>${ex.trouve}</mark>${ex.apres}</span>`;
}
const IconeMemo = () => html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`;

// Bascule indépendante dans un groupe de pastilles (« Avec explosions », « Avec notes »).
function Bascules({ etiquette, choix, f, majF }) {
  return html`<div class="pastilles souples" role="group" aria-label=${etiquette}>
    ${choix.map((c) => html`<button type="button" class="pastille" aria-pressed=${f[c.cle] ? 'true' : 'false'}
      onClick=${() => majF(c.cle)(!f[c.cle])}><span class="texte-pastille"><span>${c.libelle}</span></span></button>`)}
  </div>`;
}

function GroupeFiltre({ titre, children }) {
  return html`<div class="groupe-filtre"><span class="titre-filtre">${titre}</span>${children}</div>`;
}

export function Historique() {
  const [segment, setSegment] = useState('jours');
  const [requete, setRequete] = useState('');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [f, setF] = useState({});
  const champRecherche = useRef(null);
  const majF = (cle) => (v) => setF((x) => ({ ...x, [cle]: v || null }));

  const { donnees } = useDonnees(async () => {
    const [journal, episodes, symptomes, items, audios] = await Promise.all([
      repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.listes.items(), repo.audios.metas(),
    ]);
    const avecMemo = new Set(audios.map((a) => `${a.parentStore}:${a.parentId}`));
    return { journal, episodes, symptomes, items, carte: carteLibelles(items), avecMemo, aujourdhui: repo.aujourdhui() };
  }, []);

  if (!donnees) return html`<main class="ecran"><${Entete} titre="Historique" /></main>`;
  const { carte, items, avecMemo, aujourdhui } = donnees;
  const periode = f.periode === '7' ? addDays(aujourdhui, -6) : f.periode === '30' ? addDays(aujourdhui, -29) : null;
  const q = requete.trim();
  const filtre = q || Object.values(f).some(Boolean);
  const optionsListe = (liste) => options(items, liste, null);

  let contenu;
  if (segment === 'jours') {
    let jours = filtrerJours(donnees.journal, { du: periode, lieu: f.lieu, humeur: f.humeur, avecExplosions: f.avecExplosions, avecNotes: f.avecNotes });
    const episodesDuJour = new Map();
    for (const e of donnees.episodes) {
      const j = jourEvenement(e.date, e.heure);
      if (!episodesDuJour.has(j)) episodesDuJour.set(j, []);
      episodesDuJour.get(j).push(e);
    }
    const trouves = q ? new Map(jours.map((j) => [j.date, chercher(j, 'journal', q, AVANT_EXTRAIT, APRES_EXTRAIT)])) : null;
    if (q) jours = jours.filter((j) => trouves.get(j.date));
    contenu = jours.length === 0
      ? html`<p class="vide">${filtre ? 'Rien ne correspond.' : "Aucune journée notée pour l'instant."}</p>`
      : grouperParSemaine(jours, (j) => j.date).map((g) => html`<section class="semaine">
        <h2 class="titre-semaine">${formaterSemaine(g.lundi)}</h2>
        <ul class="liste carte carte-groupe">${g.elements.map((j) => {
          const puces = phraseResume('jour', j, carte).filter((s) => s.valeur);
          const note = [];
          for (const e of (episodesDuJour.get(j.date) || []).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))) {
            const t = [libelle(carte, e.emotion), e.intensite].filter((x) => x != null).join(' ');
            if (t) note.push(t);
          }
          if (j.pointsPositifs) note.push(`« ${debutTexte(j.pointsPositifs, 34)} »`);
          return html`<li><a class="ligne-carte ligne-hist" href=${j.date === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: j.date })}>
            <span class="hist-corps">
              <span class="hist-date">${formaterJour(j.date)}${avecMemo.has(`journal:${j.date}`) && html`<${IconeMemo} />`}</span>
              ${puces.length > 0 && html`<span class="puces">${puces.map((p) => html`<span class=${`puce teinte-${p.rubrique}`}>${p.texte}</span>`)}</span>`}
              ${q ? html`<${Extrait} ex=${trouves.get(j.date)} />` : note.length > 0 && html`<span class="hist-note">${note.join(' · ')}</span>`}
            </span>
            ${Icones.chevron({ trait: 2 })}
          </a></li>`;
        })}</ul></section>`);
  } else {
    const store = segment;
    let liste = store === 'episodes'
      ? filtrerEpisodes(donnees.episodes, { du: periode, emotion: f.emotion, declencheur: f.declencheur, dessous: f.dessous, reaction: f.reaction, intenseSeulement: f.intenseSeulement })
      : filtrerSymptomes(donnees.symptomes, { du: periode, symptome: f.symptome });
    const trouves = q ? new Map(liste.map((e) => [e.id, chercher(e, store, q, AVANT_EXTRAIT, APRES_EXTRAIT)])) : null;
    if (q) liste = liste.filter((e) => trouves.get(e.id));
    const jourDe = (e) => jourEvenement(e.date, e.heure);
    const route = store === 'episodes' ? 'episode' : 'symptome';
    const resume = (e) => (store === 'episodes'
      ? [libelle(carte, e.emotion), e.intensite, libelle(carte, e.declencheur)]
      : [libelle(carte, e.symptome), e.intensite, libelle(carte, e.duree)]).filter((x) => x != null).join(' · ');
    contenu = liste.length === 0
      ? html`<p class="vide">${filtre ? 'Rien ne correspond.' : store === 'episodes' ? "Aucun épisode noté pour l'instant." : "Aucun symptôme noté pour l'instant."}</p>`
      : grouperParSemaine(liste, jourDe).map((g) => html`<section class="semaine">
        <h2 class="titre-semaine">${formaterSemaine(g.lundi)}</h2>
        <ul class="liste carte carte-groupe">${g.elements.map((e) => html`<li><a class="ligne-carte ligne-hist" href=${versHash(route, { id: e.id })}>
          <span class="hist-corps">
            <span class="hist-date">${formaterJour(jourDe(e))}${e.heure ? ` · ${e.heure}` : ''}${avecMemo.has(`${store}:${e.id}`) && html`<${IconeMemo} />`}</span>
            <span class="hist-resume">${resume(e) || (store === 'episodes' ? 'Épisode' : 'Symptôme')}</span>
            ${q ? html`<${Extrait} ex=${trouves.get(e.id)} />` : store === 'episodes' && e.reaction && html`<span class="hist-note">${libelle(carte, e.reaction)}</span>`}
          </span>
          ${Icones.chevron({ trait: 2 })}
        </a></li>`)}</ul></section>`);
  }

  // Résumé des filtres actifs, visible même panneau fermé.
  const resumeFiltres = [
    f.periode && PERIODES.find((p) => p.valeur === f.periode).libelle,
    f.lieu && libelle(carte, f.lieu),
    f.humeur && `humeur ${HUMEURS.find((h) => h.valeur === f.humeur).libelle}`,
    f.avecExplosions && 'avec explosions',
    f.avecNotes && 'avec notes',
    ...['emotion', 'declencheur', 'dessous', 'reaction', 'symptome'].map((c) => f[c] && libelle(carte, f[c])),
    f.intenseSeulement && 'intensité 7 et plus',
  ].filter(Boolean);

  const basculerRecherche = () => {
    if (rechercheOuverte) { setRechercheOuverte(false); setRequete(''); return; }
    setRechercheOuverte(true);
    setTimeout(() => champRecherche.current && champRecherche.current.focus(), 0);
  };

  return html`<main class="ecran historique">
    <${Entete} titre="Historique" />
    <${Segmente} etiquette="Afficher" options=${SEGMENTS} valeur=${segment} classe="large" sansVide=${true}
      surChoix=${(v) => { if (v && v !== segment) { setSegment(v); setF({}); } }} />
    <div class="barre-recherche">
      <button type="button" class="bouton-loupe" aria-label="Rechercher" aria-expanded=${rechercheOuverte ? 'true' : 'false'} onClick=${basculerRecherche}>${Icones.loupe()}</button>
      ${rechercheOuverte && html`<input ref=${champRecherche} type="search" class="champ-recherche" aria-label="Rechercher dans les textes" placeholder="Rechercher"
        value=${requete} onInput=${(e) => setRequete(e.target.value)} />`}
      <button type="button" class="btn-lien bouton-filtrer" aria-expanded=${filtresOuverts ? 'true' : 'false'} onClick=${() => setFiltresOuverts(!filtresOuverts)}>
        Filtrer${Icones.chevronBas({ trait: 2 })}</button>
    </div>
    ${resumeFiltres.length > 0 && html`<p class="resume-filtres">${resumeFiltres.join(' · ')}</p>`}
    ${filtresOuverts && html`<div class="filtres">
      <${GroupeFiltre} titre="Période"><${Pastilles} etiquette="Période" options=${PERIODES} valeur=${f.periode ?? null} surChoix=${majF('periode')} classe="souples" /></${GroupeFiltre}>
      ${segment === 'jours' && html`
        <${GroupeFiltre} titre="Lieu"><${Pastilles} etiquette="Lieu" options=${optionsListe('lieu')} valeur=${f.lieu ?? null} surChoix=${majF('lieu')} classe="souples" /></${GroupeFiltre}>
        <${GroupeFiltre} titre="Humeur"><${Pastilles} etiquette="Humeur" options=${HUMEURS} valeur=${f.humeur ?? null} surChoix=${majF('humeur')} classe="souples" /></${GroupeFiltre}>
        <${GroupeFiltre} titre="Avec"><${Bascules} etiquette="Avec" f=${f} majF=${majF}
          choix=${[{ cle: 'avecExplosions', libelle: 'Avec explosions' }, { cle: 'avecNotes', libelle: 'Avec notes' }]} /></${GroupeFiltre}>`}
      ${segment === 'episodes' && html`
        ${[['emotion', 'Émotion'], ['declencheur', 'Déclencheur'], ['dessous', 'En dessous'], ['reaction', 'Réaction']].map(([cle, titre]) => html`
          <${GroupeFiltre} titre=${titre}><${Pastilles} etiquette=${titre} options=${optionsListe(cle)} valeur=${f[cle] ?? null} surChoix=${majF(cle)} classe="souples" /></${GroupeFiltre}>`)}
        <${GroupeFiltre} titre="Intensité"><${Bascules} etiquette="Intensité" f=${f} majF=${majF} choix=${[{ cle: 'intenseSeulement', libelle: '7 et plus' }]} /></${GroupeFiltre}>`}
      ${segment === 'symptomes' && html`
        <${GroupeFiltre} titre="Symptôme"><${Pastilles} etiquette="Symptôme" options=${optionsListe('symptome')} valeur=${f.symptome ?? null} surChoix=${majF('symptome')} classe="souples" /></${GroupeFiltre}>`}
    </div>`}
    ${contenu}
  </main>`;
}
