import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _version: string | undefined;

export function getVersion(): string {
  if (_version) return _version;
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version?: string };
    _version = pkg.version ?? '0.0.0';
  } catch {
    _version = '0.0.0';
  }
  return _version;
}
