# Emozio v12 : la musique de Détente et un design simple (conception)

Date : 09/11/2026. Version visée : 12.0.0. Format de sauvegarde 9. `DB_VERSION` reste à 6.

Repérages, non suivis par git, dans `.superpowers/v12/` :
- `reperage-design.md` : inventaire des couleurs et des composants, plan de passage, calculs de contraste ;
- `reperage-musique.md` : fonctionnement de Mes refuges et de Spotify, changements, tests ;
- `maquettes/` : la « proposition finale » validée.
  - Aperçus : `aujourdhui.png`, `aujourdhui-sombre.png`, `emotion-carte.png`, `emotion-mots.png`, `bien-etre.png`, `avant-apres.png`, `accents.png`.
  - Générateur `build.mjs`, avec toutes les valeurs de la maquette, et le brief `brief-final.md`.
  - Les mêmes maquettes sont dans le canevas Claude Design https://claude.ai/artifact/8LxfvycrASm2ps4kDDNCNT, page « Proposition finale ».

**La maquette est en violet, et la spec l'emporte sur elle en deux points :** l'accent est le vert « B » du §5.3, et les écrans de l'émotion restent sans accent (§5.6).

## 1. Intention

Deux retours d'usage après la v11.

**La musique.** Il veut écouter sa playlist « Détente » d'un toucher. Aujourd'hui, toucher la carte n'ouvre rien. Il veut aussi voir les morceaux de la playlist et lancer celui qu'il choisit.

**Le design.** Il trouve l'app froide, avec « trop de couleurs » sans unité, ni entre elles ni avec la carte des émotions. Après avoir écarté dix pistes créatives, il a choisi une proposition simple et épurée, façon apps d'Apple. Une seule couleur d'accent, le vert iPhone, sert à tout. Les quatre couleurs des zones ne servent plus qu'aux émotions.

**C'est réussi si :**
- un soir difficile, il ouvre Mes refuges ou Moment difficile, touche « Détente » ou un morceau, et Spotify s'ouvre dessus ;
- en ouvrant Aujourd'hui, il voit une page calme et unie : rubriques sans couleur propre, choix faits en vert avec leur coche, couleurs réservées à ses émotions ;
- le soir se remplit aussi vite qu'en v11, et rien n'a changé de place ni de fonctionnement.

**C'est raté, même si tout marche, si :**
- une couleur se met à dire « bien » ou « mal » ;
- un choix fait se confond avec une émotion de la zone verte ;
- le soir défile nettement plus qu'avant ;
- Mes refuges redevient un formulaire.

## 2. Décisions de l'utilisateur (08 et 09/11)

### Retours d'origine
- « Jouer les musiques dans application. Uniquement playlist « Détente ». J'ai du mal à comprendre comment ça marche. Je voulais juste pouvoir cliquer sur les musiques et que ça joue dessus. Ou que ça envoie directement sur la bonne playlist de Spotify. Sinon la connexion fonctionne, c'est déjà un bon point. »
- « Design général à bosser. »
- « L'interface de base journalière. Ça fait froid et il n'y a pas de cohérence avec les couleurs. Pas de cohérence avec la map des émotions non plus. »

### Musique
- **Le lien.** Toucher la carte Détente n'ouvre rien. Au Diagnostic, « Ouvrir une playlist », seul « Lien direct vers l'app » (`spotify:playlist:ID`) ouvre Spotify sur son iPhone ; « Lien web » et « Lien web, nouvelle fenêtre » ne font rien. Il a refusé une 11.0.1 : la correction attend la v12.
- **Ce qu'il veut.** Il a choisi « Voir les morceaux ». La proposition est acceptée telle quelle (« Oui, ça me va ») :
  - Mes refuges devient une simple liste ;
  - en haut, « Détente » ouvre la playlist dans Spotify ;
  - en dessous, ses morceaux, et un toucher sur l'un d'eux ouvre Spotify dessus ;
  - la liste est lue une fois à la connexion, avec « Mettre à jour la liste » ;
  - les réglages passent dans un coin discret ;
  - la même liste apparaît dans Moment difficile.
- **Son compte.** Il a Spotify **Premium**. Il n'utilise qu'une playlist, « Détente ».

### Design
- Il a écarté le premier tour de six pistes, le second tour de trois, et les couleurs chaudes : « Oublie l'histoire des couleurs chaudes. Je veux quelque chose de simple et épuré et facile d'utilisation. »
- Ses réponses :
  - ce qui gêne : « Trop de couleurs » ;
  - « Je suis très visuel dans mon fonctionnement, donc un peu de couleurs c'est possible, mais je veux une unité. Regarde ce qu'il se fait en exemple (application Uber, AppStore…) » ;
  - modèle : « Les apps d'Apple » ;
  - rubriques du soir utilisées : « tout ». **Rien n'est replié ni caché.**
- **La proposition finale :** « Oui, on part là-dessus. »
- **L'accent :** « Vert iPhone », puis le rendu **B** parmi trois : vert profond avec texte blanc en clair, vert iPhone avec texte noir en sombre.

### Autres
- **La confiance et l'estime de soi : annulées.** « On annule la confiance finalement. »
- **L'icône v11 :** réglée chez lui. Safari gardait l'ancienne version ; il a fallu toucher « Nouvelle version prête » avant « Sur l'écran d'accueil ».

## 3. Hors périmètre

- La confiance et l'estime de soi.
- Jouer la musique dans Emozio, et commander Spotify à distance : il faudrait garder un jeton, et Spotify en arrière-plan sur iPhone n'est pas fiable.
- Les pochettes : `img-src` reste `'self'`.
- Les pistes créatives écartées : ciel, bulles, cadrans, serif éditorial, tons chauds.
- Un réglage de couleur d'accent dans l'app : décision B2, l'app suit le thème du système.
- L'export PDF et la page A4, qui gardent leur palette claire (décision B3).
- Tout ce qui touche à une commercialisation : recherche faite le 09/11, rien n'est retenu pour la v12.
- Les points ouverts depuis la v10 : le ▶ d'un favori, l'épingle du Programme, le très grand texte des écrans hérités.

## 4. Règles qui restent

Elles valent pour toute la v12 :
- un toucher enregistre, jamais de bouton « Enregistrer » ; tout est facultatif ;
- ni série, ni score, ni badge, ni félicitation, ni compteur ;
- aucun avis clinique ;
- zéro réseau venant d'Emozio, sauf la connexion à Spotify (§6.4), sans nouvel hôte dans la CSP ;
- `domain/`, `analyse/`, `db/` et `export/` restent purs ;
- aucun prénom ni donnée réelle, ni dans le code, ni dans les tests, ni dans les docs. **Le dépôt est public** depuis le 09/11, par choix de l'utilisateur ;
- `tests/aides/mots-interdits.js` s'applique aux nouveaux textes ;
- le nom interne reste `carnet` : base, `FORMAT`, cache, clés.

Les textes nouveaux sont des propositions, à relire par l'utilisateur après la publication.

## 5. Le design

### 5.1 Ce qu'il voit

**La structure ne change pas :** mêmes écrans, mêmes rubriques dans le même ordre, mêmes interactions.

**Ce qui change :**
1. **La base est neutre, comme iOS.**
   - En clair, un fond gris très pâle et des cartes blanches.
   - En sombre, un fond noir et des cartes gris foncé.
   - Ni crème ni dégradé.
2. **L'en-tête d'Aujourd'hui est façon App Store.**
   - Un sur-titre en petites capitales grises (« LUNDI 9 NOVEMBRE ⌄ », qui ouvre le choix de date), au-dessus d'un grand titre en gras (« Aujourd'hui »).
   - Les flèches jour d'avant et jour d'après sont dans des ronds neutres.
3. **Les rubriques n'ont plus de couleur à elles.** L'icône d'une rubrique est grise, sans carré coloré.
4. **Une seule couleur d'accent, le vert (§5.3).** Elle marque :
   - un choix fait, en aplat avec sa coche ✓ ;
   - le bouton principal ;
   - l'onglet actif ;
   - les liens et les icônes qui ouvrent quelque chose.
5. **Les quatre couleurs des zones ne servent qu'aux émotions** (§5.6).
6. **La bande du bas :** « Émotion » est le seul bouton en aplat d'accent. « Moment difficile » et « + Épisode » deviennent neutres, avec un contour. Aujourd'hui, « + Épisode » est noir.
7. **La barre d'onglets :** l'onglet actif est en vert, avec son icône pleine.

### 5.2 Les jetons (`public/css/tokens.css`)

| Jeton | Clair | Sombre | Rôle |
|---|---|---|---|
| `--bg` | #F2F2F7 | #000000 | fond |
| `--surface` | #FFFFFF | #1C1C1E | cartes |
| `--surface-2` | #EEEEF0 | #2C2C2E | remplissages discrets, jamais un choix |
| `--barre` (nouveau) | #F9F9F9 | #161618 | bande du bas et onglets |
| `--line` | #C6C6C8 | #38383A | filets décoratifs (0,5 px) |
| `--contour` (nouveau) | #86868B | #7C7C80 | choix non faits, champs, roues : ≥ 3:1 sur fond, carte et `--surface-2` |
| `--text` | #000000 | #FFFFFF | |
| `--text-2` | #6C6C70 | #98989F | AA sur le fond, la carte et `--surface-2` |
| `--desactive` | #C7C7CC | #48484A | |
| `--accent`, `--sur-accent`, `--accent-texte` | §5.3 | §5.3 | |
| `--action`, `--action-on` | `var(--accent)`, `var(--sur-accent)` | idem | alias gardés : leurs 36 usages basculent sans être touchés |
| `--fond-choix` | `transparent` | idem | le contour passe par `box-shadow: inset 0 0 0 1px var(--contour)` |
| `--donnee`, `--donnee-1..3` (nouveaux) | encre des graphiques (§5.5) | | valeurs dans `reperage-design.md` §2.1, à vérifier |

**Les formes :**
- rayon des cartes 16 (aujourd'hui 14) ;
- marge 16 ;
- grand titre 34/41 en 700 ;
- titre de section 22/28 en 700 ;
- sur-titre 13 px, 600, en capitales, interlettrage 0,04 em ;
- libellé d'onglet 10 px.

**À supprimer :**
- les 12 couleurs de rubrique du lot 2b : lieu, sommeil, contact, sport, traitement, positifs, humeur, épisode, symptôme, difficile, énergie, explosions ;
- `--chart-sommeil-*` ;
- les sélecteurs `.teinte-*` des rubriques ;
- `--r-icone`.

**À garder tels quels :**
- `--c-emo-*` et `.emo-*` ;
- `--c-zone-*` et `.zone-*` ;
- `--danger`, rouge comme sur iOS pour ce qui détruit.

**À mettre à jour :**
- `--moment-*` en clair : texte #000, voile `242, 242, 247`.
- `.ecran-noir` et `.parcours.ecran-noir` écrasent aussi `--accent*` : la nuit ne s'éclaire jamais en vert.
- `theme-color` dans `index.html` et `manifest.webmanifest` : #F2F2F7 en clair, #000000 en sombre.

### 5.3 L'accent, le rendu B

| Rôle | Clair | Sombre |
|---|---|---|
| `--accent` (aplat) | **#1C7D36** | **#30D158** |
| `--sur-accent` (texte et coche sur l'aplat) | **#FFFFFF** (5,20:1) | **#000000** (10,39:1) |
| `--accent-texte` (liens, icônes qui ouvrent, onglet actif) | **#1C7D36** (4,66:1 sur #F2F2F7, 5,20:1 sur la carte, 4,94:1 sur la barre) | **#30D158** (8,42:1 sur #1C1C1E, 6,89:1 sur #2C2C2E) |

**Contrôles à faire :** les contrastes sont à recalculer dans `jetons.test.js`. Un lien vert clair sur `--surface-2` donne environ 4,48:1, **sous 4,5**. Un lien ne se pose donc jamais sur `--surface-2`, ou il prend une variante plus foncée vérifiée.

**Pour qu'un choix fait ne se confonde jamais avec la zone verte**, le vert sombre #30D158 étant proche de la menthe des zones (ΔE OKLab ≈ 0,07) :
1. **La forme.** L'accent n'est jamais un rond ni un point : ronds et bulles appartiennent aux émotions. Un choix fait est un rectangle arrondi (rayon 12), avec son texte et sa coche ✓.
   - **Repères d'étapes des parcours** (points de 9 px) : faits et en cours à l'encre (`--text`), l'étape en cours avec un anneau `--contour`. Jamais en vert : ce serait un point vert, et un « fait » vert.
   - **Cercle et disque de la respiration** : neutres (`--text-2`, `--contour`). La règle `border: 2px solid var(--action)` d'`ecrans.css` (vers la l. 1066) est remplacée.
   - **Bouton rond avec une icône** (▶ du lecteur, flèche « Continuer » hors des écrans de l'émotion) : il peut porter l'accent. L'icône dit que c'est une commande, pas une émotion.
   - **Curseur de volume** : la partie remplie est en accent, le bouton en blanc, comme sur iOS.
   - **Un test garde la règle** : aucun élément rond sans texte ni icône (`border-radius` ≥ 50 %, ou point de moins de 16 px) n'a `--accent` pour fond ou pour contour.
2. **Les lieux.** Aucun accent sur les écrans de l'émotion (§5.6) ni dans les graphiques (§5.5).
3. **Le sens.** L'accent veut dire « choisi » ou « agir », jamais « fait », « réussi » ou « bien ». Les questions abordées de Soins et « Faite le… » du Programme sont en encre, pas en vert.

### 5.4 Les composants

- **En-tête** (`entete-jour.js`, `ecrans.css`).
  - Sur-titre et grand titre comme au §5.1. Un autre jour que celui en cours a pour grand titre le jour de la semaine et le quantième (« Mercredi 14 »), et pour sur-titre le mois.
  - **Le nom accessible ne change pas** : « Aujourd'hui, Lundi 9 novembre » ou « Mercredi 14 octobre ». C'est l'ordre du DOM qui le garantit, voir `reperage-design.md` §2.3.
  - En très grand texte, le grand titre est plafonné, par exemple à `min(2rem, 48px)`.
- **Cartes du soir.**
  - Rayon 16, sans carré coloré.
  - `TeteRubrique` : icône de 20 en `--text-2`, et `.carre-rubrique` disparaît.
- **Choix** (`.pastille`, `.segmente button`).
  - Non fait : transparent, contour, texte en `--text` 400.
  - Fait : aplat `--accent`, texte `--sur-accent` 600, **coche ✓ gardée** (règle « jamais la couleur seule »).
  - Rien ne change de taille : le rebond `scale(1.07)` de `.etape .pastille[aria-pressed]` est retiré.
- **Roues.**
  - Piste en `--piste` avec contour, fenêtre en `--fenetre`.
  - Quand une valeur est notée, la fenêtre passe en `--accent` et la valeur en `--sur-accent` 600.
  - Les bords en fondu montrent que la bande glisse.
- **Champs.** Transparents avec contour. Au focus, un anneau d'accent. Le micro est en `--accent-texte`.
- **Listes et replis.**
  - Plus de carrés colorés.
  - L'icône est en accent quand la rangée ouvre quelque chose (replis, Réglages, Bien-être, portes, Mes refuges), en `--text-2` quand elle nomme une rubrique.
  - Chevron en `--contour`, filet de 0,5 px.
- **Bande du bas.**
  - Fond `--barre`, filet en haut.
  - « Émotion » en aplat d'accent, les deux autres neutres (surface et contour), le même corps de texte pour les trois.
  - Un jour passé n'a pas de bouton Émotion, donc pas d'aplat.
- **Barre d'onglets.**
  - Fond `--barre`.
  - Onglet actif en `--accent-texte`, avec une icône pleine et un libellé en 600, sans pilule.
  - Les 5 icônes pleines s'ajoutent à `icones.js`.
- **Ma journée.** Titre en 22/28, 700. Les épisodes deviennent neutres : un petit carré `--text-2`. Les relevés gardent le point de leur zone.
- **Parcours** (épisode, symptôme, Après coup, consultation).
  - `.point-teinte` est retiré.
  - Repères faits et en cours à l'encre, jamais en vert (§5.3).
  - Valeurs en `--text` 600.
  - « Après coup » neutre, avec son texte en accent.
- **Analyse.** Les portes ont leur icône en accent. Les tuiles n'ont plus de point coloré et leur valeur est en `--text`.
- **Bien-être.**
  - Une seule action en aplat par vue.
  - Les petits ▶ des favoris deviennent une icône d'accent sans fond.
  - Le lecteur, le souffle et l'épingle passent au système neutre plus l'accent.
- **Moment difficile.**
  - Les exercices courts sont neutres.
  - « Commencer » est le seul aplat.
  - Les morceaux sont au §6.6.
- **Réglages.**
  - Plus de carrés colorés.
  - Interrupteurs : rail en accent, bouton blanc comme sur iOS.
  - Les points de famille et de zone restent.
- **Historique.** Les puces de rubrique sont en `--text-2`. Les émotions gardent le point de leur zone.
- **Toast.** Inchangé.

**La page du soir ne doit pas défiler beaucoup plus qu'en v11.** La cible est **+120 px au plus**, à 390 × 844 et en texte par défaut. Si l'aération de la maquette dépasse cette cible, on resserre : par exemple des cartes en 12/14 et 10 px entre deux cartes.

### 5.5 Les graphiques

- **La couleur dit une émotion, et seulement une émotion :**
  - les zones pour un relevé : points de Mes jours, Tes zones ;
  - les familles pour les comptes par famille.
- **Tout le reste est en encre neutre `--donnee*`** : nuits, énergie, explosions, épisodes, Bien-être, lieu, contact, mouvement.
- **L'accent n'entre jamais dans un graphique.** Il reste sur les contrôles autour : période, mesure, « Voir en tableau ».
- **Les séries restent distinctes** par leur place, leur forme et leur rampe : point, anneau, trait, barre, encoche, losange ; les rampes ont 3 pas, et le pas le plus clair a un contour. Voir `reperage-design.md` §2.4.
- « Peu de valeurs », aujourd'hui en opacité 0,45, passe en barre creuse avec un contour à 3:1.

### 5.6 Ce qui reste coloré

1. **Les 4 zones**, pour un relevé d'émotion :
   - points de l'en-tête, de Ma journée, de l'Historique et de « Ce jour-là » ;
   - bulles et cases de la carte ;
   - capsule du mot ;
   - Mes jours, Tes zones ;
   - l'icône de l'app.
2. **Les 7 familles**, seulement dans les graphiques d'agrégat de l'Analyse et dans Réglages › Émotions. Ce sont des données d'émotion.
3. **L'accent vert** : choisi, agir, onglet actif, liens.
4. **`--danger`**.

**Les écrans de l'émotion (`.moment-plein`) n'ont pas d'accent vert.** Leurs actions restent à l'encre, comme en v11 : `--action` et `--accent*` y pointent sur `--moment-plein`. Sinon, un mot sans zone peindrait ses activités choisies en vert à l'écran 3, et on lirait « zone verte » à tort.

## 6. La musique

### 6.1 Ce qu'il voit

**Mes refuges** (`#/refuges`, depuis Bien-être et depuis Réglages › Mon plan), de haut en bas :
1. **L'en-tête « Mes refuges »**, avec à droite un bouton texte **« Modifier »** vers `#/refuges/reglages`.
2. **La carte de la playlist suivie** (« Détente »). Elle porte la mention « Spotify » si la playlist vient du compte, et l'icône de sortie. Les autres lignes qui ont un lien suivent, en cartes simples.
3. **Une ligne discrète : « Un toucher ouvre Spotify. »**
4. **La liste des morceaux**, façon liste d'une app Apple.
   - Une rangée par morceau : le titre, et l'artiste en dessous en `--text-2`.
   - Un toucher ouvre Spotify sur le morceau.
   - Pas de pochette ni d'icône par rangée.
5. **« La suite est dans Spotify. »**, si la playlist dépasse le plafond (§6.3), sans aucun nombre.
6. **« Mes titres »**, en lecture seule, s'il y en a.

**L'état vide** (aucune playlist avec un lien) :
- le texte « Choisis ta playlist dans ton compte Spotify, ou colle son lien. » ;
- « Choisir dans mon compte », si `connexionDisponible` ;
- un lien « Coller un lien » vers les réglages.

**Les réglages de Mes refuges** (`#/refuges/reglages`, route `refuges-reglages`, onglet Bien-être). Le retour et le geste de retour mènent à Mes refuges. On y trouve, repris de l'écran v11 :
- « Mes titres », éditable, avec le même `cleBrouillon` ;
- les 3 lignes nom et lien, qui s'écrivent seules ;
- « Choisir dans mon compte », qui devient « Changer de playlist » quand une playlist est suivie ;
- **« Mettre à jour la liste »** ;
- la note « Une seule lecture : Emozio ne garde pas la connexion. » ;
- le champ du code ;
- la liste du compte pendant un choix ;
- « Retirer ces playlists », avec « Annuler ».

### 6.2 Les liens

**`lienAOuvrir(lien) → string|null`**, fonction pure de `domain/refuges.js`, appelée seulement à l'affichage. Les données ne changent pas.
- `spotify:…` et `music:…` restent tels quels.
- `https://open.spotify.com/(intl-xx/)?{playlist|track|album|artist|episode|show}/ID` devient `spotify:{type}:ID`, sans `?si`.
- `https://music.apple.com/…` devient `music://music.apple.com/…`. C'est non testé, mais suit le même raisonnement.
- Un autre lien https reste tel quel. Dans les réglages, une note discrète l'accompagne : « Ce lien risque de ne rien ouvrir depuis Emozio. »

**Où on l'utilise :**
- la carte de playlist, dans Mes refuges et dans Moment difficile ;
- les morceaux, avec `spotify:track:ID` fabriqué à l'affichage, car les morceaux ne gardent que leur identifiant.

**Après un morceau seul, Spotify enchaîne sur sa lecture automatique, pas forcément sur Détente.** C'est le lien par défaut ; la recette iPhone le dit.

**Le Diagnostic.** « Ouvrir une playlist » devient **« Ouvrir un morceau »**, avec deux liens sur le premier morceau gardé :
- « Morceau seul » : `spotify:track:ID` ;
- « Morceau dans sa playlist » : `spotify:track:ID?context=spotify%3Aplaylist%3APID`.

Le rapport ne note que le nom de la forme touchée. Si la seconde forme marche, une version suivante pourra la prendre par défaut. `formesDuLien` est retirée ou remplacée par `formesDuMorceau`.

### 6.3 La lecture des morceaux

**L'appel :**
- `GET https://api.spotify.com/v1/playlists/{id}/items?limit=50&offset={o}&fields=…`
- L'identifiant est vérifié avant d'écrire l'adresse (`^[A-Za-z0-9]{22}$`), puis passe par `encodeURIComponent`.
- **L'hôte est déjà dans la CSP, qui ne change pas.**

**Faits vérifiés** (guide Spotify de migration de février 2026, appliqué le 09/03/2026 aux apps en mode développement) :
- `/playlists/{id}/tracks` est supprimé ;
- chaque entrée porte maintenant `item`, et non plus `track` ;
- les éléments ne sont lisibles que pour une playlist dont l'utilisateur est propriétaire ou collaborateur. Sinon, la réponse ne contient que les métadonnées, sans `items` ;
- le propriétaire de l'app doit avoir Premium ;
- 5 utilisateurs au plus.

**La syntaxe exacte de `fields` avec `item`** (par exemple `total,items(is_local,item(type,id,name,is_local,artists(name)))`) est à vérifier dans la référence Spotify au moment du plan. La lecture reste tolérante : on lit `entree.item ?? entree.track`.

**La pagination :**
- `limit=50`, offset calculé, `next` jamais suivi ;
- arrêt sur une page courte, sur `total` atteint, ou après 4 pages ;
- **`MAX_MORCEAUX = 200`**, donc 5 appels au plus pour une mise à jour (le jeton, puis 4 pages) ;
- au-delà, `suite: true`.

**`listeMorceaux(json)`**, fonction pure, écarte :
- une entrée ou un `item` `null` ;
- `is_local` ;
- `type !== 'track'` ;
- un identifiant invalide ;
- un morceau sans titre.

Elle garde le titre en texte, coupé à 200 signes, et l'artiste, avec les `artists[].name` joints par « , », coupé à 200 signes, ou `null`. Les doublons ne sont pas éliminés.

**Les erreurs**, en plus des cas actuels :
- **`morceaux`** : 403 sur les éléments, ou 200 sans `items`. Message : « Spotify ne donne pas les morceaux de cette playlist : seule une playlist à toi les donne. Elle reste notée. Dans Spotify, tu peux la copier dans une playlist à toi. » En mise à jour, la playlist et ses anciens morceaux restent. Pour un choix, voir §6.4.

**Les droits demandés** : `playlist-read-private` **et** `playlist-read-collaborative`. Une playlist collaborative donne aussi ses morceaux. L'utilisateur a dit en v11 préparer ses playlists lui-même : Détente est très probablement la sienne. À confirmer en recette.
- **`expiree`** : « La connexion a expiré : touche « Choisir dans mon compte » de nouveau. »
- Les messages v11 disent « Ta liste reste » au lieu de « Tes liens notés restent ».

**« Mettre à jour la liste »** demande le jeton puis les pages des morceaux de la playlist suivie, **sans relire `/me/playlists`**. L'identifiant vient du lien de la playlist suivie, qu'il ait été collé ou choisi.

### 6.4 Le jeton

**Choix de conception, voie D.** Pour lire les morceaux d'une playlist touchée **après** l'affichage de la liste du compte, `finirConnexion` rend `{ liste, lireMorceaux }`. `lireMorceaux(id)` est une fermeture qui détient le jeton :
- elle ne sert qu'**une fois** ;
- elle expire après **10 minutes**, avec une horloge injectable pour les tests ;
- l'écran l'oublie en se démontant ;
- **le jeton n'est jamais écrit** : ni en base, ni dans `localStorage`, ni dans `etatApp`, ni dans une sauvegarde.

**Un choix qui échoue ne fait rien perdre** (choix de conception). Quand on touche une playlist dans la liste du compte :
- `lireMorceaux` est d'abord appelée. **Rien n'est écrit avant sa réponse.**
- **Réponse avec des morceaux :** la playlist touchée est notée avec ses morceaux (`choisirSpotify`), et la fermeture est consommée.
- **`morceaux`** (la playlist n'est pas à lui) : la playlist touchée est notée **sans** morceaux, avec le message, et la fermeture est consommée. Les morceaux de la playlist suivie avant sont perdus, puisqu'elle est remplacée.
- **`reseau`** : rien n'est écrit. La fermeture **n'est pas consommée** et reste valable jusqu'à son expiration : on peut retoucher.
- **`expiree`** ou `refus` : rien n'est écrit, et le message invite à refaire « Choisir dans mon compte ».
- **Après tout choix écrit**, un toast « Annuler » rend les refuges d'avant, comme le retrait de la v11.

**Le but de la connexion** (`choisir` ou `maj`) et l'identifiant de playlist d'une mise à jour vont dans l'attente PKCE : `{ verifier, state, creeLe, but, playlist? }`.
- `lireAttente` valide ces champs et les rend.
- Une attente sans `but` vaut `choisir`.
- Un `playlist` invalide fait repasser en `choisir`.

**CLAUDE.md :**
- l'exception réseau devient : « au seul toucher sur « Choisir dans mon compte » ou « Mettre à jour la liste » dans Mes refuges » ;
- on garde la phrase « aucun jeton n'est gardé », exigée par `v11-documentation.test.js`, et on la précise : « jamais écrit ; en mémoire le temps de choisir une playlist, 10 min au plus ».

### 6.5 Les données et le format 9

**`morceaux: [{ id, titre, artiste }]`**, sur **une seule** ligne de `refuges.playlists` : la première qui en a, et dont le lien est une playlist Spotify. Plus `suite: true` si besoin. Les deux champs ne sont présents que s'ils ne sont pas vides.
- `id` : `^[A-Za-z0-9]{22}$`.
- `titre` : texte obligatoire, 200 signes au plus.
- `artiste` : texte de 200 signes au plus, ou `null`.
- 200 morceaux au plus. Les entrées invalides sont écartées, une clé inconnue est perdue.

**Les nouvelles fonctions de `domain/refuges.js` :**
- `idPlaylistSpotify(lien)` accepte le https et `spotify:playlist:ID`.
- `lienDeSpotify` accepte aussi `spotify:playlist:ID`, pour un repli si `external_urls` manquait.
- `choisirSpotify(r, { nom, lien, morceaux, suite })` remplace `basculerSpotify`. Le choix est **unique** : la playlist touchée remplace la ligne suivie, ou s'ajoute s'il reste moins de 3 lignes. Les lignes collées à la main restent.

**`avecPlaylist`.** Un lien changé vers une autre playlist perd les morceaux. Un nom changé, ou le même lien recollé, les garde.

**Le format 9 :**
- `FORMAT_VERSION = 9`, et `MISES_A_NIVEAU[8]` ne transforme rien.
- **Le témoin `format-8.json` se produit d'abord** : `scripts/temoins.mjs`, étiquette `v11.0.0`, avec une nuit à 7 h 30, des gratitudes, « Ce que j'en retiens » et des refuges, tout inventé.
- Les formats 1 à 9 s'importent.
- `docs/format-sauvegarde.md` gagne une section « formatVersion 9 (v12) ».

**Ce qui change ailleurs :**
- L'aperçu d'import est inchangé (« les refuges »).
- Les morceaux ne vont ni dans l'Export PSY ni dans la vue soignants. Ils ne lisent pas la méta ; un test le garde.
- Ils vont dans la sauvegarde.

### 6.6 Moment difficile

- La carte de la playlist reste à sa place, avec le lien direct.
- Les morceaux viennent **après Mon plan**, sous un titre au nom de la playlist, avec le même composant que Mes refuges.
- Aucune demande réseau, pas de « Mettre à jour la liste ».

Placer les morceaux plus haut repousserait Mon plan de plusieurs écrans en pleine crise.

## 7. La nouvelle version dans Safari, et l'aide « Changer d'icône »

- **Le piège.** Dans Safari, et non dans l'app installée, une page servie par une ancienne version du service worker garde l'ancien titre et l'ancienne icône. « Sur l'écran d'accueil » les reprend alors.
- **Ce qu'on sait du code.** Hors de l'app installée, Emozio n'affiche que le guide d'installation ou la page du code Spotify (`app.js`, l. 106-107). **Le bandeau « Nouvelle version prête » n'y apparaît jamais.** Une nouvelle version qui attend s'active quand tous les onglets du site sont fermés.
- **Ce qu'on change.**
  - **Hors mode app** (`estModeApp()` faux), quand une nouvelle version attend, Emozio l'applique seule (`appliquerMaj()`) : une fois, puis un seul rechargement.
  - **Exception : la page du code Spotify** (`CodeSpotify`). Le code y est déjà retiré de l'adresse, et un rechargement le perdrait.
  - En mode app, rien ne change : le bandeau reste.
  - Ce correctif ne joue qu'à partir de la v12. Une page v11 encore en cache dans Safari ne l'a pas.
- **L'Aide iPhone**, « Changer d'icône sans rien perdre ». L'étape Safari devient : « Dans Safari, ferme l'onglet d'Emozio s'il est ouvert, puis rouvre l'adresse : la page se met à jour. » Ensuite, Partager › Sur l'écran d'accueil. Le nom reste modifiable dans l'aperçu.

## 8. Documentation

- **CLAUDE.md :** l'exception réseau et le jeton, voir §6.4.
- **`docs/decisions.md`**, entrée « 2026-11-09 : v12.0.0 » :
  - les décisions du §2 ;
  - les nouveaux jetons ;
  - l'accent B et sa règle de sens : choisi ou agir, jamais une valeur ;
  - la règle des graphiques ;
  - les icônes pleines d'onglet, qui reviennent sur B1 (« seul arrêt est rempli ») ;
  - la coche gardée ;
  - les écrans de l'émotion sans accent ;
  - la voie D du jeton ;
  - le format 9 ;
  - la fin de la palette 2b.
- **`docs/recette-iphone.md` :**
  - Détente et un morceau ouvrent Spotify ;
  - la lecture démarre-t-elle ?
  - ce qui joue après le morceau ;
  - la forme « dans sa playlist » au Diagnostic ;
  - « Mettre à jour la liste » ;
  - le vert en clair et en sombre ;
  - la page du soir ;
  - l'ajout à l'écran d'accueil depuis Safari.
- **`docs/format-sauvegarde.md`** : le format 9.

## 9. Tests

À adapter et à compléter (détail dans les repérages) :
- **Design :**
  - `jetons.test.js` : base, accent, contour, ΔE de l'accent à la menthe, rien de `--accent` dans `.moment-plein` ;
  - `couleurs.js` ;
  - `code-mort.test.js` ;
  - `icones.test.js` ;
  - les e2e de couleurs et de mise en page (environ 20 fichiers : v7-fondations, v7-aujourdhui, v7-controle, v7-parcours, v8-fiabilite, v8-sommeil, v11-roue, v11-gratitudes, v11-episodes, v9-emotion, v11-emotion-clair, v10-apres-emotion, v9-mot-perso, v11-icone…) ;
  - la hauteur de la page du soir, à +120 px au plus ;
  - le nom accessible de l'en-tête.
- **Musique :**
  - `refuges.test.js` (`lienAOuvrir`, `idPlaylistSpotify`, morceaux, `choisirSpotify`, `listeMorceaux`) ;
  - `spotify.test.js` (attente avec `but`, adresse et `fields` exacts, pages, plafond, erreurs `morceaux` et `expiree`, `lireMorceaux` à usage unique et à durée limitée, aucun jeton dans `localStorage`) ;
  - `architecture.test.js` (adresses autorisées) ;
  - `sauvegarde.test.js` et `temoins.test.js` (format 9, témoin 8) ;
  - `v11-refuges` et `v11-spotify` réécrits ou remplacés par des fichiers v12, avec `page.route` et **jamais un clic sur un lien `spotify:`** (on lit `href`) ;
  - v7-controle.
- **Safari :** l'application seule d'une nouvelle version hors mode app, pas en mode app, pas pendant une saisie.

## 10. Choix de conception à relire

Ce sont mes choix, non les siens :
- **Le jeton (§6.4) :** en mémoire, 10 minutes au plus, à usage unique.
- **Un choix de playlist qui échoue (§6.4) :** rien n'est perdu, et « Annuler » suit un choix.
- **Les droits Spotify :** `playlist-read-collaborative` est ajouté.
- **Le vert :** jamais un point ni un disque, et les repères d'étapes sont à l'encre.
- **Safari :** l'aide dit de fermer l'onglet puis de le rouvrir, et non de toucher le bandeau.
- **Moment difficile :** les morceaux viennent après Mon plan.
- **Mes refuges :**
  - « Mettre à jour la liste » est dans les réglages ;
  - « Mes titres » est en lecture seule sur l'écran principal.
- **Plafond :** 200 morceaux.
- **Morceaux :** le lien par défaut est le morceau seul.
- **Design :**
  - la coche est gardée ;
  - les écrans de l'émotion sont sans accent ;
  - les graphiques sont en encre ;
  - les 7 familles restent dans l'Analyse ;
  - `--danger` reste rouge ;
  - les épisodes sont neutres ;
  - la page du soir grandit de +120 px au plus.
- **Safari :** la nouvelle version s'applique seule hors mode app.

## 11. Laissé au constructeur

- Les valeurs exactes de `--donnee*`, `--piste` et `--fenetre`, dans les bornes de contraste.
- Le dessin des 5 icônes pleines.
- Le resserrement de la page du soir.
- La découpe en tâches.
- La forme de `formesDuMorceau`.
- Le texte de la note sous un lien qui risque de ne rien ouvrir.
- La syntaxe vérifiée de `fields`.
