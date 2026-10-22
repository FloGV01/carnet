# Carnet v6.2 : refonte visuelle, piste 2b « Cartes noires » (plan court)

> Pour les agents : à exécuter tâche par tâche, dans l'ordre. Une tâche = un commit.
>
> **Références visuelles**, à regarder AVANT de coder et à comparer à tes captures :
> - `docs/design/retour-claude-design-v2/rendus/2b-sombre-*.png` et `2b-clair-*.png` : les 5 écrans dessinés (Aujourd'hui, Humeur du moment, Épisode étape Intensité, Analyse haut, Moment difficile) ;
> - `docs/design/retour-claude-design-v2/design_handoff_carnet_refonte/README.md` : la spécification du design. Ne lis que la variante **2b** et le système commun.
> - `.../tokens.css` : les valeurs exactes ;
> - `.../icons/*.svg` : les icônes ;
> - `docs/design/prompt-claude-design-v2.md` : le brief.
>
> Les fichiers de `references/` sont des maquettes (React, styles en ligne, Google Fonts) : on n'en reprend AUCUN code.

**Objectif** : donner à Carnet l'apparence de la piste 2b, sur tous les écrans, sans changer les données, les règles, ni l'organisation de la v6.1. On y ajoute P5 (bouton Humeur plus grand), P6 (réponses près du pouce) et le changement de jour en glissant.

**Choix de l'utilisateur (20/10)**
- Mise en page **2b · Cartes noires**.
- **Police système** de l'iPhone (`-apple-system, system-ui, sans-serif`), **PAS Lexend** : on ne télécharge rien. Garde les tailles, graisses et interlignes du README.
- **Pas de rubriques remplies repliées en pastilles** : sur Aujourd'hui, les rubriques restent ouvertes, à leur place. Le repli « Ta soirée » après « J'ai fini pour ce soir » existe déjà et reste.
- **Changer de jour en glissant**, en plus de ‹ ›.
- **Couleurs exactes** de `tokens.css`. On ajustera après un essai sur l'iPhone.

**Contraintes globales**
- CLAUDE.md fait foi :
  - un toucher enregistre, rien par défaut, tout facultatif ;
  - aucune mécanique d'engagement, silence sur les jours non saisis ;
  - aucun avis, aucune alerte ;
  - zéro réseau, CSP sans style en ligne (ni `style=`, ni `<style>` dans un SVG), pas de build ;
  - sens des dépendances, dates par `domain/dates.js`.
- Mots interdits : `tests/aides/mots-interdits.js`. Aucune donnée réelle. Aucun prénom dans `docs/` ni dans `public/`.
- Jamais de rouge ni de vert pour dire bien ou mal. Une humeur haute et une humeur basse ont la même couleur.
- **Sélection** : fond `-fill`, texte `-on`, graisse 600 (700 pour les chiffres) et une coche. Jamais la couleur seule.
- Cibles de 44 pt au moins. Animations de 200 ms au plus, supprimées avec « Réduire les animations ».
- La taille du texte d'iOS est respectée : l'écran peut défiler en grand texte.
- La saisie du soir tient sans défilement à 390 × 797, à la taille par défaut, en clair comme en sombre.
- `index.html` (`<head>`) et `manifest.webmanifest` ne changent pas : ils sont figés depuis J0.
- La base ne change pas : `DB_VERSION` 4, `FORMAT_VERSION` 4.
- Version **6.2.0**, posée par la tâche 7.
- Avant chaque commit qui touche `public/` : `npm run precache`, puis `npm test` vert. Chaque tâche met à jour, dans le même commit, les tests qu'elle casse. Les tests de style d'avant ne sont pas sacrés : par exemple, celui de la v6 qui exige en sombre un fond de sélection de luminance inférieure à 0,2 n'a plus lieu d'être. Remplace-le par AA, 600 et coche.
- Commit : « v6.2 (N/7) : … », avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Aucun push.
- **Vérification visuelle obligatoire à chaque tâche** :
  - fais des captures Playwright (WebKit, iPhone 13, 390 × 844), en clair et en sombre, des écrans touchés, avec des données inventées ;
  - ouvre-les et compare-les aux rendus 2b ;
  - garde ces captures hors du dépôt.
  - `docs/design/audit-v6/capturer.mjs` sait déjà verser des données inventées et capturer tous les écrans. Tu peux le relancer (`node docs/design/audit-v6/capturer.mjs`, environ 2 min). Ses sorties vont dans `docs/design/audit-v6/captures/`, qui n'est pas suivi : ne le commite pas.

**Arbitrages du contrôleur**
- B1. **Icônes** : les 39 SVG du lot entrent dans le module d'icônes existant (`public/js/ui/icones.js` ou équivalent).
  - Retire leur bloc `<metadata>` (C2PA) et tout attribut inutile. Garde `stroke="currentColor"`.
  - Pas d'icône dans les grilles de choix : les libellés suffisent, comme le brief d'origine le demande. Les icônes de lieu ne servent pas.
- B2. **Thème** : on suit le système (`prefers-color-scheme`). Pas de réglage de thème dans l'app. Le sélecteur `[data-theme]` de `tokens.css` peut rester, il ne gêne pas.
- B3. **Vue soignants (page A4) et PDF** : la page reste en thème clair et lisible imprimée en noir et blanc. Les couleurs de graphiques du PDF ne changent que si c'est simple et sûr.
- B4. **Glissement** :
  - sur Aujourd'hui et sur la page d'un jour, un glissement horizontal net change de jour : au moins 60 px, ou un geste rapide, avec |dx| > 1,5 × |dy| ;
  - vers la droite, la veille ; vers la gauche, le lendemain, jamais au-delà d'aujourd'hui ;
  - ignoré s'il part d'un champ de texte, d'un élément qui défile de côté, d'une feuille ou d'un parcours ouvert ;
  - le défilement vertical n'est jamais gêné ;
  - au plus un petit déplacement de 200 ms, supprimé avec « Réduire les animations » ;
  - ‹ › et le titre ne changent pas.
- B5. **Couleurs et rubriques** : chaque rubrique et chaque parcours a sa couleur.
  - Rubriques : Lieu, Sommeil, Contact humain, Sport / mouvement, Traitement pris, Mes points positifs.
  - Parcours : Humeur du moment, Épisode, Symptôme, Moment difficile.
  - Énergie sert à pesé, rechargé et énergie basse ; Explosions est brun sourd.
  - Les classes `teinte-*` existantes pointent vers les nouvelles couleurs. Épisode et Symptôme ont maintenant les leurs (avant, ils empruntaient Humeur et Contact).
  - L'action (liens, Terminer, + Épisode, Retour, Passer) est en `--action`. Onglets, segments et période sont neutres.

---

### Tâche 1 : fondations

- `public/css/tokens.css` :
  - les jetons de la piste 2 (couleurs claires et sombres, six rôles par couleur, base, rampe sommeil, rayons, espacements, hauteurs, durées) ;
  - typographie à la police système : titre d'écran 30/38, titre du jour 23/30, titre de bloc 17/22, libellé de section 12,5 px en capitales `.07em`, corps 16/1.35, petit 14, pastille 14, onglet 11, grille 20 et 21, tuile 34 ;
  - chiffres tabulaires.
  - Fais pointer les anciens noms de variables encore utilisés vers les nouveaux, ou remplace leurs usages. Il ne doit rester aucune variable sans valeur. Vérifie avec une recherche de `var(--` sur tout `public/css` et `public/js`.
- **Sélection** commune à tous les choix (pastilles, segmentés, oui / non, grilles de choix, choix multiples, période, segments) :
  - choisi : `-fill`, `-on`, 600, coche avant le libellé (icône `coche`, 15 à 16 px, trait 3) ;
  - non choisi : `--surface-2`, comme en 2b ;
  - la couleur vient de la rubrique ou du parcours ; segments, onglets et période sont en couleur action.
- **Icônes** (B1).
- **Barre d'onglets** : icônes de 22 px. L'actif a une pilule de 56 × 30, rayon 10, en `--surface-2`, et un libellé 700 en `--text`. Les inactifs sont en `--text-2`, en 400. Fond `--bg` avec un filet en haut.
- **Base** : fond `--bg`, cartes `--surface`, rayon 14, filets `--line`. Boutons : rayon 12, hauteur 48 en grille. Rayon 10 pour une pastille.
- **Tests** : les styles calculés de la sélection (fond, texte, 600, coche présente, AA au moins 4,5:1) en clair et en sombre ; la barre d'onglets ; aucune variable CSS non définie (un test qui parcourt les feuilles).

### Tâche 2 : Aujourd'hui 2b, bande du bas (P5) et glissement (B4)

- **En-tête** :
  - « Dimanche 18 octobre » en 23/600, avec un chevron bas de 16 px en `--text-2` ; le titre ouvre le sélecteur de date ;
  - à droite, ‹ en couleur action, et › atténué à 40 % sur aujourd'hui, en cibles de 44 ;
  - garde « Enregistré », « Encore … jusqu'à 4 h. », « Revenir à aujourd'hui » et le résumé.
- **Rubriques en cartes 2b** :
  - carte `--surface`, rayon 14, marge 12 ;
  - en tête, un carré de 28 px, rayon 7, en `--c-X`, avec l'icône en `-on`, et le titre en `--text` 16 à 17/600 ;
  - boutons en grille de 3, hauteur 48 ;
  - Contact et Sport côte à côte ;
  - « Mes points positifs » : zone de texte avec « Dicter » en 44 × 44.
- **Ligne Mémo vocal / J'ai fini** (v6.1) : « Mémo vocal » en bouton neutre ; « J'ai fini pour ce soir » en couleur action, sans fond, avec l'icône `replier-soiree`.
- **Replis en liste groupée 2b** :
  - une carte, filets décalés de 52 px ;
  - chaque rangée (58 px au moins) a un carré coloré à l'icône de sa rubrique, le libellé en 16/500, le résumé en 14 px `--text-2` sur une ligne coupée, et un chevron ;
  - pas de tirets ;
  - « Ce qui a pesé · ce qui a rechargé » est en couleur énergie, Notes libres en neutre.
- **Ligne Après coup**, **« Ma journée »** (colonne d'heures de 70 px), **+ Symptôme** et **prochain RDV** : au style du système, sans changer leur logique v6.1.
- **Bande du bas (P5)** : 64 px au-dessus des onglets, fond `--bg`, trois boutons de 48 :
  - « Moment difficile » sur deux lignes, 13/600, 112 à 114 px, avec un carré à sa couleur ;
  - **« Humeur »**, le plus large (flex 1.2), en `--surface` avec un carré rose ;
  - « + Épisode » (flex 1) en couleur action.
  - Rien de touchable ne passe dessous.
- **Glissement** (B4).
- **Tests** :
  - le soir tient sans défiler à 390 × 797, en clair et en sombre ;
  - « Humeur » est la plus large des trois ;
  - glisser vers la droite donne la veille, vers la gauche le lendemain ;
  - jamais au-delà d'aujourd'hui, ignoré dans un champ, défilement vertical intact.
  Mets à jour les e2e qui testaient l'ancien aspect.

### Tâche 3 : parcours, réponses près du pouce (P6)

- **Humeur du moment** (feuille plein écran, sans onglets) :
  - en haut, « Fermer » (icône `fermer`, couleur action) et la puce « Maintenant ▾ » ; puis le titre « Humeur du moment » en 25/600, avec l'icône `humeur` dans un carré de 34 px ;
  - au milieu, le repli « Ce que je faisais », puis les relevés du jour (colonne d'heure de 70, × de 44) ;
  - **les réponses dans un panneau collé en bas**, en `--surface`, rayon 24 en haut :
    - « Humeur », avec l'aide « 1 = au plus bas, 10 = au plus haut » : grille 2 × 5 de 56 ;
    - « Énergie » : Basse · Moyenne · Haute, en 52 ;
    - les choix sont en couleur Humeur ;
  - « C'était vers… » (v6.1) et la carte « Pour récupérer, je… » restent et trouvent leur place ;
  - fermeture automatique inchangée.
- **Épisode, Symptôme, Après coup** (étapes) :
  - en haut, « Fermer », le titre et le repère d'étape en points de 9 à 10 px :
    - les étapes faites sont pleines à la couleur du parcours ;
    - l'étape en cours est pleine, avec un anneau de 3 px en `-tint-2` ;
    - les étapes à venir sont en `--surface-2` ;
    - jamais de barre ;
  - ligne de date et « Mon plan » ;
  - le rappel des réponses dans une carte, termes choisis en `--c-episode-text` 600 (ou la couleur du parcours) ;
  - **pour les étapes à réponses courtes** (Intensité, En dessous, Réaction, Durée, étapes courtes de l'Après coup) : la question (30 px) et son aide juste au-dessus de la grille, la grille en bas de l'écran. Intensité : 2 × 5 boutons de 64 ;
  - les listes longues (Déclencheur, Émotion, Symptôme) remplissent l'écran comme aujourd'hui ;
  - barre du bas : « ‹ Retour » et « Passer › » ;
  - la logique ne change pas (v6.1 : fermeture automatique d'un nouvel épisode après la réaction).
- **Récapitulatifs, feuilles** (Mon plan, En parler), **toasts** : au style du système.
- **Tests** :
  - réponses en bas de l'écran (le bas de la grille près du pied, à 390 × 844) ;
  - repère d'étape sans barre ;
  - couleurs de parcours sur les choix ;
  - parcours complets inchangés.

### Tâche 4 : Analyse, Comprendre et graphiques

- **Analyse** :
  - titre 30 px ;
  - les trois portes de 76 px de haut, Explosions · Énergie · Rythmes, chacune avec un carré coloré, la légende de son graphique (barre brune, point orange, rampe sommeil en trois pas) et un chevron. Elles gardent leur passage à la ligne en grand texte (v6.1) ;
  - période « 7 j · 30 j · 3 mois · Tout » en 44, en couleur action avec une coche ;
  - « Ma semaine » en 4 tuiles 2 × 2 (chiffre en 32/600) : humeur moyenne (« de 4 à 8 »), nuits Mal, explosions, épisodes ;
  - « Mes jours » : une étiquette au début de chaque rangée (Humeur, Nuits, Explosions, Épisodes, Énergie basse, repères de traitement).
- **Couleurs des graphiques** :
  - une seule teinte par graphique, prise dans les jetons ;
  - rampe sommeil `--chart-sommeil-1/2/3` ;
  - explosions brun ; énergie orange ; humeur rose, la même pour toutes les valeurs.
  - Le SVG ne porte aucun style : tout passe par des classes.
- **Comprendre** :
  - onglets en grand, en couleur action ;
  - période et mesure en petites pastilles ;
  - cartes `--surface` ;
  - même logique.
- **Tests** : aucun NaN ; couleurs des séries par classes ; tuiles ; portes ; AA des textes.

### Tâche 5 : Moment difficile

- « Fermer » et le titre « Moment difficile ».
- **Respiration** :
  - un cercle de 140 à 164 px en `--c-difficile-tint-2`, avec un anneau de 2 px en `--c-difficile` et un disque intérieur ;
  - « Cohérence cardiaque » ;
  - les réglages « 5 minutes ▾ » et « 5 s · 5 s ▾ » ;
  - **« Commencer »** en `--c-difficile-fill` / `-on`, de 52 à 56 de haut ;
  - avec « Réduire les animations », le cercle reste figé, comme aujourd'hui.
- « Une chose à la fois › », s'il y a un plan.
- **« Mon plan »** (icône `mon-plan`), avec « Modifier » à droite. Les rubriques sont en capitales 12,5 en `--text-2`, le texte en 17 à 19 px, interligne 1,45 à 1,5.
- En bas, « + Noter un épisode ».
- **« Une chose à la fois »** et **Mon plan (édition)** : au même style.
- **Tests** : l'ordre de la v6.1 ; « Commencer » en couleur difficile, en AA ; le cercle figé avec « Réduire les animations ».

### Tâche 6 : les autres écrans

- Écrans à mettre au système 2b :
  - **Historique** : segments, liste par semaine, filtres, recherche, puces de couleur des rubriques ;
  - **Soins** : « Pour mes soignants », segments, carte du prochain rendez-vous, fiche RDV, En consultation, Notes, Traitement ;
  - **Export PSY** ; **Vue soignants**, avec B3 ;
  - **Réglages** et tous ses sous-écrans : listes groupées 2b avec carrés d'icônes, interrupteurs, Sauvegarde, Tout effacer ;
  - **le guide d'installation**, **le Diagnostic** ;
  - **le bandeau de mise à jour**, **les confirmations**, **« Enregistré »**.
- **Tests** : mets à jour les e2e de style ; ajoute un contrôle de non-débordement à 390 px et en grand texte sur ces écrans.

### Tâche 7 : finitions, contrôle global, version 6.2.0, documentation

- **Contrôle global** :
  - relance `capturer.mjs`, puis regarde TOUS les écrans, en clair et en sombre ;
  - corrige ce qui détonne (un reste d'ancienne couleur, un texte sous 4,5:1, un bouton sans coche une fois choisi, une marge incohérente) ;
  - écris un petit test e2e qui parcourt les écrans principaux et vérifie que tout texte visible a un contraste d'au moins 4,5:1 avec son fond calculé (approximation acceptable : la couleur de fond du premier ancêtre opaque).
- **Version** : `package.json` à 6.2.0, puis `npm run precache`.
- **Documentation** :
  - `docs/decisions.md`, une entrée v6.2 : piste 2b, police système (choix de l'utilisateur), pas de pastilles, glissement, couleurs telles quelles, arbitrages B1 à B5, ce qui reste à essayer sur l'iPhone ;
  - `docs/v6-specification.md`, une section « 15. v6.2 (20/10) » courte qui renvoie à `decisions.md` ;
  - `docs/design/integration.md` : un paragraphe sur la v6.2.
  - Aucun prénom.
