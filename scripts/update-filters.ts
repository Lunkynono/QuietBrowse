import { execSync } from 'node:child_process';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const file = path.resolve('package.json');
const packageJson = JSON.parse(await readFile(file, 'utf8')) as { devDependencies: Record<string, string> };
const latest = execSync(`${process.platform === 'win32' ? 'npm.cmd' : 'npm'} view @adguard/dnr-rulesets version`, { encoding: 'utf8' }).trim();
packageJson.devDependencies['@adguard/dnr-rulesets'] = latest;
await writeFile(file, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Versión de filtros fijada: ${latest}. Ejecuta npm install y npm run build.`);
