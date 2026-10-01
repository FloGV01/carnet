// Instance unique du repository pour l'app, branchée sur l'état partagé.
import { creerRepository } from './db/repository.js';
import { etatApp, viderEnregistrements } from './store.js';

export const repo = creerRepository({
  surChangement: (c) => etatApp.maj((e) => ({ versionDonnees: (e.versionDonnees || 0) + 1, dernierChangement: c })),
  // Une autre connexion monte de version : on vide le texte en cours, puis on recharge.
  surVersionChange: async () => {
    await viderEnregistrements();
    setTimeout(() => { try { location.reload(); } catch { /* hors navigateur */ } }, 0);
  },
});
