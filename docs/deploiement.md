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
