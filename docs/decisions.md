# Décisions et résultats de diagnostic

Ce journal note les arbitrages pris en cours de route et les résultats mesurés sur l'iPhone.

## 2026-10-01 : J0

- **Rendu** : Preact 10.29.8, ses hooks et htm 3.1.1 sont vendorisés séparément (`scripts/vendor.mjs`, empreintes dans `scripts/vendor.lock.json`). C'est préféré au bundle « standalone » de htm, qui embarque un Preact ancien sans `Fragment`.
- **Voix** :
  - `webkitSpeechRecognition` n'est jamais utilisé (inopérant dans une app installée).
  - « Dicter » s'appuie sur la dictée du clavier iOS.
  - « Mémo vocal » enregistre en AAC/MP4 via MediaRecorder.

## Diagnostic iPhone (à remplir après la recette J0)

- Mode, stockage protégé, quota :
- Partage JSON (application/json, text/plain), ZIP, PDF :
- Presse-papier, impression :
- Micro : formats acceptés, mimeType réel, octets par seconde, fréquence de l'invite :
- Dicter : le clavier s'ouvre-t-il au toucher ? La dictée marche-t-elle en mode avion ?

## 2026-10-01 : J7 à J12, après la relecture adversariale du moteur d'analyse

Le plan fixe aussi des objectifs de calibration (§9.1 : au plus 10 % de probabilité qu'un faux constat s'affiche sur un an de recalcul quotidien). Ces objectifs priment sur les valeurs de seuils du §7. Ils n'étaient pas tenus, d'où les écarts suivants.

### Sommeil et humeur, « le lendemain »

- **Avant** : Spearman partielle entre s[i] et h[i+1] en neutralisant **h[i]**.
- **Le défaut** : h[i] est un collisionneur. Avec un lien le jour même et une humeur autocorrélée, le calcul fabriquait un faux effet le lendemain : 39 cas sur 40 avec φ = 0,7.
- **Maintenant** : on neutralise **s[i+1]**, la nuit suivante, sur des jours consécutifs. Le vrai effet le lendemain reste détecté.

### Seuils (`analyse/seuils.js`)

| Analyse | Entrée | Sortie |
|---|---|---|
| Bonnes journées | q ≤ 0,02 (au lieu de 0,10) | q ≤ 0,05 (au lieu de 0,20) |
| Sommeil | α = 0,005 (au lieu de 0,025) | 0,01 (au lieu de 0,05) |

Avec les anciens seuils, environ la moitié des journaux sans aucun effet affichaient un faux constat dans l'année.

### Permutations

- **Avant** : blocs fixes de 7 jours.
- **Maintenant** : des blocs de longueur aléatoire, redécoupés à chaque tirage, de 21 jours en moyenne pour les bonnes journées et 14 pour le sommeil.
- **Ce que ça corrige** :
  - un facteur qui suit l'emploi du temps de la semaine était indétectable (p = 1) ;
  - avec des périodes de plusieurs semaines (congés, arrêt), on obtenait trop de faux constats.

### Contrepartie

Les premiers constats arrivent plus tard : vers 3 à 4 mois de données au lieu de 2. C'est conforme au CdC §6 : « avec peu de données, ne rien affirmer ».

### Robustesse

- Une humeur hors de 1 à 10 compte comme inconnue.
- Une statistique non finie ne produit jamais de constat.
- La série de test part de la première humeur notée et retire les trous de plus de 28 jours : une entrée vide en tête, ou une date aberrante, ne change rien.
- Le signal ne regarde que les 3 dernières années.
- Un constat déjà affiché n'est pas retronqué (budget de calcul).
- Réveils : une moyenne qui contient des « 5 ou plus » s'affiche « au moins X ».
- Phrases sommeil :
  - seules les qualités de nuit vues au moins 4 fois sont citées ;
  - le constat est retiré si ses chiffres contredisent le sens annoncé ;
  - « encore » n'apparaît que si le constat du jour même est affiché.
- « Depuis le début » part de la première date connue, toutes sources confondues.
