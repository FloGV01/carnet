# Intégration du design Claude Design (J2.0)

Source : `docs/design/retour-claude-design/` (prototype `Carnet.dc.html`, jetons `carnet-tokens.css`).
On reprend le rendu, jamais le JS du prototype : la logique de l'app reste celle du code (moteur
d'analyse, export PSY, Dicter, vrai micro, sauvegarde ZIP).

## Ce qui est repris

- **Jetons** (`public/css/tokens.css`) : palette sable et ardoise, plus une couleur par rubrique
  (`--c-*` plein, `--t-*` teinte). Ce sont des repères, jamais une valeur bonne ou mauvaise. Contrastes
  plein sur teinte de 5,1:1 à 8,4:1. Le sombre suit le réglage de l'iPhone.
- **Typographie** : titres en serif système (New York) jusqu'à la v7, en police système ensuite ; texte en SF Pro. Les tailles sont en rem sur
  une base de 17 px. Sur iPhone seulement, cette base suit la taille du texte d'iOS (Dynamic Type).
- **Icônes** : une seule famille au trait (`public/js/ui/icones.js`), tracés de la maquette.
- **Sélection** : fond plein de la rubrique, graisse 600 et rayon qui passe de 12 à 22. La sélection
  ne repose jamais sur la couleur seule.
- **Écrans** : Aujourd'hui (rubriques teintées, résumé dans l'en-tête), parcours Épisode et Symptôme
  (phrase résumé, question en serif jusqu'à la v7, glissement entre étapes, récapitulatif en carte), Historique
  (puces par rubrique, loupe, filtres en pastilles), Soins (carte du prochain rendez-vous, questions
  à cocher), Réglages (sauvegarde intégrée, interrupteur, « Tout effacer » en trois temps), Analyse
  (Ma semaine, tuiles et graphes teintés, étiquette au toucher), Export PSY, Vue soignants, guide.
- **Nouveautés venues du prototype** : le parcours « Pas à pas » (`#/pas-a-pas/:date`) et le mode
  « En consultation » (`#/consultation/:id`). Les deux masquent la barre d'onglets, comme un parcours.

## Écarts volontaires au prototype

| Prototype | App | Raison |
|---|---|---|
| Bouton flottant « Pas à pas » posé sur le Mémo vocal | Les deux boutons flottants sont sur une bande au fond de l'écran, et la page défile au-dessus | Ne jamais recouvrir un contrôle |
| Confirmation de suppression en ligne, en rouge | Boîte de confirmation en accent | Le rouge est réservé à « Effacer définitivement » (plan §6.8) |
| Toast sous le parcours | Toast au-dessus du parcours (z-index 45) | « Mémo supprimé · Annuler » restait intouchable dans le récapitulatif |
| « Il faut au moins… » | « La règle : au moins… » | « il faut » est un mot interdit |
| Phrase sommeil de Ma semaine dès 3 valeurs | Seulement si le moteur a un constat | Rien affirmer sans test |
| Réveils « médiane » | « moyenne » | Le moteur calcule une moyenne (plan §7.1) |
| Constats recalculés selon la période | Tout l'historique, avec le test de stabilité | Moteur inchangé |
| Tuiles à « · » sous 3 valeurs | « · » seulement sans valeur ; « (peu de valeurs) » pour les moyennes fragiles | Les comptes restent exacts |
| Export PSY avec « traitement oui » | Texte du moteur inchangé | Le plan §7.8 exclut le traitement |
| Page A4 au tutoiement | Voix neutre | Plan §7.9 |
| Textarea contrôlé dans Dicter | Textarea non contrôlé, composition gérée | Ne pas casser la dictée iOS (plan §6.9) |
| Modifier depuis le récapitulatif enchaîne les étapes | Retour au récapitulatif | Comportement de l'app, plus prévisible |
| Questions abordées barrées ou masquées | Gris, jamais barrées, toujours visibles ; ajout aussi à la sortie du champ | Ne pas perdre une question |
| Pas de suppression, ni de ✕ sur les heures, ni de « + Ajouter » | Gardés, en style discret | Fonctions du plan |
| « Revenir à l'état d'avant l'import » toujours visible, grisé | Visible seulement si une copie existe | Plan §6.6 |
| Légende A4 « du plus foncé au plus clair » (bug du code) | « du plus clair au plus foncé : Mal · Moyen · Bien » | Mal est la teinte la plus claire |

## Défauts corrigés au passage

- Le texte d'attente du HTML (le nom de l'app) restait affiché sous l'app sur les écrans courts.
- Un double toucher sur « Mémo vocal » pendant la demande d'autorisation pouvait ouvrir deux flux :
  le bouton est inactif jusqu'à la réponse.
- `-apple-system-body` vaut 13 px sur Mac : les tests WebKit tournaient avec un texte plus petit que
  sur l'iPhone. La base de 17 px ne suit Dynamic Type que sur iOS.

## Validé le 2 octobre 2026

Tous les points ci-dessous sont validés tels qu'intégrés.

1. Les couleurs de rubrique, surtout sport (olive, proche du vert) et explosions (ambre).
2. Le mode « En consultation » : c'est une fonction nouvelle, absente du cahier des charges.
3. Le parcours « Pas à pas » : c'est un mode de saisie de plus, avec 9 touchers au lieu de 7.
4. Les intitulés du symptôme : la maquette dit « Symptôme » et « Durée », l'app garde « Quel symptôme ? »
   et « Combien de temps ? », comme les questions de l'épisode.
5. Les noms des listes dans Réglages restent ceux de `listes-def.js`, au singulier (la maquette les mettait
   au pluriel).

## Vérification

- Captures Playwright (WebKit, 390 × 844, clair et sombre) comparées côte à côte aux captures du
  prototype : Aujourd'hui, Pas à pas, Épisode (étapes, récapitulatif, mémo, confirmation), Historique,
  Soins, consultation, fiches, Réglages, import, Listes, Analyse, Export PSY, Vue soignants.
- `npm test` : tests unitaires (Paris et UTC) et e2e verts, dont les nouveaux tests du Pas à pas, de la
  consultation, du toast au premier plan et du texte d'attente.
- À faire sur l'iPhone (recette) : Dynamic Type aux grandes tailles, Dicter (le micro garde le focus),
  mode consultation, Pas à pas chronométré.

## v7 : la piste 2b de Claude Design (22/10)

Source : `docs/design/retour-claude-design-v2/` (rendus `rendus/2b-*.png`, `design_handoff_carnet_refonte/README.md`,
`tokens.css` et `icons/`), d'après le brief `docs/design/prompt-claude-design-v2.md`. L'utilisateur a choisi la piste
**2b · Cartes noires** le 20/10. Le plan v6.2 de la refonte a été absorbé par la v7 (version 7.0.0). Comme pour la J2.0,
on reprend le rendu, jamais le code des maquettes de `references/` (React, styles en ligne, Google Fonts).

- **Repris tel quel** : les couleurs du lot (clair gris froid, sombre noir profond, six rôles par couleur, rampe
  sommeil), comparées une à une par un test ; les tailles, graisses, rayons, hauteurs et marges ; les 39 icônes, sans
  leurs métadonnées ; la sélection commune (`-fill`, `-on`, 600 et coche) ; la barre d'onglets ; les 5 écrans dessinés.
- **Écarts voulus par l'utilisateur** : la police système au lieu de Lexend (rien à télécharger) ; pas de rubriques
  remplies repliées en pastilles ; glisser pour changer de jour, en plus de ‹ › ; « Humeur » devient « Émotion », avec
  une roue en bulles à la place de la grille de 1 à 10 ; un onglet Bien-être à la place de l'Historique.
- **Écrans non dessinés**, déduits du système : Bien-être et l'exercice, Historique, Soins, fiches, Export PSY, Vue
  soignants (la page A4 reste claire, B3), Réglages et ses sous-écrans en listes groupées à carrés d'icônes, guide,
  Diagnostic, bandeau, confirmations. Les couleurs des familles de la roue suivent la recette du lot.
- **Écarts au lot**, pour garder la saisie du soir sans défilement à 390 × 797 et « J'ai fini » à 390 × 844 : choix de
  44 au lieu de 48 dans les cartes d'Aujourd'hui, marges resserrées. « Effacer définitivement » reste rouge, seul de
  son espèce, en attendant l'accord de l'utilisateur. Le détail est dans `docs/decisions.md`, à l'entrée du 22/10.
- **Vérification** : captures Playwright (WebKit, 390 × 844, clair et sombre) de tous les écrans, hors dépôt, comparées
  aux rendus 2b ; un test e2e vérifie un contraste d'au moins 4,5:1 pour tout texte visible des écrans principaux
  (textes d'aide des champs compris, mesurés à leur `::placeholder`), en clair et en sombre, et l'absence de
  débordement à 390 px, en grand texte compris.

## v8 : les écrans nouveaux dans le système 2b (26/10)

Aucun écran de la v8 n'est dessiné par Claude Design ; tous sont déduits du système 2b, sans couleur nouvelle.

- **Émotion du moment en carte** : les tuiles sont des choix neutres (`--surface-2`, puis `-fill`, `-on`, 600 et coche à la couleur du parcours). Les bulles prennent la couleur de leur famille (`-tint-2` et `-text`, puis `-fill` et `-on` une fois choisies). Les légendes de zone sont en texte secondaire.
- **Lecteur de Bien-être** : la couleur de Bien-être (celle de Moment difficile) pour l'anneau, le disque et le bouton lecture, la consigne en grand, en haut, et les réglages en liste groupée, sous l'anneau.
- **Programme** : des cartes neutres, une rangée par séance, « Faite le 12/10 » en texte secondaire, derrière une coche à la couleur de Bien-être.
- **Mes nuits** : la rampe sommeil du lot, avec un contour au pas « Moyen » pour la barre « Mal » (trop claire sur la carte), et une barre creuse pour une nuit sans qualité.
- **Vérification** : captures (WebKit, 390 × 844, zones sûres simulées, clair et sombre, texte par défaut et 23 px), hors dépôt, et le test de contrôle étendu aux écrans de la v8. Le détail est dans `docs/decisions.md`, à l'entrée du 26/10.

## v9 : les écrans du relevé d'émotion, comme How We Feel (30/10)

Les écrans du relevé d'émotion quittent le système 2b : ils reprennent How We Feel, d'après les mesures de `docs/superpowers/specs/2026-10-28-carnet-v9/visuel-hwf.md` et la maquette validée (`apercu-carte.html`, dans le même dossier).

- **Écrans du relevé** (les quatre bulles, la carte, « Ce que je faisais », la loupe, le mot à soi) : plein écran, fond noir dans les deux thèmes, boutons en verre sombre, titres et mots des bulles en gras (`ui-serif` en v9, police système depuis la v10), texte noir sur les bulles. Ils remplacent la carte en tuiles de la v8.
- **Couleurs de zone** : `--c-zone-rouge`, `-jaune`, `-bleu`, `-vert`, avec les six rôles du lot 2b, en clair et en sombre (`tokens.css`) ; `-fill` est la couleur médiane de la bulle de How We Feel. Ailleurs dans l'app (Ma journée, en-tête d'Aujourd'hui, Historique, Après coup, Mes jours en mode jour, « Tes zones »), un mot ou un relevé prend la couleur de sa zone ; les graphiques par famille gardent les couleurs de famille.
- **Vérification** : captures (WebKit, 390 × 844, zones sûres simulées, clair et sombre), hors dépôt, comparées à la maquette et aux captures de How We Feel, et le test de contrôle étendu aux écrans de la v9. Le détail est dans `docs/decisions.md`, à l'entrée du 30/10.

## v10 : les exercices et les minuteurs dans le système 2b (03/11)

Aucun écran de la v10 n'est dessiné par Claude Design ; tous sont déduits du système 2b, sans couleur nouvelle.

- **Moment difficile** : une grille de quatre boutons en tête d'écran, en 2 × 2 et de même taille, à la couleur du parcours (`-fill` et `-on`). En très grand texte, ils passent l'un sous l'autre.
- **L'épingle** : un rond de 44 pt, en texte secondaire au repos ; allumée, le fond `-tint`, le dessin plein et `-text`. Elle est sur les lignes des entrées de Bien-être et sur les écrans de départ.
- **Écrans déduits du lecteur de la v8** : les listes des entrées, les deux minuteurs, les sons de fond et la ligne « Pour ce moment : », à la couleur de Bien-être. Les réglages restent en liste groupée, sous le bouton lecture.
- **« Réveil la nuit »** : le fond noir des écrans du relevé, dans les deux thèmes, mais avec ses propres jetons : texte gris, à 4,5:1 au moins, et teinte éteinte, pour ne pas éclairer la chambre (`.parcours.ecran-noir`).
- **Vérification** : captures (WebKit, 390 × 844, zones sûres simulées, clair et sombre, jusqu'à 53 px de texte), hors dépôt, et le test de contrôle étendu aux écrans de la v10. Le détail est dans `docs/decisions.md`, à l'entrée du 03/11.

## v11 : les écrans de l'émotion selon le thème, et les écrans nouveaux dans le système 2b (08/11)

Aucun écran de la v11 n'est dessiné par Claude Design. Spécification : `docs/superpowers/specs/2026-11-05-carnet-v11-design.md` ; le détail est dans `docs/decisions.md`, à l'entrée du 08/11.

- **Les écrans de l'émotion suivent désormais le thème** (les quatre bulles, la carte, « Ce que je faisais », la loupe, le mot à soi, un relevé rouvert) : en clair, le gris d'Aujourd'hui, des cartes blanches, des boutons en verre blanc translucide et un rond « Continuer » foncé, d'après le prototype de la v11 ; le mot choisi s'écrit en noir sur une capsule de sa couleur. En sombre, rien ne change. Les couleurs passent par les jetons `--moment-*` (`tokens.css`) ; les bulles et leur texte noir ne bougent pas. « Réveil la nuit » garde son fond noir dans les deux thèmes.
- **La roue** : une bande de vrais boutons sur le fond des choix, dans la carte de sa rubrique, avec une fenêtre au milieu (`--surface`, neutre, à vide ; la teinte de la carte une fois notée, la valeur en 700 et `-text`) ; les bords s'effacent en fondu sans toucher aux deux voisines de la valeur du milieu.
- **Mes gratitudes** : la forme de « Mes points positifs », à sa couleur. **Mes refuges** : un écran de Bien-être en champs et cartes groupées, une ligne par playlist avec l'icône `musique` et l'icône de sortie au trait. **La porte « Épisodes »** : le carré des épisodes, à côté d'« Historique ».
- **L'icône** : la piste B, « Les quatre zones », sur fond noir, avec le nom « Emozio » dessous (manifest, `apple-mobile-web-app-title`) ; `theme-color` `#e7eaee` en clair, `#000000` en sombre.
- **Vérification** : captures (WebKit, 390 × 844, clair et sombre, jusqu'à 53 px de texte), hors dépôt, et le test de contrôle étendu aux écrans de la v11.
