// Sauvegarde partagée par Réglages, l'écran d'import et « Tout effacer » : les fichiers sont
// préparés au chargement, pour que le partage parte dans le geste (iOS perd le geste après un await).
import { useEffect, useState } from './lib.js';
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

  const charger = async () => {
    const [derniere, ecriture, copie] = await Promise.all([repo.meta.lire('derniereSauvegarde'), repo.meta.lire('derniereEcriture'), copieAvantImport(repo)]);
    const prets = (await exporter(repo, { versionApp: VERSION_APP })).map((f) => ({ ...f, fichier: new File(f.morceaux, f.nom, { type: f.type }) }));
    setFichiers(prets);
    setInfos({ derniere, ecriture, copie, taille: prets.reduce((n, f) => n + f.taille, 0) });
  };
  useEffect(() => { charger(); }, []);

  const noterSauvegarde = async () => {
    const maintenant = repo.maintenant().toISOString();
    await repo.meta.ecrire('derniereSauvegarde', maintenant);
    afficherToast('Sauvegarde faite.', null, 3000);
    setInfos((i) => ({ ...i, derniere: maintenant }));
  };

  // Appelé dans le geste : aucun await avant navigator.share.
  const exporterMaintenant = () => {
    if (!fichiers) return Promise.resolve('indisponible');
    setMessage(null);
    const liste = fichiers.map((f) => f.fichier);
    return partagerPlusieurs(liste).then(async (r) => {
      if (r === 'partage') { await noterSauvegarde(); return r; }
      if (r === 'annule') return r;
      if (fichiers.length === 1 && fichiers[0].type === 'application/json') {
        const texte = new TextDecoder().decode(fichiers[0].morceaux[0]);
        const variante = premierPartageable(variantesTexte(fichiers[0].nom, texte, 'application/json').slice(1));
        if (variante) { const r2 = await partager(variante); if (r2 === 'partage') { await noterSauvegarde(); return r2; } }
        if (await copier(texte)) { setMessage('Copié. Colle-le dans une note pour le garder.'); return 'copie'; }
      }
      setMessage(estModeApp() ? "L'iPhone n'a pas proposé de partage cette fois." : null);
      return r;
    });
  };

  return { infos, fichiers, message, exporterMaintenant, recharger: charger };
}
