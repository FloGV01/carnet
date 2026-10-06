// Réglages › Ma journée (v4) : afficher / masquer et ordonner les champs du soir, choisir les
// heures de l'humeur du moment. Un champ masqué garde ses données passées.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { normaliserJournee, deplacerChamp, NOMS_CHAMPS, HEURE_MIN, HEURE_MAX } from '../../domain/journee.js';

const HEURES = Array.from({ length: HEURE_MAX - HEURE_MIN + 1 }, (_, i) => i + HEURE_MIN);

export function MaJournee() {
  const [j, setJ] = useState(null);
  const file = useRef(Promise.resolve());
  const focusApres = useRef(null);
  useEffect(() => { repo.meta.lire('journee').then((v) => setJ(normaliserJournee(v))); }, []);
  // Après un déplacement, le focus suit la flèche du champ déplacé (VoiceOver, clavier).
  useEffect(() => {
    if (!focusApres.current) return;
    const b = document.querySelector(`[data-fleche="${focusApres.current}"]`);
    focusApres.current = null;
    if (b) b.focus();
  }, [j]);
  const changer = (modifier) => {
    file.current = file.current.then(async () => {
      setJ(await repo.meta.modifier('journee', (v) => normaliserJournee(modifier(normaliserJournee(v)))));
    }).catch(() => {});
  };
  // Les flèches restent focalisables en bout de liste (aria-disabled) : le focus ne tombe pas.
  const deplacer = (c, sens, bloque) => () => {
    if (bloque) return;
    focusApres.current = `${c}:${sens}`;
    changer((x) => deplacerChamp(x, c, sens));
  };
  const retour = () => { location.hash = '#/reglages'; };
  if (!j) return html`<main class="ecran fiche"><${Entete} titre="Ma journée" retour=${retour} /></main>`;
  return html`<main class="ecran fiche ma-journee">
    <${Entete} titre="Ma journée" retour=${retour} />
    <p class="texte-secondaire">Les champs de la saisie du soir. Un champ masqué garde ses données passées.</p>
    <ul class="liste carte carte-groupe">${j.ordre.map((c, i) => html`<li class="ligne-champ-reglage" key=${c}>
      <span class="ligne-libelle">${NOMS_CHAMPS[c]}</span>
      <div class="ordre">
        <button type="button" class="fleche" data-fleche=${`${c}:-1`} aria-label=${`Monter ${NOMS_CHAMPS[c]}`} aria-disabled=${i === 0 ? 'true' : 'false'} onClick=${deplacer(c, -1, i === 0)}>${Icones.monter()}</button>
        <button type="button" class="fleche" data-fleche=${`${c}:1`} aria-label=${`Descendre ${NOMS_CHAMPS[c]}`} aria-disabled=${i === j.ordre.length - 1 ? 'true' : 'false'} onClick=${deplacer(c, 1, i === j.ordre.length - 1)}>${Icones.descendre()}</button>
      </div>
      <${Interrupteur} etiquette=${`Afficher ${NOMS_CHAMPS[c]}`} actif=${!j.masques.includes(c)}
        surChanger=${(v) => changer((x) => ({ ...x, masques: v ? x.masques.filter((m) => m !== c) : [...x.masques, c] }))} />
    </li>`)}</ul>
    <h2 class="libelle-section">Humeur du moment</h2>
    <p class="texte-secondaire">Les heures où tu veux un rappel. L'iPhone ne laisse pas une app web envoyer ses propres rappels : Réglages › Rappels te montre comment les créer dans Raccourcis.</p>
    <div class="pastilles souples heures-moment" role="group" aria-label="Heures des rappels">
      ${HEURES.map((h) => {
        const choisi = j.heuresMoment.includes(h);
        return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${h} h`}
          onClick=${() => changer((x) => ({ ...x, heuresMoment: choisi ? x.heuresMoment.filter((y) => y !== h) : [...x.heuresMoment, h] }))}>
          <span class="texte-pastille"><span>${h} h</span></span></button>`;
      })}
    </div>
    <a class="btn-lien action" href="#/reglages/rappel">${Icones.rappel()}Créer les rappels</a>
  </main>`;
}
