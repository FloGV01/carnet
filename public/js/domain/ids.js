// Identifiants aléatoires (crypto), courts et sûrs dans une URL.
function hex(n, alea) {
  const octets = new Uint8Array(Math.ceil(n / 2));
  alea.getRandomValues(octets);
  return Array.from(octets, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, n);
}
export function nouvelId(prefixe, alea = globalThis.crypto) { return `${prefixe}_${hex(16, alea)}`; }
export function nouvelIdListe(liste, alea = globalThis.crypto) { return `${liste}:u-${hex(8, alea)}`; }
