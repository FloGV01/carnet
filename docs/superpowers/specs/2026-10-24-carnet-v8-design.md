# Carnet v8 : émotion en carte, Bien-être en lecteur, programme (conception)

Version visée : **8.0.0**, publiée en une seule fois.

Sources de cette conception :
- les retours d'usage de l'utilisateur sur la v7 et ses réponses (23 et 24/10) ;
- les recherches du 24/10, dont deux sont jointes :
  - `2026-10-24-carnet-v8/hwf-placement.md` (How We Feel, carte des 79 mots) ;
  - `2026-10-24-carnet-v8/programme-sophro.md` (programme et brouillons des séances) ;
- le repérage des pistes Q1 à Q32 (`.superpowers/v8/pistes-v8.html`, non suivi).

## 1. Intention

- **L'écran Émotion** exige aujourd'hui de connaître le nom des émotions : on choisit d'abord une famille. L'utilisateur veut la forme de How We Feel. Il répond d'abord à ce qu'il sent, son énergie et « plutôt agréable ou pas », puis il trouve le mot sur une carte, avec sa définition sous les yeux.
- **Le Bien-être** n'est « pas hyper intuitif ». Il le veut comme Petit BamBou :
  - un lecteur simple ;
  - des sons aux changements ;
  - une fermeture à la fin ;
  - un vrai programme sur plusieurs semaines, avec ce qui a été fait.
- **Les deux écrans doivent se fermer seuls** une fois remplis.
- **S'y ajoutent des pistes choisies** : nuits, fatigue, émotions selon l'activité, Après coup, rendez-vous.

## 2. Décisions de l'utilisateur

| Sujet | Décision |
|---|---|
| Écran Émotion | **La carte How We Feel.** D'abord une tuile (énergie × « plutôt désagréable / plutôt agréable »), puis un mot sur une carte de bulles. Les mots agréables sont à droite, les désagréables à gauche. « plutôt désagréable » et « plutôt agréable » sont écrits au-dessus des colonnes. |
| Énergie | Elle est choisie avec la tuile, **jamais devinée d'après le mot**. |
| Place des mots | **« Comme How We Feel ».** L'utilisateur ne relit pas la place des mots. |
| Définitions | Une par mot. **Écrites par Carnet, modifiables par l'utilisateur.** Un **appui long** sur une bulle montre la définition sans choisir le mot. |
| Fermeture | « Ce que je faisais » est replié à chaque ouverture. L'écran se ferme seul une fois rempli. |
| Son en mode silencieux | **Non par défaut**, avec un réglage pour le forcer (la musique se met alors en pause). |
| Respiration | **Un souffle continu** (plutôt que deux notes). |
| Anneau du lecteur | Il montre le temps **de tout l'exercice**. |
| Fin d'exercice | Le message « Noter mon émotion » pendant 6 s. |
| Programme | Il s'appelle **« Programme »**. Une séance faite affiche **une coche et « Faite le 12/10 »**. « Faite » veut dire **menée jusqu'au bout**. Les étapes ne montrent **que leur titre**. **Pas de marquage à la main.** |
| Bien-être | L'onglet ne garde que **le Programme et la cohérence cardiaque**. Les exercices, les 8 actuels et les 9 nouveaux, se font **dans le Programme**. Moment difficile garde la cohérence cardiaque. |
| Sommeil (25/10) | **Plus simple : le nombre d'heures et la qualité.** Coucher, lever et réveils ne se saisissent plus le soir ; Q16 (temps d'endormissement) est abandonné. Voir §7 bis. |
| Pistes retenues | Q5 (le détail du sport et du contact dans leur carte), Q15 (« Mes nuits », aussi sur l'A4 des soignants), Q17 (énergie haute et hyperfocus avant la fatigue), Q18 (émotions selon l'activité), Q20 (Après coup quand la honte reste), Q22 (sujets pour un rendez-vous). |
| Textes | Les 79 définitions et les 9 nouvelles séances sont **relus après la publication**, dans l'app. |
| Livraison | **En une fois**, version 8.0.0. |
| Hors champ | Le petit modèle IA local (« on verra après »). L'assistant IA reste prévu pour la V3. |

**Règles levées à sa demande, et seulement là**
- **Écran Émotion** : la carte range les mots en « plutôt agréable » et « plutôt désagréable ».
  - La position n'est ni enregistrée ni calculée.
  - L'Analyse ne parle jamais de côté ni de proportion.
  - Les mots « positif », « négatif », « bon » et « mauvais » n'apparaissent jamais.
  - Il n'y a aucun score d'agréabilité.
- **Programme** : le suivi « fait ou non » existe, mais sans aucun compteur.
  - Il n'y a ni total, ni pourcentage, ni barre, ni anneau de progression.
  - Il n'y a ni série, ni date de départ, ni « semaine 3 », ni « en retard », ni « il y a 12 jours ».
  - Une séance pas faite n'affiche rien.

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- **Émotion du moment en 2 touchers** (tuile, puis mot), et l'écran se ferme seul.
- **Un exercice en 2 touchers** (une ligne, puis lecture), ou **1 toucher** pour reprendre le Programme. Les étapes avancent seules.
- **Des sons doux à chaque changement**, et un souffle sonore pour respirer les yeux fermés.
- **Voir ses nuits nuit par nuit**, ce qui précède la fatigue, et ses émotions selon ce qu'on faisait.

**Non-objectifs**
- Pas d'IA.
- Pas de nouvelle phrase calculée.
- Pas de rappel.
- Pas de séance hors du Programme, sauf la cohérence cardiaque.
- Pas de changement de l'Analyse des émotions : les relevés gardent leur forme.

**Anti-objectifs** (ce qui ferait échouer la v8, même si tout fonctionne)
- Un compteur ou un repère de progression dans le Programme.
- Un mot qui juge une émotion.
- Un écran qui s'ouvre seul.
- Un son qui surprend.
- Une saisie du soir qui défile.
- Perdre une donnée existante.

## 4. Écran « Émotion du moment » en carte

Le détail est dans l'annexe `hwf-placement.md`, option A.

**Premier toucher : la tuile**
- **6 tuiles** sur 3 rangées, énergie Haute, Moyenne et Basse, et 2 colonnes.
- Au-dessus des colonnes : « plutôt désagréable » et « plutôt agréable ».
- Chaque tuile montre 2 ou 3 mots d'exemple, à la couleur de leur famille.
- Le toucher **enregistre l'énergie**. Il en garde les trois niveaux, la règle « Me ressourcer » et l'Analyse de l'énergie.

**La carte**
- Elle s'ouvre centrée sur la zone touchée. Elle porte une bulle ronde par mot, 79 mots en tout, à la **couleur de sa famille**, celle de la roue de l'utilisateur.
- On peut la faire glisser vers les zones voisines. Rien n'est grisé.
- Les mots d'une même famille sont côte à côte, et la carte est toujours la même.
- Sans « Réduire les animations », le passage de la tuile à la carte est un fondu court. Avec, c'est un saut.

**Deuxième toucher : la bulle**
- Le toucher **enregistre le mot** (`roue:<famille>:<mot>`).
- La bulle grossit et sa **définition** s'affiche en bas. L'écran **se ferme seul 1,5 s plus tard**.
- Toucher une autre bulle pendant ce délai change le mot et relance le délai.
- **L'écran ne se ferme pas seul dans deux cas**, comme aujourd'hui :
  - l'utilisateur a ouvert « Ce que je faisais » pendant cette saisie ;
  - la carte « Pour récupérer, je… » s'affiche (règle « Me ressourcer »).

**Les autres gestes**
- Un **appui long** sur une bulle montre sa définition sans choisir le mot.
- Un lien discret, **« Toute la carte »**, ouvre la carte sans passer par l'énergie : tout reste facultatif.
- Si aucun mot ne convient, on ferme l'écran. L'énergie seule est gardée.

**Ce qui reste**
- « Maintenant / C'était vers… » et « Ce que je faisais » restent sous la carte, repliés à chaque ouverture.
- Les relevés du jour restent affichés.
- La « famille seule » de la v7 n'est plus proposée. Les anciens relevés de ce type restent valables et s'affichent comme avant.

**Placement des mots (« comme How We Feel »)**
- Un mot qui a un équivalent dans la carte de How We Feel ou dans le « Mood Meter » RULER (Yale) reprend **sa zone et sa hauteur d'énergie**.
- Pour les autres, c'est le tableau §9 de l'annexe.
- La table de placement est une donnée pure : `domain/carte-roue.js`, mot → colonne et rangée. On peut la corriger sans toucher aux données enregistrées.
- La couleur reste celle de la famille, jamais celle de la zone.

**Les définitions**
- Il y en a 79, écrites pour Carnet. Ce sont des phrases courtes qui décrivent ce qu'on ressent ou la situation, sans juger. Par exemple : « Irrité : agacé par quelque chose qui gêne ou qui se répète. »
- Elles vivent dans `domain/` et sont figées comme la roue.
- L'utilisateur peut les corriger dans **Réglages › Émotions**, mot par mot, avec « Revenir au texte de Carnet ».
- Ses corrections vont dans `meta` et dans la sauvegarde.

**Données** : le relevé ne change pas (`{ emotion, energie, faisais, vers }`). Ni migration, ni changement de l'Analyse des émotions.

## 5. Bien-être : un lecteur, des sons, la fermeture

Le détail est dans l'annexe `2026-10-24-carnet-v8/propositions.md`, partie B. L'essentiel est repris ici.

**L'onglet**
- En haut, la carte **Programme** : la séance qui vient (« Les sons · 5 min · assis ») et un gros bouton lecture rond. Un toucher lance la séance. La carte s'ouvre sur l'écran Programme.
- Dessous, la carte **Cohérence cardiaque**, compacte : Durée, Rythme et le bouton lecture.
- La **liste d'exercices disparaît** de l'onglet.

**Le lecteur** (`ui/composants/lecteur.js`), le même pour les séances et la cohérence cardiaque
- **Avant de commencer** : le titre, « 8 min · assis ou allongé », une ligne de description, et un gros bouton lecture au centre.
- **Pendant** :
  - la consigne en grand en haut ;
  - au milieu, un anneau qui se remplit avec le temps de tout l'exercice, et le bouton pause au centre ;
  - dessous, « il reste 6:40 » ;
  - en bas, près du pouce : étape précédente, étape suivante, et « Terminer » en lien discret.
- **Les étapes avancent seules**, voix allumée ou non. « Suivant » ne sert qu'à sauter une étape.
- **Les étapes de respiration** : un disque grandit à l'inspiration et rétrécit à l'expiration, sous les mots « Inspire », « Retiens » et « Expire ». Quatre temps réglables par étape, par exemple pour la respiration carrée.
- **La fin** :
  - trois bols, et « Fin de l'exercice. » dit par la voix si elle est allumée ;
  - **le lecteur se ferme seul environ 6 s plus tard** et revient à l'écran d'où il a été lancé ;
  - un message « Noter mon émotion » reste 6 s, puis s'efface ;
  - rien ne s'ouvre seul, et il n'y a aucune félicitation.
- **Pause, écran verrouillé, app cachée** : l'exercice se met en pause et la voix se coupe, comme aujourd'hui. Le verrou d'écran reste pendant la séance, comme en v7.

**Les sons**
- Tous sont fabriqués par Web Audio dans l'app : aucun fichier, aucun réseau.
  - un bol de début, d'environ 4 s ;
  - un bol de changement d'étape, plus court, joué avant la voix ;
  - trois bols de fin ;
  - un **souffle** : un bruit doux qui monte pendant l'inspiration et redescend à l'expiration. Les deux notes de la v7 restent possibles.
- Les sons sont calés sur l'horloge audio, pas sur un minuteur.
- **Réglage dans le lecteur**, gardé sur l'iPhone : « Son : Aucun · Repères · Repères + souffle ». Il vaut **« Repères + souffle » au départ** : c'est la demande de l'utilisateur, alors que la v6 le voulait éteint. La voix garde son propre interrupteur.
- **En mode silencieux**, le son se tait par défaut et se mêle à la musique. Un réglage « Jouer le son même en mode silencieux » le force, et met alors la musique en pause.
- **Pas de vibration** : Safari ne le permet pas.
- **Moment difficile** garde sa cohérence cardiaque sur place, avec les mêmes sons.

## 6. Programme

Le contenu est dans l'annexe `programme-sophro.md`, §2 à §6.

- **8 étapes et 17 séances de 1 à 10 min**, chaque étape ayant une séance principale et une courte. L'ordre est celui de l'annexe, §3.
  - **8 séances reprennent les exercices de la v7 sans changer leurs textes.** Leurs identifiants restent les mêmes.
  - **9 séances nouvelles et 2 blocs communs** (« Arriver », 60 s, et « Revenir », 55 s) sont écrits à partir des brouillons de l'annexe, §5, avec les précautions du §1.6 :
    - les yeux ouverts sont permis, et on peut bouger ;
    - on ne retient jamais son souffle de force ;
    - on ne demande jamais de porter attention au cœur ;
    - les souvenirs sont décrits par les sens ;
    - chaque séance rappelle « tu peux t'arrêter à tout moment ».
- **Présentation** : « inspiré de la sophrologie et de la pleine conscience », sans les noms déposés. Le rythme n'est écrit qu'une fois, et jamais mesuré : « une étape par semaine, une ou deux séances, si tu veux ».
- **L'écran Programme** :
  - une carte par étape, avec son titre seul ;
  - dans chaque carte, ses séances, avec leur titre et « 5 min · assis » ;
  - **une séance faite affiche une coche et « Faite le 12/10 »**, la date la plus récente ;
  - **une séance pas faite n'affiche rien**, ni case vide, ni grisé ;
  - rien n'est verrouillé : chaque séance se lance d'un toucher.
- **La séance qui vient** (carte Programme et bouton lecture) :
  - c'est celle qui suit, dans l'ordre du programme, **la dernière séance menée au bout** ;
  - au tout début, c'est la première ; après la dernière, on revient à la première ;
  - aucune séance sautée n'est signalée.
- **« Faite »** veut dire menée jusqu'au bout. Une séance arrêtée en route compte encore comme séance (règle v7 des 60 s) pour Mes jours, mais elle ne porte pas de date dans le Programme. Il n'y a pas de marquage à la main.
- **Rien ailleurs** : ni écran de fin du programme, ni rappel, ni ligne dans Aujourd'hui, ni Export PSY, ni Vue soignants.
- **Données** :
  - le store `seances` gagne un champ `fin: true` pour une séance menée au bout. Les séances v7 n'en ont pas et ne datent rien ;
  - un module pur, `domain/programme.js`, porte les étapes et les séances, `derniereFaite(seances)` et `suivante(seances)` ;
  - la sauvegarde passe au **format 6**.
- **Analyse** : la rangée Bien-être de Mes jours et la vue « Autour du Bien-être » restent telles quelles. Les séances du Programme y comptent avec l'origine `bien-etre`.

## 7. Pistes retenues

- **Q5 · Le détail dans sa carte** (avec la décision du 25/10, le sommeil passe par le §7 bis)
  - « Sport en détail » et « Contact en détail » s'ouvrent par un lien « Détail › » dans le titre de leur carte.
  - Le repli « Nuit en détail » est masqué (§7 bis). Ses données ne bougent pas.
  - Le détail est fermé au départ et ne s'ouvre jamais seul. Le soir tient toujours sans défiler à 390 × 797.
- **Q15 · « Mes nuits »**
  - Dans Comprendre › Rythmes, au-dessus de « Tes nuits selon le jour » : une ligne par nuit notée, sur 4 semaines.
  - Une barre de la longueur des heures dormies, avec le motif neutre de la qualité (§7 bis).
  - « Voir en tableau » complète le graphique.
  - **Aussi sur l'A4 de la Vue soignants**, qui doit tenir sur une page de 273 mm au plus. Dans le cas extrême, on réduit à 2 semaines.
  - Il n'y a ni phrase, ni indice de régularité, ni ligne pour une nuit non notée.
- **Q16** : abandonné le 25/10, au profit du nombre d'heures (§7 bis).
- **Q17 · Avant la fatigue** : dans Comprendre › Énergie, le graphique « Avant les jours à énergie basse » gagne deux facteurs, « Énergie haute notée » et « Hyperfocus » (le symptôme).
- **Q18 · Émotions selon ce que je faisais**
  - Dans Comprendre, une barre par activité de « Ce que je faisais », découpée par familles d'émotions à leurs couleurs.
  - Le graphique donne des nombres de relevés, sans pourcentage, avec « Voir en tableau ».
  - Seuil de 5 relevés, avec « Pourquoi ? ».
- **Q20 · Après coup**
  - L'étape « Une autre façon de voir » apparaît aussi quand « Honte » ou « Regret » est touché dans « Plus tard », quel que soit le type.
  - Le champ `autreFacon` existe déjà, de même que la phrase d'aide.
- **Q22 · Sujets pour un rendez-vous**
  - Dans la fiche d'un rendez-vous, sous « Une question pour ce rendez-vous… », une rangée de sujets : Sommeil · Traitement · Explosions · Fatigue · Travail · Émotions · Autre chose.
  - Un toucher ajoute une question « Parler de : sommeil », modifiable ensuite.
  - La liste se règle dans Réglages › Listes (nouvelle liste `sujetRdv`).

## 7 bis. Sommeil : heures et qualité (décision du 25/10)

**Saisie**
- La carte Sommeil porte deux rangées :
  - **Qualité** : Mal · Moyen · Bien, comme aujourd'hui ;
  - **Durée** : « 4 h ou moins · 5 h · 6 h · 7 h · 8 h · 9 h · 10 h ou plus ». Un toucher, facultatif, et un second toucher l'efface.
- Nouveau champ du journal : `heuresSommeil`, un entier de 4 à 10, où 4 veut dire « 4 h ou moins » et 10 « 10 h ou plus ». Il porte sur la nuit qui précède le jour, comme la qualité.
- **Le soir doit toujours tenir sans défiler à 390 × 797.** Si la rangée Durée ne tient pas une fois la carte resserrée, elle s'ouvre par le lien « Durée › » de la carte (Q5), fermé au départ. Cet écart est alors noté dans `docs/decisions.md`.

**Ce qui part de la saisie**
- Coucher, lever et réveils ne sont plus proposés le soir.
- Le repli « Nuit en détail » est **masqué**, comme l'humeur du soir en v6 : on peut le réafficher dans Réglages › Le soir.
- **Les nuits déjà notées gardent toutes leurs données** et s'affichent comme avant dans l'Historique et sur la page d'un jour.

**Lectures**
- **Mes nuits (Q15)** : une barre par nuit notée, de la **longueur des heures dormies**, avec le motif neutre de la qualité.
  - Pour une nuit ancienne, la durée se calcule à partir du coucher et du lever, avec la même règle que la durée médiane d'aujourd'hui.
  - Une nuit sans durée n'a pas de barre.
  - Rien sur l'heure du coucher ni sur la régularité.
  - L'écran et l'A4 des soignants sont concernés.
- **Durée médiane** (Analyse, Vue soignants) : elle vient de `heuresSommeil` quand il existe, sinon de coucher et lever. Coucher et lever médians ne s'affichent plus que pour les périodes qui en ont.
- **Export PSY** : la ligne du jour donne « nuit Mal · 6 h ». Le nombre de réveils n'y paraît plus que pour les nuits anciennes qui en ont. **Le format de l'Export PSY change.**

## 8. Fiabilité et finitions (appels du concepteur)

Ces chantiers se voient à peine. Ils sont inclus parce qu'ils sont petits et protègent l'usage quotidien.

- **Q27** : le Diagnostic affiche la hauteur utile, les zones sûres et la marge du soir. Les tests simulent la zone sûre réelle de l'app installée, ce qui permet de vérifier Q5 sur un vrai chiffre.
- **Q29** : les sept finitions laissées par les relectures de la v7.
- **Q31** : corriger la course qui rend un test instable, stabiliser les tests v6 et v7, retirer les attentes fixes.
- **Q32** : retirer le code mort (`stats.js` en grande partie, `avant-explosions` hors test, `oui-non.js`, les classes CSS inutiles).
- **Q26** : un garde-fou de performance sur 5 ans de données inventées, et des écrans qui ne relisent la base que si elle a changé.

## 9. Données et versions

- **`DB_VERSION` 6**, si la liste nouvelle `sujetRdv` est versées dans le store `listes`, comme les précédentes : `MIGRATIONS[6]`, figée. Sinon la base ne change pas, au choix du constructeur selon le modèle du code.
- **`FORMAT_VERSION` 6** :
  - `seances.fin` ;
  - `journal.heuresSommeil` ;
  - les définitions corrigées dans `meta` ;
  - `MISES_A_NIVEAU[5]` ;
  - les sauvegardes témoins des formats 1 à 5 restent importables.
- **Version de l'app** : 8.0.0.

## 10. Appels du concepteur (à vérifier en lisant)

- Les mots sans équivalent dans How We Feel ou RULER sont placés selon le tableau de l'annexe.
- Les définitions se corrigent dans « Réglages › Émotions ».
- Le son vaut « Repères + souffle » au départ.
- Le lecteur se ferme 6 s après la fin.
- La séance qui vient suit la dernière faite. Après la dernière, on revient à la première.
- Une séance arrêtée en route compte pour Mes jours, mais pas dans le Programme.
- Q5 ne vaut plus que pour Sport et Contact. « Nuit en détail » est masqué (§7 bis).
- Mes nuits passe de 4 à 2 semaines sur l'A4 si la page ne tient pas.
- Les chantiers de fiabilité du §8 sont inclus.

## 11. Laissé au constructeur

- La disposition exacte de la carte : taille des bulles, glissement, centrage.
- Le timbre des bols et du souffle, dans les limites du §5 : doux, court, jamais surprenant.
- La forme de Mes nuits, selon le skill `dataviz` et le système 2b.
- Le texte exact des définitions et des séances nouvelles, dans les règles du §4 et du §6.

## 12. Précisions après relecture (appels du concepteur)

1. **Le son sur les écrans de crise ne change pas.**
   - Moment difficile et « Respirer » dans « Pour récupérer, je… » gardent le réglage de Réglages › Moment difficile : éteint au départ, avec les deux notes de la v7. Rien ne joue seul en pleine crise.
   - Le réglage « Son : Aucun · Repères · Repères + souffle », « Repères + souffle » au départ, ne vaut que pour le lecteur de Bien-être : Programme et cohérence cardiaque de l'onglet.
2. **Ce qui compte comme « Faite » dans le Programme.**
   - Seule compte une séance **lancée depuis le Programme** et menée au bout. Son enregistrement porte `programme: '<id de la séance du programme>'` et `fin: true`.
   - Une cohérence cardiaque lancée ailleurs ne compte pas : carte de l'onglet, Moment difficile, « Pour récupérer ».
   - Dans le Programme, la cohérence cardiaque dure toujours 5 min.
3. **Respiration et rétention.**
   - Le disque et le souffle ne s'affichent que sur les étapes dont le texte donne un rythme. Leurs temps sont ceux du texte, par exemple 4 · 4 · 4 · 4 pour la respiration carrée.
   - Pendant un temps « Retiens », le souffle se tait et le disque reste immobile. Les textes de la v7 ne changent pas : la respiration carrée dit déjà « si retenir te gêne, compte jusqu'à deux ».
   - Les séances nouvelles n'imposent aucune rétention (§6).
4. **Respiration abdominale reste.** Elle devient la séance principale de l'étape 1, à la place de « Premiers pas », et garde son texte. Le Programme compte toujours 17 séances : « Premiers pas » n'est pas écrite.
5. **Placement des mots.** Une étape de la construction cherche la carte publiée du Mood Meter RULER (Yale) et la liste de How We Feel.
   - Un mot français qui a un équivalent clair (Furieux et furious, Calme et calm…) prend sa zone et sa hauteur.
   - Les autres gardent le tableau §9 de l'annexe.
   - La correspondance retenue est notée dans `docs/decisions.md`.
   - Sans source vérifiable, c'est le tableau §9.
6. **Q5 : les détails passent dans leur carte.**
   - Sport et Contact : chacun s'ouvre depuis le lien « Détail › » de sa carte. Le sommeil suit le §7 bis.
   - Sport et Contact, côte à côte, ouvrent leur détail en pleine largeur sous la paire.
   - La liste des replis ne garde que « Ce qui a pesé · ce qui a rechargé » et « Notes libres ».
7. **Q27 sans livraison intermédiaire.** Les tests simulent les valeurs standard de l'iPhone en 390 × 844, soit 47 px en haut et 34 px en bas. Le Diagnostic affiche les vraies valeurs une fois la v8 installée.
