# Carnet v8 : propositions pour Émotion, Bien-être et Programme

Note de travail du 24/10/2026, non suivie par git. Rien n'est construit ni décidé.
Elle résume trois recherches :
- How We Feel : `.superpowers/v8/hwf-placement.md`, qui contient le tableau des 79 mots ;
- Petit BamBou : son centre d'aide, l'App Store et RespiRelax+ (sources en fin de partie B) ;
- le programme : `.superpowers/v8/programme-sophro.md`, qui contient les brouillons des séances.

**(NV)** veut dire non vérifié.

## En bref

- **Émotion.** Tu réponds d'abord sur ton énergie et sur « plutôt agréable ou pas ». Ensuite, tu touches un mot sur une carte de bulles aux couleurs de ta roue. Chaque mot a sa définition. Il faut 2 touchers au lieu de 3, puis l'écran se ferme seul.
- **Bien-être.** Un seul lecteur, comme celui de Petit BamBou :
  - un gros bouton lecture ;
  - des étapes qui avancent seules ;
  - un son de bol à chaque changement d'étape, un souffle sonore pour respirer ;
  - une fermeture automatique à la fin.

  Il faut 2 touchers au lieu de 14 en moyenne.
- **Programme.** 8 étapes et 17 séances de 1 à 10 min, à raison d'une étape par semaine si tu veux. Une séance faite affiche « Faite le 12/10 ». Une séance pas faite n'affiche rien.
- **Ce qui ne change pas.** Tes relevés d'émotion gardent la même forme. L'Analyse et Comprendre restent donc tels quels.
- **À toi.** Il y a 16 questions en fin de note. Tu peux répondre « tout comme proposé », ou donner seulement les numéros à changer.

---

## A. Émotion du moment, à la How We Feel

### Mon avis sur ta question
Oui, copier la forme de How We Feel (HWF) est une bonne idée pour ton besoin. Sa première question ne demande pas de connaître les émotions : elle demande « combien d'énergie » et « plutôt agréable ou pas ». On choisit le mot ensuite, en comparant des mots voisins, avec leur explication sous les yeux. Je garde tes 79 mots et tes couleurs, et je retire tout ce qui pousse à revenir.

### Ce que fait HWF
- Une carte à deux axes : l'énergie de haut en bas, l'agréable de gauche à droite. On choisit d'abord une zone, puis un mot parmi les mots voisins. Brackett le résume ainsi : on dit « je suis dans le jaune », puis on affine (marcbrackett.com ; Character Lab ; Szabo 2024).
- Chaque mot a une courte explication (App Store).
- La carte serait un champ de bulles qu'on fait glisser. La bulle touchée grossit et son explication s'affiche (NV : aucune source écrite, et je n'ai vu aucune capture).
- Ce qu'on ne reprend pas : l'anneau et la série de jours, les rappels, le partage, la revue par IA.

### Ce que tu verrais
1. **Tu ouvres « Émotion du moment ».** Six tuiles, sur trois rangées (énergie Haute, Moyenne, Basse) et deux colonnes (plutôt désagréable, plutôt agréable). Chaque tuile montre 2 ou 3 mots d'exemple, à la couleur de leur famille.
2. **Tu touches une tuile.** Ton énergie est enregistrée. La carte s'ouvre sur cette zone : une bulle ronde par mot, à la couleur de sa famille. Tu peux faire glisser la carte vers les zones voisines. Rien n'est grisé.
3. **Tu touches une bulle.** Le mot est enregistré. La bulle grossit, sa définition s'affiche en bas, et l'écran se ferme seul 1,5 s plus tard. Si tu touches une autre bulle pendant ce temps, le mot change et le délai repart.
4. **Tu hésites ?** Un appui long sur une bulle montre sa définition sans la choisir.

À savoir :
- Le mot peut venir d'une autre rangée que ton énergie, par exemple « Irrité » avec une énergie Basse. C'est voulu : le mot dit l'émotion, la rangée dit ta réserve.
- Un lien discret, « Toute la carte », ouvre la carte sans répondre sur l'énergie, puisque tout reste facultatif.
- Si aucun mot ne va, tu fermes : l'énergie seule est gardée.
- « C'était vers… » et « Ce que je faisais » restent en dessous, repliés.

### Touchers
- En v7 : 3 touchers (famille, mot, énergie).
- Proposé : **2** (la tuile, le mot). Rien n'est deviné.

### La carte
- Les 79 mots sont placés sur une grille énergie × agréable. Le placement mot par mot est au §9 de `hwf-placement.md`.
- C'est mon jugement, pas une mesure. 31 mots sont discutables, entre autres Accablé, Dévasté, Défiant, Provocant, Sensible, Libéré, Exclus et Effrayé.
- La carte est déséquilibrée : 53 mots à gauche, 26 à droite, alors que HWF a 36 mots par zone (source unique). Une tuile ouvre donc sur 6 à 27 mots.
- Les couleurs sont celles de tes familles :
  - Colère : rouge ;
  - Dégoût : orange ;
  - Tristesse : jaune-olive ;
  - Joie : vert ;
  - Surprise : bleu ;
  - Peur : violet ;
  - Sérénité : turquoise.

  Je n'ai pas repris les 4 couleurs de zone de HWF : elles effaceraient tes familles.
- Les mots d'une même famille sont côte à côte et forment des taches de couleur. La carte est toujours la même, et rien ne bouge seul.
- Pour faire « plus simple » que HWF : pas de dégradé d'intensité, pas de bulles qui rétrécissent au bord, pas de formes animées.

### Les définitions
- 79 phrases courtes, écrites par Carnet, que tu peux corriger dans Réglages › Émotions. Elles disent ce qu'on ressent, ou la situation, sans juger.
- Trois exemples, à relire :
  - Irrité : agacé par quelque chose qui gêne ou qui se répète.
  - Accablé : écrasé par trop de choses à la fois.
  - Posé : calme et stable, les idées en place.

### Pourquoi l'écran ne se ferme pas toujours aujourd'hui (lu dans le code)
- Il attend le mot **et** l'énergie (`public/js/ui/ecrans/moment.js:41`).
- Il reste ouvert tant que « Ce que je faisais » est déplié. Or ce dépli est mémorisé d'une fois sur l'autre (`moment.js:74`) : une fois ouvert, il le reste aux saisies suivantes. C'est la cause probable de ton retour.
- Proposition : **le mot ferme l'écran**, et « Ce que je faisais » est replié à chaque ouverture. Deux exceptions, comme aujourd'hui :
  - tu as ouvert « Ce que je faisais » pendant cette saisie ;
  - la règle « Me ressourcer » s'affiche.

### Tensions avec les règles
- **L'axe agréable.** Copier HWF, c'est ranger les mots agréables à droite et les désagréables à gauche.
  - Les consignes de design l'interdisaient (`docs/design/prompt-claude-design.md:25`). La v7 n'a levé l'interdiction que pour les couleurs. Il faut ton accord (question 1).
  - Les garde-fous :
    - la position n'est ni enregistrée ni calculée ;
    - l'Analyse ne parle jamais de côté ni de proportion ;
    - les mots « positif », « négatif », « bon » et « mauvais » n'apparaissent jamais ;
    - aucun score d'agréabilité.
  - Si tu refuses : la variante B. L'énergie d'abord, puis une bande de mots rangés par famille, sans côtés. On perd alors l'aide « plutôt agréable ou pas ? ».
- **Rien par défaut.** L'énergie n'est jamais déduite du mot, pour trois raisons :
  - ce n'est pas la même mesure : ta réserve d'un côté, l'activation de l'émotion de l'autre ;
  - 31 mots sont ambigus ;
  - chez les personnes alexithymiques, l'activation ressentie suit mal celle du corps (Gaigg, Cornell et Bird, 2018).
- **Un toucher enregistre.** La règle est tenue : la tuile enregistre l'énergie, la bulle enregistre le mot, et il n'y a aucun bouton.

### Côté code
- Le relevé garde sa forme, `{ emotion, energie, faisais, vers }` : ni migration, ni changement de sauvegarde ou d'Analyse.
- Une table pure, par exemple `domain/carte-roue.js` (mot → place), sert seulement à dessiner la carte. On peut la corriger sans toucher aux données.
- Les définitions par défaut vont dans `domain/`, tes corrections dans `meta`.
- La « famille seule » de la v7 n'est plus proposée. Les anciens relevés restent tels quels.

### Sources A
- https://apps.apple.com/us/app/how-we-feel/id1562706384
- https://marcbrackett.com/how-we-feel-app-3/
- https://characterlab.org/tips-of-the-week/feel-free/
- https://problem2product.substack.com/p/does-how-we-feel-solve-a-problem
- https://numo.ai/community/ciawvdc/would-be-super-nice-to-have-a-more-elaborate-list-of-emotions-to-pick/md : 36 mots par zone (source unique)
- https://howwefeel.substack.com/p/what-comes-next : anneau et série, à ne pas reprendre
- https://openaccess.city.ac.uk/id/eprint/15259/ : Gaigg, Cornell et Bird, 2018
- La liste complète est au §11 de `hwf-placement.md`.

---

## B. Bien-être, à la Petit BamBou

### Ce que fait Petit BamBou
- **L'accueil** : un grand rond, le titre, la durée et un gros bouton « Commencer ». En version gratuite, une carte de programme a un bouton lecture rond qui lance la séance suivante en un toucher (captures App Store).
- **Le lecteur** : plein écran d'une seule couleur, un rond au centre, une barre de temps, les boutons −15 s, pause et +15 s, et une croix pour fermer.
- **La respiration libre** : une rosace qui s'ouvre et se ferme, le mot « Inspirez » et une barre de temps.
- **Les sons** : des gongs de début, intermédiaires et de fin sont documentés pour la méditation libre. Pour les séances guidées et la respiration, rien n'est documenté (NV).
- **Ce qu'on ne reprend pas** :
  - la cocarde « 6 séances », le temps total et la série « d'affilée » ;
  - le calendrier de pratique ;
  - l'encadré de félicitations ;
  - les rappels « coup de pouce » ;
  - la séance du jour qui disparaît en 24 h ;
  - le verrou d'ordre et l'anneau de progression des programmes.

  L'aide de Petit BamBou reconnaît elle-même que son compteur peut être « nuisible ».

### Ce que tu verrais
**L'onglet Bien-être**
- En haut, la carte **Programme** : son nom, la séance qui vient (« Les sons · 5 min · assis ») et un gros bouton lecture rond. Un toucher lance la séance. Il n'y a ni « 3/17 », ni pourcentage, ni anneau.
- La carte **Cohérence cardiaque**, plus compacte : Durée, Rythme et le bouton lecture. Le cercle passe dans le lecteur.
- La liste **Exercices**, une ligne chacun : « Scan corporel · 10 min · allongé ». Aucune marque « fait aujourd'hui ».

**Le lecteur, le même pour tout**
- **Avant de commencer** : le titre, « 8 min · assis ou allongé », une ligne de description et, au centre, un gros bouton lecture qui remplace « Commencer ».
- **Pendant l'exercice** :
  - en haut, la consigne en grand, comme aujourd'hui ;
  - au milieu, un anneau qui se remplit avec le temps, et le bouton pause au centre ;
  - dessous, « il reste 6:40 » ;
  - en bas, près du pouce : étape précédente, étape suivante, et « Terminer » en lien discret.
- **Les étapes avancent seules**, voix allumée ou non. « Suivant » ne sert plus qu'à sauter une étape.
- **Les étapes de respiration** : un disque grandit à l'inspiration et rétrécit à l'expiration, sous les mots « Inspire », « Retiens » et « Expire ».
- **La fin** :
  - trois coups de bol, et la voix dit « Fin de l'exercice. » si elle est allumée ;
  - environ 6 s plus tard, le lecteur se ferme seul et revient à Bien-être, ou au Programme ;
  - un message « Noter mon émotion » reste 6 s en bas de l'écran, puis disparaît ;
  - rien ne s'ouvre seul, et il n'y a aucune félicitation.
- **Pause, écran verrouillé, app cachée** : comme aujourd'hui, l'exercice se met en pause et la voix se coupe.

### Touchers
- Aujourd'hui, voix éteinte : de 9 à 22 touchers par exercice, 14 en moyenne (mesure v8).
- Proposé : **2** (la ligne, puis lecture). Depuis la carte Programme : **1**.

### Les sons
- Tous les sons sont fabriqués dans l'app, avec Web Audio : aucun fichier, aucun réseau.
- **Début** : un bol d'environ 4 s.
- **Changement d'étape** : un bol plus court et plus doux, joué juste avant la voix.
- **Fin** : trois bols, comme les gongs de fin de Petit BamBou.
- **Inspiration et expiration**, au choix :
  - « Souffle » (proposé) : un bruit doux qui monte pendant l'inspiration et redescend à l'expiration. On sait où on en est les yeux fermés, sans compter.
  - « Notes » : les deux notes actuelles, 440 et 330 Hz.
- **Un seul réglage**, dans le lecteur et gardé sur l'iPhone : « Son : Aucun · Repères · Repères + souffle ». La voix garde son interrupteur.
- **Pas de vibration** : Safari sur iPhone ne le permet pas (caniuse).
- **Moment difficile** garde sa respiration sur place, avec les mêmes sons.

### Tensions avec les règles
- **Le son est allumé par défaut** dans le lecteur, alors qu'il était éteint en v6. C'est ta demande.
- **Le mode silencieux.** Par défaut, le son de l'app se tait en mode silencieux et se mêle à ta musique. Le faire jouer quand même met ta musique en pause (W3C Audio Session ; MDN). Proposé : non par défaut, avec un réglage pour l'autoriser (question 7).
- **L'anneau du temps total** dit où tu en es, alors que la v7 avait retiré tout repère de position (les points « 3 sur 8 »). Mais un minuteur n'est pas un score. La question 9 te laisse choisir un anneau pour l'étape seule.
- **La fermeture automatique** ferme le lecteur et n'ouvre rien. Le lien vers l'émotion passe par un message qui s'efface seul.
- **Aucune promesse d'effet** dans les textes. Les fiches de Petit BamBou en font, pas Carnet.

### Côté code
- Un nouveau composant, `ui/composants/lecteur.js`, sert aux exercices, à la cohérence cardiaque et au programme.
- `signal-sonore.js` est étendu. Les sons sont calés sur l'horloge audio, pas sur le minuteur de 250 ms.
- La respiration accepte n'importe quels quatre temps. Il faut reprendre le cycle fixe de 10 s (`CYCLE_MS` et l'animation CSS).
- Deux champs facultatifs à ajouter aux exercices : `posture`, et `souffle` sur les étapes rythmées. Les identifiants ne changent pas.

### Sources B
Les pages d'aide ont été lues dans le navigateur, parce que la lecture automatique était refusée. Les captures ont été regardées sans être téléchargées. Je n'ai pas l'app en main.
- https://apps.apple.com/fr/app/id941222646
- https://support.petitbambou.com/hc/fr/articles/4405893211027-Prise-en-main-de-l-application
- https://support.petitbambou.com/hc/fr/articles/5792052907155-La-respiration-libre
- https://support.petitbambou.com/hc/fr/articles/4405890726419-La-m%C3%A9ditation-libre
- https://support.petitbambou.com/hc/fr/articles/4404694438803-Comment-fonctionne-mon-historique
- https://support.petitbambou.com/hc/fr/articles/360000299093-Pourquoi-suis-je-oblig%C3%A9-de-faire-les-s%C3%A9ances-dans-l-ordre
- https://support.petitbambou.com/hc/fr/articles/4407065966355 : encadré de félicitations
- https://apps.apple.com/fr/app/respirelax/id515900420
- https://caniuse.com/mdn-api_navigator_vibrate
- https://w3c.github.io/audio-session/
- https://developer.mozilla.org/docs/Web/API/AudioSession/type
- https://bugs.webkit.org/show_bug.cgi?id=254545 : écran maintenu allumé dans l'app installée

---

## C. Le programme sur plusieurs semaines

### Ce qu'il contient
- 8 étapes et 17 séances de 1 à 10 min. Chaque étape a une séance principale et une séance courte.
- L'ordre suit deux sources :
  - le premier cycle de la sophrologie : le corps, puis le futur et le passé, puis les valeurs (rapport Inserm, 2020) ;
  - le programme MAPs pour le TDAH de l'adulte : les sons, puis le corps, puis les pensées, avec des durées qui montent de 5 à 15 min.

| Étape | Séance principale | Séance courte ou variante |
|---|---|---|
| Respirer | Premiers pas (composée) | Pause d'une minute |
| Autour de toi | Les sons (nouvelle) | Ancrage 5-4-3-2-1 |
| Les cinq zones | Les cinq zones (nouvelle) | Respiration carrée |
| Tendre et relâcher | Relaxation dynamique des épaules | Mouvements lents (nouvelle) |
| Zone par zone | Tension et détente | Faire le point avec mon corps (nouvelle) |
| Marcher, respirer en rythme | Marche lente (nouvelle) | Cohérence cardiaque, 5 min |
| Un lieu, un souvenir | Lieu ressource | Un bon moment passé, puis Un moment à venir (nouvelles) |
| Le corps entier, ce qui compte | Scan corporel | Ce qui compte pour moi (nouvelle) |

- **Les textes.** 8 séances reprennent tes exercices sans changer leurs textes. 9 sont à écrire, plus deux blocs communs : « Arriver » (60 s) et « Revenir » (55 s). Les brouillons sont au §5 de `programme-sophro.md`, à relire comme en v7.
- **Le rythme** est écrit une seule fois et jamais mesuré : « une étape par semaine, une ou deux séances ». C'est plus léger que chez les sophrologues (10 à 15 min par jour) ou dans le MBSR (45 à 60 min par jour).
- **Les précautions d'écriture** :
  - les yeux ouverts sont permis, et on peut bouger ;
  - on ne retient jamais son souffle de force ;
  - on ne demande jamais de porter attention au cœur ;
  - les souvenirs sont décrits par les sens ;
  - chaque séance rappelle « tu peux t'arrêter à tout moment ».

### Ce que tu verrais
- **Sur Bien-être**, la carte Programme décrite en B. Son bouton lecture propose la séance qui **suit la dernière faite**, jamais une séance sautée. Après la dernière séance, il revient à la première.
- **Sur l'écran Programme**, ouvert d'un toucher sur la carte : une carte par étape, avec son titre. Dans chaque carte, ses séances, avec leur titre et « 5 min · assis ».
  - Une séance faite : une petite coche et « Faite le 12/10 », avec la date la plus récente.
  - Une séance pas faite : rien. Ni case vide, ni gris, ni « manquée », ni « en retard ».
  - Tout est ouvert, rien n'est verrouillé : chaque séance se lance d'un toucher.
  - Un appui long sur une séance propose « Marquer comme faite » (par exemple chez le sophrologue) ou « Retirer la marque ».
- **En fin de séance**, le lecteur se ferme seul et revient au Programme. La séance porte sa date.
- **Le programme fini** ne déclenche rien : pas d'écran « Terminé ! ».
- **Rien ailleurs** : ni rappel, ni ligne dans Aujourd'hui, ni Export PSY, ni Vue soignants.

### Touchers
- Reprendre : **1** toucher depuis Bien-être.
- Une séance au choix : **3** (la carte, la séance, lecture).

### Tensions avec les règles
- **Le suivi contre « aucun compteur ».** Une liste de séances faites se compte à l'œil, et une date absente se voit. C'est le prix minimal d'un suivi « fait ou non ». Pour le réduire :
  - aucun nombre, total, pourcentage, barre ni anneau ;
  - aucune date de début : Carnet ne peut jamais dire « semaine 3 » ni « en retard » ;
  - aucun numéro d'étape à l'écran (proposé ; question 14) ;
  - rien sur ce qui n'est pas fait ;
  - pas de « il y a 12 jours », car une durée qui s'allonge est un compteur ;
  - pas de bouton « Recommencer », qui demanderait une date de départ. Refaire une séance met simplement sa date à jour.
- **Aucun avis clinique, aucune promesse.** Le programme se présente comme « inspiré de la sophrologie et de la pleine conscience ». Il n'emploie pas les noms déposés « Méthode Caycedo » et « RDC ».
- **Les preuves**, pour savoir ce qu'on peut écrire :
  - sophrologie : preuves très faibles. L'Inserm (2020) ne peut ni affirmer ni infirmer son efficacité.
  - respiration lente : preuves modérées (Laborde 2022 ; Goessl 2017).
  - pleine conscience chez l'adulte autiste ou TDAH : preuves faibles à modérées (Spek 2013 ; Janssen 2019).
  - effets gênants : ils existent. Dans un programme de pleine conscience de 8 semaines, 58 % des participants en ont vécu au moins un, jugé négatif (Britton 2021). D'où la sortie toujours possible.

### Côté code
- Un module pur, `domain/programme.js`, avec les étapes, `derniereFois()` et `suite()`.
- Le store `seances` reçoit un champ `fin: true` pour « menée au bout ». Il faut passer au format de sauvegarde 6 et adapter l'export et la vérification. Les séances d'avant n'ont pas ce champ.
- Une méta `programme` garde les marques posées à la main.
- Un exercice lancé depuis la liste compte aussi pour le programme, puisque c'est le même contenu.

### Sources C
- https://www.inserm.fr/wp-content/uploads/2021-02/inserm-rapportthematique-sophrologie-2021.pdf (lu en entier)
- https://doi.org/10.1016/j.cbpra.2014.10.002 : MAPs, Mitchell, Zylowska et Kollins 2015 (texte intégral)
- https://www.ummhealth.org/services-treatments/center-mindfulness/mindfulness-programs/mbsr/mbsr-outline : MBSR
- https://doi.org/10.1016/j.neubiorev.2022.104711 : Laborde 2022
- https://doi.org/10.1017/S0033291717001003 : Goessl 2017
- https://doi.org/10.1016/j.ridd.2012.08.009 : Spek 2013
- https://doi.org/10.1017/S0033291718000429 : Janssen 2019
- https://doi.org/10.1177/2167702621996340 : Britton 2021
- NV : les adaptations de Spek 2013 pour l'autisme, que je n'ai pas lues en texte intégral ; la recommandation de la HAS sur le TDAH de l'adulte, annoncée pour fin 2025.
- La liste complète est au §9 de `programme-sophro.md`.

---

## Ordre proposé
1. **Le lecteur** (B) : les étapes qui avancent seules, les bols, la fermeture. Aucune donnée nouvelle.
2. **L'écran Émotion en carte** (A), avec les définitions. Aucune donnée nouvelle, mais 79 définitions et 79 placements à relire.
3. **Le souffle sonore et les rythmes à quatre temps** (B).
4. **Le programme** (C). C'est le plus gros chantier : données, sauvegarde, 9 textes à écrire et à relire.

## À relire, quand tu veux
- Les 79 définitions.
- La place des 31 mots discutables (`hwf-placement.md`, §9).
- Les 9 textes de séance et les 2 blocs communs (`programme-sophro.md`, §5).

## Tes questions
Réponds « tout comme proposé », ou donne seulement les numéros à changer.

**Émotion**

1. La carte range-t-elle les mots agréables à droite et les désagréables à gauche, comme How We Feel ? **Oui** (proposé) / Non.
2. Écrire « plutôt désagréable » et « plutôt agréable » au-dessus des deux colonnes de tuiles ? **Oui** (proposé) / Non.
3. L'énergie est-elle choisie au 1er toucher, et jamais devinée d'après le mot ? **Oui** (proposé) / Non.
4. Pour lire le sens d'un mot sans le choisir : **un appui long** (proposé) / un bouton « ? ».
5. « Ce que je faisais » est-il replié à chaque ouverture, pour que l'écran se ferme toujours seul ? **Oui** (proposé) / Non.
6. Veux-tu relire la place des 31 mots discutables avant la publication ? **Oui** (proposé) / Je te fais confiance.

**Bien-être**

7. Le son doit-il jouer même en mode silencieux, ce qui met ta musique en pause ? **Non par défaut, avec un réglage** (proposé) / Toujours.
8. Pour respirer : **un souffle continu** (proposé) / deux notes.
9. L'anneau montre le temps : **de tout l'exercice** (proposé) / de l'étape en cours.
10. Après la fin : **le message « Noter mon émotion » pendant 6 s** (proposé) / rien.

**Programme**

11. Son nom : **« Programme »** (proposé) / un autre (lequel ?).
12. Une séance faite affiche : **une coche et « Faite le 12/10 »** (proposé) / la date seule.
13. « Faite » veut dire : **menée jusqu'au bout** (proposé) / dès 1 minute.
14. Les étapes affichent : **leur titre seul** (proposé) / « Semaine 1 » à « Semaine 8 ».
15. Pouvoir marquer une séance faite à la main, par un appui long ? **Oui** (proposé) / Non.
16. Les 9 nouvelles séances apparaissent-elles aussi dans la liste de Bien-être ? **Oui** (proposé) / Seulement dans le programme.
