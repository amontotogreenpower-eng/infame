#!/usr/bin/env node
/* Regenera src/glb/index.json a partir de los .glb que haya en la carpeta.
 *
 * El navegador no puede listar un directorio, asi que la libreria necesita un
 * indice. Este script lo escribe solo, y CONSERVA los metadatos que ya
 * hubiera (name, escala, nota): dejar caer un modelo nuevo no borra los
 * nombres bonitos que le pusiste a los demas.
 *
 *   node tools/glb-index.mjs            (desde la raiz del proyecto)
 *   node tools/glb-index.mjs --dir otra/carpeta
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const DIR = resolve(dirArg >= 0 ? args[dirArg + 1] : 'src/glb');
const INDEX = join(DIR, 'index.json');

// "guerrera_del_norte.glb" -> "Guerrera Del Norte"
const bonito = f => basename(f).replace(/\.(glb|gltf)$/i, '')
  .replace(/[_-]+/g, ' ').trim()
  .replace(/\s+/g, ' ')
  .replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());

let previos = new Map();
try {
  const j = JSON.parse(await readFile(INDEX, 'utf8'));
  const items = Array.isArray(j) ? j.map(f => ({ file: f })) : (j.items || []);
  for (const it of items) if (it && it.file) previos.set(it.file, it);
} catch { /* sin indice previo: se crea de cero */ }

let archivos;
try {
  archivos = (await readdir(DIR)).filter(f => /\.(glb|gltf)$/i.test(f));
} catch {
  console.error('No existe la carpeta ' + DIR + '. Creala y deja dentro los .glb.');
  process.exit(1);
}
archivos.sort((a, b) => a.localeCompare(b, 'es'));

const items = [];
for (const f of archivos) {
  const prev = previos.get(f) || {};
  const kb = Math.round((await stat(join(DIR, f))).size / 1024);
  const it = { file: f, name: prev.name || bonito(f), kb };
  if (prev.escala != null) it.escala = prev.escala;
  if (prev.nota) it.nota = prev.nota;
  items.push(it);
}

const salida = {
  kind: 'glb-models',
  nota: 'Indice de la libreria de modelos GLB. Regeneralo con: node tools/glb-index.mjs',
  items
};
await writeFile(INDEX, JSON.stringify(salida, null, 1) + '\n', 'utf8');

const perdidos = [...previos.keys()].filter(f => !archivos.includes(f));
console.log(`${INDEX}: ${items.length} modelo(s)`);
for (const it of items) console.log(`  · ${it.file}  (${it.name}, ${it.kb} KB)`);
if (perdidos.length) console.log('  quitados del indice (ya no estan): ' + perdidos.join(', '));
