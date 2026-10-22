// Typographie des textes affichés (v7) : une espace insécable avant « : », « ; », « ? », « ! » et « » », et après « « »
// (la ponctuation haute ne commence jamais une ligne, un guillemet ne commence ni ne finit seul une ligne). Les textes du
// code gardent des espaces simples, pour être relus et corrigés facilement. Sert aux exercices de Bien-être, à Rappels
// et à l'aide de Réglages. Pur.
export const pourAffichage = (texte) => String(texte).replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ');
