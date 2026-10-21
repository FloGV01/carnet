// Exercices de Bien-être (v7, spec §6.2) : rédigés pour Carnet, relus par l'utilisateur (titres et étapes repris dans
// docs/decisions.md). Une consigne par écran ; chaque étape a sa durée, en secondes : voix allumée, l'étape passe seule à
// la suivante à la fin de cette durée ; voix éteinte, le minuteur ne fait qu'indiquer le temps. La somme des durées est
// proche de la durée annoncée (dureeMin). Règles d'écriture : phrases courtes, tutoiement, ton neutre, aucune promesse
// d'effet ni conseil de santé. Les identifiants sont figés : une séance les garde (store `seances`). Pur.

const e = (texte, dureeS) => Object.freeze({ texte, dureeS });

export const EXERCICES = Object.freeze([
  {
    id: 'respiration-abdominale',
    titre: 'Respiration abdominale',
    dureeMin: 3,
    description: 'Respirer avec le ventre, une main posée dessus.',
    etapes: [
      e('Installe-toi assis ou allongé. Ferme les yeux si tu veux.', 15),
      e('Pose une main sur ton ventre, l\'autre sur ta poitrine.', 15),
      e('Inspire par le nez. Laisse le ventre se gonfler sous ta main.', 20),
      e('Expire lentement par la bouche. Le ventre redescend.', 20),
      e('Garde ce rythme, sans forcer. La main sur la poitrine bouge peu.', 40),
      e('Inspire, le ventre se gonfle. Expire, il redescend.', 40),
      e('Laisse la respiration revenir à son rythme habituel.', 20),
      e('Quand tu veux, ouvre les yeux et bouge doucement.', 10),
    ],
  },
  {
    id: 'respiration-carree',
    titre: 'Respiration carrée',
    dureeMin: 3,
    description: 'Inspirer, retenir, expirer, retenir : quatre temps chacun.',
    etapes: [
      e('Installe-toi, le dos droit sans être raide. Les épaules restent basses.', 15),
      e('Vide doucement l\'air de tes poumons.', 10),
      e('Inspire par le nez en comptant jusqu\'à quatre.', 5),
      e('Retiens l\'air en comptant jusqu\'à quatre.', 5),
      e('Expire par la bouche en comptant jusqu\'à quatre.', 5),
      e('Garde les poumons vides en comptant jusqu\'à quatre.', 5),
      e('Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu\'à deux.', 60),
      e('Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre.', 60),
      e('Laisse ta respiration redevenir libre.', 15),
    ],
  },
  {
    id: 'epaules',
    titre: 'Relaxation dynamique des épaules',
    dureeMin: 5,
    description: 'Hausser puis relâcher les épaules, avec la respiration.',
    etapes: [
      e('Mets-toi debout ou assis, les pieds à plat, les bras le long du corps.', 20),
      e('Inspire et monte les deux épaules vers les oreilles.', 10),
      e('Garde-les en haut quelques secondes, en retenant l\'air.', 10),
      e('Expire par la bouche et laisse-les retomber d\'un coup.', 10),
      e('Observe les sensations dans tes épaules et tes bras.', 20),
      e('Recommence : inspire, monte les épaules, retiens.', 15),
      e('Expire et relâche. Laisse retomber.', 15),
      e('Observe de nouveau ce que tu sens.', 20),
      e('Une dernière fois : inspire, monte les épaules, retiens.', 15),
      e('Expire et relâche tout.', 15),
      e('Fais rouler les épaules vers l\'arrière, lentement.', 30),
      e('Puis vers l\'avant, lentement.', 30),
      e('Laisse les bras pendre. Remarque ce qui a changé, ou ce qui est pareil.', 40),
      e('Respire normalement quelques instants.', 30),
      e('Quand tu veux, reprends ce que tu faisais.', 20),
    ],
  },
  {
    id: 'tension-detente',
    titre: 'Tension et détente',
    dureeMin: 8,
    description: 'Serrer un groupe de muscles, puis le relâcher, des pieds au visage.',
    etapes: [
      e('Installe-toi assis ou allongé. Ferme les yeux si tu veux.', 20),
      e('Respire lentement quelques instants.', 20),
      e('Serre les orteils et contracte les pieds, sans forcer. Garde la tension.', 15),
      e('Relâche d\'un coup. Observe la différence.', 30),
      e('Contracte les mollets en tirant les pointes de pied vers toi.', 15),
      e('Relâche. Observe les sensations dans les jambes.', 30),
      e('Serre les cuisses et les fesses.', 15),
      e('Relâche. Laisse les jambes posées.', 30),
      e('Rentre le ventre et contracte-le.', 15),
      e('Relâche. Laisse la respiration revenir dans le ventre.', 30),
      e('Serre les poings et contracte les bras.', 15),
      e('Relâche. Ouvre les mains.', 30),
      e('Monte les épaules vers les oreilles et serre.', 15),
      e('Relâche. Laisse les épaules redescendre.', 30),
      e('Serre la mâchoire, plisse les yeux et le front.', 15),
      e('Relâche le visage. Desserre les dents.', 30),
      e('Parcours ton corps des pieds à la tête. Remarque ce que tu sens.', 60),
      e('Respire tranquillement.', 35),
      e('Bouge les doigts, les pieds, puis ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'scan-corporel',
    titre: 'Scan corporel',
    dureeMin: 10,
    description: 'Passer d\'une partie du corps à l\'autre, sans rien changer.',
    etapes: [
      e('Installe-toi allongé ou assis. Ferme les yeux si tu veux.', 30),
      e('Remarque les points d\'appui de ton corps : le sol, le siège ou le lit.', 40),
      e('Va vers tes pieds : les orteils, la plante, les talons. Remarque ce qui est là, ou rien de particulier.', 50),
      e('Monte vers les chevilles, les mollets, les genoux.', 45),
      e('Les cuisses, puis le bassin.', 45),
      e('Le ventre, qui bouge avec la respiration.', 45),
      e('Si ton esprit part ailleurs, reviens au corps, sans te juger.', 40),
      e('La poitrine, et le dos contre son appui.', 45),
      e('Les mains, les bras, jusqu\'aux épaules.', 50),
      e('Le cou et la nuque.', 40),
      e('Le visage : la mâchoire, les joues, les yeux, le front.', 50),
      e('Le haut de la tête.', 30),
      e('Le corps entier, d\'un seul coup, tel qu\'il est maintenant.', 60),
      e('Bouge doucement les doigts et les pieds. Ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'lieu-ressource',
    titre: 'Lieu ressource',
    dureeMin: 8,
    description: 'Imaginer un lieu, réel ou inventé, et le parcourir par les sens.',
    etapes: [
      e('Installe-toi confortablement. Ferme les yeux si tu veux.', 20),
      e('Respire lentement, quelques fois.', 30),
      e('Choisis un lieu, réel ou imaginé, où tu aimes être. S\'il n\'en vient aucun, invente-le.', 40),
      e('Regarde autour de toi : les formes, les couleurs, la lumière.', 60),
      e('Écoute les sons de ce lieu, proches ou lointains.', 60),
      e('Remarque les odeurs, la température de l\'air.', 50),
      e('Sens ce que tu touches : le sol sous tes pieds, une matière, un objet.', 60),
      e('Reste là un moment, sans rien faire de particulier.', 60),
      e('Ce lieu reste là : tu peux y revenir en pensée.', 30),
      e('Reviens doucement dans la pièce. Remarque les appuis de ton corps.', 40),
      e('Bouge les doigts, puis ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'ancrage-54321',
    titre: 'Ancrage 5-4-3-2-1',
    dureeMin: 3,
    description: 'Nommer ce que tu perçois autour de toi, un sens après l\'autre.',
    etapes: [
      e('Garde les yeux ouverts. Regarde autour de toi.', 10),
      e('Nomme cinq choses que tu vois.', 35),
      e('Nomme quatre choses que tu peux toucher. Touche-les si tu veux.', 35),
      e('Nomme trois sons que tu entends.', 30),
      e('Nomme deux odeurs. S\'il n\'y en a pas, deux odeurs que tu aimes.', 25),
      e('Nomme un goût, dans ta bouche en ce moment.', 20),
      e('Respire une fois, lentement.', 15),
      e('Reprends ce que tu faisais quand tu veux.', 10),
    ],
  },
  {
    id: 'pause-une-minute',
    titre: 'Pause d\'une minute',
    dureeMin: 1,
    description: 'Un arrêt bref, là où tu es.',
    etapes: [
      e('Arrête ce que tu fais. Pose ce que tu as dans les mains.', 10),
      e('Sens tes pieds sur le sol.', 10),
      e('Inspire lentement par le nez.', 10),
      e('Expire plus longuement, par la bouche.', 10),
      e('Encore une fois : inspire, puis expire.', 15),
      e('Reprends quand tu veux.', 5),
    ],
  },
].map((x) => Object.freeze({ ...x, etapes: Object.freeze(x.etapes) })));

export const exerciceDe = (id) => EXERCICES.find((x) => x.id === id) || null;

// La durée d'un exercice, en secondes : la somme de ses étapes (une étape sans durée compte pour rien).
export const dureeExerciceS = (ex) => (ex ? ex.etapes.reduce((s, x) => s + (x.dureeS || 0), 0) : 0);

// À l'écran : une espace insécable avant « : », « ; », « ? », « ! » et « » », et après « « » (la ponctuation haute ne
// commence jamais une ligne). Les textes gardent des espaces simples, pour être relus et corrigés facilement.
export const pourAffichage = (texte) => String(texte).replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
