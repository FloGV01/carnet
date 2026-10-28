# Carte v9 : sort des 60 corrections proposées

Relectures : français (F), placement (P), familles (Fa). Le numéro suit l'ordre de la liste reçue. Résultat : `carte-proposee.json`. Contrôles : `tmp/controle-final.mjs` et `tmp/controle-placement.mjs`, sans erreur.

## Appliquées (51, dont 2 en partie)

- 1 · De bonne humeur (F) : devient « Gai » (`roue:joie:gai`), même case, même définition.
- 2 · Ému (F) : « Le cœur chaviré par quelque chose de beau ou de tendre. » (« tendre » vient de la 58).
- 3 · Ennuyé (F) : devient « Ennui » (`roue:tristesse:ennui`), « Le temps paraît long, rien n'accroche. »
- 4 · Inquiet (F) : « Dans l'attente, on se demande comment ça va tourner. »
- 5 · Rassuré (F) : devient « Solide » (`roue:serenite:solide`). Définition ajustée en « D'aplomb, sur des bases qui tiennent. », pour éviter un « rien ne… » de plus à côté d'En sécurité (« rien ne menace »).
- 6 · Méprisant (F) : devient « Mépris » (`roue:degout:mepris`), « On regarde quelqu'un ou quelque chose de haut, avec froideur. »
- 7 · Comblé (F) : « Un bonheur plein et doux, qui enveloppe tout. »
- 8 · Satisfait (F) : « Ce qu'on attendait est arrivé, tel qu'on le voulait. »
- 9 · Content (F) : « Ce qu'on a suffit, sans chercher plus loin. »
- 10 · Heureux (F) : « La vie paraît belle en ce moment, on en profite. »
- 11 · Anxieux (F) : « Une peur sans objet précis, qui serre la gorge ou le ventre. »
- 12 · Mal à l'aise (F) : « Pas bien dans la situation, quelque chose cloche. », le pendant d'À l'aise.
- 14 · Stressé (F) : « Mobilisé sans relâche, sans pouvoir souffler. »
- 15 · Paniqué (F) : « La peur fait perdre ses moyens, on ne sait plus quoi faire. »
- 16 · En colère (F) : « Remonté contre quelqu'un ou quelque chose, ça chauffe à l'intérieur. »
- 17 · Survolté (F) : définition « Trop d'énergie, le corps et la tête n'arrivent plus à ralentir. » La famille passe en peur (44).
- 18 · Électrisé (F) : « Un frisson de joie qui parcourt tout le corps. »
- 19 · Compatissant (F) : « La peine d'un autre résonne en soi, avec l'envie de l'aider. »
- 20 · Bienveillant (F) : le mot reste, avec la définition « Tourné vers les autres avec douceur, sans arrière-pensée. » Empathique recouperait Compatissant.
- 21 · Fort (F) : « Avec prise sur ce qui arrive, on peut agir. »
- 22 · Emballé (F) : « Conquis par une idée ou un projet, l'envie de s'y lancer tout de suite. »
- 23 · Motivé (F) : « Prêt à s'y mettre, avec l'envie de le faire. »
- 24 · Stimulé (F) : « Tiré vers le haut par quelque chose d'exigeant. »
- 25 · Joyeux (F) : « Le sourire facile, une joie qui se voit. »
- 26 · Bien (F) : « Ça va, tout simplement. »
- 27 · Équilibré (F) : « Chaque chose à sa place, ni trop ni trop peu. »
- 28 · Soutenu (F) : « Quelqu'un est là, sur qui s'appuyer. »
- 29 · Reconnaissant (F) : « L'envie de dire merci pour ce qu'on a reçu. »
- 30 · Chanceux (F) : « La vie a été généreuse, on le mesure. »
- 31 · Découragé (F) : « Plus le cœur à continuer, l'effort semble ne mener à rien. »
- 32 · Épuisé (F) : « À bout de forces, même les petites choses coûtent. »
- 33 · Grisé (F) : devient « Euphorique » (`roue:joie:euphorique`). Définition ajustée en « Une joie vive, un peu étourdissante. » : « Porté par une joie vive » aurait doublé la nouvelle définition d'Extasié (« Transporté par une joie… »), sur le même rang.
- 34 · Somnolent (F) : devient « Ensommeillé » (`roue:serenite:ensommeille`), avec la définition de la 51.
- 35 · En lien (F) : devient « Relié » (`roue:joie:relie`), « Proche des autres, quelque chose passe entre eux et soi. »
- 36 · Émerveillé (F) : le mot reste. La définition de Carnet d'Extasié devient en v9 « Transporté par une joie immense. » (`definitionsRoueV9`).
- 37 · Soulagé (F) : Soulagé reste. La définition de Carnet de Libéré devient en v9 « Libre de ses mouvements, plus rien ne retient. » (`definitionsRoueV9`).
- 39 · Ouvert et Apaisé (P) : échangés. Ouvert va en col 8, rang 2 (Peaceful), Apaisé en col 9, rang 1 (Thankful).
- 40 · Amorphe et Replié (P) : échangés. Amorphe va en col 5, rang 2 (Lonely), Replié en col 6, rang 4 (Fatigued), juste au-dessus de Retiré.
- 41 · Dévasté et Minable (P) : échangés sur le rang 3. Dévasté va en col 1 (Morose), Minable en col 2 (Despondent).
- 42 · Mécontent, notes (P) : Mécontent reste en bleu, et les notes disent « Annoyed et Peeved : Irrité. ».
- 43 · Important et Ridiculisé, notes (P) : les places restent. Les raisons d'écart de Valued et d'Humiliated sont corrigées dans les notes.
- 44 · Survolté (Fa) : passe en peur (`roue:peur:survolte`), à la même case.
- 45 · Apeuré (Fa) : ajouté à la case de Scared (col 2, rang 9). Non respecté va en col 4, rang 7 (Nervous), et Nerveux est retiré. Définition ajustée en « Face à quelque chose ou à quelqu'un qui fait peur. » : « La peur est là » reprenait la tournure refusée pour En colère (16), et cette version s'oppose à Anxieux (« sans objet précis »).
- 46 · Fatigué et Épuisé (Fa) : ils restent en tristesse, comme le propose la relecture. La décision revient à l’utilisateur avant publication, et les notes en donnent l'autre choix.
- 47 · Les 35 ajouts en joie (Fa) : aucune famille ne change. Les notes demandent d'inscrire la date de la v9 dans docs/decisions.md comme rupture de vocabulaire.
- 48 · Slugs avec apostrophe (Fa) : `mal-a-l-aise` et `a-l-aise` restent. La règle de l'apostrophe est à écrire dans le commentaire de roue.js et dans `slug()` de roue.test.js avant publication ; c'est noté.
- 49 · Emballé et Enthousiaste (Fa), en partie : Enthousiaste prend « Plein d'ardeur pour ce qu'on est en train de faire. » La définition proposée pour Emballé est écartée : elle commençait par « Impatient », comme celle d'Avide (col 8, rang 10). Emballé garde la version de la 22.
- 51 · Somnolent (Fa) : sérénité gardée, avec la définition « Une envie de dormir douce, le corps se laisse aller. », sous le libellé Ensommeillé (34).
- 52 · Pensif (Fa) : « Absorbé par ses pensées, calmement, sans qu'elles tournent en rond. »
- 58 · Ému (Fa), en partie : « tendre » remplace « fort ». « remué » est écarté : normaliser(« remué ») contient « emu », et le test « le mot dans sa définition » échouerait.
- 60 · Concentré et Productif (Fa) : rien ne change. L'effet sur la barre Joie est écrit dans les notes (règle 4).

## Écartées (9)

- 13 · Nerveux (F) : le mot est retiré au profit d'Apeuré (45), donc sa nouvelle définition est sans objet.
- 38 · Libéré déplacé sur Relieved, Soulagé retiré, Investi ajouté (P) : écartée. Un 2ᵉ mot de la roue changerait de zone. Investi recouperait Concentré, Motivé et Déterminé (la règle veut des ajouts sans doublon de sens). Le vert échangerait aussi un mot de sérénité contre un mot de joie, alors que la joie y est déjà en excès (47). La relecture admet l'autre voie, revoir la définition de Libéré : c'est la 37.
- 50 · Ennuyé en « Qui s'ennuie » (Fa) : écartée au profit d'« Ennui » (3), un nom comme Dégoût et Aversion, sans apostrophe dans le slug et plus court sur une bulle. Le problème soulevé est réglé.
- 53 · Paniqué (Fa) : écartée au profit de la 15, qui a le même but. « déborde » venait d'être retiré de Joyeux, où il répétait Aux anges.
- 54 · Mal à l'aise (Fa) : écartée. « Une inquiétude » définit le mot par Inquiet, et « sans qu'on sache quoi » recoupe le nouveau « sans objet précis » d'Anxieux. La 12 s'applique.
- 55 · Découragé (Fa) : écartée au profit de la 31, qui dit la même chose.
- 56 · Soulagé (Fa) : écartée. Avec la nouvelle définition de Libéré (37), celle de Soulagé ne heurte plus rien. « une menace » répéterait En sécurité (« rien ne menace »), sa voisine directe (col 10, rang 2).
- 57 · Compatissant (Fa) : écartée au profit de la 19. « Touché » ouvre la définition de Sensible (« Touché, réceptif… »).
- 59 · Émerveillé (Fa) : la famille surprise est gardée, comme le propose la relecture. Mais ce n'est pas à l’utilisateur de corriger Extasié dans Réglages : la v9 change le texte de Carnet (36), ce que docs/decisions.md permet par une nouvelle version.
