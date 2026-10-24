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
7. Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu'à deux. *(52 s)*
8. Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre. *(52 s)*
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

## v8 (en construction) : émotion en carte, Bien-être en lecteur, programme

Spec : `docs/superpowers/specs/2026-10-24-carnet-v8-design.md`. Plan : `docs/superpowers/plans/2026-10-25-carnet-v8.md`, en 9 tâches. L'entrée complète vient avec la version 8.0.0 (tâche 9).

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
- **La définition** s'affiche sous la carte : « Irrité : agacé par… », le mot à la couleur de sa famille. Les 79 textes sont dans `domain/definitions-roue.js` (figés) ; leur liste sera reprise ici pour relecture (tâche 9).
- **Réglages › Émotions** : dans « Ma saisie », après Listes, carré neutre comme ses voisins. Une carte par famille ; un toucher ouvre le champ du mot (le champ de texte de l'app, avec `aLaSortie` : il n'enregistre qu'à la sortie du champ, ou si l'app passe en arrière-plan, et la frappe reste dans le brouillon local ; vider le champ pour le réécrire ne retire donc pas la correction, et « Revenir au texte de Carnet » ne disparaît pas sous le doigt). Un champ vidé, ou remis au texte de Carnet, retire la correction. « Revenir au texte de Carnet » suit chaque mot corrigé.
- **La roue en familles de la v7** (`ui/composants/bulles.js`) est retirée avec ses styles.
