// Liste « Après coup » (v6) : les épisodes des 7 derniers jours logiques, du plus récent au plus
// ancien, une ligne chacun. Toutes les lignes ont la même forme : ni nombre, ni coche, ni état.
// Un toucher ouvre l'Après coup de l'épisode ; Fermer y ramène ici (ui/ecrans/apres-coup.js).
import { html } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees } from '../hooks.js';
import { carteLibelles } from '../../domain/libelles.js';
import { episodesRecents, premierJourRecent, ligneEpisodeRecent } from '../../domain/apres-coup.js';
import { versHash } from '../../routeur.js';
import { Entete } from '../composants/entete.js';
import { Icones } from '../icones.js';

export function ApresCoupListe() {
  const { donnees } = useDonnees(async () => {
    const aujourdhui = repo.aujourdhui();
    const [episodes, items] = await Promise.all([repo.episodes.parJour(premierJourRecent(aujourdhui), aujourdhui), repo.listes.items()]);
    return { episodes: episodesRecents(episodes, aujourdhui), carte: carteLibelles(items) };
  }, []);
  const tete = html`<${Entete} titre="Après coup (TCC)" retour=${() => { location.hash = '#/aujourdhui'; }} />`;
  if (!donnees) return html`<main class="ecran fiche">${tete}</main>`;
  const { episodes, carte } = donnees;
  return html`<main class="ecran fiche apres-coup-liste">
    ${tete}
    ${episodes.length === 0
      ? html`<p class="texte-secondaire">Aucun épisode récent.</p>`
      : html`<p class="texte-secondaire">Un épisode pour y revenir à froid, quand tu veux.</p>
        <ul class="liste carte carte-groupe">${episodes.map((e) => html`<li key=${e.id}>
          <a class="ligne-carte ligne-apres-coup" href=${versHash('apres-coup', { id: e.id })}>
            <span class="ligne-libelle">${ligneEpisodeRecent(e, carte)}</span>${Icones.chevron({ trait: 2 })}
          </a></li>`)}</ul>`}
  </main>`;
}
