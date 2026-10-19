# Carnet · refonte visuelle (prompt pour Claude Design, octobre 2026)

> À coller tel quel dans Claude Design, avec les 20 captures du dossier `docs/design/audit-v6/pour-claude-design/` en pièces jointes (10 écrans actuels, en clair et en sombre).

## 0. Comment travailler : deux temps

**Temps 1 : trois directions, puis tu t'arrêtes.**
- Propose les trois directions du §4, chacune sur les mêmes 5 écrans, en clair ET en sombre, au format iPhone 390 × 844 :
  - Aujourd'hui rempli ;
  - Humeur du moment ;
  - Épisode, étape Intensité ;
  - Analyse, haut de l'écran ;
  - Moment difficile.
- Mets les trois directions côte à côte sur une planche, avec une phrase pour chacune. L'utilisateur choisit sur image.
- Ne va pas plus loin avant son choix.

**Temps 2 : la direction choisie, partout.**
- Décline-la sur tous les écrans du §8, puis livre ce que demande le §10 : composants, jetons, prototype.

## 1. Le produit

- **Ce qu'est Carnet** : une app personnelle de suivi d'humeur, pour un seul utilisateur, sur iPhone. C'est une app web installée sur l'écran d'accueil, sans compte, qui marche hors ligne. Toutes les données restent sur le téléphone.
- **Pour qui** : une personne AuDHD, pour qui choisir est plus facile que formuler.
- **Les usages, du plus fréquent au plus rare** :
  - noter une humeur du moment, plusieurs fois par jour (1 à 3 touchers) ;
  - la saisie du soir, en moins de 30 s ;
  - noter un épisode émotionnel, parfois à chaud ;
  - le Moment difficile : respiration, « Une chose à la fois », Mon plan ;
  - relire son historique et ses graphiques ;
  - préparer un rendez-vous et le mener (En consultation, Export PSY, Vue soignants).
- **Ce que l'app fait et ne fait pas** : elle observe, range et rend les mots de l'utilisateur. Elle ne conseille pas, ne juge pas, ne félicite pas et n'alerte pas.
- **Le soir, l'iPhone est en mode sombre.** Le sombre est donc le thème principal, pas une variante.

## 2. Pourquoi une refonte

La version actuelle (captures jointes) fonctionne, mais elle n'est pas agréable à regarder. On ne voit pas ce qui a changé d'une version à l'autre. Les mesures :
- les cartes se distinguent à peine du fond : un contraste de 1,06 pour 1 en clair et de 1,11 pour 1 en sombre ;
- la couleur n'a pas de sens stable : la même teinte sert à des choses différentes selon l'écran ;
- en sombre, les choix sélectionnés sont ternes (taupe, olive) ;
- Aujourd'hui ressemble à un formulaire : les titres de rubrique sont plus faibles que les réponses, les rubriques sont serrées (5 px entre elles) et les replis sont séparés par des tirets ;
- les icônes sont petites et la même bulle sert à quatre fonctions ;
- il y a peu de hiérarchie entre le titre d'écran, le titre de bloc et le libellé.

**Ce qu'on vise** : agréable, chaleureux, net. On reconnaît où on est et ce qu'on touche sans lire. Plus visuel, sans devenir ni un jeu ni un tableau de bord.

## 3. Ce qui ne change pas (non négociable)

**Saisie**
- Un toucher enregistre : il n'y a jamais de bouton « Enregistrer ».
- Aucune valeur par défaut. Tout est facultatif, et un champ vide n'est jamais signalé.
- Toucher de nouveau un choix sélectionné l'efface.

**Aucune mécanique d'engagement**
- Ni série, ni score, ni badge, ni niveau, ni défi, ni record, ni félicitation.
- Ni compteur de jours, ni barre de progression, ni pourcentage.

**Silence sur les jours non saisis**
- Pas de calendrier coloré, pas de carte de chaleur, pas de grille de l'année.
- Aucun trou visible, aucun décompte.

**Neutralité des valeurs**
- Jamais de rouge ni de vert pour dire bien ou mal.
- Une humeur haute et une humeur basse ont la même couleur et la même forme.
- Pas de distinction visuelle entre émotions agréables et désagréables.
- Rien de dramatique pour Explosions : ni flamme, ni bombe, ni éclair.

**Ton et mots**
- Tutoiement, phrases rares et brèves, aucun emoji, aucun visage, aucune mascotte.
- Mots interdits, entre autres : bravo, super, génial, parfait, série, record, score, badge, alerte, attention, danger, risque, rechute, obligatoire, oubli, manqué, en retard, « tu devrais », « il faut », « pense à », « n'oublie pas », « bonne / mauvaise journée ».
- **Les libellés des listes** (déclencheurs, émotions, « en dessous », réactions, lieux, etc.) se reprennent EXACTEMENT comme dans les captures, sans les lisser ni les réordonner.

**Accessibilité**
- Contraste AA au minimum pour tout texte.
- Une sélection n'est jamais signalée par la couleur seule : fond plein, graisse 600, et un changement de forme ou une coche.
- Cibles tactiles de 44 pt au minimum, 48 pt dans les grilles de choix.
- Animations de 200 ms au plus, supprimées avec « Réduire les animations ».
- La taille du texte suit le réglage de l'iPhone. Aux grandes tailles, l'écran peut défiler.

**Plateforme**
- iPhone 390 × 844 pt, app installée en plein écran, portrait.
- Barre d'état opaque, zones sûres respectées.
- **La saisie du soir tient sans défilement** à 390 × 844, à la taille de texte par défaut.

## 4. Les trois directions (temps 1)

Tu peux les affiner, mais garde-les vraiment différentes.

**A · Encre de nuit**
- Pensée d'abord pour le sombre du soir : fond bleu nuit chaud, cartes nettement détachées, texte blanc cassé.
- Rubriques en pastels doux mais lumineux.
- Le clair en est la version « jour ».

**B · Intercalaires**
- Chaque rubrique devient une fiche teintée à sa couleur : fond léger, grande icône, titre fort.
- Comme les onglets colorés d'un classeur.
- Plus de boutons blancs sur fond crème.

**C · Épure**
- Presque aucun trait. De gros libellés et de gros boutons sans contour.
- La hiérarchie passe par la taille et l'espace.
- La couleur n'apparaît qu'en bande de rubrique et sur le choix fait.

## 5. Couleur, sombre, typographie, icônes

**Une couleur, un sens**
1. **L'action** (liens, « Terminer », « + Épisode ») a une encre neutre, distincte de toute rubrique.
2. **Chaque rubrique du soir garde sa couleur partout** : saisie, Historique, graphiques. Les rubriques : Lieu, Sommeil, Contact humain, Sport / mouvement, Traitement pris, Mes points positifs.
3. **Chaque parcours a sa couleur propre**, sans emprunter celle d'une rubrique :
   - Épisode ;
   - Symptôme ;
   - Humeur du moment ;
   - Moment difficile.
   Dans un parcours, les choix et le bouton final prennent sa couleur.
4. **Une couleur « énergie »** sert à « Ce qui a pesé », « Ce qui a rechargé » et à l'énergie basse. Pesé et rechargé se distinguent par la place ou la forme, jamais par chaud contre froid.
5. **Les onglets** sont neutres.
6. **Explosions** : une teinte sourde, jamais rouge.
7. **Sommeil dans les graphiques** : une rampe d'une seule teinte, en trois pas (Mal, Moyen, Bien).
8. Prévois de 10 à 12 couleurs, toutes AA, en clair et en sombre.

**Un sombre du soir, doux mais lisible**
- Aucun fond éclatant.
- Surface à 1,25 pour 1 au moins sur le fond, filets à 1,6 pour 1 au moins.
- Texte principal autour de 11 pour 1 (pas de blanc pur), titres en graisse 500.
- Sélections plus saturées sans être plus claires.
- Les choix non sélectionnés peuvent être très légèrement teintés de leur rubrique.

**Typographie**
- Une police libre (licence OFL), fournie en fichiers woff2 que l'app embarque. Pas de Google Fonts ni de lien externe.
- Piste pour le texte : Atkinson Hyperlegible Next, conçue pour la lisibilité, aux chiffres bien distincts.
- Piste pour les titres : un serif doux en graisse 500, comme Literata ou Source Serif 4.
- Tu peux proposer autre chose, ou rester sur la police système si c'est plus beau.
- Une échelle fixe à trois niveaux : titre d'écran, titre de bloc, libellé de section. Chacun a une seule forme.
- Chiffres tabulaires.

**Icônes**
- Une seule famille, au trait (1,5 à 2 pt, extrémités arrondies).
- 20 à 24 pt à côté de chaque rubrique et de chaque repli, et sur le bouton Humeur.
- Une icône par fonction : Mon plan, Questions, En consultation, En parler au rendez-vous et Aide iPhone ont chacun la leur (aujourd'hui, quatre partagent la bulle).
- Pour la grille Lieu (Bureau, Télétravail, Congé / repos, Arrêt, Clinique, Autre), montre une version avec icônes et une sans : l'utilisateur tranchera.

## 6. Aujourd'hui, en détail

- **Un vrai titre** : le jour, par exemple « Dimanche 18 octobre ».
  - « ‹ » et « › » changent de jour, et le titre ouvre le sélecteur de date.
  - Sous le titre, un résumé discret de ce qui est noté.
  - « Enregistré » apparaît 1,5 s après chaque toucher.
- **Les champs du soir, chacun en bloc à sa teinte, dans cet ordre** :
  1. Lieu (6 choix, 2 rangées de 3) ;
  2. Sommeil, nuit dernière (Mal · Moyen · Bien) ;
  3. Contact humain et Sport / mouvement côte à côte (Oui · Non) ;
  4. Traitement pris (Oui · Partiel · Non) ;
  5. Mes points positifs, zone de texte avec micro (« Dicter »).
- **Il n'y a plus de champ Humeur le soir** : l'humeur du jour est la moyenne des humeurs du moment.
- **Juste sous les points positifs, une ligne** : « Mémo vocal » à gauche, « J'ai fini pour ce soir » à droite. Ce dernier n'apparaît qu'après un premier choix.
- **Ensuite** : « Après coup (TCC) · tes épisodes récents › ». Cette ligne n'existe que s'il y a eu un épisode dans les 7 derniers jours, et elle n'a ni compte ni état.
- **Les replis** :
  - chacun avec l'icône de sa rubrique, sans tirets ;
  - fermés, ils résument leur contenu : « 23:20 → 08:40 · 1 réveil » ;
  - liste : Nuit en détail, Ce qui a pesé · ce qui a rechargé, Sport en détail, Contact en détail, Notes libres.
  - « Ce qui a pesé · ce qui a rechargé » ouvert tient sur un écran : deux grilles régulières à deux colonnes.
- **« Ma journée »** : les humeurs du moment, les épisodes et les symptômes du jour, rangés par heure. Par exemple « 10:20 · humeur 6 · énergie moyenne », puis « 14:05 · Colère · 7 · Me sentir pris pour un con ›… ». Les symptômes, qui n'ont pas d'heure, viennent à la fin. Puis « + Symptôme ».
- **Prochain rendez-vous** : une ligne, s'il tombe dans les 14 jours.
- **La bande du bas**, au-dessus des 5 onglets : Moment difficile · Humeur · + Épisode.
  - « Humeur » est le geste le plus fréquent : sa cible est au moins aussi grande que « + Épisode » et se trouve sous le pouce.
  - Rien de touchable ne passe sous la bande.
- **« Soirée terminée »** : après « J'ai fini pour ce soir », la saisie se replie en une carte de résumé. Une seule couleur ou de petits repères, plus d'arc-en-ciel.
- **Variantes à montrer** :
  - un jour passé, avec la ligne « Revenir à aujourd'hui » ;
  - entre 0 h et 4 h, « Encore samedi jusqu'à 4 h. » ;
  - la base vide, avec une ligne discrète « Importer une sauvegarde ».

## 7. La nouvelle organisation des autres écrans

**Humeur du moment** (s'ouvre depuis le bouton Humeur ; se ferme seule une fois humeur et énergie choisies)
- La question est en haut, les réponses près du pouce : humeur de 1 à 10 en deux rangées de 5, énergie Basse · Moyenne · Haute.
- « Maintenant » ou « C'était vers… » : une liste d'heures. Si l'utilisateur l'a laissée ouverte, elle rouvre ouverte.
- Le repli « Ce que je faisais ».
- Plus bas, les relevés du jour.
- Si l'énergie est basse et que la règle est allumée, une carte « Pour récupérer, je… » avec « Respirer ».

**Épisode**
- Modale plein écran, une question par écran : « Ça a démarré avec… », « Ça ressemblait plutôt à… », « Intensité », « Et en dessous, il y avait peut-être… », « Ta réaction ».
- Les listes longues remplissent l'écran. Les réponses courtes (Intensité, En dessous, Réaction) sont posées près du pouce.
- Un repère d'étape en points, jamais une barre.
- **Après la réaction**, retour direct sur Aujourd'hui avec le message « Épisode enregistré · Annuler », sans écran « Terminer ».
- **Un épisode rouvert** :
  - ligne du haut « Mon plan · Après coup · En parler » ;
  - puis le récapitulatif en tableau (chaque choix une seule fois, sans phrase qui le répète) ;
  - puis « Situation » et « Ce qui a aidé » (zones de texte avec micro), « Mémo vocal » et la carte « Après coup · TCC ».

**Symptôme** : même mécanique. Symptôme, Intensité, Durée (près du pouce), puis le récapitulatif sans doublon.

**Après coup (TCC)** : une question par écran, réponses près du pouce, et un récapitulatif aux libellés courts à la première personne.

**Moment difficile**, à lire en crise, donc le plus calme et le plus lisible de l'app :
1. la respiration en haut, réglable, avec un cercle qui respire et « Commencer » ;
2. « Une chose à la fois », seulement s'il y a un plan ;
3. « Mon plan », tel qu'écrit, avec « Modifier » à droite du titre ;
4. en bas, « Noter un épisode ».
Il n'y a plus de bouton « Me ressourcer » sur cet écran.

**Analyse**
1. En haut, trois boutons : Explosions · Énergie · Rythmes. Ils ouvrent l'écran Comprendre sur l'onglet choisi.
2. Puis le sélecteur de période 7 j · 30 j · 3 mois · Tout. Il ne règle que les sections qui le suivent :
   - Ma semaine, en tuiles à grands chiffres ;
   - Mes jours (une frise : nuits, explosions, épisodes, énergie basse et repères de traitement), avec une étiquette sur chaque rangée ;
   - Ta journée ;
   - Avec qui · Mouvement ;
   - Tes moments ;
   - Les plus fréquents, avec une barre courte ;
   - Tous les chiffres.
3. Puis un bloc « Sur tout ton historique » : « Ce que tes journées à 7 ou plus ont en commun » et « Sommeil et humeur ».
4. Export PSY et Vue soignants ne sont plus ici.

**Comprendre** : 3 onglets en grand, puis la période et la mesure en petites pastilles. Des graphiques à une seule teinte, « Voir en tableau » sous chacun, et le pied « Ce sont tes notes, rassemblées : pas des causes. »

**Soins**
- En haut, quel que soit le segment : « Pour mes soignants : Export PSY · Vue soignants ».
- Puis les segments Rendez-vous · Notes · Traitement.
- **Rendez-vous** : la carte du prochain rendez-vous (questions à cocher, champ « Une question pour ce rendez-vous… », repli « La dernière fois · 10/09 »), puis À venir et Passés.
- **Notes** : un champ toujours prêt, et une note datée par ligne.
- **Traitement** : les fiches, la plus récente en haut.
- **La Vue soignants** contient le champ « Prénom pour la vue soignants ».

**Historique**
- Segments Jours · Épisodes · Symptômes, une recherche et « Filtrer ▾ ».
- Il garde son segment, ses filtres et sa position quand on y revient.
- Un jour ouvert depuis l'Historique garde l'onglet Historique allumé et propose « ‹ Retour ».
- Regroupement par semaine, sans aucun compte. Les jours non saisis n'existent pas.

**Réglages**, rangés par usage :
1. **Sauvegarde** en tête : « Dernière sauvegarde : … », Exporter, Importer.
2. **« Ma saisie »** : Le soir (afficher, masquer et ordonner les champs du soir), Listes, Rappels. Les heures de rappel de l'humeur du moment sont dans Rappels.
3. **« Moment difficile »** : Mon plan ; Respiration et Une chose à la fois ; Me ressourcer (une règle à interrupteur) ; Aide iPhone.
4. **Analyse** : interrupteurs Signal de ressemblance et Tendances.
5. **À propos**.
6. **Zone sensible** : Tout effacer.
- Les interrupteurs sont alignés à droite.
- L'index des Listes est rangé par écran : Le soir, Humeur du moment, Épisode, Après coup, Symptôme, Soins.

**Finitions, partout**
- Titres de section alignés sur le bord du contenu.
- Espaces insécables fines dans « », avant « : », « ; », « ? » et « ! ».
- Colonne des heures de largeur fixe dans les listes.

## 8. Écrans à produire (temps 2), en clair et en sombre

1. **Lot 1** :
   - Aujourd'hui : vide, rempli, replis ouverts, bas de l'écran avec Ma journée, soirée terminée ;
   - Humeur du moment : vide, choix faits, « C'était vers… » ouvert, « Ce que je faisais » ouvert, carte « Pour récupérer, je… » ;
   - Épisode : étape 1, Intensité, Réaction, épisode rouvert ;
   - barre d'onglets et bande du bas.
2. **Lot 2** : Moment difficile (dont la respiration en cours), Une chose à la fois, Après coup (une étape, le récapitulatif, la liste), Symptôme (étape 1, récapitulatif), Historique (Jours, Épisodes, filtre ouvert).
3. **Lot 3** : Analyse (haut, Mes jours, bas), Comprendre (Explosions, Énergie, Rythmes, « Voir en tableau »), Soins (Rendez-vous, une fiche, En consultation, Notes, Traitement), Export PSY, Vue soignants.
4. **Lot 4** : Réglages et ses sous-écrans (Le soir, Listes, une liste, Rappels, Mon plan, Moment difficile, Me ressourcer, Aide iPhone, Sauvegarde, Tout effacer), guide d'installation.

## 9. États à montrer

- « Enregistré » et l'échec d'écriture (« Enregistrement impossible pour l'instant, nouvel essai en cours. »).
- Un toast avec « Annuler ».
- Le bandeau « Nouvelle version prête · Sauvegarder d'abord · Recharger ».
- Une confirmation de suppression.
- « Pas encore assez de données pour le dire. » avec « Pourquoi ? ».
- Les états vides (« Aucun épisode noté pour l'instant. »).
- Mémo vocal :
  - au repos ;
  - en enregistrement, sans point rouge ni clignotement ;
  - la puce « Mémo vocal · 0:24 ».
- Une grande taille de texte, avec défilement.

**Données** : fictives et banales uniquement. Aucun prénom, nom, lieu, entreprise ni médicament réel.

## 10. Livrables

1. **Temps 1** : la planche des trois directions (§0).
2. **Temps 2** :
   - les maquettes du §8 ;
   - les composants : pastille, segmenté, oui / non, grille de choix, zone de texte avec Dicter, Mémo vocal, en-tête de jour, bloc de rubrique, repli, bande du bas, onglets, toast, bandeau, tuile chiffrée, carte, ligne de liste, feuille, interrupteur ;
   - les jetons en variables CSS, en clair et en sombre (`@media (prefers-color-scheme: dark)`) :
     - fonds, surfaces, texte, filets, action ;
     - une couleur par rubrique et par parcours, avec son fond plein de sélection et son texte ;
     - les rampes de graphiques, les rayons, les espacements, l'échelle typographique, les durées ;
   - les polices en woff2, avec leur licence ;
   - les icônes en SVG au trait (`stroke="currentColor"`, sans couleur codée en dur) ;
   - un prototype HTML / CSS / JS cliquable, sans framework, en un seul fichier et sans ressource externe. Il couvre Aujourd'hui, l'Humeur du moment, un épisode complet, Moment difficile et la bascule clair / sombre.

**Contraintes d'intégration**, parce que l'app a une politique de sécurité stricte :
- aucun style en ligne : pas d'attribut `style=`, pas de `<style>` dans le SVG ;
- aucune ressource externe ;
- tout passe par des classes et des variables CSS.

## 11. À ne pas faire

- Pas d'onboarding, pas d'illustration infantilisante, pas de mascotte, pas d'emoji, pas de visage ni d'échelle de smileys.
- Pas de gamification : confettis, coches de réussite, « 3 jours de suite ».
- Pas de graphique anxiogène (zones rouges, flèches de chute, jauges), pas de jauge d'énergie.
- Pas de calendrier coloré ni de carte de chaleur.
- Pas de dégradé de couleur sur l'humeur.
- Pas de point rouge ni de clignotement pendant un enregistrement.

## 12. Pièces jointes

Les captures de l'état actuel, en clair et en sombre, avec des données inventées :
- 02 : Aujourd'hui rempli ;
- 04 : Aujourd'hui, bas de l'écran ;
- 07 : Humeur du moment ;
- 13 : Épisode, étape Intensité ;
- 14 : récapitulatif d'un épisode ;
- 24 : Moment difficile ;
- 28 : Historique, Jours ;
- 32 : Analyse, haut ;
- 38 : Comprendre, Explosions ;
- 46 : Soins, Rendez-vous.

Elles montrent les libellés exacts et le contenu de chaque écran. **L'organisation à suivre est celle des §6 et §7**, pas celle des captures.
