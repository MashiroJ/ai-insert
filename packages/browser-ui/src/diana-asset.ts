/**
 * Diana asset path resolver.
 *
 * Returns the absolute path to the Diana spritesheet asset bundled with
 * this package. Build-tool plugins use this to serve the sprite at
 * development time.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIANA_ASSET_FILE = join(__dirname, 'assets/diana/spritesheet.webp');

export function getDianaAssetPath(): string {
  return DIANA_ASSET_FILE;
}
