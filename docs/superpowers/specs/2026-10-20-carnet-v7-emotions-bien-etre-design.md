# Carnet v7 : émotions du moment, Bien-être, refonte 2b (conception)

Version visée : **7.0.0**. Elle réunit la refonte visuelle 2b (plan `docs/superpowers/plans/2026-10-20-carnet-v6-2-refonte.md`, mis en pause le 20/10) et les notes de l'utilisateur du 20/10.

## 1. Intention

L'utilisateur veut **reconnaître ses émotions du moment**, et pas seulement les noter sur une échelle. La note de 1 à 10 ne dit pas ce qu'il ressent. Une roue des émotions, présentée en bulles comme dans l'app How We Feel, lui permet de **choisir un mot précis** plutôt que de formuler. Il est AuDHD : choisir est plus facile que formuler.

Il veut aussi une partie **Bien-être**, pour pratiquer (cohérence cardiaque, sophrologie) hors des moments de crise. Le raccourci de crise vers la cohérence cardiaque reste en place.

L'Analyse doit suivre : elle parle d'émotions, plus de notes, et elle montre aussi le Bien-être.

## 2. Ce que l'utilisateur a décidé (20/10)

| Sujet | Décision |
|---|---|
| Roue | **Sa roue** (image fournie) : 6 familles (Colère, Dégoût, Tristesse, Joie, Surprise, Peur), avec leurs couleurs, **plus Sérénité**. |
| Bulles | Comme How We Feel pour la forme, « en plus simple ». **Chaque bulle est un mot du 3ᵉ niveau** de la roue. |
| Humeur du moment | **La note de 1 à 10 disparaît.** Un relevé = **une émotion + l'énergie** (Basse · Moyenne · Haute). La règle « Me ressourcer » sur l'énergie basse reste. |
| Analyse | Les analyses fondées sur la note sont **remplacées par des graphiques d'émotions**. Les phrases calculées qui reposaient sur la note sont retirées. Les anciennes notes restent visibles pour les jours passés. |
| Bien-être | **Un onglet.** L'Historique rejoint l'Analyse. Onglets : Aujourd'hui · Analyse · Bien-être · Soins · Réglages. |
| Raccourci crise | Le bouton « Moment difficile » d'Aujourd'hui reste, avec la cohérence cardiaque en tête. |
| Bien-être dans l'Analyse | Oui (§6.4). |
| Apparence | Piste **2b · Cartes noires**, **police système** (pas de Lexend), **pas** de rubriques repliées en pastilles, **glisser pour changer de jour** en plus de ‹ ›, couleurs de Claude Design telles quelles. |
| API Claude | Disponible. Carnet reste **sans réseau** (CLAUDE.md) : l'API ne sert que pendant le développement, par exemple pour rédiger, jamais dans l'app. |

**Règle levée à sa demande** : le brief d'origine interdisait de distinguer par la couleur les émotions agréables des désagréables. La roue garde ses couleurs (Colère rouge, etc.). Cette exception vaut **pour la roue et les graphiques d'émotions seulement**. Ailleurs, la règle « jamais de rouge ni de vert pour dire bien ou mal » reste.

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Noter une émotion du moment en **3 touchers** : famille, mot, énergie. Aujourd'hui, humeur et énergie en prennent 2.
- Voir ses émotions dans le temps : par jour, par heure, par lieu, après une nuit, autour des explosions, autour du Bien-être.
- Pratiquer un exercice de Bien-être en quelques touchers, sans compte ni objectif.
- Toute l'app passe à l'apparence 2b.

**Non-objectifs**
- Pas d'IA dans l'app (V3).
- Pas de nouvelle phrase calculée.
- La roue n'est pas modifiable dans Réglages › Listes : c'est un vocabulaire figé.
- L'étape « Ça ressemblait plutôt à… » d'un **épisode** garde sa liste actuelle (§9, appel du concepteur).

**Anti-objectifs** (ce qui ferait échouer la v7, même si tout fonctionne)
- Un compteur de séances, une série, un « objectif du jour », un rappel qui pousse à pratiquer.
- Une émotion présentée comme bonne ou mauvaise : aucun mot comme « positive » ou « négative », aucun score d'agréabilité.
- Perdre ou masquer les anciennes notes de 1 à 10 de l'utilisateur.
- Une app plus lente à ouvrir, ou une saisie du soir qui défile.

## 4. La roue des émotions

### 4.1 Le vocabulaire

Les familles et les mots ci-dessous sont **transcrits de l'image de l'utilisateur** : les mots du 3ᵉ niveau (couronne extérieure), au masculin comme sur l'image. L'image est peu nette : **l'utilisateur relit ces listes avant la construction**.

| Famille (couleur de la roue) | Mots du 3ᵉ niveau = bulles |
|---|---|
| **Colère** (rouge) | Embarrassé, Dévasté, Insécurisé, Jaloux, Amer, Défiant, Furieux, Enragé, Provocateur, Hostile, Mécontent, Irrité, Retiré, Suspect, Sceptique, Sarcastique (16) |
| **Dégoût** (orange) | Jugé, Aversion, Répugnant, Révolté, Dégoût, Détestable, Hésitant (7 ; « Aversion » figure deux fois sur l'image, il n'y a qu'une bulle) |
| **Tristesse** (jaune-olive) | Fautif, Honteux, Ignoré, Replié, Impuissant, Vulnérable, Minable, Vide, Abandonné, Isolé, Amorphe, Indifférent (12) |
| **Joie** (vert) | Inspiré, Ouvert, Espiègle, Sensible, Optimiste, Aimant, Provocant, Courageux, Accompli, Respecté, Important, Curieux, Amusé, Extasié, Libéré, Confiant (16) |
| **Surprise** (bleu) | Énergique, Avide, Effrayé, Abasourdi, Perplexe, Désillusionné, Consterné, Choqué (8) |
| **Peur** (violet) | Terrifié, Craintif, Accablé, Préoccupé, Incapable, Inférieur, Sans valeur, Inadéquat, Insignifiant, Exclus, Non respecté, Ridiculisé (12) |
| **Sérénité** (ajoutée ; couleur et mots à valider) | Calme, Apaisé, Détendu, Reposé, Tranquille, Serein, Posé, En sécurité (8) |

- **Règles du vocabulaire** :
  - libellés exacts, jamais lissés ni réordonnés après publication (comme `declencheur` et `dessous`) ;
  - identifiants stables `roue:<famille>:<mot>` ;
  - le vocabulaire est dans `domain/roue.js`, figé une fois publié ; tout ajout futur se fait à la fin.
- **Couleurs** : la teinte de chaque famille vient de l'image (rouge, orange, jaune-olive, vert, bleu, violet). Sérénité en prend une qui ne s'y trouve pas : proposition **turquoise**.
  - Chaque famille a les six rôles de 2b (`--c-X`, `-fill`, `-on`, `-tint`, `-tint-2`, `-text`) en clair et en sombre.
  - Contraste AA pour tout texte.
  - Toutes les bulles d'une famille ont la même couleur.

### 4.2 L'écran (l'actuel « Humeur du moment »)

- **Nom** (appel du concepteur) : le bouton de la bande du bas devient **« Émotion »** et l'écran **« Émotion du moment »**. Les relevés gardent leur nom technique.
- **Toucher 1, la famille** : 7 grosses bulles rondes aux couleurs de la roue, chacune avec le nom de sa famille, dans une disposition en grappe à la How We Feel. Elles sont posées près du pouce et tiennent sur un écran.
- **Toucher 1 enregistre déjà la famille** (« un toucher enregistre ») : un relevé peut garder une famille sans mot (`roue:<famille>`), quand le mot n'est pas trouvé. *(Appel du concepteur.)*
- **Toucher 2, le mot** : les bulles de la famille (7 à 16) s'affichent en grappe, à sa couleur. On en touche une, et elle précise la famille.
  - « ‹ Familles » ramène au choix de la famille.
  - Toucher de nouveau la bulle choisie l'efface.
- **Toucher 3, l'énergie** : Basse · Moyenne · Haute, en bas, comme aujourd'hui. L'écran se ferme seul une fois l'émotion et l'énergie choisies, comme aujourd'hui avec humeur et énergie.
- **Reste inchangé** :
  - « Maintenant / C'était vers… » ;
  - « Ce que je faisais » ;
  - les relevés du jour ;
  - la carte « Pour récupérer, je… » quand l'énergie est basse ;
  - « un toucher enregistre » ;
  - aucune valeur par défaut ;
  - tout est facultatif : un relevé peut n'avoir que l'énergie, ou que l'émotion.
- **La sélection** suit 2b : fond plein `-fill`, texte `-on`, 600 et coche. Jamais la couleur seule.
- **Accessibilité** : chaque bulle est un bouton nommé (« Irrité, famille Colère »). Les cibles font 44 pt au moins. Sans mouvement, la grappe est statique.

### 4.3 Données

- **Store `humeurs`** :
  - champ ajouté : `emotion`, un identifiant `roue:…` ou `null` ;
  - `humeur` reste dans le schéma pour les anciens relevés, et vaut `null` pour les nouveaux ;
  - un relevé est vide quand `emotion`, `humeur`, `energie` et `faisais` sont tous vides.
- **Ce qui ne change pas** : aucune migration pour ce champ ; l'humeur du soir masquée (v6) reste masquée ; les anciennes valeurs sont conservées et affichées.
- **Sauvegarde** : `FORMAT_VERSION` 5. La mise à niveau 4 → 5 ajoute `emotion: null` aux relevés, et `seances: []` (§6.3).

## 5. L'Analyse et les autres lectures, sans note de 1 à 10

**Principe** : partout où la note du jour (moyenne des relevés) servait, on montre **les émotions** : familles et mots, à leurs couleurs. Pour les jours passés qui n'ont que des notes, la note reste affichée telle qu'elle était (« humeur 6 »), là où un jour est montré.

| Endroit | Avant | En v7 |
|---|---|---|
| Aujourd'hui, résumé sous le titre | « humeur 5,3 » | les familles du jour en petits points de couleur |
| Ma journée | « humeur 6 · énergie moyenne » | « Irrité · énergie moyenne », point de la famille |
| Historique, ligne d'un jour | « Humeur 4 » | les mots du jour (deux au plus, puis « … »), points de couleur |
| Analyse › Ma semaine | tuile « humeur moyenne » | tuile « Tes émotions » : une barre par famille (nombre de relevés), sans pourcentage |
| Analyse › Mes jours | rangée Humeur (trait min–max) | rangée **Émotions** : un point par relevé, à la couleur de sa famille |
| Analyse › Ta journée | humeur par heure | familles par heure de la journée |
| Analyse › Les plus fréquents | — | ajoute les mots les plus notés |
| Tendances, journées à 7 ou plus, sommeil et humeur, signal de ressemblance | phrases calculées | **retirés**, avec leurs réglages, leurs tests et leur calibration |
| Comprendre | mesures sur la note | mesures sur les **familles** : après une nuit Mal · Moyen · Bien, selon le lieu, le jour de la semaine, le mois, autour des explosions |
| Après coup, « Ce jour-là » | humeur du jour | émotions du jour |
| Export PSY | « humeur 5 » par jour, humeur moyenne, repères | les émotions de chaque jour (« irrité, calme ») ; compteurs par famille ; section « Repères de l'app » retirée |
| Vue soignants (A4, PDF) | ligne humeur, courbe d'humeur, repères | ligne « Émotions par famille », barres empilées par semaine, repères retirés ; lisible en noir et blanc (les familles se distinguent aussi par le motif ou l'ordre) |

**Anciennes notes dans les graphiques** *(appel du concepteur, pour ne rien masquer)* : sur une période qui contient des notes de 1 à 10, Mes jours et la Vue soignants gardent une rangée ou une ligne « Humeur (notes) » pour ces jours-là, à côté des émotions. Cette rangée n'apparaît pas sur une période sans note. La page A4 tient toujours sur une page.

**Conséquence à signaler à l'utilisateur** : le format de l'Export PSY change. Si son assistant PSY attend « humeur moyenne », il faudra mettre à jour ses consignes.

Aucun graphique d'émotions n'additionne des familles en un score. Il n'y a ni courbe « agréable / désagréable », ni pourcentage.

## 6. Bien-être

### 6.1 Place

- C'est un **onglet** : Aujourd'hui · Analyse · Bien-être · Soins · Réglages. L'icône est nouvelle, dans la même famille au trait (appel du concepteur : une feuille).
- L'Historique devient une porte « Historique › » en haut de l'Analyse, à côté des trois portes de Comprendre. La route `#/historique` reste.
- Le bouton « Moment difficile » d'Aujourd'hui ne change pas. C'est le raccourci de crise, avec la cohérence cardiaque en tête.

### 6.2 Contenu de l'onglet

1. **Cohérence cardiaque** : le même composant de respiration que dans Moment difficile, avec les mêmes réglages et le son facultatif, et « Commencer ».
2. **Exercices de sophrologie** : une liste de cartes. Chaque carte porte un titre, une durée approximative et une ligne de description. L'exercice se déroule **une consigne par écran**, comme « Une chose à la fois » :
   - « Précédent » et « Suivant » ;
   - un minuteur discret sur les étapes qui ont une durée ;
   - « Terminer ».
   - **Lecture à voix haute** facultative, éteinte au départ, par la synthèse vocale de l'iPhone (hors ligne, voix française du système). Elle sert à garder les yeux fermés. Sans voix française disponible, l'option ne s'affiche pas.
   - **Avancée des étapes** *(appel du concepteur)* : voix allumée, une étape passe seule à la suivante à la fin de sa durée, et chaque texte d'étape a sa durée. Voix éteinte, on avance avec « Suivant », et le minuteur ne fait qu'indiquer le temps.
   - **Écran allumé** pendant un exercice, comme pour la respiration (verrou d'écran, relâché à la fin ou à la sortie).
3. **Les exercices**, rédigés pour Carnet (appel du concepteur ; l'API Claude peut aider à les écrire) :
   - respiration abdominale (3 min) ;
   - respiration carrée (3 min) ;
   - relaxation dynamique des épaules (5 min) ;
   - tension et détente (8 min) ;
   - scan corporel (10 min) ;
   - lieu ressource (8 min) ;
   - ancrage 5-4-3-2-1 (3 min) ;
   - pause d'une minute (1 min).

   **Règles d'écriture** :
   - phrases courtes, tutoiement, ton neutre ;
   - aucune promesse d'effet ni conseil de santé ;
   - une ligne fixe en bas de la liste : « Tu peux t'arrêter à tout moment. » ;
   - **l'utilisateur relit les textes avant la publication**.
4. **Aucun compteur** : ni nombre de séances, ni série, ni « déjà fait aujourd'hui », ni rappel.
5. **Fin d'une séance** : un lien discret « Noter mon émotion » ouvre l'écran Émotion du moment. Rien ne s'ouvre tout seul.

### 6.3 Données des séances

- **Nouveau store `seances`** : `{ id, date, heure, exercice, dureeS, origine, createdAt }`, avec un index sur `date`.
  - `exercice` vaut `coherence` ou un identifiant d'exercice ;
  - `origine` vaut `bien-etre`, `moment-difficile` ou `ressourcer` *(appel du concepteur)*.
- **Ce qui crée une séance** : une respiration ou un exercice mené au bout, ou arrêté après 60 s au moins. La respiration lancée depuis Moment difficile crée aussi une séance.
- **Migration** : `DB_VERSION` 5, avec `MIGRATIONS[5]`, figée dans `migrations.lock.json`. Elle copie l'avant-migration, comme les précédentes.
- **Sauvegarde** : `FORMAT_VERSION` 5 (§4.3). Les sauvegardes témoins d'avant restent importables.
- **Rattachement au jour** : `domain/dates.js`, avec la bascule à 4 h.

### 6.4 Le Bien-être dans l'Analyse

- **Mes jours** : une rangée « Bien-être », avec un repère par jour qui a au moins une séance. Il n'y a pas de total.
- **Comprendre**, nouvelle vue « Autour du Bien-être » : les familles d'émotions notées **dans les 3 heures avant** et **les 3 heures après** une séance lancée depuis Bien-être (`origine` vaut `bien-etre` ; les respirations de crise ne comptent pas), en deux barres côte à côte. C'est une description, sans phrase calculée ni verdict.
  - Sous le seuil habituel : « Pas encore assez de données pour le dire. »
- **Export PSY et Vue soignants** : rien sur le Bien-être (appel du concepteur ; à ajouter plus tard si l'utilisateur le veut).

## 7. Apparence

Tout suit la piste 2b, plan v6.2 et `docs/design/retour-claude-design-v2/`. Les nouveaux écrans (Émotion du moment, Bien-être, exercice, graphiques d'émotions) sont dessinés directement en 2b. La grappe de bulles s'inspire de How We Feel, sans en copier le code ni les visuels.

## 8. Ordre de construction (proposé)

1. Fondations 2b : couleurs (dont les 7 familles de la roue), sélection, icônes, nouvelle barre d'onglets.
2. La roue : `domain/roue.js`, champ `emotion`, validation, sauvegarde format 5, et l'écran Émotion du moment.
3. Aujourd'hui en 2b : Ma journée et le résumé avec les émotions, la bande du bas avec « Émotion » plus grand, le glissement.
4. L'Analyse sans note : retraits, graphiques d'émotions, porte Historique, Comprendre, Historique, Après coup, Export PSY, Vue soignants, avec les tests et la calibration nettoyés.
5. Bien-être : store et migration v5, onglet, exercices, lecture à voix haute, séances, Bien-être dans l'Analyse.
6. Parcours en 2b (épisode, symptôme, Après coup, avec les réponses près du pouce), et Moment difficile.
7. Les autres écrans en 2b, puis un contrôle global, la version 7.0.0 et la documentation.

Comme d'habitude : une étape = un commit, `npm run precache` et `npm test` verts, relecture, captures avant/après, et rien de publié sans l'accord de l'utilisateur.

## 9. Appels du concepteur (à vérifier par l'utilisateur)

- Le 2ᵉ niveau de la roue est sauté : famille, puis mot.
- Sérénité est une 7ᵉ famille, en turquoise, avec 8 mots (§4.1).
- « Aversion » ne compte qu'une bulle.
- « Humeur » devient « Émotion » (bouton et écran).
- Un épisode garde sa liste d'émotions actuelle : la roue sert à l'émotion du moment.
- Les anciennes notes de 1 à 10 restent affichées pour les jours qui en ont, et ne sont plus utilisées par les graphiques.
- Les réglages « Signal de ressemblance » et « Tendances » disparaissent avec ces analyses.
- Le Bien-être n'apparaît ni dans l'Export PSY, ni dans la Vue soignants.
- Les exercices sont rédigés pour Carnet et relus par l'utilisateur. La lecture à voix haute est éteinte au départ.
- La respiration de Moment difficile compte aussi comme une séance, avec son origine ; « Autour du Bien-être » ne la compte pas.
- Une famille seule (sans mot) est un relevé valable.
- Voix allumée, les étapes avancent seules ; l'écran reste allumé pendant un exercice.
- Les anciennes notes gardent une rangée « Humeur (notes) » sur les périodes qui en ont.
- L'onglet Bien-être a une icône de feuille.

## 10. Laissé au constructeur

- La disposition exacte de la grappe de bulles : taille, espacement, place près du pouce.
- La forme des graphiques d'émotions, dans le système 2b et selon `dataviz`.
- Les seuils « pas encore assez de données » des nouvelles vues de Comprendre. Ce sont des règles fixes, sans décompte, affichées par « Pourquoi ? ».
- Le détail des retraits dans `analyse/` (modules, tests, calibration) et dans les réglages.
- Le texte exact des exercices, dans les règles du §6.2.
