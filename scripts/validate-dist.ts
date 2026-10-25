import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

const dist = path.resolve('dist');
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 requerido.');
const paths = [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts.flatMap((entry: { js: string[] }) => entry.js), ...manifest.declarative_net_request.rule_resources.map((entry: { path: string }) => entry.path)];
for (const relative of paths) {
  const file = path.resolve(dist, relative);
  if (!file.startsWith(dist + path.sep)) throw new Error(`Ruta fuera de dist: ${relative}`);
  const result = await stat(file);
  if (!result.isFile() || result.size === 0) throw new Error(`Archivo vacío o ausente: ${relative}`);
}
const metadata = JSON.parse(await readFile(path.join(dist, 'filters', 'filters-manifest.json'), 'utf8'));
if (metadata.filters.length !== manifest.declarative_net_request.rule_resources.length) throw new Error('Faltan filtros.');
const popupHtml = await readFile(path.join(dist, 'popup.html'), 'utf8');
if (/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/.test(popupHtml)) throw new Error('El popup depende de un servidor local.');
console.log(`Manifest MV3 y ${metadata.filters.length} filtros verificados.`);
