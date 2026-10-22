# Handoff : Carnet · refonte visuelle (piste 2)

## Aperçu
Carnet est une app web personnelle (PWA installée sur iPhone, sans compte, hors ligne, données sur l'appareil) de suivi d'humeur pour une personne AuDHD. Cette refonte change **la police, les couleurs, les formes et l'organisation d'Aujourd'hui**, sans toucher aux règles du produit (voir `docs/design/prompt-claude-design-v2.md` dans le dépôt, §1 à §3 et §7).

Piste retenue : **Lexend, couleurs franches, noir profond le soir, gris froid le jour, boutons arrondis**. Trois mises en page sont dessinées sur les mêmes 5 écrans :
- **2a · Fiches vives** : chaque rubrique ouverte est une fiche teintée, avec une icône pleine.
- **2b · Cartes noires** : des cartes neutres, à la manière des réglages de l'iPhone. La couleur n'apparaît que dans les icônes carrées et sur le choix fait.
- **2c · Épure vive** : ni cartes ni filets. Grands libellés, et le résumé du jour en tuiles teintées.

> **Décision en attente : 2a, 2b ou 2c.** Le système commun (jetons, police, icônes, règles de sélection, pastilles) vaut pour les trois. Implémente-le d'abord, puis la variante choisie.

## À propos des fichiers
Les fichiers de `references/` sont des **références de design en HTML**. Ce sont des maquettes statiques qui montrent l'aspect voulu, pas du code de production à copier. Il s'agit de **recréer ces écrans dans le code existant de `suivi-audhd`**, avec ses patterns, en respectant ses contraintes :
- politique de sécurité stricte : **aucun style en ligne** (ni attribut `style=`, ni `<style>` dans les SVG) ;
- **aucune ressource externe** ;
- tout passe par des classes et les variables de `tokens.css`.

Les maquettes utilisent des styles en ligne et chargent Lexend depuis Google Fonts pour l'aperçu seulement. Ne reprends pas ces deux choses.

Pour ouvrir les références, ouvre `references/Refonte Directions.dc.html` dans un navigateur (`support.js` doit rester à côté). La section du haut (2a, 2b, 2c) est la piste retenue. La section 1 plus bas montre l'ancienne piste, écartée parce qu'elle ressemblait trop à l'app Claude (serif + crème).

## Fidélité
- **Haute fidélité** pour les couleurs, la typographie, les formes, les tailles et les états de sélection : reprends les valeurs exactes.
- **Écrans** : seuls 5 écrans sont dessinés (Aujourd'hui, Humeur du moment, Épisode étape Intensité, Analyse haut, Moment difficile). Les autres écrans du prompt §8 se déduisent du même système.

## Système commun

### Couleur : une couleur, un sens
- **Action** (liens, « Terminer », « + Épisode », « Retour », « Passer ») : encre neutre `--action`, jamais une couleur de rubrique.
- **6 rubriques du soir** : Lieu, Sommeil, Contact humain, Sport / mouvement, Traitement pris, Mes points positifs. Chacune garde sa couleur partout : saisie, pastilles, Historique, graphiques.
- **4 parcours** : Humeur du moment, Épisode, Symptôme, Moment difficile. Dans un parcours, le choix fait et le bouton final prennent sa couleur.
- **Énergie** : « Ce qui a pesé · ce qui a rechargé » et l'énergie basse.
- **Explosions** : une teinte sourde (brun), jamais rouge.
- **Sommeil dans les graphiques** : une rampe d'une seule teinte, en 3 pas (Mal, Moyen, Bien).
- **Onglets, segments, période** : neutres.
- Pas de rouge ni de vert pour dire bien ou mal. Une humeur haute et une humeur basse ont la même couleur.

Chaque couleur X a 6 rôles, tous dans `tokens.css` :

| rôle | variable | usage |
|---|---|---|
| accent | `--c-X` | icône, bande, point de graphique (≥ 3:1 sur le fond) |
| fond plein | `--c-X-fill` | **choix fait**, pastille 2a, bouton Humeur 2a/2c |
| texte sur plein | `--c-X-on` | texte et coche sur `-fill` (≥ 4,6:1) |
| teinte | `--c-X-tint` | fond de fiche (2a), tuile du résumé (2c) |
| teinte 2 | `--c-X-tint-2` | bouton non choisi dans une fiche (2a) |
| texte coloré | `--c-X-text` | titre de fiche, termes choisis dans une phrase (≥ 4,6:1) |

Valeurs principales (sombre / clair). `-fill` et `-on` sont identiques dans les deux thèmes.

| couleur | accent | fill | on | texte coloré |
|---|---|---|---|---|
| Lieu (sable) | #ccb397 / #937c61 | #cfb69a | #171008 | #d0baa1 / #67543e |
| Sommeil (indigo) | #9fb3fc / #5f74e4 | #829afc | #0e111b | #a7bafe / #3d4daa |
| Contact humain (cyan) | #1fcde8 / #1090a3 | #27d0eb | #071417 | #1fd4f0 / #0c6371 |
| Sport / mouvement (vert) | #68d36f / #279936 | #6bd672 | #0c140c | #7bd77f / #046b1b |
| Traitement pris (violet) | #c1a6fc / #8c6aca | #b392f6 | #131019 | #c7aefe / #624595 |
| Mes points positifs (jaune) | #d2b723 / #938013 | #efd127 | #141207 | #d8be34 / #665801 |
| Humeur du moment (rose) | #ff8ebc / #ca4b85 | #ff88b9 | #190e12 | #fe9ac2 / #93285c |
| Épisode (magenta) | #ed8ef3 / #b156b7 | #dc7ee2 | #160f16 | #ee9af3 / #803385 |
| Symptôme (menthe) | #0dd5b2 / #02967c | #1ae7c2 | #081511 | #09dcb8 / #056755 |
| Moment difficile (bleu brume) | #8ebde6 / #5885ab | #85b4dc | #0a131a | #9ac3e7 / #365c7b |
| Énergie (orange) | #fc9e3f / #b96a00 | #fca34c | #181008 | #fea753 / #804802 |
| Explosions (brun sourd) | #e2a88f / #a7725a | #c79077 | #190f0a | #e4b19a / #784c38 |

Base :

| | sombre (noir profond) | clair (gris froid) |
|---|---|---|
| `--bg` | #000000 | #e7eaee |
| `--surface` (cartes) | #1e1f21 (1,28:1 sur le fond) | #ffffff (1,21:1) |
| `--surface-2` (bouton neutre) | #2d2e30 | #eef0f4 |
| `--line` (filet) | #47484a | #c2c4c8 |
| `--text` | #bfc0c3 (11,5:1) | #181b1f |
| `--text-2` | #97989b | #585b61 |
| `--action` / `--action-on` | #eaebed / #000000 | #181b1f / #fdfdfd |
| rampe sommeil Mal · Moyen · Bien | #394473 · #6073c7 · #9fb3fe | #c5d0f3 · #7e93e2 · #4455c2 |

Thème : `prefers-color-scheme` par défaut. `data-theme="dark"` ou `data-theme="light"` sur `<html>` force la bascule. Le plus faible contraste de texte mesuré est de 5,1:1.

### Typographie
- **Lexend** (licence OFL) pour tout, en woff2 embarqué : `fonts/Lexend-Variable.woff2`, graisses 400 à 700. Récupère-la depuis le dépôt `googlefonts/lexend` ou depuis Google Fonts, sous-ensemble latin avec œ, « », l'espace fine insécable U+202F et →, et joins `OFL.txt`. Le `@font-face` est déjà dans `tokens.css`.
- Chiffres tabulaires partout (`font-variant-numeric: tabular-nums`).

| niveau | taille / interligne | graisse |
|---|---|---|
| Titre d'écran, question d'un parcours | 30 / 38 px (2c : 32 / 40) | 600 |
| Titre du jour (avec ‹ ›) | 23 / 30 px (2c : 24) | 600 |
| Titre de parcours (« Humeur du moment ») | 25 / 32 px (2c : 28 / 34) | 600 |
| Titre de bloc ou de rubrique | 16–17 px (2c : 19) | 600 |
| Libellé de section | 12,5 px, CAPITALES, interlettrage .07em, `--text-2` (2c : 15 px, sans capitales) | 600 |
| Corps | 16 px / 1.35 (2c : 17) | 400 |
| Secondaire, résumé de repli | 14–15 px, `--text-2` | 400 |
| Pastille | 14 px (2c : 15) | 500 (2c : 600) |
| Onglet | 11 px (2c : 11,5) | 400, actif 700 |
| Grille Humeur 1–10 | 20 px (2c : 22) | 500, choisi 700 |
| Grille Intensité | 21 px (2c : 23) | 500 |
| Tuile chiffrée | 34 px (2b : 32, 2c : 44) | 600 |

### Formes et tailles
- Rayons : bouton **12 px**, pastille **10 px**, carte ou fiche **14 px (2b) / 16 px (2a)**, feuille du bas **24 px** en haut, bande d'en-tête de parcours (2a) **0 0 26 px 26 px**.
- Hauteurs : bouton de grille **48**, énergie **52** (2c : 54), Humeur 1–10 **56** (2c : 58), Intensité **64** (2c : 66), pastille **34** (2c : tuile de 48), bande du bas **64** (boutons de 48), barre d'onglets **83** (49 + 34 de zone sûre), barre d'état **47**. Toute cible fait au moins 44.
- Écarts : 6 px entre boutons, 8 px entre blocs (2a, 2b), 20 px entre sections (2c). Marges latérales : 12 (2a), 14 (2b), 18 (2c).
- Icônes : une seule famille au trait, 24 × 24, trait de 2 (1,8 à 2,2 selon la taille), extrémités arrondies, `stroke="currentColor"`. Taille 20–22 à côté des rubriques et des replis, 16–17 dans les carrés pleins (2a, 2b) et les pastilles.

### Sélection (non négociable)
Un choix fait = **fond plein `--c-X-fill` + texte `--c-X-on` + graisse 600 (700 pour les chiffres) + coche** (icône `coche`, 15–16 px, trait de 3, avant le libellé). Jamais la couleur seule. Toucher de nouveau un choix fait l'efface. Un toucher enregistre, sans bouton « Enregistrer ». Aucune valeur par défaut.

Non choisi : `--c-X-tint-2` (2a), `--surface-2` (2b, Humeur 2c), `--surface` (2c).

## Écrans

### 1. Aujourd'hui (onglet 1)
Ordre vertical : barre d'état · en-tête · pastilles · rubriques encore ouvertes · ligne Mémo vocal · replis · Ma journée · prochain RDV. La zone défilante s'arrête au-dessus de la bande du bas : rien de touchable ne passe dessous.
- **En-tête** (hauteur 44) : « Dimanche 18 octobre » (23 px, 600), chevron bas 16 px en `--text-2`. Le titre ouvre le sélecteur de date. À droite, ‹ (couleur action) et › (atténué à 40 % quand on est aujourd'hui), cibles de 44.
- **Pastilles = rubriques remplies repliées.** Elles se placent sous le titre, dans l'ordre Lieu, Sommeil, Contact, Sport, Traitement, et passent à la ligne si besoin (écart de 6). Le texte reprend la valeur comme dans Historique : « Congé / repos », « nuit moyen », « contact oui », « sport oui », « traitement oui ». Une touche sur une pastille rouvre la rubrique à sa place.
  - 2a : fond `-fill`, texte et icône `-on`, hauteur 34, rayon 10, marges intérieures 9/12.
  - 2b : fond `--surface`, icône en `--c-X`, texte `--text`.
  - 2c : grille de 2 colonnes de tuiles de 48 px, fond `-tint`, icône `--c-X` de 20 px, texte `-text` 15/600.
- **Rubriques ouvertes**, dans l'ordre :
  - Lieu : 6 choix en 2 rangées de 3, libellés exacts « Bureau · Télétravail · Congé / repos · Arrêt · Clinique · Autre » ;
  - Sommeil : « Mal · Moyen · Bien » ;
  - Contact humain et Sport / mouvement côte à côte, « Oui · Non » ;
  - Traitement pris : « Oui · Partiel · Non » ;
  - Mes points positifs : zone de texte avec bouton micro « Dicter » à droite (44 × 44).

  En-tête de rubrique :
  - 2a : fiche `-tint`, rayon 16, marge 10, carré de 28 px rayon 8 en `-fill` avec l'icône `-on`, titre en `-text` 16/600 ;
  - 2b : carte `--surface`, rayon 14, marge 12, carré de 28 px rayon 7 en `--c-X` avec l'icône `-on`, titre en `--text` ;
  - 2c : pas de carte, icône de 22 px en `--c-X` et titre 19/600.

  Boutons en grille de 3 colonnes, hauteur 48 (2c : 52).
- **Ligne sous les points positifs** : « Mémo vocal » à gauche (icône `memo-vocal`, bouton neutre), « J'ai fini pour ce soir » à droite (icône `replier-soiree`, couleur action ; en 2a, avec un contour de 1,5 px). Elle n'apparaît qu'après un premier choix. Pas de coche sur ce bouton.
- **Replis** : chacun avec l'icône et la couleur de sa rubrique, le libellé (16/500) et un résumé sur une 2e ligne (14 px, `--text-2`, une ligne coupée par une ellipse), plus un chevron droit. Pas de tirets.
  - Nuit en détail : « 23:20 → 08:40 · 1 réveil »
  - Ce qui a pesé · ce qui a rechargé (couleur énergie) : « pesé : monde, attente · rechargé : dehors / nature »
  - Sport en détail : « Marche 30 à 60 min »
  - Contact en détail : « Famille (Ressourçant) »
  - Notes libres (icône `notes-libres`, neutre)

  Les rangées font au moins 58 px. 2a : une carte `--surface` avec un filet de 1 px. 2b : liste groupée, filets décalés de 52 px, icônes dans des carrés colorés. 2c : rangées nues.
- **Ma journée** (non dessinée, voir prompt §6) : humeurs du moment, épisodes et symptômes rangés par heure, avec une colonne d'heures de largeur fixe (70 px). Puis « + Symptôme ».
- **Bande du bas** (64 px, au-dessus des onglets, fond `--bg`), trois boutons de 48 de haut :
  - « Moment difficile » sur 2 lignes (13 px / 600, 112 à 114 px de large) ;
  - **« Humeur »**, le plus large (flex 1.2), sous le pouce : 2a et 2c en `--c-humeur-fill` ; 2b en `--surface` avec un carré rose ;
  - « + Épisode » (flex 1), en couleur action.
- **Barre d'onglets** : Aujourd'hui · Analyse · Historique · Soins · Réglages. Icônes de 22 px. L'onglet actif a une pilule de 56 × 30, rayon 10, en `--surface-2` (2c : `--surface`), et un libellé en 700 et `--text`. Les inactifs sont en `--text-2` et 400. Fond : 2a `--surface` avec un filet en haut ; 2b `--bg` avec un filet ; 2c `--bg` sans filet.

### 2. Humeur du moment (feuille plein écran, sans onglets)
- En haut : « Fermer » à gauche (icône `fermer`, couleur action), « Maintenant ▾ » à droite (puce de 40 à 44 px). Puis le titre « Humeur du moment » avec l'icône `humeur` (2a : carré de 36 en `-fill` ; 2b : carré de 34 ; 2c : icône de 28 en `--c-humeur`).
  - 2a : bande d'en-tête de 162 px en `--c-humeur-tint`, coins bas de 26 px.
- Repli « Ce que je faisais » (icône `ce-que-je-faisais`), puis le libellé « AUJOURD'HUI » et les relevés : « 10:20 · humeur 6 · énergie moyenne », « vers 12 h · humeur 5 · énergie basse », « 17:45 · humeur 5 · énergie moyenne ». Colonne d'heure de 70 px, bouton × de 44 sur chaque ligne.
- **Réponses près du pouce**, dans un panneau collé en bas (2a, 2b : `--surface`, rayon 24 en haut ; 2c : sans panneau) :
  - « Humeur » et l'aide « 1 = au plus bas, 10 = au plus haut » ;
  - grille de 2 × 5, boutons de 56 ;
  - « Énergie » : « Basse · Moyenne · Haute », boutons de 52.

  Les choix prennent la couleur Humeur.
- L'écran se ferme seul une fois l'humeur et l'énergie choisies. La maquette montre l'humeur 6 choisie.

### 3. Épisode, étape Intensité (modale plein écran)
- En haut : « Fermer », « Épisode », et à droite le repère d'étape à 5 points de 9 à 10 px. Étapes faites : pleines en couleur Épisode. Étape en cours : pleine, avec un anneau de 3 px en `-tint-2`. Étapes à venir : contour (2a) ou `--surface-2`. Jamais de barre.
- « Aujourd'hui · 21:00 ▾ » et « Mon plan » (icône `mon-plan`).
- Rappel des réponses : « Ça a démarré avec **Imprévu / changement**, ça ressemblait à **frustration**. » Les termes choisis sont en `--c-episode-text`, graisse 600, dans une carte (2a, 2b) ou nus en 19 px (2c).
- La question « Intensité » (30 px) et l'aide « 1 = à peine, 10 = maximum » sont posées **juste au-dessus de la grille**. La grille de 2 × 5 a des boutons de 64, en bas de l'écran.
- Barre du bas : « ‹ Retour » et « Passer › ».
- 2a : bande d'en-tête de 146 px en `--c-episode-tint`.
- Après la dernière étape, retour direct sur Aujourd'hui avec le toast « Épisode enregistré · Annuler ».

### 4. Analyse, haut de l'écran (onglet 2)
- « Analyse » (30 px).
- Trois boutons de 76 px de haut, en 3 colonnes : **Explosions · Énergie · Rythmes**. Chacun porte la légende de son graphique (barre brune, point orange, rampe sommeil en 3 pas) et un chevron. Ils ouvrent Comprendre sur l'onglet correspondant. 2a : fond `-tint` ; 2b : carte avec un carré coloré ; 2c : `--surface` avec une bande de 22 × 6.
- Période : **7 j · 30 j · 3 mois · Tout**, boutons de 44. Le choix fait est en couleur action, avec une coche. Elle ne règle que les sections qui suivent.
- « Ma semaine » et « 12 – 18 oct. » : 4 tuiles en 2 × 2, pour humeur moyenne « 5,8 » (avec « de 4 à 8 »), nuits Mal « 3 », explosions « 0 » et épisodes « 3 ». Puis « Tes points positifs › ». Pas de pourcentage ni de série.
- « Mes jours » : une frise de 7 colonnes (L M M J V S D) avec une étiquette au début de chaque rangée :
  - Humeur (points de 5 px, trait min–max) ;
  - Nuits (rampe sommeil) ;
  - Explosions ;
  - Épisodes (points) ;
  - Énergie basse ;
  - repères de traitement.

### 5. Moment difficile (plein écran, le plus calme)
- « Fermer » et le titre « Moment difficile ».
- Respiration :
  - un cercle de 140 à 164 px en `--c-difficile-tint-2`, avec un anneau de 2 px en `--c-difficile` (pas d'anneau en 2c) et un disque intérieur ;
  - « Cohérence cardiaque » ;
  - les réglages « 5 minutes ▾ » et « 5 s · 5 s ▾ » ;
  - **« Commencer »** en `--c-difficile-fill`, de 52 à 56 px de haut.
- « Une chose à la fois › », seulement s'il y a un plan.
- « Mon plan » (icône `mon-plan`) avec « Modifier » à droite. Puis « MES PREMIERS SIGNES » / « Mâchoire serrée, je parle plus vite, les bruits deviennent insupportables. » et « QUAND ÇA MONTE, JE… » / « Je m'éloigne cinq minutes. Je bois un verre d'eau. Je respire lentement. » Le texte du plan fait 17 à 19 px, avec un interligne de 1.45 à 1.5.
- En bas : « + Noter un épisode ». Plus de bouton « Me ressourcer » sur cet écran.

## Interactions et comportement
- **Repli en pastille** : une rubrique se replie en pastille **quand on touche une autre rubrique** ou quand on quitte l'écran. Elle ne se replie pas à l'instant du choix, pour qu'une erreur reste corrigible tout de suite. La pastille rouvre la rubrique. Animation de 200 ms au plus (hauteur et opacité), supprimée avec `prefers-reduced-motion`. Prévois un interrupteur dans Réglages > Ma saisie > Le soir : « Replier les rubriques remplies ».
- **Changer de jour** : glisser horizontalement sur Aujourd'hui (seuil d'environ 60 px, vitesse prise en compte), ou utiliser ‹ ›. Pas de glissement vers le futur.
- **« Enregistré »** apparaît 1,5 s après chaque toucher. En cas d'échec d'écriture : « Enregistrement impossible pour l'instant, nouvel essai en cours. »
- « J'ai fini pour ce soir » replie toute la saisie en une carte « Soirée terminée ».
- Humeur du moment se ferme seule une fois l'humeur et l'énergie choisies. Épisode : une question par écran, puis retour sur Aujourd'hui avec un toast et « Annuler ».
- Pression : légère baisse d'opacité (0,85) ou `--surface-2`, en 150 ms. Pas d'effet au survol (tactile).
- Aucune mécanique d'engagement : ni série, ni score, ni badge, ni compteur de jours, ni pourcentage, ni félicitation. Les jours non saisis n'existent pas. Il n'y a pas de rouge.

## État
- `jour` affiché (date) et `seuilJour` (avant 4 h, c'est encore la veille : « Encore samedi jusqu'à 4 h. »).
- Par rubrique : valeur ou `null`, et `ouverte` (ouverte si elle est vide ou rouverte, sinon pastille).
- Humeurs du moment : liste `{heure, approx, humeur, energie, faisais}`, d'où l'humeur du jour (la moyenne).
- Thème : système, clair ou sombre. Réglage « Replier les rubriques remplies ».

## Fichiers du lot
- `tokens.css` : toutes les variables (couleurs clair et sombre, typographie, formes, espacements, durées, `@font-face`).
- `icons/*.svg` : 39 icônes au trait en `currentColor`, sans style codé en dur. Elles couvrent les rubriques, les replis, les onglets, les parcours, Mon plan, Questions, En consultation, En parler au rendez-vous, Aide iPhone et les 6 lieux.
- `references/Refonte Directions.dc.html` : la planche (section 2 = piste retenue).
- `references/Direction-2a.dc.html`, `Direction-2b.dc.html`, `Direction-2c.dc.html` : les 5 écrans de chaque variante (prop `ecran` : `aujourdhui`, `humeur`, `intensite`, `analyse`, `difficile`). Les thèmes y sont fournis par la planche via des variables courtes (`--bg`, `--sf`, `--sf2`, `--ln`, `--ink`, `--ink2`, `--act`, `--act-on`, et `--hum`, `--hum-f`, `--hum-o`, `--hum-t`, `--hum-t2`, `--hum-i`…). Elles correspondent à `tokens.css` : `sf` → `surface`, `ln` → `line`, `ink` → `text`, `-f` → `-fill`, `-o` → `-on`, `-t` → `-tint`, `-i` → `-text`. Abréviations : `som` sommeil, `con` contact, `spo` sport, `tra` traitement, `pos` positifs, `hum` humeur, `epi` épisode, `sym` symptôme, `dif` difficile, `ene` énergie, `exp` explosions.
- `references/Direction-A/B/C.dc.html` : l'ancienne piste, pour mémoire seulement.

## Points à valider avec l'utilisateur
1. Le choix entre 2a, 2b et 2c.
2. Les couleurs franches sur fond noir sont plus lumineuses que le « sombre doux » du prompt §5. Les textes passent AA, mais vérifie le confort de lecture le soir.
3. Le déplacement des rubriques remplies vers les pastilles peut gêner certaines personnes AuDHD, d'où l'interrupteur prévu.
