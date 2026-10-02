// « Mon traitement actuel » : un médicament par ligne, une dose par moment de la journée.
// Saisi à la main, enregistré à la sortie de chaque champ. Chaque changement (dose, nom, ajout,
// arrêt) crée ou complète la fiche « Changement / ajustement » du jour. Le jour de la mise en
// place n'en crée pas : il décrit l'existant, pas un changement.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { nouvelId } from '../../domain/ids.js';
import { formaterDateNumerique } from '../../domain/dates.js';
import { MOMENTS, normaliserTraitement, momentsUtilises, decrireChangements } from '../../domain/traitement-actuel.js';
import { Confirmation } from './confirmation.js';
import { Icones } from '../icones.js';

export const CLE_TRAITEMENT = 'traitementActuel';
const CLE_SUIVI = 'traitementActuelJour';

export async function lireTraitementActuel() {
  return normaliserTraitement(await repo.meta.lire(CLE_TRAITEMENT));
}

const aDesDoses = (x) => x.lignes.some((l) => Object.values(l.doses).some(Boolean));

// Enregistre la nouvelle version et tient à jour la fiche de changement du jour : elle décrit
// l'écart avec le traitement tel qu'il était au début de la journée.
async function enregistrer(avant, nouveau) {
  const n = normaliserTraitement(nouveau);
  if (JSON.stringify(n) === JSON.stringify(avant)) return n;
  await repo.meta.ecrire(CLE_TRAITEMENT, n);
  const jour = repo.aujourdhui();
  let suivi = await repo.meta.lire(CLE_SUIVI);
  if (!suivi || suivi.date !== jour) suivi = { date: jour, id: null, avant };
  // Mise en place : le jour où le traitement est saisi pour la première fois, pas de fiche.
  if (!aDesDoses(suivi.avant)) { await repo.meta.ecrire(CLE_SUIVI, suivi); return n; }
  const fiche = suivi.id ? await repo.traitements.lire(suivi.id) : null;
  const phrases = decrireChangements(suivi.avant, n);
  if (phrases.length) {
    const changement = phrases.join(' · ');
    if (fiche) await repo.traitements.modifier(fiche.id, { changement });
    else {
      const cree = await repo.traitements.creer({ date: jour, changement }, { id: nouvelId('tr') });
      suivi = { ...suivi, id: cree.id };
    }
  }
  await repo.meta.ecrire(CLE_SUIVI, suivi);
  return n;
}

// Tableau en lecture : moments utilisés seulement, « · » quand rien n'est pris à ce moment.
export function TableauTraitement({ traitement, surOuvrir }) {
  const moments = momentsUtilises(traitement);
  return html`<table class="tableau-traitement">
    <thead><tr><th scope="col"><span class="visuellement-cache">Médicament</span></th>${moments.map(([, nom]) => html`<th scope="col">${nom}</th>`)}</tr></thead>
    <tbody>${traitement.lignes.map((l) => html`<tr><th scope="row">${surOuvrir
      ? html`<button type="button" class="nom-medicament" aria-label=${`Modifier ${l.nom || 'le médicament'}`} onClick=${() => surOuvrir(l)}>${l.nom || '·'}</button>`
      : l.nom || '·'}</th>${moments.map(([c]) => html`<td>${l.doses[c] || '·'}</td>`)}</tr>`)}</tbody>
  </table>`;
}

function EditionLigne({ ligne, surChanger, surArreter, surFermer }) {
  const champ = (c, nom) => html`<label class="dose-moment"><span>${nom}</span>
    <input class="champ-ligne" defaultValue=${ligne.doses[c] || ''} enterkeyhint="done" aria-label=${`Dose, ${nom}`}
      onBlur=${(e) => surChanger({ ...ligne, doses: { ...ligne.doses, [c]: e.target.value } })}
      onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} /></label>`;
  return html`<div class="edition-traitement">
    <label class="libelle-carte" for=${`nom-${ligne.id}`}>Médicament</label>
    <input id=${`nom-${ligne.id}`} class="champ-ligne" defaultValue=${ligne.nom || ''} autocomplete="off" enterkeyhint="done"
      onBlur=${(e) => surChanger({ ...ligne, nom: e.target.value })} onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} />
    <div class="doses-moments">${MOMENTS.map(([c, nom]) => champ(c, nom))}</div>
    <div class="actions-ligne">
      <button type="button" class="lien-discret" onClick=${surArreter}>Arrêter ce médicament</button>
      <button type="button" class="btn-lien action" onClick=${surFermer}>Fermer</button>
    </div>
  </div>`;
}

export function CarteTraitementActuel() {
  const [t, setT] = useState(null);
  const [ouverte, setOuverte] = useState(null);
  const [arret, setArret] = useState(null);
  const courant = useRef(null);
  const file = useRef(Promise.resolve());
  useEffect(() => { lireTraitementActuel().then((x) => { courant.current = x; setT(x); }); }, []);
  if (!t) return null;

  // Écritures en file, toujours à partir de la dernière version : jamais deux fiches pour un même jour.
  const changer = (modifier) => {
    file.current = file.current.then(async () => {
      const n = await enregistrer(courant.current, modifier(courant.current));
      courant.current = n;
      setT(n);
    }).catch(() => {});
    return file.current;
  };
  const changerLigne = (l) => changer((x) => ({
    ...x, lignes: x.lignes.some((y) => y.id === l.id) ? x.lignes.map((y) => (y.id === l.id ? l : y)) : [...x.lignes, l],
  }));
  const enEdition = ouverte && { ...ouverte, ...(t.lignes.find((l) => l.id === ouverte.id) || {}) };

  return html`<section class="carte carte-traitement" aria-label="Mon traitement actuel">
    <div class="carte-entete"><h2 class="titre-carte">Mon traitement actuel</h2>
      ${t.depuis && html`<span class="note-carte-interne">depuis le ${formaterDateNumerique(t.depuis)}</span>`}</div>
    ${t.lignes.length === 0 && !ouverte && html`<p class="texte-secondaire">Ce que tu prends en ce moment, médicament par médicament, avec la dose à chaque moment de la journée.</p>`}
    ${t.lignes.length > 0 && html`<${TableauTraitement} traitement=${t} surOuvrir=${(l) => setOuverte(ouverte && ouverte.id === l.id ? null : l)} />`}
    ${enEdition && html`<${EditionLigne} key=${enEdition.id} ligne=${enEdition}
      surChanger=${(x) => { setOuverte(x); return changerLigne(x); }}
      surArreter=${() => (t.lignes.some((x) => x.id === enEdition.id) ? setArret(enEdition) : setOuverte(null))}
      surFermer=${() => setOuverte(null)} />`}
    ${!ouverte && html`<button type="button" class="btn-lien action ajout-medicament" onClick=${() => setOuverte({ id: nouvelId('med'), nom: null, doses: {} })}>${Icones.plus({ trait: 2 })}Ajouter un médicament</button>`}
    ${t.lignes.length > 0 && html`<label class="ligne-depuis"><span class="libelle-carte">Depuis le</span>
      <input type="date" class="champ-ligne" value=${t.depuis || ''} max=${repo.aujourdhui()} onChange=${(e) => { const v = e.target.value || null; changer((x) => ({ ...x, depuis: v })); }} /></label>
    <p class="note-carte-interne">Touche un médicament pour le modifier. Chaque changement crée une fiche « Changement / ajustement » datée.</p>`}
    ${arret && html`<${Confirmation} titre=${`Arrêter ${arret.nom || 'ce médicament'} ?`} texte="Il sort du traitement actuel. Une fiche de changement est créée."
      action="Arrêter" surAnnuler=${() => setArret(null)}
      surConfirmer=${() => { const l = arret; setArret(null); setOuverte(null); changer((x) => ({ ...x, lignes: x.lignes.filter((y) => y.id !== l.id) })); }} />`}
  </section>`;
}
