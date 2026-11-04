# Carnet v10 : des exercices pour chaque moment, et la carte qui suit le doigt (conception)

Date : 30/10/2026. Version visée : 10.0.0. Repérages (non suivis par git, dans `.superpowers/v10/`) :
- `headspace-synthese.md` et les quatre rapports `headspace-*.md` : ce que Headspace fait, ce que ses utilisateurs en disent, ce qui est à prendre ou à éviter ;
- `etat-carte.md`, `etat-moment-difficile.md`, `etat-bien-etre.md`, `etat-apres-emotion.md`, `etat-sons.md` : l'état du code v9.0.0 sur chaque sujet, avec les tests qui le verrouillent ;
- `notes-brainstorm.md` : les réponses de l'utilisateur, telles qu'il les a données ;
- `police/` : les captures qui ont servi à choisir la police.

## 1. Intention

Après la v9 (l'émotion façon How We Feel), l'utilisateur a demandé une recherche sur Headspace, puis a retenu d'un coup cinq pistes (A à E de la synthèse) : des exercices courts pour les moments difficiles, de nouveaux exercices, une proposition d'exercice après une émotion, un Bien-être plus simple à ouvrir, des minuteurs et des sons de fond. Il a aussi deux retours sur la carte des émotions de la v9.

Ce qui compte pour lui :
- **trouver l'exercice sans chercher**, surtout quand ça déborde : un toucher, un seul exercice, des consignes concrètes ;
- **une app cohérente** : la carte des émotions ne doit plus avoir une police à part ;
- **une carte vivante** : en la parcourant du doigt, le mot qui passe au milieu grossit, comme How We Feel.

Réussite : en pleine montée, il ouvre Moment difficile, touche « Panique » et suit un exercice de deux minutes sans rien régler. Après avoir noté une émotion, il voit deux exercices adaptés et peut en lancer un d'un toucher. Le soir, il lance un bruit de fond pour s'endormir. En parcourant la carte, il voit les mots grossir sous le milieu de l'écran.

## 2. Décisions de l'utilisateur (30/10)

- **Pistes A à E, d'un coup** (« Go pour ABCDE d'un coup »).
- **Carte des émotions** :
  - pendant qu'on fait glisser la carte, le mot qui passe au milieu de l'écran grossit « comme si on appuyait dessus », ses voisins un peu, puis il reprend sa taille ;
  - **toujours toucher pour enregistrer** : glisser n'écrit jamais rien ;
  - **des cercles** : pas de forme propre à chaque émotion (« si c'est impossible laissons juste des cercles » ; la Recopie de l'iPhone, seul moyen d'observer How We Feel, n'est pas disponible en Europe).
- **Police** : « Utilise la police iPhone ». La police système partout, carte des émotions comprise : New York (`ui-serif`) disparaît.
- **A. Moment difficile** : quatre boutons en haut, **Panique · Colère · Trop-plein · Réveil la nuit**, chacun lance un seul exercice court ; la respiration, « Une chose à la fois » et Mon plan restent en dessous.
- **C. Après une émotion notée** : deux ou trois exercices proposés sur une ligne discrète, **pour toutes les couleurs** (pas seulement les désagréables).
- **D. Bien-être** : « Reprendre » et les favoris en tête, puis quatre entrées : **Me calmer vite · Dormir ou me rendormir · Me concentrer · Programme**.
- **E. Sons de fond fabriqués par l'iPhone** (bruit brun, bruit rose, vagues, pluie douce) : rien à télécharger.
- Il préfère répondre à des formulaires à choix plutôt qu'à des questions ouvertes.

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un exercice adapté se lance en un toucher depuis Moment difficile, depuis l'écran « Ce que je faisais » et depuis Bien-être.
- Six exercices nouveaux (§6), écrits par Carnet, courts, concrets, les yeux ouverts quand c'est utile.
- Bien-être se lit d'un coup d'œil : « Reprendre », les favoris, quatre entrées par besoin.
- Minuteur silencieux, minuteur de concentration, sons de fond avec minuterie et fondu, sans fichier ni réseau.
- La carte grossit le mot du milieu pendant le glissement ; une seule police dans toute l'app.

**Non-objectifs**
- La piste F (prévenir avant que la voix revienne, « Ma voix » enregistrée) et la piste G (« À essayer d'ici le prochain rendez-vous », amorces de note) : plus tard.
- Des formes d'émotion à la How We Feel.
- La barre d'état noire au-dessus des écrans de l'émotion (réserve de la v9) : attend le retour de l'utilisateur sur l'iPhone.
- Réordonner Bien-être selon l'heure : les places restent fixes (§7.1).

**Anti-objectifs** (un échec même si tout marche)
- Une série, un total de minutes, un compteur de séances, un palier, une coche de réussite, une félicitation (CLAUDE.md, et ce que les avis reprochent à Headspace).
- Une sollicitation en fin d'exercice autre que celles qui existent déjà : pas de séance suivante lancée seule, pas de suggestion, pas de partage.
- Un exercice qui démarre seul en pleine crise, un son qui joue sans qu'on l'ait demandé (`docs/decisions.md`, « Rien ne joue seul en pleine crise »).
- Un relevé écrit par un glissement sur la carte.
- Une promesse dans un texte d'exercice (« pour te calmer », « tu vas te sentir mieux » : liste `PROMESSES` de `tests/unit/exercices.test.js`).
- Un appel réseau, un fichier son ou une police téléchargés.

## 4. La carte des émotions

### 4.1 Le mot du milieu grossit pendant le glissement

- Pendant que la carte défile (doigt posé, puis élan), **le mot dont la place régulière est la plus proche du milieu de la fenêtre** devient le centre de la lentille : 156 pt pour lui, puis 120, 108 et 96 pt selon la distance, avec les places de la table `LENTILLE` (même géométrie que pour un mot touché, `disposition()` de `ui/carte-geometrie.js`). Tous les mots restent des **cercles** : la double capsule reste réservée au mot touché (§4.2).
- Le mot du milieu se calcule sur les **places régulières** (`placeReguliere`, `pointDe`), jamais sur les places affichées, pour que la lentille ne change pas elle-même le mot trouvé.
- **Hystérésis** : le centre ne change que lorsque le milieu de la fenêtre est nettement plus proche d'une autre place (par exemple d'au moins 15 % du pas), pour que la carte ne sautille pas entre deux mots.
- **Glisser n'écrit rien** : ni `.choisi`, ni `aria-pressed`, ni relevé, ni carte du bas, ni annonce VoiceOver. Seul un toucher choisit et enregistre (v9, inchangé).
- **Mouvement réduit** : la lentille ne suit pas le glissement (rien ne grossit en glissant) ; seul le mot touché prend sa taille, comme en v9.
- **À l'ouverture sur une zone** (aucun mot choisi), la lentille se pose sur le mot du milieu, l'égalité entre quatre mots étant départagée de façon stable (le plus haut, puis le plus à gauche).
- **Avec un mot choisi** : il garde la double capsule, `aria-pressed` et la carte du bas. Si l'on fait ensuite glisser la carte, la lentille suit le milieu ; le mot choisi garde sa forme et sa couleur de sélection, à la taille que lui donne la lentille. Toucher un autre mot le choisit et recentre la carte sur lui, comme en v9.
- **Pas de toucher sur un mot qui bouge** (point de vigilance 5 de la v9) : un toucher pendant que la lentille se déplace, ou dans les 350 ms qui suivent l'arrêt du défilement, choisit le mot **sous le doigt au moment du toucher**, ou est ignoré : jamais un mot voisin qui serait venu se placer là.
- **Fluidité** : pas de rendu Preact des 144 bulles à chaque image. La place et l'échelle se posent par CSSOM (comme aujourd'hui, la CSP interdit l'attribut style en texte), une fois par image au plus (`requestAnimationFrame`), seulement quand le centre change. La transition des bulles reste celle de la v9 (450 ms), ou plus courte si l'essai le demande (appel du constructeur, §12).

### 4.2 Le mot touché

Comme en v9 : il est enregistré au toucher, devient la double capsule de 156 pt, la carte se recentre sur lui, la carte du bas monte. La lentille pendant le glissement ne change rien à cette règle.

### 4.3 Une seule police

- `--police-serif` disparaît (ou pointe sur `--police`) : les sept usages de `ecrans.css` passent à la police système (titre de l'écran 1, libellés des quatre bulles et de leurs variantes « petites » et « comptes », libellés de la carte, mot en rappel et titre de l'écran 3, mots de la loupe, titre de « Mon mot »). La graisse reste 700.
- Les largeurs de libellé changent : `ajusterEtiquettes` doit encore faire tenir chaque libellé, y compris en très grand texte. La largeur de 126 des quatre bulles, calée sur New York, est à revoir.
- Les commentaires et documents qui parlent de New York sont mis à jour (`tokens.css`, `ecrans.css`, `entete.js`, `docs/recette-iphone.md`, `docs/decisions.md`).

## 5. A. Moment difficile

### 5.1 L'écran

- En haut, une grille de **quatre boutons** de même taille (2 × 2) : **Panique**, **Colère**, **Trop-plein**, **Réveil la nuit**. Ils sont visibles sans défiler à l'ouverture, en taille de texte normale, au-dessus de la carte de respiration.
- En dessous, sans changement : la respiration (cohérence cardiaque, réglable), « Une chose à la fois », Mon plan, et le pied « Noter un épisode ». L'écran peut désormais défiler.
- Les mots des boutons sont fixes (ils ne se règlent pas). Le bouton touché n'est pas une donnée enregistrée.

### 5.2 Les quatre exercices de crise

Chacun dure **de 1 à 3 minutes**, **sans choix de durée** (appel du concepteur : aucune décision à prendre en pleine crise). Les consignes sont physiques et concrètes, une par écran, les yeux ouverts, avec le droit de bouger et de passer une étape. Les textes sont écrits par Carnet (contenu proposé, à relire par l'utilisateur dans `docs/decisions.md`) :
- **Panique** : pieds bien à plat, appuyer ; trois soupirs (une inspiration, une petite inspiration en plus, une longue expiration) ; nommer trois choses vues, deux entendues, une touchée ; encore deux expirations longues.
- **Colère** : s'éloigner si possible, ou se tourner ; serrer les poings cinq secondes, relâcher, trois fois ; expirations longues ; marcher ou bouger est permis pendant tout l'exercice.
- **Trop-plein** : réduire ce qui entre (regarder un point fixe, se couvrir les oreilles si besoin) ; une pression (bras croisés, mains à plat sur la poitrine ou les cuisses) ; expirations longues ; rester là, sans rien à faire.
- **Réveil la nuit** : **écran noir**, texte gris peu lumineux, **aucun son par défaut** ; expiration longue (inspiration 4 s, expiration 6 à 8 s) ; poser l'attention sur les pieds, les mains, le ventre, les épaules, la mâchoire ; finir sans rien attendre. L'écran reste allumé pendant l'exercice seulement.

### 5.3 Comment ils se jouent

- Dans le **lecteur** (`ui/composants/lecteur.js`), dans une variante « crise » qui respecte les règles des écrans de crise : son **éteint au départ** (session `ambient`), **pas de compte à rebours** (ni « il reste », ni anneau qui se remplit), **pas de « Noter mon émotion »** à la fin, retour sur Moment difficile. La voix du système reste un choix de l'utilisateur, éteinte au départ.
- La séance est enregistrée avec `origine: 'moment-difficile'` et l'identifiant de l'exercice (règle actuelle : menée au bout, ou arrêtée après 60 s). Aucun changement de schéma.

## 6. B. Les exercices nouveaux

Six exercices s'ajoutent, **à la fin** de `EXERCICES` (les identifiants existants sont figés), avec leurs textes recopiés dans `docs/decisions.md` comme les autres (test existant). Plus les quatre exercices de crise du §5.2, qui suivent la même règle.

| id proposé | titre | durée | principe |
|---|---|---|---|
| `soupir` | Le soupir | 1, 3 ou 5 min | inspiration, petite inspiration en plus, longue expiration ; aucune rétention |
| `expiration-longue` | Expiration longue | 1, 3 ou 5 min | inspiration 4 s, expiration 6 à 8 s ; aucune rétention |
| `noting` | Noter ce qui passe | 1, 3 ou 5 min | quatre grosses étiquettes : Pensée, Corps, Son, Émotion ; on touche celle qui passe, puis on revient au souffle |
| `ancrage-court` | Ancrage court | 2 min | trois choses vues, deux entendues, une touchée ; un sens peut se passer |
| `scan-court` | Scan court | 3 min | pieds, mains, ventre, épaules, mâchoire ; « rien de spécial » est une réponse normale |
| `savourer` | Savourer | 2 min | remarquer trois détails du moment, où il se sent dans le corps, le garder quelques souffles |

- **Le soupir** ne tient pas dans le souffle à quatre temps actuel (`domain/respiration.js`) : le modèle gagne une seconde inspiration courte (et le disque, le mot de phase et le son de souffle la suivent). L'expiration longue tient dans le modèle actuel.
- **Le noting** est une étape interactive nouvelle du lecteur : quatre boutons d'au moins 60 pt, un toucher les fait briller un instant, **rien n'est enregistré**. Le temps avance seul.
- **Durée au choix (1, 3 ou 5 min)** seulement pour les trois exercices qui se répètent (soupir, expiration longue, noting) : la partie qui se répète s'allonge, l'arrivée et la fin restent les mêmes. La durée se choisit sur l'écran « avant » du lecteur, la **dernière durée est retenue** par exercice sur l'appareil (localStorage, comme les réglages du lecteur). Les autres exercices gardent leur durée fixe.
- Les règles d'écriture actuelles valent pour tous : une consigne par écran, phrases courtes, tutoiement, aucune promesse (`PROMESSES`), des cycles entiers pour les étapes rythmées.
- Les exercices du Programme ne changent pas, et le Programme ne gagne pas de semaine.

## 7. D. Bien-être

### 7.1 L'écran

De haut en bas, à des places qui ne bougent pas d'une fois sur l'autre :
1. **« Reprendre »** : une carte qui relance le dernier exercice lancé depuis Bien-être (titre et bouton lecture). Absente tant qu'aucun exercice n'a été lancé. Pas de date, pas de « déjà fait ».
2. **Favoris** : les exercices épinglés par l'utilisateur, dans l'ordre où il les a épinglés, chacun avec son bouton lecture. Absents s'il n'y en a pas.
3. **Quatre entrées**, toujours dans cet ordre : **Me calmer vite**, **Dormir ou me rendormir**, **Me concentrer**, **Programme**. Chacune ouvre sa liste ; Programme ouvre l'écran actuel du Programme, inchangé.

La carte « Cohérence cardiaque » quitte la page d'accueil de Bien-être pour la liste « Me calmer vite » (appel du concepteur).

### 7.2 Le contenu des entrées

- **Me calmer vite** : Le soupir, Expiration longue, Ancrage court, Noter ce qui passe, Cohérence cardiaque, Minuteur silencieux.
- **Dormir ou me rendormir** : Réveil la nuit (le même exercice que dans Moment difficile, mais avec les réglages du lecteur de Bien-être), Expiration longue, Scan court, Sons de fond.
- **Me concentrer** : Minuteur de concentration, Sons de fond, Noter ce qui passe.
- Un même exercice peut paraître dans plusieurs entrées. Savourer n'est dans aucune entrée : il se propose après une émotion (§8), et peut être épinglé de là.

### 7.3 Favoris, épingle et « Reprendre »

- Chaque ligne d'exercice d'une entrée porte une **épingle** (icône au trait, nouvelle) : un toucher l'ajoute aux favoris, un second l'en retire. Aucun nombre.
- Les favoris sont rangés dans une clé de **méta** (ils vont dans la sauvegarde), normalisée à la lecture (identifiants inconnus ignorés), avec un libellé dans l'aperçu d'import (`NOMS_META`). Appel du concepteur : une écriture de favori ne compte pas comme une saisie (`META_SANS_MARQUE`).
- « Reprendre » vient du **localStorage** (préférence de l'appareil, perdue à la réinstallation, comme les réglages du lecteur) : l'identifiant du dernier exercice lancé depuis Bien-être, même arrêté avant 60 s. Il ne reprend pas au milieu : il relance l'exercice depuis le début.
- Un exercice du Programme relancé hors du Programme (favori, « Reprendre ») ne met pas à jour « Faite le … » : seul le Programme date ses séances (appel du concepteur).

### 7.4 Navigation

- Une route par entrée et une route pour un exercice seul (par exemple `#/bien-etre/calmer`, `#/bien-etre/dormir`, `#/bien-etre/concentrer`, `#/exercice/:id`), rattachées à l'onglet Bien-être. Le test qui verrouille aujourd'hui l'absence de route d'exercice seul est mis à jour.
- Le lecteur garde son comportement de Bien-être (son « Repères + souffle » au départ, compte à rebours, « Noter mon émotion » à la fin), et revient à l'écran d'où il a été lancé.

## 8. C. Après une émotion notée

- Sur l'écran 3 « Ce que je faisais », pour un **relevé neuf** dont le mot a une **zone** (pas pour un relevé rouvert, ni « Aucun mot », ni un mot à soi sans zone), une ligne discrète **« Pour ce moment : »** suivie de **deux ou trois boutons** d'exercice.
- Place : dans le corps qui défile, **après** « Ce que je faisais » et la carte « Pour récupérer » s'il y en a une ; jamais sous la flèche de l'écran 2 ni à la place de « Terminer ».
- Table fixe, écrite à la main, dans un module pur de `domain/` (appel du concepteur, à relire par l'utilisateur) :

| zone | exercices proposés |
|---|---|
| rouge (énergie haute, désagréable) | Le soupir · Ancrage court · Expiration longue |
| jaune (énergie haute, agréable) | Savourer · Noter ce qui passe |
| bleu (énergie basse, désagréable) | Scan court · Expiration longue · Noter ce qui passe |
| vert (énergie basse, agréable) | Savourer · Expiration longue |

- Toucher un exercice : le relevé est déjà écrit ; l'écran attend la fin de la file d'écriture, comme « Terminer », puis ouvre le lecteur de Bien-être sur cet exercice (durée retenue), avec retour à Aujourd'hui. Le toast « Émotion du moment notée · Annuler » n'est pas montré dans ce cas (appel du concepteur ; le relevé reste modifiable depuis Ma journée). Le son et la voix sont préparés dans le toucher (règle actuelle de `lancerLecture`, délai de 3 s).
- À la fin de l'exercice, le lecteur garde son comportement actuel (« Noter mon émotion » 6 s) : ce n'est jamais une boucle automatique, chaque pas est un toucher.
- La séance garde `origine: 'bien-etre'` : aucun changement de format de sauvegarde (appel du concepteur ; l'Analyse « Autour du Bien-être » compte donc ces séances, avec l'émotion qui les précède).
- Rien n'insiste : pas de texte d'invitation, pas de mise en avant colorée, pas de rappel si on ne touche rien.

## 9. E. Minuteurs et sons de fond

### 9.1 Minuteur silencieux (dans « Me calmer vite »)

- Durée au choix **5, 10 ou 20 min**, la dernière retenue. Un bol au début, un bol à la fin, et un **son à intervalle facultatif** (toutes les minutes), éteint au départ.
- Écran sobre : le temps restant n'est pas affiché pendant la séance (comme les écrans de crise), seulement un rappel discret « Arrêter ». C'est une séance (`exercice: 'minuteur'`, origine `bien-etre`).

### 9.2 Minuteur de concentration (dans « Me concentrer »)

- Durée au choix **15, 25 ou 45 min**, la dernière retenue. Un bol à la fin. Un **son de fond facultatif** (§9.3), choisi avant de commencer. Le temps restant s'affiche (c'est un outil de travail, pas un exercice).
- Ce n'est pas une séance de Bien-être : rien n'est enregistré (appel du concepteur).

### 9.3 Sons de fond (dans « Dormir ou me rendormir » et « Me concentrer »)

- Quatre sons **fabriqués sur l'iPhone** par Web Audio, sans fichier : **bruit brun**, **bruit rose**, **vagues**, **pluie douce**. Les boucles sont assez longues et raccordées pour qu'on n'entende ni claquement ni répétition évidente.
- **Minuterie** au choix **15, 30 ou 60 min**, puis un **fondu** d'environ 30 s ; le volume se règle dans l'app (le fondu et le volume passent par le gain Web Audio, programmé sur l'horloge audio, jamais par `setTimeout`).
- Rien n'est enregistré (pas de séance).
- **Écran verrouillé** : le son doit continuer quand l'iPhone se verrouille, ce qui demande la session `playback` (le son joue alors aussi en mode silencieux et met la musique en pause : l'écran le dit en une ligne). Ce comportement n'est pas encore vérifié sur l'iPhone : une entrée du **Diagnostic** permet de l'essayer d'abord. S'il ne tient pas, repli : l'écran reste allumé, noir, pendant la minuterie (appel du concepteur).
- Le son de fond vit sur son écran (§14.1) : il s'arrête quand on quitte cet écran. Le contexte audio reste unique ; les sons du lecteur et des écrans de crise ne jouent pas en même temps que lui.

## 10. Données et versions

- Version **10.0.0**. `DB_VERSION` reste 6, le format de sauvegarde reste **7** : pas de nouvelle origine de séance, pas de nouveau champ. Les favoris sont une clé de méta (non validée à l'import, normalisée à la lecture) ; « Reprendre » et les durées retenues sont dans le localStorage.
- Les exercices nouveaux s'ajoutent à la fin de `EXERCICES` ; leurs étapes figurent dans `docs/decisions.md` (règle actuelle).
- `docs/decisions.md` reçoit la liste des règles v8 levées ou changées : séances hors du Programme (§7), lecteur qui ne se met plus en pause pour les sons de fond s'ils continuent écran verrouillé (§9.3), écran Moment difficile qui défile (§5.1).

## 11. Tests attendus

- **Carte** : glisser grossit le mot du milieu sans rien écrire (aucun relevé, aucun `aria-pressed`) ; l'hystérésis ; mouvement réduit : rien ne grossit en glissant et aucune animation ; un toucher juste après un glissement choisit le mot sous le doigt ; aucune bulle ne se chevauche, quel que soit le centre ; plus aucune `ui-serif` calculée dans l'app ; très grand texte : chaque libellé tient.
- **Moment difficile** : les quatre boutons visibles sans défiler ; chaque exercice de crise sans son ni compte à rebours ni « Noter mon émotion » ; « Réveil la nuit » sur fond noir ; la séance d'origine `moment-difficile`.
- **Exercices** : les identifiants figés plus les nouveaux, à la fin ; les règles d'écriture ; le soupir et ses cycles entiers ; 1, 3 et 5 min ; noting n'écrit rien.
- **Bien-être** : places fixes ; « Reprendre » absent puis présent ; épingle ajoutée puis retirée ; favoris dans la sauvegarde et restaurés à l'import ; rien d'écrit pour une valeur par défaut.
- **Après une émotion** : la ligne pour chaque zone, absente pour un relevé rouvert ou sans zone ; aucun relevé perdu en lançant un exercice.
- **Sons** : contexte créé dans un toucher ; fondu programmé ; quitter l'écran des sons arrête le son (§14.1) ; les écrans de crise restent muets.
- **Contrôle global** (`v7-controle`) étendu aux écrans nouveaux : CSP, contraste, cibles de 44 pt, mouvement réduit.

## 12. Laissé au constructeur

- La technique du suivi du glissement (écouteur de défilement et `requestAnimationFrame`, ou animation pilotée par le défilement si le WebKit de l'iPhone et celui de Playwright la gèrent), la durée de transition (jusqu'à 450 ms) et le seuil exact d'hystérésis.
- La recette exacte des quatre sons de fond (filtres, longueur des boucles, modulations).
- La mise en page des listes d'entrées et de la grille de Moment difficile, dans le style 2b actuel, en police système.
- Le nom de la clé de méta des favoris et des clés de localStorage, avec le préfixe `carnet:`.
- Le découpage des exercices de crise en étapes, dans les durées et les principes du §5.2.

## 13. Appels du concepteur (à vérifier en lisant)

1. Pas de choix de durée pour les exercices de crise (§5.2).
2. Durée au choix seulement pour le soupir, l'expiration longue et le noting (§6) ; les minuteurs et les sons ont leurs propres durées (§9).
3. Cohérence cardiaque déplacée dans « Me calmer vite » (§7.1).
4. Favoris dans la méta (sauvegardés) ; « Reprendre » et durées dans l'appareil (§7.3).
5. Un exercice du Programme relancé ailleurs ne date rien (§7.3).
6. La table zone → exercices du §8, dont « Savourer » pour le jaune et le vert.
7. Après un exercice lancé depuis l'écran 3, pas de toast « notée » ; origine `bien-etre`, format inchangé (§8).
8. Minuteur de concentration et sons de fond ne sont pas des séances ; le minuteur silencieux en est une (§9).
9. Sons de fond : session `playback` pour continuer écran verrouillé, à vérifier par le Diagnostic ; sinon, écran noir allumé (§9.3).
10. Mouvement réduit : la lentille ne suit pas le glissement (§4.1).

## 14. Précisions après relecture (appels du concepteur)

Un relecteur a lu ce document comme s'il devait le construire. Ses cinq questions sont tranchées ici ; ces réponses priment sur les sections précédentes en cas d'écart.

### 14.1 Les sons de fond vivent sur leur écran
- Un son de fond joue **seulement tant que son écran est ouvert** : un écran plein, comme le lecteur, avec le son choisi, la minuterie, le volume et « Arrêter ». Quitter l'écran (✕, retour) arrête le son, avec un fondu court. Il n'y a donc pas d'état audio global ni d'indicateur ailleurs dans l'app.
- Verrouiller l'iPhone ou passer à une autre app **ne quitte pas l'écran** : le son continue si iOS le permet (§14.2). Le retour à Aujourd'hui après 30 min d'absence ne s'applique pas à cet écran (écran plein, comme le lecteur).
- Le test « un son de fond survit à la fin d'une respiration » du §11 tombe ; il est remplacé par : quitter l'écran des sons arrête le son ; les écrans de crise restent muets (ils ne peuvent pas être ouverts en même temps qu'un son de fond, puisque celui-ci occupe l'écran).

### 14.2 Écran verrouillé : une seule version, puis un correctif si besoin
- La v10 est construite et publiée **avec la session `playback`** pour les sons de fond, **sans** garder l'écran allumé. Une entrée du Diagnostic (« Son de fond, écran verrouillé ») permet à l'utilisateur de vérifier sur son iPhone.
- Si le son s'arrête au verrouillage, un correctif (10.0.1) passera au repli du §9.3 (écran noir gardé allumé pendant la minuterie). Pas de version intermédiaire avant la v10, et pas de double comportement construit d'avance.

### 14.3 Les deux minuteurs
- **Minuteur silencieux** : il se comporte comme le lecteur (écran gardé allumé, pause quand la page est cachée, session `ambient`). C'est une séance (§9.1).
- **Minuteur de concentration** : l'heure de fin est calculée une fois au départ (horloge murale). Écran gardé allumé, session `ambient` (il respecte le mode silencieux et ne coupe pas la musique). Si Carnet n'est plus à l'écran à la fin, le bol ne sonne pas ; au retour, l'écran dit simplement « Le temps est passé. », sans chiffre. Il n'y a pas de pause quand la page est cachée : le temps continue.

### 14.4 Épingle, favoris et « Reprendre »
- **L'épingle** se trouve sur chaque ligne des quatre entrées **et** sur l'écran « avant » du lecteur, pour tout exercice de Bien-être (Programme compris, Savourer compris), ainsi que sur l'écran de départ des deux minuteurs et des sons de fond.
- **Peuvent être des favoris ou « Reprendre »** : tout exercice de `EXERCICES`, la cohérence cardiaque, le minuteur silencieux, le minuteur de concentration et les sons de fond. La clé de méta des favoris est une liste d'identifiants parmi cet ensemble ; un identifiant inconnu est ignoré à la lecture.
- Le bouton lecture d'un favori ou de « Reprendre » ouvre l'écran de départ de l'élément (pour un exercice : le lecteur, avec sa durée retenue ; pour les sons de fond : leur écran, avec le dernier son et la dernière minuterie).
- **« Reprendre »** retient le dernier élément lancé dans Bien-être, depuis n'importe où sauf Moment difficile : entrées, favoris, Programme, et ligne « Pour ce moment » de l'écran 3.

### 14.5 Moment difficile : un toucher démarre
- Toucher **Panique** (ou un autre des quatre boutons) **démarre l'exercice aussitôt** : c'est l'utilisateur qui le demande, ce n'est pas un démarrage seul. Le son et la voix sont préparés dans ce toucher (`lancerLecture`).
- Le son et la voix de ces exercices suivent **Réglages › Moment difficile** : le « Signal sonore » existant vaut aussi pour eux (des repères discrets aux changements d'étape, rien d'autre), et un interrupteur « Lire les consignes à voix haute » s'ajoute, éteint au départ (nouvelle clé de la méta `respiration`, normalisée à la lecture). Pendant l'exercice, la pause permet de les changer pour cette fois, sans les retenir.
- « Réveil la nuit » ignore le signal sonore : il reste muet sauf si la voix est allumée.
