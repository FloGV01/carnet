# Décisions et résultats de diagnostic

Ce journal note les arbitrages pris en cours de route et les résultats mesurés sur l'iPhone.

## 2026-10-01 : J0

- **Rendu** : Preact 10.29.8, ses hooks et htm 3.1.1 sont vendorisés séparément (`scripts/vendor.mjs`, empreintes dans `scripts/vendor.lock.json`). C'est préféré au bundle « standalone » de htm, qui embarque un Preact ancien sans `Fragment`.
- **Voix** :
  - `webkitSpeechRecognition` n'est jamais utilisé (inopérant dans une app installée).
  - « Dicter » s'appuie sur la dictée du clavier iOS.
  - « Mémo vocal » enregistre en AAC/MP4 via MediaRecorder.

## Diagnostic iPhone (à remplir après la recette J0)

- Mode, stockage protégé, quota :
- Partage JSON (application/json, text/plain), ZIP, PDF :
- Presse-papier, impression :
- Micro : formats acceptés, mimeType réel, octets par seconde, fréquence de l'invite :
- Dicter : le clavier s'ouvre-t-il au toucher ? La dictée marche-t-elle en mode avion ?

## 2026-10-01 : J7 à J12, après la relecture adversariale du moteur d'analyse

Le plan fixe aussi des objectifs de calibration (§9.1 : au plus 10 % de probabilité qu'un faux constat s'affiche sur un an de recalcul quotidien). Ces objectifs priment sur les valeurs de seuils du §7. Ils n'étaient pas tenus, d'où les écarts suivants.

### Sommeil et humeur, « le lendemain »

- **Avant** : Spearman partielle entre s[i] et h[i+1] en neutralisant **h[i]**.
- **Le défaut** : h[i] est un collisionneur. Avec un lien le jour même et une humeur autocorrélée, le calcul fabriquait un faux effet le lendemain : 39 cas sur 40 avec φ = 0,7.
- **Maintenant** : on neutralise **s[i+1]**, la nuit suivante, sur des jours consécutifs. Le vrai effet le lendemain reste détecté.

### Seuils (`analyse/seuils.js`)

| Analyse | Entrée | Sortie |
|---|---|---|
| Bonnes journées | q ≤ 0,02 (au lieu de 0,10) | q ≤ 0,05 (au lieu de 0,20) |
| Sommeil | α = 0,005 (au lieu de 0,025) | 0,01 (au lieu de 0,05) |

Avec les anciens seuils, environ la moitié des journaux sans aucun effet affichaient un faux constat dans l'année.

### Permutations

- **Avant** : blocs fixes de 7 jours.
- **Maintenant** : des blocs de longueur aléatoire, redécoupés à chaque tirage, de 21 jours en moyenne pour les bonnes journées et 14 pour le sommeil.
- **Ce que ça corrige** :
  - un facteur qui suit l'emploi du temps de la semaine était indétectable (p = 1) ;
  - avec des périodes de plusieurs semaines (congés, arrêt), on obtenait trop de faux constats.

### Contrepartie

Les premiers constats arrivent plus tard : vers 3 à 4 mois de données au lieu de 2. C'est conforme au CdC §6 : « avec peu de données, ne rien affirmer ».

### Robustesse

- Une humeur hors de 1 à 10 compte comme inconnue.
- Une statistique non finie ne produit jamais de constat.
- La série de test part de la première humeur notée et retire les trous de plus de 28 jours : une entrée vide en tête, ou une date aberrante, ne change rien.
- Le signal ne regarde que les 3 dernières années.
- Un constat déjà affiché n'est pas retronqué (budget de calcul).
- Réveils : une moyenne qui contient des « 5 ou plus » s'affiche « au moins X ».
- Phrases sommeil :
  - seules les qualités de nuit vues au moins 4 fois sont citées ;
  - le constat est retiré si ses chiffres contredisent le sens annoncé ;
  - « encore » n'apparaît que si le constat du jour même est affiché.
- « Depuis le début » part de la première date connue, toutes sources confondues.

## 2026-10-05 : v4, retours de la première utilisation

Spécification complète : `docs/v4-specification.md`. Décisions qui modifient le plan ou le cahier :

- **Rappels (cahier §10)** : plus seulement un rappel du soir. L'utilisateur peut créer dans Raccourcis des rappels pour l'humeur du moment, aux heures choisies dans Réglages › Ma journée. L'app n'envoie toujours rien elle-même (pas de serveur, pas de notification locale possible pour une app web).
- **Explosions (plan §5.3)** : les épisodes dont la réaction est « Explosion » font foi. Pour ce seul champ, la valeur d'un jour est `max(compteur, épisodes)`, jamais une somme. Le compteur du soir est masqué par défaut. Un compteur vide vaut 0 dans l'analyse seulement à partir du premier lancement de la v4 (`meta.explosionsDepuis`) : avant, vide reste inconnu.
- **Base v2** : store `humeurs`, 76 éléments de liste ajoutés (`SEED_V2_AJOUTS`, figé avec `MIGRATION_2` et `seedItems` dans le verrou). Aucun réglage écrit par la migration.
- **Sauvegarde v2** : la méta de l'utilisateur est remplacée à l'import et restaurée par « Revenir ».
- **TCC** : l'Après coup suit l'analyse en chaîne, le tableau de pensées et les plans « si… alors… », sans aucun contenu proposé par l'app. « C'est injuste » n'est pas une « erreur de pensée » proposée.

## 2026-10-06 : v5, deuxième série de retours

Spécification : `docs/v5-specification.md`. Décisions qui modifient le plan :

- **Pas à pas retiré** (route, écran, bouton). La saisie du soir se fait sur Aujourd'hui.
- **Moment difficile** : la seule animation longue de l'app (cercle de respiration de 10 s par cycle), parce qu'elle guide la cohérence cardiaque ; coupée par le mouvement réduit (la phase écrite reste). Rien n'y est calculé ni choisi par l'app.
- **« J'ai fini pour ce soir »** : une préférence d'affichage de l'appareil (localStorage), jamais une donnée ; rien n'est compté.
- **Contacts multiples** : base v3 et sauvegarde v3 (voir la spécification).
- **Tendances** (plan §7 étendu) : une seule famille testée, l'humeur du soir ; erreur-type tirée des fenêtres de 28 jours de l'année précédente (la règle AR(1) paramétrique donnait 15 à 60 % de journaux avec une fausse phrase). Seuils calibrés : entrée |z| ≥ 3,5 et |d| ≥ 1, stabilité 7 jours, maintien |z| ≥ 2. Tendances seule : 0 à 1 journal sur 40 avec une fausse phrase en un an. Budget de bout en bout (bonnes journées, sommeil, Tendances) : au plus 10 % ; à 3,25, le scénario « composante lente » montait à 13 %. Prix : un changement durable de 3 points n'est retrouvé que 16 fois sur 40.
- **Analyse** : les 3 graphiques hebdomadaires et le tableau Évolution sont remplacés par « Mes jours » (par jour, semaine ou mois) ; la vue soignants reprend cette frise par semaine (par mois au-delà de 26 semaines), sans phrase.
- **Après coup** proposé sur tous les épisodes.

## 2026-10-15 : v6, « Mieux me comprendre »

Spécification : `docs/v6-specification.md` (ce qui a été construit et les écarts : §13). Décisions qui modifient le cahier des charges ou le plan :

- **Humeur du jour (cahier §6, humeur du soir)** : le champ Humeur du soir est masqué par défaut et peut être réaffiché. L'humeur d'un jour est la moyenne de ses humeurs du moment, « vers » compris ; un jour sans relevé garde son humeur du soir, jamais mêlée aux relevés. Toutes les analyses la lisent (`analyse/humeur-jour.js`), aucune ne lit plus `journal.humeur`.
- **« Rien ne s'ouvre tout seul »** : seule exception, la règle « Me ressourcer », éteinte au départ. Allumée, un relevé noté « maintenant » avec une énergie basse garde l'écran ouvert sur « Pour récupérer, je… ». Rien n'est calculé ni retenu.
- **Comprendre** : graphiques seulement, sans phrase calculée de plus, donc sans calibration nouvelle. Seuils d'affichage dans `analyse/seuils.js` (`comprendre`).
- **Base v4 et sauvegarde au format 4** : store `notes`, listes `pese`, `recharge` et `activiteMoment` (`SEED_V4_AJOUTS`, figé dans le verrou), masque `'humeur'` posé par la migration et par la mise à niveau des sauvegardes. Sauvegardes témoins aux formats 1, 2 et 3 (`tests/fixtures`).
- **Calibration** : refaite sur des relevés inventés (0 à 6 par jour, bruit dans la journée, puis la moyenne). Aucun seuil n'a changé. Bout en bout « relevés » : 3 journaux sur 30 pour les scénarios AR(1) et AR(1) à lieux en blocs longs, soit 10 %, la limite de la spec, acceptée ; les autres calibrations restent sous leur seuil.
- **Moment difficile** : la respiration se règle (2, 5 ou 10 min ; 5-5 ou 4-6), avec un signal sonore éteint par défaut, joué en mode ambiant ; « Une chose à la fois » ne compte rien.

### Arbitrages pendant la construction

- **Humeur du soir** masquée par défaut en même temps que le soir change d'affichage (tâche 10), pas avant.
- **Ma semaine** : le plus bas et le plus haut sont pris jour par jour parmi les relevés s'il y en a, sinon le soir ; jamais les deux un même jour.
- **Historique** : un jour qui n'a que des relevés a sa ligne (« humeur 5,6 »), comme dans l'export PSY.
- **Après coup** : « Ce jour-là » dit l'humeur du jour. Le cadre de bouton, le titre « Après coup · TCC » et son sous-titre valent aussi pour un nouvel épisode ; seule la ligne du haut « Mon plan · Après coup » est réservée à l'épisode rouvert.
- **Comprendre** :
  - les fenêtres d'événements antérieurs à la période sont exclues des « autres jours » ;
  - une liste vide (pesé, rechargé, activités) donne « pas assez de données » ;
  - le message de seuil s'affiche dans la carte du graphique ;
  - toucher une barre liste les jours où le facteur vaut « oui » ;
  - une colonne sans valeur garde son étiquette d'axe, sans marque ;
  - un SVG par bloc, sous un groupe qui porte la phrase ;
  - la phrase « Touche une barre » est retirée (les valeurs sont dans « Voir en tableau ») ;
  - « Tout » commence au premier jour des données.
- **Énergie basse dans Mes jours** : barres par semaine ou par mois à l'échelle de la plus haute de la période, comme les explosions.
- **Repères de traitement** : un trait au centre de la colonne par semaine ou par mois, la légende donne la date exacte ; la phrase de légende du PDF tient sur une ligne existante.
- **Page A4 de la vue soignants** : 272,4 mm dans le cas le plus haut, accepté. Avec un prénom de 12 caractères ou plus, le dépassement existait déjà ; rien n'est coupé, la limite réelle est de 285 mm.
- **Moment difficile** : « Une chose à la fois » est masqué sans carte ; l'ouvrir arrête une respiration en cours. La carte de la règle « Me ressourcer » n'a que « Respirer » et se ferme avec le ✕ de l'écran.
- **Notes en vrac** : Annuler après un effacement rend le dernier texte enregistré ; le brouillon du champ du haut reste sur l'appareil (hors sauvegarde) ; Retour dans une note déjà écrite va à la ligne ; en consultation, « Mes notes » se lit sans se modifier.
- **« La dernière fois »** ne cite jamais un rendez-vous à venir : la référence est comptée depuis la plus ancienne de deux dates, celle du rendez-vous et aujourd'hui (le rendez-vous du jour n'est pas encore passé). Arbitrage de la revue finale, construit (spec §7.2).
- **En parler au rendez-vous** : la question d'un épisode reprend émotion, intensité et réaction (celle d'un symptôme, de la même façon) ; l'Après coup reprend celle de son épisode.
- **Libellés choisis pendant la construction**, que ni la spec ni le plan ne fixaient :
  - aperçu d'import : « les réglages de la respiration », « les réglages de « Une chose à la fois » », « les réglages de « Me ressourcer » » ;
  - Comprendre : « Avant mes explosions », « A pesé : … », « Jours connus », l'en-tête de colonne « Compte » ;
  - légende des repères de traitement : « changement : » ;
  - messages : « Question ajoutée au rendez-vous · Annuler » et « Déjà dans ce rendez-vous ».
- **Ergonomie (tâche 26)** :
  - les zones de texte gardent leur taille au repos (2 lignes le plus souvent, jusqu'à 4 en consultation) et grandissent jusqu'à 7 lignes ;
  - les notes en vrac aussi : deux lignes au repos, comme le veut la spec ;
  - en sombre, un choix sélectionné, « + Épisode » et « Terminer » prennent un fond plein moins lumineux (`--p-*`), texte clair en 600, contraste d'au moins 5:1 ;
  - les zones de toucher des barres de Comprendre restent hautes de 22 (leurs valeurs sont aussi dans « Voir en tableau ») ;
  - récapitulatif de l'Après coup : les lignes suivent l'ordre du tableau de la spec ; « Le déclencheur », absent du tableau, garde son libellé.

## 2026-10-18 : v6.1, organisation et rapidité

Source : l'état des lieux du 18/10 (`docs/design/audit-v6/etat-des-lieux.html`), dont l'utilisateur a choisi quatorze propositions. Plan : `docs/superpowers/plans/2026-10-18-carnet-v6-1.md`. Version 6.1.0. La base ne change pas (`DB_VERSION` 4, `FORMAT_VERSION` 4, aucune migration), l'apparence générale (couleurs, police) non plus.

### Les quatorze changements

- **P1 · Corrections objectives** :
  - « Tout effacer » n'est plus centré : la règle du bouton ✕ ne vise plus que `button.effacer` ;
  - les interrupteurs de Réglages vont à droite, le libellé prend la place ;
  - les titres de section (Réglages, Soins, Listes, « Semaine du… », Diagnostic) sont sur le bord des cartes ;
  - « 5 minutes » ne se coupe plus, « Avec qui, comment c'était · Mouvement » se répartit sur deux lignes égales (A3) ;
  - la colonne des heures a une largeur fixe, en chiffres tabulaires, dans « Ma journée » et dans les relevés de l'humeur du moment.
- **P2 · Après coup sans défiler** : la ligne « Après coup (TCC) · tes épisodes récents » passe juste sous « Mémo vocal », avant les replis. Ses règles ne changent pas.
- **P3 · « J'ai fini pour ce soir » sans défiler** : sur la ligne de « Mémo vocal », à droite, toujours après un premier choix du soir.
- **P4 · « Ma journée »** : la section « Épisodes et symptômes » devient « Ma journée ». Elle range par heure les humeurs du moment (« vers 14 h » compris, sans lien ni chevron) et les épisodes. Les symptômes viennent à la fin, « + Symptôme » dessous.
- **P7 · « Ce qui a pesé · ce qui a rechargé »** : le repli se cale en haut de l'écran à son ouverture (un saut si « Réduire les animations »), ses grilles ont deux colonnes régulières.
- **P8 · Épisode sans « Terminer »** : un épisode nouveau se ferme après « Ta réaction » (ou « Passer ») et revient à l'écran d'origine, avec « Épisode enregistré · Annuler ». Rouvert, il a son récapitulatif et « Terminer ».
- **P9 · Récapitulatif sans doublon** : celui d'un épisode et celui d'un symptôme ne répètent plus leurs choix en phrase. Le tableau reste.
- **P10 · « En parler » en haut** d'un épisode rouvert : « Mon plan · Après coup · En parler ». Le lien du bas reste.
- **P11 · « C'était vers… »** reste ouverte au choix d'une heure et rouvre comme elle a été laissée.
- **P12 · « Pour mes soignants »** en haut de Soins : Export PSY et Vue soignants quittent le bas de l'Analyse. Le prénom de la page se règle dans la Vue soignants.
- **P13 · Analyse** : Comprendre en trois portes (Explosions, Énergie, Rythmes). Le sélecteur de période ne colle plus que sur les sections qu'il règle. Les deux constats calculés sur tout l'historique passent après, sous « Sur tout ton historique ».
- **P14 · Moment difficile** : deux boutons, sans « Me ressourcer » ; « Modifier mon plan » à droite du titre « Mon plan ».
- **P15 · Historique** : segment, filtres, recherche et position sont gardés au retour d'un jour, d'un épisode ou d'un symptôme. Un jour ouvert depuis l'Historique garde l'onglet allumé et a « ‹ Retour ».
- **P16 · Réglages rangés par usage** : Sauvegarde en tête, puis « Ma saisie » et « Moment difficile », puis Analyse, À propos, Zone sensible. Les heures de l'humeur du moment passent dans Rappels, l'index des Listes est rangé par écran.

### Arbitrages

- **A1** : la rubrique du bas d'Aujourd'hui s'appelle « Ma journée ». Dans Réglages, l'écran « Ma journée » devient « Le soir » et ne règle plus que les champs du soir. Sa route reste `#/reglages/journee`.
- **A2** : P8 ne vaut que pour un épisode nouveau, saisi à chaud. Le symptôme ne change pas.
- **A3** : pas de remplacement global des espaces. Seules les coupures observées sont corrigées : une espace insécable dans « 5 minutes » (textes de la respiration) et `text-wrap: balance` sur le titre « Avec qui, comment c'était · Mouvement ».
- **A4** : l'écran `#/ressourcer` disparaît avec sa route. Restent la règle (`domain/ressourcer.js`), Réglages › Me ressourcer et la carte « Pour récupérer, je… » de l'humeur du moment.
- **A5** : l'état de l'Historique est gardé pour la session, pas après un redémarrage. Seul le segment est aussi gardé sur l'appareil, comme le dernier onglet de Soins. « Tout effacer » vide cette mémoire.

### Choix faits pendant la construction

Ce qui se voit à l'écran et que le plan ne disait pas, ou disait autrement :

- **Aujourd'hui** :
  - pendant l'enregistrement d'un mémo du soir, « J'ai fini pour ce soir » passe sous « Mémo vocal » ; le reste du temps, il est à sa droite, comme prévu ;
  - « Ma journée » : un épisode sans heure (noté depuis la page d'un jour passé) vient après les relevés et les épisodes à heure, avant les symptômes. Un relevé sans humeur ni énergie s'écrit « ce que je faisais : travail, trajet » ; un relevé vide n'a pas de ligne ;
  - « Effacer cette journée » le dit : « Les épisodes, symptômes et humeurs du moment de ce jour sont conservés. » ;
  - « Ce qui a pesé · ce qui a rechargé » : les pastilles font 44 px de haut, et non 52 comme les étapes d'un épisode, pour que le repli ouvert tienne sur un écran. À l'ouverture, le repli se cale 8 px sous le haut de l'écran, ou sous le bandeau « Nouvelle version prête » quand il est affiché.
- **Épisode** : « Retour », « Mon plan » ou la ligne de date touchés dans les 250 ms qui suivent un choix annulent le passage à l'étape suivante. Après « Ta réaction », la fiche reste donc ouverte au lieu de se fermer.
- **Soins** : la ligne « Pour mes soignants » passe sur deux lignes sur un écran étroit ou en grand texte. Elle se coupe après « Pour mes soignants : », et les deux liens restent ensemble dessous. En très grand texte sur un écran étroit, ils se séparent aussi : le « · » finit alors la ligne d'« Export PSY », et « Vue soignants » passe dessous.
- **Vue soignants** :
  - le champ s'appelle « Prénom sur la page » (le plan disait « Prénom pour la vue soignants »). Il est placé sous « Partager en PDF » et « Imprimer », avec l'icône d'une page : celle d'une personne est déjà à « Pour qui » ;
  - à l'impression, ni « Pour qui » ni le prénom n'apparaissent ;
  - un PDF préparé ne vaut que pour le professionnel et le prénom affichés. Un prénom qu'on vient de taper est appliqué avant que rien ne parte.
- **Comprendre** :
  - l'onglet n'est plus gardé : les trois portes le choisissent, ce qui rend cette mémoire inutile. La période et la mesure restent gardées. La clé `carnet:comprendre:onglet` n'est plus lue ; restée sur l'iPhone, elle est inerte, et « Tout effacer » l'efface avec les autres clés `carnet:` ;
  - en grand texte ou sur un écran étroit, les portes passent à la ligne.
- **Moment difficile** : sans plan, « Écrire mon plan » reste sous le titre, et rien n'est à sa droite.
- **Historique** :
  - un jour ouvert depuis l'Historique a sa propre route, `#/historique/jour/DATE`. Il garde « Revenir à aujourd'hui », en plus de « ‹ Retour ». Ouvert autrement (`#/jour/DATE`), rien ne change ;
  - le panneau « Filtrer » ouvert est gardé avec le reste ;
  - un élément de liste filtré puis archivé reste proposé, pressé, et un toucher retire le filtre ;
  - « Tout effacer » vide la mémoire de l'Historique. L'import d'une sauvegarde la vide aussi, mais le segment, gardé sur l'appareil, reste.
- **Réglages** :
  - l'index des Listes applique à la lettre « sous le premier écran où on la choisit ». « Professionnel » est donc rangé sous Épisode, en dernier : on le choisit d'abord dans « En parler au rendez-vous », au récapitulatif d'un épisode, avant le rendez-vous et la Vue soignants ;
  - les textes d'aide sous les cartes (Sauvegarde, Moment difficile, Me ressourcer, Listes) sont sur le bord, comme les titres de section et les cartes.
- **Colonne des heures** : 4,4 em, où « vers 23 h » tient ; une heure et un symptôme sans heure s'alignent dessus.
- **« Tout effacer »** garde sa classe d'écran. C'est la règle du ✕ qui est limitée aux boutons, ce qui rend aussi au chevron de « Retour » sa taille sur cet écran.

### En attente de Claude Design

- **P5 · Bande du bas** : l'Humeur à sa taille, rien de touchable dessous.
- **P6 · Les réponses en bas de l'écran** : la grille de réponses juste au-dessus du pied, la question en haut.

Ces deux propositions attendent leurs maquettes, en clair et en sombre. L'apparence générale viendra de la même refonte visuelle.

## 2026-10-22 : v7.0.0, émotions du moment, Bien-être, refonte 2b

Source : les notes de l'utilisateur du 20/10 et le retour de Claude Design (piste 2b). Spec : `docs/superpowers/specs/2026-10-20-carnet-v7-emotions-bien-etre-design.md`. Plan : `docs/superpowers/plans/2026-10-20-carnet-v7.md`, en 9 tâches ; il absorbe le plan v6.2 de la refonte visuelle (`docs/superpowers/plans/2026-10-20-carnet-v6-2-refonte.md`), mis en pause le 20/10. Version 7.0.0. La base passe à `DB_VERSION` 5 (store `seances`, `MIGRATIONS[5]`, copie avant migration) et la sauvegarde au `FORMAT_VERSION` 5 (`docs/format-sauvegarde.md`). Les sauvegardes d'avant restent importables : les notes de 1 à 10 sont gardées, `emotion` vaut `null`.

### Décisions de l'utilisateur (spec §2, 20/10)

- **Roue** : sa roue (image fournie), 6 familles (Colère, Dégoût, Tristesse, Joie, Surprise, Peur) avec leurs couleurs, plus Sérénité. Chaque bulle est un mot du 3ᵉ niveau.
- **Émotion du moment** : la note de 1 à 10 disparaît. Un relevé = une émotion + l'énergie (Basse · Moyenne · Haute). La règle « Me ressourcer » sur l'énergie basse reste.
- **Analyse** : les analyses fondées sur la note sont remplacées par des graphiques d'émotions. Les phrases calculées sur la note sont retirées (tendances, journées à 7 ou plus, sommeil et humeur, signal de ressemblance), avec leurs réglages. Les anciennes notes restent visibles pour les jours passés.
- **Bien-être** : un onglet, avec la cohérence cardiaque et la sophrologie. L'Historique rejoint l'Analyse. Onglets : Aujourd'hui · Analyse · Bien-être · Soins · Réglages.
- **Raccourci de crise** : le bouton « Moment difficile » d'Aujourd'hui reste, avec la cohérence cardiaque en tête.
- **Bien-être dans l'Analyse** : une rangée de Mes jours et « Autour du Bien-être » dans Comprendre.
- **Apparence** : piste 2b · Cartes noires, police système (pas de Lexend : rien à télécharger), pas de rubriques remplies repliées en pastilles, glisser pour changer de jour en plus de ‹ ›, couleurs de Claude Design telles quelles.
- **API Claude** : seulement pendant le développement. Carnet reste sans réseau.
- **Règle levée à sa demande** : la roue garde ses couleurs (Colère rouge, Joie vert…), pour la roue et les graphiques d'émotions seulement. Ailleurs, jamais de rouge ni de vert pour dire bien ou mal.

### Appels du concepteur, à vérifier (spec §9)

- Le 2ᵉ niveau de la roue est sauté : famille, puis mot.
- Sérénité est une 7ᵉ famille, en turquoise, avec 8 mots (Calme, Apaisé, Détendu, Reposé, Tranquille, Serein, Posé, En sécurité).
- « Aversion » ne compte qu'une bulle.
- « Humeur » devient « Émotion » : le bouton de la bande du bas et l'écran « Émotion du moment ». Les relevés gardent leur nom technique (`humeurs`).
- Un épisode garde sa liste d'émotions actuelle (« Ça ressemblait plutôt à… ») : la roue sert à l'émotion du moment.
- Les anciennes notes de 1 à 10 restent affichées pour les jours qui en ont (« humeur 6 »), et ne servent plus aux graphiques d'émotions. Sur une période qui a des notes, Mes jours, En consultation et la Vue soignants gardent une rangée ou une ligne « Humeur (notes) ».
- Les réglages « Signal de ressemblance » et « Tendances » disparaissent avec ces analyses.
- Le Bien-être n'apparaît ni dans l'Export PSY, ni dans la Vue soignants.
- Les exercices sont rédigés pour Carnet et relus par l'utilisateur (plus bas). La lecture à voix haute est éteinte au départ ; voix allumée, les étapes avancent seules ; l'écran reste allumé pendant un exercice.
- La respiration de Moment difficile compte aussi comme une séance, avec son origine ; « Autour du Bien-être » ne la compte pas.
- Une famille seule (sans mot) est un relevé valable (`roue:<famille>`).
- L'onglet Bien-être a une icône de feuille.

### Refonte 2b (plan v6.2)

- Piste 2b, police système (`-apple-system`, aux tailles, graisses et interlignes du lot), couleurs du lot comparées une à une par un test, thème du système. Sélection commune à tous les choix : fond `-fill`, texte `-on`, 600 (700 pour un chiffre) et une coche, jamais la couleur seule. Cibles de 44 pt au moins, animations de 200 ms au plus, supprimées avec « Réduire les animations ».
- **B1 · Icônes** : les 39 du lot, sans leurs métadonnées, au trait de 2, plus la feuille (Bien-être) et l'émotion. Pas d'icône dans les grilles de choix ; les icônes de lieu ne servent pas.
- **B2 · Thème** : celui du système (`prefers-color-scheme`), sans réglage dans l'app.
- **B3 · Vue soignants et PDF** : la page reste claire. Les familles d'émotions s'y distinguent aussi par un motif et par l'ordre de la roue : la page se lit imprimée en noir et blanc.
- **B4 · Glissement** : sur Aujourd'hui et la page d'un jour, vers la droite la veille, vers la gauche le lendemain, jamais au-delà d'aujourd'hui ; au moins 60 px ou un geste rapide, avec |dx| > 1,5 × |dy| ; ignoré depuis un champ, une feuille, un parcours ou un élément qui défile de côté ; le défilement vertical reste celui d'iOS.
- **B5 · Couleurs** : une couleur par rubrique du soir et par parcours (Émotion du moment en rose, Épisode, Symptôme, Moment difficile) ; l'énergie (orange) pour pesé, rechargé et énergie basse ; les explosions en brun sourd. L'action (liens, Terminer, + Épisode, Retour, Passer) est en encre neutre ; onglets, segments et période aussi.
- **P5 et P6**, qui attendaient Claude Design depuis la v6.1, sont faits : la bande du bas avec « Émotion », le plus large (tâche 4), et les réponses près du pouce (tâches 3 et 8).

### Choix faits pendant la construction

- **Roue** (tâche 2) : vocabulaire figé dans `domain/roue.js`, identifiants écrits en dur (`roue:peur:sans-valeur`), hors du store `listes` : il ne se règle pas dans Réglages › Listes. Les teintes des familles viennent de la roue de l'utilisateur, ajustées pour AA, sur la recette du lot.
- **Émotion du moment** (tâche 3) : 7 bulles rondes en grappe 4-3 (rosace 2-3-2 en grand texte), puis les mots de la famille. Chaque toucher enregistre : retoucher le mot ramène à la famille, retoucher la famille efface l'émotion. Après un changement de vue, les bulles ignorent les touchers 350 ms (un double toucher choisissait un mot jamais vu). Le mot choisi s'affiche à droite du titre « Émotion ». L'écran se ferme seul une fois l'émotion et l'énergie choisies.
- **Aujourd'hui** (tâche 4) : le résumé sous le titre met les familles du jour en points de couleur ; « Ma journée » dit « Irrité · énergie moyenne » au point de la famille, un ancien relevé « humeur 6 » au point creux ; un épisode ou un symptôme a un petit carré, un relevé un rond.
- **Analyse** (tâche 5) : « Tes émotions » (une barre par famille, le nombre de relevés, sans pourcentage), rangée « Émotions » de Mes jours (un point par relevé), Ta journée par familles, les mots les plus notés ; Comprendre mesure les familles (après une nuit, selon le lieu, le jour, le mois, autour des explosions, autour du Bien-être). Seuils : 5 relevés, 3 heures, affichés par « Pourquoi ? ».
- **Exports** (tâche 6) : voir plus bas pour l'Export PSY. Vue soignants : « Émotions par famille (relevés) » en tête, barres empilées par semaine dans l'ordre de la roue, avec un motif par famille ; la page tient sur une page A4.
- **Parcours** (tâche 8) : en-tête « Fermer », le nom derrière un carré à la couleur du parcours, repère d'étape en points (jamais une barre) ; en grand texte, le repère passe sous le nom. Le toast d'un parcours se pose en haut, sous l'en-tête, pour ne pas couvrir les réponses.
- **Autres écrans** (tâche 9) :
  - Réglages et Réglages › Le soir en listes groupées, comme les réglages de l'iPhone : un carré d'icône de 28 à gauche de chaque rangée, filets décalés après le carré. Les carrés sont neutres, sauf Mon plan et Moment difficile (couleur de Moment difficile), Me ressourcer (couleur énergie, icône soleil) et, dans Le soir, chaque champ à la couleur de sa rubrique ;
  - Historique : « Semaine du… » en libellé de section (capitales), et des puces neutres où seule l'icône de la rubrique prend sa couleur, comme les pastilles du lot ;
  - plus de tirets : les replis (« La dernière fois » dans Soins et En consultation, par exemple) ont un filet plein, « + Ajouter » est une action sans cadre ;
  - « En consultation » : une pilule neutre avec un carré violet, comme les boutons de la bande du bas ; « Effet ressenti » d'une fiche de traitement a l'icône grise des autres champs (il prenait le rose d'Émotion du moment) ;
  - Bien-être : la carte de respiration est celle de Moment difficile (voir Bien-être, plus bas) ;
  - « Émotion du moment » partout où l'app nommait encore l'« humeur du moment » : Rappels (et le texte de la notification, qui renvoie au bouton « Émotion »), l'index des Listes, l'import d'une sauvegarde, « Tout effacer », « Effacer cette journée » ;
  - « Effacer définitivement » reste le seul bouton rouge de l'app : une action sans retour, jamais une valeur (AA en clair et en sombre). Le README 2b dit pourtant « Il n'y a pas de rouge » : ce choix attend l'utilisateur (plus bas) ;
  - le bandeau « Nouvelle version prête » a un filet en bas, sans hauteur en plus : le soir tient toujours sans défiler ;
  - des espaces insécables dans les guillemets du guide d'installation, de Rappels et de l'aide de Réglages (`pourAffichage`, dans `domain/typographie.js`, partagé avec les exercices) : un guillemet ne commence ni ne finit plus seul une ligne ; le rapport du Diagnostic se coupe en grand texte au lieu de déborder ;
  - le texte d'aide d'un champ vide (placeholder) est en texte secondaire : 6,0:1 sur `--surface-2` et 6,8:1 sur blanc en clair, 4,7:1 et 5,7:1 en sombre. Le gris de WebKit (#a9a9a9) n'avait que 2,1:1 sur `--surface-2` ;
  - Réglages › Le soir : un libellé coupé sur plusieurs lignes (grand texte) garde 8 px jusqu'aux filets ; sur une ligne, la rangée garde ses 52.
- **Contrôle global** (tâche 9) : un test parcourt les écrans principaux en clair et en sombre (37 écrans, données inventées) : tout texte visible, textes d'aide des champs compris, a au moins 4,5:1 sur son fond, aucun tiret ; à 390 px, au texte par défaut et en grand texte (23 px), rien ne sort de l'écran de côté.

#### Bien-être (tâche 7)

- **Onglets** : Aujourd'hui · Analyse · Bien-être · Soins · Réglages. L'Historique garde sa route et s'ouvre par sa porte en haut de l'Analyse ; il allume l'onglet Analyse et a un « Retour » vers elle.
- **Couleur** : Bien-être prend celle de la cohérence cardiaque (le bleu de Moment difficile). Aucune couleur nouvelle.
- **Un exercice commence par « Commencer »** : Safari ne parle qu'après un toucher, et l'écran d'avant permet d'allumer la voix avant de fermer les yeux. Puis une consigne par écran, « Précédent », « Suivant », « Terminer », et le temps qui reste à l'étape. Aucun repère « 3 sur 8 ».
- **Lecture à voix haute** : éteinte au départ, gardée sur l'iPhone (pas dans la sauvegarde) ; sans voix française, l'interrupteur n'apparaît pas. Allumée pendant une étape, elle lit l'étape et son temps repart.
- **Arrière-plan, écran verrouillé, page cachée** : l'exercice se met en pause (voix coupée, verrou d'écran rendu) et attend « Reprendre ». S'il a duré 60 s ou plus, la séance est notée dès la pause (l'app peut ne pas revenir) ; reprise et finie, c'est la même séance, dont la durée est mise à jour.
- **Une séance** commence à l'heure de « Commencer », et sa durée est celle de l'exercice actif, pauses exclues. « Terminer » avant la dernière étape, ou « Fermer », compte comme un arrêt (gardé à partir de 60 s). Un exercice n'est mené au bout que si sa dernière étape est atteinte après la moitié de sa durée au moins, en temps actif : parcourir les textes pour les relire ne crée pas de séance (la règle des 60 s joue alors seule).
- **La respiration** crée une séance dans Bien-être, dans Moment difficile et dans « Pour récupérer, je… », chacune avec son origine. « Noter mon émotion » ne paraît que dans Bien-être, une fois une séance notée. Seul le temps page visible compte : page cachée (écran verrouillé, autre app), le cercle s'arrête, le verrou d'écran est rendu et la séance est notée dès ce moment si elle a duré 60 s ; au retour, la respiration reprend là où elle en était, et c'est la même séance. Elle n'est menée au bout que si toute sa durée s'est écoulée page visible.
- **Dans une carte**, la respiration a la forme du rendu 2b de Moment difficile (tâches 8 et 9) : dans Moment difficile et dans Bien-être, « Cohérence cardiaque » seul, la durée et le rythme sur leurs puces (« 5 minutes ▾ », « 5 s · 5 s ▾ »), réglés au même endroit que Réglages › Moment difficile. Dans « Pour récupérer, je… », plus étroite, la durée passe sous « Cohérence cardiaque », sans « · ».
- **Mes jours** : la rangée « Bien-être » n'apparaît que sur une période qui a une séance (toutes origines) ; un repère par jour, par semaine ou par mois, toujours le même, sans nombre. Ni l'Export PSY ni la Vue soignants n'en parlent.
- **« Autour du Bien-être »** est le dernier graphique de l'onglet Énergie de Comprendre (seules les séances lancées depuis Bien-être), au seuil des autres vues d'émotions.

### Relecture finale (22/10)

- **Respiration arrêtée** : un tic de la minuterie de 200 ms tombé entre le rendu d'« Arrêter » et le nettoyage de l'effet (Preact le fait après l'affichage) relançait le cercle. Le toucher était perdu, la séance n'était pas notée et le verrou d'écran restait pris. Le défaut existait en v6 ; il touchait les trois respirations (Moment difficile, Bien-être, « Pour récupérer, je… »). La minuterie ne fait plus rien une fois la respiration arrêtée. Un test appelle ce tic à la main, dans cette fenêtre.
- **Comprendre › « Selon le mois », mesure Émotions** : seuls les mois qui ont un relevé à émotion ont une ligne, comme dans « Voir en tableau ». Les mois d'avant la v7, qui n'ont que des notes, ne s'alignent plus vides au-dessus du premier mois à émotions. Les jours de la semaine gardent leurs sept lignes.
- **Analyse › Tous les chiffres** : les tuiles n'ont plus de cadre, comme celles de Ma semaine en 2b (fond `--surface` sur le fond de l'écran).
- **Les plus fréquents › Émotion du moment** : au-delà de trois mots à égalité, les trois premiers, séparés par des virgules, puis « … » (« à égalité : Irrité, Calme, Vide… · 2 relevés sur 40 »). La règle de classement ne change pas ; les autres listes disent toujours tous leurs ex aequo.
- **Questions d'un rendez-vous et Mes notes** (en consultation) : à l'affichage seulement, elles passent par `pourAffichage`. Une question écrite « décalé : est-ce gênant ? » ne coupe plus sa ligne juste avant « : ». Le texte enregistré, la sauvegarde et les exports ne changent pas.

### Le format de l'Export PSY change (à signaler)

Si l'assistant PSY de l'utilisateur attend « humeur 5 » par jour ou « humeur moyenne », ses consignes sont à mettre à jour :
- la ligne d'un jour dit « émotions : irrité, calme » (en minuscules, chacune une fois, dans l'ordre des heures ; une famille seule s'écrit « colère ») ;
- chaque relevé de la ligne « humeur du moment » porte son émotion (« 09:10 irrité (énergie basse) ») ;
- un jour qui a d'anciennes notes garde « humeur 6 », et ses relevés chiffrés restent tels quels ;
- dans COMPTEURS, « émotions : colère 2 · sérénité 2 », dans l'ordre de la roue, sans famille à zéro ; « humeur moyenne » ne reste que pour une semaine qui a des notes ;
- la section « Repères de l'app » est retirée.

### En attente de l'utilisateur

- **Pire cas du soir à 8 rubriques** (Humeur du soir et Explosions réaffichées, Contact et Sport séparés). La v4 l'exigeait sans défilement à 390 et 375 × 797. En cartes 2b, même resserrées, les 8 rubriques dépassent d'environ 270 px : aucune mise en page en cartes ne les fait tenir avec des cibles de 44. Deux voies : accepter que ce cas défile (c'est l'état actuel, le test le vérifie), ou une mise en page sans cartes au-delà de 6 rubriques. Les 6 rubriques par défaut tiennent, elles.
- **Aujourd'hui, écarts au lot 2b** pour garder P2 (Après coup sans défiler) et P3 (« J'ai fini » sans défiler) à 390 × 844, et le soir sans défilement à 390 × 797 après minuit ou avec le bandeau « Nouvelle version prête » : les choix des cartes font 44 de haut au lieu de 48, les cartes ont 8 de marge haute et basse, 4 entre la tête et les choix, et 6 entre deux blocs (4 avec le bandeau). À revoir sur l'iPhone.
- **La roue et les exercices** : l'utilisateur relit les mots de la roue (l'image était peu nette) et les textes des exercices (plus bas) avant la publication.
- **CLAUDE.md, vocabulaire de la roue** (plan v7, tâche 9) : la ligne suivante n'entre dans CLAUDE.md, sous « Règles qui priment sur tout », qu'avec l'accord de l'utilisateur : « **Le vocabulaire de la roue des émotions ne se lisse jamais non plus.** Il est dans `public/js/domain/roue.js`, figé une fois publié : un ajout se fait à la fin, jamais de renommage. »
- **« Effacer définitivement » en rouge** : le dernier pas de « Tout effacer » garde son bouton rouge (`--danger`, AA en clair et en sombre), seul rouge de l'app hors de la roue. Le README du lot 2b dit « Il n'y a pas de rouge ». À confirmer, ou à passer en encre neutre comme les autres actions.
- **La rubrique du soir « Humeur »** (grille de 1 à 10, masquée par défaut depuis la v6) reste dans Réglages › Le soir avec son interrupteur, à côté de l'« Émotion du moment ». Réaffichée, elle remet une note de 1 à 10 dans la saisie du soir. Cette note nourrit ensuite « Humeur (notes) » dans Mes jours et la Vue soignants, et « humeur du soir 6 » dans l'Export PSY, pour chaque soir à venir. La spec dit que « la note de 1 à 10 disparaît » (§2) et que l'humeur du soir « reste masquée » (§4.3), sans trancher. Deux voies : retirer « Humeur » des champs réaffichables quand la base n'a aucune humeur du soir ; ou la renommer « Humeur du soir (note de 1 à 10) » et la garder comme reliquat voulu. Rien n'est changé en attendant.

### À essayer sur l'iPhone

- Les couleurs franches sur fond noir, le soir, et celles de la roue en clair et en sombre.
- La grappe de bulles sous le pouce, et le glissement d'un jour à l'autre à côté du défilement.
- La lecture à voix haute (voix française du système), le verrou d'écran pendant un exercice et une respiration, la pause écran verrouillé.
- Le grand texte d'iOS sur les nouveaux écrans (Émotion du moment, Bien-être, exercice).

### Exercices à relire (titres et étapes)

Rédigés pour Carnet selon la spec §6.2 : phrases courtes, tutoiement, ton neutre, aucune promesse d'effet ni conseil de santé. La durée de chaque étape sert quand la voix est allumée : l'étape passe seule à la suivante. Un texte se corrige dans `public/js/domain/exercices.js` ; les identifiants ne changent pas.

#### Respiration abdominale (3 min, `respiration-abdominale`)

Respirer avec le ventre, une main posée dessus.

1. Installe-toi assis ou allongé. Ferme les yeux si tu veux. *(15 s)*
2. Pose une main sur ton ventre, l'autre sur ta poitrine. *(15 s)*
3. Inspire par le nez. Laisse le ventre se gonfler sous ta main. *(20 s)*
4. Expire lentement par la bouche. Le ventre redescend. *(20 s)*
5. Garde ce rythme, sans forcer. La main sur la poitrine bouge peu. *(40 s)*
6. Inspire, le ventre se gonfle. Expire, il redescend. *(40 s)*
7. Laisse la respiration revenir à son rythme habituel. *(20 s)*
8. Quand tu veux, ouvre les yeux et bouge doucement. *(10 s)*

#### Respiration carrée (3 min, `respiration-carree`)

Inspirer, retenir, expirer, retenir : quatre temps chacun.

1. Installe-toi, le dos droit sans être raide. Les épaules restent basses. *(15 s)*
2. Vide doucement l'air de tes poumons. *(10 s)*
3. Inspire par le nez en comptant jusqu'à quatre. *(9 s)*
4. Retiens l'air en comptant jusqu'à quatre. *(9 s)*
5. Expire par la bouche en comptant jusqu'à quatre. *(9 s)*
6. Garde les poumons vides en comptant jusqu'à quatre. *(9 s)*
7. Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu'à deux. *(48 s)*
8. Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre. *(48 s)*
9. Laisse ta respiration redevenir libre. *(15 s)*

Les étapes 3 à 6 durent 9 s : voix allumée, la consigne se dit en 2 à 2,5 s, puis il faut environ 4 s pour compter jusqu'à quatre avant que l'étape suivante soit lue.

#### Relaxation dynamique des épaules (5 min, `epaules`)

Hausser puis relâcher les épaules, avec la respiration.

1. Mets-toi debout ou assis, les pieds à plat, les bras le long du corps. *(20 s)*
2. Inspire et monte les deux épaules vers les oreilles. *(10 s)*
3. Garde-les en haut quelques secondes, en retenant l'air. *(10 s)*
4. Expire par la bouche et laisse-les retomber d'un coup. *(10 s)*
5. Observe les sensations dans tes épaules et tes bras. *(20 s)*
6. Recommence : inspire, monte les épaules, retiens. *(15 s)*
7. Expire et relâche. Laisse retomber. *(15 s)*
8. Observe de nouveau ce que tu sens. *(20 s)*
9. Une dernière fois : inspire, monte les épaules, retiens. *(15 s)*
10. Expire et relâche tout. *(15 s)*
11. Fais rouler les épaules vers l'arrière, lentement. *(30 s)*
12. Puis vers l'avant, lentement. *(30 s)*
13. Laisse les bras pendre. Remarque ce qui a changé, ou ce qui est pareil. *(40 s)*
14. Respire normalement quelques instants. *(30 s)*
15. Quand tu veux, reprends ce que tu faisais. *(20 s)*

#### Tension et détente (8 min, `tension-detente`)

Serrer un groupe de muscles, puis le relâcher, des pieds au visage.

1. Installe-toi assis ou allongé. Ferme les yeux si tu veux. *(20 s)*
2. Respire lentement quelques instants. *(20 s)*
3. Serre les orteils et contracte les pieds, sans forcer. Garde la tension. *(15 s)*
4. Relâche d'un coup. Observe la différence. *(30 s)*
5. Contracte les mollets en tirant les pointes de pied vers toi. *(15 s)*
6. Relâche. Observe les sensations dans les jambes. *(30 s)*
7. Serre les cuisses et les fesses. *(15 s)*
8. Relâche. Laisse les jambes posées. *(30 s)*
9. Rentre le ventre et contracte-le. *(15 s)*
10. Relâche. Laisse la respiration revenir dans le ventre. *(30 s)*
11. Serre les poings et contracte les bras. *(15 s)*
12. Relâche. Ouvre les mains. *(30 s)*
13. Monte les épaules vers les oreilles et serre. *(15 s)*
14. Relâche. Laisse les épaules redescendre. *(30 s)*
15. Serre la mâchoire, plisse les yeux et le front. *(15 s)*
16. Relâche le visage. Desserre les dents. *(30 s)*
17. Parcours ton corps des pieds à la tête. Remarque ce que tu sens. *(60 s)*
18. Respire tranquillement. *(35 s)*
19. Bouge les doigts, les pieds, puis ouvre les yeux quand tu veux. *(30 s)*

#### Scan corporel (10 min, `scan-corporel`)

Passer d'une partie du corps à l'autre, sans rien changer.

1. Installe-toi allongé ou assis. Ferme les yeux si tu veux. *(30 s)*
2. Remarque les points d'appui de ton corps : le sol, le siège ou le lit. *(40 s)*
3. Va vers tes pieds : les orteils, la plante, les talons. Remarque ce qui est là, ou rien de particulier. *(50 s)*
4. Monte vers les chevilles, les mollets, les genoux. *(45 s)*
5. Les cuisses, puis le bassin. *(45 s)*
6. Le ventre, qui bouge avec la respiration. *(45 s)*
7. Si ton esprit part ailleurs, reviens au corps, sans te juger. *(40 s)*
8. La poitrine, et le dos contre son appui. *(45 s)*
9. Les mains, les bras, jusqu'aux épaules. *(50 s)*
10. Le cou et la nuque. *(40 s)*
11. Le visage : la mâchoire, les joues, les yeux, le front. *(50 s)*
12. Le haut de la tête. *(30 s)*
13. Le corps entier, d'un seul coup, tel qu'il est maintenant. *(60 s)*
14. Bouge doucement les doigts et les pieds. Ouvre les yeux quand tu veux. *(30 s)*

#### Lieu ressource (8 min, `lieu-ressource`)

Imaginer un lieu, réel ou inventé, et le parcourir par les sens.

1. Installe-toi confortablement. Ferme les yeux si tu veux. *(20 s)*
2. Respire lentement, quelques fois. *(30 s)*
3. Choisis un lieu, réel ou imaginé, où tu aimes être. S'il n'en vient aucun, invente-le. *(40 s)*
4. Regarde autour de toi : les formes, les couleurs, la lumière. *(60 s)*
5. Écoute les sons de ce lieu, proches ou lointains. *(60 s)*
6. Remarque les odeurs, la température de l'air. *(50 s)*
7. Sens ce que tu touches : le sol sous tes pieds, une matière, un objet. *(60 s)*
8. Reste là un moment, sans rien faire de particulier. *(60 s)*
9. Ce lieu reste là : tu peux y revenir en pensée. *(30 s)*
10. Reviens doucement dans la pièce. Remarque les appuis de ton corps. *(40 s)*
11. Bouge les doigts, puis ouvre les yeux quand tu veux. *(30 s)*

#### Ancrage 5-4-3-2-1 (3 min, `ancrage-54321`)

Nommer ce que tu perçois autour de toi, un sens après l'autre.

1. Garde les yeux ouverts. Regarde autour de toi. *(10 s)*
2. Nomme cinq choses que tu vois. *(35 s)*
3. Nomme quatre choses que tu peux toucher. Touche-les si tu veux. *(35 s)*
4. Nomme trois sons que tu entends. *(30 s)*
5. Nomme deux odeurs. S'il n'y en a pas, deux odeurs que tu aimes. *(25 s)*
6. Nomme un goût, dans ta bouche en ce moment. *(20 s)*
7. Respire une fois, lentement. *(15 s)*
8. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Pause d'une minute (1 min, `pause-une-minute`)

Un arrêt bref, là où tu es.

1. Arrête ce que tu fais. Pose ce que tu as dans les mains. *(10 s)*
2. Sens tes pieds sur le sol. *(10 s)*
3. Inspire lentement par le nez. *(10 s)*
4. Expire plus longuement, par la bouche. *(10 s)*
5. Encore une fois : inspire, puis expire. *(15 s)*
6. Reprends quand tu veux. *(5 s)*

## 2026-10-26 : v8.0.0, émotion en carte, Bien-être en lecteur, programme

Source : les retours d'usage de l'utilisateur sur la v7 et ses réponses du 23 au 25/10, et les recherches du 24/10 (annexes `hwf-placement.md`, `programme-sophro.md` et `propositions.md`). Spec : `docs/superpowers/specs/2026-10-24-carnet-v8-design.md`, qui fait foi, avec son §7 bis (le sommeil, décision du 25/10) et son §12 (précisions après relecture). Plan : `docs/superpowers/plans/2026-10-25-carnet-v8.md`, en 9 tâches, une par commit, chacune relue puis corrigée. Version 8.0.0, publiée en une fois.

La base passe à `DB_VERSION` 6 (liste `sujetRdv`, `MIGRATIONS[6]`, copie avant migration) et la sauvegarde au `FORMAT_VERSION` 6 (`docs/format-sauvegarde.md`). Les sauvegardes des formats 1 à 5 restent importables, et rien n'y est transformé : une nuit ancienne garde son coucher, son lever et ses réveils, et une séance de la v7 n'est pas « Faite ».

### Décisions de l'utilisateur (spec §2, du 23 au 25/10)

- **Émotion du moment** : la carte de How We Feel. D'abord une tuile (l'énergie, sous « plutôt désagréable » ou « plutôt agréable »), puis un mot sur une carte de bulles, les mots agréables à droite. L'énergie est celle de la tuile, jamais devinée d'après le mot. La place des mots suit How We Feel, et l'utilisateur ne la relit pas.
- **Définitions** : une par mot, écrite par Carnet et corrigeable par l'utilisateur. Un appui long sur une bulle montre la définition sans choisir le mot.
- **Fermeture** : l'écran se ferme seul une fois rempli, et « Ce que je faisais » est replié à chaque ouverture.
- **Lecteur de Bien-être**, à la Petit BamBou :
  - un anneau qui montre le temps de tout l'exercice ;
  - des étapes qui avancent seules ;
  - un souffle continu pour respirer ;
  - à la fin, le lecteur se ferme seul et le message « Noter mon émotion » reste 6 s.
- **Son** : « Repères + souffle » au départ. En mode silencieux, il se tait par défaut, et un réglage permet de le forcer.
- **Programme** : 8 étapes et 17 séances. Une séance menée au bout porte une coche et « Faite le 12/10 ». Il n'y a pas de marquage à la main, et les étapes ne montrent que leur titre. L'onglet Bien-être ne garde que le Programme et la cohérence cardiaque ; Moment difficile garde sa cohérence cardiaque.
- **Sommeil** (25/10) : le nombre d'heures et la qualité. Coucher, lever et réveils ne se saisissent plus le soir, et Q16 (le temps d'endormissement) est abandonné.
- **Pistes retenues** :
  - Q5 : le détail du sport et du contact dans leur carte ;
  - Q15 : Mes nuits, aussi sur l'A4 des soignants ;
  - Q17 : l'énergie haute et l'hyperfocus avant la fatigue ;
  - Q18 : les émotions selon ce que je faisais ;
  - Q20 : l'Après coup quand la honte reste ;
  - Q22 : les sujets d'un rendez-vous.
- **Textes** : les 79 définitions et les séances nouvelles sont relues après la publication, dans l'app (voir « Textes à relire », plus bas).
- **Hors champ** : le petit modèle d'IA local. L'assistant IA reste prévu pour la V3.

### Règles levées à sa demande, et seulement là

- **Écran Émotion** : la carte range les mots en « plutôt agréable » et « plutôt désagréable ».
  - La position n'est ni enregistrée ni calculée, et l'Analyse ne parle jamais de côté ni de proportion.
  - « positif », « négatif », « bon » et « mauvais » n'apparaissent jamais, et il n'y a aucun score d'agréabilité.
- **Programme** : le suivi « Faite le 12/10 » existe, mais sans aucun compteur.
  - Il n'y a ni total, ni pourcentage, ni barre, ni anneau de progression.
  - Il n'y a ni série, ni date de départ, ni « semaine 3 », ni « en retard ».
  - Une séance pas faite n'affiche rien.

### Appels du concepteur, à vérifier (spec §10 et §12)

- Les mots qui ont un équivalent clair dans How We Feel en prennent le quadrant. Les autres gardent le tableau §9 de l'annexe. La correspondance retenue est plus bas (tâche 2). Le Mood Meter RULER n'a donné aucune carte lisible en texte.
- Les définitions se corrigent dans Réglages › Émotions.
- Le son du lecteur vaut « Repères + souffle » au départ, et seulement pour le lecteur de Bien-être (Programme et cohérence cardiaque de l'onglet). Moment difficile et « Respirer » gardent leur réglage : éteint au départ, avec les deux notes de la v7. Rien ne joue seul en pleine crise.
- Le lecteur se ferme 6 s après la fin.
- La séance qui vient suit la dernière faite. Après la dernière, on revient à la première.
- Une séance arrêtée en route compte pour Mes jours, mais pas dans le Programme. Seule une séance lancée depuis le Programme et menée au bout y porte une date.
- Respiration abdominale ouvre le Programme à la place de « Premiers pas », qui n'est pas écrite : il y a donc 8 séances nouvelles, et non 9.
- Q5 ne vaut plus que pour Sport et Contact. « Nuit en détail » est masqué, et se réaffiche dans Réglages › Le soir.
- Sur l'A4, Mes nuits passe de 4 à 2 semaines si la page ne tient pas, puis disparaît dans le cas extrême (tâche 6).
- Les chantiers de fiabilité du §8 sont inclus (tâche 8).

### Données (tâche 1)

- **`journal.heuresSommeil`** : un entier de 4 (« 4 h ou moins ») à 10 (« 10 h ou plus »). Il porte sur la nuit qui précède le jour, comme la qualité.
- **`seances.fin`** (menée au bout) et **`seances.programme`** (l'identifiant de la séance du Programme) : l'app les pose, l'utilisateur ne les saisit pas.
- **La liste `sujetRdv`** se règle dans Réglages › Listes, en tête de Soins, sous « Sujets d'un rendez-vous ».
- **La méta `definitionsRoue`** est sauvegardée et importée comme les autres clés de l'utilisateur.
- **Un témoin au format 5**, écrit par la v7.0.0, rejoint ceux des formats 1 à 4.

### Émotion du moment en carte (tâche 2)

**Placement des mots** (spec §4 et §12.5), dans `domain/carte-roue.js` : une colonne de 1 (le plus désagréable) à 6 (le plus agréable) et un rang d'énergie de 1 à 6 par mot. Les rangs 5-6 font la bande Haute, 3-4 la Moyenne, 1-2 la Basse.
- **Sources consultées le 24/10, en lecture seule** :
  - la liste de How We Feel en quatre zones de 36 mots (un paquet de cartes « How We Feel » en ligne, tenu par un utilisateur : High Unpleasant, Low Unpleasant, High Pleasant, Low Pleasant). Elle atteste le **quadrant** d'un mot : son côté, et la moitié haute ou basse. Elle ne donne pas sa place dans le quadrant : lire l'ordre du paquet comme la grille 6 × 6 de la zone reste une hypothèse ;
  - le Mood Meter RULER (Yale) : aucune carte complète lisible en texte (les grilles officielles sont des images). Une page de présentation (vhtc.org) confirme les zones et les coins (Enraged en haut à gauche, At ease en haut du vert, Serene en bas à droite) : elle sert de recoupement, sans placer de mot.
- **Règle retenue** (spec §12.5 : « sans source vérifiable, c'est le tableau §9 ») :
  - la colonne et le rang de chaque mot sont ceux du tableau §9 de l'annexe `hwf-placement.md` (« annexe ») ;
  - un mot qui a un équivalent clair dans la liste de How We Feel garde le quadrant de cette liste. L'annexe le lui donne déjà pour 31 des 33 ;
  - si l'annexe le met dans l'autre moitié, il prend le rang de son quadrant le plus proche de l'annexe : **Dégoût** (« disgusted », moitié basse) passe du rang 4 au rang 3, **Perplexe** (« confused », moitié haute) du rang 3 au rang 4. Tous deux restent dans la bande Moyenne ;
  - la bande d'énergie, qui décide sous quelle tuile on trouve un mot, est donc celle de l'annexe pour les 79 mots.
- **Relecture de la tâche 2** : une première version prenait aussi le rang et la colonne de l'ordre du paquet. Elle changeait de bande 10 mots par rapport à cette règle (Jaloux, Irrité, Fautif, Vulnérable, Espiègle, Optimiste, Curieux, Perplexe, Exclus, Calme). Écartée : la hauteur dans le quadrant n'est attestée par aucune source vérifiable, et l'utilisateur ne relit pas ces places (spec §2).
- **Les 33 mots qui ont un équivalent clair** :

| Mot | Famille | How We Feel | Quadrant de la liste | Carte (colonne, rang) | Bande |
|---|---|---|---|---|---|
| Embarrassé | Colère | embarrassed | haut gauche | 2, 4 | Moyenne |
| Insécurisé | Colère | insecure | bas gauche | 2, 3 | Moyenne |
| Jaloux | Colère | jealous | haut gauche | 2, 4 | Moyenne |
| Furieux | Colère | furious | haut gauche | 1, 6 | Haute |
| Enragé | Colère | enraged | haut gauche | 1, 6 | Haute |
| Irrité | Colère | irritated | haut gauche | 2, 4 | Moyenne |
| Répugnant | Dégoût | repulsed | haut gauche | 1, 4 | Moyenne |
| Dégoût | Dégoût | disgusted | bas gauche | 1, 3 (annexe : 1, 4) | Moyenne |
| Fautif | Tristesse | guilty | bas gauche | 2, 3 | Moyenne |
| Honteux | Tristesse | ashamed | bas gauche | 1, 3 | Moyenne |
| Impuissant | Tristesse | helpless | bas gauche | 1, 2 | Basse |
| Vulnérable | Tristesse | vulnerable | bas gauche | 2, 3 | Moyenne |
| Inspiré | Joie | inspired | haut droite | 5, 5 | Haute |
| Espiègle | Joie | playful | haut droite | 5, 5 | Haute |
| Optimiste | Joie | optimistic | haut droite | 5, 4 | Moyenne |
| Accompli | Joie | accomplished | haut droite | 6, 4 | Moyenne |
| Respecté | Joie | respected | bas droite | 5, 3 | Moyenne |
| Curieux | Joie | curious | haut droite | 4, 4 | Moyenne |
| Extasié | Joie | ecstatic | haut droite | 6, 6 | Haute |
| Confiant | Joie | confident | haut droite | 5, 4 | Moyenne |
| Énergique | Surprise | energized | haut droite | 5, 6 | Haute |
| Avide | Surprise | eager | haut droite | 4, 5 | Haute |
| Effrayé | Surprise | frightened | haut gauche | 2, 5 | Haute |
| Perplexe | Surprise | confused | haut gauche | 3, 4 (annexe : 3, 3) | Moyenne |
| Choqué | Surprise | shocked | haut gauche | 2, 5 | Haute |
| Terrifié | Peur | terrified | haut gauche | 1, 6 | Haute |
| Préoccupé | Peur | worried | haut gauche | 3, 4 | Moyenne |
| Exclus | Peur | excluded | bas gauche | 1, 3 | Moyenne |
| Calme | Sérénité | calm | bas droite | 5, 2 | Basse |
| Détendu | Sérénité | relaxed | bas droite | 5, 2 | Basse |
| Tranquille | Sérénité | tranquil | bas droite | 5, 1 | Basse |
| Serein | Sérénité | serene | bas droite | 6, 2 | Basse |
| En sécurité | Sérénité | safe | bas droite | 5, 2 | Basse |

- **Les 46 autres n'ont pas d'équivalent clair** et gardent l'annexe telle quelle : Dévasté, Amer, Défiant, Provocateur, Hostile, Mécontent, Retiré, Suspect, Sceptique, Sarcastique, Jugé, Aversion, Révolté, Détestable, Hésitant, Ignoré, Replié, Minable, Vide, Abandonné, Isolé, Amorphe, Indifférent, Ouvert, Sensible, Aimant, Provocant, Courageux, Important, Amusé, Libéré, Abasourdi, Désillusionné, Consterné, Craintif, Accablé (« overwhelmed » ou « écrasé », le plus ambigu), Incapable, Inférieur, Sans valeur, Inadéquat, Insignifiant, Non respecté, Ridiculisé, Apaisé, Reposé, Posé.
- **Les zones** comptent 9 et 8 mots (Haute), 27 et 12 (Moyenne), 17 et 6 (Basse), à gauche puis à droite : les comptes du §9.1 de l'annexe.

**Choix faits pendant la construction**
- **La carte** : six zones, celles des six tuiles (trois bandes, deux côtés), chacune large comme le panneau ; une tuile ouvre la carte sur sa zone entière. Dans une zone, les mots vont du plus haut au plus bas et du bord vers le centre, ceux d'une même famille côte à côte. Bulles rondes à la couleur de leur famille (`-tint-2` et `-text`, AA), d'un diamètre qui suit leur plus long mot (« Non respecté » sur deux lignes), 4 par ligne environ. Une petite légende (« Haute · plutôt désagréable ») en tête de chaque zone, en texte secondaire. « Toute la carte », un lien discret en texte secondaire au-dessus des tuiles, ouvre la carte au milieu : la bande Moyenne, de part et d'autre du centre.
- **Les tuiles** : le nom de l'énergie vient de la liste Énergie (il se renomme dans Réglages › Listes) ; deux ou trois mots d'exemple de la zone, de familles différentes quand elle en a, et **vus dès l'ouverture de la carte** : les zones Moyenne et Basse, plus hautes que le cadre, s'ouvrent sur leur haut, leurs exemples sont donc pris parmi leurs premiers mots (Préoccupé et Jugé ; Vide et Dévasté), vérifié à 390 × 844. Retoucher la tuile choisie efface l'énergie, comme tout choix ; l'autre tuile de la même énergie ne change que le côté, rien n'est écrit.
- **La fermeture** : 1,5 s après un mot. Un autre mot, un appui long, un doigt posé ou un glissement sur la carte relance le délai ; « ‹ Énergie » l'annule. Ouvrir « Maintenant ▾ » le suspend (l'écran ne se ferme pas sous la liste des heures) ; une heure choisie, ou la liste refermée, le relance. Supprimer un relevé du jour l'annule : l'écran reste, et « Relevé supprimé · Annuler » n'est pas remplacé par « Émotion du moment notée » ; un nouveau mot le réarme. Une tuile touchée quand un mot est déjà choisi rouvre la carte, et l'écran se ferme 1,5 s plus tard. « Fermer » dit « Émotion du moment notée » (avec « Annuler ») dès qu'un relevé existe, l'énergie seule comprise.
- **« Ce que je faisais » ouvert une fois pendant la saisie** suffit : l'écran ne se ferme plus seul, même replié ensuite. Ce repli et « C'était vers… » sont repliés à chaque ouverture ; les anciennes clés de l'iPhone (`carnet:moment:faisais`, `carnet:moment:vers`) ne sont plus lues.
- **Appui long** : 0,5 s ; la bulle montrée est cerclée à la couleur de sa famille, la définition s'affiche, rien n'est choisi. Seul le clic de pointeur qui suit l'appui est ignoré : un appui long levé hors de la bulle n'avale ni le clic suivant ni une activation au clavier. La garde de 350 ms vaut pour toute la vue (tuiles, carte, « ‹ Énergie », « Toute la carte »).
- **VoiceOver** : chaque zone est un groupe nommé par sa légende (« Basse · plutôt agréable »). Ouverte depuis une tuile, la carte met le focus sur la zone touchée, et ses mots viennent juste après ; depuis « Toute la carte », sur le titre « Émotion ».
- **La définition** s'affiche sous la carte : « Irrité : agacé par… », le mot à la couleur de sa famille. Les 79 textes sont dans `domain/definitions-roue.js` (figés) ; leur liste est plus bas, dans « Textes à relire ».
- **Réglages › Émotions** : dans « Ma saisie », après Listes, carré neutre comme ses voisins. Une carte par famille ; un toucher ouvre le champ du mot (le champ de texte de l'app, avec `aLaSortie` : il n'enregistre qu'à la sortie du champ, ou si l'app passe en arrière-plan, et la frappe reste dans le brouillon local ; vider le champ pour le réécrire ne retire donc pas la correction, et « Revenir au texte de Carnet » ne disparaît pas sous le doigt). Un champ vidé, ou remis au texte de Carnet, retire la correction. « Revenir au texte de Carnet » suit chaque mot corrigé.
- **La roue en familles de la v7** (`ui/composants/bulles.js`) est retirée avec ses styles.

### Lecteur de Bien-être (tâche 3)

**Choix faits pendant la construction**
- **Un seul lecteur** (`ui/composants/lecteur.js`) pour les séances du Programme et la cohérence cardiaque de l'onglet, plein écran, sans onglets. Avant : la durée et la posture, la description, un gros bouton lecture dans l'anneau, et les réglages du son dans une liste groupée dessous. Pendant : la consigne en grand en haut, l'anneau du temps de tout l'exercice et le bouton pause au milieu, « il reste 6:40 » dessous, puis Précédent, Suivant et « Terminer » en lien discret, près du pouce. Aucun repère « 3 sur 8 ».
- **Les sons sont fabriqués dans l'app** (`ui/composants/sons.js`, Web Audio), sans fichier ni réseau, et calés sur l'horloge audio : un bol de début d'environ 4 s, un bol d'étape plus court et plus doux, joué avant la voix, trois bols de fin à 1,2 s d'écart. Le souffle est un bruit rose filtré qui monte à l'inspiration et redescend à l'expiration ; il se tait pendant « Retiens ». Le son ne naît que dans un toucher (« Commencer », « Reprendre », le bouton lecture d'une carte).
- **Les réglages du lecteur** sont gardés sur l'iPhone (comme la voix en v7) : « Son : Aucun · Repères · Repères + souffle », « Jouer même en mode silencieux » (éteint : le son se tait en silencieux et se mêle à la musique ; allumé : il joue, et la musique se met en pause) et la lecture à voix haute, qui n'apparaît qu'avec une voix française. Ils ne valent que pour ce lecteur.
- **Pause, écran verrouillé, autre app ou sortie** coupent la voix et les sons et rendent le verrou d'écran ; « Reprendre » repart de l'étape, le souffle d'un début de cycle. Une seule séance par lecture.
- **La carte de la cohérence cardiaque** de Bien-être garde ses puces de durée et de rythme, réglées au même endroit que Moment difficile, et un bouton lecture qui la lance d'un toucher (`#/bien-etre/coherence`).

**Relecture de la tâche 3**
- **Une étape rythmée dure un nombre entier de cycles.** Les deux étapes rythmées de la respiration carrée passent de 52 à 48 s, soit trois cycles de 16 s ; leurs textes ne changent pas, et l'exercice dure 2:52 au lieu de 3:00. À 52 s, la première finissait sur une inspiration et la seconde repartait d'une inspiration : 8 s d'« Inspire » d'affilée.
- **Deux étapes rythmées au même rythme gardent le même cycle** : après une pause au milieu de la première (la reprise repart d'une inspiration), la seconde continue le cycle au lieu de repartir, et le souffle reste calé sur l'horloge audio d'une étape à l'autre.
- **En pause, l'écran garde la mise en page de la lecture** : « Reprendre » est à la place exacte de « Pause », et un second toucher au même endroit reprend. Les réglages du lecteur viennent sous l'écran de lecture : on les atteint en défilant.
- **La fin n'affiche que « Fin de l'exercice. »**, sans anneau : menée au bout ou non, rien ne dit ce qui a été fait.
- **Les textes de la cohérence cardiaque suivent les mots affichés**, pas le disque, qui ne bouge pas avec « Réduire les animations » : « Respire au rythme des mots, sans forcer. » et « Inspirer sur « Inspire », expirer sur « Expire ». ».

### Programme (tâche 4)

**Les étapes** (`domain/programme.js`, identifiants figés), dans l'ordre de l'annexe `programme-sophro.md` (§3), avec la spec §12.4 : Respiration abdominale ouvre le Programme à la place de « Premiers pas », qui n'est pas écrite. 8 étapes, 17 séances. L'écran ne montre que le titre des étapes, sans numéro.

| Étape (`id`) | Séances |
|---|---|
| Respirer (`respirer`) | Respiration abdominale · Pause d'une minute |
| Autour de toi (`autour-de-toi`) | Les sons · Ancrage 5-4-3-2-1 |
| Les cinq zones (`cinq-zones`) | Les cinq zones · Respiration carrée |
| Tendre et relâcher (`tendre-relacher`) | Relaxation dynamique des épaules · Mouvements lents |
| Zone par zone (`zone-par-zone`) | Tension et détente · Faire le point avec mon corps |
| Marcher, respirer en rythme (`marcher-rythme`) | Marche lente · Cohérence cardiaque (5 min) |
| Un lieu, un souvenir (`lieu-souvenir`) | Lieu ressource · Un bon moment passé · Un moment à venir |
| Le corps entier, ce qui compte (`corps-entier`) | Scan corporel · Ce qui compte pour moi |

**La présentation**, écrite une fois en tête de l'écran Programme : « Inspiré de la sophrologie et de la pleine conscience, de la respiration au corps entier. » et « Une façon de faire : une étape par semaine, une ou deux séances, si tu veux. Tu peux aller plus vite, plus lentement, sauter une étape ou revenir en arrière. » Ce rythme n'est jamais mesuré ni comparé.

**Choix faits pendant la construction**
- **8 séances nouvelles, et non 9** : la spec §6 en compte 9 avec « Premiers pas », que le §12.4 retire. Elles sont ajoutées à la fin de `domain/exercices.js`, avec les deux blocs « Arriver » (60 s) et « Revenir » (55 s), qui ouvrent et ferment Les sons, Les cinq zones, Un bon moment passé, Un moment à venir et Ce qui compte pour moi. Aucune n'a de rythme écrit : ni disque ni souffle.
- **Les exercices ne se lancent plus que depuis le Programme** (spec §2 et §3, « pas de séance hors du Programme, sauf la cohérence cardiaque ») : l'adresse `#/bien-etre/exercice/<id>` et son écran sont retirés, remplacés par `#/bien-etre/programme/<id>`. Une séance inconnue ramène au Programme.
- **« Faite le 12/10 »** : seule compte une séance lancée depuis le Programme et menée au bout (`programme` et `fin: true`, spec §12.2). La date est le jour de la séance (avant 4 h, la veille, comme partout), la plus récente ; l'année ne s'écrit que si ce n'est pas celle du jour (« Faite le 12/10/2025 »). Une coche à la couleur de Bien-être et le texte en secondaire, sous la durée. Une séance pas faite n'affiche rien.
- **`fin: true`** est posé sur toute séance menée au bout, d'où qu'elle vienne (Moment difficile, « Respirer », la carte de la cohérence) : le champ dit seulement « menée au bout ». Sans `programme`, elle ne date rien dans le Programme. Une séance notée en pause (après 60 s), puis reprise et menée au bout, reste une seule séance et prend `fin` à la fin.
- **La séance qui vient** : celle qui suit, dans l'ordre du Programme, la dernière séance faite (la plus récente, à l'heure près) ; au tout début, Respiration abdominale ; après Ce qui compte pour moi, de nouveau Respiration abdominale. Une séance sautée n'est jamais signalée.
- **La carte Programme de Bien-être** : un lien vers l'écran Programme (le carré à la feuille de Bien-être, « Programme › », la séance qui vient et « 5 min · assis ») et, à droite, le bouton lecture de 64, qui la lance d'un toucher ; le lecteur revient alors à Bien-être. Depuis l'écran Programme, un toucher sur une séance ouvre le lecteur, qui attend « Commencer », et revient au Programme : 1 toucher pour reprendre, 3 pour une séance au choix (la carte, la séance, lecture), comme dans l'annexe des propositions.
- **La cohérence cardiaque du Programme** dure 5 min, au rythme réglé dans Réglages › Moment difficile. Celle de la carte de Bien-être, de Moment difficile et de « Respirer » ne compte pas.
- **Les textes de l'annexe, retouchés** pour les règles de l'app : « Garde l'attention sur… » devient « Continue de remarquer tes pieds. » et « remarque ta respiration » ; « Pense à… » devient « Cherche… » et « Imagine… » ; « Tu n'as pas besoin de les nommer » devient « Pas besoin de les nommer » ; « Tu vas passer par cinq zones » devient « Cinq zones du corps, l'une après l'autre ». « Tu peux t'arrêter à tout moment. » est ajouté à chaque séance nouvelle (à la fin du bloc « Arriver », sinon dans la première étape), comme le demande la spec §6 : la première étape de Faire le point avec mon corps passe de 10 à 15 s pour le dire.
- **Le son dans « Les sons »** (question 11 de l'annexe, non tranchée) : le bol d'étape, comme ailleurs ; « Son : Aucun » le coupe.

**Relecture de la tâche 4**
- **Une séance d'une seule étape n'est menée au bout qu'au bout de tout son temps.** La cohérence cardiaque est sur sa dernière étape dès le début : avec la règle de la moitié, « Terminer » à 2:31 sur 5:00 la disait menée au bout, et le Programme affichait « Faite le 15/10 ». Elle ne l'est plus qu'une fois ses 5 min écoulées, comme dans Moment difficile ; arrêtée en route après 60 s, elle reste une séance pour Mes jours, sans `fin`. Les séances de plusieurs étapes gardent la règle de la moitié (annexe `programme-sophro.md`, §6.8). La carte de la cohérence de Bien-être suit la même règle, comme en v7.
- **Le titre « Programme » de la carte de Bien-être est un titre de niveau 2**, comme celui de la carte de la cohérence, et reste dans le lien : le rotor « Titres » de VoiceOver passe par les deux cartes. L'apparence ne change pas.

### Sommeil en heures, détails dans les cartes (tâche 5)

**Écart à la spec §7 bis : la Durée s'ouvre par « Durée › »** (prévu par la spec et le plan quand le soir ne tient plus). Mesuré dans WebKit à 390 × 797, la rangée Durée (4 + 44 px au moins) ne tient pas :
- avec le bandeau « Nouvelle version prête », la carte des points positifs n'a que 5,6 px de marge au-dessus de la bande du bas ;
- à 390 × 844, « J'ai fini pour ce soir » en a 6,6 avec le bandeau (P3), et la ligne Après coup 11,3 sans lui (P2).

Aucune carte ne se resserre davantage sans cibles de moins de 44. La carte Sommeil garde donc Mal · Moyen · Bien, et la Durée s'ouvre par le lien « Durée › » de sa tête, fermé au départ, à chaque ouverture de l'écran et à chaque changement de jour. Il ne s'ouvre jamais seul, même quand une durée est notée. La durée se note en 2 touchers au lieu d'un.

**Choix faits pendant la construction**
- **Le lien « Durée › »** dit la durée notée (« 6 h › », « 4 h ou moins › »). VoiceOver lit « Durée de la nuit : 6 h ». Ouverte, la rangée reste ouverte après un choix, pour qu'une erreur se corrige tout de suite (comme les rubriques du lot 2b). Elle se referme par le lien. Ouvert, le lien garde la largeur de la plus longue durée (« 4 h ou moins », par une copie invisible et muette) : en grand texte (21 px et plus), le titre passe sous le lien dès l'ouverture, et noter une durée ne le fait plus passer à la ligne (relecture : la carte grandissait de 26 à 34 px sous le doigt, et la rangée des durées descendait d'autant). Fermé, il n'a que sa largeur.
- **Les sept durées** sont sur deux rangées pleine largeur : 4 h ou moins à 7 h, puis 8 h à 10 h ou plus. Sept choix sur une rangée feraient 43 px de large. « ou moins » et « ou plus » passent en petit sous le nombre, en gris secondaire (--text-2), à la couleur du choix une fois choisi.
- **Un choix de durée ne change pas la mise en page**, à toutes les tailles de texte (relecture). Avec la coche devant les deux lignes, « 4 h ou moins » choisi passait sur trois lignes (« 4 h / ou / moins ») : la première rangée passait de 44 à 49,8 px et tout ce qui suit sautait au toucher. La correction proposée (coche plus serrée, « ou moins » sans retour à la ligne) faisait déborder le choix à 375 de large et en grand texte (19 à 25 px). La coche se met donc devant le nombre seul, qui passe en 600, et la précision garde toute la largeur du choix et sa graisse (400), choisi ou non : en 600, « ou moins » passait encore à la ligne au choix à 23 px. Elle passe à la ligne au besoin, choisie ou non, de la même façon.
- **En très grand texte**, quand la carte n'a plus 13,5 em (dès 26 px à 390 de large, 24 px à 375), les sept durées passent sur deux colonnes égales, comme Lieu (relecture : la grille de 12 gardait ses places de 3 et de 4, et les durées s'empilaient une par ligne, de deux largeurs).
- **« Détail › » et « Durée › »** sont en couleur action, 13/600, au bout de la première ligne du titre de la carte. Le titre passe dessous au besoin : « Contact / humain » et « Sport / mouvement » restent sur deux lignes, comme en v7. Le lien ne prend aucune hauteur. Sa cible fait 45 px de haut, mesurée par ce qu'on touche vraiment (elementFromPoint sur chaque point, au texte par défaut et de 21 à 28 px) : elle déborde sur les marges de la carte, 6 px plus haut que bas, et passe devant le titre. Relecture : centrée et derrière le titre, la boîte mesurait 44 mais « Bien » en prenait le bas (10 % de la cible de « Durée › ») et la 2e ligne de « Sport / mouvement », peinte après le lien flottant, 14 % de celle du Sport. Son bas reste au-dessus des choix de la carte, et son haut sous ceux de la carte du dessus : elle ne prend rien à aucun choix.
- **Le détail du Sport et du Contact** est une carte de rubrique (« Sport en détail », « Contact en détail », à leur couleur) en pleine largeur sous la paire, ou sous la carte quand Contact et Sport ne se suivent pas. Les deux peuvent être ouverts ensemble, dans l'ordre de la paire. Leurs replis quittent la liste, qui garde « Ce qui a pesé · ce qui a rechargé », « Notes libres » et, pour une nuit déjà notée, « Nuit en détail ». Les résumés de ces deux replis (« Marche 30 à 60 min ») ne sont plus affichés sur le soir. Ils restent dans l'Historique, la page d'un jour et l'Export PSY.
- **« Nuit en détail » masqué par défaut** : il se réaffiche dans Réglages › Le soir (« Nuit en détail · coucher, lever, réveils », sous les champs). Comme l'Humeur du soir en v6, le masque s'ajoute aux champs masqués déjà réglés par la migration 6 de la base, la mise à niveau du format 5 et « Revenir » vers une copie d'avant la v8. Sans réglage, la valeur par défaut s'applique à la lecture. **La migration 6, figée à la tâche 1, est donc modifiée** (empreinte du verrou mise à jour) : elle n'a jamais été publiée (la v8 n'est pas en ligne, et le site n'a pas de déploiement de branche). Elle relit la méta avant de l'écrire, pour qu'une base de la v5 (version 3), migrée d'un coup, garde aussi l'Humeur masquée par la migration 4 (vérifié dans WebKit et dans les tests unitaires). Une nuit qui a un coucher, un lever ou des réveils garde son repli, masqué ou non, carte Sommeil masquée comprise.
- **La durée de la nuit se lit partout où se lit la qualité** : « nuit moyen · 6 h » dans le résumé du jour, les puces de l'Historique et le détail d'un jour de Mes jours ; « nuit Mal · 6 h » dans l'Export PSY.
- **`dureeNuit(entree)`** (`analyse/fenetres.js`) rend la durée en heures : celle notée le soir, sinon celle du coucher au lever d'une nuit ancienne (de 2 à 16 h, comme avant), sinon rien. La durée médiane (Analyse, Vue soignants) en vient. L'ancien calcul en minutes s'appelle `minutesCoucherLever` : `dureeNuit` s'en sert pour les nuits anciennes (« Tes nuits selon le jour » le gardait aussi, jusqu'à son retrait le 26/10).
- **Analyse › Tous les chiffres** : Réveils, Coucher et Lever n'ont leur tuile que pour une période qui en a. « Durée de nuit » reste, et le tableau des chiffres gagne sa ligne.
- **Vue soignants** : la ligne s'appelle « Durée de nuit (médiane) » tant qu'aucune colonne n'a de coucher ni de lever médians. Sinon elle reste « Coucher · lever · durée (médianes) », et une colonne sans coucher ni lever n'y donne que sa durée. La page garde le même nombre de lignes.

**Le format de l'Export PSY change (v8, à signaler)** : la nuit dit ses heures, « nuit Mal · 6 h » (« nuit 6 h » sans la qualité, « 4 h ou moins », « 10 h ou plus »). Les réveils (« nuit Mal (2 réveils) ») et « coucher 23:10 lever 06:40 » ne restent que pour les nuits anciennes qui en ont.

### Comprendre et A4 (tâche 6)

**Écart à la spec §7 : sur l'A4, « Nuit par nuit » peut disparaître.** La page essaie 4 semaines, puis 2 (spec), puis aucune : la règle des 273 mm passe avant. Dans le cas extrême des tests (8 médicaments, 6 longues questions, une longue prochaine étape, les émotions à 4 chiffres), la page fait déjà 266 mm sans la section, et son seul titre en prend 7. Le reste de la page ne change jamais d'un trait, avec ou sans la section. Avec des données ordinaires, les 4 semaines tiennent (270 mm au plus dans les tests).

**Choix faits pendant la construction**
- **Mes nuits** (Comprendre › Rythmes, entre « Autour d'un retour au bureau » et « Après une nuit » ; d'abord au-dessus de « Tes nuits selon le jour », retiré le 26/10) : une ligne par nuit notée (qualité ou durée), dans l'ordre des jours. Le jour à gauche (« lun 12/10 », le jour qui suit la nuit, comme partout), une barre de 0 à 12 h (plus loin si une nuit ancienne a duré davantage), le texte de la nuit à droite (« Mal · 6 h », « Bien », « 7 h 40 »). La barre prend la rampe du sommeil de Mes jours (README 2b : une teinte, trois pas) ; sans qualité, elle est creuse ; une nuit sans durée n'a que son texte. Toujours les 4 dernières semaines (`SEUILS.comprendre.nuitsSemaines`), quelle que soit la période choisie : le titre le dit à droite. Le graphique apparaît dès qu'une nuit de la fenêtre a sa durée.
- **Contraste de la rampe** : le pas clair (Mal) n'a que 1,5:1 sur la carte en clair (1,8:1 en sombre), sous le plancher de 2:1 du contrôle des rampes (skill dataviz). Les jetons 2b ne changent pas : dans Mes nuits, la barre « Mal » et sa case de légende ont un contour de 1 px au pas « Moyen » (`.g-mes-nuits`, 2,9:1 en clair, 3,8:1 en sombre), et leur longueur se lit. La barre creuse (qualité non notée) reste vide, avec son contour plus épais à la couleur de la rubrique : les deux ne se confondent pas. Chaque ligne écrit aussi sa qualité et sa durée, et « Voir en tableau » les reprend. Tous les textes ont au moins 4,5:1, le contour au moins 2:1 (test e2e, en clair et en sombre). Mes jours garde la rampe 2b telle quelle.
- **Nuit par nuit, sur l'A4** : entre l'évolution et « Ce qui revient le plus », en 4 colonnes lues de haut en bas, une nuit par ligne (jour, barre, texte), à la rampe imprimée de la frise. La légende, au bout du titre : « barre : heures dormies, de 0 à 12 h · date : le jour qui suit la nuit ». Rien sans durée sur la fenêtre.
- **Q17** : « Énergie haute notée » suit la règle de l'énergie basse (oui dès un relevé « haute », non avec des relevés d'énergie sans « haute », inconnue sans relevé). « Hyperfocus » (le symptôme, son id fait foi) est oui le jour d'une fiche Hyperfocus, non un jour qui a une saisie du soir ou une autre fiche de symptôme, inconnu sinon : comme les explosions, un jour de relevés seuls ne vaut jamais « non ». Les deux viennent après les facteurs de la v6, avant ce qui a pesé et rechargé.
- **Q18 · « Émotions selon ce que je faisais »** : dans Comprendre › Énergie, juste après l'énergie selon ce que je faisais. Une ligne par activité, dans l'ordre de sa liste, découpée par famille, en nombres de relevés (le graphique des autres vues d'émotions). Un relevé de deux activités compte pour chacune. Le seuil (5 relevés) compte les relevés qui ont une émotion et une activité, une fois chacun.

### Après coup et rendez-vous (tâche 7)

- **Q20** : « Une autre façon de voir » vient aussi quand Honte ou Regret est touché dans « Plus tard », quel que soit le type, juste après « Ce que ça a donné ».
- **Q22** : dans la fiche d'un rendez-vous, sous « Une question pour ce rendez-vous… », les sujets de la liste `sujetRdv`.
  - Un toucher pose « Parler de : sommeil », un second la retire.
  - Une question cochée « abordée » reste : le toucher le dit (« Question déjà abordée : elle reste »), et seul son ✕ la retire.
  - Une question se modifie sur place.

### Fiabilité (tâche 8)

**À trancher sur l'iPhone : le soir avec les zones sûres.** Les tests simulent celles de l'iPhone en 390 × 844 (spec §12.7) : 47 px en haut, 34 en bas, soit 763 px de hauteur utile. Mesuré dans WebKit, en clair comme en sombre, à 21 h comme à 01:30 :
- le soir tient : 28,3 px entre la carte des points positifs et la bande du bas ;
- « J'ai fini pour ce soir » passe 19,7 px sous la bande (P3), et la ligne Après coup 69,7 px (P2) ;
- avec le bandeau « Nouvelle version prête » (114 px, dont les 47 de la zone), le soir passe 28,4 px sous la bande (point de vigilance 3), et « J'ai fini » 74,4 px.

Les tests de la v7 restaient aux tailles d'avant (844 sans zones, 797), qui laissent 34 px de plus que l'iPhone : verts, ils ne protégeaient rien. Ils tournent maintenant avec les zones, et les quatre attentes qui ne tiennent pas sont marquées `test.fail()` (`v7-aujourdhui.spec.js` : P2, P3, « J'ai fini » avec le bandeau ; `v8-sommeil.spec.js` : vigilance 3 avec le bandeau). Une marque qui passe fait échouer la suite : on la retire quand la mise en page change.

Le Diagnostic donne les deux marges réelles, « Marge du soir » et « Marge de « J'ai fini » », prises sur le soir d'aujourd'hui seulement (un autre jour a « Revenir à aujourd'hui » en plus), détails fermés (relecture finale : voir plus bas).

Pistes à proposer, aucune appliquée :
- un bandeau d'une seule rangée de 44 px sur Aujourd'hui : environ 23 px de gagnés (67 sous la zone aujourd'hui), il resterait 5 px à trouver pour le soir avec le bandeau ;
- « Mémo vocal » et « J'ai fini » plus serrés, ou ailleurs : les cartes ne peuvent plus se resserrer sans cibles de moins de 44 ;
- ou garder le défilement pour ce qui suit la dernière carte (« J'ai fini », Après coup) : le soir lui-même tient.

**Étapes à venir d'un parcours** : un contour de 1,5 px en --text-2, sans fond (README 2b : « contour (2a) »), à 5,6:1 sur le fond en clair et 7,3:1 en sombre. En --line, elles restaient sous le 3:1 des éléments graphiques (1,45:1 en clair).

### Contrôle global (tâche 9)

- **Captures de tous les écrans**, à 390 × 844 avec les zones sûres de l'iPhone simulées, en clair et en sombre, au texte par défaut et à 23 px. Elles sont comparées au système 2b et gardées hors du dépôt.
- **Corrigé : les tuiles de l'écran Émotion.** Leur contenu part maintenant du haut. Centré, il décalait de 8 px les deux noms d'énergie d'une rangée quand les mots d'exemple d'une tuile tenaient sur deux lignes et ceux de l'autre sur une : en Haute, « Extasié Énergique / Amusé » face à « Furieux Terrifié Choqué ». Le test est dans `v8-emotion.spec.js`, au texte par défaut, à 21 et à 23 px, tuile choisie comprise.
- **Le test de contrôle** (`v7-controle.spec.js`) passe maintenant aussi par les écrans de la v8 :
  - la Durée et le détail du Sport, ouverts dans leurs cartes ;
  - la carte de l'Émotion : une zone et un mot, puis toute la carte et un sens montré par un appui long ;
  - le Programme et ses « Faite le » ;
  - le lecteur : avant de commencer, une étape rythmée, la pause et la fin ;
  - la cohérence cardiaque de l'onglet, avant et pendant ;
  - Mes nuits, en graphique et en tableau, avec une nuit sans qualité et une nuit sans durée ;
  - « Émotions selon ce que je faisais » (Q18), en graphique et en tableau : les relevés d'émotion versés ont maintenant ce que je faisais, une ou deux activités (relecture : sans eux, la carte restait sur « Pas encore assez de données », sans graphique à mesurer) ;
  - Réglages › Émotions, avec un sens corrigé ouvert dans son champ.

  Il compte 49 écrans, contre 41. Tout texte visible a au moins 4,5:1 sur son fond, aucun cadre n'est en tirets, et tout choix fait a sa coche. À 390 px, au texte par défaut et à 23 px, rien ne sort de l'écran de côté.
- **Un test instable stabilisé** : « deux touchers rapides » (point de vigilance 5) a échoué une fois sous la charge de `npm test`. Entre les deux touchers, à 120 ms d'écart sur l'horloge de la page, le temps réel s'ajoutait, et la garde de 350 ms expirait. L'horloge de la page est maintenant arrêtée pendant les deux touchers, puis relancée. Le test passe dans `npm test`, et il échoue toujours avec une garde de 100 ms.
- **Vu et laissé tel quel** :
  - le séparateur « · » des messages (« Fin de l'exercice. · Noter mon émotion »), au milieu de la place libre : c'est le message commun de l'app depuis la v6 ;
  - dans les graphiques, le texte des SVG ne grandit pas avec le grand texte, comme ailleurs dans Comprendre ;
  - le lecteur en très grand texte. Les 17 séances ont été mesurées étape par étape, avec les zones sûres. Au texte par défaut et à 19 px, rien ne défile. À 21 px, une étape défile de 2 px. À 23 px, 8 étapes de 6 séances défilent, de 6 à 72 px. Avec les consignes les plus longues, le bas de l'anneau et « il reste » passent alors sous Précédent et Suivant. La consigne reste entière en haut, la voix et les bols ne changent pas, et l'anneau revient en défilant. Réduire la consigne ou l'anneau en grand texte irait contre le grand texte, et c'est à juger sur l'iPhone (« À essayer sur l'iPhone »).

### Relecture finale

- **La marge du soir du Diagnostic est celle du soir, détails fermés.** Elle était reprise au dernier affichage du soir, détails ouverts compris. Or la durée se note chaque soir par « Durée › », et la rangée reste ouverte après le choix : après une saisie ordinaire, le Diagnostic disait « −71,7 px (le soir défile) » d'un soir qui tient (28,3 px fermé, dans WebKit avec les zones). Elle n'est plus prise, ni quand la fenêtre change de taille, tant que « Durée › » ou le « Détail › » du Sport ou du Contact est ouvert ; refermés, la mesure reprend. Test : `v8-fiabilite.spec.js` (Q27, détails fermés).
- **Le repère Bien-être de Mes jours est un losange plein.** Le contour arrondi de la v8 (Q29) faisait, sur 30 jours, un ovale de 5 × 8 px qui se lisait « 0 » : la rangée disait « 0  00 00 », comme un compteur à zéro. Le losange est plein, à la couleur de Bien-être (3,9:1 sur la carte en clair, 8,3:1 en sombre), de 8 px sur 7 jours et de 6 sur 30, avec 2 px entre deux jours voisins (1 au moins, par mois sur 5 ans). Il ne se confond ni avec « nuit bien », une barre du même bleu en sombre, ni avec un chiffre. Toujours le même repère, sans nombre.
- **Les légendes de la carte de l'Émotion sont rangées contre le centre**, comme les bulles : celle de gauche alignée à droite, celle de droite à gauche. « Toute la carte » s'ouvre au milieu et ne montre que la moitié de chaque zone Moyenne : les deux légendes étaient hors du cadre, et rien ne disait quel côté était désagréable et lequel agréable. Elles tiennent maintenant dans cette moitié, à la marge de la page du bord de l'écran. Quand la place manque, la légende passe à la ligne après l'énergie (« Moyenne · », puis « plutôt désagréable ») : à 390 de large au texte par défaut, seule « Moyenne · plutôt désagréable » le fait ; à 375, les trois de gauche ; en grand texte, davantage. La légende ne change pas de place entre « Toute la carte » et une tuile. Test : `v8-emotion.spec.js`, à 390 et 375 de large, au texte par défaut et à 23 px.
- **Un test instable stabilisé** : « la Vue soignants ouverte à froid lit la base une seule fois » (Q26) a échoué une fois dans une suite complète, avec deux lectures des rendez-vous. Aujourd'hui, ouvert au rechargement, lit les rendez-vous (le prochain) ; sous charge, sa lecture tombait après la pose des compteurs. Le test attend maintenant Aujourd'hui avant d'ouvrir la Vue soignants, comme son voisin.

### Le format de l'Export PSY change (v8, à signaler)

Si l'assistant PSY de l'utilisateur lit la nuit d'un jour, ses consignes sont à mettre à jour :
- la nuit dit ses heures : « nuit Mal · 6 h », « nuit 6 h » sans la qualité, « 4 h ou moins », « 10 h ou plus » ;
- les réveils (« nuit Mal (2 réveils) ») et « coucher 23:10 lever 06:40 » ne restent que pour les nuits anciennes qui en ont ;
- le Programme et le Bien-être n'y paraissent toujours pas.

### En attente de l'utilisateur

- **Le soir avec les zones sûres** (tâche 8). À 390 × 844, « J'ai fini pour ce soir » et la ligne Après coup passent sous la bande du bas, comme le soir avec le bandeau de mise à jour (point de vigilance 3). Les pistes sont plus haut. Les attentes sont marquées `test.fail()` en attendant la marge réelle de l'iPhone.
- **La Durée en deux touchers** : « Durée › » (tâche 5), un écart prévu par la spec.
- **Nuit par nuit sur l'A4** peut disparaître dans le cas extrême (tâche 6).
- **Les textes à relire** : les 79 définitions et les 8 séances nouvelles (plus bas), dans l'app, après la publication.
- **Deux titres voisins dans Comprendre › Énergie** : « Selon ce que tu faisais » (v6), puis « Émotions selon ce que je faisais » (le titre de la spec, Q18).
  - Ils se suivent avec deux personnes différentes. Le titre de la spec est gardé ; « Avant mes jours à énergie basse » et « Mes nuits » disent aussi « mes ».
  - À harmoniser si l'utilisateur le veut.
- **Les points en attente de la v7 restent ouverts** : le pire cas du soir à 8 rubriques, « Effacer définitivement » en rouge, la rubrique du soir « Humeur ». Seule la ligne de CLAUDE.md sur le vocabulaire de la roue a été ajoutée, le 22/10.

### Retiré à la demande de l'utilisateur (26/10)

- **« Tes nuits selon le jour »** (Comprendre › Rythmes) est retiré : « Mes nuits » le remplace. Ce graphique ne comptait que les nuits qui ont un coucher et un lever (`nuitsParSoir`, par `minutesCoucherLever`). Depuis la v8, le soir ne les propose plus (le sommeil se note en heures et en qualité, « Nuit en détail » est masqué par défaut) : seules les nuits anciennes l'alimentaient, et en « 3 mois » il aurait toujours fini sur « Pas encore assez de données pour le dire ». Des trois choix laissés à la relecture finale (le garder, le masquer sans nuit, le retirer), l'utilisateur a pris le dernier.
  - Retirés avec lui : `nuitsParSoir` (`analyse/comprendre.js`), `GrapheNuits` et sa géométrie (`geometrieNuits`, `DIM_NUITS`, `AXE_NUITS`), sa règle « Pourquoi ? » (`REGLES_COMPRENDRE.nuits`), ses classes (`.g-nuit`, `.g-pointille`, `.g-marque`) et ses tests.
  - Restent : `minutesCoucherLever`, dont `dureeNuit` tire la durée des nuits anciennes (Mes nuits, Analyse, Vue soignants) ; les seuils `minValeurs` et `minColonnes`, qui servent aux colonnes. Les nuits anciennes gardent leur coucher et leur lever, que l'Analyse et l'Export PSY lisent toujours.
  - Rythmes montre désormais, dans l'ordre : selon le jour de la semaine, selon le lieu, autour d'un retour au bureau, Mes nuits, après une nuit, selon le mois.
  - Tests : `v6-comprendre.spec.js` (la carte n'est plus là ; les nuits anciennes des 180 jours paraissent dans Mes nuits) et `v8-comprendre.spec.js` (Mes nuits entre « Autour d'un retour au bureau » et « Après une nuit »).

### À essayer sur l'iPhone

- **Les sons en mode silencieux.**
  - « Jouer même en mode silencieux » éteint : le lecteur se tait en silencieux et se mêle à la musique.
  - Allumé : il joue, et la musique se met en pause.
  - Moment difficile et « Respirer » restent muets au départ.
- **Le souffle** : un bruit doux qui monte pendant l'inspiration et redescend à l'expiration, calé sur le disque. À essayer : son volume, sa douceur, et les bols de début, d'étape et de fin.
- **La marge réelle du soir.** Le Diagnostic (appui long sur la version, dans Réglages) donne la hauteur utile, les zones sûres, la « Marge du soir » et la « Marge de « J'ai fini » » de l'app installée. Elles sont prises sur le soir d'aujourd'hui, détails fermés : « Durée › » ouverte, le soir défile, et ce n'est pas sa marge. Elles sont à comparer aux valeurs simulées : 28,3 px et −19,7 px (tâche 8).
- **La carte de l'Émotion sous le pouce** : le glissement, l'appui long (0,5 s) à côté du défilement, la taille des bulles.
- **Le lecteur écran verrouillé**, la voix française du système, et le grand texte d'iOS sur la carte, le lecteur et le Programme.

### Textes à relire après la publication

Écrits pour Carnet (spec §4 et §6) : des phrases courtes, au tutoiement pour les séances, sans jugement, sans promesse d'effet ni conseil de santé. L'utilisateur les relit dans l'app, après la publication (spec §2).

**Les 79 définitions** (`public/js/domain/definitions-roue.js`, figées comme la roue). L'app les affiche après le mot et les deux-points, en minuscule (« Irrité : agacé par… »). Une définition se corrige dans Réglages › Émotions ; « Revenir au texte de Carnet » retire la correction. Le texte de Carnet ne change que par une nouvelle version.

#### Colère (16)

- **Embarrassé** : Gêné devant les autres, au point d'en rougir.
- **Dévasté** : Bouleversé, comme si tout s'était effondré d'un coup.
- **Insécurisé** : Pas sûr de soi ni de sa place, sur le qui-vive.
- **Jaloux** : Contrarié de voir un autre avoir ce qu'on voudrait, ou de craindre de perdre quelqu'un.
- **Amer** : Plein de rancœur après une déception ou une injustice.
- **Défiant** : Qui tient tête, prêt à s'opposer.
- **Furieux** : En très grande colère, avec du mal à se contenir.
- **Enragé** : Submergé par la colère, au point de ne plus penser à autre chose.
- **Provocateur** : Qui cherche à piquer les autres ou à les faire réagir.
- **Hostile** : Fermé, prêt à se défendre ou à attaquer face à quelqu'un.
- **Mécontent** : Pas satisfait de ce qui se passe ou de ce qu'on a reçu.
- **Irrité** : Agacé par quelque chose qui gêne ou qui se répète.
- **Retiré** : En retrait, à distance des autres.
- **Suspect** : Soupçonneux, sur ses gardes, on doute des intentions des autres.
- **Sceptique** : Qui doute, pas convaincu par ce qu'on entend.
- **Sarcastique** : Qui se moque avec des mots piquants, souvent pour dire un agacement.

#### Dégoût (7)

- **Jugé** : Regardé et évalué par les autres, comme sous un examen.
- **Aversion** : Une forte envie de s'éloigner de quelque chose ou de quelqu'un.
- **Répugnant** : Écœuré par quelque chose qui repousse.
- **Révolté** : Choqué par ce qui paraît injuste, au point de vouloir s'y opposer.
- **Dégoût** : Un écœurement, l'envie de se détourner de quelque chose.
- **Détestable** : On se trouve, ou on trouve une chose, difficile à supporter.
- **Hésitant** : Partagé entre plusieurs choix, du mal à se décider.

#### Tristesse (12)

- **Fautif** : Avec le sentiment d'avoir fait du tort ou d'être responsable de ce qui arrive.
- **Honteux** : L'envie de se cacher, de disparaître du regard des autres.
- **Ignoré** : Ni vu ni entendu par les autres, comme si on n'était pas là.
- **Replié** : Refermé sur soi, sans envie d'aller vers les autres.
- **Impuissant** : Sans prise sur ce qui arrive, rien ne semble possible.
- **Vulnérable** : Exposé, à découvert, facile à blesser.
- **Minable** : Petit et piteux à ses propres yeux.
- **Vide** : Plus rien à l'intérieur, comme engourdi.
- **Abandonné** : Laissé seul par quelqu'un sur qui on comptait.
- **Isolé** : Seul, à l'écart, loin des autres.
- **Amorphe** : Sans élan, le corps et l'esprit au ralenti.
- **Indifférent** : Rien ne touche ni n'intéresse vraiment, pour le moment.

#### Joie (16)

- **Inspiré** : Plein d'idées et d'élan, l'envie de créer ou d'agir.
- **Ouvert** : Disponible, prêt à accueillir les autres et ce qui vient.
- **Espiègle** : D'humeur joueuse, l'envie de taquiner gentiment.
- **Sensible** : Touché, réceptif à ce qui se passe et aux autres.
- **Optimiste** : Confiant dans la suite de ce qui se passe.
- **Aimant** : Plein d'affection pour quelqu'un.
- **Provocant** : Audacieux et taquin, qui ose.
- **Courageux** : Prêt à faire face à quelque chose de difficile.
- **Accompli** : Satisfait d'avoir mené quelque chose au bout.
- **Respecté** : Pris au sérieux et considéré par les autres.
- **Important** : Compter pour les autres, avoir sa place.
- **Curieux** : L'envie de découvrir, de comprendre, d'en savoir plus.
- **Amusé** : Quelque chose fait sourire ou rire.
- **Extasié** : Émerveillé, transporté de joie.
- **Libéré** : Soulagé d'un poids, plus léger.
- **Confiant** : Sûr de soi ou des autres, on peut compter dessus.

#### Surprise (8)

- **Énergique** : Plein d'élan, le corps prêt à bouger.
- **Avide** : Impatient, plein d'envie pour ce qui arrive.
- **Effrayé** : Saisi d'un coup, le sursaut de la peur.
- **Abasourdi** : Sonné par une nouvelle inattendue, sans voix.
- **Perplexe** : Sans savoir quoi penser, les idées s'embrouillent.
- **Désillusionné** : Ce qu'on espérait ne s'est pas réalisé, l'élan retombe.
- **Consterné** : Abattu et sans voix devant ce qui arrive.
- **Choqué** : Secoué par quelque chose de brutal ou d'inattendu.

#### Peur (12)

- **Terrifié** : Envahi par une peur très forte.
- **Craintif** : Inquiet de ce qui pourrait arriver, sur la réserve.
- **Accablé** : Écrasé par trop de choses à la fois.
- **Préoccupé** : L'esprit pris par un souci qui revient.
- **Incapable** : Avec l'impression de ne pas pouvoir y arriver.
- **Inférieur** : Moins que les autres, à ses propres yeux.
- **Sans valeur** : Avec l'impression de ne compter pour rien.
- **Inadéquat** : Pas à la hauteur de ce qui est attendu.
- **Insignifiant** : Tout petit, comme si on ne comptait pas.
- **Exclus** : Laissé en dehors d'un groupe ou de ce qui se fait.
- **Non respecté** : Pas considéré : ses limites ou sa parole sont mises de côté.
- **Ridiculisé** : Moqué devant les autres, rendu ridicule.

#### Sérénité (8)

- **Calme** : Rien ne s'agite, ni dedans ni autour.
- **Apaisé** : La tension est retombée, le corps se relâche.
- **Détendu** : Les muscles et l'esprit relâchés.
- **Reposé** : Le corps a récupéré, l'énergie est revenue.
- **Tranquille** : Sans souci pour l'instant, rien ne presse.
- **Serein** : En paix avec ce qui est, sans inquiétude.
- **Posé** : Stable et réfléchi, on prend son temps.
- **En sécurité** : À l'abri, rien ne menace.

**Les 8 séances nouvelles** (titres et étapes, avec la durée de chaque étape). Un texte se corrige dans `public/js/domain/exercices.js` ; les identifiants ne changent pas. Les blocs communs « Arriver » et « Revenir » y sont recopiés. Les 8 séances de la v7 gardent leurs textes (« Exercices à relire », à l'entrée v7).

#### Les sons (5 min, `les-sons`)

Écouter les sons proches, puis plus loin, sans les nommer. Posture : assis.

1. Installe-toi assis, les pieds à plat. Debout ou allongé, c'est possible aussi. *(15 s)*
2. Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont. *(10 s)*
3. Sens les endroits où ton corps touche le siège, le sol ou le lit. *(20 s)*
4. Laisse ta respiration comme elle est, sans rien changer. Tu peux t'arrêter à tout moment. *(15 s)*
5. Écoute les sons proches : dans la pièce, sur toi, ta respiration. *(40 s)*
6. Écoute les sons plus loin : le bâtiment, la rue, dehors. *(40 s)*
7. Pas besoin de les nommer. Remarque quand un son commence et quand il s'arrête. *(45 s)*
8. Si un son te gêne, tu peux te boucher les oreilles, changer de pièce ou t'arrêter. *(15 s)*
9. Remarque les moments plus calmes entre deux sons, s'il y en a. *(30 s)*
10. Écoute tous les sons à la fois, sans en choisir un. *(30 s)*
11. Inspire un peu plus fort. Bouge les doigts et les orteils. *(15 s)*
12. Étire-toi comme tu en as envie : les bras, le dos, le cou. *(15 s)*
13. Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi. *(15 s)*
14. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Les cinq zones (6 min, `cinq-zones`)

Passer par cinq zones du corps, puis le corps entier. Posture : assis ou allongé.

1. Installe-toi assis, les pieds à plat. Debout ou allongé, c'est possible aussi. *(15 s)*
2. Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont. *(10 s)*
3. Sens les endroits où ton corps touche le siège, le sol ou le lit. *(20 s)*
4. Laisse ta respiration comme elle est, sans rien changer. Tu peux t'arrêter à tout moment. *(15 s)*
5. Cinq zones du corps, l'une après l'autre. Dans chacune, remarque ce qui est là, ou rien. *(15 s)*
6. La tête et le visage : le front, les yeux, la mâchoire. *(30 s)*
7. Si la mâchoire est serrée, laisse les dents se séparer un peu. *(15 s)*
8. Le cou, les épaules, les bras, jusqu'aux mains. *(35 s)*
9. La poitrine et le dos. Remarque le dos contre son appui, s'il y en a un. *(35 s)*
10. Le ventre, qui bouge avec la respiration. *(30 s)*
11. Le bassin, les jambes, jusqu'aux pieds. *(35 s)*
12. Le corps entier, d'un coup, tel qu'il est maintenant. *(30 s)*
13. Inspire un peu plus fort. Bouge les doigts et les orteils. *(15 s)*
14. Étire-toi comme tu en as envie : les bras, le dos, le cou. *(15 s)*
15. Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi. *(15 s)*
16. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Mouvements lents (4 min, `mouvements-lents`)

Tourner la tête et le buste, hausser les épaules, lentement. Posture : debout ou assis.

1. Mets-toi debout, les pieds écartés, les genoux souples. Assis, c'est possible aussi. Tu peux t'arrêter à tout moment. *(20 s)*
2. Tourne lentement la tête vers la droite, puis vers la gauche, sans forcer. Trois fois. *(30 s)*
3. Remets la tête au milieu. Remarque ce que tu sens dans le cou. *(20 s)*
4. Laisse les bras pendre. Tourne doucement le haut du corps à droite, puis à gauche. Les bras suivent sans effort. *(45 s)*
5. Arrête-toi au milieu. Remarque ce que tu sens dans le dos et les bras. *(20 s)*
6. Inspire et monte les épaules. Expire et laisse-les retomber. Trois fois, à ton rythme. *(40 s)*
7. Laisse les bras le long du corps. Remarque les épaules et les mains. *(25 s)*
8. Fais quelques pas sur place. Sens le poids passer d'un pied à l'autre. *(30 s)*
9. Reste immobile. Respire comme d'habitude. *(20 s)*
10. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Faire le point avec mon corps (3 min, `point-corps`)

Une question à la fois : faim, soif, chaud ou froid, fatigue. Posture : là où tu es.

1. Fais une pause là où tu es, les yeux ouverts si tu veux. Tu peux t'arrêter à tout moment. *(15 s)*
2. As-tu faim ? Un peu, beaucoup, pas du tout ou « je ne sais pas » : tout se vaut. *(20 s)*
3. As-tu soif ? *(15 s)*
4. As-tu besoin d'aller aux toilettes ? *(15 s)*
5. As-tu chaud, froid, ou ni l'un ni l'autre ? *(15 s)*
6. Y a-t-il un endroit tendu ou douloureux : la mâchoire, les épaules, le ventre ? *(25 s)*
7. Es-tu fatigué ? *(15 s)*
8. Y a-t-il trop de bruit, de lumière ou de monde autour de toi ? *(20 s)*
9. Si quelque chose est apparu, tu peux t'en occuper maintenant : boire, manger, te couvrir, sortir. *(25 s)*
10. Reprends quand tu veux. *(10 s)*

#### Marche lente (5 min, `marche-lente`)

Marcher lentement, en remarquant chaque pas. Posture : en marchant.

1. Trouve un endroit pour faire quelques pas : un couloir, une pièce, un chemin calme. Tu peux t'arrêter à tout moment. *(20 s)*
2. Debout, sens le poids du corps sur tes deux pieds. *(20 s)*
3. Marche plus lentement que d'habitude. Les bras comme tu veux. *(30 s)*
4. Remarque le talon qui touche le sol, puis la plante du pied, puis les orteils. *(60 s)*
5. Au bout de l'espace, arrête-toi, puis fais demi-tour. *(15 s)*
6. Remarque le pied qui se lève, avance, puis se pose. *(60 s)*
7. Si ton esprit part ailleurs, reviens aux pieds, sans te juger. *(20 s)*
8. Si marcher lentement te gêne, marche à ton pas habituel. Continue de remarquer tes pieds. *(60 s)*
9. Arrête-toi. Sens tes deux pieds sur le sol. *(20 s)*
10. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Un bon moment passé (6 min, `bon-moment-passe`)

Retrouver un moment passé, même petit, par les sens et les gestes. Posture : assis ou allongé.

1. Installe-toi assis, les pieds à plat. Debout ou allongé, c'est possible aussi. *(15 s)*
2. Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont. *(10 s)*
3. Sens les endroits où ton corps touche le siège, le sol ou le lit. *(20 s)*
4. Laisse ta respiration comme elle est, sans rien changer. Tu peux t'arrêter à tout moment. *(15 s)*
5. Choisis un moment passé qui s'est bien passé, même petit : un repas, un trajet, une conversation. *(40 s)*
6. Si rien ne vient, prends un moment neutre et récent : ce matin, un café, une douche. *(15 s)*
7. Où étais-tu ? Regarde le lieu : les formes, les couleurs, la lumière. *(45 s)*
8. Écoute les sons de ce moment. Remarque les odeurs, la température. *(45 s)*
9. Que faisais-tu ? Repasse les gestes, un par un. *(45 s)*
10. Si un souvenir pénible arrive, ouvre les yeux et regarde autour de toi. Tu peux t'arrêter là. *(15 s)*
11. Remarque ton corps maintenant : les épaules, le ventre, la respiration. Il peut y avoir quelque chose, ou rien. *(40 s)*
12. Laisse ce moment. Reviens aux appuis de ton corps. *(20 s)*
13. Inspire un peu plus fort. Bouge les doigts et les orteils. *(15 s)*
14. Étire-toi comme tu en as envie : les bras, le dos, le cou. *(15 s)*
15. Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi. *(15 s)*
16. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Un moment à venir (6 min, `moment-a-venir`)

Imaginer un moment simple des prochains jours, par les sens. Posture : assis ou allongé.

1. Installe-toi assis, les pieds à plat. Debout ou allongé, c'est possible aussi. *(15 s)*
2. Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont. *(10 s)*
3. Sens les endroits où ton corps touche le siège, le sol ou le lit. *(20 s)*
4. Laisse ta respiration comme elle est, sans rien changer. Tu peux t'arrêter à tout moment. *(15 s)*
5. Choisis un moment simple des prochains jours : un repas, une promenade, un moment seul. *(40 s)*
6. Prends un moment qui ne t'inquiète pas. Si celui-ci te tend, choisis-en un plus petit. *(15 s)*
7. Où seras-tu ? Regarde le lieu : les formes, les couleurs, la lumière. *(45 s)*
8. Qu'y aura-t-il autour de toi : les objets, les sons, la température ? *(45 s)*
9. Que feras-tu ? Repasse les gestes, un par un. *(45 s)*
10. Remarque ton corps maintenant, pendant que tu y penses : les épaules, le ventre, la respiration. *(40 s)*
11. Laisse ce moment. Reviens aux appuis de ton corps. *(20 s)*
12. Inspire un peu plus fort. Bouge les doigts et les orteils. *(15 s)*
13. Étire-toi comme tu en as envie : les bras, le dos, le cou. *(15 s)*
14. Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi. *(15 s)*
15. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Ce qui compte pour moi (6 min, `ce-qui-compte`)

Choisir un mot qui compte pour toi, et une chose qui va avec. Posture : assis.

1. Installe-toi assis, les pieds à plat. Debout ou allongé, c'est possible aussi. *(15 s)*
2. Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont. *(10 s)*
3. Sens les endroits où ton corps touche le siège, le sol ou le lit. *(20 s)*
4. Laisse ta respiration comme elle est, sans rien changer. Tu peux t'arrêter à tout moment. *(15 s)*
5. Voici des mots : calme, honnêteté, curiosité, justice, liberté, ordre, création, lien. Choisis-en un, ou un autre à toi. *(40 s)*
6. Si aucun mot ne vient, remarque ta respiration jusqu'à la fin. *(15 s)*
7. Cherche une chose faite ces derniers jours qui va avec ce mot, même petite. *(45 s)*
8. Où étais-tu ? Que faisais-tu, geste par geste ? *(45 s)*
9. Remarque ton corps en y pensant : les épaules, le ventre, la respiration. *(40 s)*
10. Imagine une petite chose des prochains jours qui irait avec ce mot. Tu n'as rien à décider. *(40 s)*
11. Laisse le mot. Reviens aux appuis de ton corps. *(20 s)*
12. Inspire un peu plus fort. Bouge les doigts et les orteils. *(15 s)*
13. Étire-toi comme tu en as envie : les bras, le dos, le cou. *(15 s)*
14. Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi. *(15 s)*
15. Reprends ce que tu faisais quand tu veux. *(10 s)*

## 2026-10-30 : v9.0.0, l'émotion comme How We Feel, en plein écran

Source : les retours de l'utilisateur sur l'écran Émotion de la v8 (carte trop petite, bulles ternes, 26 mots agréables pour 53 désagréables) et ses captures de How We Feel, avec ses choix du 28/10. Spec : `docs/superpowers/specs/2026-10-28-carnet-v9-design.md`, qui fait foi, avec son §13 (précisions après relecture), et ses annexes (`visuel-hwf.md` pour les mesures et les couleurs, `carte-proposee.json` pour les 144 mots, `apercu-carte.html`, la maquette validée). Plan : `docs/superpowers/plans/2026-10-28-carnet-v9.md`, en 8 tâches, une par commit, chacune relue puis corrigée. Version 9.0.0, publiée en une fois.

La base reste en `DB_VERSION` 6 : aucun magasin ne change, les mots à soi vivent dans une méta. La sauvegarde passe au `FORMAT_VERSION` 7 (`docs/format-sauvegarde.md`). Les sauvegardes des formats 1 à 6 restent importables, et aucun relevé n'est réécrit : un ancien relevé garde son mot, sa famille seule, sa note ou son énergie.

### Décisions de l'utilisateur (spec §2, 28/10)

- **Comme How We Feel, en plein écran** : l'enchaînement, la forme et l'esthétique, sauf les écarts de la spec §3. D'abord une couleur, puis des mots voisins à comparer, avec leur définition.
- **Couleurs de zone** : rouge (énergie haute, désagréable), jaune (haute, agréable), bleu (basse, désagréable), vert (basse, agréable), en dégradé. Un mot a la couleur de sa zone partout dans l'app.
- **144 mots, 36 par zone**, comme How We Feel : les 79 mots de la roue, plus 65 mots de How We Feel traduits.
- **Fatigué et Épuisé sans famille** : ils ne comptent que par zone. Survolté prend la case de « Hyper » (rouge). Libéré prend le sens de « libre », et Soulagé est ajouté. Insouciant remplace Ensommeillé, qui ne venait pas de How We Feel.
- **Après la flèche** : « Ce que je faisais » en plein écran, facultatif, puis fermeture.
- **Analyse** : une vue par zone, à côté des familles qui restent ; 4 bulles avec le nombre de relevés, et une barre par semaine.
- **Mot à soi** : un nom, une zone, une famille et une définition facultative.
- **Exports** : une ligne de zones dans l'Export PSY et sur la page A4 des soignants.
- **Bien-être façon « Tools »** : plus tard, hors de la v9.

### Appels du concepteur, à vérifier (spec §11 et §13)

- Fond noir aussi en thème clair, pour tous les écrans du relevé.
- Titre de l'écran 1 en phrase, « Touche la couleur la plus proche de ce moment » ; « Maintenant ▾ » sous les bulles.
- Toucher une couleur n'écrit rien ; toucher un mot écrit. Retoucher le mot choisi l'efface, énergie comprise (règle de Carnet, pas de How We Feel).
- Un relevé se rouvre depuis Ma journée de n'importe quel jour, Historique compris, directement sur l'écran 3 ; il s'y supprime.
- « Aucune » parmi les familles d'un mot à soi.
- Énergie d'un mot : rangs 1 à 4 basse, 5 à 8 moyenne, 9 à 12 haute (son effet est à trancher : « En attente de l'utilisateur »).
- Les graphiques par famille gardent leurs couleurs de famille ; ce qui montre des relevés ou des mots prend la couleur de zone.
- Ligne de zones nommée par couleurs (rouge, jaune, bleu, vert), avec une légende sur la page A4.
- `FORMAT_VERSION` 7.

### Identifiants (plan)

- **Mot de la roue** : `roue:<famille>:<slug>`, inchangé. Les 79 mots de la v8 gardent identifiant, libellé et famille ; les 65 ajouts vont à la fin de chaque famille, dans l'ordre de `carte-proposee.json`, et sont figés à leur tour.
- **Mots sans famille** : `roue:aucune:fatigue` et `roue:aucune:epuise`. `aucune` est un préfixe réservé, absent des familles : `familleDe` rend `null`.
- **Mot à soi** : `roue:perso:u-<8 chiffres hexadécimaux>`, comme un élément de liste créé par l'utilisateur. Son libellé, sa zone, sa famille et sa définition sont dans la méta `motsPerso`, jamais dans l'identifiant : renommé ou changé de zone, il garde ses relevés.
- Toute fonction qui lit un mot (libellé, famille, zone, énergie, définition) prend en dernier paramètre facultatif la méta `motsPerso`. Les domaines restent purs.

### Les mots et la carte (tâche 1)

- **La grille 12 × 12** (`domain/carte-roue.js`) remplace celle de 6 × 6 de la v8 : colonne 1, la plus désagréable, à 12, la plus agréable ; rang 1, l'énergie la plus basse, à 12, la plus haute. Rouge : colonnes 1 à 6, rangs 7 à 12 ; jaune : 7 à 12 et 7 à 12 ; bleu : 1 à 6 et 1 à 6 ; vert : 7 à 12 et 1 à 6. 144 cases toutes différentes, 36 par zone. Un seul mot de la v8 change de zone : Accablé passe du bleu au rouge (« Overwhelmed »).
- **L'énergie** d'un relevé se déduit du rang du mot, au toucher. Un mot à soi prend « haute » en rouge ou en jaune, « basse » en bleu ou en vert. Les relevés existants gardent l'énergie saisie.
- **Les mots à soi sur la carte** : hors du carré, du côté extérieur de leur zone (rouge et bleu à gauche, jaune et vert à droite), colonne par colonne vers l'extérieur, en partant du bord d'énergie extérieur, dans l'ordre de création. Ils prennent la couleur de la case du bord de leur zone, sur leur rang.
- **Les définitions** (`domain/definitions-roue.js`) : 144. Les 64 ajouts de la proposition gardent leur texte ; celui d'Insouciant est écrit pour Carnet. Six textes de Carnet changent (plus bas, « Textes à relire »).
- **Relecture** : les mots sans famille ne comptent dans aucune vue par famille (Mes jours par semaine et par mois, la page A4, Comprendre, « Émotions selon ce que je faisais ») : plus de clé « null », plus de relevé compté en trop. Réglages › Émotions gagne une section « Sans famille » (Fatigué, Épuisé), au point creux. Tranquille garde le « rien ne presse » de la v8 et laisse « sans souci » à Insouciant.
- **Rupture de vocabulaire (30/10/2026)**, comme le demande la proposition validée (`carte-proposee.json`, règle 4) : à partir de cette date, les comptes par famille (Ma semaine, Comprendre « Selon le mois », la Vue soignants, les COMPTEURS de l'Export PSY) mêlent deux vocabulaires, celui de la v8 avant, celui de la v9 après. La Joie passe de 16 à 51 mots ; dans la zone verte, 21 mots de joie pour 15 de sérénité (v8 : 4 pour 8 dans la moitié basse agréable de la carte). Concentré, Productif, Compétent, Fort et Déterminé sont en joie : une longue concentration notée « Concentré » compte en Joie. Fatigué et Épuisé, nouveaux, ne comptent dans aucune famille. Une hausse de la Joie après le 30/10 peut donc venir du vocabulaire seul. L'énergie, elle aussi, se lit autrement : elle vient du rang du mot (« En attente de l'utilisateur », plus bas).

### Mots à soi, validation et sauvegarde (tâche 2)

- **`domain/mots-perso.js`**, pur : création (le nom et la zone suffisent ; un nom déjà sur la carte, sans tenir compte des accents ni de la casse, est refusé), modification, mise de côté, effacement (refusé si le mot sert dans un relevé), mots actifs.
- **Validation** : un relevé qui cite un mot à soi n'est accepté que si ce mot est dans `motsPerso`, lue dans la même transaction à l'écriture, prise dans le fichier à l'import. « Vérifier mes données » les reconnaît.
- **Import** : un relevé qui cite un mot à soi absent du fichier recrée ce mot, mis de côté, « Mot sans libellé », sans zone : rien n'est perdu (point de vigilance 4). L'aperçu d'import nomme « les mots ajoutés à la carte des émotions ».
- **Format 7** : une sauvegarde au format 6 y passe sans aucun changement. Un témoin au format 6, écrit par le tag v8.0.0 (énergie seule, Accablé, définitions corrigées, séance « Faite »), rejoint ceux des formats 1 à 5.
- **Relecture** : les mots actifs (la loupe) sont ceux de la carte, une seule règle. Un mot recréé à l'import puis remis en service sans couleur n'y entre pas.

### Couleurs de zone (tâche 3)

- **Jetons** `--c-zone-rouge`, `-jaune`, `-bleu`, `-vert`, avec les six rôles du système 2b, en clair et en sombre (`tokens.css`) ; `-fill` est la couleur médiane de la bulle de How We Feel (visuel §1.5). Classes `.zone-*`.
- **Points** : un relevé a le point de la zone de son mot dans Ma journée ; l'en-tête d'Aujourd'hui, l'Historique et Après coup ont un point par zone présente, sans doublon, dans l'ordre rouge, jaune, bleu, vert. Un ancien relevé sans zone (famille seule de la v7, note de 1 à 10, énergie seule) a un point creux neutre.
- **Mes jours, en mode jour** : les points par zone, avec la légende des 4 zones (« Énergie haute · désagréable »…). Les graphiques par famille ne changent pas.
- **Relecture** : les mots à soi passent dans toute l'Analyse, Comprendre, En consultation, la Vue soignants et l'Export PSY (leur nom, leur zone, leur famille s'ils en ont une). Aucun identifiant `roue:perso:…` n'est affiché.

### Écrans 1 et 2 : les quatre bulles et la carte (tâche 4)

- **Plein écran noir**, dans les deux thèmes, sans barre d'onglets ni en-tête de Carnet ; la route reste `#/moment`.
- **Écran 1** : ✕ et la loupe en verre (48 × 44), le titre en gras (`ui-serif` en v9, police système depuis la v10), les quatre bulles en dégradé vertical sur trois halos de leur couleur médiane qui tournent lentement, « Maintenant ▾ » dessous (les heures de « C'était vers… »). Mesures et couleurs de `visuel-hwf.md` §1.
- **Toucher une couleur** ouvre la carte sur le milieu de sa zone, sans rien écrire. La carte s'y arrête au bord des bulles : des bulles jusqu'aux bords de l'écran, jamais de noir vide sur le côté.
- **Écran 2, la carte** : les 144 mots et les mots à soi, en bulles de 96 à la couleur de leur case (visuel §2.5, extrapolation bridée au-delà du 3ᵉ pas), texte noir en gras (`ui-serif` en v9, police système depuis la v10), corps = diamètre / 8, AA vérifié pour chaque case. Elle défile dans les deux sens, dans son cadre ; la page ne défile jamais de côté. Un voile noir en haut.
- **Toucher un mot** écrit le relevé tout de suite (le mot et l'énergie de sa case) : la bulle devient la double capsule de 156, recentrée au milieu de l'écran, ses voisines passent à 120 puis 108, et la carte du bas monte (le mot dans la couleur de sa case, éclaircie jusqu'à 4,5:1 sur le gris, sa définition, le rond blanc et la flèche « Continuer »). Un autre mot remplace le premier, énergie comprise ; retouché, le mot s'efface avec son énergie, et le relevé part s'il ne reste rien.
- **Garde de 350 ms** après chaque changement de vue (point de vigilance 5). « Réduire les animations » fige tout : halos à leurs décalages mesurés, recentrage d'un coup. En très grand texte, les libellés se réduisent jusqu'à un plancher et passent à la ligne dans leur bulle ; la carte du bas grandit au lieu de couper la définition (point de vigilance 2).
- **Relecture** : la garde vaut aussi après un mot choisi, pendant que la carte glisse jusqu'à lui (un second toucher rapide tombait sur un autre mot). ← vient avant la carte pour VoiceOver et le clavier. Spec §13.5 à la lettre : le mot effacé, une heure « vers » garde le relevé, qui se lit « Aucun mot ».

### Écran 3 et relevé rouvert (tâche 5)

- **Écran 3**, après la flèche : le mot en rappel dans sa couleur ; « Pour récupérer, je… » d'abord si la règle « Me ressourcer » joue ; « Ce que je faisais », les pastilles écrites au toucher ; « Terminer » et ✕ ferment avec « Émotion du moment notée ». Garde de 350 ms : un second toucher sous la flèche ne tombe pas sur « Terminer ».
- **`#/moment/ID`** : un relevé rouvert s'ouvre sur l'écran 3, avec son mot, ou « Aucun mot » pour un ancien relevé, son jour et son heure, « Changer le mot » (la carte, son mot choisi), « Ce que je faisais » et « Supprimer ce relevé » (confirmation, puis « Relevé supprimé · Annuler »). Ni « Maintenant ▾ » ni « Pour récupérer, je… ». Un identifiant inconnu renvoie sur Aujourd'hui.
- **Ma journée** : chaque ligne de relevé est un lien avec son chevron, pour tous les jours, Historique compris.
- **Relecture** : à l'ouverture, le message de l'écran d'avant se ferme. Rouvert aussitôt après « Terminer », le relevé avait « Émotion du moment notée · Annuler » par-dessus son mot, et cet Annuler retirait de la base le relevé affiché.

### La loupe et le mot à soi (tâche 6)

- **La loupe**, en haut à droite des écrans 1 et 2 : une recherche plein écran, champ actif (une amorce prend le focus pendant le toucher, pour que l'iPhone ouvre le clavier). Elle cherche sans accents ni casse dans les noms, puis dans les définitions, corrections comprises : les noms qui commencent par le texte, puis ceux qui le contiennent, puis les définitions. Chaque résultat montre le mot à la couleur de sa zone et le début de sa définition. Le toucher choisit le mot comme sur la carte (la loupe ne l'efface jamais), puis la carte s'ouvre centrée sur lui.
- **« Ajouter mon mot « … » »**, sans résultat ou sous les résultats, sauf si un mot de la carte porte ce nom : l'écran du mot à soi, nom prérempli, les quatre bulles en petit. Le mot naît au premier choix de couleur et entre aussitôt dans le relevé, avec l'énergie de sa zone ; famille (7 et « Aucune ») et définition le complètent au toucher. La couleur choisie a un anneau autour de sa bulle. La flèche ouvre la carte, centrée sur lui, hors du carré de sa zone.
- **Réglages › Émotions › « Mes mots »** : les mots de la carte, puis ceux mis de côté. Une rangée touchée devient le même formulaire. « Mettre de côté » si le mot sert dans un relevé, « Effacer » sinon (avec confirmation, vérifié dans la transaction), « Remettre sur la carte » s'il a une couleur. Les relevés ne sont jamais réécrits.
- **Relecture** : le message d'un nom refusé reste tant que le champ montre ce nom ; aucune famille n'est cochée d'avance ; l'aide et la confirmation d'effacement suivent l'état du mot.

### Tes zones et exports (tâche 7)

- **Analyse, « Tes zones »**, juste après « Tes émotions » : les quatre bulles en petit, chacune avec « N relevés » sur la période choisie ; dessous, la barre par semaine sur les 12 dernières semaines, en 4 couleurs empilées, avec sa phrase-résumé et « Voir en tableau ». Sous 5 relevés avec un mot, « Pas encore assez de données pour le dire. » ; « Pourquoi ? » dit que seuls comptent les relevés qui ont un mot. Ni pourcentage ni zone mise en avant.
- **Export PSY** : sous chaque semaine des COMPTEURS, « zones : rouge 3 · jaune 2 · bleu 9 · vert 5 », zones à zéro omises, absente sans relevé à zone.
- **Page A4** : « Émotions par zone (relevés) » sous les familles, une valeur par colonne, et la légende des zones au bout du titre « Indicateurs ». Le cas extrême tient sous 273 mm.
- **Relecture** : dans le détail d'une semaine touchée, le premier « · » tient au nom de la semaine par une espace insécable ; même correction pour Mes jours, Ta journée et la barre touchée de Comprendre (Q29).

### Contrôle global (tâche 8)

- **Captures**, dans WebKit à 390 × 844 avec les zones sûres de l'iPhone simulées, en clair et en sombre, gardées hors du dépôt : écran 1, carte sans mot et avec un mot choisi (Calme, la case de « Calm »), écran 3, loupe (un résultat, puis aucun), création d'un mot (avant et après sa couleur), « Tes zones », Aujourd'hui et sa liste du jour, Historique, Réglages › Émotions › « Mes mots » (fermé et ouvert). Comparées à `apercu-carte.html` et aux captures de How We Feel : rien à corriger. Les écrans du relevé sont les mêmes dans les deux thèmes, sur leur fond noir.
- **Le test de contrôle** (`v7-controle.spec.js`) passe aussi par la loupe (un mot trouvé), l'écran du mot à soi (une couleur choisie), ce mot sur la carte, « Tes zones » en tableau et « Mes mots » (un mot ouvert), avec un mot à soi et Fatigué dans les relevés versés : 56 écrans, contre 49 en v8. Tout texte visible a au moins 4,5:1 sur son fond, rien n'est en tirets, rien ne sort de l'écran à 390 px (au texte par défaut et à 23 px), et il vérifie maintenant aussi qu'aucune violation de la CSP ne survient sur tout le parcours.
- **Choix fait sans coche** : la couleur choisie d'un mot à soi est marquée par un anneau autour de sa bulle (une forme, pas la couleur seule), comme le mot choisi de la carte l'est par sa double capsule. Le contrôle l'accepte sans coche si cet anneau se voit : un contour plein d'au moins 2 px, à 2 px au moins du disque, à 3:1 au moins sur son fond (blanc sur le noir du relevé, couleur du texte dans Réglages).
- **Mots interdits** : tous les textes de l'app passent `trouverInterdits` (`ton.test.js`), les 144 définitions aussi (`definitions-roue.test.js`).
- **Version 9.0.0** (package.json, precache).
- **CLAUDE.md** : la règle du vocabulaire de la roue vaut pour les 144 mots ; préfixe réservé `roue:aucune:` des mots sans famille, identifiant `roue:perso:u-<8 hexa>` des mots à soi, dont le libellé, la zone et la famille vivent dans `motsPerso` (ajouté le 30/10, avec l'accord de l'utilisateur).

### Relecture finale (trois relecteurs : écrans, données, règles)

- **Couleurs de zone en clair** : l'accent assombri pour le 3:1 rendait le jaune olive (voisin de la Tristesse), le rouge et le bleu voisins de la Colère et de la Surprise, alors que les bulles de la même carte gardaient les couleurs de How We Feel. Une marque de zone (point du jour, rond d'un relevé, point de Mes jours, barre de Tes zones, rond de légende) est maintenant peinte à la couleur des bulles (`-fill`), dans les deux thèmes, avec un liseré à l'accent qui porte le 3:1 sur le fond clair ; en sombre, il s'y fond.
- **La carte du bas** : le mot et sa définition au même corps, 17 sur 18,3 (visuel §2.8, au lieu de 17 et 15,5 de la maquette) ; le mot et trois lignes tiennent dans la capsule de 100 pt (au texte par défaut, seule la définition de Jaloux la fait grandir).
- **La carte autour du mot choisi** : la fenêtre visible (deux colonnes et quatre rangs de chaque côté, et sa transposée) reprend la table mesurée de visuel §2.2 ; au-delà, les colonnes restent droites, au pas de 106. Les colonnes se resserrent comme sur la capture de How We Feel.
- **Ouverte sur le rouge ou le jaune**, la carte vient au milieu de la zone et laisse la place du voile et des boutons : les mots du rang 12 (Terrifié, Paniqué, Euphorique…) ne passent plus sous ← et la loupe.
- **Au clavier**, le contour d'une grande bulle de l'écran 1 passe au-delà de ses halos (16 pt) et au-dessus des voisines.
- **Écran 3** : une activité choisie a la couleur de la case du mot, la même que le mot en rappel (Vide : un seul bleu).
- **Ma journée en très grand texte** : la colonne de l'heure suit le corps, « vers 12 h » ne passe plus sous le point de zone.
- **L'écran de l'émotion laissé ouvert** (l'iPhone verrouillé après un mot, rouvert le lendemain) : après plus de 30 min d'absence, il se ferme comme les autres écrans. Avant, un mot touché le matin réécrivait le relevé de la veille.
- **L'identifiant d'un relevé neuf** est tiré une seule fois, avant les essais d'écriture, comme en v8 : un essai qui a écrit sans réponse ne laisse plus de doublon.
- **Import** : la méta `motsPerso` d'un fichier écrit à la main est remise dans la forme que l'app écrit (`normaliserPerso`) : libellé coupé à 40 signes, zone, famille et définition lisibles, seul `true` met de côté, un nom déjà pris sur la carte met le mot de côté. Aucun relevé n'est perdu.
- **Contre-relecture, mot sans couleur** : un mot à soi importé sans zone de la carte est aussi mis de côté, comme un mot recréé. Il revient en deux temps (sa couleur, puis « Remettre sur la carte », qui refuse un nom déjà pris) : avant, il restait « pas mis de côté » sans être sur la carte, et le choix de sa couleur l'y faisait entrer sans vérifier son nom (deux bulles « Calme »). `modifierMot` vérifie aussi le nom d'un tel mot quand une couleur l'y fait entrer.
- **Réglages › Me ressourcer** dit ce qui fait jouer la règle depuis la v9 : un mot d'énergie basse (les quatre rangs du bas de la carte, ou un mot à soi bleu ou vert), et non la bulle « Énergie basse » seule.

### Le format de l'Export PSY change (v9, à signaler)

Si l'assistant PSY de l'utilisateur lit les COMPTEURS, ses consignes sont à mettre à jour :
- sous chaque semaine, une ligne « zones : rouge 3 · jaune 2 · bleu 9 · vert 5 » : rouge = énergie haute, désagréable ; jaune = haute, agréable ; bleu = basse, désagréable ; vert = basse, agréable. Zones à zéro omises, ligne absente sans relevé à zone ;
- les 65 mots nouveaux et les mots à soi apparaissent par leur nom dans les lignes du jour (« émotions : … », « humeur du moment ») ;
- Fatigué, Épuisé et un mot à soi sans famille n'entrent dans aucun compte par famille des COMPTEURS (« émotions : colère 2 · … ») ; ils comptent dans la ligne des zones ;
- un relevé dont le mot a été effacé, mais qui garde son heure « C'était vers… », reste (spec §13.5 ; de la v6 à la v8, il était supprimé) : il se lit « vers 12 h » seul dans « humeur du moment », sans mot ni énergie, et son jour paraît même sans autre saisie ;
- les comptes par famille changent de vocabulaire le 30/10/2026 (« Rupture de vocabulaire », plus haut) : une hausse de la Joie peut venir des mots seuls.

### En attente de l'utilisateur

- **Les textes à relire** (plus bas), dans l'app, après la publication : Réglages › Émotions, où une définition se corrige.
- **L'énergie déduite du rang du mot** (spec §7 et §11) : les 48 mots des rangs 5 à 8 enregistrent « énergie moyenne », alors que leur bulle dit « Énergie haute » ou « Énergie basse » : Fatigué et Calme sont sous « Énergie basse », Inquiet et Concentré sous « Énergie haute ». Ma journée affiche « Fatigué · énergie moyenne ». La règle « Me ressourcer » ne joue pas pour Fatigué ni pour Calme, mais joue pour Reconnaissant ou Serein (Réglages › Me ressourcer le dit maintenant) ; Comprendre « Avant mes jours à énergie basse », la rangée « Énergie basse » de Mes jours et Ta journée ne comptent pas un jour qui n'a que Fatigué, et comptent un jour avec Reconnaissant. Deux voies : garder les trois bandes (spec §7, l'état actuel), ou suivre les bulles (rangs 1 à 6 basse, 7 à 12 haute). La seconde change `energieDe` (`domain/carte-roue.js`) et ses tests ; les relevés déjà notés gardent l'énergie enregistrée.
- **Un relevé « vers » dont le mot est effacé** : garder la règle de la spec §13.5 (il reste, « Aucun mot » dans Ma journée, « vers 12 h » seul dans l'Export PSY), ou revenir à celle des v6 à v8 (il part avec son mot). Pour revenir : `CONTEXTE.humeurs = ['vers']` dans `domain/champs.js`, retirer « Aucun mot » de `texteReleve` (`domain/releves.js`), et reprendre les tests du commit b10fe4f (champs, repository, releves, v6-saisie, v9-emotion).
- **Les points en attente de la v7 et de la v8 restent ouverts** (le soir avec les zones sûres, « Durée › » en deux touchers, Nuit par nuit sur l'A4, les deux titres voisins de Comprendre › Énergie…).

### À essayer sur l'iPhone

- **La barre d'état en thème clair au-dessus des écrans noirs** (spec §12) : rien n'est réglé. Si elle reste claire au-dessus du noir, une piste est de passer `theme-color` en noir le temps du relevé.
- **La police** : levé en v10, la police système remplace New York partout (« Utilise la police iPhone »), carte des émotions comprise ; il n'y a plus de corps à caler pour elle.
- **La carte sous le doigt** : le défilement dans les deux sens, sa fluidité sur l'iPhone 13 Pro, le recentrage doux après un mot, les halos qui tournent, et « Réduire les animations ».
- **La loupe** : le clavier qui s'ouvre dès le toucher.
- **Le grand texte d'iOS** sur les bulles, la carte du bas et l'écran du mot à soi.

### Textes à relire après la publication

Écrits pour Carnet (spec §6 et §13.3) : des phrases courtes, neutres, sans le mot d'une autre bulle. Une définition se corrige dans Réglages › Émotions ; « Revenir au texte de Carnet » retire la correction. Le texte de Carnet ne change que par une nouvelle version.

**Les six textes de Carnet qui changent** (le texte de la v8, puis celui de la v9) :

- **Mécontent** : « Pas satisfait de ce qui se passe ou de ce qu'on a reçu. » devient « Ce qui se passe, ou ce qu'on a reçu, ne convient pas. »
- **Accompli** : « Satisfait d'avoir mené quelque chose au bout. » devient « Ce qu'on avait entrepris est achevé, on en voit le résultat. »
- **Extasié** : « Émerveillé, transporté de joie. » devient « Transporté par une joie immense. »
- **Libéré** : « Soulagé d'un poids, plus léger. » devient « Libre de ses mouvements, plus rien ne retient. »
- **Craintif** : « Inquiet de ce qui pourrait arriver, sur la réserve. » devient « Sur la réserve, on redoute ce qui pourrait arriver. »
- **Tranquille** : « Sans souci pour l'instant, rien ne presse. » devient « Le temps s'écoule doucement, sans hâte ni agitation. »

**Les définitions des 65 ajouts**, à la fin de leur famille, dans l'ordre de `domain/roue.js`. Celle d'Insouciant est écrite pour Carnet ; les 64 autres viennent de la proposition.

#### Colère (2)

- **En colère** : Remonté contre quelqu'un ou quelque chose, ça chauffe à l'intérieur.
- **Frustré** : Empêché d'arriver à ce qu'on voulait, l'envie reste coincée.

#### Dégoût (1)

- **Mépris** : On regarde quelqu'un ou quelque chose de haut, avec froideur.

#### Tristesse (4)

- **Ennui** : Le temps paraît long, rien n'accroche.
- **Triste** : Le cœur lourd, avec parfois l'envie de pleurer.
- **Découragé** : Plus le cœur à continuer, l'effort semble ne mener à rien.
- **Désespéré** : Plus aucun espoir que les choses s'arrangent.

#### Joie (35)

- **Euphorique** : Une joie vive, un peu étourdissante.
- **Électrisé** : Un frisson de joie qui parcourt tout le corps.
- **Aux anges** : Débordant de bonheur, comme en apesanteur.
- **Déterminé** : Décidé à aller au bout de ce qu'on a choisi.
- **Fort** : Avec prise sur ce qui arrive, on peut agir.
- **Enthousiaste** : Plein d'ardeur pour ce qu'on est en train de faire.
- **Joyeux** : Le sourire facile, une joie qui se voit.
- **Productif** : Les choses avancent, on fait ce qu'on voulait faire.
- **Fier** : La tête haute pour ce qu'on a fait ou ce qu'on est.
- **Heureux** : La vie paraît belle en ce moment, on en profite.
- **Motivé** : Prêt à s'y mettre, avec l'envie de le faire.
- **Gai** : Une humeur légère et agréable, sans raison particulière.
- **Concentré** : L'esprit tout entier pris par ce qu'on fait.
- **Vivant** : Plein de vie, présent dans son corps et dans le moment.
- **Stimulé** : Tiré vers le haut par quelque chose d'exigeant.
- **Réjoui** : Une petite joie, quelque chose fait plaisir.
- **Ravi** : Enchanté par ce qui arrive, la joie est franche.
- **Compétent** : Capable de faire ce qu'on a à faire, et on le sent.
- **Compris** : Ce qu'on vit ou ce qu'on pense est saisi par quelqu'un d'autre.
- **Épanoui** : Avec le sentiment de grandir et d'être pleinement soi.
- **Comblé** : Un bonheur plein et doux, qui enveloppe tout.
- **Apprécié** : Ce qu'on fait ou ce qu'on est plaît aux autres, et ils le montrent.
- **Soutenu** : Quelqu'un est là, sur qui s'appuyer.
- **Aimé** : Avec la sensation de recevoir l'affection de quelqu'un.
- **Relié** : Proche des autres, quelque chose passe entre eux et soi.
- **Compatissant** : La peine d'un autre résonne en soi, avec l'envie de l'aider.
- **Inclus** : Accueilli dans un groupe, on en fait partie.
- **Reconnaissant** : L'envie de dire merci pour ce qu'on a reçu.
- **Bienveillant** : Tourné vers les autres avec douceur, sans arrière-pensée.
- **Écouté** : Ce qu'on dit est entendu et pris en compte.
- **Content** : Ce qu'on a suffit, sans chercher plus loin.
- **Accepté** : Reçu tel qu'on est, sans avoir à changer.
- **Ému** : Le cœur chaviré par quelque chose de beau ou de tendre.
- **Chanceux** : La vie a été généreuse, on le mesure.
- **Satisfait** : Ce qu'on attendait est arrivé, tel qu'on le voulait.

#### Surprise (4)

- **Surpris** : Pris de court par quelque chose d'inattendu.
- **Émerveillé** : Saisi par quelque chose de grand ou de beau, qui dépasse.
- **Emballé** : Conquis par une idée ou un projet, l'envie de s'y lancer tout de suite.
- **Épaté** : Impressionné par quelque chose qu'on n'aurait pas cru possible.

#### Peur (10)

- **Paniqué** : La peur fait perdre ses moyens, on ne sait plus quoi faire.
- **Survolté** : Trop d'énergie, le corps et la tête n'arrivent plus à ralentir.
- **Stressé** : Mobilisé sans relâche, sans pouvoir souffler.
- **Sous pression** : Poussé par ce que les autres attendent ou par un délai qui approche.
- **Anxieux** : Une peur sans objet précis, qui serre la gorge ou le ventre.
- **Agité** : Impossible de tenir en place, le corps a besoin de bouger.
- **Apeuré** : Face à quelque chose ou à quelqu'un qui fait peur.
- **Tendu** : Les muscles crispés, le corps prêt à réagir.
- **Inquiet** : Dans l'attente, on se demande comment ça va tourner.
- **Mal à l'aise** : Pas bien dans la situation, quelque chose cloche.

#### Sérénité (7)

- **À l'aise** : Bien dans la situation, rien ne gêne.
- **Bien** : Ça va, tout simplement.
- **Pensif** : Absorbé par ses pensées, calmement, sans qu'elles tournent en rond.
- **Équilibré** : Chaque chose à sa place, ni trop ni trop peu.
- **Solide** : D'aplomb, sur des bases qui tiennent.
- **Insouciant** : L'esprit léger, sans aucun souci en tête.
- **Soulagé** : Ce qui pesait ou faisait mal vient de s'arrêter.

#### Sans famille (2)

- **Fatigué** : Le corps ou la tête demandent du repos.
- **Épuisé** : À bout de forces, même les petites choses coûtent.

## 2026-11-02 : v10.0.0, des exercices pour chaque moment (en construction)

Spec : `docs/superpowers/specs/2026-10-30-carnet-v10-design.md`. Plan : `docs/superpowers/plans/2026-10-30-carnet-v10.md`. Cette entrée se complète à chaque tâche ; la version n'est pas publiée.

### Le contenu : exercices, souffle, propositions, favoris, entrées (tâche 3)

- **10 exercices ajoutés à la fin de `EXERCICES`** (les 16 identifiants d'avant ne bougent pas) : six pour Bien-être et l'écran 3, puis les quatre de Moment difficile. Ils n'entrent pas dans le Programme, qui ne change pas.
- **Le soupir** : le souffle gagne un temps, `inspi2` (absent, il vaut 0 : les souffles d'avant la v10 ne changent pas ; sinon 3 s au plus), avec la phase `inspire-encore` et le mot « Encore un peu ». Le disque, le mot et le son le suivent à la tâche 4.
- **Durée au choix** (1, 3 ou 5 min) : l'étape marquée `repete` s'allonge ou se raccourcit, en cycles entiers si elle est rythmée, et l'arrivée et la fin ne changent pas. **3 min au départ**, tant que rien n'est retenu. Le temps des étapes fixes (27 s pour le soupir, 30 s pour les deux autres) est choisi pour que tout tombe juste à 3 min, et pour qu'à 1 min, la durée qu'on choisit quand on est pressé, l'étape qui se répète garde au moins la moitié du temps : 4 soupirs (36 s sur 63), 3 longues expirations (30 s sur 60), 30 s sur 60 pour le noting. Aucune étape ne répète la posture : l'écran « avant » dit déjà « là où tu es ». L'expiration longue et le noting font exactement 1, 3 et 5 min ; le soupir, en cycles de 9 s, fait 63 s, 180 s et 297 s.
- **Les exercices de Moment difficile ont des étapes rythmées** (trois soupirs, longues expirations) : le disque et le mot de la phase y guident, sans son de souffle (tâche 4). Ils font 2 min, 3 pour « Réveil la nuit ». Chacun dit qu'on peut bouger et passer une étape : le bouton « Suivant » du lecteur le permet déjà.
- **« Poser l'attention » n'est pas écrit** : « attention » est un mot interdit de l'app (`tests/aides/mots-interdits.js`). « Réveil la nuit » dit « Sens tes pieds. », et ne parle pas de sommeil (liste `PROMESSES`).
- **`voix`** s'ajoute à la méta `respiration` (booléen, faux au départ) : une méta écrite avant la v10 reste valide. L'interrupteur arrive à la tâche 5.
- **Favoris** : `normaliserFavoris` ignore un identifiant inconnu, un doublon et ce qui n'est pas une liste ; rien n'est tiré de la liste, aucun nombre. `basculerFavori` n'ajoute pas un identifiant inconnu.
- **Les trois modules nouveaux de `domain/`** (`propositions.js`, `favoris.js`, `entrees-bien-etre.js`) ne sont branchés aux écrans qu'aux tâches 4 et 8. D'ici là, `tests/unit/code-mort.test.js` les nomme dans une liste exacte, à vider à mesure : un autre module orphelin fait échouer le test, et un module branché aussi, tant qu'il reste dans la liste.

**La table « Pour ce moment : »** (spec §8), à relire, dans `domain/propositions.js` :

| zone | exercices proposés |
|---|---|
| rouge | Le soupir · Ancrage court · Expiration longue |
| jaune | Savourer · Noter ce qui passe |
| bleu | Scan court · Expiration longue · Noter ce qui passe |
| vert | Savourer · Expiration longue |

### Exercices à relire (titres et étapes)

Écrits pour Carnet, à relire par l'utilisateur : une consigne par écran, phrases courtes, tutoiement, ton neutre, aucune promesse d'effet ni conseil de santé. Ce sont des techniques communes : aucun texte, aucun nom de séance n'est repris d'une autre app. Un texte se corrige dans `public/js/domain/exercices.js` ; les identifiants ne changent pas.

#### Le soupir (1, 3 ou 5 min, `soupir`)

Une inspiration, une petite en plus, une longue expiration. Posture : là où tu es.

1. Inspire par le nez. Puis une petite inspiration en plus, sans expirer entre les deux. *(8 s)*
2. Expire longuement par la bouche, jusqu'au bout, sans forcer. *(8 s)*
3. Inspire, encore un peu, puis expire longuement. Sans forcer. *(153 s)* : l'étape qui s'allonge ou se raccourcit, ici à 3 min (36 s à 1 min, 270 s à 5 min).
4. Laisse ta respiration redevenir libre. *(5 s)*
5. Reprends ce que tu faisais quand tu veux. *(6 s)*

#### Expiration longue (1, 3 ou 5 min, `expiration-longue`)

Inspirer sur quatre temps, expirer sur six. Posture : là où tu es.

1. Inspire par le nez, sur quatre temps. *(8 s)*
2. Expire par la bouche, sur six temps, sans forcer. *(10 s)*
3. Inspire, quatre temps. Expire, six temps. Sans forcer. *(150 s)* : l'étape qui s'allonge ou se raccourcit, ici à 3 min (30 s à 1 min, 270 s à 5 min).
4. Laisse ta respiration redevenir libre. *(6 s)*
5. Reprends ce que tu faisais quand tu veux. *(6 s)*

#### Noter ce qui passe (1, 3 ou 5 min, `noting`)

Toucher l'étiquette de ce qui passe, puis revenir au souffle. Posture : là où tu es.

1. Sens l'air qui entre et qui sort, sans rien changer. *(7 s)*
2. Quelque chose passe ? Une pensée, le corps, un son, une émotion. *(9 s)*
3. Touche l'étiquette de ce qui passe, puis reviens au souffle. Rien n'est gardé. *(150 s)* : l'étape qui s'allonge ou se raccourcit, ici à 3 min (30 s à 1 min, 270 s à 5 min), avec les étiquettes Pensée, Corps, Son, Émotion.
4. Laisse les étiquettes. Sens encore une fois l'air qui entre et qui sort. *(8 s)*
5. Reprends ce que tu faisais quand tu veux. *(6 s)*

#### Ancrage court (2 min, `ancrage-court`)

Trois choses vues, deux sons, une chose touchée. Posture : là où tu es.

1. Garde les yeux ouverts. Si un sens ne répond pas, passe au suivant. *(10 s)*
2. Nomme trois choses que tu vois. *(35 s)*
3. Nomme deux sons que tu entends. *(30 s)*
4. Nomme une chose que tu touches. Touche-la si tu veux. *(25 s)*
5. Respire une fois, lentement. *(10 s)*
6. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Scan court (3 min, `scan-court`)

Les pieds, les mains, le ventre, les épaules, la mâchoire. Posture : assis ou allongé.

1. Installe-toi assis ou allongé. Les yeux ouverts ou fermés, les deux vont. *(15 s)*
2. Tes pieds : remarque ce qui est là. « Rien de spécial » est une réponse normale. *(30 s)*
3. Tes mains : les doigts, les paumes. *(30 s)*
4. Ton ventre, qui bouge avec la respiration. *(30 s)*
5. Tes épaules : hautes ou basses, sans rien changer. *(30 s)*
6. Ta mâchoire. Si elle est serrée, laisse les dents se séparer un peu. *(30 s)*
7. Bouge les doigts. Reprends ce que tu faisais quand tu veux. *(15 s)*

#### Savourer (2 min, `savourer`)

Remarquer trois détails de ce moment, et où il se sent dans le corps. Posture : là où tu es.

1. Reste là où tu es, les yeux ouverts. *(10 s)*
2. Remarque un détail de ce moment : une lumière, un son, une matière. *(25 s)*
3. Remarque un deuxième détail. *(20 s)*
4. Remarque un troisième détail. *(20 s)*
5. Où ce moment se sent-il dans ton corps ? La poitrine, le ventre, les mains, ou nulle part. *(20 s)*
6. Garde ça encore quelques souffles, sans rien y changer. *(15 s)*
7. Reprends ce que tu faisais quand tu veux. *(10 s)*

#### Panique (2 min, `panique`)

Les pieds au sol, trois soupirs, ce qu'il y a autour de toi. Posture : là où tu es.

1. Pose les pieds bien à plat et appuie. Tu peux bouger, ou passer une étape, quand tu veux. *(12 s)*
2. Trois soupirs : inspire, une petite inspiration en plus, une longue expiration. *(27 s)*
3. Regarde autour de toi. Nomme trois choses que tu vois. *(20 s)*
4. Nomme deux sons que tu entends. *(18 s)*
5. Touche une chose près de toi. Nomme-la. *(12 s)*
6. Encore deux longues expirations : inspire, puis souffle lentement. *(20 s)*
7. Reste là, ou bouge, comme tu veux. *(11 s)*

#### Colère (2 min, `colere`)

S'éloigner, serrer les poings puis relâcher, expirer longuement. Posture : debout ou en marchant.

1. Éloigne-toi si tu peux. Sinon, tourne-toi. Marcher, bouger ou passer une étape est permis tout du long. *(15 s)*
2. Serre les poings fort, cinq secondes. *(8 s)*
3. Relâche. Ouvre les mains. *(7 s)*
4. Serre encore, cinq secondes. *(8 s)*
5. Relâche. Ouvre les mains. *(7 s)*
6. Une dernière fois : serre, cinq secondes. *(8 s)*
7. Relâche tout. Secoue les mains si tu veux. *(7 s)*
8. Longues expirations : inspire, puis souffle lentement par la bouche. *(40 s)*
9. Marche, ou reste là, comme tu veux. *(15 s)*
10. Reprends quand tu veux. *(5 s)*

#### Trop-plein (2 min, `trop-plein`)

Moins de choses qui entrent, une pression, de longues expirations. Posture : là où tu es.

1. Regarde un seul point devant toi : un mur, le sol, un objet. Tu peux bouger, ou passer une étape. *(20 s)*
2. Couvre-toi les oreilles si le bruit est de trop. *(12 s)*
3. Croise les bras et serre. Ou pose les mains à plat, sur la poitrine ou les cuisses. *(15 s)*
4. Appuie un peu plus fort. Garde cette pression. *(13 s)*
5. Longues expirations : inspire, puis souffle lentement. *(30 s)*
6. Reste là. Il n'y a rien à faire. *(25 s)*
7. Reprends quand tu veux. *(5 s)*

#### Réveil la nuit (3 min, `reveil-nuit`)

Une expiration longue, puis le corps, des pieds à la mâchoire. Posture : allongé. Écran noir ; dans Moment difficile, muet sauf la voix ; dans Bien-être, les réglages du lecteur.

1. Reste là où tu es, allongé. Tu peux bouger, ou passer une étape. *(10 s)*
2. Inspire sur quatre temps. Expire sur six temps, sans forcer. *(50 s)*
3. Sens tes pieds. *(20 s)*
4. Sens tes mains. *(20 s)*
5. Sens ton ventre, qui monte et qui descend. *(20 s)*
6. Sens tes épaules, là où elles touchent le lit. *(20 s)*
7. Sens ta mâchoire. Les dents peuvent se séparer un peu. *(20 s)*
8. Reste là. Il n'y a rien à attendre. *(20 s)*
