// L'épingle d'un élément de Bien-être (v10, spec §7.3 et §14.4) : un toucher l'ajoute aux favoris, un second l'en retire.
// Aucun nombre. Les favoris sont la méta `favorisBienEtre`, normalisée à la lecture (domain/favoris.js) ; elle ne compte pas
// comme une saisie (db/repository.js). Tant qu'elle n'est pas lue, l'épingle attend.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { basculerFavori, normaliserFavoris } from '../../domain/favoris.js';

// Le choix s'affiche tout de suite. Les écritures se suivent, chacune relue dans sa transaction : deux touchers rapprochés
// ne s'écrasent pas. Une lecture qui échoue donne une liste vide : l'épingle ne reste jamais inactive.
export function useFavoris() {
  const [favoris, setFavoris] = useState(null);
  useEffect(() => { repo.meta.lire('favorisBienEtre').catch(() => null).then((v) => setFavoris(normaliserFavoris(v))); }, []);
  const file = useRef(Promise.resolve());
  const basculer = (id) => {
    setFavoris((f) => basculerFavori(f, id));
    file.current = file.current.then(() => repo.meta.modifier('favorisBienEtre', (v) => basculerFavori(v, id))).catch(() => {});
  };
  return [favoris, basculer];
}

export function Epingle({ id, titre }) {
  const [favoris, basculer] = useFavoris();
  return html`<button type="button" class="epingle" aria-label=${`Épingler ${titre}`} aria-pressed=${favoris && favoris.includes(id) ? 'true' : 'false'}
    disabled=${!favoris} onClick=${() => basculer(id)}>${Icones.epingle()}</button>`;
}
