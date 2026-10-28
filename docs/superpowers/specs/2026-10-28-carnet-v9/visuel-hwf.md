# Spécification visuelle : écrans « quatre bulles » et « carte » de How We Feel, pour Carnet v9

Ce document décrit ce que montrent les captures 5 (choix du quadrant) et 4 (carte des mots), avec des mesures en points iOS, pour les refaire en CSS sans image ni police téléchargée. Les mots anglais cités ne sont que des repères de position sur la grille. Aucune définition de How We Feel n'est reprise : celles de Carnet restent à écrire.

---

## 0. Conventions et méthode

- **Échelle.** Les captures font 924 × 2000 px pour un écran de 390 × 844 pt, soit **1 px = 0,4221 pt** (le rapport est le même en largeur et en hauteur, donc pas de déformation). Dans Safari iOS, **1 px CSS = 1 pt** : toutes les valeurs « pt » ci-dessous s'écrivent directement en `px` dans le CSS.
- **Repère.** L'origine est le coin haut-gauche de l'écran. x va vers la droite, y vers le bas. Sur l'iPhone 13 Pro, la zone sûre fait 47 pt en haut et 34 pt en bas.
- **Mesures.** Les captures WebP ont été converties en BMP, puis j'ai lu les pixels avec Python. Les cercles sont ajustés par RANSAC, puis par moindres carrés, sur les pixels de contour. L'écart moyen entre contour et cercle ajusté est d'environ 0,2 px, soit moins de 0,1 pt. Les couleurs sont des moyennes de pixels prises dans des aplats, loin du texte et des bords.
- **Scripts et fichiers temporaires.** Ils sont dans `.superpowers/v9/tmp/` : `px.py` (lecture BMP), `fit.py`, `front.py` et `halo.py` (écran 5), `cc4.py`, `cc4fit2.py`, `bcol2.py`, `gaps.py`, `card.py` et `colfit.py` (écran 4), `fontm.py` (métriques de New York et SF lues dans `/System/Library/Fonts`). Les BMP et PNG de travail pèsent environ 30 Mo et peuvent être supprimés.

---

## 1. Écran 5 : « les quatre bulles »

### 1.1 Fond

- Fond de page **#000000**, noir pur, sans dégradé ni fondu.

### 1.2 Boutons ronds (fermer à gauche, loupe à droite)

| Mesure | Valeur |
|---|---|
| Forme | **capsule 48 × 44 pt**, `border-radius: 22pt` (plus proche d'une capsule que d'une ellipse ; les coins sont même un peu plus pleins, en « coin continu » iOS) |
| Position | haut à **47,3 pt** (juste sous la barre d'état), gauche à **16 pt** ; à droite, le bord droit est à **16 pt** du bord de l'écran ; le centre vertical est à **69 pt** |
| Fond sur noir | **#1b1b1b** |
| Liseré | 1 px clair (#303030 à #323232) au bord extérieur, puis une bande un peu plus sombre (#181818) d'environ 2 pt vers l'intérieur. C'est l'effet « verre » d'iOS. En CSS : `box-shadow: inset 0 0 0 0.5px rgba(255,255,255,.14), inset 0 0 3px rgba(0,0,0,.35)` |
| Icône croix | 18,6 × 19 pt, trait d'environ 1,5 pt, couleur #f2f2f2 (blanc à environ 95 %), extrémités arrondies |
| Icône loupe | 21 × 21,5 pt, trait d'environ 1,5 pt, même couleur |

### 1.3 Titre

| Mesure | Valeur |
|---|---|
| Couleur | **#ffffff** |
| Alignement | centré, avec un conteneur de 16 pt de marge de chaque côté (la 1re ligne mesure 357 pt et touche presque les marges) |
| Ligne de base de la 1re ligne | **147,5 pt** depuis le haut de l'écran ; le haut des majuscules est à 128,7 pt, le haut des ascendantes à 127,9 pt |
| Ligne de base de la 2e ligne | **179,2 pt**, soit un pas de ligne de **31,7 pt** |
| Hauteur des majuscules / hauteur d'x | 18,6 pt / 13,5 pt (rapport 0,73 : la police de How We Feel a un œil plus grand que New York, dont le rapport est 0,65) |
| Équivalent iOS | `font: 700 27px/32px ui-serif, Georgia, serif; letter-spacing: -0.01em;`. Le corps 27 pt est un compromis : la hauteur des majuscules donne 26,3 pt, celle des ascendantes 27 pt, et la largeur en Bold environ 26,5 pt |

### 1.4 Géométrie des quatre bulles

Chaque bulle se compose d'**un disque de face** (dégradé vertical, opaque) posé sur **trois ou quatre disques de halo** de même diamètre, décalés et translucides (voir 1.5).

**Disques de face :** ils forment une grille 2 × 2 parfaitement régulière, statique d'une capture à l'autre.

| Quadrant | Position | Centre (pt) | Bord gauche / haut (pt) |
|---|---|---|---|
| High Energy Unpleasant | haut-gauche | (111,6 ; 378,7) | 39,1 / 306,3 |
| High Energy Pleasant | haut-droite | (277,9 ; 378,5) | 205,5 / 306,1 |
| Low Energy Unpleasant | bas-gauche | (111,5 ; 545,2) | 39,1 / 472,8 |
| Low Energy Pleasant | bas-droite | (277,9 ; 545,5) | 205,5 / 473,1 |

- **Diamètre du disque de face : 145 pt** (343 px, rayon 72,4 pt). Il est identique pour les quatre bulles, à 0,3 pt près.
- **Pas entre centres : 166,4 pt** en horizontal, **166,7 pt** en vertical, donc une grille carrée.
- **Écart entre disques de face : environ 21,5 pt** dans les deux directions.
- **Centre du groupe : (194,7 ; 462,0) pt.** Il est centré horizontalement (l'écran a son milieu à 195) et descend de 40 pt sous le centre vertical de l'écran (422), soit 54,7 % de la hauteur.
- **Encombrement avec les halos :** de x ≈ 26 à 361 pt et de y ≈ 292 à 630 pt. Les halos de deux bulles voisines se touchent ou se chevauchent légèrement (rouge et jaune se recouvrent sur environ 6 pt).

### 1.5 Halo : « double contour » sans trait

Le « double contour » n'est **pas une bordure**. Ce sont **3 ou 4 copies du disque** (diamètre **146 pt**, soit 0,8 pt de plus que la face, ce qui est presque égal), remplies de la **couleur médiane de la bulle** (la couleur du dégradé à 50 %) avec une **opacité de 0,80**, et décalées dans des directions différentes. Sur le noir :

- là où une seule copie dépasse : couleur médiane × 0,80, la teinte « bord sombre » ;
- là où deux copies se superposent : couleur médiane × 0,96, une teinte plus claire en croissant ;
- là où trois se superposent : × 0,992, ce qui ne se distingue presque plus de la face.

| Bulle | Couleur médiane | 1 couche, mesurée (bord) | 2 couches, mesurée |
|---|---|---|---|
| Rouge | #fe4c40 | **#cb3d32** | #f54a3d |
| Jaune | #ffd04c | **#cca63c** | #f4c747 |
| Bleu | #789fff | **#617fcc** | #7497f4 |
| Vert | #4ce39b | **#3cb57c** | #47d993 |

**Décalages mesurés des halos par rapport au centre du disque de face (pt, dx ; dy) :**

| Bulle | Halo 1 | Halo 2 | Halo 3 | Halo 4 (faible) |
|---|---|---|---|---|
| Rouge | (−13,0 ; −13,1) | (−10,5 ; +10,0) | (+13,2 ; −4,6) | (+4,1 ; +1,2) |
| Jaune | (−13,5 ; −13,5) | (+9,8 ; +2,8) | (−3,0 ; +2,2) | n'apparaît pas |
| Bleu | (−9,0 ; +8,8) | (+8,3 ; −10,7) | (+7,0 ; +8,8) | (−5,3 ; −5,4) |
| Vert | (+5,7 ; +11,3) | (+5,1 ; −11,2) | (−6,2 ; +5,7) | (−2,3 ; −2,9) |

Les décalages vont de 4 à 19 pt, avec une moyenne d'environ 12 pt, et l'arrangement change d'une bulle à l'autre. Pour Carnet, je recommande **3 halos par bulle sur une orbite de 12 pt** (voir § 4).

Il n'y a **ni ombre portée, ni flou, ni contour**. Le bord extérieur est seulement anticrénelé (environ 1 px).

### 1.6 Dégradés des disques de face

Les dégradés sont **verticaux** (couleur constante sur une même rangée), de haut en bas sur le diamètre, avec **trois arrêts** : 0 %, 50 % et 100 %. La pente change à 50 % : chaque moitié est linéaire.

| Bulle | 0 % (extrapolé) | 3 % mesuré | 25 % mesuré | **50 %** mesuré | 75 % mesuré | 97 % mesuré | 100 % (extrapolé) |
|---|---|---|---|---|---|---|---|
| Rouge | **#ff8040** | #ff7d40 | #ff6740 | **#fe4c40** | #fa424e | #f4385e | **#f3375f** |
| Jaune | **#f9e46d** | #f9e36b | #fada5c | **#ffd04c** | #ffc232 | #ffb41c | **#ffb219** |
| Bleu | **#87c3fa** | #86c1fa | #80b1fc | **#789fff** | #768fff | #7181ff | **#717fff** |
| Vert | **#8bf0a4** | #87efa3 | #6cea9f | **#4ce39b** | #46d691 | #41c986 | **#40c785** |

```css
background: linear-gradient(180deg, #ff8040 0%, #fe4c40 50%, #f3375f 100%); /* rouge */
```

### 1.7 Libellés des bulles

| Mesure | Valeur |
|---|---|
| Couleur | **#000000** (noir opaque) |
| Disposition | 2 lignes centrées (« High Energy » / « Unpleasant ») ; le bloc est centré sur le disque de face (centre optique 1,8 pt plus bas, sans conséquence) |
| Ligne de base 1 / 2 (bulles du haut) | 375,4 pt / 394,4 pt, soit un **pas de ligne de 19,0 pt** |
| Majuscules / hauteur d'x / ascendantes | 11,0 pt / 8,4 pt / 12,2 pt |
| Largeurs mesurées (pour caler sur l'iPhone) | « High Energy » **86,5 pt**, « Unpleasant » 79,8 pt, « Low Energy » 82,3 pt, « Pleasant » 58,7 pt |
| Équivalent iOS | `font: 700 16.5px/19px ui-serif, Georgia, serif; letter-spacing: -0.01em;` (16 à 17 pt ; la hauteur des majuscules donne 15,6 pt, les ascendantes 17 pt, la largeur environ 16,5 pt) |
| Largeur utile | au plus environ 110 pt (76 % du disque), retour à la ligne autorisé |

### 1.8 Ordre d'empilement

L'ordre des éléments est rouge, jaune, bleu, vert, et chaque bulle se dessine au-dessus des précédentes : le halo jaune passe sur le halo rouge (mesuré : #f5b345 = jaune à 80 % sur #cb3d32). Dans une bulle, les halos sont en dessous et la face au-dessus.

### 1.9 Esquisse CSS (écran 5)

```css
.quadrants { position: absolute; left: 0; right: 0; top: 0; height: 844px; }
.bulle { position: absolute; width: 145px; height: 145px; }
.bulle .halo {
  position: absolute; inset: -0.4px; border-radius: 50%;
  background: var(--mediane); opacity: .8;
  transform: translate(var(--dx), var(--dy));
}
.bulle .face {
  position: absolute; inset: 0; border-radius: 50%;
  background: linear-gradient(180deg, var(--haut) 0%, var(--mediane) 50%, var(--bas) 100%);
  display: grid; place-items: center; text-align: center;
  color: #000; font: 700 16.5px/19px ui-serif, Georgia, serif; letter-spacing: -0.01em;
}
/* rouge : left 39.1px, top 306.3px ; jaune : left 205.5px ; bas : top 472.9px */
```

---

## 2. Écran 4 : la carte des mots

### 2.1 Vue d'ensemble

- Fond **#000000**. Les bulles sont des **disques pleins à couleur unie** (aucun dégradé dans une bulle, aucun trait, aucune ombre). Les espaces entre elles sont noirs.
- Le mot choisi (« Calm ») est **exactement au centre de l'écran** : (194,8 ; 421,9) pt pour un milieu d'écran à (195 ; 422). La carte se recentre donc sur le mot choisi.
- Les bulles sont coupées par les bords de l'écran : la carte est plus grande que l'écran et se fait défiler.
- Par-dessus : un fondu noir en haut (§ 2.7), les deux boutons en verre (§ 2.9) et la carte du bas (§ 2.8).

### 2.2 Disposition : grille carrée et « lentille » autour du mot choisi

Une **grille carrée** (lignes et colonnes), et non hexagonale. La preuve : la capture est symétrique par rapport aux deux axes **et aux deux diagonales** (x ↔ y). Par exemple, « Tense » est à (−100,3 ; −222,2) et la bulle coupée à sa diagonale est à (−222,6 ; −100,3) ; « Pleased » à (0 ; −142,1) et « Bored » à (−142,1 ; 0) ; « Uneasy » à (−117,1 ; −117,0). Les rangées ne sont donc **pas** décalées en quinconce. Elles paraissent courbées parce que le mot choisi, agrandi, repousse ses voisins (effet de lentille).

L'axe horizontal va de déplaisant (à gauche) à plaisant (à droite) ; l'axe vertical, d'énergie haute (en haut) à énergie basse (en bas). « Calm » occupe la case du quadrant vert la plus proche du centre de la carte (case (0,0) ci-dessous).

**Position des centres par rapport au mot choisi, en pt** (i = colonne, positive à droite ; j = rangée, positive en bas). La table est symétrique : (i, j) → (±x, ±y), et (j, i) s'obtient en échangeant x et y.

| (i, j) | Mot (repère) | Centre relatif (pt) | Diamètre |
|---|---|---|---|
| (0, 0) | Calm (choisi) | (0 ; 0) | **double capsule 156 × 156** |
| (0, −1) / (0, 1) | Pleased / Good | (0 ; ∓142,1) | **120** |
| (−1, 0) / (1, 0) | Bored / At Ease | (∓142,1 ; 0) | **120** |
| (±1, ±1) | Uneasy, Playful, Tired, Thoughtful | (±117,1 ; ±117,1) | **108** |
| (0, ±2) | Pleasant / Relaxed | (0 ; ±260,3) | **108** |
| (±2, 0) | hors écran | (±260,3 ; 0), déduit par symétrie | 108 |
| (±1, ±2) | Tense, Focused, Fatigued, Chill | (±100,3 ; ±222,3) | 96 |
| (±2, ±1) | coupées au bord | (±222,6 ; ±100,3) | 96 |
| (±2, ±2) | coupées au bord | (±202,4 ; ±202,4) | 96 |
| (0, ±3) | Cheerful / sous la carte du bas | (0 ; ±366,5) | 96 |
| (±1, ±3) | Confused, Curious (en haut) | (±95,1 ; ±328,8) | 96 |
| (±2, ±3) | coupées au bord | (±192,2 ; ±308,3) | 96 |
| (±1, ±4) | coupées en haut et en bas | (±93,7 ; ±434,3) | 96 |
| (±2, ±4) | coupées aux coins | (±188,8 ; ±415,3) | 96 |
| (0, ±4) | hors écran | (0 ; ≈ ±472), extrapolé | 96 |

En positions écran : x = 195 + x_rel et y = 422 + y_rel.

**Lecture de la table :**
- Le long de l'axe vertical qui passe par le mot choisi, les bulles s'empilent avec **4 pt d'écart** : 78 (demi-hauteur du choisi) + 4 + 60 = 142 ; 142 + 60 + 4 + 54 = 260 ; 260 + 54 + 4 + 48 = 366. Il en va de même sur l'axe horizontal.
- Au loin, le pas se stabilise à **≈ 106 pt** le long d'une colonne (96 + 10 pt d'écart) et à **≈ 94 à 95 pt** d'une colonne à l'autre. Ce pas horizontal ne crée pas de chevauchement parce que les colonnes voisines restent décalées de 19 à 37 pt en hauteur par la lentille.
- **Écarts entre bords voisins :** 4 à 6 pt autour du mot choisi, 8 à 11 pt en périphérie, et jusqu'à 1,3 à 1,8 pt seulement aux coins haut et bas (la carte s'y resserre).

**Modèle simple pour Carnet** (approché, à 3 à 5 pt près près du centre) :
1. grille carrée de mots, mot choisi centré à l'écran ;
2. diamètre selon la **distance de Manhattan** d = |i| + |j| au mot choisi : d = 0 → 156 (double capsule) ; d = 1 → **120** ; d = 2 → **108** ; d ≥ 3 → **96** ;
3. positions cumulées le long de chaque rangée et de chaque colonne, avec un écart de 4 pt près du centre qui passe à environ 10 pt au-delà de 2 cases. Pour reproduire exactement cette capture sur l'écran visible (i ∈ [−2, 2], j ∈ [−4, 4]), le plus simple est de **coder la table ci-dessus en dur** : elle ne dépend que de la position relative au mot choisi.

### 2.3 Tailles : pas de rétrécissement près des bords

**Mesure :** les bulles coupées par les bords de l'écran ont le même diamètre que les autres, **96 pt** (95,0 à 96,6 pt mesurés, contre 96,0 pt en plein écran). La carte **ne rétrécit pas les bulles vers les bords**. Ce qui change, c'est **l'agrandissement autour du mot choisi**, par **trois paliers nets** : 96 → 108 (× 1,125) → 120 (× 1,25), plus 156 pt pour le mot choisi.

Le libellé suit le même facteur que la bulle : sa hauteur d'ascendante vaut **0,22 × le diamètre** pour les trois tailles. Il suffit donc d'un modèle de bulle de 96 pt et d'un `transform: scale(1 | 1.125 | 1.25)`.

### 2.4 Le mot choisi : double capsule

- Ce n'est pas une pilule horizontale : ce sont **deux capsules verticales accolées**, chacune de **78 × 156 pt**, `border-radius: 39pt`, de la couleur de la bulle (**#95ffae** pour « Calm »). Leurs axes sont à 77,7 pt l'un de l'autre : elles se recouvrent d'environ 0,4 pt, ce qui ne laisse pas de jour.
- Encombrement total **156 × 156 pt**, centré sur l'écran.
- Il reste une **encoche noire en haut et en bas, au milieu**, profonde de **34 pt** (l'espace entre les deux bouts arrondis).
- Libellé centré, noir, **18 pt** (`700 18px ui-serif`), largeur mesurée de « Calm » : 38,8 pt.
- Écart au voisin : 4,1 pt avec Pleased, Good, Bored et At Ease.

```css
.choisi { position: absolute; width: 156px; height: 156px; display: flex; }
.choisi::before, .choisi::after {
  content: ""; flex: 0 0 78px; height: 156px; border-radius: 39px; background: var(--c);
}
.choisi::after { margin-left: -0.4px; }
.choisi > span { position: absolute; inset: 0; display: grid; place-items: center; }
```

### 2.5 Couleurs de la carte

**Mesures par bulle** (aplats ; les bulles du haut sont lues sous le fondu, voir 2.7) :

| Quadrant | (a, b) = (rang vers l'extérieur horizontal, rang vers l'extérieur vertical) → couleur |
|---|---|
| **Vert** (bas-droite, faible énergie et plaisant) | (0,0) Calm **#95ffae** · (1,0) At Ease #85ffa4 · (0,1) Good #77fcb4 · (1,1) Thoughtful #6bfca9 · (2,1) #61fb9e · (0,2) Relaxed #5af7bb · (1,2) Chill #50f7af · (2,2) #4af6a1 · (0,3) #3cf3c3 · (1,4) #1beeb7 · (2,4) #19eda5 |
| **Bleu** (bas-gauche, faible énergie et déplaisant) | (0,0) Bored **#80d5ff** · (0,1) Tired #65d2ff · (1,1) #64c3fe · (0,2) Fatigued #4dd1ff · (1,2) #4ac2fe · (1,3) #31bfff · (0,4) #1bcbff · (1,4) #19beff |
| **Jaune** (haut-droite, forte énergie et plaisant) | (0,0) Pleased **#f7e46d** · (1,0) Playful #fae863 · (2,0) #fbef5b · (0,1) Pleasant #f9d85f · (1,1) Focused #fbdc57 · (2,1) #fce24d · (1,2) Curious ≈ #f9cf47 · (2,2) #fdd23f |
| **Rouge** (haut-gauche, forte énergie et déplaisant) | (0,0) Uneasy **#ff8662** · (1,0) #ff7564 · (0,1) Tense #ff7959 · (1,1) #fd6b5d · (0,2) Confused ≈ #ff6b4f · (1,2) #fd5f52 |

**Règle : oui, plus on s'éloigne du centre, plus la couleur est profonde.** Les cases les plus proches du centre de la carte sont **pâles** ; chaque case vers l'extérieur gagne en saturation et s'assombrit, avec une dérive de teinte propre à chaque axe. Un modèle linéaire par quadrant, `couleur(a, b) = C00 + a·Δa + b·Δb` en RGB, reproduit les mesures à **5 niveaux près au plus** :

| Quadrant | C00 (coin intérieur, mesuré) | Δa par case (horizontal, vers l'extérieur) | Δb par case (vertical, vers l'extérieur) | Dérive |
|---|---|---|---|---|
| Vert | #95ffae | R −8,6 · G −0,5 · B −13,3 | R −26,7 · G −4,4 · B +4,7 | vers la droite : vert franc ; vers le bas : turquoise |
| Bleu | #80d5ff | R −2,4 · G −14,6 · B −0,6 | R −25,1 · G −2,2 · B +0,1 | vers la gauche : pervenche ; vers le bas : azur profond |
| Jaune | #f7e46d | R +1,9 · G +4,9 · B −9,0 | R +0,4 · G −13,4 · B −14,0 | vers la droite : citron ; vers le haut : or orangé |
| Rouge | #ff8662 | R −1,3 · G −14,3 · B +3,0 | R −0,5 · G −12,2 · B −9,2 | vers la gauche : rouge rosé ; vers le haut : rouge orangé |

**Bords et coins des zones** (pour une zone de 6 × 6 cases ; mesuré jusqu'au rang 2 à 4, **au-delà c'est extrapolé**) :

| Quadrant | Coin intérieur (0,0) | Centre de zone (2,5 ; 2,5) | Bord horizontal (5,0) | Bord vertical (0,5) | Coin extérieur (5,5) |
|---|---|---|---|---|---|
| Vert | #95ffae | #37f49c | #65fe6f | #0aeac9 | #00e887 |
| Bleu | #80d5ff | #3aabfe | #738cfc | #02caff | #0081fc |
| Jaune | #f7e46d | #fecf33 | #fffd40 | #faa227 | #ffba00 |
| Rouge | #ff8662 | #fb4252 | #f93d71 | #fd4834 | #f60043 |

Les couleurs médianes des bulles de l'écran 5 (#fe4c40, #ffd04c, #4ce39b) sont proches des « centres de zone » rouge, jaune et vert, ce qui confirme que la palette est cohérente. Pour le bleu, l'écran 5 tire vers la pervenche (#789fff → #717fff), la même dérive que l'axe horizontal de la carte (#738cfc). Je conseille de **brider l'extrapolation** (diviser les pas par deux au-delà du rang 3) plutôt que de laisser aller jusqu'à #00e887 ou #f60043.

### 2.6 Texte des bulles de la carte

| Taille de bulle | Corps conseillé (ui-serif 700) | Mesures |
|---|---|---|
| 96 pt | **12 pt** | « Tense » : majuscule 8,0 pt, largeur 30,8 pt ; « Focused » : 42,6 pt ; « Fatigued » : 44,3 pt |
| 108 pt | 13,5 pt (soit scale 1,125) | « Pleasant » : 49,4 pt ; « Thoughtful » : 67,1 pt |
| 120 pt | 15 pt (soit scale 1,25) | « Pleased » : 49 pt ; « Good » : 34,6 pt |
| choisi 156 pt | 18 pt | « Calm » : 38,8 pt |

- La règle se résume à : **corps = diamètre / 8**.
- Couleur **#000000**, une ligne, centré. L'interligne d'un libellé sur deux lignes n'est pas visible sur la capture : je propose 1,15.
- Largeur utile d'environ 80 % du diamètre (77 pt pour une bulle de 96). Les mots français longs passeront sur deux lignes.

### 2.7 Fondu noir en haut

Un voile noir couvre le haut de la carte, sous les boutons, pour la lisibilité de la barre d'état. Opacité mesurée (rapport entre une couleur voilée et la même couleur sans voile) :

| y (pt) | 13 à 39 | 51 | 59 | 68 | 76 | 84 | 93 | 101 | 110 | 118 | 127 | ≥ 131 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opacité du noir | **0,60** | 0,55 | 0,50 | 0,44 | 0,35 | 0,28 | 0,21 | 0,12 | 0,075 | 0,04 | 0,01 | 0 |

```css
.carte-fondu { position: absolute; inset: 0 0 auto 0; height: 130px; pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,.6) 0, rgba(0,0,0,.6) 40px, rgba(0,0,0,.44) 67px,
    rgba(0,0,0,.28) 84px, rgba(0,0,0,.12) 101px, rgba(0,0,0,.04) 118px, rgba(0,0,0,0) 130px); }
```

Il n'y a **pas de fondu en bas**. Seule l'ombre de la carte du bas assombrit les bulles qui la touchent.

### 2.8 Carte du bas (mot et définition)

| Mesure | Valeur |
|---|---|
| Forme | **capsule 364,6 × 99,6 pt**, soit **365 × 100**, `border-radius: 50pt` (rayon égal à la demi-hauteur, vérifié sur le contour) |
| Position | gauche et droite à **12,7 pt** du bord ; haut à 702,3 pt, bas à 802 pt, soit **42 pt au-dessus du bas de l'écran** (34 pt de zone sûre + 8 pt) |
| Fond | **#2c2c2e** (le gris système « tertiaire » sombre d'iOS), opaque |
| Ombre | assombrit la bulle d'environ 26 % juste sous la carte, puis s'efface sur environ 20 pt ; environ 18 % au-dessus. En CSS : `box-shadow: 0 3px 16px rgba(0,0,0,.5)` |
| Mot (« Calm ») | **couleur de la bulle choisie** (mesurée #a1fcb6 pour une bulle #95ffae ; prendre la couleur de la bulle), **SF Pro, normal, 17 pt** (majuscule 12,2 pt) ; ligne de base à 739,5 pt |
| Définition | **#ffffff**, SF Pro, normal, **17 pt**, 2 lignes au plus ; lignes de base à 757,8 et 775,9 pt |
| Pas de ligne | **18,3 pt** entre le mot et la 1re ligne, puis 18,1 pt (`line-height: 18.3px`, très serré) |
| Marge gauche du texte | 52,9 pt depuis l'écran, soit **40,2 pt depuis le bord de la carte** |
| Bloc de texte | centré verticalement dans la carte ; largeur au plus d'environ 221 pt (s'arrête environ 16 pt avant le rond blanc) |
| Rond blanc | **Ø 76 pt**, **#ffffff**, centre à (328,4 ; 751,3) pt ; retrait de **11 à 12 pt** à droite, en haut et en bas (centré verticalement) |
| Flèche | « → » **noire #000**, 29,5 × 28 pt, trait **2,7 pt**, bouts arrondis, centrée dans le rond |

```css
.fiche { position: absolute; left: 12.7px; right: 12.7px; bottom: calc(env(safe-area-inset-bottom) + 8px);
  height: 100px; border-radius: 50px; background: #2c2c2e; box-shadow: 0 3px 16px rgba(0,0,0,.5);
  display: flex; align-items: center; padding: 0 12px 0 40px; gap: 16px; }
.fiche .mot, .fiche .def { font: 400 17px/18.3px system-ui, -apple-system, sans-serif; }
.fiche .mot { color: var(--c); }
.fiche .def { color: #fff; }
.fiche .aller { margin-left: auto; flex: 0 0 76px; height: 76px; border-radius: 50%; background: #fff; }
```

### 2.9 Boutons du haut (retour, loupe)

- Même capsule de **48 × 44 pt** aux mêmes positions que sur l'écran 5 (haut 47,3 pt, marges 16 pt).
- Au-dessus des couleurs, le fond prend leur teinte : #2c2120 sur du rouge voilé, #25231f sur du jaune voilé. C'est un **verre sombre translucide et flouté**. Équivalent : `background: rgba(32,32,32,.85); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);`, avec le même liseré qu'au § 1.2 ; sur noir, on retrouve #1b1b1b.
- Flèche retour : 21 × 21 pt, trait d'environ 1,5 pt, blanc à environ 95 % (#fbf2f0 mesuré, teinté par le fond).

---

## 3. Typographie (récapitulatif)

| Usage | How We Feel | Équivalent Carnet (sans police téléchargée) |
|---|---|---|
| Titres et libellés des bulles | serif grasse, œil large, approche serrée | `ui-serif` (New York) **700**, `letter-spacing: -0.01em`, repli `Georgia, serif` pour Chromium et Playwright |
| Titre de l'écran 5 | 27 pt, pas de ligne 31,7 | `700 27px/32px ui-serif` |
| Libellés de l'écran 5 | ≈ 16,5 pt, pas de ligne 19 | `700 16.5px/19px ui-serif` |
| Libellés de la carte | Ø / 8 : 12 / 13,5 / 15 / 18 pt | modèle de 12 pt et `transform: scale()` |
| Texte de la carte du bas | sans empattements, 17 pt, normal | `400 17px/18.3px system-ui` (SF Pro) |

Métriques de New York lues dans le fichier système : majuscules 0,705 em, hauteur d'x 0,458 em, ascendantes 0,72 em, axes `opsz` 12 à 256 et `wght` 400 à 1000. La police de How We Feel a une hauteur d'x plus grande (0,77 de la hauteur des majuscules, contre 0,65 pour New York). À corps égal, New York paraît donc un peu plus petite en minuscules : les corps ci-dessus sont un compromis entre hauteur des majuscules et largeur des mots. Pour caler sur l'iPhone, il faut viser les **largeurs mesurées** (« High Energy » = 86,5 pt, « Pleased » à 120 pt = 49 pt).

---

## 4. Mouvement (déduit) et mouvement réduit

Une capture est figée : ce qui suit est **déduit**, pas observé.

**Écran 5**
- Les disques de face sont sur une grille exacte, à 0,3 pt près, et le texte y est centré : **ils ne bougent pas**.
- Les halos ont des décalages tous différents d'une bulle à l'autre (4 à 19 pt, directions variées) : c'est la signature d'une **animation de « respiration » ou d'orbite lente**, chaque halo tournant autour du centre avec sa propre phase.
- Proposition : 3 halos par bulle, orbite de rayon **12 pt**, `rotate(θ) translateX(12px)`, durées de 7, 9,5 et 12 s, linéaire, en boucle, avec un `animation-delay` négatif différent par bulle.
- Une apparition (montée en échelle des bulles) est probable mais invisible sur la capture. Au toucher, on peut supposer un léger enfoncement (`scale(.96)`).

**Écran 4**
- Choisir un mot recentre la carte (le mot choisi est au centre exact), fait passer les voisins à 120 et 108 pt (les paliers se prêtent à une transition d'échelle), transforme la bulle choisie en double capsule (morphing probable du cercle vers les deux capsules) et fait monter la carte du bas.
- La carte se fait glisser au doigt : bulles coupées aux bords, fondu haut fixe.

**Avec « Réduire les animations » (`@media (prefers-reduced-motion: reduce)`)**, il faut figer :
- les halos (`animation: none`), à des décalages fixes, par exemple ceux du § 1.5 ;
- le recentrage : saut direct, sans défilement animé ni ressort ;
- les changements d'échelle et le morphing : état final immédiat, ou un fondu d'opacité de 150 ms au plus ;
- l'arrivée de la carte du bas : apparition sans glissement.

Le fondu haut et les ombres, qui sont statiques, restent.

---

## 5. Style général (écrans 6, 1, 2 et 3, pour plus tard)

- Fond noir pur partout. Surfaces sombres : #111111 (ronds des jours), #181818 (barre d'onglets en capsule), #3a3a3a (onglet actif), #2c2c2e (carte du bas). Texte secondaire gris **#909090**, y compris le sous-titre en serif italique de « Breathing ».
- Grands titres en serif grasse (« How are you feeling this morning? », pas de ligne d'environ 34 pt ; « Tools », « Breathing »), petits textes en SF Pro.
- Tuiles d'outils : grands carrés aux coins continus très arrondis, aplats sombres (#0c2e57 pour « Breathing ») avec motifs de lignes discrets.
- Bouton « Check in » : rond blanc d'environ 48 pt avec un « + » noir.
- **À ne pas reprendre dans Carnet :** la pastille « 0 DAY STREAK » de l'écran 6, contraire à la règle « aucune série, aucun compteur de jours » du CLAUDE.md. Les ronds des jours de la semaine affichent aussi la présence ou l'absence de saisie : à proscrire (« silence total sur les jours non saisis »).

---

## 6. Doutes et points à vérifier sur l'iPhone

1. **Police.** New York n'est pas la serif de How We Feel (hauteur d'x plus petite). Les corps proposés sont des compromis ; il faut les ajuster sur l'appareil d'après les largeurs mesurées.
2. **Animation des halos.** Elle est déduite de l'irrégularité des décalages, pas observée. Amplitude, période et sens sont des propositions.
3. **Double capsule du mot choisi.** Est-ce l'état final ou une image prise en plein morphing ? Une seule capture ne permet pas de trancher. Les mesures sont exactes pour cette image.
4. **Lentille de la carte.** La table est exacte pour la zone visible (i ∈ [−2, 2], j ∈ [−4, 4]). Le pas lointain (106 pt en vertical contre 95 pt en horizontal) n'est pas parfaitement cohérent : la carte était peut-être encore en mouvement, ou la lentille comprime en travers. Les cases (0, ±4) et (±3, ·) sont extrapolées.
5. **Couleurs des bords et coins extérieurs des zones.** Ils ne sont pas visibles sur la capture, donc extrapolés linéairement : il faut les brider (voir § 2.5).
6. **Recentrage automatique sur le mot choisi.** Il est déduit de la position exacte de « Calm » au centre de l'écran. Il reste à décider ce qu'on montre avant tout choix (carte centrée sur le quadrant touché à l'écran 5 ?).
7. **Verre des boutons.** L'opacité (0,85) et le flou (16 px) sont estimés à partir de deux fonds seulement.
8. **Bulles partiellement cachées par la carte du bas ou par les boutons.** Leurs mesures sont moins sûres (n'ont pas servi aux règles).
