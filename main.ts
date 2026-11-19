import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');
const shotFiles = existsSync(shotsDir) ? readdirSync(shotsDir).filter(name => /\.(jpg|jpeg|png)$/i.test(name)) : [];
let appFiles = 0, appBytes = 0;
function inspect(path: string): void {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) { appFiles++; inspect(full); }
    else { appFiles++; appBytes += statSync(full).size; }
  }
}
inspect(appDir);
if (appFiles > 993 || appBytes > 50331648) throw new Error('app/ exceeds the dossier file or byte cap');
if (shotFiles.length > 4 || shotFiles.some(file => statSync(join(shotsDir, file)).size > 262144)) throw new Error('screenshots exceed the dossier cap');
mkdirSync(output, { recursive: true });
cpSync(appDir, join(output, 'app'), { recursive: true });
cpSync(shotsDir, join(output, 'screenshots'), { recursive: true });
const dossier = buildDossier(output, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 });
writeFileSync(join(output, 'dossier.json'), dossier);
