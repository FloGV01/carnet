# Carnet v9 : l'émotion comme How We Feel, en plein écran (conception)

Date : 28/10/2026. Version visée : 9.0.0. Annexes dans `docs/superpowers/specs/2026-10-28-carnet-v9/` :
- `visuel-hwf.md` : mesures prises sur les captures de How We Feel (tailles en pt, couleurs relevées sur les pixels, police, mouvement) ;
- `carte-proposee.json` : les 144 mots, leur case sur la grille 12 × 12, leur famille et les définitions des ajouts ;
- `liste-hwf.json` : la grille officielle de How We Feel (144 mots anglais et leur case), relevée sur l'affiche publiée par How We Feel ;
- `corrections.md` : ce que les relectures ont changé dans la proposition ;
- `apercu-carte.html` : l'aperçu cliquable validé par l'utilisateur (une maquette, pas du code à reprendre).

## 1. Intention

L'utilisateur a essayé la v8 et n'est pas satisfait de l'écran « Émotion du moment ». La carte tient dans un panneau collé en bas, sous la liste du jour : elle est trop petite. Les bulles sont sombres et colorées par famille, ce qui donne un patchwork terne. Et la roue n'a que 26 mots agréables pour 53 désagréables.

Il demande de faire **exactement comme How We Feel** (captures fournies), en plein écran. Ce qui compte pour lui : trouver son émotion sans devoir la nommer d'abord (d'abord une couleur, puis des mots voisins à comparer, avec leur définition), sur un écran assez grand, avec l'esthétique de How We Feel.

Réussite : il ouvre l'émotion, touche une couleur, voit de grosses bulles vives, touche un mot, lit sa définition, continue d'une flèche. Ça lui donne envie de s'en servir, et le relevé est aussi rapide qu'avant.

## 2. Décisions de l'utilisateur (28/10)

- Faire **comme How We Feel**, en plein écran, pour l'enchaînement, la forme et l'esthétique, sauf les écarts du §3.
- **Couleurs de zone** comme How We Feel : rouge (énergie haute, désagréable), jaune (haute, agréable), bleu (basse, désagréable), vert (basse, agréable), en dégradé. Un mot a la **couleur de sa zone partout dans l'app** (Aujourd'hui, Historique, Analyse, Après coup).
- **Compléter la roue** avec des mots de How We Feel traduits, pour une carte de 144 mots, 36 par zone (§6). Rester à 144, comme How We Feel.
- Après la flèche : **« Ce que je faisais » en plein écran**, facultatif, puis fermeture.
- **Analyse** : ajouter une **vue par zone**, les familles restent. Deux formes : 4 bulles avec le nombre de relevés, et une barre par semaine.
- **Mot à soi** : oui. On demande le nom, la zone, la famille et une définition facultative.
- **Exports** : une ligne de zones dans l'**Export PSY** et sur la **page A4** des soignants.
- Fatigué et Épuisé : **comme How We Feel, sans famille** (ils comptent seulement par zone). Survolté : à la place de « Hyper » chez How We Feel (zone rouge). Libéré prend le sens de « libre » et **Soulagé** est ajouté (« Relieved »). Ensommeillé, qui ne vient pas de How We Feel, est remplacé par **Insouciant** (« Carefree »), le mot How We Feel de cette case.
- **Bien-être** façon « Tools » et « Breathing » : plus tard, pas dans la v9.

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Les écrans du relevé d'émotion reproduisent How We Feel au plus près : plein écran noir, 4 grandes bulles, carte de 144 bulles qu'on fait glisser, mot choisi agrandi, carte du bas avec définition et flèche, loupe, mot à soi.
- Le relevé reste rapide : couleur, mot, flèche, Terminer (ou fermer après le mot).
- Les couleurs de zone deviennent la couleur d'un mot dans toute l'app ; l'Analyse et les exports gagnent une lecture par zone.

**Non-objectifs**
- Refaire Bien-être (plus tard).
- Copier ce que How We Feel fait autour du relevé : accueil « Check in », rappels, IA, partage, stratégies proposées, étiquettes « où » et « avec qui », carte des sensations du corps, photo.

**Anti-objectifs** (un échec même si tout marche)
- Une série, un compteur de jours, une rangée des jours de la semaine, un pourcentage, une félicitation (règles de CLAUDE.md).
- Un mot de la roue renommé, retiré ou changé de famille (vocabulaire figé).
- Un relevé perdu : le mot est enregistré au toucher, pas à la flèche.
- Un appel réseau, une police ou une image téléchargée.
- Une carte encore « trop petite » : la carte occupe tout l'écran.

## 4. Les écrans du relevé

Tous les écrans du relevé sont **plein écran, fond noir, dans les deux thèmes** (comme How We Feel et comme le lecteur de Bien-être) : pas de barre d'onglets, pas d'en-tête de Carnet. La route reste `#/moment`. On y entre comme aujourd'hui : la bande « Émotion du moment » d'Aujourd'hui, et le toast « Noter mon émotion » à la fin du lecteur.

### 4.1 Écran 1 : les quatre bulles (capture 5)

- En haut : ✕ (fermer) à gauche, loupe à droite ; capsules de 48 × 44 pt (visuel §1.2).
- Titre, une phrase et pas une question : « Touche la couleur la plus proche de ce moment ».
- Les 4 bulles, géométrie, halos et dégradés de visuel §1.4 à §1.8. Libellés sur deux lignes : « Énergie haute / Désagréable », « Énergie haute / Agréable », « Énergie basse / Désagréable », « Énergie basse / Agréable ».
- Sous les bulles, en petit : « Maintenant ▾ », qui ouvre les heures de « C'était vers… » (même règle qu'en v8, `heuresVers`).
- Toucher une bulle ouvre la carte, centrée sur le milieu de cette zone, sans mot choisi. Ce toucher n'écrit rien.

### 4.2 Écran 2 : la carte (capture 4)

- Toute la grille 12 × 12 des 144 mots (§6), sans case vide, plus les mots à soi (§4.5). Elle défile librement dans les deux sens, dans son propre cadre ; la page, elle, ne défile jamais de côté.
- Disposition, tailles et formes : visuel §2.2 à §2.7 (grille carrée ; bulles de 96 pt ; autour du mot choisi, voisines à 120 puis 108 pt ; mot choisi en double capsule de 156 × 156 pt recentrée au milieu de l'écran ; voile noir en haut). Couleurs par case selon visuel §2.5. Texte des bulles sombre, en `ui-serif` (New York) gras.
- En haut : flèche retour (vers l'écran 1) à gauche, loupe à droite, capsules en verre sombre (visuel §2.9).
- **Toucher un mot** : le relevé est créé ou mis à jour tout de suite (mot et énergie, §7) ; la bulle devient la double capsule, la carte se recentre, et la carte du bas apparaît (visuel §2.8) : le mot dans la couleur de sa zone, sa définition (la correction de l'utilisateur si elle existe, méta `definitionsRoue`), et un rond blanc avec une flèche (libellé accessible « Continuer »).
- Toucher un autre mot remplace le mot. **Toucher de nouveau le mot choisi l'efface** (règle de Carnet) : la carte du bas disparaît, et le relevé est supprimé s'il ne contient plus rien.
- La flèche ouvre l'écran 3. Fermer ou revenir en arrière après un mot garde le relevé.
- L'appui long de la v8 disparaît : le toucher montre déjà la définition. La fermeture automatique 1,5 s après le mot disparaît aussi : la flèche la remplace.

### 4.3 Écran 3 : « Ce que je faisais »

- Plein écran noir. En haut, le mot choisi dans sa couleur, en rappel.
- Si la règle « Me ressourcer » joue (`regleRessourcer`), le bloc « Pour récupérer, je… » vient en premier, comme en v8.
- Puis « Ce que je faisais » : les pastilles de la liste `activiteMoment`, à choix multiple, enregistrées au toucher.
- En bas : « Terminer », qui ferme le relevé et affiche le toast « Émotion du moment notée ». ✕ en haut fait la même chose. Aucune réponse n'est obligatoire.
- Pour un relevé existant, rouvert depuis Aujourd'hui : un lien discret « Supprimer ce relevé », avec confirmation, puis le toast avec Annuler.

### 4.4 La loupe

- Ouvre une recherche plein écran, champ actif tout de suite. Elle cherche dans les mots et dans leurs définitions, sans tenir compte des accents ni de la casse.
- Chaque résultat montre le mot dans la couleur de sa zone et le début de sa définition. Toucher un résultat fait la même chose que toucher le mot sur la carte : le relevé est écrit, et la carte s'ouvre centrée sur ce mot, avec la carte du bas.
- Sans résultat, ou en bas des résultats : « Ajouter mon mot « … » », qui ouvre l'écran du mot à soi avec le nom déjà rempli.

### 4.5 Le mot à soi

- **Création** (depuis la loupe) : un écran plein avec le nom ; la zone (les 4 bulles en petit, une à choisir) ; la famille (les 7 familles de la roue, plus « Aucune », comme Fatigué et Épuisé) ; la définition, facultative. Le mot est créé au premier choix de zone (le nom et la zone suffisent), puis complété au toucher ; il entre aussitôt dans le relevé en cours, comme un mot touché sur la carte.
- **Sur la carte** : dans sa zone, au-delà du bord extérieur de la grille de cette zone (la carte s'agrandit de ce côté), jamais par-dessus un autre mot. Même couleur que les cases du bord de sa zone.
- **Réglages › Émotions** : une rubrique « Mes mots » pour renommer, changer la zone, la famille ou la définition, et retirer. Un mot déjà utilisé dans un relevé n'est jamais effacé : il est mis de côté (il quitte la carte et la recherche, ses relevés l'affichent toujours). Un mot jamais utilisé peut être effacé.
- Les mots à soi sont dans la sauvegarde et reviennent à l'import (§9).

### 4.6 Ailleurs dans l'app

- **Aujourd'hui** : la liste des relevés du jour, qui était dans l'écran de la v8, passe sous la bande « Émotion du moment » : heure, point de la couleur de zone, mot. Toucher un relevé le rouvre sur la carte, son mot choisi.
- Partout où un mot d'émotion est affiché avec une couleur (Aujourd'hui, Historique, Après coup, listes de l'Analyse), c'est la **couleur de sa zone**. Un ancien relevé qui n'a qu'une famille (`roue:<famille>`, v7) ou une note de 1 à 10 (v4 à v6) n'a pas de zone : point creux neutre, comme les relevés sans émotion en v8.

## 5. Visuel

- Toutes les mesures, couleurs et formes : `visuel-hwf.md`. Ses valeurs font foi ; l'aperçu validé (`apercu-carte.html`) montre le résultat attendu.
- Police : `ui-serif` (New York, déjà sur l'iPhone) en gras pour les titres et les mots des bulles ; police système pour la carte du bas et les petits textes. Rien à télécharger.
- Mouvement : halos des 4 bulles qui tournent lentement, recentrage de la carte, grossissement des voisines, arrivée de la carte du bas (visuel §4). Tout est figé si le mouvement réduit est activé.
- Pas de vibration : iOS ne la permet pas à une app web.
- Accessibilité : chaque bulle est un bouton avec son mot comme libellé (et « choisi » quand il l'est) ; la carte du bas est annoncée ; cibles de 44 pt au moins ; texte sombre sur les bulles avec un contraste AA (4,5:1) vérifié pour chaque case, en assombrissant le texte ou en éclaircissant la case si besoin.
- Couleurs de zone hors des écrans du relevé : des jetons dans `tokens.css` (rouge, jaune, bleu, vert, en clair et en sombre), sur le modèle des six rôles du système 2b, pour les points et les graphiques.

## 6. Le vocabulaire et la carte

- Source : `carte-proposee.json`, avec ces changements validés par l'utilisateur après la proposition :
  - Ensommeillé (`roue:serenite:ensommeille`) est retiré ; **Insouciant** (« Carefree ») prend sa case (col 7, rang 1), famille sérénité, avec une définition écrite pour Carnet ;
  - **Fatigué et Épuisé n'ont pas de famille** : ils ne comptent dans aucune famille, seulement dans leur zone (bleue). Leur identifiant ne porte donc pas de famille (forme laissée au constructeur, §12) ;
  - Survolté reste où la proposition le met (case de « Hyper »), famille peur.
- **Les 79 mots de la roue ne changent ni d'identifiant, ni de libellé, ni de famille.** Les ajouts se font à la fin de chaque famille dans `roue.js`, dans l'ordre de la proposition. Le test d'instantané des identifiants s'allonge, il ne change pas ce qui existe. CLAUDE.md reste vrai.
- **La place** remplace celle de la v8 : `carte-roue.js` passe de la grille 6 × 6 à la grille 12 × 12 (col 1 = le plus désagréable, 12 = le plus agréable ; rang 1 = l'énergie la plus basse, 12 = la plus haute ; rouge col 1-6 et rangs 7-12, jaune col 7-12 et rangs 7-12, bleu col 1-6 et rangs 1-6, vert col 7-12 et rangs 1-6). Un seul mot de la roue change de zone : Accablé passe du bleu au rouge (« Overwhelmed »).
- **Les définitions** : celles des 65 ajouts viennent de la proposition. Cinq textes de Carnet changent, parce qu'ils contiennent le mot d'une nouvelle bulle ou un sens repris par un ajout : Extasié et Libéré (textes v9 de la proposition), Craintif, Accompli et Mécontent (à réécrire dans le même style). Les corrections de l'utilisateur (`definitionsRoue`) restent prioritaires.
- Tous les mots et toutes les définitions passent `trouverInterdits` et le test de vie privée.
- Source et droits : la grille de How We Feel n'est reprise que pour les mots et leur place ; aucune définition de How We Feel ni de Yale n'est copiée.

## 7. L'énergie et la zone d'un relevé

- La zone d'un mot se lit sur sa case. L'énergie enregistrée (`energie`, liste `energie`, inchangée) se déduit du rang : rangs 1-4 = basse, 5-8 = moyenne, 9-12 = haute. Un mot à soi prend « haute » ou « basse » selon sa zone.
- Les relevés existants ne sont pas réécrits : leur énergie reste celle qui a été saisie ; leur zone se déduit de leur mot quand il en a un.

## 8. Analyse et exports

- **Analyse, vue par zone** (dans la partie émotions, sous les familles, même sélecteur de période) :
  - les 4 bulles de l'écran 1 en petit, chacune avec le nombre de relevés de la période (« 9 relevés ») ; aucun pourcentage ;
  - une barre par semaine sur 12 semaines, empilée en 4 couleurs, avec une phrase-résumé et « Voir en tableau », sur le modèle des graphiques existants ;
  - même seuil que les familles (`selonSeuilEmotions`) ; en dessous : « Pas encore assez de données pour le dire. » ;
  - seuls les relevés dont le mot a une zone comptent ; « Pourquoi ? » le dit.
- Les **graphiques par famille** gardent leurs couleurs de famille : ils montrent des familles, pas des mots. Les mots sans famille (Fatigué, Épuisé, mots à soi sans famille) n'y comptent pas.
- **Export PSY** : dans les compteurs de la semaine (et de la semaine d'avant), une ligne « zones : rouge 3 · jaune 2 · bleu 9 · vert 5 » (zones à zéro omises, ordre rouge, jaune, bleu, vert). Le changement de format sera signalé à l'utilisateur pour son assistant PSY.
- **Page A4** : une ligne « Émotions par zone (relevés) » sous « Émotions par famille (relevés) », pour chaque colonne de période, même forme que la ligne PSY ; une légende d'une ligne explique les 4 zones (énergie haute ou basse, agréable ou désagréable). La hauteur de la page reste sous la limite existante.

## 9. Données et versions

- `DB_VERSION` reste 6 si aucun store ne change. Les mots à soi vivent dans une méta (par exemple `motsPerso`), comme `definitionsRoue`.
- `FORMAT_VERSION` passe à 7 : une sauvegarde v9 peut contenir des relevés de mots à soi qu'une app v8 ne connaît pas ; elle les refuse ainsi proprement. Une sauvegarde 6 s'importe sans changement (mise à niveau vide).
- La validation d'un relevé (`T.roue`) accepte les mots de la roue et les mots à soi connus, à l'enregistrement comme à l'import.
- `VERSION_APP = '9.0.0'`, publiée en une fois, comme les versions précédentes.

## 10. Tests attendus

- Unitaires : instantané des identifiants de la roue (seulement des ajouts) ; grille de 144 cases toutes différentes, 36 par zone ; zone et énergie de chaque mot ; contraste AA de chaque case avec son texte ; définitions (interdits, vie privée, pas de doublon) ; mots à soi (création, renommage, mise de côté, sauvegarde et import) ; vue par zone ; ligne de zones PSY et A4 (instantanés).
- e2e (WebKit iPhone 13) : couleur → carte → mot → flèche → « Ce que je faisais » → Terminer ; second toucher qui efface ; fermer après le mot qui garde le relevé ; loupe et mot à soi ; plein écran sans barre d'onglets ; aucun défilement de côté de la page ; mouvement réduit ; relevé rouvert depuis Aujourd'hui ; les tests existants de la v8 mis à jour.
- `npm run precache` puis `npm test` avant chaque commit qui touche `public/`.

## 11. Appels du concepteur (à vérifier en lisant)

- Fond noir aussi en thème clair, pour tous les écrans du relevé.
- Titre de l'écran 1 en phrase ; « Maintenant ▾ » sous les bulles.
- Le toucher sur une couleur n'écrit rien ; le mot, si.
- Second toucher sur le mot choisi : il s'efface (règle de Carnet, pas de How We Feel).
- La liste des relevés du jour passe sur Aujourd'hui ; suppression d'un relevé depuis l'écran 3.
- « Aucune » parmi les familles d'un mot à soi.
- Énergie : rangs 1-4, 5-8, 9-12.
- Graphiques par famille : couleurs de famille gardées.
- Ligne de zones nommée par couleurs (rouge, jaune, bleu, vert), avec légende sur la page A4.
- `FORMAT_VERSION` 7.

## 12. Laissé au constructeur

- La forme de l'identifiant des mots sans famille et des mots à soi, et leur rangement dans le code, tant que : les identifiants publiés ne changent jamais, `familleDe` rend null pour un mot sans famille, et la zone de tout mot se retrouve.
- La technique de la carte (défilement natif dans les deux sens ou gestes), tant que le rendu suit `visuel-hwf.md`, que la CSP stricte est respectée (pas d'attribut `style` en texte ; CSSOM ou classes) et que ça reste fluide sur un iPhone 13 Pro.
- Le découpage en tâches et en commits.
- Le comportement de la barre d'état en thème clair au-dessus d'un écran noir : à vérifier sur l'iPhone et à régler au mieux.

## 13. Précisions après relecture (appels du concepteur)

Une relecture « comme si on devait le construire » a posé cinq questions. Les réponses ci-dessous complètent ou remplacent les sections citées.

1. **Relevés sur Aujourd'hui (remplace la 1ʳᵉ puce du §4.6 et précise le §4.3).** Pas de seconde liste : la bande « Émotion du moment » est dans la barre fixe au-dessus des onglets. Les lignes de relevé de « Ma journée », qui existent déjà pour tous les jours, deviennent touchables et prennent le point de la couleur de zone. Un relevé se rouvre depuis n'importe quel jour, Historique compris. **Un relevé rouvert s'ouvre directement sur l'écran 3**, comme un épisode rouvert s'ouvre sur son récapitulatif : en haut, son mot dans sa couleur (ou « Aucun mot » pour un ancien relevé sans mot : énergie seule, famille seule ou note de 1 à 10), avec un lien « Changer le mot » qui ouvre la carte, le mot choisi s'il y en a un ; puis « Ce que je faisais » ; puis « Supprimer ce relevé ». « Maintenant ▾ » n'apparaît pas pour un relevé rouvert : son heure ne change pas.
2. **Vue par zone (précise le §8).** Elle va sur l'écran Analyse, dans une carte « Tes zones » placée juste après « Tes émotions ». Les 4 bulles et leurs comptes suivent le sélecteur de période de l'écran (7 j, 30 j, 3 mois, Tout). La barre par semaine est en dessous, dans la même carte, toujours sur les 12 dernières semaines, comme les autres graphiques par semaine. Comprendre ne change pas.
3. **Textes à écrire (précise le §6).** Le constructeur écrit, dans le style de `definitions-roue.js` : la définition d'Insouciant, et six textes de Carnet qui changent, Extasié et Libéré (textes v9 de la proposition), Craintif, Accompli, Mécontent, et Tranquille (sa définition actuelle, « Sans souci pour l'instant… », est le sens d'Insouciant). Une relecture les contrôle avec les autres. Comme en v8, l'utilisateur relit les textes après la publication, dans l'app (Réglages › Émotions), sans point d'arrêt avant.
4. **Couleurs entre le mot et la famille (précise le §4.6 et le §8).** Ce qui montre des relevés ou des mots prend la couleur de zone : les points de « Mes jours » en mode jour (légende des 4 zones), et les points du jour dans l'en-tête d'Aujourd'hui, dans Historique et dans Après coup (un point par zone présente, sans doublon, au lieu d'un point par famille). Seuls les comptes et graphiques par famille gardent les couleurs de famille. Les mots sans famille n'y apparaissent pas ; ils comptent dans les vues par zone.
5. **Effacer le mot (précise le §4.2 et le §7).** L'énergie suit le mot : effacer le mot efface aussi l'énergie, et le relevé est supprimé s'il ne reste rien (ni « Ce que je faisais », ni heure « vers »). Choisir un mot sur un ancien relevé remplace l'énergie qui avait été saisie par celle de la case du mot.
