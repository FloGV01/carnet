# Carnet · prompt pour Claude Design

## 1. Le produit
Conçois l'interface de « Carnet », une app personnelle de suivi d'humeur pour une personne à qui choisir est plus facile que formuler.
Elle a un seul utilisateur, sur iPhone. C'est une app web installée sur l'écran d'accueil, sans compte, qui marche hors ligne. Toutes les données restent sur le téléphone.
Elle sert à trois choses : la saisie du soir en moins de 30 s, l'analyse de ses propres données, et une page A4 à montrer en consultation.
L'app observe et restitue. Elle ne conseille pas, ne juge pas et ne félicite pas.

## 2. Priorités de design
- Simple : un écran correspond à une intention. Aucun menu caché, aucun geste à deviner : ni balayage, ni appui long.
- Épuré : beaucoup d'air, peu de texte, une seule couleur d'accent.
- Facile : un toucher enregistre. Il n'y a jamais de bouton « Enregistrer ».
- Très visuel, on comprend sans lire : une icône au trait à côté de chaque libellé de champ, des états lisibles d'un coup d'œil, des chiffres en grand dans l'Analyse.
- Des icônes neutres : aucun visage ni émoticône, pas même pour Humeur. Rien de dramatique pour Explosions : ni flamme, ni bombe, ni éclair. Pas d'icône dans les grilles de choix, les libellés suffisent.
- Parler plutôt qu'écrire : un bouton « Dicter » dans chaque champ de texte libre, et un bouton « Mémo vocal » par fiche (voir §6).

## 3. Contraintes non négociables
- La saisie du soir prend moins de 30 s : 7 choix par toucher, plus une phrase dictée.
- Tout est facultatif. Un champ vide n'est jamais une erreur et n'est jamais signalé. Aucune valeur par défaut dans les données. Toucher de nouveau un choix sélectionné l'efface.
- Aucune série, aucun score, aucun badge, aucun niveau, aucun défi, aucun record, aucune félicitation, aucun compteur de jours, aucune barre de progression, aucun pourcentage.
- Silence sur les jours non saisis : ils n'apparaissent nulle part, ni comme trou, ni comme case vide, ni dans un décompte, ni dans un calendrier.
- Ton neutre et chaleureux, tutoiement, français. Les phrases sont rares et brèves.
- Mots et tournures interdits dans l'interface : bravo, félicitations, super, génial, parfait, bien joué, continue comme ça, série, streak, record, score, badge, niveau, défi, jours d'affilée, jours remplis, jours notés, x/7, il y a N jours, alerte, attention, danger, risque, rechute, décrochage, crise imminente, inquiétant, anormal, obligatoire, requis, astérisque, oubli, manqué, rattraper, en retard, incomplet, « tu devrais », « il faut », « pense à », « n'oublie pas », « tu n'as pas », « bonne / mauvaise journée », « journées difficiles », « émotions positives / négatives », « Que ressens-tu ? », « Comment te sens-tu ? », « Pourquoi as-tu réagi ainsi ? ». Aucun emoji.
- Les libellés des listes du §8 échappent à cette règle et restent tels quels, par exemple « Manque de sommeil » ou « Crise d'angoisse ».
- L'interface ne distingue jamais visuellement les émotions agréables des désagréables, ni une humeur haute d'une humeur basse : même couleur, même forme.

## 4. Plateforme
- iPhone 390 × 844 pt, app installée en plein écran (sans barre Safari), portrait uniquement.
- Zones sûres respectées : barre d'état opaque (jamais translucide), indicateur d'accueil, marges de 16 pt plus la zone sûre.
- Cibles tactiles de 44 pt au minimum, 6 à 8 pt d'écart entre pastilles. Cases des grilles de choix : 48 pt au minimum.
- Mode clair ET mode sombre, chacun soigné, pas une simple inversion.
- Police système (SF Pro, et SF Mono pour le texte à chasse fixe) sur les styles de texte iOS, avec Dynamic Type. La mise en page tient jusqu'aux grandes tailles d'accessibilité, et le défilement est permis à ces tailles. Chiffres tabulaires.
- Jamais de rouge ni de vert pour dire bien ou mal. Contraste AA au minimum.
- Une sélection n'est jamais signalée par la seule couleur : fond plein, graisse 600, et un changement de forme ou une coche.
- Animations de 200 ms au plus, supprimées si le mouvement réduit est activé. Pas de vibration.
- Les sélecteurs de date et d'heure sont ceux d'iOS, sans aucune marque sur les jours saisis ou non.
- Aucune police web ni ressource externe, même dans le prototype.

## 5. Direction visuelle
- Sobre, aérée, chaleureuse, jamais clinique. L'esprit du papier et de l'encre, pas celui de l'hôpital ou du tableau de bord.
- Icônes au trait de 1,5 à 2 pt, extrémités arrondies, une seule famille. Pas d'icône remplie, sauf pour un état actif.
- Palette proposée, sable et ardoise (valeurs clair / sombre). Tu peux l'améliorer, mais elle doit rester neutre et non clinique :
  - fond #FAF8F5 / #1A1917 · surface #FFFFFF / #24221F · surface-2 #F2EEE8 / #2E2B27
  - texte #1F1D1A / #EDE9E3 · texte-2 #6B665E / #A8A29A
  - bordure #8C857B / #7A746B · filet #E4DFD8 / #3A3632
  - accent ardoise #3B4A6B / #9DB0D9 · fond info #EEF1F7 / #262B36
  - graphe du sommeil, rampe d'une seule teinte : clair #A9B5CF / #6D7FA6 / #3B4A6B, sombre #4A5878 / #7688B0 / #AFC0E3
  - une brique sourde (#9E3B2F / #E8A195), réservée au seul bouton « Effacer définitivement ».
- Rayons doux et cohérents, ombres presque absentes. La hiérarchie passe par l'espace et la graisse.

## 6. Parler au lieu d'écrire (composant clé)
Deux outils distincts, à dessiner tous les deux. Ils ne se mélangent jamais.

### A. « Dicter » : la voix devient du texte
- Un bouton micro au trait, à droite dans chaque champ de texte libre. Cible de 44 pt, libellé accessible « Dicter ». Champs concernés :
  - Aujourd'hui : Mes points positifs, Notes libres ;
  - Épisode : Situation, Ce qui a aidé ;
  - Symptôme : Contexte, Note ;
  - Rendez-vous : Une question pour ce rendez-vous…, Ce qui a été dit / décidé, Prochaine étape ;
  - Traitement : Changement / ajustement, Notes.
- Pas de bouton Dicter sur la recherche ni sur les champs courts (prénom, renommage d'un élément de liste).
- Un appui place le curseur dans le champ et ouvre le clavier de l'iPhone. Une ligne discrète apparaît alors sous le champ : « Touche le micro du clavier pour parler. » La dictée elle-même est celle de l'iPhone, l'app ne la dessine pas.
- Le texte dicté s'ajoute à la suite et reste modifiable.
- États à dessiner : au repos, champ actif avec la ligne d'aide, rempli.

### B. « Mémo vocal » : la voix est gardée telle quelle, réécoutable
- **Un seul bouton par fiche, pas un par champ** :
  - Aujourd'hui : une ligne « Mémo vocal » juste sous Mes points positifs ;
  - Épisode et Symptôme : dans le récapitulatif ;
  - Rendez-vous et Traitement : dans la fiche.
- États à dessiner :
  1. Au repos : icône au trait et « Mémo vocal ».
  2. En cours :
     - le bouton devient un carré avec « Arrêter » ;
     - la durée s'affiche en chiffres tabulaires (0:12) ;
     - une onde discrète couleur accent est animée, figée si le mouvement réduit est activé ;
     - pas de point rouge, rien ne clignote.
  3. Terminé :
     - une puce « Mémo vocal · 0:24 » avec lecture / pause (icône au trait), la durée et ✕ ;
     - ✕ supprime aussitôt, puis un toast « Mémo supprimé · Annuler » reste 5 s ;
     - plusieurs puces peuvent s'empiler.
  4. Micro non autorisé : une ligne neutre, « Micro non autorisé. Tu peux l'activer dans les réglages de l'iPhone. »
  5. Micro indisponible : une ligne neutre, « Le micro ne répond pas pour l'instant. Tu peux écrire, ou dicter avec le clavier. »
- Durée maximale de 5 minutes. L'enregistrement s'arrête alors seul et le mémo est gardé. Aucun compte à rebours n'est affiché.
- Quitter l'écran ou passer l'app en arrière-plan arrête l'enregistrement, et ce qui a été dit est gardé.
- Un mémo existant se signale par une petite icône au trait : sur la ligne du jour dans l'Historique, et sur la ligne de l'épisode ou du symptôme.
- Les mémos ne sortent jamais vers l'export PSY ni vers la vue soignants. Ils sont inclus dans la sauvegarde.

## 7. Navigation
- Barre d'onglets en bas, icône au trait plus libellé, sans pastille ni compteur : Aujourd'hui · Analyse · Historique · Soins · Réglages.
- L'app s'ouvre toujours sur Aujourd'hui. Aucun onboarding, aucun écran d'accueil.
- Écrans poussés : « ‹ Retour » en haut à gauche.
- Bandeau d'une ligne en haut, discret : « Nouvelle version prête · Recharger ». Il est masqué pendant un parcours.
- Seule exception : ouverte dans Safari sans être installée, l'app ne montre qu'un court guide d'installation (§8.10). Ce n'est pas un onboarding, il n'apparaît jamais dans l'app installée.

## 8. Écrans à produire
Reprends EXACTEMENT les libellés et les listes ci-dessous, sans les lisser, les raccourcir ni les réordonner.
Dans les grilles de choix, la partie entre parenthèses d'un libellé s'affiche en petit sous le nom. Dans un libellé de champ, elle s'affiche en texte secondaire sur la même ligne.
L'ordre des grilles est fixe, jamais trié par fréquence.

### 8.1 Aujourd'hui
Mise en page :
- Les 7 champs et « Mes points positifs » tiennent sans défilement à 390 × 844, taille de texte par défaut. Le reste (replis, épisodes, pied) vient en dessous et défile.
- En-tête : « ‹  Aujourd'hui · mercredi 30 sept.  › ». La flèche › est grisée sur aujourd'hui, et le titre ouvre le sélecteur de date. À droite, « Enregistré » en 13 pt pendant 1,5 s.

Les champs, dans cet ordre :
1. Lieu : Bureau · Télétravail · Congé / repos · Arrêt · Clinique · Autre (2 rangées de 3).
2. Sommeil (nuit dernière) : libellé à gauche, segmenté Mal · Moyen · Bien à droite.
3. Humeur : 1 à 10, en 2 rangées de 5 pastilles identiques.
4. Contact humain et Sport / mouvement côte à côte, chacun en Oui · Non à trois états (vide, Oui, Non).
5. Explosions : 0 · 1 · 2 · 3 · 4 · 5.
6. Traitement pris : libellé à gauche, Oui · Partiel · Non à droite.
7. Mes points positifs : zone de texte avec micro et l'indication « Même petit. « J'ai tenu » compte aussi. »

Replis (quand un repli contient des données, sa ligne les résume) :
- « ▸ Nuit en détail » : Coucher (la veille), Lever, chacun avec ✕ pour effacer, et Réveils de 0 à « 5 ou plus ». Une fois fermé, le repli résume : « 23:40 → 07:10 · 1 réveil ».
- « ▸ Notes libres », avec micro.

Sous les replis :
- Rubrique « ÉPISODES ET SYMPTÔMES » : « 18:42  Colère · 7 · Me sentir pris pour un con › », puis « + Symptôme ». Toucher une ligne ouvre son récapitulatif.
- Bouton flottant bien visible : « + Épisode ».
- Une ligne quand un rendez-vous tombe dans les 14 jours, par exemple « Prochain RDV : Psychiatre · mer. 14 oct. 10:30 ».
- Pied discret : « Tout est facultatif. Toucher un choix une seconde fois l'efface. »

Variantes :
- jour passé : une ligne « Revenir à aujourd'hui », et en bas un lien discret « Effacer cette journée » (confirmation du §8.4) ;
- entre 0 h et 4 h : l'en-tête montre encore la veille, avec « Encore mardi jusqu'à 4 h. » ;
- échec d'écriture : à la place de « Enregistré », « Enregistrement impossible pour l'instant, nouvel essai en cours. » ;
- base vide : une ligne discrète « Importer une sauvegarde » en bas, qui disparaît à la première valeur saisie.

### 8.2 + Épisode (modale plein écran, une question par écran)
L'épisode est enregistré dès le premier choix, puis à chaque toucher.

Cadre de la modale :
- En haut : « ✕ Fermer · Épisode », avec un repère d'étape en points (● ○ ○ ○ ○), jamais une barre.
- En dessous, la ligne « Aujourd'hui · 18:42 ▾ », qui permet de changer la date et l'heure. Depuis un jour passé, la date est ce jour-là et l'heure reste vide.
- En bas : « ‹ Retour » et « Passer › ». Au toucher, la sélection reste visible 250 ms, puis l'écran suivant glisse (sans glissement si le mouvement réduit est activé).
- Grilles de 2 colonnes, cases de 48 pt au minimum, libellés sur deux lignes permis.

Étapes :
1. « Ça a démarré avec… » : Me sentir pris pour un con · Injustice · Ne pas être compris · Imprévu / changement · Surcharge sensorielle (bruit, monde) · Manque de sommeil · Trop de sollicitations · Conflit · Attente / lenteur · Erreur / échec · Solitude · Rien d'identifié.
2. « Ça ressemblait plutôt à… » : Colère · Frustration · Sentiment d'injustice · Honte · Culpabilité · Tristesse · Anxiété · Peur · Vide / rien · Épuisement · Surcharge · Irritabilité · Soulagement · Joie · Fierté · Calme · Enthousiasme.
3. « Intensité (1 = à peine, 10 = maximum) » : 10 pastilles en 2 rangées de 5, comme l'Humeur.
4. « Et en dessous, il y avait peut-être… » : Injustice · Ne pas être vu / reconnu · Honte · Peur · Tristesse · Fatigue / débordement · Je ne sais pas.
5. « Ta réaction » : Explosion · Retrait / isolement · Masquage (fait comme si) · J'ai réussi à en parler · Rien fait · Report (revenu à froid).

Récapitulatif :
- les lignes Déclencheur, Émotion, Intensité, En dessous et Réaction, chacune touchable (›). Une étape passée affiche « · » en texte secondaire ;
- « Situation (facultatif) » et « Ce qui a aidé (facultatif) », avec micro ;
- « Supprimer cet épisode » en lien discret, avec confirmation ;
- le bouton « Mémo vocal » (§6 B) ;
- un bouton plein « Terminer ».

Sortie et réouverture :
- « ✕ Fermer » garde ce qui est rempli, sans confirmation.
- Après « ✕ Fermer » ou « Terminer », un toast « Épisode enregistré · Annuler » reste 5 s.
- Un épisode existant s'ouvre directement sur le récapitulatif.

### 8.3 + Symptôme (même mécanique, « ✕ Fermer · Symptôme », repère en 3 points)
- Symptôme : Crise d'angoisse · Vide / shutdown · Paralysie (impossible d'agir) · Ruminations · Explosion de colère · Surcharge sensorielle · Hyperfocus · Endormissement difficile · Réveil non reposé · Irritabilité · Fatigue extrême · Difficulté de concentration · Évitement social · Douleurs / tensions.
- Puis Intensité de 1 à 10.
- Puis Durée : Quelques minutes · Moins d'une heure · Quelques heures · Toute la journée · Plusieurs jours.
- Puis un récapitulatif avec Contexte et Note, tous deux avec micro. La date est celle du jour affiché.

### 8.4 Historique
Organisation :
- Segmenté Jours · Épisodes · Symptômes, une loupe de recherche (l'extrait trouvé est surligné) et « Filtrer ▾ ».
- Regroupement par semaine (« Semaine du 21 septembre »), sans aucun compte. Les jours non saisis n'existent pas.
- Ligne d'un jour : seulement les faits connus, « Humeur 4 · Sommeil mal · Bureau », puis épisodes, explosions, début des points positifs, et l'icône mémo s'il y en a un.
- Toucher un jour ouvre l'écran Aujourd'hui de cette date. Toucher un épisode ou un symptôme ouvre son récapitulatif.

Filtres :
- pour les jours : période, lieu, humeur 1-4 · 5-6 · 7-10, avec explosions, avec notes ;
- pour les épisodes : émotion, déclencheur, dessous, réaction, intensité 7 et plus.

États vides : « Aucun épisode noté pour l'instant. », « Aucun symptôme noté pour l'instant. »

Suppression d'une journée :
- confirmation : « Effacer la journée du lundi 28 sept. ? Les épisodes et symptômes de ce jour sont conservés. » ;
- puis un toast « Journée effacée · Annuler » pendant 5 s.

### 8.5 Soins (segmenté Rendez-vous · Traitement, Rendez-vous par défaut)
Rendez-vous :
- un bouton « + Rendez-vous », puis deux rubriques, « À venir » et « Passés ». Un rendez-vous sans date s'affiche « Date à fixer » ;
- la carte du prochain rendez-vous contient le champ « Une question pour ce rendez-vous… », avec micro. Retour ajoute la question et laisse le champ prêt pour la suivante ;
- fiche : date, heure, professionnel en pastilles (Psychiatre · Neuropsychologue · Psychologue · Médecin traitant · Médecin du travail · Équipe de réhabilitation · Autre), questions à cocher, « Ce qui a été dit / décidé », « Prochaine étape » ;
- état vide : « Aucun rendez-vous noté pour l'instant. »

Traitement :
- une liste des fiches, la plus récente en haut (date · changement · effet ressenti), et un bouton « + Traitement ».
- Une fiche tient sur une seule page :
  - date, et « Changement / ajustement (facultatif) » ;
  - effets secondaires à choix multiple, « Aucun » excluant les autres : Aucun · Bouche sèche · Somnolence · Fatigue · Nausées · Maux de tête · Tremblements · Prise de poids · Perte d'appétit · Troubles digestifs · Baisse de libido · Vertiges · Sueurs · Agitation / nervosité ;
  - effet ressenti : Moins bien · Stable · Mieux ;
  - notes.
- Pied fixe sur l'onglet Traitement : « Ce journal sert à préparer tes échanges avec ton psychiatre. »

Partout : enregistrement automatique, aucun bouton.

### 8.6 Analyse
Carte « Pour info » :
- En tête, seulement quand elle existe, sans icône d'avertissement, avec un bouton « Masquer » : « Ces 4 derniers jours ressemblent, surtout par {a} et {b}, aux jours qui ont précédé certaines périodes plus basses. C'est une ressemblance dans les chiffres, pas une prévision. »
- Son détail tient en 3 colonnes, « Ces 4 jours · Avant ces périodes · D'habitude », sans nombre de périodes ni aucune date.
- Cette carte n'apparaît jamais ailleurs : ni sur Aujourd'hui, ni dans la vue soignants.

Tuiles, sous un sélecteur 7 j · 30 j · Depuis le début :
- humeur moyenne 6,2 (de 4 à 8), journées à 7 ou plus, journées à 4 ou moins ;
- explosions, nuits Mal, réveils, coucher, lever et durée médians ;
- contact humain : 4 jours, bureau, sport, traitement pris (Oui · Partiel · Non) ;
- épisodes (intensité moyenne), symptômes.

Règles des tuiles : une décimale avec la virgule française, jamais de pourcentage. Une valeur absente s'affiche « · », avec la mention « (peu de valeurs) » quand c'est le cas.

Trois graphes sur 12 semaines, chacun avec une phrase-résumé et un lien « Voir en tableau ». Pas de graphe avant 2 semaines de données.
- Humeur : ligne sur un axe fixe de 1 à 10, filets à 4 et 7. Point plein, ou anneau creux pour une moyenne fragile (légende « moyenne fragile (peu de valeurs) »). Pas de segment au-dessus d'une semaine vide.
- Explosions : barres. Zéro s'affiche comme un trait de 2 pt, une semaine vide ne montre rien.
- Sommeil : barres empilées Mal / Moyen / Bien, sur une seule teinte.

« Ce que tes journées à 7 ou plus ont en commun » :
- 3 constats au plus, sur ce modèle : « Plus présent dans tes journées à 7 ou plus : une journée au bureau (15 sur 22, contre 1 sur 11 journées à 4 ou moins). » ;
- un graphique en haltères étiqueté « 15 sur 22 · 1 sur 11 » ;
- en pied de section : « Ce sont des observations sur tes données, pas des causes. »

« Sommeil et humeur » :
- moyenne d'humeur par qualité de nuit, toujours avec « va avec », jamais « provoque » ;
- exemple : « Une nuit notée Mal va avec une humeur plus basse le jour même (4,9 contre 6,8 après une nuit Bien). Le lendemain, pas d'écart net. »

Classements :
- le n°1 de chaque liste : déclencheur, dessous, émotion, réaction, symptôme, effet secondaire ;
- « à égalité : A et B » en cas d'égalité ;
- ligne type : « Me sentir pris pour un con · 4 épisodes sur 9 (hors « Rien d'identifié » : 5) » ;
- sans effet secondaire noté : « Aucun effet noté sur la période ».

Fin de l'écran :
- Tableau Évolution : semaine, humeur moyenne (anneau si fragile), explosions, nuits Mal, puis émotion, déclencheur, symptôme et effet secondaire n°1. Il défile de côté dans son propre cadre, la page jamais.
- Un repli « Voir les chiffres », et l'état « Calcul… » pendant le calcul.
- État vide : « Pas encore assez de données pour le dire. », avec un lien « Pourquoi ? » qui donne la règle fixe sans aucun décompte, par exemple « Il faut au moins 5 journées à 7 ou plus et 5 journées à 4 ou moins. »
- En bas, deux lignes : « Export PSY › » et « Vue soignants › ».

### 8.7 Export PSY
- Aperçu du texte en SF Mono, une ligne par jour saisi, séparateur « · ». Forme attendue (données fictives) :
    SUIVI APP · 7 jours du jeu 24/09 au mer 30/09/2026
    JOURS
    jeu 24/09 · Bureau · nuit Mal (2 réveils) · humeur 5 · contact oui · sport non · explosions 1
      + marche de 20 min
    ven 25/09 · Télétravail · nuit Moyen · humeur 6 · contact non · sport oui · explosions 0
- Les jours non saisis ne sont pas listés, et leur absence n'est pas mentionnée. Les mémos vocaux n'y figurent pas.
- Bouton principal « Copier les 7 derniers jours pour PSY », puis la confirmation « Copié. Prêt à coller dans PSY. »
- En secours, un bouton « Partager ».
- Un bouton secondaire toujours présent : « Faire aussi une sauvegarde ».

### 8.8 Réglages
Sauvegarde :
- « Dernière sauvegarde : 18 septembre 2026 », ou « Aucune sauvegarde pour l'instant. Tes données ne sont que sur cet iPhone. » ;
- Exporter, Importer, et « Revenir à l'état d'avant l'import » ;
- une ligne d'aide : « Enregistrer dans Fichiers, puis iCloud Drive, dossier Carnet. »

Écran d'import :
- aperçu « Ce fichier contient 142 journées, 38 épisodes… (du 3 mars au 29 sept. 2026). » ;
- si la base n'est pas vide : « 12 journées et 3 épisodes présents ici et absents du fichier seront effacés. » ;
- un bouton séparé « Exporter d'abord », pas de case à cocher ;
- erreurs : « Ce fichier est illisible. » ou « Ce fichier ne ressemble pas à une sauvegarde de Carnet. »

Autres rubriques :
- Listes : une ligne par liste. On peut ajouter, renommer, réordonner avec ↑ ↓, archiver et restaurer, sans compteur d'usage. Sommeil, Traitement pris et Effet ressenti se renomment seulement.
- Rappel du soir : un pas à pas en texte (automatisation Raccourcis à 21:00, notification « Carnet du soir, si tu veux. »).
- Analyse : l'interrupteur « Signal de ressemblance » et le champ « Prénom pour la vue soignants », vide.
- À propos : « Tes données restent sur cet iPhone. », la version, « Rechercher une mise à jour », « Stockage protégé : oui », l'espace utilisé (dont les mémos vocaux), « Hors ligne : prêt ».

Zone sensible : « Tout effacer », en 3 temps :
1. proposer d'abord d'exporter ;
2. saisir le mot EFFACER ;
3. toucher le bouton « Effacer définitivement ».

### 8.9 Vue soignants (une page A4, toujours en thème clair)
À l'écran : le choix du professionnel en pastilles, l'aperçu de la page, et un bouton « Partager en PDF ».

La page contient, de haut en bas :
1. En-tête :
   - « Suivi quotidien · édité le 30/09/2026 · données depuis le 12/03/2026 ». Le prénom saisi dans Réglages s'insère après « Suivi quotidien ». Dans les maquettes, laisse-le vide ;
   - puis « Données saisies par moi dans une application personnelle. Observations chiffrées, sans interprétation. »
2. Tableau d'indicateurs : colonnes 7 j · 30 j · Depuis le RDV du jj/mm (seulement s'il existe) · Depuis le début, avec la base n collée à chaque valeur, par exemple « 6,2 (de 4 à 8, sur 28 j) ».
3. Les 3 graphes en vignettes d'environ 60 × 40 mm.
4. Classements sur 30 jours : les 3 premiers de chaque liste, en grille de 3 × 2.
5. Repères : 3 constats au plus et le constat sommeil et humeur, en voix neutre, ou « Pas encore assez de données ».
6. Traitement sur 90 jours : 4 lignes au plus, « date · changement · effet ressenti · effets secondaires ».
7. Pour ce rendez-vous : le prochain RDV avec ce professionnel, ses questions non abordées (6 au plus) et la prochaine étape du RDV précédent.

La page ne contient ni situations, ni notes, ni points positifs, ni « ce qui a aidé », ni détail jour par jour, ni signal, ni mémo. Elle reste lisible imprimée en noir et blanc.

### 8.10 Guide d'installation (dans Safari seulement)
- Ouverte dans Safari, l'app n'affiche que ce guide, sans saisie possible.
- 3 étapes courtes, chacune avec une icône au trait :
  1. toucher « ••• », puis « Partager », puis « Sur l'écran d'accueil » ;
  2. vérifier que « Ouvrir comme app web » est activé ;
  3. toucher « Ajouter ».

## 9. États à montrer
- Vide : premier lancement (Aujourd'hui avec « Importer une sauvegarde »), Historique vide, Analyse sans assez de données.
- Rempli : données fictives réalistes.
- Dicter : les 3 états. Mémo vocal : les 5 états et la puce.
- « Enregistré » discret, et l'échec d'écriture.
- Bandeau « Nouvelle version prête · Recharger ».
- Toast avec Annuler.
- Confirmations de suppression (journée, épisode) et « Tout effacer ».
- Variantes d'Aujourd'hui : jour passé, entre 0 h et 4 h, grande taille de texte d'accessibilité (avec défilement).

Données fictives et neutres uniquement : aucun prénom ni nom de personne, de lieu, d'entreprise ou de médicament. Textes libres courts et banals (« marche de 20 min », « déjeuner au calme »).

## 10. Livrables
1. Maquettes haute fidélité de chaque écran au format iPhone 390 × 844, en clair et en sombre, dans cet ordre de priorité :
   - lot 1 : Aujourd'hui, + Épisode, Dicter et Mémo vocal, barre d'onglets ;
   - lot 2 : Historique, Soins, + Symptôme, Réglages, guide d'installation ;
   - lot 3 : Analyse, Export PSY, Vue soignants.
2. Composants : pastille, segmenté, oui / non à trois états, grille de choix à 2 colonnes, bouton Dicter (3 états), bouton Mémo vocal (5 états), puce mémo, en-tête de jour, repli, barre d'onglets, bouton flottant, toast avec Annuler, bandeau, tuile chiffrée, carte « Pour info ».
3. Jetons de design (couleurs clair / sombre, espacements, rayons, typographie, durées d'animation), exportables en variables CSS : --bg, --surface, --surface-2, --text, --text-2, --border, --hairline, --accent, --info-bg, --danger, --sommeil-1, --sommeil-2, --sommeil-3, etc.
4. Un prototype HTML/CSS/JS cliquable, sans framework, en un seul fichier et sans aucune ressource externe. Il couvre :
   - Aujourd'hui (toucher, toucher de nouveau pour effacer, « Enregistré ») ;
   - le parcours Épisode complet ;
   - Dicter (focus du champ et ligne d'aide) et le mémo vocal simulé ;
   - les onglets ;
   - la bascule clair / sombre.

## 11. À ne pas faire
- Pas d'onboarding.
- Pas d'illustration infantilisante, pas de mascotte, pas d'emoji.
- Pas de visage, d'émoticône ni d'échelle de smileys pour l'humeur ou les émotions.
- Pas de gamification : série, score, badge, niveau, défi, confettis, félicitation.
- Pas de graphique anxiogène : zones rouges, flèches de chute, jauges.
- Pas de calendrier coloré, de carte de chaleur ni de grille de l'année : les trous s'y verraient.
- Pas de rouge d'alerte, pas de vert de réussite, pas de dégradé de couleur sur l'humeur.
- Pas de point rouge ni de clignotement pendant l'enregistrement.
- Pas de pourcentage, pas de compteur de jours, pas de texte d'aide envahissant.
