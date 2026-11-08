import { test, expect } from '../aides/gardes.js';
import { viderBase, toucher, aller, simulerZonesSures } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

async function exporterVers(page) {
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  return (await fichiersPartages(page))[0];
}

test('exporter puis restaurer sur une base vidée redonne les mêmes données', async ({ page }) => {
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Lieu', 'Bureau');
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere' }));
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:bureau' });
  const f = await exporterVers(page);
  expect(f.nom).toBe('carnet-sauvegarde-2026-09-30-2100.json');
  await expect(page.getByText(/Dernière sauvegarde : 30 septembre 2026/)).toBeVisible();
  await viderBase(page);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByRole('heading', { name: 'Importer une sauvegarde' })).toBeVisible();
  await expect(page.getByText(/Ce fichier contient 1 journée, 1 épisode/)).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:bureau' });
  expect((await page.evaluate(() => window.__carnet.repo.episodes.tous())).length).toBe(1);
  // v11 (10/11) : un import sur un Carnet vide ne prend pas de copie (spec §10) : la ligne « Revenir » n'apparaît pas, une
  // fois la carte Sauvegarde chargée (sa taille affichée).
  await expect(page.getByText(/^Taille :/)).toBeVisible();
  await expect(page.getByRole('button', { name: "Revenir à l'état d'avant l'import" })).toHaveCount(0);
});

test('perte chiffrée, refus d\'un fichier illisible, revenir à l\'état d\'avant l\'import', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  const f = await exporterVers(page);
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-09-29', { humeur: 3 }));
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oups') });
  await expect(page.getByText('Ce fichier est illisible.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choisir un autre fichier' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText('1 journée présente ici et absente du fichier sera effacée.')).toBeVisible();
  await expect(page.getByRole('button', { name: "Exporter d'abord" })).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  // v11 (10/11) : « Revenir » remplace tout, juste sous « Importer » : il demande confirmation et dit ce qui sera remplacé.
  // Un toucher ouvre la boîte sans rien changer, « Annuler » ne change rien, « Revenir » restaure.
  const ligne = page.getByRole('button', { name: "Revenir à l'état d'avant l'import" });
  const boite = page.getByRole('alertdialog', { name: "Revenir à l'état d'avant l'import ?" });
  await ligne.click();
  await expect(boite).toBeVisible();
  await expect(boite.locator('.boite-texte')).toHaveText("Ce qui est noté ici sera remplacé par ce qu'il y avait avant l'import du 30 septembre 2026. Les mémos vocaux d'avant l'import ne reviennent pas.");
  // Le texte décrit la boîte : le focus va droit sur « Annuler », et VoiceOver doit lire ce qui sera remplacé.
  await expect(boite).toHaveAccessibleDescription(/sera remplacé par ce qu'il y avait avant l'import du 30 septembre 2026/);
  await expect(boite.getByRole('button')).toHaveText(['Annuler', 'Revenir']);
  await expect(boite.getByRole('button', { name: 'Annuler' })).toBeFocused();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  await boite.getByRole('button', { name: 'Annuler' }).click();
  await expect(boite).toHaveCount(0);
  await expect(ligne).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ lieu: 'lieu:bureau' });
  await ligne.click();
  await boite.getByRole('button', { name: 'Revenir', exact: true }).click();
  await expect(boite).toHaveCount(0);
  await expect(page.getByText("État d'avant l'import rétabli.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toMatchObject({ humeur: 3 });
});

// Relecture finale : en très grand texte, le long texte de « Revenir à l'état d'avant l'import ? » faisait sortir la boîte
// de l'écran, car le voile, fixe, ne défilait pas : son titre coupé en haut dès 47 px, ses deux boutons hors d'atteinte du
// doigt à 53 px. Le voile défile : la boîte part du haut, chaque bouton, amené dans la vue, se touche, et tout en bas, la
// boîte garde 24 px au-dessus du bord (la barre d'accueil). Ses deux boutons passent l'un sous l'autre quand « Revenir » ne
// tient plus dans sa moitié : aucun n'est coupé. Au texte par défaut, elle reste au milieu, ses boutons côte à côte, et
// rien ne défile. Une copie posée en base, comme après un import.
test('la confirmation « Revenir », au texte par défaut au milieu de l\'écran ; à 47 et 53 px, le voile défile : le titre en haut dans l\'écran, « Annuler » et « Revenir » entiers et atteints au doigt', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.tx(['snapshots'], 'readwrite', (t) => {
    t.objectStore('snapshots').put({ id: 'avant-import-2026-09-29T19:00:00.000Z', type: 'avant-import', date: '2026-09-29T19:00:00.000Z', schemaVersion: 6, data: {} });
  }));
  await aller(page, '#/reglages');
  const ligne = page.getByRole('button', { name: "Revenir à l'état d'avant l'import", exact: true });
  const boite = page.getByRole('alertdialog', { name: "Revenir à l'état d'avant l'import ?" });
  const voile = page.locator('.voile');
  // `coupes` : les boutons dont le libellé sort du bouton ou de la boîte ; `cote` : les deux boutons sur une même ligne.
  const place = () => boite.evaluate((b) => {
    const [r, v] = [b.getBoundingClientRect(), b.closest('.voile')];
    const boutons = [...b.querySelectorAll('button')];
    const plage = document.createRange();
    const coupes = boutons.filter((x) => {
      const q = x.getBoundingClientRect();
      plage.selectNodeContents(x);
      return x.scrollWidth > x.clientWidth + 0.5 || [...plage.getClientRects()].some((t) => t.left < Math.max(q.left, r.left) - 0.5 || t.right > Math.min(q.right, r.right) + 0.5);
    }).map((x) => x.textContent);
    const [a, c] = boutons.map((x) => x.getBoundingClientRect());
    return { haut: r.top, bas: innerHeight - r.bottom, defile: v.scrollHeight > v.clientHeight + 0.5, titre: b.querySelector('.boite-titre').getBoundingClientRect().top,
      coupes, cote: Math.abs(a.top - c.top) < 0.5 };
  });
  await ligne.click();
  await expect(boite).toBeVisible();
  const p = await place();
  expect([p.defile, p.coupes, p.cote]).toEqual([false, [], true]);
  expect(Math.abs(p.haut - p.bas)).toBeLessThanOrEqual(1);
  for (const px of [47, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, px);
    await voile.evaluate((v) => { v.scrollTop = 0; });
    const q = await place();
    expect(q.defile, `${px} px : le voile défile`).toBe(true);
    expect(q.titre, `${px} px : le haut du titre dans l'écran`).toBeGreaterThanOrEqual(0);
    expect([q.coupes, q.cote], `${px} px : l'un sous l'autre, aucun coupé`).toEqual([[], false]);
    await voile.evaluate((v) => { v.scrollTop = v.scrollHeight; });
    expect((await place()).bas, `${px} px : 24 px sous la boîte, tout en bas`).toBeGreaterThanOrEqual(23.5);
    for (const nom of ['Annuler', 'Revenir']) {
      const atteint = await boite.getByRole('button', { name: nom, exact: true }).evaluate((b) => {
        b.scrollIntoView({ block: 'nearest' });
        const r = b.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b;
      });
      expect(atteint, `${px} px : « ${nom} » touchable`).toBe(true);
    }
    await voile.evaluate((v) => { v.scrollTop = 0; });
  }
  // À 53 px, « Annuler » au doigt : la boîte se ferme, la copie est toujours là.
  await boite.getByRole('button', { name: 'Annuler', exact: true }).tap();
  await expect(boite).toHaveCount(0);
  // Contre-relecture : la taille déjà réglée quand la boîte s'ouvre (le cas réel, réglée dans iOS). Le focus initial sur
  // « Annuler » faisait défiler le voile jusqu'en bas : le titre hors de l'écran (de −402 à −143 px), la question à remonter
  // pour la lire. Ouverte à 53 px, la boîte part du haut, le voile non défilé, le focus sur « Annuler » ; chaque bouton
  // s'atteint ensuite en défilant, comme plus haut (amené par le bas : le défilement, en pixels entiers, laisse au plus un
  // demi-pixel sous le bord).
  await ligne.click();
  await expect(boite).toBeVisible();
  const ouverte = await place();
  expect(ouverte.defile, '53 px, ouverte en grand : le voile défile').toBe(true);
  expect(await voile.evaluate((v) => v.scrollTop), '53 px, ouverte en grand : le voile en haut').toBe(0);
  expect(ouverte.titre, '53 px, ouverte en grand : le haut du titre dans l\'écran').toBeGreaterThanOrEqual(0);
  await expect(boite.getByRole('button', { name: 'Annuler', exact: true })).toBeFocused();
  for (const nom of ['Annuler', 'Revenir']) {
    const atteint = await boite.getByRole('button', { name: nom, exact: true }).evaluate((b) => {
      b.scrollIntoView({ block: 'nearest' });
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight + 0.5 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b;
    });
    expect(atteint, `53 px, ouverte en grand : « ${nom} » touchable`).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(boite).toHaveCount(0);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await expect(ligne).toBeVisible();
});

// Contre-relecture : la boîte est rendue dans main, où le bandeau « Nouvelle version prête » remet --zone-haut à 0 (il prend
// la zone sûre pour lui). Le voile, fixe, couvre pourtant tout l'écran, barre d'état comprise : il n'avait plus que 24 px en
// haut, et en très grand texte, la boîte partie du haut passait sous l'heure et l'îlot. Zones simulées : 47 en haut, 34 en bas.
test('avec le bandeau « Nouvelle version prête », le voile d\'une confirmation garde la zone sûre du haut : à 53 px, la boîte part sous la barre d\'état', async ({ page }) => {
  await simulerZonesSures(page);
  await page.evaluate(() => window.__carnet.repo.tx(['snapshots'], 'readwrite', (t) => {
    t.objectStore('snapshots').put({ id: 'avant-import-2026-09-29T19:00:00.000Z', type: 'avant-import', date: '2026-09-29T19:00:00.000Z', schemaVersion: 6, data: {} });
  }));
  await aller(page, '#/reglages');
  await page.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true }));
  await expect(page.locator('.bandeau')).toBeVisible();
  const ligne = page.getByRole('button', { name: "Revenir à l'état d'avant l'import", exact: true });
  const boite = page.getByRole('alertdialog', { name: "Revenir à l'état d'avant l'import ?" });
  for (const px of [null, 53]) {
    const quoi = px ? `${px} px` : 'texte par défaut';
    await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, px);
    await ligne.click();
    await expect(boite).toBeVisible();
    const m = await page.locator('.voile').evaluate((v) => ({ haut: getComputedStyle(v).paddingTop, bas: getComputedStyle(v, '::after').height,
      boite: v.querySelector('.boite-confirmation').getBoundingClientRect().top, defile: v.scrollHeight > v.clientHeight + 0.5 }));
    expect([m.haut, m.bas], `${quoi} : les zones sûres du voile`).toEqual(['47px', '34px']);
    expect(m.boite, `${quoi} : la boîte sous la barre d'état`).toBeGreaterThanOrEqual(47);
    if (px) expect(m.defile, `${quoi} : le voile défile, la boîte part du haut`).toBe(true);
    await page.keyboard.press('Escape');
    await expect(boite).toHaveCount(0);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
});

test('v6 : les notes sont dans le fichier, et une note absente du fichier est annoncée avant d\'être effacée', async ({ page }) => {
  // Rien d'autre que des notes ici : la perte n'est chiffrée que si les notes comptent.
  const gardee = await page.evaluate(() => window.__carnet.repo.notes.creer({ date: '2026-09-30', heure: '20:00', texte: 'Dans le fichier' }));
  const f = await exporterVers(page);
  await page.evaluate(() => window.__carnet.repo.notes.creer({ date: '2026-09-30', heure: '20:30', texte: 'Écrite après' }));
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/Ce fichier contient 0 journée, 0 épisode, 1 note\./)).toBeVisible();
  await expect(page.getByText('1 note présente ici et absente du fichier sera effacée.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.notes.tous())).toEqual([gardee]);
});

test('v7 : les séances sont dans le fichier, et une séance absente du fichier est annoncée avant d\'être effacée', async ({ page }) => {
  const gardee = await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-09-30', heure: '18:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' }));
  const f = await exporterVers(page);
  expect(JSON.parse(Buffer.from(f.octets).toString('utf8'))).toMatchObject({ formatVersion: 8, schemaVersion: 6, counts: { seances: 1 } });
  await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-09-30', heure: '20:30', exercice: 'coherence', dureeS: 120, origine: 'moment-difficile' }));
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/Ce fichier contient 0 journée, 0 épisode, 1 séance de Bien-être\./)).toBeVisible();
  await expect(page.getByText('1 séance de Bien-être présente ici et absente du fichier sera effacée.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.seances.tous())).toEqual([gardee]);
});

test('avec un mémo, la sauvegarde est un ZIP qui se restaure avec le son', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 1000, mime: 'audio/mp4', data: new Uint8Array([9, 8, 7]).buffer }));
  const f = await exporterVers(page);
  expect(f.nom).toMatch(/\.zip$/);
  await viderBase(page);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/zip', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/1 mémo vocal/)).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const octets = await page.evaluate(async () => { const [m] = await window.__carnet.repo.audios.parParent('journal', '2026-09-30'); return Array.from(new Uint8Array(m.data)); });
  expect(octets).toEqual([9, 8, 7]);
});

test('tout effacer : exige le mot EFFACER', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  await aller(page, '#/reglages/effacer');
  await page.getByRole('button', { name: 'Continuer sans exporter' }).click();
  const bouton = page.getByRole('button', { name: 'Effacer définitivement' });
  await expect(bouton).toBeDisabled();
  await page.getByLabel('Écris EFFACER pour confirmer').fill('EFFACER');
  await bouton.click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await page.evaluate(() => window.__carnet.repo.journal.tous())).toEqual([]);
});
