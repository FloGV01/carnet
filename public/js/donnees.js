// Instance unique du repository pour l'app, branchée sur l'état partagé.
import { creerRepository } from './db/repository.js';
import { etatApp } from './store.js';

export const repo = creerRepository({
  surChangement: (c) => etatApp.maj((e) => ({ versionDonnees: (e.versionDonnees || 0) + 1, dernierChangement: c })),
  surVersionChange: () => { try { location.reload(); } catch { /* hors navigateur */ } },
});
