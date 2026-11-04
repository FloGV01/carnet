# Carnet v6 (« V2 ») : spécification (construite, version 6.0.0)

Brainstorming du 8 au 12 octobre 2026, après la v5.0.0. Choix faits point par point par l'utilisateur, à partir de
quatre études contre-vérifiées :
- le marché (environ 60 applis) ;
- la recherche AuDHD et les outils de régulation ;
- ce que l'iPhone et le parcours de soins français offrent ;
- une revue d'ergonomie sur l'app qui tourne, avec des captures en clair et en sombre.

La spec a ensuite été relue par trois relecteurs indépendants (décisions et règles, code, données et tests), et
corrigée.

**Cadre**
- **Usage strictement personnel** : la commercialisation est écartée.
- **Règles inchangées** : celles de CLAUDE.md et du cahier des charges restent en vigueur.
- **Une seule règle assouplie**, et seulement par un réglage éteint au départ (§5) : « rien ne s'ouvre tout seul ».
- **Ce que fait Carnet** : il observe, range et rend les mots de l'utilisateur. Il ne conseille jamais, n'explique jamais et ne lance aucune alerte calculée.

**Livraison** : en une seule fois (choix du 12/10), version 6.0.0.

## 0. Décisions

| Sujet | Décision |
|---|---|
| Priorité | « Mieux me comprendre » : explosions, énergie, rythmes, traitement. |
| Écran Comprendre | Un écran à part, ouvert depuis l'Analyse, avec trois onglets : Explosions · Énergie · Rythmes. **Graphiques seulement** : aucune phrase calculée de plus, donc aucune calibration nouvelle. L'Analyse ne change pas, sauf la rangée énergie et les repères (§3). |
| Traitement | Repères seulement, sur Mes jours et sur le PDF. Aucune comparaison avant/après. |
| Humeur du jour (13/10) | Le champ « Humeur » du soir est retiré de la saisie : il est masqué et peut être réaffiché. L'humeur d'un jour devient **la moyenne de ses humeurs du moment**, « vers » compris. Un jour passé sans humeur du moment garde son humeur du soir. Toutes les analyses lisent cette humeur du jour (§1.0). C'est un choix de l'utilisateur qui modifie le cahier des charges (§6, humeur du soir). |
| Saisie du soir | Une ligne repliée « Ce qui a pesé · ce qui a rechargé ». |
| Humeur du moment | « C'était vers… » (une heure passée) et un repli « Ce que je faisais ». |
| Après coup (TCC) | Visible en haut de la fiche d'un épisode rouvert. Une ligne « Après coup (TCC) · tes épisodes récents » sur Aujourd'hui. |
| Fatigue | « Voir, plus ma règle » : la partie énergie, et une liste « Me ressourcer » qui s'affiche quand l'utilisateur note une énergie basse (règle éteinte au départ). **Pas d'alerte calculée.** |
| Moment difficile | Respiration réglable, avec un signal sonore facultatif éteint par défaut. « Une chose à la fois ». Accès à « Me ressourcer ». « Écrire mon plan ». Une page d'aide iPhone dans Réglages. |
| Soins | Onglet « Notes » (idées en vrac). « La dernière fois » et « En parler au rendez-vous ». |
| Ergonomie | Correctifs et ajustements d'office (§8), dont le mode sombre adouci : l'iPhone de l'utilisateur est en sombre le soir. |
| IA | Repoussée en V3, y compris « Copier pour PSY » et la notice pour PSY. |

## 1. Saisie

### 1.0 Humeur du jour (décision du 13/10)

**Le soir**
- Le champ « Humeur » n'est plus affiché. Il est masqué (`'humeur'` ajouté à `meta.journee.masques`) et l'utilisateur peut le réafficher dans Réglages › Ma journée.
- Comme pour tout champ masqué, il reste visible un jour où il porte une valeur : les jours passés notés le soir gardent donc leur champ.
- S'il n'y a eu aucune humeur du moment dans la journée, rien ne le signale. « C'était vers… » (§1.2) permet d'en ajouter une.

**La valeur du jour**
- Elle est calculée par une fonction pure, `humeurJour(date)`, dans `analyse/humeur-jour.js`, et lue par toutes les analyses :
  - si au moins un relevé d'humeur du moment est rattaché à ce jour logique (`jourEvenement`, « vers » compris), la valeur est la **moyenne** de ces relevés, avec le plus bas, le plus haut et la source « moment » ;
  - sinon, si `journal.humeur` est noté, c'est cette valeur, avec la source « soir ». Cela préserve l'historique ;
  - sinon, il n'y a pas d'humeur ce jour-là : la valeur est inconnue, sans mention.
- Le soir n'est jamais mélangé aux relevés d'un même jour.
- L'affichage se fait avec une décimale (« 5,6 »), l'arrondi n'intervenant qu'à l'affichage.

**Ce qui lit l'humeur du jour au lieu de `journal.humeur`**

| Endroit | Ce qui change |
|---|---|
| Aujourd'hui | Ligne de résumé (« humeur 5,6 ») et phrase de « J'ai fini pour ce soir ». |
| Ma semaine | « Humeur : de 3 à 8, 5,6 en moyenne ». Le plus bas et le plus haut sont pris parmi les relevés et les humeurs du soir des 7 jours ; la moyenne est celle des humeurs du jour. |
| Tendances | Calcul sur l'humeur du jour, puis **recalibration** (§10). |
| Mes jours | Par jour, un point pour l'humeur du jour et un trait du plus bas au plus haut, s'il y a au moins 2 relevés : on voit les journées mêlées. Par semaine ou par mois, la moyenne des humeurs du jour, comme aujourd'hui. La moyenne sur 7 jours lit l'humeur du jour. |
| Journées à 7 ou plus / à 4 ou moins | Les groupes portent sur l'humeur du jour (≥ 7,0 et ≤ 4,0). |
| Sommeil et humeur, signal de ressemblance, classements par humeur | Tous lisent l'humeur du jour. |
| Historique | Ligne du jour (« Humeur 5,6 ») et filtres « 1-4 · 5-6 · 7-10 », lus comme ≤ 4, entre les deux, ≥ 7. |
| Export PSY | La ligne du jour dit « humeur 5,6 (de 3 à 8) », ou « humeur du soir 6 » pour un jour passé sans relevé. La liste des relevés ne change pas. |
| Vue soignants | « Humeur moyenne » sur les humeurs du jour, avec dans l'en-tête : « Humeur : moyenne des relevés de chaque journée. » |
| Comprendre | Le facteur « humeur à 4 ou moins » et la mesure Humeur des Rythmes lisent l'humeur du jour (§2). |

« Ta journée heure par heure » ne change pas : elle lit les relevés eux-mêmes, hors « vers ».

### 1.1 « Ce qui a pesé · ce qui a rechargé » (soir)

- **Où** : un repli sur Aujourd'hui, juste après « Nuit en détail ». Il est visible et replié par défaut.
- **Contenu** : deux grilles de pastilles à choix multiple, « Ce qui a pesé » et « Ce qui a rechargé ».
  - Un toucher enregistre, un second efface.
  - Pas de « Je ne sais pas » ni de « Aucun » : un champ vide est une donnée valide.
- **Repli fermé** : sa ligne résume ce qui est noté (« pesé : bruit, trajets · rechargé : calme »).
- **Masquable** dans Réglages › Ma journée, par un simple interrupteur, sans place dans l'ordre des champs.
  - Une clé `peseRecharge` est acceptée dans `meta.journee.masques` par `normaliserJournee`.
  - Comme pour les champs, un repli masqué qui porte des valeurs ce jour-là reste affiché.
- **Listes modifiables** dans Réglages › Listes (elles vont dans `LISTES`, sans `sensFixe`). Ce ne sont pas des listes figées comme `declencheur` et `dessous`. Les identifiants publiés, eux, ne changent plus.
- **Listes de départ** (validées le 13/10, §12) :
  - `pese` : Bruit · Lumière · Monde · Changement · Attente · Trop de demandes · Fatigue · Masquer (faire comme si) · Trajets · Démarches. Les sept premiers reprennent mot pour mot les libellés de « Ce qui était trop » de l'Après coup (`sourceSurcharge`).
  - `recharge` : Être seul · Calme · Intérêt spécifique · Bouger · Dehors / nature · Stimmer · Musique · Sieste / repos.
- **Export PSY** : la ligne du jour ajoute « a pesé : … · a rechargé : … » quand c'est noté.

### 1.2 Humeur du moment

**Ce qui ne change pas** : les deux touchers (humeur, puis énergie) et la fermeture automatique. Elle a deux exceptions :
- le repli « Ce que je faisais » est ouvert ;
- la règle « Me ressourcer » joue (§5).

**« C'était vers… »**

La ligne « Maintenant · 18:42 » devient « Maintenant ▾ ».
- **Heures proposées** : les heures paires h avec 6 ≤ h ≤ 22, ou h ∈ {0, 2}, déjà atteintes dans le jour logique, l'heure en cours comprise.
  - Avant 06:00, aucune heure n'est proposée : « Maintenant » s'affiche sans ▾ et ne se touche pas.
  - Le calcul est une fonction pure de `domain/dates.js`, avec la date et l'heure en paramètres. Elle rend la liste et, pour une heure choisie, le couple (date calendaire, heure).
  - Exemple : le 13/10 à 01:30, « vers 22 h » donne 2026-10-12 22:00 et « vers 0 h » donne 2026-10-13 00:00. Les deux relevés sont au jour logique du 12/10.
- **Écriture** :
  - choisir « vers » avant toute valeur n'écrit rien : l'heure reste à l'écran et elle est posée à la création ;
  - après la création, le relevé est modifié en `{ date, heure, vers: true }`.
- **Le champ `vers`** :
  - il vaut `true` ou `null`, jamais `false` ;
  - c'est un champ de contexte (`CONTEXTE.humeurs = ['vers', 'faisais']`), donc à lui seul il ne garde pas un relevé. Retirer l'humeur et l'énergie d'un relevé « vers » le supprime, comme aujourd'hui.
- **Affichage** : partout où un relevé s'affiche (liste du jour, export PSY), un relevé « vers » s'écrit « vers 14 h ».
- **Où il compte** :
  - dans tous les graphiques d'énergie (§2, §3) ;
  - **pas** dans « Ta journée heure par heure » (`profilJournee`), ni dans la règle « Me ressourcer » (§5).

**« Ce que je faisais »**
- Un repli sous l'énergie, avec des choix multiples dans la liste `activiteMoment` : Travail · Trajet · Courses / démarches · Chez moi · Avec du monde · Repos.
- La liste est modifiable dans Réglages › Listes. Un relevé qui n'a que des activités, sans humeur ni énergie, n'est pas gardé.
- Quand le repli est ouvert, l'écran ne se ferme plus seul : on ferme avec ✕, et le message « Humeur du moment notée » s'affiche comme aujourd'hui.
- Le repli rouvre comme on l'a laissé (`carnet:moment:faisais`), choix approuvé le 08/10.
- Dans l'export PSY, les activités notées s'ajoutent entre parenthèses : « vers 14 h 5 (énergie basse ; travail, trajet) ».

## 2. Écran Comprendre

### 2.1 Accès et structure

- **Accès** (état v6.1, §14) : trois portes en haut de l'Analyse, Explosions · Énergie · Rythmes.
  - Chacune mène à `#/comprendre/<onglet>`. L'onglet n'est plus gardé : c'est la porte touchée qui le choisit. La clé `carnet:comprendre:onglet` de la v6.0 n'est plus lue.
  - Route `comprendre` (`/comprendre/ID` avec ID ∈ `explosions`, `energie`, `rythmes`). `ongletDe('comprendre')` donne « analyse ».
  - Écran poussé avec « ‹ Retour ».
- **Sélecteur** : « 3 mois · Tout », sur « Tout » par défaut et gardé (`carnet:comprendre:periode`).
  - « 3 mois » couvre [aujourd'hui − 89 j, aujourd'hui], comme la fenêtre « 90 » de l'Analyse.
  - Les jours repères (événements) sont pris dans la période. Leurs jours décalés sont lus dans toutes les données jusqu'à aujourd'hui, même avant la période.
  - Les « autres jours » sont les jours de la période jusqu'à aujourd'hui. Aujourd'hui compte tel quel : un facteur inconnu sort seulement de son compte.
- **Chaque graphique a** :
  - une phrase d'accessibilité **fixe** (`aria-label`), qui dit ce qui est montré et sur quelle période, sans valeur, sans classement et sans comparaison ;
  - « Voir en tableau », qui donne les valeurs ;
  - le pied « Ce sont tes notes, rassemblées : pas des causes. »
- **Sous un seuil** : « Pas encore assez de données pour le dire. », avec « Pourquoi ? » qui donne la règle fixe sans aucun décompte.
- **Couleurs** : chaque graphique a une seule teinte, celle de sa rubrique, comme dans l'Analyse (`teinte-expl`, `teinte-humeur`, `teinte-sommeil`). Jamais de pourcentage.

### 2.2 Le graphique aligné (commun)

Il est écrit une fois, en fonction pure (`analyse/comprendre.js`), avec sa géométrie (`ui/graphes/geometrie.js`). Il sert quatre fois : avant et après les explosions, avant les jours à énergie basse, autour d'un retour au bureau.

- **Entrées** : les jours repères, les décalages (par exemple −3, −2, −1, 0), des facteurs oui/non/inconnu par jour logique, et la règle des « autres jours ».
- **Un bloc par facteur**, avec une barre par décalage.
  - Sa longueur vaut oui / n, où n compte les jours repères dont ce jour-là a le facteur connu. Son libellé dit « 6 sur 10 ».
  - Ce n compte des événements, pas des jours saisis. C'est la forme acceptée pour les haltères des bonnes journées.
- **Repère des autres jours** : un trait pointillé vertical à la proportion des autres jours, légendé par le compte brut (« les autres jours : 27 sur 94 »).
- **Peu de valeurs** : une barre, ou le repère, qui repose sur moins de 3 valeurs affiche « · (peu de valeurs) ».
- **Toucher une barre** affiche les dates des jours repères concernés. Chacune ouvre son jour (`#/jour/:date`).

**Facteurs** (par jour logique ; « inconnu » sort seulement de son compte) :

| Facteur | Oui | Non | Inconnu |
|---|---|---|---|
| Nuit notée Mal | `sommeilRessenti` Mal | Moyen ou Bien | non noté |
| Énergie basse | au moins un relevé « basse » (« vers » compris) | des relevés d'énergie, aucun « basse » | aucun relevé d'énergie |
| Contact coûteux | 1) au moins une ligne de contact d'effet `contactEffet:couteux`, quel que soit `contactHumain` | 2) sinon `contactHumain === false` ; 3) sinon au moins une ligne, et toutes ont un effet | 4) sinon |
| Journée au bureau | lieu Bureau | autre lieu | lieu non noté |
| Explosion | valeur de `journalAvecExplosions` (règle de l'Analyse) ≥ 1 | valeur 0 : jour avec saisie du soir à partir de `meta.explosionsDepuis`, ou compteur noté 0 | sinon |
| Humeur à 4 ou moins | humeur du jour ≤ 4,0 (§1.0) | humeur du jour > 4,0 | inconnue |
| Élément pesé | élément coché | `journal.pese` non vide, sans cet élément | `journal.pese` vide |
| Élément rechargé | élément coché | `journal.recharge` non vide, sans cet élément | `journal.recharge` vide |

Les éléments pesés ou rechargés n'apparaissent que s'ils ont été notés au moins 3 fois sur la période.

### 2.3 Onglet Explosions

Un choix « Avant · Après ». Le graphique apparaît à partir de **3 jours d'explosion** sur la période.

- **Avant** :
  - décalages −3, −2, −1, 0 (« 3 jours avant », « 2 jours avant », « La veille », « Le jour même ») ;
  - facteurs : nuit notée Mal, énergie basse, contact coûteux, journée au bureau, éléments pesés ;
  - autres jours : explosion connue à 0, hors des 3 jours qui précèdent une explosion.
- **Après** :
  - décalages +1, +2, +3 (« Le lendemain », « 2 jours après », « 3 jours après ») ;
  - facteurs : humeur à 4 ou moins, énergie basse, nuit notée Mal, éléments rechargés ;
  - autres jours : explosion connue à 0, hors des 3 jours qui suivent une explosion.

### 2.4 Onglet Énergie

1. **« Ce qui a pesé, ce qui a rechargé »** : deux groupes de barres, dans l'ordre fixe des listes.
   - Chaque barre est longue comme le nombre de jours distincts où l'élément est noté.
   - Seuls les éléments notés au moins une fois apparaissent.
2. **« Avant mes jours à énergie basse »** : le graphique aligné.
   - Décalages −3 à 0.
   - Jours repères : au moins un relevé « basse » ce jour-là.
   - Facteurs : nuit notée Mal, contact coûteux, journée au bureau, explosion, éléments pesés et rechargés.
   - Autres jours : énergie notée ce jour-là sans aucun « basse », sans exclusion de fenêtre. Des jours bas fréquents rendraient sinon la comparaison impossible.
   - Seuil : 3 jours à énergie basse.
3. **« Selon ce que tu faisais »** : une barre par activité, découpée en relevés d'énergie basse, moyenne et haute.
   - Rampe `g-energie-1/2/3`, la même que dans « Ta journée heure par heure ».
   - Le libellé compte des relevés (« 12 relevés »), pas des jours.
   - Seules les activités présentes dans au moins 3 relevés avec énergie apparaissent.

L'énergie heure par heure reste dans l'Analyse.

### 2.5 Onglet Rythmes

**Le choix de mesure** « Humeur · Nuits Mal · Explosions · Énergie basse » sert aux graphiques 1, 2 et 5, et il est gardé (`carnet:comprendre:mesure`).
- Pour Nuits Mal, une nuit compte pour le jour où elle est notée, c'est-à-dire la nuit qui précède ce jour, comme dans l'Analyse.
- Seul le graphique 4 range les nuits au soir du coucher.

**Les cinq graphiques**

1. **« Selon le jour de la semaine »** : 7 colonnes, du lundi au dimanche.
   - **Humeur** : la moyenne des humeurs du jour en point, avec un trait de la plus basse à la plus haute humeur du jour, sur l'axe fixe de 1 à 10 avec les filets à 4 et 7. Sous 3 valeurs, le point devient un anneau creux.
   - **Autres mesures** : une barre dont la longueur est la proportion parmi les jours où la mesure est connue, libellée par le seul compte (« 3 lundis »). Le nombre de jours connus n'apparaît que dans « Voir en tableau » : aucun dénominateur de jours à l'écran.
   - **Seuil** : 2 colonnes à au moins 3 valeurs.
2. **« Selon le lieu »** : le même graphique, une colonne par lieu présent, dans l'ordre de la liste.
3. **« Autour d'un retour au bureau »** : le graphique aligné.
   - **Retour** : une journée notée Bureau dont la veille a un lieu noté autre que Bureau.
   - **Décalages** : −1, 0, +1, +2 (« La veille », « Le jour du retour », « Le lendemain », « 2 jours après »).
   - **Facteurs** : humeur à 4 ou moins, nuit notée Mal, énergie basse, explosion, contact coûteux.
   - **Autres jours** : hors des fenêtres de tous les retours.
   - **Seuil** : 3 retours.
4. **« Tes nuits selon le jour »** : une colonne par soir de coucher, du lundi au dimanche. La nuit notée le jour D appartient au soir D−1.
   - **Une nuit compte** si le coucher et le lever sont notés et que `dureeNuit` n'est pas nul : c'est le même filtre que l'Analyse.
   - **Axe vertical** de 20 h (en haut) à 12 h (en bas). Un coucher avant 12:00 compte après minuit, comme dans l'Analyse. Une médiane hors de l'axe est ramenée au bord, avec une marque ; le tableau donne l'heure exacte.
   - **Le trait** va de la médiane du coucher à la médiane du lever. Il est plein à partir de 3 nuits, en pointillé avec 1 ou 2 nuits, et absent sans nuit.
   - **Seuil** : 2 colonnes à au moins 3 nuits. Ce graphique ne vit que si « Nuit en détail » est rempli (§12).
5. **« Selon le mois »** : le même graphique que le 1, une colonne par mois calendaire du jour logique. Seuil : 2 mois à au moins 3 valeurs.

## 3. Analyse : énergie et traitement

**Rangée « Énergie basse » dans Mes jours**, à l'écran seulement : le PDF ne l'a pas.
- **Par jour** : un repère quand au moins un relevé est « basse », rien sinon.
- **Par semaine ou par mois** : le nombre de jours concernés, en barre, comme la rangée des explosions.
- **Absence** : la rangée n'existe pas tant qu'aucun relevé d'énergie n'est noté sur la période.

**Repères de traitement**
- **Ce qui est marqué** : chaque fiche Traitement dont le champ `changement` est rempli. Une fiche qui ne note que des effets n'a pas de repère.
- **Dans Mes jours** :
  - un trait vertical fin à la date, avec un numéro en haut (①, ②…), dans l'ordre chronologique des repères visibles ;
  - si deux changements tombent dans la même colonne (semaine ou mois), un seul trait porte « ①–② » ;
  - sous le graphique, une légende du type « ① 12/10 · changement : … », avec le texte coupé à 80 caractères.
- **Dans le PDF des soignants** :
  - seuls les changements qui ont une ligne dans la section « Traitement » de la page sont numérotés et tracés sur la frise ;
  - ces lignes reprennent leur numéro ;
  - aucun trait sans légende, et la page reste unique.
- Aucune comparaison avant/après.

## 4. Après coup : un accès simple

- **Fiche d'un épisode rouvert** (`#/episode/:id`) :
  - la ligne du haut devient « Mon plan · Après coup », visible sans défiler ;
  - en bas, la carte retrouve son cadre de bouton (elle l'avait perdu), teintée comme les épisodes, avec pour titre « Après coup · TCC ». Vide, elle a pour sous-titre « Retour à froid, quand tu veux : le soir, un autre jour, ou avant une séance. » Remplie, elle garde son résumé actuel ;
  - pendant la saisie d'un nouvel épisode, à chaud, rien ne change.
- **Aujourd'hui**, seulement sur `#/aujourdhui` et pas sur la page d'un jour passé : sous « Épisodes et symptômes », une ligne « Après coup (TCC) · tes épisodes récents › ». Elle n'apparaît que s'il y a au moins un épisode sur les 7 derniers jours logiques (rattachés par `jourEvenement`).
  - **La liste** : la ligne ouvre la route `apres-coup-liste` (`#/apres-coup`, avec `ongletDe` → « aujourdhui »). Elle contient **tous** les épisodes de ces 7 jours, du plus récent au plus ancien, sur une ligne chacun : « sam 10/10 18:42 · Colère · 7 ».
  - **Un toucher** ouvre directement l'Après coup de l'épisode, et Fermer ramène à la liste.
  - **Aucun état** : toutes les lignes ont la même forme, sans nombre, coche, couleur d'état ni « à faire ».

## 5. Fatigue : « Me ressourcer » et ta règle

**Écran « Me ressourcer »** (route `ressourcer`, `#/ressourcer`, avec `ongletDe` → « aujourdhui »)
- Il affiche en grand la rubrique « Pour récupérer, je… » de Mon plan, telle qu'écrite.
- Un bouton « Respirer » affiche la respiration sur place et la démarre aussitôt (composant partagé, §6).
- « Modifier » ouvre Mon plan.
- Vide : « Rien d'écrit pour l'instant. » et « Écrire ce qui me recharge ».
- On y accède depuis Moment difficile (§6) et par la règle.

**La règle**, dans Réglages › Me ressourcer (route `/reglages/ressourcer`)
- Un interrupteur éteint au départ : « Quand je note une énergie basse, montre-moi ma liste. »
- Quand il est allumé et qu'un relevé d'humeur du moment est noté avec une énergie « basse » :
  - le relevé doit être « maintenant », jamais « vers » ;
  - « Pour récupérer, je… » doit être écrit ;
  - l'écran ne se ferme pas seul et affiche sous les choix une carte « Pour récupérer, je… » avec « Respirer » ;
  - on ferme avec ✕.
- Sinon, rien ne s'affiche, sans aucune invitation.
- **Rien de calculé** : aucun seuil sur plusieurs jours, aucune trace de l'affichage, aucun compteur.
- **Code** : la règle est une fonction pure de `domain/ressourcer.js`.
- **Mots** : jamais « alerte », « tu devrais » ni « pense à ».

**Sieste** : la page d'aide iPhone (§6) explique le raccourci « Sieste » (minuteur, Ne pas déranger, sons). C'est l'iPhone qui sonne, pas Carnet.

## 6. Moment difficile

**Ordre de l'écran**
1. la respiration, prête à démarrer ;
2. « Une chose à la fois » ;
3. « Me ressourcer » ;
4. Mon plan tel qu'écrit ;
5. « Noter un épisode ».

Sans plan, le lien « Écrire mon plan » remplace la phrase actuelle. Avec un plan, un « Modifier mon plan » discret apparaît.

**Respiration**, sortie dans `ui/composants/respiration.js` et partagée avec « Me ressourcer »
- Réglages › Moment difficile (route `/reglages/moment-difficile`, clé méta `respiration`) :
  - **Durée** : 2, 5 ou 10 min (5 par défaut). Les textes d'avant (« Cohérence cardiaque · 5 minutes ») et de fin suivent la durée.
  - **Rythme** : 5-5 (par défaut) ou 4-6, avec l'expiration plus longue. `phaseRespiration` et l'animation suivent le rythme (pic à 40 % en 4-6).
  - **Signal sonore** : éteint par défaut (« ça dépend »). Un son doux à chaque changement de phase, généré par Web Audio, sans fichier. Il joue en mode « ambiant » : il se tait quand l'iPhone est en silencieux et se mêle à la musique. Une phrase sous l'option le dit. À essayer sur l'iPhone, en silencieux et avec de la musique.
- **Correctif** : avec « Réduire les animations », le cercle ne bouge plus du tout aujourd'hui. Il change désormais de teinte d'un coup à chaque phase (pleine à l'inspiration, claire à l'expiration), sans mouvement, en plus des mots « Inspire » et « Expire ».
- **Écran allumé** : le verrou existant pendant la respiration et pendant l'enregistrement d'un mémo est gardé.

**« Une chose à la fois »** : ton plan affiché une ligne par écran, en très grand texte.
- **Contenu** : les rubriques choisies dans Réglages (clé méta `uneChoseALaFois`). Par défaut, toutes sauf « Mes premiers signes ». Les « si… alors… » peuvent s'y ajouter. Chaque ligne non vide d'une rubrique devient une carte, avec le nom de la rubrique en petit en haut.
- **Navigation** : « Suivant », « Précédent », « Tout voir » (retour à Mon plan en liste), Fermer.
- **Rien n'est compté ni enregistré** : pas de « 3 sur 7 », pas de message de fin.
- **Écran** : pas de verrou d'écran sur cet affichage (« écran qui reste allumé » refusé le 12/10).

**Page d'aide iPhone**, dans Réglages › Aide iPhone (route `/reglages/aide-iphone`). Texte fixe, comme la page du rappel du soir, sans stratégie recommandée :
- Sons d'arrière-plan (« Bruit sombre ») depuis le Centre de contrôle, à lancer une fois avec du réseau ;
- une Concentration « Moment difficile » ;
- « Réduire le point blanc » au triple clic ;
- la Parole en direct ;
- « Toucher le dos » pour lancer un raccourci ;
- le raccourci « Sieste ».

## 7. Soins

### 7.1 Notes en vrac

- **Onglets** : Soins devient « Rendez-vous · Notes · Traitement » et rouvre le dernier onglet utilisé.
- **Saisie** : en haut de l'onglet Notes, un champ toujours prêt, « Une idée, en vrac… », avec Dicter.
  - La touche Retour ajoute la note et vide le champ.
  - Retour sur un texte vide, ou fait seulement d'espaces, ne fait rien.
- **Store `notes`** :
  - clés posées par l'app : `id`, `date` calendaire et `heure` réelles à l'écriture, comme les humeurs ;
  - champ saisi : `texte`.
- **Liste** : triée par date puis heure, de la plus récente à la plus ancienne. Elle affiche la date du jour logique (`jourEvenement`), « 12/10 », suivie du texte entier.
  - **Modifier** : un toucher modifie la note sur place, enregistrée 500 ms après la frappe.
  - **Effacer le texte** ne supprime pas la note pendant la frappe. Une note laissée vide en sortant du champ est supprimée, avec « Note supprimée · Annuler ».
  - **Supprimer** : ✕ supprime, avec le même « Annuler ».
  - **Sans note** : « Aucune note pour l'instant. »
- **En consultation** : un repli « Mes notes » les affiche.
- **Diffusion** : ni dans le PDF, ni dans l'export PSY, ni dans l'Analyse. Elles sont dans la sauvegarde (§9).

### 7.2 « La dernière fois »

- **Où** : sur la carte du prochain rendez-vous et en haut de « En consultation », un repli fermé « La dernière fois · 10/09 ».
- **Contenu** : il reprend, tels qu'écrits, « Ce qui a été dit / décidé » et « Prochaine étape » du rendez-vous de référence.
- **Rendez-vous de référence** : toujours un rendez-vous passé. C'est le dernier du même soignant, autre que celui-ci, daté avant la plus ancienne de deux dates : celle de ce rendez-vous et aujourd'hui.
  - Un rendez-vous à venir, ou « Date à fixer », compte donc depuis aujourd'hui : il ne cite jamais un autre rendez-vous à venir, ni celui du jour.
  - Un rendez-vous passé qu'on rouvre compte depuis sa propre date.
  - La fonction est commune avec la vue soignants. Elle prend la date de référence et l'identifiant à exclure.
- **Questions non abordées** de ce rendez-vous : chacune a un bouton « Reprendre ».
  - Il la copie une fois sur le rendez-vous en cours, lien compris (§7.3).
  - Le doublon est évité en comparant le texte, et le bouton affiche ensuite « Reprise ».
  - Le rendez-vous d'origine ne change pas.
- **Rien n'apparaît** si le rendez-vous n'a pas de soignant, ou s'il n'y a rien à montrer.
- **Mots** : jamais de compteur, de « oubliées » ni de « en retard ».

### 7.3 « En parler au rendez-vous »

- **Où** : sur le récapitulatif d'un épisode, d'un symptôme et d'un Après coup, et sur une fiche Traitement.
- **Feuille** : elle propose une question déjà écrite, modifiable avant l'ajout, faite des **choix seulement**, jamais de la situation ni des notes, puisque la question part sur la page A4.
  - Épisode : « Épisode du sam 3/10, 18 h · Colère 8/10 · Explosion ».
  - Fiche Traitement : « Traitement du 12/10 · … · Moins bien · Somnolence ». Le changement, coupé à 60 caractères, est déjà imprimé dans la section Traitement de l'A4.
- **Choix du rendez-vous** : L'utilisateur le choisit parmi les rendez-vous « À venir » (avec une date ou « Date à fixer »). Il peut aussi choisir « Nouveau rendez-vous » avec un soignant, ce qui crée un « Date à fixer ».
- **Lien** : la question garde un lien vers l'élément.
- **« Voir »** : en consultation, il ouvre une **feuille en lecture seule** par-dessus l'écran, sans navigation, sur le modèle de `FeuillePlan` : récapitulatif et textes, sans écriture.
  - Fermer ramène à la consultation.
  - « Voir » disparaît si l'élément a été supprimé.
- **PDF** : il ne montre que le texte de la question.

## 8. Ergonomie et correctifs (d'office)

- **Après coup** : la carte retrouve son cadre de bouton (§4).
- **Zones de texte qui grandissent** : deux lignes au moins, sept au plus, puis la zone défile.
  - Avec `field-sizing: content` quand il est pris en charge. Sinon, l'attribut `rows` est ajusté à la saisie, sans style en ligne.
  - Toutes les zones sont concernées : points positifs, notes, situation, ce qui a aidé, textes de l'Après coup, rendez-vous, notes en vrac.
  - Vide, une zone garde sa taille : le soir tient toujours sans défiler.
- **Bande du bas** : un fond plein, collé à la barre d'onglets. Le texte ne passe plus entre les boutons.
- **Cibles tactiles** d'au moins 44 pt :
  - « Mon plan » dans un épisode ;
  - l'effet du contact et l'effet ressenti ;
  - Jours · Épisodes · Symptômes ;
  - le sélecteur de période ;
  - la ligne de date, touchable sur toute sa largeur.
- **Récapitulatif de l'Après coup** : à gauche, des libellés courts à la première personne. La question complète reste sur l'écran de son étape.

  | Champ | Libellé |
  |---|---|
  | `types` | C'était plutôt |
  | `fragilites` | Ce qui me fragilisait |
  | `signes` | Mes signes |
  | `repereA` | Ça montait à |
  | `pensees` | Ce que je me suis dit |
  | `pieges` | Mes pièges |
  | `tropDe` | Ce qui était trop |
  | `besoins` | Ce dont j'avais besoin |
  | `surLeMoment` | Sur le moment |
  | `plusTard` | Plus tard |
  | `autreFacon` | Une autre façon de voir |
  | `siJe` / `alorsJe` | La prochaine fois |
  | `tensionApres` | Tension après |
- **Mode sombre** : un choix sélectionné garde un fond plein, mais moins lumineux, avec un texte clair en graisse 600 et un contraste AA. Même chose pour « + Épisode » et « Terminer ».
- **Lenteur des mémos** : Aujourd'hui, Soins et Historique ne lisent plus les sons pour savoir quelle fiche a un mémo.
  - Un `repo.audios.parents()` commun parcourt les clés de l'index `parent` (`openKeyCursor`), sans charger les enregistrements.
  - Réglages, qui a besoin de la taille, garde sa lecture.
- **Avant la base v4**, présenté d'office le 08/10 et à distinguer de « Vérifier un fichier », refusé :
  - **Sauvegardes témoins** aux formats 1, 2 et 3. Elles sont générées avec le `construireSauvegarde` des tags v3.0.0, v4.0.0 et v5.0.0, sur une base 100 % inventée.
    - « Complète » veut dire : chaque store, chaque champ non nul au moins une fois, un élément renommé, un élément archivé, un id inconnu, et un mémo en ZIP.
  - **« Vérifier mes données »** dans l'écran Diagnostic (caché, appui long sur la version) : des nombres seulement (fiches par table, mémos sans fiche, fiches illisibles), sans libellé ni texte. C'est différent de « Vérifier un fichier » dans Réglages, qui a été refusé.
  - **Procédure « Carnet TEST »** dans `docs/deploiement.md`, facultative. L'utilisateur active lui-même le déploiement de la branche `dev` sur Netlify.

## 9. Données, sauvegarde, architecture

**Base `DB_VERSION` 4** : `MIGRATIONS[4]` est synchrone et figée dans `migrations.lock.json`. Elle :
- crée le store `notes` (keyPath `id`, index `date`) ;
- verse `SEED_V4_AJOUTS` (listes `pese`, `recharge`, `activiteMoment`), chaque élément seulement si son id est absent ;
- écrit `meta.schema = 4` ;
- ajoute `'humeur'` à `meta.journee.masques` s'il existe et ne le contient pas (§1.0). C'est la seule écriture de préférence ;
- ne transforme aucun enregistrement existant.

`JOURNEE_DEFAUT.masques` devient `['explosions', 'humeur']`.

L'empreinte de `SEED_V4_AJOUTS` entre dans le verrou. Les tests `migrations-figees`, `vocabulaire` et `ton` sont étendus.

**Champs** (facultatifs, `null` si vides ; les clés sont posées par l'app)

- **`journal`** : `pese` (refs `pese`), `recharge` (refs `recharge`).
- **`humeurs`** : `vers` (`true` ou `null`), `faisais` (refs `activiteMoment`). Ce sont deux champs de contexte : ils ne gardent pas un relevé à eux seuls.
- **`notes`** : clés `{ id, date, heure }`, champ saisi `{ texte }`, plus `createdAt` et `updatedAt`.
- **Questions d'un rendez-vous** : `{ texte, abordee, lien? }`.
  - Le type `questions` de `champs.js` garde `lien` seulement si `store` ∈ {`episodes`, `symptomes`, `traitements`} et si `id` est une chaîne non vide.
  - Sinon, le lien est retiré avec un avertissement, et le rendez-vous n'est jamais rejeté.
  - L'existence de la cible n'est pas vérifiée (« Voir » disparaît simplement).

**Méta** : des clés séparées, chacune avec son libellé dans `NOMS_META` (aperçu d'import), et des valeurs par défaut appliquées à la lecture :
- `respiration { duree, rythme, son }` ;
- `uneChoseALaFois { rubriques, siAlors }` ;
- `ressourcer { energieBasse }`.

**Sauvegarde : `FORMAT_VERSION` 4**
- **`MISES_A_NIVEAU[3]`** :
  - ajoute les éléments de `SEED_V4_AJOUTS` absents (par id). Si `counts.listes` est un entier, il augmente d'autant, sinon le contrôle des comptes refuserait toute ancienne sauvegarde ;
  - pose `data.notes = []` et `counts.notes = 0` ;
  - ajoute `'humeur'` aux champs masqués de `meta.journee`, comme la migration.
- **Le store `notes` entre partout** : `STORES` (migrations.js), `STORES_DONNEES`, l'objet `data` de `construireSauvegarde`, `STORES_REMPLACES`, et le résumé de l'aperçu.
- **Perte chiffrée** : `chiffrerPerte` et la somme `base` comptent les notes : « N notes présentes ici et absentes du fichier seront effacées ».
- **Revenir à l'état d'avant l'import** : une copie qui n'a pas de tableau `notes` laisse les notes telles quelles, comme pour `humeurs`.
- **Listes à réensemencer** : `listesManquantes` (utilisé par « Revenir ») et `toutEffacer` versent aussi `SEED_V4_AJOUTS`.
- **Format plus récent** : une version plus ancienne de Carnet refuse proprement un fichier au format 4 (comportement existant).
- **Documentation** : `docs/format-sauvegarde.md`.

**Code pur**
- `analyse/humeur-jour.js` : l'humeur du jour (§1.0). Toutes les analyses la lisent, et aucune ne lit plus `journal.humeur` directement ;
- `analyse/comprendre.js` : le graphique aligné, les colonnes, les nuits, les activités ;
- `domain/ressourcer.js` : la règle ;
- `domain/dates.js` : les heures « vers » ;
- les seuils, dans `analyse/seuils.js` : `comprendre { minEvenements: 3, minValeurs: 3, minColonnes: 2, minActivite: 3, minElement: 3 }`.

**Routes** : `comprendre`, `apres-coup-liste`, `ressourcer`, `/reglages/moment-difficile`, `/reglages/ressourcer`, `/reglages/aide-iphone`.

**Vocabulaire** : tous les nouveaux libellés passent par le test des mots interdits et par celui de la vie privée.

## 10. Tests

**Unitaires** (Paris et UTC)

- **Humeur du jour** :
  - moyenne, plus bas et plus haut des relevés, « vers » compris ;
  - un relevé à 01:00 le jour D+1 compte pour le jour D ;
  - repli sur l'humeur du soir seulement sans relevé ;
  - jamais de mélange du soir et des relevés ;
  - inconnue sans rien ;
  - un test d'architecture : plus aucune analyse ne lit `journal.humeur` directement ;
  - le masque `'humeur'` posé par la migration 4 et par la mise à niveau de sauvegarde.
- **Graphique aligné** :
  - un effet planté (nuit Mal la veille) donne les bonnes proportions ;
  - un facteur inconnu sort du compte ;
  - des explosions rapprochées sont bien comptées ;
  - la règle des autres jours et la période (jours décalés lus avant la période) ;
  - chaque seuil ;
  - un relevé « basse » à 01:00 le jour D+1 compte pour le jour D.
- **Facteurs** :
  - Contact coûteux, un cas par ligne de la règle (dont Non + ligne Coûteux, null + Coûteux, Oui avec une ligne sans effet) ;
  - pesé et rechargé connus séparément.
- **Rythmes** :
  - jours de la semaine, lieu, retour au bureau ;
  - nuits selon le soir : minuit, bascule de 4 h, nuit hors axe ramenée au bord ;
  - mois, activités ;
  - aucun dénominateur dans les libellés.
- **« C'était vers… »** :
  - heures proposées à 04:30, 05:59, 06:00, 14:05, 01:30, 03:59 ;
  - le couple (date, heure) écrit, et le changement d'heure d'un relevé déjà créé ;
  - l'exclusion de `profilJournee` ;
  - « vers » seul est vide ;
  - retirer humeur et énergie d'un relevé « vers » le supprime ;
  - l'export PSY écrit « vers 14 h ».
- **Après coup récents** : les 7 jours logiques, avec un épisode à 02:00.
- **Repères de traitement** : la numérotation, « ①–② », et le PDF sans trait non légendé.
- **Règle « Me ressourcer »** : maintenant ou vers, plan vide, interrupteur éteint.
- **Données** :
  - migration 3 → 4 sur une base remplie : store et index, listes ajoutées une fois, un id existant renommé ou archivé qui n'est pas écrasé, enregistrements inchangés, copie avant-migration, schéma 4 ; mise à jour du test « base neuve » ;
  - sauvegardes témoins 1 → 4, avec un export puis un import identiques ;
  - « Revenir » vers une copie v5 : notes gardées, listes v6 remises ;
  - « Tout effacer » qui réensemence les listes v6 ;
  - perte chiffrée avec les notes ;
  - notes : Retour vide, texte effacé puis sortie, ✕ puis Annuler ;
  - lien d'une question : il survit à la normalisation, au cochage « abordée », à un export suivi d'un import, à la suppression puis à l'Annuler de la cible ; un lien invalide est retiré ; « Reprendre » le recopie.
- **Géométrie** : ni NaN, et tout reste dans le cadre.

**Navigateur** (WebKit iPhone 13, Chromium)

- **Comprendre** :
  - accès et trois onglets ;
  - « Pas encore assez de données » avec 2 explosions ;
  - graphiques avec 180 jours inventés ;
  - « Voir en tableau » et toucher d'une barre ;
  - phrase d'accessibilité sans valeur.
- **Après coup** : les deux accès.
- **Humeur du moment** : « C'était vers… » et « Ce que je faisais » (l'écran ne se ferme plus seul quand le repli est ouvert).
- **Règle « Me ressourcer ».**
- **Notes en vrac**, y compris en consultation.
- **Rendez-vous** : « La dernière fois » et « Reprendre », et le cas d'un rendez-vous passé rouvert ; « En parler au rendez-vous » et « Voir ».
- **Moment difficile** : réglé, signal éteint par défaut, « Une chose à la fois », réduction des animations.
- **Saisie du soir** : les zones de texte qui grandissent, et la page sans défilement à 390 × 797.
- **Repères** sur Mes jours et dans le PDF.
- **Mode sombre.**

**Navigateur, humeur du jour** :
- le soir sans champ Humeur, et la page qui tient sans défiler ;
- un jour passé noté le soir garde son champ ;
- le trait du plus bas au plus haut dans Mes jours ;
- l'export PSY et le PDF.

**Calibration**
- Aucune nouvelle phrase calculée.
- Comme l'humeur du jour remplace l'humeur du soir, le générateur de données fictives produit désormais des **relevés** : de 0 à 6 par jour, avec un bruit dans la journée, puis la moyenne.
- Les calibrations sont relancées sur ces données :
  - Tendances : faux positifs ≤ 8 %, budget de bout en bout ≤ 10 %, puissance ;
  - journées à 7 ou plus : faux constats ≤ 8 % ;
  - sommeil : ≤ 5 % ;
  - signal de ressemblance.
- Un seuil n'est changé (`seuils.js`) que si une calibration échoue. Le changement est alors consigné dans `docs/decisions.md`.

## 11. Écarté, et plus tard

- **Refusé par l'utilisateur (08-12/10)** :
  - commercialisation ;
  - comparaison avant/après traitement ;
  - phrases calculées nouvelles ;
  - budget ou jauge d'énergie ;
  - alerte calculée de fatigue ;
  - tableaux de Comprendre dans l'export PSY ;
  - « Vérifier un fichier » et « ranger la sauvegarde » (Réglages) ;
  - pause avec heure de retour ;
  - Dire sans parler ;
  - écran calme ;
  - Ma voix ;
  - Juste l'heure ;
  - Mon plan enrichi ;
  - Plutôt dans le corps ;
  - idées de saisie (pastilles récentes, détails ouverts seuls, Terminer en bas, « Ce jour-là, avant », « Pour redescendre ») ;
  - relire une journée en entier ;
  - écran qui reste allumé (Moment difficile hors respiration, En consultation) ;
  - nouveaux filtres et recherche étendue dans l'Historique (les filtres et la recherche actuels restent) ;
  - catalogue d'exercices écrits par l'app.
- **V3** :
  - l'assistant IA : « Copier pour PSY » sur un épisode, un accès direct à l'export, une notice pour PSY ; Claude dans Carnet seulement si l'utilisateur lève la règle « zéro réseau » ;
  - la page « Depuis ton dernier rendez-vous ».

## 12. Relecture de l'utilisateur (13/10)

- **Listes** « Ce qui a pesé », « Ce qui a rechargé » et « Ce que je faisais » : validées telles quelles. Elles avaient été reconstituées, le détail du 08/10 n'ayant pas été conservé.
- **Règle « Me ressourcer »** : énergie basse seule, sans autre cas.
- **« Nuit en détail »** est rempli souvent : « Tes nuits selon le jour » est gardé.
- **Humeur du jour** à la place de l'humeur du soir (§1.0), avec les trois choix suivants :
  - rien de plus un soir sans relevé ;
  - un trait du plus bas au plus haut dans Mes jours ;
  - les jours passés gardés.

## 13. Ce qui a été construit, et les écarts

Construite le 15/10, en 26 tâches, sur la branche `dev`. Version 6.0.0, base `DB_VERSION` 4, sauvegarde `FORMAT_VERSION` 4.

- **Données** : comme prévu (§9). Sauvegardes témoins aux formats 1, 2 et 3 dans `tests/fixtures`, « Vérifier mes données » dans le Diagnostic, procédure « Carnet TEST » dans `docs/deploiement.md`. Les mémos se repèrent par `repo.audios.parents()`, sans lire les sons.
- **Humeur du jour** (§1.0) : comme prévu. Ma semaine prend le plus bas et le plus haut jour par jour, parmi les relevés s'il y en a, sinon le soir, jamais les deux un même jour. L'Historique a une ligne pour un jour qui n'a que des relevés (« humeur 5,6 »), comme l'export PSY.
- **Calibration** (§10) : aucun seuil n'a changé. Sur les relevés inventés, le bout en bout atteint 3 journaux sur 30 pour les scénarios AR(1), soit la limite de 10 %.
- **Saisie du soir** : le repli « Ce qui a pesé · ce qui a rechargé » est fermé au départ. À 390 × 797, en clair comme en sombre, les champs et « Mes points positifs » tiennent sans défiler ; les replis suivants se lisent en faisant défiler la page.
- **Comprendre** (§2) :
  - un SVG par bloc du graphique aligné, sous un groupe qui porte la phrase ;
  - toucher une barre liste les jours où le facteur vaut « oui » ;
  - les fenêtres d'événements antérieurs à la période sont exclues des « autres jours » ;
  - une colonne sans valeur garde son étiquette d'axe, sans marque ;
  - « Tout » commence au premier jour des données ;
  - la phrase « Touche une barre » a été retirée : les zones de toucher ne sont pas annoncées par VoiceOver, les valeurs sont dans « Voir en tableau ».
- **Mes jours et PDF** : les barres d'énergie basse par semaine ou par mois sont à l'échelle de la plus haute de la période. Par semaine ou par mois, un repère de traitement est au centre de sa colonne ; la légende donne la date exacte.
- **Après coup** (§4) : le cadre de bouton, le titre « Après coup · TCC » et son sous-titre valent aussi pour la carte d'un nouvel épisode. Seule la ligne du haut « Mon plan · Après coup » est réservée à l'épisode rouvert. « Ce jour-là » dit l'humeur du jour.
- **Récapitulatif de l'Après coup** (§8) : une ligne par libellé du tableau, dans son ordre (« Ce que je me suis dit » avant « Mes pièges »). « Mes signes » réunit les choix et « Autre chose ». Le déclencheur, absent du tableau, garde « Le déclencheur ». Un toucher ouvre l'étape de la ligne.
- **Moment difficile et Me ressourcer** (§5, §6) :
  - « Une chose à la fois » est masqué quand le plan n'a aucune carte ; l'ouvrir arrête une respiration en cours ;
  - la carte de la règle n'a que « Respirer » et se ferme avec le ✕ de l'écran ;
  - l'écran « Me ressourcer » vide n'a pas « Respirer ».
- **Soins** (§7) : Annuler après l'effacement d'une note rend le dernier texte enregistré. Le texte du champ du haut, pas encore ajouté, est gardé sur l'appareil (hors sauvegarde). En consultation, « Mes notes » se lit sans se modifier. La question d'un épisode reprend émotion, intensité et réaction ; l'Après coup reprend celle de son épisode.
- **Zones de texte** (§8) :
  - `field-sizing: content` dans `composants.css`, bornée par la taille au repos de la zone (`data-lignes`) et 7 lignes ; sans lui, `ChampTexte` ajuste l'attribut `rows` à la saisie ;
  - vide, une zone garde sa taille même quand son texte d'aide est plus long ;
  - une note de la liste des notes en vrac a deux lignes au repos, comme les autres zones ;
  - la question de « En parler au rendez-vous » grandit de la même façon.
- **Bande du bas** (§8) : fond plein, celui de la page, posé sur la barre d'onglets (`--hauteur-onglets`). Elle reçoit aussi les touchers entre ses boutons. Le pied collant de Soins › Traitement est posé de la même façon.
- **Cibles de 44 pt** (§8) : tous les choix sur une ligne en grand format (`.segmente.large`) passent à 44, dont les onglets de Soins et de Comprendre et les réglages de la respiration. « Mon plan » et « Après coup » en haut d'un épisode aussi. La ligne de date se touche sur toute sa largeur, dans un épisode, un symptôme et l'humeur du moment.
- **Mode sombre** (§8) : un fond plein par rubrique, moins lumineux (`--p-*` dans `tokens.css`), sous un texte clair en graisse 600. Le contraste est d'au moins 5:1, et de 2,5:1 avec le fond d'une carte. En clair, rien ne change.

**Écart**
- **Comprendre** : les zones de toucher du graphique aligné restent hautes de 22 (moins de 44 pt). Les agrandir doublerait la hauteur de chaque bloc, pour un toucher qui ne donne que des dates, déjà dans « Voir en tableau ».

**À vérifier sur l'iPhone**
- Le signal sonore de la respiration, en silencieux et avec de la musique.
- Les chemins de la page d'aide iPhone et les noms d'actions de Raccourcis, écrits pour iOS 26.
- Les zones de texte qui grandissent, et la sortie d'une note vidée quand l'app passe en arrière-plan.

## 14. v6.1 (18/10)

Version 6.1.0, construite le 18/10 en 8 tâches sur la branche `dev`, d'après l'état des lieux du 18/10. Elle apporte quatorze changements d'organisation et de rapidité (P1 à P4, P7 à P16) et ne touche ni à l'apparence générale ni à la base (`DB_VERSION` 4, `FORMAT_VERSION` 4).

Là où elle s'écarte de cette spécification, la v6.1 fait foi. Par exemple :
- l'écran « Me ressourcer » est retiré, et Réglages › « Ma journée » devient « Le soir » ;
- Comprendre s'ouvre par trois portes depuis l'Analyse et ne garde plus le dernier onglet (§2.1) ;
- Export PSY et Vue soignants ne sont plus au bas de l'Analyse. Ils s'ouvrent depuis Soins, par la ligne « Pour mes soignants », et l'onglet Soins reste allumé ;
- le prénom de la page se règle dans la Vue soignants (« Prénom sur la page »), et non plus dans Réglages › Analyse.

Le détail, les arbitrages A1 à A5 et ce qui attend Claude Design (P5, P6) sont dans `docs/decisions.md`, à l'entrée du 18/10.

## 15. v7 (22/10)

Version 7.0.0, construite du 20 au 22/10 en 9 tâches sur la branche `dev`. Elle a sa propre spécification, `docs/superpowers/specs/2026-10-20-carnet-v7-emotions-bien-etre-design.md`, qui fait foi là où elle s'écarte de celle-ci :
- l'humeur du moment devient l'**émotion du moment** (une roue de 7 familles en bulles, puis un mot), sans note de 1 à 10 ; les anciennes notes restent affichées ;
- les analyses fondées sur la note (tendances, journées à 7 ou plus, sommeil et humeur, signal de ressemblance) sont retirées, avec leurs réglages ; l'Analyse et Comprendre parlent d'émotions ;
- un onglet **Bien-être** (cohérence cardiaque, exercices de sophrologie, séances) remplace l'Historique dans la barre ; l'Historique s'ouvre par sa porte en haut de l'Analyse ;
- toute l'app passe à l'apparence **2b** de Claude Design, à la police système ;
- la base passe à `DB_VERSION` 5 (store `seances`), la sauvegarde au format 5 ; le format de l'Export PSY change.

Le détail, les appels du concepteur et ce qui attend l'utilisateur sont dans `docs/decisions.md`, à l'entrée du 22/10.

## 16. v8 (26/10)

Version 8.0.0, construite du 24 au 26/10 en 9 tâches sur la branche `dev`. Elle a sa propre spécification, `docs/superpowers/specs/2026-10-24-carnet-v8-design.md`, qui fait foi là où elle s'écarte de celle-ci et de celle de la v7 :
- l'**émotion du moment** se note sur une carte, comme How We Feel : une tuile (l'énergie, « plutôt désagréable » ou « plutôt agréable »), puis un mot, avec sa définition, corrigeable dans Réglages › Émotions ;
- le **Bien-être** passe dans un lecteur avec des sons, et les exercices dans un **Programme** de 8 étapes et 17 séances, où une séance menée au bout porte « Faite le 12/10 », sans aucun compteur ;
- le **sommeil** se note en heures et en qualité ; coucher, lever et réveils ne se saisissent plus le soir, et « Mes nuits » les montre nuit par nuit, aussi sur l'A4 des soignants ;
- la base passe à `DB_VERSION` 6 (liste `sujetRdv`), la sauvegarde au format 6 ; le format de l'Export PSY change (la nuit dit ses heures).

Le détail, les appels du concepteur, ce qui attend l'utilisateur et les textes à relire sont dans `docs/decisions.md`, à l'entrée du 26/10.

## 17. v9 (30/10)

Version 9.0.0, construite du 28 au 30/10 en 8 tâches sur la branche `dev`. Elle a sa propre spécification, `docs/superpowers/specs/2026-10-28-carnet-v9-design.md`, qui fait foi là où elle s'écarte de celle-ci et de celles des v7 et v8 :
- l'**émotion du moment** se note comme dans How We Feel, en plein écran noir : une couleur parmi quatre bulles, puis un mot sur une carte de 144 mots qu'on fait glisser, avec sa définition et une flèche vers « Ce que je faisais » ; une loupe cherche un mot, et l'on peut ajouter un mot à soi ;
- la roue passe de 79 à 144 mots, 36 par zone ; Fatigué et Épuisé n'ont pas de famille ; un relevé se rouvre depuis Ma journée de n'importe quel jour ;
- un mot a la **couleur de sa zone** partout (rouge, jaune, bleu, vert) ; l'Analyse gagne « Tes zones », l'Export PSY et la page A4 une ligne de zones ;
- la base reste en `DB_VERSION` 6 ; la sauvegarde passe au format 7 (méta `motsPerso`).

Le détail, les appels du concepteur, ce qui attend l'utilisateur et les textes à relire sont dans `docs/decisions.md`, à l'entrée du 30/10.

## 18. v10 (03/11)

Version 10.0.0, construite du 30/10 au 03/11 en 9 tâches sur la branche `dev`. Elle a sa propre spécification, `docs/superpowers/specs/2026-10-30-carnet-v10-design.md`, qui fait foi, §14 compris, là où elle s'écarte de celle-ci et de celles des v7 à v9 :
- **Moment difficile** gagne quatre exercices courts en haut de l'écran (Panique, Colère, Trop-plein, Réveil la nuit) : un toucher démarre aussitôt, sans choix de durée ni compte à rebours, et « Réveil la nuit » est sur fond noir ;
- **Bien-être** s'organise par besoin : « Reprendre », les favoris, puis Me calmer vite, Dormir ou me rendormir, Me concentrer et le Programme ; six exercices, le minuteur silencieux, le minuteur de concentration et les sons de fond, fabriqués par Web Audio, s'y ajoutent ;
- après une **émotion**, « Pour ce moment : » propose des exercices selon sa zone, sur l'écran 3 d'un relevé neuf ; sur la **carte**, le mot du milieu grossit pendant le glissement, sans rien écrire ; la **police système** vaut partout ;
- la base reste en `DB_VERSION` 6 et la sauvegarde au format 7 : la méta `favorisBienEtre` et la clé `voix` de `respiration` s'y ajoutent sans changer le format.

Le détail, les appels du concepteur, ce qui attend l'utilisateur et les exercices à relire sont dans `docs/decisions.md`, à l'entrée du 03/11.
