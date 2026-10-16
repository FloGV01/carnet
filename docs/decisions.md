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

## 2026-10-05 : v4, retours de la première utilisation

Spécification complète : `docs/v4-specification.md`. Décisions qui modifient le plan ou le cahier :

- **Rappels (cahier §10)** : plus seulement un rappel du soir. L'utilisateur peut créer dans Raccourcis des rappels pour l'humeur du moment, aux heures choisies dans Réglages › Ma journée. L'app n'envoie toujours rien elle-même (pas de serveur, pas de notification locale possible pour une app web).
- **Explosions (plan §5.3)** : les épisodes dont la réaction est « Explosion » font foi. Pour ce seul champ, la valeur d'un jour est `max(compteur, épisodes)`, jamais une somme. Le compteur du soir est masqué par défaut. Un compteur vide vaut 0 dans l'analyse seulement à partir du premier lancement de la v4 (`meta.explosionsDepuis`) : avant, vide reste inconnu.
- **Base v2** : store `humeurs`, 76 éléments de liste ajoutés (`SEED_V2_AJOUTS`, figé avec `MIGRATION_2` et `seedItems` dans le verrou). Aucun réglage écrit par la migration.
- **Sauvegarde v2** : la méta de l'utilisateur est remplacée à l'import et restaurée par « Revenir ».
- **TCC** : l'Après coup suit l'analyse en chaîne, le tableau de pensées et les plans « si… alors… », sans aucun contenu proposé par l'app. « C'est injuste » n'est pas une « erreur de pensée » proposée.

## 2026-10-06 : v5, deuxième série de retours

Spécification : `docs/v5-specification.md`. Décisions qui modifient le plan :

- **Pas à pas retiré** (route, écran, bouton). La saisie du soir se fait sur Aujourd'hui.
- **Moment difficile** : la seule animation longue de l'app (cercle de respiration de 10 s par cycle), parce qu'elle guide la cohérence cardiaque ; coupée par le mouvement réduit (la phase écrite reste). Rien n'y est calculé ni choisi par l'app.
- **« J'ai fini pour ce soir »** : une préférence d'affichage de l'appareil (localStorage), jamais une donnée ; rien n'est compté.
- **Contacts multiples** : base v3 et sauvegarde v3 (voir la spécification).
- **Tendances** (plan §7 étendu) : une seule famille testée, l'humeur du soir ; erreur-type tirée des fenêtres de 28 jours de l'année précédente (la règle AR(1) paramétrique donnait 15 à 60 % de journaux avec une fausse phrase). Seuils calibrés : entrée |z| ≥ 3,5 et |d| ≥ 1, stabilité 7 jours, maintien |z| ≥ 2. Tendances seule : 0 à 1 journal sur 40 avec une fausse phrase en un an. Budget de bout en bout (bonnes journées, sommeil, Tendances) : au plus 10 % ; à 3,25, le scénario « composante lente » montait à 13 %. Prix : un changement durable de 3 points n'est retrouvé que 16 fois sur 40.
- **Analyse** : les 3 graphiques hebdomadaires et le tableau Évolution sont remplacés par « Mes jours » (par jour, semaine ou mois) ; la vue soignants reprend cette frise par semaine (par mois au-delà de 26 semaines), sans phrase.
- **Après coup** proposé sur tous les épisodes.

## 2026-10-15 : v6, « Mieux me comprendre »

Spécification : `docs/v6-specification.md` (ce qui a été construit et les écarts : §13). Décisions qui modifient le cahier des charges ou le plan :

- **Humeur du jour (cahier §6, humeur du soir)** : le champ Humeur du soir est masqué par défaut et peut être réaffiché. L'humeur d'un jour est la moyenne de ses humeurs du moment, « vers » compris ; un jour sans relevé garde son humeur du soir, jamais mêlée aux relevés. Toutes les analyses la lisent (`analyse/humeur-jour.js`), aucune ne lit plus `journal.humeur`.
- **« Rien ne s'ouvre tout seul »** : seule exception, la règle « Me ressourcer », éteinte au départ. Allumée, un relevé noté « maintenant » avec une énergie basse garde l'écran ouvert sur « Pour récupérer, je… ». Rien n'est calculé ni retenu.
- **Comprendre** : graphiques seulement, sans phrase calculée de plus, donc sans calibration nouvelle. Seuils d'affichage dans `analyse/seuils.js` (`comprendre`).
- **Base v4 et sauvegarde au format 4** : store `notes`, listes `pese`, `recharge` et `activiteMoment` (`SEED_V4_AJOUTS`, figé dans le verrou), masque `'humeur'` posé par la migration et par la mise à niveau des sauvegardes. Sauvegardes témoins aux formats 1, 2 et 3 (`tests/fixtures`).
- **Calibration** : refaite sur des relevés inventés (0 à 6 par jour, bruit dans la journée, puis la moyenne). Aucun seuil n'a changé. Bout en bout « relevés » : 3 journaux sur 30 pour les scénarios AR(1) et AR(1) à lieux en blocs longs, soit 10 %, la limite de la spec, acceptée ; les autres calibrations restent sous leur seuil.
- **Moment difficile** : la respiration se règle (2, 5 ou 10 min ; 5-5 ou 4-6), avec un signal sonore éteint par défaut, joué en mode ambiant ; « Une chose à la fois » ne compte rien.

### Arbitrages pendant la construction

- **Humeur du soir** masquée par défaut en même temps que le soir change d'affichage (tâche 10), pas avant.
- **Ma semaine** : le plus bas et le plus haut sont pris jour par jour parmi les relevés s'il y en a, sinon le soir ; jamais les deux un même jour.
- **Historique** : un jour qui n'a que des relevés a sa ligne (« humeur 5,6 »), comme dans l'export PSY.
- **Après coup** : « Ce jour-là » dit l'humeur du jour. Le cadre de bouton, le titre « Après coup · TCC » et son sous-titre valent aussi pour un nouvel épisode ; seule la ligne du haut « Mon plan · Après coup » est réservée à l'épisode rouvert.
- **Comprendre** :
  - les fenêtres d'événements antérieurs à la période sont exclues des « autres jours » ;
  - une liste vide (pesé, rechargé, activités) donne « pas assez de données » ;
  - le message de seuil s'affiche dans la carte du graphique ;
  - toucher une barre liste les jours où le facteur vaut « oui » ;
  - une colonne sans valeur garde son étiquette d'axe, sans marque ;
  - un SVG par bloc, sous un groupe qui porte la phrase ;
  - la phrase « Touche une barre » est retirée (les valeurs sont dans « Voir en tableau ») ;
  - « Tout » commence au premier jour des données.
- **Énergie basse dans Mes jours** : barres par semaine ou par mois à l'échelle de la plus haute de la période, comme les explosions.
- **Repères de traitement** : un trait au centre de la colonne par semaine ou par mois, la légende donne la date exacte ; la phrase de légende du PDF tient sur une ligne existante.
- **Page A4 de la vue soignants** : 272,4 mm dans le cas le plus haut, accepté. Avec un prénom de 12 caractères ou plus, le dépassement existait déjà ; rien n'est coupé, la limite réelle est de 285 mm.
- **Moment difficile** : « Une chose à la fois » est masqué sans carte ; l'ouvrir arrête une respiration en cours. La carte de la règle « Me ressourcer » n'a que « Respirer » et se ferme avec le ✕ de l'écran.
- **Notes en vrac** : Annuler après un effacement rend le dernier texte enregistré ; le brouillon du champ du haut reste sur l'appareil (hors sauvegarde) ; Retour dans une note déjà écrite va à la ligne ; en consultation, « Mes notes » se lit sans se modifier.
- **« La dernière fois »** ne cite jamais un rendez-vous à venir : la référence est comptée depuis la plus ancienne de deux dates, celle du rendez-vous et aujourd'hui (le rendez-vous du jour n'est pas encore passé). Arbitrage de la revue finale, construit (spec §7.2).
- **En parler au rendez-vous** : la question d'un épisode reprend émotion, intensité et réaction (celle d'un symptôme, de la même façon) ; l'Après coup reprend celle de son épisode.
- **Libellés choisis pendant la construction**, que ni la spec ni le plan ne fixaient :
  - aperçu d'import : « les réglages de la respiration », « les réglages de « Une chose à la fois » », « les réglages de « Me ressourcer » » ;
  - Comprendre : « Avant mes explosions », « A pesé : … », « Jours connus », l'en-tête de colonne « Compte » ;
  - légende des repères de traitement : « changement : » ;
  - messages : « Question ajoutée au rendez-vous · Annuler » et « Déjà dans ce rendez-vous ».
- **Ergonomie (tâche 26)** :
  - les zones de texte gardent leur taille au repos (2 lignes le plus souvent, jusqu'à 4 en consultation) et grandissent jusqu'à 7 lignes ;
  - les notes en vrac aussi : deux lignes au repos, comme le veut la spec ;
  - en sombre, un choix sélectionné, « + Épisode » et « Terminer » prennent un fond plein moins lumineux (`--p-*`), texte clair en 600, contraste d'au moins 5:1 ;
  - les zones de toucher des barres de Comprendre restent hautes de 22 (leurs valeurs sont aussi dans « Voir en tableau ») ;
  - récapitulatif de l'Après coup : les lignes suivent l'ordre du tableau de la spec ; « Le déclencheur », absent du tableau, garde son libellé.
