// Humeur du moment (v4) : humeur 1-10 puis énergie, en deux touchers, quand on le veut.
// Le relevé est créé au premier toucher (date et heure réelles) ; une fois les deux choisis,
// l'écran se referme. L'humeur du soir reste le bilan de la journée : rien n'est calculé.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { CadreParcours } from '../composants/parcours.js';
import { Pastilles } from '../composants/pastilles.js';
import { Segmente } from '../composants/segmente.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const DELAI_FERMETURE_MS = 250;

export function Moment() {
  const [releve, setReleve] = useState({ humeur: null, energie: null });
  const [, signaler] = useIndicateur();
  const idRef = useRef(null);
  const file = useRef(Promise.resolve());
  const fermeture = useRef(null);
  const aujourdhui = repo.aujourdhui();
  const { donnees } = useDonnees(async () => {
    const [items, jour] = await Promise.all([repo.listes.items(), repo.humeurs.parJour(aujourdhui, aujourdhui)]);
    return { items, carte: carteLibelles(items), jour };
  }, [aujourdhui]);
  useEffect(() => () => clearTimeout(fermeture.current), []);

  const fermer = () => { clearTimeout(fermeture.current); location.hash = '#/aujourdhui'; };
  const ecrire = (changements) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        const maintenant = repo.maintenant();
        const id = nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({ date: cleLocale(maintenant), heure: heureLocale(maintenant), ...changements }, { id }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  const choisir = (champ) => (v) => {
    const suivant = { ...releve, [champ]: v };
    setReleve(suivant);
    ecrire({ [champ]: v });
    clearTimeout(fermeture.current);
    if (suivant.humeur != null && suivant.energie != null) {
      fermeture.current = setTimeout(async () => {
        await file.current;
        const id = idRef.current;
        fermer();
        if (id) afficherToast('Humeur du moment notée', { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(id) });
      }, DELAI_FERMETURE_MS);
    }
  };
  const supprimer = async (h) => {
    const sauve = await repo.humeurs.supprimer(h.id);
    if (h.id === idRef.current) { idRef.current = null; setReleve({ humeur: null, energie: null }); }
    afficherToast('Relevé supprimé', { libelle: 'Annuler', faire: () => repo.humeurs.restaurer(sauve) });
  };

  if (!donnees) return html`<div class="parcours"></div>`;
  const { items, carte, jour } = donnees;
  return html`<${CadreParcours} titre="Humeur du moment" teinte="humeur" surFermer=${fermer}
    sousTitre=${html`<p class="ligne-date ligne-date-fixe">Maintenant · ${heureLocale(repo.maintenant())}</p>`}>
    <div class="etape">
      <div><h2 class="titre-question">Humeur</h2><p class="sous-question">1 = au plus bas, 10 = au plus haut</p></div>
      <${Pastilles} etiquette="Humeur du moment" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${releve.humeur} surChoix=${choisir('humeur')}
        colonnes=${5} classe="chiffres grille-choix" teinte="humeur" />
      <h2 class="titre-question">Énergie</h2>
      <${Segmente} etiquette="Énergie" options=${options(items, 'energie', releve.energie)} valeur=${releve.energie} surChoix=${choisir('energie')}
        classe="large energie" teinte="humeur" />
      ${jour.length > 0 && html`<section class="moments-du-jour" aria-label="Relevés d'aujourd'hui">
        <h3 class="libelle-section">Aujourd'hui</h3>
        <ul class="liste carte carte-groupe">${jour.map((h) => html`<li class="ligne-info">
          <span><span class="heure-moment">${h.heure || '·'}</span> humeur ${h.humeur ?? '·'}${h.energie ? ` · énergie ${libelle(carte, h.energie).toLowerCase()}` : ''}</span>
          <button type="button" class="effacer" aria-label=${`Supprimer le relevé de ${h.heure || 'cette heure'}`} onClick=${() => supprimer(h)}>${Icones.fermer()}</button>
        </li>`)}</ul>
      </section>`}
    </div>
  </${CadreParcours}>`;
}
