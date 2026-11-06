import { html, useEffect, useLayoutEffect, useRef } from '../lib.js';
import { indiceAuCentre } from '../glissement.js';
import { vidanges } from '../../store.js';

// La roue (v11, spec §5) : une bande couchée, toujours visible, qui glisse de côté sous les choix d'une carte (la durée de
// la nuit sous Mal · Moyen · Bien ; la durée du sport et l'effet du contact sous Oui / Non, et dans leur détail, spec §5.4).
// « Roue » seul désigne la roue des émotions (domain/roue.js) : celle-ci est la roue de choix. Chaque valeur est un vrai
// bouton, avec son texte et aria-pressed : VoiceOver les parcourt et les active un par un (pas de curseur ARIA fait main,
// auquel il répond mal sur iPhone).
// - Vide : rien n'est marqué, la bande est centrée sur `centre` (par défaut l'option du milieu), sur un fond neutre, et
//   cela ne note rien. La valeur notée est au milieu, sur la teinte de la carte (--c-tint), en 700 et en --c-text.
// - Toucher une valeur la note et la centre ; retoucher la valeur notée l'efface, et la bande revient sur `centre`.
// - Glisser : seul un geste du doigt qui a fait défiler la bande écrit, la valeur au centre, quand la bande s'arrête. Ni
//   un doigt posé puis levé sans défilement, ni la page qui défile le doigt posé sur la bande (la bande ne reçoit alors
//   aucun `scroll`), ni un défilement sans doigt (le centrage par le code, le focus de VoiceOver) n'écrivent. Une valeur
//   au centre égale à la valeur notée n'écrit rien, et un glissement n'efface jamais : pas de bascule. Un glissement
//   revenu à son départ écrit quand même ce qu'il montre (une nuit vide revenue sur 7 h note 7 h).
// - La fin ne dépend pas de `scrollend` (Safari 26.2 seulement) : aucun `scroll` depuis FIN_GLISSEMENT_MS, doigt levé,
//   compté depuis le dernier `scroll` ou le `touchend`. Un toucher sur une valeur éteint le geste en cours.
// - Une valeur en attente (un glissement pas encore arrêté) s'écrit aussitôt au démontage, à `pagehide`, la page cachée
//   et avant une fermeture forcée de la base (vidanges), comme un texte : l'appelant donne une `key` avec la date, et le
//   rappel d'origine écrit sur le jour d'origine.
// Les écouteurs sont passifs : rien n'est empêché, le défilement reste celui d'iOS. Toutes les valeurs ont la largeur de
// la plus longue, en 700 (mesurée, puis posée par CSSOM, en em pour le texte : elle suit la taille du texte), jamais plus
// large que la bande : au-delà, le libellé passe à la ligne.
export const FIN_GLISSEMENT_MS = 150;
// La chasse de la police système se resserre quand le corps grandit (4 % de 16 à 23 px, mesuré dans WebKit) : une largeur
// prise en grand texte serait trop étroite d'autant, le texte rendu plus petit sans nouvelle mesure. 5 % de marge.
const MARGE_CHASSE = 1.05;
const reduit = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// { etiquette, options: [{ valeur, libelle }], valeur, surChoix(valeur|null), centre }
export function RoueChoix({ etiquette, options, valeur, surChoix, centre }) {
  const groupe = useRef(null);
  const bande = useRef(null);
  // Ce qui sert hors du rendu (écouteurs, minuterie, démontage) : les dernières valeurs.
  const etat = useRef({});
  const indiceNote = options.findIndex((o) => o.valeur === valeur);
  // Au milieu sans valeur notée : `centre`, sinon l'option du milieu.
  const indiceCentre = options.findIndex((o) => o.valeur === centre);
  const indiceVide = indiceCentre >= 0 ? indiceCentre : Math.floor((options.length - 1) / 2);
  const repos = indiceNote >= 0 ? indiceNote : indiceVide;
  Object.assign(etat.current, { options, valeur, surChoix, repos });
  // Le geste : doigt posé, geste marqué (un `scroll` reçu doigt posé), minuterie de la fin.
  const geste = useRef({ doigt: false, marque: false, minuteur: null });

  // Le centre de chaque valeur et le milieu de la bande, dans le repère de la bande (le défilement compris). Lus sur les
  // boîtes à l'écran, au dixième : l'entrée d'un jour ne fait que les déplacer ensemble.
  const lire = () => {
    const b = bande.current;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const centres = [...b.querySelectorAll('.roue-valeur')].map((x) => { const q = x.getBoundingClientRect(); return b.scrollLeft + q.left - r.left + q.width / 2; });
    return { b, centres, milieu: b.scrollLeft + r.width / 2, largeur: r.width };
  };
  // Amène une valeur au milieu, par le code : rien n'est écrit. En douceur si demandé, jamais avec « Réduire les animations ».
  const centrer = (indice, doux) => {
    const m = lire();
    if (!m || m.centres[indice] == null) return;
    const left = m.centres[indice] - m.largeur / 2;
    if (Math.abs(left - m.b.scrollLeft) < 0.5) return;
    m.b.scrollTo({ left, behavior: doux && !reduit() ? 'smooth' : 'auto' });
  };
  // La largeur commune : le texte de la plus longue valeur, en 700, à sa largeur naturelle (.roue-mesure), en em (il suit
  // la taille du texte), avec la marge de la chasse, plus les marges intérieures du bouton, en px (elles ne grandissent pas).
  const mesurer = () => {
    const g = groupe.current;
    const boutons = g ? [...g.querySelectorAll('.roue-valeur')] : [];
    if (!boutons.length) return;
    g.classList.add('roue-mesure');
    const s = getComputedStyle(boutons[0]);
    const corps = Number.parseFloat(s.fontSize) || 16;
    const marges = Number.parseFloat(s.paddingLeft) + Number.parseFloat(s.paddingRight);
    const texte = Math.max(...boutons.map((x) => x.getBoundingClientRect().width)) - marges;
    g.classList.remove('roue-mesure');
    g.style.setProperty('--l-valeur', `calc(${Math.ceil((texte / corps) * MARGE_CHASSE * 100) / 100}em + ${marges}px)`);
  };
  // La fin d'un geste marqué : la valeur au centre, si elle n'est pas déjà notée. Jamais une bascule.
  const finir = () => {
    const g = geste.current;
    clearTimeout(g.minuteur);
    g.minuteur = null;
    if (!g.marque) return;
    g.marque = false;
    const m = lire();
    const o = m && etat.current.options[indiceAuCentre(m.centres, m.milieu)];
    return o && o.valeur !== etat.current.valeur ? etat.current.surChoix(o.valeur) : undefined;
  };
  const eteindre = () => {
    const g = geste.current;
    clearTimeout(g.minuteur);
    Object.assign(g, { marque: false, minuteur: null });
  };

  // À l'ouverture et quand les valeurs changent : la largeur commune, puis la valeur notée (ou `centre`) au milieu, d'un coup.
  const cleOptions = options.map((o) => `${o.valeur}\u0000${o.libelle}`).join('\u0001');
  useLayoutEffect(() => { mesurer(); centrer(etat.current.repos, false); }, [cleOptions]);
  // La valeur changée (un toucher, un autre écran, l'effacement) : au milieu, en douceur ; pas pendant un geste du doigt.
  const ouverture = useRef(true);
  useEffect(() => {
    if (ouverture.current) { ouverture.current = false; return; }
    if (!geste.current.doigt && !geste.current.marque) centrer(repos, true);
  }, [valeur]);

  useEffect(() => {
    const b = bande.current;
    const g = geste.current;
    const relancer = () => { clearTimeout(g.minuteur); g.minuteur = setTimeout(finir, FIN_GLISSEMENT_MS); };
    const poser = () => { g.doigt = true; clearTimeout(g.minuteur); g.minuteur = null; };
    const lever = () => { g.doigt = false; if (g.marque) relancer(); };
    const defiler = () => {
      if (g.doigt) g.marque = true;
      else if (g.marque) relancer();
    };
    // La fenêtre qui change de taille (rotation), ou la page revue (la taille du texte a pu changer entre-temps) : la
    // largeur reprise et la valeur recentrée, d'un coup, sans rien écrire.
    const recaler = () => {
      if (g.doigt || g.marque) return;
      mesurer();
      centrer(etat.current.repos, false);
    };
    const surCache = () => { if (document.visibilityState === 'hidden') finir(); else recaler(); };
    const passif = { passive: true };
    b.addEventListener('touchstart', poser, passif);
    b.addEventListener('touchend', lever, passif);
    b.addEventListener('touchcancel', lever, passif);
    b.addEventListener('scroll', defiler, passif);
    window.addEventListener('resize', recaler);
    window.addEventListener('pagehide', finir);
    document.addEventListener('visibilitychange', surCache);
    vidanges.add(finir);
    return () => {
      vidanges.delete(finir);
      document.removeEventListener('visibilitychange', surCache);
      window.removeEventListener('pagehide', finir);
      window.removeEventListener('resize', recaler);
      b.removeEventListener('touchstart', poser);
      b.removeEventListener('touchend', lever);
      b.removeEventListener('touchcancel', lever);
      b.removeEventListener('scroll', defiler);
      finir();
    };
  }, []);

  // Un toucher : la valeur notée, ou effacée si elle l'était déjà (la bande revient alors sur `centre`), et centrée tout de
  // suite, sans attendre le rendu (d'un coup avec « Réduire les animations »).
  const toucher = (o, i) => {
    eteindre();
    const efface = o.valeur === etat.current.valeur;
    centrer(efface ? indiceVide : i, true);
    surChoix(efface ? null : o.valeur);
  };
  return html`<div ref=${groupe} role="group" aria-label=${etiquette} class=${`roue-choix${indiceNote >= 0 ? ' notee' : ''}`}>
    <div ref=${bande} class="roue-defile">
      <span class="roue-espace" aria-hidden="true"></span>
      ${options.map((o, i) => html`<button type="button" key=${String(o.valeur)} class="roue-valeur" aria-pressed=${i === indiceNote ? 'true' : 'false'}
        onClick=${() => toucher(o, i)}>${o.libelle}</button>`)}
      <span class="roue-espace" aria-hidden="true"></span>
    </div>
  </div>`;
}
