/**
 * Pages Router API handler for Diana sprite.
 */
import { readFileSync } from 'node:fs';
import { getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
export function dianaHandler(_req, res) {
    const body = readFileSync(getDianaAssetPath());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
}
//# sourceMappingURL=pages.js.map