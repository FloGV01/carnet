# Carnet v4 : spécification

Retours de la première utilisation (5 octobre 2026), validés point par point, puis précisés après une
relecture adversariale de cette spécification. Rien de clinique : Carnet observe, range et rend les mots
de l'utilisateur. Il n'écrit jamais de conseil.

## 0. Décisions

| Sujet | Décision |
|---|---|
| Humeur du moment | Humeur 1-10 et énergie Basse / Moyenne / Haute, notées quand l'utilisateur le veut. Heures de rappel choisies dans Réglages, rappels créés dans Raccourcis : une app web sans serveur ne peut pas programmer de notification. Change la règle « un seul rappel du soir » (cahier §10). |
| Humeur du soir | Gardée comme bilan de la journée, jamais calculée à partir des humeurs du moment. |
| Sport en détail | Plusieurs activités par jour : type (liste modifiable) et durée (4 tranches). Le Oui / Non reste en un toucher. |
| Contact en détail | Avec qui (liste modifiable, plusieurs choix), puis Ressourçant · Neutre · Coûteux. Aucun prénom. |
| Réglages › Ma journée | Afficher / masquer chaque champ du soir, changer leur ordre, heures de l'humeur du moment. |
| Compter les explosions | Les épisodes dont la réaction est « Explosion » font foi. Le compteur du soir est masqué par défaut (réactivable). |
| Mon plan | Rédigé par l'utilisateur dans Réglages › Mon plan. Une ligne « Mon plan » dans chaque épisode, y compris pendant la saisie, ouvre une feuille en lecture seule. |
| Après coup | Retour à froid sur une explosion, une question par écran, toutes facultatives (analyse en chaîne, tableau de pensées, plan si… alors…). Exporté en entier vers PSY. |
| Analyse | « Avant tes explosions » : uniquement les données et les mots de l'utilisateur. « Profil de ta journée » pour les humeurs du moment. |

## 1. Données

### 1.1 Base : DB_VERSION 2

`MIGRATIONS[2]`, figée comme la 1 (empreinte dans `tests/unit/migrations.lock.json`, avec `SEED_V2_AJOUTS`
et `seedItems`) :
- crée le store `humeurs` (keyPath `id`, index `date`) ;
- verse `seedItems(SEED_V2_AJOUTS)` en n'ajoutant que les ids absents ;
- écrit `meta.schema = 2`. Rien d'autre : les réglages du soir ont une valeur par défaut à la lecture.

Synchrone (requêtes avec rappels, aucun `await`) : une erreur annule toute la mise à niveau, et l'ouverture
échoue avec `MIGRATION_ECHOUEE`, données v1 intactes. La copie `avant-migration-v1` est prise avant.

### 1.2 Nouveaux champs

`journal` :
- `activites` : `[{ type: 'typeSport:…', duree: 'dureeSport:…' }]` ou `null` (une ligne sans type ni durée est retirée) ;
- `contactAvec` : refs `contactAvec` ;
- `contactEffet` : ref `contactEffet`.

Choisir un détail met Sport ou Contact à Oui s'il est vide, dans le même patch. Oui / Non ne supprime
jamais le détail.

`episodes.apresCoup`, objet ou `null`. Un objet qui ne contient que `jour` vaut `null`.

| Champ | Type | Étape |
|---|---|---|
| `types` | refs `typeExplosion` | 1. C'était plutôt… |
| `fragilites` | refs `fragilite` | 2. Ce jour-là, ce qui me fragilisait déjà… |
| (`declencheur`, `situation` de l'épisode) | | 3. Le déclencheur |
| `signes`, `signesTexte` | refs `signe`, texte | 4. Mes premiers signes |
| `repereA` | entier 1-10 | 5. Quand j'ai remarqué que ça montait, j'en étais à… (1 = à peine, 10 = maximum) |
| `pieges`, `pensees` | refs `piegePensee`, texte | 6a (Colère). Ce que je me suis dit : « Ça ressemble à… », puis « Avec mes mots » |
| `tropDe`, `besoins` | refs `sourceSurcharge`, `besoin` | 6b (Surcharge ou Figé). Ce qui était trop, ce dont j'avais besoin |
| `surLeMoment`, `plusTard` | refs `consequenceCourt`, `consequenceLong` | 7. Ce que ça a donné |
| `autreFacon` | texte | 8 (Colère). Une autre façon de voir |
| `siJe`, `alorsJe` | textes | 9. Pour la prochaine fois |
| `tensionApres` | entier 1-10 | 10. Maintenant, en y repensant, c'est à… |
| `jour` | AAAA-MM-JJ | jour logique de la dernière écriture (posé par l'interface) |

Étape 6 : 6a si Colère est cochée, 6b si Surcharge ou Figé l'est ; aucune si rien n'est coché ou si seul
« Je ne sais pas » l'est. Une branche décochée qui porte des réponses reste affichée (rien n'est caché ni
effacé en silence). Le repère d'étapes compte les écrans réellement affichés. Jamais d'écart, de flèche
ni de comparaison entre `intensite`, `repereA` et `tensionApres`.

Store `humeurs` : `{ id, date, heure, humeur 1-10, energie }`, tous deux facultatifs. `date` et `heure`
sont l'instant réel du premier toucher ; le rattachement au jour suit `jourEvenement` (avant 4 h, la veille).
Un relevé sans humeur ni énergie est supprimé.

`meta` :
- `journee` : `{ ordre, masques, heuresMoment }`. Champs : `lieu, sommeil, humeur, contact, sport, explosions, traitement, positifs`. Absente ou illisible : ordre v3, `masques: ['explosions']`, `heuresMoment: []`. Heures de 6 à 23.
- `monPlan` : `{ premiersSignes, quandCaMonte, siSurcharge, pourRecuperer, prevenir }` (textes) et `siAlors: [{ si, alors }]`. Écrit par `repo.meta.modifier` (lecture et écriture dans la même transaction).
- `explosionsDepuis` : jour logique du premier lancement de la v4 (voir §2).

### 1.3 Listes (SEED_V2_AJOUTS, figé)

| Liste | Sens fixe | Éléments |
|---|---|---|
| energie | oui | Basse, Moyenne, Haute |
| typeSport | non | Marche, Vélo, Course à pied, Natation, Renforcement, Yoga / étirements, Autre |
| dureeSport | oui | Moins de 15 min, 15 à 30 min, 30 à 60 min, Plus d'1 h |
| contactAvec | non | Famille, Amis, Collègues, Soignants, Autre |
| contactEffet | oui | Ressourçant, Neutre, Coûteux |
| typeExplosion | oui | Colère, Surcharge, Figé, Je ne sais pas (exclusif, hors classement) |
| fragilite | non | Fatigue, Mauvaise nuit, Faim, Douleur, Imprévu, Trop de choses à la fois, Bruit / monde, Tension déjà là, Je ne sais pas |
| signe | non | Chaleur, Cœur qui s'accélère, Mâchoire ou poings serrés, Respiration courte, Voix qui monte, Gestes brusques, Envie de partir, Pensées qui tournent, Bruits insupportables, Je ne sais pas |
| piegePensee (titre « Ça ressemble à ») | non | Il le fait exprès, Je dois / il doit, Tout ou rien, Je sais ce qu'il pense, Ça va mal finir |
| sourceSurcharge | non | Bruit, Lumière, Monde, Changement, Attente, Trop de demandes, Fatigue |
| besoin | non | Calme, Sortir, Une pause, Casque / bouchons, Être seul, Manger / boire, Dormir, En parler, Je ne sais pas |
| consequenceCourt | non | Soulagement, La tension est tombée, Rien de spécial, Ça a empiré |
| consequenceLong | non | Regret, Honte, Conflit, Fatigue, Rien de spécial, J'ai pu réparer |

« Je ne sais pas » est exclusif et hors classement partout. « C'est injuste » n'est pas proposé : l'injustice
est un déclencheur et un « dessous » du vocabulaire propre de l'utilisateur, pas une erreur de pensée.

### 1.4 Sauvegarde : formatVersion 2

- Nouveau tableau `data.humeurs`, compté dans `counts`.
- `MISES_A_NIVEAU[1]` (pure) : ajoute `humeurs: []` et les éléments de `SEED_V2_AJOUTS` absents, et augmente `counts.listes` d'autant (la détection de troncature reste active).
- Import : références imbriquées (`activites`, `apresCoup`) vérifiées comme les autres ; un id inconnu crée un élément archivé.
- Méta : `schema`, `installation`, `derniereEcriture`, `derniereSauvegarde` ne sont ni exportées ni importées. `explosionsDepuis` est gardée si le fichier ne l'a pas. Toutes les autres clés (Mon plan, Ma journée, traitement actuel, réglages…) sont remplacées par celles du fichier, et une clé absente du fichier est retirée. « Revenir à l'état d'avant l'import » les restaure.
- `toutEffacer` recrée SEED_V1 et SEED_V2_AJOUTS.

## 2. Règle des explosions (pure, `domain/explosions.js`)

Pour un jour d : `n` = nombre d'épisodes rattachés à d (par `jourEvenement`) dont la réaction est
`reaction:explosion` ; `c` = compteur du soir.
- `c` renseigné → `max(c, n)`. Jamais d'addition entre sources (plan §7.1 inchangé).
- `c` vide, `n > 0` → `n`.
- `c` vide, `n = 0` : dans l'analyse, 0 si le jour a une entrée de journal **et** d ≥ `explosionsDepuis` ; sinon inconnu. Un compteur laissé vide avant la v4 reste inconnu.
- Affichage (phrase du jour, Historique et son filtre « Avec explosions ») : `max(c, n)` ou `n` s'il est positif, sinon rien. La valeur calculée n'est jamais enregistrée ; le champ du soir montre `c` tel quel.
- Les jours qui n'ont qu'un épisode d'explosion entrent dans les comptes d'explosions (fenêtres, semaines) avec ce seul champ ; jamais dans le calendrier, les bonnes journées, le sommeil ni le signal.

Remplace, pour ce seul champ, la règle du plan §5.3 « aucune saisie n'est déduite de l'autre ».

## 3. Écrans

- **Aujourd'hui** : champs dans l'ordre de `journee.ordre`, sans les masqués, sauf un champ masqué qui porte une valeur ce jour-là (il reste affiché pour être vu et effacé). Contact et Sport côte à côte s'ils se suivent ; seul, chacun s'affiche en ligne (rubrique à gauche, Oui · Non à droite). Replis « Sport en détail » et « Contact en détail » (fermés, suivent le masque de leur champ). Bande flottante sur une ligne : « Pas à pas » · « Moment » (aujourd'hui seulement) · « + Épisode ».
- **Humeur du moment** (`#/moment`) : humeur puis énergie sur un écran. Une ouverture = un relevé au plus, créé au premier toucher, l'écran se referme une fois les deux choisis. Liste des relevés du jour avec suppression et Annuler, rien si elle est vide, jamais de nombre.
- **Pas à pas** : suit l'ordre et les masques de `journee`. Aucune étape → directement le récapitulatif. Points positifs masqués → pas de zone de texte (le mémo reste).
- **Épisode** : ligne « Mon plan » sous la date, à chaque étape et au récapitulatif ; feuille en lecture seule, sans lien, fermée sur la même étape (Échap, Fermer, focus rendu à la ligne). Plan vide : « Rien d'écrit pour l'instant. » Au récapitulatif, ligne « Après coup » seulement si la réaction est Explosion ou si un après coup existe, avec son résumé ; jamais de verbe d'action ni de mention d'absence.
- **Après coup** (`#/apres-coup/:id`) : une étape par écran, toutes passables ; récapitulatif ; « Ajouter à Mon plan » à l'étape 9 (sans doublon, « Ajouté à Mon plan » avec Annuler). Fermer et Terminer reviennent à l'épisode.
- **Mon plan** (`#/mon-plan`, depuis Réglages) : 5 champs Dicter (Mes premiers signes, Quand ça monte, je…, Si c'est trop, je…, Pour récupérer, je…, Qui prévenir), liste des « si… alors… » avec retrait.
- **Réglages › Ma journée** (`#/reglages/journee`) : interrupteur par champ, flèches d'ordre (focus qui suit le champ, `aria-disabled` en bout de liste), heures de l'humeur du moment (6 h-23 h). **Rappels** : un pas-à-pas Raccourcis, « à refaire pour : 10 h, 14 h… ». Les heures ne servent qu'à ce pas-à-pas ; rien ne compare les heures aux relevés.
- **Analyse** :
  - « Avant tes explosions » : au moins 3 explosions sur la période (sinon PAS_ASSEZ et sa règle). Par liste, les éléments notés au moins 2 fois, hors « Je ne sais pas », sous la forme « Fatigue (3 sur 4) » où 4 est le nombre de fois où l'étape a été remplie, jamais le nombre d'explosions. Valeur du milieu du repère, « si… alors… », ce qui a aidé d'autres fois. Pied : « Ce sont tes notes, rassemblées : pas des causes. »
  - « Profil de ta journée » : créneaux de 2 h de 4 h à 4 h, affichés avec des relevés d'au moins 3 jours ; humeur = moyenne des moyennes de chaque jour, énergie en nombres. Aucun rang ni superlatif.
  - Tuiles Sport et Contact avec le détail en jours (« Marche 4 j · Vélo 2 j »), tuile « Comment c'était ». Aucun pourcentage.
- **Export PSY** : ligne du jour complétée (activités, contact), humeurs du moment sous le jour (un jour qui n'a que des relevés a une ligne de date seule), après coup sous chaque épisode, et rubrique « APRÈS COUP (épisodes plus anciens) » pour un après coup écrit dans la semaine (`apresCoup.jour`) sur un épisode plus ancien. COMPTEURS et REPÈRES n'utilisent que l'humeur du soir. Mon plan n'est pas exporté.

## 4. Ton

Aucune phrase de l'app ne dit quoi faire. Mots ajoutés au contrôle : « aurait fallu », « tu aurais pu »,
« tu aurais dû ». Les libellés des listes v4 passent aussi le contrôle (`ton.test.js`). Aucun « niveau ».

## 5. Tests

- Unitaires : migration 2 (base v1 avec données → v2 sans perte, copie prise, listes ajoutées une seule fois, échec → `MIGRATION_ECHOUEE`), verrou, `explosions.js` (0 seulement depuis `explosionsDepuis`), `champs` (activites, apresCoup, jour seul), sauvegarde v1 → v2 et méta à l'import et au retour, profil de journée, Avant tes explosions, détails en jours, export PSY (après coup tardif, jour à relevés seuls), phrase du jour et filtre de l'Historique, champs affichés.
- E2E : soir par défaut en 6 touchers sans groupe Explosions ; pire cas (8 champs, Contact et Sport séparés) sans défilement à 390 et 375 px ; champ masqué qui porte une valeur ; Pas à pas jusqu'au récapitulatif et sans aucune étape ; humeur du moment ; détails sport et contact ; Mon plan dans l'épisode ; Après coup complet ; Ma journée ; Analyse ; migration 1 → 2 dans WebKit.
