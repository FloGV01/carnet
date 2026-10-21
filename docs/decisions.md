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

## v7 (en cours) : en attente de l'utilisateur

L'entrée v7 complète vient avec la version 7.0.0 (tâche 9 du plan v7). Ce qui suit attend un choix de l'utilisateur.

- **Pire cas du soir à 8 rubriques** (Humeur du soir et Explosions réaffichées, Contact et Sport séparés). La v4 l'exigeait sans défilement à 390 et 375 × 797. En cartes 2b, même resserrées, les 8 rubriques dépassent d'environ 270 px : aucune mise en page en cartes ne les fait tenir avec des cibles de 44. Deux voies : accepter que ce cas défile (c'est l'état actuel, le test le vérifie), ou une mise en page sans cartes au-delà de 6 rubriques. Les 6 rubriques par défaut tiennent, elles.
- **Aujourd'hui, écarts au lot 2b** pour garder P2 (Après coup sans défiler) et P3 (« J'ai fini » sans défiler) à 390 × 844, et le soir sans défilement à 390 × 797 après minuit ou avec le bandeau « Nouvelle version prête » : les choix des cartes font 44 de haut au lieu de 48, les cartes ont 8 de marge haute et basse, 4 entre la tête et les choix, et 6 entre deux blocs (4 avec le bandeau). À revoir sur l'iPhone.

### Bien-être (tâche 7)

Choix faits pendant la construction, à vérifier par l'utilisateur :

- **Onglets** : Aujourd'hui · Analyse · Bien-être · Soins · Réglages. L'Historique garde sa route et s'ouvre par sa porte en haut de l'Analyse ; il allume l'onglet Analyse et a un « Retour » vers elle.
- **Couleur** : Bien-être prend celle de la cohérence cardiaque (le bleu de Moment difficile). Aucune couleur nouvelle.
- **Un exercice commence par « Commencer »** : Safari ne parle qu'après un toucher, et l'écran d'avant permet d'allumer la voix avant de fermer les yeux. Puis une consigne par écran, « Précédent », « Suivant », « Terminer », et le temps qui reste à l'étape. Aucun repère « 3 sur 8 ».
- **Lecture à voix haute** : éteinte au départ, gardée sur l'iPhone (pas dans la sauvegarde) ; sans voix française, l'interrupteur n'apparaît pas. Allumée pendant une étape, elle lit l'étape et son temps repart.
- **Arrière-plan, écran verrouillé, page cachée** : l'exercice se met en pause (voix coupée, verrou d'écran rendu) et attend « Reprendre ». S'il a duré 60 s ou plus, la séance est notée dès la pause (l'app peut ne pas revenir) ; reprise et finie, c'est la même séance, dont la durée est mise à jour.
- **Une séance** commence à l'heure de « Commencer », et sa durée est celle de l'exercice actif, pauses exclues. « Terminer » avant la dernière étape, ou « Fermer », compte comme un arrêt (gardé à partir de 60 s).
- **La respiration** crée une séance dans Bien-être, dans Moment difficile et dans « Pour récupérer, je… », chacune avec son origine. « Noter mon émotion » ne paraît que dans Bien-être, une fois une séance notée.
- **Mes jours** : la rangée « Bien-être » n'apparaît que sur une période qui a une séance (toutes origines) ; un repère par jour, par semaine ou par mois, toujours le même, sans nombre. Ni l'Export PSY ni la Vue soignants n'en parlent.
- **« Autour du Bien-être »** est le dernier graphique de l'onglet Énergie de Comprendre (seules les séances lancées depuis Bien-être), au seuil des autres vues d'émotions.

#### Exercices à relire

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
3. Inspire par le nez en comptant jusqu'à quatre. *(5 s)*
4. Retiens l'air en comptant jusqu'à quatre. *(5 s)*
5. Expire par la bouche en comptant jusqu'à quatre. *(5 s)*
6. Garde les poumons vides en comptant jusqu'à quatre. *(5 s)*
7. Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu'à deux. *(60 s)*
8. Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre. *(60 s)*
9. Laisse ta respiration redevenir libre. *(15 s)*

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
