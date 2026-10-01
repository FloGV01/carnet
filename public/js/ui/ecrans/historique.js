// Historique : jours, épisodes et symptômes, groupés par semaine. Les jours non saisis
// n'existent pas ici : ni ligne vide, ni décompte.
import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useDonnees } from '../hooks.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { formaterSemaine, formaterJour, formaterJourCourt, jourEvenement, addDays } from '../../domain/dates.js';
import { grouperParSemaine, filtrerJours, filtrerEpisodes, chercher } from '../../domain/historique.js';
import { versHash } from '../../routeur.js';
import { options } from './aujourdhui.js';

const SEGMENTS = [{ valeur: 'jours', libelle: 'Jours' }, { valeur: 'episodes', libelle: 'Épisodes' }, { valeur: 'symptomes', libelle: 'Symptômes' }];

function faitsDuJour(j, carte) {
  const f = [];
  if (j.humeur != null) f.push(`Humeur ${j.humeur}`);
  if (j.sommeilRessenti) f.push(`Sommeil ${libelle(carte, j.sommeilRessenti).toLowerCase()}`);
  if (j.lieu) f.push(libelle(carte, j.lieu));
  if (j.contactHumain === true) f.push('contact');
  if (j.sportMouvement === true) f.push('mouvement');
  return f.join(' · ');
}

function Extrait({ ex }) {
  if (!ex) return null;
  return html`<p class="extrait discret">${ex.avant}<mark>${ex.trouve}</mark>${ex.apres}</p>`;
}

function Selecteur({ etiquette, valeur, choix, surChoix }) {
  return html`<label class="filtre"><span class="etiquette">${etiquette}</span>
    <select class="champ-ligne" value=${valeur || ''} onChange=${(e) => surChoix(e.target.value || null)}>
      <option value="">Tous</option>
      ${choix.map((c) => html`<option value=${c.valeur}>${c.libelle}</option>`)}
    </select></label>`;
}

export function Historique() {
  const [segment, setSegment] = useState('jours');
  const [requete, setRequete] = useState('');
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [f, setF] = useState({});
  const majF = (cle) => (v) => setF((x) => ({ ...x, [cle]: v }));

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

  let contenu;
  if (segment === 'jours') {
    let jours = filtrerJours(donnees.journal, { du: periode, lieu: f.lieu, humeur: f.humeur, avecExplosions: f.avecExplosions, avecNotes: f.avecNotes });
    const nbEpisodes = new Map();
    for (const e of donnees.episodes) { const j = jourEvenement(e.date, e.heure); nbEpisodes.set(j, (nbEpisodes.get(j) || 0) + 1); }
    const trouves = q ? new Map(jours.map((j) => [j.date, chercher(j, 'journal', q)])) : null;
    if (q) jours = jours.filter((j) => trouves.get(j.date));
    contenu = jours.length === 0
      ? html`<p class="discret vide">${q || Object.values(f).some(Boolean) ? 'Rien ne correspond.' : "Aucune journée notée pour l'instant."}</p>`
      : grouperParSemaine(jours, (j) => j.date).map((g) => html`<section class="section">
        <h2>${formaterSemaine(g.lundi)}</h2>
        <ul class="liste carte">${g.elements.map((j) => {
          const second = [];
          const n = nbEpisodes.get(j.date);
          if (n) second.push(`${n} épisode${n > 1 ? 's' : ''}`);
          if (j.explosions > 0) second.push(`${j.explosions} explosion${j.explosions > 1 ? 's' : ''}`);
          if (j.pointsPositifs && !q) second.push(`« ${j.pointsPositifs.slice(0, 40)}${j.pointsPositifs.length > 40 ? '…' : ''} »`);
          return html`<li><a class="ligne-hist lien-ligne" href=${j.date === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: j.date })}>
            <span class="hist-date">${formaterJour(j.date)}</span>
            <span class="hist-faits">${faitsDuJour(j, carte) || '·'}${avecMemo.has(`journal:${j.date}`) ? html` <span class="icone-memo" aria-label="avec mémo vocal">${Icones.onde()}</span>` : ''}</span>
            ${second.length > 0 && html`<span class="hist-second discret">${second.join(' · ')}</span>`}
            ${q && html`<${Extrait} ex=${trouves.get(j.date)} />`}
          </a></li>`;
        })}</ul></section>`);
  } else {
    const store = segment;
    let liste = store === 'episodes'
      ? filtrerEpisodes(donnees.episodes, { du: periode, emotion: f.emotion, declencheur: f.declencheur, dessous: f.dessous, reaction: f.reaction, intenseSeulement: f.intenseSeulement })
      : donnees.symptomes.filter((s) => !periode || s.date >= periode);
    const trouves = q ? new Map(liste.map((e) => [e.id, chercher(e, store, q)])) : null;
    if (q) liste = liste.filter((e) => trouves.get(e.id));
    const jourDe = (e) => jourEvenement(e.date, e.heure);
    const route = store === 'episodes' ? 'episode' : 'symptome';
    const resume = (e) => (store === 'episodes'
      ? [libelle(carte, e.emotion), e.intensite, libelle(carte, e.declencheur)]
      : [libelle(carte, e.symptome), e.intensite, libelle(carte, e.duree)]).filter((x) => x != null).join(' · ');
    contenu = liste.length === 0
      ? html`<p class="discret vide">${q || Object.values(f).some(Boolean) ? 'Rien ne correspond.' : store === 'episodes' ? "Aucun épisode noté pour l'instant." : "Aucun symptôme noté pour l'instant."}</p>`
      : grouperParSemaine(liste, jourDe).map((g) => html`<section class="section">
        <h2>${formaterSemaine(g.lundi)}</h2>
        <ul class="liste carte">${g.elements.map((e) => html`<li><a class="ligne-hist lien-ligne" href=${versHash(route, { id: e.id })}>
          <span class="hist-date">${formaterJourCourt(jourDe(e))}${e.heure ? ` ${e.heure}` : ''}</span>
          <span class="hist-faits">${resume(e) || (store === 'episodes' ? 'Épisode' : 'Symptôme')}${avecMemo.has(`${store}:${e.id}`) ? html` <span class="icone-memo" aria-label="avec mémo vocal">${Icones.onde()}</span>` : ''}</span>
          ${q && html`<${Extrait} ex=${trouves.get(e.id)} />`}
        </a></li>`)}</ul></section>`);
  }

  const optionsListe = (liste) => options(items, liste, null);
  return html`<main class="ecran historique">
    <${Entete} titre="Historique" />
    <${Segmente} etiquette="Afficher" options=${SEGMENTS} valeur=${segment} surChoix=${(v) => { if (v) { setSegment(v); setF({}); } }} />
    <div class="barre-recherche">
      <span class="loupe" aria-hidden="true">${Icones.loupe()}</span>
      <input type="search" class="champ-ligne" aria-label="Rechercher dans les textes" placeholder="Rechercher" value=${requete} onInput=${(e) => setRequete(e.target.value)} />
      <button type="button" class="btn-lien" aria-expanded=${filtresOuverts ? 'true' : 'false'} onClick=${() => setFiltresOuverts(!filtresOuverts)}>Filtrer ▾</button>
    </div>
    ${filtresOuverts && html`<div class="filtres carte">
      <${Selecteur} etiquette="Période" valeur=${f.periode} choix=${[{ valeur: '7', libelle: '7 derniers jours' }, { valeur: '30', libelle: '30 derniers jours' }]} surChoix=${majF('periode')} />
      ${segment === 'jours' && html`
        <${Selecteur} etiquette="Lieu" valeur=${f.lieu} choix=${optionsListe('lieu')} surChoix=${majF('lieu')} />
        <${Selecteur} etiquette="Humeur" valeur=${f.humeur} choix=${[{ valeur: 'bas', libelle: '1 à 4' }, { valeur: 'moyen', libelle: '5 à 6' }, { valeur: 'haut', libelle: '7 à 10' }]} surChoix=${majF('humeur')} />
        <label class="case"><input type="checkbox" checked=${Boolean(f.avecExplosions)} onChange=${(e) => majF('avecExplosions')(e.target.checked)} /> Avec explosions</label>
        <label class="case"><input type="checkbox" checked=${Boolean(f.avecNotes)} onChange=${(e) => majF('avecNotes')(e.target.checked)} /> Avec notes</label>`}
      ${segment === 'episodes' && html`
        <${Selecteur} etiquette="Émotion" valeur=${f.emotion} choix=${optionsListe('emotion')} surChoix=${majF('emotion')} />
        <${Selecteur} etiquette="Déclencheur" valeur=${f.declencheur} choix=${optionsListe('declencheur')} surChoix=${majF('declencheur')} />
        <${Selecteur} etiquette="En dessous" valeur=${f.dessous} choix=${optionsListe('dessous')} surChoix=${majF('dessous')} />
        <${Selecteur} etiquette="Réaction" valeur=${f.reaction} choix=${optionsListe('reaction')} surChoix=${majF('reaction')} />
        <label class="case"><input type="checkbox" checked=${Boolean(f.intenseSeulement)} onChange=${(e) => majF('intenseSeulement')(e.target.checked)} /> Intensité 7 et plus</label>`}
      <button type="button" class="btn-lien" onClick=${() => setF({})}>Tout afficher</button>
    </div>`}
    ${contenu}
  </main>`;
}
