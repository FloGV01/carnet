import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function lister(dossier, filtre = () => true) {
  const res = [];
  for (const nom of readdirSync(dossier)) {
    if (nom.startsWith('.')) continue;
    const p = join(dossier, nom);
    if (statSync(p).isDirectory()) res.push(...lister(p, filtre));
    else if (filtre(p)) res.push(p);
  }
  return res;
}

export const rel = (p) => relative(RACINE, p).split(sep).join('/');
export const lire = (p) => readFileSync(p, 'utf8');

// Retire les commentaires d'un fichier JS ou CSS (approximation suffisante pour nos sources).
export function sansCommentaires(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

// Extrait les chaînes et les parties fixes des gabarits d'un fichier JS : c'est là que vit
// le texte affiché. Les identifiants (super, MediaRecorder…) ne sont donc pas examinés.
export function chainesJs(code) {
  const res = [];
  let i = 0;
  let precedent = '';
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = code.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1; let s = '';
      while (j < n && code[j] !== c) { if (code[j] === '\\') { s += code[j + 1]; j += 2; } else { s += code[j++]; } }
      res.push(s); i = j + 1; precedent = 'x'; continue;
    }
    if (c === '`') {
      let j = i + 1; let s = '';
      while (j < n && code[j] !== '`') {
        if (code[j] === '\\') { s += code[j + 1]; j += 2; continue; }
        if (code[j] === '$' && code[j + 1] === '{') {
          let prof = 1; j += 2;
          while (j < n && prof > 0) { if (code[j] === '{') prof++; else if (code[j] === '}') prof--; j++; }
          s += ' '; continue;
        }
        s += code[j++];
      }
      res.push(s); i = j + 1; precedent = 'x'; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$/.test(precedent)) {
      let j = i + 1; let classe = false;
      while (j < n && code[j] !== '\n') {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '[') classe = true; else if (code[j] === ']') classe = false;
        else if (code[j] === '/' && !classe) break;
        j++;
      }
      i = j + 1; precedent = 'x'; continue;
    }
    if (!/\s/.test(c)) precedent = /[A-Za-z0-9_$]/.test(c) ? (/[A-Za-z]/.test(c) ? (precedent + c).slice(-6) : 'x') : c;
    i++;
  }
  return res.join('\n');
}
