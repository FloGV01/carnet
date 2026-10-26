# How We Feel → Carnet : placer la roue sur la carte énergie × agréabilité

Note de travail v8, 24/10/2026. Pas suivi par git. Rien n'est décidé : tout ce qui suit est à valider par l’utilisateur.

## 1. En bref

- **La forme de How We Feel (HWF)** : on ne choisit pas d'abord une famille d'émotions. On choisit d'abord **une zone** sur une carte à deux axes : l'énergie (haut/bas) et l'agréable (gauche/droite). Ensuite seulement, on choisit **un mot** parmi les mots voisins. Chaque mot a **une courte explication**. C'est ce qui aide quand on ne sait pas nommer : on répond d'abord à deux questions sur le corps, sans avoir besoin du vocabulaire.
- **Transposition proposée** : une seule carte continue pour les 79 mots de la roue. Chaque mot y garde la **couleur de sa famille**. Le **1er toucher** choisit l'énergie (Haute, Moyenne ou Basse) et un côté de la carte, le **2e** choisit le mot. Il y a **2 touchers au lieu de 3** et **rien n'est déduit**.
- **L'énergie ne doit pas être déduite du mot.** Dans Carnet, l'énergie mesure ta réserve, alors que la hauteur d'un mot sur la carte mesure l'activation de l'émotion. Pour gagner un toucher, il vaut mieux poser la question de l'énergie en premier.
- **Tension à trancher** : copier la forme HWF, c'est montrer un axe agréable ↔ désagréable. Les règles de départ l'interdisaient (`docs/design/prompt-claude-design.md:25`). La v7 n'a levé cette règle que pour les couleurs. Il faut une **seconde levée**, avec des garde-fous (§6), ou bien la variante sans cet axe (§4, option B).

## 2. Ce que fait HWF (constats)

Légende : **[S]** confirmé par au moins une source écrite (liste au §10) ; **[NV]** non vérifié, c'est-à-dire un souvenir de l'app ou une source unique fragile. Je n'ai pu consulter aucune capture d'écran : les pages qui en ont ne sont pas lisibles sans navigateur.

### 2.1 La carte, ou « Mood Meter »
- [S] Elle a deux axes. L'**énergie** est verticale, haute en haut. L'**agréable** est horizontal, désagréable à gauche et agréable à droite. Le modèle vient de la recherche sur le « circumplex » des émotions (Brackett, RULER, Yale).
- [S] Elle a **quatre zones de couleur** :
  - en haut à gauche, **rouge** : énergie haute, désagréable (colère, panique) ;
  - en haut à droite, **jaune** : énergie haute, agréable (joie, enthousiasme) ;
  - en bas à gauche, **bleu** : énergie basse, désagréable (tristesse, « meh », épuisé) ;
  - en bas à droite, **vert** : énergie basse, agréable (calme, en sécurité, apaisé).
- [S] Elle compte **144 mots**, soit 36 par zone (12 × 12 au total) [S pour 144 ; 36 par zone : un seul témoignage d'utilisateur, nov. 2025].
- [S] **Gradient** : « plus la couleur est profonde, plus l'émotion est intense » (éditorial App Store). Les mots doux sont près du centre, les plus forts vers les bords et les coins [S, un seul témoignage].
- [S] La zone choisie ne fait que **fixer le point de départ**. On peut voir toute la grille et passer dans une zone voisine [S, un seul témoignage].
- [NV] **Geste** : la grille est un champ de bulles rondes qu'on fait glisser dans tous les sens. Les bulles rétrécissent vers le bord de l'écran. Toucher une bulle l'agrandit, affiche le mot en gros et son explication en bas, puis une flèche permet de continuer. Je n'ai trouvé aucune source écrite qui décrive le geste : à vérifier sur l'app.
- [S] **Formes** : les designers de HWF ont dessiné les émotions comme des formes abstraites, avec des « bords pointus et dentelés » pour l'énergie haute et des courbes douces pour le calme. La carte réagit au toucher, avec retour haptique (Metal, SceneKit). L'app a été finaliste des Apple Design Awards 2024 (catégorie « Social Impact »).

### 2.2 Définitions et mots manquants
- [S] **Chaque mot a une courte explication** de ce qu'on ressent. L'App Store parle d'une matrice de couleurs « with explanations ». Plusieurs utilisateurs disent que c'est ce qui les aide le plus à choisir.
- [S] On peut **chercher un mot** avec la loupe de l'écran de saisie. S'il n'existe pas, on peut **créer sa propre émotion** : on lui donne un nom, on choisit sa zone et on écrit sa description (billet du 01/06/2026). La version 1.17.4 (mai 2026) a corrigé la recherche des descriptions personnalisées.

### 2.3 Après le mot
- [S] Des **étiquettes facultatives** : où (maison, travail…), avec qui, ce que je fais. Puis un texte libre, une photo ou une note vocale.
- [S] Depuis la version 1.15.3 (23/10/2025), la **carte des sensations du corps** se remplit dans la vue des étiquettes, **après** le mot.
- [S] Ensuite, l'app propose des **stratégies** : 36 courtes vidéos en quatre thèmes. Une revue hebdomadaire par IA demande au moins 3 saisies dans la semaine.
- [NV] Une source (un blog de thérapeute, 2025) dit qu'on choisit **deux** mots. Aucune autre source ne le confirme. Une autre source parle d'un enregistrement rapide par appui long (nov. 2023), sans confirmation non plus.

### 2.4 Nombre de touchers et temps
- [NV] Le minimum est d'environ 4 touchers : la zone, le mot, la flèche pour continuer, puis la validation sur l'écran des étiquettes.
- [S] Les utilisateurs parlent d'« environ 10 secondes » (2023) et de « deux minutes au plus » avec les étiquettes (2025).

### 2.5 Ce qui aide quelqu'un qui ne sait pas nommer
1. [S] La **première question n'est pas un nom d'émotion**. Brackett l'explique : il est facile de dire « je suis dans le jaune », puis on affine avec des questions. Il présente l'énergie comme « combien d'énergie tu as ».
2. [S] Les **mots voisins** sont visibles ensemble, du plus doux au plus fort : on compare plutôt que de formuler.
3. [S] **L'explication du mot** permet de vérifier que c'est le bon.
4. [S] Si aucun mot ne convient, on peut en **ajouter un à soi**.

### 2.6 Ce qu'on ne copie pas, à cause des règles de Carnet
- [S] **L'anneau et la série** de jours affichés sous le bouton de saisie, dans l'onglet Today (billet du 23/07/2026) : c'est une mécanique d'engagement, interdite.
- [S] Le planning de rappels, le partage avec des amis, la revue par IA et les stratégies proposées après la saisie : réseau, engagement ou avis.
- Les étiquettes « où » et « avec qui » : hors de la demande. « Ce que je faisais » existe déjà dans Carnet.

## 3. Ce qui ne change pas dans Carnet
- **Vocabulaire** : les 79 mots et leurs identifiants `roue:<famille>:<mot>`, dans `domain/roue.js`, restent figés.
- **Couleurs** : celles des familles (`--c-emo-*`), puisque tu as demandé de respecter le code couleur de la roue.
- **Relevé** : il garde la même forme, `{ emotion, energie, faisais, vers }`. Il n'y a ni migration, ni changement de sauvegarde, ni changement de l'Analyse.
- **La position d'un mot n'est jamais stockée.** C'est une table pure, par exemple `domain/carte-roue.js` (mot → A, E), qui sert seulement à dessiner la carte. Elle peut être corrigée sans toucher aux données.

## 4. Transposition proposée

### Option A : la carte HWF, énergie au 1er toucher (recommandée si la règle est levée)
- **Toucher 1** : six tuiles sur deux colonnes (gauche, droite) et trois rangées (**Haute, Moyenne, Basse**). La rangée touchée **est la réponse « Énergie »** : elle est enregistrée telle quelle, comme aujourd'hui. Chaque tuile montre 2 ou 3 mots d'exemple, à la couleur de leur famille.
- **La carte s'ouvre** sur la zone touchée, de 6 à 27 mots. On peut la faire glisser vers les zones voisines : c'est une seule carte continue, comme HWF.
- **Toucher 2** : le mot. Il est enregistré et sa définition courte s'affiche sous la carte. Ensuite, l'écran se ferme seul, avec les mêmes exceptions qu'aujourd'hui : « Ce que je faisais » ouvert, ou la règle « Me ressourcer ».
- **Mot touché dans une autre rangée que l'énergie choisie** : par exemple « Irrité » avec une énergie Basse. C'est **permis et voulu** : le mot dit l'émotion, la tuile dit la réserve.
- **Corriger** : retoucher le mot l'efface, comme en v7. « ‹ Énergie » ramène aux tuiles.
- **Voir toute la carte** : un lien sous les tuiles ouvre la carte sans énergie (un champ vide est une donnée valide).
- **Bilan** : 2 touchers au lieu de 3, sans aucune valeur déduite.

### Option B : énergie × familles, sans axe agréable (si la règle n'est pas levée)
- La rangée d'énergie se choisit au 1er toucher, comme dans l'option A. Ensuite, la bande montre **tous les mots de cette énergie**, rangés par famille dans l'ordre de la roue, et non de gauche à droite selon l'agréable.
- Il y a 2 touchers et **aucun axe d'agréabilité**. En revanche, on perd l'aide « plutôt agréable ou plutôt désagréable ? », et une bande montre jusqu'à 39 mots (la bande Moyenne).

### Option C : HWF strict (4 zones, puis le mot, puis l'énergie)
- C'est la plus fidèle à HWF. Elle demande **3 touchers**, comme aujourd'hui, et fait **poser deux questions d'énergie** : celle de la zone, puis celle du relevé. Je la déconseille.

### Disposition de la carte (options A et B)
- Les rangées suivent E, du haut vers le bas. Dans une rangée, les mots vont du bord vers le centre selon A.
- Dans chaque zone, les mots d'une même famille sont **côte à côte**. Les couleurs forment alors des taches lisibles, et non un damier.
- La carte est **toujours la même** : aucun mot n'est mis en avant ou remonté selon l'usage.
- Les cibles font 44 pt au moins. Sans mouvement (« Réduire les animations »), il n'y a pas de glisser animé : on passe d'une zone à l'autre par des flèches.
- **Pas de gradient d'intensité** au départ (« en plus simple »). La règle v7 « toutes les bulles d'une famille ont la même couleur » reste.

## 5. Couleurs : familles ou zones ?
- **Je propose les couleurs des familles.** C'est ta demande, et c'est ce que l'Analyse v7 utilise déjà.
- **Conséquence** : une zone n'a pas une couleur, elle mélange plusieurs familles. Par exemple, le haut gauche est rouge, orange, bleu et violet (§9). Les tuiles du 1er toucher ne peuvent donc pas être « la zone rouge » : elles montrent des mots d'exemple colorés.
- **Piège** : tes couleurs ne suivent pas celles de HWF. Chez toi, le bleu est Surprise et pas la tristesse, le vert est Joie et pas le calme, le jaune-olive est Tristesse et pas la joie. Si tu utilises aussi HWF, cela peut troubler.
- **Couleurs des zones HWF** (rouge, jaune, bleu, vert) : tes familles disparaîtraient de l'écran, et l'Analyse resterait aux couleurs des familles. Je déconseille.

## 6. La règle « ne pas distinguer agréable et désagréable »
- **D'où elle vient** :
  - le brief de départ : `docs/design/prompt-claude-design.md:25`, puis `prompt-claude-design-v2.md:64` ;
  - la v7 l'a levée **pour les couleurs seulement** (spec v7 §2, `docs/decisions.md:218`) ;
  - l'anti-objectif v7 dit : « aucun mot comme "positive" ou "négative", aucun score d'agréabilité ».
- **La tension** : l'axe horizontal de HWF *est* l'agréable. Même sans aucun libellé, la carte place les mots désagréables à gauche et tu l'apprendras vite. Copier la forme revient donc à **distinguer par la position**. C'est une seconde levée de la règle, qui te revient.
- **Garde-fous proposés si tu la lèves** :
  1. La position sert seulement à trouver un mot. Elle n'est **jamais stockée** ni calculée : pas de « côté » dans l'Analyse, pas de proportion à gauche ou à droite, pas de courbe.
  2. Les mots « positif », « négatif », « bon » et « mauvais » n'apparaissent jamais.
  3. Les libellés d'axe sont à choisir (question 2) : aucun, ou « désagréable / agréable », les mots de HWF.
  4. Les couleurs restent celles des familles : il n'y a pas de zone rouge qui voudrait dire « mal ».
  5. Le centre n'est pas un idéal : on n'y affiche rien.
- **Si tu ne la lèves pas** : option B.

## 7. Peut-on déduire l'énergie de la position du mot ?
- **Techniquement, oui** : la table du §9 donne une bande à chaque mot, et l'écran tomberait à 2 touchers, zone puis mot, sans question d'énergie.
- **Je le déconseille, pour quatre raisons** :
  1. **Ce n'est pas la même mesure.** L'énergie de Carnet est ta réserve. Elle nourrit Comprendre › Énergie, l'énergie basse par jour, « pesé » et « rechargé », et la règle « Me ressourcer ». La hauteur d'un mot dit seulement à quel point l'émotion active. « Irrité » quand tu es à plat est courant, surtout en AuDHD. Déduire « Moyenne » cacherait cette énergie basse : « Me ressourcer » ne jouerait pas et l'Analyse Énergie serait faussée.
  2. **« Rien par défaut, un toucher enregistre »** : une valeur déduite est une valeur que tu n'as pas donnée.
  3. **31 mots sur 79 sont ambigus** (§9). Accablé, par exemple, peut être en bas (écrasé) ou en haut (submergé).
  4. **Alexithymie** : chez les personnes alexithymiques, l'activation ressentie suit mal l'activation du corps (Gaigg, Cornell et Bird, 2018). Le mot est choisi pour son sens, pas pour sa hauteur.
- **Pour gagner le toucher quand même** : poser l'énergie en premier (option A). Elle est choisie, pas déduite, et elle oriente la carte. Brackett lui-même formule l'énergie comme « combien d'énergie tu as ».

## 8. Définitions et fermeture
- **Ta demande** : une définition courte écrite par Carnet et modifiable par toi, et un écran qui se ferme une fois rempli.
- **Conflit** : si toucher un mot l'enregistre et ferme l'écran, la définition n'est jamais lue.
- **Proposition** : un bouton **« Sens des mots »** (?) en tête de la carte, éteint au départ et retenu sur l'appareil.
  - **Éteint** : toucher le mot l'enregistre, la définition s'affiche, puis l'écran se ferme environ 1,5 s plus tard. Chaque toucher relance ce délai, comme la piste Q4 de `pistes-v8.html`.
  - **Allumé** : un toucher montre la définition sans choisir le mot, et un second toucher sur le même mot le choisit. C'est le cas « j'ai du mal à choisir », et l'équivalent de la flèche de HWF.
- **Les définitions** : un texte par défaut dans `domain/` (pur, pas figé comme le vocabulaire), et tes corrections dans `meta`. Le sens retenu pour chaque mot ambigu, au §9, peut servir de première version.

## 9. Tableau complet : mot → zone et énergie

**Échelles**
- **A** (agréable, de gauche à droite) va de 1 à 6. 1 est le bord gauche, le plus désagréable ; 3 et 4 sont de part et d'autre du centre ; 6 est le bord droit, le plus agréable.
- **E** (énergie, de bas en haut) va de 1 à 6 :
  - zone HWF : E 4 à 6 = moitié haute, E 1 à 3 = moitié basse ;
  - bande Carnet : E 5-6 = Haute, E 3-4 = Moyenne, E 1-2 = Basse.

**Méthode** : ces valeurs sont **mon jugement**. Elles suivent les placements habituels du modèle circumplex et le sens français du mot. Elles **ne sont pas mesurées**. Les normes affectives des mots français FAN (Monnier et Syssau, 2014 : valence et activation de 1 031 mots) pourraient servir à vérifier les mots qui s'y trouvent. Je ne les ai pas consultées : je n'ai rien téléchargé. La meilleure validation reste la tienne : c'est ta carte.

### 9.1 Comptes
- haut-gauche (rouge chez HWF) : **22 mots** — Colère 10, Dégoût 4, Surprise 3, Peur 5
- haut-droite (jaune chez HWF) : **14 mots** — Joie 12, Surprise 2
- bas-gauche (bleu chez HWF) : **31 mots** — Colère 6, Dégoût 3, Tristesse 12, Surprise 3, Peur 7
- bas-droite (vert chez HWF) : **12 mots** — Joie 4, Sérénité 8
- Côté gauche : 53 mots ; côté droit : 26 mots.
- Bandes Carnet : Haute (E5-6) 17 · Moyenne (E3-4) 39 · Basse (E1-2) 23.
- Mots signalés ambigus : 31 sur 79.
Le côté gauche a deux fois plus de mots que le droit, alors que les zones de HWF sont égales (36 chacune). Les zones de la carte de Carnet n'auront donc pas toutes la même densité. Une tuile de l'option A montre de 6 mots (Basse, à droite) à 27 mots (Moyenne, à gauche).

### 9.2 La carte (A en colonnes, E en rangées)
Familles abrégées : Co Colère, Dg Dégoût, Tr Tristesse, Jo Joie, Su Surprise, Pe Peur, Sé Sérénité. ‖ marque le centre horizontal ; ═══ sépare la moitié haute de la moitié basse.

| E \ A | 1 (bord gauche) | 2 | 3 | ‖ 4 | 5 | 6 (bord droit) |
|---|---|---|---|---|---|---|
| 6 (haut) | Furieux (Co) · Enragé (Co) · Terrifié (Pe) |  |  | ‖  | Énergique (Su) | Extasié (Jo) |
| 5 | Hostile (Co) · Révolté (Dg) | Effrayé (Su) · Choqué (Su) | Provocateur (Co) · Abasourdi (Su) | ‖ Provocant (Jo) · Avide (Su) | Inspiré (Jo) · Espiègle (Jo) · Courageux (Jo) · Amusé (Jo) |  |
| 4 | Répugnant (Dg) · Dégoût (Dg) · Ridiculisé (Pe) | Embarrassé (Co) · Jaloux (Co) · Irrité (Co) · Aversion (Dg) · Craintif (Pe) · Non respecté (Pe) | Défiant (Co) · Suspect (Co) · Sarcastique (Co) · Préoccupé (Pe) | ‖ Curieux (Jo) | Optimiste (Jo) · Important (Jo) · Confiant (Jo) | Accompli (Jo) · Libéré (Jo) |
| ═══ | ═══ | ═══ | ═══ | ═══ | ═══ | ═══ |
| 3 | Détestable (Dg) · Honteux (Tr) · Accablé (Pe) · Exclus (Pe) | Insécurisé (Co) · Amer (Co) · Mécontent (Co) · Jugé (Dg) · Fautif (Tr) · Vulnérable (Tr) · Consterné (Su) | Sceptique (Co) · Hésitant (Dg) · Perplexe (Su) | ‖ Sensible (Jo) · Posé (Sé) | Ouvert (Jo) · Aimant (Jo) · Respecté (Jo) · Reposé (Sé) |  |
| 2 | Dévasté (Co) · Impuissant (Tr) · Minable (Tr) · Abandonné (Tr) | Ignoré (Tr) · Isolé (Tr) · Désillusionné (Su) · Incapable (Pe) · Inférieur (Pe) · Inadéquat (Pe) | Retiré (Co) | ‖  | Calme (Sé) · Apaisé (Sé) · Détendu (Sé) · En sécurité (Sé) | Serein (Sé) |
| 1 (bas) | Sans valeur (Pe) | Vide (Tr) · Insignifiant (Pe) | Replié (Tr) · Amorphe (Tr) · Indifférent (Tr) | ‖  | Tranquille (Sé) |  |

### 9.3 Les 79 mots

| # | Mot | Famille | A (1-6) | E (1-6) | Zone (couleur HWF équivalente) | Bande d'énergie Carnet | Mot ambigu : sens retenu pour le placer |
|---|---|---|---|---|---|---|---|
| 1 | Embarrassé | Colère | 2 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : Plus proche de la honte que de la colère. Retenu : la gêne qui fait rougir, donc active. |
| 2 | Dévasté | Colère | 1 | 2 | bas-gauche (bleu) | Basse | **ambigu** : Famille Colère mais énergie basse (effondré). « Dévasté de rage » serait en haut à gauche (E5). |
| 3 | Insécurisé | Colère | 2 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : Plus proche de Peur. E3 ou E4 selon que l'inquiétude agite ou non. |
| 4 | Jaloux | Colère | 2 | 4 | haut-gauche (rouge) | Moyenne |  |
| 5 | Amer | Colère | 2 | 3 | bas-gauche (bleu) | Moyenne |  |
| 6 | Défiant | Colère | 3 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : Deux sens : « méfiant » (A2, E3) ou « qui tient tête » (A3, E5). Retenu : qui tient tête, au milieu. |
| 7 | Furieux | Colère | 1 | 6 | haut-gauche (rouge) | Haute |  |
| 8 | Enragé | Colère | 1 | 6 | haut-gauche (rouge) | Haute |  |
| 9 | Provocateur | Colère | 3 | 5 | haut-gauche (rouge) | Haute | **ambigu** : Une attitude plus qu'une émotion ; peut être vécu comme plaisant (taquiner). |
| 10 | Hostile | Colère | 1 | 5 | haut-gauche (rouge) | Haute |  |
| 11 | Mécontent | Colère | 2 | 3 | bas-gauche (bleu) | Moyenne |  |
| 12 | Irrité | Colère | 2 | 4 | haut-gauche (rouge) | Moyenne |  |
| 13 | Retiré | Colère | 3 | 2 | bas-gauche (bleu) | Basse | **ambigu** : Retenu : « en retrait », se mettre à distance. Énergie basse malgré la famille Colère. |
| 14 | Suspect | Colère | 3 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : En français, « suspect » = qui éveille les soupçons. Retenu : soupçonneux, sur ses gardes. |
| 15 | Sceptique | Colère | 3 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : Très près du centre : peu d'énergie, peu désagréable. |
| 16 | Sarcastique | Colère | 3 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : Une façon de parler plus qu'une émotion. |
| 17 | Jugé | Dégoût | 2 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : « Jugé » (subi) ou « qui juge » (sens de la roue anglaise d'origine). Retenu : se sentir jugé. |
| 18 | Aversion | Dégoût | 2 | 4 | haut-gauche (rouge) | Moyenne |  |
| 19 | Répugnant | Dégoût | 1 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : Qualifie ce qui dégoûte. Retenu : éprouver de la répugnance. « Je me sens répugnant » serait plus bas (E2). |
| 20 | Révolté | Dégoût | 1 | 5 | haut-gauche (rouge) | Haute | **ambigu** : Dégoût moral, ou « en révolte » (plus proche de Colère, E6). |
| 21 | Dégoût | Dégoût | 1 | 4 | haut-gauche (rouge) | Moyenne |  |
| 22 | Détestable | Dégoût | 1 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : « Je me trouve détestable » (E2) ou « c'est détestable » (E4). Retenu : entre les deux. |
| 23 | Hésitant | Dégoût | 3 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : Peu lié au dégoût. Très près du centre. |
| 24 | Fautif | Tristesse | 2 | 3 | bas-gauche (bleu) | Moyenne |  |
| 25 | Honteux | Tristesse | 1 | 3 | bas-gauche (bleu) | Moyenne |  |
| 26 | Ignoré | Tristesse | 2 | 2 | bas-gauche (bleu) | Basse |  |
| 27 | Replié | Tristesse | 3 | 1 | bas-gauche (bleu) | Basse |  |
| 28 | Impuissant | Tristesse | 1 | 2 | bas-gauche (bleu) | Basse |  |
| 29 | Vulnérable | Tristesse | 2 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : Peut être agité (proche de Peur, E4) ou une ouverture assumée (côté droit). |
| 30 | Minable | Tristesse | 1 | 2 | bas-gauche (bleu) | Basse |  |
| 31 | Vide | Tristesse | 2 | 1 | bas-gauche (bleu) | Basse | **ambigu** : Engourdi plutôt que douloureux : pas au bord gauche. |
| 32 | Abandonné | Tristesse | 1 | 2 | bas-gauche (bleu) | Basse |  |
| 33 | Isolé | Tristesse | 2 | 2 | bas-gauche (bleu) | Basse |  |
| 34 | Amorphe | Tristesse | 3 | 1 | bas-gauche (bleu) | Basse | **ambigu** : Décrit aussi le corps (comme Reposé ou Énergique). |
| 35 | Indifférent | Tristesse | 3 | 1 | bas-gauche (bleu) | Basse | **ambigu** : Peut être neutre (ni l'un ni l'autre côté) : placé contre le centre. |
| 36 | Inspiré | Joie | 5 | 5 | haut-droite (jaune) | Haute |  |
| 37 | Ouvert | Joie | 5 | 3 | bas-droite (vert) | Moyenne |  |
| 38 | Espiègle | Joie | 5 | 5 | haut-droite (jaune) | Haute |  |
| 39 | Sensible | Joie | 4 | 3 | bas-droite (vert) | Moyenne | **ambigu** : « Touché, réceptif » (côté droit) ou « à fleur de peau » (A2, E4). Retenu : touché. |
| 40 | Optimiste | Joie | 5 | 4 | haut-droite (jaune) | Moyenne |  |
| 41 | Aimant | Joie | 5 | 3 | bas-droite (vert) | Moyenne |  |
| 42 | Provocant | Joie | 4 | 5 | haut-droite (jaune) | Haute | **ambigu** : Sens de la roue d'origine : taquin, audacieux. En français, souvent « aguicheur » ou « qui cherche le conflit ». |
| 43 | Courageux | Joie | 5 | 5 | haut-droite (jaune) | Haute |  |
| 44 | Accompli | Joie | 6 | 4 | haut-droite (jaune) | Moyenne |  |
| 45 | Respecté | Joie | 5 | 3 | bas-droite (vert) | Moyenne |  |
| 46 | Important | Joie | 5 | 4 | haut-droite (jaune) | Moyenne | **ambigu** : Retenu : compter pour les autres. Pas « se croire important ». |
| 47 | Curieux | Joie | 4 | 4 | haut-droite (jaune) | Moyenne |  |
| 48 | Amusé | Joie | 5 | 5 | haut-droite (jaune) | Haute |  |
| 49 | Extasié | Joie | 6 | 6 | haut-droite (jaune) | Haute |  |
| 50 | Libéré | Joie | 6 | 4 | haut-droite (jaune) | Moyenne | **ambigu** : « Soulagé » (E2-3) ou « libre, léger » (E5). Retenu : entre les deux. |
| 51 | Confiant | Joie | 5 | 4 | haut-droite (jaune) | Moyenne |  |
| 52 | Énergique | Surprise | 5 | 6 | haut-droite (jaune) | Haute | **ambigu** : Un état du corps plus qu'une émotion. À ne pas confondre avec l'énergie Haute du relevé. |
| 53 | Avide | Surprise | 4 | 5 | haut-droite (jaune) | Haute | **ambigu** : Retenu : impatient, plein d'envie. Peut sonner « cupide » en français. |
| 54 | Effrayé | Surprise | 2 | 5 | haut-gauche (rouge) | Haute | **ambigu** : Très proche de Peur. Retenu : saisi, sursaut. |
| 55 | Abasourdi | Surprise | 3 | 5 | haut-gauche (rouge) | Haute | **ambigu** : Le côté dépend de la nouvelle : placé contre le centre. |
| 56 | Perplexe | Surprise | 3 | 3 | bas-gauche (bleu) | Moyenne |  |
| 57 | Désillusionné | Surprise | 2 | 2 | bas-gauche (bleu) | Basse |  |
| 58 | Consterné | Surprise | 2 | 3 | bas-gauche (bleu) | Moyenne |  |
| 59 | Choqué | Surprise | 2 | 5 | haut-gauche (rouge) | Haute |  |
| 60 | Terrifié | Peur | 1 | 6 | haut-gauche (rouge) | Haute |  |
| 61 | Craintif | Peur | 2 | 4 | haut-gauche (rouge) | Moyenne |  |
| 62 | Accablé | Peur | 1 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : « Submergé, débordé » (E5) ou « écrasé, épuisé » (E2). Le plus ambigu de la liste. |
| 63 | Préoccupé | Peur | 3 | 4 | haut-gauche (rouge) | Moyenne |  |
| 64 | Incapable | Peur | 2 | 2 | bas-gauche (bleu) | Basse |  |
| 65 | Inférieur | Peur | 2 | 2 | bas-gauche (bleu) | Basse |  |
| 66 | Sans valeur | Peur | 1 | 1 | bas-gauche (bleu) | Basse |  |
| 67 | Inadéquat | Peur | 2 | 2 | bas-gauche (bleu) | Basse | **ambigu** : Proche d'Incapable ; retenu : pas à la hauteur. |
| 68 | Insignifiant | Peur | 2 | 1 | bas-gauche (bleu) | Basse |  |
| 69 | Exclus | Peur | 1 | 3 | bas-gauche (bleu) | Moyenne | **ambigu** : Peut piquer (vers Colère, E4) ou abattre (vers Tristesse, E2). |
| 70 | Non respecté | Peur | 2 | 4 | haut-gauche (rouge) | Moyenne | **ambigu** : Plus proche de Colère. |
| 71 | Ridiculisé | Peur | 1 | 4 | haut-gauche (rouge) | Moyenne |  |
| 72 | Calme | Sérénité | 5 | 2 | bas-droite (vert) | Basse |  |
| 73 | Apaisé | Sérénité | 5 | 2 | bas-droite (vert) | Basse |  |
| 74 | Détendu | Sérénité | 5 | 2 | bas-droite (vert) | Basse |  |
| 75 | Reposé | Sérénité | 5 | 3 | bas-droite (vert) | Moyenne | **ambigu** : Décrit surtout le corps (comme Énergique). |
| 76 | Tranquille | Sérénité | 5 | 1 | bas-droite (vert) | Basse |  |
| 77 | Serein | Sérénité | 6 | 2 | bas-droite (vert) | Basse |  |
| 78 | Posé | Sérénité | 4 | 3 | bas-droite (vert) | Moyenne |  |
| 79 | En sécurité | Sérénité | 5 | 2 | bas-droite (vert) | Basse |  |
## 10. Questions pour l’utilisateur
1. **L'axe agréable** : acceptes-tu que la carte sépare les mots agréables et désagréables par leur position, avec les garde-fous du §6 (option A) ? Ou préfères-tu l'option B, sans cet axe ?
2. **Les libellés d'axe** : aucun, ou « désagréable / agréable » comme dans HWF ?
3. **L'énergie** : es-tu d'accord pour la choisir au 1er toucher, et pour qu'elle ne soit jamais déduite du mot ?
4. **Les placements** : peux-tu relire les 31 mots ambigus, surtout Accablé, Dévasté, Défiant, Provocant, Sensible, Libéré, Exclus et Effrayé ? Veux-tu pouvoir **déplacer un mot** sur ta carte dans Réglages, comme HWF laisse placer ses propres émotions ?
5. **La famille seule** (v7) : sur une carte, il n'y a plus de bulle de famille. Si aucun mot ne va, on garde l'énergie seule. Cela te convient-il ?
6. **« Sens des mots »** : bouton (?) allumé ou éteint, ou une fermeture plus lente qui laisse lire la définition ?

## 11. Sources
- How We Feel, App Store (description et historique des versions, 1.14.9 à 1.17.16) : https://apps.apple.com/us/app/how-we-feel/id1562706384
- How We Feel, billets officiels : « A Feeling of Your Own » (01/06/2026) https://howwefeel.substack.com/p/a-feeling-of-your-own · « What Comes Next » (23/07/2026, anneau et série dans Today) https://howwefeel.substack.com/p/what-comes-next · « Sensations Are Signals » (19/09/2026) https://howwefeel.substack.com/p/sensations-are-signals · « We feel grateful » (31/05/2024, formes, haptique, Apple Design Awards) https://howwefeel.substack.com/p/we-feelgrateful
- Marc Brackett, page de l'app (144 mots) : https://marcbrackett.com/how-we-feel-app-3/
- Character Lab, entretien avec M. Brackett (11/12/2022 : deux dimensions, « je suis dans le jaune », 144 émotions définies) : https://characterlab.org/tips-of-the-week/feel-free/
- Yale Medicine (01/12/2022) : https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/
- Éditorial App Store « Apps we love » (couleur plus profonde = plus intense) : https://apps.apple.com/story/id1638393948
- Témoignage d'utilisateur (23/11/2025 : 36 mots par zone, du centre vers les bords, toute la grille visible, explication de chaque mot ; source unique) : https://numo.ai/community/ciawvdc/would-be-super-nice-to-have-a-more-elaborate-list-of-emotions-to-pick/md
- J. Stephens, « Once for Proud » (08/07/2026 : axes, 144 mots, puis qui et où) : https://go.sandler.com/crossroads/insights/blog/categories/personal-development/once-for-proud/
- K. Welshofer (16/02/2025 : « quelle couleur », une description par mot) : https://katewelshofer.substack.com/p/give-me-your-tired-your-grouchy-your
- Wanted Online (23/02/2023 : où, quoi, avec qui) : https://www.wantedonline.co.za/tech-and-gadgets/2023-02-23-review-how-we-feel-app/
- The Black and White (18/12/2025 : étiquettes, rappels, deux minutes) : https://theblackandwhite.net/82061/opinion/emotional-regulation-a-look-into-the-how-we-feel-app/
- Reysu (17/09/2023 : environ 10 s, photo, note vocale) : https://reysu.beehiiv.com/p/howwefeel
- D. Szabo (28/07/2024 : agréable ou non, énergie, puis mot avec définition) : https://problem2product.substack.com/p/does-how-we-feel-solve-a-problem
- Healing Narratives (06/2025 : « deux mots », non confirmé) : https://www.healingnarrativescounselling.com/post/why-emotions-matter-and-how-the-how-we-feel-app-can-help-you-understand-yours
- Gear Patrol, Apple Design Awards 2024 (grille de quatre couleurs, gradient d'intensité) : https://www.gearpatrol.com/?p=834097
- Gaigg, Cornell et Bird (2018), *Autism*, activation ressentie et alexithymie : https://openaccess.city.ac.uk/id/eprint/15259/
- Monnier et Syssau (2014), Affective norms for French words (FAN), *Behavior Research Methods* 46(4) : https://hal.archives-ouvertes.fr/hal-03063283
- Écartées : la revue UX d'Atomic Object (2020) porte sur l'ancienne app COVID de HWF ; Grokipedia est une synthèse automatique, non retenue.
