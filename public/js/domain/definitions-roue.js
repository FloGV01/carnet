// Définitions des 79 mots de la roue (v8, spec §4) : écrites pour Carnet, une phrase courte et neutre, au masculin
// comme les mots. Elles décrivent ce qu'on ressent ou la situation, sans juger ni conseiller. Pur, figé comme la roue :
// l'utilisateur les corrige dans Réglages › Émotions, et ses corrections vivent dans la méta `definitionsRoue`
// ({ [idMot]: texte }), sauvegardée avec le reste. Le texte de Carnet ne change pas ; il revient quand une correction
// est retirée.

export const DEFINITIONS = Object.freeze({
  // Colère
  'roue:colere:embarrasse': 'Gêné devant les autres, au point d\'en rougir.',
  'roue:colere:devaste': 'Bouleversé, comme si tout s\'était effondré d\'un coup.',
  'roue:colere:insecurise': 'Pas sûr de soi ni de sa place, sur le qui-vive.',
  'roue:colere:jaloux': 'Contrarié de voir un autre avoir ce qu\'on voudrait, ou de craindre de perdre quelqu\'un.',
  'roue:colere:amer': 'Plein de rancœur après une déception ou une injustice.',
  'roue:colere:defiant': 'Qui tient tête, prêt à s\'opposer.',
  'roue:colere:furieux': 'En très grande colère, avec du mal à se contenir.',
  'roue:colere:enrage': 'Submergé par la colère, au point de ne plus penser à autre chose.',
  'roue:colere:provocateur': 'Qui cherche à piquer les autres ou à les faire réagir.',
  'roue:colere:hostile': 'Fermé, prêt à se défendre ou à attaquer face à quelqu\'un.',
  'roue:colere:mecontent': 'Pas satisfait de ce qui se passe ou de ce qu\'on a reçu.',
  'roue:colere:irrite': 'Agacé par quelque chose qui gêne ou qui se répète.',
  'roue:colere:retire': 'En retrait, à distance des autres.',
  'roue:colere:suspect': 'Soupçonneux, sur ses gardes, on doute des intentions des autres.',
  'roue:colere:sceptique': 'Qui doute, pas convaincu par ce qu\'on entend.',
  'roue:colere:sarcastique': 'Qui se moque avec des mots piquants, souvent pour dire un agacement.',
  // Dégoût
  'roue:degout:juge': 'Regardé et évalué par les autres, comme sous un examen.',
  'roue:degout:aversion': 'Une forte envie de s\'éloigner de quelque chose ou de quelqu\'un.',
  'roue:degout:repugnant': 'Écœuré par quelque chose qui repousse.',
  'roue:degout:revolte': 'Choqué par ce qui paraît injuste, au point de vouloir s\'y opposer.',
  'roue:degout:degout': 'Un écœurement, l\'envie de se détourner de quelque chose.',
  'roue:degout:detestable': 'On se trouve, ou on trouve une chose, difficile à supporter.',
  'roue:degout:hesitant': 'Partagé entre plusieurs choix, du mal à se décider.',
  // Tristesse
  'roue:tristesse:fautif': 'Avec le sentiment d\'avoir fait du tort ou d\'être responsable de ce qui arrive.',
  'roue:tristesse:honteux': 'L\'envie de se cacher, de disparaître du regard des autres.',
  'roue:tristesse:ignore': 'Ni vu ni entendu par les autres, comme si on n\'était pas là.',
  'roue:tristesse:replie': 'Refermé sur soi, sans envie d\'aller vers les autres.',
  'roue:tristesse:impuissant': 'Sans prise sur ce qui arrive, rien ne semble possible.',
  'roue:tristesse:vulnerable': 'Exposé, à découvert, facile à blesser.',
  'roue:tristesse:minable': 'Petit et piteux à ses propres yeux.',
  'roue:tristesse:vide': 'Plus rien à l\'intérieur, comme engourdi.',
  'roue:tristesse:abandonne': 'Laissé seul par quelqu\'un sur qui on comptait.',
  'roue:tristesse:isole': 'Seul, à l\'écart, loin des autres.',
  'roue:tristesse:amorphe': 'Sans élan, le corps et l\'esprit au ralenti.',
  'roue:tristesse:indifferent': 'Rien ne touche ni n\'intéresse vraiment, pour le moment.',
  // Joie
  'roue:joie:inspire': 'Plein d\'idées et d\'élan, l\'envie de créer ou d\'agir.',
  'roue:joie:ouvert': 'Disponible, prêt à accueillir les autres et ce qui vient.',
  'roue:joie:espiegle': 'D\'humeur joueuse, l\'envie de taquiner gentiment.',
  'roue:joie:sensible': 'Touché, réceptif à ce qui se passe et aux autres.',
  'roue:joie:optimiste': 'Confiant dans la suite de ce qui se passe.',
  'roue:joie:aimant': 'Plein d\'affection pour quelqu\'un.',
  'roue:joie:provocant': 'Audacieux et taquin, qui ose.',
  'roue:joie:courageux': 'Prêt à faire face à quelque chose de difficile.',
  'roue:joie:accompli': 'Satisfait d\'avoir mené quelque chose au bout.',
  'roue:joie:respecte': 'Pris au sérieux et considéré par les autres.',
  'roue:joie:important': 'Compter pour les autres, avoir sa place.',
  'roue:joie:curieux': 'L\'envie de découvrir, de comprendre, d\'en savoir plus.',
  'roue:joie:amuse': 'Quelque chose fait sourire ou rire.',
  'roue:joie:extasie': 'Émerveillé, transporté de joie.',
  'roue:joie:libere': 'Soulagé d\'un poids, plus léger.',
  'roue:joie:confiant': 'Sûr de soi ou des autres, on peut compter dessus.',
  // Surprise
  'roue:surprise:energique': 'Plein d\'élan, le corps prêt à bouger.',
  'roue:surprise:avide': 'Impatient, plein d\'envie pour ce qui arrive.',
  'roue:surprise:effraye': 'Saisi d\'un coup, le sursaut de la peur.',
  'roue:surprise:abasourdi': 'Sonné par une nouvelle inattendue, sans voix.',
  'roue:surprise:perplexe': 'Sans savoir quoi penser, les idées s\'embrouillent.',
  'roue:surprise:desillusionne': 'Ce qu\'on espérait ne s\'est pas réalisé, l\'élan retombe.',
  'roue:surprise:consterne': 'Abattu et sans voix devant ce qui arrive.',
  'roue:surprise:choque': 'Secoué par quelque chose de brutal ou d\'inattendu.',
  // Peur
  'roue:peur:terrifie': 'Envahi par une peur très forte.',
  'roue:peur:craintif': 'Inquiet de ce qui pourrait arriver, sur la réserve.',
  'roue:peur:accable': 'Écrasé par trop de choses à la fois.',
  'roue:peur:preoccupe': 'L\'esprit pris par un souci qui revient.',
  'roue:peur:incapable': 'Avec l\'impression de ne pas pouvoir y arriver.',
  'roue:peur:inferieur': 'Moins que les autres, à ses propres yeux.',
  'roue:peur:sans-valeur': 'Avec l\'impression de ne compter pour rien.',
  'roue:peur:inadequat': 'Pas à la hauteur de ce qui est attendu.',
  'roue:peur:insignifiant': 'Tout petit, comme si on ne comptait pas.',
  'roue:peur:exclus': 'Laissé en dehors d\'un groupe ou de ce qui se fait.',
  'roue:peur:non-respecte': 'Pas considéré : ses limites ou sa parole sont mises de côté.',
  'roue:peur:ridiculise': 'Moqué devant les autres, rendu ridicule.',
  // Sérénité
  'roue:serenite:calme': 'Rien ne s\'agite, ni dedans ni autour.',
  'roue:serenite:apaise': 'La tension est retombée, le corps se relâche.',
  'roue:serenite:detendu': 'Les muscles et l\'esprit relâchés.',
  'roue:serenite:repose': 'Le corps a récupéré, l\'énergie est revenue.',
  'roue:serenite:tranquille': 'Sans souci pour l\'instant, rien ne presse.',
  'roue:serenite:serein': 'En paix avec ce qui est, sans inquiétude.',
  'roue:serenite:pose': 'Stable et réfléchi, on prend son temps.',
  'roue:serenite:en-securite': 'À l\'abri, rien ne menace.',
});

const aDefinition = (id) => Object.prototype.hasOwnProperty.call(DEFINITIONS, id);
// Une correction lisible : un texte qui n'est pas vide une fois les espaces retirés.
const correctionDe = (id, corrections) => {
  const c = corrections && typeof corrections === 'object' && Object.prototype.hasOwnProperty.call(corrections, id) ? corrections[id] : null;
  return typeof c === 'string' && c.trim() !== '' ? c.trim() : null;
};

// La définition affichée : la correction de l'utilisateur, sinon le texte de Carnet ; null pour un id inconnu.
export function definition(id, corrections) {
  if (!aDefinition(id)) return null;
  return correctionDe(id, corrections) ?? DEFINITIONS[id];
}

// Le mot a-t-il une correction (différente du texte de Carnet) ?
export const estCorrigee = (id, corrections) => aDefinition(id) && correctionDe(id, corrections) !== null
  && correctionDe(id, corrections) !== DEFINITIONS[id];

// Les corrections après un changement, sans modifier l'objet reçu : un texte vide, ou le texte de Carnet, retire la
// correction (« Revenir au texte de Carnet »). Les clés inconnues ou illisibles sont laissées telles quelles.
export function corriger(corrections, id, texte) {
  const suivantes = corrections && typeof corrections === 'object' && !Array.isArray(corrections) ? { ...corrections } : {};
  const t = typeof texte === 'string' ? texte.trim() : '';
  if (!aDefinition(id) || t === '' || t === DEFINITIONS[id]) delete suivantes[id];
  else suivantes[id] = t;
  return suivantes;
}
