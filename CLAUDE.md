# CLAUDE.md : Carnet (suivi-audhd)

PWA personnelle de suivi quotidien (journal du soir, épisodes émotionnels, symptômes, traitement, rendez-vous), pour un seul utilisateur, sur iPhone, installée sur l'écran d'accueil.

- **Référence** : `docs/cahier-des-charges.md`. Ses décisions du §2 ne se rediscutent pas.
- **Plan d'implémentation** : `~/.claude/plans/tu-as-ici-les-golden-truffle.md`, à suivre jalon par jalon (J0 à J12).

## Règles qui priment sur tout

- **Saisie du soir en moins de 30 s.** Un toucher enregistre, il n'y a jamais de bouton « Enregistrer ». Tout est facultatif, et un champ vide est une donnée valide.
- **Aucune mécanique d'engagement** : ni série, ni score, ni badge, ni félicitation, ni compteur de jours. Silence total sur les jours non saisis. Aucun jugement, aucun avis clinique.
- **Les listes `declencheur` et `dessous` ne se lissent jamais.** Leurs libellés sont dans `public/js/domain/vocabulaire.js`, figé une fois publié.
- **Le vocabulaire de la roue des émotions ne se lisse jamais non plus.** Familles et mots sont dans `public/js/domain/roue.js`, figé une fois publié : un ajout se fait à la fin, jamais de renommage. La règle vaut pour les 144 mots de la carte (v9). Les mots sans famille (Fatigué, Épuisé) ont le préfixe réservé `roue:aucune:` ; les mots à soi ont l'identifiant `roue:perso:u-<8 hexa>`, et leur libellé, leur zone et leur famille vivent dans la méta `motsPerso`, jamais dans l'identifiant.
- **Zéro réseau, zéro CDN.** Tout est vendorisé (`npm run vendor`). Aucune analytics, aucun appel sortant. La CSP est dans `netlify.toml`, qui est la seule source des en-têtes.
- **Pas d'étape de build.** Modules ES natifs. Preact + htm uniquement via `public/js/ui/lib.js`.
- **Sens des dépendances.** Seuls `ui/`, `app.js` et `main.js` importent `ui/` ou `vendor/`. `domain/`, `analyse/`, `db/` et `export/` sont purs : pas de DOM, et la date du jour est passée en paramètre.
- **Dates.** Jamais `toISOString().slice(0, 10)`. Tout passe par `domain/dates.js`, où la journée bascule à 4 h.

## Avant tout commit qui touche public/

```
npm run precache   # met à jour sw.js et js/version.js
npm test           # précache, tests unitaires (Paris et UTC), e2e Playwright
```

Le hook `pre-push` relance `npm test`.

## Données privées

- Ne jamais lire `donnees-privees/`, un `*sauvegarde*.json` ou un `carnet-*.zip`.
- Jamais de donnée réelle dans les tests ni dans les fixtures.
- `tests/unit/vie-privee.test.js` bloque les prénoms, noms, médicaments et lieux personnels, par empreinte.

## Outils

- **Serveur local** : `npm run serve` (127.0.0.1:5173), ou l'aperçu « carnet » de `.claude/launch.json`.
- **Service worker** : coupé sur localhost, sauf avec `?sw`. La page `?forcer-guide` affiche le guide d'installation.
- **Diagnostic iPhone** : appui long sur la version, dans Réglages.
