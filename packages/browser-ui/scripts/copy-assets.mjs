import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceAssets = join(packageRoot, 'src/assets');
const distAssets = join(packageRoot, 'dist/assets');

if (existsSync(sourceAssets)) {
  cpSync(sourceAssets, distAssets, { recursive: true });
}
