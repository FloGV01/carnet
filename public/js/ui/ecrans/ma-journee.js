// Réglages › Le soir (v4, « Ma journée » jusqu'à la v6.1) : afficher / masquer et ordonner les champs
// du soir. Un champ masqué garde ses données passées. Les heures de l'humeur du moment, rangées dans la
// même méta, se choisissent depuis la v6.1 dans Réglages › Rappels. La route reste /reglages/journee.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { normaliserJournee, deplacerChamp, NOMS_CHAMPS, MASQUE_PESE_RECHARGE, NOM_PESE_RECHARGE } from '../../domain/journee.js';
import { CarreIcone } from '../composants/rubrique.js';

// Le carré de chaque champ (2b) : l'icône et la couleur de sa rubrique, comme ses cartes sur Aujourd'hui.
const CARRES = {
  lieu: ['lieu', 'lieu'], sommeil: ['sommeil', 'sommeil'], humeur: ['humeur', 'humeur'], contact: ['contact', 'contact'],
  sport: ['sport', 'sport'], explosions: ['explosions', 'expl'], traitement: ['traitement', 'trt'], positifs: ['positifs', 'pos'],
  [MASQUE_PESE_RECHARGE]: ['peseRecharge', 'energie'],
};
const Carre = ({ champ }) => (CARRES[champ] ? html`<${CarreIcone} icone=${CARRES[champ][0]} teinte=${CARRES[champ][1]} />` : null);

// meta.journee, lue puis changée par « Le soir » et par Rappels : chaque changement passe par une file
// et se fait sur la valeur relue en base, pour que deux touchers rapprochés ne s'écrasent pas.
export function useJournee() {
  const [j, setJ] = useState(null);
  const file = useRef(Promise.resolve());
  useEffect(() => { repo.meta.lire('journee').then((v) => setJ(normaliserJournee(v))); }, []);
  const changer = (modifier) => {
    file.current = file.current.then(async () => {
      setJ(await repo.meta.modifier('journee', (v) => normaliserJournee(modifier(normaliserJournee(v)))));
    }).catch(() => {});
  };
  return [j, changer];
}

export function MaJournee() {
  const [j, changer] = useJournee();
  const focusApres = useRef(null);
  // Après un déplacement, le focus suit la flèche du champ déplacé (VoiceOver, clavier).
  useEffect(() => {
    if (!focusApres.current) return;
    const b = document.querySelector(`[data-fleche="${focusApres.current}"]`);
    focusApres.current = null;
    if (b) b.focus();
  }, [j]);
  // Les flèches restent focalisables en bout de liste (aria-disabled) : le focus ne tombe pas.
  const deplacer = (c, sens, bloque) => () => {
    if (bloque) return;
    focusApres.current = `${c}:${sens}`;
    changer((x) => deplacerChamp(x, c, sens));
  };
  const retour = () => { location.hash = '#/reglages'; };
  if (!j) return html`<main class="ecran fiche"><${Entete} titre="Le soir" retour=${retour} /></main>`;
  return html`<main class="ecran fiche ma-journee">
    <${Entete} titre="Le soir" retour=${retour} />
    <p class="texte-secondaire">Les champs de la saisie du soir. Un champ masqué garde ses données passées.</p>
    <ul class="liste carte carte-groupe avec-carres">${j.ordre.map((c, i) => html`<li class="ligne-champ-reglage" key=${c}>
      <${Carre} champ=${c} /><span class="ligne-libelle">${NOMS_CHAMPS[c]}</span>
      <div class="ordre">
        <button type="button" class="fleche" data-fleche=${`${c}:-1`} aria-label=${`Monter ${NOMS_CHAMPS[c]}`} aria-disabled=${i === 0 ? 'true' : 'false'} onClick=${deplacer(c, -1, i === 0)}>${Icones.monter()}</button>
        <button type="button" class="fleche" data-fleche=${`${c}:1`} aria-label=${`Descendre ${NOMS_CHAMPS[c]}`} aria-disabled=${i === j.ordre.length - 1 ? 'true' : 'false'} onClick=${deplacer(c, 1, i === j.ordre.length - 1)}>${Icones.descendre()}</button>
      </div>
      <${Interrupteur} etiquette=${`Afficher ${NOMS_CHAMPS[c]}`} actif=${!j.masques.includes(c)}
        surChanger=${(v) => changer((x) => ({ ...x, masques: v ? x.masques.filter((m) => m !== c) : [...x.masques, c] }))} />
    </li>`)}
      <li class="ligne-champ-reglage">
        <${Carre} champ=${MASQUE_PESE_RECHARGE} /><span class="ligne-libelle">${NOM_PESE_RECHARGE}</span>
        <${Interrupteur} etiquette=${`Afficher ${NOM_PESE_RECHARGE}`} actif=${!j.masques.includes(MASQUE_PESE_RECHARGE)}
          surChanger=${(v) => changer((x) => ({ ...x, masques: v ? x.masques.filter((m) => m !== MASQUE_PESE_RECHARGE) : [...x.masques, MASQUE_PESE_RECHARGE] }))} />
      </li>
    </ul>
  </main>`;
}
