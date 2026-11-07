# Recette sur l'iPhone (à cocher à chaque jalon)

- [ ] L'icône « Carnet » ouvre l'app en plein écran. Réglages affiche « Hors ligne : prêt » et « Stockage protégé : oui ».
- [ ] En mode avion, l'app se relance et la saisie fonctionne.
- [ ] 3 saisies du soir, avec une phrase dictée, chacune en moins de 30 s.
- [ ] Un épisode en 8 touchers au plus. Fermer à mi-parcours garde les choix.
- [ ] À 00:30, l'écran affiche encore la veille, avec « Encore … jusqu'à 4 h. »
- [ ] « Dicter » ouvre le clavier. La dictée par le micro du clavier remplit le champ, y compris en mode avion.
- [ ] Un mémo vocal de 20 s s'enregistre et se réécoute après relance. Verrouiller l'écran pendant un enregistrement garde ce qui a été dit.
- [ ] L'export arrive dans iCloud Drive (dossier Carnet). La restauration sur une installation neuve redonne les mêmes nombres, mémos compris.
- [ ] La mise à jour arrive par le bandeau, et rien n'est perdu.
- [ ] La barre d'état et les zones sûres sont correctes en clair et en sombre.
- [ ] La notification Raccourcis arrive à 21:00, y compris iPhone verrouillé.
- [ ] v2 : copier puis coller dans PSY donne le texte complet. v3 : le PDF des soignants s'imprime ou s'enregistre.
- [ ] Aucun texte de l'app ne parle d'un jour manqué, d'une série ou d'un score.

## Design (J2.0)

- [ ] Tous les textes s'affichent dans la police de l'iPhone (SF Pro), titres et carte des émotions compris, en clair et en sombre.
- [ ] Réglages iOS › Luminosité et affichage › Taille du texte au plus grand : l'app reste lisible et défile, rien n'est coupé. Résultat attendu pour l'instant, hérité et sans rapport avec la v10 (`docs/decisions.md`, v10, « En attente de l'utilisateur ») : aux tailles d'accessibilité, à l'étape 1 de l'Épisode, des pastilles sortent de l'écran sans s'atteindre, et la page défile de côté sur Aujourd'hui, Rendez-vous, Traitement, Soins › Traitement et la Vue soignants, puis, au plus grand, sur Réglages et Rappels. L'Analyse et Comprendre, eux, ne défilent pas de côté.
- [ ] « Pas à pas » : la journée se remplit une question par écran ; Fermer garde tout.
- [ ] Toucher le micro « Dicter » quand le clavier est déjà ouvert ne le referme pas.
- [ ] « En consultation » : chiffres des 30 jours, questions cochées au doigt, compte rendu dicté ; Terminer revient à Soins.
- [ ] Les boutons « Pas à pas » et « + Épisode » ne recouvrent ni « Mes points positifs » ni « Mémo vocal ».

## v10

- [ ] **Son de fond, écran verrouillé** : Diagnostic (appui long sur la version, dans Réglages) › « Son de fond, écran verrouillé », puis verrouiller l'iPhone. Le bruit rose continue, en mode silencieux aussi, et s'éteint en fondu à la fin des 2 min. S'il s'arrête au verrouillage, en faire un correctif 10.0.1 : l'écran noir gardé allumé pendant la minuterie (§14.2 de la spec v10).
- [ ] Sons de fond : ni claquement ni répétition qu'on entende, sur les quatre sons. « Fermer » arrête le son, et la musique peut repartir. Le fondu de la minuterie ne s'entend pas comme une coupure.
- [ ] **La lentille de la carte pendant l'élan** : lancer la carte d'un coup de doigt. Le mot du milieu grossit, ses voisins un peu, sans saccade, et rien n'est noté. Un toucher juste après l'arrêt choisit le mot sous le doigt, jamais un voisin. Avec « Réduire les animations », rien ne grossit en glissant.
- [ ] Moment difficile : les quatre boutons sont à l'écran sans défiler. Toucher Panique démarre aussitôt, sans son. « Signal sonore » et « Lire les consignes à voix haute » (Réglages › Moment difficile) valent pour ces exercices.
- [ ] **« Réveil la nuit », la nuit**, dans le noir, luminosité basse : le texte gris se lit sans éclairer la chambre, et l'écran reste allumé pendant l'exercice, et seulement pendant. Le son dépend du chemin. Lancé de Moment difficile : rien ne sonne sans la voix. Lancé de Bien-être › « Dormir ou me rendormir » : il suit les réglages du lecteur, Repères + souffle au départ. En thème clair, la barre d'état ne fait pas de bande claire au-dessus du noir.
- [ ] **La fin de « Réveil la nuit »**, en thème clair : à la fin, l'écran repasse au clair sur Moment difficile. À juger la nuit, avec les quatre boutons de Moment difficile en thème sombre, qui restent lumineux. Les deux sont dans `docs/decisions.md`, « En attente de l'utilisateur ».
- [ ] **« Réveil la nuit » lancé par ▶** (un favori, ou « Reprendre ») : le bol et le souffle partent aussitôt, sans passer par l'écran où se règle le son. À juger la nuit : l'autre lecture possible est que le ▶ ouvre l'écran « avant » (§14.4 de la spec v10, `docs/decisions.md`, « En attente de l'utilisateur »).
- [ ] **Les textes des exercices, à relire** : les dix exercices de `docs/decisions.md`, « Exercices à relire », dans le lecteur, une consigne par écran, assez de temps pour chacune, voix allumée aussi. La lecture à voix haute ne coupe pas une consigne.
- [ ] **La table « Pour ce moment : », à relire** (`docs/decisions.md`, entrée v10.0.0) : noter un mot de chaque couleur. Les exercices proposés conviennent à ce moment-là. Toucher l'un d'eux lance le lecteur, et le relevé est là dans Ma journée.
- [ ] Le soupir : le disque, le mot « Encore un peu » et le son suivent la petite inspiration en plus. Le noting : les quatre étiquettes se touchent sans viser.
- [ ] Bien-être : « Reprendre » revient après une relance de l'app. Une épingle survit à une sauvegarde restaurée.
- [ ] Minuteur silencieux : l'écran reste allumé, le bol sonne au début et à la fin ; verrouiller l'iPhone le met en pause.
- [ ] Minuteur de concentration : lancer 15 min, passer à une autre app au-delà de la durée, revenir. L'écran dit « Le temps est passé. », sans bol. Si iOS a rechargé la page (retour sur Aujourd'hui, sans ce texte), en faire un correctif : retenir l'heure de fin, comme pour le repli du §14.2 de la spec v10.

## v11

- [ ] **Le geste de retour, au doigt** (point de vigilance 2 du plan v11) : sur un écran à « Retour », le doigt qui glisse vers la droite fait comme « Retour ». L'essayer en partant du titre, d'un graphe de Comprendre, de l'aperçu de l'Export PSY et de la barre d'onglets. Sur un épisode rouvert, il fait comme « Fermer ». Faire défiler un écran ne fait jamais revenir en arrière. Si rien ne se passe depuis l'un de ces départs, iOS a pris le geste pour lui : en faire un correctif. Un graphe montré « en tableau » garde son défilement de côté : depuis lui, le geste peut ne rien faire.
