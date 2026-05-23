/**
 * App Router route handler for Diana sprite.
 */
import { readFileSync } from 'node:fs';
import { getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
export function GET() {
    const body = readFileSync(getDianaAssetPath());
    return new Response(body, {
        status: 200,
        headers: {
            'content-type': 'image/webp',
            'cache-control': 'no-store',
        },
    });
}
//# sourceMappingURL=app.js.map