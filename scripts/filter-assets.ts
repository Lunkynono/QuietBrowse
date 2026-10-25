import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, cp, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FILTER_IDS } from '../src/shared/filters';

export { FILTER_IDS };
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.resolve('@adguard/dnr-rulesets'))), '..');
const source = path.join(packageRoot, 'filters', 'chromium-mv3');

export async function prepareFilters(destination: string): Promise<void> {
  const declarative = path.join(destination, 'declarative');
  await mkdir(declarative, { recursive: true });
  for (const id of [0, ...FILTER_IDS]) {
    await cp(path.join(source, 'declarative', `ruleset_${id}`), path.join(declarative, `ruleset_${id}`), { recursive: true });
    const file = path.join(declarative, `ruleset_${id}`, `ruleset_${id}.json`);
    const rules = JSON.parse(await readFile(file, 'utf8')) as Array<{ id: number; action: unknown; condition: unknown; metadata?: unknown }>;
    const first = rules[0];
    if (!first?.metadata) throw new Error(`Faltan metadatos en el filtro ${id}.`);
    if (typeof (first.metadata as { chunk?: unknown }).chunk !== 'string') {
      // Current SDK expects compact metadata chunks; published assets still use the earlier object envelope.
      const serialized = JSON.stringify(first.metadata);
      const chunks = serialized.match(/[\s\S]{1,15000}/g) ?? [];
      const occupied = new Set(rules.slice(1).map((rule) => rule.id));
      if (chunks.some((_chunk, index) => occupied.has(index + 1))) throw new Error(`IDs de metadatos duplicados en el filtro ${id}.`);
      const metadataRules = chunks.map((chunk, index) => {
        if (Buffer.byteLength(JSON.stringify({ chunk }), 'utf8') > 60_000) throw new Error(`Metadatos demasiado grandes en el filtro ${id}.`);
        return { id: index + 1, action: first.action, condition: first.condition, metadata: { chunk } };
      });
      await writeFile(file, JSON.stringify([...metadataRules, ...rules.slice(1)]));
    }
  }
  await cp(path.join(source, 'filters_i18n.json'), path.join(destination, 'filters_i18n.json'));
  await cp(path.join(source, 'local_script_rules.js'), path.join(destination, 'local_script_rules.js'));
  const names = JSON.parse(await readFile(path.join(source, 'filters_i18n.json'), 'utf8')) as { filters: Record<string, { en?: { name?: string } }> };
  const filters = await Promise.all(FILTER_IDS.map(async (id) => {
    const file = path.join(declarative, `ruleset_${id}`, `ruleset_${id}.json`);
    const contents = await readFile(file);
    const rules = JSON.parse(contents.toString()) as unknown[];
    if (rules.length < 100) throw new Error(`El filtro ${id} está vacío.`);
    return { id, name: names.filters[id]?.en?.name ?? `Filter ${id}`, rules: rules.length, sha256: createHash('sha256').update(contents).digest('hex') };
  }));
  const packageJson = JSON.parse(await readFile(path.resolve(packageRoot, '..', 'package.json'), 'utf8')) as { version: string };
  const metadata = { generatedAt: new Date().toISOString(), packageVersion: packageJson.version, filters };
  await writeFile(path.join(destination, 'filters-manifest.json'), JSON.stringify(metadata, null, 2));
}
