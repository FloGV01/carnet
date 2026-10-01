import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerEnregistreur, choisirMime, traduireErreur, MESSAGES } from '../../public/js/plateforme/micro.js';

function fauxFlux() {
  const pistes = [{ arretee: false, stop() { this.arretee = true; } }];
  return { pistes, getTracks: () => pistes };
}
function fauxMR({ types = ['audio/mp4'] } = {}) {
  class MR {
    static isTypeSupported(t) { return types.includes(t); }
    constructor(flux, options) { this.options = options; this.state = 'inactive'; this.mimeType = options.mimeType || 'audio/webm'; MR.dernier = this; }
    start(tranche) { this.state = 'recording'; this.tranche = tranche; }
    emettre(n) { this.ondataavailable({ data: { size: n } }); }
    stop() { this.state = 'inactive'; this.emettre(5); queueMicrotask(() => this.onstop()); }
  }
  return MR;
}
function fausseHorloge() {
  let t = 0; const minuteurs = [];
  return {
    maintenant: () => t,
    minuteurs: { set: (f, ms) => { minuteurs.push({ f, a: t + ms }); return minuteurs.length - 1; }, clear: (i) => { if (minuteurs[i]) minuteurs[i].f = null; } },
    avancer(ms) { t += ms; for (const m of minuteurs) if (m.f && m.a <= t) { const f = m.f; m.f = null; f(); } },
  };
}

test('AAC choisi quand audio/mp4 est pris en charge, sinon format par défaut', () => {
  assert.equal(choisirMime(fauxMR()), 'audio/mp4');
  assert.equal(choisirMime(fauxMR({ types: [] })), '');
});

test('arrêt par l\'utilisateur : morceaux gardés, piste arrêtée, débit 64 kbit/s', async () => {
  const MR = fauxMR(); const h = fausseHorloge(); const flux = fauxFlux();
  const rec = creerEnregistreur(flux, { MR, maintenant: h.maintenant, minuteurs: h.minuteurs });
  assert.equal(MR.dernier.options.audioBitsPerSecond, 64000);
  assert.equal(MR.dernier.tranche, 1000);
  MR.dernier.emettre(100); h.avancer(2000); MR.dernier.emettre(100);
  const res = await rec.arreter();
  assert.equal(res.morceaux.length, 3);
  assert.equal(res.raison, 'utilisateur');
  assert.equal(res.dureeMs, 2000);
  assert.equal(res.mime, 'audio/mp4');
  assert.ok(flux.pistes[0].arretee);
});

test('arrêt automatique à la durée maximale', async () => {
  const MR = fauxMR(); const h = fausseHorloge(); const flux = fauxFlux();
  const rec = creerEnregistreur(flux, { MR, maintenant: h.maintenant, minuteurs: h.minuteurs, dureeMax: 300000 });
  h.avancer(300000);
  const res = await rec.fin;
  assert.equal(res.raison, 'duree');
  assert.equal(res.dureeMs, 300000);
  assert.ok(flux.pistes[0].arretee);
});

test('arrêt pour passage en arrière-plan, appels répétés sans effet', async () => {
  const MR = fauxMR(); const h = fausseHorloge();
  const rec = creerEnregistreur(fauxFlux(), { MR, maintenant: h.maintenant, minuteurs: h.minuteurs });
  const a = rec.arreter('arriere-plan'); const b = rec.arreter('utilisateur');
  assert.equal(a, b);
  assert.equal((await a).raison, 'arriere-plan');
});

test('erreurs traduites en phrases neutres', async () => {
  const refus = await traduireErreur({ name: 'NotAllowedError' }, { permissions: { query: async () => ({ state: 'denied' }) } });
  assert.equal(refus.code, 'MICRO_REFUSE');
  assert.equal(refus.message, MESSAGES.MICRO_REFUSE);
  const panne = await traduireErreur({ name: 'NotAllowedError' }, { permissions: { query: async () => ({ state: 'granted' }) } });
  assert.equal(panne.code, 'MICRO_INDISPONIBLE');
  assert.equal((await traduireErreur({ name: 'NotReadableError' }, {})).code, 'MICRO_INDISPONIBLE');
  assert.equal((await traduireErreur({ name: 'NotAllowedError' }, {})).code, 'MICRO_REFUSE');
});
