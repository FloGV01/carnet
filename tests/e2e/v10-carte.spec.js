import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, simulerZonesSures } from '../aides/saisie.js';
import { vueMoment, bulle, carte, mot, carteDuBas, finMouvements, toucherMot } from '../aides/emotion.js';
import { energieDe, motsDeLaCarte } from '../../public/js/domain/carte-roue.js';
import { PAS } from '../../public/js/ui/carte-geometrie.js';

// v10 (2/9) · La carte suit le glissement (spec §4.1) : le mot du milieu de la fenêtre grossit, ses voisins un peu ; des
// cercles, posés par CSSOM. Glisser n'écrit jamais rien ; seul un toucher choisit (v9, inchangé), et il choisit le mot
// sous le doigt quand il se pose, ou rien (point de vigilance 1). Avec « Réduire les animations », rien ne suit. Données
// inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).
const MOTS = motsDeLaCarte(null);
const en = (col, rang) => MOTS.find((m) => m.col === col && m.rang === rang).libelle;
const releves = (page) => page.evaluate(() => window.__carnet.repo.humeurs.tous());
const ouvrir = async (page, zone) => {
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await bulle(vue, zone).click();
  await expect(carte(vue).getByRole('button')).toHaveCount(MOTS.length);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  return vue;
};
// Fait défiler le cadre, attend l'événement de défilement et les images qui le suivent (la lentille s'y pose), puis la fin
// des transitions.
const glisser = async (page, dx, dy) => {
  await page.evaluate(([x, y]) => new Promise((ok) => {
    const c = document.querySelector('.carte-defile');
    c.addEventListener('scroll', () => requestAnimationFrame(() => requestAnimationFrame(ok)), { once: true });
    c.scrollBy(x, y);
  }), [dx, dy]);
  await finMouvements(page);
};
// La largeur à l'écran de chaque bulle, par libellé.
const largeurs = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.bulle-mot')]
  .map((b) => [b.textContent, Math.round(b.getBoundingClientRect().width)])));
const centreDe = (page, libelle) => page.evaluate((n) => {
  const r = [...document.querySelectorAll('.bulle-mot')].find((b) => b.textContent === n).getBoundingClientRect();
  return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
}, libelle);
// La bulle sous un point de l'écran : son libellé, ou null.
const sous = (page, [x, y]) => page.evaluate(([a, b]) => {
  const e = document.elementFromPoint(a, b);
  const bulleSous = e && e.closest('.bulle-mot');
  return bulleSous ? bulleSous.textContent : null;
}, [x, y]);
// Rien de choisi, rien en base, pas de carte du bas.
const rienDEcrit = async (page, vue, message) => {
  await expect(carte(vue).getByRole('button', { pressed: true }), message).toHaveCount(0);
  await expect(carteDuBas(vue), message).toHaveCount(0);
  expect(await page.locator('.bulle-mot.choisi').count(), message).toBe(0);
  expect(await releves(page), message).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('glisser de deux pas : le mot du milieu mesure 156 pt, ses voisins 120 puis 108, les autres 96, tous en cercles ; rien n\'est écrit, aucun attribut ne change que le style, aucune violation de CSP', async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective));
  });
  await page.reload();
  await appPrete(page);
  const vue = await ouvrir(page, 'rouge');
  // À l'ouverture sans zones sûres, le milieu tombe entre En colère (col 3, rang 9) et Défiant : le plus à gauche.
  expect((await largeurs(page))[en(3, 9)]).toBe(156);
  await page.evaluate(() => {
    window.__attributs = new Set();
    new MutationObserver((ms) => { for (const m of ms) window.__attributs.add(m.type === 'attributes' ? m.attributeName : m.type); })
      .observe(document.querySelector('.carte-plan'), { attributes: true, childList: true, subtree: true, characterData: true });
  });
  // Deux pas à droite : le milieu tombe entre les colonnes 5 et 6, sur le rang 9.
  await glisser(page, 2 * PAS, 0);
  const l = await largeurs(page);
  expect(l[en(5, 9)]).toBe(156);
  expect([en(4, 9), en(6, 9), en(5, 10), en(5, 8)].map((n) => l[n])).toEqual([120, 120, 120, 120]);
  expect([en(4, 10), en(6, 8), en(3, 9), en(5, 11)].map((n) => l[n])).toEqual([108, 108, 108, 108]);
  expect(l[en(1, 12)]).toBe(96);
  // L'ancien centre (à deux cases) est redevenu un voisin ; un seul mot à 156.
  expect(Object.values(l).filter((x) => x === 156)).toHaveLength(1);
  // Le centre garde sa place régulière : sous le milieu de la fenêtre, au plus à un demi-pas et un tiers de pas.
  const [x, y] = await centreDe(page, en(5, 9));
  expect(Math.abs(x - 195)).toBeLessThanOrEqual(PAS / 2 + 1);
  expect(Math.abs(y - 422)).toBeLessThanOrEqual(PAS / 2 + 1);
  // Des cercles : les moitiés gardent leur arrondi de 48 pt, sans .choisi.
  const forme = await page.evaluate((n) => {
    const b = [...document.querySelectorAll('.bulle-mot')].find((e) => e.textContent === n);
    return [b.getAttribute('aria-pressed'), b.classList.contains('choisi'), getComputedStyle(b.querySelector('.demi.gauche')).borderTopLeftRadius];
  }, en(5, 9));
  expect(forme).toEqual(['false', false, '48px']);
  await rienDEcrit(page, vue, 'glissé');
  expect(await page.evaluate(() => [...window.__attributs])).toEqual(['style']);
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
});

test('l\'hystérésis à l\'écran : un petit glissement garde le centre, un peu plus le change, et revenir un peu en arrière ne le rechange pas', async ({ page }) => {
  await ouvrir(page, 'rouge');
  const [gauche, droite] = [en(3, 9), en(4, 9)];
  const centre = async () => {
    const l = await largeurs(page);
    return Object.keys(l).filter((n) => l[n] === 156);
  };
  // Le milieu est à égale distance des colonnes 3 et 4. Huit points à droite : la colonne 4 est plus proche de moins de
  // 15,9 pt, le centre reste. Quatre de plus : elle l'est de plus, il change.
  expect(await centre()).toEqual([gauche]);
  await glisser(page, 8, 0);
  expect(await centre()).toEqual([gauche]);
  await glisser(page, 4, 0);
  expect(await centre()).toEqual([droite]);
  // En revenant : aussi loin de l'autre côté de l'égalité, le centre reste ; quatre de plus, il revient.
  await glisser(page, -20, 0);
  expect(await centre()).toEqual([droite]);
  await glisser(page, -4, 0);
  expect(await centre()).toEqual([gauche]);
});

test('à l\'ouverture sur une zone, sans mot choisi : la lentille est déjà sur le mot du milieu, le plus haut puis le plus à gauche des quatre (avec les zones sûres de l\'iPhone), sans transition ni rien d\'écrit', async ({ page }) => {
  await simulerZonesSures(page);
  await page.reload();
  await appPrete(page);
  for (const [zone, col, rang] of [['rouge', 3, 10], ['jaune', 9, 10], ['bleu', 3, 4], ['vert', 9, 4]]) {
    const vue = await ouvrir(page, zone);
    const l = await largeurs(page);
    expect(l[en(col, rang)], zone).toBe(156);
    expect(Object.values(l).filter((x) => x === 156), zone).toHaveLength(1);
    expect(l[en(col + 1, rang)], zone).toBe(120);
    expect(l[en(col, rang - 1)], zone).toBe(120);
    // Les bulles sont nées à leur place : aucune transition de transform en cours ni finie à l'ouverture.
    const transforms = await page.evaluate(() => document.getAnimations().filter((a) => a.transitionProperty === 'transform').length);
    expect(transforms, zone).toBe(0);
    await rienDEcrit(page, vue, zone);
    await aller(page, '#/aujourdhui');
    await expect(page.locator('nav.onglets')).toBeVisible();
  }
});

test('« Réduire les animations » : rien ne grossit en glissant, toutes les bulles à 96 pt, aucune animation, aucun style écrit ; un toucher choisit, comme en v9', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const vue = await ouvrir(page, 'bleu');
  const a96 = async (message) => {
    const l = await largeurs(page);
    expect(new Set(Object.values(l)), message).toEqual(new Set([96]));
    expect(await page.evaluate(() => document.getAnimations().length), message).toBe(0);
  };
  await a96('à l\'ouverture');
  await page.evaluate(() => {
    window.__attributs = 0;
    new MutationObserver((ms) => { window.__attributs += ms.length; }).observe(document.querySelector('.carte-plan'), { attributes: true, subtree: true });
  });
  for (const [dx, dy] of [[2 * PAS, 0], [0, -3 * PAS], [-PAS, PAS]]) {
    await glisser(page, dx, dy);
    await a96(`glissé de ${dx}, ${dy}`);
  }
  expect(await page.evaluate(() => window.__attributs)).toBe(0);
  await rienDEcrit(page, vue, 'glissé');
  // Le mot touché prend sa taille, au milieu, d'un coup.
  await toucherMot(vue, 'Vide');
  await expect(mot(vue, 'Vide')).toHaveAttribute('aria-pressed', 'true');
  expect(await centreDe(page, 'Vide')).toEqual([195, 422]);
  expect((await largeurs(page)).Vide).toBe(156);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

// Le point de vigilance 1. Défiant (col 4, rang 9) : deux pas glissés, la lentille pas encore posée, il est sous le point
// P ; une fois posée, sur Suspect, à sa droite, c'est Suspect qui s'est placé sous P. L'horloge de la page est arrêtée
// pour tenir ce moment : la lentille se pose à la première image rendue. Sur l'iPhone, le clic du doigt levé tombe sur la
// bulle qui est alors sous lui : il est envoyé ici à la main, sur chaque bulle.
const AVANT = en(4, 9);
const APRES = en(5, 9);
const glisserSansLentille = async (page) => {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  // L'événement de défilement passe (il n'attend pas l'horloge de la page), la lentille reste où elle était.
  await page.evaluate((x) => new Promise((ok) => {
    const c = document.querySelector('.carte-defile');
    c.addEventListener('scroll', ok, { once: true });
    c.scrollBy(x, 0);
  }), 2 * PAS);
  return centreDe(page, AVANT);
};
const pose = (page, n) => page.evaluate((libelle) => {
  const b = [...document.querySelectorAll('.bulle-mot')].find((e) => e.textContent === libelle);
  b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
}, n);
const leve = (page, n) => page.evaluate((libelle) => {
  const b = [...document.querySelectorAll('.bulle-mot')].find((e) => e.textContent === libelle);
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
  b.click();
}, n);
// Un clic sans appui : aucun doigt posé ni levé, comme VoiceOver et le clavier.
const clicSeul = (page, n) => page.evaluate((libelle) => [...document.querySelectorAll('.bulle-mot')].find((e) => e.textContent === libelle).click(), n);

test('point de vigilance 1 : un doigt posé sur un mot pendant que la lentille arrive, levé sur le voisin venu s\'y placer, ne choisit rien ; le même toucher, la carte posée, choisit ce voisin', async ({ page }) => {
  const vue = await ouvrir(page, 'rouge');
  const p = await glisserSansLentille(page);
  expect(await sous(page, p)).toBe(AVANT);
  await pose(page, AVANT);
  await page.clock.runFor(100);
  await finMouvements(page);
  expect(await sous(page, p)).toBe(APRES);
  expect((await largeurs(page))[APRES]).toBe(156);
  await leve(page, APRES);
  await page.clock.runFor(100);
  await page.clock.resume();
  await rienDEcrit(page, vue, 'le voisin sous le doigt levé');
  // Un nouveau toucher, la carte posée : c'est bien la bulle sous le doigt qui compte.
  await page.touchscreen.tap(...p);
  await expect(mot(vue, APRES)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await releves(page)).length).toBe(1);
});

test('point de vigilance 1 : le mot sous le doigt quand il se pose, encore sous lui quand il se lève, est choisi, même si la lentille bouge ; un toucher dans le vide devenu un mot ne choisit rien', async ({ page }) => {
  const vue = await ouvrir(page, 'rouge');
  await glisserSansLentille(page);
  await pose(page, AVANT);
  await page.clock.runFor(100);
  await leve(page, AVANT);
  await page.clock.runFor(100);
  await page.clock.resume();
  await expect(mot(vue, AVANT)).toHaveAttribute('aria-pressed', 'true');
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([AVANT]);
  await expect.poll(async () => (await releves(page)).length).toBe(1);
  await expect.poll(() => centreDe(page, AVANT)).toEqual([195, 422]);
  // Un doigt posé entre deux bulles (sur le plan), puis un clic sur une bulle : rien de plus.
  await finMouvements(page);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  await page.evaluate((libelle) => {
    document.querySelector('.carte-plan').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    const b = [...document.querySelectorAll('.bulle-mot')].find((e) => e.textContent === libelle);
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
    b.click();
  }, en(1, 12));
  await page.waitForTimeout(100);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([AVANT]);
  // Sans appui du tout (VoiceOver, le clavier), le clic dit lui-même sa bulle : elle est choisie.
  await clicSeul(page, en(1, 12));
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([en(1, 12)]);
});

test('point de vigilance 1 : de vrais touchers juste après un glissement choisissent le mot sous le doigt quand il se pose, ou rien, jamais un autre', async ({ page }) => {
  test.setTimeout(60000);
  const vue = await ouvrir(page, 'vert');
  await page.evaluate(() => {
    window.__pose = [];
    document.querySelector('.carte-plan').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.bulle-mot');
      window.__pose.push(b ? b.textContent : null);
    }, true);
  });
  let pris = 0;
  for (const [i, [dx, dy, p]] of [[PAS, 0, [120, 300]], [0, PAS, [250, 520]], [-PAS, -PAS, [195, 422]], [2 * PAS, PAS, [60, 640]], [-PAS, 0, [330, 200]], [PAS, -PAS, [195, 300]]].entries()) {
    // Le toucher part aussitôt après le glissement : la lentille vient de bouger, les bulles sont en route.
    await page.evaluate(([x, y]) => new Promise((ok) => {
      document.querySelector('.carte-defile').scrollBy(x, y);
      requestAnimationFrame(() => requestAnimationFrame(ok));
    }), [dx, dy]);
    await page.touchscreen.tap(...p);
    await page.waitForTimeout(100);
    const pose1 = await page.evaluate(() => window.__pose.at(-1));
    const choisis = await carte(vue).getByRole('button', { pressed: true }).allTextContents();
    expect(choisis.length, `toucher ${i}`).toBeLessThanOrEqual(1);
    // Le mot choisi est effacé : le toucher suivant repart de rien.
    if (choisis.length) {
      pris += 1;
      expect(choisis[0], `toucher ${i}`).toBe(pose1);
      await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
      await finMouvements(page);
      await toucherMot(vue, choisis[0]);
      await expect(carte(vue).getByRole('button', { pressed: true })).toHaveCount(0);
      await expect.poll(async () => (await releves(page)).length, { message: `toucher ${i}` }).toBe(0);
    }
    await finMouvements(page);
  }
  // Un toucher au moins est tombé sur un mot : le test a bien vu ce qu'il compare.
  expect(pris).toBeGreaterThan(0);
});

// L'aide dont dépendent les tests qui touchent un mot (tests/aides/emotion.js) : le clic part d'une carte immobile, sinon
// la lentille emporterait la bulle sous le pointeur et le toucher serait ignoré, au hasard, sous charge.
test('toucherMot : un mot hors de l\'écran y est amené, tout s\'y pose, puis le doigt se pose sur lui, sans mouvement en cours ; la carte glisse ensuite jusqu\'à lui', async ({ page }) => {
  const vue = await ouvrir(page, 'rouge');
  const loin = MOTS.find((m) => m.col === 12 && m.rang === 1);
  const horsEcran = await mot(vue, loin.libelle).evaluate((b) => { const r = b.getBoundingClientRect(); return r.left >= innerWidth || r.top >= innerHeight; });
  expect(horsEcran).toBe(true);
  await page.evaluate(() => {
    document.querySelector('.carte-plan').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.bulle-mot');
      window.__appui = { mot: b && b.textContent, mouvements: document.getAnimations().filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime)).length };
    }, { capture: true, once: true });
  });
  await toucherMot(vue, loin.libelle);
  expect(await page.evaluate(() => window.__appui)).toEqual({ mot: loin.libelle, mouvements: 0 });
  await expect(mot(vue, loin.libelle)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => centreDe(page, loin.libelle)).toEqual([195, 422]);
  await expect.poll(() => releves(page)).toMatchObject([{ emotion: loin.id, energie: energieDe(loin.id) }]);
});

// Le toucher abandonné ou perdu. Après un pointercancel (le défilement a pris la main) ou un toucher entre deux bulles, resté
// sans clic, un clic sans appui dit lui-même sa bulle : sinon il serait ignoré, sans aucun signal.
test('un appui abandonné (pointercancel), puis un clic sans appui sur un autre mot : cet autre mot est choisi', async ({ page }) => {
  const vue = await ouvrir(page, 'jaune');
  const [a, b] = [en(9, 9), en(10, 9)];
  await page.evaluate((libelle) => {
    const e = [...document.querySelectorAll('.bulle-mot')].find((x) => x.textContent === libelle);
    e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    e.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch' }));
  }, a);
  await clicSeul(page, b);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([b]);
});

test('un toucher entre deux bulles, resté sans clic, puis un clic sans appui passé 500 ms : le mot est choisi', async ({ page }) => {
  const vue = await ouvrir(page, 'jaune');
  const b = en(10, 9);
  await page.evaluate(() => {
    const p = document.querySelector('.carte-plan');
    p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
  });
  await page.waitForTimeout(600);
  await clicSeul(page, b);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([b]);
});

// Le recentrage. Après le glissement, un mot entier à l'écran, le plus loin du milieu, hors du voile : un vrai doigt le
// touche là où il est (un .click() ferait d'abord défiler la carte jusqu'à lui), et le recentrage en croise d'autres.
const motLoin = (page) => page.evaluate(() => {
  let loin = null;
  for (const b of document.querySelectorAll('.bulle-mot')) {
    const r = b.getBoundingClientRect();
    if (r.left < 8 || r.right > 382 || r.top < 140 || r.bottom > 760) continue;
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    const d = Math.hypot(x - 195, y - 422);
    if (!loin || d > loin.d) loin = { nom: b.textContent, id: b.dataset.mot, x, y, d };
  }
  return loin;
});
// À chaque image dès qu'un mot est choisi, les mots à l'échelle 1,625 dans le style posé (la cible de la transition).
const suivreLentille = (page) => page.evaluate(() => {
  window.__centres = new Set();
  const suivre = () => {
    if (document.querySelector('.bulle-mot.choisi')) for (const b of document.querySelectorAll('.bulle-mot')) if (b.style.transform.endsWith('scale(1.625)')) window.__centres.add(b.textContent);
    window.__suivi = requestAnimationFrame(suivre);
  };
  suivre();
});
const lentillesVues = (page) => page.evaluate(() => { cancelAnimationFrame(window.__suivi); return [...window.__centres]; });

test('un toucher après un défilement choisit le mot et recentre la carte (v9) ; pendant le recentrage, la lentille reste sur lui, sans passer par les mots croisés', async ({ page }) => {
  const vue = await ouvrir(page, 'jaune');
  await glisser(page, 2 * PAS, PAS);
  const loin = await motLoin(page);
  expect(loin.d).toBeGreaterThan(2 * PAS);
  await suivreLentille(page);
  await page.touchscreen.tap(loin.x, loin.y);
  await expect(mot(vue, loin.nom)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => centreDe(page, loin.nom)).toEqual([195, 422]);
  await finMouvements(page);
  expect(await lentillesVues(page)).toEqual([loin.nom]);
  const l = await largeurs(page);
  expect(l[loin.nom]).toBe(156);
  expect(Object.values(l).filter((x) => x === 156)).toHaveLength(1);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText(loin.nom);
  await expect.poll(() => releves(page)).toMatchObject([{ emotion: loin.id, energie: energieDe(loin.id) }]);
});

// Le second toucher, pour vérifier que le premier a été pris (v9, point de vigilance 5), se pose pendant le recentrage. La
// garde l'ignore : il ne libère pas non plus la lentille, qui repasserait par les mots croisés (§4.1, la carte ne sautille
// pas). L'horloge de la page est arrêtée pour le tenir dans la garde, même si la machine est lente.
test('deux touchers enchaînés sur un mot loin du milieu : le second, dans la garde, laisse la lentille sur le mot touché, sans passer par les mots croisés', async ({ page }) => {
  const vue = await ouvrir(page, 'jaune');
  await glisser(page, 2 * PAS, PAS);
  const loin = await motLoin(page);
  expect(loin.d).toBeGreaterThan(2 * PAS);
  await suivreLentille(page);
  await page.evaluate(() => {
    window.__poses = 0;
    document.querySelector('.carte-plan').addEventListener('pointerdown', () => { window.__poses += 1; }, true);
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  await Promise.all([page.touchscreen.tap(loin.x, loin.y), page.touchscreen.tap(loin.x, loin.y)]);
  await page.clock.runFor(400);
  await page.clock.resume();
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([loin.nom]);
  await expect.poll(() => centreDe(page, loin.nom)).toEqual([195, 422]);
  await finMouvements(page);
  expect(await page.evaluate(() => window.__poses)).toBe(2);
  expect(await lentillesVues(page)).toEqual([loin.nom]);
  expect((await largeurs(page))[loin.nom]).toBe(156);
  await expect.poll(() => releves(page)).toMatchObject([{ emotion: loin.id, energie: energieDe(loin.id) }]);
});

// Le doigt qui reprend la carte : le défilement prend la main (pointercancel). L'horloge de la page est arrêtée : pour elle,
// le recentrage ne peut ni finir ni expirer, seul ce doigt peut libérer la lentille.
test('un doigt reprend la carte pendant le recentrage : la lentille le suit aussitôt, le mot touché reste choisi', async ({ page }) => {
  const vue = await ouvrir(page, 'jaune');
  await glisser(page, 2 * PAS, PAS);
  const loin = await motLoin(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  await page.touchscreen.tap(loin.x, loin.y);
  await expect(mot(vue, loin.nom)).toHaveAttribute('aria-pressed', 'true');
  // Le doigt se pose, le défilement prend la main et emmène la carte à l'opposé du mot touché.
  await page.evaluate(([x, y]) => new Promise((ok) => {
    const p = document.querySelector('.carte-plan');
    p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    p.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch' }));
    document.querySelector('.carte-defile').addEventListener('scroll', ok, { once: true });
    document.querySelector('.carte-defile').scrollBy(x, y);
  }), [Math.sign(195 - loin.x) * 3 * PAS, Math.sign(422 - loin.y) * 3 * PAS]);
  await page.clock.runFor(100);
  await page.clock.resume();
  await finMouvements(page);
  const l = await largeurs(page);
  const centres = Object.keys(l).filter((n) => l[n] === 156);
  expect(centres).toHaveLength(1);
  expect(centres).not.toEqual([loin.nom]);
  const [x, y] = await centreDe(page, centres[0]);
  expect(Math.hypot(x - 195, y - 422)).toBeLessThan(PAS);
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText([loin.nom]);
  await expect.poll(() => releves(page)).toMatchObject([{ emotion: loin.id }]);
});

test('avec un mot choisi, glisser ne change rien au relevé : le mot garde sa double capsule, aria-pressed et la carte du bas, à la taille que la lentille lui donne ; toucher un autre mot le remplace et recentre', async ({ page }) => {
  const vue = await ouvrir(page, 'vert');
  await toucherMot(vue, 'Calme');
  await expect.poll(() => centreDe(page, 'Calme')).toEqual([195, 422]);
  await finMouvements(page);
  await expect.poll(async () => (await releves(page)).length).toBe(1);
  const avant = await releves(page);
  // Calme est en col 7, rang 6. Deux pas à droite : la lentille sur la colonne 9, Calme à deux cases.
  await glisser(page, 2 * PAS, 0);
  const l = await largeurs(page);
  expect(l[en(9, 6)]).toBe(156);
  expect(l.Calme).toBe(108);
  const forme = await page.evaluate(() => {
    const b = document.querySelector('.bulle-mot.choisi');
    const centre = [...document.querySelectorAll('.bulle-mot')].find((e) => Math.round(e.getBoundingClientRect().width) === 156);
    return { mot: b.textContent, presse: b.getAttribute('aria-pressed'), z: getComputedStyle(b).zIndex,
      demis: [...b.querySelectorAll('.demi')].map((d) => getComputedStyle(d).borderTopLeftRadius),
      centre: [centre.classList.contains('choisi'), centre.getAttribute('aria-pressed'), getComputedStyle(centre.querySelector('.demi.gauche')).borderTopLeftRadius] };
  });
  expect(forme).toEqual({ mot: 'Calme', presse: 'true', z: '2', demis: ['24px', '24px'], centre: [false, 'false', '48px'] });
  await expect(carte(vue).getByRole('button', { pressed: true })).toHaveText(['Calme']);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Calme');
  expect(await releves(page)).toEqual(avant);
  // Plus loin, à la taille de tout le monde.
  await glisser(page, 2 * PAS, 3 * PAS);
  expect((await largeurs(page)).Calme).toBe(96);
  await expect(mot(vue, 'Calme')).toHaveAttribute('aria-pressed', 'true');
  // Revenu au milieu : 156.
  await glisser(page, -4 * PAS, -3 * PAS);
  expect((await largeurs(page)).Calme).toBe(156);
  // Un autre mot : il prend la capsule, le relevé change, il vient au milieu.
  const autre = en(8, 4);
  await toucherMot(vue, autre);
  await expect(mot(vue, autre)).toHaveAttribute('aria-pressed', 'true');
  await expect(mot(vue, 'Calme')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => centreDe(page, autre)).toEqual([195, 422]);
  await finMouvements(page);
  expect((await largeurs(page))[autre]).toBe(156);
  await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText(autre);
  await expect.poll(async () => (await releves(page))[0].emotion).not.toBe(avant[0].emotion);
});

// Le style posé de chaque bulle : la place et l'échelle voulues, sans attendre la fin d'une transition.
const stylesPoses = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.bulle-mot')].map((b) => [b.textContent, b.style.transform])));

test('retoucher le mot choisi l\'efface sans rien bouger sous le doigt : la lentille reste, il redevient un cercle de 156', async ({ page }) => {
  const vue = await ouvrir(page, 'vert');
  await toucherMot(vue, 'Calme');
  await expect.poll(() => centreDe(page, 'Calme')).toEqual([195, 422]);
  await finMouvements(page);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  const avant = await stylesPoses(page);
  await toucherMot(vue, 'Calme');
  await expect(mot(vue, 'Calme')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await releves(page)).length).toBe(0);
  expect(await stylesPoses(page)).toEqual(avant);
  await finMouvements(page);
  expect((await largeurs(page)).Calme).toBe(156);
  expect(await centreDe(page, 'Calme')).toEqual([195, 422]);
  await rienDEcrit(page, vue, 'effacé');
});

// La lentille se pose sans rendu : le rendu suivant de la carte (ici, le mot choisi effacé, la garde d'un mot choisi qui
// finit) ne doit pas la remettre là où elle était au rendu d'avant.
test('un rendu de la carte après un glissement ne remet aucune bulle ailleurs : mot effacé hors du centre, garde qui finit', async ({ page }) => {
  const vue = await ouvrir(page, 'vert');
  await toucherMot(vue, 'Calme');
  await expect.poll(() => centreDe(page, 'Calme')).toEqual([195, 422]);
  await finMouvements(page);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  // Un pas à droite et un peu plus : la lentille part de Calme, qui reste à l'écran, voisin du nouveau centre.
  await glisser(page, PAS, 0);
  expect((await largeurs(page))[en(8, 6)]).toBe(156);
  const posees = await stylesPoses(page);
  await toucherMot(vue, 'Calme');
  await expect(mot(vue, 'Calme')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await releves(page)).length).toBe(0);
  expect(await stylesPoses(page)).toEqual(posees);
  await rienDEcrit(page, vue, 'effacé');
  // Un mot choisi, puis une garde qui se pose et qui finit : le recentrage arrivé, la lentille est sur lui, et le reste.
  await toucherMot(vue, en(8, 6));
  await expect(mot(vue, en(8, 6))).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => centreDe(page, en(8, 6))).toEqual([195, 422]);
  await glisser(page, 0, PAS);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  await finMouvements(page);
  const finales = await stylesPoses(page);
  expect(finales[en(8, 5)].endsWith('scale(1.625)')).toBe(true);
  expect(finales[en(8, 6)].endsWith('scale(1.25)')).toBe(true);
  expect((await largeurs(page))[en(8, 5)]).toBe(156);
});

test('un mot à soi hors du carré : le repère du milieu le compte, la lentille s\'y pose ; touché, il prend sa double capsule, au milieu', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('motsPerso', {
    'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'rouge', famille: null, definition: null, archive: false, createdAt: '2026-10-01T08:00:00.000Z' },
  }));
  await aller(page, '#/moment');
  const vue = vueMoment(page);
  await bulle(vue, 'rouge').click();
  await expect(carte(vue).getByRole('button')).toHaveCount(145);
  await expect(carte(vue)).not.toHaveAttribute('aria-disabled', 'true');
  // Le mot à soi (colonne 0, rang 12) amené au milieu, par sa place à l'écran : c'est lui qui prend les 156 pt ; sa voisine
  // à droite, Enragé, 120 ; celle d'en dessous dans le carré, 108.
  const [x, y] = await centreDe(page, 'Flottant');
  await glisser(page, x - 195, y - 422);
  const l = await largeurs(page);
  expect(l.Flottant).toBe(156);
  expect(Object.values(l).filter((v) => v === 156)).toHaveLength(1);
  expect([l[en(1, 12)], l[en(1, 11)]]).toEqual([120, 108]);
  await rienDEcrit(page, vue, 'glissé');
  await toucherMot(vue, 'Flottant');
  await expect(mot(vue, 'Flottant')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => centreDe(page, 'Flottant')).toEqual([195, 422]);
  await expect.poll(async () => (await releves(page)).length).toBe(1);
});

test('la fenêtre change de taille : les bulles suivent la nouvelle marge, et le milieu se calcule sur elle', async ({ page }) => {
  const vue = await ouvrir(page, 'bleu');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(844);
  await finMouvements(page);
  // Le mot à 156 pt, après un glissement dans la nouvelle fenêtre, reste sous son milieu, à moins d'un pas.
  await glisser(page, 3 * PAS, -PAS);
  const m = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.bulle-mot')].filter((e) => Math.round(e.getBoundingClientRect().width) === 156);
    const r = b[0].getBoundingClientRect();
    return { n: b.length, d: Math.hypot(r.left + r.width / 2 - innerWidth / 2, r.top + r.height / 2 - innerHeight / 2) };
  });
  expect(m.n).toBe(1);
  expect(m.d).toBeLessThan(PAS);
  await rienDEcrit(page, vue, 'tourné');
  await page.setViewportSize({ width: 390, height: 844 });
});

test('très grand texte (17, 19, 21, 23) : après un glissement, chaque libellé reste dans sa bulle, le mot du milieu et le mot choisi hors du centre compris ; la page ne défile pas de côté', async ({ page }) => {
  test.setTimeout(60000);
  const hors = () => page.evaluate(() => {
    const fautes = [];
    if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push('page');
    const plage = document.createRange();
    for (const e of document.querySelectorAll('.bulle-mot:not(.choisi) .etiquette-mot')) {
      const r = e.closest('.bulle-mot').getBoundingClientRect();
      const [cx, cy, rayon] = [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
      plage.selectNodeContents(e);
      const dehors = [...plage.getClientRects()].some((q) => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].some(([x, y]) => Math.hypot(x - cx, y - cy) > rayon + 0.5));
      if (dehors) fautes.push(e.textContent);
    }
    return fautes;
  });
  for (const taille of [17, 19, 21, 23]) {
    await page.evaluate((x) => { document.documentElement.style.fontSize = `${x}px`; }, taille);
    const vue = await ouvrir(page, 'bleu');
    await page.evaluate(() => document.fonts.ready);
    await glisser(page, PAS, -2 * PAS);
    expect(await hors(), `${taille} px, glissé`).toEqual([]);
    await toucherMot(vue, 'Désillusionné');
    await expect(carteDuBas(vue).locator('.mot-carte-du-bas')).toHaveText('Désillusionné');
    await finMouvements(page);
    await glisser(page, 2 * PAS, PAS);
    expect(await hors(), `${taille} px, mot choisi, glissé`).toEqual([]);
    // Le libellé du mot choisi, à sa petite échelle, reste dans sa capsule.
    const dedans = await page.evaluate(() => {
      const b = document.querySelector('.bulle-mot.choisi');
      const e = b.querySelector('.etiquette-mot').getBoundingClientRect();
      const r = b.getBoundingClientRect();
      return e.left >= r.left - 0.5 && e.right <= r.right + 0.5;
    });
    expect(dedans, `${taille} px`).toBe(true);
    await aller(page, '#/aujourdhui');
    await expect(page.locator('nav.onglets')).toBeVisible();
    await page.evaluate(() => window.__carnet.repo.humeurs.tous().then((hs) => Promise.all(hs.map((h) => window.__carnet.repo.humeurs.supprimer(h.id)))));
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});
