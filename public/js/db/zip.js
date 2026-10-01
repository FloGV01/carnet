// Archive ZIP « stockée » (sans compression), en écriture et en lecture. Pur, sans dépendance.
// L'écriture rend une liste de morceaux : on construit un Blob sans jamais tout concaténer.
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(octets, depart = 0) {
  let c = (depart ^ 0xffffffff) >>> 0;
  for (let i = 0; i < octets.length; i++) c = TABLE[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export class ErreurZip extends Error {
  constructor(message) { super(message); this.code = 'ZIP_INVALIDE'; }
}

function dos(date) {
  const a = Math.max(1980, date.getFullYear());
  return {
    jour: ((a - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    heure: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  };
}

// entrees : [{ nom: 'audios/x.m4a', donnees: Uint8Array }]. date : Date (fournie par l'appelant).
export function creerZip(entrees, { date }) {
  if (!(date instanceof Date)) throw new TypeError('date requise');
  const { jour, heure } = dos(date);
  const morceaux = [];
  const central = [];
  let pos = 0;
  for (const { nom, donnees } of entrees) {
    if (!(donnees instanceof Uint8Array)) throw new TypeError(`données invalides pour ${nom}`);
    const nomOctets = enc.encode(nom);
    const crc = crc32(donnees);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, heure, true);
    local.setUint16(12, jour, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, donnees.length, true);
    local.setUint32(22, donnees.length, true);
    local.setUint16(26, nomOctets.length, true);
    local.setUint16(28, 0, true);
    morceaux.push(new Uint8Array(local.buffer), nomOctets, donnees);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, heure, true);
    cd.setUint16(14, jour, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, donnees.length, true);
    cd.setUint32(24, donnees.length, true);
    cd.setUint16(28, nomOctets.length, true);
    cd.setUint32(42, pos, true);
    central.push(new Uint8Array(cd.buffer), nomOctets);
    pos += 30 + nomOctets.length + donnees.length;
  }
  const debutCd = pos;
  let tailleCd = 0;
  for (const m of central) { morceaux.push(m); tailleCd += m.length; }
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, entrees.length, true);
  fin.setUint16(10, entrees.length, true);
  fin.setUint32(12, tailleCd, true);
  fin.setUint32(16, debutCd, true);
  morceaux.push(new Uint8Array(fin.buffer));
  return { morceaux, taille: debutCd + tailleCd + 22 };
}

export function concatener(morceaux) {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const res = new Uint8Array(total);
  let p = 0;
  for (const m of morceaux) { res.set(m, p); p += m.length; }
  return res;
}

export function lireZip(octets) {
  if (!(octets instanceof Uint8Array)) throw new ErreurZip('Archive illisible.');
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  let finCd = -1;
  for (let i = octets.length - 22; i >= Math.max(0, octets.length - 65557); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) { finCd = i; break; }
  }
  if (finCd < 0) throw new ErreurZip('Archive tronquée.');
  const nb = vue.getUint16(finCd + 10, true);
  let p = vue.getUint32(finCd + 16, true);
  const entrees = [];
  for (let k = 0; k < nb; k++) {
    if (p + 46 > octets.length || vue.getUint32(p, true) !== 0x02014b50) throw new ErreurZip('Répertoire de l\'archive abîmé.');
    const methode = vue.getUint16(p + 10, true);
    const crc = vue.getUint32(p + 16, true);
    const taille = vue.getUint32(p + 20, true);
    const lnom = vue.getUint16(p + 28, true);
    const lextra = vue.getUint16(p + 30, true);
    const lcom = vue.getUint16(p + 32, true);
    const offLocal = vue.getUint32(p + 42, true);
    let nom;
    try { nom = dec.decode(octets.subarray(p + 46, p + 46 + lnom)); } catch { throw new ErreurZip('Nom de fichier illisible.'); }
    if (methode !== 0) throw new ErreurZip('Archive compressée non prise en charge.');
    if (offLocal + 30 > octets.length || vue.getUint32(offLocal, true) !== 0x04034b50) throw new ErreurZip('Entrée de l\'archive abîmée.');
    const debut = offLocal + 30 + vue.getUint16(offLocal + 26, true) + vue.getUint16(offLocal + 28, true);
    if (debut + taille > octets.length) throw new ErreurZip('Archive tronquée.');
    const donnees = octets.subarray(debut, debut + taille);
    if (crc32(donnees) !== crc) throw new ErreurZip(`Contrôle d'intégrité faux pour ${nom}.`);
    entrees.push({ nom, donnees });
    p += 46 + lnom + lextra + lcom;
  }
  return entrees;
}
