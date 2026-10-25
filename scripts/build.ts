import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import webpack from 'webpack';
import { createRequire } from 'node:module';
import { copyWar } from '@adguard/tswebextension/cli';
import { FILTER_IDS, prepareFilters } from './filter-assets';
import { makeIcons } from './icons';

const dist = path.resolve('dist');
const require = createRequire(import.meta.url);
const config = require('../webpack.config.cjs') as webpack.Configuration;

await new Promise<void>((resolve, reject) => {
  webpack(config, (error, stats) => {
    if (error) return reject(error);
    if (stats?.hasErrors()) return reject(new Error(stats.toString({ colors: false, all: false, errors: true })));
    console.log(stats?.toString({ colors: false, all: false, assets: true }));
    resolve();
  });
});

await prepareFilters(path.join(dist, 'filters'));
await makeIcons(path.join(dist, 'icons'));
await copyWar(path.join(dist, 'web-accessible-resources'));
const manifestFile = path.join(dist, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as Record<string, unknown>;
manifest.declarative_net_request = {
  rule_resources: FILTER_IDS.map((id) => ({ id: `ruleset_${id}`, enabled: false, path: `filters/declarative/ruleset_${id}/ruleset_${id}.json` })),
};
await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`QuietBrowse preparado en ${dist}`);
