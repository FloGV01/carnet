# Déploiement (GitHub privé + Netlify)

## Mise en place, une seule fois

1. **Toi**
   - `gh auth login` : GitHub.com, HTTPS, connexion par navigateur.
   - Activer la double authentification sur GitHub.
2. **Claude**, après accord explicite :
   - `gh repo create suivi-audhd --private --source=. --remote=origin --push` ;
   - vérifier que `gh repo view --json visibility` renvoie `PRIVATE` ;
   - pousser la branche `dev`.
3. **Toi, sur app.netlify.com**
   - Créer le compte et activer la double authentification.
   - « Add new project », puis « Import an existing project », puis GitHub. Autoriser l'app Netlify sur **Only select repositories**, avec seulement `suivi-audhd`.
   - Branche de production : `main`. Laisser les réglages de build vides : ils sont lus dans `netlify.toml`.
   - Nom du site neutre, sans « audhd » ni « psy » (par exemple `carnet-xxxx`). **Ce nom ne doit plus jamais changer.**
   - Désactiver Deploy Previews et Netlify Drawer. Limiter les Branch deploys à `main` et `dev`.
4. **Claude** vérifie les en-têtes :
   - `curl -sI https://<site>.netlify.app/ | grep -iE 'content-security|referrer|x-robots'`
   - `curl -sI https://<site>.netlify.app/sw.js | grep -i cache-control`
   - puis la même chose sur `dev--<site>.netlify.app`.

## Règles permanentes

- **Le site** : ne jamais le renommer ni le supprimer tant que l'app est installée. Jamais de domaine personnalisé : le stockage de l'iPhone est lié à l'adresse exacte.
- **Les branches** : tout se développe sur `dev`. `main` ne reçoit que les points d'arrêt.
- **La visibilité** : le code est lisible par quiconque connaît l'adresse, y compris les listes par défaut. Les données, elles, ne quittent jamais l'iPhone.

## « Carnet TEST » (facultatif)

Une seconde icône, sur l'adresse de la branche `dev`, pour essayer une version sur l'iPhone avant qu'elle n'arrive dans « Carnet ». Le stockage de l'iPhone est lié à l'adresse exacte : « Carnet TEST » a sa propre base, séparée de celle de « Carnet », qui n'est jamais touchée.

Rien ne s'y saisit, rien de réel n'y entre : ni journal, ni épisode, ni mémo, ni vraie sauvegarde. Seules les sauvegardes témoins, inventées, y sont importées.

1. **Toi, sur app.netlify.com** : activer le déploiement de la branche `dev`.
   - Project configuration, puis Build & deploy, puis Branches and deploy contexts, puis Branch deploys.
   - Choisir « Let me add individual branches » et n'ajouter que `dev`. Deploy Previews reste désactivé.
   - Claude ne touche jamais à ces réglages. Sans cette étape, il n'y a pas de Carnet TEST, et rien d'autre ne change.
2. **Claude**, une fois le déploiement de `dev` terminé et sur ta confirmation : vérifier les en-têtes de `dev--<site>.netlify.app` avec les commandes de l'étape 4 de la mise en place.
3. **Toi, sur l'iPhone** : suivre `docs/installation-iphone.md` avec l'adresse `dev--<site>.netlify.app`, et nommer l'icône « Carnet TEST ». Attendre « Hors ligne : prêt » dans Réglages.
4. **Essais**
   - Les sauvegardes témoins sont dans `tests/fixtures/temoins/` (`format-1.json`, `format-2.json`, `format-3.json`, `format-3-memo.zip`). À envoyer sur l'iPhone par AirDrop ou iCloud Drive.
   - Dans Carnet TEST : Réglages, puis Sauvegarde, puis Importer, avec un témoin.
   - Puis Réglages, un appui long sur la version, puis « Vérifier mes données » : des nombres seulement, par table.
   - « Mémos sans fiche » et « Fiches illisibles » valent 0 pour un témoin.
   - Les tables de données (`journal`, `episodes`, `symptomes`, `traitements`, `rdv`, `humeurs`, `notes`, `audios`) ont les nombres de `counts` dans l'en-tête du fichier. Un `format-1` n'a pas de `humeurs` : 0. Aucun témoin n'a de `notes` (elles datent du format 4) : 0.
   - `listes` et `meta` peuvent être plus grandes que dans `counts` : l'import ajoute les listes par défaut absentes et garde les clés techniques de l'app. Ce n'est pas une perte.
5. **Essai d'un changement de base**, quand une version qui change la base va arriver sur `dev` :
   - avant de la pousser, « Carnet TEST » est déjà installé avec la version précédente de `dev`, et un témoin y est importé (étape 4) ;
   - une fois la nouvelle version déployée (Claude ne pousse qu'avec ton accord), rouvrir « Carnet TEST » et toucher le bandeau « Nouvelle version prête » ;
   - relancer « Vérifier mes données » : les tables de données ont les mêmes nombres qu'avant, `listes` et `meta` peuvent avoir grandi.
6. **Pour finir** : supprimer l'icône « Carnet TEST » (cela supprime ses données, c'est voulu). L'icône « Carnet » n'est ni renommée ni déplacée, et son adresse ne change pas.
