// Sauvegarde partagée par Réglages, l'écran d'import et « Tout effacer » : les fichiers sont
// préparés au chargement, pour que le partage parte dans le geste (iOS perd le geste après un await).
import { useEffect, useRef, useState } from './lib.js';
import { useEtatApp } from './hooks.js';
import { repo } from '../donnees.js';
import { VERSION_APP } from '../version.js';
import { exporter, analyserFichiers, lireTout, copieAvantImport, chiffrerPerte, metaRemplacee } from '../db/sauvegarde.js';
import { partagerPlusieurs, variantesTexte, premierPartageable, partager } from '../plateforme/partage.js';
import { copier } from '../plateforme/presse-papier.js';
import { estModeApp } from '../plateforme/mode.js';
import { afficherToast } from './composants/toast.js';

// Fichiers choisis pour un import : l'analyse passe de Réglages à l'écran d'import.
let importEnAttente = null;
export const lireImportEnAttente = () => importEnAttente;
export const oublierImport = () => { importEnAttente = null; };

export async function analyserChoix(fichiers) {
  try {
    const lus = await Promise.all(fichiers.map(async (f) => ({ nom: f.name, octets: new Uint8Array(await f.arrayBuffer()) })));
    const analyse = analyserFichiers(lus);
    const actuel = await lireTout(repo);
    const base = actuel.journal.length + actuel.episodes.length + actuel.symptomes.length + actuel.traitements.length + actuel.rdv.length + actuel.humeurs.length;
    importEnAttente = { analyse, perte: base ? chiffrerPerte(actuel, analyse) : null, metaRemplacee: metaRemplacee(actuel.meta, analyse.valides.meta) };
  } catch (err) {
    importEnAttente = { erreur: err && err.code ? err.message : 'Ce fichier est illisible.' };
  }
  return importEnAttente;
}

export function useSauvegarde() {
  const [infos, setInfos] = useState(null);
  const [fichiers, setFichiers] = useState(null);
  const [message, setMessage] = useState(null);
  // Les fichiers sont refaits après chaque écriture (regroupées) : ce qui est partagé contient
  // toujours la dernière saisie, et la date notée est celle des données incluses.
  const version = useEtatApp((e) => e.versionDonnees || 0);
  const premiere = useRef(true);

  // Les fichiers précédents restent partageables pendant la préparation (rien ne bouge à
  // l'écran) ; la date notée est toujours celle de l'instantané réellement partagé.
  const charger = async () => {
    try {
      const [derniere, ecriture, copie] = await Promise.all([repo.meta.lire('derniereSauvegarde'), repo.meta.lire('derniereEcriture'), copieAvantImport(repo)]);
      const instant = repo.maintenant().toISOString();
      const prets = (await exporter(repo, { versionApp: VERSION_APP })).map((f) => ({ ...f, fichier: new File(f.morceaux, f.nom, { type: f.type }), instant }));
      setFichiers(prets);
      setInfos({ derniere, ecriture, copie, taille: prets.reduce((n, f) => n + f.taille, 0) });
    } catch {
      setMessage("La sauvegarde n'a pas pu être préparée pour l'instant.");
    }
  };
  useEffect(() => {
    const minuterie = setTimeout(charger, premiere.current ? 0 : 500);
    premiere.current = false;
    return () => clearTimeout(minuterie);
  }, [version]);

  const noterSauvegarde = async (partages) => {
    const instant = (partages && partages[0] && partages[0].instant) || repo.maintenant().toISOString();
    await repo.meta.ecrire('derniereSauvegarde', instant);
    afficherToast('Sauvegarde faite.', null, 3000);
    setInfos((i) => ({ ...i, derniere: instant }));
  };

  // Appelé dans le geste : aucun await avant navigator.share.
  const exporterMaintenant = () => {
    if (!fichiers) return Promise.resolve('indisponible');
    setMessage(null);
    const partages = fichiers;
    const liste = partages.map((f) => f.fichier);
    return partagerPlusieurs(liste).then(async (r) => {
      if (r === 'partage') { await noterSauvegarde(partages); return r; }
      if (r === 'annule') return r;
      if (fichiers.length === 1 && fichiers[0].type === 'application/json') {
        const texte = new TextDecoder().decode(fichiers[0].morceaux[0]);
        const variante = premierPartageable(variantesTexte(fichiers[0].nom, texte, 'application/json').slice(1));
        if (variante) { const r2 = await partager(variante); if (r2 === 'partage') { await noterSauvegarde(partages); return r2; } }
        if (await copier(texte)) { setMessage('Copié. Colle-le dans une note pour le garder.'); return 'copie'; }
      }
      setMessage(estModeApp() ? "L'iPhone n'a pas proposé de partage cette fois." : null);
      return r;
    });
  };

  return { infos, fichiers, message, exporterMaintenant, recharger: charger };
}
